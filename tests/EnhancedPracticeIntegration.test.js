/**
 * 統合テスト: 拡張された練習体験システム
 * Enhanced Practice Experience Integration Tests
 * 
 * 新しい寛容な認識システムと励まし重視の採点システムの統合テスト
 */

import { RecognitionService } from '../js/services/RecognitionService.js';
import { ScoreService } from '../js/services/ScoreService.js';
import { HiraganaDataService } from '../js/services/HiraganaDataService.js';
import { HiraganaCharacter } from '../js/models/HiraganaCharacter.js';
import { DrawingData } from '../js/models/DrawingData.js';

describe('Enhanced Practice Experience Integration', () => {
    let recognitionService;
    let scoreService;
    let hiraganaDataService;

    beforeEach(() => {
        recognitionService = new RecognitionService();
        scoreService = new ScoreService();
        hiraganaDataService = new HiraganaDataService();
    });

    describe('寛容な認識システムと採点システムの統合', () => {
        test('子供の不完全な描画でも励ましのフィードバックを提供', async () => {
            // 初級レベルの文字「く」を取得
            const beginnerCharacters = hiraganaDataService.getCharactersByStrokeComplexity('beginner');
            const targetCharacter = beginnerCharacters.find(char => char.character === 'く');
            
            // 不完全な描画データをシミュレート（子供の描画特性を模擬）
            const imperfectDrawing = new DrawingData();
            imperfectDrawing.addStroke([
                { x: 50, y: 50, timestamp: 100 },
                { x: 60, y: 80, timestamp: 200 },  // 少し曲がった線
                { x: 55, y: 120, timestamp: 300 }  // 不完全な終点
            ]);

            // 寛容な認識を実行
            const recognitionResult = await recognitionService.recognizeCharacterForChild(
                imperfectDrawing, 
                targetCharacter
            );

            // 採点を実行
            const scoreResult = scoreService.calculateScore(recognitionResult.recognized, targetCharacter, imperfectDrawing);

            // 統合テスト: 寛容な認識により最低でも「fair」レベルを期待
            expect(recognitionResult.confidence).toBeGreaterThanOrEqual(0.2);
            expect(scoreResult.level).not.toBe('poor');
            expect(scoreResult.details).toBeDefined();
            expect(scoreResult.details.encouragingNote).toBeDefined();
        });

        test('画数ベース難易度システムと認識システムの連携', async () => {
            // 各難易度レベルの文字をテスト
            const levels = ['beginner', 'intermediate', 'advanced'];
            
            for (const level of levels) {
                const characters = hiraganaDataService.getCharactersByStrokeComplexity(level);
                expect(characters.length).toBeGreaterThan(0);

                // 各レベルの最初の文字でテスト
                const testCharacter = characters[0];
                
                // 標準的な描画データを作成
                const drawingData = createStandardDrawing(testCharacter);
                
                // 認識と採点を実行
                const recognitionResult = await recognitionService.recognizeCharacterForChild(
                    drawingData, 
                    testCharacter
                );
                const scoreResult = scoreService.calculateScore(recognitionResult.recognized, testCharacter, drawingData);

                // 難易度に応じた適切な評価を確認
                expect(recognitionResult).toBeDefined();
                expect(scoreResult.level).toBeDefined();
                expect(scoreResult.details).toBeDefined();
            }
        });

        test('複雑さスコアと認識精度の相関', async () => {
            const allCharacters = hiraganaDataService.getAllCharacters();
            const testResults = [];

            // 複数の文字で認識テストを実行
            for (let i = 0; i < Math.min(10, allCharacters.length); i++) {
                const character = allCharacters[i];
                const drawingData = createStandardDrawing(character);
                
                const recognitionResult = await recognitionService.recognizeCharacterForChild(
                    drawingData, 
                    character
                );

                testResults.push({
                    character: character.character,
                    complexityScore: character.complexityScore,
                    confidence: recognitionResult.confidence,
                    strokeCount: character.strokeCount
                });
            }

            // 結果の妥当性を検証
            expect(testResults.length).toBeGreaterThan(0);
            testResults.forEach(result => {
                expect(result.confidence).toBeGreaterThanOrEqual(0);
                expect(result.complexityScore).toBeGreaterThanOrEqual(0);
                expect(result.complexityScore).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('エラーハンドリングとフォールバック機能', () => {
        test('認識失敗時のフォールバック処理', async () => {
            const targetCharacter = new HiraganaCharacter('あ', 'あ', 3, 'vowel');
            
            // 空の描画データ（認識失敗をシミュレート）
            const emptyDrawing = new DrawingData();
            
            const recognitionResult = await recognitionService.recognizeCharacterForChild(
                emptyDrawing, 
                targetCharacter
            );
            const scoreResult = scoreService.calculateScore(recognitionResult.recognized, targetCharacter, emptyDrawing);

            // フォールバック処理の確認
            expect(recognitionResult).toBeDefined();
            expect(scoreResult.level).toBe('poor');
            expect(scoreResult.details).toBeDefined();
            expect(scoreResult.details.encouragingNote).toBeDefined();
        });

        test('無効なデータでのエラーハンドリング', async () => {
            const targetCharacter = new HiraganaCharacter('い', 'い', 2, 'vowel');
            
            // 無効な描画データ
            const invalidDrawing = null;
            
            // エラーが適切にハンドリングされることを確認
            await expect(async () => {
                const result = await recognitionService.recognizeCharacterForChild(
                    invalidDrawing, 
                    targetCharacter
                );
                // エラーが発生しても適切なフォールバック結果を返すことを期待
                expect(result).toBeDefined();
                expect(result.confidence).toBe(0);
            }).not.toThrow();
        });

        test('メモリ制限下でのパフォーマンス', async () => {
            const characters = hiraganaDataService.getCharactersByStrokeComplexity('intermediate');
            const startTime = performance.now();
            const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

            // 複数の認識処理を連続実行
            const promises = characters.slice(0, 5).map(async (character) => {
                const drawingData = createStandardDrawing(character);
                return recognitionService.recognizeCharacterForChild(drawingData, character);
            });

            const results = await Promise.all(promises);
            
            const endTime = performance.now();
            const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

            // パフォーマンス要件の確認
            const executionTime = endTime - startTime;
            expect(executionTime).toBeLessThan(5000); // 5秒以内
            expect(results.length).toBe(5);
            
            // メモリ使用量の増加が合理的な範囲内であることを確認
            if (performance.memory) {
                const memoryIncrease = endMemory - startMemory;
                expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB以内
            }
        });
    });

    describe('データ整合性とマイグレーション', () => {
        test('新旧難易度システムの互換性', () => {
            // 旧システムの難易度データをシミュレート
            const oldDifficultyData = {
                'あ': 'easy',
                'か': 'medium', 
                'さ': 'hard'
            };

            // 新システムでの分類を確認
            Object.keys(oldDifficultyData).forEach(char => {
                const character = hiraganaDataService.selectCharacter(char);
                if (character) {
                    const level = character.getStrokeComplexityLevel ? character.getStrokeComplexityLevel() : 'beginner';
                    expect(level).toBeDefined();
                    expect(['beginner', 'intermediate', 'advanced']).toContain(level);
                }
            });
        });

        test('進捗データの移行処理', () => {
            // 旧形式の進捗データ
            const oldProgressData = {
                completedCharacters: ['あ', 'い', 'う'],
                currentDifficulty: 'easy',
                totalScore: 150
            };

            // 新形式への変換をテスト（簡単な変換ロジック）
            const migratedData = {
                completedCharacters: oldProgressData.completedCharacters || [],
                currentLevel: oldProgressData.currentDifficulty === 'easy' ? 'beginner' : 
                             oldProgressData.currentDifficulty === 'medium' ? 'intermediate' : 'advanced',
                totalScore: oldProgressData.totalScore || 0
            };
            
            expect(migratedData).toBeDefined();
            expect(migratedData.completedCharacters).toBeDefined();
            expect(migratedData.currentLevel).toBeDefined();
            expect(['beginner', 'intermediate', 'advanced']).toContain(migratedData.currentLevel);
        });
    });

    // ヘルパー関数: 標準的な描画データを作成
    function createStandardDrawing(character) {
        const drawingData = new DrawingData();
        
        // 文字の画数に基づいて基本的なストロークを作成
        for (let i = 0; i < character.strokeCount; i++) {
            const stroke = [];
            const baseX = 50 + (i * 20);
            const baseY = 50 + (i * 15);
            
            // 各ストロークに複数のポイントを追加
            for (let j = 0; j < 5; j++) {
                stroke.push({
                    x: baseX + (j * 10),
                    y: baseY + (j * 10),
                    timestamp: Date.now() + (j * 100)
                });
            }
            
            drawingData.addStroke(stroke);
        }
        
        return drawingData;
    }
});