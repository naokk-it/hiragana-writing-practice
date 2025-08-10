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

    preprocessDrawing(drawingData) {
        if (!drawingData || !drawingData.strokes) return null;

        // 基本情報の抽出
        const strokeCount = drawingData.strokes.length;
        const totalPoints = drawingData.strokes.reduce((total, stroke) => total + stroke.length, 0);

        // 正規化された座標の計算
        const normalizedStrokes = this.normalizeStrokes(drawingData.strokes, drawingData.boundingBox);

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
}