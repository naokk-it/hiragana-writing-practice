import { DataStorageService } from '../js/services/DataStorageService.js';
import { PracticeSession } from '../js/models/PracticeSession.js';
import { DrawingData } from '../js/models/DrawingData.js';
import { HiraganaCharacter } from '../js/models/HiraganaCharacter.js';

describe('データ永続化統合テスト', () => {
    let dataStorageService;

    beforeEach(() => {
        // LocalStorageをクリア
        localStorage.clear();
        dataStorageService = new DataStorageService();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('ブラウザ再起動シミュレーション', () => {
        test('セッションデータがブラウザ再起動後も復元される', () => {
            // 1. 練習セッションを作成・保存
            const character = new HiraganaCharacter('あ', 'あ', 1);
            const session = new PracticeSession(character);
            
            // 試行を追加
            const drawingData = new DrawingData();
            drawingData.addStroke([
                { x: 100, y: 100, timestamp: Date.now() },
                { x: 110, y: 110, timestamp: Date.now() + 10 }
            ]);
            
            session.addAttempt(
                drawingData,
                { character: 'あ', confidence: 0.8 },
                { level: 'good', score: 0.8 }
            );
            
            // 現在のセッションとして保存
            const saveResult = dataStorageService.saveCurrentSession(session);
            expect(saveResult).toBe(true);
            
            // 2. 新しいDataStorageServiceインスタンスを作成（ブラウザ再起動をシミュレート）
            const newDataStorageService = new DataStorageService();
            
            // 3. セッションが復元されることを確認
            const restoredSession = newDataStorageService.loadCurrentSession();
            expect(restoredSession).toBeDefined();
            expect(restoredSession.character.character).toBe('あ');
            expect(restoredSession.attempts).toHaveLength(1);
            expect(restoredSession.attempts[0].scoreResult.score).toBe(0.8);
        });

        test('完了したセッションがブラウザ再起動後も保持される', () => {
            // 1. 複数のセッションを作成・完了・保存
            const characters = ['あ', 'い', 'う'];
            const sessions = [];
            
            characters.forEach(char => {
                const character = new HiraganaCharacter(char, char, 1);
                const session = new PracticeSession(character);
                
                // 試行を追加
                const drawingData = new DrawingData();
                drawingData.addStroke([{ x: 100, y: 100, timestamp: Date.now() }]);
                
                session.addAttempt(
                    drawingData,
                    { character: char, confidence: 0.8 },
                    { level: 'good', score: 0.8 }
                );
                
                session.complete();
                dataStorageService.savePracticeSession(session);
                sessions.push(session);
            });
            
            // 2. 新しいDataStorageServiceインスタンスを作成
            const newDataStorageService = new DataStorageService();
            
            // 3. 全セッションが復元されることを確認
            const restoredSessions = newDataStorageService.getAllSessions();
            expect(restoredSessions).toHaveLength(3);
            
            // 各セッションの内容を確認
            characters.forEach(char => {
                const sessionForChar = restoredSessions.find(s => s.character.character === char);
                expect(sessionForChar).toBeDefined();
                expect(sessionForChar.completed).toBe(true);
                expect(sessionForChar.attempts).toHaveLength(1);
            });
        });

        test('進捗データがブラウザ再起動後も保持される', () => {
            // 1. セッションを完了して進捗データを生成
            const character = new HiraganaCharacter('あ', 'あ', 1);
            const session = new PracticeSession(character);
            
            const drawingData = new DrawingData();
            drawingData.addStroke([{ x: 100, y: 100, timestamp: Date.now() }]);
            
            session.addAttempt(
                drawingData,
                { character: 'あ', confidence: 0.8 },
                { level: 'good', score: 0.8 }
            );
            
            session.complete();
            dataStorageService.savePracticeSession(session);
            
            // 2. 新しいDataStorageServiceインスタンスを作成
            const newDataStorageService = new DataStorageService();
            
            // 3. 進捗データが復元されることを確認
            const progress = newDataStorageService.getProgressData();
            expect(progress.totalSessions).toBe(1);
            expect(progress.characters['あ']).toBeDefined();
            expect(progress.characters['あ'].totalSessions).toBe(1);
            expect(progress.characters['あ'].totalAttempts).toBe(1);
        });
    });

    describe('データ整合性の維持', () => {
        test('破損したデータが自動修復される', () => {
            // 1. 破損したセッションデータを直接設定
            const corruptedSessions = [
                {
                    // 有効なセッション
                    sessionId: 'valid_session',
                    character: { character: 'あ', reading: 'あ', difficulty: 1 },
                    startTime: Date.now(),
                    attempts: [],
                    completed: true
                },
                {
                    // 無効なセッション（characterがnull）
                    sessionId: 'invalid_session_1',
                    character: null,
                    startTime: Date.now(),
                    attempts: []
                },
                {
                    // 無効なセッション（startTimeがない）
                    sessionId: 'invalid_session_2',
                    character: { character: 'い', reading: 'い', difficulty: 1 },
                    attempts: []
                }
            ];
            
            localStorage.setItem('hiragana_practice_sessions', JSON.stringify(corruptedSessions));
            
            // 2. 新しいDataStorageServiceインスタンスを作成（自動修復が実行される）
            const newDataStorageService = new DataStorageService();
            
            // 3. 有効なセッションのみが残ることを確認
            const sessions = newDataStorageService.getAllSessions();
            expect(sessions).toHaveLength(1);
            expect(sessions[0].sessionId).toBe('valid_session');
            expect(sessions[0].character.character).toBe('あ');
        });

        test('破損した進捗データが初期化される', () => {
            // 1. 破損した進捗データを設定
            localStorage.setItem('hiragana_practice_progress', 'invalid json data');
            
            // 2. 新しいDataStorageServiceインスタンスを作成
            const newDataStorageService = new DataStorageService();
            
            // 3. 初期化された進捗データが取得されることを確認
            const progress = newDataStorageService.getProgressData();
            expect(progress.totalSessions).toBe(0);
            expect(progress.totalPracticeTime).toBe(0);
            expect(progress.characters).toEqual({});
            expect(progress.version).toBe('1.0');
        });
    });

    describe('大量データの処理', () => {
        test('大量のセッションデータが正しく処理される', () => {
            // 1. 大量のセッションを作成
            const sessionCount = 150; // maxStoredSessions(100)を超える数
            const characters = ['あ', 'い', 'う', 'え', 'お'];
            
            for (let i = 0; i < sessionCount; i++) {
                const char = characters[i % characters.length];
                const character = new HiraganaCharacter(char, char, 1);
                const session = new PracticeSession(character);
                
                // セッション時刻を調整（古いものから新しいものへ）
                session.startTime = Date.now() - (sessionCount - i) * 1000;
                
                session.complete();
                dataStorageService.savePracticeSession(session);
            }
            
            // 2. 制限数まで削減されることを確認
            const sessions = dataStorageService.getAllSessions();
            expect(sessions.length).toBeLessThanOrEqual(dataStorageService.maxStoredSessions);
            
            // 3. 新しいセッションが優先的に保持されることを確認
            const latestSession = sessions.reduce((latest, current) => {
                return (current.startTime || 0) > (latest.startTime || 0) ? current : latest;
            });
            expect(latestSession.startTime).toBeGreaterThan(Date.now() - 100 * 1000);
        });
    });

    describe('エラー耐性', () => {
        test('LocalStorage無効時でもアプリケーションが動作する', () => {
            // 1. LocalStorageを無効化
            const originalSetItem = Storage.prototype.setItem;
            const originalGetItem = Storage.prototype.getItem;
            
            Storage.prototype.setItem = () => {
                throw new Error('LocalStorage disabled');
            };
            Storage.prototype.getItem = () => {
                throw new Error('LocalStorage disabled');
            };
            
            // 2. 新しいDataStorageServiceインスタンスを作成
            const fallbackService = new DataStorageService();
            
            // 3. フォールバックモードで動作することを確認
            expect(fallbackService.useFallback).toBe(true);
            
            // 4. 基本的な操作が可能であることを確認
            const character = new HiraganaCharacter('あ', 'あ', 1);
            const session = new PracticeSession(character);
            
            // フォールバックモードでは保存は失敗するが、エラーにはならない
            const result = fallbackService.savePracticeSession(session);
            expect(typeof result).toBe('boolean');
            
            // 5. 元に戻す
            Storage.prototype.setItem = originalSetItem;
            Storage.prototype.getItem = originalGetItem;
        });
    });

    describe('パフォーマンス', () => {
        test('大きな描画データの保存・読み込みが適切な時間で完了する', () => {
            // 1. 大きな描画データを持つセッションを作成
            const character = new HiraganaCharacter('あ', 'あ', 1);
            const session = new PracticeSession(character);
            
            const drawingData = new DrawingData();
            
            // 複雑な描画データを生成
            for (let i = 0; i < 20; i++) {
                const stroke = [];
                for (let j = 0; j < 50; j++) {
                    stroke.push({
                        x: Math.random() * 400,
                        y: Math.random() * 400,
                        timestamp: Date.now() + i * 100 + j
                    });
                }
                drawingData.addStroke(stroke);
            }
            
            session.addAttempt(
                drawingData,
                { character: 'あ', confidence: 0.8 },
                { level: 'good', score: 0.8 }
            );
            
            session.complete();
            
            // 2. 保存時間を測定
            const saveStartTime = performance.now();
            const saveResult = dataStorageService.savePracticeSession(session);
            const saveEndTime = performance.now();
            
            expect(saveResult).toBe(true);
            expect(saveEndTime - saveStartTime).toBeLessThan(100); // 100ms以内
            
            // 3. 読み込み時間を測定
            const loadStartTime = performance.now();
            const sessions = dataStorageService.getAllSessions();
            const loadEndTime = performance.now();
            
            expect(sessions).toHaveLength(1);
            expect(loadEndTime - loadStartTime).toBeLessThan(50); // 50ms以内
        });
    });
});