/**
 * データ検証サービス
 * データの整合性チェックと検証機能を提供
 */
export class DataValidationService {
    constructor() {
        this.validationRules = this.initializeValidationRules();
        console.log('DataValidationService初期化完了');
    }

    /**
     * 検証ルールを初期化
     * @returns {Object} 検証ルール
     */
    initializeValidationRules() {
        return {
            progressTracking: {
                required: ['characterProgress', 'sessionData', 'version'],
                characterProgress: {
                    required: ['character', 'attempts'],
                    attempts: {
                        required: ['score', 'timestamp'],
                        score: { type: 'number', min: 0, max: 1 },
                        timestamp: { type: 'number', min: 1 }
                    }
                },
                sessionData: {
                    required: ['totalPracticeTime', 'sessionsCount'],
                    totalPracticeTime: { type: 'number', min: 0 },
                    sessionsCount: { type: 'number', min: 0 }
                },
                version: { type: 'string', pattern: /^\d+\.\d+$/ }
            },
            session: {
                required: ['character', 'attempts', 'startTime'],
                character: {
                    required: ['character'],
                    character: { type: 'string', minLength: 1, maxLength: 1 }
                },
                attempts: { type: 'array' },
                startTime: { type: 'number', min: 1 }
            },
            characterProgress: {
                required: ['character', 'attempts'],
                character: { type: 'string', minLength: 1, maxLength: 1 },
                attempts: { type: 'array' }
            }
        };
    }

    /**
     * 進捗追跡データを検証
     * @param {Object} data 進捗追跡データ
     * @returns {Object} 検証結果
     */
    validateProgressTrackingData(data) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            fixedData: null
        };

        try {
            if (!data || typeof data !== 'object') {
                result.isValid = false;
                result.errors.push('進捗追跡データが無効です');
                return result;
            }

            // 基本構造の検証
            const structureValidation = this.validateStructure(data, this.validationRules.progressTracking);
            if (!structureValidation.isValid) {
                result.isValid = false;
                result.errors.push(...structureValidation.errors);
            }

            // 文字進捗データの検証
            if (data.characterProgress) {
                const characterValidation = this.validateCharacterProgressData(data.characterProgress);
                if (!characterValidation.isValid) {
                    result.isValid = false;
                    result.errors.push(...characterValidation.errors);
                }
                result.warnings.push(...characterValidation.warnings);
            }

            // セッションデータの検証
            if (data.sessionData) {
                const sessionValidation = this.validateSessionData(data.sessionData);
                if (!sessionValidation.isValid) {
                    result.isValid = false;
                    result.errors.push(...sessionValidation.errors);
                }
            }

            // データの自動修復を試行
            if (!result.isValid) {
                const fixedData = this.attemptDataRepair(data, result.errors);
                if (fixedData) {
                    result.fixedData = fixedData;
                    result.warnings.push('データを自動修復しました');
                }
            }

        } catch (error) {
            result.isValid = false;
            result.errors.push(`検証中にエラーが発生しました: ${error.message}`);
        }

        return result;
    }

    /**
     * 文字進捗データを検証
     * @param {Object} characterProgressData 文字進捗データ
     * @returns {Object} 検証結果
     */
    validateCharacterProgressData(characterProgressData) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (!characterProgressData || typeof characterProgressData !== 'object') {
            result.isValid = false;
            result.errors.push('文字進捗データが無効です');
            return result;
        }

        Object.entries(characterProgressData).forEach(([character, progress]) => {
            // 文字キーと進捗データの文字が一致するかチェック
            if (progress.character !== character) {
                result.errors.push(`文字 ${character} の進捗データが不整合です`);
                result.isValid = false;
            }

            // 試行データの検証
            if (!Array.isArray(progress.attempts)) {
                result.errors.push(`文字 ${character} の試行データが配列ではありません`);
                result.isValid = false;
            } else {
                const attemptValidation = this.validateAttempts(progress.attempts, character);
                if (!attemptValidation.isValid) {
                    result.isValid = false;
                    result.errors.push(...attemptValidation.errors);
                }
                result.warnings.push(...attemptValidation.warnings);
            }

            // タイムスタンプの検証
            if (progress.createdAt && (typeof progress.createdAt !== 'number' || progress.createdAt <= 0)) {
                result.warnings.push(`文字 ${character} の作成日時が無効です`);
            }

            if (progress.updatedAt && (typeof progress.updatedAt !== 'number' || progress.updatedAt <= 0)) {
                result.warnings.push(`文字 ${character} の更新日時が無効です`);
            }
        });

        return result;
    }

    /**
     * 試行データを検証
     * @param {Array} attempts 試行データ配列
     * @param {string} character 文字（エラーメッセージ用）
     * @returns {Object} 検証結果
     */
    validateAttempts(attempts, character) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        attempts.forEach((attempt, index) => {
            if (!attempt || typeof attempt !== 'object') {
                result.errors.push(`文字 ${character} の試行 ${index} が無効です`);
                result.isValid = false;
                return;
            }

            // スコアの検証
            if (typeof attempt.score !== 'number') {
                result.errors.push(`文字 ${character} の試行 ${index} のスコアが数値ではありません`);
                result.isValid = false;
            } else if (attempt.score < 0 || attempt.score > 1) {
                result.errors.push(`文字 ${character} の試行 ${index} のスコアが範囲外です (${attempt.score})`);
                result.isValid = false;
            }

            // タイムスタンプの検証
            if (typeof attempt.timestamp !== 'number') {
                result.errors.push(`文字 ${character} の試行 ${index} のタイムスタンプが数値ではありません`);
                result.isValid = false;
            } else if (attempt.timestamp <= 0) {
                result.errors.push(`文字 ${character} の試行 ${index} のタイムスタンプが無効です`);
                result.isValid = false;
            } else if (attempt.timestamp > Date.now() + 86400000) { // 未来の日付（1日の余裕）
                result.warnings.push(`文字 ${character} の試行 ${index} のタイムスタンプが未来の日付です`);
            }

            // 詳細データの検証（オプション）
            if (attempt.details && typeof attempt.details !== 'object') {
                result.warnings.push(`文字 ${character} の試行 ${index} の詳細データが無効です`);
            }
        });

        // 試行データの時系列チェック
        if (attempts.length > 1) {
            const timeValidation = this.validateAttemptTimestamps(attempts, character);
            result.warnings.push(...timeValidation.warnings);
        }

        return result;
    }

    /**
     * 試行データのタイムスタンプを検証
     * @param {Array} attempts 試行データ配列
     * @param {string} character 文字
     * @returns {Object} 検証結果
     */
    validateAttemptTimestamps(attempts, character) {
        const result = {
            warnings: []
        };

        const timestamps = attempts.map(a => a.timestamp).filter(t => typeof t === 'number');
        
        // 時系列の順序チェック
        const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
        const isChronological = timestamps.every((timestamp, index) => 
            timestamp === sortedTimestamps[index]
        );

        if (!isChronological) {
            result.warnings.push(`文字 ${character} の試行データが時系列順ではありません`);
        }

        // 異常に短い間隔の試行をチェック
        for (let i = 1; i < timestamps.length; i++) {
            const interval = timestamps[i] - timestamps[i - 1];
            if (interval < 1000) { // 1秒未満
                result.warnings.push(`文字 ${character} の試行間隔が異常に短いです (${interval}ms)`);
            }
        }

        return result;
    }

    /**
     * セッションデータを検証
     * @param {Object} sessionData セッションデータ
     * @returns {Object} 検証結果
     */
    validateSessionData(sessionData) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (!sessionData || typeof sessionData !== 'object') {
            result.isValid = false;
            result.errors.push('セッションデータが無効です');
            return result;
        }

        // 必須フィールドの検証
        if (typeof sessionData.totalPracticeTime !== 'number' || sessionData.totalPracticeTime < 0) {
            result.errors.push('総練習時間が無効です');
            result.isValid = false;
        }

        if (typeof sessionData.sessionsCount !== 'number' || sessionData.sessionsCount < 0) {
            result.errors.push('セッション数が無効です');
            result.isValid = false;
        }

        // 開始時刻の検証（オプション）
        if (sessionData.startTime !== null && 
            (typeof sessionData.startTime !== 'number' || sessionData.startTime <= 0)) {
            result.warnings.push('セッション開始時刻が無効です');
        }

        return result;
    }

    /**
     * 構造を検証
     * @param {Object} data データ
     * @param {Object} rules 検証ルール
     * @returns {Object} 検証結果
     */
    validateStructure(data, rules) {
        const result = {
            isValid: true,
            errors: []
        };

        // 必須フィールドの検証
        if (rules.required) {
            rules.required.forEach(field => {
                if (!(field in data)) {
                    result.errors.push(`必須フィールド '${field}' が存在しません`);
                    result.isValid = false;
                }
            });
        }

        // 各フィールドの型検証
        Object.entries(rules).forEach(([field, rule]) => {
            if (field === 'required') return;

            if (field in data) {
                const fieldValidation = this.validateField(data[field], rule, field);
                if (!fieldValidation.isValid) {
                    result.isValid = false;
                    result.errors.push(...fieldValidation.errors);
                }
            }
        });

        return result;
    }

    /**
     * フィールドを検証
     * @param {*} value 値
     * @param {Object} rule ルール
     * @param {string} fieldName フィールド名
     * @returns {Object} 検証結果
     */
    validateField(value, rule, fieldName) {
        const result = {
            isValid: true,
            errors: []
        };

        // 型チェック
        if (rule.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== rule.type) {
                result.errors.push(`フィールド '${fieldName}' の型が不正です (期待: ${rule.type}, 実際: ${actualType})`);
                result.isValid = false;
                return result;
            }
        }

        // 数値の範囲チェック
        if (rule.type === 'number') {
            if (rule.min !== undefined && value < rule.min) {
                result.errors.push(`フィールド '${fieldName}' の値が最小値未満です (${value} < ${rule.min})`);
                result.isValid = false;
            }
            if (rule.max !== undefined && value > rule.max) {
                result.errors.push(`フィールド '${fieldName}' の値が最大値超過です (${value} > ${rule.max})`);
                result.isValid = false;
            }
        }

        // 文字列の長さチェック
        if (rule.type === 'string') {
            if (rule.minLength !== undefined && value.length < rule.minLength) {
                result.errors.push(`フィールド '${fieldName}' の長さが不足です (${value.length} < ${rule.minLength})`);
                result.isValid = false;
            }
            if (rule.maxLength !== undefined && value.length > rule.maxLength) {
                result.errors.push(`フィールド '${fieldName}' の長さが超過です (${value.length} > ${rule.maxLength})`);
                result.isValid = false;
            }
            if (rule.pattern && !rule.pattern.test(value)) {
                result.errors.push(`フィールド '${fieldName}' のパターンが不正です`);
                result.isValid = false;
            }
        }

        return result;
    }

    /**
     * データの自動修復を試行
     * @param {Object} data 元データ
     * @param {Array} errors エラーリスト
     * @returns {Object|null} 修復されたデータまたはnull
     */
    attemptDataRepair(data, errors) {
        try {
            const repairedData = JSON.parse(JSON.stringify(data)); // ディープコピー

            // 基本構造の修復
            if (!repairedData.characterProgress) {
                repairedData.characterProgress = {};
            }

            if (!repairedData.sessionData) {
                repairedData.sessionData = {
                    startTime: null,
                    totalPracticeTime: 0,
                    sessionsCount: 0
                };
            }

            if (!repairedData.version) {
                repairedData.version = '2.0';
            }

            // 文字進捗データの修復
            Object.keys(repairedData.characterProgress).forEach(character => {
                const progress = repairedData.characterProgress[character];

                // 文字名の修復
                if (!progress.character || progress.character !== character) {
                    progress.character = character;
                }

                // 試行データの修復
                if (!Array.isArray(progress.attempts)) {
                    progress.attempts = [];
                } else {
                    // 無効な試行データを除去
                    progress.attempts = progress.attempts.filter(attempt => {
                        return attempt &&
                               typeof attempt.score === 'number' &&
                               attempt.score >= 0 && attempt.score <= 1 &&
                               typeof attempt.timestamp === 'number' &&
                               attempt.timestamp > 0;
                    });
                }

                // タイムスタンプの修復
                if (!progress.createdAt || typeof progress.createdAt !== 'number') {
                    progress.createdAt = Date.now();
                }

                if (!progress.updatedAt || typeof progress.updatedAt !== 'number') {
                    progress.updatedAt = Date.now();
                }
            });

            // セッションデータの修復
            if (typeof repairedData.sessionData.totalPracticeTime !== 'number' || 
                repairedData.sessionData.totalPracticeTime < 0) {
                repairedData.sessionData.totalPracticeTime = 0;
            }

            if (typeof repairedData.sessionData.sessionsCount !== 'number' || 
                repairedData.sessionData.sessionsCount < 0) {
                repairedData.sessionData.sessionsCount = 0;
            }

            // 修復後の検証
            const validationResult = this.validateProgressTrackingData(repairedData);
            if (validationResult.isValid) {
                return repairedData;
            }

            return null;

        } catch (error) {
            console.error('データ修復エラー:', error);
            return null;
        }
    }

    /**
     * セッション配列を検証
     * @param {Array} sessions セッション配列
     * @returns {Object} 検証結果
     */
    validateSessions(sessions) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            validSessions: [],
            invalidSessions: []
        };

        if (!Array.isArray(sessions)) {
            result.isValid = false;
            result.errors.push('セッションデータが配列ではありません');
            return result;
        }

        sessions.forEach((session, index) => {
            const sessionValidation = this.validateSingleSession(session, index);
            
            if (sessionValidation.isValid) {
                result.validSessions.push(session);
            } else {
                result.isValid = false;
                result.invalidSessions.push({ index, session, errors: sessionValidation.errors });
                result.errors.push(...sessionValidation.errors);
            }

            result.warnings.push(...sessionValidation.warnings);
        });

        return result;
    }

    /**
     * 単一セッションを検証
     * @param {Object} session セッション
     * @param {number} index インデックス
     * @returns {Object} 検証結果
     */
    validateSingleSession(session, index) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (!session || typeof session !== 'object') {
            result.isValid = false;
            result.errors.push(`セッション ${index} が無効です`);
            return result;
        }

        // 文字データの検証
        if (!session.character || !session.character.character) {
            result.isValid = false;
            result.errors.push(`セッション ${index} に文字データがありません`);
        }

        // 試行データの検証
        if (!Array.isArray(session.attempts)) {
            result.isValid = false;
            result.errors.push(`セッション ${index} の試行データが配列ではありません`);
        }

        // 時刻データの検証
        if (session.startTime && (typeof session.startTime !== 'number' || session.startTime <= 0)) {
            result.warnings.push(`セッション ${index} の開始時刻が無効です`);
        }

        if (session.endTime && (typeof session.endTime !== 'number' || session.endTime <= 0)) {
            result.warnings.push(`セッション ${index} の終了時刻が無効です`);
        }

        // 開始時刻と終了時刻の整合性チェック
        if (session.startTime && session.endTime && session.startTime > session.endTime) {
            result.warnings.push(`セッション ${index} の時刻が不整合です`);
        }

        return result;
    }

    /**
     * データ整合性の包括的チェック
     * @param {Object} allData 全データ
     * @returns {Object} 検証結果
     */
    validateDataIntegrity(allData) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            summary: {
                progressTracking: null,
                sessions: null,
                crossValidation: null
            }
        };

        try {
            // 進捗追跡データの検証
            if (allData.progressTracking) {
                const progressValidation = this.validateProgressTrackingData(allData.progressTracking);
                result.summary.progressTracking = progressValidation;
                
                if (!progressValidation.isValid) {
                    result.isValid = false;
                    result.errors.push(...progressValidation.errors);
                }
                result.warnings.push(...progressValidation.warnings);
            }

            // セッションデータの検証
            if (allData.sessions) {
                const sessionsValidation = this.validateSessions(allData.sessions);
                result.summary.sessions = sessionsValidation;
                
                if (!sessionsValidation.isValid) {
                    result.isValid = false;
                    result.errors.push(...sessionsValidation.errors);
                }
                result.warnings.push(...sessionsValidation.warnings);
            }

            // クロス検証（進捗データとセッションデータの整合性）
            if (allData.progressTracking && allData.sessions) {
                const crossValidation = this.validateCrossDataConsistency(
                    allData.progressTracking, 
                    allData.sessions
                );
                result.summary.crossValidation = crossValidation;
                result.warnings.push(...crossValidation.warnings);
            }

        } catch (error) {
            result.isValid = false;
            result.errors.push(`データ整合性チェック中にエラーが発生しました: ${error.message}`);
        }

        return result;
    }

    /**
     * データ間の整合性を検証
     * @param {Object} progressData 進捗データ
     * @param {Array} sessions セッションデータ
     * @returns {Object} 検証結果
     */
    validateCrossDataConsistency(progressData, sessions) {
        const result = {
            warnings: []
        };

        try {
            // セッションに存在する文字が進捗データにも存在するかチェック
            const sessionCharacters = new Set();
            sessions.forEach(session => {
                if (session.character && session.character.character) {
                    sessionCharacters.add(session.character.character);
                }
            });

            const progressCharacters = new Set(Object.keys(progressData.characterProgress || {}));

            // セッションにあるが進捗データにない文字
            sessionCharacters.forEach(char => {
                if (!progressCharacters.has(char)) {
                    result.warnings.push(`文字 ${char} のセッションデータはありますが、進捗データがありません`);
                }
            });

            // 進捗データにあるがセッションデータにない文字
            progressCharacters.forEach(char => {
                if (!sessionCharacters.has(char)) {
                    result.warnings.push(`文字 ${char} の進捗データはありますが、セッションデータがありません`);
                }
            });

        } catch (error) {
            result.warnings.push(`クロス検証中にエラーが発生しました: ${error.message}`);
        }

        return result;
    }

    /**
     * 検証レポートを生成
     * @param {Object} validationResult 検証結果
     * @returns {string} レポート文字列
     */
    generateValidationReport(validationResult) {
        let report = '=== データ検証レポート ===\n\n';

        report += `全体結果: ${validationResult.isValid ? '✓ 有効' : '✗ 無効'}\n`;
        report += `エラー数: ${validationResult.errors.length}\n`;
        report += `警告数: ${validationResult.warnings.length}\n\n`;

        if (validationResult.errors.length > 0) {
            report += '【エラー】\n';
            validationResult.errors.forEach((error, index) => {
                report += `${index + 1}. ${error}\n`;
            });
            report += '\n';
        }

        if (validationResult.warnings.length > 0) {
            report += '【警告】\n';
            validationResult.warnings.forEach((warning, index) => {
                report += `${index + 1}. ${warning}\n`;
            });
            report += '\n';
        }

        if (validationResult.summary) {
            report += '【詳細】\n';
            Object.entries(validationResult.summary).forEach(([key, summary]) => {
                if (summary) {
                    report += `${key}: ${summary.isValid ? '✓' : '✗'} `;
                    report += `(エラー: ${summary.errors?.length || 0}, 警告: ${summary.warnings?.length || 0})\n`;
                }
            });
        }

        return report;
    }
}