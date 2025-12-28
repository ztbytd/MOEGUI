# Live2D 模型文件说明

## 获取 Live2D 模型

### 方式 1: 使用免费开源模型

推荐网站：
- **Live2D 官方示例**: https://www.live2d.com/download/sample-data/
- **GitHub 开源模型**: 搜索 "live2d models" 或 "live2d-widget-models"

### 方式 2: 测试用网络模型

项目默认使用在线测试模型，无需下载即可运行。

如需使用本地模型，请将模型文件放入此目录：

```
resources/models/
├── your-model-name/
│   ├── model.json 或 model3.json    # 模型配置文件
│   ├── *.moc 或 *.moc3              # 模型文件
│   ├── *.png                        # 纹理贴图
│   └── motions/                     # 动作文件（可选）
```

## 模型格式支持

- **Cubism 2.1**: model.json
- **Cubism 3.0+**: model3.json
- **Cubism 4.0+**: model3.json

## 修改模型路径

编辑 `src/renderer/live2d-loader.js`，修改模型路径：

```javascript
const modelUrl = './resources/models/your-model-name/model3.json';
```
