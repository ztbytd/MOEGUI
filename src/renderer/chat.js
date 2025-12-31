// 对话窗口逻辑

let messages = [];
let isProcessing = false;

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', () => {
  initChat();
  loadChatHistory();
});

/**
 * 初始化对话
 */
function initChat() {
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');

  // 发送按钮
  sendBtn.addEventListener('click', handleSend);

  // 回车发送
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // 自动调整高度
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
  });

  // 快捷指令按钮（只处理有 data-action 属性的按钮）
  const actionBtns = document.querySelectorAll('.action-btn[data-action]');
  actionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handleQuickAction(action);
    });
  });

  // 清除对话历史按钮
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', clearChatHistory);
  }
}

/**
 * 加载对话历史（每次启动不加载历史，保持空白）
 */
async function loadChatHistory() {
  // 每次启动都是全新开始，不加载历史记录
  // 这样可以让每次打开都像精灵全新出场
  messages = [];
  renderMessages();
}

/**
 * 处理发送
 */
async function handleSend() {
  const messageInput = document.getElementById('messageInput');
  const text = messageInput.value.trim();

  if (!text || isProcessing) return;

  // 添加用户消息
  addMessage('user', text);
  messageInput.value = '';
  messageInput.style.height = 'auto';

  // 处理消息
  await processMessage(text);
}

/**
 * 处理快捷指令
 */
async function handleQuickAction(action) {
  if (isProcessing) return;

  addMessage('user', action);
  await processMessage(action);
}

/**
 * 处理消息（带超时保护）
 */
async function processMessage(message) {
  isProcessing = true;
  updateSendButton(false);

  // 显示输入指示器
  showTypingIndicator();

  try {
    // 调用 AI 处理（带超时）
    if (window.electronAPI && window.electronAPI.chatWithAI) {
      const response = await Promise.race([
        window.electronAPI.chatWithAI(message),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('请求超时，请重试')), 60000) // 60秒超时
        )
      ]);

      hideTypingIndicator();

      if (response && response.success) {
        // 添加 AI 回复
        addMessage('assistant', response.message);

        // 如果有动作需要执行
        if (response.action) {
          await executeAction(response.action);
        }
      } else {
        const errorMsg = response?.message || '抱歉，我遇到了一些问题...';
        addMessage('assistant', errorMsg);
      }
    } else {
      hideTypingIndicator();
      addMessage('assistant', '对话功能尚未配置，请先在设置中配置 AI 服务');
    }
  } catch (error) {
    hideTypingIndicator();
    console.error('处理消息失败:', error);

    // 提供更友好的错误提示
    let errorMessage = '处理失败: ';
    if (error.message.includes('超时')) {
      errorMessage += '请求超时，请检查网络连接后重试';
    } else if (error.message.includes('API Key')) {
      errorMessage += '请先在设置中配置正确的 API Key';
    } else if (error.message.includes('网络')) {
      errorMessage += '网络连接失败，请检查网络设置';
    } else {
      errorMessage += error.message;
    }

    addMessage('assistant', errorMessage);
  }

  isProcessing = false;
  updateSendButton(true);

  // 保存对话历史
  saveChatHistory();
}

/**
 * 执行动作
 */
async function executeAction(action) {
  console.log('执行动作:', action);

  switch (action.type) {
    case 'organize_desktop':
      addMessage('system', '🔄 正在整理桌面...');
      await organizeDesktop(action.params);
      break;

    case 'find_files':
      addMessage('system', '🔍 正在查找文件...');
      await findFiles(action.params);
      break;

    case 'clean_duplicates':
      addMessage('system', '🗑️ 正在清理重复文件...');
      await cleanDuplicates();
      break;

    default:
      console.warn('未知动作类型:', action.type);
  }
}

/**
 * 整理桌面（带超时保护）
 */
async function organizeDesktop(params) {
  try {
    if (!window.electronAPI || !window.electronAPI.readDesktopFiles) {
      addMessage('assistant', '桌面文件读取功能不可用');
      return;
    }

    const result = await Promise.race([
      window.electronAPI.readDesktopFiles(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('读取桌面文件超时')), 10000)
      )
    ]);

    if (!result || !result.success) {
      addMessage('assistant', '读取桌面文件失败: ' + (result?.message || '未知错误'));
      return;
    }

    const files = result.files.filter(f => f.isFile);

    if (files.length === 0) {
      addMessage('assistant', '桌面上没有需要整理的文件哦～');
      return;
    }

    addMessage('system', `📋 找到 ${files.length} 个文件，正在分析...`);

    // 调用 AI 整理（带超时）
    if (window.electronAPI.aiOrganizeFiles) {
      const organizeResult = await Promise.race([
        window.electronAPI.aiOrganizeFiles(files),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI 整理超时')), 60000)
        )
      ]);

      if (organizeResult && organizeResult.success) {
        addMessage('assistant', `✨ ${organizeResult.summary}`);
      } else {
        addMessage('assistant', '整理失败: ' + (organizeResult?.message || '未知错误'));
      }
    } else {
      addMessage('assistant', 'AI 整理功能不可用，请先配置 AI 服务');
    }
  } catch (error) {
    console.error('整理桌面失败:', error);

    let errorMessage = '整理失败: ';
    if (error.message.includes('超时')) {
      errorMessage += '操作超时，请重试';
    } else if (error.message.includes('API Key')) {
      errorMessage += '请先配置 API Key';
    } else {
      errorMessage += error.message;
    }

    addMessage('assistant', errorMessage);
  }
}

/**
 * 查找文件（带超时保护）
 */
async function findFiles(params) {
  try {
    if (!window.electronAPI || !window.electronAPI.readDesktopFiles) {
      addMessage('assistant', '桌面文件读取功能不可用');
      return;
    }

    const result = await Promise.race([
      window.electronAPI.readDesktopFiles(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('读取桌面文件超时')), 10000)
      )
    ]);

    if (!result || !result.success) {
      addMessage('assistant', '读取桌面文件失败: ' + (result?.message || '未知错误'));
      return;
    }

    const keyword = params.keyword || '';
    const files = result.files.filter(f =>
      f.isFile && f.name.toLowerCase().includes(keyword.toLowerCase())
    );

    if (files.length === 0) {
      addMessage('assistant', `没有找到包含"${keyword}"的文件`);
    } else {
      const fileList = files.slice(0, 10).map(f => f.name).join('\n');
      const moreText = files.length > 10 ? `\n...还有 ${files.length - 10} 个文件` : '';
      addMessage('assistant', `找到 ${files.length} 个文件：\n${fileList}${moreText}`);
    }
  } catch (error) {
    console.error('查找文件失败:', error);

    let errorMessage = '查找失败: ';
    if (error.message.includes('超时')) {
      errorMessage += '操作超时，请重试';
    } else {
      errorMessage += error.message;
    }

    addMessage('assistant', errorMessage);
  }
}

/**
 * 清理重复文件
 */
async function cleanDuplicates() {
  addMessage('assistant', '重复文件清理功能开发中...');
}

/**
 * 添加消息
 */
function addMessage(role, content) {
  messages.push({ role, content, timestamp: Date.now() });
  renderMessages();
  scrollToBottom();
}

/**
 * 渲染消息
 */
function renderMessages() {
  const container = document.getElementById('messagesContainer');

  // 清空容器
  container.innerHTML = '';

  // 如果没有消息，显示空状态
  if (messages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💬</div>
        <div class="empty-state-text">
          你好！我是 MoeGui<br>
          告诉我你想做什么吧～
        </div>
      </div>
    `;
    return;
  }

  // 渲染消息
  messages.forEach(msg => {
    const messageEl = createMessageElement(msg);
    container.appendChild(messageEl);
  });
}

/**
 * 创建消息元素
 */
function createMessageElement(msg) {
  const div = document.createElement('div');
  div.className = `message ${msg.role}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = msg.role === 'user' ? '👤' : (msg.role === 'system' ? 'ℹ️' : '🎀');

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = msg.content;

  div.appendChild(avatar);
  div.appendChild(bubble);

  return div;
}

/**
 * 显示输入指示器
 */
function showTypingIndicator() {
  const container = document.getElementById('messagesContainer');

  const indicator = document.createElement('div');
  indicator.className = 'message assistant';
  indicator.id = 'typingIndicator';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = '🎀';

  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

  indicator.appendChild(avatar);
  indicator.appendChild(typingDiv);

  container.appendChild(indicator);
  scrollToBottom();
}

/**
 * 隐藏输入指示器
 */
function hideTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.remove();
  }
}

/**
 * 滚动到底部
 */
function scrollToBottom() {
  const container = document.getElementById('messagesContainer');
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 100);
}

/**
 * 更新发送按钮状态
 */
function updateSendButton(enabled) {
  const sendBtn = document.getElementById('sendBtn');
  sendBtn.disabled = !enabled;
}

/**
 * 保存对话历史
 */
async function saveChatHistory() {
  try {
    if (window.electronAPI && window.electronAPI.saveChatHistory) {
      await window.electronAPI.saveChatHistory(messages);
    }
  } catch (error) {
    console.error('保存对话历史失败:', error);
  }
}

/**
 * 关闭对话窗口
 */
function closeChat() {
  if (window.electronAPI && window.electronAPI.closeChat) {
    window.electronAPI.closeChat();
  }
}

/**
 * 清除对话历史
 */
async function clearChatHistory() {
  // 确认提示
  const confirmed = confirm('确定要清除所有对话记录吗？\n此操作无法撤销。');

  if (!confirmed) {
    return;
  }

  try {
    // 清空消息数组
    messages = [];

    // 重新渲染界面（显示空状态）
    renderMessages();

    // 保存到配置文件
    await saveChatHistory();

    // 显示成功提示
    setTimeout(() => {
      addMessage('system', '✨ 对话记录已清除，开启新的对话吧！');
    }, 300);

    console.log('对话历史已清除');
  } catch (error) {
    console.error('清除对话历史失败:', error);
    alert('清除失败：' + error.message);
  }
}
