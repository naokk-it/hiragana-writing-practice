/**
 * 文字表示コンポーネント
 * ひらがな文字の表示と切り替え機能を提供
 */
export class CharacterDisplayComponent {
    constructor(app) {
        this.app = app;
        this.currentCharacter = null;
        this.displayElement = null;
        this.navigationEnabled = false;
    }

    /**
     * コンポーネントを初期化
     * @param {string} containerId 表示コンテナのID
     * @param {string} characterElementId 文字表示要素のID
     * @param {boolean} showNavigation ナビゲーションボタンを表示するか
     */
    init(containerId, characterElementId, showNavigation = false) {
        this.container = document.getElementById(containerId);
        this.displayElement = document.getElementById(characterElementId);
        this.navigationEnabled = showNavigation;
        
        if (showNavigation) {
            this.createNavigationControls();
        }
        
        // 初期文字を表示
        this.updateDisplay();
        
        console.log('CharacterDisplayComponent初期化完了');
    }

    /**
     * ナビゲーションコントロールを作成
     */
    createNavigationControls() {
        if (!this.container) return;

        // ナビゲーションコンテナが既に存在する場合は削除
        const existingNav = this.container.querySelector('.character-navigation');
        if (existingNav) {
            existingNav.remove();
        }

        const navContainer = document.createElement('div');
        navContainer.className = 'character-navigation';
        
        // 練習モード切り替えボタン
        const modeToggle = document.createElement('button');
        modeToggle.className = 'mode-toggle-button';
        modeToggle.id = 'mode-toggle-button';
        modeToggle.title = '練習モードを切り替え';
        modeToggle.addEventListener('click', () => this.togglePracticeMode());
        
        // 前の文字ボタン
        const prevButton = document.createElement('button');
        prevButton.className = 'nav-button prev-button';
        prevButton.innerHTML = '◀';
        prevButton.title = '前の文字';
        prevButton.addEventListener('click', () => this.showPreviousCharacter());
        
        // 文字インジケーター（拡張版）
        const indicator = document.createElement('div');
        indicator.className = 'character-indicator enhanced';
        indicator.id = 'character-indicator';
        
        // 次の文字ボタン
        const nextButton = document.createElement('button');
        nextButton.className = 'nav-button next-button';
        nextButton.innerHTML = '▶';
        nextButton.title = '次の文字';
        nextButton.addEventListener('click', () => this.showNextCharacter());
        
        // カテゴリ表示
        const categoryDisplay = document.createElement('div');
        categoryDisplay.className = 'category-display';
        categoryDisplay.id = 'category-display';
        
        navContainer.appendChild(modeToggle);
        navContainer.appendChild(prevButton);
        navContainer.appendChild(indicator);
        navContainer.appendChild(nextButton);
        navContainer.appendChild(categoryDisplay);
        
        // 文字表示の後に挿入
        const characterDisplay = this.container.querySelector('.character-display');
        if (characterDisplay) {
            characterDisplay.appendChild(navContainer);
        }
    }

    /**
     * 文字表示を更新
     */
    updateDisplay() {
        if (!this.displayElement) return;
        
        const hiraganaService = this.app.getHiraganaDataService();
        this.currentCharacter = hiraganaService.getCurrentCharacter();
        
        if (this.currentCharacter) {
            // 文字を表示
            this.displayElement.textContent = this.currentCharacter.character;
            
            // 難易度に応じて色を変更
            this.updateCharacterStyle();
            
            // 難易度インジケーターを追加
            this.updateDifficultyIndicator();
            
            // インジケーターを更新
            this.updateIndicator();
            
            // カテゴリ表示を更新
            this.updateCategoryDisplay();
            
            // 練習モード表示を更新
            this.updateModeDisplay();
            
            console.log(`文字表示更新: ${this.currentCharacter.character}`);
        }
    }

    /**
     * 文字のスタイルを難易度に応じて更新
     */
    updateCharacterStyle() {
        if (!this.displayElement || !this.currentCharacter) return;
        
        // 難易度に応じた色設定
        const difficultyColors = {
            1: '#4ECDC4', // 簡単 - 青緑
            2: '#FFD93D', // 普通 - 黄色
            3: '#FF6B6B', // 難しい - 赤
            4: '#A8E6CF', // とても難しい - 薄緑
            5: '#FFB6C1'  // 最難 - ピンク
        };
        
        const color = difficultyColors[this.currentCharacter.difficulty] || '#333';
        this.displayElement.style.color = color;
        
        // アニメーション効果
        this.displayElement.style.transform = 'scale(0.8)';
        setTimeout(() => {
            this.displayElement.style.transform = 'scale(1)';
        }, 100);
    }

    /**
     * インジケーターを更新（拡張版）
     */
    updateIndicator() {
        const indicator = document.getElementById('character-indicator');
        if (!indicator) return;
        
        const hiraganaService = this.app.getHiraganaDataService();
        const progressService = this.app.getProgressTrackingService();
        const currentIndex = hiraganaService.getCurrentIndex();
        const totalCount = hiraganaService.getCharacterCount();
        
        // 基本的な位置情報
        const positionInfo = `${currentIndex + 1} / ${totalCount}`;
        
        // 進捗情報を取得
        let progressInfo = '';
        if (this.currentCharacter && progressService) {
            const progress = progressService.getCharacterProgress(this.currentCharacter.character);
            if (progress) {
                const accuracy = Math.round(progress.getAccuracy() * 100);
                const attempts = progress.getTotalAttempts();
                progressInfo = `<br><small>正答率: ${accuracy}% (${attempts}回)</small>`;
            }
        }
        
        indicator.innerHTML = positionInfo + progressInfo;
    }

    /**
     * 次の文字を表示
     */
    showNextCharacter() {
        const hiraganaService = this.app.getHiraganaDataService();
        hiraganaService.getNextCharacter();
        this.updateDisplay();
        
        // アプリに文字変更を通知
        this.notifyCharacterChange();
    }

    /**
     * 前の文字を表示
     */
    showPreviousCharacter() {
        const hiraganaService = this.app.getHiraganaDataService();
        hiraganaService.getPreviousCharacter();
        this.updateDisplay();
        
        // アプリに文字変更を通知
        this.notifyCharacterChange();
    }

    /**
     * 特定の文字を表示
     * @param {string} character 表示する文字
     */
    showCharacter(character) {
        const hiraganaService = this.app.getHiraganaDataService();
        const selectedChar = hiraganaService.selectCharacter(character);
        
        if (selectedChar) {
            this.updateDisplay();
            this.notifyCharacterChange();
        }
    }

    /**
     * 文字変更をアプリに通知
     */
    notifyCharacterChange() {
        // カスタムイベントを発火
        const event = new CustomEvent('characterChanged', {
            detail: {
                character: this.currentCharacter,
                component: this
            }
        });
        
        document.dispatchEvent(event);
    }

    /**
     * 現在の文字を取得
     * @returns {HiraganaCharacter} 現在の文字
     */
    getCurrentCharacter() {
        return this.currentCharacter;
    }

    /**
     * 難易度インジケーターを更新
     */
    updateDifficultyIndicator() {
        if (!this.displayElement || !this.currentCharacter) return;
        
        // 既存の難易度インジケーターを削除
        const existingIndicator = this.displayElement.parentElement.querySelector('.difficulty-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // 新しい難易度インジケーターを作成
        const difficultyIndicator = document.createElement('div');
        difficultyIndicator.className = 'difficulty-indicator';
        
        const difficulty = this.currentCharacter.difficulty || 1;
        const difficultyLabels = {
            1: { text: '簡単', color: '#4ECDC4', stars: '★' },
            2: { text: '普通', color: '#FFD93D', stars: '★★' },
            3: { text: '難しい', color: '#FF6B6B', stars: '★★★' },
            4: { text: 'とても難しい', color: '#A8E6CF', stars: '★★★★' },
            5: { text: '最難', color: '#FFB6C1', stars: '★★★★★' }
        };
        
        const difficultyInfo = difficultyLabels[difficulty] || difficultyLabels[1];
        difficultyIndicator.innerHTML = `
            <span class="difficulty-stars" style="color: ${difficultyInfo.color}">${difficultyInfo.stars}</span>
            <span class="difficulty-text">${difficultyInfo.text}</span>
        `;
        difficultyIndicator.style.color = difficultyInfo.color;
        
        // 文字表示の上に挿入
        this.displayElement.parentElement.insertBefore(difficultyIndicator, this.displayElement);
    }

    /**
     * カテゴリ表示を更新
     */
    updateCategoryDisplay() {
        const categoryDisplay = document.getElementById('category-display');
        if (!categoryDisplay || !this.currentCharacter) return;
        
        const category = this.currentCharacter.category || '基本';
        const categoryIcons = {
            '基本': '🔤',
            '濁音': '🔊',
            '半濁音': '🔉',
            '拗音': '🌀',
            '促音': '⚡'
        };
        
        const icon = categoryIcons[category] || '🔤';
        categoryDisplay.innerHTML = `
            <span class="category-icon">${icon}</span>
            <span class="category-text">${category}</span>
        `;
    }

    /**
     * 練習モード表示を更新
     */
    updateModeDisplay() {
        const modeToggle = document.getElementById('mode-toggle-button');
        if (!modeToggle) return;
        
        const appState = this.app.appState;
        const mode = appState.practiceMode || 'random';
        
        const modeInfo = {
            'random': { text: 'ランダム', icon: '🎲' },
            'sequential': { text: '順番', icon: '📚' },
            'difficulty': { text: '難易度順', icon: '📊' }
        };
        
        const info = modeInfo[mode] || modeInfo['random'];
        modeToggle.innerHTML = `${info.icon} ${info.text}`;
        modeToggle.title = `現在のモード: ${info.text}`;
    }

    /**
     * 練習モードを切り替え
     */
    togglePracticeMode() {
        const appState = this.app.appState;
        const modes = ['random', 'sequential', 'difficulty'];
        const currentIndex = modes.indexOf(appState.practiceMode || 'random');
        const nextIndex = (currentIndex + 1) % modes.length;
        const newMode = modes[nextIndex];
        
        // アプリの状態を更新
        appState.practiceMode = newMode;
        
        // RandomizationServiceに新しいモードを設定
        const randomizationService = this.app.getRandomizationService();
        if (randomizationService) {
            randomizationService.setPracticeMode(newMode);
        }
        
        // 表示を更新
        this.updateModeDisplay();
        
        // フィードバック音を再生
        this.playModeChangeSound();
        
        console.log(`練習モード変更: ${newMode}`);
    }

    /**
     * モード変更時の音声フィードバック
     */
    playModeChangeSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('音声フィードバックをスキップ');
        }
    }

    /**
     * 表示をリフレッシュ
     */
    refresh() {
        this.updateDisplay();
    }
}

// モジュールとしてエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CharacterDisplayComponent;
}