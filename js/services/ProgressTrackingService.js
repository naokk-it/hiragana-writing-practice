import { CharacterProgress } from '../models/CharacterProgress.js';

/**
 * 進捗追跡サービス
 * 文字別の練習進捗を管理し、統計情報を提供
 */
export class ProgressTrackingService {
    constructor(dataStorageService) {
        this.dataStorageService = dataStorageService;
        this.characterProgressMap = new Map(); // 文字別進捗データ
        this.sessionData = {
            startTime: null,
            totalPracticeTime: 0,
            sessionsCount: 0
        };
        
        this.loadProgressData();
        console.log('ProgressTrackingService初期化完了');
    }

    /**
     * 文字の練習を記録
     * @param {string} character 文字
     * @param {number} score スコア（0-1）
     * @param {number} timestamp タイムスタンプ
     * @param {Object} details 詳細情報
     */
    recordCharacterPractice(character, score, timestamp = Date.now(), details = {}) {
        try {
            // 文字の進捗データを取得または作成
            let progress = this.characterProgressMap.get(character);
            if (!progress) {
                progress = new CharacterProgress(character);
                this.characterProgressMap.set(character, progress);
            }

            // 試行を記録
            progress.addAttempt(score, timestamp, details);

            // データを保存
            this.saveProgressData();

            console.log(`文字 ${character} の練習記録: スコア ${score.toFixed(2)}`);

        } catch (error) {
            console.error('練習記録エラー:', error);
        }
    }

    /**
     * 文字の統計情報を取得
     * @param {string} character 文字
     * @returns {Object|null} 統計情報
     */
    getCharacterStatistics(character) {
        const progress = this.characterProgressMap.get(character);
        return progress ? progress.getStatistics() : null;
    }

    /**
     * 文字の進捗データを取得
     * @param {string} character 文字
     * @returns {CharacterProgress|null} 進捗データ
     */
    getCharacterProgress(character) {
        return this.characterProgressMap.get(character) || null;
    }

    /**
     * 全体の進捗を取得
     * @returns {Object} 全体進捗情報
     */
    getOverallProgress() {
        const allCharacters = Array.from(this.characterProgressMap.keys());
        const totalCharacters = 46; // 全ひらがな文字数

        let totalAttempts = 0;
        let totalScore = 0;
        let masteredCharacters = 0;
        let practicedCharacters = allCharacters.length;

        const difficultyProgress = {};
        const categoryProgress = {};

        allCharacters.forEach(character => {
            const progress = this.characterProgressMap.get(character);
            if (progress) {
                const stats = progress.getStatistics();
                totalAttempts += stats.attemptCount;
                totalScore += stats.averageScore * stats.attemptCount;

                if (stats.masteryLevel >= 0.7) {
                    masteredCharacters++;
                }
            }
        });

        const overallAverageScore = totalAttempts > 0 ? totalScore / totalAttempts : 0;
        const completionRate = practicedCharacters / totalCharacters;
        const masteryRate = masteredCharacters / totalCharacters;

        return {
            totalCharacters: totalCharacters,
            practicedCharacters: practicedCharacters,
            masteredCharacters: masteredCharacters,
            unpracticedCharacters: totalCharacters - practicedCharacters,
            totalAttempts: totalAttempts,
            overallAverageScore: overallAverageScore,
            completionRate: completionRate,
            masteryRate: masteryRate,
            sessionData: { ...this.sessionData }
        };
    }

    /**
     * 未練習の文字を取得
     * @returns {Array<string>} 未練習文字の配列
     */
    getUnpracticedCharacters() {
        // 全ひらがな文字のリスト（実際のアプリではHiraganaDataServiceから取得）
        const allHiraganaCharacters = [
            'あ', 'い', 'う', 'え', 'お',
            'か', 'き', 'く', 'け', 'こ',
            'さ', 'し', 'す', 'せ', 'そ',
            'た', 'ち', 'つ', 'て', 'と',
            'な', 'に', 'ぬ', 'ね', 'の',
            'は', 'ひ', 'ふ', 'へ', 'ほ',
            'ま', 'み', 'む', 'め', 'も',
            'や', 'ゆ', 'よ',
            'ら', 'り', 'る', 'れ', 'ろ',
            'わ', 'を', 'ん'
        ];

        return allHiraganaCharacters.filter(character => 
            !this.characterProgressMap.has(character)
        );
    }

    /**
     * 最近練習した文字を取得
     * @param {number} timeWindow 時間窓（ミリ秒）
     * @returns {Array<Object>} 最近練習した文字の情報
     */
    getRecentlyPracticedCharacters(timeWindow = 24 * 60 * 60 * 1000) { // デフォルト24時間
        const cutoffTime = Date.now() - timeWindow;
        const recentCharacters = [];

        this.characterProgressMap.forEach((progress, character) => {
            const lastPracticeTime = progress.getLastPracticeTime();
            if (lastPracticeTime && lastPracticeTime > cutoffTime) {
                recentCharacters.push({
                    character: character,
                    lastPracticeTime: lastPracticeTime,
                    statistics: progress.getStatistics()
                });
            }
        });

        // 最新の練習順でソート
        return recentCharacters.sort((a, b) => b.lastPracticeTime - a.lastPracticeTime);
    }

    /**
     * 習得レベルを計算
     * @param {string} character 文字
     * @returns {number} 習得レベル（0-1）
     */
    calculateMasteryLevel(character) {
        const progress = this.characterProgressMap.get(character);
        return progress ? progress.getMasteryLevel() : 0;
    }

    /**
     * 練習が必要な文字を取得
     * @param {number} threshold 習得レベル閾値
     * @returns {Array<Object>} 練習が必要な文字の情報
     */
    getCharactersNeedingPractice(threshold = 0.7) {
        const needsPractice = [];

        this.characterProgressMap.forEach((progress, character) => {
            if (progress.needsPractice(threshold)) {
                needsPractice.push({
                    character: character,
                    masteryLevel: progress.getMasteryLevel(),
                    daysSinceLastPractice: progress.getDaysSinceLastPractice(),
                    priority: this.calculatePracticePriority(progress)
                });
            }
        });

        // 優先度順でソート
        return needsPractice.sort((a, b) => b.priority - a.priority);
    }

    /**
     * 練習優先度を計算
     * @param {CharacterProgress} progress 進捗データ
     * @returns {number} 優先度スコア
     */
    calculatePracticePriority(progress) {
        const masteryLevel = progress.getMasteryLevel();
        const daysSinceLastPractice = progress.getDaysSinceLastPractice();
        const improvementTrend = progress.getImprovementTrend();

        // 習得レベルが低いほど優先度高
        let priority = (1 - masteryLevel) * 0.4;

        // 長期間練習していないほど優先度高
        priority += Math.min(daysSinceLastPractice / 7, 1) * 0.3;

        // 改善傾向が悪いほど優先度高
        priority += Math.max(0, -improvementTrend) * 0.2;

        // 試行回数が少ないほど優先度高
        const attemptCount = progress.getAttemptCount();
        priority += Math.max(0, (5 - attemptCount) / 5) * 0.1;

        return Math.max(0, Math.min(1, priority));
    }

    /**
     * 難易度別進捗を取得（旧システム互換性維持）
     * @returns {Object} 難易度別進捗情報
     */
    getProgressByDifficulty() {
        // 旧システムとの互換性を維持
        const difficultyMap = {
            1: ['あ', 'い', 'う', 'え', 'お'],
            2: ['か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と', 'な', 'に', 'ぬ', 'ね', 'の'],
            3: ['は', 'ひ', 'ふ', 'へ', 'ほ', 'ま', 'み', 'む', 'め', 'も', 'や', 'ゆ', 'よ'],
            4: ['ら', 'り', 'る', 'れ', 'ろ', 'わ', 'を', 'ん']
        };

        // 新しい画数複雑度システムの進捗も含める
        const strokeComplexityProgress = this.getProgressByStrokeComplexity();
        
        const difficultyProgress = {};

        Object.keys(difficultyMap).forEach(difficulty => {
            const characters = difficultyMap[difficulty];
            let totalScore = 0;
            let totalAttempts = 0;
            let masteredCount = 0;
            let practicedCount = 0;

            characters.forEach(character => {
                const progress = this.characterProgressMap.get(character);
                if (progress) {
                    practicedCount++;
                    const stats = progress.getStatistics();
                    totalScore += stats.averageScore * stats.attemptCount;
                    totalAttempts += stats.attemptCount;

                    if (stats.masteryLevel >= 0.7) {
                        masteredCount++;
                    }
                }
            });

            difficultyProgress[difficulty] = {
                totalCharacters: characters.length,
                practicedCharacters: practicedCount,
                masteredCharacters: masteredCount,
                averageScore: totalAttempts > 0 ? totalScore / totalAttempts : 0,
                completionRate: practicedCount / characters.length,
                masteryRate: masteredCount / characters.length
            };
        });

        // 新しいシステムの進捗も追加
        Object.assign(difficultyProgress, strokeComplexityProgress);

        return difficultyProgress;
    }

    /**
     * 画数複雑度別進捗を取得（新システム）
     * @returns {Object} 画数複雑度別進捗情報
     */
    getProgressByStrokeComplexity() {
        // 新しい3段階難易度システムの文字分類
        const strokeComplexityMap = {
            'beginner': ['く', 'し', 'つ', 'て', 'そ', 'の', 'へ', 'ん', 'い', 'う', 'り'],
            'intermediate': ['あ', 'お', 'か', 'け', 'こ', 'さ', 'せ', 'に', 'は', 'ま', 'も', 'や', 'ろ', 'わ', 'え', 'ひ', 'る', 'れ'],
            'advanced': ['き', 'た', 'な', 'ぬ', 'ね', 'ふ', 'ほ', 'む', 'め', 'ゆ', 'よ', 'ら', 'を']
        };

        const strokeComplexityProgress = {};

        Object.keys(strokeComplexityMap).forEach(level => {
            const characters = strokeComplexityMap[level];
            let totalScore = 0;
            let totalAttempts = 0;
            let masteredCount = 0;
            let practicedCount = 0;

            characters.forEach(character => {
                const progress = this.characterProgressMap.get(character);
                if (progress) {
                    practicedCount++;
                    const stats = progress.getStatistics();
                    totalScore += stats.averageScore * stats.attemptCount;
                    totalAttempts += stats.attemptCount;

                    if (stats.masteryLevel >= 0.7) {
                        masteredCount++;
                    }
                }
            });

            strokeComplexityProgress[level] = {
                totalCharacters: characters.length,
                practicedCharacters: practicedCount,
                masteredCharacters: masteredCount,
                averageScore: totalAttempts > 0 ? totalScore / totalAttempts : 0,
                completionRate: practicedCount / characters.length,
                masteryRate: masteredCount / characters.length
            };
        });

        return strokeComplexityProgress;
    }

    /**
     * セッション開始
     */
    startSession() {
        this.sessionData.startTime = Date.now();
        this.sessionData.sessionsCount++;
    }

    /**
     * セッション終了
     */
    endSession() {
        if (this.sessionData.startTime) {
            const sessionDuration = Date.now() - this.sessionData.startTime;
            this.sessionData.totalPracticeTime += sessionDuration;
            this.sessionData.startTime = null;
            this.saveProgressData();
        }
    }

    /**
     * 進捗データを保存
     */
    saveProgressData() {
        try {
            const progressData = {};
            this.characterProgressMap.forEach((progress, character) => {
                progressData[character] = progress.serialize();
            });

            const dataToSave = {
                characterProgress: progressData,
                sessionData: this.sessionData,
                lastUpdated: Date.now()
            };

            this.dataStorageService.saveData('progressTracking', dataToSave);

        } catch (error) {
            console.error('進捗データ保存エラー:', error);
        }
    }

    /**
     * 進捗データを読み込み
     */
    loadProgressData() {
        try {
            const savedData = this.dataStorageService.loadData('progressTracking');
            
            if (savedData && savedData.characterProgress) {
                // 文字別進捗データを復元
                Object.keys(savedData.characterProgress).forEach(character => {
                    const progressData = savedData.characterProgress[character];
                    const progress = CharacterProgress.deserialize(progressData);
                    
                    if (progress.isValid()) {
                        this.characterProgressMap.set(character, progress);
                    }
                });

                // セッションデータを復元
                if (savedData.sessionData) {
                    this.sessionData = { ...this.sessionData, ...savedData.sessionData };
                }

                console.log(`進捗データ読み込み完了: ${this.characterProgressMap.size}文字`);
            }

        } catch (error) {
            console.error('進捗データ読み込みエラー:', error);
            this.characterProgressMap.clear();
        }
    }

    /**
     * 進捗データをリセット
     */
    resetProgress() {
        this.characterProgressMap.clear();
        this.sessionData = {
            startTime: null,
            totalPracticeTime: 0,
            sessionsCount: 0
        };
        
        this.dataStorageService.removeData('progressTracking');
        console.log('進捗データをリセットしました');
    }

    /**
     * データクリーンアップ
     * @param {number} maxAge 最大保持期間（日数）
     */
    cleanupOldData(maxAge = 90) {
        let cleanedCount = 0;

        this.characterProgressMap.forEach((progress, character) => {
            const originalAttemptCount = progress.getAttemptCount();
            progress.cleanup(maxAge);
            
            if (progress.getAttemptCount() < originalAttemptCount) {
                cleanedCount++;
            }

            // 試行データが空になった場合は削除
            if (progress.getAttemptCount() === 0) {
                this.characterProgressMap.delete(character);
            }
        });

        if (cleanedCount > 0) {
            this.saveProgressData();
            console.log(`古いデータをクリーンアップしました: ${cleanedCount}文字`);
        }
    }

    /**
     * エクスポート用データを取得
     * @returns {Object} エクスポート用データ
     */
    exportData() {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            overallProgress: this.getOverallProgress(),
            characterStatistics: {},
            difficultyProgress: this.getProgressByDifficulty()
        };

        this.characterProgressMap.forEach((progress, character) => {
            exportData.characterStatistics[character] = progress.getStatistics();
        });

        return exportData;
    }

    /**
     * デバッグ情報を取得
     * @returns {Object} デバッグ情報
     */
    getDebugInfo() {
        return {
            characterCount: this.characterProgressMap.size,
            totalAttempts: Array.from(this.characterProgressMap.values())
                .reduce((sum, progress) => sum + progress.getAttemptCount(), 0),
            sessionData: { ...this.sessionData },
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * メモリ使用量を推定
     * @returns {number} 推定メモリ使用量（バイト）
     */
    estimateMemoryUsage() {
        let totalSize = 0;
        
        this.characterProgressMap.forEach((progress) => {
            // 各試行データのサイズを推定
            totalSize += progress.getAttemptCount() * 100; // 1試行あたり約100バイト
        });

        return totalSize;
    }
}