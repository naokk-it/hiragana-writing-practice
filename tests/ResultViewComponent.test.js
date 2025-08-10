// ResultViewComponentのテスト
import { ResultViewComponent } from '../js/components/ResultViewComponent.js';

describe('ResultViewComponent', () => {
    let component;
    let mockApp;
    let container;

    beforeEach(() => {
        // DOM環境をセットアップ
        document.body.innerHTML = `
            <div id="result-view" class="screen">
            </div>
        `;
        
        // モックアプリを作成
        mockApp = {
            tryAgain: jest.fn(),
            nextCharacter: jest.fn(),
            showExample: jest.fn(),
            showScreen: jest.fn()
        };
        
        container = document.getElementById('result-view');
        component = new ResultViewComponent(mockApp);
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

    describe('スコアデータ生成', () => {
        beforeEach(() => {
            component.init();
        });

        test('excellentスコアで正しいデータが生成される', () => {
            const scoreData = component.getScoreData({ level: 'excellent' });
            
            expect(scoreData.icon).toBe('🌟');
            expect(scoreData.className).toBe('excellent');
            expect(scoreData.message).toBe('すばらしい！');
            expect(scoreData.messageClass).toBe('excellent-message');
            expect(scoreData.encouragement).toContain('とても上手');
        });

        test('goodスコアで正しいデータが生成される', () => {
            const scoreData = component.getScoreData({ level: 'good' });
            
            expect(scoreData.icon).toBe('😊');
            expect(scoreData.className).toBe('good');
            expect(scoreData.message).toBe('よくできました！');
            expect(scoreData.messageClass).toBe('good-message');
        });

        test('fairスコアで正しいデータが生成される', () => {
            const scoreData = component.getScoreData({ level: 'fair' });
            
            expect(scoreData.icon).toBe('😐');
            expect(scoreData.className).toBe('fair');
            expect(scoreData.message).toBe('もう少し！');
            expect(scoreData.messageClass).toBe('fair-message');
        });

        test('poorスコアで正しいデータが生成される', () => {
            const scoreData = component.getScoreData({ level: 'poor' });
            
            expect(scoreData.icon).toBe('😅');
            expect(scoreData.className).toBe('poor');
            expect(scoreData.message).toBe('がんばろう！');
            expect(scoreData.messageClass).toBe('poor-message');
        });

        test('不明なスコアでデフォルトデータが生成される', () => {
            const scoreData = component.getScoreData({ level: 'unknown' });
            
            expect(scoreData.icon).toBe('😊');
            expect(scoreData.className).toBe('good');
            expect(scoreData.message).toBe('よくできました！');
        });
    });

    describe('レンダリング', () => {
        beforeEach(() => {
            component.init();
        });

        test('結果画面が正しくレンダリングされる', () => {
            const score = { level: 'good' };
            const character = 'あ';
            
            component.render(score, character);
            
            const characterDisplay = container.querySelector('.character-display');
            const scoreMessage = container.querySelector('#score-message');
            const encouragementText = container.querySelector('.encouragement-text');
            
            expect(characterDisplay.textContent).toBe(character);
            expect(scoreMessage.textContent.trim()).toBe('よくできました！');
            expect(encouragementText).toBeTruthy();
        });

        test('基本ボタンが表示される', () => {
            const score = { level: 'good' };
            component.render(score, 'あ');
            
            const tryAgainBtn = container.querySelector('#try-again-btn');
            const nextCharacterBtn = container.querySelector('#next-character-btn');
            const backToMenuBtn = container.querySelector('#back-to-menu-btn');
            
            expect(tryAgainBtn).toBeTruthy();
            expect(nextCharacterBtn).toBeTruthy();
            expect(backToMenuBtn).toBeTruthy();
        });

        test('低スコア時に手本ボタンが表示される', () => {
            const score = { level: 'poor' };
            component.render(score, 'あ');
            
            const showExampleBtn = container.querySelector('#show-example-btn');
            expect(showExampleBtn).toBeTruthy();
        });

        test('高スコア時に手本ボタンが表示されない', () => {
            const score = { level: 'excellent' };
            component.render(score, 'あ');
            
            const showExampleBtn = container.querySelector('#show-example-btn');
            expect(showExampleBtn).toBeFalsy();
        });

        test('スコアアイコンに適切なクラスが設定される', () => {
            const score = { level: 'excellent' };
            component.render(score, 'あ');
            
            const scoreIcon = container.querySelector('#score-icon');
            expect(scoreIcon.classList.contains('excellent')).toBe(true);
        });
    });

    describe('イベント処理', () => {
        beforeEach(() => {
            component.init();
            const score = { level: 'good' };
            component.render(score, 'あ');
        });

        test('もう一度ボタンクリックでtryAgainが呼ばれる', () => {
            // setTimeoutをモックして即座に実行
            jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
                callback();
                return 1;
            });
            
            component.onTryAgain();
            
            expect(mockApp.tryAgain).toHaveBeenCalled();
            
            global.setTimeout.mockRestore();
        });

        test('次の文字ボタンクリックでnextCharacterが呼ばれる', () => {
            jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
                callback();
                return 1;
            });
            
            component.onNextCharacter();
            
            expect(mockApp.nextCharacter).toHaveBeenCalled();
            
            global.setTimeout.mockRestore();
        });

        test('メニューに戻るボタンクリックでshowScreenが呼ばれる', () => {
            jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
                callback();
                return 1;
            });
            
            component.onBackToMenu();
            
            expect(mockApp.showScreen).toHaveBeenCalledWith('main-menu');
            
            global.setTimeout.mockRestore();
        });

        test('ボタンクリック時に視覚的フィードバックが提供される', () => {
            const tryAgainBtn = container.querySelector('#try-again-btn');
            
            const clickEvent = new MouseEvent('click', { bubbles: true });
            tryAgainBtn.dispatchEvent(clickEvent);
            
            expect(tryAgainBtn.classList.contains('clicked')).toBe(true);
        });
    });

    describe('手本ボタン機能', () => {
        beforeEach(() => {
            component.init();
        });

        test('低スコア時に手本ボタンが機能する', () => {
            const score = { level: 'poor' };
            component.render(score, 'あ');
            
            const showExampleBtn = container.querySelector('#show-example-btn');
            expect(showExampleBtn).toBeTruthy();
            
            jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
                callback();
                return 1;
            });
            
            component.onShowExample();
            
            expect(mockApp.showExample).toHaveBeenCalled();
            
            global.setTimeout.mockRestore();
        });
    });

    describe('displayResult メソッド', () => {
        beforeEach(() => {
            component.init();
        });

        test('displayResultでrenderが呼ばれる', () => {
            const renderSpy = jest.spyOn(component, 'render');
            const score = { level: 'good' };
            const character = 'あ';
            
            component.displayResult(score, character);
            
            expect(renderSpy).toHaveBeenCalledWith(score, character);
        });

        test('displayResult時にアニメーションクラスが追加される', () => {
            const score = { level: 'good' };
            component.displayResult(score, 'あ');
            
            expect(container.classList.contains('result-enter')).toBe(true);
        });
    });

    describe('音声フィードバック', () => {
        beforeEach(() => {
            component.init();
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
            
            expect(() => component.playResultSound('excellent')).not.toThrow();
        });
    });

    describe('アニメーション効果', () => {
        beforeEach(() => {
            component.init();
        });

        test('addAnimationEffectsが正しく動作する', () => {
            const score = { level: 'good' };
            component.render(score, 'あ');
            
            const scoreData = component.getScoreData(score);
            
            // アニメーション効果のテスト
            expect(() => component.addAnimationEffects(scoreData)).not.toThrow();
        });
    });
});