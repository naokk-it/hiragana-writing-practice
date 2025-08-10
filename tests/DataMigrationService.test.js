import { DataMigrationService } from '../js/services/DataMigrationService.js';
import { DataStorageService } from '../js/services/DataStorageService.js';

// LocalStorageのモック
const localStorageMock = {
    data: {},
    getItem: jest.fn((key) => localStorageMock.data[key] || null),
    setItem: jest.fn((key, value) => {
        localStorageMock.data[key] = value;
    }),
    removeItem: jest.fn((key) => {
        delete localStorageMock.data[key];
    }),
    clear: jest.fn(() => {
        localStorageMock.data = {};
    }),
    get length() {
        return Object.keys(localStorageMock.data).length;
    },
    key: jest.fn((index) => Object.keys(localStorageMock.data)[index] || null)
};

// グローバルlocalStorageをモック
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('DataMigrationService', () => {
    let dataStorageService;
    let dataMigrationService;

    beforeEach(() => {
        // LocalStorageをクリア
        localStorageMock.clear();
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        localStorageMock.removeItem.mockClear();

        // サービスを初期化
        dataStorageService = new DataStorageService();
        dataMigrationService = new DataMigrationService(dataStorageService);
        dataStorageService.setMigrationService(dataMigrationService);
    });

    describe('getCurrentDataVersion', () => {
        test('新規インストールの場合は最新バージョンを返す', () => {
            // 完全に空の状態を確保
            localStorageMock.clear();
            
            const version = dataMigrationService.getCurrentDataVersion();
            expect(version).toBe('2.0');
        });

        test('バージョン情報が保存されている場合はそれを返す', () => {
            const versionInfo = {
                version: '1.5',
                updatedAt: Date.now()
            };
            localStorageMock.data['hiragana_data_version'] = JSON.stringify(versionInfo);

            const version = dataMigrationService.getCurrentDataVersion();
            expect(version).toBe('1.5');
        });

        test('旧形式の進捗データがある場合は1.0を返す', () => {
            const oldProgress = {
                version: '1.0',
                totalSessions: 5,
                characters: {
                    'あ': { totalSessions: 2, averageScore: 0.8 }
                }
            };
            localStorageMock.data['hiragana_practice_progress'] = JSON.stringify(oldProgress);

            const version = dataMigrationService.getCurrentDataVersion();
            expect(version).toBe('1.0');
        });

        test('既存セッションデータがある場合は1.0を返す', () => {
            const sessions = [
                {
                    id: 'session1',
                    character: { character: 'あ' },
                    startTime: Date.now(),
                    attempts: []
                }
            ];
            localStorageMock.data['hiragana_practice_sessions'] = JSON.stringify(sessions);

            const version = dataMigrationService.getCurrentDataVersion();
            expect(version).toBe('1.0');
        });
    });

    describe('isVersionSupported', () => {
        test('サポートされているバージョンの場合はtrueを返す', () => {
            expect(dataMigrationService.isVersionSupported('1.0')).toBe(true);
            expect(dataMigrationService.isVersionSupported('1.1')).toBe(true);
            expect(dataMigrationService.isVersionSupported('2.0')).toBe(true);
        });

        test('サポートされていないバージョンの場合はfalseを返す', () => {
            expect(dataMigrationService.isVersionSupported('0.9')).toBe(false);
            expect(dataMigrationService.isVersionSupported('3.0')).toBe(false);
            expect(dataMigrationService.isVersionSupported('invalid')).toBe(false);
        });
    });

    describe('createDataBackup', () => {
        test('データバックアップを正常に作成する', () => {
            // テストデータを設定
            const sessions = [{ id: 'test', character: { character: 'あ' } }];
            const progress = { version: '1.0', totalSessions: 1 };
            
            localStorageMock.data['hiragana_practice_sessions'] = JSON.stringify(sessions);
            localStorageMock.data['hiragana_practice_progress'] = JSON.stringify(progress);

            const success = dataMigrationService.createDataBackup();
            expect(success).toBe(true);

            // バックアップキーが作成されているかチェック
            const latestBackupKey = JSON.parse(localStorageMock.data['hiragana_latest_backup'] || 'null');
            expect(latestBackupKey).toBeDefined();

            // バックアップデータが保存されているかチェック
            const backupData = JSON.parse(localStorageMock.data[latestBackupKey]);
            expect(backupData.sessions).toEqual(sessions);
            expect(backupData.progress).toMatchObject({
                version: '1.0',
                totalSessions: 1
            });
            expect(backupData.version).toBe('1.0');
        });
    });

    describe('convertOldProgressToNew', () => {
        test('旧形式の進捗データを新形式に変換する', () => {
            const oldProgress = {
                version: '1.0',
                totalSessions: 10,
                totalPracticeTime: 300000,
                characters: {
                    'あ': {
                        character: 'あ',
                        totalSessions: 5,
                        averageScore: 0.8,
                        bestScore: 0.9,
                        lastPracticed: Date.now() - 86400000 // 1日前
                    },
                    'い': {
                        character: 'い',
                        totalSessions: 3,
                        averageScore: 0.6,
                        bestScore: 0.7,
                        lastPracticed: Date.now() - 172800000 // 2日前
                    }
                }
            };

            const oldSessions = [
                {
                    id: 'session1',
                    character: { character: 'あ' },
                    startTime: Date.now() - 86400000,
                    endTime: Date.now() - 86400000 + 60000,
                    attempts: [
                        {
                            timestamp: Date.now() - 86400000,
                            scoreResult: { score: 0.8 },
                            recognitionResult: { confidence: 0.9 }
                        }
                    ]
                }
            ];

            const newProgress = dataMigrationService.convertOldProgressToNew(oldProgress, oldSessions);

            expect(newProgress.version).toBe('2.0');
            expect(newProgress.sessionData.totalPracticeTime).toBe(300000);
            expect(newProgress.sessionData.sessionsCount).toBe(10);

            // 文字別進捗データの確認
            expect(newProgress.characterProgress['あ']).toBeDefined();
            expect(newProgress.characterProgress['あ'].character).toBe('あ');
            expect(Array.isArray(newProgress.characterProgress['あ'].attempts)).toBe(true);
            expect(newProgress.characterProgress['あ'].attempts.length).toBeGreaterThan(0);

            expect(newProgress.characterProgress['い']).toBeDefined();
            expect(newProgress.characterProgress['い'].character).toBe('い');
            expect(Array.isArray(newProgress.characterProgress['い'].attempts)).toBe(true);
        });
    });

    describe('validateData', () => {
        test('有効なデータの場合はtrueを返す', () => {
            const validData = {
                characterProgress: {
                    'あ': {
                        character: 'あ',
                        attempts: [
                            {
                                score: 0.8,
                                timestamp: Date.now(),
                                details: {}
                            }
                        ]
                    }
                },
                sessionData: {
                    startTime: null,
                    totalPracticeTime: 0,
                    sessionsCount: 0
                }
            };

            expect(dataMigrationService.validateData(validData)).toBe(true);
        });

        test('無効なデータの場合はfalseを返す', () => {
            const invalidData = {
                characterProgress: {
                    'あ': {
                        character: 'あ',
                        attempts: [
                            {
                                score: 1.5, // 無効なスコア（1を超える）
                                timestamp: Date.now()
                            }
                        ]
                    }
                }
            };

            expect(dataMigrationService.validateData(invalidData)).toBe(false);
        });

        test('nullやundefinedの場合はfalseを返す', () => {
            expect(dataMigrationService.validateData(null)).toBe(false);
            expect(dataMigrationService.validateData(undefined)).toBe(false);
            expect(dataMigrationService.validateData('invalid')).toBe(false);
        });
    });

    describe('sanitizeData', () => {
        test('無効なデータをサニタイズする', () => {
            const corruptedData = {
                characterProgress: {
                    'あ': {
                        character: 'あ',
                        attempts: [
                            {
                                score: 0.8,
                                timestamp: Date.now(),
                                details: {}
                            },
                            {
                                score: 1.5, // 無効なスコア
                                timestamp: Date.now()
                            },
                            {
                                score: -0.2, // 無効なスコア
                                timestamp: 'invalid' // 無効なタイムスタンプ
                            }
                        ]
                    },
                    'い': {
                        character: 'い',
                        attempts: 'invalid' // 無効な試行データ
                    }
                },
                sessionData: {
                    totalPracticeTime: -100, // 無効な値
                    sessionsCount: 'invalid' // 無効な値
                }
            };

            const sanitized = dataMigrationService.sanitizeData(corruptedData);

            expect(sanitized.version).toBe('2.0');
            expect(sanitized.characterProgress['あ'].attempts).toHaveLength(1); // 有効な試行のみ残る
            expect(sanitized.characterProgress['い']).toBeUndefined(); // 無効なデータは削除
            expect(sanitized.sessionData.totalPracticeTime).toBe(0); // デフォルト値
            expect(sanitized.sessionData.sessionsCount).toBe(0); // デフォルト値
        });

        test('nullデータの場合はデフォルトデータを返す', () => {
            const sanitized = dataMigrationService.sanitizeData(null);

            expect(sanitized.version).toBe('2.0');
            expect(sanitized.characterProgress).toEqual({});
            expect(sanitized.sessionData.totalPracticeTime).toBe(0);
            expect(sanitized.sessionData.sessionsCount).toBe(0);
        });
    });

    describe('getMigrationStatus', () => {
        test('移行状況を正しく返す', () => {
            // バージョン1.0のデータを設定
            const oldProgress = { version: '1.0', totalSessions: 1 };
            localStorageMock.data['hiragana_practice_progress'] = JSON.stringify(oldProgress);

            const status = dataMigrationService.getMigrationStatus();

            expect(status.currentVersion).toBe('2.0');
            expect(status.dataVersion).toBe('1.0');
            expect(status.migrationNeeded).toBe(true);
            expect(status.supportedVersions).toContain('1.0');
            expect(status.supportedVersions).toContain('2.0');
        });

        test('移行不要の場合', () => {
            // 最新バージョンのデータを設定
            const versionInfo = { version: '2.0', updatedAt: Date.now() };
            localStorageMock.data['hiragana_data_version'] = JSON.stringify(versionInfo);

            const status = dataMigrationService.getMigrationStatus();

            expect(status.currentVersion).toBe('2.0');
            expect(status.dataVersion).toBe('2.0');
            expect(status.migrationNeeded).toBe(false);
        });
    });

    describe('migrateData', () => {
        test('バージョン1.0から2.0への移行を実行する', async () => {
            // バージョン1.0のテストデータを設定
            const oldProgress = {
                version: '1.0',
                totalSessions: 5,
                totalPracticeTime: 300000,
                characters: {
                    'あ': {
                        character: 'あ',
                        totalSessions: 3,
                        averageScore: 0.8,
                        lastPracticed: Date.now()
                    }
                }
            };

            const oldSessions = [
                {
                    id: 'session1',
                    character: { character: 'あ' },
                    startTime: Date.now() - 86400000,
                    attempts: [
                        {
                            timestamp: Date.now() - 86400000,
                            scoreResult: { score: 0.8 }
                        }
                    ]
                }
            ];

            localStorageMock.data['hiragana_practice_progress'] = JSON.stringify(oldProgress);
            localStorageMock.data['hiragana_practice_sessions'] = JSON.stringify(oldSessions);

            const success = await dataMigrationService.migrateData();
            expect(success).toBe(true);

            // 新形式のデータが作成されているかチェック
            const newProgressData = JSON.parse(localStorageMock.data['hiragana_progress_tracking']);
            expect(newProgressData.version).toBe('2.0');
            expect(newProgressData.characterProgress['あ']).toBeDefined();
            expect(Array.isArray(newProgressData.characterProgress['あ'].attempts)).toBe(true);

            // バージョン情報が更新されているかチェック
            const versionInfo = JSON.parse(localStorageMock.data['hiragana_data_version']);
            expect(versionInfo.version).toBe('2.0');
        });

        test('最新バージョンの場合は移行をスキップする', async () => {
            // 最新バージョンのデータを設定
            const versionInfo = { version: '2.0', updatedAt: Date.now() };
            localStorageMock.data['hiragana_data_version'] = JSON.stringify(versionInfo);

            const success = await dataMigrationService.migrateData();
            expect(success).toBe(true);

            // 移行処理が実行されていないことを確認（バックアップが作成されていない）
            expect(localStorageMock.data['hiragana_latest_backup']).toBeUndefined();
        });
    });

    describe('エラーハンドリング', () => {
        test('LocalStorageエラーを適切に処理する', () => {
            // DataStorageServiceのloadFromStorageメソッドをモック
            const originalLoadFromStorage = dataStorageService.loadFromStorage;
            dataStorageService.loadFromStorage = jest.fn(() => {
                throw new Error('LocalStorage error');
            });

            const version = dataMigrationService.getCurrentDataVersion();
            expect(version).toBe('1.0'); // エラー時のデフォルト値

            // モックを復元
            dataStorageService.loadFromStorage = originalLoadFromStorage;
        });

        test('JSON解析エラーを適切に処理する', () => {
            // 無効なJSONデータを設定
            localStorageMock.data['hiragana_practice_progress'] = 'invalid json';

            const version = dataMigrationService.getCurrentDataVersion();
            expect(version).toBe('2.0'); // 新規インストール扱い
        });
    });
});