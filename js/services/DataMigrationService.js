/**
 * データ移行サービス
 * 既存の進捗データを新しい形式に移行し、バージョン互換性を管理
 */
export class DataMigrationService {
    constructor(dataStorageService) {
        this.dataStorageService = dataStorageService;
        this.currentVersion = '2.0'; // 新しいバージョン
        this.supportedVersions = ['1.0', '1.1', '2.0'];
        
        console.log('DataMigrationService初期化完了');
    }

    /**
     * データ移行を実行
     * @returns {boolean} 移行成功かどうか
     */
    async migrateData() {
        try {
            console.log('データ移行を開始します...');

            // 現在のデータバージョンを確認
            const currentDataVersion = this.getCurrentDataVersion();
            console.log(`現在のデータバージョン: ${currentDataVersion}`);

            if (currentDataVersion === this.currentVersion) {
                console.log('データは最新バージョンです');
                return true;
            }

            // バージョン互換性をチェック
            if (!this.isVersionSupported(currentDataVersion)) {
                console.warn(`サポートされていないバージョン: ${currentDataVersion}`);
                return this.handleUnsupportedVersion(currentDataVersion);
            }

            // データをバックアップ
            const backupSuccess = this.createDataBackup();
            if (!backupSuccess) {
                console.error('データバックアップに失敗しました');
                return false;
            }

            // バージョン別の移行を実行
            const migrationSuccess = await this.performVersionMigration(currentDataVersion);
            
            if (migrationSuccess) {
                // バージョン情報を更新
                this.updateDataVersion(this.currentVersion);
                console.log('データ移行が完了しました');
                return true;
            } else {
                console.error('データ移行に失敗しました');
                return this.restoreFromBackup();
            }

        } catch (error) {
            console.error('データ移行エラー:', error);
            return this.restoreFromBackup();
        }
    }

    /**
     * 現在のデータバージョンを取得
     * @returns {string} データバージョン
     */
    getCurrentDataVersion() {
        try {
            // 新しい形式のバージョン情報をチェック
            const versionInfo = this.dataStorageService.loadFromStorage('hiragana_data_version');
            if (versionInfo && versionInfo.version) {
                return versionInfo.version;
            }

            // 既存データがある場合は1.0として扱う
            const sessions = this.dataStorageService.getAllSessions();
            if (sessions && sessions.length > 0) {
                return '1.0';
            }

            // 旧形式の進捗データをチェック（実際に保存されているデータのみ）
            const storedProgress = this.dataStorageService.loadFromStorage(this.dataStorageService.storageKeys.progress);
            if (storedProgress) {
                return storedProgress.version || '1.0';
            }

            // 新規インストールの場合は最新バージョン
            return this.currentVersion;

        } catch (error) {
            console.error('バージョン確認エラー:', error);
            return '1.0'; // デフォルトは1.0
        }
    }

    /**
     * バージョンがサポートされているかチェック
     * @param {string} version バージョン
     * @returns {boolean} サポートされているかどうか
     */
    isVersionSupported(version) {
        return this.supportedVersions.includes(version);
    }

    /**
     * データバックアップを作成
     * @returns {boolean} バックアップ成功かどうか
     */
    createDataBackup() {
        try {
            const backupData = {
                timestamp: Date.now(),
                version: this.getCurrentDataVersion(),
                sessions: this.dataStorageService.getAllSessions(),
                progress: this.dataStorageService.getProgressData(),
                currentSession: this.dataStorageService.loadCurrentSession()
            };

            const backupKey = `hiragana_backup_${Date.now()}`;
            const success = this.dataStorageService.saveToStorage(backupKey, backupData);
            
            if (success) {
                // 最新のバックアップキーを記録
                this.dataStorageService.saveToStorage('hiragana_latest_backup', backupKey);
                console.log(`データバックアップ作成: ${backupKey}`);
            }

            return success;

        } catch (error) {
            console.error('バックアップ作成エラー:', error);
            return false;
        }
    }

    /**
     * バージョン別の移行を実行
     * @param {string} fromVersion 移行元バージョン
     * @returns {boolean} 移行成功かどうか
     */
    async performVersionMigration(fromVersion) {
        try {
            switch (fromVersion) {
                case '1.0':
                    return await this.migrateFrom1_0To2_0();
                case '1.1':
                    return await this.migrateFrom1_1To2_0();
                default:
                    console.warn(`未対応の移行パス: ${fromVersion} -> ${this.currentVersion}`);
                    return false;
            }
        } catch (error) {
            console.error(`移行エラー (${fromVersion} -> ${this.currentVersion}):`, error);
            return false;
        }
    }

    /**
     * バージョン1.0から2.0への移行
     * @returns {boolean} 移行成功かどうか
     */
    async migrateFrom1_0To2_0() {
        try {
            console.log('バージョン1.0から2.0への移行を開始...');

            // 旧形式の進捗データを取得
            const oldProgress = this.dataStorageService.getProgressData();
            const oldSessions = this.dataStorageService.getAllSessions();

            // 新形式の進捗データを作成
            const newProgressData = this.convertOldProgressToNew(oldProgress, oldSessions);

            // 新形式で保存
            const success = this.dataStorageService.saveData('progressTracking', newProgressData);

            if (success) {
                console.log('バージョン1.0から2.0への移行完了');
                return true;
            }

            return false;

        } catch (error) {
            console.error('1.0->2.0移行エラー:', error);
            return false;
        }
    }

    /**
     * バージョン1.1から2.0への移行
     * @returns {boolean} 移行成功かどうか
     */
    async migrateFrom1_1To2_0() {
        try {
            console.log('バージョン1.1から2.0への移行を開始...');
            
            // 1.1の場合は部分的な移行のみ必要
            const existingData = this.dataStorageService.loadData('progressTracking');
            
            if (existingData) {
                // データ構造の調整
                const adjustedData = this.adjustDataStructure(existingData);
                const success = this.dataStorageService.saveData('progressTracking', adjustedData);
                
                if (success) {
                    console.log('バージョン1.1から2.0への移行完了');
                    return true;
                }
            }

            return false;

        } catch (error) {
            console.error('1.1->2.0移行エラー:', error);
            return false;
        }
    }

    /**
     * 旧形式の進捗データを新形式に変換
     * @param {Object} oldProgress 旧進捗データ
     * @param {Array} oldSessions 旧セッションデータ
     * @returns {Object} 新形式の進捗データ
     */
    convertOldProgressToNew(oldProgress, oldSessions) {
        const newProgressData = {
            characterProgress: {},
            sessionData: {
                startTime: null,
                totalPracticeTime: oldProgress.totalPracticeTime || 0,
                sessionsCount: oldProgress.totalSessions || 0
            },
            lastUpdated: Date.now(),
            version: this.currentVersion
        };

        // 旧形式の文字別進捗を新形式に変換
        if (oldProgress.characters) {
            Object.keys(oldProgress.characters).forEach(character => {
                const oldCharProgress = oldProgress.characters[character];
                
                // 新形式のCharacterProgressデータを作成
                const newCharProgress = {
                    character: character,
                    attempts: this.convertOldAttemptsToNew(character, oldCharProgress, oldSessions),
                    createdAt: oldCharProgress.firstPracticed || Date.now(),
                    updatedAt: oldCharProgress.lastPracticed || Date.now()
                };

                newProgressData.characterProgress[character] = newCharProgress;
            });
        }

        // セッションデータから追加の試行データを抽出
        this.extractAttemptsFromSessions(oldSessions, newProgressData.characterProgress);

        return newProgressData;
    }

    /**
     * 旧形式の試行データを新形式に変換
     * @param {string} character 文字
     * @param {Object} oldCharProgress 旧文字進捗
     * @param {Array} oldSessions 旧セッションデータ
     * @returns {Array} 新形式の試行データ
     */
    convertOldAttemptsToNew(character, oldCharProgress, oldSessions) {
        const attempts = [];

        // 旧形式から基本的な試行データを作成
        if (oldCharProgress.totalSessions > 0) {
            const avgScore = oldCharProgress.averageScore || 0;
            const sessionCount = oldCharProgress.totalSessions;
            const lastPracticed = oldCharProgress.lastPracticed;

            // 仮想的な試行データを作成（実際のデータがない場合）
            for (let i = 0; i < Math.min(sessionCount, 10); i++) {
                const timestamp = lastPracticed ? 
                    lastPracticed - (i * 24 * 60 * 60 * 1000) : // 1日ずつ遡る
                    Date.now() - (i * 24 * 60 * 60 * 1000);

                attempts.push({
                    score: this.generateRealisticScore(avgScore),
                    timestamp: timestamp,
                    details: {
                        migrated: true,
                        originalAverage: avgScore
                    }
                });
            }
        }

        return attempts.reverse(); // 時系列順にソート
    }

    /**
     * セッションデータから試行データを抽出
     * @param {Array} sessions セッションデータ
     * @param {Object} characterProgress 文字別進捗データ
     */
    extractAttemptsFromSessions(sessions, characterProgress) {
        sessions.forEach(session => {
            if (!session.character || !session.attempts) return;

            const character = session.character.character;
            
            if (!characterProgress[character]) {
                characterProgress[character] = {
                    character: character,
                    attempts: [],
                    createdAt: session.startTime || Date.now(),
                    updatedAt: session.endTime || Date.now()
                };
            }

            // セッションの各試行を追加
            session.attempts.forEach(attempt => {
                if (attempt.scoreResult && typeof attempt.scoreResult.score === 'number') {
                    characterProgress[character].attempts.push({
                        score: Math.max(0, Math.min(1, attempt.scoreResult.score)),
                        timestamp: attempt.timestamp || session.startTime || Date.now(),
                        details: {
                            sessionId: session.id,
                            recognitionResult: attempt.recognitionResult
                        }
                    });
                }
            });

            // 試行データを時系列順にソート
            characterProgress[character].attempts.sort((a, b) => a.timestamp - b.timestamp);
        });
    }

    /**
     * データ構造を調整（1.1->2.0用）
     * @param {Object} data 既存データ
     * @returns {Object} 調整されたデータ
     */
    adjustDataStructure(data) {
        // バージョン情報を更新
        data.version = this.currentVersion;
        data.lastUpdated = Date.now();

        // 必要に応じてデータ構造を調整
        if (data.characterProgress) {
            Object.keys(data.characterProgress).forEach(character => {
                const progress = data.characterProgress[character];
                
                // 新しいフィールドを追加（存在しない場合）
                if (!progress.createdAt) {
                    progress.createdAt = progress.updatedAt || Date.now();
                }
                
                // 試行データの妥当性をチェック
                if (progress.attempts) {
                    progress.attempts = progress.attempts.filter(attempt => 
                        attempt.score !== undefined && 
                        attempt.timestamp !== undefined &&
                        attempt.score >= 0 && attempt.score <= 1
                    );
                }
            });
        }

        return data;
    }

    /**
     * 現実的なスコアを生成（移行用）
     * @param {number} averageScore 平均スコア
     * @returns {number} 生成されたスコア
     */
    generateRealisticScore(averageScore) {
        // 平均スコア周辺でランダムなスコアを生成
        const variation = 0.2; // ±20%の変動
        const randomFactor = (Math.random() - 0.5) * 2 * variation;
        const score = averageScore + (averageScore * randomFactor);
        
        return Math.max(0, Math.min(1, score));
    }

    /**
     * データバージョンを更新
     * @param {string} version 新しいバージョン
     */
    updateDataVersion(version) {
        const versionInfo = {
            version: version,
            updatedAt: Date.now(),
            migrationHistory: this.getMigrationHistory()
        };

        this.dataStorageService.saveToStorage('hiragana_data_version', versionInfo);
    }

    /**
     * 移行履歴を取得
     * @returns {Array} 移行履歴
     */
    getMigrationHistory() {
        try {
            const versionInfo = this.dataStorageService.loadFromStorage('hiragana_data_version');
            return versionInfo?.migrationHistory || [];
        } catch (error) {
            return [];
        }
    }

    /**
     * バックアップからデータを復元
     * @returns {boolean} 復元成功かどうか
     */
    restoreFromBackup() {
        try {
            const latestBackupKey = this.dataStorageService.loadFromStorage('hiragana_latest_backup');
            if (!latestBackupKey) {
                console.error('バックアップが見つかりません');
                return false;
            }

            const backupData = this.dataStorageService.loadFromStorage(latestBackupKey);
            if (!backupData) {
                console.error('バックアップデータの読み込みに失敗');
                return false;
            }

            // データを復元
            if (backupData.sessions) {
                this.dataStorageService.saveToStorage(
                    this.dataStorageService.storageKeys.sessions, 
                    backupData.sessions
                );
            }

            if (backupData.progress) {
                this.dataStorageService.saveToStorage(
                    this.dataStorageService.storageKeys.progress, 
                    backupData.progress
                );
            }

            if (backupData.currentSession) {
                this.dataStorageService.saveToStorage(
                    this.dataStorageService.storageKeys.currentSession, 
                    backupData.currentSession
                );
            }

            console.log('バックアップからデータを復元しました');
            return true;

        } catch (error) {
            console.error('バックアップ復元エラー:', error);
            return false;
        }
    }

    /**
     * サポートされていないバージョンの処理
     * @param {string} version サポートされていないバージョン
     * @returns {boolean} 処理成功かどうか
     */
    handleUnsupportedVersion(version) {
        console.warn(`サポートされていないバージョン ${version} を検出`);
        
        // データをクリアして新規開始
        const confirmed = this.confirmDataReset();
        if (confirmed) {
            this.dataStorageService.clearAllData();
            this.updateDataVersion(this.currentVersion);
            console.log('データをリセットして新規開始します');
            return true;
        }

        return false;
    }

    /**
     * データリセットの確認（実際のアプリでは適切なUI確認を実装）
     * @returns {boolean} リセット確認
     */
    confirmDataReset() {
        // 実際のアプリでは適切なUI確認を実装
        // ここでは自動的にtrueを返す（開発用）
        return true;
    }

    /**
     * データの妥当性を検証
     * @param {Object} data 検証するデータ
     * @returns {boolean} データが有効かどうか
     */
    validateData(data) {
        try {
            if (!data || typeof data !== 'object') {
                return false;
            }

            // 基本構造の確認
            if (data.characterProgress && typeof data.characterProgress === 'object') {
                // 各文字の進捗データを検証
                for (const character in data.characterProgress) {
                    const progress = data.characterProgress[character];
                    
                    if (!progress.character || !Array.isArray(progress.attempts)) {
                        console.warn(`無効な文字進捗データ: ${character}`);
                        return false;
                    }

                    // 試行データの検証
                    for (const attempt of progress.attempts) {
                        if (typeof attempt.score !== 'number' || 
                            attempt.score < 0 || attempt.score > 1 ||
                            typeof attempt.timestamp !== 'number') {
                            console.warn(`無効な試行データ: ${character}`);
                            return false;
                        }
                    }
                }
            }

            return true;

        } catch (error) {
            console.error('データ検証エラー:', error);
            return false;
        }
    }

    /**
     * データのサニタイゼーション
     * @param {Object} data サニタイズするデータ
     * @returns {Object} サニタイズされたデータ
     */
    sanitizeData(data) {
        try {
            if (!data || typeof data !== 'object') {
                return this.getDefaultData();
            }

            const sanitized = {
                characterProgress: {},
                sessionData: {
                    startTime: null,
                    totalPracticeTime: 0,
                    sessionsCount: 0
                },
                lastUpdated: Date.now(),
                version: this.currentVersion
            };

            // セッションデータのサニタイズ
            if (data.sessionData && typeof data.sessionData === 'object') {
                sanitized.sessionData = {
                    startTime: data.sessionData.startTime || null,
                    totalPracticeTime: Math.max(0, Number(data.sessionData.totalPracticeTime) || 0),
                    sessionsCount: Math.max(0, Number(data.sessionData.sessionsCount) || 0)
                };
            }

            // 文字進捗データのサニタイズ
            if (data.characterProgress && typeof data.characterProgress === 'object') {
                Object.keys(data.characterProgress).forEach(character => {
                    const progress = data.characterProgress[character];
                    
                    if (progress && progress.character && Array.isArray(progress.attempts)) {
                        const sanitizedAttempts = progress.attempts
                            .filter(attempt => 
                                typeof attempt.score === 'number' &&
                                attempt.score >= 0 && attempt.score <= 1 &&
                                typeof attempt.timestamp === 'number' &&
                                attempt.timestamp > 0
                            )
                            .map(attempt => ({
                                score: Math.max(0, Math.min(1, attempt.score)),
                                timestamp: attempt.timestamp,
                                details: attempt.details || {}
                            }));

                        if (sanitizedAttempts.length > 0) {
                            sanitized.characterProgress[character] = {
                                character: character,
                                attempts: sanitizedAttempts,
                                createdAt: progress.createdAt || Date.now(),
                                updatedAt: progress.updatedAt || Date.now()
                            };
                        }
                    }
                });
            }

            return sanitized;

        } catch (error) {
            console.error('データサニタイズエラー:', error);
            return this.getDefaultData();
        }
    }

    /**
     * デフォルトデータを取得
     * @returns {Object} デフォルトデータ
     */
    getDefaultData() {
        return {
            characterProgress: {},
            sessionData: {
                startTime: null,
                totalPracticeTime: 0,
                sessionsCount: 0
            },
            lastUpdated: Date.now(),
            version: this.currentVersion
        };
    }

    /**
     * 移行状況を取得
     * @returns {Object} 移行状況情報
     */
    getMigrationStatus() {
        return {
            currentVersion: this.currentVersion,
            dataVersion: this.getCurrentDataVersion(),
            supportedVersions: this.supportedVersions,
            migrationNeeded: this.getCurrentDataVersion() !== this.currentVersion,
            lastMigration: this.getLastMigrationTime()
        };
    }

    /**
     * 最後の移行時刻を取得
     * @returns {number|null} 最後の移行時刻
     */
    getLastMigrationTime() {
        try {
            const versionInfo = this.dataStorageService.loadFromStorage('hiragana_data_version');
            return versionInfo?.updatedAt || null;
        } catch (error) {
            return null;
        }
    }
}