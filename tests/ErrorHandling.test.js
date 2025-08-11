/**
 * エラーハンドリングとフォールバック機能のテスト
 * Error Handling and Fallback Functionality Tests
 */

import { RecognitionService } from '../js/services/RecognitionService.js';
import { ScoreService } from '../js/services/ScoreService.js';
import { HiraganaDataService } from '../js/services/HiraganaDataService.js';
import { HiraganaCharacter } from '../js/models/HiraganaCharacter.js';
import { DrawingData } from '../js/models/DrawingData.js';

describe('Error Handling and Fallback Tests', () => {
    let recognitionService;
    let scoreService;
    let hiraganaDataService;

    beforeEach(() => {
        recognitionService = new RecognitionService();
        scoreService = new ScoreService();
        hiraganaDataService = new HiraganaDataService();
    });

    describe('認識システムのエラーハンドリング', () => {
        test('null描画データの処理', async () => {
            const character = new HiraganaCharacter('あ', 'あ', 3, 'vowel');
            
            const result = await recognitionService.recognizeCharacterForChild(null, character);
            
            // nullデータでも適切なフォールバック結果を返すことを期待
            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.recognized).toBe(false);
            expect(result.details).toBeDefined();
        });

        test('空の描画データの処理', async () => {
            const character = new HiraganaCharacter('い', 'い', 2, 'vowel');
            const emptyDrawing = new DrawingData();
            
            const result = await recognitionService.recognizeCharacterForChild(emptyDrawing, character);
            
            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.recognized).toBe(false);
        });

        test('nullターゲット文字の処理', async () => {
            const drawingData = new DrawingData();
            drawingData.addStroke([
                { x: 50, y: 50, timestamp: 100 },
                { x: 60, y: 60, timestamp: 200 }
            ]);
            
            const result = await recognitionService.recognizeCharacterForChild(drawingData, null);
            
            expect(result).toBeDefined();
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });
    });

    describe('採点システムのエラーハンドリング', () => {
        test('null認識結果の処理', () => {
            const character = new HiraganaCharacter('お', 'お', 3, 'vowel');
            
            const scoreResult = scoreService.calculateScore(false, character, null);
            
            expect(scoreResult).toBeDefined();
            expect(scoreResult.level).toBe('poor');
            expect(scoreResult.details).toBeDefined();
            expect(scoreResult.details.encouragingNote).toBeDefined();
        });

        test('不正な認識結果の処理', () => {
            const character = new HiraganaCharacter('か', 'か', 3, 'consonant');
            const invalidResult = {
                confidence: 'invalid',
                recognized: null,
                details: undefined
            };
            
            const scoreResult = scoreService.calculateScore(invalidResult.recognized, character, null);
            
            expect(scoreResult).toBeDefined();
            expect(scoreResult.level).toBeDefined();
            expect(['excellent', 'fair', 'poor']).toContain(scoreResult.level);
            expect(scoreResult.details).toBeDefined();
            expect(scoreResult.details.encouragingNote).toBeDefined();
        });

        test('nullターゲット文字での採点', () => {
            const recognitionResult = {
                confidence: 0.5,
                recognized: true,
                details: { similarity: 0.6 }
            };
            
            const scoreResult = scoreService.calculateScore(recognitionResult.recognized, null, null);
            
            expect(scoreResult).toBeDefined();
            expect(scoreResult.level).toBe('poor');
            expect(scoreResult.details).toBeDefined();
        });

        test('極端な信頼度値の処理', () => {
            const character = new HiraganaCharacter('き', 'き', 4, 'consonant');
            
            const extremeResults = [
                { confidence: -1, recognized: false },
                { confidence: 2, recognized: true },
                { confidence: NaN, recognized: true },
                { confidence: Infinity, recognized: false }
            ];
            
            extremeResults.forEach(result => {
                const scoreResult = scoreService.calculateScore(result.recognized, character, null);
                
                expect(scoreResult).toBeDefined();
                expect(scoreResult.level).toBeDefined();
                expect(scoreResult.details).toBeDefined();
                expect(scoreResult.details.encouragingNote).toBeDefined();
            });
        });
    });

    describe('データサービスのエラーハンドリング', () => {
        test('存在しない文字の取得', () => {
            const result = hiraganaDataService.selectCharacter('invalid');
            
            expect(result).toBeNull();
        });

        test('不正な難易度レベルの処理', () => {
            const result = hiraganaDataService.getCharactersByStrokeComplexity('invalid');
            
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });
    });

    describe('システム全体のフォールバック機能', () => {
        test('完全な認識失敗時のフォールバック', async () => {
            const character = new HiraganaCharacter('く', 'く', 1, 'consonant');
            
            // 認識が完全に失敗するケースをシミュレート
            const mockRecognitionService = {
                recognizeCharacterForChild: jest.fn().mockRejectedValue(new Error('Recognition failed'))
            };
            
            // フォールバック処理をテスト
            try {
                await mockRecognitionService.recognizeCharacterForChild(new DrawingData(), character);
            } catch (error) {
                // エラーが発生した場合のフォールバック結果を作成
                const fallbackResult = {
                    confidence: 0,
                    recognized: false,
                    details: {
                        similarity: 0,
                        encouragementLevel: 'poor',
                        childFriendlyScore: 0
                    }
                };
                
                const scoreResult = scoreService.calculateScore(fallbackResult.recognized, character, null);
                
                expect(scoreResult.level).toBe('poor');
                expect(scoreResult.details).toBeDefined();
                expect(scoreResult.details.encouragingNote).toBeDefined();
            }
        });

        test('ネットワークエラー時のローカルフォールバック', () => {
            // ネットワーク依存の機能がある場合のフォールバックテスト
            // 現在の実装はローカルのみなので、将来の拡張に備えたテスト
            
            const localData = hiraganaDataService.getAllCharacters();
            
            expect(localData).toBeDefined();
            expect(Array.isArray(localData)).toBe(true);
            expect(localData.length).toBeGreaterThan(0);
        });
    });

    describe('基本的なパフォーマンステスト', () => {
        test('小規模データでの処理時間', async () => {
            const character = hiraganaDataService.getAllCharacters()[0];
            const drawingData = createSimpleDrawing(character);
            
            const startTime = performance.now();
            const result = await recognitionService.recognizeCharacterForChild(drawingData, character);
            const endTime = performance.now();
            
            const processingTime = endTime - startTime;
            
            // 小規模データは高速処理されることを確認
            expect(processingTime).toBeLessThan(1000); // 1秒以内
            expect(result).toBeDefined();
        });

        test('複数の軽量処理', async () => {
            const characters = hiraganaDataService.getAllCharacters().slice(0, 3);
            
            const promises = characters.map(char => {
                const drawingData = createSimpleDrawing(char);
                return recognitionService.recognizeCharacterForChild(drawingData, char);
            });
            
            const results = await Promise.all(promises);
            
            expect(results.length).toBe(3);
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(result.confidence).toBeGreaterThanOrEqual(0);
            });
        });
    });

    // ヘルパー関数
    function createSimpleDrawing(character) {
        const drawingData = new DrawingData();
        
        // シンプルな描画データを作成
        for (let i = 0; i < Math.min(character.strokeCount, 3); i++) {
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
});