# AI Service - 硅基流动多模态 AI 服务

集成硅基流动 API 的多模态 AI 服务，支持文本对话、图片分析、视频分析和音频分析。

## 功能特性

✅ **简单对话** - 纯文本对话，支持对话历史  
✅ **多模态对话** - 支持文本、图片、视频、音频混合输入  
✅ **图片分析** - 分析图片内容、OCR、图表解析等  
✅ **视频分析** - 视频内容理解和总结  
✅ **音频分析** - 音频转录和内容分析  
✅ **推理模型** - 支持 Qwen3 推理模型的思维链功能  

## 快速开始

### 1. 安装依赖

```bash
cd ai-service
npm install
```

### 2. 配置环境变量

编辑 `.env` 文件：

```env
PORT=3002
SILICONFLOW_API_KEY=sk-your-api-key
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=Qwen/Qwen3-VL-235B-A22B-Thinking
CORS_ALLOW_ALL=true
```

### 3. 启动服务

```bash
npm start
```

服务将在 `http://localhost:3002` 启动。

## API 文档

### 1. 简单对话

**端点:** `POST /api/ai/chat`

**请求体:**
```json
{
  "message": "你好，请介绍一下自己",
  "history": [
    {
      "role": "user",
      "content": "你是谁？"
    },
    {
      "role": "assistant",
      "content": "我是一个 AI 助手..."
    }
  ]
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "message": "我是一个由硅基流动提供的 AI 助手..."
  }
}
```

### 2. 多模态对话

**端点:** `POST /api/ai/multimodal`

**请求体:**
```json
{
  "content": [
    {
      "type": "image_url",
      "image_url": {
        "url": "https://example.com/image.jpg",
        "detail": "high"
      }
    },
    {
      "type": "text",
      "text": "这张图片中有什么？"
    }
  ],
  "history": [],
  "options": {
    "temperature": 0.7,
    "max_tokens": 4096
  }
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "model": "Qwen/Qwen3-VL-235B-A22B-Thinking",
    "created": 1234567890,
    "usage": {
      "prompt_tokens": 100,
      "completion_tokens": 50,
      "total_tokens": 150
    },
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": "这张图片显示..."
        },
        "finish_reason": "stop"
      }
    ]
  }
}
```

### 3. 图片分析

**端点:** `POST /api/ai/image`

**请求体:**
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "question": "请分析这张图片的内容",
  "options": {
    "detail": "high"
  }
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "analysis": "这张图片显示了..."
  }
}
```

### 4. 视频分析

**端点:** `POST /api/ai/video`

**请求体:**
```json
{
  "videoUrl": "https://example.com/video.mp4",
  "question": "请总结这个视频的主要内容",
  "options": {
    "detail": "high",
    "max_frames": 16,
    "fps": 1
  }
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "analysis": "这个视频主要讲述了..."
  }
}
```

### 5. 音频分析

**端点:** `POST /api/ai/audio`

**请求体:**
```json
{
  "audioUrl": "https://example.com/audio.mp3",
  "question": "请转录这个音频的内容",
  "options": {}
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "analysis": "音频内容转录为..."
  }
}
```

## 内容格式说明

### 文本内容

```json
{
  "type": "text",
  "text": "你的文本内容"
}
```

### 图片内容

```json
{
  "type": "image_url",
  "image_url": {
    "url": "https://example.com/image.jpg 或 data:image/jpeg;base64,...",
    "detail": "auto|low|high"
  }
}
```

### 视频内容

```json
{
  "type": "video_url",
  "video_url": {
    "url": "https://example.com/video.mp4 或 data:video/mp4;base64,...",
    "detail": "auto|low|high",
    "max_frames": 16,
    "fps": 1
  }
}
```

### 音频内容

```json
{
  "type": "audio_url",
  "audio_url": {
    "url": "https://example.com/audio.mp3 或 data:audio/mp3;base64,..."
  }
}
```

## 使用示例

### JavaScript/Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3002/api',
});

// 简单对话
async function chat() {
  const response = await client.post('/ai/chat', {
    message: '你好，请介绍一下自己',
    history: [],
  });
  console.log(response.data);
}

// 图片分析
async function analyzeImage() {
  const response = await client.post('/ai/image', {
    imageUrl: 'https://example.com/image.jpg',
    question: '这张图片中有什么？',
    options: {
      detail: 'high',
    },
  });
  console.log(response.data);
}

// 多模态对话
async function multimodalChat() {
  const response = await client.post('/ai/multimodal', {
    content: [
      {
        type: 'image_url',
        image_url: {
          url: 'https://example.com/image.jpg',
          detail: 'high',
        },
      },
      {
        type: 'text',
        text: '这张图片中有什么？',
      },
    ],
    history: [],
  });
  console.log(response.data);
}

chat();
```

### Python

```python
import requests

BASE_URL = 'http://localhost:3002/api'

# 简单对话
def chat():
    response = requests.post(f'{BASE_URL}/ai/chat', json={
        'message': '你好，请介绍一下自己',
        'history': [],
    })
    print(response.json())

# 图片分析
def analyze_image():
    response = requests.post(f'{BASE_URL}/ai/image', json={
        'imageUrl': 'https://example.com/image.jpg',
        'question': '这张图片中有什么？',
        'options': {
            'detail': 'high',
        },
    })
    print(response.json())

chat()
```

### cURL

```bash
# 简单对话
curl -X POST http://localhost:3002/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好，请介绍一下自己",
    "history": []
  }'

# 图片分析
curl -X POST http://localhost:3002/api/ai/image \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "question": "这张图片中有什么？",
    "options": {
      "detail": "high"
    }
  }'
```

## 支持的模型

- `Qwen/Qwen3-VL-235B-A22B-Thinking` - 推理模型，支持思维链
- `Qwen/Qwen3-Omni-30B-A3B-Instruct` - 多模态模型
- 其他硅基流动支持的模型

## 错误处理

所有错误响应都遵循以下格式：

```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "错误信息",
    "code": "ERROR_CODE"
  }
}
```

常见错误码：
- `INVALID_FORMAT` - 请求格式错误
- `API_ERROR` - 硅基流动 API 错误
- `REQUEST_ERROR` - 请求失败
- `NO_RESPONSE` - 无法获取 AI 回复

## 性能优化建议

1. **图片优化** - 使用 `detail: "low"` 来降低成本和延迟
2. **视频帧数** - 根据需要调整 `max_frames` 和 `fps` 参数
3. **Token 限制** - 合理设置 `max_tokens` 以控制成本
4. **缓存** - 在前端缓存对话历史，减少重复请求

## 许可证

ISC
