// ============================================================================
// 导入模块
// ============================================================================
const { app, BrowserWindow, Menu, clipboard, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// ============================================================================
// 配置常量
// ============================================================================
const CONFIG = {
  TARGET_URL: 'https://google.com/',
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  WINDOW: {
    width: 1200,
    height: 600,
    minWidth: 400,
    minHeight: 300,
    show: false,
    backgroundColor: '#000',
    webPreferences: {
      affinity: 'window2',
      contextIsolation: true,
      backgroundThrottling: false,
      webSecurity: true,
      autoplayPolicy: 'no-user-gesture-required',
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false
    }
  },
  LOAD_TIMEOUT: 60000,
  ERROR_CODES: {
    ABORTED: -3
  }
};

// ============================================================================
// 主窗口类
// ============================================================================
class MainWindow {
  constructor() {
    this.window = null;
    this.isQuitting = false;
  }

  // --------------------------------------------------------------------------
  // 窗口创建与初始化
  // --------------------------------------------------------------------------
  create() {
    this.window = new BrowserWindow({
      ...CONFIG.WINDOW,
      webPreferences: {
        ...CONFIG.WINDOW.webPreferences,
        preload: path.join(__dirname, './preload.js')
      }
    });

    this.setupWebContents();
    this.setupEventHandlers();
    this.loadPage();

    this.window.once('ready-to-show', () => this.window.show());

    if (process.env.NODE_ENV === 'development') {
      this.wc.openDevTools();
    }
  }

  get wc() {
    return this.window?.webContents;
  }

  // --------------------------------------------------------------------------
  // WebContents 设置
  // --------------------------------------------------------------------------
  setupWebContents() {
    this.wc.session.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['User-Agent'] = CONFIG.USER_AGENT;
      callback({ requestHeaders: details.requestHeaders });
    });

    this.wc.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http')) {
        this.window.loadURL(url).catch(console.error);
      }
      return { action: 'deny' };
    });

    this.wc.on('render-process-gone', this.handleCrash.bind(this));
    this.wc.on('unresponsive', this.handleUnresponsive.bind(this));
    this.wc.on('responsive', () => console.log('Page responsive again'));
    this.wc.on('did-fail-load', this.handleLoadError.bind(this));
  }

  // --------------------------------------------------------------------------
  // 事件处理器设置
  // --------------------------------------------------------------------------
  setupEventHandlers() {
    const keyMap = {
      r: () => this.wc.reload(),
      arrowright: () => this.navigate('forward'),
      arrowleft: () => this.navigate('back'),
      i: () => {
        if (process.env.NODE_ENV === 'development') {
          this.wc.toggleDevTools();
          return true;
        }
        return false;
      }
    };

    this.wc.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && (input.control || input.meta)) {
        const key = input.key.toLowerCase().replace(' ', '');
        const action = keyMap[key];
        if (action && action()) {
          event.preventDefault();
        }
      }
    });

    this.wc.on('context-menu', (_, params) => this.showContextMenu(params));

    this.window.on('close', event => {
      if (!this.isQuitting && process.platform === 'darwin') {
        event.preventDefault();
        this.window.hide();
      }
    });

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  // --------------------------------------------------------------------------
  // 导航功能
  // --------------------------------------------------------------------------
  navigate(direction) {
    const nav = this.wc.navigationHistory;
    const canNavigate =
      direction === 'forward' ? nav.canGoForward() : nav.canGoBack();

    if (canNavigate) {
      direction === 'forward' ? nav.goForward() : nav.goBack();
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // 右键菜单设置
  // --------------------------------------------------------------------------
  showContextMenu(params) {
    const nav = this.wc.navigationHistory;

    const menuTemplate = [
      {
        label: '刷新',
        accelerator: 'CmdOrCtrl+R',
        click: () => this.wc.reload()
      },
      { type: 'separator' },
      {
        label: '前进',
        accelerator: 'CmdOrCtrl+Right',
        enabled: nav.canGoForward(),
        click: () => nav.goForward()
      },
      {
        label: '后退',
        accelerator: 'CmdOrCtrl+Left',
        enabled: nav.canGoBack(),
        click: () => nav.goBack()
      },
      { type: 'separator' },
      {
        label: '复制',
        enabled: !!(params.linkURL || params.selectionText),
        click: () => {
          params.linkURL
            ? clipboard.writeText(params.linkURL)
            : this.wc.copy();
        }
      },
      { label: '粘贴', role: 'paste' },
      { label: '剪切', role: 'cut' },
      { type: 'separator' },
      {
        label: '检查元素',
        click: () => this.wc.inspectElement(params.x, params.y)
      }
    ];

    Menu.buildFromTemplate(menuTemplate).popup({ window: this.window });
  }

  // --------------------------------------------------------------------------
  // 页面加载函数
  // --------------------------------------------------------------------------
  async loadPage() {
    try {
      await Promise.race([
        this.window.loadURL(CONFIG.TARGET_URL),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Load timeout')), CONFIG.LOAD_TIMEOUT)
        )
      ]);
    } catch (err) {
      console.error('Initial load failed:', err);
      this.showErrorPage(err.message, CONFIG.TARGET_URL);
    }
  }

  // --------------------------------------------------------------------------
  // 错误处理
  // --------------------------------------------------------------------------
  handleCrash(_, details) {
    console.error('Renderer process crashed:', details);
    if (details.reason !== 'crashed') return;

    const choice = dialog.showMessageBoxSync(this.window, {
      type: 'error',
      buttons: ['重新加载', '退出'],
      defaultId: 0,
      message: '页面崩溃了',
      detail: '是否重新加载页面？'
    });

    choice === 0 ? this.wc.reload() : app.quit();
  }

  handleUnresponsive() {
    console.warn('Page unresponsive');

    const choice = dialog.showMessageBoxSync(this.window, {
      type: 'warning',
      buttons: ['等待', '重新加载'],
      defaultId: 0,
      message: '页面无响应',
      detail: '页面没有响应，是否重新加载？'
    });

    if (choice === 1) {
      this.wc.reload();
    }
  }

  handleLoadError(_, errorCode, errorDescription) {
    console.error(`Load failed: ${errorDescription} (${errorCode})`);
    if (errorCode === CONFIG.ERROR_CODES.ABORTED) return;
    this.showErrorPage(errorDescription);
  }

  // --------------------------------------------------------------------------
  // 错误页面显示
  // --------------------------------------------------------------------------
  showErrorPage(message, retryUrl = '') {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .error-container {
              text-align: center;
              padding: 40px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 10px;
              backdrop-filter: blur(10px);
            }
            h1 {
              margin: 0 0 20px;
              font-size: 2.5em;
            }
            p {
              margin: 0 0 30px;
              opacity: 0.9;
            }
            button {
              padding: 12px 30px;
              margin: 0 10px;
              border: none;
              border-radius: 5px;
              background: white;
              color: #764ba2;
              font-size: 16px;
              cursor: pointer;
              transition: transform 0.2s;
            }
            button:hover {
              transform: scale(1.05);
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>⚠️ 加载失败</h1>
            <p>${message}</p>
            <button onclick="${retryUrl ? `location.href='${retryUrl}'` : 'location.reload()'}">重试</button>
            <button onclick="history.back()">返回</button>
          </div>
        </body>
      </html>
    `;

    this.wc
      .loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      .catch(console.error);
  }

  // --------------------------------------------------------------------------
  // 公共方法
  // --------------------------------------------------------------------------
  setQuitting(value) {
    this.isQuitting = value;
  }

  show() {
    this.window?.show();
  }

  exists() {
    return this.window !== null;
  }
}

// ============================================================================
// 应用程序类
// ============================================================================
class Application {
  constructor() {
    this.mainWindow = new MainWindow();
    this.setupApp();
  }

  // --------------------------------------------------------------------------
  // 应用程序配置
  // --------------------------------------------------------------------------
  setupApp() {
    app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
    app.commandLine.appendSwitch('disable-site-isolation-trials');
    app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
    Menu.setApplicationMenu(null);

    app.whenReady().then(() => this.init());

    app.on('before-quit', () => this.mainWindow.setQuitting(true));

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });

    app.on('activate', () => {
      if (this.mainWindow.exists()) {
        this.mainWindow.show();
      } else {
        this.mainWindow.create();
      }
    });

    process.on('uncaughtException', error => {
      console.error('Uncaught exception:', error);
      dialog.showErrorBox('Error occurred', error.message);
    });

    process.on('unhandledRejection', reason => {
      console.error('Unhandled promise rejection:', reason);
    });
  }

  // --------------------------------------------------------------------------
  // 初始化
  // --------------------------------------------------------------------------
  async init() {
    try {
      await this.initUserData();
      this.mainWindow.create();
    } catch (err) {
      console.error('Initialization failed:', err);
      dialog.showErrorBox('Initialization failed', err.message);
      app.quit();
    }
  }

  async initUserData() {
    const userDataPath = path.join(
      app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath(),
      'userData'
    );

    await fs.mkdir(userDataPath, { recursive: true });
    app.setPath('userData', userDataPath);
  }
}

// ============================================================================
// 启动应用
// ============================================================================
new Application();
