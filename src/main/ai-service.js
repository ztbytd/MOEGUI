// AI 服务模块 - 文件分类和整理
const fetch = require('electron-fetch').default;
const path = require('path');

class AIService {
  constructor(config = {}) {
    this.apiBaseUrl = config.apiBaseUrl || 'https://action.h7ml.cn';
    this.apiKey = config.apiKey || '';
    this.model = config.model || 'gemini-3-flash-preview';
    this.timeout = config.timeout || 30000; // 默认 30 秒超时
    this.maxRetries = config.maxRetries || 2; // 默认重试 2 次
  }

  /**
   * 更新配置
   */
  updateConfig(config) {
    if (config.apiBaseUrl) this.apiBaseUrl = config.apiBaseUrl;
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.model) this.model = config.model;
    if (config.timeout) this.timeout = config.timeout;
    if (config.maxRetries !== undefined) this.maxRetries = config.maxRetries;
  }

  /**
   * 带超时的 fetch 请求
   */
  async fetchWithTimeout(url, options, timeout) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('请求超时，请检查网络连接')), timeout)
      )
    ]);
  }

  /**
   * 调用 AI API（OpenAI 兼容格式，带重试机制）
   */
  async callAPI(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('请先配置 API Key');
    }

    if (!this.apiBaseUrl) {
      throw new Error('请先配置 API 端点');
    }

    const baseUrl = this.apiBaseUrl.endsWith('/')
      ? this.apiBaseUrl.slice(0, -1)
      : this.apiBaseUrl;

    const endpoint = `${baseUrl}/chat/completions`;

    const requestBody = {
      model: options.model || this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 2048
    };

    console.log('调用 AI API:', endpoint);

    let lastError = null;
    const maxAttempts = (options.retry !== false) ? (this.maxRetries + 1) : 1;

    // 重试逻辑
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`重试 AI API (${attempt}/${maxAttempts})...`);
          // 等待一段时间后重试（指数退避）
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt - 2), 5000)));
        }

        const response = await this.fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }, this.timeout);

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
      } catch (error) {
        lastError = error;
        console.error(`AI API 调用失败 (尝试 ${attempt}/${maxAttempts}):`, error.message);

        // 如果是最后一次尝试，抛出错误
        if (attempt === maxAttempts) {
          break;
        }

        // 对于某些错误（如认证失败），不应重试
        if (error.message.includes('401') || error.message.includes('API Key')) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * 分析文件并生成分类建议
   * @param {Array} fileInfos - 文件信息数组
   * @returns {Object} 分类建议
   */
  async analyzeFiles(fileInfos) {
    if (!fileInfos || fileInfos.length === 0) {
      throw new Error('没有文件需要分析');
    }

    // 提取文件名和扩展名
    const fileList = fileInfos.map(file => {
      const ext = path.extname(file.name);
      const basename = path.basename(file.name, ext);
      return {
        name: file.name,
        extension: ext,
        basename: basename,
        size: file.size,
        type: file.type
      };
    });

    // 构建 Prompt
    const prompt = this.buildClassificationPrompt(fileList);

    console.log('发送分类请求...');

    // 调用 AI
    const response = await this.callAPI(prompt, {
      temperature: 0.3, // 降低温度以获得更一致的结果
      max_tokens: 1500
    });

    console.log('AI 响应:', response);

    // 解析 AI 返回的 JSON
    try {
      const result = this.parseAIResponse(response);
      return result;
    } catch (error) {
      console.error('解析 AI 响应失败:', error);
      throw new Error('AI 返回的格式不正确，请重试');
    }
  }

  /**
   * 构建文件分类 Prompt
   */
  buildClassificationPrompt(fileList) {
    const fileListText = fileList.map((f, i) =>
      `${i + 1}. ${f.name} (${f.extension || '无扩展名'}, ${this.formatFileSize(f.size)})`
    ).join('\n');

    return `你是一个智能文件整理助手。请根据文件名、扩展名和类型，对以下文件进行分类整理。

文件列表：
${fileListText}

请按照以下规则进行分类：
1. 根据文件类型分类（文档、图片、视频、音频、压缩包、代码等）
2. 如果文件名包含明确的主题或项目名称，优先按主题分类
3. 相同类型的文件归入同一文件夹
4. 文件夹名称要简洁、清晰、中文

请以 JSON 格式返回分类结果，格式如下：
{
  "action": "ORGANIZE",
  "folders": [
    {
      "name": "文件夹名称",
      "description": "该文件夹的用途说明",
      "files": ["文件1.txt", "文件2.doc"]
    }
  ],
  "summary": "整理建议的简要说明"
}

注意：
- 只返回 JSON，不要有其他文字
- 文件夹名称不要包含特殊字符（/ \\ : * ? " < > |）
- 确保所有文件都被分配到某个文件夹中
- 如果只有一个文件，也要为它创建合适的文件夹`;
  }

  /**
   * 解析 AI 响应
   */
  parseAIResponse(response) {
    // 移除可能的 Markdown 代码块标记
    let jsonText = response.trim();

    // 移除 ```json 和 ```
    jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');

    // 解析 JSON
    const result = JSON.parse(jsonText);

    // 验证必要字段
    if (!result.folders || !Array.isArray(result.folders)) {
      throw new Error('缺少 folders 字段');
    }

    // 清理文件夹名称中的特殊字符
    result.folders = result.folders.map(folder => ({
      ...folder,
      name: this.sanitizeFolderName(folder.name)
    }));

    return result;
  }

  /**
   * 清理文件夹名称
   */
  sanitizeFolderName(name) {
    // 移除 Windows 不允许的字符
    return name.replace(/[\/\\:*?"<>|]/g, '_').trim();
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (!bytes) return '未知大小';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  /**
   * 智能对话（用于对话交互）
   * @param {string} message - 用户消息
   * @param {Object} context - 上下文信息
   * @returns {Object} { message, action }
   */
  async chat(message, context = {}) {
    // 构建对话 Prompt
    const prompt = this.buildChatPrompt(message, context);

    try {
      const response = await this.callAPI(prompt, {
        temperature: 0.7,
        max_tokens: 1000
      });

      // 尝试解析 JSON 响应
      try {
        const result = this.parseChatResponse(response);
        return result;
      } catch (parseError) {
        // 如果不是 JSON，直接返回文本
        return {
          message: response,
          action: null
        };
      }
    } catch (error) {
      console.error('AI 对话失败:', error);
      throw error;
    }
  }

  /**
   * 构建对话 Prompt
   */
  buildChatPrompt(message, context) {
    let prompt = `你是 MoeGui 桌面精灵助手。你可以帮助用户整理文件、查找文件和管理桌面。

用户指令：${message}

`;

    // 添加上下文
    if (context.desktopFiles && context.desktopFiles.length > 0) {
      const fileList = context.desktopFiles.slice(0, 20).map(f => f.name).join(', ');
      prompt += `当前桌面文件：${fileList}\n\n`;
    }

    prompt += `请分析用户意图并回复。如果用户想要执行文件操作，返回 JSON 格式：
{
  "message": "用户友好的回复消息",
  "action": {
    "type": "操作类型",
    "params": { 参数对象 }
  }
}

支持的操作类型：
- "organize_desktop": 整理桌面（可选参数：filter 文件类型过滤）
- "find_files": 查找文件（参数：keyword 关键词）
- "clean_duplicates": 清理重复文件

如果只是普通对话，直接返回文本回复即可，不需要 JSON。

示例：
用户："帮我整理桌面"
回复：{ "message": "好的，马上帮你整理桌面！", "action": { "type": "organize_desktop", "params": {} } }

用户："找找图片文件"
回复：{ "message": "正在查找图片文件...", "action": { "type": "find_files", "params": { "keyword": "图片" } } }

用户："你好"
回复：你好呀！我是 MoeGui，有什么可以帮你的吗？`;

    return prompt;
  }

  /**
   * 解析对话响应
   */
  parseChatResponse(response) {
    // 移除可能的 Markdown 代码块标记
    let jsonText = response.trim();
    jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');

    // 尝试解析 JSON
    try {
      const result = JSON.parse(jsonText);

      // 验证格式
      if (typeof result === 'object' && result.message) {
        return result;
      }

      // 如果是普通对象，包装一下
      return {
        message: JSON.stringify(result),
        action: null
      };
    } catch {
      // 不是 JSON，直接返回文本
      throw new Error('Not JSON');
    }
  }
}

module.exports = AIService;
