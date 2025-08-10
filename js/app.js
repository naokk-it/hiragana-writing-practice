// メインアプリケーションクラス
import { MainMenuComponent } from './components/MainMenuComponent.js';
import { PracticeViewComponent } from './components/PracticeViewComponent.js';
import { ExampleViewComponent } from './components/ExampleViewComponent.js';
import { ResultViewComponent } from './components/ResultViewComponent.js';
import { ProgressViewComponent } from './components/ProgressViewComponent.js';
import { DrawingService } from './services/DrawingService.js';
import { RecognitionService } from './services/RecognitionService.js';
import { ScoreService } from './services/ScoreService.js';
import { HiraganaDataService } from './services/HiraganaDataService.js';
import { DataStorageService } from './services/DataStorageService.js';
import { DataMigrationService } from './services/DataMigrationService.js';
import { RandomizationService } from './services/RandomizationService.js';
import { ProgressTrackingService } from './services/ProgressTrackingService.js';
import { PracticeSession } from './models/PracticeSession.js';
import { ErrorHandler } from './services/ErrorHandler.js';
import { PerformanceMonitor } from './services/PerformanceMonitor.js';

export class App {
    constructor() {
        this.currentScreen = 'main-menu';
        this.appState = {
            isInitialized: false,
            currentSession: null,
            practiceData: {
                attempts: [],
                startTime: null,
                currentCharacter: null
            },
            practiceMode: 'random', // 'random', 'sequential', 'difficulty'
            difficultyFilter: null,
            categoryFilter: null
        };
        
        // サービス初期化
        this.errorHandler = new ErrorHandler();
        this.performanceMonitor = new PerformanceMonitor();
        this.drawingService = new DrawingService();
        this.recognitionService = new RecognitionService();
        this.scoreService = new ScoreService();
        this.hiraganaDataService = new HiraganaDataService(this.errorHandler);
        this.dataStorageService = new DataStorageService();
        this.dataMigrationService = new DataMigrationService(this.dataStorageService);
        this.progressTrackingService = new ProgressTrackingService(this.dataStorageService);
        this.randomizationService = new RandomizationService(this.hiraganaDataService, this.progressTrackingService, this.errorHandler);
        
        // 移行サービスをデータストレージサービスに設定
        this.dataStorageService.setMigrationService(this.dataMigrationService);
        
        // コンポーネント初期化
        this.mainMenu = new MainMenuComponent(this);
        this.practiceView = new PracticeViewComponent(this);
        this.exampleView = new ExampleViewComponent(this);
        this.resultView = new ResultViewComponent(this);
        this.progressView = new ProgressViewComponent(this);
        
        // アプリケーション固有のエラーハンドリング設定
        this.setupAppErrorHandling();
        
        // グローバルアクセス用（エラーハンドラーから参照）
        window.app = this;
    }

    async init() {
        try {
            console.log('ひらがな手書き練習アプリを初期化中...');
            
            // パフォーマンス監視を開始
            this.performanceMonitor.startMonitoring();
            this.setupPerformanceOptimizations();
            
            // ブラウザ対応状況をチェック
            this.checkBrowserSupport();
            
            // データ移行を実行
            await this.performDataMigration();
            
            // 保存されたセッションを復元
            this.restoreSession();
            
            // 各コンポーネントを初期化
            await this.initializeComponents();
            
            // 初期画面を表示
            this.showScreen('main-menu');
            
            // アプリケーション状態を更新
            this.appState.isInitialized = true;
            
            // 定期的なメモリクリーンアップを開始
            this.startPeriodicCleanup();
            
            console.log('アプリケーション初期化完了');
            
        } catch (error) {
            console.error('アプリケーション初期化エラー:', error);
            this.showErrorMessage('アプリケーションの初期化に失敗しました');
        }
    }

    /**
     * データ移行を実行
     */
    async performDataMigration() {
        try {
            console.log('データ移行チェックを開始...');
            
            const migrationStatus = this.dataMigrationService.getMigrationStatus();
            console.log('移行状況:', migrationStatus);
            
            if (migrationStatus.migrationNeeded) {
                console.log(`データ移行が必要: ${migrationStatus.dataVersion} -> ${migrationStatus.currentVersion}`);
                
                // ユーザーに移行の通知（実際のアプリでは適切なUIを表示）
                this.showMigrationNotification(migrationStatus);
                
                const migrationSuccess = await this.dataStorageService.performMigration();
                
                if (migrationSuccess) {
                    console.log('データ移行が完了しました');
                    this.showMigrationSuccessMessage();
                } else {
                    console.warn('データ移行に失敗しました - デフォルト状態で続行');
                    this.showMigrationFailureMessage();
                }
            } else {
                console.log('データ移行は不要です');
            }
            
        } catch (error) {
            console.error('データ移行エラー:', error);
            this.showMigrationErrorMessage(error);
        }
    }

    /**
     * 移行通知を表示
     * @param {Object} migrationStatus 移行状況
     */
    showMigrationNotification(migrationStatus) {
        console.log(`データを更新しています... (${migrationStatus.dataVersion} -> ${migrationStatus.currentVersion})`);
        // 実際のアプリでは適切なローディング画面やプログレスバーを表示
    }

    /**
     * 移行成功メッセージを表示
     */
    showMigrationSuccessMessage() {
        console.log('データの更新が完了しました');
        // 実際のアプリでは適切な成功メッセージを表示
    }

    /**
     * 移行失敗メッセージを表示
     */
    showMigrationFailureMessage() {
        console.warn('データの更新に失敗しましたが、アプリは正常に動作します');
        // 実際のアプリでは適切な警告メッセージを表示
    }

    /**
     * 移行エラーメッセージを表示
     * @param {Error} error エラー
     */
    showMigrationErrorMessage(error) {
        console.error('データ更新中にエラーが発生しました:', error.message);
        // 実際のアプリでは適切なエラーメッセージを表示
    }

    showScreen(screenName) {
        // 全ての画面を非表示
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // 指定された画面を表示
        const targetScreen = document.getElementById(screenName);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
            
            // 画面がアクティブになった時の処理
            if (screenName === 'main-menu' && this.mainMenu.onActivate) {
                this.mainMenu.onActivate();
            }
            
            console.log(`画面切り替え: ${screenName}`);
        }
    }

    startPractice(mode = 'random', options = {}) {
        try {
            // 練習モードを設定
            this.appState.practiceMode = mode;
            this.appState.difficultyFilter = options.difficultyFilter || null;
            this.appState.categoryFilter = options.categoryFilter || null;

            // 練習セッションを開始
            this.startPracticeSession();
            
            // 最初の文字を選択
            const firstChar = this.selectNextCharacter();
            
            // 練習画面を表示
            this.showScreen('practice-view');
            
            // 練習ビューを開始
            this.practiceView.startPractice(firstChar.character);
            
            console.log(`練習開始 - モード: ${mode}, 文字: ${firstChar.character}`);
            
        } catch (error) {
            console.error('練習開始エラー:', error);
            this.showErrorMessage('練習を開始できませんでした');
        }
    }

    showExample() {
        this.showScreen('example-view');
        const currentChar = this.hiraganaDataService.getCurrentCharacter();
        this.exampleView.showCharacterExample(currentChar.character);
    }

    backToPractice() {
        this.showScreen('practice-view');
    }

    async submitDrawing() {
        try {
            // 描画データを取得
            const drawingData = this.drawingService.getDrawingData();
            if (!drawingData || drawingData.strokes.length === 0) {
                this.showErrorMessage('文字を書いてください');
                return;
            }

            // 現在の文字を取得
            const currentChar = this.hiraganaDataService.getCurrentCharacter();
            if (!currentChar) {
                this.showErrorMessage('文字データが見つかりません');
                return;
            }

            // 文字認識を実行
            console.log('文字認識開始:', currentChar.character);
            const recognitionResult = this.recognitionService.recognizeCharacter(
                drawingData, 
                currentChar.character
            );

            // 採点を実行
            console.log('採点開始');
            const scoreResult = this.scoreService.calculateScore(
                recognitionResult, 
                currentChar.character, 
                drawingData
            );

            // フィードバックを生成
            const feedback = this.scoreService.generateFeedback(
                scoreResult, 
                recognitionResult, 
                currentChar.character
            );

            // 試行を記録
            this.recordAttempt(drawingData, recognitionResult, scoreResult);

            // 結果を表示
            this.showResult(scoreResult, feedback);

        } catch (error) {
            console.error('描画提出エラー:', error);
            this.showErrorMessage('採点中にエラーが発生しました');
        }
    }

    showResult(score, feedback = null) {
        this.showScreen('result-view');
        const currentChar = this.hiraganaDataService.getCurrentCharacter();
        
        // スコアにフィードバック情報を追加
        const enhancedScore = {
            ...score,
            feedback: feedback
        };
        
        this.resultView.displayResult(enhancedScore, currentChar.character);
    }

    tryAgain() {
        this.practiceView.clearCanvas();
        this.showScreen('practice-view');
    }

    nextCharacter() {
        try {
            // 現在のセッションを完了して保存
            if (this.appState.currentSession) {
                this.completeCurrentSession();
            }
            
            // 次の文字を選択
            const nextChar = this.selectNextCharacter();
            
            // 新しい練習セッションを開始
            this.startPracticeSession();
            
            // 練習画面を表示
            this.showScreen('practice-view');
            this.practiceView.startPractice(nextChar.character);
            
            console.log(`次の文字: ${nextChar.character} (難易度: ${nextChar.difficulty})`);
            
        } catch (error) {
            console.error('次の文字への移動エラー:', error);
            this.showErrorMessage('次の文字に移動できませんでした');
        }
    }

    getCurrentCharacter() {
        return this.hiraganaDataService.getCurrentCharacter();
    }

    getHiraganaDataService() {
        return this.hiraganaDataService;
    }

    showProgress() {
        this.showScreen('progress-view');
        this.progressView.onActivate();
    }

    showMainMenu() {
        this.showScreen('main-menu');
        if (this.mainMenu.onActivate) {
            this.mainMenu.onActivate();
        }
    }

    /**
     * 次の文字を選択（練習モードに応じて）
     * @returns {HiraganaCharacter} 選択された文字
     */
    selectNextCharacter() {
        const currentChar = this.hiraganaDataService.getCurrentCharacter();
        
        switch (this.appState.practiceMode) {
            case 'random':
                return this.randomizationService.selectNextCharacter(
                    currentChar ? currentChar.character : null,
                    {
                        difficultyFilter: this.appState.difficultyFilter,
                        categoryFilter: this.appState.categoryFilter,
                        avoidRecent: true,
                        useProgressWeighting: true
                    }
                );
                
            case 'sequential':
                return this.hiraganaDataService.getNextCharacter();
                
            case 'difficulty':
                if (this.appState.difficultyFilter) {
                    return this.randomizationService.selectNextCharacter(
                        currentChar ? currentChar.character : null,
                        {
                            difficultyFilter: this.appState.difficultyFilter,
                            avoidRecent: true,
                            useProgressWeighting: false
                        }
                    );
                }
                return this.hiraganaDataService.getNextCharacter();
                
            default:
                return this.hiraganaDataService.getRandomCharacter();
        }
    }

    /**
     * 練習モードを設定
     * @param {string} mode 練習モード
     * @param {Object} options オプション
     */
    setPracticeMode(mode, options = {}) {
        this.appState.practiceMode = mode;
        this.appState.difficultyFilter = options.difficultyFilter || null;
        this.appState.categoryFilter = options.categoryFilter || null;
        
        console.log(`練習モード変更: ${mode}`, options);
    }

    /**
     * 現在の練習モードを取得
     * @returns {Object} 練習モード情報
     */
    getPracticeMode() {
        return {
            mode: this.appState.practiceMode,
            difficultyFilter: this.appState.difficultyFilter,
            categoryFilter: this.appState.categoryFilter
        };
    }

    /**
     * 進捗追跡サービスを取得
     * @returns {ProgressTrackingService} 進捗追跡サービス
     */
    getProgressTrackingService() {
        return this.progressTrackingService;
    }

    /**
     * ランダム化サービスを取得
     * @returns {RandomizationService} ランダム化サービス
     */
    getRandomizationService() {
        return this.randomizationService;
    }

    // アプリケーション固有のエラーハンドリング設定
    setupAppErrorHandling() {
        // アプリケーション固有のエラーハンドリング
        this.errorHandler.onError = (errorInfo) => {
            this.handleAppError(errorInfo);
        };
    }

    // ブラウザ対応状況チェック
    checkBrowserSupport() {
        try {
            return this.errorHandler.checkBrowserSupport();
        } catch (error) {
            console.error('ブラウザ対応チェックエラー:', error);
            throw error;
        }
    }

    // コンポーネント初期化
    async initializeComponents() {
        const components = [
            { name: 'MainMenu', component: this.mainMenu },
            { name: 'PracticeView', component: this.practiceView },
            { name: 'ExampleView', component: this.exampleView },
            { name: 'ResultView', component: this.resultView },
            { name: 'ProgressView', component: this.progressView }
        ];

        for (const { name, component } of components) {
            try {
                if (component && typeof component.init === 'function') {
                    await component.init();
                    console.log(`${name}コンポーネント初期化完了`);
                }
            } catch (error) {
                console.error(`${name}コンポーネント初期化エラー:`, error);
                throw new Error(`${name}コンポーネントの初期化に失敗しました`);
            }
        }
    }

    // 練習セッション開始
    startPracticeSession() {
        const currentChar = this.hiraganaDataService.getCurrentCharacter();
        
        // 既存のセッションを保存
        if (this.appState.currentSession) {
            this.saveCurrentSession();
        }
        
        // 新しいセッションを作成
        this.appState.currentSession = new PracticeSession(currentChar);
        
        this.appState.practiceData = {
            attempts: [],
            startTime: Date.now(),
            currentCharacter: currentChar
        };
        
        // 進捗追跡セッションを開始
        this.progressTrackingService.startSession();
        
        // セッションを保存
        this.dataStorageService.saveCurrentSession(this.appState.currentSession);
        
        console.log('練習セッション開始:', currentChar.character);
    }

    // 練習試行を記録
    recordAttempt(drawingData, recognitionResult, scoreResult) {
        if (!this.appState.currentSession) {
            this.startPracticeSession();
        }

        // セッションに試行を追加
        this.appState.currentSession.addAttempt(drawingData, recognitionResult, scoreResult);

        const attempt = {
            timestamp: Date.now(),
            drawingData: drawingData,
            recognitionResult: recognitionResult,
            scoreResult: scoreResult,
            duration: Date.now() - (this.appState.practiceData.startTime || Date.now())
        };

        this.appState.practiceData.attempts.push(attempt);
        
        // 進捗追跡サービスに記録
        const currentChar = this.hiraganaDataService.getCurrentCharacter();
        if (currentChar) {
            this.progressTrackingService.recordCharacterPractice(
                currentChar.character,
                scoreResult.score,
                attempt.timestamp,
                {
                    recognitionResult: recognitionResult,
                    practiceMode: this.appState.practiceMode
                }
            );

            // ランダム化サービスの重みを更新
            this.randomizationService.updateSelectionWeights({
                character: currentChar.character,
                score: scoreResult.score,
                difficulty: currentChar.difficulty
            });
        }
        
        // 現在のセッションを保存
        this.dataStorageService.saveCurrentSession(this.appState.currentSession);
        
        console.log('試行記録:', attempt);
    }

    // エラーメッセージ表示
    showErrorMessage(message, options = {}) {
        console.error('エラーメッセージ表示:', message, options);
        
        // ErrorHandlerを使用してエラーを表示
        const errorInfo = {
            type: options.type || 'error',
            message: message,
            timestamp: Date.now(),
            source: 'app'
        };
        
        this.errorHandler.showErrorToUser(message, errorInfo);
    }

    // アプリケーション固有のエラーハンドラー
    handleAppError(errorInfo) {
        console.error('アプリケーションエラー処理:', errorInfo);
        
        // エラーの種類に応じた復旧試行
        const errorType = this.categorizeError(errorInfo);
        const recovered = this.attemptErrorRecovery(errorType);
        
        if (!recovered) {
            // 復旧できない場合は適切な状態にリセット
            this.handleUnrecoverableError(errorInfo);
        }
    }

    categorizeError(errorInfo) {
        const message = errorInfo.message || '';
        
        if (message.includes('canvas') || message.includes('drawing')) {
            return 'canvas';
        } else if (message.includes('recognition')) {
            return 'recognition';
        } else if (message.includes('character') || message.includes('hiragana') || message.includes('randomization')) {
            return 'character';
        } else if (message.includes('storage') || message.includes('localStorage')) {
            return 'storage';
        } else if (message.includes('network') || message.includes('fetch')) {
            return 'network';
        } else {
            return 'general';
        }
    }

    attemptErrorRecovery(errorType) {
        console.log(`エラー復旧試行: ${errorType}`);
        
        switch (errorType) {
            case 'canvas':
                return this.recoverCanvasError();
            case 'recognition':
                return this.recoverRecognitionError();
            case 'character':
                return this.recoverCharacterError();
            case 'storage':
                return this.recoverStorageError();
            case 'network':
                return this.recoverNetworkError();
            default:
                return false;
        }
    }

    recoverCanvasError() {
        try {
            // キャンバスの再初期化
            if (this.practiceView && this.practiceView.initCanvas) {
                this.practiceView.initCanvas();
                console.log('キャンバス復旧成功');
                return true;
            }
        } catch (e) {
            console.error('キャンバス復旧失敗:', e);
        }
        return false;
    }

    recoverRecognitionError() {
        try {
            // 認識サービスの再初期化
            this.recognitionService = new RecognitionService();
            console.log('認識サービス復旧成功');
            return true;
        } catch (e) {
            console.error('認識サービス復旧失敗:', e);
        }
        return false;
    }

    recoverStorageError() {
        try {
            // ストレージのクリアと再初期化
            localStorage.clear();
            console.log('ストレージ復旧成功');
            return true;
        } catch (e) {
            console.error('ストレージ復旧失敗:', e);
        }
        return false;
    }

    recoverCharacterError() {
        try {
            console.log('文字関連エラー復旧を試行中...');
            
            // HiraganaDataServiceの再初期化
            if (this.hiraganaDataService && !this.hiraganaDataService.isInitialized) {
                this.hiraganaDataService = new HiraganaDataService(this.errorHandler);
                console.log('HiraganaDataService復旧成功');
            }
            
            // RandomizationServiceの復旧
            if (this.randomizationService && this.randomizationService.fallbackMode) {
                this.randomizationService.reset();
                this.randomizationService.fallbackMode = false;
                console.log('RandomizationService復旧成功');
            }
            
            // 練習モードを安全なモードに変更
            if (this.appState.practiceMode === 'random') {
                this.appState.practiceMode = 'sequential';
                console.log('練習モードを順次モードに変更');
            }
            
            return true;
            
        } catch (e) {
            console.error('文字関連エラー復旧失敗:', e);
            return false;
        }
    }

    recoverNetworkError() {
        // ネットワークエラーは通常復旧不可能
        console.log('ネットワークエラー - 復旧不可');
        return false;
    }

    handleUnrecoverableError(errorInfo) {
        console.error('復旧不可能なエラー:', errorInfo);
        
        // アプリケーション状態をリセット
        this.resetAppState();
        
        // メインメニューに戻る
        this.showScreen('main-menu');
        
        // ユーザーに通知
        this.showErrorMessage(
            'エラーが発生したため、アプリケーションをリセットしました。',
            { type: 'warning' }
        );
    }

    // アプリケーション状態のリセット
    resetAppState() {
        // 現在のセッションを保存してからリセット
        if (this.appState.currentSession) {
            this.saveCurrentSession();
        }
        
        this.appState.currentSession = null;
        this.appState.practiceData = {
            attempts: [],
            startTime: null,
            currentCharacter: null
        };
        
        // キャンバスをクリア
        if (this.drawingService) {
            this.drawingService.clearCanvas();
        }
        
        console.log('アプリケーション状態リセット完了');
    }

    // 保存されたセッションを復元
    restoreSession() {
        try {
            const savedSession = this.dataStorageService.loadCurrentSession();
            if (savedSession && !savedSession.completed) {
                this.appState.currentSession = savedSession;
                
                // ひらがなデータサービスの位置を復元
                if (savedSession.character) {
                    this.hiraganaDataService.selectCharacter(savedSession.character.character);
                }
                
                console.log('セッション復元:', savedSession.character.character);
            }
        } catch (error) {
            console.error('セッション復元エラー:', error);
        }
    }

    // 現在のセッションを保存
    saveCurrentSession() {
        try {
            if (this.appState.currentSession) {
                this.dataStorageService.saveCurrentSession(this.appState.currentSession);
                console.log('現在のセッション保存完了');
            }
        } catch (error) {
            console.error('セッション保存エラー:', error);
        }
    }

    // 現在のセッションを完了
    completeCurrentSession() {
        try {
            if (this.appState.currentSession) {
                this.appState.currentSession.complete();
                
                // 進捗追跡セッションを終了
                this.progressTrackingService.endSession();
                
                // 完了したセッションを永続化
                this.dataStorageService.savePracticeSession(this.appState.currentSession);
                
                // 現在のセッションをクリア
                this.dataStorageService.saveCurrentSession(null);
                
                console.log('セッション完了:', this.appState.currentSession.character.character);
            }
        } catch (error) {
            console.error('セッション完了エラー:', error);
        }
    }

    // 進捗データを取得
    getProgressData() {
        try {
            return this.dataStorageService.getProgressData();
        } catch (error) {
            console.error('進捗データ取得エラー:', error);
            return null;
        }
    }

    // 特定文字の進捗を取得
    getCharacterProgress(character) {
        try {
            return this.dataStorageService.getCharacterProgress(character);
        } catch (error) {
            console.error('文字進捗取得エラー:', error);
            return null;
        }
    }

    /**
     * パフォーマンス最適化を設定
     */
    setupPerformanceOptimizations() {
        // パフォーマンス警告のコールバックを設定
        this.performanceMonitor.onPerformanceWarning((warning) => {
            console.warn('パフォーマンス警告:', warning);
            
            // 警告に応じた自動最適化を実行
            this.handlePerformanceWarning(warning);
        });
        
        // 文字認識の非同期化
        this.optimizeRecognitionService();
        
        console.log('パフォーマンス最適化設定完了');
    }

    /**
     * パフォーマンス警告を処理
     * @param {Object} warning 警告情報
     */
    handlePerformanceWarning(warning) {
        switch (warning.type) {
            case 'low_frame_rate':
                this.optimizeFrameRate();
                break;
                
            case 'high_memory_usage':
                this.performMemoryCleanup();
                break;
                
            case 'slow_storage':
                this.optimizeStorageOperations();
                break;
                
            case 'slow_render':
                this.optimizeRendering();
                break;
        }
    }

    /**
     * フレームレートを最適化
     */
    optimizeFrameRate() {
        console.log('フレームレート最適化を実行');
        
        // 描画頻度を調整
        if (this.drawingService && this.drawingService.setThrottleRate) {
            this.drawingService.setThrottleRate(32); // 30FPS相当
        }
        
        // 不要なアニメーションを停止
        this.pauseNonEssentialAnimations();
    }

    /**
     * メモリクリーンアップを実行
     */
    performMemoryCleanup() {
        console.log('メモリクリーンアップを実行');
        
        // 各サービスのメモリクリーンアップ
        if (this.recognitionService && this.recognitionService.cleanupTemplateCache) {
            this.recognitionService.cleanupTemplateCache();
        }
        
        if (this.hiraganaDataService && this.hiraganaDataService.cleanup) {
            this.hiraganaDataService.cleanup();
        }
        
        if (this.dataStorageService && this.dataStorageService.performMemoryCleanup) {
            this.dataStorageService.performMemoryCleanup();
        }
        
        // パフォーマンスモニターの最適化
        this.performanceMonitor.performOptimization();
    }

    /**
     * ストレージ操作を最適化
     */
    optimizeStorageOperations() {
        console.log('ストレージ操作最適化を実行');
        
        // 書き込みキューを強制実行
        if (this.dataStorageService && this.dataStorageService.flushWriteQueue) {
            this.dataStorageService.flushWriteQueue();
        }
        
        // 古いデータを削除
        this.cleanupOldData();
    }

    /**
     * レンダリングを最適化
     */
    optimizeRendering() {
        console.log('レンダリング最適化を実行');
        
        // DOM更新をバッチ処理
        this.batchDOMUpdates();
        
        // 不要な再描画を防止
        this.preventUnnecessaryRedraws();
    }

    /**
     * 文字認識サービスを最適化
     */
    optimizeRecognitionService() {
        // 文字認識を非同期化（既に実装済み）
        const originalRecognize = this.recognitionService.recognizeCharacter;
        
        this.recognitionService.recognizeCharacter = async (drawingData, targetCharacter) => {
            const startTime = performance.now();
            
            try {
                const result = await originalRecognize.call(this.recognitionService, drawingData, targetCharacter);
                const duration = performance.now() - startTime;
                
                // パフォーマンス記録
                this.performanceMonitor.recordRenderTime(duration);
                
                return result;
            } catch (error) {
                const duration = performance.now() - startTime;
                this.performanceMonitor.recordRenderTime(duration);
                throw error;
            }
        };
    }

    /**
     * 定期的なクリーンアップを開始
     */
    startPeriodicCleanup() {
        // 5分間隔でクリーンアップを実行
        setInterval(() => {
            this.performMemoryCleanup();
        }, 5 * 60 * 1000);
        
        console.log('定期的なメモリクリーンアップを開始しました');
    }

    /**
     * 不要なアニメーションを一時停止
     */
    pauseNonEssentialAnimations() {
        // 装飾的なアニメーションを停止
        const animations = document.querySelectorAll('.animation-decorative');
        animations.forEach(element => {
            element.style.animationPlayState = 'paused';
        });
    }

    /**
     * DOM更新をバッチ処理
     */
    batchDOMUpdates() {
        // DOM更新を次のフレームまで遅延
        if (this.pendingDOMUpdates) {
            return;
        }
        
        this.pendingDOMUpdates = true;
        
        requestAnimationFrame(() => {
            // バッチ処理されたDOM更新を実行
            this.executePendingDOMUpdates();
            this.pendingDOMUpdates = false;
        });
    }

    /**
     * 保留中のDOM更新を実行
     */
    executePendingDOMUpdates() {
        // 実際のDOM更新処理
        // 各コンポーネントの更新をここで実行
    }

    /**
     * 不要な再描画を防止
     */
    preventUnnecessaryRedraws() {
        // 描画キャンバスの更新頻度を制限
        if (this.drawingService && this.drawingService.enableDrawingThrottle) {
            this.drawingService.enableDrawingThrottle(true);
        }
    }

    /**
     * 古いデータをクリーンアップ
     */
    cleanupOldData() {
        try {
            // 30日以上古いセッションデータを削除
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            
            // データストレージサービスに古いデータの削除を依頼
            if (this.dataStorageService && this.dataStorageService.cleanupOldSessions) {
                this.dataStorageService.cleanupOldSessions(thirtyDaysAgo);
            }
            
            console.log('古いデータのクリーンアップ完了');
            
        } catch (error) {
            console.error('データクリーンアップエラー:', error);
        }
    }

    /**
     * パフォーマンス統計を取得
     * @returns {Object} パフォーマンス統計
     */
    getPerformanceStats() {
        const stats = this.performanceMonitor.getPerformanceStats();
        
        // サービス別のメモリ使用量を追加
        stats.services = {
            recognition: this.recognitionService.getMemoryUsage ? this.recognitionService.getMemoryUsage() : {},
            hiraganaData: this.hiraganaDataService.getMemoryUsage ? this.hiraganaDataService.getMemoryUsage() : {},
            dataStorage: this.dataStorageService.getMemoryUsage ? this.dataStorageService.getMemoryUsage() : {}
        };
        
        return stats;
    }
}