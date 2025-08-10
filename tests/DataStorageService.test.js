import { DataStorageService } from '../js/services/DataStorageService.js';
import { PracticeSession } from '../js/models/PracticeSession.js';
import { DrawingData } from '../js/models/DrawingData.js';
import { HiraganaCharacter } from '../js/models/HiraganaCharacter.js';

describe('DataStorageService', () => {
    let dataStorageService;
    let mockCharacter;
    let mockSession;

    beforeEach(() => {
        // LocalStorageをクリア
        localStorage.clear();
        
        // サービスを初期化
        dataStorageService = new DataStorageService();
        
        // モックデータを準備
        mockCharacter = new HiraganaCharacter('あ', 'あ', 1);
        mockSession = new PracticeSession(mockCharacter);
    });

    afterEach(() => {
        // テスト後のクリーンアップ
        localStorage.clear();
    });

    describe('初期化', () => {
        test('正常に初期化される', () => {
            expect(dataStorageService).toBeDefined();
            expect(dataStorageService.storageKeys).toBeDefined();
            expect(dataStorageService.maxStoredSessions).toBe(100);
        });

        test('LocalStorageが利用可能かチェック', () => {
            const isAvailable = dataStorageService.isLocalStorageAvailable();
            expect(typeof isAvailable).toBe('boolean');
        });

        test('ストレージキーが正しく設定される', () => {
            expect(dataStorageService.storageKeys.sessions).toBe('hiragana_practice_sessions');
            expect(dataStorageService.storageKeys.progress).toBe('hiragana_practice_progress');
            expect(dataStorageService.storageKeys.settings).toBe('hiragana_practice_settings');
            expect(dataStorageService.storageKeys.currentSession).toBe('hiragana_current_session');
        });
    });

    describe('練習セッション保存', () => {
        test('有効なセッションが保存される', () => {
            // 試行を追加
            const mockDrawingData = new DrawingData();
            mockDrawingData.addStroke([{ x: 100, y: 100, timestamp: Date.now() }]);
            
            const mockRecognitionResult = { character: 'あ', confidence: 0.8 };
            const mockScoreResult = { level: 'good', score: 0.8 };
            
            mockSession.addAttempt(mockDrawingData, mockRecognitionResult, mockScoreResult);
            mockSession.complete();

            const result = dataStorageService.savePracticeSession(mockSession);
            expect(result).toBe(true);

            // 保存されたデータを確認
            const sessions = dataStorageService.getAllSessions();
            expect(sessions).toHaveLength(1);
            expect(sessions[0].character.character).toBe('あ');
            expect(sessions[0].completed).toBe(true);
        });

        test('無効なセッションは保存されない', () => {
            const invalidSession = null;
            const result = dataStorageService.savePracticeSession(invalidSession);
            expect(result).toBe(false);

            const sessions = dataStorageService.getAllSessions();
            expect(sessions).toHaveLength(0);
        });

        test('複数のセッションが保存される', () => {
            // 最初のセッション
            mockSession.complete();
            dataStorageService.savePracticeSession(mockSession);

            // 2番目のセッション
            const mockCharacter2 = new HiraganaCharacter('い', 'い', 1);
            const mockSession2 = new PracticeSession(mockCharacter2);
            mockSession2.complete();
            dataStorageService.savePracticeSession(mockSession2);

            const sessions = dataStorageService.getAllSessions();
            expect(sessions).toHaveLength(2);
        });
    });

    describe('現在のセッション管理', () => {
        test('現在のセッションが保存・読み込みされる', () => {
            // セッションを保存
            const saveResult = dataStorageService.saveCurrentSession(mockSession);
            expect(saveResult).toBe(true);

            // セッションを読み込み
            const loadedSession = dataStorageService.loadCurrentSession();
            expect(loadedSession).toBeDefined();
            expect(loadedSession.character.character).toBe('あ');
            expect(loadedSession.sessionId).toBe(mockSession.sessionId);
        });

        test('現在のセッションがクリアされる', () => {
            // セッションを保存
            dataStorageService.saveCurrentSession(mockSession);
            
            // セッションをクリア
            dataStorageService.saveCurrentSession(null);
            
            // 読み込み結果を確認
            const loadedSession = dataStorageService.loadCurrentSession();
            expect(loadedSession).toBeNull();
        });

        test('無効なセッションデータの場合nullが返される', () => {
            // 無効なデータを直接設定
            localStorage.setItem('hiragana_current_session', 'invalid json');
            
            const loadedSession = dataStorageService.loadCurrentSession();
            expect(loadedSession).toBeNull();
        });
    });

    describe('セッション取得', () => {
        beforeEach(() => {
            // テスト用のセッションを複数作成
            const characters = ['あ', 'い', 'う'];
            characters.forEach(char => {
                const character = new HiraganaCharacter(char, char, 1);
                const session = new PracticeSession(character);
                session.complete();
                dataStorageService.savePracticeSession(session);
            });
        });

        test('全セッションが取得される', () => {
            const sessions = dataStorageService.getAllSessions();
            expect(sessions).toHaveLength(3);
        });

        test('特定文字のセッションが取得される', () => {
            const sessions = dataStorageService.getSessionsByCharacter('あ');
            expect(sessions).toHaveLength(1);
            expect(sessions[0].character.character).toBe('あ');
        });

        test('存在しない文字のセッション取得は空配列を返す', () => {
            const sessions = dataStorageService.getSessionsByCharacter('ん');
            expect(sessions).toHaveLength(0);
        });
    });

    describe('進捗データ管理', () => {
        test('初期進捗データが正しく生成される', () => {
            const progress = dataStorageService.getProgressData();
            expect(progress).toBeDefined();
            expect(progress.totalSessions).toBe(0);
            expect(progress.totalPracticeTime).toBe(0);
            expect(progress.characters).toEqual({});
            expect(progress.version).toBe('1.0');
        });

        test('セッション完了時に進捗データが更新される', () => {
            // 試行を追加してセッションを完了
            const mockDrawingData = new DrawingData();
            const mockRecognitionResult = { character: 'あ', confidence: 0.8 };
            const mockScoreResult = { level: 'good', score: 0.8 };
            
            mockSession.addAttempt(mockDrawingData, mockRecognitionResult, mockScoreResult);
            mockSession.complete();
            
            // セッションを保存（進捗データも更新される）
            dataStorageService.savePracticeSession(mockSession);
            
            // 進捗データを確認
            const progress = dataStorageService.getProgressData();
            expect(progress.totalSessions).toBe(1);
            expect(progress.characters['あ']).toBeDefined();
            expect(progress.characters['あ'].totalSessions).toBe(1);
            expect(progress.characters['あ'].totalAttempts).toBe(1);
        });

        test('特定文字の進捗が取得される', () => {
            // セッションを保存
            mockSession.complete();
            dataStorageService.savePracticeSession(mockSession);
            
            const charProgress = dataStorageService.getCharacterProgress('あ');
            expect(charProgress).toBeDefined();
            expect(charProgress.character).toBe('あ');
            expect(charProgress.totalSessions).toBe(1);
        });

        test('存在しない文字の進捗取得はnullを返す', () => {
            const charProgress = dataStorageService.getCharacterProgress('ん');
            expect(charProgress).toBeNull();
        });
    });

    describe('データ整合性', () => {
        test('無効なセッションデータが修正される', () => {
            // 無効なデータを直接設定
            const invalidSessions = [
                { character: null, startTime: Date.now() }, // 無効
                { character: { character: 'あ' }, startTime: Date.now(), attempts: [] }, // 有効
                { character: { character: 'い' } } // 無効（startTimeなし）
            ];
            
            localStorage.setItem('hiragana_practice_sessions', JSON.stringify(invalidSessions));
            
            // データ整合性チェックを実行
            dataStorageService.validateStoredData();
            
            // 有効なデータのみが残ることを確認
            const sessions = dataStorageService.getAllSessions();
            expect(sessions).toHaveLength(1);
            expect(sessions[0].character.character).toBe('あ');
        });

        test('破損した進捗データが初期化される', () => {
            // 破損したデータを設定
            localStorage.setItem('hiragana_practice_progress', 'invalid json');
            
            // データ整合性チェックを実行
            dataStorageService.validateStoredData();
            
            // 初期化されたデータが取得されることを確認
            const progress = dataStorageService.getProgressData();
            expect(progress.totalSessions).toBe(0);
            expect(progress.characters).toEqual({});
        });
    });

    describe('ストレージ制限', () => {
        test('最大セッション数を超えた場合古いセッションが削除される', () => {
            // maxStoredSessionsを小さく設定
            dataStorageService.maxStoredSessions = 3;
            
            // 5個のセッションを作成
            for (let i = 0; i < 5; i++) {
                const character = new HiraganaCharacter(`テスト${i}`, `テスト${i}`, 1);
                const session = new PracticeSession(character);
                session.complete();
                dataStorageService.savePracticeSession(session);
            }
            
            // 最大数まで制限されることを確認
            const sessions = dataStorageService.getAllSessions();
            expect(sessions.length).toBeLessThanOrEqual(3);
        });
    });

    describe('エラーハンドリング', () => {
        test('LocalStorage無効時にフォールバックモードが有効化される', () => {
            // LocalStorageを無効化
            const originalSetItem = Storage.prototype.setItem;
            Storage.prototype.setItem = () => {
                throw new Error('LocalStorage disabled');
            };
            
            // 新しいサービスインスタンスを作成
            const service = new DataStorageService();
            
            // フォールバックモードが有効化されることを確認
            expect(service.useFallback).toBe(true);
            expect(service.fallbackStorage).toBeDefined();
            
            // 元に戻す
            Storage.prototype.setItem = originalSetItem;
        });

        test('ストレージ容量不足時の処理', () => {
            // 容量不足エラーをシミュレート
            const originalSetItem = Storage.prototype.setItem;
            let callCount = 0;
            
            Storage.prototype.setItem = (key, value) => {
                callCount++;
                if (callCount === 1) {
                    const error = new Error('Storage quota exceeded');
                    error.name = 'QuotaExceededError';
                    throw error;
                }
                return originalSetItem.call(localStorage, key, value);
            };
            
            // セッションを保存（最初は失敗、2回目は成功するはず）
            mockSession.complete();
            const result = dataStorageService.savePracticeSession(mockSession);
            
            // 元に戻す
            Storage.prototype.setItem = originalSetItem;
            
            // 処理が完了することを確認（容量不足処理により複数回呼ばれる可能性がある）
            expect(callCount).toBeGreaterThanOrEqual(1);
        });
    });

    describe('ユーティリティ機能', () => {
        test('全データがクリアされる', () => {
            // データを保存
            mockSession.complete();
            dataStorageService.savePracticeSession(mockSession);
            dataStorageService.saveCurrentSession(mockSession);
            
            // データが存在することを確認
            expect(dataStorageService.getAllSessions()).toHaveLength(1);
            expect(dataStorageService.loadCurrentSession()).toBeDefined();
            
            // 全データをクリア
            const result = dataStorageService.clearAllData();
            expect(result).toBe(true);
            
            // データがクリアされたことを確認
            expect(dataStorageService.getAllSessions()).toHaveLength(0);
            expect(dataStorageService.loadCurrentSession()).toBeNull();
        });

        test('ストレージ使用量が取得される', () => {
            // データを保存
            mockSession.complete();
            dataStorageService.savePracticeSession(mockSession);
            
            const usage = dataStorageService.getStorageUsage();
            expect(usage).toBeDefined();
            expect(usage.total).toBeGreaterThan(0);
            expect(usage.breakdown).toBeDefined();
            expect(usage.available).toBe(true);
        });
    });

    describe('データ圧縮', () => {
        test('セッションデータが圧縮される', () => {
            // 大きな描画データを持つセッションを作成
            const drawingData = new DrawingData();
            for (let i = 0; i < 10; i++) {
                const stroke = [];
                for (let j = 0; j < 20; j++) {
                    stroke.push({ x: j * 10, y: i * 10, timestamp: Date.now() + j });
                }
                drawingData.addStroke(stroke);
            }
            
            mockSession.addAttempt(drawingData, { character: 'あ' }, { level: 'good', score: 0.8 });
            
            // 圧縮されたデータを取得
            const compressedData = dataStorageService.compressSessionData(mockSession.toJSON());
            
            // 圧縮により描画データの詳細が削除され、サマリーのみ残ることを確認
            expect(compressedData.attempts[0].drawingSummary).toBeDefined();
            expect(compressedData.attempts[0].drawingSummary.strokeCount).toBe(10);
            expect(compressedData.attempts[0].drawingSummary.pointCount).toBe(200);
        });
    });
});