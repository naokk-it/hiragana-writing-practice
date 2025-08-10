// メインアプリケーションエントリーポイント
import { App } from './app.js';

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});