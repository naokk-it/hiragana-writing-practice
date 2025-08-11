/**
 * ランダム化サービス
 * インテリジェントな文字選択とランダム化機能を提供
 */
export class RandomizationService {
    constructor(hiraganaDataService, progressTrackingService = null, errorHandler = null) {
        this.hiraganaDataService = hiraganaDataService;
        this.progressTrackingService = progressTrackingService;
        this.errorHandler = errorHandler;
        this.recentCharacters = []; // 最近選択された文字の履歴
        this.maxRecentHistory = 5; // 履歴保持数
        this.selectionWeights = new Map(); // 文字選択の重み
        this.isInitialized = false;
        this.fallbackMode = false; // フォールバックモードフラグ
        
        try {
            this.initializeWeights();
            this.isInitialized = true;
            console.log('RandomizationService初期化完了');
        } catch (error) {
            this.handleInitializationError(error);
        }
    }

    /**
     * 初期化エラーを処理
     * @param {Error} error 初期化エラー
     */
    handleInitializationError(error) {
        console.error('RandomizationService初期化エラー:', error);
        
        if (this.errorHandler) {
            this.errorHandler.handleCharacterError(error, {
                operation: 'randomization',
                service: 'RandomizationService',
                phase: 'initialization'
            });
        }
        
        // フォールバックモードで初期化
        this.fallbackMode = true;
        this.selectionWeights = new Map();
        this.isInitialized = true;
        console.warn('RandomizationService: フォールバックモードで初期化');
    }

    /**
     * 選択重みを初期化
     */
    initializeWeights() {
        try {
            const allCharacters = this.hiraganaDataService.getAllCharacters();
            
            if (!allCharacters || allCharacters.length === 0) {
                throw new Error('文字データが利用できません');
            }
            
            this.selectionWeights.clear();
            allCharacters.forEach(char => {
                if (char && char.character) {
                    this.selectionWeights.set(char.character, 1.0); // 初期重み
                } else {
                    console.warn('無効な文字データをスキップ:', char);
                }
            });
            
            console.log(`選択重み初期化完了: ${this.selectionWeights.size}文字`);
            
        } catch (error) {
            console.error('重み初期化エラー:', error);
            throw new Error(`選択重みの初期化に失敗しました: ${error.message}`);
        }
    }

    /**
     * 次の文字を選択
     * @param {string|null} currentCharacter 現在の文字
     * @param {Object} preferences 選択設定
     * @returns {HiraganaCharacter} 選択された文字
     */
    selectNextCharacter(currentCharacter = null, preferences = {}) {
        const {
            difficultyFilter = null,
            categoryFilter = null,
            avoidRecent = true,
            useProgressWeighting = true
        } = preferences;

        try {
            if (!this.isInitialized) {
                throw new Error('RandomizationServiceが初期化されていません');
            }

            // フォールバックモードの場合はシンプル選択
            if (this.fallbackMode) {
                return this.performFallbackSelection(currentCharacter, preferences);
            }

            // 利用可能な文字を取得
            let availableCharacters = this.getAvailableCharacters(
                difficultyFilter, 
                categoryFilter, 
                avoidRecent ? currentCharacter : null
            );

            if (availableCharacters.length === 0) {
                console.warn('利用可能な文字がありません。制限を緩和します。');
                // フォールバック: 制限を緩和して再試行
                availableCharacters = this.getAvailableCharacters(difficultyFilter, categoryFilter, null);
            }

            if (availableCharacters.length === 0) {
                console.warn('制限緩和後も文字がありません。全文字から選択します。');
                // 最終フォールバック: 全文字から選択
                availableCharacters = this.hiraganaDataService.getAllCharacters();
            }

            if (availableCharacters.length === 0) {
                throw new Error('選択可能な文字が存在しません');
            }

            // 重み付き選択を実行
            const selectedCharacter = useProgressWeighting && !this.fallbackMode
                ? this.weightedRandomSelection(availableCharacters)
                : this.simpleRandomSelection(availableCharacters);

            // 履歴を更新
            this.updateRecentHistory(selectedCharacter.character);

            // HiraganaDataServiceの現在位置を更新
            try {
                this.hiraganaDataService.selectCharacter(selectedCharacter.character);
            } catch (selectError) {
                console.warn('文字選択位置更新エラー:', selectError);
                // 位置更新に失敗しても選択は続行
            }

            if (this.errorHandler) {
                this.errorHandler.logCharacterSelectionDebug('character_selection_success', {
                    selectedCharacter: selectedCharacter.character,
                    difficulty: selectedCharacter.difficulty,
                    availableCount: availableCharacters.length,
                    preferences,
                    fallbackMode: this.fallbackMode
                });
            }

            console.log(`次の文字選択: ${selectedCharacter.character} (難易度: ${selectedCharacter.difficulty})`);
            return selectedCharacter;

        } catch (error) {
            console.error('文字選択エラー:', error);
            
            if (this.errorHandler) {
                const result = this.errorHandler.handleCharacterError(error, {
                    operation: 'selection',
                    method: 'selectNextCharacter',
                    currentCharacter,
                    preferences,
                    fallbackMode: this.fallbackMode
                });
                
                if (result.fallback) {
                    return result.fallback;
                }
                
                // フォールバックモードに切り替え
                if (!this.fallbackMode) {
                    this.fallbackMode = true;
                    console.log('フォールバックモードに切り替えました');
                    return this.performFallbackSelection(currentCharacter, preferences);
                }
            }
            
            return this.getFallbackCharacter();
        }
    }

    /**
     * 利用可能な文字を取得
     * @param {number|null} difficultyFilter 難易度フィルター
     * @param {string|null} categoryFilter カテゴリフィルター
     * @param {string|null} excludeCharacter 除外する文字
     * @returns {Array<HiraganaCharacter>} 利用可能な文字配列
     */
    getAvailableCharacters(difficultyFilter, categoryFilter, excludeCharacter) {
        let characters = this.hiraganaDataService.getAllCharacters();

        // 難易度フィルター
        if (difficultyFilter !== null) {
            characters = characters.filter(char => char.matchesDifficulty(difficultyFilter));
        }

        // カテゴリフィルター
        if (categoryFilter !== null) {
            characters = characters.filter(char => char.isInCategory(categoryFilter));
        }

        // 現在の文字を除外
        if (excludeCharacter) {
            characters = characters.filter(char => char.character !== excludeCharacter);
        }

        // 最近の文字を除外（重複回避）
        characters = characters.filter(char => 
            !this.recentCharacters.includes(char.character)
        );

        return characters;
    }

    /**
     * 重み付きランダム選択
     * @param {Array<HiraganaCharacter>} characters 選択候補の文字
     * @returns {HiraganaCharacter} 選択された文字
     */
    weightedRandomSelection(characters) {
        try {
            if (!characters || characters.length === 0) {
                console.warn('重み付き選択: 文字配列が空です');
                return this.getFallbackCharacter();
            }

            if (characters.length === 1) {
                return characters[0];
            }

            // 各文字の重みを計算
            const weightedCharacters = characters.map(char => {
                try {
                    return {
                        character: char,
                        weight: this.calculateSelectionWeight(char)
                    };
                } catch (weightError) {
                    console.warn(`文字「${char.character}」の重み計算エラー:`, weightError);
                    if (this.errorHandler) {
                        this.errorHandler.logCharacterSelectionDebug('weight_calculation_error', {
                            character: char.character,
                            error: weightError.message
                        });
                    }
                    return {
                        character: char,
                        weight: 1.0 // デフォルト重み
                    };
                }
            });

            // 重みの合計を計算
            const totalWeight = weightedCharacters.reduce((sum, item) => {
                const weight = isNaN(item.weight) ? 1.0 : item.weight;
                return sum + Math.max(0.1, weight); // 最小重み0.1を保証
            }, 0);

            if (totalWeight === 0 || isNaN(totalWeight)) {
                console.warn('重み付き選択: 総重みが無効です。シンプル選択にフォールバック');
                return this.simpleRandomSelection(characters);
            }

            // 重み付きランダム選択
            let random = Math.random() * totalWeight;
            for (const item of weightedCharacters) {
                const weight = Math.max(0.1, isNaN(item.weight) ? 1.0 : item.weight);
                random -= weight;
                if (random <= 0) {
                    return item.character;
                }
            }

            // フォールバック
            console.warn('重み付き選択: ランダム選択が完了しませんでした');
            return weightedCharacters[weightedCharacters.length - 1].character;

        } catch (error) {
            console.error('重み付き選択エラー:', error);
            
            if (this.errorHandler) {
                this.errorHandler.handleCharacterError(error, {
                    operation: 'randomization',
                    method: 'weightedRandomSelection',
                    charactersCount: characters ? characters.length : 0
                });
            }
            
            // シンプル選択にフォールバック
            return this.simpleRandomSelection(characters);
        }
    }

    /**
     * シンプルなランダム選択
     * @param {Array<HiraganaCharacter>} characters 選択候補の文字
     * @returns {HiraganaCharacter} 選択された文字
     */
    simpleRandomSelection(characters) {
        try {
            if (!characters || characters.length === 0) {
                console.warn('シンプル選択: 文字配列が空です');
                return this.getFallbackCharacter();
            }

            const randomIndex = Math.floor(Math.random() * characters.length);
            
            if (randomIndex < 0 || randomIndex >= characters.length) {
                console.warn(`シンプル選択: 無効なインデックス ${randomIndex}`);
                return characters[0];
            }

            const selectedCharacter = characters[randomIndex];
            
            if (!selectedCharacter) {
                console.warn('シンプル選択: 選択された文字がnullです');
                return this.getFallbackCharacter();
            }

            return selectedCharacter;

        } catch (error) {
            console.error('シンプル選択エラー:', error);
            
            if (this.errorHandler) {
                this.errorHandler.handleCharacterError(error, {
                    operation: 'randomization',
                    method: 'simpleRandomSelection',
                    charactersCount: characters ? characters.length : 0
                });
            }
            
            return this.getFallbackCharacter();
        }
    }

    /**
     * 文字の選択重みを計算
     * @param {HiraganaCharacter} character 文字
     * @returns {number} 選択重み
     */
    calculateSelectionWeight(character) {
        let weight = this.selectionWeights.get(character.character) || 1.0;

        // 進捗データがある場合は進捗を考慮
        if (this.progressTrackingService) {
            const progress = this.progressTrackingService.getCharacterProgress(character.character);
            
            if (progress) {
                // 練習回数が少ない文字の重みを上げる
                const attemptCount = progress.getAttemptCount();
                if (attemptCount === 0) {
                    weight *= 2.0; // 未練習の文字は重みを2倍
                } else if (attemptCount < 3) {
                    weight *= 1.5; // 練習回数が少ない文字は重みを1.5倍
                }

                // 平均スコアが低い文字の重みを上げる
                const averageScore = progress.getAverageScore();
                if (averageScore < 0.5) {
                    weight *= 1.8; // スコアが低い文字は重みを上げる
                } else if (averageScore < 0.7) {
                    weight *= 1.3;
                }

                // 最後の練習からの時間を考慮
                const lastPracticeTime = progress.getLastPracticeTime();
                if (lastPracticeTime) {
                    const timeSinceLastPractice = Date.now() - lastPracticeTime;
                    const daysSince = timeSinceLastPractice / (1000 * 60 * 60 * 24);
                    
                    if (daysSince > 7) {
                        weight *= 1.6; // 1週間以上練習していない文字
                    } else if (daysSince > 3) {
                        weight *= 1.3; // 3日以上練習していない文字
                    }
                }
            } else {
                // 進捗データがない（未練習）文字は重みを大幅に上げる
                weight *= 2.5;
            }
        }

        return Math.max(0.1, weight); // 最小重み0.1を保証
    }

    /**
     * 選択重みを更新
     * @param {Object} practiceResults 練習結果
     */
    updateSelectionWeights(practiceResults) {
        const { character, score, difficulty } = practiceResults;

        if (!character) return;

        let currentWeight = this.selectionWeights.get(character) || 1.0;

        // スコアに基づいて重みを調整
        if (score >= 0.8) {
            // 高スコア: 重みを下げる（選択頻度を下げる）
            currentWeight *= 0.8;
        } else if (score < 0.5) {
            // 低スコア: 重みを上げる（選択頻度を上げる）
            currentWeight *= 1.4;
        }

        // 重みの範囲を制限
        currentWeight = Math.max(0.1, Math.min(3.0, currentWeight));
        
        this.selectionWeights.set(character, currentWeight);
        
        console.log(`文字 ${character} の選択重み更新: ${currentWeight.toFixed(2)}`);
    }

    /**
     * 推奨難易度を取得
     * @param {Object} progressData 進捗データ
     * @returns {number} 推奨難易度レベル
     */
    getRecommendedDifficulty(progressData) {
        if (!progressData || !this.progressTrackingService) {
            return 1; // デフォルトは最低難易度
        }

        const allDifficulties = this.hiraganaDataService.getAllDifficultyLevels();
        let recommendedDifficulty = 1;

        // 各難易度レベルの習得状況をチェック
        for (const difficulty of allDifficulties) {
            const charactersAtLevel = this.hiraganaDataService.getCharactersByDifficulty(difficulty);
            let masteredCount = 0;

            charactersAtLevel.forEach(char => {
                const progress = this.progressTrackingService.getCharacterProgress(char.character);
                if (progress && progress.getMasteryLevel() >= 0.7) {
                    masteredCount++;
                }
            });

            const masteryRate = masteredCount / charactersAtLevel.length;
            
            // 70%以上習得していれば次の難易度を推奨
            if (masteryRate >= 0.7) {
                recommendedDifficulty = Math.min(difficulty + 1, Math.max(...allDifficulties));
            } else {
                break;
            }
        }

        return recommendedDifficulty;
    }

    /**
     * 難易度上昇を提案すべきかチェック
     * @param {Object} progressData 進捗データ
     * @returns {boolean} 難易度上昇を提案するか
     */
    shouldSuggestDifficultyIncrease(progressData) {
        const currentDifficulty = this.getCurrentPracticeDifficulty();
        const recommendedDifficulty = this.getRecommendedDifficulty(progressData);
        
        return recommendedDifficulty > currentDifficulty;
    }

    /**
     * 現在の練習難易度を取得
     * @returns {number} 現在の難易度レベル
     */
    getCurrentPracticeDifficulty() {
        const currentChar = this.hiraganaDataService.getCurrentCharacter();
        return currentChar ? currentChar.difficulty : 1;
    }

    /**
     * 最近の履歴を更新
     * @param {string} character 選択された文字
     */
    updateRecentHistory(character) {
        // 既存の履歴から削除
        const index = this.recentCharacters.indexOf(character);
        if (index > -1) {
            this.recentCharacters.splice(index, 1);
        }

        // 先頭に追加
        this.recentCharacters.unshift(character);

        // 履歴サイズを制限
        if (this.recentCharacters.length > this.maxRecentHistory) {
            this.recentCharacters = this.recentCharacters.slice(0, this.maxRecentHistory);
        }
    }

    /**
     * フォールバック選択を実行
     * @param {string|null} currentCharacter 現在の文字
     * @param {Object} preferences 選択設定
     * @returns {HiraganaCharacter} 選択された文字
     */
    performFallbackSelection(currentCharacter, preferences) {
        try {
            console.log('フォールバック選択を実行中...');
            
            // シンプルなランダム選択
            const allCharacters = this.hiraganaDataService.getAllCharacters();
            if (allCharacters.length === 0) {
                return this.getFallbackCharacter();
            }
            
            // 現在の文字を除外（可能であれば）
            let availableCharacters = allCharacters;
            if (currentCharacter && allCharacters.length > 1) {
                availableCharacters = allCharacters.filter(char => 
                    char.character !== currentCharacter
                );
                
                if (availableCharacters.length === 0) {
                    availableCharacters = allCharacters;
                }
            }
            
            const randomIndex = Math.floor(Math.random() * availableCharacters.length);
            const selectedCharacter = availableCharacters[randomIndex];
            
            console.log(`フォールバック選択完了: ${selectedCharacter.character}`);
            return selectedCharacter;
            
        } catch (error) {
            console.error('フォールバック選択エラー:', error);
            return this.getFallbackCharacter();
        }
    }

    /**
     * フォールバック文字を取得
     * @returns {HiraganaCharacter} フォールバック文字
     */
    getFallbackCharacter() {
        try {
            const allCharacters = this.hiraganaDataService.getAllCharacters();
            if (allCharacters && allCharacters.length > 0) {
                return allCharacters[0]; // 最初の文字（あ）
            }
        } catch (error) {
            console.error('フォールバック文字取得エラー:', error);
        }
        
        // 緊急フォールバック: プレーンオブジェクト
        console.warn('緊急フォールバック文字を使用します');
        return {
            character: 'あ',
            reading: 'a',
            difficulty: 1,
            strokeCount: 3,
            category: 'あ行',
            features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.7 },
            matchesDifficulty: (difficulty) => difficulty === 1,
            isInCategory: (category) => category === 'あ行',
            getCategory: () => 'あ行',
            getFeatures: () => ({ hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.7 })
        };
    }

    /**
     * ランダム化設定をリセット
     */
    reset() {
        this.recentCharacters = [];
        this.initializeWeights();
        console.log('RandomizationService設定リセット');
    }

    /**
     * デバッグ情報を取得
     * @returns {Object} デバッグ情報
     */
    getDebugInfo() {
        return {
            recentCharacters: [...this.recentCharacters],
            selectionWeights: Object.fromEntries(this.selectionWeights),
            totalCharacters: this.hiraganaDataService.getCharacterCount(),
            availableDifficulties: this.hiraganaDataService.getAllDifficultyLevels(),
            availableCategories: this.hiraganaDataService.getAllCategories()
        };
    }

    /**
     * 統計情報を取得
     * @returns {Object} 統計情報
     */
    getStatistics() {
        const weights = Array.from(this.selectionWeights.values());
        const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
        const maxWeight = Math.max(...weights);
        const minWeight = Math.min(...weights);

        return {
            averageWeight: avgWeight,
            maxWeight: maxWeight,
            minWeight: minWeight,
            recentHistorySize: this.recentCharacters.length,
            maxHistorySize: this.maxRecentHistory
        };
    }

    /**
     * 練習モードを設定
     * @param {string} mode 練習モード ('random', 'sequential', 'difficulty')
     */
    setPracticeMode(mode) {
        this.practiceMode = mode;
        console.log(`RandomizationService: 練習モード設定 - ${mode}`);
        
        // モードに応じて重みを調整
        switch (mode) {
            case 'difficulty':
                this.adjustWeightsForDifficultyMode();
                break;
            case 'sequential':
                this.resetWeights();
                break;
            case 'random':
            default:
                // ランダムモードでは現在の重みを維持
                break;
        }
    }

    /**
     * 難易度モード用の重み調整
     */
    adjustWeightsForDifficultyMode() {
        const allCharacters = this.hiraganaDataService.getAllCharacters();
        allCharacters.forEach(char => {
            // 難易度が高い文字の重みを下げる
            const difficultyWeight = 1.0 / (char.difficulty || 1);
            this.selectionWeights.set(char.character, difficultyWeight);
        });
    }

    /**
     * 重みをリセット
     */
    resetWeights() {
        const allCharacters = this.hiraganaDataService.getAllCharacters();
        allCharacters.forEach(char => {
            this.selectionWeights.set(char.character, 1.0);
        });
    }

    /**
     * 画数複雑度レベルに基づいて次の文字を選択
     * @param {string} currentCharacter 現在の文字
     * @param {Object} preferences 選択設定
     * @returns {HiraganaCharacter} 選択された文字
     */
    selectNextCharacterByStrokeComplexity(currentCharacter = null, preferences = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('RandomizationServiceが初期化されていません');
            }

            const {
                strokeComplexityLevel = 'beginner',
                avoidRecent = true,
                useProgressWeighting = false
            } = preferences;

            // 指定された画数複雑度レベルの文字を取得
            const availableCharacters = this.hiraganaDataService.getCharactersByStrokeComplexity(strokeComplexityLevel);
            
            if (availableCharacters.length === 0) {
                console.warn(`画数複雑度レベル「${strokeComplexityLevel}」の文字が見つかりません`);
                return this.getFallbackCharacter();
            }

            // 現在の文字を除外
            let filteredCharacters = availableCharacters;
            if (currentCharacter && avoidRecent) {
                filteredCharacters = availableCharacters.filter(char => 
                    char.character !== currentCharacter
                );
                
                if (filteredCharacters.length === 0) {
                    filteredCharacters = availableCharacters;
                }
            }

            // 最近の文字を除外
            if (avoidRecent && this.recentCharacters.length > 0) {
                const withoutRecent = filteredCharacters.filter(char => 
                    !this.recentCharacters.includes(char.character)
                );
                
                if (withoutRecent.length > 0) {
                    filteredCharacters = withoutRecent;
                }
            }

            // 文字を選択
            let selectedCharacter;
            if (useProgressWeighting && this.progressTrackingService) {
                selectedCharacter = this.performWeightedSelection(filteredCharacters);
            } else {
                selectedCharacter = this.simpleRandomSelection(filteredCharacters);
            }

            // 履歴を更新
            try {
                this.updateRecentHistory(selectedCharacter.character);
                this.hiraganaDataService.selectCharacter(selectedCharacter.character);
            } catch (updateError) {
                console.warn('画数複雑度選択後の更新エラー:', updateError);
            }

            if (this.errorHandler) {
                this.errorHandler.logCharacterSelectionDebug('stroke_complexity_selection_success', {
                    selectedCharacter: selectedCharacter.character,
                    strokeComplexityLevel,
                    availableCount: availableCharacters.length,
                    filteredCount: filteredCharacters.length
                });
            }

            console.log(`画数複雑度選択完了: ${selectedCharacter.character} (レベル: ${strokeComplexityLevel})`);
            return selectedCharacter;

        } catch (error) {
            console.error('画数複雑度による文字選択エラー:', error);
            
            if (this.errorHandler) {
                const result = this.errorHandler.handleCharacterError(error, {
                    operation: 'strokeComplexitySelection',
                    method: 'selectNextCharacterByStrokeComplexity',
                    preferences
                });
                
                if (result.fallback) {
                    return result.fallback;
                }
            }
            
            return this.getFallbackCharacter();
        }
    }
}