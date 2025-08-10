// 描画サービス
export class DrawingService {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.currentStroke = [];
        this.drawingData = {
            strokes: [],
            timestamp: null,
            boundingBox: null
        };
        this.isDrawing = false;
        
        // コールバック関数
        this.onDrawingStart = null;
        this.onDrawingEnd = null;
    }

    initCanvas(canvasElement) {
        try {
            if (!canvasElement) {
                throw new Error('Canvas要素が提供されていません');
            }
            
            this.canvas = canvasElement;
            this.ctx = this.canvas.getContext('2d');
            
            if (!this.ctx) {
                throw new Error('Canvas 2Dコンテキストの取得に失敗しました');
            }
            
            // 描画設定
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            // イベントリスナー設定
            this.setupEventListeners();
            
            console.log('DrawingService: Canvas初期化完了');
            return true;
            
        } catch (error) {
            console.error('DrawingService: Canvas初期化エラー:', error);
            this.handleInitError(error);
            return false;
        }
    }

    setupEventListeners() {
        if (!this.canvas) return;

        // マウスイベント
        this.canvas.addEventListener('mousedown', (e) => {
            const coords = this.normalizeCoordinates(e);
            this.startDrawing(coords.x, coords.y);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDrawing) {
                const coords = this.normalizeCoordinates(e);
                this.addPoint(coords.x, coords.y);
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.endDrawing();
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.endDrawing();
        });

        // タッチイベント
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const coords = this.normalizeCoordinates(touch);
            this.startDrawing(coords.x, coords.y);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.isDrawing && e.touches.length > 0) {
                const touch = e.touches[0];
                const coords = this.normalizeCoordinates(touch);
                this.addPoint(coords.x, coords.y);
            }
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.endDrawing();
        });

        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.endDrawing();
        });
    }

    normalizeCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }

    startDrawing(x, y) {
        if (!this.ctx) return;
        
        this.isDrawing = true;
        this.currentStroke = [{ x, y, timestamp: Date.now() }];
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        
        // コールバック実行
        if (this.onDrawingStart) {
            this.onDrawingStart();
        }
        
        console.log(`描画開始: (${x}, ${y})`);
    }

    addPoint(x, y) {
        if (!this.ctx || !this.isDrawing) return;
        
        this.currentStroke.push({ x, y, timestamp: Date.now() });
        
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    endDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        if (this.currentStroke.length > 0) {
            this.drawingData.strokes.push([...this.currentStroke]);
            this.currentStroke = [];
            
            if (!this.drawingData.timestamp) {
                this.drawingData.timestamp = Date.now();
            }
            
            // コールバック実行
            if (this.onDrawingEnd) {
                this.onDrawingEnd();
            }
            
            console.log(`描画終了: ストローク数 ${this.drawingData.strokes.length}`);
        }
    }

    getDrawingData() {
        return {
            strokes: [...this.drawingData.strokes],
            timestamp: this.drawingData.timestamp,
            boundingBox: this.calculateBoundingBox()
        };
    }

    calculateBoundingBox() {
        if (this.drawingData.strokes.length === 0) return null;
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        this.drawingData.strokes.forEach(stroke => {
            stroke.forEach(point => {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            });
        });
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    clearCanvas() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawingData = {
            strokes: [],
            timestamp: null,
            boundingBox: null
        };
        this.currentStroke = [];
        this.isDrawing = false;
        
        console.log('キャンバスクリア完了');
    }

    getImageData() {
        if (!this.canvas) return null;
        
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    removeEventListeners() {
        if (!this.canvas) return;

        // すべてのイベントリスナーを削除
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchCancel);
    }

    // エラーハンドリング
    handleInitError(error) {
        console.error('DrawingService初期化エラー:', error);
        
        // フォールバック処理
        this.setupFallbackMode();
        
        // エラーイベントを発火
        if (this.onError) {
            this.onError({
                type: 'init',
                message: error.message,
                service: 'DrawingService'
            });
        }
    }

    setupFallbackMode() {
        console.log('DrawingService: フォールバックモード有効化');
        
        // 基本的な描画データ構造を維持
        this.drawingData = {
            strokes: [],
            timestamp: Date.now(),
            boundingBox: { x: 0, y: 0, width: 100, height: 100 }
        };
        
        // ダミーの描画機能を提供
        this.isDrawing = false;
        this.fallbackMode = true;
    }

    handleDrawingError(error, operation) {
        console.error(`DrawingService ${operation}エラー:`, error);
        
        // 描画状態をリセット
        this.isDrawing = false;
        this.currentStroke = [];
        
        // エラーイベントを発火
        if (this.onError) {
            this.onError({
                type: 'drawing',
                message: error.message,
                operation: operation,
                service: 'DrawingService'
            });
        }
        
        return false;
    }

    // 安全な描画操作
    safeDrawOperation(operation, ...args) {
        try {
            if (this.fallbackMode) {
                console.log('フォールバックモード: 描画操作をスキップ');
                return true;
            }
            
            if (!this.ctx) {
                throw new Error('Canvas contextが利用できません');
            }
            
            return operation.apply(this, args);
            
        } catch (error) {
            return this.handleDrawingError(error, operation.name);
        }
    }

    // 状態検証
    validateState() {
        const issues = [];
        
        if (!this.canvas) {
            issues.push('Canvas要素が設定されていません');
        }
        
        if (!this.ctx) {
            issues.push('Canvas contextが利用できません');
        }
        
        if (this.drawingData.strokes.length > 1000) {
            issues.push('描画データが大きすぎます');
        }
        
        return {
            valid: issues.length === 0,
            issues: issues
        };
    }
}