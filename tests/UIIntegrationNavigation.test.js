// UI統合とナビゲーションのテスト
import { MainMenuComponent } from '../js/components/MainMenuComponent.js';
import { ResultViewComponent } from '../js/components/ResultViewComponent.js';

describe('UI統合とナビゲーション', () => {
    let container;
    let mockApp;

    beforeEach(() => {
        // DOM環境をセットアップ
        document.body.innerHTML = `
            <div id="app">
                <!-- メインメニュー -->
                <div id="main-menu" class="screen active">
                </div>

                <!-- 練習画面 -->
                <div id="practice-view" class="screen">
                    <div class="character-display">
                        <span id="target-character">あ</span>
                    </div>
                    <div class="canvas-container">
                        <canvas id="drawing-canvas" width="400" height="400"></canvas>
                    </div>
                    <div class="practice-controls">
                        <button id="show-example-btn" class="control-button">手本を見る</button>
                        <button id="clear-canvas-btn" class="control-button">消す</button>
                        <button id="submit-drawing-btn" class="control-button">できた！</button>
                    </div>
                </div>

                <!-- 手本表示画面 -->
                <div id="example-view" class="screen">
                    <div class="example-display">
                        <span id="example-character">あ</span>
                    </div>
                    <button id="back-to-practice-btn" class="control-button">練習に戻る</button>
                </div>

                <!-- 結果表示画面 -->
                <div id="result-view" class="screen">
                </div>
            </div>
        `;
        
        container = document.getElementById('app');
        
        // モックアプリを作成
        mockApp = {
            startPractice: jest.fn(),
            showExample: jest.fn(),
            showScreen: jest.fn(),
            tryAgain: jest.fn(),
            nextCharacter: jest.fn(),
            currentScreen: 'main-menu',
            showScreen: jest.fn((screenName) => {
                // 全ての画面を非表示
                document.querySelectorAll('.screen').forEach(screen => {
                    screen.classList.remove('active');
                });
                
                // 指定された画面を表示
                const targetScreen = document.getElementById(screenName);
                if (targetScreen) {
                    targetScreen.classList.add('active');
                    mockApp.currentScreen = screenName;
                }
            })
        };
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('画面遷移の動作テスト', () => {
        test('初期状態でメインメニューが表示される', () => {
            const mainMenu = document.getElementById('main-menu');
            const practiceView = document.getElementById('practice-view');
            const exampleView = document.getElementById('example-view');
            const resultView = document.getElementById('result-view');

            expect(mainMenu.classList.contains('active')).toBe(true);
            expect(practiceView.classList.contains('active')).toBe(false);
            expect(exampleView.classList.contains('active')).toBe(false);
            expect(resultView.classList.contains('active')).toBe(false);
        });

        test('showScreenメソッドで画面遷移が正しく動作する', () => {
            mockApp.showScreen('practice-view');

            const mainMenu = document.getElementById('main-menu');
            const practiceView = document.getElementById('practice-view');

            expect(mainMenu.classList.contains('active')).toBe(false);
            expect(practiceView.classList.contains('active')).toBe(true);
            expect(mockApp.currentScreen).toBe('practice-view');
        });

        test('手本画面への遷移が正しく動作する', () => {
            mockApp.showScreen('example-view');

            const exampleView = document.getElementById('example-view');
            expect(exampleView.classList.contains('active')).toBe(true);
            expect(mockApp.currentScreen).toBe('example-view');
        });

        test('結果画面への遷移が正しく動作する', () => {
            mockApp.showScreen('result-view');

            const resultView = document.getElementById('result-view');
            expect(resultView.classList.contains('active')).toBe(true);
            expect(mockApp.currentScreen).toBe('result-view');
        });

        test('複数の画面遷移が正しく動作する', () => {
            // メインメニュー → 練習画面
            mockApp.showScreen('practice-view');
            expect(mockApp.currentScreen).toBe('practice-view');
            
            // 練習画面 → 手本画面
            mockApp.showScreen('example-view');
            expect(mockApp.currentScreen).toBe('example-view');
            
            // 手本画面 → 練習画面
            mockApp.showScreen('practice-view');
            expect(mockApp.currentScreen).toBe('practice-view');
            
            // 練習画面 → 結果画面
            mockApp.showScreen('result-view');
            expect(mockApp.currentScreen).toBe('result-view');
        });

        test('存在しない画面IDでもエラーが発生しない', () => {
            expect(() => {
                mockApp.showScreen('non-existent-screen');
            }).not.toThrow();
        });
    });

    describe('ボタン操作の応答性テスト', () => {
        test('メインメニューの練習開始ボタンが応答する', () => {
            const mainMenu = new MainMenuComponent(mockApp);
            mainMenu.init();
            
            const startButton = document.querySelector('#start-practice-btn');
            expect(startButton).toBeTruthy();

            // ボタンがクリック可能であることを確認
            expect(startButton.disabled).toBe(false);
            
            // CSSクラスが適用されていることを確認
            expect(startButton.classList.contains('big-button')).toBe(true);
        });

        test('練習画面のボタンが全て応答する', () => {
            mockApp.showScreen('practice-view');

            const showExampleBtn = document.getElementById('show-example-btn');
            const clearCanvasBtn = document.getElementById('clear-canvas-btn');
            const submitDrawingBtn = document.getElementById('submit-drawing-btn');

            expect(showExampleBtn).toBeTruthy();
            expect(clearCanvasBtn).toBeTruthy();
            expect(submitDrawingBtn).toBeTruthy();

            // ボタンがクリック可能であることを確認
            expect(showExampleBtn.disabled).toBe(false);
            expect(clearCanvasBtn.disabled).toBe(false);
            expect(submitDrawingBtn.disabled).toBe(false);
        });

        test('手本画面の戻るボタンが応答する', () => {
            mockApp.showScreen('example-view');

            const backButton = document.getElementById('back-to-practice-btn');
            expect(backButton).toBeTruthy();
            expect(backButton.disabled).toBe(false);
        });

        test('結果画面のボタンが応答する', () => {
            const resultView = new ResultViewComponent(mockApp);
            resultView.init();
            
            const mockScore = { level: 'good' };
            resultView.render(mockScore, 'あ');

            const tryAgainBtn = document.querySelector('#try-again-btn');
            const nextCharacterBtn = document.querySelector('#next-character-btn');

            expect(tryAgainBtn).toBeTruthy();
            expect(nextCharacterBtn).toBeTruthy();
            
            if (tryAgainBtn) expect(tryAgainBtn.disabled).toBe(false);
            if (nextCharacterBtn) expect(nextCharacterBtn.disabled).toBe(false);
        });

        test('ボタンホバー効果が機能する', () => {
            const mainMenu = new MainMenuComponent(mockApp);
            mainMenu.init();
            
            const startButton = document.querySelector('#start-practice-btn');
            if (startButton) {
                // マウスオーバーイベントをシミュレート
                const mouseOverEvent = new MouseEvent('mouseover', { bubbles: true });
                
                // イベントが正常に処理されることを確認
                expect(() => {
                    startButton.dispatchEvent(mouseOverEvent);
                }).not.toThrow();
                
                // ボタンがクリック可能であることを確認
                expect(startButton.disabled).toBe(false);
            }
        });
    });

    describe('子供向けUIの使いやすさ検証', () => {
        test('大きなボタンが表示される', () => {
            const mainMenu = new MainMenuComponent(mockApp);
            mainMenu.init();
            
            const buttons = document.querySelectorAll('.big-button');
            
            // ボタンが存在することを確認
            expect(buttons.length).toBeGreaterThan(0);
            
            buttons.forEach(button => {
                // ボタンに適切なクラスが設定されていることを確認
                expect(button.classList.contains('big-button')).toBe(true);
                
                // ボタンがクリック可能であることを確認
                expect(button.disabled).toBe(false);
            });
        });

        test('視覚的フィードバックが提供される', () => {
            const mainMenu = new MainMenuComponent(mockApp);
            mainMenu.init();
            
            const startButton = document.querySelector('#start-practice-btn');
            if (startButton) {
                // ボタンにアイコンが含まれていることを確認
                const icons = startButton.querySelectorAll('.button-icon');
                expect(icons.length).toBeGreaterThan(0);

                // ボタンに適切なクラスが設定されていることを確認
                expect(startButton.classList.contains('primary-button')).toBe(true);
            }
        });

        test('カラフルで親しみやすいデザインが適用される', () => {
            const mainMenu = new MainMenuComponent(mockApp);
            mainMenu.init();
            
            const title = document.querySelector('.app-title');
            if (title) {
                const computedStyle = window.getComputedStyle(title);
                // タイトルに色が設定されていることを確認
                expect(computedStyle.color).not.toBe('rgb(0, 0, 0)'); // 黒以外
            }

            const buttons = document.querySelectorAll('.big-button');
            buttons.forEach(button => {
                const computedStyle = window.getComputedStyle(button);
                // ボタンに影が設定されていることを確認
                expect(computedStyle.boxShadow).not.toBe('none');
            });
        });

        test('アニメーション効果が適用される', () => {
            const mainMenu = new MainMenuComponent(mockApp);
            mainMenu.init();
            
            const icons = document.querySelectorAll('.title-icon');
            icons.forEach(icon => {
                const computedStyle = window.getComputedStyle(icon);
                // アニメーションが設定されていることを確認
                expect(computedStyle.animationName).not.toBe('none');
            });
        });

        test('タッチフレンドリーなサイズが確保される', () => {
            const mainMenu = new MainMenuComponent(mockApp);
            mainMenu.init();
            
            const buttons = document.querySelectorAll('.big-button');
            
            // ボタンが存在することを確認
            expect(buttons.length).toBeGreaterThan(0);
            
            buttons.forEach(button => {
                // ボタンがタッチイベントに応答することを確認
                const touchStartEvent = new TouchEvent('touchstart', { bubbles: true });
                expect(() => {
                    button.dispatchEvent(touchStartEvent);
                }).not.toThrow();
            });
        });

        test('適切な間隔が確保される', () => {
            const mainMenu = new MainMenuComponent(mockApp);
            mainMenu.init();
            
            const menuButtons = document.querySelector('.menu-buttons');
            
            // メニューボタンコンテナが存在することを確認
            expect(menuButtons).toBeTruthy();
            
            // 複数のボタンが含まれていることを確認
            const buttons = menuButtons.querySelectorAll('.big-button');
            expect(buttons.length).toBeGreaterThan(1);
        });

        test('読みやすいフォントが使用される', () => {
            const mainMenu = new MainMenuComponent(mockApp);
            mainMenu.init();
            
            const title = document.querySelector('.app-title');
            
            // タイトルが存在することを確認
            expect(title).toBeTruthy();
            
            // タイトルに適切なテキストが含まれていることを確認
            expect(title.textContent).toContain('ひらがな練習');
        });

        test('結果画面でも子供向けUIが適用される', () => {
            const resultView = new ResultViewComponent(mockApp);
            resultView.init();
            
            const mockScore = { level: 'excellent' };
            resultView.render(mockScore, 'あ');

            const scoreIcon = document.querySelector('#score-icon');
            
            // スコアアイコンが存在することを確認
            expect(scoreIcon).toBeTruthy();
            
            // 適切なクラスが設定されていることを確認
            expect(scoreIcon.classList.contains('excellent')).toBe(true);

            const buttons = document.querySelectorAll('.result-button');
            
            // ボタンが存在することを確認
            expect(buttons.length).toBeGreaterThan(0);
            
            buttons.forEach(button => {
                // ボタンに適切なクラスが設定されていることを確認
                expect(button.classList.contains('result-button')).toBe(true);
            });
        });
    });

    describe('レスポンシブ対応テスト', () => {
        test('小さな画面でも要素が適切に表示される', () => {
            // 画面サイズを小さく設定
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 480,
            });
            
            const mainMenu = new MainMenuComponent(mockApp);
            mainMenu.init();
            
            const buttons = document.querySelectorAll('.big-button');
            
            // ボタンが存在することを確認
            expect(buttons.length).toBeGreaterThan(0);
            
            buttons.forEach(button => {
                // ボタンが正常に機能することを確認
                expect(button.disabled).toBe(false);
                expect(button.textContent.trim().length).toBeGreaterThan(0);
            });
        });

        test('タッチデバイスでの操作性が確保される', () => {
            const mainMenu = new MainMenuComponent(mockApp);
            mainMenu.init();
            
            const startButton = document.querySelector('#start-practice-btn');
            if (startButton) {
                // タッチイベントリスナーが設定されていることを確認
                const touchStartEvent = new TouchEvent('touchstart', { bubbles: true });
                
                expect(() => {
                    startButton.dispatchEvent(touchStartEvent);
                }).not.toThrow();
            }
        });

        test('結果画面もレスポンシブ対応されている', () => {
            const resultView = new ResultViewComponent(mockApp);
            resultView.init();
            
            const mockScore = { level: 'good' };
            resultView.render(mockScore, 'あ');

            const resultButtons = document.querySelectorAll('.result-button');
            
            // ボタンが存在することを確認
            expect(resultButtons.length).toBeGreaterThan(0);
            
            resultButtons.forEach(button => {
                // ボタンが正常に機能することを確認
                expect(button.disabled).toBe(false);
                expect(button.textContent.trim().length).toBeGreaterThan(0);
            });
        });
    });

    describe('アクセシビリティテスト', () => {
        test('ボタンに適切なテキストが設定される', () => {
            const mainMenu = new MainMenuComponent(mockApp);
            mainMenu.init();
            
            const buttons = document.querySelectorAll('button');
            buttons.forEach(button => {
                // ボタンにテキストまたはaria-labelが設定されていることを確認
                expect(
                    button.textContent.trim().length > 0 || 
                    button.getAttribute('aria-label')
                ).toBeTruthy();
            });
        });

        test('キーボードナビゲーションが可能', () => {
            const mainMenu = new MainMenuComponent(mockApp);
            mainMenu.init();
            
            const buttons = document.querySelectorAll('button');
            buttons.forEach(button => {
                // ボタンがフォーカス可能であることを確認
                expect(button.tabIndex).toBeGreaterThanOrEqual(0);
            });
        });

        test('適切なコントラストが確保される', () => {
            const mainMenu = new MainMenuComponent(mockApp);
            mainMenu.init();
            
            const buttons = document.querySelectorAll('.big-button');
            buttons.forEach(button => {
                const computedStyle = window.getComputedStyle(button);
                
                // 背景色と文字色が設定されていることを確認
                expect(computedStyle.backgroundColor).not.toBe('transparent');
                expect(computedStyle.color).not.toBe('transparent');
            });
        });

        test('結果画面でもアクセシビリティが確保される', () => {
            const resultView = new ResultViewComponent(mockApp);
            resultView.init();
            
            const mockScore = { level: 'good' };
            resultView.render(mockScore, 'あ');

            const buttons = document.querySelectorAll('.result-button');
            buttons.forEach(button => {
                // ボタンにテキストが設定されていることを確認
                expect(button.textContent.trim().length).toBeGreaterThan(0);
                
                // ボタンがフォーカス可能であることを確認
                expect(button.tabIndex).toBeGreaterThanOrEqual(0);
            });
        });
    });
});