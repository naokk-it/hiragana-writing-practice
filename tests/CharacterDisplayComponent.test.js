// CharacterDisplayComponentクラスのテスト

// DOM環境のセットアップ
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.CustomEvent = dom.window.CustomEvent;

// テスト対象のクラスをインポート
const CharacterDisplayComponent = require('../js/components/CharacterDisplayComponent.js');
const HiraganaDataService = require('../js/services/HiraganaDataService.js');

describe('CharacterDisplayComponent', () => {
    let component;
    let mockApp;
    let hiraganaService;

    beforeEach(() => {
        // DOM要素をセットアップ
        document.body.innerHTML = `
            <div id="test-container">
                <div class="character-display">
                    <span id="test-character">あ</span>
                </div>
            </div>
        `;

        // モックアプリとサービスを作成
        hiraganaService = new HiraganaDataService();
        mockApp = {
            getHiraganaDataService: jest.fn(() => hiraganaService)
        };

        component = new CharacterDisplayComponent(mockApp);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('constructor', () => {
        test('コンポーネントが正しく初期化される', () => {
            expect(component.app).toBe(mockApp);
            expect(component.currentCharacter).toBeNull();
            expect(component.displayElement).toBeNull();
            expect(component.navigationEnabled).toBe(false);
        });
    });

    describe('init', () => {
        test('基本的な初期化が正しく動作する', () => {
            component.init('test-container', 'test-character', false);

            expect(component.container).toBe(document.getElementById('test-container'));
            expect(component.displayElement).toBe(document.getElementById('test-character'));
            expect(component.navigationEnabled).toBe(false);
        });

        test('ナビゲーション付きで初期化できる', () => {
            component.init('test-container', 'test-character', true);

            expect(component.navigationEnabled).toBe(true);
            
            // ナビゲーションコントロールが作成されることを確認
            const navigation = document.querySelector('.character-navigation');
            expect(navigation).toBeTruthy();
        });

        test('存在しないコンテナIDでも初期化できる', () => {
            component.init('non-existent', 'test-character', false);

            expect(component.container).toBeNull();
            expect(component.displayElement).toBe(document.getElementById('test-character'));
        });
    });

    describe('createNavigationControls', () => {
        beforeEach(() => {
            component.init('test-container', 'test-character', true);
        });

        test('ナビゲーションコントロールが作成される', () => {
            const navigation = document.querySelector('.character-navigation');
            expect(navigation).toBeTruthy();

            const prevButton = navigation.querySelector('.prev-button');
            const nextButton = navigation.querySelector('.next-button');
            const indicator = navigation.querySelector('.character-indicator');

            expect(prevButton).toBeTruthy();
            expect(nextButton).toBeTruthy();
            expect(indicator).toBeTruthy();
        });

        test('ナビゲーションボタンにイベントリスナーが設定される', () => {
            const navigation = document.querySelector('.character-navigation');
            const prevButton = navigation.querySelector('.prev-button');
            const nextButton = navigation.querySelector('.next-button');

            // スパイを設定
            const showPreviousSpy = jest.spyOn(component, 'showPreviousCharacter').mockImplementation(() => {});
            const showNextSpy = jest.spyOn(component, 'showNextCharacter').mockImplementation(() => {});

            // ボタンクリックをシミュレート
            prevButton.click();
            nextButton.click();

            expect(showPreviousSpy).toHaveBeenCalledTimes(1);
            expect(showNextSpy).toHaveBeenCalledTimes(1);
        });

        test('既存のナビゲーションが削除されて新しいものが作成される', () => {
            // 2回目の作成
            component.createNavigationControls();

            const navigations = document.querySelectorAll('.character-navigation');
            expect(navigations.length).toBe(1);
        });
    });

    describe('updateDisplay', () => {
        beforeEach(() => {
            component.init('test-container', 'test-character', false);
        });

        test('文字表示が更新される', () => {
            component.updateDisplay();

            const displayElement = document.getElementById('test-character');
            expect(displayElement.textContent).toBe('あ');
            expect(component.currentCharacter).toBeTruthy();
            expect(component.currentCharacter.character).toBe('あ');
        });

        test('表示要素が存在しない場合でもエラーが発生しない', () => {
            component.displayElement = null;
            
            expect(() => {
                component.updateDisplay();
            }).not.toThrow();
        });
    });

    describe('updateCharacterStyle', () => {
        beforeEach(() => {
            component.init('test-container', 'test-character', false);
            component.updateDisplay();
        });

        test('難易度に応じて色が設定される', () => {
            const displayElement = document.getElementById('test-character');
            
            // 難易度1の文字（あ）の色をチェック
            expect(displayElement.style.color).toBeTruthy();
        });

        test('アニメーション効果が適用される', (done) => {
            const displayElement = document.getElementById('test-character');
            
            component.updateCharacterStyle();
            
            // 初期状態でscaleが0.8に設定される
            expect(displayElement.style.transform).toBe('scale(0.8)');
            
            // 100ms後にscale(1)に戻ることを確認
            setTimeout(() => {
                expect(displayElement.style.transform).toBe('scale(1)');
                done();
            }, 150);
        });
    });

    describe('showNextCharacter', () => {
        beforeEach(() => {
            component.init('test-container', 'test-character', false);
        });

        test('次の文字に移動する', () => {
            const initialChar = hiraganaService.getCurrentCharacter();
            
            component.showNextCharacter();
            
            const newChar = hiraganaService.getCurrentCharacter();
            expect(newChar).not.toBe(initialChar);
            expect(newChar.character).toBe('い');
        });

        test('文字変更イベントが発火される', () => {
            const eventSpy = jest.spyOn(component, 'notifyCharacterChange');
            
            component.showNextCharacter();
            
            expect(eventSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('showPreviousCharacter', () => {
        beforeEach(() => {
            component.init('test-container', 'test-character', false);
            // 最初から2番目の文字に移動
            hiraganaService.getNextCharacter();
        });

        test('前の文字に移動する', () => {
            component.showPreviousCharacter();
            
            const currentChar = hiraganaService.getCurrentCharacter();
            expect(currentChar.character).toBe('あ');
        });

        test('文字変更イベントが発火される', () => {
            const eventSpy = jest.spyOn(component, 'notifyCharacterChange');
            
            component.showPreviousCharacter();
            
            expect(eventSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('showCharacter', () => {
        beforeEach(() => {
            component.init('test-container', 'test-character', false);
        });

        test('指定した文字に移動する', () => {
            component.showCharacter('う');
            
            const currentChar = hiraganaService.getCurrentCharacter();
            expect(currentChar.character).toBe('う');
        });

        test('存在しない文字を指定した場合は変更されない', () => {
            const initialChar = hiraganaService.getCurrentCharacter();
            
            component.showCharacter('ん');
            
            const currentChar = hiraganaService.getCurrentCharacter();
            expect(currentChar).toBe(initialChar);
        });

        test('有効な文字選択時に文字変更イベントが発火される', () => {
            const eventSpy = jest.spyOn(component, 'notifyCharacterChange');
            
            component.showCharacter('え');
            
            expect(eventSpy).toHaveBeenCalledTimes(1);
        });

        test('無効な文字選択時は文字変更イベントが発火されない', () => {
            const eventSpy = jest.spyOn(component, 'notifyCharacterChange');
            
            component.showCharacter('ん');
            
            expect(eventSpy).not.toHaveBeenCalled();
        });
    });

    describe('notifyCharacterChange', () => {
        beforeEach(() => {
            component.init('test-container', 'test-character', false);
            component.updateDisplay();
        });

        test('カスタムイベントが発火される', () => {
            const eventListener = jest.fn();
            document.addEventListener('characterChanged', eventListener);
            
            component.notifyCharacterChange();
            
            expect(eventListener).toHaveBeenCalledTimes(1);
            expect(eventListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'characterChanged',
                    detail: expect.objectContaining({
                        character: component.currentCharacter,
                        component: component
                    })
                })
            );
        });
    });

    describe('getCurrentCharacter', () => {
        beforeEach(() => {
            component.init('test-container', 'test-character', false);
            component.updateDisplay();
        });

        test('現在の文字が返される', () => {
            const currentChar = component.getCurrentCharacter();
            
            expect(currentChar).toBeTruthy();
            expect(currentChar.character).toBe('あ');
        });
    });

    describe('refresh', () => {
        beforeEach(() => {
            component.init('test-container', 'test-character', false);
        });

        test('表示がリフレッシュされる', () => {
            const updateDisplaySpy = jest.spyOn(component, 'updateDisplay');
            
            component.refresh();
            
            expect(updateDisplaySpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('統合テスト', () => {
        test('完全な文字切り替えフローが動作する', () => {
            component.init('test-container', 'test-character', true);
            
            // 初期状態の確認
            expect(component.getCurrentCharacter().character).toBe('あ');
            
            // 次の文字に移動
            component.showNextCharacter();
            expect(component.getCurrentCharacter().character).toBe('い');
            
            // 特定の文字に移動
            component.showCharacter('う');
            expect(component.getCurrentCharacter().character).toBe('う');
            
            // 前の文字に移動
            component.showPreviousCharacter();
            expect(component.getCurrentCharacter().character).toBe('い');
        });

        test('ナビゲーション付きコンポーネントの完全な動作', () => {
            component.init('test-container', 'test-character', true);
            
            // ナビゲーションコントロールの存在確認
            const navigation = document.querySelector('.character-navigation');
            expect(navigation).toBeTruthy();
            
            // インジケーターの更新確認
            const indicator = document.getElementById('character-indicator');
            expect(indicator.textContent).toContain('1 / 15');
            
            // 次の文字に移動してインジケーター更新確認
            component.showNextCharacter();
            expect(indicator.textContent).toContain('2 / 15');
        });
    });
});