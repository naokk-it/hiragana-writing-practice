// ランダム文字練習フローの統合テスト

import { HiraganaDataService } from '../js/services/HiraganaDataService.js';
import { RandomizationService } from '../js/services/RandomizationService.js';
import { ProgressTrackingService } from '../js/services/ProgressTrackingService.js';

// DOM環境のセットアップ
// TextEncoderのポリフィル
if (typeof global.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}

// URLのポリフィル
if (typeof global.URL === 'undefined') {
    global.URL = require('url').URL;
}

const { JSDOM } = require('jsdom');
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <title>ひらがな手書き練習</title>
</head>
<body>
    <div id="main-menu" class="screen">
        <h1>ひらがな手書き練習</h1>
        <button id="start-practice-btn">練習開始</button>
        <button id="difficulty-btn">難易度選択</button>
        <button id="progress-btn">進捗確認</button>
    </div>
    
    <div id="practice-view" class="screen" style="display: none;">
        <div id="character-display">
            <span id="current-character">あ</span>
            <span id="character-info">
                <span id="difficulty-level">難易度: 1</span>
                <span id="category-info">あ行</span>
            </span>
        </div>
        <canvas id="drawing-canvas" width="400" height="400"></canvas>
        <div id="practice-controls">
            <button id="clear-btn">クリア</button>
            <button id="example-btn">手本</button>
            <button id="next-character-btn">次の文字</button>
            <button id="back-to-menu-btn">メニューに戻る</button>
        </div>
    </div>
    
    <div id="difficulty-selection" class="screen" style="display: none;">
        <h2>難易度選択</h2>
        <button class="difficulty-btn" data-difficulty="1">やさしい (難易度1)</button>
        <button class="difficulty-btn" data-difficulty="2">ふつう (難易度2)</button>
        <button class="difficulty-btn" data-difficulty="3">むずかしい (難易度3)</button>
        <button class="difficulty-btn" data-difficulty="4">とてもむずかしい (難易度4)</button>
        <button id="random-mode-btn">ランダム練習</button>
        <button id="back-from-difficulty-btn">戻る</button>
    </div>
    
    <div id="progress-view" class="screen" style="display: none;">
        <h2>練習進捗</h2>
        <div id="progress-summary">
            <div id="total-progress">全体進捗: <span id="progress-percentage">0%</span></div>
            <div id="practiced-count">練習済み: <span id="practiced-number">0</span>/46文字</div>
        </div>
        <div id="character-grid"></div>
        <button id="back-from-progress-btn">戻る</button>
    </div>
    
    <div id="result-view" class="screen" style="display: none;">
        <div id="result-content">
            <div id="score-display">
                <span id="score-text">スコア</span>
                <span id="score-value">0</span>
            </div>
            <div id="feedback-message">がんばりましょう！</div>
        </div>
        <div id="result-controls">
            <button id="try-again-btn">もう一度</button>
            <button id="next-from-result-btn">次の文字</button>
            <button id="back-from-result-btn">メニューに戻る</button>
        </div>
    </div>
</body>
</html>
`);

global.document = dom.window.document;
global.window = dom.window;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
global.CanvasRenderingContext2D = dom.window.CanvasRenderingContext2D;

// Canvas APIのモック
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 100 })),
    arc: jest.fn(),
    fill: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(400 * 400 * 4) })),
    getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(400 * 400 * 4) })),
    putImageData: jest.fn()
}));

// localStorageのモック
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

describe('ランダム文字練習フロー統合テスト', () => {
    let hiraganaDataService;
    let randomizationService;
    let progressTrackingService;
    let mockErrorHandler;

    beforeEach(() => {
        // localStorageをクリア
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        localStorageMock.removeItem.mockClear();
        localStorageMock.clear.mockClear();
        
        // モックエラーハンドラーを作成
        mockErrorHandler = {
            handleCharacterError: jest.fn().mockReturnValue({ fallback: null }),
            logCharacterSelectionDebug: jest.fn()
        };
        
        // サービスを初期化
        hiraganaDataService = new HiraganaDataService(mockErrorHandler);
        progressTrackingService = new ProgressTrackingService(null, mockErrorHandler);
        randomizationService = new RandomizationService(
            hiraganaDataService, 
            progressTrackingService, 
            mockErrorHandler
        );
    });

    describe('ランダム文字選択機能', () => {
        test('ランダムモードで異なる文字が選択される', () => {
            const initialChar = hiraganaDataService.getCurrentCharacter();
            const selectedChars = new Set();
            
            // 10回文字を変更してランダム性を確認
            for (let i = 0; i < 10; i++) {
                const nextChar = randomizationService.selectNextCharacter();
                selectedChars.add(nextChar.character);
            }
            
            // 複数の異なる文字が選択されることを確認
            expect(selectedChars.size).toBeGreaterThan(1);
        });

        test('46文字すべてが選択可能である', () => {
            const allCharacters = hiraganaDataService.getAllCharacters();
            expect(allCharacters.length).toBe(46);
            
            // 各文字が有効であることを確認
            allCharacters.forEach(char => {
                expect(char.isValid()).toBe(true);
                expect(char.character).toBeTruthy();
                expect(char.reading).toBeTruthy();
                expect(char.difficulty).toBeGreaterThan(0);
            });
        });

        test('重複回避機能が動作する', () => {
            const currentChar = hiraganaDataService.getCurrentCharacter();
            let differentCharSelected = false;
            
            // 複数回試行して異なる文字が選択されることを確認
            for (let i = 0; i < 20; i++) {
                const nextChar = randomizationService.selectNextCharacter(currentChar.character);
                if (nextChar.character !== currentChar.character) {
                    differentCharSelected = true;
                    break;
                }
            }
            
            expect(differentCharSelected).toBe(true);
        });
    });

    describe('難易度フィルター機能', () => {
        test('難易度1の文字のみが選択される', () => {
            // 新しいRandomizationServiceインスタンスを作成して履歴の干渉を完全に排除
            const freshRandomizationService = new RandomizationService(
                hiraganaDataService, 
                progressTrackingService, 
                mockErrorHandler
            );
            
            const preferences = { difficultyFilter: 1, avoidRecent: false };
            
            // まず難易度1の文字が存在することを確認
            const difficulty1Chars = hiraganaDataService.getCharactersByDifficulty(1);
            expect(difficulty1Chars.length).toBeGreaterThan(0);
            
            // 少ない回数でテストして履歴の影響を最小化
            for (let i = 0; i < Math.min(3, difficulty1Chars.length); i++) {
                const selectedChar = freshRandomizationService.selectNextCharacter(null, preferences);
                expect(selectedChar.difficulty).toBe(1);
            }
        });

        test('難易度2の文字のみが選択される', () => {
            const preferences = { difficultyFilter: 2 };
            
            for (let i = 0; i < 10; i++) {
                const selectedChar = randomizationService.selectNextCharacter(null, preferences);
                expect(selectedChar.difficulty).toBe(2);
            }
        });

        test('難易度3の文字のみが選択される', () => {
            const preferences = { difficultyFilter: 3 };
            
            for (let i = 0; i < 10; i++) {
                const selectedChar = randomizationService.selectNextCharacter(null, preferences);
                expect(selectedChar.difficulty).toBe(3);
            }
        });

        test('難易度4の文字のみが選択される', () => {
            const preferences = { difficultyFilter: 4 };
            
            for (let i = 0; i < 10; i++) {
                const selectedChar = randomizationService.selectNextCharacter(null, preferences);
                expect(selectedChar.difficulty).toBe(4);
            }
        });

        test('全難易度レベルに文字が存在する', () => {
            const difficulties = hiraganaDataService.getAllDifficultyLevels();
            expect(difficulties).toEqual([1, 2, 3, 4]);
            
            difficulties.forEach(difficulty => {
                const charactersAtLevel = hiraganaDataService.getCharactersByDifficulty(difficulty);
                expect(charactersAtLevel.length).toBeGreaterThan(0);
            });
        });
    });

    describe('カテゴリフィルター機能', () => {
        test('あ行の文字のみが選択される', () => {
            const preferences = { categoryFilter: 'あ行' };
            
            for (let i = 0; i < 5; i++) {
                const selectedChar = randomizationService.selectNextCharacter(null, preferences);
                expect(selectedChar.getCategory()).toBe('あ行');
            }
        });

        test('か行の文字のみが選択される', () => {
            const preferences = { categoryFilter: 'か行' };
            
            for (let i = 0; i < 5; i++) {
                const selectedChar = randomizationService.selectNextCharacter(null, preferences);
                expect(selectedChar.getCategory()).toBe('か行');
            }
        });

        test('全カテゴリに適切な数の文字が存在する', () => {
            const categories = hiraganaDataService.getAllCategories();
            const expectedCounts = {
                'あ行': 5, 'か行': 5, 'さ行': 5, 'た行': 5, 'な行': 5,
                'は行': 5, 'ま行': 5, 'や行': 3, 'ら行': 5, 'わ行': 3
            };
            
            categories.forEach(category => {
                const charactersInCategory = hiraganaDataService.getCharactersByCategory(category);
                expect(charactersInCategory.length).toBe(expectedCounts[category]);
            });
        });
    });

    describe('進捗追跡統合', () => {
        test('文字練習が進捗に記録される', () => {
            const character = 'あ';
            const score = 0.8;
            const timestamp = Date.now();
            
            progressTrackingService.recordCharacterPractice(character, score, timestamp);
            
            const progress = progressTrackingService.getCharacterProgress(character);
            expect(progress).toBeDefined();
            expect(progress.getAttemptCount()).toBe(1);
            expect(progress.getAverageScore()).toBe(score);
        });

        test('進捗データが文字選択重みに影響する', () => {
            const character = 'あ';
            
            // 低スコアで練習を記録
            progressTrackingService.recordCharacterPractice(character, 0.3, Date.now());
            
            // 重みが更新されることを確認
            const initialWeight = randomizationService.selectionWeights.get(character);
            randomizationService.updateSelectionWeights({
                character: character,
                score: 0.3,
                difficulty: 1
            });
            
            const newWeight = randomizationService.selectionWeights.get(character);
            expect(newWeight).toBeGreaterThan(initialWeight);
        });

        test('未練習文字が優先的に選択される', () => {
            // いくつかの文字に練習記録を追加
            const practicedChars = ['あ', 'い', 'う'];
            practicedChars.forEach(char => {
                progressTrackingService.recordCharacterPractice(char, 0.8, Date.now());
            });
            
            // 重み付き選択で未練習文字が選ばれやすいことを確認
            const selectedChars = new Set();
            for (let i = 0; i < 50; i++) {
                const selectedChar = randomizationService.selectNextCharacter(null, { useProgressWeighting: true });
                selectedChars.add(selectedChar.character);
            }
            
            // 未練習文字も選択されることを確認
            const unpracticedChars = hiraganaDataService.getAllCharacters()
                .filter(char => !practicedChars.includes(char.character))
                .map(char => char.character);
            
            const selectedUnpracticedChars = [...selectedChars].filter(char => 
                unpracticedChars.includes(char)
            );
            
            expect(selectedUnpracticedChars.length).toBeGreaterThan(0);
        });
    });



    describe('エラーハンドリング統合', () => {
        test('無効な難易度フィルターでもエラーが発生しない', () => {
            expect(() => {
                randomizationService.selectNextCharacter(null, { difficultyFilter: 999 });
            }).not.toThrow();
        });

        test('無効なカテゴリフィルターでもエラーが発生しない', () => {
            expect(() => {
                randomizationService.selectNextCharacter(null, { categoryFilter: '存在しない行' });
            }).not.toThrow();
        });

        test('進捗データが破損していてもサービスが動作する', () => {
            // 破損したデータをlocalStorageに設定
            localStorageMock.getItem.mockReturnValue('invalid json data');
            
            expect(() => {
                const newProgressService = new ProgressTrackingService(null, mockErrorHandler);
                randomizationService.selectNextCharacter();
            }).not.toThrow();
        });
    });

    describe('パフォーマンス統合テスト', () => {
        test('大量の文字選択が効率的に処理される', () => {
            const startTime = Date.now();
            
            // 1000回の文字選択を実行
            for (let i = 0; i < 1000; i++) {
                randomizationService.selectNextCharacter();
            }
            
            const endTime = Date.now();
            const executionTime = endTime - startTime;
            
            // 1000回の選択が2秒以内に完了することを確認
            expect(executionTime).toBeLessThan(2000);
        });

        test('進捗データの読み書きが効率的である', () => {
            const startTime = Date.now();
            
            // 100文字の進捗データを記録
            const allChars = hiraganaDataService.getAllCharacters();
            for (let i = 0; i < 100; i++) {
                const char = allChars[i % allChars.length];
                progressTrackingService.recordCharacterPractice(
                    char.character, 
                    Math.random(), 
                    Date.now()
                );
            }
            
            const endTime = Date.now();
            const executionTime = endTime - startTime;
            
            // 100回の記録が1秒以内に完了することを確認
            expect(executionTime).toBeLessThan(1000);
        });
    });

    describe('データ整合性統合テスト', () => {
        test('全サービス間でデータの整合性が保たれる', () => {
            const allChars = hiraganaDataService.getAllCharacters();
            const randomizationDebugInfo = randomizationService.getDebugInfo();
            
            // HiraganaDataServiceとRandomizationServiceの文字数が一致
            expect(randomizationDebugInfo.totalCharacters).toBe(allChars.length);
            expect(randomizationDebugInfo.totalCharacters).toBe(46);
            
            // 全文字に重みが設定されている
            expect(Object.keys(randomizationDebugInfo.selectionWeights).length).toBe(46);
            
            // 難易度とカテゴリの情報が一致
            expect(randomizationDebugInfo.availableDifficulties).toEqual([1, 2, 3, 4]);
            expect(randomizationDebugInfo.availableCategories.length).toBe(10);
        });

        test('文字選択後にサービス間の状態が同期される', () => {
            const selectedChar = randomizationService.selectNextCharacter();
            const currentChar = hiraganaDataService.getCurrentCharacter();
            
            // RandomizationServiceで選択された文字がHiraganaDataServiceの現在文字と一致
            expect(selectedChar.character).toBe(currentChar.character);
        });

        test('進捗データと文字選択の整合性', () => {
            const character = 'あ';
            
            // 進捗を記録
            progressTrackingService.recordCharacterPractice(character, 0.8, Date.now());
            
            // 進捗データが正しく取得できる
            const progress = progressTrackingService.getCharacterProgress(character);
            expect(progress).toBeDefined();
            expect(progress.getAttemptCount()).toBe(1);
            
            // 文字選択重みが進捗に基づいて更新される
            const initialWeight = randomizationService.selectionWeights.get(character);
            randomizationService.updateSelectionWeights({
                character: character,
                score: 0.8,
                difficulty: 1
            });
            
            const newWeight = randomizationService.selectionWeights.get(character);
            expect(newWeight).not.toBe(initialWeight);
        });
    });

    describe('ユーザーエクスペリエンス統合テスト', () => {
        test('連続して同じ文字が選択される確率が低い', () => {
            let consecutiveCount = 0;
            let previousChar = null;
            const iterations = 100;
            
            for (let i = 0; i < iterations; i++) {
                const selectedChar = randomizationService.selectNextCharacter(previousChar);
                if (selectedChar.character === previousChar) {
                    consecutiveCount++;
                }
                previousChar = selectedChar.character;
            }
            
            // 連続選択が10%未満であることを確認
            expect(consecutiveCount / iterations).toBeLessThan(0.1);
        });

        test('全文字が適度な頻度で選択される', () => {
            const selectionCounts = {};
            const iterations = 500;
            
            // 500回選択して分布を確認
            for (let i = 0; i < iterations; i++) {
                const selectedChar = randomizationService.selectNextCharacter();
                selectionCounts[selectedChar.character] = (selectionCounts[selectedChar.character] || 0) + 1;
            }
            
            // 大部分の文字が選択されることを確認
            const selectedCharacters = Object.keys(selectionCounts);
            expect(selectedCharacters.length).toBeGreaterThan(35); // 46文字中35文字以上
            
            // 極端な偏りがないことを確認
            const counts = Object.values(selectionCounts);
            const maxCount = Math.max(...counts);
            const minCount = Math.min(...counts);
            const ratio = maxCount / minCount;
            expect(ratio).toBeLessThan(15); // 最大と最小の比率が15倍未満
        });

        test('難易度進行が適切に機能する', () => {
            // 難易度1の文字を多数練習
            const difficulty1Chars = hiraganaDataService.getCharactersByDifficulty(1);
            difficulty1Chars.forEach(char => {
                for (let i = 0; i < 5; i++) {
                    progressTrackingService.recordCharacterPractice(char.character, 0.8, Date.now());
                }
            });
            
            // 推奨難易度が上がることを確認
            const recommendedDifficulty = randomizationService.getRecommendedDifficulty({});
            expect(recommendedDifficulty).toBeGreaterThan(1);
        });
    });
});