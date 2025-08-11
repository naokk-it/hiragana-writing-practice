import { PracticeSession } from '../models/PracticeSession.js';
import { DrawingData } from '../models/DrawingData.js';

/**
 * データ保存サービス
 * LocalStorageを使用した練習データの保存・読み込み機能を提供
 */
export class DataStorageService {
    constructor() {
        this.storageKeys = {
            sessions: 'hiragana_practice_sessions',
            progress: 'hiragana_practice_progress',
            settings: 'hiragana_practice_settings',
            currentSession: 'hiragana_current_session',
            progressTracking: 'hiragana_progress_tracking', // 新しい進捗追跡データ
            dataVersion: 'hiragana_data_version' // データバージョン情報
        };
        
        this.maxStoredSessions = 50; // 最大保存セッション数を削減（パフォーマンス向上）
        this.compressionEnabled = true; // データ圧縮の有効化
        this.migrationService = null; // 移行サービス（後で設定）
        
        // パフォーマンス最適化用の設定
        this.batchWriteEnabled = true; // バッチ書き込みの有効化
        this.writeQueue = []; // 書き込みキュー
        this.writeTimeout = null; // 書き込みタイマー
        this.cacheEnabled = true; // メモリキャッシュの有効化
        this.memoryCache = new Map(); // メモリキャッシュ
        
        this.initializeStorage();
    }

    /**
     * ストレージを初期化
     */
    async initializeStorage() {
        try {
            // LocalStorageの利用可能性をチェック
            if (!this.isLocalStorageAvailable()) {
                console.warn('LocalStorageが利用できません');
                this.setupFallbackStorage();
                return;
            }

            // データ移行が必要かチェック
            if (this.migrationService && this.migrationService.isMigrationNeeded()) {
                console.log('データ移行が必要です');
                const migrationSuccess = await this.performMigration();
                if (!migrationSuccess) {
                    console.warn('データ移行に失敗しましたが、処理を続行します');
                }
            }

            // 既存データの整合性をチェック
            this.validateStoredData();
            
            console.log('DataStorageService初期化完了');
            
        } catch (error) {
            console.error('ストレージ初期化エラー:', error);
            this.handleStorageError(error, 'initialization');
        }
    }

    /**
     * 移行サービスを設定
     * @param {DataMigrationService} migrationService 移行サービス
     */
    setMigrationService(migrationService) {
        this.migrationService = migrationService;
    }

    /**
     * データ移行を実行
     * @returns {boolean} 移行成功かどうか
     */
    async performMigration() {
        if (!this.migrationService) {
            console.warn('移行サービスが設定されていません');
            return false;
        }

        try {
            return await this.migrationService.migrateData();
        } catch (error) {
            console.error('データ移行実行エラー:', error);
            return false;
        }
    }

    /**
     * LocalStorageの利用可能性をチェック
     * @returns {boolean} 利用可能かどうか
     */
    isLocalStorageAvailable() {
        try {
            const testKey = '__localStorage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 練習セッションを保存
     * @param {PracticeSession} session 保存するセッション
     * @returns {boolean} 保存成功かどうか
     */
    savePracticeSession(session) {
        try {
            if (!session || !session.isValid()) {
                throw new Error('無効なセッションデータ');
            }

            // 既存セッションを取得
            const sessions = this.getAllSessions();
            
            // 新しいセッションを追加
            sessions.push(session.toJSON());
            
            // セッション数制限を適用
            this.limitStoredSessions(sessions);
            
            // 保存
            const success = this.saveToStorage(this.storageKeys.sessions, sessions);
            
            if (success) {
                console.log(`セッション保存完了: ${session.character.character}`);
                this.updateProgressData(session);
            }
            
            return success;
            
        } catch (error) {
            console.error('セッション保存エラー:', error);
            this.handleStorageError(error, 'save_session');
            return false;
        }
    }

    /**
     * 現在のセッションを保存
     * @param {PracticeSession} session 現在のセッション
     * @returns {boolean} 保存成功かどうか
     */
    saveCurrentSession(session) {
        try {
            if (!session) {
                this.removeFromStorage(this.storageKeys.currentSession);
                return true;
            }

            const sessionData = session.toJSON();
            return this.saveToStorage(this.storageKeys.currentSession, sessionData);
            
        } catch (error) {
            console.error('現在セッション保存エラー:', error);
            return false;
        }
    }

    /**
     * 現在のセッションを読み込み
     * @returns {PracticeSession|null} 現在のセッション
     */
    loadCurrentSession() {
        try {
            const sessionData = this.loadFromStorage(this.storageKeys.currentSession);
            if (!sessionData) return null;

            return PracticeSession.fromJSON(sessionData);
            
        } catch (error) {
            console.error('現在セッション読み込みエラー:', error);
            return null;
        }
    }

    /**
     * 全セッションを取得
     * @returns {Array} セッション配列
     */
    getAllSessions() {
        try {
            const sessions = this.loadFromStorage(this.storageKeys.sessions);
            return Array.isArray(sessions) ? sessions : [];
            
        } catch (error) {
            console.error('セッション取得エラー:', error);
            return [];
        }
    }

    /**
     * 特定文字のセッションを取得
     * @param {string} character 文字
     * @returns {Array} 該当セッション配列
     */
    getSessionsByCharacter(character) {
        try {
            const allSessions = this.getAllSessions();
            return allSessions.filter(session => 
                session.character && session.character.character === character
            );
            
        } catch (error) {
            console.error('文字別セッション取得エラー:', error);
            return [];
        }
    }

    /**
     * 進捗データを更新
     * @param {PracticeSession} session 完了したセッション
     */
    updateProgressData(session) {
        try {
            const progress = this.getProgressData();
            const character = session.character.character;
            
            if (!progress.characters[character]) {
                progress.characters[character] = {
                    character: character,
                    totalSessions: 0,
                    totalAttempts: 0,
                    bestScore: 0,
                    averageScore: 0,
                    lastPracticed: null,
                    practiceStreak: 0
                };
            }

            const charProgress = progress.characters[character];
            
            // 統計を更新
            charProgress.totalSessions++;
            charProgress.totalAttempts += session.attempts.length;
            charProgress.lastPracticed = session.endTime || Date.now();
            
            // スコア統計を更新
            const sessionBestScore = session.getBestAttempt()?.scoreResult?.score || 0;
            const sessionAvgScore = session.getAverageScore();
            
            charProgress.bestScore = Math.max(charProgress.bestScore, sessionBestScore);
            
            // 平均スコアを再計算
            const allSessions = this.getSessionsByCharacter(character);
            const totalScore = allSessions.reduce((sum, s) => {
                const avgScore = s.averageScore || 0;
                return sum + avgScore;
            }, 0);
            charProgress.averageScore = totalScore / allSessions.length;
            
            // 全体統計を更新
            progress.totalSessions++;
            progress.totalPracticeTime += session.getDuration();
            progress.lastActivity = Date.now();
            
            // 保存
            this.saveToStorage(this.storageKeys.progress, progress);
            
            console.log(`進捗データ更新: ${character}`);
            
        } catch (error) {
            console.error('進捗データ更新エラー:', error);
        }
    }

    /**
     * 進捗データを取得
     * @returns {Object} 進捗データ
     */
    getProgressData() {
        try {
            const defaultProgress = {
                totalSessions: 0,
                totalPracticeTime: 0,
                lastActivity: null,
                characters: {},
                createdAt: Date.now(),
                version: '1.0'
            };

            const progress = this.loadFromStorage(this.storageKeys.progress);
            return progress ? { ...defaultProgress, ...progress } : defaultProgress;
            
        } catch (error) {
            console.error('進捗データ取得エラー:', error);
            return {
                totalSessions: 0,
                totalPracticeTime: 0,
                lastActivity: null,
                characters: {},
                createdAt: Date.now(),
                version: '1.0'
            };
        }
    }

    /**
     * 特定文字の進捗を取得
     * @param {string} character 文字
     * @returns {Object} 文字の進捗データ
     */
    getCharacterProgress(character) {
        const progress = this.getProgressData();
        return progress.characters[character] || null;
    }

    /**
     * ストレージからデータを読み込み（最適化版）
     * @param {string} key ストレージキー
     * @returns {*} 読み込まれたデータ
     */
    loadFromStorage(key) {
        try {
            // メモリキャッシュから高速取得
            if (this.cacheEnabled && this.memoryCache.has(key)) {
                return this.memoryCache.get(key);
            }

            const data = localStorage.getItem(key);
            if (!data) return null;

            const parsed = JSON.parse(data);
            
            // データの圧縮解除（必要に応じて）
            const decompressed = this.decompressData(parsed);
            
            // データの整合性をチェック
            if (!this.isDataIntegrityValid(decompressed)) {
                console.warn(`データ整合性エラー (${key}) - 復旧を試行`);
                return this.attemptDataRecovery(this.getKeyFromStorageKey(key));
            }

            // メモリキャッシュに保存
            if (this.cacheEnabled) {
                this.memoryCache.set(key, decompressed);
            }
            
            return decompressed;
            
        } catch (error) {
            console.error(`ストレージ読み込みエラー (${key}):`, error);
            
            // JSON解析エラーの場合は復旧を試行
            if (error instanceof SyntaxError) {
                console.warn(`JSON解析エラー (${key}) - 復旧を試行`);
                return this.attemptDataRecovery(this.getKeyFromStorageKey(key));
            }
            
            return null;
        }
    }

    /**
     * ストレージにデータを保存（最適化版）
     * @param {string} key ストレージキー
     * @param {*} data 保存するデータ
     * @returns {boolean} 保存成功かどうか
     */
    saveToStorage(key, data) {
        try {
            // メモリキャッシュを更新
            if (this.cacheEnabled) {
                this.memoryCache.set(key, data);
            }

            // バッチ書き込みが有効な場合はキューに追加
            if (this.batchWriteEnabled) {
                return this.queueWrite(key, data);
            }

            return this.performDirectWrite(key, data);
            
        } catch (error) {
            console.error(`ストレージ保存エラー (${key}):`, error);
            
            // ストレージ容量不足の場合の処理
            if (error.name === 'QuotaExceededError') {
                return this.handleStorageQuotaExceeded(key, data);
            }
            
            return false;
        }
    }

    /**
     * 直接書き込みを実行
     * @param {string} key ストレージキー
     * @param {*} data 保存するデータ
     * @returns {boolean} 保存成功かどうか
     */
    performDirectWrite(key, data) {
        try {
            // 保存前に自動バックアップを作成
            const dataKey = this.getKeyFromStorageKey(key);
            if (dataKey) {
                this.createAutoBackup(dataKey, data);
            }

            // データの圧縮（必要に応じて）
            const compressedData = this.compressData(data);
            
            const serialized = JSON.stringify(compressedData);
            
            // データサイズをチェック（制限を2MBに削減）
            if (serialized.length > 2 * 1024 * 1024) {
                console.warn(`データサイズが大きすぎます (${key}): ${serialized.length} bytes`);
                // 古いデータを削除してサイズを削減
                const reducedData = this.reduceDataSize(data, dataKey);
                if (reducedData) {
                    const reducedSerialized = JSON.stringify(this.compressData(reducedData));
                    localStorage.setItem(key, reducedSerialized);
                    console.log(`データサイズを削減して保存: ${reducedSerialized.length} bytes`);
                    return true;
                }
            }
            
            localStorage.setItem(key, serialized);
            return true;
            
        } catch (error) {
            console.error(`直接書き込みエラー (${key}):`, error);
            return false;
        }
    }

    /**
     * バッチ書き込みキューに追加
     * @param {string} key ストレージキー
     * @param {*} data 保存するデータ
     * @returns {boolean} キュー追加成功かどうか
     */
    queueWrite(key, data) {
        try {
            // 既存のキューエントリを更新
            const existingIndex = this.writeQueue.findIndex(item => item.key === key);
            if (existingIndex !== -1) {
                this.writeQueue[existingIndex].data = data;
                this.writeQueue[existingIndex].timestamp = Date.now();
            } else {
                this.writeQueue.push({
                    key: key,
                    data: data,
                    timestamp: Date.now()
                });
            }

            // バッチ書き込みをスケジュール
            this.scheduleBatchWrite();
            return true;
            
        } catch (error) {
            console.error(`キュー追加エラー (${key}):`, error);
            return false;
        }
    }

    /**
     * バッチ書き込みをスケジュール
     */
    scheduleBatchWrite() {
        if (this.writeTimeout) {
            clearTimeout(this.writeTimeout);
        }

        // 500ms後にバッチ書き込みを実行
        this.writeTimeout = setTimeout(() => {
            this.executeBatchWrite();
        }, 500);
    }

    /**
     * バッチ書き込みを実行
     */
    executeBatchWrite() {
        if (this.writeQueue.length === 0) {
            return;
        }

        console.log(`バッチ書き込み実行: ${this.writeQueue.length}件`);
        
        const itemsToWrite = [...this.writeQueue];
        this.writeQueue = [];

        itemsToWrite.forEach(item => {
            try {
                this.performDirectWrite(item.key, item.data);
            } catch (error) {
                console.error(`バッチ書き込みエラー (${item.key}):`, error);
            }
        });

        this.writeTimeout = null;
    }

    /**
     * ストレージキーからデータキーを取得
     * @param {string} storageKey ストレージキー
     * @returns {string|null} データキー
     */
    getKeyFromStorageKey(storageKey) {
        for (const [dataKey, sKey] of Object.entries(this.storageKeys)) {
            if (sKey === storageKey) {
                return dataKey;
            }
        }
        return null;
    }

    /**
     * データの整合性をチェック
     * @param {*} data データ
     * @returns {boolean} 整合性が有効かどうか
     */
    isDataIntegrityValid(data) {
        try {
            if (data === null || data === undefined) {
                return true; // nullやundefinedは有効とする
            }

            // 基本的な型チェック
            if (typeof data === 'object' && data !== null) {
                // 循環参照のチェック
                JSON.stringify(data);
                return true;
            }

            return true;

        } catch (error) {
            console.error('データ整合性チェックエラー:', error);
            return false;
        }
    }

    /**
     * データサイズを削減
     * @param {*} data データ
     * @param {string} dataKey データキー
     * @returns {*} サイズ削減されたデータ
     */
    reduceDataSize(data, dataKey) {
        try {
            if (dataKey === 'progressTracking' && data.characterProgress) {
                const reduced = { ...data };
                
                // 各文字の試行データを制限
                Object.keys(reduced.characterProgress).forEach(character => {
                    const progress = reduced.characterProgress[character];
                    if (progress.attempts && progress.attempts.length > 50) {
                        // 最新50件のみ保持
                        progress.attempts = progress.attempts.slice(-50);
                    }
                });

                console.log('進捗追跡データのサイズを削減しました');
                return reduced;
            }

            return data;

        } catch (error) {
            console.error('データサイズ削減エラー:', error);
            return null;
        }
    }

    /**
     * ストレージからデータを削除
     * @param {string} key ストレージキー
     */
    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`ストレージ削除エラー (${key}):`, error);
        }
    }

    /**
     * 保存セッション数を制限
     * @param {Array} sessions セッション配列
     */
    limitStoredSessions(sessions) {
        if (sessions.length <= this.maxStoredSessions) return;

        // 古いセッションから削除
        sessions.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
        sessions.splice(this.maxStoredSessions);
        
        console.log(`古いセッションを削除: ${sessions.length}個のセッションを保持`);
    }

    /**
     * データを圧縮（簡易実装）
     * @param {*} data 圧縮するデータ
     * @returns {*} 圧縮されたデータ
     */
    compressData(data) {
        if (!this.compressionEnabled) return data;
        
        // 簡易圧縮: 不要なプロパティを削除
        if (Array.isArray(data)) {
            return data.map(item => this.compressSessionData(item));
        }
        
        return data;
    }

    /**
     * セッションデータを圧縮
     * @param {Object} sessionData セッションデータ
     * @returns {Object} 圧縮されたセッションデータ
     */
    compressSessionData(sessionData) {
        if (!sessionData.attempts) return sessionData;
        
        // 描画データの詳細を削除（統計情報のみ保持）
        const compressedAttempts = sessionData.attempts.map(attempt => ({
            timestamp: attempt.timestamp,
            scoreResult: attempt.scoreResult,
            recognitionResult: attempt.recognitionResult,
            drawingSummary: attempt.drawingData ? {
                strokeCount: attempt.drawingData.strokes?.length || 0,
                pointCount: attempt.drawingData.metadata?.totalPoints || 0,
                complexity: attempt.drawingData.complexity || 0
            } : null
        }));
        
        return {
            ...sessionData,
            attempts: compressedAttempts
        };
    }

    /**
     * データを解凍
     * @param {*} data 解凍するデータ
     * @returns {*} 解凍されたデータ
     */
    decompressData(data) {
        // 現在は圧縮していないため、そのまま返す
        return data;
    }

    /**
     * ストレージ容量不足の処理
     * @param {string} key 保存しようとしたキー
     * @param {*} data 保存しようとしたデータ
     * @returns {boolean} 処理成功かどうか
     */
    handleStorageQuotaExceeded(key, data) {
        console.warn('ストレージ容量不足 - 古いデータを削除します');
        
        try {
            let cleanupSuccess = false;

            // 古いセッションデータを削除
            const sessions = this.getAllSessions();
            if (sessions.length > 10) {
                sessions.sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
                const reducedSessions = sessions.slice(-10); // 最新10個のみ保持
                localStorage.setItem(this.storageKeys.sessions, JSON.stringify(reducedSessions));
                cleanupSuccess = true;
                console.log(`古いセッションデータを削除: ${sessions.length - 10}件`);
            }

            // 古いバックアップデータを削除
            const backupKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const storageKey = localStorage.key(i);
                if (storageKey && storageKey.includes('backup')) {
                    backupKeys.push(storageKey);
                }
            }

            if (backupKeys.length > 3) {
                // 最新3つ以外のバックアップを削除
                backupKeys.sort().slice(0, -3).forEach(backupKey => {
                    localStorage.removeItem(backupKey);
                });
                cleanupSuccess = true;
                console.log(`古いバックアップを削除: ${backupKeys.length - 3}件`);
            }

            // クリーンアップ後に再度保存を試行
            if (cleanupSuccess) {
                try {
                    const serialized = JSON.stringify(this.compressData(data));
                    localStorage.setItem(key, serialized);
                    console.log('容量不足対応後の保存に成功');
                    return true;
                } catch (retryError) {
                    console.error('容量不足対応後の保存に失敗:', retryError);
                }
            }

            return false;
            
        } catch (error) {
            console.error('容量不足対応エラー:', error);
            return false;
        }
    }

    /**
     * 保存されたデータの整合性をチェック
     */
    validateStoredData() {
        try {
            // セッションデータの検証
            const sessions = this.getAllSessions();
            const validSessions = sessions.filter(session => {
                return session.character && 
                       session.startTime && 
                       Array.isArray(session.attempts);
            });
            
            if (validSessions.length !== sessions.length) {
                console.warn(`無効なセッションデータを修正: ${sessions.length - validSessions.length}個削除`);
                this.saveToStorage(this.storageKeys.sessions, validSessions);
            }
            
            // 進捗データの検証
            const progress = this.getProgressData();
            if (!progress.characters || typeof progress.characters !== 'object') {
                console.warn('進捗データを初期化');
                this.saveToStorage(this.storageKeys.progress, {
                    totalSessions: 0,
                    totalPracticeTime: 0,
                    lastActivity: null,
                    characters: {},
                    createdAt: Date.now(),
                    version: '1.0'
                });
            }
            
        } catch (error) {
            console.error('データ整合性チェックエラー:', error);
        }
    }

    /**
     * フォールバックストレージを設定
     */
    setupFallbackStorage() {
        console.log('フォールバックストレージモードを有効化');
        
        // メモリ内ストレージ
        this.fallbackStorage = {
            sessions: [],
            progress: {
                totalSessions: 0,
                totalPracticeTime: 0,
                lastActivity: null,
                characters: {},
                createdAt: Date.now(),
                version: '1.0'
            },
            currentSession: null
        };
        
        this.useFallback = true;
    }

    /**
     * ストレージエラーを処理
     * @param {Error} error エラーオブジェクト
     * @param {string} operation 操作名
     */
    handleStorageError(error, operation) {
        console.error(`ストレージエラー (${operation}):`, error);
        
        // エラーの種類に応じた対応
        if (error.name === 'QuotaExceededError') {
            this.handleStorageQuotaExceeded('', null);
        } else if (error.name === 'SecurityError') {
            console.warn('ストレージアクセスが制限されています');
            this.setupFallbackStorage();
        }
    }

    /**
     * 全データをクリア
     * @returns {boolean} クリア成功かどうか
     */
    clearAllData() {
        try {
            Object.values(this.storageKeys).forEach(key => {
                this.removeFromStorage(key);
            });
            
            console.log('全データクリア完了');
            return true;
            
        } catch (error) {
            console.error('データクリアエラー:', error);
            return false;
        }
    }

    /**
     * 汎用データ保存メソッド
     * @param {string} key データキー
     * @param {*} data 保存するデータ
     * @returns {boolean} 保存成功かどうか
     */
    saveData(key, data) {
        try {
            // データの妥当性をチェック
            if (!this.validateDataBeforeSave(key, data)) {
                console.warn(`データ保存をスキップ: 無効なデータ (${key})`);
                return false;
            }

            // データをサニタイズ
            const sanitizedData = this.sanitizeDataBeforeSave(key, data);
            
            // 実際のストレージキーを取得
            const storageKey = this.storageKeys[key] || key;
            
            return this.saveToStorage(storageKey, sanitizedData);
            
        } catch (error) {
            console.error(`データ保存エラー (${key}):`, error);
            this.handleStorageError(error, 'save_data');
            return false;
        }
    }

    /**
     * 汎用データ読み込みメソッド
     * @param {string} key データキー
     * @returns {*} 読み込まれたデータ
     */
    loadData(key) {
        try {
            // 実際のストレージキーを取得
            const storageKey = this.storageKeys[key] || key;
            
            const data = this.loadFromStorage(storageKey);
            
            // データの妥当性をチェック
            if (data && !this.validateDataAfterLoad(key, data)) {
                console.warn(`無効なデータを検出 (${key}) - サニタイズを実行`);
                return this.sanitizeDataAfterLoad(key, data);
            }
            
            return data;
            
        } catch (error) {
            console.error(`データ読み込みエラー (${key}):`, error);
            this.handleStorageError(error, 'load_data');
            return null;
        }
    }

    /**
     * 汎用データ削除メソッド
     * @param {string} key データキー
     * @returns {boolean} 削除成功かどうか
     */
    removeData(key) {
        try {
            const storageKey = this.storageKeys[key] || key;
            this.removeFromStorage(storageKey);
            return true;
        } catch (error) {
            console.error(`データ削除エラー (${key}):`, error);
            return false;
        }
    }

    /**
     * 保存前のデータ妥当性チェック
     * @param {string} key データキー
     * @param {*} data データ
     * @returns {boolean} データが有効かどうか
     */
    validateDataBeforeSave(key, data) {
        if (data === null || data === undefined) {
            return false;
        }

        switch (key) {
            case 'progressTracking':
                return this.validateProgressTrackingData(data);
            default:
                return true;
        }
    }

    /**
     * 読み込み後のデータ妥当性チェック
     * @param {string} key データキー
     * @param {*} data データ
     * @returns {boolean} データが有効かどうか
     */
    validateDataAfterLoad(key, data) {
        if (data === null || data === undefined) {
            return false;
        }

        switch (key) {
            case 'progressTracking':
                return this.validateProgressTrackingData(data);
            default:
                return true;
        }
    }

    /**
     * 進捗追跡データの妥当性チェック
     * @param {Object} data 進捗追跡データ
     * @returns {boolean} データが有効かどうか
     */
    validateProgressTrackingData(data) {
        try {
            if (!data || typeof data !== 'object') {
                return false;
            }

            // 基本構造の確認
            if (!data.characterProgress || typeof data.characterProgress !== 'object') {
                return false;
            }

            // 各文字の進捗データを検証
            for (const character in data.characterProgress) {
                const progress = data.characterProgress[character];
                
                if (!progress || typeof progress !== 'object') {
                    return false;
                }

                if (!progress.character || !Array.isArray(progress.attempts)) {
                    return false;
                }

                // 試行データの検証
                for (const attempt of progress.attempts) {
                    if (!attempt || typeof attempt !== 'object') {
                        return false;
                    }

                    if (typeof attempt.score !== 'number' || 
                        attempt.score < 0 || attempt.score > 1 ||
                        typeof attempt.timestamp !== 'number' ||
                        attempt.timestamp <= 0) {
                        return false;
                    }
                }
            }

            return true;

        } catch (error) {
            console.error('進捗追跡データ検証エラー:', error);
            return false;
        }
    }

    /**
     * 保存前のデータサニタイズ
     * @param {string} key データキー
     * @param {*} data データ
     * @returns {*} サニタイズされたデータ
     */
    sanitizeDataBeforeSave(key, data) {
        switch (key) {
            case 'progressTracking':
                return this.sanitizeProgressTrackingData(data);
            default:
                return data;
        }
    }

    /**
     * 読み込み後のデータサニタイズ
     * @param {string} key データキー
     * @param {*} data データ
     * @returns {*} サニタイズされたデータ
     */
    sanitizeDataAfterLoad(key, data) {
        switch (key) {
            case 'progressTracking':
                return this.sanitizeProgressTrackingData(data);
            default:
                return data;
        }
    }

    /**
     * 進捗追跡データのサニタイズ
     * @param {Object} data 進捗追跡データ
     * @returns {Object} サニタイズされたデータ
     */
    sanitizeProgressTrackingData(data) {
        try {
            if (!data || typeof data !== 'object') {
                return this.getDefaultProgressTrackingData();
            }

            const sanitized = {
                characterProgress: {},
                sessionData: {
                    startTime: null,
                    totalPracticeTime: 0,
                    sessionsCount: 0
                },
                lastUpdated: Date.now(),
                version: '2.0'
            };

            // セッションデータのサニタイズ
            if (data.sessionData && typeof data.sessionData === 'object') {
                sanitized.sessionData = {
                    startTime: data.sessionData.startTime || null,
                    totalPracticeTime: Math.max(0, data.sessionData.totalPracticeTime || 0),
                    sessionsCount: Math.max(0, data.sessionData.sessionsCount || 0)
                };
            }

            // 文字進捗データのサニタイズ
            if (data.characterProgress && typeof data.characterProgress === 'object') {
                Object.keys(data.characterProgress).forEach(character => {
                    const progress = data.characterProgress[character];
                    
                    if (progress && progress.character && Array.isArray(progress.attempts)) {
                        const sanitizedAttempts = progress.attempts
                            .filter(attempt => 
                                attempt &&
                                typeof attempt.score === 'number' &&
                                attempt.score >= 0 && attempt.score <= 1 &&
                                typeof attempt.timestamp === 'number' &&
                                attempt.timestamp > 0
                            )
                            .map(attempt => ({
                                score: Math.max(0, Math.min(1, attempt.score)),
                                timestamp: attempt.timestamp,
                                details: attempt.details || {}
                            }))
                            .slice(-100); // 最新100件まで保持

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
            console.error('進捗追跡データサニタイズエラー:', error);
            return this.getDefaultProgressTrackingData();
        }
    }

    /**
     * デフォルト進捗追跡データを取得
     * @returns {Object} デフォルトデータ
     */
    getDefaultProgressTrackingData() {
        return {
            characterProgress: {},
            sessionData: {
                startTime: null,
                totalPracticeTime: 0,
                sessionsCount: 0
            },
            lastUpdated: Date.now(),
            version: '2.0'
        };
    }

    /**
     * データ復旧を試行
     * @param {string} key データキー
     * @returns {*} 復旧されたデータまたはnull
     */
    attemptDataRecovery(key) {
        try {
            console.log(`データ復旧を試行: ${key}`);

            // バックアップからの復旧を試行
            const backupData = this.loadFromStorage(`${key}_backup`);
            if (backupData && this.validateDataAfterLoad(key, backupData)) {
                console.log(`バックアップからデータを復旧: ${key}`);
                return backupData;
            }

            // 移行サービスによる復旧を試行
            if (this.migrationService && key === 'progressTracking') {
                const recoveredData = this.migrationService.sanitizeData(null);
                if (recoveredData) {
                    console.log(`移行サービスによりデータを復旧: ${key}`);
                    return recoveredData;
                }
            }

            // デフォルトデータを返す
            switch (key) {
                case 'progressTracking':
                    return this.getDefaultProgressTrackingData();
                default:
                    return null;
            }

        } catch (error) {
            console.error(`データ復旧エラー (${key}):`, error);
            return null;
        }
    }

    /**
     * データの自動バックアップを作成
     * @param {string} key データキー
     * @param {*} data データ
     */
    createAutoBackup(key, data) {
        try {
            // 重要なデータのみバックアップ
            if (key === 'progressTracking' && data) {
                const backupKey = `${key}_backup`;
                this.saveToStorage(backupKey, data);
                console.log(`自動バックアップ作成: ${key}`);
            }
        } catch (error) {
            console.error(`自動バックアップエラー (${key}):`, error);
        }
    }

    /**
     * ストレージ使用量を取得
     * @returns {Object} 使用量情報
     */
    getStorageUsage() {
        try {
            let totalSize = 0;
            const usage = {};
            
            Object.entries(this.storageKeys).forEach(([name, key]) => {
                const data = localStorage.getItem(key);
                const size = data ? data.length : 0;
                usage[name] = size;
                totalSize += size;
            });
            
            return {
                total: totalSize,
                breakdown: usage,
                available: this.isLocalStorageAvailable()
            };
            
        } catch (error) {
            console.error('ストレージ使用量取得エラー:', error);
            return { total: 0, breakdown: {}, available: false };
        }
    }

    /**
     * メモリ使用量を取得
     * @returns {Object} メモリ使用量情報
     */
    getMemoryUsage() {
        return {
            cacheSize: this.memoryCache.size,
            writeQueueSize: this.writeQueue.length,
            cacheEnabled: this.cacheEnabled,
            batchWriteEnabled: this.batchWriteEnabled
        };
    }

    /**
     * メモリキャッシュをクリア
     */
    clearMemoryCache() {
        this.memoryCache.clear();
        console.log('DataStorageService メモリキャッシュをクリアしました');
    }

    /**
     * 書き込みキューを強制実行
     */
    flushWriteQueue() {
        if (this.writeTimeout) {
            clearTimeout(this.writeTimeout);
            this.writeTimeout = null;
        }
        this.executeBatchWrite();
    }

    /**
     * メモリクリーンアップ
     */
    performMemoryCleanup() {
        // キャッシュサイズが大きすぎる場合はクリア
        if (this.memoryCache.size > 50) {
            console.log('DataStorageService メモリクリーンアップを実行');
            
            // 重要なデータのみ保持
            const importantKeys = [
                this.storageKeys.currentSession,
                this.storageKeys.progress
            ];
            
            const keysToKeep = new Map();
            importantKeys.forEach(key => {
                if (this.memoryCache.has(key)) {
                    keysToKeep.set(key, this.memoryCache.get(key));
                }
            });
            
            this.memoryCache.clear();
            keysToKeep.forEach((value, key) => {
                this.memoryCache.set(key, value);
            });
        }

        // 古い書き込みキューエントリを削除
        const now = Date.now();
        this.writeQueue = this.writeQueue.filter(item => 
            now - item.timestamp < 30000 // 30秒以内のもののみ保持
        );
    }

    /**
     * 自動バックアップを作成
     * @param {string} dataKey データキー
     * @param {*} data データ
     */
    createAutoBackup(dataKey, data) {
        try {
            // 重要なデータのみバックアップ
            const importantKeys = ['progress', 'progressTracking'];
            if (!importantKeys.includes(dataKey)) {
                return;
            }

            const backupKey = `${dataKey}_backup`;
            const backupData = {
                data: data,
                timestamp: Date.now(),
                version: '1.0'
            };

            // 直接書き込み（バッチ処理をバイパス）
            localStorage.setItem(backupKey, JSON.stringify(backupData));
            
        } catch (error) {
            console.warn(`バックアップ作成エラー (${dataKey}):`, error);
        }
    }
}