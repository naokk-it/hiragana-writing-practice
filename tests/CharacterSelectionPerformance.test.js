// 文字選択パフォーマンステスト（大規模データセット対応）

import { HiraganaDataService } from '../js/services/HiraganaDataService.js';
import { RandomizationService } from '../js/services/RandomizationService.js';
import { ProgressTrackingService } from '../js/services/ProgressTrackingService.js';

// localStorageのモック
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

describe('文字選択パフォーマンステスト', () => {
    let hiraganaDataService;
    let randomizationService;
    let progressTrackingService;
    let mockErrorHandler;

    beforeEach(() => {
        // localStorageをクリア
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        localStorageMock.removeItem.mockClear();
        localStorageMock.clear.mockClear();

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

    describe('基本パフォーマンステスト', () => {
        test('1000回の文字選択が2秒以内に完了する', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                randomizationService.selectNextCharacter();
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(2000);
            console.log(`1000回の文字選択: ${executionTime.toFixed(2)}ms`);
        });

        test('10000回の重み更新が1秒以内に完了する', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 10000; i++) {
                randomizationService.updateSelectionWeights({
                    character: 'あ',
                    score: Math.random(),
                    difficulty: 1
                });
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(1000);
            console.log(`10000回の重み更新: ${executionTime.toFixed(2)}ms`);
        });

        test('全文字の詳細情報取得が100ms以内に完了する', () => {
            const startTime = performance.now();
            
            const allChars = hiraganaDataService.getAllCharacters();
            allChars.forEach(char => {
                hiraganaDataService.getCharacterDetails(char.character);
            });
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(100);
            console.log(`46文字の詳細情報取得: ${executionTime.toFixed(2)}ms`);
        });
    });

    describe('フィルタリングパフォーマンステスト', () => {
        test('難易度フィルタリングが高速である', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                const difficulty = (i % 4) + 1;
                hiraganaDataService.getCharactersByDifficulty(difficulty);
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(100);
            console.log(`1000回の難易度フィルタリング: ${executionTime.toFixed(2)}ms`);
        });

        test('カテゴリフィルタリングが高速である', () => {
            const categories = hiraganaDataService.getAllCategories();
            const startTime = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                const category = categories[i % categories.length];
                hiraganaDataService.getCharactersByCategory(category);
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(100);
            console.log(`1000回のカテゴリフィルタリング: ${executionTime.toFixed(2)}ms`);
        });

        test('複合フィルタリングが効率的である', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 500; i++) {
                const difficulty = (i % 4) + 1;
                const preferences = {
                    difficultyFilter: difficulty,
                    avoidRecent: true,
                    useProgressWeighting: true
                };
                randomizationService.selectNextCharacter(null, preferences);
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(1000);
            console.log(`500回の複合フィルタリング選択: ${executionTime.toFixed(2)}ms`);
        });
    });

    describe('メモリ使用量テスト', () => {
        test('大量の履歴データでもメモリ使用量が制限される', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // 大量の履歴データを追加
            for (let i = 0; i < 10000; i++) {
                randomizationService.updateRecentHistory(`文字${i}`);
            }
            
            const afterMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = afterMemory - initialMemory;
            
            // メモリ増加が5MB未満であることを確認（Node.jsのGC特性を考慮）
            expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
            
            // 履歴サイズが制限されていることを確認
            const debugInfo = randomizationService.getDebugInfo();
            expect(debugInfo.recentCharacters.length).toBeLessThanOrEqual(randomizationService.maxRecentHistory);
        });

        test('重み更新でメモリリークが発生しない', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // 大量の重み更新を実行
            for (let i = 0; i < 10000; i++) {
                randomizationService.updateSelectionWeights({
                    character: 'あ',
                    score: Math.random(),
                    difficulty: 1
                });
            }
            
            // ガベージコレクションを強制実行（可能であれば）
            if (global.gc) {
                global.gc();
            }
            
            const afterMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = afterMemory - initialMemory;
            
            // メモリ増加が10MB未満であることを確認（Node.jsのGC特性を考慮）
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
        });
    });

    describe('大規模進捗データパフォーマンステスト', () => {
        test('大量の進捗データがある状態での文字選択が高速である', () => {
            // 全文字に大量の進捗データを追加
            const allChars = hiraganaDataService.getAllCharacters();
            allChars.forEach(char => {
                for (let i = 0; i < 100; i++) {
                    progressTrackingService.recordCharacterPractice(
                        char.character,
                        Math.random(),
                        Date.now() - Math.random() * 1000000
                    );
                }
            });
            
            const startTime = performance.now();
            
            // 重み付き選択を1000回実行
            for (let i = 0; i < 1000; i++) {
                randomizationService.selectNextCharacter(null, { useProgressWeighting: true });
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(3000);
            console.log(`大規模進捗データでの1000回選択: ${executionTime.toFixed(2)}ms`);
        });

        test('進捗統計計算が効率的である', () => {
            // 全文字に進捗データを追加
            const allChars = hiraganaDataService.getAllCharacters();
            allChars.forEach(char => {
                for (let i = 0; i < 50; i++) {
                    progressTrackingService.recordCharacterPractice(
                        char.character,
                        Math.random(),
                        Date.now() - Math.random() * 1000000
                    );
                }
            });
            
            const startTime = performance.now();
            
            // 全文字の統計を計算
            allChars.forEach(char => {
                const progress = progressTrackingService.getCharacterProgress(char.character);
                if (progress) {
                    progress.getAverageScore();
                    progress.getAttemptCount();
                    progress.getMasteryLevel();
                    progress.getLastPracticeTime();
                }
            });
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(100);
            console.log(`46文字の進捗統計計算: ${executionTime.toFixed(2)}ms`);
        });
    });

    describe('並行処理シミュレーション', () => {
        test('複数の同時文字選択要求を処理できる', async () => {
            const promises = [];
            const startTime = performance.now();
            
            // 100個の並行文字選択を実行
            for (let i = 0; i < 100; i++) {
                promises.push(
                    new Promise(resolve => {
                        const selectedChar = randomizationService.selectNextCharacter();
                        resolve(selectedChar);
                    })
                );
            }
            
            const results = await Promise.all(promises);
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(results.length).toBe(100);
            expect(results.every(char => char && char.character)).toBe(true);
            expect(executionTime).toBeLessThan(1000);
            console.log(`100個の並行文字選択: ${executionTime.toFixed(2)}ms`);
        });

        test('高頻度の重み更新を処理できる', () => {
            const startTime = performance.now();
            const characters = hiraganaDataService.getAllCharacters().map(c => c.character);
            
            // 高頻度で重み更新を実行
            for (let i = 0; i < 5000; i++) {
                const character = characters[i % characters.length];
                randomizationService.updateSelectionWeights({
                    character: character,
                    score: Math.random(),
                    difficulty: Math.floor(Math.random() * 4) + 1
                });
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(500);
            console.log(`5000回の高頻度重み更新: ${executionTime.toFixed(2)}ms`);
        });
    });

    describe('スケーラビリティテスト', () => {
        test('文字数が増加しても選択性能が線形に劣化しない', () => {
            // 現在の46文字での性能を測定
            const startTime46 = performance.now();
            for (let i = 0; i < 1000; i++) {
                randomizationService.selectNextCharacter();
            }
            const time46 = performance.now() - startTime46;
            
            // 文字数を仮想的に2倍にした場合の性能をシミュレート
            // （実際には同じ文字セットを使用するが、重みマップを拡張）
            const originalWeights = new Map(randomizationService.selectionWeights);
            
            // 重みマップを拡張（仮想的に文字数を2倍に）
            const allChars = hiraganaDataService.getAllCharacters();
            allChars.forEach((char, index) => {
                randomizationService.selectionWeights.set(`${char.character}_copy`, 1.0);
            });
            
            const startTime92 = performance.now();
            for (let i = 0; i < 1000; i++) {
                randomizationService.selectNextCharacter();
            }
            const time92 = performance.now() - startTime92;
            
            // 重みマップを元に戻す
            randomizationService.selectionWeights = originalWeights;
            
            // 性能劣化が2倍未満であることを確認（理想的には線形）
            const performanceRatio = time92 / time46;
            expect(performanceRatio).toBeLessThan(2.5);
            
            console.log(`46文字: ${time46.toFixed(2)}ms, 92文字相当: ${time92.toFixed(2)}ms, 比率: ${performanceRatio.toFixed(2)}`);
        });

        test('履歴サイズが性能に与える影響が限定的である', () => {
            // 小さな履歴での性能
            randomizationService.maxRecentHistory = 5;
            randomizationService.reset();
            
            const startTimeSmall = performance.now();
            for (let i = 0; i < 1000; i++) {
                randomizationService.selectNextCharacter();
            }
            const timeSmall = performance.now() - startTimeSmall;
            
            // 大きな履歴での性能
            randomizationService.maxRecentHistory = 20;
            randomizationService.reset();
            
            const startTimeLarge = performance.now();
            for (let i = 0; i < 1000; i++) {
                randomizationService.selectNextCharacter();
            }
            const timeLarge = performance.now() - startTimeLarge;
            
            // 履歴サイズの影響が50%未満であることを確認
            const performanceRatio = timeLarge / timeSmall;
            expect(performanceRatio).toBeLessThan(1.5);
            
            console.log(`履歴5: ${timeSmall.toFixed(2)}ms, 履歴20: ${timeLarge.toFixed(2)}ms, 比率: ${performanceRatio.toFixed(2)}`);
        });
    });

    describe('リソース効率性テスト', () => {
        test('CPU使用率が適切である', () => {
            const iterations = 10000;
            const startTime = performance.now();
            
            // CPU集約的な処理を実行
            for (let i = 0; i < iterations; i++) {
                const preferences = {
                    difficultyFilter: (i % 4) + 1,
                    categoryFilter: i % 2 === 0 ? 'あ行' : null,
                    avoidRecent: true,
                    useProgressWeighting: true
                };
                randomizationService.selectNextCharacter(null, preferences);
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            const operationsPerSecond = (iterations / executionTime) * 1000;
            
            // 1秒間に5000回以上の操作が可能であることを確認
            expect(operationsPerSecond).toBeGreaterThan(5000);
            console.log(`処理速度: ${operationsPerSecond.toFixed(0)} ops/sec`);
        });

        test('ガベージコレクションの頻度が適切である', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // 大量のオブジェクト生成を伴う処理
            for (let i = 0; i < 5000; i++) {
                randomizationService.selectNextCharacter();
                randomizationService.getDebugInfo();
                randomizationService.getStatistics();
            }
            
            const afterMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = afterMemory - initialMemory;
            
            // メモリ増加が20MB未満であることを確認（Node.jsのGC特性を考慮）
            expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
            console.log(`メモリ増加: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        });
    });

    describe('エッジケースパフォーマンス', () => {
        test('極端な重み値でも性能が劣化しない', () => {
            // 極端な重み値を設定
            const allChars = hiraganaDataService.getAllCharacters();
            allChars.forEach((char, index) => {
                const extremeWeight = index % 2 === 0 ? 0.001 : 1000;
                randomizationService.selectionWeights.set(char.character, extremeWeight);
            });
            
            const startTime = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                randomizationService.selectNextCharacter();
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(2000);
            console.log(`極端な重み値での1000回選択: ${executionTime.toFixed(2)}ms`);
        });

        test('全文字が最近の履歴にある場合でも高速である', () => {
            // 全文字を履歴に追加
            const allChars = hiraganaDataService.getAllCharacters();
            allChars.forEach(char => {
                randomizationService.updateRecentHistory(char.character);
            });
            
            const startTime = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                randomizationService.selectNextCharacter();
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(2000);
            console.log(`全文字履歴状態での1000回選択: ${executionTime.toFixed(2)}ms`);
        });
    });
});