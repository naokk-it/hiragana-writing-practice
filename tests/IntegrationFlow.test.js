// 統合フローテスト
import { App } from '../js/app.js';
import { DrawingService } from '../js/services/DrawingService.js';
import { RecognitionService } from '../js/services/RecognitionService.js';
import { ScoreService } from '../js/services/ScoreService.js';
import { HiraganaDataService } from '../js/services/HiraganaDataService.js';

describe('統合フローテスト', () => {
    let app;
    let mockCanvas;
    let mockContext;

    beforeEach(() => {
        // DOM環境をセットアップ
        document.body.innerHTML = `
            <div id="app">
                <div id="main-menu" class="screen active">
                    <button id="start-practice-btn">練習をはじめる</button>
                </div>
                <div id="practice-view" class="screen">
                    <span id="target-character">あ</span>
                    <canvas id="drawing-canvas" width="400" height="400"></canvas>
                    <button id="show-example-btn">手本を見る</button>
                    <button id="clear-canvas-btn">消す</button>
                    <button id="submit-drawing-btn">できた！</button>
                </div>
                <div id="example-view" class="screen">
                    <span id="example-character">あ</span>
                    <button id="back-to-practice-btn">練習に戻る</button>
                </div>
                <div id="result-view" class="screen">
                    <div id="score-icon">😊</div>
                    <div id="score-message">よくできました！</div>
                    <button id="try-again-btn">もう一度</button>
                    <button id="next-character-btn">次の文字</button>
                </div>
            </div>
        `;

        // Canvas mockを設定
        mockContext = {
            strokeStyle: '#333',
            lineWidth: 4,
            lineCap: 'round',
            lineJoin: 'round',
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            stroke: jest.fn(),
            clearRect: jest.fn(),
            getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(400 * 400 * 4) }))
        };

        mockCanvas = document.getElementById('drawing-canvas');
        mockCanvas.getContext = jest.fn(() => mockContext);

        // Appインスタンスを作成
        app = new App();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('アプリケーション初期化フロー', () => {
        test('正常な初期化プロセス', async () => {
            // 初期化実行
            await app.init();

            // 初期化状態を確認
            expect(app.appState.isInitialized).toBe(true);
            expect(app.currentScreen).toBe('main-menu');
            expect(document.querySelector('#main-menu').classList.contains('active')).toBe(true);
        });

        test('ブラウザ対応チェック', async () => {
            // ブラウザ対応状況をチェック
            const support = app.checkBrowserSupport();

            // 基本機能がサポートされていることを確認
            expect(support.canvas).toBe(true);
            expect(support.localStorage).toBe(true);
            expect(support.es6).toBe(true);
        });

        test('コンポーネント初期化', async () => {
            await app.init();

            // 各コンポーネントが初期化されていることを確認
            expect(app.mainMenu).toBeDefined();
            expect(app.practiceView).toBeDefined();
            expect(app.exampleView).toBeDefined();
            expect(app.resultView).toBeDefined();
        });
    });

    describe('完全な練習フロー', () => {
        beforeEach(async () => {
            await app.init();
        });

        test('メインメニュー → 練習開始 → 描画 → 認識 → 結果表示', async () => {
            // 1. メインメニューから練習開始
            app.startPractice();
            
            expect(app.currentScreen).toBe('practice-view');
            expect(app.appState.currentSession).toBeDefined();
            expect(app.appState.currentSession.character).toBeDefined();

            // 2. 描画データを模擬
            const mockDrawingData = {
                strokes: [
                    [
                        { x: 100, y: 100, timestamp: Date.now() },
                        { x: 150, y: 150, timestamp: Date.now() + 100 },
                        { x: 200, y: 100, timestamp: Date.now() + 200 }
                    ]
                ],
                timestamp: Date.now(),
                boundingBox: { x: 100, y: 100, width: 100, height: 50 }
            };

            // DrawingServiceに描画データを設定
            app.drawingService.drawingData = mockDrawingData;

            // 3. 描画提出
            await app.submitDrawing();

            // 4. 結果画面に遷移していることを確認
            expect(app.currentScreen).toBe('result-view');
            expect(app.appState.currentSession.attempts.length).toBe(1);

            // 5. 試行データが記録されていることを確認
            const attempt = app.appState.currentSession.attempts[0];
            expect(attempt.drawingData).toBeDefined();
            expect(attempt.recognitionResult).toBeDefined();
            expect(attempt.scoreResult).toBeDefined();
        });

        test('手本表示フロー', async () => {
            // 練習画面に移動
            app.startPractice();
            
            // 手本表示
            app.showExample();
            expect(app.currentScreen).toBe('example-view');

            // 練習に戻る
            app.backToPractice();
            expect(app.currentScreen).toBe('practice-view');
        });

        test('次の文字への移動フロー', async () => {
            // 練習開始
            app.startPractice();
            const initialChar = app.getCurrentCharacter();

            // 描画と提出を模擬
            app.drawingService.drawingData = {
                strokes: [[{ x: 100, y: 100, timestamp: Date.now() }]],
                timestamp: Date.now(),
                boundingBox: { x: 100, y: 100, width: 50, height: 50 }
            };
            await app.submitDrawing();

            // 次の文字に移動
            app.nextCharacter();
            const nextChar = app.getCurrentCharacter();

            expect(app.currentScreen).toBe('practice-view');
            expect(nextChar.character).not.toBe(initialChar.character);
        });
    });

    describe('エラーハンドリング統合テスト', () => {
        beforeEach(async () => {
            await app.init();
        });

        test('Canvas初期化エラーの処理', async () => {
            // Canvas取得を失敗させる
            const mockFailCanvas = {
                getContext: jest.fn(() => null)
            };

            const result = app.drawingService.initCanvas(mockFailCanvas);
            expect(result).toBe(false);
        });

        test('認識エラーの処理', async () => {
            // 認識サービスでエラーを発生させる
            const originalRecognize = app.recognitionService.recognizeCharacter;
            app.recognitionService.recognizeCharacter = jest.fn(() => {
                throw new Error('認識エラー');
            });

            app.startPractice();
            app.drawingService.drawingData = {
                strokes: [[{ x: 100, y: 100, timestamp: Date.now() }]],
                timestamp: Date.now(),
                boundingBox: { x: 100, y: 100, width: 50, height: 50 }
            };

            // エラーが適切に処理されることを確認
            await expect(app.submitDrawing()).resolves.not.toThrow();

            // 元の関数を復元
            app.recognitionService.recognizeCharacter = originalRecognize;
        });

        test('ストレージエラーの処理', () => {
            // LocalStorageを無効化
            const originalLocalStorage = window.localStorage;
            delete window.localStorage;

            // エラーが適切に処理されることを確認
            expect(() => app.errorHandler.checkBrowserSupport()).not.toThrow();

            // LocalStorageを復元
            window.localStorage = originalLocalStorage;
        });
    });

    describe('状態管理テスト', () => {
        beforeEach(async () => {
            await app.init();
        });

        test('練習セッション管理', () => {
            // セッション開始
            app.startPracticeSession();
            
            expect(app.appState.currentSession).toBeDefined();
            expect(app.appState.currentSession.character).toBeDefined();
            expect(app.appState.currentSession.startTime).toBeDefined();
            expect(app.appState.currentSession.attempts).toEqual([]);
        });

        test('試行記録', () => {
            app.startPracticeSession();

            const mockDrawingData = { strokes: [] };
            const mockRecognitionResult = { character: 'あ', confidence: 0.8 };
            const mockScoreResult = { level: 'good', score: 0.8 };

            app.recordAttempt(mockDrawingData, mockRecognitionResult, mockScoreResult);

            expect(app.appState.currentSession.attempts.length).toBe(1);
            const attempt = app.appState.currentSession.attempts[0];
            expect(attempt.drawingData).toBe(mockDrawingData);
            expect(attempt.recognitionResult).toBe(mockRecognitionResult);
            expect(attempt.scoreResult).toBe(mockScoreResult);
        });

        test('アプリケーション状態リセット', () => {
            // セッションを開始して状態を設定
            app.startPracticeSession();
            app.recordAttempt({}, {}, {});

            // 状態をリセット
            app.resetAppState();

            expect(app.appState.currentSession).toBeNull();
            expect(app.appState.practiceData.attempts).toEqual([]);
            expect(app.appState.practiceData.startTime).toBeNull();
        });
    });

    describe('画面遷移テスト', () => {
        beforeEach(async () => {
            await app.init();
        });

        test('全画面の表示切り替え', () => {
            const screens = ['main-menu', 'practice-view', 'example-view', 'result-view'];

            screens.forEach(screenName => {
                app.showScreen(screenName);
                
                expect(app.currentScreen).toBe(screenName);
                expect(document.getElementById(screenName).classList.contains('active')).toBe(true);
                
                // 他の画面が非アクティブであることを確認
                screens.filter(s => s !== screenName).forEach(otherScreen => {
                    expect(document.getElementById(otherScreen).classList.contains('active')).toBe(false);
                });
            });
        });

        test('無効な画面名の処理', () => {
            const initialScreen = app.currentScreen;
            
            app.showScreen('invalid-screen');
            
            // 画面が変更されないことを確認
            expect(app.currentScreen).toBe(initialScreen);
        });
    });

    describe('サービス統合テスト', () => {
        beforeEach(async () => {
            await app.init();
        });

        test('描画 → 認識 → 採点の連携', () => {
            const drawingData = {
                strokes: [
                    [
                        { x: 100, y: 100, timestamp: Date.now() },
                        { x: 150, y: 150, timestamp: Date.now() + 100 }
                    ]
                ],
                timestamp: Date.now(),
                boundingBox: { x: 100, y: 100, width: 50, height: 50 }
            };

            // 認識実行
            const recognitionResult = app.recognitionService.recognizeCharacter(drawingData, 'あ');
            expect(recognitionResult).toBeDefined();
            expect(recognitionResult.character).toBe('あ');

            // 採点実行
            const scoreResult = app.scoreService.calculateScore(recognitionResult, 'あ', drawingData);
            expect(scoreResult).toBeDefined();
            expect(scoreResult.level).toBeDefined();
            expect(['excellent', 'good', 'fair', 'poor']).toContain(scoreResult.level);

            // フィードバック生成
            const feedback = app.scoreService.generateFeedback(scoreResult, recognitionResult, 'あ');
            expect(feedback).toBeDefined();
            expect(feedback.message).toBeDefined();
            expect(feedback.encouragement).toBeDefined();
        });

        test('文字データサービスとの連携', () => {
            const currentChar = app.hiraganaDataService.getCurrentCharacter();
            expect(currentChar).toBeDefined();
            expect(currentChar.character).toBeDefined();
            expect(currentChar.reading).toBeDefined();

            const nextChar = app.hiraganaDataService.getNextCharacter();
            expect(nextChar).toBeDefined();
            expect(nextChar.character).not.toBe(currentChar.character);
        });
    });
});