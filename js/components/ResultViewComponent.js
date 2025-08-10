// 結果表示コンポーネント
export class ResultViewComponent {
    constructor(app) {
        this.app = app;
        this.element = document.getElementById('result-view');
        this.isInitialized = false;
        this.currentScore = null;
        this.currentCharacter = null;
    }

    init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('ResultViewComponent初期化完了');
    }

    setupEventListeners() {
        // イベントリスナーは動的に生成されるボタンに対して設定するため、
        // イベント委譲を使用
        this.element.addEventListener('click', (e) => {
            if (e.target.id === 'try-again-btn') {
                this.handleButtonClick(e, () => this.onTryAgain());
            } else if (e.target.id === 'next-character-btn') {
                this.handleButtonClick(e, () => this.onNextCharacter());
            } else if (e.target.id === 'show-example-btn') {
                this.handleButtonClick(e, () => this.onShowExample());
            } else if (e.target.id === 'back-to-menu-btn') {
                this.handleButtonClick(e, () => this.onBackToMenu());
            }
        });
    }

    render(score, character) {
        this.currentScore = score;
        this.currentCharacter = character;
        
        const scoreData = this.getScoreData(score);
        
        this.element.innerHTML = `
            <div class="result-content">
                <div class="result-header">
                    <div class="practiced-character">
                        <span class="character-label">練習した文字</span>
                        <span class="character-display">${character}</span>
                    </div>
                </div>
                
                <div class="result-display">
                    <div class="score-animation">
                        <div id="score-icon" class="score-icon ${scoreData.className}">
                            ${scoreData.icon}
                        </div>
                        <div class="score-effects">
                            ${scoreData.effects}
                        </div>
                    </div>
                    <div id="score-message" class="score-message ${scoreData.messageClass}">
                        ${scoreData.message}
                    </div>
                    <div class="encouragement-text">
                        ${scoreData.encouragement}
                    </div>
                </div>
                
                <div class="result-controls">
                    <div class="primary-actions">
                        <button id="try-again-btn" class="result-button primary-button">
                            <span class="button-icon">🔄</span>
                            もう一度
                        </button>
                        <button id="next-character-btn" class="result-button success-button">
                            <span class="button-icon">➡️</span>
                            次の文字
                        </button>
                    </div>
                    <div class="secondary-actions">
                        ${score.level === 'poor' || score.level === 'fair' ? 
                            '<button id="show-example-btn" class="result-button help-button"><span class="button-icon">👀</span>手本を見る</button>' : 
                            ''
                        }
                        <button id="back-to-menu-btn" class="result-button menu-button">
                            <span class="button-icon">🏠</span>
                            メニューに戻る
                        </button>
                    </div>
                </div>
            </div>
        `;

        // アニメーション効果を追加
        this.addAnimationEffects(scoreData);
        
        console.log('ResultViewComponent描画完了');
    }

    getScoreData(score) {
        switch (score.level) {
            case 'excellent':
                return {
                    icon: '🌟',
                    className: 'excellent',
                    message: 'すばらしい！',
                    messageClass: 'excellent-message',
                    encouragement: 'とても上手に書けました！',
                    effects: '✨🎉✨'
                };
            case 'good':
                return {
                    icon: '😊',
                    className: 'good',
                    message: 'よくできました！',
                    messageClass: 'good-message',
                    encouragement: '上手に書けています！',
                    effects: '👏🌟👏'
                };
            case 'fair':
                return {
                    icon: '😐',
                    className: 'fair',
                    message: 'もう少し！',
                    messageClass: 'fair-message',
                    encouragement: 'あと少しで上手になります！',
                    effects: '💪📝💪'
                };
            case 'poor':
                return {
                    icon: '😅',
                    className: 'poor',
                    message: 'がんばろう！',
                    messageClass: 'poor-message',
                    encouragement: '練習すればきっと上手になります！',
                    effects: '🌱📚🌱'
                };
            default:
                return {
                    icon: '😊',
                    className: 'good',
                    message: 'よくできました！',
                    messageClass: 'good-message',
                    encouragement: '上手に書けています！',
                    effects: '👏🌟👏'
                };
        }
    }

    addAnimationEffects(scoreData) {
        // スコアアイコンのアニメーション
        const scoreIcon = this.element.querySelector('#score-icon');
        if (scoreIcon) {
            setTimeout(() => {
                scoreIcon.classList.add('animate-in');
            }, 100);
        }

        // エフェクトのアニメーション
        const effects = this.element.querySelector('.score-effects');
        if (effects) {
            setTimeout(() => {
                effects.classList.add('animate-effects');
            }, 300);
        }

        // メッセージのアニメーション
        const message = this.element.querySelector('#score-message');
        if (message) {
            setTimeout(() => {
                message.classList.add('animate-message');
            }, 500);
        }

        // 音声フィードバック
        this.playResultSound(scoreData.className);
    }

    playResultSound(scoreClass) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // スコアに応じて異なる音を再生
            let frequency, duration;
            switch (scoreClass) {
                case 'excellent':
                    frequency = 880; // A5
                    duration = 0.6;
                    break;
                case 'good':
                    frequency = 660; // E5
                    duration = 0.4;
                    break;
                case 'fair':
                    frequency = 440; // A4
                    duration = 0.3;
                    break;
                case 'poor':
                    frequency = 330; // E4
                    duration = 0.2;
                    break;
                default:
                    frequency = 660;
                    duration = 0.4;
            }
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (error) {
            console.log('音声フィードバックをスキップ');
        }
    }

    handleButtonClick(event, callback) {
        const button = event.target.closest('.result-button');
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

    displayResult(score, character) {
        this.render(score, character);
        
        // 画面表示時のアニメーション
        this.element.classList.add('result-enter');
        setTimeout(() => {
            this.element.classList.remove('result-enter');
        }, 600);
        
        console.log(`結果表示: ${character} - スコア: ${score.level}`);
    }

    onTryAgain() {
        console.log('もう一度挑戦');
        this.addExitAnimation(() => {
            this.app.tryAgain();
        });
    }

    onNextCharacter() {
        console.log('次の文字へ');
        this.addExitAnimation(() => {
            this.app.nextCharacter();
        });
    }

    onShowExample() {
        console.log('手本を表示');
        this.addExitAnimation(() => {
            this.app.showExample();
        });
    }

    onBackToMenu() {
        console.log('メニューに戻る');
        this.addExitAnimation(() => {
            this.app.showScreen('main-menu');
        });
    }

    addExitAnimation(callback) {
        this.element.classList.add('result-exit');
        setTimeout(() => {
            this.element.classList.remove('result-exit');
            callback();
        }, 300);
    }

    // 外部から呼び出される表示メソッド
    show(score, character) {
        this.displayResult(score, character);
    }
}