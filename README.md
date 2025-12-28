# MoeGui 桌面精灵助手

<div align="center">

🎀 一个可爱的 Live2D 桌面精灵，帮你智能整理文件

![Version](https://img.shields.io/badge/version-1.0.0-pink)
![Electron](https://img.shields.io/badge/Electron-28.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

## ✨ 特性

- 🎭 **Live2D 精灵** - 可爱的桌面宠物，支持动画和表情
- 🤖 **AI 智能分类** - 使用 AI 自动整理文件，支持多种模型
- 💬 **对话交互** - 自然语言对话，轻松执行文件操作
- 🎯 **拖拽整理** - 拖放文件到精灵即可自动分类
- 👀 **视线追踪** - 精灵眼睛跟随鼠标移动
- 📁 **文件监控** - 实时监控桌面文件变化
- 🚀 **开机自启** - 可设置开机自动启动

## 🖼️ 界面预览

### 桌面精灵
- 透明无边框窗口
- 始终置顶显示
- 可拖拽移动位置
- 智能鼠标穿透

### 对话窗口
- 美观的聊天界面
- 快捷指令按钮
- 对话历史记录
- 实时动画反馈

### 设置面板
- AI 模型选择
- API 配置
- 精灵大小调整
- 功能开关

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 运行开发版

```bash
npm start
```

### 打包应用

**Windows**:
```bash
npm run build:win
```

**macOS**:
```bash
npm run build:mac
```

**Linux**:
```bash
npm run build:linux
```

打包后的文件位于 `dist/` 目录。

## ⚙️ 配置

### 1. 配置 AI 服务

右键托盘图标 → **AI 设置**：

- **AI 模型**: 选择合适的模型
- **API 端点**: 填写 API 地址（默认：https://action.h7ml.cn）
- **API Key**: 输入您的 API 密钥

### 2. 应用设置

- **开机自动启动**: 启用后系统启动时自动运行
- **启用桌面文件监控**: 实时监控桌面文件变化
- **精灵大小**: 调整精灵显示大小（50% - 150%）

## 📖 使用指南

### 文件拖放整理

1. 选择要整理的文件
2. 拖动到精灵窗口
3. AI 自动分析并分类
4. 文件被移动到对应文件夹

### 对话交互

1. **双击精灵**打开对话窗口
2. 输入指令或点击快捷按钮：
   - 📁 整理桌面
   - 🕒 最近文件
   - 🗑️ 清理重复
   - 📅 按日期归档

### 支持的指令

- "帮我整理桌面"
- "找找图片文件"
- "查看最近的文档"
- "你好"（普通对话）

## 🛠️ 技术栈

- **框架**: Electron 28
- **渲染**: PixiJS + pixi-live2d-display
- **AI**: OpenAI 兼容 API
- **文件监控**: Chokidar
- **打包**: Electron Builder

## 📁 项目结构

```
MoeGui/
├── src/
│   ├── main/              # 主进程
│   │   ├── index.js       # 主入口
│   │   ├── ai-service.js  # AI 服务
│   │   └── file-watcher.js # 文件监控
│   ├── preload/           # 预加载脚本
│   │   └── index.js
│   └── renderer/          # 渲染进程
│       ├── index.html     # 主窗口
│       ├── chat.html      # 对话窗口
│       ├── settings.html  # 设置窗口
│       └── *.js           # 各种脚本
├── resources/             # 资源文件
│   └── models/            # Live2D 模型
├── package.json
└── README.md
```

## 🔧 开发说明

### 添加自己的 Live2D 模型

1. 将模型文件放入 `resources/models/your-model/`
2. 修改 `src/renderer/main.js` 中的模型路径

### 自定义 AI Prompt

编辑 `src/main/ai-service.js` 中的 Prompt 模板。

## 📝 配置文件

位置：`%APPDATA%/moe-gui/config.json`

```json
{
  "apiModel": "gemini-3-flash-preview",
  "apiBaseUrl": "https://action.h7ml.cn",
  "apiKey": "your-api-key",
  "autoStart": true,
  "enableFileWatcher": true,
  "spriteScale": 100,
  "windowPosition": { "x": 100, "y": 100 },
  "chatHistory": []
}
```

## 🐛 常见问题

### Q: 精灵无法拖动？
A: 确保点击在精灵实体上（非透明区域）。

### Q: 文件整理失败？
A: 检查 AI API 配置是否正确，查看控制台错误信息。

### Q: 对话窗口打不开？
A: 尝试快速双击精灵，间隔 < 300ms。

### Q: 如何卸载？
A:
1. 关闭应用
2. 删除安装目录
3. 删除配置文件（`%APPDATA%/moe-gui`）

## 📜 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，欢迎通过 GitHub Issues 联系我们。

---

<div align="center">

Made with ❤️ by MoeGui Team

</div>
