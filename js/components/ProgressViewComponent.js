/**
 * 進捗表示コンポーネント
 * 練習した文字の進捗状況を可視化して表示
 */
export class ProgressViewComponent {
    constructor(app) {
        this.app = app;
        this.element = document.getElementById('progress-view');
        this.isInitialized = false;
        this.currentView = 'overview'; // overview, characters, statistics
    }

    init() {
        if (this.isInitialized) return;
        
        this.render();
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('ProgressViewComponent初期化完了');
    }

    render() {
        this.element.innerHTML = `
            <div class="progress-view-content">
                ${this.renderHeader()}
                ${this.renderNavigation()}
                ${this.renderCurrentView()}
            </div>
        `;
        console.log('ProgressViewComponent描画完了');
    }

    renderHeader() {
        return `
            <div class="progress-header">
                <h1 class="progress-title">
                    <span class="title-icon">📊</span>
                    あなたの進捗
                    <span class="title-icon">📊</span>
                </h1>
                <button id="back-to-menu-btn" class="back-button">
                    <span class="button-icon">⬅️</span>
                    メニューに戻る
                </button>
            </div>
        `;
    }

    renderNavigation() {
        return `
            <div class="progress-navigation">
                <button class="nav-tab ${this.currentView === 'overview' ? 'active' : ''}" data-view="overview">
                    <span class="tab-icon">📈</span>
                    概要
                </button>
                <button class="nav-tab ${this.currentView === 'characters' ? 'active' : ''}" data-view="characters">
                    <span class="tab-icon">🔤</span>
                    文字別
                </button>
                <button class="nav-tab ${this.currentView === 'statistics' ? 'active' : ''}" data-view="statistics">
                    <span class="tab-icon">📊</span>
                    統計
                </button>
            </div>
        `;
    }

    renderCurrentView() {
        switch (this.currentView) {
            case 'overview':
                return this.renderOverviewView();
            case 'characters':
                return this.renderCharactersView();
            case 'statistics':
                return this.renderStatisticsView();
            default:
                return this.renderOverviewView();
        }
    }

    renderOverviewView() {
        const progressData = this.getProgressData();
        
        return `
            <div class="progress-content overview-content">
                ${this.renderOverallProgress(progressData.overall)}
                ${this.renderDifficultyProgress(progressData.difficulty)}
                ${this.renderRecentActivity(progressData.recent)}
                ${this.renderProgressActions()}
            </div>
        `;
    }

    renderOverallProgress(overallData) {
        const completionPercentage = Math.round(overallData.completionRate * 100);
        const masteryPercentage = Math.round(overallData.masteryRate * 100);
        
        return `
            <div class="overall-progress-card">
                <h2 class="card-title">
                    <span class="card-icon">🎯</span>
                    全体の進捗
                </h2>
                <div class="progress-stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">📝</div>
                        <div class="stat-value">${overallData.practicedCharacters}</div>
                        <div class="stat-label">練習した文字</div>
                        <div class="stat-total">/ ${overallData.totalCharacters}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⭐</div>
                        <div class="stat-value">${overallData.masteredCharacters}</div>
                        <div class="stat-label">習得した文字</div>
                        <div class="stat-total">/ ${overallData.totalCharacters}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-value">${completionPercentage}%</div>
                        <div class="stat-label">練習完了率</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🏆</div>
                        <div class="stat-value">${masteryPercentage}%</div>
                        <div class="stat-label">習得率</div>
                    </div>
                </div>
                <div class="progress-bars">
                    <div class="progress-bar-container">
                        <div class="progress-bar-label">練習進捗</div>
                        <div class="progress-bar">
                            <div class="progress-fill completion" style="width: ${completionPercentage}%"></div>
                        </div>
                        <div class="progress-percentage">${completionPercentage}%</div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-label">習得進捗</div>
                        <div class="progress-bar">
                            <div class="progress-fill mastery" style="width: ${masteryPercentage}%"></div>
                        </div>
                        <div class="progress-percentage">${masteryPercentage}%</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderDifficultyProgress(difficultyData) {
        const difficulties = [
            { level: 1, name: 'かんたん', icon: '🌱', color: '#4CAF50' },
            { level: 2, name: 'ふつう', icon: '🌿', color: '#2196F3' },
            { level: 3, name: 'むずかしい', icon: '🌳', color: '#FF9800' },
            { level: 4, name: 'とてもむずかしい', icon: '🏔️', color: '#F44336' }
        ];

        return `
            <div class="difficulty-progress-card">
                <h2 class="card-title">
                    <span class="card-icon">📊</span>
                    難易度別進捗
                </h2>
                <div class="difficulty-grid">
                    ${difficulties.map(diff => {
                        const data = difficultyData[diff.level] || { 
                            completionRate: 0, 
                            masteryRate: 0, 
                            practicedCharacters: 0, 
                            totalCharacters: 0 
                        };
                        const completionPercentage = Math.round(data.completionRate * 100);
                        const masteryPercentage = Math.round(data.masteryRate * 100);
                        
                        return `
                            <div class="difficulty-card" style="border-color: ${diff.color}">
                                <div class="difficulty-header">
                                    <span class="difficulty-icon">${diff.icon}</span>
                                    <span class="difficulty-name">${diff.name}</span>
                                </div>
                                <div class="difficulty-stats">
                                    <div class="difficulty-stat">
                                        <span class="stat-label">練習済み</span>
                                        <span class="stat-value">${data.practicedCharacters}/${data.totalCharacters}</span>
                                    </div>
                                    <div class="difficulty-stat">
                                        <span class="stat-label">習得済み</span>
                                        <span class="stat-value">${data.masteredCharacters}/${data.totalCharacters}</span>
                                    </div>
                                </div>
                                <div class="difficulty-progress">
                                    <div class="mini-progress-bar">
                                        <div class="mini-progress-fill" style="width: ${masteryPercentage}%; background-color: ${diff.color}"></div>
                                    </div>
                                    <span class="mini-progress-text">${masteryPercentage}%</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    renderRecentActivity(recentData) {
        return `
            <div class="recent-activity-card">
                <h2 class="card-title">
                    <span class="card-icon">⏰</span>
                    最近の練習
                </h2>
                <div class="recent-characters">
                    ${recentData.length > 0 ? 
                        recentData.slice(0, 8).map(item => `
                            <div class="recent-character-item">
                                <div class="character-display">${item.character}</div>
                                <div class="character-info">
                                    <div class="mastery-indicator">
                                        ${this.renderMasteryStars(item.statistics.masteryLevel)}
                                    </div>
                                    <div class="last-practice">${this.formatTimeAgo(item.lastPracticeTime)}</div>
                                </div>
                            </div>
                        `).join('') :
                        '<div class="no-recent-activity">まだ練習していません</div>'
                    }
                </div>
            </div>
        `;
    }

    renderCharactersView() {
        const progressData = this.getProgressData();
        const allCharacters = this.getAllCharactersWithProgress();
        
        return `
            <div class="progress-content characters-content">
                <div class="characters-filter">
                    <button class="filter-btn active" data-filter="all">すべて</button>
                    <button class="filter-btn" data-filter="practiced">練習済み</button>
                    <button class="filter-btn" data-filter="mastered">習得済み</button>
                    <button class="filter-btn" data-filter="needs-practice">要練習</button>
                </div>
                <div class="characters-grid">
                    ${allCharacters.map(char => this.renderCharacterCard(char)).join('')}
                </div>
            </div>
        `;
    }

    renderCharacterCard(charData) {
        const masteryLevel = charData.progress ? charData.progress.masteryLevel : 0;
        const attemptCount = charData.progress ? charData.progress.attemptCount : 0;
        const averageScore = charData.progress ? charData.progress.averageScore : 0;
        const needsPractice = charData.progress ? charData.progress.needsPractice : true;
        
        let statusClass = 'unpracticed';
        let statusText = '未練習';
        let statusIcon = '⚪';
        
        if (attemptCount > 0) {
            if (masteryLevel >= 0.8) {
                statusClass = 'mastered';
                statusText = '習得済み';
                statusIcon = '🏆';
            } else if (masteryLevel >= 0.6) {
                statusClass = 'good';
                statusText = '良好';
                statusIcon = '⭐';
            } else if (masteryLevel >= 0.4) {
                statusClass = 'fair';
                statusText = '普通';
                statusIcon = '🔶';
            } else {
                statusClass = 'needs-practice';
                statusText = '要練習';
                statusIcon = '🔄';
            }
        }
        
        return `
            <div class="character-card ${statusClass}" data-character="${charData.character}">
                <div class="character-display-large">${charData.character}</div>
                <div class="character-info">
                    <div class="character-status">
                        <span class="status-icon">${statusIcon}</span>
                        <span class="status-text">${statusText}</span>
                    </div>
                    <div class="character-stats">
                        ${attemptCount > 0 ? `
                            <div class="stat-row">
                                <span class="stat-label">練習回数:</span>
                                <span class="stat-value">${attemptCount}回</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">平均スコア:</span>
                                <span class="stat-value">${Math.round(averageScore * 100)}%</span>
                            </div>
                            <div class="mastery-bar">
                                <div class="mastery-fill" style="width: ${masteryLevel * 100}%"></div>
                            </div>
                        ` : `
                            <div class="no-practice-message">まだ練習していません</div>
                        `}
                    </div>
                </div>
                <div class="difficulty-badge difficulty-${charData.difficulty}">
                    ${this.getDifficultyStars(charData.difficulty)}
                </div>
            </div>
        `;
    }

    renderStatisticsView() {
        const progressData = this.getProgressData();
        
        return `
            <div class="progress-content statistics-content">
                ${this.renderDetailedStatistics(progressData)}
                ${this.renderPracticeHistory(progressData)}
                ${this.renderRecommendations(progressData)}
            </div>
        `;
    }

    renderDetailedStatistics(progressData) {
        const sessionData = progressData.overall.sessionData || {};
        const totalPracticeTime = sessionData.totalPracticeTime || 0;
        const sessionsCount = sessionData.sessionsCount || 0;
        
        return `
            <div class="detailed-statistics-card">
                <h2 class="card-title">
                    <span class="card-icon">📈</span>
                    詳細統計
                </h2>
                <div class="statistics-grid">
                    <div class="stat-group">
                        <h3 class="stat-group-title">練習時間</h3>
                        <div class="stat-item">
                            <span class="stat-icon">⏱️</span>
                            <span class="stat-text">総練習時間: ${this.formatDuration(totalPracticeTime)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">📅</span>
                            <span class="stat-text">練習セッション: ${sessionsCount}回</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">⏰</span>
                            <span class="stat-text">平均セッション時間: ${sessionsCount > 0 ? this.formatDuration(totalPracticeTime / sessionsCount) : '0分'}</span>
                        </div>
                    </div>
                    <div class="stat-group">
                        <h3 class="stat-group-title">練習成果</h3>
                        <div class="stat-item">
                            <span class="stat-icon">🎯</span>
                            <span class="stat-text">総試行回数: ${progressData.overall.totalAttempts}回</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">📊</span>
                            <span class="stat-text">平均スコア: ${Math.round(progressData.overall.overallAverageScore * 100)}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">🏆</span>
                            <span class="stat-text">習得率: ${Math.round(progressData.overall.masteryRate * 100)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPracticeHistory(progressData) {
        // 簡単な練習履歴表示（実際のアプリでは日別データなどを表示）
        return `
            <div class="practice-history-card">
                <h2 class="card-title">
                    <span class="card-icon">📅</span>
                    練習履歴
                </h2>
                <div class="history-placeholder">
                    <p>練習履歴機能は今後のアップデートで追加予定です</p>
                    <div class="history-stats">
                        <div class="history-stat">
                            <span class="stat-label">今週の練習:</span>
                            <span class="stat-value">${progressData.recent.length}文字</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRecommendations(progressData) {
        const needsPractice = this.getCharactersNeedingPractice();
        
        return `
            <div class="recommendations-card">
                <h2 class="card-title">
                    <span class="card-icon">💡</span>
                    おすすめ練習
                </h2>
                <div class="recommendations-content">
                    ${needsPractice.length > 0 ? `
                        <p class="recommendation-text">これらの文字を練習することをおすすめします：</p>
                        <div class="recommended-characters">
                            ${needsPractice.slice(0, 6).map(char => `
                                <div class="recommended-character">
                                    <span class="character">${char.character}</span>
                                    <span class="priority">優先度: ${Math.round(char.priority * 100)}%</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p class="recommendation-text">素晴らしい！すべての文字をよく練習できています。</p>
                        <div class="celebration">🎉 よくがんばりました！ 🎉</div>
                    `}
                </div>
            </div>
        `;
    }

    renderProgressActions() {
        return `
            <div class="progress-actions-card">
                <h2 class="card-title">
                    <span class="card-icon">⚙️</span>
                    進捗管理
                </h2>
                <div class="action-buttons">
                    <button id="export-progress-btn" class="action-button export-button">
                        <span class="button-icon">📤</span>
                        進捗をエクスポート
                    </button>
                    <button id="reset-progress-btn" class="action-button reset-button">
                        <span class="button-icon">🔄</span>
                        進捗をリセット
                    </button>
                </div>
                <div class="action-description">
                    <p>※ 進捗リセットは保護者・先生用の機能です</p>
                </div>
            </div>
        `;
    }

    renderMasteryStars(masteryLevel) {
        const starCount = Math.round(masteryLevel * 5);
        const stars = '⭐'.repeat(starCount) + '☆'.repeat(5 - starCount);
        return `<span class="mastery-stars">${stars}</span>`;
    }

    getDifficultyStars(difficulty) {
        return '⭐'.repeat(difficulty);
    }

    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days > 0) return `${days}日前`;
        if (hours > 0) return `${hours}時間前`;
        if (minutes > 0) return `${minutes}分前`;
        return 'たった今';
    }

    formatDuration(milliseconds) {
        const minutes = Math.floor(milliseconds / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}時間${minutes % 60}分`;
        }
        return `${minutes}分`;
    }

    setupEventListeners() {
        // 戻るボタン
        const backButton = document.getElementById('back-to-menu-btn');
        if (backButton) {
            backButton.addEventListener('click', () => this.onBackToMenu());
        }

        // ナビゲーションタブ
        const navTabs = this.element.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // フィルターボタン（文字別表示用）
        const filterButtons = this.element.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyCharacterFilter(e.currentTarget.dataset.filter);
            });
        });

        // 進捗エクスポートボタン
        const exportButton = document.getElementById('export-progress-btn');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.onExportProgress());
        }

        // 進捗リセットボタン
        const resetButton = document.getElementById('reset-progress-btn');
        if (resetButton) {
            resetButton.addEventListener('click', () => this.onResetProgress());
        }

        // 文字カードクリック
        const characterCards = this.element.querySelectorAll('.character-card');
        characterCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const character = e.currentTarget.dataset.character;
                this.onCharacterCardClick(character);
            });
        });
    }

    switchView(view) {
        this.currentView = view;
        this.render();
        this.setupEventListeners();
    }

    applyCharacterFilter(filter) {
        // フィルターボタンのアクティブ状態を更新
        const filterButtons = this.element.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        // 文字カードをフィルタリング
        const characterCards = this.element.querySelectorAll('.character-card');
        characterCards.forEach(card => {
            let show = true;
            
            switch (filter) {
                case 'practiced':
                    show = !card.classList.contains('unpracticed');
                    break;
                case 'mastered':
                    show = card.classList.contains('mastered');
                    break;
                case 'needs-practice':
                    show = card.classList.contains('needs-practice');
                    break;
                case 'all':
                default:
                    show = true;
                    break;
            }
            
            card.style.display = show ? 'block' : 'none';
        });
    }

    onBackToMenu() {
        this.app.showMainMenu();
    }

    onExportProgress() {
        try {
            const progressService = this.app.getProgressTrackingService();
            const exportData = progressService.exportData();
            
            // JSONファイルとしてダウンロード
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `hiragana-progress-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showMessage('進捗データをエクスポートしました', 'success');
        } catch (error) {
            console.error('エクスポートエラー:', error);
            this.showMessage('エクスポートに失敗しました', 'error');
        }
    }

    onResetProgress() {
        // 確認ダイアログを表示
        const confirmed = confirm(
            '本当に進捗データをリセットしますか？\n' +
            'この操作は取り消せません。\n\n' +
            '※ この機能は保護者・先生用です'
        );
        
        if (confirmed) {
            try {
                const progressService = this.app.getProgressTrackingService();
                progressService.resetProgress();
                
                // 表示を更新
                this.render();
                this.setupEventListeners();
                
                this.showMessage('進捗データをリセットしました', 'success');
            } catch (error) {
                console.error('リセットエラー:', error);
                this.showMessage('リセットに失敗しました', 'error');
            }
        }
    }

    onCharacterCardClick(character) {
        // 文字の詳細情報を表示（モーダルなど）
        console.log(`文字 ${character} の詳細表示`);
        // 今後の実装で詳細モーダルを追加可能
    }

    showMessage(message, type = 'info') {
        // 簡単なメッセージ表示
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}-message`;
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }

    getProgressData() {
        try {
            const progressService = this.app.getProgressTrackingService();
            return {
                overall: progressService.getOverallProgress(),
                difficulty: progressService.getProgressByDifficulty(),
                recent: progressService.getRecentlyPracticedCharacters()
            };
        } catch (error) {
            console.error('進捗データ取得エラー:', error);
            return {
                overall: {
                    totalCharacters: 46,
                    practicedCharacters: 0,
                    masteredCharacters: 0,
                    completionRate: 0,
                    masteryRate: 0,
                    totalAttempts: 0,
                    overallAverageScore: 0,
                    sessionData: {}
                },
                difficulty: {},
                recent: []
            };
        }
    }

    getAllCharactersWithProgress() {
        try {
            const hiraganaService = this.app.getHiraganaDataService();
            const progressService = this.app.getProgressTrackingService();
            
            const allCharacters = hiraganaService.getAllCharacters();
            
            return allCharacters.map(charData => {
                const progress = progressService.getCharacterStatistics(charData.character);
                return {
                    character: charData.character,
                    difficulty: charData.difficulty,
                    progress: progress
                };
            });
        } catch (error) {
            console.error('文字データ取得エラー:', error);
            return [];
        }
    }

    getCharactersNeedingPractice() {
        try {
            const progressService = this.app.getProgressTrackingService();
            return progressService.getCharactersNeedingPractice();
        } catch (error) {
            console.error('要練習文字取得エラー:', error);
            return [];
        }
    }

    onActivate() {
        // 画面がアクティブになった時の処理
        this.render();
        this.setupEventListeners();
    }
}