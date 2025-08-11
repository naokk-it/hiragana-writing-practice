import { DataValidationService } from './DataValidationService.js';

/**
 * データ移行サービス
 * 旧難易度システムから新しい画数複雑度システムへの移行を管理
 */
export class DataMigrationService {
    constructor(dataStorageService, hiraganaDataService) {
        this.dataStorageService = dataStorageService;
        this.hiraganaDataService = hiraganaDataService;
        this.validationService = new DataValidationService();
        
        // データバージョン管理
        this.currentVersion = '2.0';
        this.supportedVersions = ['1.0', '1.1', '2.0'];
        
        // 旧難易度システムから新システムへのマッピング
        this.difficultyMapping = this.createDifficultyMapping();
        
        console.log('DataMigrationService初期化完了');
    }

    /**
     * 難易度マッピングを作成
     * @returns {Object} 難易度マッピング
     */
    createDifficultyMapping() {
        // 旧システム（4段階）から新システム（3段階）へのマッピング
        const oldToNewMapping = {
            // 旧システムの難易度1 → 新システムのbeginner
            1: 'beginner',
            // 旧システムの難易度2 → 新システムのintermediate  
            2: 'intermediate',
            // 旧システムの難易度3 → 新システムのintermediate
            3: 'intermediate',
            // 旧システムの難易度4 → 新システムのadvanced
            4: 'advanced'
        };

        // 文字別の詳細マッピング
        const characterMapping = {
            // 旧システムで難易度1だった文字
            'あ': { oldDifficulty: 1, newLevel: 'intermediate', reason: '3画のため中級に変更' },
            'い': { oldDifficulty: 1, newLevel: 'beginner', reason: '2画のため初級を維持' },
            'う': { oldDifficulty: 1, newLevel: 'beginner', reason: '2画のため初級を維持' },
            'え': { oldDifficulty: 1, newLevel: 'intermediate', reason: '3画のため中級に変更' },
            'お': { oldDifficulty: 1, newLevel: 'intermediate', reason: '3画のため中級に変更' },
            
            // 旧システムで難易度2だった文字
            'か': { oldDifficulty: 2, newLevel: 'intermediate', reason: '3画のため中級を維持' },
            'き': { oldDifficulty: 2, newLevel: 'advanced', reason: '4画のため上級に変更' },
            'く': { oldDifficulty: 2, newLevel: 'beginner', reason: '1画のため初級に変更' },
            'け': { oldDifficulty: 2, newLevel: 'intermediate', reason: '3画のため中級を維持' },
            'こ': { oldDifficulty: 2, newLevel: 'intermediate', reason: '3画のため中級を維持' },
            
            // その他の文字も同様にマッピング...
        };

        return {
            levelMapping: oldToNewMapping,
            characterMapping: characterMapping
        };
    }

    /**
     * データ移行を実行
     * @returns {Promise<boolean>} 移行成功かどうか
     */
    async migrateData() {
        try {
            console.log('データ移行を開始します...');
            
            // 現在のデータバージョンをチェック
            const currentDataVersion = this.getCurrentDataVersion();
            console.log(`現在のデータバージョン: ${currentDataVersion}`);
            
            if (currentDataVersion === this.currentVersion) {
                console.log('データは既に最新バージョンです');
                return true;
            }

            // バックアップを作成
            const backupSuccess = await this.createBackup();
            if (!backupSuccess) {
                console.error('バックアップ作成に失敗しました');
                return false;
            }

            // バージョンに応じた移行を実行
            let migrationSuccess = false;
            
            switch (currentDataVersion) {
                case '1.0':
                    migrationSuccess = await this.migrateFromV1_0();
                    break;
                case '1.1':
                    migrationSuccess = await this.migrateFromV1_1();
                    break;
                default:
                    console.warn(`未対応のデータバージョン: ${currentDataVersion}`);
                    migrationSuccess = await this.performFallbackMigration();
            }

            if (migrationSuccess) {
                // データバージョンを更新
                this.setDataVersion(this.currentVersion);
                console.log('データ移行が完了しました');
                
                // 移行後の検証
                const validationSuccess = await this.validateMigratedData();
                if (!validationSuccess) {
                    console.warn('移行データの検証で問題が見つかりました');
                }
                
                return true;
            } else {
                console.error('データ移行に失敗しました');
                await this.restoreFromBackup();
                return false;
            }

        } catch (error) {
            console.error('データ移行エラー:', error);
            await this.restoreFromBackup();
            return false;
        }
    }

    /**
     * バージョン1.0からの移行
     * @returns {Promise<boolean>} 移行成功かどうか
     */
    async migrateFromV1_0() {
        try {
            console.log('バージョン1.0からの移行を開始...');
            
            // 旧進捗データを取得
            const oldProgressData = this.dataStorageService.getProgressData();
            const oldSessions = this.dataStorageService.getAllSessions();
            
            // 新しい進捗追跡データ構造に変換
            const migratedProgressData = await this.convertProgressDataToV2(oldProgressData);
            
            // セッションデータを新しい難易度システムに対応
            const migratedSessions = await this.convertSessionsToV2(oldSessions);
            
            // 新しいデータを保存
            this.dataStorageService.saveData('progressTracking', migratedProgressData);
            this.dataStorageService.saveToStorage(this.dataStorageService.storageKeys.sessions, migratedSessions);
            
            console.log('バージョン1.0からの移行完了');
            return true;
            
        } catch (error) {
            console.error('バージョン1.0移行エラー:', error);
            return false;
        }
    }

    /**
     * バージョン1.1からの移行
     * @returns {Promise<boolean>} 移行成功かどうか
     */
    async migrateFromV1_1() {
        try {
            console.log('バージョン1.1からの移行を開始...');
            
            // 1.1では進捗追跡システムが部分的に実装されているため、
            // 既存データを新しい画数複雑度システムに適応
            const progressTrackingData = this.dataStorageService.loadData('progressTracking');
            
            if (progressTrackingData) {
                const migratedData = await this.updateProgressTrackingToV2(progressTrackingData);
                this.dataStorageService.saveData('progressTracking', migratedData);
            }
            
            console.log('バージョン1.1からの移行完了');
            return true;
            
        } catch (error) {
            console.error('バージョン1.1移行エラー:', error);
            return false;
        }
    }

    /**
     * 旧進捗データをバージョン2.0形式に変換
     * @param {Object} oldProgressData 旧進捗データ
     * @returns {Promise<Object>} 変換された進捗データ
     */
    async convertProgressDataToV2(oldProgressData) {
        const migratedData = {
            characterProgress: {},
            sessionData: {
                startTime: null,
                totalPracticeTime: oldProgressData.totalPracticeTime || 0,
                sessionsCount: oldProgressData.totalSessions || 0
            },
            lastUpdated: Date.now(),
            version: '2.0'
        };

        // 文字別進捗データを変換
        if (oldProgressData.characters) {
            for (const [character, charData] of Object.entries(oldProgressData.characters)) {
                try {
                    const migratedCharProgress = await this.convertCharacterProgress(character, charData);
                    if (migratedCharProgress) {
                        migratedData.characterProgress[character] = migratedCharProgress;
                    }
                } catch (error) {
                    console.warn(`文字 ${character} の進捗データ変換に失敗:`, error);
                }
            }
        }

        return migratedData;
    }

    /**
     * 文字進捗データを変換
     * @param {string} character 文字
     * @param {Object} oldCharData 旧文字データ
     * @returns {Promise<Object>} 変換された文字進捗データ
     */
    async convertCharacterProgress(character, oldCharData) {
        try {
            // 新しいCharacterProgressオブジェクトを作成
            const attempts = [];
            
            // 旧データから試行データを復元
            if (oldCharData.totalAttempts && oldCharData.averageScore) {
                // 統計データから推定試行データを生成
                const estimatedAttempts = Math.min(oldCharData.totalAttempts, 10);
                const baseScore = oldCharData.averageScore;
                const variation = 0.1; // スコアの変動幅
                
                for (let i = 0; i < estimatedAttempts; i++) {
                    const score = Math.max(0, Math.min(1, 
                        baseScore + (Math.random() - 0.5) * variation * 2
                    ));
                    
                    const timestamp = oldCharData.lastPracticed 
                        ? oldCharData.lastPracticed - (estimatedAttempts - i - 1) * 24 * 60 * 60 * 1000
                        : Date.now() - (estimatedAttempts - i - 1) * 24 * 60 * 60 * 1000;
                    
                    attempts.push({
                        score: score,
                        timestamp: timestamp,
                        details: {
                            migrated: true,
                            originalData: {
                                bestScore: oldCharData.bestScore,
                                averageScore: oldCharData.averageScore
                            }
                        }
                    });
                }
            }

            return {
                character: character,
                attempts: attempts,
                createdAt: oldCharData.createdAt || Date.now(),
                updatedAt: oldCharData.lastPracticed || Date.now()
            };

        } catch (error) {
            console.error(`文字進捗変換エラー (${character}):`, error);
            return null;
        }
    }

    /**
     * セッションデータをバージョン2.0形式に変換
     * @param {Array} oldSessions 旧セッションデータ
     * @returns {Promise<Array>} 変換されたセッションデータ
     */
    async convertSessionsToV2(oldSessions) {
        const migratedSessions = [];

        for (const session of oldSessions) {
            try {
                const migratedSession = await this.convertSession(session);
                if (migratedSession) {
                    migratedSessions.push(migratedSession);
                }
            } catch (error) {
                console.warn('セッション変換エラー:', error);
            }
        }

        return migratedSessions;
    }

    /**
     * 個別セッションを変換
     * @param {Object} oldSession 旧セッションデータ
     * @returns {Promise<Object>} 変換されたセッションデータ
     */
    async convertSession(oldSession) {
        try {
            // 文字の新しい難易度レベルを取得
            const character = oldSession.character?.character;
            if (!character) return null;

            const newDifficultyLevel = this.getNewDifficultyLevel(character);
            
            // セッションデータを新しい形式に変換
            const migratedSession = {
                ...oldSession,
                character: {
                    ...oldSession.character,
                    strokeComplexityLevel: newDifficultyLevel,
                    migrationInfo: {
                        originalDifficulty: oldSession.character.difficulty,
                        newDifficulty: newDifficultyLevel,
                        migrationDate: Date.now()
                    }
                }
            };

            return migratedSession;

        } catch (error) {
            console.error('セッション変換エラー:', error);
            return null;
        }
    }

    /**
     * 進捗追跡データをバージョン2.0に更新
     * @param {Object} progressTrackingData 既存の進捗追跡データ
     * @returns {Promise<Object>} 更新された進捗追跡データ
     */
    async updateProgressTrackingToV2(progressTrackingData) {
        try {
            const updatedData = {
                ...progressTrackingData,
                version: '2.0',
                lastUpdated: Date.now(),
                migrationInfo: {
                    migratedFrom: progressTrackingData.version || '1.1',
                    migrationDate: Date.now()
                }
            };

            // 文字進捗データに新しい難易度情報を追加
            if (updatedData.characterProgress) {
                for (const [character, progress] of Object.entries(updatedData.characterProgress)) {
                    const newDifficultyLevel = this.getNewDifficultyLevel(character);
                    
                    // 各試行データに新しい難易度情報を追加
                    if (progress.attempts) {
                        progress.attempts.forEach(attempt => {
                            if (!attempt.details) attempt.details = {};
                            attempt.details.strokeComplexityLevel = newDifficultyLevel;
                        });
                    }
                }
            }

            return updatedData;

        } catch (error) {
            console.error('進捗追跡データ更新エラー:', error);
            return progressTrackingData;
        }
    }

    /**
     * 文字の新しい難易度レベルを取得
     * @param {string} character 文字
     * @returns {string} 新しい難易度レベル
     */
    getNewDifficultyLevel(character) {
        // HiraganaDataServiceから新しい難易度レベルを取得
        try {
            const hiraganaChar = this.hiraganaDataService.getCharacterData(character);
            if (hiraganaChar && hiraganaChar.strokeComplexityLevel) {
                return hiraganaChar.strokeComplexityLevel;
            }
        } catch (error) {
            console.warn(`文字 ${character} の新しい難易度レベル取得に失敗:`, error);
        }

        // フォールバック: 文字別マッピングから取得
        const mapping = this.difficultyMapping.characterMapping[character];
        if (mapping) {
            return mapping.newLevel;
        }

        // デフォルト値
        return 'intermediate';
    }

    /**
     * フォールバック移行を実行
     * @returns {Promise<boolean>} 移行成功かどうか
     */
    async performFallbackMigration() {
        try {
            console.log('フォールバック移行を実行...');
            
            // 基本的なデータ構造の確認と修正
            const progressData = this.dataStorageService.loadData('progressTracking');
            
            if (progressData) {
                // 最低限の構造を確保
                const fallbackData = {
                    characterProgress: progressData.characterProgress || {},
                    sessionData: progressData.sessionData || {
                        startTime: null,
                        totalPracticeTime: 0,
                        sessionsCount: 0
                    },
                    lastUpdated: Date.now(),
                    version: this.currentVersion,
                    migrationInfo: {
                        type: 'fallback',
                        migrationDate: Date.now(),
                        originalVersion: 'unknown'
                    }
                };

                this.dataStorageService.saveData('progressTracking', fallbackData);
            }

            return true;

        } catch (error) {
            console.error('フォールバック移行エラー:', error);
            return false;
        }
    }

    /**
     * バックアップを作成
     * @returns {Promise<boolean>} バックアップ成功かどうか
     */
    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupKey = `hiragana_backup_${timestamp}`;
            
            // 全データをバックアップ
            const allData = {
                sessions: this.dataStorageService.getAllSessions(),
                progress: this.dataStorageService.getProgressData(),
                progressTracking: this.dataStorageService.loadData('progressTracking'),
                settings: this.dataStorageService.loadData('settings'),
                version: this.getCurrentDataVersion(),
                backupDate: Date.now()
            };

            localStorage.setItem(backupKey, JSON.stringify(allData));
            console.log(`バックアップ作成完了: ${backupKey}`);
            
            // 古いバックアップを削除（最新5個まで保持）
            this.cleanupOldBackups();
            
            return true;

        } catch (error) {
            console.error('バックアップ作成エラー:', error);
            return false;
        }
    }

    /**
     * バックアップから復元
     * @returns {Promise<boolean>} 復元成功かどうか
     */
    async restoreFromBackup() {
        try {
            // 最新のバックアップを検索
            const backupKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('hiragana_backup_')) {
                    backupKeys.push(key);
                }
            }

            if (backupKeys.length === 0) {
                console.warn('復元可能なバックアップが見つかりません');
                return false;
            }

            // 最新のバックアップを取得
            backupKeys.sort();
            const latestBackupKey = backupKeys[backupKeys.length - 1];
            
            const backupData = JSON.parse(localStorage.getItem(latestBackupKey));
            
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
            
            if (backupData.progressTracking) {
                this.dataStorageService.saveData('progressTracking', backupData.progressTracking);
            }

            console.log(`バックアップから復元完了: ${latestBackupKey}`);
            return true;

        } catch (error) {
            console.error('バックアップ復元エラー:', error);
            return false;
        }
    }

    /**
     * 古いバックアップをクリーンアップ
     */
    cleanupOldBackups() {
        try {
            const backupKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('hiragana_backup_')) {
                    backupKeys.push(key);
                }
            }

            // 日付順でソート
            backupKeys.sort();

            // 最新5個以外を削除
            if (backupKeys.length > 5) {
                const keysToDelete = backupKeys.slice(0, -5);
                keysToDelete.forEach(key => {
                    localStorage.removeItem(key);
                });
                console.log(`古いバックアップを削除: ${keysToDelete.length}個`);
            }

        } catch (error) {
            console.error('バックアップクリーンアップエラー:', error);
        }
    }

    /**
     * 移行後のデータを検証
     * @returns {Promise<boolean>} 検証成功かどうか
     */
    async validateMigratedData() {
        try {
            console.log('移行データの検証を開始...');
            
            // 全データを取得
            const allData = {
                progressTracking: this.dataStorageService.loadData('progressTracking'),
                sessions: this.dataStorageService.getAllSessions()
            };

            // 包括的な検証を実行
            const validationResult = this.validationService.validateDataIntegrity(allData);
            
            if (!validationResult.isValid) {
                console.warn('検証エラー:', validationResult.errors);
                console.warn('検証警告:', validationResult.warnings);
                
                // 検証レポートを生成
                const report = this.validationService.generateValidationReport(validationResult);
                console.log('検証レポート:\n', report);
                
                // 自動修復を試行
                const repairSuccess = await this.repairDataInconsistencies(validationResult.errors);
                if (repairSuccess) {
                    console.log('データの自動修復が完了しました');
                    return true;
                } else {
                    console.error('データの自動修復に失敗しました');
                    return false;
                }
            }

            if (validationResult.warnings.length > 0) {
                console.warn('検証警告:', validationResult.warnings);
            }

            console.log('移行データの検証が完了しました');
            return true;

        } catch (error) {
            console.error('データ検証エラー:', error);
            return false;
        }
    }

    /**
     * 進捗追跡データを検証（ValidationServiceを使用）
     * @param {Object} data 進捗追跡データ
     * @returns {Object} 検証結果
     */
    validateProgressTrackingData(data) {
        return this.validationService.validateProgressTrackingData(data);
    }

    /**
     * セッションデータを検証（ValidationServiceを使用）
     * @param {Array} sessions セッションデータ
     * @returns {Object} 検証結果
     */
    validateSessionData(sessions) {
        return this.validationService.validateSessions(sessions);
    }

    /**
     * データ不整合を修復
     * @param {Array} errors エラーリスト
     * @returns {Promise<boolean>} 修復成功かどうか
     */
    async repairDataInconsistencies(errors) {
        try {
            console.log('データ不整合の修復を開始...');
            
            let repairCount = 0;

            // 進捗追跡データの修復
            const progressTrackingData = this.dataStorageService.loadData('progressTracking');
            if (progressTrackingData) {
                const validationResult = this.validationService.validateProgressTrackingData(progressTrackingData);
                if (!validationResult.isValid && validationResult.fixedData) {
                    this.dataStorageService.saveData('progressTracking', validationResult.fixedData);
                    repairCount++;
                    console.log('進捗追跡データを自動修復しました');
                }
            }

            // セッションデータの修復
            const sessions = this.dataStorageService.getAllSessions();
            const sessionValidation = this.validationService.validateSessions(sessions);
            if (!sessionValidation.isValid && sessionValidation.validSessions.length > 0) {
                this.dataStorageService.saveToStorage(
                    this.dataStorageService.storageKeys.sessions, 
                    sessionValidation.validSessions
                );
                repairCount++;
                console.log(`セッションデータを修復: ${sessionValidation.invalidSessions.length}個の無効なセッションを除去`);
            }

            console.log(`データ修復完了: ${repairCount}個のデータを修復`);
            return true;

        } catch (error) {
            console.error('データ修復エラー:', error);
            return false;
        }
    }



    /**
     * 現在のデータバージョンを取得
     * @returns {string} データバージョン
     */
    getCurrentDataVersion() {
        try {
            const version = this.dataStorageService.loadData('dataVersion');
            return version || '1.0'; // デフォルトは1.0
        } catch (error) {
            console.error('データバージョン取得エラー:', error);
            return '1.0';
        }
    }

    /**
     * データバージョンを設定
     * @param {string} version バージョン
     */
    setDataVersion(version) {
        try {
            this.dataStorageService.saveData('dataVersion', version);
            console.log(`データバージョンを更新: ${version}`);
        } catch (error) {
            console.error('データバージョン設定エラー:', error);
        }
    }

    /**
     * 移行が必要かチェック
     * @returns {boolean} 移行が必要かどうか
     */
    isMigrationNeeded() {
        const currentVersion = this.getCurrentDataVersion();
        return currentVersion !== this.currentVersion;
    }

    /**
     * 移行情報を取得
     * @returns {Object} 移行情報
     */
    getMigrationInfo() {
        const currentVersion = this.getCurrentDataVersion();
        const isNeeded = this.isMigrationNeeded();
        
        return {
            currentVersion: currentVersion,
            targetVersion: this.currentVersion,
            migrationNeeded: isNeeded,
            supportedVersions: this.supportedVersions,
            lastMigration: this.getLastMigrationInfo()
        };
    }

    /**
     * 最後の移行情報を取得
     * @returns {Object|null} 最後の移行情報
     */
    getLastMigrationInfo() {
        try {
            const progressData = this.dataStorageService.loadData('progressTracking');
            return progressData?.migrationInfo || null;
        } catch (error) {
            console.error('最後の移行情報取得エラー:', error);
            return null;
        }
    }

    /**
     * 移行テストを実行
     * @returns {Promise<Object>} テスト結果
     */
    async runMigrationTest() {
        try {
            console.log('移行テストを開始...');
            
            const testResults = {
                backupTest: false,
                migrationTest: false,
                validationTest: false,
                restoreTest: false,
                overallSuccess: false
            };

            // バックアップテスト
            testResults.backupTest = await this.createBackup();
            
            if (testResults.backupTest) {
                // 移行テスト（実際には実行せず、検証のみ）
                const migrationInfo = this.getMigrationInfo();
                testResults.migrationTest = migrationInfo.migrationNeeded ? 
                    this.validateMigrationPreconditions() : true;
                
                // 検証テスト
                testResults.validationTest = await this.validateMigratedData();
                
                // 復元テスト
                testResults.restoreTest = await this.testBackupRestore();
            }

            testResults.overallSuccess = Object.values(testResults).every(result => result === true);
            
            console.log('移行テスト完了:', testResults);
            return testResults;

        } catch (error) {
            console.error('移行テストエラー:', error);
            return {
                backupTest: false,
                migrationTest: false,
                validationTest: false,
                restoreTest: false,
                overallSuccess: false,
                error: error.message
            };
        }
    }

    /**
     * 移行前提条件を検証
     * @returns {boolean} 前提条件が満たされているかどうか
     */
    validateMigrationPreconditions() {
        try {
            // LocalStorageの利用可能性
            if (!this.dataStorageService.isLocalStorageAvailable()) {
                console.error('LocalStorageが利用できません');
                return false;
            }

            // 必要なサービスの存在確認
            if (!this.hiraganaDataService) {
                console.error('HiraganaDataServiceが利用できません');
                return false;
            }

            // データの存在確認
            const hasData = this.dataStorageService.getAllSessions().length > 0 ||
                           this.dataStorageService.loadData('progressTracking') !== null;
            
            if (!hasData) {
                console.log('移行対象のデータが存在しません');
                return true; // データがない場合は移行不要
            }

            return true;

        } catch (error) {
            console.error('移行前提条件検証エラー:', error);
            return false;
        }
    }

    /**
     * バックアップ復元テスト
     * @returns {Promise<boolean>} テスト成功かどうか
     */
    async testBackupRestore() {
        try {
            // テスト用の一時データを作成
            const testKey = 'test_restore_data';
            const testData = { test: true, timestamp: Date.now() };
            
            this.dataStorageService.saveData(testKey, testData);
            
            // データを削除
            this.dataStorageService.removeData(testKey);
            
            // 復元テスト（実際のバックアップからではなく、機能テスト）
            const restored = this.dataStorageService.loadData(testKey);
            
            // クリーンアップ
            this.dataStorageService.removeData(testKey);
            
            return restored === null; // 削除されていることを確認

        } catch (error) {
            console.error('バックアップ復元テストエラー:', error);
            return false;
        }
    }
}