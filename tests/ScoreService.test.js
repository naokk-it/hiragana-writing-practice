import { ScoreService } from '../js/services/ScoreService.js';

describe('ScoreService', () => {
    let scoreService;

    beforeEach(() => {
        scoreService = new ScoreService();
    });

    describe('constructor', () => {
        test('should initialize with feedback messages', () => {
            expect(scoreService.feedbackMessages).toBeDefined();
            expect(scoreService.feedbackMessages.excellent).toBeDefined();
            expect(scoreService.feedbackMessages.fair).toBeDefined();
            expect(scoreService.feedbackMessages.poor).toBeDefined();
        });

        test('should initialize with scoring criteria', () => {
            expect(scoreService.scoringCriteria).toBeDefined();
            expect(scoreService.scoringCriteria.excellent.minConfidence).toBe(0.5);
            expect(scoreService.scoringCriteria.fair.minConfidence).toBe(0.2);
            expect(scoreService.scoringCriteria.poor.minConfidence).toBe(0);
        });
    });

    describe('calculateScore', () => {
        test('should return poor score for no drawing data', () => {
            const result = scoreService.calculateScore({}, 'あ', null);
            
            expect(result.level).toBe('poor');
            expect(result.confidence).toBe(0);
            expect(result.score).toBe(0);
            expect(result.details.reason).toBe('no_drawing');
        });

        test('should return poor score for empty strokes', () => {
            const drawingData = { strokes: [] };
            const result = scoreService.calculateScore({}, 'あ', drawingData);
            
            expect(result.level).toBe('poor');
            expect(result.confidence).toBe(0);
            expect(result.score).toBe(0);
            expect(result.details.reason).toBe('no_drawing');
        });

        test('should return fair score for failed recognition with drawing attempt', () => {
            const drawingData = { strokes: [[{ x: 10, y: 10 }]] };
            const recognized = { recognized: false };
            
            const result = scoreService.calculateScore(recognized, 'あ', drawingData);
            
            expect(result.level).toBe('fair'); // 描画があれば最低fair
            expect(result.confidence).toBe(0);
            expect(result.score).toBeGreaterThan(0); // 努力点が付与される
            expect(result.details.reason).toBe('recognition_failed');
        });

        test('should calculate score for successful recognition', () => {
            const drawingData = {
                strokes: [
                    [{ x: 10, y: 10 }, { x: 50, y: 10 }],
                    [{ x: 30, y: 5 }, { x: 30, y: 60 }],
                    [{ x: 20, y: 40 }, { x: 40, y: 40 }]
                ],
                boundingBox: { x: 10, y: 5, width: 40, height: 55 }
            };
            const recognized = {
                recognized: true,
                confidence: 0.8,
                details: {
                    similarity: 0.9,
                    expectedStrokes: 3
                }
            };
            
            const result = scoreService.calculateScore(recognized, 'あ', drawingData);
            
            expect(result.level).toBeDefined();
            expect(result.confidence).toBe(0.8);
            expect(result.score).toBeGreaterThan(0);
            expect(result.details.strokeCount).toBe(3);
        });

        test('should return excellent level for high quality drawing', () => {
            const drawingData = {
                strokes: [
                    [{ x: 20, y: 20 }, { x: 80, y: 20 }],
                    [{ x: 50, y: 10 }, { x: 50, y: 90 }],
                    [{ x: 30, y: 60 }, { x: 70, y: 60 }]
                ],
                boundingBox: { x: 20, y: 10, width: 60, height: 80 }
            };
            const recognized = {
                recognized: true,
                confidence: 0.9,
                details: {
                    similarity: 0.95,
                    expectedStrokes: 3
                }
            };
            
            const result = scoreService.calculateScore(recognized, 'あ', drawingData);
            
            expect(result.level).toBe('excellent');
            expect(result.score).toBeGreaterThan(0.75);
        });
    });

    describe('calculateShapeScore', () => {
        test('should calculate shape score based on stroke count and similarity', () => {
            const recognized = {
                details: {
                    similarity: 0.8,
                    expectedStrokes: 3
                }
            };
            const drawingData = {
                strokes: [
                    [{ x: 10, y: 10 }],
                    [{ x: 20, y: 20 }],
                    [{ x: 30, y: 30 }]
                ],
                boundingBox: { x: 10, y: 10, width: 20, height: 20 }
            };
            
            const shapeScore = scoreService.calculateShapeScore(recognized, drawingData);
            
            expect(shapeScore).toBeGreaterThan(0);
            expect(shapeScore).toBeLessThanOrEqual(1);
        });

        test('should handle missing recognition details', () => {
            const recognized = {};
            const drawingData = {
                strokes: [[{ x: 10, y: 10 }]],
                boundingBox: { x: 10, y: 10, width: 20, height: 20 }
            };
            
            const shapeScore = scoreService.calculateShapeScore(recognized, drawingData);
            
            expect(shapeScore).toBeGreaterThanOrEqual(0);
            expect(shapeScore).toBeLessThanOrEqual(1);
        });
    });

    describe('calculateDrawingQuality', () => {
        test('should return 0 for invalid drawing data', () => {
            const quality = scoreService.calculateDrawingQuality(null);
            expect(quality).toBe(0);
        });

        test('should penalize drawings with too few points', () => {
            const drawingData = {
                strokes: [[{ x: 10, y: 10 }]], // 1点のみ
                boundingBox: { x: 10, y: 10, width: 100, height: 100 }
            };
            
            const quality = scoreService.calculateDrawingQuality(drawingData);
            expect(quality).toBeLessThan(1);
        });

        test('should penalize drawings with too many points', () => {
            const manyPoints = Array.from({ length: 1501 }, (_, i) => ({ x: i, y: i }));
            const drawingData = {
                strokes: [manyPoints],
                boundingBox: { x: 0, y: 0, width: 1500, height: 1500 }
            };
            
            const quality = scoreService.calculateDrawingQuality(drawingData);
            expect(quality).toBeLessThan(1);
        });

        test('should penalize very small drawings', () => {
            const drawingData = {
                strokes: [[{ x: 10, y: 10 }, { x: 15, y: 15 }]],
                boundingBox: { x: 10, y: 10, width: 5, height: 5 } // 面積25
            };
            
            const quality = scoreService.calculateDrawingQuality(drawingData);
            expect(quality).toBeLessThan(1);
        });

        test('should penalize very large drawings', () => {
            const drawingData = {
                strokes: [[{ x: 0, y: 0 }, { x: 300, y: 300 }]],
                boundingBox: { x: 0, y: 0, width: 300, height: 300 } // 面積90000
            };
            
            const quality = scoreService.calculateDrawingQuality(drawingData);
            expect(quality).toBeLessThan(1);
        });

        test('should penalize extreme aspect ratios', () => {
            const thinDrawing = {
                strokes: [[{ x: 0, y: 50 }, { x: 100, y: 50 }]],
                boundingBox: { x: 0, y: 50, width: 100, height: 10 } // 細長い
            };
            
            const quality = scoreService.calculateDrawingQuality(thinDrawing);
            expect(quality).toBeLessThan(1);
        });
    });

    describe('calculateDrawingEffortScore', () => {
        test('should return 0 for invalid drawing data', () => {
            const effort = scoreService.calculateDrawingEffortScore(null);
            expect(effort).toBe(0);
        });

        test('should give basic effort score for any drawing attempt', () => {
            const drawingData = {
                strokes: [[{ x: 10, y: 10 }]],
                boundingBox: { x: 10, y: 10, width: 50, height: 50 }
            };
            
            const effort = scoreService.calculateDrawingEffortScore(drawingData);
            expect(effort).toBeGreaterThan(0);
        });

        test('should give higher effort score for more strokes', () => {
            const singleStroke = {
                strokes: [[{ x: 10, y: 10 }]],
                boundingBox: { x: 10, y: 10, width: 50, height: 50 }
            };
            const multipleStrokes = {
                strokes: [[{ x: 10, y: 10 }], [{ x: 20, y: 20 }], [{ x: 30, y: 30 }]],
                boundingBox: { x: 10, y: 10, width: 50, height: 50 }
            };
            
            const effortSingle = scoreService.calculateDrawingEffortScore(singleStroke);
            const effortMultiple = scoreService.calculateDrawingEffortScore(multipleStrokes);
            
            expect(effortMultiple).toBeGreaterThan(effortSingle);
        });

        test('should give effort score for drawing complexity', () => {
            const simpleDrawing = {
                strokes: [[{ x: 10, y: 10 }, { x: 15, y: 15 }]],
                boundingBox: { x: 10, y: 10, width: 50, height: 50 }
            };
            const complexDrawing = {
                strokes: [Array.from({ length: 20 }, (_, i) => ({ x: i * 5, y: i * 5 }))],
                boundingBox: { x: 0, y: 0, width: 100, height: 100 }
            };
            
            const effortSimple = scoreService.calculateDrawingEffortScore(simpleDrawing);
            const effortComplex = scoreService.calculateDrawingEffortScore(complexDrawing);
            
            expect(effortComplex).toBeGreaterThan(effortSimple);
        });
    });

    describe('determineEncouragingLevel', () => {
        test('should return excellent for high scores with good confidence', () => {
            const recognized = {
                confidence: 0.9,
                details: { expectedStrokes: 3 }
            };
            const drawingData = { strokes: [[], [], []] }; // 3ストローク
            
            const level = scoreService.determineEncouragingLevel(0.8, recognized, drawingData);
            expect(level).toBe('excellent');
        });

        test('should return fair for medium scores', () => {
            const recognized = {
                confidence: 0.5,
                details: { expectedStrokes: 3 }
            };
            const drawingData = { strokes: [[], []] }; // 2ストローク
            
            const level = scoreService.determineEncouragingLevel(0.5, recognized, drawingData);
            expect(level).toBe('fair');
        });

        test('should return fair for low scores with drawing attempt', () => {
            const recognized = {
                confidence: 0.2,
                details: { expectedStrokes: 3 }
            };
            const drawingData = { strokes: [[]] }; // 1ストローク
            
            const level = scoreService.determineEncouragingLevel(0.2, recognized, drawingData);
            expect(level).toBe('fair'); // 描画があれば最低fair
        });

        test('should consider stroke count difference for excellent level', () => {
            const recognized = {
                confidence: 0.9,
                details: { expectedStrokes: 3 }
            };
            const drawingDataGood = { strokes: [[], [], []] }; // 正確
            const drawingDataBad = { strokes: [[], [], [], [], []] }; // 多すぎる
            
            const levelGood = scoreService.determineEncouragingLevel(0.8, recognized, drawingDataGood);
            const levelBad = scoreService.determineEncouragingLevel(0.8, recognized, drawingDataBad);
            
            expect(levelGood).toBe('excellent');
            expect(levelBad).not.toBe('excellent');
        });
    });

    describe('generateFeedback', () => {
        test('should generate feedback for excellent level', () => {
            const score = { level: 'excellent', confidence: 0.9 };
            const feedback = scoreService.generateFeedback(score, {}, 'あ');
            
            expect(feedback.message).toBeDefined();
            expect(feedback.encouragement).toBeDefined();
            expect(feedback.icon).toBe('🌟');
            expect(feedback.showExample).toBe(false);
            expect(feedback.alwaysPositive).toBe(true);
        });

        test('should generate feedback for fair level', () => {
            const score = { level: 'fair', confidence: 0.6 };
            const feedback = scoreService.generateFeedback(score, {}, 'あ');
            
            expect(feedback.message).toBeDefined();
            expect(feedback.encouragement).toBeDefined();
            expect(feedback.icon).toBe('😊');
            expect(feedback.showExample).toBe(true);
            expect(feedback.alwaysPositive).toBe(true);
        });

        test('should generate feedback for poor level', () => {
            const score = { level: 'poor', confidence: 0.2 };
            const feedback = scoreService.generateFeedback(score, {}, 'あ');
            
            expect(feedback.message).toBeDefined();
            expect(feedback.encouragement).toBeDefined();
            expect(feedback.icon).toBe('🙂');
            expect(feedback.showExample).toBe(true);
            expect(feedback.alwaysPositive).toBe(true);
        });

        test('should return default feedback for unknown level', () => {
            const score = { level: 'unknown', confidence: 0.5 };
            const feedback = scoreService.generateFeedback(score, {}, 'あ');
            
            expect(feedback.message).toBe('だいじょうぶ！');
            expect(feedback.showExample).toBe(true);
            expect(feedback.alwaysPositive).toBe(true);
        });
    });

    describe('getConstructiveSuggestion', () => {
        test('should provide appropriate suggestions for excellent level', () => {
            const score = { level: 'excellent', details: {} };
            const suggestion = scoreService.getConstructiveSuggestion(score, {}, 'あ');
            
            expect(typeof suggestion).toBe('string');
            expect(suggestion.length).toBeGreaterThan(0);
        });

        test('should suggest viewing example for poor level', () => {
            const score = { level: 'poor', details: {} };
            const suggestion = scoreService.getConstructiveSuggestion(score, {}, 'あ');
            
            expect(suggestion).toBeDefined();
            expect(typeof suggestion).toBe('string');
        });

        test('should provide specific suggestion for no drawing', () => {
            const score = { 
                level: 'poor', 
                details: { reason: 'no_drawing' } 
            };
            const suggestion = scoreService.getConstructiveSuggestion(score, {}, 'あ');
            
            expect(suggestion).toContain('画面に');
        });

        test('should provide stroke count feedback', () => {
            const score = { 
                level: 'fair', 
                details: { 
                    strokeCount: 5, 
                    expectedStrokes: 3 
                } 
            };
            const suggestion = scoreService.getConstructiveSuggestion(score, {}, 'あ');
            
            expect(suggestion).toContain('線');
        });
    });

    describe('getEncouragingIcon', () => {
        test('should return correct icons for each level', () => {
            expect(scoreService.getEncouragingIcon('excellent')).toBe('🌟');
            expect(scoreService.getEncouragingIcon('fair')).toBe('😊');
            expect(scoreService.getEncouragingIcon('poor')).toBe('🙂');
            expect(scoreService.getEncouragingIcon('unknown')).toBe('🙂');
        });
    });

    describe('shouldShowExample', () => {
        test('should return false for excellent level', () => {
            const score = { level: 'excellent' };
            expect(scoreService.shouldShowExample(score)).toBe(false);
        });

        test('should return true for fair level', () => {
            const score = { level: 'fair' };
            expect(scoreService.shouldShowExample(score)).toBe(true);
        });

        test('should return true for poor level', () => {
            const score = { level: 'poor' };
            expect(scoreService.shouldShowExample(score)).toBe(true);
        });
    });

    describe('getScoreAnalysis', () => {
        test('should provide detailed score analysis', () => {
            const score = {
                level: 'fair',
                score: 0.6,
                confidence: 0.7,
                details: { shapeScore: 0.5 }
            };
            const recognized = { confidence: 0.7 };
            const drawingData = {
                strokes: [[{ x: 10, y: 10 }]],
                boundingBox: { x: 10, y: 10, width: 20, height: 20 }
            };
            
            const analysis = scoreService.getScoreAnalysis(score, recognized, drawingData);
            
            expect(analysis.finalLevel).toBe('fair');
            expect(analysis.totalScore).toBe(0.6);
            expect(analysis.breakdown).toBeDefined();
            expect(analysis.criteria).toBeDefined();
            expect(analysis.recommendations).toBeDefined();
        });
    });

    describe('integration tests', () => {
        test('should handle complete scoring workflow', () => {
            const drawingData = {
                strokes: [
                    [{ x: 20, y: 20 }, { x: 80, y: 20 }],
                    [{ x: 50, y: 10 }, { x: 50, y: 90 }],
                    [{ x: 30, y: 60 }, { x: 70, y: 60 }]
                ],
                boundingBox: { x: 20, y: 10, width: 60, height: 80 }
            };
            const recognized = {
                recognized: true,
                confidence: 0.85,
                details: {
                    similarity: 0.9,
                    expectedStrokes: 3
                }
            };
            
            const score = scoreService.calculateScore(recognized, 'あ', drawingData);
            const feedback = scoreService.generateFeedback(score, recognized, 'あ');
            
            expect(score).toBeDefined();
            expect(score.level).toBeDefined();
            expect(feedback).toBeDefined();
            expect(feedback.message).toBeDefined();
            expect(feedback.encouragement).toBeDefined();
        });

        test('should handle various drawing quality scenarios', () => {
            const scenarios = [
                {
                    name: 'perfect drawing',
                    drawingData: {
                        strokes: [
                            Array.from({ length: 20 }, (_, i) => ({ x: i * 5, y: 20 })),
                            Array.from({ length: 20 }, (_, i) => ({ x: 50, y: i * 4 })),
                            Array.from({ length: 20 }, (_, i) => ({ x: 30 + i, y: 60 }))
                        ],
                        boundingBox: { x: 0, y: 0, width: 100, height: 80 }
                    },
                    recognized: {
                        recognized: true,
                        confidence: 0.95,
                        details: { similarity: 0.95, expectedStrokes: 3 }
                    }
                },
                {
                    name: 'rough drawing',
                    drawingData: {
                        strokes: [
                            [{ x: 15, y: 25 }, { x: 85, y: 18 }],
                            [{ x: 48, y: 12 }],
                            [{ x: 28, y: 65 }, { x: 72, y: 58 }]
                        ],
                        boundingBox: { x: 15, y: 12, width: 70, height: 53 }
                    },
                    recognized: {
                        recognized: true,
                        confidence: 0.6,
                        details: { similarity: 0.5, expectedStrokes: 3 }
                    }
                }
            ];

            scenarios.forEach(scenario => {
                const score = scoreService.calculateScore(
                    scenario.recognized, 
                    'あ', 
                    scenario.drawingData
                );
                const feedback = scoreService.generateFeedback(
                    score, 
                    scenario.recognized, 
                    'あ'
                );
                
                expect(score.level).toBeDefined();
                expect(feedback.message).toBeDefined();
                console.log(`${scenario.name}: ${score.level} (${score.score.toFixed(2)})`);
            });
        });
    });

    describe('encouraging scoring system requirements', () => {
        test('should guarantee minimum fair level for any drawing attempt (requirement 1.4)', () => {
            const poorDrawingData = {
                strokes: [[{ x: 10, y: 10 }]], // 最小限の描画
                boundingBox: { x: 10, y: 10, width: 1, height: 1 }
            };
            const failedRecognition = { recognized: false };
            
            const score = scoreService.calculateScore(failedRecognition, 'あ', poorDrawingData);
            
            expect(score.level).toBe('fair'); // 描画があれば最低fair
            expect(score.score).toBeGreaterThan(0);
        });

        test('should provide constructive feedback even for complete failures (requirement 1.6)', () => {
            const noDrawingData = { strokes: [] };
            const noRecognition = { recognized: false };
            
            const score = scoreService.calculateScore(noRecognition, 'あ', noDrawingData);
            const feedback = scoreService.generateFeedback(score, noRecognition, 'あ');
            
            expect(feedback.alwaysPositive).toBe(true);
            expect(feedback.encouragingNote).toBeDefined();
            expect(feedback.suggestion).toContain('だいじょうぶ');
        });

        test('should prioritize encouragement over accuracy (requirement 1.3)', () => {
            const inaccurateDrawing = {
                strokes: [
                    [{ x: 5, y: 5 }], // 不正確な描画
                    [{ x: 10, y: 10 }],
                    [{ x: 15, y: 15 }],
                    [{ x: 20, y: 20 }],
                    [{ x: 25, y: 25 }] // 多すぎるストローク
                ],
                boundingBox: { x: 5, y: 5, width: 20, height: 20 }
            };
            const lowConfidenceRecognition = {
                recognized: true,
                confidence: 0.3, // 低い信頼度
                details: { similarity: 0.3, expectedStrokes: 3 }
            };
            
            const score = scoreService.calculateScore(lowConfidenceRecognition, 'あ', inaccurateDrawing);
            const feedback = scoreService.generateFeedback(score, lowConfidenceRecognition, 'あ');
            
            expect(score.level).toBe('fair'); // 精度が低くても励ましを優先
            expect(feedback.alwaysPositive).toBe(true);
            expect(feedback.encouragingNote).toBeDefined();
        });

        test('should provide positive feedback for reasonable attempts (requirement 1.5)', () => {
            const reasonableDrawing = {
                strokes: [
                    [{ x: 20, y: 20 }, { x: 60, y: 25 }], // 少し不正確
                    [{ x: 40, y: 15 }, { x: 45, y: 70 }],
                    [{ x: 25, y: 50 }, { x: 55, y: 55 }]
                ],
                boundingBox: { x: 20, y: 15, width: 40, height: 55 }
            };
            const moderateRecognition = {
                recognized: true,
                confidence: 0.4,
                details: { similarity: 0.4, expectedStrokes: 3 }
            };
            
            const score = scoreService.calculateScore(moderateRecognition, 'あ', reasonableDrawing);
            
            expect(score.level).not.toBe('poor'); // 合理的な試行は「良い」レベル以上
            expect(score.score).toBeGreaterThan(0.3);
        });

        test('should always provide encouraging notes and constructive suggestions', () => {
            const testCases = [
                { level: 'excellent', confidence: 0.9 },
                { level: 'fair', confidence: 0.5 },
                { level: 'poor', confidence: 0.1 }
            ];

            testCases.forEach(testCase => {
                const score = { level: testCase.level, confidence: testCase.confidence };
                const feedback = scoreService.generateFeedback(score, {}, 'あ');
                
                expect(feedback.encouragingNote).toBeDefined();
                expect(feedback.suggestion).toBeDefined();
                expect(feedback.alwaysPositive).toBe(true);
                expect(feedback.suggestion.length).toBeGreaterThan(0);
            });
        });
    });
});