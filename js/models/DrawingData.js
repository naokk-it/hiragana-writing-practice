/**
 * 描画データモデル
 * 手書き描画の筆跡データを管理するクラス
 */
export class DrawingData {
    constructor() {
        this.strokes = [];           // 筆跡データ
        this.timestamp = Date.now();
        this.boundingBox = null;     // 文字の境界
        this.metadata = {
            deviceType: this.detectDeviceType(),
            canvasSize: null,
            totalPoints: 0,
            totalStrokes: 0
        };
    }

    /**
     * デバイスタイプを検出
     * @returns {string} デバイスタイプ
     */
    detectDeviceType() {
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            return 'touch';
        }
        return 'mouse';
    }

    /**
     * ストロークを追加
     * @param {Array} points ポイント配列
     */
    addStroke(points) {
        if (!Array.isArray(points) || points.length === 0) {
            console.warn('無効なストロークデータ');
            return;
        }

        this.strokes.push([...points]);
        this.updateMetadata();
        console.log(`ストローク追加: ${points.length}ポイント`);
    }

    /**
     * メタデータを更新
     */
    updateMetadata() {
        this.metadata.totalStrokes = this.strokes.length;
        this.metadata.totalPoints = this.strokes.reduce((total, stroke) => total + stroke.length, 0);
        this.boundingBox = this.calculateBoundingBox();
    }

    /**
     * 境界ボックスを計算
     * @returns {Object|null} 境界ボックス
     */
    calculateBoundingBox() {
        if (this.strokes.length === 0) return null;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.strokes.forEach(stroke => {
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
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    /**
     * 描画データをクリア
     */
    clear() {
        this.strokes = [];
        this.boundingBox = null;
        this.metadata.totalPoints = 0;
        this.metadata.totalStrokes = 0;
        console.log('描画データクリア');
    }

    /**
     * 描画データが空かチェック
     * @returns {boolean} 空かどうか
     */
    isEmpty() {
        return this.strokes.length === 0;
    }

    /**
     * 描画の複雑さを計算
     * @returns {number} 複雑さスコア（0-1）
     */
    getComplexity() {
        if (this.isEmpty()) return 0;

        const strokeCount = this.strokes.length;
        const pointCount = this.metadata.totalPoints;
        const boundingArea = this.boundingBox ? 
            (this.boundingBox.width * this.boundingBox.height) : 0;

        // 複雑さの計算（正規化）
        const strokeComplexity = Math.min(strokeCount / 10, 1);
        const pointComplexity = Math.min(pointCount / 100, 1);
        const areaComplexity = Math.min(boundingArea / 10000, 1);

        return (strokeComplexity + pointComplexity + areaComplexity) / 3;
    }

    /**
     * 描画データをシリアライズ
     * @returns {Object} シリアライズされたデータ
     */
    toJSON() {
        return {
            strokes: this.strokes,
            timestamp: this.timestamp,
            boundingBox: this.boundingBox,
            metadata: this.metadata,
            complexity: this.getComplexity()
        };
    }

    /**
     * JSONデータから描画データを復元
     * @param {Object} data シリアライズされたデータ
     * @returns {DrawingData} 復元された描画データ
     */
    static fromJSON(data) {
        const drawingData = new DrawingData();
        drawingData.strokes = data.strokes || [];
        drawingData.timestamp = data.timestamp || Date.now();
        drawingData.boundingBox = data.boundingBox;
        drawingData.metadata = {
            ...drawingData.metadata,
            ...data.metadata
        };
        return drawingData;
    }

    /**
     * 描画データが有効かチェック
     * @returns {boolean} 有効な描画データかどうか
     */
    isValid() {
        return !!(Array.isArray(this.strokes) && 
                 this.timestamp && 
                 this.metadata &&
                 this.strokes.every(stroke => Array.isArray(stroke)));
    }

    /**
     * 描画データのサマリーを取得
     * @returns {Object} データサマリー
     */
    getSummary() {
        return {
            strokeCount: this.metadata.totalStrokes,
            pointCount: this.metadata.totalPoints,
            complexity: this.getComplexity(),
            boundingBox: this.boundingBox,
            deviceType: this.metadata.deviceType,
            timestamp: this.timestamp,
            isEmpty: this.isEmpty()
        };
    }
}