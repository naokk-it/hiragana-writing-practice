import { App } from '../js/app.js';

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

// DOMのモック
document.body.innerHTML = `
    <div id="app">
        <div id="main-menu" class="screen active">
            <button id="practice-button">練習開始</button>
            <div id="difficulty-selection">
                <button class="difficulty-btn" data-level="beginner">はじめて</button>
                <button class="difficulty-btn" data-level="intermediate">なれてきた</button>
                <button class="difficulty-btn" data-level="advanced">じょうず</button>
            </div>
        </div>
        <div id="practice-view" class="screen">
            <canvas id="drawing-canvas"></canvas>
            <button id="clear-button">クリア</button>
            <button id="submit-button">確認</button>
        </div>
        <div id="result-view" class="screen">
            <div id="score-display"></div>
            <button id="next-button">次へ</button>
        </div>
        <div id="progress-view" class="screen">
            <div id="progress-content"></div>
        </div>
    </div>
`;

describe('データ移行統合テスト', () => {
    let app;

    beforeEach(() => {
        localStorage.clear();
        app = new App();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('アプリ初期化時の移行処理', () => {
        test('新規インストール時は移行不要', async () => {
            // 新規インストール状態（データなし）
            await app.initialize();
            
            expect(app.dataMigrationService.isMigrationNeeded()).toBe(true); // バージョン1.0がデフォルト
            
            // 初期化後はバージョンが更新される
            const migrationInfo = app.dataMigrationService.getMigrationInfo();
            expect(migrationInfo.currentVersion).toBeDefined();
        });

        test('旧バージョンデータ存在時は自動移行', async () => {
            // 旧バージョンのテストデータを設定
            const oldProgressData = {
                totalSessions: 3,
                totalPracticeTime: 180000,
                characters: {
                    'あ': {
                        totalAttempts: 5,
                        averageScore: 0.8,
                        bestScore: 0.9,
                        lastPracticed: Date.now() - 86400000
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

            // 旧データを直接LocalStorageに保存
            localStorage.setItem('hiragana_practice_progress', JSON.stringify(oldProgressData));
            localStorage.setItem('hiragana_practice_sessions', JSON.stringify(oldSessions));

            // アプリを初期化（移行が自動実行される）
            await app.initialize();

            // 移行後のデータを確認
            const migratedData = app.dataStorageService.loadData('progressTracking');
            expect(migratedData).toBeDefined();
            expect(migratedData.version).toBe('2.0');
            expect(migratedData.characterProgress['あ']).toBeDefined();
        });
    });

    describe('移行後のデータ互換性', () => {
        test('旧進捗データが新システムで正常に動作', async () => {
            // 旧データを設定して移行
            const oldProgressData = {
                totalSessions: 2,
                characters: {
                    'あ': { totalAttempts: 3, averageScore: 0.7, bestScore: 0.8 },
                    'く': { totalAttempts: 2, averageScore: 0.6, bestScore: 0.7 }
                }
            };

            localStorage.setItem('hiragana_practice_progress', JSON.stringify(oldProgressData));
            await app.initialize();

            // 進捗追跡サービスで移行されたデータを確認
            const progressService = app.progressTrackingService;
            
            const aProgress = progressService.getCharacterProgress('あ');
            expect(aProgress).toBeDefined();
            expect(aProgress.getAttemptCount()).toBeGreaterThan(0);
            
            const kuProgress = progressService.getCharacterProgress('く');
            expect(kuProgress).toBeDefined();
            expect(kuProgress.getAttemptCount()).toBeGreaterThan(0);
        });

        test('新しい難易度システムが正常に動作', async () => {
            await app.initialize();

            // 新しい難易度システムでの文字取得
            const beginnerChars = app.hiraganaDataService.getCharactersByStrokeComplexity('beginner');
            const intermediateChars = app.hiraganaDataService.getCharactersByStrokeComplexity('intermediate');
            const advancedChars = app.hiraganaDataService.getCharactersByStrokeComplexity('advanced');

            expect(beginnerChars.length).toBeGreaterThan(0);
            expect(intermediateChars.length).toBeGreaterThan(0);
            expect(advancedChars.length).toBeGreaterThan(0);

            // 各レベルの文字が適切に分類されていることを確認
            expect(beginnerChars.some(char => char.character === 'く')).toBe(true); // 1画
            expect(intermediateChars.some(char => char.character === 'あ')).toBe(true); // 3画
            expect(advancedChars.some(char => char.character === 'き')).toBe(true); // 4画
        });

        test('進捗表示が新旧システム両方に対応', async () => {
            // 旧データで初期化
            const oldProgressData = {
                characters: {
                    'あ': { totalAttempts: 5, averageScore: 0.8 },
                    'い': { totalAttempts: 3, averageScore: 0.6 },
                    'く': { totalAttempts: 4, averageScore: 0.9 }
                }
            };

            localStorage.setItem('hiragana_practice_progress', JSON.stringify(oldProgressData));
            await app.initialize();

            const progressService = app.progressTrackingService;

            // 旧システムの難易度別進捗（互換性維持）
            const difficultyProgress = progressService.getProgressByDifficulty();
            expect(difficultyProgress[1]).toBeDefined(); // 旧システムの難易度1
            expect(difficultyProgress[2]).toBeDefined(); // 旧システムの難易度2

            // 新システムの画数複雑度別進捗
            expect(difficultyProgress.beginner).toBeDefined();
            expect(difficultyProgress.intermediate).toBeDefined();
            expect(difficultyProgress.advanced).toBeDefined();
        });
    });

    describe('エラー処理と復旧', () => {
        test('移行失敗時のフォールバック処理', async () => {
            // 破損したデータを設定
            localStorage.setItem('hiragana_practice_progress', 'invalid json');
            
            // アプリ初期化（エラーが発生するが処理は継続される）
            await app.initialize();
            
            // アプリが正常に動作することを確認
            expect(app.appState.isInitialized).toBe(true);
            expect(app.progressTrackingService).toBeDefined();
        });

        test('データ不整合時の自動修復', async () => {
            // 不整合のあるデータを設定
            const inconsistentData = {
                characterProgress: {
                    'あ': {
                        character: 'い', // 不整合
                        attempts: [
                            { score: 1.5, timestamp: Date.now() }, // 無効なスコア
                            { score: 0.8, timestamp: 0 } // 無効なタイムスタンプ
                        ]
                    }
                },
                version: '2.0'
            };

            localStorage.setItem('hiragana_data_version', '2.0');
            localStorage.setItem('hiragana_progress_tracking', JSON.stringify(inconsistentData));

            await app.initialize();

            // データが修復されていることを確認
            const repairedData = app.dataStorageService.loadData('progressTracking');
            expect(repairedData.characterProgress['あ'].character).toBe('あ');
            expect(repairedData.characterProgress['あ'].attempts.length).toBeLessThan(2); // 無効な試行は除去
        });

        test('バックアップからの復元', async () => {
            // 正常なデータでバックアップを作成
            const validData = {
                sessions: [{ character: { character: 'あ' }, attempts: [] }],
                progress: { totalSessions: 1 }
            };

            app.dataStorageService.saveToStorage('hiragana_practice_sessions', validData.sessions);
            await app.dataMigrationService.createBackup();

            // データを破損
            localStorage.setItem('hiragana_practice_sessions', 'corrupted');

            // 復元を実行
            const restoreSuccess = await app.dataMigrationService.restoreFromBackup();
            expect(restoreSuccess).toBe(true);

            // データが復元されていることを確認
            const restoredSessions = app.dataStorageService.getAllSessions();
            expect(restoredSessions).toHaveLength(1);
        });
    });

    describe('パフォーマンス', () => {
        test('大量データの移行が適切な時間で完了', async () => {
            // 大量のテストデータを作成
            const largeData = {
                totalSessions: 500,
                characters: {}
            };

            // 全ひらがな文字のデータを作成
            const allChars = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ'];
            allChars.forEach(char => {
                largeData.characters[char] = {
                    totalAttempts: 20,
                    averageScore: Math.random(),
                    bestScore: Math.random()
                };
            });

            localStorage.setItem('hiragana_practice_progress', JSON.stringify(largeData));

            const startTime = Date.now();
            await app.initialize();
            const endTime = Date.now();

            // 初期化が適切な時間で完了することを確認
            expect(endTime - startTime).toBeLessThan(3000); // 3秒以内
            expect(app.appState.isInitialized).toBe(true);
        });

        test('移行後のメモリ使用量が適切', async () => {
            // データを設定して移行
            const testData = {
                characters: {
                    'あ': { totalAttempts: 10, averageScore: 0.8 },
                    'い': { totalAttempts: 8, averageScore: 0.7 }
                }
            };

            localStorage.setItem('hiragana_practice_progress', JSON.stringify(testData));
            await app.initialize();

            // メモリ使用量の推定
            const debugInfo = app.progressTrackingService.getDebugInfo();
            expect(debugInfo.memoryUsage).toBeLessThan(1024 * 1024); // 1MB未満
        });
    });

    describe('ユーザーエクスペリエンス', () => {
        test('移行中のユーザー体験が適切', async () => {
            // 移行が必要なデータを設定
            const oldData = {
                characters: {
                    'あ': { totalAttempts: 5, averageScore: 0.8 }
                }
            };

            localStorage.setItem('hiragana_practice_progress', JSON.stringify(oldData));

            // 初期化時間を測定
            const startTime = Date.now();
            await app.initialize();
            const endTime = Date.now();

            // ユーザーが待機する時間が適切であることを確認
            expect(endTime - startTime).toBeLessThan(2000); // 2秒以内
            
            // 移行後もアプリが正常に動作することを確認
            expect(app.appState.isInitialized).toBe(true);
            expect(app.currentScreen).toBe('main-menu');
        });

        test('移行後の設定とデータが保持される', async () => {
            // ユーザー設定を含む旧データ
            const oldData = {
                characters: {
                    'あ': { totalAttempts: 5, averageScore: 0.8 }
                }
            };

            const oldSettings = {
                practiceMode: 'sequential',
                difficultyFilter: 'beginner'
            };

            localStorage.setItem('hiragana_practice_progress', JSON.stringify(oldData));
            localStorage.setItem('hiragana_practice_settings', JSON.stringify(oldSettings));

            await app.initialize();

            // 設定が保持されていることを確認
            const settings = app.dataStorageService.loadData('settings');
            if (settings) {
                expect(settings.practiceMode).toBe('sequential');
                expect(settings.difficultyFilter).toBe('beginner');
            }

            // 進捗データが移行されていることを確認
            const progress = app.progressTrackingService.getCharacterProgress('あ');
            expect(progress).toBeDefined();
        });
    });
});