import { PracticeSession } from '../js/models/PracticeSession.js';
import { DrawingData } from '../js/models/DrawingData.js';
import { HiraganaCharacter } from '../js/models/HiraganaCharacter.js';

describe('PracticeSession', () => {
    let mockCharacter;
    let practiceSession;

    beforeEach(() => {
        mockCharacter = new HiraganaCharacter('あ', 'あ', 1);
        practiceSession = new PracticeSession(mockCharacter);
    });

    describe('初期化', () => {
        test('正常に初期化される', () => {
            expect(practiceSession.character).toBe(mockCharacter);
            expect(practiceSession.attempts).toEqual([]);
            expect(practiceSession.startTime).toBeDefined();
            expect(practiceSession.endTime).toBeNull();
            expect(practiceSession.completed).toBe(false);
            expect(practiceSession.sessionId).toBeDefined();
        });

        test('セッションIDがユニークに生成される', () => {
            const session1 = new PracticeSession(mockCharacter);
            const session2 = new PracticeSession(mockCharacter);
            
            expect(session1.sessionId).not.toBe(session2.sessionId);
            expect(session1.sessionId).toContain('session_あ_');
        });

        test('セッションが有効と判定される', () => {
            expect(practiceSession.isValid()).toBe(true);
        });
    });

    describe('試行管理', () => {
        test('試行が正常に追加される', () => {
            const mockDrawingData = new DrawingData();
            mockDrawingData.addStroke([{ x: 100, y: 100, timestamp: Date.now() }]);
            
            const mockRecognitionResult = { character: 'あ', confidence: 0.8 };
            const mockScoreResult = { level: 'good', score: 0.8 };

            practiceSession.addAttempt(mockDrawingData, mockRecognitionResult, mockScoreResult);

            expect(practiceSession.attempts).toHaveLength(1);
            
            const attempt = practiceSession.attempts[0];
            expect(attempt.drawingData).toBe(mockDrawingData);
            expect(attempt.recognitionResult).toBe(mockRecognitionResult);
            expect(attempt.scoreResult).toBe(mockScoreResult);
            expect(attempt.attemptNumber).toBe(1);
            expect(attempt.timestamp).toBeDefined();
        });

        test('複数の試行が順番に追加される', () => {
            const mockDrawingData = new DrawingData();
            const mockRecognitionResult = { character: 'あ', confidence: 0.8 };
            
            // 1回目の試行
            practiceSession.addAttempt(mockDrawingData, mockRecognitionResult, { level: 'fair', score: 0.6 });
            
            // 2回目の試行
            practiceSession.addAttempt(mockDrawingData, mockRecognitionResult, { level: 'good', score: 0.8 });
            
            expect(practiceSession.attempts).toHaveLength(2);
            expect(practiceSession.attempts[0].attemptNumber).toBe(1);
            expect(practiceSession.attempts[1].attemptNumber).toBe(2);
        });
    });

    describe('セッション完了', () => {
        test('セッションが正常に完了される', () => {
            const startTime = practiceSession.startTime;
            
            practiceSession.complete();
            
            expect(practiceSession.completed).toBe(true);
            expect(practiceSession.endTime).toBeDefined();
            expect(practiceSession.endTime).toBeGreaterThanOrEqual(startTime);
        });

        test('セッション時間が正しく計算される', () => {
            const startTime = Date.now() - 5000; // 5秒前
            practiceSession.startTime = startTime;
            
            const duration = practiceSession.getDuration();
            expect(duration).toBeGreaterThan(4000); // 約5秒
            expect(duration).toBeLessThan(6000);
        });

        test('完了前でも現在時刻でセッション時間が計算される', () => {
            const startTime = Date.now() - 3000; // 3秒前
            practiceSession.startTime = startTime;
            
            const duration = practiceSession.getDuration();
            expect(duration).toBeGreaterThan(2000); // 約3秒
            expect(duration).toBeLessThan(4000);
        });
    });

    describe('スコア統計', () => {
        beforeEach(() => {
            // テスト用の試行データを追加
            const mockDrawingData = new DrawingData();
            
            practiceSession.addAttempt(mockDrawingData, { character: 'あ' }, { level: 'fair', score: 0.6 });
            practiceSession.addAttempt(mockDrawingData, { character: 'あ' }, { level: 'good', score: 0.8 });
            practiceSession.addAttempt(mockDrawingData, { character: 'あ' }, { level: 'excellent', score: 0.9 });
        });

        test('最高スコアの試行が取得される', () => {
            const bestAttempt = practiceSession.getBestAttempt();
            
            expect(bestAttempt).toBeDefined();
            expect(bestAttempt.scoreResult.score).toBe(0.9);
            expect(bestAttempt.scoreResult.level).toBe('excellent');
        });

        test('平均スコアが正しく計算される', () => {
            const averageScore = practiceSession.getAverageScore();
            
            // (0.6 + 0.8 + 0.9) / 3 = 0.7666...
            expect(averageScore).toBeCloseTo(0.7667, 3);
        });

        test('試行がない場合の統計処理', () => {
            const emptySession = new PracticeSession(mockCharacter);
            
            expect(emptySession.getBestAttempt()).toBeNull();
            expect(emptySession.getAverageScore()).toBe(0);
        });

        test('スコアがない試行の処理', () => {
            const sessionWithoutScores = new PracticeSession(mockCharacter);
            const mockDrawingData = new DrawingData();
            
            // スコアなしの試行を追加
            sessionWithoutScores.addAttempt(mockDrawingData, { character: 'あ' }, null);
            sessionWithoutScores.addAttempt(mockDrawingData, { character: 'あ' }, { level: 'good' }); // scoreプロパティなし
            
            expect(sessionWithoutScores.getBestAttempt().scoreResult).toBeNull();
            expect(sessionWithoutScores.getAverageScore()).toBe(0);
        });
    });

    describe('シリアライゼーション', () => {
        test('セッションが正しくJSONに変換される', () => {
            // 試行を追加
            const mockDrawingData = new DrawingData();
            practiceSession.addAttempt(mockDrawingData, { character: 'あ' }, { level: 'good', score: 0.8 });
            practiceSession.complete();

            const json = practiceSession.toJSON();

            expect(json.sessionId).toBe(practiceSession.sessionId);
            expect(json.character).toBe(mockCharacter);
            expect(json.attempts).toHaveLength(1);
            expect(json.startTime).toBe(practiceSession.startTime);
            expect(json.endTime).toBe(practiceSession.endTime);
            expect(json.completed).toBe(true);
            expect(json.duration).toBeDefined();
            expect(json.attemptCount).toBe(1);
            expect(json.averageScore).toBe(0.8);
            expect(json.bestScore).toBe(0.8);
        });

        test('JSONからセッションが正しく復元される', () => {
            // 元のセッションを準備
            const mockDrawingData = new DrawingData();
            practiceSession.addAttempt(mockDrawingData, { character: 'あ' }, { level: 'good', score: 0.8 });
            practiceSession.complete();

            // JSON化
            const json = practiceSession.toJSON();

            // 復元
            const restoredSession = PracticeSession.fromJSON(json);

            expect(restoredSession.sessionId).toBe(practiceSession.sessionId);
            expect(restoredSession.character).toEqual(mockCharacter);
            expect(restoredSession.attempts).toHaveLength(1);
            expect(restoredSession.startTime).toBe(practiceSession.startTime);
            expect(restoredSession.endTime).toBe(practiceSession.endTime);
            expect(restoredSession.completed).toBe(true);
        });

        test('不完全なJSONデータからの復元', () => {
            const incompleteJson = {
                sessionId: 'test_session',
                character: mockCharacter,
                startTime: Date.now()
                // attempts, endTime, completedが欠如
            };

            const restoredSession = PracticeSession.fromJSON(incompleteJson);

            expect(restoredSession.sessionId).toBe('test_session');
            expect(restoredSession.character).toEqual(mockCharacter);
            expect(restoredSession.attempts).toEqual([]);
            expect(restoredSession.endTime).toBeUndefined();
            expect(restoredSession.completed).toBe(false);
        });
    });

    describe('バリデーション', () => {
        test('有効なセッションが正しく判定される', () => {
            expect(practiceSession.isValid()).toBe(true);
        });

        test('文字がないセッションは無効と判定される', () => {
            practiceSession.character = null;
            expect(practiceSession.isValid()).toBe(false);
        });

        test('開始時刻がないセッションは無効と判定される', () => {
            practiceSession.startTime = null;
            expect(practiceSession.isValid()).toBe(false);
        });

        test('セッションIDがないセッションは無効と判定される', () => {
            practiceSession.sessionId = null;
            expect(practiceSession.isValid()).toBe(false);
        });

        test('試行配列が配列でないセッションは無効と判定される', () => {
            practiceSession.attempts = null;
            expect(practiceSession.isValid()).toBe(false);
        });
    });

    describe('エッジケース', () => {
        test('同時刻に複数の試行が追加される場合', () => {
            const mockDrawingData = new DrawingData();
            const mockRecognitionResult = { character: 'あ' };
            
            // 同じタイムスタンプで複数の試行を追加
            const originalNow = Date.now;
            const fixedTime = 1234567890000;
            Date.now = () => fixedTime;

            practiceSession.addAttempt(mockDrawingData, mockRecognitionResult, { score: 0.6 });
            practiceSession.addAttempt(mockDrawingData, mockRecognitionResult, { score: 0.8 });

            Date.now = originalNow;

            expect(practiceSession.attempts).toHaveLength(2);
            expect(practiceSession.attempts[0].timestamp).toBe(fixedTime);
            expect(practiceSession.attempts[1].timestamp).toBe(fixedTime);
            expect(practiceSession.attempts[0].attemptNumber).toBe(1);
            expect(practiceSession.attempts[1].attemptNumber).toBe(2);
        });

        test('非常に長いセッション時間の処理', () => {
            const veryOldTime = Date.now() - (24 * 60 * 60 * 1000); // 24時間前
            practiceSession.startTime = veryOldTime;
            
            const duration = practiceSession.getDuration();
            expect(duration).toBeGreaterThan(24 * 60 * 60 * 1000 - 1000); // 約24時間
        });

        test('未来の開始時刻の処理', () => {
            const futureTime = Date.now() + 1000; // 1秒後
            practiceSession.startTime = futureTime;
            
            const duration = practiceSession.getDuration();
            // 負の値になる可能性があるが、エラーにはならない
            expect(typeof duration).toBe('number');
        });
    });
});