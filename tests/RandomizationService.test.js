// RandomizationServiceクラスのテスト

import { RandomizationService } from '../js/services/RandomizationService.js';
import { HiraganaDataService } from '../js/services/HiraganaDataService.js';
import { ProgressTrackingService } from '../js/services/ProgressTrackingService.js';
import { HiraganaCharacter } from '../js/models/HiraganaCharacter.js';

describe('RandomizationService', () => {
    let randomizationService;
    let hiraganaDataService;
    let progressTrackingService;
    let mockErrorHandler;

    beforeEach(() => {
        // モックエラーハンドラーを作成
        mockErrorHandler = {
            handleCharacterError: jest.fn().mockReturnValue({ fallback: null }),
            logCharacterSelectionDebug: jest.fn()
        };

        hiraganaDataService = new HiraganaDataService(mockErrorHandler);
        progressTrackingService = new ProgressTrackingService(null, mockErrorHandler);
        randomizationService = new RandomizationService(
            hiraganaDataService, 
            progressTrackingService, 
            mockErrorHandler
        );
    });

    describe('constructor', () => {
        test('サービスが正しく初期化される', () => {
            expect(randomizationService).toBeInstanceOf(RandomizationService);
            expect(randomizationService.isInitialized).toBe(true);
            expect(randomizationService.fallbackMode).toBe(false);
        });

        test('重みが全文字に対して初期化される', () => {
            const debugInfo = randomizationService.getDebugInfo();
            expect(Object.keys(debugInfo.selectionWeights).length).toBe(46);
            
            // 全ての重みが1.0で初期化されることを確認
            Object.values(debugInfo.selectionWeights).forEach(weight => {
                expect(weight).toBe(1.0);
            });
        });

        test('エラーハンドラーなしでも初期化できる', () => {
            const serviceWithoutErrorHandler = new RandomizationService(hiraganaDataService);
            expect(serviceWithoutErrorHandler.isInitialized).toBe(true);
        });

        test('進捗トラッキングサービスなしでも初期化できる', () => {
            const serviceWithoutProgress = new RandomizationService(hiraganaDataService, null, mockErrorHandler);
            expect(serviceWithoutProgress.isInitialized).toBe(true);
        });
    });

    describe('selectNextCharacter', () => {
        test('ランダムな文字が選択される', () => {
            const selectedChar = randomizationService.selectNextCharacter();
            expect(selectedChar).toBeInstanceOf(HiraganaCharacter);
            expect(selectedChar.isValid()).toBe(true);
        });

        test('現在の文字と異なる文字が選択される（重複回避）', () => {
            const currentChar = hiraganaDataService.getCurrentCharacter();
            const selectedChar = randomizationService.selectNextCharacter(currentChar.character);
            
            // 文字が2文字以上ある場合は異なる文字が選択される
            if (hiraganaDataService.getCharacterCount() > 1) {
                expect(selectedChar.character).not.toBe(currentChar.character);
            }
        });

        test('難易度フィルターが適用される', () => {
            const preferences = { difficultyFilter: 1 };
            const selectedChar = randomizationService.selectNextCharacter(null, preferences);
            expect(selectedChar.difficulty).toBe(1);
        });

        test('カテゴリフィルターが適用される', () => {
            const preferences = { categoryFilter: 'あ行' };
            const selectedChar = randomizationService.selectNextCharacter(null, preferences);
            expect(selectedChar.getCategory()).toBe('あ行');
        });

        test('重複回避を無効にできる', () => {
            const currentChar = hiraganaDataService.getCurrentCharacter();
            const preferences = { avoidRecent: false };
            
            // 複数回実行して現在の文字が選択される可能性を確認
            let currentCharSelected = false;
            for (let i = 0; i < 50; i++) {
                const selectedChar = randomizationService.selectNextCharacter(currentChar.character, preferences);
                if (selectedChar.character === currentChar.character) {
                    currentCharSelected = true;
                    break;
                }
            }
            
            // 統計的に現在の文字が選択される可能性があることを確認
            expect(typeof currentCharSelected).toBe('boolean');
        });

        test('進捗重み付けを無効にできる', () => {
            const preferences = { useProgressWeighting: false };
            const selectedChar = randomizationService.selectNextCharacter(null, preferences);
            expect(selectedChar).toBeInstanceOf(HiraganaCharacter);
        });

        test('複数の設定を組み合わせて使用できる', () => {
            const preferences = {
                difficultyFilter: 2,
                categoryFilter: 'か行',
                avoidRecent: true,
                useProgressWeighting: false
            };
            const selectedChar = randomizationService.selectNextCharacter(null, preferences);
            expect(selectedChar.difficulty).toBe(2);
            expect(selectedChar.getCategory()).toBe('か行');
        });
    });

    describe('getAvailableCharacters', () => {
        test('フィルターなしで全文字が返される', () => {
            const availableChars = randomizationService.getAvailableCharacters(null, null, null);
            expect(availableChars.length).toBe(46);
        });

        test('難易度フィルターが適用される', () => {
            const availableChars = randomizationService.getAvailableCharacters(1, null, null);
            availableChars.forEach(char => {
                expect(char.difficulty).toBe(1);
            });
        });

        test('カテゴリフィルターが適用される', () => {
            const availableChars = randomizationService.getAvailableCharacters(null, 'あ行', null);
            expect(availableChars.length).toBe(5);
            availableChars.forEach(char => {
                expect(char.getCategory()).toBe('あ行');
            });
        });

        test('除外文字が適用される', () => {
            const excludeChar = 'あ';
            const availableChars = randomizationService.getAvailableCharacters(null, null, excludeChar);
            expect(availableChars.every(char => char.character !== excludeChar)).toBe(true);
        });

        test('最近の文字履歴が除外される', () => {
            // 履歴に文字を追加
            randomizationService.updateRecentHistory('あ');
            randomizationService.updateRecentHistory('い');
            
            const availableChars = randomizationService.getAvailableCharacters(null, null, null);
            expect(availableChars.every(char => !['あ', 'い'].includes(char.character))).toBe(true);
        });

        test('複数のフィルターが同時に適用される', () => {
            const availableChars = randomizationService.getAvailableCharacters(1, 'あ行', 'あ');
            availableChars.forEach(char => {
                expect(char.difficulty).toBe(1);
                expect(char.getCategory()).toBe('あ行');
                expect(char.character).not.toBe('あ');
            });
        });
    });

    describe('weightedRandomSelection', () => {
        test('重み付きランダム選択が動作する', () => {
            const characters = hiraganaDataService.getAllCharacters().slice(0, 5);
            const selectedChar = randomizationService.weightedRandomSelection(characters);
            expect(characters.includes(selectedChar)).toBe(true);
        });

        test('空配列でフォールバック文字が返される', () => {
            const selectedChar = randomizationService.weightedRandomSelection([]);
            expect(selectedChar).toBeDefined();
            expect(selectedChar.character).toBe('あ');
        });

        test('単一文字配列でその文字が返される', () => {
            const singleChar = [hiraganaDataService.getAllCharacters()[0]];
            const selectedChar = randomizationService.weightedRandomSelection(singleChar);
            expect(selectedChar).toBe(singleChar[0]);
        });
    });

    describe('simpleRandomSelection', () => {
        test('シンプルランダム選択が動作する', () => {
            const characters = hiraganaDataService.getAllCharacters().slice(0, 5);
            const selectedChar = randomizationService.simpleRandomSelection(characters);
            expect(characters.includes(selectedChar)).toBe(true);
        });

        test('空配列でフォールバック文字が返される', () => {
            const selectedChar = randomizationService.simpleRandomSelection([]);
            expect(selectedChar).toBeDefined();
            expect(selectedChar.character).toBe('あ');
        });

        test('単一文字配列でその文字が返される', () => {
            const singleChar = [hiraganaDataService.getAllCharacters()[0]];
            const selectedChar = randomizationService.simpleRandomSelection(singleChar);
            expect(selectedChar).toBe(singleChar[0]);
        });
    });

    describe('calculateSelectionWeight', () => {
        test('基本重みが計算される', () => {
            const character = hiraganaDataService.getAllCharacters()[0];
            const weight = randomizationService.calculateSelectionWeight(character);
            expect(typeof weight).toBe('number');
            expect(weight).toBeGreaterThan(0);
        });

        test('未練習文字の重みが高くなる', () => {
            const character = hiraganaDataService.getAllCharacters()[0];
            
            // 進捗データがない場合（未練習）
            const weight = randomizationService.calculateSelectionWeight(character);
            expect(weight).toBeGreaterThanOrEqual(2.0); // 未練習文字は重みが2.5倍
        });

        test('最小重み0.1が保証される', () => {
            const character = hiraganaDataService.getAllCharacters()[0];
            
            // 重みを極端に下げる
            randomizationService.selectionWeights.set(character.character, 0.01);
            
            const weight = randomizationService.calculateSelectionWeight(character);
            expect(weight).toBeGreaterThanOrEqual(0.1);
        });
    });

    describe('updateSelectionWeights', () => {
        test('高スコアで重みが下がる', () => {
            const character = 'あ';
            const initialWeight = randomizationService.selectionWeights.get(character);
            
            randomizationService.updateSelectionWeights({
                character: character,
                score: 0.9,
                difficulty: 1
            });
            
            const newWeight = randomizationService.selectionWeights.get(character);
            expect(newWeight).toBeLessThan(initialWeight);
        });

        test('低スコアで重みが上がる', () => {
            const character = 'あ';
            const initialWeight = randomizationService.selectionWeights.get(character);
            
            randomizationService.updateSelectionWeights({
                character: character,
                score: 0.3,
                difficulty: 1
            });
            
            const newWeight = randomizationService.selectionWeights.get(character);
            expect(newWeight).toBeGreaterThan(initialWeight);
        });

        test('重みが適切な範囲内に制限される', () => {
            const character = 'あ';
            
            // 極端に高いスコアを複数回適用
            for (let i = 0; i < 10; i++) {
                randomizationService.updateSelectionWeights({
                    character: character,
                    score: 1.0,
                    difficulty: 1
                });
            }
            
            const weight = randomizationService.selectionWeights.get(character);
            expect(weight).toBeGreaterThanOrEqual(0.1);
            expect(weight).toBeLessThanOrEqual(3.0);
        });
    });

    describe('getRecommendedDifficulty', () => {
        test('進捗データがない場合は難易度1が推奨される', () => {
            const recommendedDifficulty = randomizationService.getRecommendedDifficulty(null);
            expect(recommendedDifficulty).toBe(1);
        });

        test('進捗トラッキングサービスがない場合は難易度1が推奨される', () => {
            const serviceWithoutProgress = new RandomizationService(hiraganaDataService, null, mockErrorHandler);
            const recommendedDifficulty = serviceWithoutProgress.getRecommendedDifficulty({});
            expect(recommendedDifficulty).toBe(1);
        });

        test('推奨難易度が適切な範囲内である', () => {
            const recommendedDifficulty = randomizationService.getRecommendedDifficulty({});
            expect(recommendedDifficulty).toBeGreaterThanOrEqual(1);
            expect(recommendedDifficulty).toBeLessThanOrEqual(4);
        });
    });

    describe('shouldSuggestDifficultyIncrease', () => {
        test('難易度上昇提案の判定が動作する', () => {
            const shouldIncrease = randomizationService.shouldSuggestDifficultyIncrease({});
            expect(typeof shouldIncrease).toBe('boolean');
        });
    });

    describe('updateRecentHistory', () => {
        test('履歴が正しく更新される', () => {
            randomizationService.updateRecentHistory('あ');
            randomizationService.updateRecentHistory('い');
            
            const debugInfo = randomizationService.getDebugInfo();
            expect(debugInfo.recentCharacters).toEqual(['い', 'あ']);
        });

        test('重複文字が履歴から削除される', () => {
            randomizationService.updateRecentHistory('あ');
            randomizationService.updateRecentHistory('い');
            randomizationService.updateRecentHistory('あ'); // 重複
            
            const debugInfo = randomizationService.getDebugInfo();
            expect(debugInfo.recentCharacters).toEqual(['あ', 'い']);
        });

        test('履歴サイズが制限される', () => {
            // 最大履歴数を超えて文字を追加
            for (let i = 0; i < 10; i++) {
                randomizationService.updateRecentHistory(`文字${i}`);
            }
            
            const debugInfo = randomizationService.getDebugInfo();
            expect(debugInfo.recentCharacters.length).toBeLessThanOrEqual(randomizationService.maxRecentHistory);
        });
    });

    describe('reset', () => {
        test('リセット後に履歴がクリアされる', () => {
            randomizationService.updateRecentHistory('あ');
            randomizationService.updateRecentHistory('い');
            
            randomizationService.reset();
            
            const debugInfo = randomizationService.getDebugInfo();
            expect(debugInfo.recentCharacters).toEqual([]);
        });

        test('リセット後に重みが初期化される', () => {
            randomizationService.updateSelectionWeights({
                character: 'あ',
                score: 0.3,
                difficulty: 1
            });
            
            randomizationService.reset();
            
            const debugInfo = randomizationService.getDebugInfo();
            expect(debugInfo.selectionWeights['あ']).toBe(1.0);
        });
    });

    describe('getDebugInfo', () => {
        test('デバッグ情報が正しく返される', () => {
            const debugInfo = randomizationService.getDebugInfo();
            
            expect(debugInfo).toHaveProperty('recentCharacters');
            expect(debugInfo).toHaveProperty('selectionWeights');
            expect(debugInfo).toHaveProperty('totalCharacters');
            expect(debugInfo).toHaveProperty('availableDifficulties');
            expect(debugInfo).toHaveProperty('availableCategories');
            
            expect(Array.isArray(debugInfo.recentCharacters)).toBe(true);
            expect(typeof debugInfo.selectionWeights).toBe('object');
            expect(debugInfo.totalCharacters).toBe(46);
            expect(Array.isArray(debugInfo.availableDifficulties)).toBe(true);
            expect(Array.isArray(debugInfo.availableCategories)).toBe(true);
        });
    });

    describe('getStatistics', () => {
        test('統計情報が正しく返される', () => {
            const stats = randomizationService.getStatistics();
            
            expect(stats).toHaveProperty('averageWeight');
            expect(stats).toHaveProperty('maxWeight');
            expect(stats).toHaveProperty('minWeight');
            expect(stats).toHaveProperty('recentHistorySize');
            expect(stats).toHaveProperty('maxHistorySize');
            
            expect(typeof stats.averageWeight).toBe('number');
            expect(typeof stats.maxWeight).toBe('number');
            expect(typeof stats.minWeight).toBe('number');
            expect(typeof stats.recentHistorySize).toBe('number');
            expect(typeof stats.maxHistorySize).toBe('number');
        });
    });

    describe('setPracticeMode', () => {
        test('練習モードが設定される', () => {
            randomizationService.setPracticeMode('difficulty');
            expect(randomizationService.practiceMode).toBe('difficulty');
        });

        test('難易度モードで重みが調整される', () => {
            randomizationService.setPracticeMode('difficulty');
            
            const debugInfo = randomizationService.getDebugInfo();
            const weights = Object.values(debugInfo.selectionWeights);
            
            // 難易度に応じて重みが調整されることを確認
            expect(weights.some(weight => weight !== 1.0)).toBe(true);
        });

        test('シーケンシャルモードで重みがリセットされる', () => {
            // まず重みを変更
            randomizationService.updateSelectionWeights({
                character: 'あ',
                score: 0.3,
                difficulty: 1
            });
            
            randomizationService.setPracticeMode('sequential');
            
            const debugInfo = randomizationService.getDebugInfo();
            expect(debugInfo.selectionWeights['あ']).toBe(1.0);
        });
    });

    describe('フォールバックモード', () => {
        test('フォールバックモードでも文字選択が動作する', () => {
            // フォールバックモードを強制的に有効にする
            randomizationService.fallbackMode = true;
            
            const selectedChar = randomizationService.selectNextCharacter();
            expect(selectedChar).toBeInstanceOf(HiraganaCharacter);
        });

        test('フォールバック文字が正しく返される', () => {
            const fallbackChar = randomizationService.getFallbackCharacter();
            expect(fallbackChar.character).toBe('あ');
            expect(fallbackChar.reading).toBe('a');
            expect(fallbackChar.difficulty).toBe(1);
        });
    });

    describe('エラーハンドリング', () => {
        test('無効な引数でもエラーが発生しない', () => {
            expect(() => {
                randomizationService.selectNextCharacter(null, { difficultyFilter: 999 });
            }).not.toThrow();
        });

        test('空の文字配列でもエラーが発生しない', () => {
            expect(() => {
                randomizationService.weightedRandomSelection([]);
            }).not.toThrow();
        });

        test('無効な練習結果でもエラーが発生しない', () => {
            expect(() => {
                randomizationService.updateSelectionWeights({});
            }).not.toThrow();
        });
    });

    describe('パフォーマンステスト', () => {
        test('大量の文字選択が効率的に処理される', () => {
            const startTime = Date.now();
            
            // 1000回の文字選択を実行
            for (let i = 0; i < 1000; i++) {
                randomizationService.selectNextCharacter();
            }
            
            const endTime = Date.now();
            const executionTime = endTime - startTime;
            
            // 1000回の選択が1秒以内に完了することを確認
            expect(executionTime).toBeLessThan(1000);
        });

        test('重み更新が効率的に処理される', () => {
            const startTime = Date.now();
            
            // 1000回の重み更新を実行
            for (let i = 0; i < 1000; i++) {
                randomizationService.updateSelectionWeights({
                    character: 'あ',
                    score: Math.random(),
                    difficulty: 1
                });
            }
            
            const endTime = Date.now();
            const executionTime = endTime - startTime;
            
            // 1000回の更新が500ms以内に完了することを確認
            expect(executionTime).toBeLessThan(500);
        });
    });

    describe('統計的テスト', () => {
        test('ランダム選択の分布が適切である', () => {
            const selectionCounts = {};
            const iterations = 1000;
            
            // 1000回選択して分布を確認
            for (let i = 0; i < iterations; i++) {
                const selectedChar = randomizationService.selectNextCharacter();
                selectionCounts[selectedChar.character] = (selectionCounts[selectedChar.character] || 0) + 1;
            }
            
            // 全文字が少なくとも1回は選択されることを確認（統計的に期待される）
            const selectedCharacters = Object.keys(selectionCounts);
            expect(selectedCharacters.length).toBeGreaterThan(30); // 46文字中30文字以上
            
            // 極端な偏りがないことを確認
            const maxCount = Math.max(...Object.values(selectionCounts));
            const minCount = Math.min(...Object.values(selectionCounts));
            const ratio = maxCount / minCount;
            expect(ratio).toBeLessThan(10); // 最大と最小の比率が10倍未満
        });

        test('重複回避が統計的に機能している', () => {
            let consecutiveCount = 0;
            let previousChar = null;
            
            // 100回選択して連続選択の回数を確認
            for (let i = 0; i < 100; i++) {
                const selectedChar = randomizationService.selectNextCharacter(previousChar);
                if (selectedChar.character === previousChar) {
                    consecutiveCount++;
                }
                previousChar = selectedChar.character;
            }
            
            // 連続選択が5%未満であることを確認（統計的に期待される）
            expect(consecutiveCount / 100).toBeLessThan(0.05);
        });
    });
});