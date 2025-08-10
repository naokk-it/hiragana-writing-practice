import { DrawingData } from '../js/models/DrawingData.js';

describe('DrawingData', () => {
    let drawingData;

    beforeEach(() => {
        drawingData = new DrawingData();
    });

    describe('初期化', () => {
        test('正常に初期化される', () => {
            expect(drawingData.strokes).toEqual([]);
            expect(drawingData.timestamp).toBeDefined();
            expect(drawingData.boundingBox).toBeNull();
            expect(drawingData.metadata).toBeDefined();
            expect(drawingData.metadata.deviceType).toBeDefined();
            expect(drawingData.metadata.totalPoints).toBe(0);
            expect(drawingData.metadata.totalStrokes).toBe(0);
        });

        test('デバイスタイプが正しく検出される', () => {
            const deviceType = drawingData.detectDeviceType();
            expect(['touch', 'mouse']).toContain(deviceType);
        });

        test('初期状態で空と判定される', () => {
            expect(drawingData.isEmpty()).toBe(true);
        });

        test('初期状態で有効と判定される', () => {
            expect(drawingData.isValid()).toBe(true);
        });
    });

    describe('ストローク管理', () => {
        test('有効なストロークが追加される', () => {
            const stroke = [
                { x: 100, y: 100, timestamp: Date.now() },
                { x: 110, y: 105, timestamp: Date.now() + 10 },
                { x: 120, y: 110, timestamp: Date.now() + 20 }
            ];

            drawingData.addStroke(stroke);

            expect(drawingData.strokes).toHaveLength(1);
            expect(drawingData.strokes[0]).toEqual(stroke);
            expect(drawingData.metadata.totalStrokes).toBe(1);
            expect(drawingData.metadata.totalPoints).toBe(3);
            expect(drawingData.isEmpty()).toBe(false);
        });

        test('複数のストロークが追加される', () => {
            const stroke1 = [{ x: 100, y: 100, timestamp: Date.now() }];
            const stroke2 = [{ x: 200, y: 200, timestamp: Date.now() }];

            drawingData.addStroke(stroke1);
            drawingData.addStroke(stroke2);

            expect(drawingData.strokes).toHaveLength(2);
            expect(drawingData.metadata.totalStrokes).toBe(2);
            expect(drawingData.metadata.totalPoints).toBe(2);
        });

        test('空のストロークは追加されない', () => {
            drawingData.addStroke([]);

            expect(drawingData.strokes).toHaveLength(0);
            expect(drawingData.metadata.totalStrokes).toBe(0);
        });

        test('無効なストロークは追加されない', () => {
            drawingData.addStroke(null);
            drawingData.addStroke(undefined);
            drawingData.addStroke('invalid');

            expect(drawingData.strokes).toHaveLength(0);
            expect(drawingData.metadata.totalStrokes).toBe(0);
        });
    });

    describe('境界ボックス計算', () => {
        test('単一ストロークの境界ボックスが正しく計算される', () => {
            const stroke = [
                { x: 100, y: 150, timestamp: Date.now() },
                { x: 200, y: 100, timestamp: Date.now() },
                { x: 150, y: 200, timestamp: Date.now() }
            ];

            drawingData.addStroke(stroke);

            const boundingBox = drawingData.calculateBoundingBox();
            expect(boundingBox).toBeDefined();
            expect(boundingBox.x).toBe(100);
            expect(boundingBox.y).toBe(100);
            expect(boundingBox.width).toBe(100); // 200 - 100
            expect(boundingBox.height).toBe(100); // 200 - 100
            expect(boundingBox.centerX).toBe(150);
            expect(boundingBox.centerY).toBe(150);
        });

        test('複数ストロークの境界ボックスが正しく計算される', () => {
            const stroke1 = [{ x: 50, y: 50, timestamp: Date.now() }];
            const stroke2 = [{ x: 250, y: 250, timestamp: Date.now() }];

            drawingData.addStroke(stroke1);
            drawingData.addStroke(stroke2);

            const boundingBox = drawingData.calculateBoundingBox();
            expect(boundingBox.x).toBe(50);
            expect(boundingBox.y).toBe(50);
            expect(boundingBox.width).toBe(200); // 250 - 50
            expect(boundingBox.height).toBe(200); // 250 - 50
        });

        test('ストロークがない場合はnullが返される', () => {
            const boundingBox = drawingData.calculateBoundingBox();
            expect(boundingBox).toBeNull();
        });

        test('単一ポイントの境界ボックス', () => {
            const stroke = [{ x: 100, y: 100, timestamp: Date.now() }];
            drawingData.addStroke(stroke);

            const boundingBox = drawingData.calculateBoundingBox();
            expect(boundingBox.width).toBe(0);
            expect(boundingBox.height).toBe(0);
            expect(boundingBox.centerX).toBe(100);
            expect(boundingBox.centerY).toBe(100);
        });
    });

    describe('複雑さ計算', () => {
        test('空の描画の複雑さは0', () => {
            expect(drawingData.getComplexity()).toBe(0);
        });

        test('単純な描画の複雑さが計算される', () => {
            const stroke = [{ x: 100, y: 100, timestamp: Date.now() }];
            drawingData.addStroke(stroke);

            const complexity = drawingData.getComplexity();
            expect(complexity).toBeGreaterThan(0);
            expect(complexity).toBeLessThanOrEqual(1);
        });

        test('複雑な描画の複雑さが高くなる', () => {
            // 複数のストロークと多くのポイントを追加
            for (let i = 0; i < 5; i++) {
                const stroke = [];
                for (let j = 0; j < 20; j++) {
                    stroke.push({ x: i * 50 + j * 2, y: i * 50 + j * 2, timestamp: Date.now() });
                }
                drawingData.addStroke(stroke);
            }

            const complexity = drawingData.getComplexity();
            expect(complexity).toBeGreaterThan(0.3); // より複雑
        });

        test('複雑さは1を超えない', () => {
            // 非常に複雑な描画を作成
            for (let i = 0; i < 20; i++) {
                const stroke = [];
                for (let j = 0; j < 100; j++) {
                    stroke.push({ x: j, y: i, timestamp: Date.now() });
                }
                drawingData.addStroke(stroke);
            }

            const complexity = drawingData.getComplexity();
            expect(complexity).toBeLessThanOrEqual(1);
        });
    });

    describe('データクリア', () => {
        test('データが正しくクリアされる', () => {
            // データを追加
            const stroke = [{ x: 100, y: 100, timestamp: Date.now() }];
            drawingData.addStroke(stroke);

            expect(drawingData.isEmpty()).toBe(false);

            // クリア
            drawingData.clear();

            expect(drawingData.strokes).toEqual([]);
            expect(drawingData.boundingBox).toBeNull();
            expect(drawingData.metadata.totalPoints).toBe(0);
            expect(drawingData.metadata.totalStrokes).toBe(0);
            expect(drawingData.isEmpty()).toBe(true);
        });
    });

    describe('シリアライゼーション', () => {
        test('描画データが正しくJSONに変換される', () => {
            const stroke = [
                { x: 100, y: 100, timestamp: Date.now() },
                { x: 110, y: 110, timestamp: Date.now() + 10 }
            ];
            drawingData.addStroke(stroke);

            const json = drawingData.toJSON();

            expect(json.strokes).toEqual(drawingData.strokes);
            expect(json.timestamp).toBe(drawingData.timestamp);
            expect(json.boundingBox).toEqual(drawingData.boundingBox);
            expect(json.metadata).toEqual(drawingData.metadata);
            expect(json.complexity).toBeDefined();
        });

        test('JSONから描画データが正しく復元される', () => {
            // 元のデータを準備
            const stroke = [{ x: 100, y: 100, timestamp: Date.now() }];
            drawingData.addStroke(stroke);
            const originalTimestamp = drawingData.timestamp;

            // JSON化
            const json = drawingData.toJSON();

            // 復元
            const restoredData = DrawingData.fromJSON(json);

            expect(restoredData.strokes).toEqual(drawingData.strokes);
            expect(restoredData.timestamp).toBe(originalTimestamp);
            expect(restoredData.boundingBox).toEqual(drawingData.boundingBox);
            expect(restoredData.metadata.totalStrokes).toBe(1);
            expect(restoredData.metadata.totalPoints).toBe(1);
        });

        test('不完全なJSONデータからの復元', () => {
            const incompleteJson = {
                strokes: [[{ x: 100, y: 100 }]],
                timestamp: Date.now()
                // boundingBox, metadataが欠如
            };

            const restoredData = DrawingData.fromJSON(incompleteJson);

            expect(restoredData.strokes).toEqual(incompleteJson.strokes);
            expect(restoredData.timestamp).toBe(incompleteJson.timestamp);
            expect(restoredData.metadata).toBeDefined();
            expect(restoredData.metadata.deviceType).toBeDefined();
        });
    });

    describe('サマリー情報', () => {
        test('描画データのサマリーが正しく生成される', () => {
            const stroke1 = [{ x: 100, y: 100, timestamp: Date.now() }];
            const stroke2 = [
                { x: 200, y: 200, timestamp: Date.now() },
                { x: 210, y: 210, timestamp: Date.now() }
            ];

            drawingData.addStroke(stroke1);
            drawingData.addStroke(stroke2);

            const summary = drawingData.getSummary();

            expect(summary.strokeCount).toBe(2);
            expect(summary.pointCount).toBe(3);
            expect(summary.complexity).toBeGreaterThan(0);
            expect(summary.boundingBox).toBeDefined();
            expect(summary.deviceType).toBeDefined();
            expect(summary.timestamp).toBe(drawingData.timestamp);
            expect(summary.isEmpty).toBe(false);
        });

        test('空の描画データのサマリー', () => {
            const summary = drawingData.getSummary();

            expect(summary.strokeCount).toBe(0);
            expect(summary.pointCount).toBe(0);
            expect(summary.complexity).toBe(0);
            expect(summary.boundingBox).toBeNull();
            expect(summary.isEmpty).toBe(true);
        });
    });

    describe('バリデーション', () => {
        test('有効な描画データが正しく判定される', () => {
            expect(drawingData.isValid()).toBe(true);
        });

        test('ストローク配列がない場合は無効と判定される', () => {
            drawingData.strokes = null;
            expect(drawingData.isValid()).toBe(false);
        });

        test('タイムスタンプがない場合は無効と判定される', () => {
            drawingData.timestamp = null;
            expect(drawingData.isValid()).toBe(false);
        });

        test('メタデータがない場合は無効と判定される', () => {
            drawingData.metadata = null;
            expect(drawingData.isValid()).toBe(false);
        });

        test('無効なストロークが含まれる場合は無効と判定される', () => {
            drawingData.strokes = [
                [{ x: 100, y: 100 }], // 有効
                'invalid stroke',     // 無効
                [{ x: 200, y: 200 }]  // 有効
            ];
            expect(drawingData.isValid()).toBe(false);
        });
    });

    describe('エッジケース', () => {
        test('負の座標値の処理', () => {
            const stroke = [
                { x: -100, y: -50, timestamp: Date.now() },
                { x: 100, y: 50, timestamp: Date.now() }
            ];

            drawingData.addStroke(stroke);

            const boundingBox = drawingData.calculateBoundingBox();
            expect(boundingBox.x).toBe(-100);
            expect(boundingBox.y).toBe(-50);
            expect(boundingBox.width).toBe(200);
            expect(boundingBox.height).toBe(100);
        });

        test('非常に大きな座標値の処理', () => {
            const stroke = [
                { x: 0, y: 0, timestamp: Date.now() },
                { x: 999999, y: 999999, timestamp: Date.now() }
            ];

            drawingData.addStroke(stroke);

            const boundingBox = drawingData.calculateBoundingBox();
            expect(boundingBox.width).toBe(999999);
            expect(boundingBox.height).toBe(999999);
        });

        test('小数点座標値の処理', () => {
            const stroke = [
                { x: 100.5, y: 200.7, timestamp: Date.now() },
                { x: 150.3, y: 250.1, timestamp: Date.now() }
            ];

            drawingData.addStroke(stroke);

            const boundingBox = drawingData.calculateBoundingBox();
            expect(boundingBox.x).toBeCloseTo(100.5);
            expect(boundingBox.y).toBeCloseTo(200.7);
            expect(boundingBox.width).toBeCloseTo(49.8);
            expect(boundingBox.height).toBeCloseTo(49.4);
        });

        test('同じ座標の複数ポイント', () => {
            const stroke = [
                { x: 100, y: 100, timestamp: Date.now() },
                { x: 100, y: 100, timestamp: Date.now() + 10 },
                { x: 100, y: 100, timestamp: Date.now() + 20 }
            ];

            drawingData.addStroke(stroke);

            const boundingBox = drawingData.calculateBoundingBox();
            expect(boundingBox.width).toBe(0);
            expect(boundingBox.height).toBe(0);
            expect(drawingData.metadata.totalPoints).toBe(3);
        });
    });
});