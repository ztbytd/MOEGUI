// Live2D 加载器模块
// 使用全局 PIXI 对象（从 script 标签引入）
// 支持 Cubism 3/4 模型

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

    // 动作序列配置
    this.motionSequence = null;
    this.currentMotionIndex = 0;
    this.sequenceTimeout = null;
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
        ) * 0.9;  // 调整缩放系数：0.9 = 90% 窗口大小（让模型更大）
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
  playRandomMotion(excludeIdle = false) {
    if (this.isDestroyed) return;

    try {
      if (this.model && this.model.internalModel && this.model.internalModel.motionManager) {
        const group = this.model.internalModel.motionManager.definitions;
        if (group && Object.keys(group).length > 0) {
          // 获取所有动作组
          let groupNames = Object.keys(group);

          // 排除 Idle 动作（如果指定）
          if (excludeIdle) {
            groupNames = groupNames.filter(name => name !== 'Idle');
          }

          if (groupNames.length > 0) {
            // 随机选择一个动作组
            const randomIndex = Math.floor(Math.random() * groupNames.length);
            const groupName = groupNames[randomIndex];
            this.model.motion(groupName);
            console.log('播放动作:', groupName);
          }
        }
      }
    } catch (error) {
      console.error('播放动作失败:', error);
    }
  }

  /**
   * 设置动作序列配置
   * @param {Array} sequence - 动作序列配置数组
   * 格式: [{ motion: "Idle", duration: 5000 }, ...]
   */
  setMotionSequence(sequence) {
    if (!sequence || !Array.isArray(sequence) || sequence.length === 0) {
      console.warn('动作序列配置无效');
      return;
    }

    this.motionSequence = sequence;
    this.currentMotionIndex = 0;
    console.log('动作序列已设置:', sequence);
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
          const core = this.model.internalModel.coreModel;

          // Cubism 3/4 参数设置
          if (typeof core.setParameterValueById === 'function') {
            core.setParameterValueById('ParamAngleX', targetX * 30);
            core.setParameterValueById('ParamAngleY', -targetY * 30);
            core.setParameterValueById('ParamBodyAngleX', targetX * 10);
          }
        }
      } catch (error) {
        console.error('鼠标追踪更新失败:', error);
      }
    };

    window.addEventListener('mousemove', this.mouseTrackingHandler);
    console.log('鼠标视线追踪已启用');
  }

  /**
   * 设置动作循环（支持随机模式和序列模式）
   */
  startIdleMotion() {
    if (this.isDestroyed || !this.model) return;

    // 清除旧的定时器
    if (this.idleMotionInterval) {
      clearInterval(this.idleMotionInterval);
      this.idleMotionInterval = null;
    }
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
      this.sequenceTimeout = null;
    }

    // 如果有配置序列，使用序列模式
    if (this.motionSequence && this.motionSequence.length > 0) {
      console.log('启动动作序列模式');
      this.playMotionSequence();
    } else {
      // 否则使用随机模式
      console.log('启动随机动作模式');
      this.startRandomMotion();
    }
  }

  /**
   * 播放动作序列（按配置顺序循环）
   */
  playMotionSequence() {
    if (this.isDestroyed || !this.model || !this.motionSequence) {
      return;
    }

    // 获取当前动作配置
    const currentMotion = this.motionSequence[this.currentMotionIndex];

    if (!currentMotion) {
      console.error('动作配置无效:', this.currentMotionIndex);
      return;
    }

    console.log(`播放序列动作 [${this.currentMotionIndex + 1}/${this.motionSequence.length}]:`,
                currentMotion.motion, `持续 ${currentMotion.duration}ms`);

    try {
      // 播放动作
      const success = this.model.motion(currentMotion.motion);

      if (!success) {
        console.warn(`动作 "${currentMotion.motion}" 播放失败，可能不存在`);
      }
    } catch (error) {
      console.error('播放动作时出错:', error);
    }

    // 移动到下一个动作
    this.currentMotionIndex = (this.currentMotionIndex + 1) % this.motionSequence.length;

    // 设置下一个动作的定时器
    this.sequenceTimeout = setTimeout(() => {
      this.playMotionSequence();
    }, currentMotion.duration || 3000); // 默认3秒
  }

  /**
   * 随机动作模式（原来的逻辑）
   */
  startRandomMotion() {
    this.idleMotionInterval = setInterval(() => {
      if (this.isDestroyed || !this.model) {
        if (this.idleMotionInterval) {
          clearInterval(this.idleMotionInterval);
          this.idleMotionInterval = null;
        }
        return;
      }

      try {
        // 随机播放任意动作（包括 Idle、Tap、Flic 等）
        this.playRandomMotion(false); // false = 不排除 idle
      } catch (error) {
        console.error('随机动作播放失败:', error);
      }
    }, 10000); // 每 10 秒播放一次

    console.log('随机动作循环已启动（包含所有动作）');
  }

  /**
   * 点击模型触发动作
   */
  enableClickExpression() {
    if (!this.model) return;

    this.model.on('hit', (hitAreas) => {
      console.log('点击了模型区域:', hitAreas);

      if (!this.model.internalModel || !this.model.internalModel.motionManager) {
        return;
      }

      try {
        // Cubism 3/4 常用动作标签
        let motionPlayed = false;

        if (hitAreas.includes('head') || hitAreas.includes('Head')) {
          // 头部点击：尝试 Flick, FlickHead, Tap
          motionPlayed = this.model.motion('Flick') ||
                        this.model.motion('FlickHead') ||
                        this.model.motion('Tap');
          if (motionPlayed) {
            console.log('播放头部点击动作');
          }
        }
        else if (hitAreas.includes('body') || hitAreas.includes('Body')) {
          // 身体点击：尝试 Tap@Body, TapBody, Tap
          motionPlayed = this.model.motion('Tap@Body') ||
                        this.model.motion('TapBody') ||
                        this.model.motion('Tap');
          if (motionPlayed) {
            console.log('播放身体点击动作');
          }
        }
        else {
          // 其他区域：尝试通用 Tap
          motionPlayed = this.model.motion('Tap');
        }

        // 如果没有对应动作，播放随机动作（排除 Idle）
        if (!motionPlayed) {
          console.log('该区域无特定动作，播放随机动作');
          this.playRandomMotion(true); // 排除 Idle
        }
      } catch (error) {
        console.error('播放点击动作失败:', error);
      }
    });

    console.log('点击表情已启用');
  }

  /**
   * 调整渲染器大小并重新定位模型
   * @param {number} width - 新宽度
   * @param {number} height - 新高度
   * @param {number} scaleMultiplier - 缩放倍数（默认 0.9）
   */
  resize(width, height, scaleMultiplier = 0.9) {
    if (!this.app || !this.model) {
      console.warn('无法调整大小：应用或模型未初始化');
      return;
    }

    console.log('调整渲染器大小:', { width, height });

    // 更新渲染器尺寸
    this.app.renderer.resize(width, height);

    // 重新定位模型到中央
    this.model.position.set(width / 2, height / 2);

    // 重新计算缩放
    const scale = Math.min(
      width / this.model.width,
      height / this.model.height
    ) * scaleMultiplier;
    this.model.scale.set(scale);

    console.log('模型已调整:', {
      position: { x: this.model.position.x, y: this.model.position.y },
      scale: scale
    });
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

      // 清除序列播放定时器
      if (this.sequenceTimeout) {
        clearTimeout(this.sequenceTimeout);
        this.sequenceTimeout = null;
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
      this.motionSequence = null;
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
