// HiraganaCharacterクラスのテスト

// テスト対象のクラスをインポート
const HiraganaCharacter = require('../js/models/HiraganaCharacter.js');

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
            const character = new HiraganaCharacter('う', 'う', 2);
            const info = character.getInfo();
            
            expect(info).toEqual({
                character: 'う',
                reading: 'う',
                difficulty: 2
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
});