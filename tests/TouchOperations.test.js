// タッチ操作のシミュレーションテスト
import { DrawingService } from '../js/services/DrawingService.js';

describe('TouchOperations', () => {
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
        drawingService.initCanvas(mockCanvas);
    });

    // タッチイベントのシミュレーション用ヘルパー関数
    function createTouchEvent(type, touches) {
        return {
            type: type,
            touches: touches,
            preventDefault: jest.fn()
        };
    }

    function createTouch(clientX, clientY) {
        return {
            clientX: clientX,
            clientY: clientY
        };
    }

    describe('タッチイベントシミュレーション', () => {
        test('単一タッチでの描画操作', () => {
            const startCallback = jest.fn();
            const endCallback = jest.fn();
            drawingService.onDrawingStart = startCallback;
            drawingService.onDrawingEnd = endCallback;

            // タッチ開始
            const touchStart = createTouchEvent('touchstart', [createTouch(100, 150)]);
            const coords1 = drawingService.normalizeCoordinates(touchStart.touches[0]);
            drawingService.startDrawing(coords1.x, coords1.y);

            expect(startCallback).toHaveBeenCalled();
            expect(drawingService.isDrawing).toBe(true);

            // タッチ移動
            const touchMove = createTouchEvent('touchmove', [createTouch(110, 160)]);
            const coords2 = drawingService.normalizeCoordinates(touchMove.touches[0]);
            drawingService.addPoint(coords2.x, coords2.y);

            expect(drawingService.currentStroke).toHaveLength(2);

            // タッチ終了
            drawingService.endDrawing();

            expect(endCallback).toHaveBeenCalled();
            expect(drawingService.isDrawing).toBe(false);
            expect(drawingService.drawingData.strokes).toHaveLength(1);
        });

        test('複数タッチポイントでの最初のタッチのみ処理', () => {
            // 複数のタッチポイントがある場合、最初のもののみを使用
            const touchStart = createTouchEvent('touchstart', [
                createTouch(100, 150),
                createTouch(200, 250) // 2番目のタッチは無視される
            ]);

            const coords = drawingService.normalizeCoordinates(touchStart.touches[0]);
            drawingService.startDrawing(coords.x, coords.y);

            expect(drawingService.currentStroke[0]).toEqual({
                x: 100,
                y: 150,
                timestamp: expect.any(Number)
            });
        });

        test('タッチ座標の正規化', () => {
            // キャンバスが画面上でオフセットされている場合
            mockCanvas.getBoundingClientRect.mockReturnValue({
                left: 50,
                top: 100,
                width: 400,
                height: 400
            });

            const touch = createTouch(150, 250); // 画面座標
            const coords = drawingService.normalizeCoordinates(touch);

            // オフセットが考慮されてキャンバス座標に変換される
            expect(coords.x).toBe(100); // 150 - 50
            expect(coords.y).toBe(150); // 250 - 100
        });

        test('タッチ操作での連続した線の描画', () => {
            const touchPoints = [
                { x: 100, y: 100 },
                { x: 110, y: 110 },
                { x: 120, y: 120 },
                { x: 130, y: 130 },
                { x: 140, y: 140 }
            ];

            // タッチ開始
            drawingService.startDrawing(touchPoints[0].x, touchPoints[0].y);

            // 連続したタッチ移動
            for (let i = 1; i < touchPoints.length; i++) {
                drawingService.addPoint(touchPoints[i].x, touchPoints[i].y);
            }

            // タッチ終了
            drawingService.endDrawing();

            expect(drawingService.drawingData.strokes).toHaveLength(1);
            expect(drawingService.drawingData.strokes[0]).toHaveLength(touchPoints.length);

            // 各ポイントが正しく記録されているか確認
            touchPoints.forEach((point, index) => {
                expect(drawingService.drawingData.strokes[0][index].x).toBe(point.x);
                expect(drawingService.drawingData.strokes[0][index].y).toBe(point.y);
            });
        });

        test('タッチキャンセル時の処理', () => {
            drawingService.startDrawing(100, 150);
            drawingService.addPoint(110, 160);

            expect(drawingService.isDrawing).toBe(true);

            // タッチキャンセル（例：電話着信など）
            drawingService.endDrawing();

            expect(drawingService.isDrawing).toBe(false);
            expect(drawingService.drawingData.strokes).toHaveLength(1);
        });
    });

    describe('マルチタッチ対応', () => {
        test('複数の指でのタッチ時は最初の指のみ処理', () => {
            const multiTouch = createTouchEvent('touchstart', [
                createTouch(100, 150),
                createTouch(200, 250),
                createTouch(300, 350)
            ]);

            // 最初のタッチのみ処理される
            const coords = drawingService.normalizeCoordinates(multiTouch.touches[0]);
            drawingService.startDrawing(coords.x, coords.y);

            expect(drawingService.currentStroke).toHaveLength(1);
            expect(drawingService.currentStroke[0].x).toBe(100);
            expect(drawingService.currentStroke[0].y).toBe(150);
        });

        test('タッチ移動中に指の数が変わっても継続', () => {
            // 1本指で開始
            drawingService.startDrawing(100, 150);

            // 移動中に2本指になる（最初の指の座標のみ使用）
            const multiTouchMove = createTouchEvent('touchmove', [
                createTouch(110, 160),
                createTouch(210, 260)
            ]);

            const coords = drawingService.normalizeCoordinates(multiTouchMove.touches[0]);
            drawingService.addPoint(coords.x, coords.y);

            expect(drawingService.currentStroke).toHaveLength(2);
            expect(drawingService.currentStroke[1].x).toBe(110);
            expect(drawingService.currentStroke[1].y).toBe(160);
        });
    });

    describe('タッチ精度テスト', () => {
        test('高速タッチ移動での点の記録', () => {
            drawingService.startDrawing(0, 0);

            // 高速で多くの点を追加
            const numPoints = 100;
            for (let i = 1; i <= numPoints; i++) {
                drawingService.addPoint(i, i);
            }

            drawingService.endDrawing();

            expect(drawingService.drawingData.strokes[0]).toHaveLength(numPoints + 1); // 開始点 + 移動点
        });

        test('微小な移動でも点が記録される', () => {
            drawingService.startDrawing(100, 100);

            // 0.1ピクセル単位の微小移動
            drawingService.addPoint(100.1, 100.1);
            drawingService.addPoint(100.2, 100.2);

            drawingService.endDrawing();

            expect(drawingService.drawingData.strokes[0]).toHaveLength(3);
            expect(drawingService.drawingData.strokes[0][1].x).toBe(100.1);
            expect(drawingService.drawingData.strokes[0][2].x).toBe(100.2);
        });
    });

    describe('パフォーマンステスト', () => {
        test('大量のタッチポイント処理', () => {
            const startTime = performance.now();

            drawingService.startDrawing(0, 0);

            // 1000個のポイントを追加
            for (let i = 1; i <= 1000; i++) {
                drawingService.addPoint(i % 400, (i * 2) % 400);
            }

            drawingService.endDrawing();

            const endTime = performance.now();
            const processingTime = endTime - startTime;

            // 処理時間が合理的な範囲内であることを確認（100ms以下）
            expect(processingTime).toBeLessThan(100);
            expect(drawingService.drawingData.strokes[0]).toHaveLength(1001);
        });
    });
});