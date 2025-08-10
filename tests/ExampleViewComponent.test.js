/**
 * ExampleViewComponent のテスト
 * 要件2.1, 2.2, 2.3に対応した手本表示機能のテスト
 */

import { ExampleViewComponent } from '../js/components/ExampleViewComponent.js';

describe('ExampleViewComponent', () => {
    let component;
    let mockApp;
    let mockHiraganaService;
    let container;

    beforeEach(() => {
        // DOM要素をセットアップ
        document.body.innerHTML = `
            <div id="example-view" class="screen">
                <div class="example-display">
                    <span id="example-character">あ</span>
                </div>
                <button id="back-to-practice-btn" class="control-button">練習に戻る</button>
            </div>
        `;

        // モックサービスを作成
        mockHiraganaService = {
            getCurrentCharacter: jest.fn(() => ({ character: 'あ', reading: 'あ', difficulty: 1 })),
            selectCharacter: jest.fn((char) => ({ character: char, reading: char, difficulty: 1 })),
            getCurrentIndex: jest.fn(() => 0),
            getCharacterCount: jest.fn(() => 15)
        };
        
        // モックアプリを作成
        mockApp = {
            getHiraganaDataService: () => mockHiraganaService,
            backToPractice: jest.fn()
        };

        component = new ExampleViewComponent(mockApp);
        container = document.getElementById('example-view');
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('初期化', () => {
        test('コンポーネントが正しく初期化される', () => {
            component.init();
            
            expect(component.element).toBe(container);
            expect(component.exampleCharacterElement).toBeTruthy();
            expect(component.backButton).toBeTruthy();
            expect(component.isVisible).toBe(false);
        });

        test('手本用フォントが正しく設定される', () => {
            component.init();
            
            const exampleChar = document.getElementById('example-character');
            expect(exampleChar.style.fontWeight).toBe('900');
            expect(exampleChar.style.fontSize).toBe('8rem');
            expect(exampleChar.style.color).toBe('rgb(78, 205, 196)'); // #4ECDC4
            expect(exampleChar.style.fontFamily).toContain('Hiragino Sans');
        });

        test('戻るボタンのイベントリスナーが設定される', () => {
            component.init();
            
            const backButton = document.getElementById('back-to-practice-btn');
            backButton.click();
            
            expect(mockApp.backToPractice).toHaveBeenCalled();
        });
    });

    describe('手本文字の表示機能 (要件2.1)', () => {
        beforeEach(() => {
            component.init();
        });

        test('指定された文字の手本が表示される', () => {
            const testCharacter = 'か';
            
            component.showCharacterExample(testCharacter);
            
            expect(component.isVisible).toBe(true);
            expect(component.currentCharacter).toBeTruthy();
            
            const exampleElement = document.getElementById('example-character');
            expect(exampleElement.textContent).toBe(testCharacter);
        });

        test('文字が指定されない場合は現在の文字が表示される', () => {
            const currentChar = mockHiraganaService.getCurrentCharacter();
            
            component.showCharacterExample();
            
            expect(component.currentCharacter).toEqual(currentChar);
            expect(component.isVisible).toBe(true);
        });

        test('手本文字が正しくレンダリングされる', () => {
            const testCharacter = 'さ';
            component.currentCharacter = { character: testCharacter };
            
            component.render();
            
            const exampleElement = document.getElementById('example-character');
            expect(exampleElement.textContent).toBe(testCharacter);
        });

        test('手本表示時にアニメーション効果が適用される', (done) => {
            const testCharacter = 'た';
            
            component.showCharacterExample(testCharacter);
            
            const exampleElement = document.getElementById('example-character');
            
            // アニメーション開始時の状態をチェック
            setTimeout(() => {
                expect(exampleElement.style.opacity).toBe('1');
                expect(exampleElement.style.transform).toBe('scale(1)');
                done();
            }, 100);
        });
    });

    describe('手本表示/非表示の切り替え機能 (要件2.2)', () => {
        beforeEach(() => {
            component.init();
        });

        test('手本を表示状態に切り替えられる', () => {
            component.showCharacterExample('な');
            
            expect(component.isVisible).toBe(true);
            expect(component.isExampleVisible()).toBe(true);
        });

        test('手本を非表示状態に切り替えられる', () => {
            component.showCharacterExample('は');
            expect(component.isVisible).toBe(true);
            
            component.hideExample();
            
            expect(component.isVisible).toBe(false);
            expect(component.isExampleVisible()).toBe(false);
        });

        test('手本表示の切り替えが正しく動作する', () => {
            // 初期状態は非表示
            expect(component.isVisible).toBe(false);
            
            // 表示に切り替え
            component.toggleExample();
            expect(component.isVisible).toBe(true);
            
            // 非表示に切り替え
            component.toggleExample();
            expect(component.isVisible).toBe(false);
        });

        test('非表示時にフェードアウト効果が適用される', () => {
            component.showCharacterExample('ま');
            
            component.hideExample();
            
            const exampleElement = document.getElementById('example-character');
            expect(exampleElement.style.opacity).toBe('0');
        });
    });

    describe('練習画面への遷移機能 (要件2.3)', () => {
        beforeEach(() => {
            component.init();
        });

        test('「練習に戻る」ボタンクリックで練習画面に遷移する', () => {
            component.showCharacterExample('や');
            expect(component.isVisible).toBe(true);
            
            component.onBackToPractice();
            
            expect(component.isVisible).toBe(false);
            expect(mockApp.backToPractice).toHaveBeenCalled();
        });

        test('手本表示後に同じ文字での練習が継続される', () => {
            const testCharacter = 'ら';
            component.showCharacterExample(testCharacter);
            
            const displayedCharacter = component.getCurrentCharacter();
            
            component.onBackToPractice();
            
            // 同じ文字が保持されていることを確認
            expect(displayedCharacter.character).toBe(testCharacter);
        });
    });

    describe('エラーハンドリング', () => {
        test('DOM要素が存在しない場合でもエラーが発生しない', () => {
            document.body.innerHTML = '';
            const componentWithoutDOM = new ExampleViewComponent(mockApp);
            
            expect(() => {
                componentWithoutDOM.init();
                componentWithoutDOM.showCharacterExample('わ');
                componentWithoutDOM.render();
            }).not.toThrow();
        });

        test('無効な文字が指定された場合の処理', () => {
            component.init();
            
            // 存在しない文字を指定
            component.showCharacterExample('invalid');
            
            // 現在の文字が使用されることを確認
            expect(component.currentCharacter).toBeTruthy();
        });

        test('アプリオブジェクトが無効な場合の処理', () => {
            const componentWithInvalidApp = new ExampleViewComponent(null);
            
            expect(() => {
                componentWithInvalidApp.init();
                componentWithInvalidApp.showCharacterExample('を');
            }).not.toThrow();
        });
    });

    describe('アクセシビリティ', () => {
        beforeEach(() => {
            component.init();
        });

        test('手本文字が適切なコントラストで表示される', () => {
            component.showCharacterExample('ん');
            
            const exampleElement = document.getElementById('example-character');
            const computedStyle = window.getComputedStyle(exampleElement);
            
            // 色が設定されていることを確認
            expect(computedStyle.color).toBeTruthy();
            expect(computedStyle.textShadow).toBeTruthy();
        });

        test('ボタンが適切にフォーカス可能である', () => {
            const backButton = document.getElementById('back-to-practice-btn');
            
            backButton.focus();
            expect(document.activeElement).toBe(backButton);
        });
    });

    describe('パフォーマンス', () => {
        beforeEach(() => {
            component.init();
        });

        test('連続した文字変更が効率的に処理される', () => {
            const renderSpy = jest.spyOn(component, 'render');
            
            component.showCharacterExample('あ');
            component.showCharacterExample('い');
            component.showCharacterExample('う');
            
            expect(renderSpy).toHaveBeenCalledTimes(3);
        });

        test('不要な再描画が発生しない', () => {
            const renderSpy = jest.spyOn(component, 'render');
            
            component.showCharacterExample('え');
            component.showCharacterExample('え'); // 同じ文字
            
            expect(renderSpy).toHaveBeenCalledTimes(2);
        });
    });
});