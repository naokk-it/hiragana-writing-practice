// 練習画面コンポーネント
import { CharacterDisplayComponent } from './CharacterDisplayComponent.js';

export class PracticeViewComponent {
    constructor(app) {
        this.app = app;
        this.element = document.getElementById('practice-view');
        this.canvas = null;
        this.isDrawing = false;
        this.characterDisplay = new CharacterDisplayComponent(app);
    }

    init() {
        this.initCanvas();
        this.setupEventListeners();
        this.initCharacterDisplay();
        console.log('PracticeViewComponent初期化完了');
    }

    initCharacterDisplay() {
        // 文字表示コンポーネントを初期化（ナビゲーション付き）
        this.characterDisplay.init('practice-character-display', 'target-character', true);
        
        // 文字変更イベントをリッスン
        document.addEventListener('characterChanged', (event) => {
            this.onCharacterChanged(event.detail.character);
        });
    }

    initCanvas() {
        this.canvas = document.getElementById('drawing-canvas');
        if (this.canvas) {
            // DrawingServiceにcanvasを設定
            this.app.drawingService.initCanvas(this.canvas);
            console.log('Canvas初期化完了');
        }
    }

    setupEventListeners() {
        // 手本表示ボタン
        const showExampleBtn = document.getElementById('show-example-btn');
        if (showExampleBtn) {
            showExampleBtn.addEventListener('click', () => {
                this.onShowExample();
            });
        }

        // キャンバスクリアボタン
        const clearCanvasBtn = document.getElementById('clear-canvas-btn');
        if (clearCanvasBtn) {
            clearCanvasBtn.addEventListener('click', () => {
                this.clearCanvas();
            });
        }

        // 描画提出ボタン
        const submitDrawingBtn = document.getElementById('submit-drawing-btn');
        if (submitDrawingBtn) {
            submitDrawingBtn.addEventListener('click', () => {
                this.onSubmitDrawing();
            });
        }

        // 描画開始/終了のコールバック設定
        this.setupDrawingCallbacks();
    }

    setupDrawingCallbacks() {
        // DrawingServiceから描画イベントを受け取るためのコールバック設定
        // 将来的に描画状態の変化をUIに反映するために使用
        if (this.app.drawingService) {
            // 描画開始時のUI更新
            this.app.drawingService.onDrawingStart = () => {
                this.onDrawingStart();
            };
            
            // 描画終了時のUI更新
            this.app.drawingService.onDrawingEnd = () => {
                this.onDrawingEnd();
            };
        }
    }

    onDrawingStart() {
        // 描画開始時のUI状態更新
        console.log('描画開始 - UI更新');
        // 例: 提出ボタンを無効化
        const submitBtn = document.getElementById('submit-drawing-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
        }
    }

    onDrawingEnd() {
        // 描画終了時のUI状態更新
        console.log('描画終了 - UI更新');
        // 例: 提出ボタンを有効化
        const submitBtn = document.getElementById('submit-drawing-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }

    render() {
        if (!this.element) return;
        
        // 練習画面の基本構造を表示
        this.element.style.display = 'block';
        
        // キャンバスのサイズ調整
        this.adjustCanvasSize();
        
        console.log('PracticeViewComponent描画完了');
    }

    adjustCanvasSize() {
        if (!this.canvas) return;
        
        // レスポンシブ対応のためのキャンバスサイズ調整
        const container = this.canvas.parentElement;
        if (container) {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            // アスペクト比を維持しながらサイズ調整
            const size = Math.min(containerWidth, containerHeight) * 0.8;
            
            this.canvas.width = size;
            this.canvas.height = size;
            this.canvas.style.width = size + 'px';
            this.canvas.style.height = size + 'px';
            
            // DrawingServiceの描画設定を再適用
            if (this.app.drawingService && this.app.drawingService.ctx) {
                this.app.drawingService.ctx.strokeStyle = '#333';
                this.app.drawingService.ctx.lineWidth = 4;
                this.app.drawingService.ctx.lineCap = 'round';
                this.app.drawingService.ctx.lineJoin = 'round';
            }
        }
    }

    hide() {
        if (this.element) {
            this.element.style.display = 'none';
        }
    }

    startPractice(character) {
        // 文字表示を更新
        if (character) {
            this.characterDisplay.showCharacter(character);
        } else {
            this.characterDisplay.refresh();
        }
        
        // キャンバスをクリア
        this.clearCanvas();
        
        const currentChar = this.characterDisplay.getCurrentCharacter();
        console.log(`練習開始: ${currentChar ? currentChar.character : '不明'}`);
    }

    onCharacterChanged(character) {
        // 文字が変更された時の処理
        this.clearCanvas();
        console.log(`文字変更: ${character.character} (難易度: ${character.difficulty})`);
    }



    onShowExample() {
        console.log('手本表示');
        this.app.showExample();
    }

    onSubmitDrawing() {
        console.log('描画提出');
        this.app.submitDrawing();
    }

    clearCanvas() {
        if (this.app.drawingService) {
            this.app.drawingService.clearCanvas();
            console.log('キャンバスクリア');
        }
    }
}