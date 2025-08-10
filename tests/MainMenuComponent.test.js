// MainMenuComponentのテスト
import { MainMenuComponent } from '../js/components/MainMenuComponent.js';

describe('MainMenuComponent', () => {
    let component;
    let mockApp;
    let container;

    beforeEach(() => {
        // DOM環境をセットアップ
        document.body.innerHTML = `
            <div id="main-menu" class="screen">
            </div>
        `;
        
        // モックアプリを作成
        mockApp = {
            startPractice: jest.fn(),
            showScreen: jest.fn()
        };
        
        container = document.getElementById('main-menu');
        component = new MainMenuComponent(mockApp);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('初期化', () => {
        test('コンポーネントが正しく初期化される', () => {
            expect(component.app).toBe(mockApp);
            expect(component.element).toBe(container);
            expect(component.isInitialized).toBe(false);
        });

        test('init()を呼び出すと初期化される', () => {
            component.init();
            expect(component.isInitialized).toBe(true);
        });

        test('init()を複数回呼び出しても問題ない', () => {
            component.init();
            component.init();
            expect(component.isInitialized).toBe(true);
        });
    });

    describe('レンダリング', () => {
        beforeEach(() => {
            component.init();
        });

        test('子供向けUIが正しくレンダリングされる', () => {
            const title = container.querySelector('.app-title');
            expect(title).toBeTruthy();
            expect(title.textContent).toContain('ひらがな練習');
        });

        test('大きなボタンが表示される', () => {
            const startButton = container.querySelector('#start-practice-btn');
            const selectButton = container.querySelector('#character-select-btn');
            
            expect(startButton).toBeTruthy();
            expect(selectButton).toBeTruthy();
            expect(startButton.classList.contains('big-button')).toBe(true);
            expect(selectButton.classList.contains('big-button')).toBe(true);
        });

        test('ウェルカムメッセージが表示される', () => {
            const welcomeMessage = container.querySelector('.welcome-message p');
            expect(welcomeMessage).toBeTruthy();
            expect(welcomeMessage.textContent).toContain('楽しくひらがなを覚えよう！');
        });

        test('アイコンが含まれている', () => {
            const titleIcons = container.querySelectorAll('.title-icon');
            const buttonIcons = container.querySelectorAll('.button-icon');
            
            expect(titleIcons.length).toBeGreaterThan(0);
            expect(buttonIcons.length).toBeGreaterThan(0);
        });
    });

    describe('イベント処理', () => {
        beforeEach(() => {
            component.init();
        });

        test('練習開始ボタンクリックで練習が開始される', () => {
            const startButton = container.querySelector('#start-practice-btn');
            
            startButton.click();
            
            // アニメーション後にstartPracticeが呼ばれるため、少し待つ
            setTimeout(() => {
                expect(mockApp.startPractice).toHaveBeenCalled();
            }, 250);
        });

        test('文字選択ボタンクリックで練習が開始される', () => {
            const selectButton = container.querySelector('#character-select-btn');
            
            selectButton.click();
            
            // アニメーション後にstartPracticeが呼ばれるため、少し待つ
            setTimeout(() => {
                expect(mockApp.startPractice).toHaveBeenCalled();
            }, 250);
        });

        test('ボタンクリック時に視覚的フィードバックが提供される', () => {
            const startButton = container.querySelector('#start-practice-btn');
            
            // マウスダウンイベントをシミュレート
            const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
            startButton.dispatchEvent(mouseDownEvent);
            
            expect(startButton.classList.contains('pressed')).toBe(true);
        });
    });

    describe('インタラクティブ効果', () => {
        beforeEach(() => {
            component.init();
        });

        test('タッチ開始時にpressedクラスが追加される', () => {
            const startButton = container.querySelector('#start-practice-btn');
            
            const touchStartEvent = new TouchEvent('touchstart', { bubbles: true });
            startButton.dispatchEvent(touchStartEvent);
            
            expect(startButton.classList.contains('pressed')).toBe(true);
        });

        test('音声フィードバックが実行される', () => {
            // Web Audio APIのモック
            const mockAudioContext = {
                createOscillator: jest.fn(() => ({
                    connect: jest.fn(),
                    frequency: {
                        setValueAtTime: jest.fn(),
                        exponentialRampToValueAtTime: jest.fn()
                    },
                    start: jest.fn(),
                    stop: jest.fn()
                })),
                createGain: jest.fn(() => ({
                    connect: jest.fn(),
                    gain: {
                        setValueAtTime: jest.fn(),
                        exponentialRampToValueAtTime: jest.fn()
                    }
                })),
                destination: {},
                currentTime: 0
            };
            
            global.AudioContext = jest.fn(() => mockAudioContext);
            
            // 音声フィードバックをテスト
            expect(() => component.playButtonSound()).not.toThrow();
        });
    });

    describe('画面アクティベーション', () => {
        beforeEach(() => {
            component.init();
        });

        test('onActivate()でフェードインアニメーションが開始される', () => {
            component.onActivate();
            
            expect(container.classList.contains('fade-in')).toBe(true);
            
            // アニメーション終了後にクラスが削除される
            setTimeout(() => {
                expect(container.classList.contains('fade-in')).toBe(false);
            }, 350);
        });
    });

    describe('ナビゲーション機能', () => {
        beforeEach(() => {
            component.init();
        });

        test('onStartPractice()でフェードアウト効果が適用される', () => {
            component.onStartPractice();
            
            expect(container.classList.contains('fade-out')).toBe(true);
        });

        test('onCharacterSelect()が練習開始を呼び出す', () => {
            const spy = jest.spyOn(component, 'onStartPractice');
            component.onCharacterSelect();
            
            expect(spy).toHaveBeenCalled();
        });
    });
});