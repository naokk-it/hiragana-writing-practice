// メインメニューコンポーネント
export class MainMenuComponent {
    constructor(app) {
        this.app = app;
        this.element = document.getElementById('main-menu');
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        
        this.render();
        this.setupEventListeners();
        this.addInteractiveEffects();
        this.isInitialized = true;
        console.log('MainMenuComponent初期化完了');
    }

    render() {
        // 進捗データを取得して難易度推奨を計算
        let progressData = {};
        let recommendedDifficulty = null;
        
        try {
            if (this.app && this.app.getProgressTrackingService) {
                progressData = this.app.getProgressTrackingService().getProgressByDifficulty();
                recommendedDifficulty = this.calculateRecommendedDifficulty(progressData);
            }
        } catch (error) {
            console.log('進捗データの取得をスキップ:', error.message);
        }
        
        // 子供向けの大きなボタンUIを動的に生成
        this.element.innerHTML = `
            <div class="main-menu-content">
                <h1 class="app-title">
                    <span class="title-icon">✏️</span>
                    ひらがな練習
                    <span class="title-icon">📝</span>
                </h1>
                <div class="menu-buttons">
                    <button id="start-practice-btn" class="big-button primary-button">
                        <span class="button-icon">🌟</span>
                        ランダム練習
                        <span class="button-icon">🌟</span>
                    </button>
                    <button id="difficulty-select-btn" class="big-button secondary-button">
                        <span class="button-icon">📊</span>
                        難易度を選ぶ
                        <span class="button-icon">📊</span>
                    </button>
                    <button id="character-select-btn" class="big-button tertiary-button">
                        <span class="button-icon">🔤</span>
                        文字を選ぶ
                    </button>
                    <button id="progress-view-btn" class="big-button progress-button">
                        <span class="button-icon">📊</span>
                        進捗を見る
                        <span class="button-icon">📈</span>
                    </button>
                </div>
                ${this.renderDifficultyRecommendation(recommendedDifficulty)}
                <div class="welcome-message">
                    <p>楽しくひらがなを覚えよう！</p>
                </div>
            </div>
        `;
        console.log('MainMenuComponent描画完了');
    }

    setupEventListeners() {
        // ランダム練習開始ボタン
        const startButton = document.getElementById('start-practice-btn');
        if (startButton) {
            startButton.addEventListener('click', (e) => {
                this.handleButtonClick(e, () => this.onStartPractice());
            });
        }

        // 難易度選択ボタン
        const difficultySelectButton = document.getElementById('difficulty-select-btn');
        if (difficultySelectButton) {
            difficultySelectButton.addEventListener('click', (e) => {
                this.handleButtonClick(e, () => this.onDifficultySelect());
            });
        }

        // 文字選択ボタン
        const characterSelectButton = document.getElementById('character-select-btn');
        if (characterSelectButton) {
            characterSelectButton.addEventListener('click', (e) => {
                this.handleButtonClick(e, () => this.onCharacterSelect());
            });
        }

        // 進捗表示ボタン
        const progressViewButton = document.getElementById('progress-view-btn');
        if (progressViewButton) {
            progressViewButton.addEventListener('click', (e) => {
                this.handleButtonClick(e, () => this.onProgressView());
            });
        }
    }

    addInteractiveEffects() {
        // ボタンにタッチフィードバック効果を追加
        const buttons = this.element.querySelectorAll('.big-button');
        buttons.forEach(button => {
            // タッチ開始時の効果
            button.addEventListener('touchstart', (e) => {
                button.classList.add('pressed');
                this.playButtonSound();
            });

            // タッチ終了時の効果
            button.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    button.classList.remove('pressed');
                }, 150);
            });

            // マウス操作時の効果
            button.addEventListener('mousedown', (e) => {
                button.classList.add('pressed');
                this.playButtonSound();
            });

            button.addEventListener('mouseup', (e) => {
                setTimeout(() => {
                    button.classList.remove('pressed');
                }, 150);
            });
        });
    }

    handleButtonClick(event, callback) {
        // ボタンクリック時の視覚的フィードバック
        const button = event.target.closest('.big-button');
        if (button) {
            button.classList.add('clicked');
            setTimeout(() => {
                button.classList.remove('clicked');
                callback();
            }, 200);
        } else {
            callback();
        }
    }

    playButtonSound() {
        // 簡単な音声フィードバック（Web Audio APIを使用）
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            // 音声再生に失敗した場合は無視
            console.log('音声フィードバックをスキップ');
        }
    }

    onStartPractice() {
        console.log('ランダム練習開始');
        // アニメーション効果付きで画面遷移
        this.element.classList.add('fade-out');
        setTimeout(() => {
            this.app.startPractice('random');
            this.element.classList.remove('fade-out');
        }, 300);
    }

    onDifficultySelect() {
        console.log('難易度選択');
        this.showDifficultySelection();
    }

    onCharacterSelect() {
        console.log('文字選択');
        // 現在は最初の文字から開始（後で文字選択機能を追加可能）
        this.onStartPractice();
    }

    onProgressView() {
        console.log('進捗表示');
        // アニメーション効果付きで画面遷移
        this.element.classList.add('fade-out');
        setTimeout(() => {
            this.app.showProgress();
            this.element.classList.remove('fade-out');
        }, 300);
    }

    onShowSettings() {
        // 設定画面（後のタスクで実装予定）
        console.log('設定画面（未実装）');
    }

    /**
     * 難易度選択画面を表示
     */
    showDifficultySelection() {
        let progressData = {};
        let recommendedDifficulty = null;
        
        try {
            if (this.app && this.app.getProgressTrackingService) {
                progressData = this.app.getProgressTrackingService().getProgressByDifficulty();
                recommendedDifficulty = this.calculateRecommendedDifficulty(progressData);
            }
        } catch (error) {
            console.log('進捗データの取得をスキップ:', error.message);
        }

        this.element.innerHTML = `
            <div class="difficulty-selection-content">
                <h2 class="difficulty-title">
                    <span class="title-icon">📊</span>
                    難易度を選んでね
                    <span class="title-icon">📊</span>
                </h2>
                <div class="difficulty-buttons">
                    ${this.renderDifficultyButtons(progressData, recommendedDifficulty)}
                </div>
                <div class="difficulty-info">
                    ${this.renderDifficultyProgressInfo(progressData)}
                </div>
                <button id="back-to-menu-btn" class="back-button">
                    <span class="button-icon">⬅️</span>
                    戻る
                </button>
            </div>
        `;

        this.setupDifficultyEventListeners();
    }

    /**
     * 難易度ボタンを描画
     */
    renderDifficultyButtons(progressData, recommendedDifficulty) {
        // 新しい3段階難易度システム（画数・複雑さベース）
        const difficulties = [
            { 
                level: 'beginner', 
                name: 'はじめて', 
                icon: '🌱', 
                description: '1-2画の簡単な文字',
                characters: ['く', 'し', 'つ', 'て', 'そ', 'の', 'へ', 'ん', 'い', 'う', 'り']
            },
            { 
                level: 'intermediate', 
                name: 'なれてきた', 
                icon: '🌿', 
                description: '3画の文字',
                characters: ['あ', 'お', 'か', 'け', 'こ', 'さ', 'せ', 'に', 'は', 'ま', 'も', 'や', 'ろ', 'わ', 'え', 'ひ', 'る', 'れ']
            },
            { 
                level: 'advanced', 
                name: 'じょうず', 
                icon: '🌳', 
                description: '4画以上の複雑な文字',
                characters: ['き', 'た', 'な', 'ぬ', 'ね', 'ふ', 'ほ', 'む', 'め', 'ゆ', 'よ', 'ら', 'を']
            }
        ];

        return difficulties.map(diff => {
            const progress = progressData[diff.level] || { completionRate: 0, masteryRate: 0 };
            const isRecommended = diff.level === recommendedDifficulty;
            const buttonClass = `difficulty-button difficulty-${diff.level} ${isRecommended ? 'recommended' : ''}`;
            
            return `
                <button class="${buttonClass}" data-difficulty="${diff.level}">
                    <div class="difficulty-header">
                        <span class="difficulty-icon">${diff.icon}</span>
                        <span class="difficulty-name">${diff.name}</span>
                        ${isRecommended ? '<span class="recommended-badge">おすすめ</span>' : ''}
                    </div>
                    <div class="difficulty-description">${diff.description}</div>
                    <div class="character-preview">
                        ${diff.characters.slice(0, 8).join(' ')}${diff.characters.length > 8 ? '...' : ''}
                    </div>
                    <div class="difficulty-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(progress.masteryRate * 100).toFixed(0)}%"></div>
                        </div>
                        <span class="progress-text">${(progress.masteryRate * 100).toFixed(0)}% 習得済み</span>
                    </div>
                </button>
            `;
        }).join('');
    }

    /**
     * 難易度進捗情報を描画
     */
    renderDifficultyProgressInfo(progressData) {
        let overallProgress = {
            practicedCharacters: 0,
            totalCharacters: 46,
            masteredCharacters: 0
        };
        
        try {
            if (this.app && this.app.getProgressTrackingService) {
                overallProgress = this.app.getProgressTrackingService().getOverallProgress();
            }
        } catch (error) {
            console.log('全体進捗データの取得をスキップ:', error.message);
        }
        
        return `
            <div class="progress-summary">
                <h3>あなたの進捗</h3>
                <div class="progress-stats">
                    <div class="stat-item">
                        <span class="stat-icon">📝</span>
                        <span class="stat-text">練習した文字: ${overallProgress.practicedCharacters}/${overallProgress.totalCharacters}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">⭐</span>
                        <span class="stat-text">習得した文字: ${overallProgress.masteredCharacters}/${overallProgress.totalCharacters}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 難易度推奨を描画
     */
    renderDifficultyRecommendation(recommendedDifficulty) {
        if (!recommendedDifficulty) return '';

        const difficultyNames = {
            'beginner': 'はじめて',
            'intermediate': 'なれてきた',
            'advanced': 'じょうず'
        };

        return `
            <div class="difficulty-recommendation">
                <p class="recommendation-text">
                    <span class="recommendation-icon">💡</span>
                    今日は「${difficultyNames[recommendedDifficulty]}」がおすすめです！
                </p>
            </div>
        `;
    }

    /**
     * 推奨難易度を計算
     */
    calculateRecommendedDifficulty(progressData) {
        // 新しい3段階難易度システムに対応
        const levels = ['beginner', 'intermediate', 'advanced'];
        
        for (const level of levels) {
            const progress = progressData[level];
            if (!progress || progress.masteryRate < 0.7) {
                return level;
            }
        }
        
        // 全て習得済みの場合は最高難易度を推奨
        return 'advanced';
    }

    /**
     * 難易度選択画面のイベントリスナー設定
     */
    setupDifficultyEventListeners() {
        // 難易度ボタン
        const difficultyButtons = this.element.querySelectorAll('.difficulty-button');
        difficultyButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const difficulty = e.currentTarget.dataset.difficulty;
                this.handleButtonClick(e, () => this.onDifficultyPracticeStart(difficulty));
            });
        });

        // 戻るボタン
        const backButton = document.getElementById('back-to-menu-btn');
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                this.handleButtonClick(e, () => this.backToMainMenu());
            });
        }

        // インタラクティブ効果を追加
        this.addInteractiveEffects();
    }

    /**
     * 難易度別練習開始
     */
    onDifficultyPracticeStart(difficulty) {
        console.log(`難易度${difficulty}の練習開始`);
        // アニメーション効果付きで画面遷移
        this.element.classList.add('fade-out');
        setTimeout(() => {
            this.app.startPractice('strokeComplexity', { strokeComplexityLevel: difficulty });
            this.element.classList.remove('fade-out');
        }, 300);
    }

    /**
     * メインメニューに戻る
     */
    backToMainMenu() {
        this.render();
        this.setupEventListeners();
        this.addInteractiveEffects();
    }

    // 画面がアクティブになった時の処理
    onActivate() {
        // アニメーション効果でメニューを表示
        this.element.classList.add('fade-in');
        setTimeout(() => {
            this.element.classList.remove('fade-in');
        }, 300);
    }
}