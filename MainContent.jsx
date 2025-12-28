import React, { useState, useEffect, useRef } from 'react';
import ModelSelector from './ModelSelector';
import ScopeSelector from './ScopeSelector';
import './MainContent.css';

const MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash', icon: '⚡' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro', icon: '💎' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', icon: '🚀' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', icon: '✨' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', icon: '🤖' },
  { id: 'gpt-4', name: 'GPT-4', icon: '🧠' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', icon: '🎭' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', icon: '📝' },
];

function MainContent({ settings, currentConversationId, conversations, onUpdateConversation }) {
  const [scope, setScope] = useState('global');
  const [currentModel, setCurrentModel] = useState(settings.apiModel);
  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModelSelector, setShowModelSelector] = useState(false);

  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);

  const currentConversation = conversations[currentConversationId];

  useEffect(() => {
    setCurrentModel(settings.apiModel);
  }, [settings.apiModel]);

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  useEffect(() => {
    autoResizeTextarea();
  }, [promptInput]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = promptInput.trim();
      if (text || scope === 'current-page') {
        handleSend();
      }
    }
  };

  const handleSend = async () => {
    const text = promptInput.trim();

    if (!text) {
      if (scope === 'current-page') {
        await summarizePage();
      }
      return;
    }

    await processCustomQuestion(text, scope);
  };

  const addMessage = (role, content) => {
    if (!currentConversationId || !conversations[currentConversationId]) return;

    const updatedMessages = [...(conversations[currentConversationId].messages || []), { role, content }];
    const updates = { messages: updatedMessages };

    if (role === 'user' && updatedMessages.filter(m => m.role === 'user').length === 1) {
      const title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
      updates.title = title;
    }

    onUpdateConversation(currentConversationId, updates);
  };

  const extractPageContent = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const clone = document.cloneNode(true);
        const unwantedSelectors = ['script', 'style', 'noscript', 'iframe', 'nav', 'footer', 'header'];
        unwantedSelectors.forEach(selector => {
          clone.querySelectorAll(selector).forEach(el => el.remove());
        });

        let text = clone.body.innerText || clone.body.textContent || '';
        text = text.replace(/\s+/g, ' ').trim();

        const maxLength = 8000;
        if (text.length > maxLength) {
          text = text.substring(0, maxLength) + '...';
        }

        return text;
      }
    });

    return result?.result;
  };

  const summarizePage = async () => {
    try {
      setError(null);
      setLoading(true);

      addMessage('user', '总结当前页面');

      const pageContent = await extractPageContent();

      if (!pageContent || pageContent.length < 50) {
        throw new Error('页面内容太少，无法生成有意义的总结');
      }

      const summary = await callGeminiAPI(
        `请总结以下网页内容，提取关键信息和主要观点，用中文回答：\n\n${pageContent}`
      );

      addMessage('assistant', summary);
    } catch (error) {
      console.error('总结失败:', error);
      setError(error.message || '总结失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const processCustomQuestion = async (question, scope) => {
    try {
      setError(null);
      setLoading(true);

      addMessage('user', question);

      let prompt = question;

      if (scope === 'current-page') {
        const pageContent = await extractPageContent();
        if (pageContent) {
          prompt = `基于以下网页内容回答问题。\n\n网页内容：\n${pageContent}\n\n问题：${question}`;
        }
      }

      const answer = await callGeminiAPI(prompt);

      addMessage('assistant', answer);
      setPromptInput('');
    } catch (error) {
      console.error('处理失败:', error);
      setError(error.message || '处理失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const callGeminiAPI = async (prompt) => {
    if (!settings.apiKey) {
      throw new Error('请先在设置中配置 API Key');
    }

    if (!settings.apiBaseUrl) {
      throw new Error('请先在设置中配置 API 端点');
    }

    const baseUrl = settings.apiBaseUrl.endsWith('/')
      ? settings.apiBaseUrl.slice(0, -1)
      : settings.apiBaseUrl;

    const endpoint = `${baseUrl}/chat/completions`;

    const requestBody = {
      model: currentModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2048
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `API 错误: ${response.status}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();

    if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
      return data.choices[0].message.content;
    }

    if (data.error) {
      throw new Error(`API 错误: ${data.error.message || JSON.stringify(data.error)}`);
    }

    throw new Error('API 返回了空结果');
  };

  return (
    <main className="main-content">
      <div className="content-wrapper">
        <div className="messages-container" ref={messagesContainerRef}>
          {currentConversation?.messages?.map((msg, index) => (
            <div key={index} className={`message-item ${msg.role}`}>
              <div className="message-bubble">{msg.content}</div>
            </div>
          ))}
        </div>

        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <span className="loading-text">AI 正在思考...</span>
          </div>
        )}

        {error && (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <div className="error-message">{error}</div>
          </div>
        )}

        {/* 上方功能栏 */}
        <div className="input-toolbar-top">
          <button
            className="toolbar-btn"
            onClick={() => setShowModelSelector(true)}
            title="选择模型"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <span>{MODELS.find(m => m.id === currentModel)?.name || '模型'}</span>
            <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>

        <div className="input-area">
          {/* 带圆弧边框的输入容器 */}
          <div className="input-box">
            {/* 中间：文本输入区域 */}
            <textarea
              ref={textareaRef}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="prompt-input"
              placeholder="输入您的问题..."
              rows="1"
            />

            {/* 下方功能栏 */}
            <div className="input-toolbar-bottom">
              <ScopeSelector
                value={scope}
                onChange={setScope}
              />

              <button
                onClick={handleSend}
                className="send-btn-new"
                title="发送 (Enter)"
                disabled={!promptInput.trim() && scope !== 'current-page'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 模型选择器弹窗 */}
        {showModelSelector && (
          <ModelSelector
            currentModel={currentModel}
            onSelect={setCurrentModel}
            onClose={() => setShowModelSelector(false)}
          />
        )}
      </div>
    </main>
  );
}

export default MainContent;
