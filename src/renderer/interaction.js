// 交互管理模块 - 处理拖拽和鼠标穿透

class InteractionManager {
  constructor(canvas, model = null) {
    this.canvas = canvas;
    this.model = model; // Live2D 模型引用
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.lastMousePos = { x: 0, y: 0 };
    this.isOverSprite = false;
    this.hasMoved = false; // 是否移动过（区分点击和拖拽）
    this.lastClickTime = 0; // 用于检测双击

    this.init();
  }

  /**
   * 设置 Live2D 模型引用
   */
  setModel(model) {
    this.model = model;
  }

  init() {
    // 监听鼠标移动
    document.addEventListener('mousemove', this.onMouseMove.bind(this));

    // 监听鼠标按下（开始拖拽）
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));

    // 监听鼠标释放（结束拖拽）
    document.addEventListener('mouseup', this.onMouseUp.bind(this));

    console.log('交互管理器已初始化');
  }

  /**
   * 鼠标移动事件
   */
  onMouseMove(event) {
    this.lastMousePos = { x: event.clientX, y: event.clientY };

    // 如果正在拖拽
    if (this.isDragging) {
      const deltaX = event.screenX - this.dragStart.x;
      const deltaY = event.screenY - this.dragStart.y;

      // 只有移动超过 3 像素才算真正的拖拽
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        this.hasMoved = true;

        // 通过 Electron API 移动窗口
        if (window.electronAPI) {
          window.electronAPI.moveWindow(deltaX, deltaY);
        }

        this.dragStart = { x: event.screenX, y: event.screenY };
      }
    }
  }

  /**
   * 鼠标按下事件 - 开始拖拽
   */
  onMouseDown(event) {
    // 检查是否在 canvas 上
    if (event.target === this.canvas) {
      // 检查是否点击在精灵上（通过透明度检测）
      const isOnSprite = this.checkSpriteHit(event.offsetX, event.offsetY);

      if (isOnSprite) {
        this.isDragging = true;
        this.hasMoved = false; // 重置移动标志
        this.dragStart = { x: event.screenX, y: event.screenY };

        // 改变鼠标样式
        document.body.style.cursor = 'grabbing';

        console.log('按下精灵');
      }
    }
  }

  /**
   * 鼠标释放事件 - 结束拖拽
   */
  onMouseUp() {
    if (this.isDragging) {
      // 判断是点击还是拖拽
      if (!this.hasMoved) {
        // 是点击 - 触发精灵动画
        this.onSpriteClick();
        console.log('点击精灵');
      } else {
        // 是拖拽 - 保存窗口位置
        if (window.electronAPI) {
          window.electronAPI.getWindowPosition().then((pos) => {
            if (pos) {
              window.electronAPI.saveWindowPosition(pos.x, pos.y);
            }
          });
        }
        console.log('拖拽结束');
      }

      this.isDragging = false;
      document.body.style.cursor = 'default';
    }
  }

  /**
   * 精灵点击事件 - 触发动画或打开对话
   */
  onSpriteClick() {
    // 检测双击
    const now = Date.now();
    if (this.lastClickTime && now - this.lastClickTime < 300) {
      // 双击 - 打开对话窗口
      this.openChatWindow();
      this.lastClickTime = 0;
      return;
    }

    this.lastClickTime = now;

    // 单击 - 播放动画
    if (!this.model) {
      console.warn('模型未设置，无法触发动画');
      return;
    }

    try {
      // 尝试播放随机动作
      if (this.model.internalModel && this.model.internalModel.motionManager) {
        const groups = this.model.internalModel.motionManager.definitions;
        if (groups && Object.keys(groups).length > 0) {
          // 获取所有动作组
          const groupNames = Object.keys(groups);
          // 随机选择一个动作组
          const randomGroup = groupNames[Math.floor(Math.random() * groupNames.length)];
          // 播放动作
          this.model.motion(randomGroup);
          console.log('播放动作:', randomGroup);
        }
      }
    } catch (error) {
      console.error('播放动画失败:', error);
    }
  }

  /**
   * 打开对话窗口
   */
  openChatWindow() {
    console.log('打开对话窗口');

    if (window.electronAPI && window.electronAPI.openChat) {
      window.electronAPI.openChat();
    }
  }

  /**
   * 检查点击位置是否在精灵上
   * 使用模型的边界框进行碰撞检测
   */
  checkSpriteHit(x, y) {
    // 如果没有模型，允许拖拽整个窗口
    if (!this.model) {
      return true;
    }

    try {
      // 获取 canvas 的边界矩形
      const rect = this.canvas.getBoundingClientRect();

      // 将 canvas 坐标转换为世界坐标
      const canvasX = x;
      const canvasY = y;

      // 使用模型的边界框进行简单检测
      if (this.model.getBounds) {
        const bounds = this.model.getBounds();

        // 检查点是否在边界框内
        const isInBounds = canvasX >= bounds.x &&
                          canvasX <= bounds.x + bounds.width &&
                          canvasY >= bounds.y &&
                          canvasY <= bounds.y + bounds.height;

        return isInBounds;
      }

      // 如果无法获取边界框，使用简单的中心距离检测
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const distance = Math.sqrt(
        Math.pow(canvasX - centerX, 2) +
        Math.pow(canvasY - centerY, 2)
      );

      // 假设精灵在中心，半径为窗口较小边的 40%
      const radius = Math.min(this.canvas.width, this.canvas.height) * 0.4;

      return distance < radius;
    } catch (error) {
      console.error('碰撞检测失败:', error);
      // 出错时允许拖拽
      return true;
    }
  }

  /**
   * 设置鼠标穿透状态
   * @param {boolean} shouldIgnore - 是否忽略鼠标事件
   */
  setMouseThrough(shouldIgnore) {
    if (window.electronAPI) {
      window.electronAPI.setMouseThrough(shouldIgnore);
    }
  }

  /**
   * 启用智能鼠标穿透
   * 透明区域穿透，精灵区域可交互
   */
  enableSmartMouseThrough() {
    // 使用节流，避免过于频繁的检测
    let lastCheck = 0;
    const throttleMs = 50;

    const checkAndSetThrough = () => {
      const now = Date.now();
      if (now - lastCheck < throttleMs) return;
      lastCheck = now;

      // 正在拖拽时不改变穿透状态
      if (this.isDragging) {
        return;
      }

      const rect = this.canvas.getBoundingClientRect();
      const x = this.lastMousePos.x - rect.left;
      const y = this.lastMousePos.y - rect.top;

      // 检查是否在 canvas 范围内
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        // 鼠标在窗口外，允许穿透
        if (this.isOverSprite) {
          this.setMouseThrough(true);
          this.isOverSprite = false;
          document.body.style.cursor = 'default';
        }
        return;
      }

      // 检查是否在精灵上
      const isOnSprite = this.checkSpriteHit(x, y);

      if (isOnSprite !== this.isOverSprite) {
        this.isOverSprite = isOnSprite;
        this.setMouseThrough(!isOnSprite);

        // 改变鼠标样式
        document.body.style.cursor = isOnSprite ? 'grab' : 'default';

        console.log('鼠标', isOnSprite ? '在精灵上' : '不在精灵上');
      }
    };

    // 定时检查
    setInterval(checkAndSetThrough, throttleMs);

    console.log('智能鼠标穿透已启用');
  }

  /**
   * 销毁
   */
  destroy() {
    document.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}

// 导出（兼容浏览器环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InteractionManager;
} else {
  window.InteractionManager = InteractionManager;
}
