import { RecognitionService } from '../js/services/RecognitionService.js';

describe('RecognitionService', () => {
    let recognitionService;

    beforeEach(() => {
        recognitionService = new RecognitionService();
    });

    describe('constructor', () => {
        test('should initialize with character templates', () => {
            expect(recognitionService.characterTemplates).toBeDefined();
            expect(recognitionService.characterTemplates.has('あ')).toBe(true);
            expect(recognitionService.isCharacterSupported('か')).toBe(true);
            expect(recognitionService.isCharacterSupported('さ')).toBe(true);
        });

        test('should have proper template structure', async () => {
            const template = await recognitionService.loadCharacterTemplate('あ');
            expect(template.strokeCount).toBe(3);
            expect(template.features).toBeDefined();
            expect(template.features.hasHorizontalLine).toBe(true);
            expect(template.features.hasVerticalLine).toBe(true);
            expect(template.features.hasCurve).toBe(true);
        });
    });

    describe('recognizeCharacter', () => {
        test('should return failure result for empty drawing data', async () => {
            const result = await recognitionService.recognizeCharacter(null);
            
            expect(result.character).toBeNull();
            expect(result.confidence).toBe(0);
            expect(result.recognized).toBe(false);
            expect(result.details).toBe('描画データがありません');
        });

        test('should return failure result for drawing with no strokes', async () => {
            const drawingData = { strokes: [] };
            const result = await recognitionService.recognizeCharacter(drawingData);
            
            expect(result.character).toBeNull();
            expect(result.confidence).toBe(0);
            expect(result.recognized).toBe(false);
        });

        test('should recognize character with valid drawing data', async () => {
            const drawingData = {
                strokes: [
                    [{ x: 10, y: 10 }, { x: 50, y: 10 }], // 水平線
                    [{ x: 30, y: 5 }, { x: 30, y: 60 }],  // 垂直線
                    [{ x: 20, y: 30 }, { x: 40, y: 50 }]  // 斜線
                ],
                boundingBox: { x: 10, y: 5, width: 40, height: 55 }
            };

            const result = await recognitionService.recognizeCharacter(drawingData, 'あ');
            
            expect(result.character).toBe('あ');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.recognized).toBe(true);
            expect(result.details).toBeDefined();
            expect(result.details.strokeCount).toBe(3);
        });

        test('should handle unknown target character', async () => {
            const drawingData = {
                strokes: [[{ x: 10, y: 10 }, { x: 50, y: 50 }]],
                boundingBox: { x: 10, y: 10, width: 40, height: 40 }
            };

            const result = await recognitionService.recognizeCharacter(drawingData, 'unknown');
            
            expect(result.character).toBe('unknown');
            expect(result.confidence).toBe(0.5);
            expect(result.recognized).toBe(true);
        });
    });

    describe('calculateSimilarity', () => {
        test('should return 0 for null inputs', () => {
            const similarity = recognitionService.calculateSimilarity(null, null);
            expect(similarity).toBe(0);
        });

        test('should calculate similarity for matching stroke counts', () => {
            const drawing = {
                strokeCount: 3,
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true },
                complexity: 0.7
            };
            const template = recognitionService.characterTemplates['あ'];
            
            const similarity = recognitionService.calculateSimilarity(drawing, template);
            expect(similarity).toBeGreaterThan(0.5);
        });

        test('should penalize different stroke counts', () => {
            const drawing = {
                strokeCount: 5, // 期待値は3
                features: { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: true },
                complexity: 0.7
            };
            const template = recognitionService.characterTemplates['あ'];
            
            const similarity = recognitionService.calculateSimilarity(drawing, template);
            expect(similarity).toBeLessThan(0.8);
        });
    });

    describe('calculateStrokeSimilarity', () => {
        test('should return 1 for exact match', () => {
            const similarity = recognitionService.calculateStrokeSimilarity(3, 3);
            expect(similarity).toBe(1);
        });

        test('should return 0 for zero expected strokes with non-zero actual', () => {
            const similarity = recognitionService.calculateStrokeSimilarity(3, 0);
            expect(similarity).toBe(0);
        });

        test('should decrease with larger differences', () => {
            const similarity1 = recognitionService.calculateStrokeSimilarity(3, 4);
            const similarity2 = recognitionService.calculateStrokeSimilarity(3, 6);
            expect(similarity1).toBeGreaterThan(similarity2);
        });
    });

    describe('calculateFeatureSimilarity', () => {
        test('should return 0 for null inputs', () => {
            const similarity = recognitionService.calculateFeatureSimilarity(null, null);
            expect(similarity).toBe(0);
        });

        test('should return 1 for identical features', () => {
            const features1 = { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: false };
            const features2 = { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: false };
            
            const similarity = recognitionService.calculateFeatureSimilarity(features1, features2);
            expect(similarity).toBe(1);
        });

        test('should return partial similarity for partially matching features', () => {
            const features1 = { hasHorizontalLine: true, hasVerticalLine: true, hasCurve: false };
            const features2 = { hasHorizontalLine: true, hasVerticalLine: false, hasCurve: false };
            
            const similarity = recognitionService.calculateFeatureSimilarity(features1, features2);
            expect(similarity).toBeCloseTo(2/3, 1);
        });
    });

    describe('calculateComplexitySimilarity', () => {
        test('should return 1 for identical complexity', () => {
            const similarity = recognitionService.calculateComplexitySimilarity(0.7, 0.7);
            expect(similarity).toBe(1);
        });

        test('should return 0.5 for non-numeric inputs', () => {
            const similarity = recognitionService.calculateComplexitySimilarity(null, 0.7);
            expect(similarity).toBe(0.5);
        });

        test('should decrease with larger differences', () => {
            const similarity1 = recognitionService.calculateComplexitySimilarity(0.7, 0.8);
            const similarity2 = recognitionService.calculateComplexitySimilarity(0.7, 1.0);
            expect(similarity1).toBeGreaterThan(similarity2);
        });
    });

    describe('calculateConfidence', () => {
        test('should return 0 for zero stroke count', () => {
            const drawing = { strokeCount: 0, totalPoints: 0 };
            const confidence = recognitionService.calculateConfidence(0.8, drawing, {});
            expect(confidence).toBe(0);
        });

        test('should reduce confidence for too few points', () => {
            const drawing = { strokeCount: 1, totalPoints: 5 };
            const confidence = recognitionService.calculateConfidence(0.8, drawing, {});
            expect(confidence).toBeLessThan(0.8);
        });

        test('should reduce confidence for too many points', () => {
            const drawing = { strokeCount: 1, totalPoints: 1500 };
            const confidence = recognitionService.calculateConfidence(0.8, drawing, {});
            expect(confidence).toBeLessThan(0.8);
        });

        test('should adjust confidence based on bounding box size', () => {
            const smallDrawing = { 
                strokeCount: 1, 
                totalPoints: 50,
                boundingBox: { width: 5, height: 5 }
            };
            const normalDrawing = { 
                strokeCount: 1, 
                totalPoints: 50,
                boundingBox: { width: 100, height: 100 }
            };
            
            const smallConfidence = recognitionService.calculateConfidence(0.8, smallDrawing, {});
            const normalConfidence = recognitionService.calculateConfidence(0.8, normalDrawing, {});
            
            expect(smallConfidence).toBeLessThan(normalConfidence);
        });
    });

    describe('preprocessDrawing', () => {
        test('should return null for invalid input', () => {
            const result = recognitionService.preprocessDrawing(null);
            expect(result).toBeNull();
        });

        test('should extract basic information from drawing data', () => {
            const drawingData = {
                strokes: [
                    [{ x: 10, y: 10 }, { x: 50, y: 10 }],
                    [{ x: 30, y: 5 }, { x: 30, y: 60 }]
                ],
                boundingBox: { x: 10, y: 5, width: 40, height: 55 }
            };

            const result = recognitionService.preprocessDrawing(drawingData);
            
            expect(result.strokeCount).toBe(2);
            expect(result.totalPoints).toBe(4);
            expect(result.normalizedStrokes).toBeDefined();
            expect(result.features).toBeDefined();
            expect(result.complexity).toBeGreaterThanOrEqual(0);
        });
    });

    describe('normalizeStrokes', () => {
        test('should return original strokes for invalid bounding box', () => {
            const strokes = [[{ x: 10, y: 10 }, { x: 50, y: 50 }]];
            const result = recognitionService.normalizeStrokes(strokes, null);
            expect(result).toEqual(strokes);
        });

        test('should normalize coordinates to 0-1 range', () => {
            const strokes = [[{ x: 10, y: 20 }, { x: 50, y: 60 }]];
            const boundingBox = { x: 10, y: 20, width: 40, height: 40 };
            
            const result = recognitionService.normalizeStrokes(strokes, boundingBox);
            
            expect(result[0][0].x).toBe(0);
            expect(result[0][0].y).toBe(0);
            expect(result[0][1].x).toBe(1);
            expect(result[0][1].y).toBe(1);
        });
    });

    describe('extractFeatures', () => {
        test('should detect horizontal lines', () => {
            const strokes = [[
                { x: 0, y: 0.5 },
                { x: 0.2, y: 0.5 },
                { x: 0.4, y: 0.5 }
            ]];
            
            const features = recognitionService.extractFeatures(strokes);
            expect(features.hasHorizontalLine).toBe(true);
        });

        test('should detect vertical lines', () => {
            const strokes = [[
                { x: 0.5, y: 0 },
                { x: 0.5, y: 0.2 },
                { x: 0.5, y: 0.4 }
            ]];
            
            const features = recognitionService.extractFeatures(strokes);
            expect(features.hasVerticalLine).toBe(true);
        });

        test('should detect curves', () => {
            const strokes = [[
                { x: 0, y: 0 },
                { x: 0.5, y: 0.2 },
                { x: 0.3, y: 0.8 }
            ]];
            
            const features = recognitionService.extractFeatures(strokes);
            expect(features.hasCurve).toBe(true);
        });
    });

    describe('calculateComplexity', () => {
        test('should return 0 for empty strokes', () => {
            const complexity = recognitionService.calculateComplexity([]);
            expect(complexity).toBe(0);
        });

        test('should calculate complexity based on length and direction changes', () => {
            const strokes = [[
                { x: 0, y: 0 },
                { x: 0.5, y: 0 },
                { x: 0.5, y: 0.5 },
                { x: 1, y: 0.5 }
            ]];
            
            const complexity = recognitionService.calculateComplexity(strokes);
            expect(complexity).toBeGreaterThan(0);
            expect(complexity).toBeLessThanOrEqual(1);
        });
    });

    describe('integration tests', () => {
        test('should handle complete recognition workflow', async () => {
            const drawingData = {
                strokes: [
                    [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 90, y: 10 }], // 水平線
                    [{ x: 50, y: 5 }, { x: 50, y: 30 }, { x: 50, y: 60 }],  // 垂直線
                    [{ x: 20, y: 40 }, { x: 40, y: 50 }, { x: 60, y: 45 }]  // 曲線
                ],
                boundingBox: { x: 10, y: 5, width: 80, height: 55 }
            };

            const result = await recognitionService.recognizeCharacter(drawingData, 'あ');
            
            expect(result).toBeDefined();
            expect(result.character).toBe('あ');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.recognized).toBe(true);
            expect(result.details.strokeCount).toBe(3);
            expect(result.details.features).toBeDefined();
        });

        test('should handle various handwriting patterns', async () => {
            // テストケース1: 正確な描画
            const accurateDrawing = {
                strokes: [
                    [{ x: 20, y: 20 }, { x: 80, y: 20 }],
                    [{ x: 50, y: 10 }, { x: 50, y: 90 }],
                    [{ x: 30, y: 60 }, { x: 70, y: 60 }]
                ],
                boundingBox: { x: 20, y: 10, width: 60, height: 80 }
            };

            // テストケース2: 雑な描画
            const roughDrawing = {
                strokes: [
                    [{ x: 15, y: 25 }, { x: 85, y: 18 }],
                    [{ x: 48, y: 12 }, { x: 52, y: 88 }],
                    [{ x: 28, y: 65 }, { x: 72, y: 58 }]
                ],
                boundingBox: { x: 15, y: 12, width: 70, height: 76 }
            };

            const accurateResult = await recognitionService.recognizeCharacter(accurateDrawing, 'あ');
            const roughResult = await recognitionService.recognizeCharacter(roughDrawing, 'あ');

            expect(accurateResult.confidence).toBeGreaterThan(roughResult.confidence);
            expect(accurateResult.recognized).toBe(true);
            expect(roughResult.recognized).toBe(true);
        });
    });
});