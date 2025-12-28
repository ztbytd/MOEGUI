// 桌面文件监控模块
const chokidar = require('chokidar');
const { app } = require('electron');
const path = require('path');

class FileWatcher {
  constructor() {
    this.watcher = null;
    this.desktopPath = app.getPath('desktop');
    this.onChangeCallback = null;
    this.debounceTimers = new Map(); // 防抖计时器
    this.debounceDelay = 500; // 防抖延迟（毫秒）
  }

  /**
   * 启动监控
   */
  start() {
    console.log('开始监控桌面:', this.desktopPath);

    // 配置监控选项
    this.watcher = chokidar.watch(this.desktopPath, {
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
      persistent: true,
      depth: 0, // 只监控顶层，不递归子目录
      ignoreInitial: true, // 忽略初始添加事件
      awaitWriteFinish: {
        stabilityThreshold: 2000, // 文件稳定 2 秒后才触发
        pollInterval: 100
      }
    });

    // 监听事件
    this.watcher
      .on('add', (filePath) => {
        const filename = path.basename(filePath);
        console.log('文件已添加:', filename);
        this.notifyChange('add', filePath);
      })
      .on('unlink', (filePath) => {
        const filename = path.basename(filePath);
        console.log('文件已删除:', filename);
        this.notifyChange('unlink', filePath);
      })
      .on('change', (filePath) => {
        const filename = path.basename(filePath);
        console.log('文件已修改:', filename);
        this.notifyChange('change', filePath);
      })
      .on('addDir', (dirPath) => {
        const dirname = path.basename(dirPath);
        console.log('文件夹已添加:', dirname);
        this.notifyChange('addDir', dirPath);
      })
      .on('unlinkDir', (dirPath) => {
        const dirname = path.basename(dirPath);
        console.log('文件夹已删除:', dirname);
        this.notifyChange('unlinkDir', dirPath);
      })
      .on('error', (error) => {
        console.error('监控错误:', error);
      })
      .on('ready', () => {
        console.log('桌面监控就绪');
      });

    return this;
  }

  /**
   * 通知变化（带防抖）
   */
  notifyChange(type, filePath) {
    if (!this.onChangeCallback) return;

    // 使用文件路径作为键进行防抖
    const key = `${type}:${filePath}`;

    // 清除之前的计时器
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    // 设置新的计时器
    const timer = setTimeout(() => {
      this.onChangeCallback({
        type,
        path: filePath,
        name: path.basename(filePath),
        timestamp: Date.now()
      });
      this.debounceTimers.delete(key);
    }, this.debounceDelay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * 设置变化回调
   */
  onChange(callback) {
    this.onChangeCallback = callback;
    return this;
  }

  /**
   * 停止监控
   */
  stop() {
    // 清除所有防抖计时器
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('桌面监控已停止');
    }
  }

  /**
   * 获取当前监控的文件列表
   */
  getWatchedFiles() {
    if (this.watcher) {
      return this.watcher.getWatched();
    }
    return {};
  }
}

module.exports = FileWatcher;
