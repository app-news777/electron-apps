// ============================================================================
// 导入 Electron 模块
// ============================================================================
const { contextBridge } = require('electron');

// ============================================================================
// 配置常量
// ============================================================================
const CONFIG = {
  SCALE: {
    BASE_WIDTH: 1920,
    BASE_HEIGHT: 1080,
    CONTAINER_ID: 'app-container',
    RESIZE_DELAY: 100
  },
  AD_SELECTORS: [
    "#player+div+div",
    "div.mgp_adRollEventCatcher.mgp_clickable",
    "div.toc-container"
  ]
};

// ============================================================================
// 隐藏浏览器指纹
// ============================================================================
const hideBrowserFingerprint = () => {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => false,
    configurable: true
  });

  if (window.performance && !window.performance.memory) {
    Object.defineProperty(window.performance, 'memory', {
      value: {
        totalJSHeapSize: Math.floor(Math.random() * 100 + 50) * 1024 * 1024,
        usedJSHeapSize: Math.floor(Math.random() * 50) * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024
      },
      configurable: true
    });
  }
};

// ============================================================================
// 页面缩放管理器类
// ============================================================================
class PageScaler {
  constructor(config) {
    this.config = config;
    this.resizeTimer = null;
    this.init();
  }

  init() {
    const observer = new MutationObserver(() => {
      const container = document.getElementById(this.config.CONTAINER_ID);
      if (container) {
        observer.disconnect();
        this.setupScaling(container);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  setupScaling(container) {
    Object.assign(document.documentElement.style, { overflow: 'hidden' });
    Object.assign(document.body.style, { overflow: 'hidden' });

    const applyScale = () => {
      const { clientWidth: w, clientHeight: h } = document.documentElement;
      const { BASE_WIDTH: bw, BASE_HEIGHT: bh } = this.config;
      const scale = Math.min(w / bw, h / bh);

      Object.assign(container.style, {
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        marginLeft: `${(w - bw * scale) / 2}px`,
        marginTop: `${(h - bh * scale) / 2}px`,
        width: `${bw}px`,
        height: `${bh}px`
      });
    };

    applyScale();

    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(applyScale, this.config.RESIZE_DELAY);
    });

    console.log('页面自适应缩放已启用');
  }
}

// ============================================================================
// 广告拦截器类
// ============================================================================
class AdBlocker {
  constructor(selectors = []) {
    this.selectors = new Set(selectors);
    this.frameId = null;
    this.observer = null;
    this.init();
  }

  hideAds = () => {
    if (!this.selectors.size) return;

    try {
      document.querySelectorAll(Array.from(this.selectors).join(',')).forEach(el => {
        if (el.style.display !== 'none') {
          el.style.display = 'none';
          console.log('已拦截广告元素:', el);
        }
      });
    } catch (err) {
      console.error('广告拦截器错误:', err);
    }
  };

  debounceHide = () => {
    cancelAnimationFrame(this.frameId);
    this.frameId = requestAnimationFrame(this.hideAds);
  };

  init() {
    this.debounceHide();
    this.observer = new MutationObserver(this.debounceHide);
    this.observer.observe(document.body, { childList: true, subtree: true });
    console.log('广告拦截器已初始化');
  }

  add(selector) {
    if (selector && !this.selectors.has(selector)) {
      this.selectors.add(selector);
      console.log(`已添加广告选择器: ${selector}`);
      this.debounceHide();
    }
  }

  remove(selector) {
    if (this.selectors.delete(selector)) {
      console.log(`已移除广告选择器: ${selector}`);
    }
  }
}

// ============================================================================
// 初始化预加载脚本
// ============================================================================
try {
  window.addEventListener('DOMContentLoaded', () => {
    hideBrowserFingerprint();
    const scaler = new PageScaler(CONFIG.SCALE);
    const blocker = new AdBlocker(CONFIG.AD_SELECTORS);

    contextBridge.exposeInMainWorld('electronAPI', {
      addAdSelector: selector => {
        if (typeof selector === 'string' && selector) {
          blocker.add(selector);
        }
      },
      refreshAds: () => blocker.debounceHide()
    });
  });
} catch (error) {
  console.error('预加载脚本错误:', error);
}
