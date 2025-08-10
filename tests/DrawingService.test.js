// DrawingServiceの単体テスト
import { DrawingService } from '../js/services/DrawingService.js';

describe('DrawingService', () => {
    let drawingService;
    let mockCanvas;
    let mockContext;

    beforeEach(() => {
        // モックCanvas要素の作成
        mockContext = {
            strokeStyle: '',
            lineWidth: 0,
            lineCap: '',
            lineJoin: '',
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            stroke: jest.fn(),
            clearRect: jest.fn(),
            getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) }))
        };

        mockCanvas = {
            getContext: jest.fn(() => mockContext),
            width: 400,
            height: 400,
            getBoundingClientRect: jest.fn(() => ({
                left: 0,
                top: 0,
                width: 400,
                height: 400
            })),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };

        drawingService = new DrawingService();
    });

    describe('initCanvas', () => {
        test('キャンバスの初期化が正しく行われる', () => {
            drawingService.initCanvas(mockCanvas);

            expect(drawingService.canvas).toBe(mockCanvas);
            expect(drawingService.ctx).toBe(mockContext);
            expect(mockContext.strokeStyle).toBe('#333');
            expect(mockContext.lineWidth).toBe(4);
            expect(mockContext.lineCap).toBe('round');
            expect(mockContext.lineJoin).toBe('round');
        });

        test('イベントリスナーが設定される', () => {
            drawingService.initCanvas(mockCanvas);

            // マウスイベントとタッチイベントのリスナーが設定されることを確認
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function));
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function));
        });
    });

    describe('座標正規化', () => {
        beforeEach(() => {
            drawingService.initCanvas(mockCanvas);
        });

        test('マウス座標が正しく正規化される', () => {
            const mockEvent = {
                clientX: 100,
                clientY: 150
            };

            const coords = drawingService.normalizeCoordinates(mockEvent);

            expect(coords.x).toBe(100);
            expect(coords.y).toBe(150);
        });

        test('キャンバスのスケールが考慮される', () => {
            // キャンバスが実際のサイズより小さく表示されている場合
            mockCanvas.getBoundingClientRect.mockReturnValue({
                left: 0,
                top: 0,
                width: 200, // 実際のキャンバスサイズの半分
                height: 200
            });

            const mockEvent = {
                clientX: 100,
                clientY: 100
            };

            const coords = drawingService.normalizeCoordinates(mockEvent);

            // スケール補正により座標が2倍になる
            expect(coords.x).toBe(200);
            expect(coords.y).toBe(200);
        });
    });

    describe('描画データの記録', () => {
        beforeEach(() => {
            drawingService.initCanvas(mockCanvas);
        });

        test('描画開始時にストロークが開始される', () => {
            drawingService.startDrawing(100, 150);

            expect(drawingService.isDrawing).toBe(true);
            expect(drawingService.currentStroke).toHaveLength(1);
            expect(drawingService.currentStroke[0]).toEqual({
                x: 100,
                y: 150,
                timestamp: expect.any(Number)
            });
            expect(mockContext.beginPath).toHaveBeenCalled();
            expect(mockContext.moveTo).toHaveBeenCalledWith(100, 150);
        });

        test('描画中にポイントが追加される', () => {
            drawingService.startDrawing(100, 150);
            drawingService.addPoint(110, 160);
            drawingService.addPoint(120, 170);

            expect(drawingService.currentStroke).toHaveLength(3);
            expect(mockContext.lineTo).toHaveBeenCalledWith(110, 160);
            expect(mockContext.lineTo).toHaveBeenCalledWith(120, 170);
            expect(mockContext.stroke).toHaveBeenCalledTimes(2);
        });

        test('描画終了時にストロークが保存される', () => {
            drawingService.startDrawing(100, 150);
            drawingService.addPoint(110, 160);
            drawingService.endDrawing();

            expect(drawingService.isDrawing).toBe(false);
            expect(drawingService.drawingData.strokes).toHaveLength(1);
            expect(drawingService.drawingData.strokes[0]).toHaveLength(2);
            expect(drawingService.drawingData.timestamp).toBeDefined();
        });

        test('複数のストロークが記録される', () => {
            // 最初のストローク
            drawingService.startDrawing(100, 150);
            drawingService.addPoint(110, 160);
            drawingService.endDrawing();

            // 2番目のストローク
            drawingService.startDrawing(200, 250);
            drawingService.addPoint(210, 260);
            drawingService.endDrawing();

            expect(drawingService.drawingData.strokes).toHaveLength(2);
        });
    });

    describe('境界ボックス計算', () => {
        beforeEach(() => {
            drawingService.initCanvas(mockCanvas);
        });

        test('空の描画データでは境界ボックスがnull', () => {
            const boundingBox = drawingService.calculateBoundingBox();
            expect(boundingBox).toBeNull();
        });

        test('単一ストロークの境界ボックスが正しく計算される', () => {
            drawingService.startDrawing(100, 150);
            drawingService.addPoint(200, 250);
            drawingService.endDrawing();

            const boundingBox = drawingService.calculateBoundingBox();

            expect(boundingBox).toEqual({
                x: 100,
                y: 150,
                width: 100,
                height: 100
            });
        });

        test('複数ストロークの境界ボックスが正しく計算される', () => {
            // 最初のストローク
            drawingService.startDrawing(100, 150);
            drawingService.addPoint(150, 200);
            drawingService.endDrawing();

            // 2番目のストローク
            drawingService.startDrawing(50, 100);
            drawingService.addPoint(250, 300);
            drawingService.endDrawing();

            const boundingBox = drawingService.calculateBoundingBox();

            expect(boundingBox).toEqual({
                x: 50,
                y: 100,
                width: 200,
                height: 200
            });
        });
    });

    describe('キャンバスクリア', () => {
        beforeEach(() => {
            drawingService.initCanvas(mockCanvas);
        });

        test('キャンバスと描画データがクリアされる', () => {
            // 描画データを作成
            drawingService.startDrawing(100, 150);
            drawingService.addPoint(110, 160);
            drawingService.endDrawing();

            // クリア実行
            drawingService.clearCanvas();

            expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 400, 400);
            expect(drawingService.drawingData.strokes).toHaveLength(0);
            expect(drawingService.drawingData.timestamp).toBeNull();
            expect(drawingService.drawingData.boundingBox).toBeNull();
            expect(drawingService.currentStroke).toHaveLength(0);
            expect(drawingService.isDrawing).toBe(false);
        });
    });

    describe('描画データ取得', () => {
        beforeEach(() => {
            drawingService.initCanvas(mockCanvas);
        });

        test('描画データが正しい形式で返される', () => {
            drawingService.startDrawing(100, 150);
            drawingService.addPoint(110, 160);
            drawingService.endDrawing();

            const drawingData = drawingService.getDrawingData();

            expect(drawingData).toHaveProperty('strokes');
            expect(drawingData).toHaveProperty('timestamp');
            expect(drawingData).toHaveProperty('boundingBox');
            expect(drawingData.strokes).toHaveLength(1);
            expect(drawingData.timestamp).toBeDefined();
            expect(drawingData.boundingBox).toBeDefined();
        });

        test('描画データのコピーが返される（参照ではない）', () => {
            drawingService.startDrawing(100, 150);
            drawingService.endDrawing();

            const drawingData1 = drawingService.getDrawingData();
            const drawingData2 = drawingService.getDrawingData();

            expect(drawingData1).not.toBe(drawingData2);
            expect(drawingData1.strokes).not.toBe(drawingData2.strokes);
        });
    });

    describe('コールバック機能', () => {
        beforeEach(() => {
            drawingService.initCanvas(mockCanvas);
        });

        test('描画開始時にコールバックが呼ばれる', () => {
            const startCallback = jest.fn();
            drawingService.onDrawingStart = startCallback;

            drawingService.startDrawing(100, 150);

            expect(startCallback).toHaveBeenCalled();
        });

        test('描画終了時にコールバックが呼ばれる', () => {
            const endCallback = jest.fn();
            drawingService.onDrawingEnd = endCallback;

            drawingService.startDrawing(100, 150);
            drawingService.endDrawing();

            expect(endCallback).toHaveBeenCalled();
        });
    });
});