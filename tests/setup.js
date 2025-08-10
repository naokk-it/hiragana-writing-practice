// Jest テストセットアップファイル

// Canvas APIのモック
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  strokeStyle: '',
  lineWidth: 0,
  lineCap: '',
  lineJoin: '',
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) }))
}));

// getBoundingClientRectのモック
global.HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
  left: 0,
  top: 0,
  width: 400,
  height: 400
}));

// addEventListenerとremoveEventListenerのモック
global.HTMLCanvasElement.prototype.addEventListener = jest.fn();
global.HTMLCanvasElement.prototype.removeEventListener = jest.fn();

// performance.nowのモック（Node.js環境用）
if (typeof performance === 'undefined') {
  global.performance = {
    now: jest.fn(() => Date.now())
  };
}

// console.logを抑制（テスト実行時の出力をクリーンに保つ）
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};