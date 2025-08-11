import { DataValidationService } from '../js/services/DataValidationService.js';

describe('DataValidationService', () => {
    let validationService;

    beforeEach(() => {
        validationService = new DataValidationService();
    });

    describe('初期化', () => {
        test('正常に初期化される', () => {
            expect(validationService).toBeDefined();
            expect(validationService.validationRules).toBeDefined();
        });

        test('検証ルールが適切に設定される', () => {
            const rules = validationService.validationRules;
            expect(rules.progressTracking).toBeDefined();
            expect(rules.session).toBeDefined();
            expect(rules.characterProgress).toBeDefined();
        });
    });

    describe('進捗追跡データの検証', () => {
        test('有効なデータは検証を通過', () => {
            const validData = {
                characterProgress: {
                    'あ': {
                        character: 'あ',
                        attempts: [
                            { score: 0.8, timestamp: Date.now(), details: {} }
                        ],
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    }
                },
                sessionData: {
                    startTime: null,
                    totalPracticeTime: 300000,
                    sessionsCount: 5
                },
                version: '2.0',
                lastUpdated: Date.now()
            };

            const result = validationService.validateProgressTrackingData(validData);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('無効なデータは検証に失敗', () => {
            const invalidData = {
                characterProgress: {
                    'あ': {
                        character: 'い', // 不整合
                        attempts: 'invalid' // 配列ではない
                    }
                },
                sessionData: {
                    totalPracticeTime: -100, // 負の値
                    sessionsCount: 'invalid' // 数値ではない
                },
                version: 'invalid' // 無効なバージョン形式
            };

            const result = validationService.validateProgressTrackingData(invalidData);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('nullまたはundefinedデータは検証に失敗', () => {
            const result1 = validationService.validateProgressTrackingData(null);
            expect(result1.isValid).toBe(false);

            const result2 = validationService.validateProgressTrackingData(undefined);
            expect(result2.isValid).toBe(false);
        });

        test('必須フィールドが欠落している場合は検証に失敗', () => {
            const incompleteData = {
                characterProgress: {},
                // sessionData が欠落
                // version が欠落
            };

            const result = validationService.validateProgressTrackingData(incompleteData);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('sessionData'))).toBe(true);
            expect(result.errors.some(error => error.includes('version'))).toBe(true);
        });
    });

    describe('文字進捗データの検証', () => {
        test('有効な文字進捗データは検証を通過', () => {
            const validCharacterProgress = {
                'あ': {
                    character: 'あ',
                    attempts: [
                        { score: 0.8, timestamp: Date.now() - 1000 },
                        { score: 0.9, timestamp: Date.now() }
                    ],
                    createdAt: Date.now() - 86400000,
                    updatedAt: Date.now()
                }
            };

            const result = validationService.validateCharacterProgressData(validCharacterProgress);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('文字キーと進捗データの不整合を検出', () => {
            const inconsistentData = {
                'あ': {
                    character: 'い', // 不整合
                    attempts: []
                }
            };

            const result = validationService.validateCharacterProgressData(inconsistentData);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('不整合'))).toBe(true);
        });

        test('無効な試行データを検出', () => {
            const invalidAttempts = {
                'あ': {
                    character: 'あ',
                    attempts: 'not an array'
                }
            };

            const result = validationService.validateCharacterProgressData(invalidAttempts);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('配列ではありません'))).toBe(true);
        });
    });

    describe('試行データの検証', () => {
        test('有効な試行データは検証を通過', () => {
            const validAttempts = [
                { score: 0.8, timestamp: Date.now() - 2000, details: {} },
                { score: 0.9, timestamp: Date.now() - 1000, details: {} },
                { score: 0.7, timestamp: Date.now(), details: {} }
            ];

            const result = validationService.validateAttempts(validAttempts, 'あ');
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('無効なスコアを検出', () => {
            const invalidScoreAttempts = [
                { score: 1.5, timestamp: Date.now() }, // 範囲外
                { score: -0.1, timestamp: Date.now() }, // 範囲外
                { score: 'invalid', timestamp: Date.now() } // 数値ではない
            ];

            const result = validationService.validateAttempts(invalidScoreAttempts, 'あ');
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBe(3);
        });

        test('無効なタイムスタンプを検出', () => {
            const invalidTimestampAttempts = [
                { score: 0.8, timestamp: 0 }, // 無効
                { score: 0.8, timestamp: -1000 }, // 負の値
                { score: 0.8, timestamp: 'invalid' } // 数値ではない
            ];

            const result = validationService.validateAttempts(invalidTimestampAttempts, 'あ');
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBe(3);
        });

        test('未来のタイムスタンプに警告', () => {
            const futureTimestamp = Date.now() + 2 * 86400000; // 2日後
            const futureAttempts = [
                { score: 0.8, timestamp: futureTimestamp }
            ];

            const result = validationService.validateAttempts(futureAttempts, 'あ');
            expect(result.isValid).toBe(true); // エラーではなく警告
            expect(result.warnings.some(warning => warning.includes('未来の日付'))).toBe(true);
        });

        test('時系列順序の警告', () => {
            const unorderedAttempts = [
                { score: 0.8, timestamp: Date.now() },
                { score: 0.9, timestamp: Date.now() - 1000 } // 逆順
            ];

            const result = validationService.validateAttempts(unorderedAttempts, 'あ');
            expect(result.isValid).toBe(true);
            expect(result.warnings.some(warning => warning.includes('時系列順ではありません'))).toBe(true);
        });

        test('異常に短い試行間隔の警告', () => {
            const rapidAttempts = [
                { score: 0.8, timestamp: Date.now() },
                { score: 0.9, timestamp: Date.now() + 500 } // 500ms後
            ];

            const result = validationService.validateAttempts(rapidAttempts, 'あ');
            expect(result.isValid).toBe(true);
            expect(result.warnings.some(warning => warning.includes('異常に短い'))).toBe(true);
        });
    });

    describe('セッションデータの検証', () => {
        test('有効なセッションデータは検証を通過', () => {
            const validSessionData = {
                startTime: null,
                totalPracticeTime: 300000,
                sessionsCount: 5
            };

            const result = validationService.validateSessionData(validSessionData);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('無効な総練習時間を検出', () => {
            const invalidSessionData = {
                totalPracticeTime: -1000, // 負の値
                sessionsCount: 5
            };

            const result = validationService.validateSessionData(invalidSessionData);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('総練習時間'))).toBe(true);
        });

        test('無効なセッション数を検出', () => {
            const invalidSessionData = {
                totalPracticeTime: 300000,
                sessionsCount: 'invalid' // 数値ではない
            };

            const result = validationService.validateSessionData(invalidSessionData);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('セッション数'))).toBe(true);
        });
    });

    describe('セッション配列の検証', () => {
        test('有効なセッション配列は検証を通過', () => {
            const validSessions = [
                {
                    character: { character: 'あ' },
                    attempts: [],
                    startTime: Date.now() - 1000,
                    endTime: Date.now()
                },
                {
                    character: { character: 'い' },
                    attempts: [],
                    startTime: Date.now() - 2000,
                    endTime: Date.now() - 1000
                }
            ];

            const result = validationService.validateSessions(validSessions);
            expect(result.isValid).toBe(true);
            expect(result.validSessions).toHaveLength(2);
            expect(result.invalidSessions).toHaveLength(0);
        });

        test('無効なセッションを検出', () => {
            const invalidSessions = [
                {
                    character: { character: 'あ' },
                    attempts: []
                },
                {
                    character: null, // 無効
                    attempts: []
                },
                {
                    character: { character: 'う' },
                    attempts: 'invalid' // 配列ではない
                }
            ];

            const result = validationService.validateSessions(invalidSessions);
            expect(result.isValid).toBe(false);
            expect(result.validSessions).toHaveLength(1);
            expect(result.invalidSessions).toHaveLength(2);
        });

        test('配列ではないデータは検証に失敗', () => {
            const result = validationService.validateSessions('not an array');
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('配列ではありません'))).toBe(true);
        });
    });

    describe('データ修復機能', () => {
        test('基本構造の修復', () => {
            const corruptedData = {
                // characterProgress が欠落
                // sessionData が欠落
                // version が欠落
            };

            const errors = ['必須フィールドが欠落'];
            const repaired = validationService.attemptDataRepair(corruptedData, errors);

            expect(repaired).toBeDefined();
            expect(repaired.characterProgress).toBeDefined();
            expect(repaired.sessionData).toBeDefined();
            expect(repaired.version).toBe('2.0');
        });

        test('文字進捗データの修復', () => {
            const corruptedData = {
                characterProgress: {
                    'あ': {
                        // character が欠落
                        attempts: [
                            { score: 1.5, timestamp: Date.now() }, // 無効なスコア
                            { score: 0.8, timestamp: 0 }, // 無効なタイムスタンプ
                            { score: 0.7, timestamp: Date.now() } // 有効
                        ]
                    }
                },
                sessionData: {
                    totalPracticeTime: 0,
                    sessionsCount: 0
                },
                version: '2.0'
            };

            const errors = ['データが不整合'];
            const repaired = validationService.attemptDataRepair(corruptedData, errors);

            expect(repaired).toBeDefined();
            expect(repaired.characterProgress['あ'].character).toBe('あ');
            expect(repaired.characterProgress['あ'].attempts).toHaveLength(1); // 有効な試行のみ
        });

        test('セッションデータの修復', () => {
            const corruptedData = {
                characterProgress: {},
                sessionData: {
                    totalPracticeTime: -1000, // 無効
                    sessionsCount: 'invalid' // 無効
                },
                version: '2.0'
            };

            const errors = ['セッションデータが無効'];
            const repaired = validationService.attemptDataRepair(corruptedData, errors);

            expect(repaired).toBeDefined();
            expect(repaired.sessionData.totalPracticeTime).toBe(0);
            expect(repaired.sessionData.sessionsCount).toBe(0);
        });

        test('修復不可能なデータはnullを返す', () => {
            const corruptedData = null;
            const errors = ['データが存在しません'];
            const repaired = validationService.attemptDataRepair(corruptedData, errors);

            expect(repaired).toBeNull();
        });
    });

    describe('データ整合性の包括的チェック', () => {
        test('全データの整合性チェック', () => {
            const allData = {
                progressTracking: {
                    characterProgress: {
                        'あ': {
                            character: 'あ',
                            attempts: [{ score: 0.8, timestamp: Date.now() }]
                        }
                    },
                    sessionData: {
                        totalPracticeTime: 300000,
                        sessionsCount: 1
                    },
                    version: '2.0'
                },
                sessions: [
                    {
                        character: { character: 'あ' },
                        attempts: []
                    }
                ]
            };

            const result = validationService.validateDataIntegrity(allData);
            expect(result.isValid).toBe(true);
            expect(result.summary.progressTracking).toBeDefined();
            expect(result.summary.sessions).toBeDefined();
            expect(result.summary.crossValidation).toBeDefined();
        });

        test('クロス検証で不整合を検出', () => {
            const allData = {
                progressTracking: {
                    characterProgress: {
                        'あ': { character: 'あ', attempts: [] },
                        'い': { character: 'い', attempts: [] } // セッションにない文字
                    },
                    sessionData: { totalPracticeTime: 0, sessionsCount: 0 },
                    version: '2.0'
                },
                sessions: [
                    {
                        character: { character: 'あ' },
                        attempts: []
                    },
                    {
                        character: { character: 'う' }, // 進捗データにない文字
                        attempts: []
                    }
                ]
            };

            const result = validationService.validateDataIntegrity(allData);
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings.some(w => w.includes('い'))).toBe(true);
            expect(result.warnings.some(w => w.includes('う'))).toBe(true);
        });
    });

    describe('検証レポート生成', () => {
        test('検証レポートが生成される', () => {
            const validationResult = {
                isValid: false,
                errors: ['エラー1', 'エラー2'],
                warnings: ['警告1'],
                summary: {
                    progressTracking: { isValid: true, errors: [], warnings: [] },
                    sessions: { isValid: false, errors: ['セッションエラー'], warnings: [] }
                }
            };

            const report = validationService.generateValidationReport(validationResult);
            
            expect(report).toContain('データ検証レポート');
            expect(report).toContain('✗ 無効');
            expect(report).toContain('エラー数: 2');
            expect(report).toContain('警告数: 1');
            expect(report).toContain('エラー1');
            expect(report).toContain('警告1');
        });

        test('有効なデータのレポート', () => {
            const validationResult = {
                isValid: true,
                errors: [],
                warnings: [],
                summary: {}
            };

            const report = validationService.generateValidationReport(validationResult);
            
            expect(report).toContain('✓ 有効');
            expect(report).toContain('エラー数: 0');
            expect(report).toContain('警告数: 0');
        });
    });

    describe('エラーハンドリング', () => {
        test('例外発生時の適切な処理', () => {
            // 無効な構造のデータでテスト
            const invalidData = {
                characterProgress: {
                    'あ': {
                        character: 'あ',
                        attempts: [
                            { score: 'invalid', timestamp: 'invalid' } // 型エラーを発生させる
                        ]
                    }
                },
                sessionData: {
                    totalPracticeTime: 'invalid',
                    sessionsCount: 'invalid'
                },
                version: '2.0'
            };

            const result = validationService.validateProgressTrackingData(invalidData);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('修復中の例外処理', () => {
            // JSON.parseでエラーが発生するようなデータ
            const invalidData = { circular: {} };
            invalidData.circular.ref = invalidData;

            const errors = ['テストエラー'];
            const repaired = validationService.attemptDataRepair(invalidData, errors);
            
            // 修復に失敗した場合はnullが返される
            expect(repaired).toBeNull();
        });
    });
});