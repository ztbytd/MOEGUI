// 文件拖放管理模块

class FileDropManager {
  constructor(container, model = null) {
    this.container = container;
    this.model = model;
    this.isDragOver = false;
    this.onFileDropCallback = null;

    this.init();
  }

  /**
   * 设置 Live2D 模型引用
   */
  setModel(model) {
    this.model = model;
  }

  /**
   * 初始化拖放事件监听
   */
  init() {
    // 阻止整个文档的默认拖放行为
    document.addEventListener('dragover', this.preventDefaults.bind(this));
    document.addEventListener('drop', this.preventDefaults.bind(this));

    // 监听容器的拖放事件
    this.container.addEventListener('dragenter', this.onDragEnter.bind(this));
    this.container.addEventListener('dragover', this.onDragOver.bind(this));
    this.container.addEventListener('dragleave', this.onDragLeave.bind(this));
    this.container.addEventListener('drop', this.onDrop.bind(this));

    console.log('文件拖放管理器已初始化');
  }

  /**
   * 阻止默认行为
   */
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * 拖入进入
   */
  onDragEnter(e) {
    this.preventDefaults(e);

    if (!this.isDragOver) {
      this.isDragOver = true;
      this.showDragOverEffect();
      console.log('文件拖入区域');
    }
  }

  /**
   * 拖入悬停
   */
  onDragOver(e) {
    this.preventDefaults(e);
    e.dataTransfer.dropEffect = 'copy'; // 显示复制图标
  }

  /**
   * 拖入离开
   */
  onDragLeave(e) {
    this.preventDefaults(e);

    // 检查是否真正离开容器
    if (e.target === this.container) {
      this.isDragOver = false;
      this.hideDragOverEffect();
      console.log('文件离开区域');
    }
  }

  /**
   * 文件放下
   */
  onDrop(e) {
    this.preventDefaults(e);

    this.isDragOver = false;
    this.hideDragOverEffect();

    // 获取拖放的文件
    const files = Array.from(e.dataTransfer.files);

    if (files.length > 0) {
      console.log('接收到文件:', files);
      this.handleFiles(files);
    }
  }

  /**
   * 处理拖入的文件
   */
  async handleFiles(files) {
    // 播放"吃东西"动画
    this.playEatAnimation();

    // 提取文件信息
    const fileInfos = files.map(file => ({
      name: file.name,
      path: file.path, // Electron 特有属性
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }));

    console.log('文件信息:', fileInfos);

    try {
      // 显示提示
      this.showProcessingMessage('AI 正在分析文件...');

      // 调用 AI 整理
      if (window.electronAPI && window.electronAPI.aiOrganizeFiles) {
        const result = await window.electronAPI.aiOrganizeFiles(fileInfos);

        if (result.success) {
          console.log('整理成功:', result);

          // 显示成功消息
          this.showSuccessMessage(result.summary || '整理完成！');

          // 播放完成动画
          this.playCompleteAnimation();
        } else {
          console.error('整理失败:', result.message);
          this.showErrorMessage(result.message || '整理失败，请检查 AI 设置');
        }
      } else {
        // 降级处理：只记录文件
        if (window.electronAPI && window.electronAPI.handleFileDrop) {
          await window.electronAPI.handleFileDrop(fileInfos);
        }
        this.showErrorMessage('AI 服务未配置，请在托盘菜单中设置');
      }
    } catch (error) {
      console.error('处理文件失败:', error);
      this.showErrorMessage('处理失败: ' + error.message);
    }

    // 触发回调
    if (this.onFileDropCallback) {
      this.onFileDropCallback(fileInfos);
    }
  }

  /**
   * 显示处理中消息
   */
  showProcessingMessage(message) {
    this.showMessage(message, 'processing');
  }

  /**
   * 显示成功消息
   */
  showSuccessMessage(message) {
    this.showMessage(message, 'success');
    setTimeout(() => this.hideMessage(), 3000);
  }

  /**
   * 显示错误消息
   */
  showErrorMessage(message) {
    this.showMessage(message, 'error');
    setTimeout(() => this.hideMessage(), 5000);
  }

  /**
   * 显示消息
   */
  showMessage(message, type) {
    // 创建或更新消息元素
    let messageEl = document.getElementById('file-drop-message');

    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'file-drop-message';
      messageEl.className = 'file-drop-message';
      document.body.appendChild(messageEl);
    }

    messageEl.textContent = message;
    messageEl.className = `file-drop-message ${type}`;
    messageEl.style.display = 'block';
  }

  /**
   * 隐藏消息
   */
  hideMessage() {
    const messageEl = document.getElementById('file-drop-message');
    if (messageEl) {
      messageEl.style.display = 'none';
    }
  }

  /**
   * 显示拖入悬停效果
   */
  showDragOverEffect() {
    // 添加视觉反馈
    this.container.style.backgroundColor = 'rgba(255, 154, 158, 0.1)';
    this.container.style.border = '2px dashed #ff9a9e';

    // 精灵动画：期待状态
    if (this.model && this.model.internalModel) {
      try {
        // 尝试播放期待动作
        const motionPlayed = this.model.motion('tap_body');
        if (!motionPlayed) {
          // 如果没有 tap_body，尝试其他动作
          this.model.motion('idle');
        }
      } catch (error) {
        console.warn('播放期待动画失败:', error);
      }
    }
  }

  /**
   * 隐藏拖入悬停效果
   */
  hideDragOverEffect() {
    this.container.style.backgroundColor = 'transparent';
    this.container.style.border = 'none';
  }

  /**
   * 播放"吃东西"动画
   */
  playEatAnimation() {
    console.log('播放吃东西动画');

    if (this.model && this.model.internalModel) {
      try {
        // 尝试播放特定动作组
        const eatMotions = ['tap_body', 'shake', 'pinch_in', 'flick_head'];

        for (const motion of eatMotions) {
          const played = this.model.motion(motion);
          if (played) {
            console.log('播放动作:', motion);
            break;
          }
        }
      } catch (error) {
        console.warn('播放吃东西动画失败:', error);
      }
    }

    // 添加视觉效果
    this.container.classList.add('eating-effect');
    setTimeout(() => {
      this.container.classList.remove('eating-effect');
    }, 500);
  }

  /**
   * 播放完成动画
   */
  playCompleteAnimation() {
    console.log('播放完成动画');

    if (this.model && this.model.internalModel) {
      try {
        // 播放满足/开心的动作
        this.model.motion('idle');
      } catch (error) {
        console.warn('播放完成动画失败:', error);
      }
    }
  }

  /**
   * 设置文件放下回调
   */
  onFileDrop(callback) {
    this.onFileDropCallback = callback;
  }

  /**
   * 销毁
   */
  destroy() {
    document.removeEventListener('dragover', this.preventDefaults);
    document.removeEventListener('drop', this.preventDefaults);

    this.container.removeEventListener('dragenter', this.onDragEnter);
    this.container.removeEventListener('dragover', this.onDragOver);
    this.container.removeEventListener('dragleave', this.onDragLeave);
    this.container.removeEventListener('drop', this.onDrop);
  }
}

// 导出（兼容浏览器环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FileDropManager;
} else {
  window.FileDropManager = FileDropManager;
}
