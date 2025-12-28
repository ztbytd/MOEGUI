// Live2D 加载器模块
// 使用全局 PIXI 对象（从 script 标签引入）

// 启用 Live2D 日志（调试用）
if (window.PIXI && window.PIXI.live2d) {
  window.PIXI.live2d.config.logLevel = window.PIXI.live2d.LOG_LEVEL_VERBOSE;
}

class Live2DLoader {
  constructor(container) {
    this.container = container;
    this.app = null;
    this.model = null;
    this.mouseTrackingHandler = null;
    this.idleMotionInterval = null;
    this.isDestroyed = false;
  }

  /**
   * 初始化 PixiJS 应用
   */
  async init() {
    if (this.isDestroyed) {
      throw new Error('Loader 已被销毁');
    }

    try {
      const canvas = document.getElementById('live2d-canvas');
      if (!canvas) {
        throw new Error('找不到 live2d-canvas 元素');
      }

      if (!window.PIXI) {
        throw new Error('PixiJS 未加载');
      }

      // 创建 PixiJS 应用
      this.app = new window.PIXI.Application({
        view: canvas,
        transparent: true,
        width: 300,
        height: 400,
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      console.log('PixiJS 应用已初始化');
    } catch (error) {
      console.error('PixiJS 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 加载 Live2D 模型
   * @param {string} modelUrl - 模型文件路径或 URL
   */
  async loadModel(modelUrl, retries = 2) {
    if (this.isDestroyed) {
      throw new Error('Loader 已被销毁');
    }

    if (!this.app) {
      throw new Error('PixiJS 应用未初始化');
    }

    if (!window.PIXI || !window.PIXI.live2d) {
      throw new Error('pixi-live2d-display 未加载');
    }

    let lastError = null;

    // 重试逻辑
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`重试加载模型 (${attempt}/${retries + 1})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }

        console.log('开始加载 Live2D 模型:', modelUrl);

        // 加载模型（带超时）
        this.model = await Promise.race([
          window.PIXI.live2d.Live2DModel.from(modelUrl),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('模型加载超时')), 30000)
          )
        ]);

        if (!this.model) {
          throw new Error('模型加载失败');
        }

        // 设置模型位置和缩放
        this.model.anchor.set(0.5, 0.5);
        this.model.position.set(this.app.screen.width / 2, this.app.screen.height / 2);

        // 自动缩放以适应窗口
        const scale = Math.min(
          this.app.screen.width / this.model.width,
          this.app.screen.height / this.model.height
        ) * 0.8;
        this.model.scale.set(scale);

        // 添加到舞台
        this.app.stage.addChild(this.model);

        console.log('Live2D 模型加载成功');
        return this.model;
      } catch (error) {
        lastError = error;
        console.error(`Live2D 模型加载失败 (尝试 ${attempt}/${retries + 1}):`, error);

        if (attempt === retries + 1) {
          break;
        }
      }
    }

    throw lastError;
  }

  /**
   * 播放随机动作
   */
  playRandomMotion() {
    if (this.isDestroyed) return;

    try {
      if (this.model && this.model.internalModel && this.model.internalModel.motionManager) {
        const group = this.model.internalModel.motionManager.definitions;
        if (group && Object.keys(group).length > 0) {
          // 获取第一个动作组
          const groupName = Object.keys(group)[0];
          this.model.motion(groupName);
          console.log('播放动作:', groupName);
        }
      }
    } catch (error) {
      console.error('播放动作失败:', error);
    }
  }

  /**
   * 启用鼠标视线追踪
   */
  enableMouseTracking() {
    if (this.isDestroyed || !this.model) return;

    // 移除旧的监听器（如果存在）
    if (this.mouseTrackingHandler) {
      window.removeEventListener('mousemove', this.mouseTrackingHandler);
    }

    this.mouseTrackingHandler = (event) => {
      if (this.isDestroyed || !this.model || !this.app) return;

      try {
        const rect = this.app.view.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        // 转换为 Live2D 坐标系 (-1 到 1)
        const targetX = (x - 0.5) * 2;
        const targetY = (y - 0.5) * 2;

        if (this.model.internalModel && this.model.internalModel.coreModel) {
          this.model.internalModel.coreModel.addParameterValueById(
            'ParamAngleX',
            targetX * 30
          );
          this.model.internalModel.coreModel.addParameterValueById(
            'ParamAngleY',
            -targetY * 30
          );
          this.model.internalModel.coreModel.addParameterValueById(
            'ParamBodyAngleX',
            targetX * 10
          );
        }
      } catch (error) {
        console.error('鼠标追踪更新失败:', error);
      }
    };

    window.addEventListener('mousemove', this.mouseTrackingHandler);
    console.log('鼠标视线追踪已启用');
  }

  /**
   * 设置 Idle 动画循环
   */
  startIdleMotion() {
    if (this.isDestroyed || !this.model) return;

    // 清除旧的定时器（如果存在）
    if (this.idleMotionInterval) {
      clearInterval(this.idleMotionInterval);
    }

    // 每隔一段时间播放一次 Idle 动作
    this.idleMotionInterval = setInterval(() => {
      if (this.isDestroyed || !this.model) {
        if (this.idleMotionInterval) {
          clearInterval(this.idleMotionInterval);
          this.idleMotionInterval = null;
        }
        return;
      }

      try {
        if (this.model.internalModel && this.model.internalModel.motionManager) {
          // 尝试播放 idle 动作组
          const hasIdleMotion = this.model.motion('idle');
          if (!hasIdleMotion) {
            // 如果没有 idle 组，播放随机动作
            this.playRandomMotion();
          }
        }
      } catch (error) {
        console.error('Idle 动画播放失败:', error);
      }
    }, 10000); // 每 10 秒播放一次

    console.log('Idle 动画循环已启动');
  }

  /**
   * 点击模型触发表情
   */
  enableClickExpression() {
    if (!this.model) return;

    this.model.on('hit', (hitAreas) => {
      console.log('点击了模型区域:', hitAreas);

      // 播放随机表情
      if (this.model.internalModel.motionManager) {
        this.playRandomMotion();
      }
    });

    console.log('点击表情已启用');
  }

  /**
   * 销毁实例（清理所有资源）
   */
  destroy() {
    if (this.isDestroyed) {
      console.warn('Loader 已经被销毁');
      return;
    }

    console.log('开始销毁 Live2DLoader...');
    this.isDestroyed = true;

    try {
      // 清除 Idle 动画定时器
      if (this.idleMotionInterval) {
        clearInterval(this.idleMotionInterval);
        this.idleMotionInterval = null;
      }

      // 移除鼠标追踪监听器
      if (this.mouseTrackingHandler) {
        window.removeEventListener('mousemove', this.mouseTrackingHandler);
        this.mouseTrackingHandler = null;
      }

      // 销毁 PixiJS 应用和模型
      if (this.app) {
        try {
          this.app.destroy(true, {
            children: true,
            texture: true,
            baseTexture: true
          });
        } catch (error) {
          console.error('销毁 PixiJS 应用失败:', error);
        }
        this.app = null;
      }

      this.model = null;
      console.log('Live2DLoader 已销毁');
    } catch (error) {
      console.error('销毁过程中出错:', error);
    }
  }
}

// 导出到全局（兼容浏览器环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Live2DLoader;
} else {
  window.Live2DLoader = Live2DLoader;
}
