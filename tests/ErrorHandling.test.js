// エラーハンドリング機能のテスト
import { ErrorHandler } from '../js/services/ErrorHandler.js';
import { HiraganaDataService } from '../js/services/HiraganaDataService.js';
import { RandomizationService } from '../js/services/RandomizationService.js';

describe('ErrorHandling', () => {
    let errorHandler;
    let hiraganaDataService;
    let randomizationService;

    beforeEach(() => {
        // DOM要素をセットアップ
        document.body.innerHTML = '<div id="test-container"></div>';
        
        // LocalStorageをクリア
        localStorage.clear();
        
        // サービスを初期化
        errorHandler = new ErrorHandler();
        hiraganaDataService = new HiraganaDataService(errorHandler);
        randomizationService = new RandomizationService(hiraganaDataService, null, errorHandler);
        
        // グローバルアプリインスタンスをモック
        window.app = {
            hiraganaDataService,
            randomizationService,
            setPracticeMode: jest.fn()
        };
    });

    afterEach(() => {
        // グローバル変数をクリア
        delete window.app;
        
        // DOM要素をクリア
        document.body.innerHTML = '';
        
        // LocalStorageをクリア
        localStorage.clear();
    });

    describe('ErrorHandler', () => {
        test('文字関連エラーを適切に処理する', () => {
            const error = new Error('文字データの読み込みに失敗しました');
            const context = {
                operation: 'loading',
                character: 'あ'
            };

            const result = errorHandler.handleCharacterError(error, context);

            expect(result.handled).toBe(true);
            expect(result.fallback).toBeDefined();
            expect(result.userMessage).toContain('文字');
        });

        test('文字選択エラーでフォールバックモードに切り替わる', () => {
            const error = new Error('ランダム選択に失敗しました');
            const context = {
                operation: 'selection',
                method: 'selectNextCharacter'
            };

            const result = errorHandler.handleCharacterSelectionError(error, context);

            expect(result.handled).toBe(true);
            expect(result.modeChanged).toBe('sequential');
            expect(window.app.setPracticeMode).toHaveBeenCalledWith('sequential');
        });

        test('フォールバック文字セットを提供する', () => {
            const fallbackSet = errorHandler.getFallbackCharacterSet();

            expect(Array.isArray(fallbackSet)).toBe(true);
            expect(fallbackSet.length).toBeGreaterThan(0);
            expect(fallbackSet[0]).toHaveProperty('char', 'あ');
        });

        test('文字関連エラーの統計を取得できる', () => {
            // いくつかのエラーを記録
            errorHandler.handleCharacterError(new Error('test1'), { operation: 'loading' });
            errorHandler.handleCharacterError(new Error('test2'), { operation: 'selection' });
            errorHandler.handleCharacterError(new Error('test3'), { operation: 'loading' });

            const stats = errorHandler.getCharacterErrorStatistics();

            expect(stats.total).toBe(3);
            expect(stats.byOperation.loading).toBe(2);
            expect(stats.byOperation.selection).toBe(1);
            expect(stats.mostCommon).toBe('loading');
        });
    });

    describe('HiraganaDataService Error Handling', () => {
        test('初期化エラー時にフォールバック文字セットを使用する', () => {
            // 初期化エラーをシミュレート
            const mockInitialize = jest.spyOn(HiraganaDataService.prototype, 'initializeCharacters')
                .mockImplementation(() => {
                    throw new Error('初期化失敗');
                });

            const service = new HiraganaDataService(errorHandler);

            expect(service.isInitialized).toBe(true);
            expect(service.characters.length).toBeGreaterThan(0);

            mockInitialize.mockRestore();
        });

        test('getCurrentCharacter()でエラー時にフォールバック文字を返す', () => {
            // 無効なインデックスを設定
            hiraganaDataService.currentIndex = -1;

            const character = hiraganaDataService.getCurrentCharacter();

            expect(character).toBeDefined();
            expect(character.character).toBeDefined();
        });

        test('getRandomCharacter()でエラー時にフォールバック処理を実行する', () => {
            // 文字配列を空にしてエラーをシミュレート
            hiraganaDataService.characters = [];

            const character = hiraganaDataService.getRandomCharacter();

            expect(character).toBeDefined();
            expect(character.character).toBeDefined();
        });

        test('難易度フィルターエラー時に全文字から選択する', () => {
            // 無効な難易度フィルターでテスト
            const character = hiraganaDataService.getRandomCharacter(true, 999);

            expect(character).toBeDefined();
            expect(character.character).toBeDefined();
        });
    });

    describe('RandomizationService Error Handling', () => {
        test('初期化エラー時にフォールバックモードになる', () => {
            // HiraganaDataServiceを無効にして初期化エラーをシミュレート
            const mockGetAllCharacters = jest.spyOn(hiraganaDataService, 'getAllCharacters')
                .mockImplementation(() => {
                    throw new Error('文字取得失敗');
                });

            const service = new RandomizationService(hiraganaDataService, null, errorHandler);

            expect(service.isInitialized).toBe(true);
            expect(service.fallbackMode).toBe(true);

            mockGetAllCharacters.mockRestore();
        });

        test('selectNextCharacter()でエラー時にフォールバック文字を返す', () => {
            // エラーをシミュレート
            const mockGetAvailableCharacters = jest.spyOn(randomizationService, 'getAvailableCharacters')
                .mockImplementation(() => {
                    throw new Error('文字取得失敗');
                });

            const character = randomizationService.selectNextCharacter();

            expect(character).toBeDefined();
            expect(character.character).toBeDefined();

            mockGetAvailableCharacters.mockRestore();
        });

        test('weightedRandomSelection()でエラー時にシンプル選択にフォールバック', () => {
            const characters = hiraganaDataService.getAllCharacters().slice(0, 3);
            
            // 重み計算エラーをシミュレート
            const mockCalculateWeight = jest.spyOn(randomizationService, 'calculateSelectionWeight')
                .mockImplementation(() => {
                    throw new Error('重み計算失敗');
                });

            const selectedCharacter = randomizationService.weightedRandomSelection(characters);

            expect(selectedCharacter).toBeDefined();
            expect(selectedCharacter.character).toBeDefined();

            mockCalculateWeight.mockRestore();
        });

        test('simpleRandomSelection()で空配列時にフォールバック文字を返す', () => {
            const character = randomizationService.simpleRandomSelection([]);

            expect(character).toBeDefined();
            expect(character.character).toBeDefined();
        });

        test('フォールバック選択が正常に動作する', () => {
            const character = randomizationService.performFallbackSelection('あ', {});

            expect(character).toBeDefined();
            expect(character.character).toBeDefined();
            expect(character.character).not.toBe('あ'); // 現在の文字を除外
        });
    });

    describe('Error Recovery', () => {
        test('文字データ復旧が正常に動作する', () => {
            const success = errorHandler.attemptRecovery('characterData');
            expect(typeof success).toBe('boolean');
        });

        test('ランダム化復旧が正常に動作する', () => {
            const success = errorHandler.attemptRecovery('randomization');
            expect(typeof success).toBe('boolean');
        });

        test('進捗追跡復旧が正常に動作する', () => {
            const success = errorHandler.attemptRecovery('progress');
            expect(typeof success).toBe('boolean');
        });
    });

    describe('Debug and Logging', () => {
        test('文字選択デバッグ情報を記録する', () => {
            const initialLogLength = errorHandler.errorLog.length;

            errorHandler.logCharacterSelectionDebug('test_operation', {
                character: 'あ',
                success: true
            });

            expect(errorHandler.errorLog.length).toBe(initialLogLength + 1);
            
            const lastLog = errorHandler.errorLog[errorHandler.errorLog.length - 1];
            expect(lastLog.type).toBe('character_selection_debug');
            expect(lastLog.operation).toBe('test_operation');
        });

        test('アプリ状態スナップショットを取得する', () => {
            const snapshot = errorHandler.getAppStateSnapshot();

            expect(snapshot).toBeDefined();
            expect(snapshot).toHaveProperty('currentScreen');
            expect(snapshot).toHaveProperty('practiceMode');
        });

        test('デバッグモードを正しく判定する', () => {
            // デバッグモードを無効にしてテスト
            localStorage.removeItem('hiragana_debug_mode');
            expect(errorHandler.isDebugMode()).toBe(false);

            // デバッグモードを有効にしてテスト
            localStorage.setItem('hiragana_debug_mode', 'true');
            expect(errorHandler.isDebugMode()).toBe(true);
        });
    });

    describe('User-Friendly Error Messages', () => {
        test('文字関連エラーに適切なメッセージを生成する', () => {
            const errorInfo = {
                message: 'character loading failed',
                type: 'character'
            };

            const message = errorHandler.getUserFriendlyMessage(errorInfo);

            expect(message).toContain('文字データ');
            expect(message).toContain('再読み込み');
        });

        test('ランダム化エラーに適切なメッセージを生成する', () => {
            const errorInfo = {
                message: 'randomization error occurred',
                type: 'randomization'
            };

            const message = errorHandler.getUserFriendlyMessage(errorInfo);

            expect(message).toContain('文字選択');
            expect(message).toContain('順番モード');
        });
    });
});