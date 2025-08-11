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
        
        // 新しい難易度分類システム用のプロパティ
        this.complexityScore = this.calculateComplexity();
        this.strokeComplexityLevel = this.determineStrokeComplexityLevel();
        this.pedagogicalOrder = this.calculatePedagogicalOrder();
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
        return !!(this.character && this.reading && this.difficulty > 0 && this.strokeCount > 0);
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

    /**
     * 文字の複雑さスコアを計算（0.0-1.0）
     * 曲線、交差、角度の複雑さを考慮
     * @returns {number} 複雑さスコア
     */
    calculateComplexity() {
        const features = this.features || {};
        
        // 曲線の重み（0.4）
        const curveWeight = features.hasCurve ? 0.4 : 0.0;
        
        // 交差の重み（0.3） - 複数の線が交わる複雑さ
        const intersectionWeight = this.calculateIntersectionComplexity() * 0.3;
        
        // 角度の重み（0.3） - 急角度や複雑な角度変化
        const angleWeight = this.calculateAngleComplexity() * 0.3;
        
        const complexityScore = curveWeight + intersectionWeight + angleWeight;
        
        // 0.0-1.0の範囲に正規化
        return Math.min(Math.max(complexityScore, 0.0), 1.0);
    }

    /**
     * 交差の複雑さを計算
     * @returns {number} 交差複雑さ（0.0-1.0）
     */
    calculateIntersectionComplexity() {
        const features = this.features || {};
        
        // 水平線と垂直線の両方がある場合は交差の可能性が高い
        if (features.hasHorizontalLine && features.hasVerticalLine) {
            return 0.8;
        }
        
        // どちらか一方のみの場合
        if (features.hasHorizontalLine || features.hasVerticalLine) {
            return 0.4;
        }
        
        return 0.0;
    }

    /**
     * 角度の複雑さを計算
     * @returns {number} 角度複雑さ（0.0-1.0）
     */
    calculateAngleComplexity() {
        const features = this.features || {};
        
        // 既存のcomplexityスコアを基準として使用
        if (typeof features.complexity === 'number') {
            return features.complexity;
        }
        
        // フォールバック: 画数に基づく簡易計算
        return Math.min(this.strokeCount / 5.0, 1.0);
    }

    /**
     * 画数に基づく難易度レベルを決定
     * @returns {string} 'beginner', 'intermediate', 'advanced'
     */
    determineStrokeComplexityLevel() {
        if (this.strokeCount <= 2) {
            return 'beginner';
        } else if (this.strokeCount === 3) {
            return 'intermediate';
        } else {
            return 'advanced';
        }
    }

    /**
     * 教育的順序を計算
     * 同じ難易度レベル内での学習順序を決定
     * @returns {number} 教育的順序スコア
     */
    calculatePedagogicalOrder() {
        // 画数を主要因子として使用
        let order = this.strokeCount * 100;
        
        // 複雑さスコアを副次因子として追加
        order += this.complexityScore * 10;
        
        // 特定の文字の教育的優先度を調整
        const pedagogicalAdjustments = {
            // 基本的な文字は優先度を上げる
            'あ': -50, 'い': -45, 'う': -40, 'え': -35, 'お': -30,
            // 簡単な形状の文字
            'く': -25, 'し': -20, 'つ': -15, 'て': -10, 'の': -5,
            // 複雑な文字は後回し
            'ふ': 20, 'ほ': 25, 'む': 15, 'ゆ': 10
        };
        
        if (pedagogicalAdjustments[this.character]) {
            order += pedagogicalAdjustments[this.character];
        }
        
        return order;
    }

    /**
     * 画数複雑度レベルを取得
     * @returns {string} 画数複雑度レベル
     */
    getStrokeComplexityLevel() {
        return this.strokeComplexityLevel;
    }

    /**
     * 複雑さスコアを取得
     * @returns {number} 複雑さスコア
     */
    getComplexityScore() {
        return this.complexityScore;
    }

    /**
     * 教育的順序を取得
     * @returns {number} 教育的順序スコア
     */
    getPedagogicalOrder() {
        return this.pedagogicalOrder;
    }

    /**
     * 指定された画数複雑度レベルと一致するかチェック
     * @param {string} level チェックするレベル ('beginner', 'intermediate', 'advanced')
     * @returns {boolean} レベルが一致するかどうか
     */
    matchesStrokeComplexityLevel(level) {
        return this.strokeComplexityLevel === level;
    }
}

