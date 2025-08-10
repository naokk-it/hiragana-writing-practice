/**
 * 手本表示コンポーネント
 * 要件2.1, 2.2, 2.3に対応した手本表示機能を提供
 */
import { CharacterDisplayComponent } from './CharacterDisplayComponent.js';

export class ExampleViewComponent {
    constructor(app) {
        this.app = app;
        this.element = document.getElementById('example-view');
        this.exampleCharacterElement = document.getElementById('example-character');
        this.backButton = document.getElementById('back-to-practice-btn');
        this.isVisible = false;
        this.currentCharacter = null;
        this.characterDisplay = new CharacterDisplayComponent(app);
    }

    /**
     * コンポーネントを初期化
     */
    init() {
        this.setupEventListeners();
        this.setupExampleFont();
        this.initCharacterDisplay();
        console.log('ExampleViewComponent初期化完了');
    }

    /**
     * 文字表示コンポーネントを初期化
     */
    initCharacterDisplay() {
        // 文字表示コンポーネントを初期化（ナビゲーション付き）
        this.characterDisplay.init('example-character-display', 'example-character', true);
        
        // 文字変更イベントをリッスン
        document.addEventListener('characterChanged', (event) => {
            this.onCharacterChanged(event.detail.character);
        });
    }

    /**
     * 手本用の見やすいフォント設定を適用
     * 要件2.3: 見やすい手本フォントの設定
     */
    setupExampleFont() {
        if (this.exampleCharacterElement) {
            // 手本専用のフォント設定
            this.exampleCharacterElement.style.fontFamily = "'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', monospace";
            this.exampleCharacterElement.style.fontWeight = '900';
            this.exampleCharacterElement.style.fontSize = '8rem';
            this.exampleCharacterElement.style.color = '#4ECDC4';
            this.exampleCharacterElement.style.textShadow = '3px 3px 6px rgba(0, 0, 0, 0.15)';
            this.exampleCharacterElement.style.letterSpacing = '0.1em';
            this.exampleCharacterElement.style.lineHeight = '1.2';
            
            // 子供が見やすいように少し太めの輪郭を追加
            this.exampleCharacterElement.style.webkitTextStroke = '1px rgba(78, 205, 196, 0.3)';
        }
    }

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        if (this.backButton) {
            this.backButton.addEventListener('click', () => {
                this.onBackToPractice();
            });
        }
    }

    /**
     * 手本表示画面をレンダリング
     * 要件2.1: 手本文字の静的表示機能
     */
    render() {
        if (this.currentCharacter && this.exampleCharacterElement) {
            // 手本文字を表示
            this.exampleCharacterElement.textContent = this.currentCharacter.character;
            
            // 表示アニメーション
            this.animateCharacterDisplay();
            
            console.log(`手本表示レンダリング: ${this.currentCharacter.character}`);
        }
    }

    /**
     * 手本文字の表示アニメーション
     */
    animateCharacterDisplay() {
        if (!this.exampleCharacterElement) return;
        
        // フェードイン効果
        this.exampleCharacterElement.style.opacity = '0';
        this.exampleCharacterElement.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            this.exampleCharacterElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            this.exampleCharacterElement.style.opacity = '1';
            this.exampleCharacterElement.style.transform = 'scale(1)';
        }, 50);
    }

    /**
     * 指定された文字の手本を表示
     * 要件2.1: 手本文字の静的表示機能
     * 要件2.2: 手本表示/非表示の切り替え
     * @param {string} character 表示する文字
     */
    showCharacterExample(character) {
        // アプリオブジェクトが無効な場合の処理
        if (!this.app || !this.app.getHiraganaDataService) {
            console.warn('アプリオブジェクトが無効です');
            return;
        }

        // 文字表示を更新
        if (character) {
            this.characterDisplay.showCharacter(character);
        } else {
            this.characterDisplay.refresh();
        }
        
        this.currentCharacter = this.characterDisplay.getCurrentCharacter();
        
        // 手本を表示状態に設定
        this.isVisible = true;
        
        // 画面をレンダリング
        this.render();
        
        console.log(`手本表示: ${this.currentCharacter ? this.currentCharacter.character : '不明'}`);
    }

    /**
     * 文字が変更された時の処理
     */
    onCharacterChanged(character) {
        this.currentCharacter = character;
        this.render();
        console.log(`手本文字変更: ${character.character} (難易度: ${character.difficulty})`);
    }

    /**
     * 手本表示を非表示にする
     * 要件2.2: 手本表示/非表示の切り替え
     */
    hideExample() {
        this.isVisible = false;
        
        if (this.exampleCharacterElement) {
            this.exampleCharacterElement.style.transition = 'opacity 0.2s ease';
            this.exampleCharacterElement.style.opacity = '0';
        }
        
        console.log('手本表示を非表示にしました');
    }

    /**
     * 練習画面に戻る
     * 要件2.3: 手本表示中に「練習する」ボタンが押される
     */
    onBackToPractice() {
        console.log('練習に戻る');
        
        // 手本を非表示状態に設定
        this.isVisible = false;
        
        // アプリに練習画面への遷移を要求
        this.app.backToPractice();
    }

    /**
     * 現在表示中の文字を取得
     * @returns {Object} 現在の文字オブジェクト
     */
    getCurrentCharacter() {
        return this.currentCharacter;
    }

    /**
     * 手本が表示されているかどうかを確認
     * @returns {boolean} 表示状態
     */
    isExampleVisible() {
        return this.isVisible;
    }

    /**
     * 手本表示の切り替え
     * 要件2.2: 手本表示/非表示の切り替え
     */
    toggleExample() {
        if (this.isVisible) {
            this.hideExample();
        } else {
            this.showCharacterExample();
        }
    }
}