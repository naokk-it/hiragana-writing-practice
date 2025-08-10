/**
 * 練習セッションデータモデル
 * 各練習セッションの情報を管理するクラス
 */
export class PracticeSession {
    constructor(character) {
        this.character = character;
        this.attempts = [];
        this.startTime = Date.now();
        this.endTime = null;
        this.completed = false;
        this.sessionId = this.generateSessionId();
    }

    /**
     * セッションIDを生成
     * @returns {string} ユニークなセッションID
     */
    generateSessionId() {
        return `session_${this.character.character}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 試行を追加
     * @param {Object} drawingData 描画データ
     * @param {Object} recognitionResult 認識結果
     * @param {Object} scoreResult 採点結果
     */
    addAttempt(drawingData, recognitionResult, scoreResult) {
        const attempt = {
            timestamp: Date.now(),
            drawingData: drawingData,
            recognitionResult: recognitionResult,
            scoreResult: scoreResult,
            attemptNumber: this.attempts.length + 1
        };

        this.attempts.push(attempt);
        console.log(`試行追加: ${this.character.character} - 試行${attempt.attemptNumber}`);
    }

    /**
     * セッションを完了
     */
    complete() {
        this.completed = true;
        this.endTime = Date.now();
        console.log(`セッション完了: ${this.character.character}`);
    }

    /**
     * セッション時間を取得（ミリ秒）
     * @returns {number} セッション時間
     */
    getDuration() {
        const endTime = this.endTime || Date.now();
        return endTime - this.startTime;
    }

    /**
     * 最高スコアを取得
     * @returns {Object|null} 最高スコアの試行
     */
    getBestAttempt() {
        if (this.attempts.length === 0) return null;

        return this.attempts.reduce((best, current) => {
            const currentScore = current.scoreResult?.score || 0;
            const bestScore = best.scoreResult?.score || 0;
            return currentScore > bestScore ? current : best;
        });
    }

    /**
     * 平均スコアを取得
     * @returns {number} 平均スコア
     */
    getAverageScore() {
        if (this.attempts.length === 0) return 0;

        const totalScore = this.attempts.reduce((sum, attempt) => {
            return sum + (attempt.scoreResult?.score || 0);
        }, 0);

        return totalScore / this.attempts.length;
    }

    /**
     * セッションデータをシリアライズ
     * @returns {Object} シリアライズされたデータ
     */
    toJSON() {
        return {
            sessionId: this.sessionId,
            character: this.character,
            attempts: this.attempts,
            startTime: this.startTime,
            endTime: this.endTime,
            completed: this.completed,
            duration: this.getDuration(),
            attemptCount: this.attempts.length,
            averageScore: this.getAverageScore(),
            bestScore: this.getBestAttempt()?.scoreResult?.score || 0
        };
    }

    /**
     * JSONデータからセッションを復元
     * @param {Object} data シリアライズされたデータ
     * @returns {PracticeSession} 復元されたセッション
     */
    static fromJSON(data) {
        const session = new PracticeSession(data.character);
        session.sessionId = data.sessionId;
        session.attempts = data.attempts || [];
        session.startTime = data.startTime;
        session.endTime = data.endTime;
        session.completed = data.completed || false;
        return session;
    }

    /**
     * セッションが有効かチェック
     * @returns {boolean} 有効なセッションかどうか
     */
    isValid() {
        return !!(this.character && 
                 this.startTime && 
                 this.sessionId && 
                 Array.isArray(this.attempts));
    }
}