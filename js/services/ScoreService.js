// 採点サービス
export class ScoreService {
    constructor() {
        // 励まし重視の3段階評価システムのメッセージ
        this.feedbackMessages = {
            excellent: {
                primary: ['すごい！', 'とてもじょうず！', 'かんぺき！', 'すばらしい！', 'よくできました！', 'とてもうまい！'],
                secondary: ['この調子でがんばろう！', 'とても上手に書けています！', 'すごいですね！', 'もっと練習してみましょう！', 'つぎの文字もできそうですね！']
            },
            fair: {
                primary: ['いいかんじ！', 'もうすこし！', 'がんばってる！', 'じょうずになってる！', 'いいですね！', 'できてきた！'],
                secondary: ['だんだん上手になっています！', 'つぎはもっとじょうずになるよ！', 'れんしゅうするとうまくなります！', 'とてもがんばっていますね！', 'この調子で続けましょう！']
            },
            poor: {
                primary: ['だいじょうぶ！', 'れんしゅうしよう！', 'つぎはできるよ！', 'がんばろう！', 'やってみよう！', 'チャレンジしよう！'],
                secondary: ['みんな最初は難しいんです', 'ゆっくり書いてみましょう', 'れんしゅうすればきっとできます！', 'あきらめないでがんばろう！', 'いっしょにれんしゅうしましょう！', 'だんだんじょうずになりますよ！']
            }
        };

        // 励まし重視の採点基準（より寛容な設定）
        this.scoringCriteria = {
            excellent: {
                minConfidence: 0.5,  // 0.75 → 0.5 に緩和
                minSimilarity: 0.4,  // 0.8 → 0.4 に緩和
                allowedStrokeDifference: 1  // 0 → 1 に緩和
            },
            fair: {
                minConfidence: 0.2,  // 0.4 → 0.2 に緩和
                minSimilarity: 0.2,  // 0.5 → 0.2 に緩和
                allowedStrokeDifference: 2   // 1 → 2 に緩和
            },
            poor: {
                minConfidence: 0,
                minSimilarity: 0,
                allowedStrokeDifference: Infinity
            }
        };
        
        console.log('ScoreService初期化完了（励まし重視モード）');
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
                    message: '文字が描かれていません',
                    encouragingNote: '描画を試みることが大切です'
                }
            };
        }

        // 描画があれば最低でも「もう少し」レベルを保証
        const hasDrawingAttempt = drawingData.strokes.length > 0;
        let baseScore = hasDrawingAttempt ? 0.3 : 0; // 描画があれば基本スコア0.3を保証

        // 認識結果のチェック
        if (!recognized || !recognized.recognized) {
            // 認識に失敗しても描画があれば励ましのスコアを付与
            const drawingEffortScore = this.calculateDrawingEffortScore(drawingData);
            const encouragingScore = Math.max(baseScore, drawingEffortScore);
            
            return {
                level: encouragingScore >= 0.3 ? 'fair' : 'poor', // 描画があれば最低fair
                confidence: 0,
                score: encouragingScore,
                details: {
                    reason: 'recognition_failed',
                    message: '文字が認識できませんでしたが、がんばって書いてくれました',
                    strokeCount: drawingData.strokes.length,
                    drawingEffort: drawingEffortScore,
                    encouragingNote: '描画の努力を評価します'
                }
            };
        }

        // 基本的な形状チェック
        const shapeScore = this.calculateShapeScore(recognized, drawingData);
        const confidenceScore = recognized.confidence || 0;
        const drawingEffortScore = this.calculateDrawingEffortScore(drawingData);
        
        // 励まし重視の総合スコア計算（努力点を加算）
        const rawScore = (shapeScore * 0.5) + (confidenceScore * 0.3) + (drawingEffortScore * 0.2);
        const totalScore = Math.max(baseScore, rawScore); // 最低スコアを保証
        
        // レベル判定
        const level = this.determineEncouragingLevel(totalScore, recognized, drawingData);
        
        return {
            level: level,
            confidence: confidenceScore,
            score: totalScore,
            details: {
                shapeScore: shapeScore,
                confidenceScore: confidenceScore,
                drawingEffortScore: drawingEffortScore,
                strokeCount: drawingData.strokes.length,
                expectedStrokes: recognized.details?.expectedStrokes || 'unknown',
                similarity: recognized.details?.similarity || 0,
                features: recognized.details?.features || {},
                encouragingNote: '努力を認めて評価しています'
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

        // 点の数による品質評価（より寛容に）
        const totalPoints = drawingData.strokes.reduce((total, stroke) => total + stroke.length, 0);
        if (totalPoints < 5) {
            qualityScore *= 0.7; // 0.5 → 0.7 に緩和
        } else if (totalPoints > 1500) {
            qualityScore *= 0.8; // 0.7 → 0.8 に緩和、閾値も1000→1500に緩和
        }

        // 境界ボックスによる品質評価（より寛容に）
        if (drawingData.boundingBox) {
            const area = drawingData.boundingBox.width * drawingData.boundingBox.height;
            if (area < 50) {
                qualityScore *= 0.8; // 0.6 → 0.8 に緩和、閾値も100→50に緩和
            } else if (area > 80000) {
                qualityScore *= 0.9; // 0.8 → 0.9 に緩和、閾値も50000→80000に緩和
            }

            // アスペクト比の評価（より寛容に）
            const aspectRatio = drawingData.boundingBox.width / drawingData.boundingBox.height;
            if (aspectRatio < 0.2 || aspectRatio > 5) {
                qualityScore *= 0.9; // 0.8 → 0.9 に緩和、範囲も拡大
            }
        }

        return Math.max(0, Math.min(1, qualityScore));
    }

    // 新しいメソッド：描画の努力を評価
    calculateDrawingEffortScore(drawingData) {
        if (!drawingData || !drawingData.strokes) return 0;

        let effortScore = 0;

        // ストローク数による努力評価
        const strokeCount = drawingData.strokes.length;
        if (strokeCount > 0) {
            effortScore += 0.3; // 描画を試みた基本点
            effortScore += Math.min(0.3, strokeCount * 0.1); // ストローク数に応じた加点
        }

        // 描画の複雑さによる努力評価
        const totalPoints = drawingData.strokes.reduce((total, stroke) => total + stroke.length, 0);
        if (totalPoints > 5) {
            effortScore += 0.2; // 一定以上の点数で描画した努力
        }

        // 描画範囲による努力評価
        if (drawingData.boundingBox) {
            const area = drawingData.boundingBox.width * drawingData.boundingBox.height;
            if (area > 100) {
                effortScore += 0.2; // 適切なサイズで描画した努力
            }
        }

        return Math.min(1, effortScore);
    }

    determineEncouragingLevel(totalScore, recognized, drawingData) {
        // 描画があれば最低でも「もう少し」レベルを保証
        const hasDrawingAttempt = drawingData && drawingData.strokes && drawingData.strokes.length > 0;
        
        // よくできました（excellent）の判定（より寛容な基準）
        if (totalScore >= 0.6 && 
            recognized.confidence >= this.scoringCriteria.excellent.minConfidence) {
            
            // ストローク数の差もチェック（より寛容に）
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

        // もう少し（fair）の判定（より寛容な基準）
        if (totalScore >= 0.25 && 
            recognized.confidence >= this.scoringCriteria.fair.minConfidence) {
            return 'fair';
        }

        // 描画があれば最低でも「もう少し」レベル
        if (hasDrawingAttempt && totalScore >= 0.1) {
            return 'fair';
        }

        // がんばろう（poor）- 描画がない場合のみ
        return 'poor';
    }

    generateFeedback(score, recognized, target) {
        const levelMessages = this.feedbackMessages[score.level];
        if (!levelMessages) {
            return this.getEncouragingDefaultFeedback();
        }

        // ランダムにメッセージを選択
        const primaryMessage = levelMessages.primary[
            Math.floor(Math.random() * levelMessages.primary.length)
        ];
        const secondaryMessage = levelMessages.secondary[
            Math.floor(Math.random() * levelMessages.secondary.length)
        ];

        // 建設的なフィードバックを必ず提供
        const constructiveSuggestion = this.getConstructiveSuggestion(score, recognized, target);
        const encouragingNote = this.getEncouragingNote(score, recognized);

        return {
            message: primaryMessage,
            encouragement: secondaryMessage,
            suggestion: constructiveSuggestion,
            encouragingNote: encouragingNote,
            icon: this.getEncouragingIcon(score.level),
            showExample: this.shouldShowExample(score),
            alwaysPositive: true // 常に前向きなフィードバック
        };
    }

    getConstructiveSuggestion(score, recognized, target) {
        const suggestions = {
            excellent: [
                '次の文字も練習してみましょう！',
                'とても上手です！この調子で続けましょう！',
                'すばらしい！他の文字にもチャレンジしてみませんか？',
                'かんぺきです！もっと練習して上達しましょう！'
            ],
            fair: [
                'いいかんじです！もう一度書いてみましょう',
                'だんだん上手になっています！ゆっくり書いてみましょう',
                'がんばっていますね！手本を見ながら練習しましょう',
                'もうすこしです！ストロークを意識してみましょう',
                'じょうずになってきました！この調子で続けましょう'
            ],
            poor: [
                'だいじょうぶ！手本を見て、ゆっくり書いてみましょう',
                'みんな最初は難しいです。一画ずつ丁寧に書いてみましょう',
                'がんばって！大きく書いてみると書きやすいですよ',
                'れんしゅうすればきっとできます！ゆっくりやってみましょう',
                'あきらめないで！いっしょにがんばりましょう'
            ]
        };

        const levelSuggestions = suggestions[score.level] || suggestions.fair;
        
        // 特定の問題に基づく建設的な提案
        if (score.details) {
            if (score.details.reason === 'no_drawing') {
                return 'だいじょうぶ！画面に指で文字を書いてみましょう。ゆっくりでいいですよ！';
            }
            
            if (score.details.reason === 'recognition_failed') {
                return 'がんばって書いてくれました！手本を見ながらもう一度やってみましょう！';
            }
            
            if (score.details.strokeCount !== score.details.expectedStrokes) {
                const diff = score.details.strokeCount - score.details.expectedStrokes;
                if (diff > 0) {
                    return 'たくさん書いてくれました！手本と同じ数の線で書いてみましょう';
                } else {
                    return 'いいかんじです！もう少し線を足してみましょう';
                }
            }
        }

        return levelSuggestions[Math.floor(Math.random() * levelSuggestions.length)];
    }

    // 新しいメソッド：励ましのメモを生成
    getEncouragingNote(score, recognized) {
        const notes = [
            'がんばっていることが伝わります！',
            'れんしゅうする気持ちがすばらしいです！',
            'チャレンジする心が大切です！',
            'だんだん上手になっていますよ！',
            'あきらめずに続けることが大事です！',
            'みんなで応援しています！'
        ];

        // スコアレベルに応じた特別なメモ
        if (score.level === 'excellent') {
            return 'とてもすばらしい出来です！';
        } else if (score.level === 'fair') {
            return 'がんばっている様子がよく分かります！';
        } else {
            return notes[Math.floor(Math.random() * notes.length)];
        }
    }

    getEncouragingIcon(level) {
        const icons = {
            excellent: '🌟', // より励ましの星アイコン
            fair: '😊',      // より前向きな笑顔
            poor: '🙂'       // 中性的だが前向きな表情
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

    getEncouragingDefaultFeedback() {
        return {
            message: 'だいじょうぶ！',
            encouragement: 'みんなで応援しています！れんしゅうすればきっとできますよ！',
            suggestion: 'あきらめないで、いっしょにがんばりましょう！',
            encouragingNote: 'チャレンジする気持ちがすばらしいです！',
            icon: '🙂',
            showExample: true,
            alwaysPositive: true
        };
    }

    // 後方互換性のために残す
    getDefaultFeedback() {
        return this.getEncouragingDefaultFeedback();
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