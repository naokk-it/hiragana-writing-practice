// 採点サービス
export class ScoreService {
    constructor() {
        // 3段階評価システムのメッセージ
        this.feedbackMessages = {
            excellent: {
                primary: ['よくできました！', 'すばらしい！', 'とてもじょうず！', 'かんぺき！'],
                secondary: ['この調子で続けましょう！', 'とても上手に書けています！', 'すごいですね！']
            },
            fair: {
                primary: ['もう少し！', 'あとちょっと！', 'いいかんじです！'],
                secondary: ['もう少し練習すればもっと上手になりますよ！', 'がんばって続けましょう！', 'だんだん上手になっています！']
            },
            poor: {
                primary: ['がんばろう！', 'れんしゅうしよう！', 'つぎはできるよ！'],
                secondary: ['練習すればきっと上手になります！', '手本を見て、ゆっくり書いてみましょう！', 'あきらめないで続けましょう！']
            }
        };

        // 採点基準の設定
        this.scoringCriteria = {
            excellent: {
                minConfidence: 0.75,
                minSimilarity: 0.8,
                allowedStrokeDifference: 0
            },
            fair: {
                minConfidence: 0.4,
                minSimilarity: 0.5,
                allowedStrokeDifference: 1
            },
            poor: {
                minConfidence: 0,
                minSimilarity: 0,
                allowedStrokeDifference: Infinity
            }
        };
        
        console.log('ScoreService初期化完了');
    }

    calculateScore(recognized, target, drawingData = null) {
        // 描画の有無をチェック
        if (!drawingData || !drawingData.strokes || drawingData.strokes.length === 0) {
            return {
                level: 'poor',
                confidence: 0,
                score: 0,
                details: {
                    reason: 'no_drawing',
                    message: '文字が描かれていません'
                }
            };
        }

        // 認識結果のチェック
        if (!recognized || !recognized.recognized) {
            return {
                level: 'poor',
                confidence: 0,
                score: 0,
                details: {
                    reason: 'recognition_failed',
                    message: '文字が認識できませんでした',
                    strokeCount: drawingData.strokes.length
                }
            };
        }

        // 基本的な形状チェック
        const shapeScore = this.calculateShapeScore(recognized, drawingData);
        const confidenceScore = recognized.confidence || 0;
        
        // 総合スコアの計算（重み付き平均）
        const totalScore = (shapeScore * 0.6) + (confidenceScore * 0.4);
        
        // レベル判定
        const level = this.determineLevel(totalScore, recognized, drawingData);
        
        return {
            level: level,
            confidence: confidenceScore,
            score: totalScore,
            details: {
                shapeScore: shapeScore,
                confidenceScore: confidenceScore,
                strokeCount: drawingData.strokes.length,
                expectedStrokes: recognized.details?.expectedStrokes || 'unknown',
                similarity: recognized.details?.similarity || 0,
                features: recognized.details?.features || {}
            }
        };
    }

    calculateShapeScore(recognized, drawingData) {
        let score = 0;
        let factors = 0;

        // ストローク数の評価（30%）
        if (recognized.details && recognized.details.expectedStrokes) {
            const strokeDifference = Math.abs(
                drawingData.strokes.length - recognized.details.expectedStrokes
            );
            const strokeScore = Math.max(0, 1 - (strokeDifference * 0.3));
            score += strokeScore * 0.3;
            factors += 0.3;
        }

        // 類似度の評価（50%）
        if (recognized.details && typeof recognized.details.similarity === 'number') {
            score += recognized.details.similarity * 0.5;
            factors += 0.5;
        }

        // 描画品質の評価（20%）
        const qualityScore = this.calculateDrawingQuality(drawingData);
        score += qualityScore * 0.2;
        factors += 0.2;

        return factors > 0 ? score / factors : 0;
    }

    calculateDrawingQuality(drawingData) {
        if (!drawingData || !drawingData.strokes) return 0;

        let qualityScore = 1.0;

        // 点の数による品質評価
        const totalPoints = drawingData.strokes.reduce((total, stroke) => total + stroke.length, 0);
        if (totalPoints < 10) {
            qualityScore *= 0.5; // 点が少なすぎる
        } else if (totalPoints > 1000) {
            qualityScore *= 0.7; // 点が多すぎる（雑な描画の可能性）
        }

        // 境界ボックスによる品質評価
        if (drawingData.boundingBox) {
            const area = drawingData.boundingBox.width * drawingData.boundingBox.height;
            if (area < 100) {
                qualityScore *= 0.6; // 描画が小さすぎる
            } else if (area > 50000) {
                qualityScore *= 0.8; // 描画が大きすぎる
            }

            // アスペクト比の評価
            const aspectRatio = drawingData.boundingBox.width / drawingData.boundingBox.height;
            if (aspectRatio < 0.3 || aspectRatio > 3) {
                qualityScore *= 0.8; // 極端に細長い、または平たい
            }
        }

        return Math.max(0, Math.min(1, qualityScore));
    }

    determineLevel(totalScore, recognized, drawingData) {
        // よくできました（excellent）の判定
        if (totalScore >= 0.75 && 
            recognized.confidence >= this.scoringCriteria.excellent.minConfidence) {
            
            // ストローク数の差もチェック
            if (recognized.details && recognized.details.expectedStrokes) {
                const strokeDiff = Math.abs(
                    drawingData.strokes.length - recognized.details.expectedStrokes
                );
                if (strokeDiff <= this.scoringCriteria.excellent.allowedStrokeDifference) {
                    return 'excellent';
                }
            } else {
                return 'excellent';
            }
        }

        // もう少し（fair）の判定
        if (totalScore >= 0.4 && 
            recognized.confidence >= this.scoringCriteria.fair.minConfidence) {
            return 'fair';
        }

        // がんばろう（poor）
        return 'poor';
    }

    generateFeedback(score, recognized, target) {
        const levelMessages = this.feedbackMessages[score.level];
        if (!levelMessages) {
            return this.getDefaultFeedback();
        }

        // ランダムにメッセージを選択
        const primaryMessage = levelMessages.primary[
            Math.floor(Math.random() * levelMessages.primary.length)
        ];
        const secondaryMessage = levelMessages.secondary[
            Math.floor(Math.random() * levelMessages.secondary.length)
        ];

        return {
            message: primaryMessage,
            encouragement: secondaryMessage,
            suggestion: this.getSuggestion(score, recognized, target),
            icon: this.getIcon(score.level),
            showExample: this.shouldShowExample(score)
        };
    }

    getSuggestion(score, recognized, target) {
        const suggestions = {
            excellent: [
                '次の文字も練習してみましょう！',
                'とても上手です！',
                null // 提案なしの場合もある
            ],
            fair: [
                '手本を見て、もう一度書いてみましょう',
                'ゆっくり丁寧に書いてみましょう',
                'ストロークの順番を意識してみましょう'
            ],
            poor: [
                '手本を見て、ゆっくり書いてみましょう',
                '一画ずつ丁寧に書いてみましょう',
                '大きく書いてみましょう'
            ]
        };

        const levelSuggestions = suggestions[score.level] || suggestions.fair;
        
        // 特定の問題に基づく提案
        if (score.details) {
            if (score.details.reason === 'no_drawing') {
                return '画面に文字を書いてみましょう';
            }
            
            if (score.details.strokeCount !== score.details.expectedStrokes) {
                const diff = score.details.strokeCount - score.details.expectedStrokes;
                if (diff > 0) {
                    return 'ストロークが多すぎるかもしれません';
                } else {
                    return 'ストロークが足りないかもしれません';
                }
            }
        }

        return levelSuggestions[Math.floor(Math.random() * levelSuggestions.length)];
    }

    getIcon(level) {
        const icons = {
            excellent: '😊',
            fair: '🙂',
            poor: '😐'
        };
        return icons[level] || '🙂';
    }

    shouldShowExample(score) {
        // 「もう少し」「がんばろう」の場合は手本表示を提案
        return score.level === 'fair' || score.level === 'poor';
    }

    getEncouragement(score) {
        // generateFeedbackに統合されたため、後方互換性のために残す
        const feedback = this.generateFeedback(score, null, null);
        return feedback.encouragement;
    }

    getDefaultFeedback() {
        return {
            message: 'がんばりましょう！',
            encouragement: '練習すればきっと上手になります！',
            suggestion: '手本を見て、ゆっくり書いてみましょう',
            icon: '🙂',
            showExample: true
        };
    }

    // デバッグ用：採点の詳細情報を取得
    getScoreAnalysis(score, recognized, drawingData) {
        return {
            finalLevel: score.level,
            totalScore: score.score,
            breakdown: {
                confidence: score.confidence,
                shapeScore: score.details?.shapeScore || 0,
                qualityScore: this.calculateDrawingQuality(drawingData)
            },
            criteria: this.scoringCriteria[score.level],
            recommendations: this.getDetailedRecommendations(score, recognized, drawingData)
        };
    }

    getDetailedRecommendations(score, recognized, drawingData) {
        const recommendations = [];

        if (score.level === 'poor') {
            recommendations.push('基本的な文字の形を確認しましょう');
            recommendations.push('手本をよく見て練習しましょう');
        }

        if (score.details && score.details.strokeCount !== score.details.expectedStrokes) {
            recommendations.push(`ストローク数を確認しましょう（現在: ${score.details.strokeCount}, 期待: ${score.details.expectedStrokes}）`);
        }

        if (score.confidence < 0.5) {
            recommendations.push('文字の形をもう少しはっきりと書きましょう');
        }

        return recommendations;
    }
}