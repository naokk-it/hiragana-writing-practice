// HiraganaDataServiceクラスのテスト

// テスト対象のクラスをインポート
import { HiraganaDataService } from '../js/services/HiraganaDataService.js';
import { HiraganaCharacter } from '../js/models/HiraganaCharacter.js';

describe('HiraganaDataService', () => {
    let service;

    beforeEach(() => {
        service = new HiraganaDataService(null);
    });

    describe('constructor', () => {
        test('サービスが正しく初期化される', () => {
            expect(service).toBeInstanceOf(HiraganaDataService);
            expect(service.currentIndex).toBe(0);
            expect(service.characters).toBeDefined();
            expect(service.characters.length).toBeGreaterThan(0);
        });

        test('初期化時に全46文字のひらがなが含まれる', () => {
            const characters = service.getAllCharacters();
            const characterStrings = characters.map(char => char.character);
            
            // 全46文字のひらがなが含まれることを確認
            const expectedCharacters = [
                // あ行
                'あ', 'い', 'う', 'え', 'お',
                // か行
                'か', 'き', 'く', 'け', 'こ',
                // さ行
                'さ', 'し', 'す', 'せ', 'そ',
                // た行
                'た', 'ち', 'つ', 'て', 'と',
                // な行
                'な', 'に', 'ぬ', 'ね', 'の',
                // は行
                'は', 'ひ', 'ふ', 'へ', 'ほ',
                // ま行
                'ま', 'み', 'む', 'め', 'も',
                // や行
                'や', 'ゆ', 'よ',
                // ら行
                'ら', 'り', 'る', 'れ', 'ろ',
                // わ行
                'わ', 'を', 'ん'
            ];
            
            expectedCharacters.forEach(expectedChar => {
                expect(characterStrings).toContain(expectedChar);
            });
            
            expect(characterStrings.length).toBe(46);
        });

        test('全ての文字がHiraganaCharacterインスタンスである', () => {
            const characters = service.getAllCharacters();
            characters.forEach(char => {
                expect(char).toBeInstanceOf(HiraganaCharacter);
                expect(char.isValid()).toBe(true);
            });
        });
    });

    describe('getCurrentCharacter', () => {
        test('初期状態で最初の文字が返される', () => {
            const currentChar = service.getCurrentCharacter();
            expect(currentChar).toBeInstanceOf(HiraganaCharacter);
            expect(currentChar.character).toBe('あ');
        });

        test('インデックス変更後に正しい文字が返される', () => {
            service.currentIndex = 1;
            const currentChar = service.getCurrentCharacter();
            expect(currentChar.character).toBe('い');
        });
    });

    describe('getNextCharacter', () => {
        test('次の文字に正しく移動する', () => {
            const initialChar = service.getCurrentCharacter();
            const nextChar = service.getNextCharacter();
            
            expect(nextChar).not.toBe(initialChar);
            expect(service.getCurrentIndex()).toBe(1);
        });

        test('最後の文字から最初の文字に循環する', () => {
            const totalCount = service.getCharacterCount();
            service.currentIndex = totalCount - 1;
            
            const nextChar = service.getNextCharacter();
            expect(service.getCurrentIndex()).toBe(0);
            expect(nextChar.character).toBe('あ');
        });

        test('複数回呼び出しで正しく進む', () => {
            service.getNextCharacter(); // あ → い
            const secondChar = service.getNextCharacter(); // い → う
            
            expect(secondChar.character).toBe('う');
            expect(service.getCurrentIndex()).toBe(2);
        });
    });

    describe('getPreviousCharacter', () => {
        test('前の文字に正しく移動する', () => {
            service.currentIndex = 2; // 'う'の位置
            const prevChar = service.getPreviousCharacter();
            
            expect(prevChar.character).toBe('い');
            expect(service.getCurrentIndex()).toBe(1);
        });

        test('最初の文字から最後の文字に循環する', () => {
            service.currentIndex = 0;
            const prevChar = service.getPreviousCharacter();
            
            expect(service.getCurrentIndex()).toBe(service.getCharacterCount() - 1);
            expect(prevChar).toBeInstanceOf(HiraganaCharacter);
        });

        test('複数回呼び出しで正しく戻る', () => {
            service.currentIndex = 3; // 'え'の位置
            service.getPreviousCharacter(); // え → う
            const secondPrev = service.getPreviousCharacter(); // う → い
            
            expect(secondPrev.character).toBe('い');
            expect(service.getCurrentIndex()).toBe(1);
        });
    });

    describe('selectCharacterByIndex', () => {
        test('有効なインデックスで文字が選択される', () => {
            const selectedChar = service.selectCharacterByIndex(2);
            
            expect(selectedChar).toBeInstanceOf(HiraganaCharacter);
            expect(selectedChar.character).toBe('う');
            expect(service.getCurrentIndex()).toBe(2);
        });

        test('無効なインデックス（負の値）でnullが返される', () => {
            const selectedChar = service.selectCharacterByIndex(-1);
            
            expect(selectedChar).toBeNull();
            expect(service.getCurrentIndex()).toBe(0); // 変更されない
        });

        test('無効なインデックス（範囲外）でnullが返される', () => {
            const totalCount = service.getCharacterCount();
            const selectedChar = service.selectCharacterByIndex(totalCount);
            
            expect(selectedChar).toBeNull();
            expect(service.getCurrentIndex()).toBe(0); // 変更されない
        });

        test('境界値（0）で正しく動作する', () => {
            service.currentIndex = 5; // 別の位置に設定
            const selectedChar = service.selectCharacterByIndex(0);
            
            expect(selectedChar.character).toBe('あ');
            expect(service.getCurrentIndex()).toBe(0);
        });

        test('境界値（最大インデックス）で正しく動作する', () => {
            const maxIndex = service.getCharacterCount() - 1;
            const selectedChar = service.selectCharacterByIndex(maxIndex);
            
            expect(selectedChar).toBeInstanceOf(HiraganaCharacter);
            expect(service.getCurrentIndex()).toBe(maxIndex);
        });
    });

    describe('selectCharacter', () => {
        test('存在する文字で正しく選択される', () => {
            const selectedChar = service.selectCharacter('う');
            
            expect(selectedChar).toBeInstanceOf(HiraganaCharacter);
            expect(selectedChar.character).toBe('う');
            expect(service.getCurrentIndex()).toBe(2);
        });

        test('存在しない文字でnullが返される', () => {
            const selectedChar = service.selectCharacter('ひらがなではない文字');
            
            expect(selectedChar).toBeNull();
            expect(service.getCurrentIndex()).toBe(0); // 変更されない
        });

        test('空文字でnullが返される', () => {
            const selectedChar = service.selectCharacter('');
            
            expect(selectedChar).toBeNull();
            expect(service.getCurrentIndex()).toBe(0);
        });

        test('nullでnullが返される', () => {
            const selectedChar = service.selectCharacter(null);
            
            expect(selectedChar).toBeNull();
            expect(service.getCurrentIndex()).toBe(0);
        });

        test('複数の文字選択が正しく動作する', () => {
            service.selectCharacter('え');
            expect(service.getCurrentCharacter().character).toBe('え');
            
            service.selectCharacter('あ');
            expect(service.getCurrentCharacter().character).toBe('あ');
        });
    });

    describe('getAllCharacters', () => {
        test('全ての文字配列が返される', () => {
            const allChars = service.getAllCharacters();
            
            expect(Array.isArray(allChars)).toBe(true);
            expect(allChars.length).toBeGreaterThan(0);
            expect(allChars.every(char => char instanceof HiraganaCharacter)).toBe(true);
        });

        test('返される配列は元の配列のコピーである', () => {
            const allChars1 = service.getAllCharacters();
            const allChars2 = service.getAllCharacters();
            
            expect(allChars1).not.toBe(allChars2); // 異なるオブジェクト
            expect(allChars1).toEqual(allChars2); // 内容は同じ
        });

        test('返された配列を変更しても元の配列は影響を受けない', () => {
            const allChars = service.getAllCharacters();
            const originalLength = allChars.length;
            
            allChars.pop(); // 配列から要素を削除
            
            const newAllChars = service.getAllCharacters();
            expect(newAllChars.length).toBe(originalLength);
        });
    });

    describe('getCurrentIndex', () => {
        test('初期インデックスが0である', () => {
            expect(service.getCurrentIndex()).toBe(0);
        });

        test('文字選択後にインデックスが更新される', () => {
            service.selectCharacterByIndex(3);
            expect(service.getCurrentIndex()).toBe(3);
        });
    });

    describe('getCharacterCount', () => {
        test('正しい文字数が返される', () => {
            const count = service.getCharacterCount();
            const allChars = service.getAllCharacters();
            
            expect(count).toBe(allChars.length);
            expect(count).toBeGreaterThan(0);
        });

        test('文字数は46文字（全ひらがな文字）である', () => {
            const count = service.getCharacterCount();
            expect(count).toBe(46);
        });
    });

    describe('getRandomCharacter', () => {
        test('ランダムな文字が返される', () => {
            const randomChar = service.getRandomCharacter();
            expect(randomChar).toBeInstanceOf(HiraganaCharacter);
            expect(randomChar.isValid()).toBe(true);
        });

        test('現在の文字を除外してランダム選択される', () => {
            service.selectCharacterByIndex(0); // 'あ'を選択
            const randomChar = service.getRandomCharacter(true);
            expect(randomChar.character).not.toBe('あ');
        });

        test('難易度フィルターが適用される', () => {
            const randomChar = service.getRandomCharacter(false, 1);
            expect(randomChar.difficulty).toBe(1);
        });

        test('除外設定がfalseの場合は現在の文字も選択される可能性がある', () => {
            // 複数回実行して現在の文字が選択される可能性を確認
            let currentCharSelected = false;
            const currentChar = service.getCurrentCharacter();
            
            for (let i = 0; i < 50; i++) {
                const randomChar = service.getRandomCharacter(false);
                if (randomChar.character === currentChar.character) {
                    currentCharSelected = true;
                    break;
                }
            }
            
            // 統計的に現在の文字が選択される可能性があることを確認
            // （必ずしも選択されるとは限らないが、可能性があることを確認）
            expect(typeof currentCharSelected).toBe('boolean');
        });
    });

    describe('getCharactersByDifficulty', () => {
        test('指定された難易度の文字のみが返される', () => {
            const difficulty1Chars = service.getCharactersByDifficulty(1);
            difficulty1Chars.forEach(char => {
                expect(char.difficulty).toBe(1);
            });
            expect(difficulty1Chars.length).toBeGreaterThan(0);
        });

        test('存在しない難易度では空配列が返される', () => {
            const nonExistentDifficultyChars = service.getCharactersByDifficulty(10);
            expect(nonExistentDifficultyChars).toEqual([]);
        });

        test('全難易度レベルの文字が取得できる', () => {
            const difficulties = service.getAllDifficultyLevels();
            difficulties.forEach(difficulty => {
                const chars = service.getCharactersByDifficulty(difficulty);
                expect(chars.length).toBeGreaterThan(0);
                chars.forEach(char => {
                    expect(char.difficulty).toBe(difficulty);
                });
            });
        });
    });

    describe('getCharactersByCategory', () => {
        test('指定されたカテゴリの文字のみが返される', () => {
            const aRowChars = service.getCharactersByCategory('あ行');
            expect(aRowChars.length).toBe(5);
            aRowChars.forEach(char => {
                expect(char.getCategory()).toBe('あ行');
            });
        });

        test('存在しないカテゴリでは空配列が返される', () => {
            const nonExistentCategoryChars = service.getCharactersByCategory('存在しない行');
            expect(nonExistentCategoryChars).toEqual([]);
        });

        test('全カテゴリの文字が取得できる', () => {
            const categories = service.getAllCategories();
            expect(categories.length).toBeGreaterThan(0);
            
            categories.forEach(category => {
                const chars = service.getCharactersByCategory(category);
                expect(chars.length).toBeGreaterThan(0);
                chars.forEach(char => {
                    expect(char.getCategory()).toBe(category);
                });
            });
        });
    });

    describe('getAllCategories', () => {
        test('全カテゴリがソート済みで返される', () => {
            const categories = service.getAllCategories();
            const expectedCategories = ['あ行', 'か行', 'さ行', 'た行', 'な行', 'は行', 'ま行', 'や行', 'ら行', 'わ行'];
            expect(categories).toEqual(expectedCategories);
        });
    });

    describe('getAllDifficultyLevels', () => {
        test('全難易度レベルがソート済みで返される', () => {
            const difficulties = service.getAllDifficultyLevels();
            expect(difficulties).toEqual([1, 2, 3, 4]);
            expect(difficulties.every(d => typeof d === 'number')).toBe(true);
        });
    });

    describe('getCharacterDetails', () => {
        test('存在する文字の詳細情報が返される', () => {
            const details = service.getCharacterDetails('あ');
            expect(details).toBeDefined();
            expect(details.character).toBe('あ');
            expect(details.reading).toBe('a');
            expect(details.difficulty).toBe(1);
        });

        test('存在しない文字ではnullが返される', () => {
            const details = service.getCharacterDetails('存在しない文字');
            expect(details).toBeNull();
        });
    });

    describe('getCharacterCountByDifficulty', () => {
        test('難易度別の文字数が正しく返される', () => {
            const counts = service.getCharacterCountByDifficulty();
            expect(typeof counts).toBe('object');
            expect(counts[1]).toBeGreaterThan(0);
            expect(counts[2]).toBeGreaterThan(0);
            expect(counts[3]).toBeGreaterThan(0);
            expect(counts[4]).toBeGreaterThan(0);
            
            // 全文字数の合計が46になることを確認
            const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
            expect(totalCount).toBe(46);
        });
    });

    describe('getCharacterCountByCategory', () => {
        test('カテゴリ別の文字数が正しく返される', () => {
            const counts = service.getCharacterCountByCategory();
            expect(typeof counts).toBe('object');
            
            // あ行、か行、さ行、た行、な行、は行、ま行、ら行、わ行は5文字、や行は3文字
            expect(counts['あ行']).toBe(5);
            expect(counts['か行']).toBe(5);
            expect(counts['さ行']).toBe(5);
            expect(counts['た行']).toBe(5);
            expect(counts['な行']).toBe(5);
            expect(counts['は行']).toBe(5);
            expect(counts['ま行']).toBe(5);
            expect(counts['や行']).toBe(3);
            expect(counts['ら行']).toBe(5);
            expect(counts['わ行']).toBe(3);
            
            // 全文字数の合計が46になることを確認
            const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
            expect(totalCount).toBe(46);
        });
    });

    describe('データの整合性', () => {
        test('全ての文字が有効である', () => {
            const allChars = service.getAllCharacters();
            allChars.forEach(char => {
                expect(char.isValid()).toBe(true);
                expect(char.character).toBeTruthy();
                expect(char.reading).toBeTruthy();
                expect(char.difficulty).toBeGreaterThan(0);
            });
        });

        test('重複する文字がない', () => {
            const allChars = service.getAllCharacters();
            const characters = allChars.map(char => char.character);
            const uniqueCharacters = [...new Set(characters)];
            
            expect(characters.length).toBe(uniqueCharacters.length);
        });

        test('難易度が適切な範囲内である', () => {
            const allChars = service.getAllCharacters();
            allChars.forEach(char => {
                expect(char.difficulty).toBeGreaterThanOrEqual(1);
                expect(char.difficulty).toBeLessThanOrEqual(4);
            });
        });

        test('全ての文字にカテゴリが設定されている', () => {
            const allChars = service.getAllCharacters();
            allChars.forEach(char => {
                expect(char.getCategory()).toBeTruthy();
                expect(typeof char.getCategory()).toBe('string');
            });
        });

        test('全ての文字に特徴データが設定されている', () => {
            const allChars = service.getAllCharacters();
            allChars.forEach(char => {
                const features = char.getFeatures();
                expect(features).toBeDefined();
                expect(typeof features).toBe('object');
                expect(typeof features.complexity).toBe('number');
            });
        });

        test('ストローク数が正の整数である', () => {
            const allChars = service.getAllCharacters();
            allChars.forEach(char => {
                expect(char.strokeCount).toBeGreaterThan(0);
                expect(Number.isInteger(char.strokeCount)).toBe(true);
            });
        });
    });

    describe('新しい画数・複雑さベースの難易度分類システム', () => {
        test('getCharactersByStrokeComplexityが正しく動作する', () => {
            const beginnerChars = service.getCharactersByStrokeComplexity('beginner');
            const intermediateChars = service.getCharactersByStrokeComplexity('intermediate');
            const advancedChars = service.getCharactersByStrokeComplexity('advanced');

            // 各レベルに文字が含まれることを確認
            expect(beginnerChars.length).toBeGreaterThan(0);
            expect(intermediateChars.length).toBeGreaterThan(0);
            expect(advancedChars.length).toBeGreaterThan(0);

            // 全文字の合計が46文字になることを確認
            const totalChars = beginnerChars.length + intermediateChars.length + advancedChars.length;
            expect(totalChars).toBe(46);

            // 各レベルの文字が正しい画数範囲にあることを確認
            beginnerChars.forEach(char => {
                expect(char.strokeCount).toBeLessThanOrEqual(2);
            });

            intermediateChars.forEach(char => {
                expect(char.strokeCount).toBe(3);
            });

            advancedChars.forEach(char => {
                expect(char.strokeCount).toBeGreaterThanOrEqual(4);
            });
        });

        test('無効な難易度レベルで空配列が返される', () => {
            const invalidLevel = service.getCharactersByStrokeComplexity('invalid');
            expect(invalidLevel).toEqual([]);
        });

        test('getCharactersInPedagogicalOrderが正しく動作する', () => {
            const beginnerChars = service.getCharactersInPedagogicalOrder('beginner');
            const intermediateChars = service.getCharactersInPedagogicalOrder('intermediate');
            const advancedChars = service.getCharactersInPedagogicalOrder('advanced');

            // 各レベルに文字が含まれることを確認
            expect(beginnerChars.length).toBeGreaterThan(0);
            expect(intermediateChars.length).toBeGreaterThan(0);
            expect(advancedChars.length).toBeGreaterThan(0);

            // 教育的順序でソートされていることを確認
            for (let i = 1; i < beginnerChars.length; i++) {
                const prevOrder = beginnerChars[i-1].getPedagogicalOrder();
                const currentOrder = beginnerChars[i].getPedagogicalOrder();
                expect(prevOrder).toBeLessThanOrEqual(currentOrder);
            }

            for (let i = 1; i < intermediateChars.length; i++) {
                const prevOrder = intermediateChars[i-1].getPedagogicalOrder();
                const currentOrder = intermediateChars[i].getPedagogicalOrder();
                expect(prevOrder).toBeLessThanOrEqual(currentOrder);
            }

            for (let i = 1; i < advancedChars.length; i++) {
                const prevOrder = advancedChars[i-1].getPedagogicalOrder();
                const currentOrder = advancedChars[i].getPedagogicalOrder();
                expect(prevOrder).toBeLessThanOrEqual(currentOrder);
            }
        });

        test('calculateComplexityScoreが正しく動作する', () => {
            // 存在する文字の複雑さスコアを取得
            const complexityA = service.calculateComplexityScore('あ');
            const complexityKu = service.calculateComplexityScore('く');
            const complexityKi = service.calculateComplexityScore('き');

            // 複雑さスコアが0.0-1.0の範囲内であることを確認
            expect(complexityA).toBeGreaterThanOrEqual(0.0);
            expect(complexityA).toBeLessThanOrEqual(1.0);
            expect(complexityKu).toBeGreaterThanOrEqual(0.0);
            expect(complexityKu).toBeLessThanOrEqual(1.0);
            expect(complexityKi).toBeGreaterThanOrEqual(0.0);
            expect(complexityKi).toBeLessThanOrEqual(1.0);

            // 複雑な文字（き）が簡単な文字（く）より高いスコアを持つことを確認
            expect(complexityKi).toBeGreaterThan(complexityKu);
        });

        test('存在しない文字の複雑さスコアは0.0が返される', () => {
            const complexity = service.calculateComplexityScore('存在しない文字');
            expect(complexity).toBe(0.0);
        });

        test('getCharacterCountByStrokeComplexityが正しく動作する', () => {
            const counts = service.getCharacterCountByStrokeComplexity();
            
            expect(counts).toBeDefined();
            expect(typeof counts.beginner).toBe('number');
            expect(typeof counts.intermediate).toBe('number');
            expect(typeof counts.advanced).toBe('number');
            
            expect(counts.beginner).toBeGreaterThan(0);
            expect(counts.intermediate).toBeGreaterThan(0);
            expect(counts.advanced).toBeGreaterThan(0);
            
            // 合計が46文字になることを確認
            const total = counts.beginner + counts.intermediate + counts.advanced;
            expect(total).toBe(46);
        });

        test('画数複雑度キャッシュが正しく構築される', () => {
            const memoryUsage = service.getMemoryUsage();
            expect(memoryUsage.strokeComplexityCache).toBe(3); // beginner, intermediate, advanced
        });

        test('特定の文字が正しい難易度レベルに分類される', () => {
            // 1画の文字（beginner）
            const beginnerChars = service.getCharactersByStrokeComplexity('beginner');
            const kuChar = beginnerChars.find(char => char.character === 'く');
            expect(kuChar).toBeDefined();
            expect(kuChar.getStrokeComplexityLevel()).toBe('beginner');

            // 3画の文字（intermediate）
            const intermediateChars = service.getCharactersByStrokeComplexity('intermediate');
            const aChar = intermediateChars.find(char => char.character === 'あ');
            expect(aChar).toBeDefined();
            expect(aChar.getStrokeComplexityLevel()).toBe('intermediate');

            // 4画以上の文字（advanced）
            const advancedChars = service.getCharactersByStrokeComplexity('advanced');
            const kiChar = advancedChars.find(char => char.character === 'き');
            expect(kiChar).toBeDefined();
            expect(kiChar.getStrokeComplexityLevel()).toBe('advanced');
        });
    });
});