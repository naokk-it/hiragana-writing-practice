/**
 * パフォーマンス監視サービス
 * アプリケーションのパフォーマンスを監視し、最適化を提案
 */
export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            frameRate: [],
            memoryUsage: [],
            renderTime: [],
            storageOperations: []
        };
        
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        
        // パフォーマンス閾値
        this.thresholds = {
            minFrameRate: 30, // 最小フレームレート
            maxRenderTime: 16, // 最大レンダリング時間（60FPS = 16.67ms）
            maxMemoryUsage: 50 * 1024 * 1024, // 最大メモリ使用量（50MB）
            maxStorageOperationTime: 100 // 最大ストレージ操作時間（100ms）
        };
        
        this.performanceCallbacks = [];
        
        console.log('PerformanceMonitor初期化完了');
    }

    /**
     * パフォーマンス監視を開始
     */
    startMonitoring() {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.lastFrameTime = performance.now();
        
        // フレームレート監視
        this.startFrameRateMonitoring();
        
        // メモリ使用量監視（利用可能な場合）
        if (performance.memory) {
            this.startMemoryMonitoring();
        }
        
        console.log('パフォーマンス監視を開始しました');
    }

    /**
     * パフォーマンス監視を停止
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('パフォーマンス監視を停止しました');
    }

    /**
     * フレームレート監視を開始
     */
    startFrameRateMonitoring() {
        const measureFrame = () => {
            if (!this.isMonitoring) return;
            
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastFrameTime;
            const frameRate = 1000 / deltaTime;
            
            this.recordFrameRate(frameRate);
            this.lastFrameTime = currentTime;
            this.frameCount++;
            
            requestAnimationFrame(measureFrame);
        };
        
        requestAnimationFrame(measureFrame);
    }

    /**
     * メモリ使用量監視を開始
     */
    startMemoryMonitoring() {
        this.monitoringInterval = setInterval(() => {
            if (!this.isMonitoring) return;
            
            if (performance.memory) {
                const memoryInfo = {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit,
                    timestamp: Date.now()
                };
                
                this.recordMemoryUsage(memoryInfo);
                this.checkMemoryThreshold(memoryInfo);
            }
        }, 1000); // 1秒間隔
    }

    /**
     * フレームレートを記録
     * @param {number} frameRate フレームレート
     */
    recordFrameRate(frameRate) {
        this.metrics.frameRate.push({
            value: frameRate,
            timestamp: Date.now()
        });
        
        // 最新100件のみ保持
        if (this.metrics.frameRate.length > 100) {
            this.metrics.frameRate.shift();
        }
        
        // 閾値チェック
        if (frameRate < this.thresholds.minFrameRate) {
            this.triggerPerformanceWarning('low_frame_rate', {
                current: frameRate,
                threshold: this.thresholds.minFrameRate
            });
        }
    }

    /**
     * メモリ使用量を記録
     * @param {Object} memoryInfo メモリ情報
     */
    recordMemoryUsage(memoryInfo) {
        this.metrics.memoryUsage.push(memoryInfo);
        
        // 最新50件のみ保持
        if (this.metrics.memoryUsage.length > 50) {
            this.metrics.memoryUsage.shift();
        }
    }

    /**
     * レンダリング時間を記録
     * @param {number} renderTime レンダリング時間（ms）
     */
    recordRenderTime(renderTime) {
        this.metrics.renderTime.push({
            value: renderTime,
            timestamp: Date.now()
        });
        
        // 最新100件のみ保持
        if (this.metrics.renderTime.length > 100) {
            this.metrics.renderTime.shift();
        }
        
        // 閾値チェック
        if (renderTime > this.thresholds.maxRenderTime) {
            this.triggerPerformanceWarning('slow_render', {
                current: renderTime,
                threshold: this.thresholds.maxRenderTime
            });
        }
    }

    /**
     * ストレージ操作時間を記録
     * @param {string} operation 操作名
     * @param {number} duration 実行時間（ms）
     */
    recordStorageOperation(operation, duration) {
        this.metrics.storageOperations.push({
            operation: operation,
            duration: duration,
            timestamp: Date.now()
        });
        
        // 最新100件のみ保持
        if (this.metrics.storageOperations.length > 100) {
            this.metrics.storageOperations.shift();
        }
        
        // 閾値チェック
        if (duration > this.thresholds.maxStorageOperationTime) {
            this.triggerPerformanceWarning('slow_storage', {
                operation: operation,
                current: duration,
                threshold: this.thresholds.maxStorageOperationTime
            });
        }
    }

    /**
     * メモリ閾値をチェック
     * @param {Object} memoryInfo メモリ情報
     */
    checkMemoryThreshold(memoryInfo) {
        if (memoryInfo.used > this.thresholds.maxMemoryUsage) {
            this.triggerPerformanceWarning('high_memory_usage', {
                current: memoryInfo.used,
                threshold: this.thresholds.maxMemoryUsage,
                percentage: (memoryInfo.used / memoryInfo.total) * 100
            });
        }
    }

    /**
     * パフォーマンス警告をトリガー
     * @param {string} type 警告タイプ
     * @param {Object} details 詳細情報
     */
    triggerPerformanceWarning(type, details) {
        const warning = {
            type: type,
            details: details,
            timestamp: Date.now(),
            suggestions: this.getOptimizationSuggestions(type, details)
        };
        
        console.warn('パフォーマンス警告:', warning);
        
        // 登録されたコールバックを実行
        this.performanceCallbacks.forEach(callback => {
            try {
                callback(warning);
            } catch (error) {
                console.error('パフォーマンスコールバックエラー:', error);
            }
        });
    }

    /**
     * 最適化提案を取得
     * @param {string} type 警告タイプ
     * @param {Object} details 詳細情報
     * @returns {Array<string>} 最適化提案
     */
    getOptimizationSuggestions(type, details) {
        const suggestions = [];
        
        switch (type) {
            case 'low_frame_rate':
                suggestions.push('描画処理を最適化してください');
                suggestions.push('不要なDOM操作を削減してください');
                suggestions.push('アニメーションの頻度を下げてください');
                break;
                
            case 'slow_render':
                suggestions.push('レンダリング処理を分割してください');
                suggestions.push('requestAnimationFrameを使用してください');
                suggestions.push('DOM更新をバッチ処理してください');
                break;
                
            case 'high_memory_usage':
                suggestions.push('不要なオブジェクトを削除してください');
                suggestions.push('キャッシュサイズを制限してください');
                suggestions.push('メモリリークを確認してください');
                break;
                
            case 'slow_storage':
                suggestions.push('ストレージ操作をバッチ処理してください');
                suggestions.push('データサイズを削減してください');
                suggestions.push('非同期処理を使用してください');
                break;
        }
        
        return suggestions;
    }

    /**
     * パフォーマンス統計を取得
     * @returns {Object} パフォーマンス統計
     */
    getPerformanceStats() {
        const stats = {
            frameRate: this.calculateFrameRateStats(),
            memoryUsage: this.calculateMemoryStats(),
            renderTime: this.calculateRenderTimeStats(),
            storageOperations: this.calculateStorageStats()
        };
        
        return stats;
    }

    /**
     * フレームレート統計を計算
     * @returns {Object} フレームレート統計
     */
    calculateFrameRateStats() {
        if (this.metrics.frameRate.length === 0) {
            return { average: 0, min: 0, max: 0, current: 0 };
        }
        
        const values = this.metrics.frameRate.map(item => item.value);
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const current = values[values.length - 1];
        
        return { average, min, max, current };
    }

    /**
     * メモリ統計を計算
     * @returns {Object} メモリ統計
     */
    calculateMemoryStats() {
        if (this.metrics.memoryUsage.length === 0) {
            return { current: 0, peak: 0, average: 0 };
        }
        
        const latest = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
        const peak = Math.max(...this.metrics.memoryUsage.map(item => item.used));
        const average = this.metrics.memoryUsage.reduce((sum, item) => sum + item.used, 0) / this.metrics.memoryUsage.length;
        
        return {
            current: latest.used,
            peak: peak,
            average: average,
            total: latest.total,
            limit: latest.limit
        };
    }

    /**
     * レンダリング時間統計を計算
     * @returns {Object} レンダリング時間統計
     */
    calculateRenderTimeStats() {
        if (this.metrics.renderTime.length === 0) {
            return { average: 0, min: 0, max: 0 };
        }
        
        const values = this.metrics.renderTime.map(item => item.value);
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        return { average, min, max };
    }

    /**
     * ストレージ統計を計算
     * @returns {Object} ストレージ統計
     */
    calculateStorageStats() {
        if (this.metrics.storageOperations.length === 0) {
            return { averageDuration: 0, totalOperations: 0 };
        }
        
        const totalDuration = this.metrics.storageOperations.reduce((sum, op) => sum + op.duration, 0);
        const averageDuration = totalDuration / this.metrics.storageOperations.length;
        const totalOperations = this.metrics.storageOperations.length;
        
        return { averageDuration, totalOperations };
    }

    /**
     * パフォーマンスコールバックを登録
     * @param {Function} callback コールバック関数
     */
    onPerformanceWarning(callback) {
        this.performanceCallbacks.push(callback);
    }

    /**
     * パフォーマンスコールバックを削除
     * @param {Function} callback コールバック関数
     */
    removePerformanceCallback(callback) {
        const index = this.performanceCallbacks.indexOf(callback);
        if (index !== -1) {
            this.performanceCallbacks.splice(index, 1);
        }
    }

    /**
     * メトリクスをクリア
     */
    clearMetrics() {
        this.metrics = {
            frameRate: [],
            memoryUsage: [],
            renderTime: [],
            storageOperations: []
        };
        
        console.log('パフォーマンスメトリクスをクリアしました');
    }

    /**
     * パフォーマンス最適化を実行
     */
    performOptimization() {
        console.log('パフォーマンス最適化を実行中...');
        
        // ガベージコレクションを促進（可能な場合）
        if (window.gc) {
            window.gc();
        }
        
        // メトリクスの古いデータを削除
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5分
        
        this.metrics.frameRate = this.metrics.frameRate.filter(item => 
            now - item.timestamp < maxAge
        );
        
        this.metrics.renderTime = this.metrics.renderTime.filter(item => 
            now - item.timestamp < maxAge
        );
        
        this.metrics.storageOperations = this.metrics.storageOperations.filter(item => 
            now - item.timestamp < maxAge
        );
        
        console.log('パフォーマンス最適化完了');
    }
}