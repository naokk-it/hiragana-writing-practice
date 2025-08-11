// HiraganaCharacterクラスのテスト

// テスト対象のクラスをインポート
import { HiraganaCharacter } from '../js/models/HiraganaCharacter.js';

describe('HiraganaCharacter', () => {
    describe('constructor', () => {
        test('正常な引数で文字オブジェクトが作成される', () => {
            const character = new HiraganaCharacter('あ', 'あ', 1);
            
            expect(character.character).toBe('あ');
            expect(character.reading).toBe('あ');
            expect(character.difficulty).toBe(1);
        });

        test('難易度のデフォルト値が1になる', () => {
            const character = new HiraganaCharacter('い', 'い');
            
            expect(character.character).toBe('い');
            expect(character.reading).toBe('い');
            expect(character.difficulty).toBe(1);
        });

        test('異なる難易度レベルで作成できる', () => {
            const easyChar = new HiraganaCharacter('あ', 'あ', 1);
            const hardChar = new HiraganaCharacter('し', 'し', 3);
            
            expect(easyChar.difficulty).toBe(1);
            expect(hardChar.difficulty).toBe(3);
        });
    });

    describe('getInfo', () => {
        test('文字情報オブジェクトが正しく返される', () => {
            const character = new HiraganaCharacter('う', 'う', 2, 2, 'あ行', { hasCurve: true });
            const info = character.getInfo();
            
            expect(info).toEqual({
                character: 'う',
                reading: 'う',
                difficulty: 2,
                strokeCount: 2,
                category: 'あ行',
                features: { hasCurve: true }
            });
        });

        test('元のオブジェクトとは独立したオブジェクトが返される', () => {
            const character = new HiraganaCharacter('え', 'え', 1);
            const info = character.getInfo();
            
            info.character = '変更';
            expect(character.character).toBe('え');
        });
    });

    describe('isValid', () => {
        test('正常な文字オブジェクトでtrueが返される', () => {
            const character = new HiraganaCharacter('お', 'お', 1);
            expect(character.isValid()).toBe(true);
        });

        test('文字が空の場合falseが返される', () => {
            const character = new HiraganaCharacter('', 'あ', 1);
            expect(character.isValid()).toBe(false);
        });

        test('読みが空の場合falseが返される', () => {
            const character = new HiraganaCharacter('あ', '', 1);
            expect(character.isValid()).toBe(false);
        });

        test('難易度が0以下の場合falseが返される', () => {
            const character = new HiraganaCharacter('あ', 'あ', 0);
            expect(character.isValid()).toBe(false);
        });

        test('文字がnullの場合falseが返される', () => {
            const character = new HiraganaCharacter(null, 'あ', 1);
            expect(character.isValid()).toBe(false);
        });

        test('読みがnullの場合falseが返される', () => {
            const character = new HiraganaCharacter('あ', null, 1);
            expect(character.isValid()).toBe(false);
        });
    });

    describe('プロパティの直接アクセス', () => {
        test('プロパティに直接アクセスできる', () => {
            const character = new HiraganaCharacter('か', 'か', 2);
            
            expect(character.character).toBe('か');
            expect(character.reading).toBe('か');
            expect(character.difficulty).toBe(2);
        });

        test('プロパティを変更できる', () => {
            const character = new HiraganaCharacter('き', 'き', 2);
            
            character.difficulty = 3;
            expect(character.difficulty).toBe(3);
        });
    });

    describe('複雑さスコア計算機能', () => {
        test('複雑さスコアが正しく計算される', () => {
            const features = {
                hasCurve: true,
                hasHorizontalLine: true,
                hasVerticalLine: true,
                complexity: 0.7
            };
            const character = new HiraganaCharacter('あ', 'あ', 1, 3, 'あ行', features);
            
            const complexityScore = character.getComplexityScore();
            expect(complexityScore).toBeGreaterThanOrEqual(0.0);
            expect(complexityScore).toBeLessThanOrEqual(1.0);
            expect(typeof complexityScore).toBe('number');
        });

        test('特徴がない場合でも複雑さスコアが計算される', () => {
            const character = new HiraganaCharacter('く', 'く', 2, 1);
            
            const complexityScore = character.getComplexityScore();
            expect(complexityScore).toBeGreaterThanOrEqual(0.0);
            expect(complexityScore).toBeLessThanOrEqual(1.0);
        });

        test('曲線がある文字は複雑さスコアが高くなる', () => {
            const withCurve = new HiraganaCharacter('あ', 'あ', 1, 3, 'あ行', { hasCurve: true });
            const withoutCurve = new HiraganaCharacter('か', 'か', 2, 3, 'か行', { hasCurve: false });
            
            expect(withCurve.getComplexityScore()).toBeGreaterThan(withoutCurve.getComplexityScore());
        });

        test('交差がある文字は複雑さスコアが高くなる', () => {
            const withIntersection = new HiraganaCharacter('あ', 'あ', 1, 3, 'あ行', { 
                hasHorizontalLine: true, 
                hasVerticalLine: true 
            });
            const withoutIntersection = new HiraganaCharacter('く', 'く', 2, 1, 'か行', { 
                hasHorizontalLine: false, 
                hasVerticalLine: false 
            });
            
            expect(withIntersection.getComplexityScore()).toBeGreaterThan(withoutIntersection.getComplexityScore());
        });
    });

    describe('新しい難易度レベル判定メソッド', () => {
        test('1-2画の文字はbeginnerレベルになる', () => {
            const oneStroke = new HiraganaCharacter('く', 'く', 2, 1);
            const twoStroke = new HiraganaCharacter('い', 'い', 1, 2);
            
            expect(oneStroke.getStrokeComplexityLevel()).toBe('beginner');
            expect(twoStroke.getStrokeComplexityLevel()).toBe('beginner');
        });

        test('3画の文字はintermediateレベルになる', () => {
            const threeStroke = new HiraganaCharacter('あ', 'あ', 1, 3);
            
            expect(threeStroke.getStrokeComplexityLevel()).toBe('intermediate');
        });

        test('4画以上の文字はadvancedレベルになる', () => {
            const fourStroke = new HiraganaCharacter('き', 'き', 2, 4);
            const fiveStroke = new HiraganaCharacter('ほ', 'ほ', 3, 5);
            
            expect(fourStroke.getStrokeComplexityLevel()).toBe('advanced');
            expect(fiveStroke.getStrokeComplexityLevel()).toBe('advanced');
        });

        test('matchesStrokeComplexityLevelメソッドが正しく動作する', () => {
            const beginnerChar = new HiraganaCharacter('く', 'く', 2, 1);
            const intermediateChar = new HiraganaCharacter('あ', 'あ', 1, 3);
            const advancedChar = new HiraganaCharacter('き', 'き', 2, 4);
            
            expect(beginnerChar.matchesStrokeComplexityLevel('beginner')).toBe(true);
            expect(beginnerChar.matchesStrokeComplexityLevel('intermediate')).toBe(false);
            
            expect(intermediateChar.matchesStrokeComplexityLevel('intermediate')).toBe(true);
            expect(intermediateChar.matchesStrokeComplexityLevel('advanced')).toBe(false);
            
            expect(advancedChar.matchesStrokeComplexityLevel('advanced')).toBe(true);
            expect(advancedChar.matchesStrokeComplexityLevel('beginner')).toBe(false);
        });
    });

    describe('教育的順序計算機能', () => {
        test('教育的順序が正しく計算される', () => {
            const character = new HiraganaCharacter('あ', 'あ', 1, 3, 'あ行', { complexity: 0.7 });
            
            const pedagogicalOrder = character.getPedagogicalOrder();
            expect(typeof pedagogicalOrder).toBe('number');
            expect(pedagogicalOrder).toBeGreaterThan(0);
        });

        test('画数が多い文字ほど教育的順序が後になる', () => {
            const oneStroke = new HiraganaCharacter('く', 'く', 2, 1);
            const threeStroke = new HiraganaCharacter('あ', 'あ', 1, 3);
            const fourStroke = new HiraganaCharacter('き', 'き', 2, 4);
            
            expect(oneStroke.getPedagogicalOrder()).toBeLessThan(threeStroke.getPedagogicalOrder());
            expect(threeStroke.getPedagogicalOrder()).toBeLessThan(fourStroke.getPedagogicalOrder());
        });

        test('同じ画数でも複雑さによって順序が変わる', () => {
            const simpleChar = new HiraganaCharacter('い', 'い', 1, 2, 'あ行', { complexity: 0.2 });
            const complexChar = new HiraganaCharacter('う', 'う', 1, 2, 'あ行', { complexity: 0.8 });
            
            expect(simpleChar.getPedagogicalOrder()).toBeLessThan(complexChar.getPedagogicalOrder());
        });

        test('基本的な文字（あいうえお）は優先度が高い', () => {
            const basicChar = new HiraganaCharacter('あ', 'あ', 1, 3);
            const regularChar = new HiraganaCharacter('か', 'か', 2, 3);
            
            // あは教育的調整により優先度が高くなる
            expect(basicChar.getPedagogicalOrder()).toBeLessThan(regularChar.getPedagogicalOrder());
        });
    });

    describe('既存のデータ構造との互換性', () => {
        test('既存のメソッドが正常に動作する', () => {
            const character = new HiraganaCharacter('あ', 'あ', 1, 3, 'あ行', { hasCurve: true });
            
            // 既存のメソッドが正常に動作することを確認
            expect(character.getInfo()).toBeDefined();
            expect(character.isValid()).toBe(true);
            expect(character.getCategory()).toBe('あ行');
            expect(character.getFeatures()).toBeDefined();
            expect(character.getStrokeCount()).toBe(3);
            expect(character.isInCategory('あ行')).toBe(true);
            expect(character.matchesDifficulty(1)).toBe(true);
        });

        test('新しいプロパティが自動的に計算される', () => {
            const character = new HiraganaCharacter('あ', 'あ', 1, 3, 'あ行', { hasCurve: true });
            
            // 新しいプロパティが自動的に設定されることを確認
            expect(character.complexityScore).toBeDefined();
            expect(character.strokeComplexityLevel).toBeDefined();
            expect(character.pedagogicalOrder).toBeDefined();
            
            expect(typeof character.complexityScore).toBe('number');
            expect(typeof character.strokeComplexityLevel).toBe('string');
            expect(typeof character.pedagogicalOrder).toBe('number');
        });

        test('featuresが未定義でもエラーが発生しない', () => {
            expect(() => {
                const character = new HiraganaCharacter('あ', 'あ', 1, 3, 'あ行');
                character.getComplexityScore();
                character.getStrokeComplexityLevel();
                character.getPedagogicalOrder();
            }).not.toThrow();
        });

        test('空のfeaturesオブジェクトでも正常に動作する', () => {
            const character = new HiraganaCharacter('あ', 'あ', 1, 3, 'あ行', {});
            
            expect(character.getComplexityScore()).toBeGreaterThanOrEqual(0);
            expect(character.getStrokeComplexityLevel()).toBe('intermediate');
            expect(character.getPedagogicalOrder()).toBeGreaterThan(0);
        });
    });
});