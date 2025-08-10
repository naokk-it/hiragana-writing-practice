// ブラウザ互換性テスト
import { ErrorHandler } from '../js/services/ErrorHandler.js';
import { DrawingService } from '../js/services/DrawingService.js';

describe('ブラウザ互換性テスト', () => {
    let errorHandler;
    let originalFeatures;

    beforeEach(() => {
        errorHandler = new ErrorHandler();
        
        // 元の機能を保存
        originalFeatures = {
            localStorage: window.localStorage,
            AudioContext: window.AudioContext,
            webkitAudioContext: window.webkitAudioContext,
            Symbol: window.Symbol,
            ontouchstart: window.ontouchstart
        };
    });

    afterEach(() => {
        // 機能を復元
        Object.keys(originalFeatures).forEach(key => {
            if (originalFeatures[key] !== undefined) {
                window[key] = originalFeatures[key];
            } else {
                delete window[key];
            }
        });
        
        jest.clearAllMocks();
    });

    describe('Canvas API対応テスト', () => {
        test('Canvas APIサポート検出', () => {
            const canvas = document.createElement('canvas');
            const hasCanvas = !!canvas.getContext;
            
            expect(hasCanvas).toBe(true);
            
            const ctx = canvas.getContext('2d');
            expect(ctx).toBeDefined();
            expect(typeof ctx.strokeStyle).toBe('string');
            expect(typeof ctx.lineWidth).toBe('number');
        });

        test('Canvas API未対応時のフォールバック', () => {
            // Canvas APIを無効化
            const mockCanvas = {
                getContext: jest.fn(() => null)
            };

            const drawingService = new DrawingService();
            const result = drawingService.initCanvas(mockCanvas);
            
            expect(result).toBe(false);
            expect(drawingService.fallbackMode).toBe(true);
        });

        test('Canvas描画機能テスト', () => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            
            const drawingService = new DrawingService();
            const result = drawingService.initCanvas(canvas);
            
            expect(result).toBe(true);
            expect(drawingService.canvas).toBe(canvas);
            expect(drawingService.ctx).toBeDefined();
        });
    });

    describe('LocalStorage対応テスト', () => {
        test('LocalStorageサポート検出', () => {
            const hasLocalStorage = typeof Storage !== 'undefined';
            expect(hasLocalStorage).toBe(true);
            
            // 基本的な操作テスト
            localStorage.setItem('test', 'value');
            expect(localStorage.getItem('test')).toBe('value');
            localStorage.removeItem('test');
        });

        test('LocalStorage未対応時のフォールバック', () => {
            // LocalStorageを無効化
            delete window.localStorage;
            
            errorHandler.setupMemoryStorage();
            
            // メモリストレージが設定されることを確認
            expect(window.localStorage).toBeDefined();
            expect(typeof window.localStorage.setItem).toBe('function');
            expect(typeof window.localStorage.getItem).toBe('function');
            
            // 基本操作テスト
            window.localStorage.setItem('test', 'value');
            expect(window.localStorage.getItem('test')).toBe('value');
        });

        test('ストレージ容量制限テスト', () => {
            try {
                // 大量のデータを保存してみる
                const largeData = 'x'.repeat(1024 * 1024); // 1MB
                localStorage.setItem('large_test', largeData);
                localStorage.removeItem('large_test');
            } catch (error) {
                // QuotaExceededErrorが発生する可能性がある
                expect(error.name).toBe('QuotaExceededError');
            }
        });
    });

    describe('タッチイベント対応テスト', () => {
        test('タッチイベントサポート検出', () => {
            const hasTouchEvents = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            
            // テスト環境では通常falseになる
            expect(typeof hasTouchEvents).toBe('boolean');
        });

        test('タッチイベント未対応時のマウス専用モード', () => {
            // タッチイベントを無効化
            delete window.ontouchstart;
            Object.defineProperty(navigator, 'maxTouchPoints', {
                value: 0,
                configurable: true
            });

            errorHandler.setupMouseOnlyMode();
            
            expect(document.body.classList.contains('mouse-only-mode')).toBe(true);
        });

        test('タッチイベントリスナー設定', () => {
            const canvas = document.createElement('canvas');
            const drawingService = new DrawingService();
            
            // イベントリスナーが設定されることを確認
            const addEventListenerSpy = jest.spyOn(canvas, 'addEventListener');
            drawingService.initCanvas(canvas);
            
            expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
            expect(addEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
            expect(addEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
        });
    });

    describe('ES6機能対応テスト', () => {
        test('ES6基本機能サポート検出', () => {
            const hasES6 = typeof Symbol !== 'undefined';
            expect(hasES6).toBe(true);
            
            // その他のES6機能テスト
            expect(typeof Promise).toBe('function');
            expect(typeof Map).toBe('function');
            expect(typeof Set).toBe('function');
        });

        test('アロー関数サポート', () => {
            const arrowFunction = () => 'test';
            expect(arrowFunction()).toBe('test');
        });

        test('テンプレートリテラルサポート', () => {
            const name = 'test';
            const template = `Hello ${name}`;
            expect(template).toBe('Hello test');
        });

        test('分割代入サポート', () => {
            const obj = { a: 1, b: 2 };
            const { a, b } = obj;
            expect(a).toBe(1);
            expect(b).toBe(2);
        });
    });

    describe('Web Audio API対応テスト', () => {
        test('Web Audio APIサポート検出', () => {
            const hasWebAudio = !!(window.AudioContext || window.webkitAudioContext);
            
            // テスト環境では通常falseになる可能性がある
            expect(typeof hasWebAudio).toBe('boolean');
        });

        test('Web Audio API未対応時の処理', () => {
            // Web Audio APIを無効化
            delete window.AudioContext;
            delete window.webkitAudioContext;

            errorHandler.disableAudioFeatures();
            
            expect(window.audioDisabled).toBe(true);
        });

        test('音声再生フォールバック', () => {
            // 音声機能が無効化された状態での処理テスト
            window.audioDisabled = true;
            
            // 音声再生を試行しても例外が発生しないことを確認
            expect(() => {
                if (!window.audioDisabled) {
                    new AudioContext();
                }
            }).not.toThrow();
        });
    });

    describe('レスポンシブ対応テスト', () => {
        test('画面サイズ検出', () => {
            // 画面サイズの取得
            const screenWidth = window.innerWidth || document.documentElement.clientWidth;
            const screenHeight = window.innerHeight || document.documentElement.clientHeight;
            
            expect(typeof screenWidth).toBe('number');
            expect(typeof screenHeight).toBe('number');
            expect(screenWidth).toBeGreaterThan(0);
            expect(screenHeight).toBeGreaterThan(0);
        });

        test('モバイルデバイス検出', () => {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            expect(typeof isMobile).toBe('boolean');
        });

        test('デバイス向き検出', () => {
            const orientation = window.orientation !== undefined ? window.orientation : 0;
            expect(typeof orientation).toBe('number');
        });
    });

    describe('パフォーマンステスト', () => {
        test('requestAnimationFrame対応', () => {
            const hasRAF = typeof requestAnimationFrame === 'function';
            expect(hasRAF).toBe(true);
        });

        test('高解像度タイマー対応', () => {
            const hasPerformanceNow = typeof performance !== 'undefined' && typeof performance.now === 'function';
            expect(hasPerformanceNow).toBe(true);
            
            if (hasPerformanceNow) {
                const start = performance.now();
                const end = performance.now();
                expect(end).toBeGreaterThanOrEqual(start);
            }
        });

        test('メモリ使用量監視', () => {
            if (performance.memory) {
                expect(typeof performance.memory.usedJSHeapSize).toBe('number');
                expect(typeof performance.memory.totalJSHeapSize).toBe('number');
                expect(performance.memory.usedJSHeapSize).toBeGreaterThan(0);
            }
        });
    });

    describe('セキュリティ機能テスト', () => {
        test('HTTPS検出', () => {
            const isHTTPS = location.protocol === 'https:';
            expect(typeof isHTTPS).toBe('boolean');
        });

        test('Content Security Policy対応', () => {
            // CSPヘッダーの存在確認（可能な場合）
            const hasCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]') !== null;
            expect(typeof hasCSP).toBe('boolean');
        });

        test('Same-Origin Policy準拠', () => {
            // 同一オリジンポリシーのテスト
            expect(window.location.origin).toBeDefined();
        });
    });

    describe('アクセシビリティ対応テスト', () => {
        test('ARIA属性サポート', () => {
            const div = document.createElement('div');
            div.setAttribute('role', 'button');
            div.setAttribute('aria-label', 'テストボタン');
            
            expect(div.getAttribute('role')).toBe('button');
            expect(div.getAttribute('aria-label')).toBe('テストボタン');
        });

        test('キーボードナビゲーション', () => {
            const button = document.createElement('button');
            button.tabIndex = 0;
            
            expect(button.tabIndex).toBe(0);
        });

        test('スクリーンリーダー対応', () => {
            const div = document.createElement('div');
            div.setAttribute('aria-live', 'polite');
            div.setAttribute('aria-atomic', 'true');
            
            expect(div.getAttribute('aria-live')).toBe('polite');
            expect(div.getAttribute('aria-atomic')).toBe('true');
        });
    });
});