// 渲染进程主脚本
console.log('MoeGui renderer loaded');

// 初始化 Live2D
let loader = null;
let interactionManager = null;
let fileDropManager = null;

async function initLive2D() {
  const loadingEl = document.getElementById('loading');

  try {
    // 检查必要的库是否加载
    console.log('0. 检查必要的库...');

    if (!window.PIXI) {
      throw new Error('PixiJS 未加载');
    }
    console.log('✓ PixiJS 已加载，版本:', window.PIXI.VERSION);

    if (!window.Live2D) {
      throw new Error('Live2D Cubism 2 Runtime 未加载');
    }
    console.log('✓ Live2D Runtime 已加载');

    if (!window.PIXI.live2d) {
      throw new Error('pixi-live2d-display 未加载或未正确初始化');
    }
    console.log('✓ pixi-live2d-display 已加载');

    if (!window.PIXI.live2d.Live2DModel) {
      throw new Error('Live2DModel 类未找到');
    }
    console.log('✓ Live2DModel 类已就绪');

    // 创建加载器实例
    console.log('1. 创建 Live2D 加载器...');
    loader = new window.Live2DLoader(document.getElementById('app'));

    // 初始化 PixiJS
    console.log('2. 初始化 PixiJS...');
    await loader.init();
    console.log('✓ PixiJS 初始化完成');

    // 加载 Live2D 模型
    console.log('3. 加载 Live2D 模型...');
    const modelUrl = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json';

    await loader.loadModel(modelUrl);
    console.log('✓ Live2D 模型加载完成');

    // 隐藏加载提示
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }

    // 启用功能
    console.log('4. 启用 Live2D 功能...');
    loader.enableMouseTracking();  // 鼠标视线追踪
    loader.startIdleMotion();      // Idle 动画循环
    loader.enableClickExpression(); // 点击触发动作
    console.log('✓ Live2D 功能已启用');

    // 初始化交互管理器（拖拽和鼠标穿透）
    console.log('5. 初始化交互管理器...');
    const canvas = document.getElementById('live2d-canvas');
    if (canvas && window.InteractionManager) {
      try {
        interactionManager = new window.InteractionManager(canvas, loader.model);
        interactionManager.enableSmartMouseThrough();
        console.log('✓ 交互管理器已初始化');
      } catch (error) {
        console.warn('交互管理器初始化失败（非致命错误）:', error);
      }
    } else {
      console.warn('InteractionManager 未找到，跳过交互功能');
    }

    // 初始化文件拖放管理器
    console.log('6. 初始化文件拖放管理器...');
    const appContainer = document.getElementById('app');
    if (appContainer && window.FileDropManager) {
      try {
        fileDropManager = new window.FileDropManager(appContainer, loader.model);

        // 设置文件拖放回调
        fileDropManager.onFileDrop((fileInfos) => {
          console.log('文件拖放完成:', fileInfos);
        });
        console.log('✓ 文件拖放管理器已初始化');
      } catch (error) {
        console.warn('文件拖放管理器初始化失败（非致命错误）:', error);
      }
    } else {
      console.warn('FileDropManager 未找到，跳过文件拖放功能');
    }

    // 监听桌面文件变化
    console.log('7. 注册桌面文件监控...');
    if (window.electronAPI && window.electronAPI.onDesktopFileChange) {
      window.electronAPI.onDesktopFileChange((event) => {
        console.log('检测到桌面文件变化:', event);

        switch (event.type) {
          case 'add':
            console.log('新文件添加:', event.name);
            break;
          case 'unlink':
            console.log('文件被删除:', event.name);
            break;
          case 'addDir':
            console.log('新文件夹添加:', event.name);
            break;
        }
      });
      console.log('✓ 桌面文件监控已注册');
    }

    // 应用初始缩放设置
    console.log('8. 应用初始缩放设置...');
    applyInitialScale();

    console.log('✅ Live2D 精灵初始化完成！');
  } catch (error) {
    console.error('❌ Live2D 初始化失败:', error);
    console.error('错误堆栈:', error.stack);

    // 显示详细错误信息
    if (loadingEl) {
      let errorMsg = '模型加载失败';

      if (error.message.includes('Canvas') || error.message.includes('live2d-canvas')) {
        errorMsg = '画布初始化失败<br>请刷新页面重试';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMsg = '网络连接失败<br>请检查网络设置';
      } else if (error.message.includes('PIXI')) {
        errorMsg = 'PixiJS 加载失败<br>请刷新页面重试';
      } else if (error.message.includes('timeout') || error.message.includes('超时')) {
        errorMsg = '加载超时<br>请检查网络后重试';
      }

      loadingEl.innerHTML = `<div class="loading-text error">${errorMsg}</div>`;
      loadingEl.style.display = 'flex';
    }
  }
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', async () => {
  // 等待一小段时间，确保所有库都已加载
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('DOM 加载完成，准备初始化 Live2D...');
  console.log('可用的全局对象:', {
    PIXI: !!window.PIXI,
    'PIXI.live2d': !!(window.PIXI && window.PIXI.live2d),
    Live2D: !!window.Live2D,
    Live2DLoader: !!window.Live2DLoader,
    InteractionManager: !!window.InteractionManager,
    FileDropManager: !!window.FileDropManager
  });

  initLive2D();
});

// 应用初始缩放
async function applyInitialScale() {
  try {
    if (window.electronAPI && window.electronAPI.getSettings) {
      const settings = await window.electronAPI.getSettings();
      if (settings.spriteScale) {
        updateSpriteScale(settings.spriteScale);
      }
    }
  } catch (error) {
    console.error('应用初始缩放失败:', error);
  }
}

// 更新精灵缩放
function updateSpriteScale(scale) {
  const app = document.getElementById('app');
  if (app) {
    const scaleValue = scale / 100;
    app.style.transform = `scale(${scaleValue})`;
    app.style.transformOrigin = 'center center';
    console.log(`精灵缩放已更新为: ${scale}%`);
  }
}

// 监听精灵缩放更新（来自设置面板）
if (window.electronAPI) {
  // 注意：需要在 preload 中添加对此事件的监听
  try {
    const { ipcRenderer } = require('electron');
    ipcRenderer.on('update-sprite-scale', (event, scale) => {
      updateSpriteScale(scale);
    });
  } catch (error) {
    // 如果在渲染进程中无法访问 ipcRenderer，忽略
    console.log('无法监听缩放更新事件');
  }
}

// 清理资源
window.addEventListener('beforeunload', () => {
  if (loader) {
    loader.destroy();
  }
  if (interactionManager) {
    interactionManager.destroy();
  }
  if (fileDropManager) {
    fileDropManager.destroy();
  }
});
