// エラーハンドリングサービス
export class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.setupGlobalHandlers();
        
        console.log('ErrorHandler初期化完了');
    }

    setupGlobalHandlers() {
        // グローバルエラーハンドラー
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                timestamp: Date.now()
            });
        });

        // Promise拒否ハンドラー
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled Promise Rejection',
                reason: event.reason,
                timestamp: Date.now()
            });
        });
    }

    handleError(errorInfo) {
        // エラーログに記録
        this.logError(errorInfo);
        
        // エラーの種類に応じた処理
        const userMessage = this.getUserFriendlyMessage(errorInfo);
        const shouldShowToUser = this.shouldShowErrorToUser(errorInfo);
        
        if (shouldShowToUser) {
            this.showErrorToUser(userMessage, errorInfo);
        }
        
        // 開発者向けログ
        console.error('エラーハンドラー:', errorInfo);
        
        return {
            handled: true,
            userMessage: userMessage,
            shown: shouldShowToUser
        };
    }

    logError(errorInfo) {
        this.errorLog.push(errorInfo);
        
        // ログサイズ制限
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
        
        // LocalStorageに保存（デバッグ用）
        try {
            const recentErrors = this.errorLog.slice(-10);
            localStorage.setItem('hiragana_app_errors', JSON.stringify(recentErrors));
        } catch (e) {
            console.warn('エラーログの保存に失敗:', e);
        }
    }

    getUserFriendlyMessage(errorInfo) {
        const errorPatterns = {
            // Canvas関連エラー
            canvas: {
                patterns: ['canvas', 'getContext', 'drawImage', 'strokeStyle'],
                message: '描画機能でエラーが発生しました。ページを再読み込みしてください。'
            },
            
            // ネットワーク関連エラー
            network: {
                patterns: ['NetworkError', 'fetch', 'XMLHttpRequest', 'network'],
                message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。'
            },
            
            // ストレージ関連エラー
            storage: {
                patterns: ['localStorage', 'sessionStorage', 'QuotaExceededError'],
                message: 'データの保存でエラーが発生しました。ブラウザの容量を確認してください。'
            },
            
            // タッチ/マウス関連エラー
            input: {
                patterns: ['touch', 'mouse', 'pointer', 'addEventListener'],
                message: '入力処理でエラーが発生しました。画面を再読み込みしてください。'
            },
            
            // 文字データ関連エラー（認識より先にチェック）
            characterData: {
                patterns: ['hiragana', 'character data', 'character loading', 'initializeCharacters'],
                message: '文字データの読み込みでエラーが発生しました。ページを再読み込みしてください。'
            },
            
            // 認識関連エラー
            recognition: {
                patterns: ['recognition', 'character', 'similarity'],
                message: '文字認識でエラーが発生しました。もう一度お試しください。'
            },
            
            // ランダム化関連エラー
            randomization: {
                patterns: ['randomization', 'character selection', 'selectNextCharacter', 'weighted'],
                message: '文字選択でエラーが発生しました。順番モードに切り替えます。'
            },
            
            // 進捗追跡関連エラー
            progress: {
                patterns: ['progress', 'tracking', 'character progress', 'practice recording'],
                message: '進捗の保存でエラーが発生しました。練習は続行できます。'
            }
        };

        const errorMessage = errorInfo.message || errorInfo.reason?.message || '';
        
        for (const [category, config] of Object.entries(errorPatterns)) {
            if (config.patterns.some(pattern => 
                errorMessage.toLowerCase().includes(pattern.toLowerCase())
            )) {
                return config.message;
            }
        }
        
        // デフォルトメッセージ
        return '予期しないエラーが発生しました。ページを再読み込みしてください。';
    }

    shouldShowErrorToUser(errorInfo) {
        // 重要でないエラーは表示しない
        const ignoredErrors = [
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured',
            'Script error',
            'Network request failed' // 一部のネットワークエラー
        ];
        
        const errorMessage = errorInfo.message || '';
        
        return !ignoredErrors.some(ignored => 
            errorMessage.includes(ignored)
        );
    }

    showErrorToUser(message, errorInfo) {
        // エラーメッセージ要素を作成
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        
        // エラーの重要度に応じてクラスを追加
        const severity = this.getErrorSeverity(errorInfo);
        errorDiv.classList.add(`error-${severity}`);
        
        errorDiv.innerHTML = `
            <div class="error-content">
                <span class="error-icon">${this.getErrorIcon(severity)}</span>
                <span class="error-text">${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        // 自動削除タイマー
        const autoRemoveTime = severity === 'critical' ? 10000 : 5000;
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, autoRemoveTime);
        
        // アクセシビリティ対応
        errorDiv.setAttribute('role', 'alert');
        errorDiv.setAttribute('aria-live', 'assertive');
    }

    getErrorSeverity(errorInfo) {
        const criticalPatterns = ['canvas', 'init', 'constructor'];
        const warningPatterns = ['network', 'storage'];
        
        const errorMessage = (errorInfo.message || '').toLowerCase();
        
        if (criticalPatterns.some(pattern => errorMessage.includes(pattern))) {
            return 'critical';
        } else if (warningPatterns.some(pattern => errorMessage.includes(pattern))) {
            return 'warning';
        } else {
            return 'info';
        }
    }

    getErrorIcon(severity) {
        const icons = {
            critical: '🚨',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[severity] || '⚠️';
    }

    // ブラウザ対応状況チェック
    checkBrowserSupport() {
        const features = {
            canvas: {
                check: () => !!document.createElement('canvas').getContext,
                fallback: () => this.showCanvasFallback(),
                critical: true
            },
            localStorage: {
                check: () => typeof Storage !== 'undefined',
                fallback: () => this.setupMemoryStorage(),
                critical: false
            },
            touchEvents: {
                check: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,
                fallback: () => this.setupMouseOnlyMode(),
                critical: false
            },
            es6: {
                check: () => typeof Symbol !== 'undefined',
                fallback: () => this.showBrowserUpgradeMessage(),
                critical: true
            },
            webAudio: {
                check: () => !!(window.AudioContext || window.webkitAudioContext),
                fallback: () => this.disableAudioFeatures(),
                critical: false
            }
        };

        const results = {};
        const unsupportedCritical = [];
        
        for (const [feature, config] of Object.entries(features)) {
            const supported = config.check();
            results[feature] = supported;
            
            if (!supported) {
                console.warn(`サポートされていない機能: ${feature}`);
                
                if (config.critical) {
                    unsupportedCritical.push(feature);
                } else if (config.fallback) {
                    config.fallback();
                }
            }
        }
        
        // 重要な機能が不足している場合
        if (unsupportedCritical.length > 0) {
            throw new Error(`重要な機能がサポートされていません: ${unsupportedCritical.join(', ')}`);
        }
        
        return results;
    }

    // フォールバック実装
    showCanvasFallback() {
        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'canvas-fallback';
        fallbackDiv.innerHTML = `
            <div class="fallback-content">
                <h2>描画機能が利用できません</h2>
                <p>お使いのブラウザはCanvas APIをサポートしていません。</p>
                <p>以下のブラウザをお試しください：</p>
                <ul>
                    <li>Google Chrome</li>
                    <li>Mozilla Firefox</li>
                    <li>Safari</li>
                    <li>Microsoft Edge</li>
                </ul>
            </div>
        `;
        document.body.appendChild(fallbackDiv);
    }

    setupMemoryStorage() {
        // LocalStorageの代替としてメモリストレージを設定
        window.memoryStorage = {};
        
        const mockStorage = {
            getItem: (key) => window.memoryStorage[key] || null,
            setItem: (key, value) => { window.memoryStorage[key] = value; },
            removeItem: (key) => { delete window.memoryStorage[key]; },
            clear: () => { window.memoryStorage = {}; }
        };
        
        if (!window.localStorage) {
            window.localStorage = mockStorage;
        }
        
        console.log('メモリストレージフォールバック有効化');
    }

    setupMouseOnlyMode() {
        // タッチイベントが利用できない場合のマウス専用モード
        document.body.classList.add('mouse-only-mode');
        console.log('マウス専用モード有効化');
    }

    showBrowserUpgradeMessage() {
        const upgradeDiv = document.createElement('div');
        upgradeDiv.className = 'browser-upgrade-message';
        upgradeDiv.innerHTML = `
            <div class="upgrade-content">
                <h2>ブラウザのアップデートが必要です</h2>
                <p>このアプリケーションを正常に動作させるには、より新しいブラウザが必要です。</p>
                <p>ブラウザを最新版にアップデートしてください。</p>
            </div>
        `;
        document.body.appendChild(upgradeDiv);
    }

    disableAudioFeatures() {
        // 音声機能を無効化
        window.audioDisabled = true;
        console.log('音声機能無効化');
    }

    // エラー復旧機能
    attemptRecovery(errorType) {
        const recoveryStrategies = {
            canvas: () => {
                // キャンバスの再初期化を試行
                const canvas = document.getElementById('drawing-canvas');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        return true;
                    }
                }
                return false;
            },
            
            storage: () => {
                // ストレージのクリアを試行
                try {
                    localStorage.clear();
                    return true;
                } catch (e) {
                    return false;
                }
            },
            
            memory: () => {
                // メモリクリーンアップ
                if (window.gc) {
                    window.gc();
                }
                return true;
            },
            
            characterData: () => {
                // 文字データの再初期化を試行
                try {
                    if (window.app && window.app.hiraganaDataService) {
                        window.app.hiraganaDataService.characters = window.app.hiraganaDataService.initializeCharacters();
                        console.log('文字データ復旧成功');
                        return true;
                    }
                } catch (e) {
                    console.error('文字データ復旧失敗:', e);
                }
                return false;
            },
            
            randomization: () => {
                // ランダム化サービスのリセットを試行
                try {
                    if (window.app && window.app.randomizationService) {
                        window.app.randomizationService.reset();
                        console.log('ランダム化サービス復旧成功');
                        return true;
                    }
                } catch (e) {
                    console.error('ランダム化サービス復旧失敗:', e);
                }
                return false;
            },
            
            progress: () => {
                // 進捗追跡の復旧を試行
                try {
                    if (window.app && window.app.progressTrackingService) {
                        // 現在のセッションを保存してリセット
                        window.app.progressTrackingService.endSession();
                        console.log('進捗追跡サービス復旧成功');
                        return true;
                    }
                } catch (e) {
                    console.error('進捗追跡サービス復旧失敗:', e);
                }
                return false;
            }
        };
        
        const strategy = recoveryStrategies[errorType];
        if (strategy) {
            try {
                const success = strategy();
                console.log(`復旧試行 ${errorType}:`, success ? '成功' : '失敗');
                return success;
            } catch (e) {
                console.error(`復旧試行エラー ${errorType}:`, e);
                return false;
            }
        }
        
        return false;
    }

    // デバッグ情報取得
    getDebugInfo() {
        return {
            errorCount: this.errorLog.length,
            recentErrors: this.errorLog.slice(-5),
            browserInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            },
            features: this.checkBrowserSupport(),
            timestamp: Date.now()
        };
    }

    // エラーログのクリア
    clearErrorLog() {
        this.errorLog = [];
        try {
            localStorage.removeItem('hiragana_app_errors');
        } catch (e) {
            console.warn('エラーログクリア失敗:', e);
        }
    }

    // 文字関連エラーハンドリング
    handleCharacterError(error, context = {}) {
        const errorInfo = {
            type: 'character',
            message: error.message || 'Character error occurred',
            context: context,
            timestamp: Date.now(),
            stack: error.stack
        };

        this.logError(errorInfo);

        // エラーの種類に応じた処理
        if (context.operation === 'loading') {
            return this.handleCharacterLoadingError(error, context);
        } else if (context.operation === 'selection') {
            return this.handleCharacterSelectionError(error, context);
        } else if (context.operation === 'randomization') {
            return this.handleRandomizationError(error, context);
        } else {
            return this.handleGenericCharacterError(error, context);
        }
    }

    handleCharacterLoadingError(error, context) {
        console.error('文字読み込みエラー:', error, context);
        
        // フォールバック文字セットを使用
        const fallbackCharacters = this.getFallbackCharacterSet();
        
        const userMessage = context.character 
            ? `文字「${context.character}」の読み込みに失敗しました。基本文字セットを使用します。`
            : '文字データの読み込みに失敗しました。基本文字セットを使用します。';

        this.showErrorToUser(userMessage, {
            type: 'character_loading',
            severity: 'warning',
            recoverable: true,
            fallback: fallbackCharacters
        });

        return {
            handled: true,
            fallback: fallbackCharacters,
            userMessage: userMessage
        };
    }

    handleCharacterSelectionError(error, context) {
        console.error('文字選択エラー:', error, context);
        
        // 順次選択にフォールバック
        const fallbackCharacter = this.getFallbackCharacter(context);
        
        const userMessage = 'ランダム文字選択でエラーが発生しました。順番モードに切り替えます。';

        this.showErrorToUser(userMessage, {
            type: 'character_selection',
            severity: 'info',
            recoverable: true,
            fallback: fallbackCharacter
        });

        // アプリの練習モードを順次モードに変更
        if (window.app) {
            window.app.setPracticeMode('sequential');
        }

        return {
            handled: true,
            fallback: fallbackCharacter,
            userMessage: userMessage,
            modeChanged: 'sequential'
        };
    }

    handleRandomizationError(error, context) {
        console.error('ランダム化エラー:', error, context);
        
        // シンプルなランダム選択にフォールバック
        const fallbackCharacter = this.getSimpleRandomCharacter(context);
        
        const userMessage = '高度なランダム選択でエラーが発生しました。シンプルモードに切り替えます。';

        this.showErrorToUser(userMessage, {
            type: 'randomization',
            severity: 'info',
            recoverable: true,
            fallback: fallbackCharacter
        });

        return {
            handled: true,
            fallback: fallbackCharacter,
            userMessage: userMessage,
            fallbackMode: 'simple_random'
        };
    }

    handleGenericCharacterError(error, context) {
        console.error('文字関連エラー:', error, context);
        
        const userMessage = '文字処理でエラーが発生しました。基本機能で続行します。';

        this.showErrorToUser(userMessage, {
            type: 'character_generic',
            severity: 'warning',
            recoverable: true
        });

        return {
            handled: true,
            userMessage: userMessage
        };
    }

    // フォールバック文字セットを取得
    getFallbackCharacterSet() {
        // 基本的なひらがな文字（あ行とか行のみ）
        return [
            { char: 'あ', reading: 'a', difficulty: 1, strokeCount: 3, category: 'あ行' },
            { char: 'い', reading: 'i', difficulty: 1, strokeCount: 2, category: 'あ行' },
            { char: 'う', reading: 'u', difficulty: 1, strokeCount: 2, category: 'あ行' },
            { char: 'え', reading: 'e', difficulty: 1, strokeCount: 2, category: 'あ行' },
            { char: 'お', reading: 'o', difficulty: 1, strokeCount: 3, category: 'あ行' },
            { char: 'か', reading: 'ka', difficulty: 2, strokeCount: 3, category: 'か行' },
            { char: 'き', reading: 'ki', difficulty: 2, strokeCount: 4, category: 'か行' },
            { char: 'く', reading: 'ku', difficulty: 2, strokeCount: 1, category: 'か行' },
            { char: 'け', reading: 'ke', difficulty: 2, strokeCount: 3, category: 'か行' },
            { char: 'こ', reading: 'ko', difficulty: 2, strokeCount: 2, category: 'か行' }
        ];
    }

    // フォールバック文字を取得
    getFallbackCharacter(context = {}) {
        if (window.app && window.app.hiraganaDataService) {
            try {
                const allCharacters = window.app.hiraganaDataService.getAllCharacters();
                if (allCharacters && allCharacters.length > 0) {
                    // 最初の文字（あ）を返す
                    return allCharacters[0];
                }
            } catch (e) {
                console.error('フォールバック文字取得エラー:', e);
            }
        }
        
        // 最終フォールバック
        return {
            character: 'あ',
            reading: 'a',
            difficulty: 1,
            strokeCount: 3,
            category: 'あ行',
            features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.7 }
        };
    }

    // シンプルなランダム文字を取得
    getSimpleRandomCharacter(context = {}) {
        if (window.app && window.app.hiraganaDataService) {
            try {
                const allCharacters = window.app.hiraganaDataService.getAllCharacters();
                if (allCharacters && allCharacters.length > 0) {
                    const randomIndex = Math.floor(Math.random() * allCharacters.length);
                    return allCharacters[randomIndex];
                }
            } catch (e) {
                console.error('シンプルランダム文字取得エラー:', e);
            }
        }
        
        return this.getFallbackCharacter(context);
    }

    // 文字選択デバッグ情報を記録
    logCharacterSelectionDebug(operation, data) {
        const debugInfo = {
            type: 'character_selection_debug',
            operation: operation,
            data: data,
            timestamp: Date.now(),
            appState: this.getAppStateSnapshot()
        };

        this.logError(debugInfo);
        
        // デバッグモードの場合はコンソールに出力
        if (this.isDebugMode()) {
            console.log('文字選択デバッグ:', debugInfo);
        }
    }

    // アプリ状態のスナップショットを取得
    getAppStateSnapshot() {
        if (!window.app) return null;

        try {
            return {
                currentScreen: window.app.currentScreen,
                practiceMode: window.app.appState?.practiceMode,
                currentCharacter: window.app.hiraganaDataService?.getCurrentCharacter()?.character,
                characterCount: window.app.hiraganaDataService?.getCharacterCount(),
                isInitialized: window.app.appState?.isInitialized
            };
        } catch (e) {
            return { error: 'Failed to get app state snapshot' };
        }
    }

    // デバッグモードかどうかを判定
    isDebugMode() {
        return localStorage.getItem('hiragana_debug_mode') === 'true' || 
               window.location.search.includes('debug=true');
    }

    // 文字関連エラーの統計を取得
    getCharacterErrorStatistics() {
        const characterErrors = this.errorLog.filter(error => 
            error.type === 'character' || 
            error.message?.includes('character') ||
            error.message?.includes('hiragana') ||
            error.message?.includes('randomization')
        );

        const stats = {
            total: characterErrors.length,
            byType: {},
            byOperation: {},
            recent: characterErrors.slice(-10),
            mostCommon: null
        };

        // エラータイプ別の集計
        characterErrors.forEach(error => {
            const type = error.context?.operation || 'unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
            
            if (error.context?.operation) {
                stats.byOperation[error.context.operation] = (stats.byOperation[error.context.operation] || 0) + 1;
            }
        });

        // 最も多いエラータイプを特定
        const maxCount = Math.max(...Object.values(stats.byType));
        stats.mostCommon = Object.keys(stats.byType).find(key => stats.byType[key] === maxCount);

        return stats;
    }
}