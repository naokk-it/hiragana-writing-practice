/**
 * パフォーマンステスト: 寛容な認識アルゴリズム
 * Performance Tests for Tolerant Recognition Algorithm
 */

import { RecognitionService } from '../js/services/RecognitionService.js';
import { HiraganaDataService } from '../js/services/HiraganaDataService.js';
import { DrawingData } from '../js/models/DrawingData.js';

describe('Recognition Algorithm Performance Tests', () => {
    let recognitionService;
    let hiraganaDataService;

    beforeEach(() => {
        recognitionService = new RecognitionService();
        hiraganaDataService = new HiraganaDataService();
    });

    describe('レスポンス時間の最適化', () => {
        test('単一文字認識のレスポンス時間', async () => {
            const character = hiraganaDataService.selectCharacter('あ') || hiraganaDataService.getAllCharacters()[0];
            const drawingData = createComplexDrawing(character, 50); // 50ポイントの描画
            
            const startTime = performance.now();
            const result = await recognitionService.recognizeCharacterForChild(drawingData, character);
            const endTime = performance.now();
            
            const responseTime = endTime - startTime;
            
            // 単一文字認識は500ms以内であることを期待
            expect(responseTime).toBeLessThan(500);
            expect(result).toBeDefined();
            expect(result.confidence).toBeGreaterThanOrEqual(0);
        });

        test('複数文字の並列認識パフォーマンス', async () => {
            const characters = hiraganaDataService.getCharactersByStrokeComplexity('intermediate').slice(0, 5);
            const drawingDataArray = characters.map(char => createComplexDrawing(char, 30));
            
            const startTime = performance.now();
            
            const promises = characters.map((char, index) => 
                recognitionService.recognizeCharacterForChild(drawingDataArray[index], char)
            );
            
            const results = await Promise.all(promises);
            const endTime = performance.now();
            
            const totalTime = endTime - startTime;
            const averageTime = totalTime / characters.length;
            
            // 並列処理により平均時間が短縮されることを期待
            expect(averageTime).toBeLessThan(300);
            expect(results.length).toBe(characters.length);
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(result.confidence).toBeGreaterThanOrEqual(0);
            });
        });

        test('大量データでのメモリ効率性', async () => {
            const character = hiraganaDataService.selectCharacter('き') || hiraganaDataService.getAllCharacters()[0];
            const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            
            // 大量の認識処理を実行
            const iterations = 20;
            const results = [];
            
            for (let i = 0; i < iterations; i++) {
                const drawingData = createComplexDrawing(character, 100); // 大きな描画データ
                const result = await recognitionService.recognizeCharacterForChild(drawingData, character);
                results.push(result);
                
                // ガベージコレクションを促進
                if (i % 5 === 0 && global.gc) {
                    global.gc();
                }
            }
            
            const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            const memoryIncrease = finalMemory - initialMemory;
            
            // メモリ使用量の増加が合理的な範囲内であることを確認
            expect(results.length).toBe(iterations);
            if (performance.memory) {
                expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB以内
            }
        });
    });

    describe('アルゴリズムの効率性', () => {
        test('複雑さスコア計算のパフォーマンス', () => {
            const characters = hiraganaDataService.getAllCharacters();
            
            const startTime = performance.now();
            
            const complexityScores = characters.map(char => {
                return char.calculateComplexity();
            });
            
            const endTime = performance.now();
            const calculationTime = endTime - startTime;
            
            // 全文字の複雑さスコア計算が100ms以内であることを期待
            expect(calculationTime).toBeLessThan(100);
            expect(complexityScores.length).toBe(characters.length);
            
            complexityScores.forEach(score => {
                expect(score).toBeGreaterThanOrEqual(0);
                expect(score).toBeLessThanOrEqual(1);
            });
        });

        test('描画正規化処理のパフォーマンス', async () => {
            const character = hiraganaDataService.selectCharacter('さ') || hiraganaDataService.getAllCharacters()[0];
            
            // 様々なサイズの描画データでテスト
            const testSizes = [10, 50, 100, 200];
            const results = [];
            
            for (const size of testSizes) {
                const drawingData = createNoisyDrawing(character, size);
                
                const startTime = performance.now();
                const normalizedData = recognitionService.normalizeChildDrawing(drawingData.strokes, drawingData.boundingBox);
                const endTime = performance.now();
                
                const normalizationTime = endTime - startTime;
                
                results.push({
                    size,
                    time: normalizationTime,
                    normalized: normalizedData
                });
            }
            
            // 正規化時間がデータサイズに対して線形的に増加することを確認
            results.forEach((result, index) => {
                expect(result.time).toBeLessThan(100); // 各正規化が100ms以内
                expect(result.normalized).toBeDefined();
                
                if (index > 0) {
                    // より大きなデータの処理時間がより長いことを確認
                    expect(result.time).toBeGreaterThanOrEqual(results[index - 1].time * 0.5);
                }
            });
        });

        test('キャッシュ機能の効果測定', async () => {
            const character = hiraganaDataService.selectCharacter('た') || hiraganaDataService.getAllCharacters()[0];
            const drawingData = createStandardDrawing(character);
            
            // 初回認識（キャッシュなし）
            const startTime1 = performance.now();
            const result1 = await recognitionService.recognizeCharacterForChild(drawingData, character);
            const endTime1 = performance.now();
            const firstTime = endTime1 - startTime1;
            
            // 2回目認識（キャッシュあり）
            const startTime2 = performance.now();
            const result2 = await recognitionService.recognizeCharacterForChild(drawingData, character);
            const endTime2 = performance.now();
            const secondTime = endTime2 - startTime2;
            
            // キャッシュにより2回目が高速化されることを期待
            expect(secondTime).toBeLessThanOrEqual(firstTime);
            expect(result1.confidence).toBeCloseTo(result2.confidence, 2);
        });
    });

    describe('負荷テスト', () => {
        test('高頻度認識リクエストの処理', async () => {
            const characters = hiraganaDataService.getCharactersByStrokeComplexity('beginner');
            const requestCount = 50;
            const startTime = performance.now();
            
            // 高頻度でリクエストを送信
            const promises = [];
            for (let i = 0; i < requestCount; i++) {
                const character = characters[i % characters.length];
                const drawingData = createStandardDrawing(character);
                promises.push(recognitionService.recognizeCharacterForChild(drawingData, character));
            }
            
            const results = await Promise.all(promises);
            const endTime = performance.now();
            
            const totalTime = endTime - startTime;
            const averageTime = totalTime / requestCount;
            
            // 高負荷下でも合理的なレスポンス時間を維持
            expect(averageTime).toBeLessThan(200);
            expect(results.length).toBe(requestCount);
            
            // 全ての結果が有効であることを確認
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(result.confidence).toBeGreaterThanOrEqual(0);
                expect(result.confidence).toBeLessThanOrEqual(1);
            });
        });

        test('メモリリークの検出', async () => {
            if (!performance.memory) {
                console.log('Memory API not available, skipping memory leak test');
                return;
            }
            
            const character = hiraganaDataService.getCharacterBySymbol('な');
            const initialMemory = performance.memory.usedJSHeapSize;
            
            // 大量の認識処理を実行してメモリリークをチェック
            for (let i = 0; i < 100; i++) {
                const drawingData = createComplexDrawing(character, 50);
                await recognitionService.recognizeCharacterForChild(drawingData, character);
                
                // 定期的にガベージコレクションを実行
                if (i % 10 === 0 && global.gc) {
                    global.gc();
                }
            }
            
            // 最終的なガベージコレクション
            if (global.gc) {
                global.gc();
                // GC後に少し待機
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const finalMemory = performance.memory.usedJSHeapSize;
            const memoryIncrease = finalMemory - initialMemory;
            
            // メモリ増加が合理的な範囲内であることを確認（メモリリークなし）
            expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // 20MB以内
        });
    });

    // ヘルパー関数群
    function createStandardDrawing(character) {
        const drawingData = new DrawingData();
        
        for (let i = 0; i < character.strokeCount; i++) {
            const stroke = [];
            for (let j = 0; j < 10; j++) {
                stroke.push({
                    x: 50 + (j * 5),
                    y: 50 + (j * 5),
                    timestamp: Date.now() + (j * 50)
                });
            }
            drawingData.addStroke(stroke);
        }
        
        return drawingData;
    }

    function createComplexDrawing(character, pointCount) {
        const drawingData = new DrawingData();
        
        for (let i = 0; i < character.strokeCount; i++) {
            const stroke = [];
            for (let j = 0; j < pointCount; j++) {
                stroke.push({
                    x: 50 + (j * 2) + Math.random() * 10,
                    y: 50 + (j * 2) + Math.random() * 10,
                    timestamp: Date.now() + (j * 20)
                });
            }
            drawingData.addStroke(stroke);
        }
        
        return drawingData;
    }

    function createNoisyDrawing(character, pointCount) {
        const drawingData = new DrawingData();
        
        for (let i = 0; i < character.strokeCount; i++) {
            const stroke = [];
            for (let j = 0; j < pointCount; j++) {
                // ノイズを含む描画データを生成
                stroke.push({
                    x: 50 + (j * 3) + (Math.random() - 0.5) * 20,
                    y: 50 + (j * 3) + (Math.random() - 0.5) * 20,
                    timestamp: Date.now() + (j * 30) + Math.random() * 50
                });
            }
            drawingData.addStroke(stroke);
        }
        
        return drawingData;
    }
});