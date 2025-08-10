/**
 * ひらがな文字データモデル
 * 各ひらがな文字の情報を管理するクラス
 */
export class HiraganaCharacter {
    constructor(character, reading, difficulty = 1, strokeCount = 1, category = '', features = {}) {
        this.character = character;    // "あ"
        this.reading = reading;        // "あ"
        this.difficulty = difficulty;  // 難易度レベル (1-5)
        this.strokeCount = strokeCount; // 画数
        this.category = category;      // カテゴリ（あ行、か行など）
        this.features = features;      // 認識用特徴データ
    }

    /**
     * 文字情報を取得
     * @returns {Object} 文字情報オブジェクト
     */
    getInfo() {
        return {
            character: this.character,
            reading: this.reading,
            difficulty: this.difficulty,
            strokeCount: this.strokeCount,
            category: this.category,
            features: this.features
        };
    }

    /**
     * 文字が有効かチェック
     * @returns {boolean} 有効な文字かどうか
     */
    isValid() {
        return this.character && this.reading && this.difficulty > 0 && this.strokeCount > 0;
    }

    /**
     * カテゴリを取得
     * @returns {string} 文字のカテゴリ
     */
    getCategory() {
        return this.category;
    }

    /**
     * 特徴データを取得
     * @returns {Object} 認識用特徴データ
     */
    getFeatures() {
        return { ...this.features };
    }

    /**
     * ストローク数を取得
     * @returns {number} 画数
     */
    getStrokeCount() {
        return this.strokeCount;
    }

    /**
     * 指定されたカテゴリに属するかチェック
     * @param {string} category チェックするカテゴリ
     * @returns {boolean} カテゴリに属するかどうか
     */
    isInCategory(category) {
        return this.category === category;
    }

    /**
     * 指定された難易度と一致するかチェック
     * @param {number} difficulty チェックする難易度
     * @returns {boolean} 難易度が一致するかどうか
     */
    matchesDifficulty(difficulty) {
        return this.difficulty === difficulty;
    }
}

