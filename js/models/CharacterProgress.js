/**
 * 文字進捗データモデル
 * 各文字の練習進捗を管理するクラス
 */
export class CharacterProgress {
    constructor(character) {
        this.character = character;
        this.attempts = []; // 練習試行の配列
        this.createdAt = Date.now();
        this.updatedAt = Date.now();
    }

    /**
     * 練習試行を追加
     * @param {number} score スコア（0-1）
     * @param {number} timestamp タイムスタンプ
     * @param {Object} details 詳細情報
     */
    addAttempt(score, timestamp = Date.now(), details = {}) {
        const attempt = {
            score: Math.max(0, Math.min(1, score)), // 0-1の範囲に制限
            timestamp: timestamp,
            details: details
        };

        this.attempts.push(attempt);
        this.updatedAt = timestamp;

        // 古い試行データを制限（最新100件まで保持）
        if (this.attempts.length > 100) {
            this.attempts = this.attempts.slice(-100);
        }

        console.log(`文字 ${this.character} の試行追加: スコア ${score.toFixed(2)}`);
    }

    /**
     * 平均スコアを取得
     * @param {number} recentCount 最近の試行数（指定しない場合は全て）
     * @returns {number} 平均スコア
     */
    getAverageScore(recentCount = null) {
        if (this.attempts.length === 0) return 0;

        const targetAttempts = recentCount 
            ? this.attempts.slice(-recentCount)
            : this.attempts;

        const totalScore = targetAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
        return totalScore / targetAttempts.length;
    }

    /**
     * 試行回数を取得
     * @returns {number} 総試行回数
     */
    getAttemptCount() {
        return this.attempts.length;
    }

    /**
     * 最後の練習時刻を取得
     * @returns {number|null} 最後の練習時刻（タイムスタンプ）
     */
    getLastPracticeTime() {
        if (this.attempts.length === 0) return null;
        return this.attempts[this.attempts.length - 1].timestamp;
    }

    /**
     * 習得レベルを取得
     * @returns {number} 習得レベル（0-1）
     */
    getMasteryLevel() {
        if (this.attempts.length === 0) return 0;

        // 最近の試行を重視した習得レベル計算
        const recentAttempts = Math.min(10, this.attempts.length);
        const recentAverage = this.getAverageScore(recentAttempts);
        
        // 試行回数による重み付け
        const attemptWeight = Math.min(1, this.attempts.length / 5); // 5回で最大重み
        
        // 一貫性の評価（スコアの安定性）
        const consistency = this.getConsistency();
        
        // 総合習得レベル
        const masteryLevel = recentAverage * attemptWeight * consistency;
        
        return Math.max(0, Math.min(1, masteryLevel));
    }

    /**
     * 練習が必要かチェック
     * @param {number} threshold 閾値（習得レベル）
     * @returns {boolean} 練習が必要かどうか
     */
    needsPractice(threshold = 0.7) {
        const masteryLevel = this.getMasteryLevel();
        const daysSinceLastPractice = this.getDaysSinceLastPractice();
        
        // 習得レベルが閾値未満、または長期間練習していない場合
        return masteryLevel < threshold || daysSinceLastPractice > 7;
    }

    /**
     * 最後の練習からの日数を取得
     * @returns {number} 日数
     */
    getDaysSinceLastPractice() {
        const lastPractice = this.getLastPracticeTime();
        if (!lastPractice) return Infinity;
        
        const daysDiff = (Date.now() - lastPractice) / (1000 * 60 * 60 * 24);
        return Math.floor(daysDiff);
    }

    /**
     * スコアの一貫性を取得
     * @returns {number} 一貫性（0-1、1が最も一貫している）
     */
    getConsistency() {
        if (this.attempts.length < 3) return 0.5; // デフォルト値

        const recentAttempts = this.attempts.slice(-10); // 最近10回
        const scores = recentAttempts.map(attempt => attempt.score);
        
        // 標準偏差を計算
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const standardDeviation = Math.sqrt(variance);
        
        // 一貫性スコア（標準偏差が小さいほど一貫している）
        const consistency = Math.max(0, 1 - (standardDeviation * 2));
        
        return consistency;
    }

    /**
     * 改善傾向を取得
     * @returns {number} 改善傾向（-1から1、正の値は改善傾向）
     */
    getImprovementTrend() {
        if (this.attempts.length < 5) return 0;

        const recentAttempts = this.attempts.slice(-10);
        const firstHalf = recentAttempts.slice(0, Math.floor(recentAttempts.length / 2));
        const secondHalf = recentAttempts.slice(Math.floor(recentAttempts.length / 2));

        const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a.score, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a.score, 0) / secondHalf.length;

        return secondHalfAvg - firstHalfAvg;
    }

    /**
     * 最高スコアを取得
     * @returns {number} 最高スコア
     */
    getBestScore() {
        if (this.attempts.length === 0) return 0;
        return Math.max(...this.attempts.map(attempt => attempt.score));
    }

    /**
     * 最低スコアを取得
     * @returns {number} 最低スコア
     */
    getWorstScore() {
        if (this.attempts.length === 0) return 0;
        return Math.min(...this.attempts.map(attempt => attempt.score));
    }

    /**
     * 練習頻度を取得（週あたりの練習回数）
     * @returns {number} 週あたりの練習回数
     */
    getPracticeFrequency() {
        if (this.attempts.length === 0) return 0;

        const firstAttempt = this.attempts[0].timestamp;
        const lastAttempt = this.attempts[this.attempts.length - 1].timestamp;
        const weeksDiff = (lastAttempt - firstAttempt) / (1000 * 60 * 60 * 24 * 7);

        if (weeksDiff < 0.1) return this.attempts.length; // 1日未満の場合

        return this.attempts.length / Math.max(1, weeksDiff);
    }

    /**
     * 統計情報を取得
     * @returns {Object} 統計情報
     */
    getStatistics() {
        return {
            character: this.character,
            attemptCount: this.getAttemptCount(),
            averageScore: this.getAverageScore(),
            recentAverageScore: this.getAverageScore(5),
            masteryLevel: this.getMasteryLevel(),
            bestScore: this.getBestScore(),
            worstScore: this.getWorstScore(),
            consistency: this.getConsistency(),
            improvementTrend: this.getImprovementTrend(),
            practiceFrequency: this.getPracticeFrequency(),
            daysSinceLastPractice: this.getDaysSinceLastPractice(),
            needsPractice: this.needsPractice(),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * データをシリアライズ（保存用）
     * @returns {Object} シリアライズされたデータ
     */
    serialize() {
        return {
            character: this.character,
            attempts: this.attempts,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * データをデシリアライズ（復元用）
     * @param {Object} data シリアライズされたデータ
     * @returns {CharacterProgress} 復元されたインスタンス
     */
    static deserialize(data) {
        const progress = new CharacterProgress(data.character);
        progress.attempts = data.attempts || [];
        progress.createdAt = data.createdAt || Date.now();
        progress.updatedAt = data.updatedAt || Date.now();
        return progress;
    }

    /**
     * データの妥当性をチェック
     * @returns {boolean} データが有効かどうか
     */
    isValid() {
        if (!this.character) return false;
        if (!Array.isArray(this.attempts)) return false;
        
        // 各試行データの妥当性をチェック
        return this.attempts.every(attempt => 
            typeof attempt.score === 'number' &&
            attempt.score >= 0 && attempt.score <= 1 &&
            typeof attempt.timestamp === 'number' &&
            attempt.timestamp > 0
        );
    }

    /**
     * 古いデータをクリーンアップ
     * @param {number} maxAge 最大保持期間（日数）
     */
    cleanup(maxAge = 90) {
        const cutoffTime = Date.now() - (maxAge * 24 * 60 * 60 * 1000);
        this.attempts = this.attempts.filter(attempt => attempt.timestamp > cutoffTime);
        
        if (this.attempts.length > 0) {
            this.updatedAt = Date.now();
        }
    }
}