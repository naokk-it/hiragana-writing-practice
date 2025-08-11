import { HiraganaCharacter } from '../models/HiraganaCharacter.js';

/**
 * ひらがなデータ管理サービス
 * ひらがな文字データの管理と選択機能を提供
 */
export class HiraganaDataService {
    constructor(errorHandler = null) {
        this.errorHandler = errorHandler;
        this.characters = [];
        this.currentIndex = 0;
        this.isInitialized = false;
        
        // パフォーマンス最適化用のキャッシュ
        this.difficultyCache = new Map();
        this.categoryCache = new Map();
        this.characterLookupCache = new Map();
        this.strokeComplexityCache = new Map();
        
        try {
            this.characters = this.initializeCharacters();
            this.buildCaches();
            this.isInitialized = true;
            console.log(`HiraganaDataService初期化完了: ${this.characters.length}文字`);
        } catch (error) {
            this.handleInitializationError(error);
        }
    }

    /**
     * 初期化エラーを処理
     * @param {Error} error 初期化エラー
     */
    handleInitializationError(error) {
        console.error('HiraganaDataService初期化エラー:', error);
        
        if (this.errorHandler) {
            const result = this.errorHandler.handleCharacterError(error, {
                operation: 'loading',
                service: 'HiraganaDataService'
            });
            
            if (result.fallback) {
                this.characters = this.createFallbackCharacters(result.fallback);
                this.isInitialized = true;
                console.log('フォールバック文字セットで初期化完了');
                return;
            }
        }
        
        // エラーハンドラーがない場合の最小限のフォールバック
        this.characters = this.createMinimalCharacterSet();
        this.isInitialized = true;
        console.warn('最小文字セットで初期化完了');
    }

    /**
     * 最小文字セットを作成
     * @returns {Array<HiraganaCharacter>} 最小文字セット
     */
    createMinimalCharacterSet() {
        const minimalData = [
            { char: 'あ', reading: 'a', difficulty: 1, strokeCount: 3, category: 'あ行', 
              features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.7 } }
        ];
        
        return minimalData.map(data => 
            new HiraganaCharacter(data.char, data.reading, data.difficulty, data.strokeCount, data.category, data.features)
        );
    }

    /**
     * フォールバック文字セットを作成
     * @param {Array} fallbackData フォールバックデータ
     * @returns {Array<HiraganaCharacter>} フォールバック文字セット
     */
    createFallbackCharacters(fallbackData) {
        try {
            return fallbackData.map(data => 
                new HiraganaCharacter(
                    data.char, 
                    data.reading, 
                    data.difficulty, 
                    data.strokeCount, 
                    data.category, 
                    data.features || {}
                )
            );
        } catch (error) {
            console.error('フォールバック文字作成エラー:', error);
            return this.createMinimalCharacterSet();
        }
    }

    /**
     * 全ひらがな文字データを初期化（46文字）
     * @returns {Array<HiraganaCharacter>} ひらがな文字配列
     */
    initializeCharacters() {
        const allHiragana = [
            // あ行 (A-row) - Difficulty 1
            { char: 'あ', reading: 'a', difficulty: 1, strokeCount: 3, category: 'あ行', 
              features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.7 } },
            { char: 'い', reading: 'i', difficulty: 1, strokeCount: 2, category: 'あ行',
              features: { hasHorizontalLine: false, hasVerticalLine: true, hasCurve: true, complexity: 0.4 } },
            { char: 'う', reading: 'u', difficulty: 1, strokeCount: 2, category: 'あ行',
              features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.3 } },
            { char: 'え', reading: 'e', difficulty: 1, strokeCount: 2, category: 'あ行',
              features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.4 } },
            { char: 'お', reading: 'o', difficulty: 1, strokeCount: 3, category: 'あ行',
              features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.6 } },

            // か行 (KA-row) - Difficulty 2
            { char: 'か', reading: 'ka', difficulty: 2, strokeCount: 3, category: 'か行',
              features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: false, complexity: 0.6 } },
            { char: 'き', reading: 'ki', difficulty: 2, strokeCount: 4, category: 'か行',
              features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.8 } },
            { char: 'く', reading: 'ku', difficulty: 2, strokeCount: 1, category: 'か行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.2 } },
            { char: 'け', reading: 'ke', difficulty: 2, strokeCount: 3, category: 'か行',
              features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.7 } },
            { char: 'こ', reading: 'ko', difficulty: 2, strokeCount: 2, category: 'か行',
              features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: false, complexity: 0.3 } },

            // さ行 (SA-row) - Difficulty 2
            { char: 'さ', reading: 'sa', difficulty: 2, strokeCount: 3, category: 'さ行',
              features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.5 } },
            { char: 'し', reading: 'shi', difficulty: 3, strokeCount: 1, category: 'さ行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.3 } },
            { char: 'す', reading: 'su', difficulty: 2, strokeCount: 2, category: 'さ行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.4 } },
            { char: 'せ', reading: 'se', difficulty: 2, strokeCount: 3, category: 'さ行',
              features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.6 } },
            { char: 'そ', reading: 'so', difficulty: 2, strokeCount: 1, category: 'さ行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.2 } },

            // た行 (TA-row) - Difficulty 2
            { char: 'た', reading: 'ta', difficulty: 2, strokeCount: 4, category: 'た行',
              features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: false, complexity: 0.7 } },
            { char: 'ち', reading: 'chi', difficulty: 2, strokeCount: 2, category: 'た行',
              features: { hasHorizontalLine: false, hasVerticalLine: true, hasCurve: true, complexity: 0.5 } },
            { char: 'つ', reading: 'tsu', difficulty: 2, strokeCount: 1, category: 'た行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.3 } },
            { char: 'て', reading: 'te', difficulty: 2, strokeCount: 1, category: 'た行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.2 } },
            { char: 'と', reading: 'to', difficulty: 2, strokeCount: 2, category: 'た行',
              features: { hasHorizontalLine: false, hasVerticalLine: true, hasCurve: true, complexity: 0.4 } },

            // な行 (NA-row) - Difficulty 2
            { char: 'な', reading: 'na', difficulty: 2, strokeCount: 4, category: 'な行',
              features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.8 } },
            { char: 'に', reading: 'ni', difficulty: 2, strokeCount: 3, category: 'な行',
              features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: false, complexity: 0.5 } },
            { char: 'ぬ', reading: 'nu', difficulty: 2, strokeCount: 2, category: 'な行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.6 } },
            { char: 'ね', reading: 'ne', difficulty: 2, strokeCount: 2, category: 'な行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.5 } },
            { char: 'の', reading: 'no', difficulty: 2, strokeCount: 1, category: 'な行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.2 } },

            // は行 (HA-row) - Difficulty 3
            { char: 'は', reading: 'ha', difficulty: 3, strokeCount: 3, category: 'は行',
              features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.7 } },
            { char: 'ひ', reading: 'hi', difficulty: 3, strokeCount: 1, category: 'は行',
              features: { hasHorizontalLine: false, hasVerticalLine: true, hasCurve: false, complexity: 0.2 } },
            { char: 'ふ', reading: 'fu', difficulty: 3, strokeCount: 4, category: 'は行',
              features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.8 } },
            { char: 'へ', reading: 'he', difficulty: 3, strokeCount: 1, category: 'は行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.1 } },
            { char: 'ほ', reading: 'ho', difficulty: 3, strokeCount: 4, category: 'は行',
              features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.9 } },

            // ま行 (MA-row) - Difficulty 3
            { char: 'ま', reading: 'ma', difficulty: 3, strokeCount: 3, category: 'ま行',
              features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.6 } },
            { char: 'み', reading: 'mi', difficulty: 3, strokeCount: 2, category: 'ま行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.5 } },
            { char: 'む', reading: 'mu', difficulty: 3, strokeCount: 3, category: 'ま行',
              features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.7 } },
            { char: 'め', reading: 'me', difficulty: 3, strokeCount: 2, category: 'ま行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.6 } },
            { char: 'も', reading: 'mo', difficulty: 3, strokeCount: 3, category: 'ま行',
              features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.7 } },

            // や行 (YA-row) - Difficulty 3
            { char: 'や', reading: 'ya', difficulty: 3, strokeCount: 3, category: 'や行',
              features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.6 } },
            { char: 'ゆ', reading: 'yu', difficulty: 3, strokeCount: 2, category: 'や行',
              features: { hasHorizontalLine: false, hasVerticalLine: true, hasCurve: true, complexity: 0.5 } },
            { char: 'よ', reading: 'yo', difficulty: 3, strokeCount: 2, category: 'や行',
              features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.4 } },

            // ら行 (RA-row) - Difficulty 4
            { char: 'ら', reading: 'ra', difficulty: 4, strokeCount: 2, category: 'ら行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.5 } },
            { char: 'り', reading: 'ri', difficulty: 4, strokeCount: 2, category: 'ら行',
              features: { hasHorizontalLine: false, hasVerticalLine: true, hasCurve: true, complexity: 0.4 } },
            { char: 'る', reading: 'ru', difficulty: 4, strokeCount: 1, category: 'ら行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.4 } },
            { char: 'れ', reading: 're', difficulty: 4, strokeCount: 1, category: 'ら行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.3 } },
            { char: 'ろ', reading: 'ro', difficulty: 4, strokeCount: 3, category: 'ら行',
              features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.6 } },

            // わ行 (WA-row) - Difficulty 4
            { char: 'わ', reading: 'wa', difficulty: 4, strokeCount: 3, category: 'わ行',
              features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.6 } },
            { char: 'を', reading: 'wo', difficulty: 4, strokeCount: 3, category: 'わ行',
              features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.7 } },
            { char: 'ん', reading: 'n', difficulty: 4, strokeCount: 1, category: 'わ行',
              features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.2 } }
        ];

        try {
            const characters = allHiragana.map(data => {
                try {
                    return new HiraganaCharacter(data.char, data.reading, data.difficulty, data.strokeCount, data.category, data.features);
                } catch (charError) {
                    console.error(`文字「${data.char}」の作成エラー:`, charError);
                    if (this.errorHandler) {
                        this.errorHandler.logCharacterSelectionDebug('character_creation_error', {
                            character: data.char,
                            error: charError.message
                        });
                    }
                    return null; // 失敗した文字はnullにする
                }
            }).filter(char => char !== null); // nullを除外
            
            if (characters.length === 0) {
                throw new Error('有効な文字が作成できませんでした');
            }
            
            console.log(`文字初期化完了: ${characters.length}/${allHiragana.length}文字`);
            return characters;
            
        } catch (error) {
            console.error('文字配列作成エラー:', error);
            throw new Error(`文字データの初期化に失敗しました: ${error.message}`);
        }
    }

    /**
     * パフォーマンス最適化用のキャッシュを構築
     */
    buildCaches() {
        // 難易度別キャッシュ
        this.characters.forEach(char => {
            const difficulty = char.difficulty;
            if (!this.difficultyCache.has(difficulty)) {
                this.difficultyCache.set(difficulty, []);
            }
            this.difficultyCache.get(difficulty).push(char);
        });

        // カテゴリ別キャッシュ
        this.characters.forEach(char => {
            const category = char.getCategory();
            if (!this.categoryCache.has(category)) {
                this.categoryCache.set(category, []);
            }
            this.categoryCache.get(category).push(char);
        });

        // 文字検索キャッシュ
        this.characters.forEach((char, index) => {
            this.characterLookupCache.set(char.character, { char, index });
        });

        // 新しい画数複雑度レベル別キャッシュを追加
        this.strokeComplexityCache = new Map();
        this.characters.forEach(char => {
            const level = char.getStrokeComplexityLevel ? char.getStrokeComplexityLevel() : 'beginner';
            if (!this.strokeComplexityCache.has(level)) {
                this.strokeComplexityCache.set(level, []);
            }
            this.strokeComplexityCache.get(level).push(char);
        });

        console.log('HiraganaDataService キャッシュ構築完了');
        console.log(`画数複雑度キャッシュ: ${Array.from(this.strokeComplexityCache.keys()).join(', ')}`);
    }

    /**
     * 現在の文字を取得
     * @returns {HiraganaCharacter} 現在選択されている文字
     */
    getCurrentCharacter() {
        try {
            if (!this.isInitialized || this.characters.length === 0) {
                throw new Error('文字データが初期化されていません');
            }
            
            if (this.currentIndex < 0 || this.currentIndex >= this.characters.length) {
                console.warn(`無効なインデックス: ${this.currentIndex}, リセットします`);
                this.currentIndex = 0;
            }
            
            return this.characters[this.currentIndex];
            
        } catch (error) {
            console.error('現在文字取得エラー:', error);
            if (this.errorHandler) {
                const result = this.errorHandler.handleCharacterError(error, {
                    operation: 'selection',
                    method: 'getCurrentCharacter',
                    currentIndex: this.currentIndex,
                    charactersLength: this.characters.length
                });
                
                if (result.fallback) {
                    return result.fallback;
                }
            }
            
            // 最終フォールバック
            return this.createMinimalCharacterSet()[0];
        }
    }

    /**
     * 次の文字に移動
     * @returns {HiraganaCharacter} 次の文字
     */
    getNextCharacter() {
        this.currentIndex = (this.currentIndex + 1) % this.characters.length;
        return this.getCurrentCharacter();
    }

    /**
     * 前の文字に移動
     * @returns {HiraganaCharacter} 前の文字
     */
    getPreviousCharacter() {
        this.currentIndex = this.currentIndex === 0 
            ? this.characters.length - 1 
            : this.currentIndex - 1;
        return this.getCurrentCharacter();
    }

    /**
     * 特定のインデックスの文字を選択
     * @param {number} index 文字のインデックス
     * @returns {HiraganaCharacter|null} 選択された文字、無効なインデックスの場合null
     */
    selectCharacterByIndex(index) {
        if (index >= 0 && index < this.characters.length) {
            this.currentIndex = index;
            return this.getCurrentCharacter();
        }
        return null;
    }

    /**
     * 特定の文字を選択
     * @param {string} character 選択したい文字
     * @returns {HiraganaCharacter|null} 選択された文字、見つからない場合null
     */
    selectCharacter(character) {
        // キャッシュを使用した高速検索
        const cached = this.characterLookupCache.get(character);
        if (cached) {
            this.currentIndex = cached.index;
            return cached.char;
        }
        return null;
    }

    /**
     * 全ての文字を取得
     * @returns {Array<HiraganaCharacter>} 全ひらがな文字配列
     */
    getAllCharacters() {
        return [...this.characters];
    }

    /**
     * 現在のインデックスを取得
     * @returns {number} 現在のインデックス
     */
    getCurrentIndex() {
        return this.currentIndex;
    }

    /**
     * 文字数を取得
     * @returns {number} 総文字数
     */
    getCharacterCount() {
        return this.characters.length;
    }

    /**
     * ランダムな文字を取得（重複回避オプション付き）
     * @param {boolean} excludeRecent 最近選択された文字を除外するか
     * @param {number|null} difficultyFilter 難易度フィルター
     * @returns {HiraganaCharacter} ランダムに選択された文字
     */
    getRandomCharacter(excludeRecent = true, difficultyFilter = null) {
        try {
            if (!this.isInitialized || this.characters.length === 0) {
                throw new Error('文字データが利用できません');
            }

            let availableCharacters = [...this.characters];

            // 難易度フィルターを適用
            if (difficultyFilter !== null) {
                try {
                    availableCharacters = availableCharacters.filter(char => 
                        char.matchesDifficulty && char.matchesDifficulty(difficultyFilter)
                    );
                } catch (filterError) {
                    console.warn('難易度フィルターエラー:', filterError);
                    if (this.errorHandler) {
                        this.errorHandler.logCharacterSelectionDebug('difficulty_filter_error', {
                            difficultyFilter,
                            error: filterError.message
                        });
                    }
                    // フィルターエラーの場合は全文字を使用
                    availableCharacters = [...this.characters];
                }
            }

            // 現在の文字を除外（重複回避）
            if (excludeRecent && availableCharacters.length > 1) {
                try {
                    const currentChar = this.getCurrentCharacter();
                    if (currentChar && currentChar.character) {
                        availableCharacters = availableCharacters.filter(char => 
                            char.character !== currentChar.character
                        );
                    }
                } catch (currentCharError) {
                    console.warn('現在文字除外エラー:', currentCharError);
                    // エラーの場合は除外処理をスキップ
                }
            }

            // 利用可能な文字がない場合のフォールバック
            if (availableCharacters.length === 0) {
                console.warn('利用可能な文字がありません。全文字から選択します。');
                availableCharacters = [...this.characters];
            }

            // ランダム選択
            const randomIndex = Math.floor(Math.random() * availableCharacters.length);
            const selectedChar = availableCharacters[randomIndex];
            
            // 選択された文字のインデックスを更新
            try {
                const originalIndex = this.characters.findIndex(char => 
                    char.character === selectedChar.character
                );
                if (originalIndex !== -1) {
                    this.currentIndex = originalIndex;
                } else {
                    console.warn('選択された文字のインデックスが見つかりません');
                }
            } catch (indexError) {
                console.warn('インデックス更新エラー:', indexError);
            }

            if (this.errorHandler) {
                this.errorHandler.logCharacterSelectionDebug('random_selection_success', {
                    selectedCharacter: selectedChar.character,
                    availableCount: availableCharacters.length,
                    excludeRecent,
                    difficultyFilter
                });
            }

            return selectedChar;

        } catch (error) {
            console.error('ランダム文字選択エラー:', error);
            
            if (this.errorHandler) {
                const result = this.errorHandler.handleCharacterError(error, {
                    operation: 'randomization',
                    method: 'getRandomCharacter',
                    excludeRecent,
                    difficultyFilter,
                    charactersLength: this.characters.length
                });
                
                if (result.fallback) {
                    return result.fallback;
                }
            }
            
            // 最終フォールバック: 最初の文字を返す
            if (this.characters.length > 0) {
                this.currentIndex = 0;
                return this.characters[0];
            }
            
            // 緊急フォールバック
            return this.createMinimalCharacterSet()[0];
        }
    }

    /**
     * 指定された難易度の文字を取得
     * @param {number} difficulty 難易度レベル
     * @returns {Array<HiraganaCharacter>} 指定難易度の文字配列
     */
    getCharactersByDifficulty(difficulty) {
        // キャッシュから高速取得
        return this.difficultyCache.get(difficulty) || [];
    }

    /**
     * 指定されたカテゴリの文字を取得
     * @param {string} category カテゴリ名
     * @returns {Array<HiraganaCharacter>} 指定カテゴリの文字配列
     */
    getCharactersByCategory(category) {
        // キャッシュから高速取得
        return this.categoryCache.get(category) || [];
    }

    /**
     * 全カテゴリを取得
     * @returns {Array<string>} カテゴリ名の配列
     */
    getAllCategories() {
        // キャッシュから高速取得
        return Array.from(this.categoryCache.keys()).sort();
    }

    /**
     * 全難易度レベルを取得
     * @returns {Array<number>} 難易度レベルの配列
     */
    getAllDifficultyLevels() {
        // キャッシュから高速取得
        return Array.from(this.difficultyCache.keys()).sort((a, b) => a - b);
    }

    /**
     * ランダムモードにリセット
     */
    resetToRandomMode() {
        // 最初の文字にリセット（ランダム選択の準備）
        this.currentIndex = 0;
        console.log('ランダムモードにリセットしました');
    }

    /**
     * 文字の詳細情報を取得
     * @param {string} character 文字
     * @returns {Object|null} 文字の詳細情報
     */
    getCharacterDetails(character) {
        // キャッシュを使用した高速検索
        const cached = this.characterLookupCache.get(character);
        return cached ? cached.char.getInfo() : null;
    }

    /**
     * 難易度別の文字数を取得
     * @returns {Object} 難易度別文字数のオブジェクト
     */
    getCharacterCountByDifficulty() {
        const counts = {};
        this.characters.forEach(char => {
            const difficulty = char.difficulty;
            counts[difficulty] = (counts[difficulty] || 0) + 1;
        });
        return counts;
    }

    /**
     * カテゴリ別の文字数を取得
     * @returns {Object} カテゴリ別文字数のオブジェクト
     */
    getCharacterCountByCategory() {
        const counts = {};
        this.characters.forEach(char => {
            const category = char.getCategory();
            counts[category] = (counts[category] || 0) + 1;
        });
        return counts;
    }

    /**
     * メモリ使用量を取得
     * @returns {Object} メモリ使用量情報
     */
    getMemoryUsage() {
        return {
            totalCharacters: this.characters.length,
            difficultyCache: this.difficultyCache.size,
            categoryCache: this.categoryCache.size,
            lookupCache: this.characterLookupCache.size,
            strokeComplexityCache: this.strokeComplexityCache.size,
            isInitialized: this.isInitialized
        };
    }

    /**
     * キャッシュを再構築
     */
    rebuildCaches() {
        this.difficultyCache.clear();
        this.categoryCache.clear();
        this.characterLookupCache.clear();
        this.strokeComplexityCache.clear();
        
        this.buildCaches();
        console.log('HiraganaDataService キャッシュを再構築しました');
    }

    /**
     * メモリクリーンアップ
     */
    cleanup() {
        // 必要に応じてキャッシュをクリア
        if (this.difficultyCache.size > 10) {
            console.log('HiraganaDataService メモリクリーンアップを実行');
            // 基本的なキャッシュは保持
        }
    }

    // ========== 新しい画数・複雑さベースの難易度分類システム ==========

    /**
     * 画数・複雑さに基づく難易度レベルで文字を取得
     * @param {string} level 難易度レベル ('beginner', 'intermediate', 'advanced')
     * @returns {Array<HiraganaCharacter>} 指定レベルの文字配列
     */
    getCharactersByStrokeComplexity(level) {
        try {
            if (!this.isInitialized || this.characters.length === 0) {
                console.warn('文字データが初期化されていません');
                return [];
            }

            const validLevels = ['beginner', 'intermediate', 'advanced'];
            if (!validLevels.includes(level)) {
                console.error(`無効な難易度レベル: ${level}`);
                return [];
            }

            // キャッシュから高速取得
            const cachedCharacters = this.strokeComplexityCache.get(level) || [];
            console.log(`${level}レベルの文字数: ${cachedCharacters.length}`);
            return [...cachedCharacters]; // 配列のコピーを返す

        } catch (error) {
            console.error('画数複雑度による文字取得エラー:', error);
            if (this.errorHandler) {
                this.errorHandler.logCharacterSelectionDebug('stroke_complexity_filter_error', {
                    level,
                    error: error.message
                });
            }
            return [];
        }
    }

    /**
     * 教育的順序で文字を取得
     * @param {string} level 難易度レベル ('beginner', 'intermediate', 'advanced')
     * @returns {Array<HiraganaCharacter>} 教育的順序でソートされた文字配列
     */
    getCharactersInPedagogicalOrder(level) {
        try {
            const characters = this.getCharactersByStrokeComplexity(level);
            
            // 教育的順序でソート
            const sortedCharacters = characters.sort((a, b) => {
                const orderA = a.getPedagogicalOrder ? a.getPedagogicalOrder() : a.strokeCount * 100;
                const orderB = b.getPedagogicalOrder ? b.getPedagogicalOrder() : b.strokeCount * 100;
                return orderA - orderB;
            });

            console.log(`${level}レベルの教育的順序: ${sortedCharacters.map(c => c.character).join(', ')}`);
            return sortedCharacters;

        } catch (error) {
            console.error('教育的順序取得エラー:', error);
            if (this.errorHandler) {
                this.errorHandler.logCharacterSelectionDebug('pedagogical_order_error', {
                    level,
                    error: error.message
                });
            }
            return [];
        }
    }

    /**
     * 指定文字の複雑さスコアを計算
     * @param {string} character 文字
     * @returns {number} 複雑さスコア（0.0-1.0）
     */
    calculateComplexityScore(character) {
        try {
            const cached = this.characterLookupCache.get(character);
            if (cached && cached.char.getComplexityScore) {
                return cached.char.getComplexityScore();
            }

            console.warn(`文字「${character}」が見つかりません`);
            return 0.0;

        } catch (error) {
            console.error('複雑さスコア計算エラー:', error);
            if (this.errorHandler) {
                this.errorHandler.logCharacterSelectionDebug('complexity_calculation_error', {
                    character,
                    error: error.message
                });
            }
            return 0.0;
        }
    }

    /**
     * 画数複雑度レベル別の文字数を取得
     * @returns {Object} レベル別文字数のオブジェクト
     */
    getCharacterCountByStrokeComplexity() {
        try {
            const counts = {
                beginner: 0,
                intermediate: 0,
                advanced: 0
            };

            this.characters.forEach(char => {
                const level = char.getStrokeComplexityLevel ? char.getStrokeComplexityLevel() : 'beginner';
                if (counts.hasOwnProperty(level)) {
                    counts[level]++;
                }
            });

            return counts;

        } catch (error) {
            console.error('画数複雑度別文字数取得エラー:', error);
            return { beginner: 0, intermediate: 0, advanced: 0 };
        }
    }

    /**
     * 画数別の詳細統計を取得
     * @returns {Object} 画数別統計情報
     */
    getStrokeCountStatistics() {
        try {
            const stats = {};

            this.characters.forEach(char => {
                const strokeCount = char.strokeCount;
                if (!stats[strokeCount]) {
                    stats[strokeCount] = {
                        count: 0,
                        characters: [],
                        averageComplexity: 0,
                        level: char.getStrokeComplexityLevel ? char.getStrokeComplexityLevel() : 'unknown'
                    };
                }

                stats[strokeCount].count++;
                stats[strokeCount].characters.push(char.character);
                
                const complexity = char.getComplexityScore ? char.getComplexityScore() : 0;
                stats[strokeCount].averageComplexity = 
                    (stats[strokeCount].averageComplexity * (stats[strokeCount].count - 1) + complexity) / stats[strokeCount].count;
            });

            return stats;

        } catch (error) {
            console.error('画数統計取得エラー:', error);
            return {};
        }
    }

    /**
     * 新しい難易度システムの概要を取得
     * @returns {Object} 難易度システム概要
     */
    getStrokeComplexitySystemOverview() {
        try {
            const overview = {
                beginner: {
                    name: 'はじめて',
                    description: '1-2画の簡単な文字',
                    strokeRange: '1-2画',
                    characters: [],
                    count: 0
                },
                intermediate: {
                    name: 'なれてきた', 
                    description: '3画の文字',
                    strokeRange: '3画',
                    characters: [],
                    count: 0
                },
                advanced: {
                    name: 'じょうず',
                    description: '4画以上の複雑な文字',
                    strokeRange: '4画以上',
                    characters: [],
                    count: 0
                }
            };

            // 各レベルの文字を取得
            Object.keys(overview).forEach(level => {
                const characters = this.getCharactersInPedagogicalOrder(level);
                overview[level].characters = characters.map(char => char.character);
                overview[level].count = characters.length;
            });

            return overview;

        } catch (error) {
            console.error('難易度システム概要取得エラー:', error);
            return {};
        }
    }

    /**
     * 指定レベルの次の推奨文字を取得
     * @param {string} level 難易度レベル
     * @param {string} currentCharacter 現在の文字（除外用）
     * @returns {HiraganaCharacter|null} 次の推奨文字
     */
    getNextRecommendedCharacter(level, currentCharacter = null) {
        try {
            const characters = this.getCharactersInPedagogicalOrder(level);
            
            if (characters.length === 0) {
                return null;
            }

            // 現在の文字の次を取得
            if (currentCharacter) {
                const currentIndex = characters.findIndex(char => char.character === currentCharacter);
                if (currentIndex !== -1 && currentIndex < characters.length - 1) {
                    return characters[currentIndex + 1];
                }
            }

            // 最初の文字を返す
            return characters[0];

        } catch (error) {
            console.error('次の推奨文字取得エラー:', error);
            return null;
        }
    }

    /**
     * レベル内でのランダム文字を取得
     * @param {string} level 難易度レベル
     * @param {string} excludeCharacter 除外する文字
     * @returns {HiraganaCharacter|null} ランダム文字
     */
    getRandomCharacterFromLevel(level, excludeCharacter = null) {
        try {
            let characters = this.getCharactersByStrokeComplexity(level);
            
            // 除外文字がある場合はフィルタリング
            if (excludeCharacter && characters.length > 1) {
                characters = characters.filter(char => char.character !== excludeCharacter);
            }

            if (characters.length === 0) {
                return null;
            }

            const randomIndex = Math.floor(Math.random() * characters.length);
            return characters[randomIndex];

        } catch (error) {
            console.error('レベル内ランダム文字取得エラー:', error);
            return null;
        }
    }
}

