// 设置页面逻辑

let currentSettings = {
  apiModel: 'gemini-3-flash-preview',
  apiBaseUrl: 'https://action.h7ml.cn',
  apiKey: '',
  autoStart: true,
  enableFileWatcher: true,
  spriteScale: 100
};

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  initModelSelector();
  initButtons();
  initSlider();
});

/**
 * 加载设置
 */
async function loadSettings() {
  try {
    if (window.electronAPI && window.electronAPI.getSettings) {
      const settings = await window.electronAPI.getSettings();
      currentSettings = { ...currentSettings, ...settings };
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }

  // 填充表单
  document.getElementById('apiBaseUrl').value = currentSettings.apiBaseUrl || '';
  document.getElementById('apiKey').value = currentSettings.apiKey || '';
  document.getElementById('autoStart').checked = currentSettings.autoStart !== false;
  document.getElementById('enableFileWatcher').checked = currentSettings.enableFileWatcher !== false;
  document.getElementById('spriteScale').value = currentSettings.spriteScale || 100;
  document.getElementById('spriteScaleValue').textContent = (currentSettings.spriteScale || 100) + '%';

  // 选中当前模型
  updateModelSelection(currentSettings.apiModel);
}

/**
 * 初始化模型选择器
 */
function initModelSelector() {
  const modelOptions = document.querySelectorAll('.model-option');

  modelOptions.forEach(option => {
    option.addEventListener('click', () => {
      const model = option.dataset.model;
      currentSettings.apiModel = model;
      updateModelSelection(model);
    });
  });
}

/**
 * 更新模型选择状态
 */
function updateModelSelection(model) {
  const modelOptions = document.querySelectorAll('.model-option');

  modelOptions.forEach(option => {
    if (option.dataset.model === model) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

/**
 * 初始化按钮
 */
function initButtons() {
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  saveBtn.addEventListener('click', saveSettings);
  cancelBtn.addEventListener('click', closeWindow);
}

/**
 * 初始化滑块
 */
function initSlider() {
  const slider = document.getElementById('spriteScale');
  const valueLabel = document.getElementById('spriteScaleValue');

  slider.addEventListener('input', (e) => {
    const value = e.target.value;
    valueLabel.textContent = value + '%';
    currentSettings.spriteScale = parseInt(value);
  });
}

/**
 * 保存设置
 */
async function saveSettings() {
  const apiBaseUrl = document.getElementById('apiBaseUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  const autoStart = document.getElementById('autoStart').checked;
  const enableFileWatcher = document.getElementById('enableFileWatcher').checked;
  const spriteScale = parseInt(document.getElementById('spriteScale').value);

  // 验证（如果 API Key 为空，只警告不阻止）
  if (!apiBaseUrl) {
    showMessage('error', '请输入 API 端点');
    return;
  }

  // 保存设置
  const settings = {
    apiModel: currentSettings.apiModel,
    apiBaseUrl: apiBaseUrl,
    apiKey: apiKey,
    autoStart: autoStart,
    enableFileWatcher: enableFileWatcher,
    spriteScale: spriteScale
  };

  try {
    if (window.electronAPI && window.electronAPI.saveSettings) {
      await window.electronAPI.saveSettings(settings);
      showMessage('success', '设置保存成功！应用需要重启才能生效某些设置');

      // 2 秒后关闭窗口
      setTimeout(() => {
        closeWindow();
      }, 2000);
    }
  } catch (error) {
    console.error('保存设置失败:', error);
    showMessage('error', '保存失败: ' + error.message);
  }
}

/**
 * 显示消息
 */
function showMessage(type, message) {
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';

  // 3 秒后自动隐藏
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
}

/**
 * 关闭窗口
 */
function closeWindow() {
  if (window.electronAPI && window.electronAPI.closeSettings) {
    window.electronAPI.closeSettings();
  }
}
