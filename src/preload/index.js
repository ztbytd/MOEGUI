// 预加载脚本
// 安全地暴露 IPC 通信接口给渲染进程

const { contextBridge, ipcRenderer } = require('electron');

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 设置鼠标穿透
  setMouseThrough: (ignore) => {
    ipcRenderer.send('set-mouse-through', ignore);
  },

  // 移动窗口
  moveWindow: (deltaX, deltaY) => {
    ipcRenderer.send('move-window', { deltaX, deltaY });
  },

  // 保存窗口位置
  saveWindowPosition: (x, y) => {
    ipcRenderer.send('save-window-position', { x, y });
  },

  // 获取窗口位置
  getWindowPosition: () => {
    return ipcRenderer.invoke('get-window-position');
  },

  // 处理文件拖放
  handleFileDrop: (fileInfos) => {
    return ipcRenderer.invoke('handle-file-drop', fileInfos);
  },

  // 获取桌面路径
  getDesktopPath: () => {
    return ipcRenderer.invoke('get-desktop-path');
  },

  // 读取桌面文件列表
  readDesktopFiles: () => {
    return ipcRenderer.invoke('read-desktop-files');
  },

  // 监听桌面文件变化
  onDesktopFileChange: (callback) => {
    ipcRenderer.on('desktop-file-change', (event, data) => {
      callback(data);
    });
  },

  // 获取设置
  getSettings: () => {
    return ipcRenderer.invoke('get-settings');
  },

  // 保存设置
  saveSettings: (settings) => {
    return ipcRenderer.invoke('save-settings', settings);
  },

  // 关闭设置窗口
  closeSettings: () => {
    ipcRenderer.send('close-settings');
  },

  // AI 整理文件
  aiOrganizeFiles: (fileInfos) => {
    return ipcRenderer.invoke('ai-organize-files', fileInfos);
  },

  // 打开对话窗口
  openChat: () => {
    ipcRenderer.send('open-chat');
  },

  // 关闭对话窗口
  closeChat: () => {
    ipcRenderer.send('close-chat');
  },

  // AI 对话
  chatWithAI: (message) => {
    return ipcRenderer.invoke('chat-with-ai', message);
  },

  // 获取对话历史
  getChatHistory: () => {
    return ipcRenderer.invoke('get-chat-history');
  },

  // 保存对话历史
  saveChatHistory: (history) => {
    return ipcRenderer.invoke('save-chat-history', history);
  }
});

console.log('Preload script loaded - API exposed');
