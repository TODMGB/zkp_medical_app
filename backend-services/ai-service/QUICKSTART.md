# AI Service 快速开始指南

## 📦 安装

### 1. 进入项目目录

```bash
cd ai-service
```

### 2. 安装依赖

```bash
npm install
```

## ⚙️ 配置

### 1. 复制环境变量文件

```bash
cp .env.example .env
```

### 2. 编辑 .env 文件

```env
PORT=3002
SILICONFLOW_API_KEY=sk-tgutceiwbrlocctopqihxhucgzxoqvriuioammghyxpqihju
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=Qwen/Qwen3-VL-235B-A22B-Thinking
CORS_ALLOW_ALL=true
```

## 🚀 启动服务

```bash
npm start
```

你应该看到类似的输出：

```
============================================================
🚀 AI Service 启动中...
============================================================

📌 配置信息:
   端口: 3002
   硅基流动 API: https://api.siliconflow.cn/v1
   模型: Qwen/Qwen3-VL-235B-A22B-Thinking
   CORS: 允许所有源

============================================================
✅ AI Service 启动成功！
============================================================

📡 API 端点:
   健康检查: http://localhost:3002/api/health
   简单对话: POST http://localhost:3002/api/ai/chat
   多模态对话: POST http://localhost:3002/api/ai/multimodal
   图片分析: POST http://localhost:3002/api/ai/image
   视频分析: POST http://localhost:3002/api/ai/video
   音频分析: POST http://localhost:3002/api/ai/audio

============================================================
```

## 🧪 测试 API

### 方法 1: 使用测试脚本

```bash
node examples/test-api.js
```

### 方法 2: 使用 cURL

#### 健康检查

```bash
curl http://localhost:3002/api/health
```

#### 简单对话

```bash
curl -X POST http://localhost:3002/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好，请介绍一下自己",
    "history": []
  }'
```

#### 图片分析

```bash
curl -X POST http://localhost:3002/api/ai/image \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/1200px-Good_Food_Display_-_NCI_Visuals_Online.jpg",
    "question": "这张图片中有哪些食物？",
    "options": {
      "detail": "high"
    }
  }'
```

### 方法 3: 使用 Postman

1. 导入 API 端点
2. 设置请求头: `Content-Type: application/json`
3. 发送请求

## 📚 API 使用示例

### JavaScript/Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3002/api',
});

// 简单对话
async function chat() {
  const response = await client.post('/ai/chat', {
    message: '你好',
    history: [],
  });
  console.log(response.data.data.message);
}

// 图片分析
async function analyzeImage() {
  const response = await client.post('/ai/image', {
    imageUrl: 'https://example.com/image.jpg',
    question: '这张图片中有什么？',
  });
  console.log(response.data.data.analysis);
}

chat();
```

### Python

```python
import requests

BASE_URL = 'http://localhost:3002/api'

# 简单对话
response = requests.post(f'{BASE_URL}/ai/chat', json={
    'message': '你好',
    'history': [],
})
print(response.json()['data']['message'])

# 图片分析
response = requests.post(f'{BASE_URL}/ai/image', json={
    'imageUrl': 'https://example.com/image.jpg',
    'question': '这张图片中有什么？',
})
print(response.json()['data']['analysis'])
```

## 🎯 主要功能

### 1. 简单对话 (Chat)

- 纯文本对话
- 支持对话历史
- 适合日常问答

**端点:** `POST /api/ai/chat`

### 2. 多模态对话 (Multimodal)

- 支持文本、图片、视频、音频混合输入
- 灵活的内容组合
- 适合复杂的分析任务

**端点:** `POST /api/ai/multimodal`

### 3. 图片分析 (Image)

- 图片内容描述
- OCR 识别
- 图表解析
- 多图对比

**端点:** `POST /api/ai/image`

### 4. 视频分析 (Video)

- 视频内容理解
- 视频总结
- 视频 + 图片混合分析

**端点:** `POST /api/ai/video`

### 5. 音频分析 (Audio)

- 音频转录
- 内容分析
- 语音识别

**端点:** `POST /api/ai/audio`

## 🔧 常见问题

### Q: 如何获取硅基流动 API Key？

A: 访问 https://cloud.siliconflow.cn/account/ak 获取你的 API Key。

### Q: 支持哪些模型？

A: 目前支持：
- `Qwen/Qwen3-VL-235B-A22B-Thinking` - 推理模型
- `Qwen/Qwen3-Omni-30B-A3B-Instruct` - 多模态模型
- 其他硅基流动支持的模型

### Q: 如何处理图片和视频？

A: 支持两种方式：
1. **URL 方式**: 直接传入图片/视频的 URL
2. **Base64 方式**: 将图片/视频编码为 base64 数据 URI

### Q: 对话历史如何管理？

A: 对话历史在前端管理，每次请求时将历史记录传入 `history` 参数。

### Q: 如何优化成本？

A: 
1. 使用 `detail: "low"` 降低图片分析成本
2. 合理设置 `max_tokens` 限制输出长度
3. 缓存常见问题的答案
4. 使用较小的 `max_frames` 处理视频

## 📖 更多信息

- [完整 API 文档](./README.md)
- [硅基流动官方文档](https://docs.siliconflow.cn/)
- [Qwen 模型文档](https://qwenlm.github.io/)

## 🆘 获取帮助

如遇到问题，请：

1. 检查 `.env` 文件配置是否正确
2. 查看服务器日志输出
3. 确保硅基流动 API Key 有效
4. 检查网络连接

## 📝 许可证

ISC
