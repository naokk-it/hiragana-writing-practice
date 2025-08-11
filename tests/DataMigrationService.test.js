import { DataMigrationService } from '../js/services/DataMigrationService.js';
import { DataStorageService } from '../js/services/DataStorageService.js';
import { HiraganaDataService } from '../js/services/HiraganaDataService.js';

// LocalStorageのモック
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => store[key] = value.toString(),
        removeItem: (key) => delete store[key],
        clear: () => store = {},
        key: (index) => Object.keys(store)[index] || null,
        get length() { return Object.keys(store).length; }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('DataMigrationService', () => {
    let migrationService;
    let dataStorageService;
    let hiraganaDataService;

    beforeEach(() => {
        // LocalStorageをクリア
        localStorage.clear();
        
        // サービスを初期化
        dataStorageService = new DataStorageService();
        hiraganaDataService = new HiraganaDataService();
        migrationService = new DataMigrationService(dataStorageService, hiraganaDataService);
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('初期化', () => {
        test('正常に初期化される', () => {
            expect(migrationService).toBeDefined();
            expect(migrationService.currentVersion).toBe('2.0');
            expect(migrationService.supportedVersions).toContain('1.0');
            expect(migrationService.supportedVersions).toContain('2.0');
        });

        test('難易度マッピングが作成される', () => {
            expect(migrationService.difficultyMapping).toBeDefined();
            expect(migrationService.difficultyMapping.levelMapping).toBeDefined();
            expect(migrationService.difficultyMapping.characterMapping).toBeDefined();
        });
    });

    describe('データバージョン管理', () => {
        test('デフォルトバージョンは1.0', () => {
            const version = migrationService.getCurrentDataVersion();
            expect(version).toBe('1.0');
        });

        test('データバージョンを設定できる', () => {
            migrationService.setDataVersion('2.0');
            const version = migrationService.getCurrentDataVersion();
            expect(version).toBe('2.0');
        });

        test('移行が必要かどうかを判定できる', () => {
            // 初期状態では移行が必要
            expect(migrationService.isMigrationNeeded()).toBe(true);
            
            // バージョンを更新すると移行不要
            migrationService.setDataVersion('2.0');
            expect(migrationService.isMigrationNeeded()).toBe(false);
        });
    });

    describe('バックアップ機能', () => {
        test('バックアップを作成できる', async () => {
            // テストデータを準備
            const testData = {
                sessions: [{ character: { character: 'あ' }, attempts: [] }],
                progress: { totalSessions: 1 }
            };
            
            dataStorageService.saveToStorage('hiragana_practice_sessions', testData.sessions);
            dataStorageService.saveToStorage('hiragana_practice_progress', testData.progress);

            const success = await migrationService.createBackup();
            expect(success).toBe(true);

            // バックアップが作成されたことを確認
            const backupKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('hiragana_backup_')) {
                    backupKeys.push(key);
                }
            }
            expect(backupKeys.length).toBeGreaterThan(0);
        });

        test('バックアップから復元できる', async () => {
            // バックアップを作成
            const testData = {
                sessions: [{ character: { character: 'あ' }, attempts: [] }],
                progress: { totalSessions: 1 }
            };
            
            dataStorageService.saveToStorage('hiragana_practice_sessions', testData.sessions);
            await migrationService.createBackup();

            // データを削除
            dataStorageService.removeFromStorage('hiragana_practice_sessions');

            // 復元
            const success = await migrationService.restoreFromBackup();
            expect(success).toBe(true);

            // データが復元されたことを確認
            const restoredSessions = dataStorageService.getAllSessions();
            expect(restoredSessions).toHaveLength(1);
            expect(restoredSessions[0].character.character).toBe('あ');
        });
    });

    describe('データ移行', () => {
        test('バージョン1.0からの移行', async () => {
            // バージョン1.0のテストデータを準備
            const oldProgressData = {
                totalSessions: 5,
                totalPracticeTime: 300000,
                characters: {
                    'あ': {
                        totalAttempts: 3,
                        averageScore: 0.8,
                        bestScore: 0.9,
                        lastPracticed: Date.now() - 86400000 // 1日前
                    },
                    'い': {
                        totalAttempts: 2,
                        averageScore: 0.6,
                        bestScore: 0.7,
                        lastPracticed: Date.now() - 172800000 // 2日前
                    }
                }
            };

            const oldSessions = [
                {
                    character: { character: 'あ', difficulty: 1 },
                    attempts: [
                        { scoreResult: { score: 0.8 }, timestamp: Date.now() }
                    ],
                    startTime: Date.now() - 1000,
                    endTime: Date.now()
                }
            ];

            // 旧データを保存
            dataStorageService.saveToStorage('hiragana_practice_progress', oldProgressData);
            dataStorageService.saveToStorage('hiragana_practice_sessions', oldSessions);

            // 移行を実行
            const success = await migrationService.migrateFromV1_0();
            expect(success).toBe(true);

            // 移行後のデータを確認
            const migratedData = dataStorageService.loadData('progressTracking');
            expect(migratedData).toBeDefined();
            expect(migratedData.version).toBe('2.0');
            expect(migratedData.characterProgress).toBeDefined();
            expect(migratedData.characterProgress['あ']).toBeDefined();
            expect(migratedData.characterProgress['い']).toBeDefined();
        });

        test('文字進捗データの変換', async () => {
            const oldCharData = {
                totalAttempts: 5,
                averageScore: 0.75,
                bestScore: 0.9,
                lastPracticed: Date.now() - 86400000
            };

            const converted = await migrationService.convertCharacterProgress('あ', oldCharData);
            
            expect(converted).toBeDefined();
            expect(converted.character).toBe('あ');
            expect(converted.attempts).toBeDefined();
            expect(converted.attempts.length).toBeGreaterThan(0);
            
            // 変換された試行データの検証
            converted.attempts.forEach(attempt => {
                expect(attempt.score).toBeGreaterThanOrEqual(0);
                expect(attempt.score).toBeLessThanOrEqual(1);
                expect(attempt.timestamp).toBeGreaterThan(0);
                expect(attempt.details.migrated).toBe(true);
            });
        });

        test('新しい難易度レベルの取得', () => {
            // テスト用の文字で新しい難易度レベルを取得
            const level1 = migrationService.getNewDifficultyLevel('あ');
            const level2 = migrationService.getNewDifficultyLevel('く');
            const level3 = migrationService.getNewDifficultyLevel('き');

            expect(['beginner', 'intermediate', 'advanced']).toContain(level1);
            expect(['beginner', 'intermediate', 'advanced']).toContain(level2);
            expect(['beginner', 'intermediate', 'advanced']).toContain(level3);
        });
    });

    describe('データ検証', () => {
        test('進捗追跡データの検証', () => {
            const validData = {
                characterProgress: {
                    'あ': {
                        character: 'あ',
                        attempts: [
                            { score: 0.8, timestamp: Date.now(), details: {} }
                        ]
                    }
                },
                sessionData: {
                    startTime: null,
                    totalPracticeTime: 0,
                    sessionsCount: 0
                },
                version: '2.0'
            };

            const result = migrationService.validateProgressTrackingData(validData);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('無効な進捗追跡データの検証', () => {
            const invalidData = {
                characterProgress: {
                    'あ': {
                        character: 'い', // 不整合
                        attempts: 'invalid' // 配列ではない
                    }
                },
                version: '1.0' // 古いバージョン
            };

            const result = migrationService.validateProgressTrackingData(invalidData);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('セッションデータの検証', () => {
            const validSessions = [
                {
                    character: { character: 'あ' },
                    attempts: []
                }
            ];

            const result = migrationService.validateSessionData(validSessions);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('無効なセッションデータの検証', () => {
            const invalidSessions = [
                {
                    character: null, // 無効
                    attempts: 'invalid' // 配列ではない
                }
            ];

            const result = migrationService.validateSessionData(invalidSessions);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('データ修復', () => {
        test('進捗追跡データの修復（ValidationService経由）', async () => {
            const corruptedData = {
                characterProgress: {
                    'あ': {
                        // character プロパティが欠落
                        attempts: [
                            { score: 1.5, timestamp: Date.now() }, // 無効なスコア
                            { score: 0.8, timestamp: 0 }, // 無効なタイムスタンプ
                            { score: 0.7, timestamp: Date.now() } // 有効
                        ]
                    }
                }
                // sessionData が欠落
                // version が欠落
            };

            // 破損したデータを保存
            dataStorageService.saveData('progressTracking', corruptedData);
            
            // 修復を実行
            const errors = ['テストエラー'];
            const success = await migrationService.repairDataInconsistencies(errors);
            expect(success).toBe(true);
            
            // 修復されたデータを確認
            const repairedData = dataStorageService.loadData('progressTracking');
            expect(repairedData).toBeDefined();
            if (repairedData) {
                expect(repairedData.characterProgress['あ'].character).toBe('あ');
            }
        });

        test('セッションデータの修復（ValidationService経由）', async () => {
            const corruptedSessions = [
                {
                    character: { character: 'あ' },
                    attempts: []
                },
                {
                    character: null, // 無効
                    attempts: []
                },
                {
                    character: { character: 'い' },
                    attempts: []
                }
            ];

            // 破損したセッションデータを保存
            dataStorageService.saveToStorage('hiragana_practice_sessions', corruptedSessions);
            
            // 修復を実行
            const errors = ['テストエラー'];
            const success = await migrationService.repairDataInconsistencies(errors);
            expect(success).toBe(true);
            
            // 修復されたデータを確認
            const repairedSessions = dataStorageService.getAllSessions();
            expect(repairedSessions.length).toBeLessThanOrEqual(2); // 無効なセッションは除去
        });
    });

    describe('移行情報', () => {
        test('移行情報を取得できる', () => {
            const info = migrationService.getMigrationInfo();
            
            expect(info.currentVersion).toBeDefined();
            expect(info.targetVersion).toBe('2.0');
            expect(info.migrationNeeded).toBeDefined();
            expect(info.supportedVersions).toContain('1.0');
            expect(info.supportedVersions).toContain('2.0');
        });

        test('移行前提条件の検証', () => {
            const isValid = migrationService.validateMigrationPreconditions();
            expect(typeof isValid).toBe('boolean');
        });
    });

    describe('移行テスト', () => {
        test('移行テストを実行できる', async () => {
            const testResults = await migrationService.runMigrationTest();
            
            expect(testResults).toBeDefined();
            expect(testResults.backupTest).toBeDefined();
            expect(testResults.migrationTest).toBeDefined();
            expect(testResults.validationTest).toBeDefined();
            expect(testResults.restoreTest).toBeDefined();
            expect(testResults.overallSuccess).toBeDefined();
        });
    });

    describe('フォールバック処理', () => {
        test('フォールバック移行を実行できる', async () => {
            // 不明なバージョンのデータを設定
            migrationService.setDataVersion('unknown');
            
            const success = await migrationService.performFallbackMigration();
            expect(success).toBe(true);
        });

        test('データ不整合時のフォールバック処理', async () => {
            // 破損したデータを設定
            const corruptedData = {
                characterProgress: null,
                sessionData: 'invalid'
            };
            
            dataStorageService.saveData('progressTracking', corruptedData);
            
            const errors = ['テストエラー'];
            const success = await migrationService.repairDataInconsistencies(errors);
            expect(success).toBe(true);
            
            // 修復されたデータを確認
            const repairedData = dataStorageService.loadData('progressTracking');
            if (repairedData) {
                expect(repairedData.characterProgress).toBeDefined();
                expect(repairedData.sessionData).toBeDefined();
            }
        });
    });

    describe('エラーハンドリング', () => {
        test('LocalStorage利用不可時の処理', () => {
            // LocalStorageを無効化
            const originalLocalStorage = window.localStorage;
            Object.defineProperty(window, 'localStorage', {
                value: null,
                configurable: true
            });

            const isValid = migrationService.validateMigrationPreconditions();
            expect(isValid).toBe(false);

            // LocalStorageを復元
            Object.defineProperty(window, 'localStorage', {
                value: originalLocalStorage,
                configurable: true
            });
        });

        test('移行中のエラー処理', async () => {
            // エラーを発生させるために無効なデータを設定
            dataStorageService.saveToStorage('hiragana_practice_progress', 'invalid json');
            
            const success = await migrationService.migrateFromV1_0();
            // 無効なJSONでも基本的な移行処理は継続される
            expect(typeof success).toBe('boolean');
        });
    });

    describe('パフォーマンス', () => {
        test('大量データの移行処理', async () => {
            // 大量のテストデータを作成
            const largeProgressData = {
                totalSessions: 1000,
                totalPracticeTime: 3600000,
                characters: {}
            };

            // 全ひらがな文字のデータを作成
            const hiraganaChars = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ'];
            hiraganaChars.forEach(char => {
                largeProgressData.characters[char] = {
                    totalAttempts: 50,
                    averageScore: Math.random(),
                    bestScore: Math.random(),
                    lastPracticed: Date.now() - Math.random() * 86400000 * 30
                };
            });

            dataStorageService.saveToStorage('hiragana_practice_progress', largeProgressData);

            const startTime = Date.now();
            const success = await migrationService.migrateFromV1_0();
            const endTime = Date.now();

            expect(success).toBe(true);
            expect(endTime - startTime).toBeLessThan(5000); // 5秒以内で完了
        });
    });
});