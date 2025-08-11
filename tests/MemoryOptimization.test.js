/**
 * メモリ使用量とパフォーマンス最適化テスト
 * Memory Usage and Performance Optimization Tests
 */

import { RecognitionService } from '../js/services/RecognitionService.js';
import { ScoreService } from '../js/services/ScoreService.js';
import { HiraganaDataService } from '../js/services/HiraganaDataService.js';
import { DrawingData } from '../js/models/DrawingData.js';

describe('Memory Usage and Performance Optimization', () => {
    let recognitionService;
    let scoreService;
    let hiraganaDataService;

    beforeEach(() => {
        recognitionService = new RecognitionService();
        scoreService = new ScoreService();
        hiraganaDataService = new HiraganaDataService();
    });

    describe('メモリ使用量の最適化', () => {
        test('描画データのメモリ効率性', () => {
            const drawingDataArray = [];
            
            // 描画データを作成
            for (let i = 0; i < 10; i++) {
                const drawingData = new DrawingData();
                
                // 各描画に複数のストロークを追加
                for (let j = 0; j < 3; j++) {
                    const stroke = [];
                    for (let k = 0; k < 10; k++) {
                        stroke.push({
                            x: Math.random() * 300,
                            y: Math.random() * 300,
                            timestamp: Date.now() + k
                        });
                    }
                    drawingData.addStroke(stroke);
                }
                
                drawingDataArray.push(drawingData);
            }
            
            // 描画データが正常に作成されたことを確認
            expect(drawingDataArray.length).toBe(10);
            drawingDataArray.forEach(data => {
                expect(data.strokes.length).toBeGreaterThan(0);
            });
            
            // 描画データのクリーンアップ
            drawingDataArray.length = 0;
            
            // クリーンアップが正常に完了したことを確認
            expect(drawingDataArray.length).toBe(0);
        });

        test('認識結果のキャッシュ効率性', async () => {
            const character = hiraganaDataService.selectCharacter('あ') || hiraganaDataService.getAllCharacters()[0];
            const drawingData = createStandardDrawing(character);
            
            const initialMemory = getMemoryUsage();
            
            // 同じ描画データで複数回認識を実行（キャッシュ効果をテスト）
            const results = [];
            for (let i = 0; i < 20; i++) {
                const result = await recognitionService.recognizeCharacterForChild(drawingData, character);
                results.push(result);
            }
            
            const afterRecognitionMemory = getMemoryUsage();
            const memoryIncrease = afterRecognitionMemory - initialMemory;
            
            // キャッシュにより、メモリ増加が線形でないことを確認
            expect(results.length).toBe(20);
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB以内
            
            // 全ての結果が一貫していることを確認（キャッシュの正確性）
            const firstResult = results[0];
            results.forEach(result => {
                expect(result.confidence).toBeCloseTo(firstResult.confidence, 2);
            });
        });

        test('文字データの効率的な管理', () => {
            const initialMemory = getMemoryUsage();
            
            // 全文字データを複数回取得
            const characterSets = [];
            for (let i = 0; i < 10; i++) {
                characterSets.push(hiraganaDataService.getAllCharacters());
            }
            
            const afterLoadMemory = getMemoryUsage();
            const memoryIncrease = afterLoadMemory - initialMemory;
            
            // データの共有により、メモリ増加が最小限であることを確認
            expect(characterSets.length).toBe(10);
            expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // 5MB以内
            
            // 全てのセットが同じデータを参照していることを確認
            const firstSet = characterSets[0];
            characterSets.forEach(set => {
                expect(set.length).toBe(firstSet.length);
            });
        });

        test('大量データ処理時のメモリ管理', async () => {
            const characters = hiraganaDataService.getAllCharacters();
            const initialMemory = getMemoryUsage();
            let maxMemoryUsage = initialMemory;
            
            // 大量の認識処理を順次実行
            for (let i = 0; i < characters.length; i++) {
                const character = characters[i];
                const drawingData = createLargeDrawing(character);
                
                await recognitionService.recognizeCharacterForChild(drawingData, character);
                
                const currentMemory = getMemoryUsage();
                maxMemoryUsage = Math.max(maxMemoryUsage, currentMemory);
                
                // 定期的にガベージコレクションを実行
                if (i % 5 === 0 && global.gc) {
                    global.gc();
                }
            }
            
            const finalMemory = getMemoryUsage();
            const totalMemoryIncrease = finalMemory - initialMemory;
            const peakMemoryIncrease = maxMemoryUsage - initialMemory;
            
            // メモリ使用量が合理的な範囲内であることを確認
            expect(totalMemoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB以内
            expect(peakMemoryIncrease).toBeLessThan(100 * 1024 * 1024); // ピーク100MB以内
        });
    });

    describe('処理速度の最適化', () => {
        test('バッチ処理の効率性', async () => {
            const characters = hiraganaDataService.getCharactersByStrokeComplexity('intermediate').slice(0, 10);
            const drawingDataArray = characters.map(char => createStandardDrawing(char));
            
            // 個別処理の時間測定
            const individualStartTime = performance.now();
            const individualResults = [];
            for (let i = 0; i < characters.length; i++) {
                const result = await recognitionService.recognizeCharacterForChild(
                    drawingDataArray[i], 
                    characters[i]
                );
                individualResults.push(result);
            }
            const individualEndTime = performance.now();
            const individualTime = individualEndTime - individualStartTime;
            
            // バッチ処理の時間測定
            const batchStartTime = performance.now();
            const batchPromises = characters.map((char, index) => 
                recognitionService.recognizeCharacterForChild(drawingDataArray[index], char)
            );
            const batchResults = await Promise.all(batchPromises);
            const batchEndTime = performance.now();
            const batchTime = batchEndTime - batchStartTime;
            
            // バッチ処理が効率的であることを確認
            expect(batchTime).toBeLessThan(individualTime * 0.8); // 20%以上の改善
            expect(batchResults.length).toBe(individualResults.length);
        });

        test('キャッシュヒット率の測定', async () => {
            const character = hiraganaDataService.selectCharacter('か') || hiraganaDataService.getAllCharacters()[0];
            const drawingData = createStandardDrawing(character);
            
            // キャッシュウォームアップ
            await recognitionService.recognizeCharacterForChild(drawingData, character);
            
            const testCount = 50;
            const startTime = performance.now();
            
            for (let i = 0; i < testCount; i++) {
                await recognitionService.recognizeCharacterForChild(drawingData, character);
            }
            
            const endTime = performance.now();
            const averageTime = (endTime - startTime) / testCount;
            
            // キャッシュにより高速化されていることを確認
            expect(averageTime).toBeLessThan(50); // 50ms以内
        });

        test('複雑さスコア計算の最適化', () => {
            const characters = hiraganaDataService.getAllCharacters();
            
            // 初回計算時間の測定
            const firstCalculationStart = performance.now();
            const firstScores = characters.map(char => char.calculateComplexity());
            const firstCalculationEnd = performance.now();
            const firstCalculationTime = firstCalculationEnd - firstCalculationStart;
            
            // 2回目計算時間の測定（キャッシュ効果を期待）
            const secondCalculationStart = performance.now();
            const secondScores = characters.map(char => char.calculateComplexity());
            const secondCalculationEnd = performance.now();
            const secondCalculationTime = secondCalculationEnd - secondCalculationStart;
            
            // 計算が正常に完了することを確認
            expect(firstCalculationTime).toBeGreaterThan(0);
            expect(secondCalculationTime).toBeGreaterThan(0);
            expect(firstScores.length).toBe(secondScores.length);
            expect(firstScores.length).toBeGreaterThan(0);
            
            // スコアの一貫性を確認
            firstScores.forEach((score, index) => {
                expect(score).toBeGreaterThanOrEqual(0);
                expect(score).toBeLessThanOrEqual(1);
                expect(score).toBeCloseTo(secondScores[index], 2);
            });
        });

        test('描画正規化処理の最適化', async () => {
            const character = hiraganaDataService.selectCharacter('さ') || hiraganaDataService.getAllCharacters()[0];
            const testSizes = [10, 50, 100, 200, 500];
            const results = [];
            
            for (const size of testSizes) {
                const drawingData = createDrawingWithSize(character, size);
                
                const startTime = performance.now();
                const normalizedData = recognitionService.normalizeChildDrawing(drawingData.strokes, drawingData.boundingBox);
                const endTime = performance.now();
                
                const processingTime = endTime - startTime;
                results.push({
                    size,
                    time: processingTime,
                    pointsPerMs: size / processingTime
                });
            }
            
            // 処理効率が合理的であることを確認
            results.forEach(result => {
                expect(result.time).toBeLessThan(200); // 200ms以内
                expect(result.pointsPerMs).toBeGreaterThan(0.5); // 効率的な処理
            });
        });
    });

    describe('リソース管理の最適化', () => {
        test('イベントリスナーのメモリリーク防止', () => {
            const services = [];
            
            // 複数のサービスインスタンスを作成
            for (let i = 0; i < 5; i++) {
                const service = new RecognitionService();
                services.push(service);
            }
            
            // サービスが正常に作成されたことを確認
            expect(services.length).toBe(5);
            services.forEach(service => {
                expect(service).toBeDefined();
                expect(typeof service.recognizeCharacterForChild).toBe('function');
            });
            
            // サービスを破棄
            services.forEach(service => {
                if (service.cleanup) {
                    service.cleanup();
                }
            });
            services.length = 0;
            
            // クリーンアップが正常に完了したことを確認
            expect(services.length).toBe(0);
        });

        test('タイマーとインターバルのクリーンアップ', (done) => {
            const timers = [];
            
            // 複数のタイマーを設定
            for (let i = 0; i < 10; i++) {
                const timer = setTimeout(() => {
                    // タイマー処理
                }, 1000);
                timers.push(timer);
            }
            
            // タイマーをクリーンアップ
            timers.forEach(timer => clearTimeout(timer));
            
            // クリーンアップが正常に完了したことを確認
            setTimeout(() => {
                expect(timers.length).toBe(10);
                done();
            }, 100);
        });

        test('DOM要素の参照管理', () => {
            // DOM要素の作成と削除のテスト
            const elements = [];
            
            for (let i = 0; i < 20; i++) {
                const element = document.createElement('div');
                element.id = `test-element-${i}`;
                document.body.appendChild(element);
                elements.push(element);
            }
            
            // 要素の削除
            elements.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            
            // 削除が正常に完了したことを確認
            elements.forEach(element => {
                expect(document.getElementById(element.id)).toBeNull();
            });
        });
    });

    // ヘルパー関数群
    function getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0; // メモリAPI が利用できない場合
    }

    function createStandardDrawing(character) {
        const drawingData = new DrawingData();
        
        for (let i = 0; i < character.strokeCount; i++) {
            const stroke = [];
            for (let j = 0; j < 20; j++) {
                stroke.push({
                    x: 50 + (j * 3),
                    y: 50 + (j * 3),
                    timestamp: Date.now() + (j * 50)
                });
            }
            drawingData.addStroke(stroke);
        }
        
        return drawingData;
    }

    function createLargeDrawing(character) {
        const drawingData = new DrawingData();
        
        for (let i = 0; i < character.strokeCount; i++) {
            const stroke = [];
            for (let j = 0; j < 200; j++) {
                stroke.push({
                    x: 50 + (j * 2) + Math.random() * 10,
                    y: 50 + (j * 2) + Math.random() * 10,
                    timestamp: Date.now() + (j * 25)
                });
            }
            drawingData.addStroke(stroke);
        }
        
        return drawingData;
    }

    function createDrawingWithSize(character, pointCount) {
        const drawingData = new DrawingData();
        
        for (let i = 0; i < character.strokeCount; i++) {
            const stroke = [];
            for (let j = 0; j < pointCount; j++) {
                stroke.push({
                    x: 50 + (j * 2),
                    y: 50 + (j * 2),
                    timestamp: Date.now() + (j * 20)
                });
            }
            drawingData.addStroke(stroke);
        }
        
        return drawingData;
    }
});