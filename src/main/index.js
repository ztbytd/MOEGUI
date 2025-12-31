const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const FileWatcher = require('./file-watcher');
const AIService = require('./ai-service');

let mainWindow = null;
let tray = null;
let fileWatcher = null;
let settingsWindow = null;
let chatWindow = null;
let aiService = null;

// 配置文件路径
const configPath = path.join(app.getPath('userData'), 'config.json');

// 读取配置
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('读取配置失败:', error);
  }
  return {};
}

// 保存配置
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('保存配置失败:', error);
  }
}

function createWindow() {
  // 创建透明无边框窗口
  mainWindow = new BrowserWindow({
    width: 300,
    height: 400,
    transparent: true,        // 透明背景
    frame: false,             // 无边框
    alwaysOnTop: true,        // 置顶显示
    skipTaskbar: true,        // 不在任务栏显示
    resizable: false,         // 禁止调整大小
    hasShadow: false,         // 无阴影
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js')
    }
  });

  // 加载渲染页面
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 设置窗口位置（每次启动都使用默认位置：右下角）
  const { screen } = require('electron');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow.setPosition(width - 350, height - 450);

  // 开发模式下打开开发者工具
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 700,
    height: 600,
    parent: mainWindow,
    modal: false,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js')
    }
  });

  settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'));

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createChatWindow() {
  if (chatWindow) {
    chatWindow.focus();
    return;
  }

  chatWindow = new BrowserWindow({
    width: 750,  // 增加宽度
    height: 700,  // 稍微增加高度
    show: false,
    resizable: true,
    minimizable: true,
    maximizable: true,
    autoHideMenuBar: true,  // 隐藏菜单栏
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js')
    }
  });

  chatWindow.loadFile(path.join(__dirname, '../renderer/chat.html'));

  // 设置窗口位置（屏幕居中）
  chatWindow.center();

  chatWindow.once('ready-to-show', () => {
    chatWindow.show();
  });

  chatWindow.on('closed', () => {
    chatWindow = null;
  });
}

function createTray() {
  // 创建托盘图标
  // 由于没有 PNG 图标，我们使用代码生成一个简单的图标
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4); // RGBA

  // 绘制一个粉色圆形图标
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const cx = size / 2, cy = size / 2, r = size / 2 - 1;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      if (dist <= r) {
        canvas[idx] = 255;     // R
        canvas[idx + 1] = 154; // G
        canvas[idx + 2] = 158; // B
        canvas[idx + 3] = 255; // A
      } else {
        canvas[idx + 3] = 0;   // 透明
      }
    }
  }

  const icon = nativeImage.createFromBuffer(canvas, { width: size, height: size });
  tray = new Tray(icon);

  // 托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
          }
        }
      }
    },
    {
      label: 'AI 设置',
      click: () => {
        createSettingsWindow();
      }
    },
    {
      label: '开发者工具',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.openDevTools({ mode: 'detach' });
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('MoeGui 桌面精灵');
  tray.setContextMenu(contextMenu);

  // 点击托盘图标显示/隐藏窗口
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });
}

// 应用准备就绪
app.whenReady().then(() => {
  createWindow();
  createTray();

  // 每次启动清空对话历史，让每次都是全新开始
  const config = loadConfig();
  config.chatHistory = [];
  config.windowPosition = null; // 也清除保存的窗口位置
  saveConfig(config);

  // 初始化 AI 服务
  aiService = new AIService({
    apiBaseUrl: config.apiBaseUrl || 'https://action.h7ml.cn',
    apiKey: config.apiKey || '',
    model: config.apiModel || 'gemini-3-flash-preview'
  });

  // 设置开机自启动
  if (config.autoStart !== false) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: false
    });
  }

  // 启动文件监控（可选功能，可通过配置开关）
  if (config.enableFileWatcher !== false) { // 默认启用
    try {
      fileWatcher = new FileWatcher();
      fileWatcher
        .onChange((event) => {
          console.log('桌面文件变化:', event);
          // 通知渲染进程
          if (mainWindow) {
            mainWindow.webContents.send('desktop-file-change', event);
          }
        })
        .start();
    } catch (error) {
      console.error('启动文件监控失败:', error);
      console.log('提示: 需要安装 chokidar 依赖 (npm install chokidar)');
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时的处理
app.on('window-all-closed', () => {
  // macOS 上保持应用运行
  if (process.platform !== 'darwin') {
    // 不退出，保持托盘运行
    // app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  console.log('应用退出中...');

  // 停止文件监控
  if (fileWatcher) {
    fileWatcher.stop();
  }
});

// 防止多实例
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.show();
    }
  });
}

// ==================== IPC 通信 ====================

// 设置鼠标穿透
ipcMain.on('set-mouse-through', (event, ignore) => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

// 移动窗口
ipcMain.on('move-window', (event, { deltaX, deltaY }) => {
  if (mainWindow) {
    const pos = mainWindow.getPosition();
    mainWindow.setPosition(pos[0] + deltaX, pos[1] + deltaY);
  }
});

// 保存窗口位置
ipcMain.on('save-window-position', (event, position) => {
  const config = loadConfig();
  config.windowPosition = position;
  saveConfig(config);
});

// 获取窗口位置
ipcMain.handle('get-window-position', () => {
  if (mainWindow) {
    const position = mainWindow.getPosition();
    return { x: position[0], y: position[1] };
  }
  return null;
});

// 处理文件拖放
ipcMain.handle('handle-file-drop', async (event, fileInfos) => {
  console.log('接收到拖放文件:', fileInfos);

  try {
    // 这里暂时只记录文件信息
    // 后续阶段会添加 AI 分类逻辑
    const result = {
      success: true,
      message: `接收到 ${fileInfos.length} 个文件`,
      files: fileInfos
    };

    // 保存到配置（可选）
    const config = loadConfig();
    if (!config.droppedFiles) {
      config.droppedFiles = [];
    }
    config.droppedFiles.push({
      timestamp: Date.now(),
      files: fileInfos
    });
    saveConfig(config);

    return result;
  } catch (error) {
    console.error('处理文件拖放失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
});

// 获取桌面路径
ipcMain.handle('get-desktop-path', () => {
  return app.getPath('desktop');
});

// 读取桌面文件列表
ipcMain.handle('read-desktop-files', async () => {
  try {
    const desktopPath = app.getPath('desktop');
    const files = fs.readdirSync(desktopPath);

    // 获取文件详细信息
    const fileInfos = files.map(filename => {
      const filePath = path.join(desktopPath, filename);
      try {
        const stats = fs.statSync(filePath);
        return {
          name: filename,
          path: filePath,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      } catch (error) {
        console.warn(`读取文件信息失败: ${filename}`, error);
        return null;
      }
    }).filter(Boolean); // 过滤掉 null

    return {
      success: true,
      path: desktopPath,
      files: fileInfos
    };
  } catch (error) {
    console.error('读取桌面文件失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
});

// 获取设置
ipcMain.handle('get-settings', () => {
  const config = loadConfig();
  return {
    apiModel: config.apiModel || 'gemini-3-flash-preview',
    apiBaseUrl: config.apiBaseUrl || 'https://action.h7ml.cn',
    apiKey: config.apiKey || ''
  };
});

// 保存设置
ipcMain.handle('save-settings', (event, settings) => {
  const config = loadConfig();
  config.apiModel = settings.apiModel;
  config.apiBaseUrl = settings.apiBaseUrl;
  config.apiKey = settings.apiKey;
  config.autoStart = settings.autoStart;
  config.enableFileWatcher = settings.enableFileWatcher;
  config.spriteScale = settings.spriteScale;
  saveConfig(config);

  // 更新 AI 服务配置
  if (aiService) {
    aiService.updateConfig(settings);
  }

  // 更新开机自启动
  app.setLoginItemSettings({
    openAtLogin: settings.autoStart === true,
    openAsHidden: false
  });

  // 通知主窗口更新精灵大小
  if (mainWindow && settings.spriteScale) {
    mainWindow.webContents.send('update-sprite-scale', settings.spriteScale);
  }

  return { success: true };
});

// 关闭设置窗口
ipcMain.on('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

// AI 分析文件并整理
ipcMain.handle('ai-organize-files', async (event, fileInfos) => {
  try {
    if (!aiService) {
      throw new Error('AI 服务未初始化');
    }

    console.log('开始 AI 分析文件...');

    // 调用 AI 分析
    const classification = await aiService.analyzeFiles(fileInfos);

    console.log('AI 分类结果:', classification);

    // 执行文件整理
    const desktopPath = app.getPath('desktop');
    const results = [];

    for (const folder of classification.folders) {
      const folderPath = path.join(desktopPath, folder.name);

      // 创建文件夹（如果不存在）
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log('创建文件夹:', folder.name);
      }

      // 移动文件
      for (const fileName of folder.files) {
        const fileInfo = fileInfos.find(f => f.name === fileName);
        if (!fileInfo) continue;

        const sourcePath = fileInfo.path;
        const targetPath = path.join(folderPath, fileName);

        try {
          // 检查源文件是否存在
          if (fs.existsSync(sourcePath)) {
            fs.renameSync(sourcePath, targetPath);
            console.log(`移动文件: ${fileName} -> ${folder.name}/`);
            results.push({
              file: fileName,
              folder: folder.name,
              success: true
            });
          }
        } catch (error) {
          console.error(`移动文件失败: ${fileName}`, error);
          results.push({
            file: fileName,
            folder: folder.name,
            success: false,
            error: error.message
          });
        }
      }
    }

    return {
      success: true,
      classification: classification,
      results: results,
      summary: classification.summary || `整理完成：创建了 ${classification.folders.length} 个文件夹`
    };
  } catch (error) {
    console.error('AI 整理失败:', error);
    return {
      success: false,
      message: error.message || '整理失败'
    };
  }
});

// 打开对话窗口
ipcMain.on('open-chat', () => {
  createChatWindow();
});

// 关闭对话窗口
ipcMain.on('close-chat', () => {
  if (chatWindow) {
    chatWindow.close();
  }
});

// AI 对话
ipcMain.handle('chat-with-ai', async (event, message) => {
  try {
    if (!aiService) {
      throw new Error('AI 服务未初始化');
    }

    console.log('用户消息:', message);

    // 获取桌面文件作为上下文
    const desktopPath = app.getPath('desktop');
    let desktopFiles = [];

    try {
      const files = fs.readdirSync(desktopPath);
      desktopFiles = files.map(filename => {
        const filePath = path.join(desktopPath, filename);
        try {
          const stats = fs.statSync(filePath);
          return {
            name: filename,
            path: filePath,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
            size: stats.size
          };
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      console.warn('读取桌面文件失败:', error);
    }

    // 调用 AI 对话
    const response = await aiService.chat(message, {
      desktopFiles: desktopFiles.filter(f => f.isFile)
    });

    console.log('AI 响应:', response);

    return {
      success: true,
      message: response.message,
      action: response.action || null
    };
  } catch (error) {
    console.error('AI 对话失败:', error);
    return {
      success: false,
      message: '抱歉，我遇到了一些问题: ' + error.message
    };
  }
});

// 获取对话历史
ipcMain.handle('get-chat-history', () => {
  const config = loadConfig();
  return config.chatHistory || [];
});

// 保存对话历史
ipcMain.handle('save-chat-history', (event, history) => {
  const config = loadConfig();
  config.chatHistory = history;
  saveConfig(config);
  return { success: true };
});
