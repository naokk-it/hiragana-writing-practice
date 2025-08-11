// 文字認識サービス（基本実装）
export class RecognitionService {
    constructor() {
        // 遅延読み込み用のテンプレートキャッシュ
        this.characterTemplates = new Map();
        this.templateLoadPromises = new Map();
        this.isInitialized = false;
        
        // 基本的なテンプレートのみ事前読み込み
        this.preloadBasicTemplates();
        console.log('RecognitionService初期化完了 - 遅延読み込みモード');
    }

    /**
     * 基本的なテンプレートを事前読み込み
     */
    preloadBasicTemplates() {
        // よく使われる基本文字のみ事前読み込み
        const basicCharacters = ['あ', 'い', 'う', 'え', 'お'];
        const allTemplates = this.getAllCharacterTemplateData();
        
        basicCharacters.forEach(char => {
            if (allTemplates[char]) {
                this.characterTemplates.set(char, allTemplates[char]);
            }
        });
        
        this.isInitialized = true;
    }

    /**
     * 文字テンプレートを遅延読み込み
     * @param {string} character 文字
     * @returns {Promise<Object>} テンプレートデータ
     */
    async loadCharacterTemplate(character) {
        // 既にキャッシュされている場合
        if (this.characterTemplates.has(character)) {
            return this.characterTemplates.get(character);
        }

        // 既に読み込み中の場合
        if (this.templateLoadPromises.has(character)) {
            return await this.templateLoadPromises.get(character);
        }

        // 新しい読み込みプロミスを作成
        const loadPromise = this.performTemplateLoad(character);
        this.templateLoadPromises.set(character, loadPromise);

        try {
            const template = await loadPromise;
            this.characterTemplates.set(character, template);
            this.templateLoadPromises.delete(character);
            return template;
        } catch (error) {
            this.templateLoadPromises.delete(character);
            throw error;
        }
    }

    /**
     * テンプレート読み込みを実行
     * @param {string} character 文字
     * @returns {Promise<Object>} テンプレートデータ
     */
    async performTemplateLoad(character) {
        return new Promise((resolve) => {
            // 非同期でテンプレートデータを取得（UIブロックを防ぐ）
            setTimeout(() => {
                const allTemplates = this.getAllCharacterTemplateData();
                const template = allTemplates[character];
                
                if (template) {
                    console.log(`テンプレート読み込み完了: ${character}`);
                    resolve(template);
                } else {
                    console.warn(`テンプレートが見つかりません: ${character}`);
                    resolve(this.createFallbackTemplate(character));
                }
            }, 0);
        });
    }

    /**
     * フォールバックテンプレートを作成
     * @param {string} character 文字
     * @returns {Object} フォールバックテンプレート
     */
    createFallbackTemplate(character) {
        return {
            strokeCount: 2,
            features: { 
                hasHorizontalLine: false, 
                hasVerticalLine: false, 
                hasCurve: true, 
                complexity: 0.5 
            }
        };
    }

    /**
     * 全ひらがな文字のテンプレートデータを取得
     * @returns {Object} 文字テンプレートオブジェクト
     */
    getAllCharacterTemplateData() {
        return {
            // あ行
            'あ': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.7 }
            },
            'い': {
                strokeCount: 2,
                features: { hasHorizontalLine: false, hasVerticalLine: true, hasCurve: true, complexity: 0.4 }
            },
            'う': {
                strokeCount: 2,
                features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.3 }
            },
            'え': {
                strokeCount: 2,
                features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.4 }
            },
            'お': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.6 }
            },

            // か行
            'か': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: false, complexity: 0.6 }
            },
            'き': {
                strokeCount: 4,
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.8 }
            },
            'く': {
                strokeCount: 1,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.2 }
            },
            'け': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.7 }
            },
            'こ': {
                strokeCount: 2,
                features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: false, complexity: 0.3 }
            },

            // さ行
            'さ': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.5 }
            },
            'し': {
                strokeCount: 1,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.3 }
            },
            'す': {
                strokeCount: 2,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.4 }
            },
            'せ': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.6 }
            },
            'そ': {
                strokeCount: 1,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.2 }
            },

            // た行
            'た': {
                strokeCount: 4,
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: false, complexity: 0.7 }
            },
            'ち': {
                strokeCount: 2,
                features: { hasHorizontalLine: false, hasVerticalLine: true, hasCurve: true, complexity: 0.5 }
            },
            'つ': {
                strokeCount: 1,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.3 }
            },
            'て': {
                strokeCount: 1,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.2 }
            },
            'と': {
                strokeCount: 2,
                features: { hasHorizontalLine: false, hasVerticalLine: true, hasCurve: true, complexity: 0.4 }
            },

            // な行
            'な': {
                strokeCount: 4,
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.8 }
            },
            'に': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: false, complexity: 0.5 }
            },
            'ぬ': {
                strokeCount: 2,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.6 }
            },
            'ね': {
                strokeCount: 2,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.5 }
            },
            'の': {
                strokeCount: 1,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.2 }
            },

            // は行
            'は': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.7 }
            },
            'ひ': {
                strokeCount: 1,
                features: { hasHorizontalLine: false, hasVerticalLine: true, hasCurve: false, complexity: 0.2 }
            },
            'ふ': {
                strokeCount: 4,
                features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.8 }
            },
            'へ': {
                strokeCount: 1,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.1 }
            },
            'ほ': {
                strokeCount: 4,
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.9 }
            },

            // ま行
            'ま': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.6 }
            },
            'み': {
                strokeCount: 2,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.5 }
            },
            'む': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.7 }
            },
            'め': {
                strokeCount: 2,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.6 }
            },
            'も': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.7 }
            },

            // や行
            'や': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.6 }
            },
            'ゆ': {
                strokeCount: 2,
                features: { hasHorizontalLine: false, hasVerticalLine: true, hasCurve: true, complexity: 0.5 }
            },
            'よ': {
                strokeCount: 2,
                features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.4 }
            },

            // ら行
            'ら': {
                strokeCount: 2,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.5 }
            },
            'り': {
                strokeCount: 2,
                features: { hasHorizontalLine: false, hasVerticalLine: true, hasCurve: true, complexity: 0.4 }
            },
            'る': {
                strokeCount: 1,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.4 }
            },
            'れ': {
                strokeCount: 1,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.3 }
            },
            'ろ': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.6 }
            },

            // わ行
            'わ': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: true, complexity: 0.6 }
            },
            'を': {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true, complexity: 0.7 }
            },
            'ん': {
                strokeCount: 1,
                features: { hasHorizontalLine: false, hasVerticalLine: false, hasCurve: true, complexity: 0.2 }
            }
        };
    }

    /**
     * 子供向けの寛容な文字認識
     * @param {Object} drawingData 描画データ
     * @param {string} targetCharacter ターゲット文字
     * @returns {Promise<Object>} 認識結果
     */
    async recognizeCharacterForChild(drawingData, targetCharacter = 'あ') {
        try {
            if (!drawingData || drawingData.strokes.length === 0) {
                return {
                    character: null,
                    confidence: 0,
                    recognized: false,
                    details: {
                        message: '描画データがありません',
                        encouragementLevel: 'poor',
                        childFriendlyScore: 0
                    }
                };
            }

            // 子供向け前処理を適用
            const preprocessed = this.preprocessDrawing(drawingData);
            if (!preprocessed) {
                return {
                    character: null,
                    confidence: 0,
                    recognized: false,
                    details: {
                        message: '前処理に失敗しました',
                        encouragementLevel: 'poor',
                        childFriendlyScore: 0
                    }
                };
            }

            // ターゲット文字のテンプレートを遅延読み込み
            const template = await this.loadCharacterTemplate(targetCharacter);
            if (!template) {
                console.warn(`文字テンプレートが見つかりません: ${targetCharacter}`);
                return this.createEncouragingFallback(targetCharacter, preprocessed);
            }

            // 寛容な形状マッチング実行
            const similarity = this.calculateLenientSimilarity(preprocessed, template);
            const confidence = this.calculateEncouragingConfidence(similarity, preprocessed, template);

            const result = {
                character: targetCharacter,
                confidence: confidence,
                recognized: confidence >= 0.2, // 寛容な認識基準
                details: {
                    similarity: similarity,
                    strokeCount: preprocessed.strokeCount,
                    expectedStrokes: template.strokeCount,
                    features: preprocessed.features,
                    childFriendlyScore: confidence,
                    encouragementLevel: this.getEncouragementLevel(confidence),
                    normalizedForChild: true
                }
            };

            console.log('子供向け文字認識実行:', result);
            return result;
            
        } catch (error) {
            console.error('子供向け文字認識エラー:', error);
            return this.handleChildRecognitionError(error, targetCharacter);
        }
    }

    async recognizeCharacter(drawingData, targetCharacter = 'あ') {
        try {
            if (!drawingData || drawingData.strokes.length === 0) {
                return {
                    character: null,
                    confidence: 0,
                    recognized: false,
                    details: '描画データがありません'
                };
            }

            // 描画データの前処理
            const preprocessed = this.preprocessDrawing(drawingData);
            if (!preprocessed) {
                return {
                    character: null,
                    confidence: 0,
                    recognized: false,
                    details: '前処理に失敗しました'
                };
            }

            // ターゲット文字のテンプレートを遅延読み込み
            const template = await this.loadCharacterTemplate(targetCharacter);
            if (!template) {
                console.warn(`文字テンプレートが見つかりません: ${targetCharacter}`);
                return {
                    character: targetCharacter,
                    confidence: 0.5,
                    recognized: true,
                    details: {
                        message: 'テンプレートが見つかりません（デフォルト認識）',
                        fallback: true,
                        strokeCount: preprocessed.strokeCount,
                        expectedStrokes: 'unknown'
                    }
                };
            }

        // 形状マッチング実行
        const similarity = this.calculateSimilarity(preprocessed, template);
        const confidence = this.calculateConfidence(similarity, preprocessed, template);

        const result = {
            character: targetCharacter,
            confidence: confidence,
            recognized: confidence > 0.3,
            details: {
                similarity: similarity,
                strokeCount: preprocessed.strokeCount,
                expectedStrokes: template.strokeCount,
                features: preprocessed.features
            }
        };

            console.log('文字認識実行:', result);
            return result;
            
        } catch (error) {
            console.error('文字認識エラー:', error);
            return this.handleRecognitionError(error, targetCharacter);
        }
    }

    calculateSimilarity(drawing, template) {
        if (!drawing || !template) return 0;

        let similarity = 0;
        let factors = 0;

        // ストローク数の類似度（重要度: 30%）
        const strokeSimilarity = this.calculateStrokeSimilarity(
            drawing.strokeCount, 
            template.strokeCount
        );
        similarity += strokeSimilarity * 0.3;
        factors += 0.3;

        // 形状特徴の類似度（重要度: 50%）
        const featureSimilarity = this.calculateFeatureSimilarity(
            drawing.features, 
            template.features
        );
        similarity += featureSimilarity * 0.5;
        factors += 0.5;

        // 複雑度の類似度（重要度: 20%）
        const complexitySimilarity = this.calculateComplexitySimilarity(
            drawing.complexity, 
            template.features.complexity
        );
        similarity += complexitySimilarity * 0.2;
        factors += 0.2;

        return factors > 0 ? similarity / factors : 0;
    }

    /**
     * 子供向けの寛容な類似度計算
     * @param {Object} drawing 描画データ
     * @param {Object} template テンプレートデータ
     * @returns {number} 寛容な類似度
     */
    calculateLenientSimilarity(drawing, template) {
        if (!drawing || !template) return 0;

        let similarity = 0;
        let factors = 0;

        // ストローク数の類似度（より寛容に、重要度: 20%）
        const strokeSimilarity = this.calculateLenientStrokeSimilarity(
            drawing.strokeCount, 
            template.strokeCount
        );
        similarity += strokeSimilarity * 0.2;
        factors += 0.2;

        // 形状特徴の類似度（より寛容に、重要度: 40%）
        const featureSimilarity = this.calculateLenientFeatureSimilarity(
            drawing.features, 
            template.features
        );
        similarity += featureSimilarity * 0.4;
        factors += 0.4;

        // 複雑度の類似度（より寛容に、重要度: 15%）
        const complexitySimilarity = this.calculateLenientComplexitySimilarity(
            drawing.complexity, 
            template.features.complexity
        );
        similarity += complexitySimilarity * 0.15;
        factors += 0.15;

        // 努力評価（新規、重要度: 25%）
        const effortScore = this.calculateEffortScore(drawing, template);
        similarity += effortScore * 0.25;
        factors += 0.25;

        return factors > 0 ? similarity / factors : 0;
    }

    /**
     * 寛容なストローク数類似度計算
     * @param {number} actualStrokes 実際のストローク数
     * @param {number} expectedStrokes 期待されるストローク数
     * @returns {number} 寛容な類似度
     */
    calculateLenientStrokeSimilarity(actualStrokes, expectedStrokes) {
        if (expectedStrokes === 0) return actualStrokes === 0 ? 1 : 0.5;
        
        const difference = Math.abs(actualStrokes - expectedStrokes);
        
        // より寛容な評価：差が1以下なら高評価
        if (difference === 0) return 1.0;
        if (difference === 1) return 0.8;
        if (difference === 2) return 0.6;
        if (difference <= expectedStrokes) return 0.4;
        
        return 0.2; // 大きく異なっても最低点は保証
    }

    /**
     * 寛容な特徴類似度計算
     * @param {Object} actualFeatures 実際の特徴
     * @param {Object} expectedFeatures 期待される特徴
     * @returns {number} 寛容な類似度
     */
    calculateLenientFeatureSimilarity(actualFeatures, expectedFeatures) {
        if (!actualFeatures || !expectedFeatures) return 0.3; // デフォルト値

        let matches = 0;
        let partialMatches = 0;
        let total = 0;

        // 各特徴の比較（より寛容に）
        for (const feature in expectedFeatures) {
            if (feature === 'complexity') continue;
            
            total++;
            if (actualFeatures[feature] === expectedFeatures[feature]) {
                matches++;
            } else {
                // 部分的マッチも評価（例：曲線があるべきところに直線がある場合）
                if (this.isPartialFeatureMatch(feature, actualFeatures[feature], expectedFeatures[feature])) {
                    partialMatches++;
                }
            }
        }

        if (total === 0) return 0.5;

        // 完全マッチ + 部分マッチの評価
        const fullMatchScore = matches / total;
        const partialMatchScore = (partialMatches / total) * 0.5;
        
        return Math.min(1.0, fullMatchScore + partialMatchScore + 0.2); // 基本点を追加
    }

    /**
     * 部分的特徴マッチをチェック
     * @param {string} feature 特徴名
     * @param {*} actual 実際の値
     * @param {*} expected 期待される値
     * @returns {boolean} 部分マッチするか
     */
    isPartialFeatureMatch(feature, actual, expected) {
        // 線の種類での部分マッチ
        if (feature === 'hasHorizontalLine' || feature === 'hasVerticalLine') {
            // 線があるべきところになくても、他の線があれば部分的にOK
            return actual === true;
        }
        
        if (feature === 'hasCurve') {
            // 曲線があるべきところに直線があっても部分的にOK
            return true;
        }
        
        return false;
    }

    /**
     * 寛容な複雑度類似度計算
     * @param {number} actualComplexity 実際の複雑度
     * @param {number} expectedComplexity 期待される複雑度
     * @returns {number} 寛容な類似度
     */
    calculateLenientComplexitySimilarity(actualComplexity, expectedComplexity) {
        if (typeof actualComplexity !== 'number' || typeof expectedComplexity !== 'number') {
            return 0.6; // デフォルト値（寛容に）
        }

        const difference = Math.abs(actualComplexity - expectedComplexity);
        
        // より寛容な複雑度評価
        if (difference < 0.2) return 1.0;
        if (difference < 0.4) return 0.8;
        if (difference < 0.6) return 0.6;
        
        return 0.4; // 大きく異なっても最低点は保証
    }

    /**
     * 努力スコアを計算
     * @param {Object} drawing 描画データ
     * @param {Object} template テンプレートデータ
     * @returns {number} 努力スコア
     */
    calculateEffortScore(drawing, template) {
        let effortScore = 0;

        // 描画の試行があることを評価
        if (drawing.strokeCount > 0) {
            effortScore += 0.3;
        }

        // 適切な量の描画があることを評価
        if (drawing.totalPoints >= 10) {
            effortScore += 0.2;
        }

        // 描画時間が適切であることを評価
        const drawingSpeed = this.calculateDrawingSpeed(drawing.normalizedStrokes);
        if (drawingSpeed > 0.1 && drawingSpeed < 0.9) {
            effortScore += 0.2;
        }

        // 描画の滑らかさを評価
        const smoothness = this.calculateSmoothness(drawing.normalizedStrokes);
        if (smoothness > 0.3) {
            effortScore += 0.3;
        }

        return Math.min(1.0, effortScore);
    }

    calculateStrokeSimilarity(actualStrokes, expectedStrokes) {
        if (expectedStrokes === 0) return actualStrokes === 0 ? 1 : 0;
        
        const difference = Math.abs(actualStrokes - expectedStrokes);
        const maxDifference = Math.max(actualStrokes, expectedStrokes);
        
        return Math.max(0, 1 - (difference / maxDifference));
    }

    calculateFeatureSimilarity(actualFeatures, expectedFeatures) {
        if (!actualFeatures || !expectedFeatures) return 0;

        let matches = 0;
        let total = 0;

        // 各特徴の比較
        for (const feature in expectedFeatures) {
            if (feature === 'complexity') continue; // 複雑度は別途計算
            
            total++;
            if (actualFeatures[feature] === expectedFeatures[feature]) {
                matches++;
            }
        }

        return total > 0 ? matches / total : 0;
    }

    calculateComplexitySimilarity(actualComplexity, expectedComplexity) {
        if (typeof actualComplexity !== 'number' || typeof expectedComplexity !== 'number') {
            return 0.5; // デフォルト値
        }

        const difference = Math.abs(actualComplexity - expectedComplexity);
        return Math.max(0, 1 - difference);
    }

    calculateConfidence(similarity, drawing, template) {
        // 基本的な信頼度計算
        let confidence = similarity;

        // 描画品質による調整
        if (drawing.strokeCount === 0) {
            confidence = 0;
        } else if (drawing.totalPoints < 10) {
            // 点が少なすぎる場合は信頼度を下げる
            confidence *= 0.5;
        } else if (drawing.totalPoints > 1000) {
            // 点が多すぎる場合も信頼度を下げる
            confidence *= 0.8;
        }

        // 境界ボックスによる調整
        if (drawing.boundingBox) {
            const area = drawing.boundingBox.width * drawing.boundingBox.height;
            if (area < 100) {
                // 描画が小さすぎる
                confidence *= 0.7;
            } else if (area > 50000) {
                // 描画が大きすぎる
                confidence *= 0.8;
            }
        }

        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * 子供向けの励まし重視の信頼度計算
     * @param {number} similarity 類似度
     * @param {Object} drawing 描画データ
     * @param {Object} template テンプレートデータ
     * @returns {number} 励まし重視の信頼度
     */
    calculateEncouragingConfidence(similarity, drawing, template) {
        // ベース信頼度を寛容に設定
        let confidence = similarity;

        // 描画の試行があることを評価（最低保証）
        if (drawing.strokeCount > 0) {
            confidence = Math.max(confidence, 0.25); // 描画があれば最低25%
        }

        // 子供の描画特性を考慮した調整
        const childFriendlyBonus = this.calculateChildFriendlyBonus(drawing, template);
        confidence += childFriendlyBonus;

        // 努力を評価（ストローク数が多い場合）
        if (drawing.strokeCount >= template.strokeCount * 0.5) {
            confidence += 0.1; // 努力ボーナス
        }

        // 形状の基本的な特徴が一致している場合
        if (this.hasBasicShapeMatch(drawing.features, template.features)) {
            confidence += 0.15; // 形状マッチボーナス
        }

        // 描画サイズが適切な場合
        if (drawing.boundingBox && this.isReasonableSize(drawing.boundingBox)) {
            confidence += 0.05; // サイズボーナス
        }

        // 最終的な信頼度を0.2-1.0の範囲に調整（0.2未満は完全失敗のみ）
        if (drawing.strokeCount > 0 && drawing.totalPoints > 5) {
            confidence = Math.max(confidence, 0.2);
        }

        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * 子供向けボーナス計算
     * @param {Object} drawing 描画データ
     * @param {Object} template テンプレートデータ
     * @returns {number} ボーナス値
     */
    calculateChildFriendlyBonus(drawing, template) {
        let bonus = 0;

        // 複雑度が近い場合のボーナス
        const complexityDiff = Math.abs(drawing.complexity - template.features.complexity);
        if (complexityDiff < 0.3) {
            bonus += 0.1;
        }

        // 描画の滑らかさボーナス（震えが少ない）
        const smoothness = this.calculateSmoothness(drawing.normalizedStrokes);
        if (smoothness > 0.6) {
            bonus += 0.05;
        }

        // 描画時間が適切な場合（急ぎすぎず、遅すぎず）
        const drawingSpeed = this.calculateDrawingSpeed(drawing.normalizedStrokes);
        if (drawingSpeed > 0.3 && drawingSpeed < 0.8) {
            bonus += 0.05;
        }

        return bonus;
    }

    /**
     * 基本的な形状マッチをチェック
     * @param {Object} actualFeatures 実際の特徴
     * @param {Object} expectedFeatures 期待される特徴
     * @returns {boolean} 基本マッチするか
     */
    hasBasicShapeMatch(actualFeatures, expectedFeatures) {
        let matches = 0;
        let total = 0;

        // 主要な特徴をチェック
        ['hasHorizontalLine', 'hasVerticalLine', 'hasCurve'].forEach(feature => {
            total++;
            if (actualFeatures[feature] === expectedFeatures[feature]) {
                matches++;
            }
        });

        // 50%以上の特徴が一致すれば基本マッチとみなす
        return (matches / total) >= 0.5;
    }

    /**
     * 描画サイズが適切かチェック
     * @param {Object} boundingBox 境界ボックス
     * @returns {boolean} 適切なサイズか
     */
    isReasonableSize(boundingBox) {
        const area = boundingBox.width * boundingBox.height;
        // 適切なサイズ範囲（小さすぎず、大きすぎず）
        return area >= 500 && area <= 100000;
    }

    /**
     * 描画の滑らかさを計算
     * @param {Array} normalizedStrokes 正規化されたストローク
     * @returns {number} 滑らかさ（0-1）
     */
    calculateSmoothness(normalizedStrokes) {
        if (!normalizedStrokes || normalizedStrokes.length === 0) return 0;

        let totalSmoothness = 0;
        let strokeCount = 0;

        normalizedStrokes.forEach(stroke => {
            if (stroke.length < 3) return;

            let smoothness = 0;
            let segments = 0;

            for (let i = 2; i < stroke.length; i++) {
                const p1 = stroke[i - 2];
                const p2 = stroke[i - 1];
                const p3 = stroke[i];

                // 角度変化を計算
                const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
                let angleDiff = Math.abs(angle1 - angle2);
                
                // 角度差を0-πの範囲に正規化
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

                // 滑らかさスコア（角度変化が小さいほど高い）
                smoothness += 1 - (angleDiff / Math.PI);
                segments++;
            }

            if (segments > 0) {
                totalSmoothness += smoothness / segments;
                strokeCount++;
            }
        });

        return strokeCount > 0 ? totalSmoothness / strokeCount : 0;
    }

    /**
     * 描画速度を計算
     * @param {Array} normalizedStrokes 正規化されたストローク
     * @returns {number} 描画速度（0-1）
     */
    calculateDrawingSpeed(normalizedStrokes) {
        if (!normalizedStrokes || normalizedStrokes.length === 0) return 0;

        let totalDistance = 0;
        let totalTime = 0;

        normalizedStrokes.forEach(stroke => {
            if (stroke.length < 2) return;

            for (let i = 1; i < stroke.length; i++) {
                const prev = stroke[i - 1];
                const curr = stroke[i];

                // 距離を計算
                const distance = Math.sqrt(
                    Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
                );
                totalDistance += distance;

                // 時間差を計算
                if (curr.timestamp && prev.timestamp) {
                    totalTime += curr.timestamp - prev.timestamp;
                }
            }
        });

        if (totalTime === 0) return 0.5; // デフォルト値

        // 速度を正規化（適切な範囲に調整）
        const speed = totalDistance / totalTime;
        return Math.max(0, Math.min(1, speed / 0.01)); // 0.01を基準速度とする
    }

    preprocessDrawing(drawingData) {
        if (!drawingData || !drawingData.strokes) return null;

        // 基本情報の抽出
        const strokeCount = drawingData.strokes.length;
        const totalPoints = drawingData.strokes.reduce((total, stroke) => total + stroke.length, 0);

        // 子供向け正規化処理を適用
        const childNormalizedStrokes = this.normalizeChildDrawing(drawingData.strokes, drawingData.boundingBox);

        // 正規化された座標の計算
        const normalizedStrokes = this.normalizeStrokes(childNormalizedStrokes, drawingData.boundingBox);

        // 形状特徴の抽出
        const features = this.extractFeatures(normalizedStrokes);

        // 複雑度の計算
        const complexity = this.calculateComplexity(normalizedStrokes);

        return {
            normalizedStrokes: normalizedStrokes,
            boundingBox: drawingData.boundingBox,
            strokeCount: strokeCount,
            totalPoints: totalPoints,
            features: features,
            complexity: complexity
        };
    }

    /**
     * 子供の描画特性を考慮した正規化処理
     * @param {Array} strokes 元のストローク配列
     * @param {Object} boundingBox 境界ボックス
     * @returns {Array} 正規化されたストローク配列
     */
    normalizeChildDrawing(strokes, boundingBox) {
        if (!strokes || strokes.length === 0) return strokes;

        let normalizedStrokes = strokes.map(stroke => [...stroke]); // ディープコピー

        // 1. 震え・揺れの正規化
        normalizedStrokes = this.smoothenTremor(normalizedStrokes);

        // 2. 不完全な線の補完
        normalizedStrokes = this.completeIncompleteLines(normalizedStrokes);

        // 3. 位置偏差の許容（±50%）
        normalizedStrokes = this.adjustPositionTolerance(normalizedStrokes, boundingBox);

        // 4. サイズ変動の正規化（±40%）
        normalizedStrokes = this.normalizeSize(normalizedStrokes, boundingBox);

        return normalizedStrokes;
    }

    /**
     * 震え・揺れを滑らかにする
     * @param {Array} strokes ストローク配列
     * @returns {Array} 滑らかにされたストローク配列
     */
    smoothenTremor(strokes) {
        return strokes.map(stroke => {
            if (stroke.length < 3) return stroke;

            const smoothedStroke = [stroke[0]]; // 最初の点は保持

            for (let i = 1; i < stroke.length - 1; i++) {
                const prev = stroke[i - 1];
                const curr = stroke[i];
                const next = stroke[i + 1];

                // 移動平均を使用して震えを軽減
                const smoothedPoint = {
                    x: (prev.x + curr.x + next.x) / 3,
                    y: (prev.y + curr.y + next.y) / 3,
                    timestamp: curr.timestamp
                };

                // 急激な変化を検出して補正
                const distToPrev = Math.sqrt(
                    Math.pow(smoothedPoint.x - prev.x, 2) + 
                    Math.pow(smoothedPoint.y - prev.y, 2)
                );

                // 距離が小さすぎる場合（震え）は前の点に近づける
                if (distToPrev < 2) {
                    smoothedPoint.x = (prev.x + smoothedPoint.x) / 2;
                    smoothedPoint.y = (prev.y + smoothedPoint.y) / 2;
                }

                smoothedStroke.push(smoothedPoint);
            }

            smoothedStroke.push(stroke[stroke.length - 1]); // 最後の点は保持
            return smoothedStroke;
        });
    }

    /**
     * 不完全な線を補完する
     * @param {Array} strokes ストローク配列
     * @returns {Array} 補完されたストローク配列
     */
    completeIncompleteLines(strokes) {
        return strokes.map(stroke => {
            if (stroke.length < 2) return stroke;

            const completedStroke = [...stroke];
            
            // ストロークの端点間の距離をチェック
            for (let i = 1; i < stroke.length; i++) {
                const prev = stroke[i - 1];
                const curr = stroke[i];
                
                const distance = Math.sqrt(
                    Math.pow(curr.x - prev.x, 2) + 
                    Math.pow(curr.y - prev.y, 2)
                );

                // 大きなギャップがある場合は補間点を追加
                if (distance > 20) {
                    const steps = Math.ceil(distance / 10);
                    const stepX = (curr.x - prev.x) / steps;
                    const stepY = (curr.y - prev.y) / steps;
                    const stepTime = curr.timestamp && prev.timestamp ? 
                        (curr.timestamp - prev.timestamp) / steps : 0;

                    // 補間点を挿入
                    for (let j = 1; j < steps; j++) {
                        const interpolatedPoint = {
                            x: prev.x + stepX * j,
                            y: prev.y + stepY * j,
                            timestamp: prev.timestamp ? prev.timestamp + stepTime * j : undefined
                        };
                        completedStroke.splice(i + j - 1, 0, interpolatedPoint);
                    }
                }
            }

            return completedStroke;
        });
    }

    /**
     * 位置偏差の許容度を調整（±50%）
     * @param {Array} strokes ストローク配列
     * @param {Object} boundingBox 境界ボックス
     * @returns {Array} 調整されたストローク配列
     */
    adjustPositionTolerance(strokes, boundingBox) {
        if (!boundingBox) return strokes;

        const centerX = boundingBox.x + boundingBox.width / 2;
        const centerY = boundingBox.y + boundingBox.height / 2;
        const toleranceX = boundingBox.width * 0.5; // ±50%
        const toleranceY = boundingBox.height * 0.5; // ±50%

        return strokes.map(stroke => {
            return stroke.map(point => {
                // 中心からの偏差を計算
                const deviationX = point.x - centerX;
                const deviationY = point.y - centerY;

                // 許容範囲内に調整
                const adjustedX = centerX + Math.max(-toleranceX, Math.min(toleranceX, deviationX));
                const adjustedY = centerY + Math.max(-toleranceY, Math.min(toleranceY, deviationY));

                return {
                    x: adjustedX,
                    y: adjustedY,
                    timestamp: point.timestamp
                };
            });
        });
    }

    /**
     * サイズ変動を正規化（±40%）
     * @param {Array} strokes ストローク配列
     * @param {Object} boundingBox 境界ボックス
     * @returns {Array} サイズ正規化されたストローク配列
     */
    normalizeSize(strokes, boundingBox) {
        if (!boundingBox || boundingBox.width === 0 || boundingBox.height === 0) {
            return strokes;
        }

        // 標準サイズを定義（適切な文字サイズ）
        const standardSize = 100;
        const currentSize = Math.max(boundingBox.width, boundingBox.height);
        
        // サイズ変動の許容範囲（±40%）
        const minSize = standardSize * 0.6;
        const maxSize = standardSize * 1.4;
        
        // 現在のサイズが許容範囲外の場合は調整
        let scaleFactor = 1;
        if (currentSize < minSize) {
            scaleFactor = minSize / currentSize;
        } else if (currentSize > maxSize) {
            scaleFactor = maxSize / currentSize;
        }

        if (scaleFactor === 1) return strokes;

        // スケール調整を適用
        const centerX = boundingBox.x + boundingBox.width / 2;
        const centerY = boundingBox.y + boundingBox.height / 2;

        return strokes.map(stroke => {
            return stroke.map(point => {
                const relativeX = (point.x - centerX) * scaleFactor;
                const relativeY = (point.y - centerY) * scaleFactor;

                return {
                    x: centerX + relativeX,
                    y: centerY + relativeY,
                    timestamp: point.timestamp
                };
            });
        });
    }

    normalizeStrokes(strokes, boundingBox) {
        if (!boundingBox || boundingBox.width === 0 || boundingBox.height === 0) {
            return strokes;
        }

        // 座標を0-1の範囲に正規化
        return strokes.map(stroke => 
            stroke.map(point => ({
                x: (point.x - boundingBox.x) / boundingBox.width,
                y: (point.y - boundingBox.y) / boundingBox.height,
                timestamp: point.timestamp
            }))
        );
    }

    extractFeatures(normalizedStrokes) {
        const features = {
            hasHorizontalLine: false,
            hasVerticalLine: false,
            hasCurve: false
        };

        normalizedStrokes.forEach(stroke => {
            if (stroke.length < 2) return;

            // 各ストロークの方向性を分析
            for (let i = 1; i < stroke.length; i++) {
                const prev = stroke[i - 1];
                const curr = stroke[i];
                
                const dx = Math.abs(curr.x - prev.x);
                const dy = Math.abs(curr.y - prev.y);

                // 水平線の検出
                if (dx > 0.1 && dy < 0.05) {
                    features.hasHorizontalLine = true;
                }

                // 垂直線の検出
                if (dy > 0.1 && dx < 0.05) {
                    features.hasVerticalLine = true;
                }

                // 曲線の検出（方向変化が大きい場合）
                if (i > 1) {
                    const prev2 = stroke[i - 2];
                    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
                    const angle2 = Math.atan2(prev.y - prev2.y, prev.x - prev2.x);
                    const angleDiff = Math.abs(angle1 - angle2);
                    
                    if (angleDiff > Math.PI / 4) {
                        features.hasCurve = true;
                    }
                }
            }
        });

        return features;
    }

    calculateComplexity(normalizedStrokes) {
        if (normalizedStrokes.length === 0) return 0;

        let totalLength = 0;
        let totalDirectionChanges = 0;

        normalizedStrokes.forEach(stroke => {
            if (stroke.length < 2) return;

            // ストロークの長さを計算
            for (let i = 1; i < stroke.length; i++) {
                const prev = stroke[i - 1];
                const curr = stroke[i];
                const distance = Math.sqrt(
                    Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
                );
                totalLength += distance;
            }

            // 方向変化の回数を計算
            for (let i = 2; i < stroke.length; i++) {
                const p1 = stroke[i - 2];
                const p2 = stroke[i - 1];
                const p3 = stroke[i];
                
                const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
                const angleDiff = Math.abs(angle1 - angle2);
                
                if (angleDiff > Math.PI / 6) { // 30度以上の変化
                    totalDirectionChanges++;
                }
            }
        });

        // 複雑度を0-1の範囲で計算
        const lengthComplexity = Math.min(1, totalLength / 4); // 正規化された長さ
        const changeComplexity = Math.min(1, totalDirectionChanges / 10); // 方向変化
        
        return (lengthComplexity + changeComplexity) / 2;
    }

    // エラーハンドリング
    handleRecognitionError(error, targetCharacter) {
        console.error('RecognitionService エラー処理:', error);
        
        // フォールバック認識結果を返す
        const fallbackResult = {
            character: targetCharacter,
            confidence: 0.3,
            recognized: true,
            details: {
                error: error.message,
                fallback: true,
                similarity: 0.3,
                strokeCount: 0,
                expectedStrokes: 'unknown'
            }
        };
        
        // エラーイベントを発火
        if (this.onError) {
            this.onError({
                type: 'recognition',
                message: error.message,
                service: 'RecognitionService',
                targetCharacter: targetCharacter
            });
        }
        
        return fallbackResult;
    }

    // 安全な前処理
    safePreprocessDrawing(drawingData) {
        try {
            return this.preprocessDrawing(drawingData);
        } catch (error) {
            console.error('前処理エラー:', error);
            
            // 最小限の前処理データを返す
            return {
                normalizedStrokes: drawingData.strokes || [],
                boundingBox: drawingData.boundingBox || { x: 0, y: 0, width: 100, height: 100 },
                strokeCount: drawingData.strokes ? drawingData.strokes.length : 0,
                totalPoints: 0,
                features: {
                    hasHorizontalLine: false,
                    hasVerticalLine: false,
                    hasCurve: false
                },
                complexity: 0.5
            };
        }
    }

    /**
     * フォールバック認識（テンプレートがない文字用）
     * @param {Object} drawingData 描画データ
     * @param {string} targetCharacter ターゲット文字
     * @returns {Object} 認識結果
     */
    fallbackRecognition(drawingData, targetCharacter) {
        const preprocessed = this.safePreprocessDrawing(drawingData);
        
        // 基本的な形状分析に基づく認識
        let confidence = 0.3; // ベース信頼度
        
        // ストローク数による調整
        const strokeCount = preprocessed.strokeCount;
        if (strokeCount >= 1 && strokeCount <= 5) {
            confidence += 0.2;
        }
        
        // 複雑度による調整
        if (preprocessed.complexity > 0.1 && preprocessed.complexity < 0.9) {
            confidence += 0.1;
        }
        
        // 描画品質による調整
        if (preprocessed.totalPoints > 10 && preprocessed.totalPoints < 500) {
            confidence += 0.1;
        }
        
        return {
            character: targetCharacter,
            confidence: Math.min(0.6, confidence), // フォールバックの最大信頼度は0.6
            recognized: confidence > 0.3,
            details: {
                fallback: true,
                strokeCount: strokeCount,
                expectedStrokes: 'unknown',
                similarity: confidence,
                features: preprocessed.features,
                message: 'フォールバック認識を使用'
            }
        };
    }

    /**
     * 全文字のテンプレート情報を取得
     * @returns {Object} テンプレート情報
     */
    getAllTemplateInfo() {
        const templateInfo = {};
        const allTemplates = this.getAllCharacterTemplateData();
        
        Object.keys(allTemplates).forEach(character => {
            const template = allTemplates[character];
            templateInfo[character] = {
                strokeCount: template.strokeCount,
                features: { ...template.features },
                supported: true,
                loaded: this.characterTemplates.has(character)
            };
        });
        
        return templateInfo;
    }

    /**
     * 文字がサポートされているかチェック
     * @param {string} character 文字
     * @returns {boolean} サポートされているか
     */
    isCharacterSupported(character) {
        const allTemplates = this.getAllCharacterTemplateData();
        return allTemplates.hasOwnProperty(character);
    }

    /**
     * サポートされている文字の一覧を取得
     * @returns {Array<string>} サポートされている文字の配列
     */
    getSupportedCharacters() {
        const allTemplates = this.getAllCharacterTemplateData();
        return Object.keys(allTemplates).sort();
    }

    /**
     * 文字の難易度別グループを取得
     * @returns {Object} 難易度別文字グループ
     */
    getCharactersByComplexity() {
        const groups = {
            simple: [],    // complexity < 0.3
            medium: [],    // 0.3 <= complexity < 0.7
            complex: []    // complexity >= 0.7
        };

        const allTemplates = this.getAllCharacterTemplateData();
        Object.keys(allTemplates).forEach(character => {
            const complexity = allTemplates[character].features.complexity;
            
            if (complexity < 0.3) {
                groups.simple.push(character);
            } else if (complexity < 0.7) {
                groups.medium.push(character);
            } else {
                groups.complex.push(character);
            }
        });

        return groups;
    }

    // 状態検証
    validateRecognitionData(drawingData, targetCharacter) {
        const issues = [];
        
        if (!drawingData) {
            issues.push('描画データが提供されていません');
        } else {
            if (!drawingData.strokes || drawingData.strokes.length === 0) {
                issues.push('描画ストロークがありません');
            }
            
            if (drawingData.strokes && drawingData.strokes.length > 20) {
                issues.push('描画ストロークが多すぎます');
            }
        }
        
        if (!targetCharacter) {
            issues.push('ターゲット文字が指定されていません');
        }
        
        if (!this.characterTemplates[targetCharacter]) {
            issues.push(`文字テンプレートが見つかりません: ${targetCharacter}`);
        }
        
        return {
            valid: issues.length === 0,
            issues: issues
        };
    }

    /**
     * メモリ管理: 使用されていないテンプレートをクリア
     * @param {number} maxCacheSize 最大キャッシュサイズ
     */
    cleanupTemplateCache(maxCacheSize = 20) {
        if (this.characterTemplates.size <= maxCacheSize) {
            return;
        }

        // 基本文字は保持
        const basicCharacters = ['あ', 'い', 'う', 'え', 'お'];
        const keysToRemove = [];

        for (const [character] of this.characterTemplates) {
            if (!basicCharacters.includes(character)) {
                keysToRemove.push(character);
            }
        }

        // 古いキャッシュから削除
        const removeCount = this.characterTemplates.size - maxCacheSize;
        for (let i = 0; i < Math.min(removeCount, keysToRemove.length); i++) {
            this.characterTemplates.delete(keysToRemove[i]);
        }

        console.log(`テンプレートキャッシュクリーンアップ: ${removeCount}個削除`);
    }

    /**
     * メモリ使用量を取得
     * @returns {Object} メモリ使用量情報
     */
    getMemoryUsage() {
        return {
            cachedTemplates: this.characterTemplates.size,
            loadingPromises: this.templateLoadPromises.size,
            totalSupported: Object.keys(this.getAllCharacterTemplateData()).length
        };
    }

    /**
     * キャッシュを完全にクリア
     */
    clearCache() {
        this.characterTemplates.clear();
        this.templateLoadPromises.clear();
        
        // 基本テンプレートを再読み込み
        this.preloadBasicTemplates();
        
        console.log('テンプレートキャッシュをクリアしました');
    }

    /**
     * 信頼度に基づく励ましレベルを取得
     * @param {number} confidence 信頼度
     * @returns {string} 励ましレベル
     */
    getEncouragementLevel(confidence) {
        if (confidence >= 0.5) {
            return 'excellent'; // すごい！とてもじょうず！
        } else if (confidence >= 0.2) {
            return 'fair'; // いいかんじ！もうすこし！
        } else {
            return 'poor'; // だいじょうぶ！れんしゅうしよう！
        }
    }

    /**
     * 励ましを重視したフォールバック結果を作成
     * @param {string} targetCharacter ターゲット文字
     * @param {Object} preprocessed 前処理済みデータ
     * @returns {Object} フォールバック結果
     */
    createEncouragingFallback(targetCharacter, preprocessed) {
        // 描画の試行があれば最低でもfairレベル
        const baseConfidence = preprocessed.strokeCount > 0 ? 0.3 : 0.1;
        
        return {
            character: targetCharacter,
            confidence: baseConfidence,
            recognized: baseConfidence >= 0.2,
            details: {
                message: 'テンプレートが見つかりません（励まし重視認識）',
                fallback: true,
                strokeCount: preprocessed.strokeCount,
                expectedStrokes: 'unknown',
                childFriendlyScore: baseConfidence,
                encouragementLevel: this.getEncouragementLevel(baseConfidence),
                normalizedForChild: true
            }
        };
    }

    /**
     * 子供向け認識エラーハンドリング
     * @param {Error} error エラーオブジェクト
     * @param {string} targetCharacter ターゲット文字
     * @returns {Object} エラー時の励まし結果
     */
    handleChildRecognitionError(error, targetCharacter) {
        console.error('子供向けRecognitionService エラー処理:', error);
        
        // エラーが発生しても励ましを提供
        const encouragingResult = {
            character: targetCharacter,
            confidence: 0.25, // エラー時でも最低限の信頼度
            recognized: true,  // 励まし重視で認識成功とする
            details: {
                error: error.message,
                fallback: true,
                similarity: 0.25,
                strokeCount: 0,
                expectedStrokes: 'unknown',
                childFriendlyScore: 0.25,
                encouragementLevel: 'fair', // エラー時でもfairレベル
                normalizedForChild: true,
                message: 'エラーが発生しましたが、がんばりました！'
            }
        };
        
        // エラーイベントを発火
        if (this.onError) {
            this.onError({
                type: 'child-recognition',
                message: error.message,
                service: 'RecognitionService',
                targetCharacter: targetCharacter,
                handledGracefully: true
            });
        }
        
        return encouragingResult;
    }

    /**
     * 角度偏差の許容度を拡大（±30°）
     * @param {number} actualAngle 実際の角度
     * @param {number} expectedAngle 期待される角度
     * @returns {boolean} 許容範囲内かどうか
     */
    isAngleWithinTolerance(actualAngle, expectedAngle) {
        const tolerance = Math.PI / 6; // 30度をラジアンに変換
        let angleDiff = Math.abs(actualAngle - expectedAngle);
        
        // 角度差を0-πの範囲に正規化
        if (angleDiff > Math.PI) {
            angleDiff = 2 * Math.PI - angleDiff;
        }
        
        return angleDiff <= tolerance;
    }

    /**
     * 認識システムの設定を取得
     * @returns {Object} 現在の設定
     */
    getRecognitionSettings() {
        return {
            lenientMode: true,
            confidenceThresholds: {
                excellent: 0.5,
                fair: 0.2,
                poor: 0.0
            },
            tolerances: {
                position: 0.5,  // ±50%
                angle: 30,      // ±30°
                size: 0.4       // ±40%
            },
            childFriendlyFeatures: {
                tremorSmoothing: true,
                lineCompletion: true,
                effortEvaluation: true,
                encouragingFeedback: true
            }
        };
    }
}