/**
 * 入场动画管理器 - 缩地成寸效果
 * 管理精灵从屏幕中央华丽登场，然后瞬移到右下角
 */

class EntranceAnimationManager {
  constructor() {
    this.container = null;
    this.spriteElement = null;
    this.targetPosition = null;
    this.isAnimating = false;
    this.onComplete = null;
    this.live2dLoader = null;
  }

  /**
   * 初始化动画系统
   * @param {HTMLElement} spriteElement - 精灵容器元素
   * @param {Function} onComplete - 动画完成回调
   * @param {Object} live2dLoader - Live2D 加载器实例（可选）
   */
  init(spriteElement, onComplete, live2dLoader = null) {
    console.log('初始化入场动画管理器...');
    this.spriteElement = spriteElement;
    this.onComplete = onComplete;
    this.live2dLoader = live2dLoader;

    // 创建动画容器
    this.container = document.createElement('div');
    this.container.id = 'entrance-animation-container';
    document.body.appendChild(this.container);

    console.log('✓ 入场动画管理器初始化完成');
  }

  /**
   * 开始入场动画
   * @param {Object} targetPosition - 目标位置 {x, y}
   */
  async start(targetPosition) {
    if (this.isAnimating) {
      console.warn('动画正在进行中，忽略重复调用');
      return;
    }

    this.isAnimating = true;
    this.targetPosition = targetPosition;

    console.log('开始入场动画序列...');
    console.log('目标位置:', targetPosition);

    try {
      // 步骤0：扩大窗口到全屏以显示全屏动画
      if (window.electronAPI && window.electronAPI.setWindowFullscreen) {
        console.log('步骤0: 扩大窗口到全屏...');
        const result = await window.electronAPI.setWindowFullscreen();

        // 等待窗口调整完成
        await this.wait(100);

        // 使用 loader 的 resize 方法重新调整渲染器和模型
        if (this.live2dLoader && result.success) {
          console.log('调整 Live2D 渲染器到全屏尺寸...');
          this.live2dLoader.resize(result.width, result.height, 0.3);  // 全屏时使用 30% 缩放
        }
      }

      // 第一阶段：召唤降临 (0-2s) - 增加时长
      await this.phase1_Summon();

      // 第二阶段：能量蓄积 (2-3.5s) - 增加时长
      await this.phase2_EnergyCharge();

      // 第三阶段：缩地成寸 (3.5-4.3s) - 增加时长
      await this.phase3_Warp();

      // 第四阶段：空间传送 (4.3-4.4s)
      await this.phase4_Teleport();

      // 第五阶段：降临完成 (4.4-5.4s) - 增加时长
      await this.phase5_LandingComplete();

      // 恢复窗口大小
      if (window.electronAPI && window.electronAPI.restoreWindowSize) {
        console.log('恢复窗口大小到 300x400...');
        await window.electronAPI.restoreWindowSize();

        // 等待窗口调整完成
        await this.wait(100);

        // 使用 loader 的 resize 方法恢复渲染器和模型到小窗口尺寸
        if (this.live2dLoader) {
          console.log('调整 Live2D 渲染器到小窗口尺寸...');
          this.live2dLoader.resize(300, 400, 0.9);  // 小窗口时使用 90% 缩放
        }
      }

      // 动画完成
      this.cleanup();
      console.log('✅ 入场动画序列完成！总时长约5.4秒');

      if (this.onComplete) {
        this.onComplete();
      }
    } catch (error) {
      console.error('入场动画执行失败:', error);
      // 出错时也要恢复窗口大小
      if (window.electronAPI && window.electronAPI.restoreWindowSize) {
        await window.electronAPI.restoreWindowSize();
      }
      this.cleanup();
    } finally {
      this.isAnimating = false;
    }
  }

  /**
   * 第一阶段：召唤降临
   * 在屏幕中央召唤魔法阵，精灵淡入
   */
  async phase1_Summon() {
    console.log('阶段1: 召唤降临...');

    // 创建魔法阵
    const magicCircle = this.createMagicCircle();
    this.container.appendChild(magicCircle);

    // 创建光芒射线
    for (let i = 0; i < 8; i++) {
      const ray = this.createLightRay(i * 45);
      magicCircle.appendChild(ray);
    }

    // 创建星星特效
    for (let i = 0; i < 20; i++) {
      const star = this.createStar();
      this.container.appendChild(star);
    }

    // 精灵淡入动画
    if (this.spriteElement) {
      this.spriteElement.classList.add('sprite-summon');
    }

    // 等待动画完成
    await this.wait(2000); // 增加等待时间以放慢动画

    console.log('✓ 阶段1完成');
  }

  /**
   * 第二阶段：能量蓄积
   * 精灵周围出现旋转的能量粒子
   */
  async phase2_EnergyCharge() {
    console.log('阶段2: 能量蓄积...');

    // 创建能量粒子
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      const particle = this.createEnergyParticle(i, particleCount);
      this.container.appendChild(particle);
    }

    // 创建光晕脉冲
    const glowPulse = this.createGlowPulse();
    this.container.appendChild(glowPulse);

    // 精灵悬浮动画
    if (this.spriteElement) {
      this.spriteElement.classList.remove('sprite-summon');
      this.spriteElement.classList.add('sprite-hover');
    }

    // 等待动画完成
    await this.wait(1500); // 从500ms增加到1500ms

    console.log('✓ 阶段2完成');
  }

  /**
   * 第三阶段：缩地成寸
   * 精灵快速缩小并扭曲，准备瞬移
   */
  async phase3_Warp() {
    console.log('阶段3: 缩地成寸...');

    // 创建残影效果
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const afterimage = this.createAfterimage();
        this.container.appendChild(afterimage);
      }, i * 50);
    }

    // 创建光速轨迹
    const warpTrail = this.createWarpTrail();
    this.container.appendChild(warpTrail);

    // 精灵扭曲动画
    if (this.spriteElement) {
      this.spriteElement.classList.remove('sprite-hover');
      this.spriteElement.classList.add('sprite-warp');
    }

    // 等待动画完成
    await this.wait(800); // 从300ms增加到800ms

    console.log('✓ 阶段3完成');
  }

  /** 第四阶段：空间传送
   * 视觉上的瞬移特效（窗口实际移动在动画结束后）
   */
  async phase4_Teleport() {
    console.log('阶段4: 空间传送（视觉特效）...');

    // 这个阶段只是视觉特效
    // 窗口的实际移动和大小恢复会在动画结束后统一处理

    // 等待视觉特效完成
    await this.wait(100);

    console.log('✓ 阶段4完成');
  }

  /**
   * 第五阶段：降临完成
   * 在新位置展开精灵，冲击波效果
   */
  async phase5_LandingComplete() {
    console.log('阶段5: 降临完成...');

    // 创建冲击波
    const shockwave = this.createShockwave();
    this.container.appendChild(shockwave);

    // 创建空间涟漪
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const ripple = this.createRipple();
        this.container.appendChild(ripple);
      }, i * 150);
    }

    // 精灵展开动画
    if (this.spriteElement) {
      this.spriteElement.classList.remove('sprite-warp');
      this.spriteElement.classList.add('sprite-expand');
    }

    // 等待动画完成
    await this.wait(1000); // 从500ms增加到1000ms

    console.log('✓ 阶段5完成');
  }

  /**
   * 创建魔法阵元素
   */
  createMagicCircle() {
    const circle = document.createElement('div');
    circle.className = 'magic-circle';
    return circle;
  }

  /**
   * 创建光芒射线
   */
  createLightRay(rotation) {
    const ray = document.createElement('div');
    ray.className = 'light-ray';
    ray.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    return ray;
  }

  /**
   * 创建星星
   */
  createStar() {
    const star = document.createElement('div');
    star.className = 'star';

    // 随机位置
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 150;

    star.style.left = centerX + Math.cos(angle) * distance + 'px';
    star.style.top = centerY + Math.sin(angle) * distance + 'px';

    // 随机延迟
    star.style.animationDelay = Math.random() * 1 + 's';

    return star;
  }

  /**
   * 创建能量粒子
   */
  createEnergyParticle(index, total) {
    const particle = document.createElement('div');
    particle.className = 'energy-particle';

    // 设置位置在屏幕中央
    particle.style.left = '50%';
    particle.style.top = '50%';
    particle.style.transformOrigin = '0 0';

    // 设置旋转角度和延迟
    const angle = (index / total) * 360;
    particle.style.transform = `rotate(${angle}deg) translateX(150px) rotate(-${angle}deg)`;
    particle.style.animationDelay = (index / total) * 0.5 + 's';

    return particle;
  }

  /**
   * 创建光晕脉冲
   */
  createGlowPulse() {
    const glow = document.createElement('div');
    glow.className = 'glow-pulse';
    return glow;
  }

  /**
   * 创建残影
   */
  createAfterimage() {
    const afterimage = document.createElement('div');
    afterimage.className = 'afterimage';

    // 复制精灵的样式（简化版）
    afterimage.style.width = '300px';
    afterimage.style.height = '400px';
    afterimage.style.left = '50%';
    afterimage.style.top = '50%';
    afterimage.style.transform = 'translate(-50%, -50%)';
    afterimage.style.background = 'radial-gradient(circle, rgba(138, 43, 226, 0.3) 0%, transparent 70%)';

    return afterimage;
  }

  /**
   * 创建光速轨迹
   */
  createWarpTrail() {
    const trail = document.createElement('div');
    trail.className = 'warp-trail';

    // 计算从中心到右下角的角度
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const targetX = window.innerWidth - 175; // 大约右下角
    const targetY = window.innerHeight - 225;

    const angle = Math.atan2(targetY - centerY, targetX - centerX) * (180 / Math.PI);

    trail.style.left = centerX + 'px';
    trail.style.top = centerY + 'px';
    trail.style.transformOrigin = 'center top';
    trail.style.transform = `translate(-50%, -50%) rotate(${angle + 90}deg)`;

    return trail;
  }

  /**
   * 创建冲击波
   */
  createShockwave() {
    const shockwave = document.createElement('div');
    shockwave.className = 'shockwave';

    // 位置在右下角（相对于容器）
    shockwave.style.left = '50%';
    shockwave.style.top = '50%';

    return shockwave;
  }

  /**
   * 创建空间涟漪
   */
  createRipple() {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';

    // 位置在右下角
    ripple.style.left = '50%';
    ripple.style.top = '50%';

    return ripple;
  }

  /**
   * 等待指定时间
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理动画容器
   */
  cleanup() {
    if (this.container) {
      // 淡出容器
      this.container.classList.add('hidden');

      // 延迟移除，确保动画完成
      setTimeout(() => {
        if (this.container && this.container.parentNode) {
          this.container.parentNode.removeChild(this.container);
        }
      }, 500);
    }

    // 清理精灵上的动画类
    if (this.spriteElement) {
      this.spriteElement.classList.remove(
        'sprite-summon',
        'sprite-hover',
        'sprite-warp',
        'sprite-expand'
      );
    }
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.cleanup();
    this.container = null;
    this.spriteElement = null;
    this.targetPosition = null;
    this.onComplete = null;
    this.isAnimating = false;
  }
}

// 导出到全局作用域
window.EntranceAnimationManager = EntranceAnimationManager;
