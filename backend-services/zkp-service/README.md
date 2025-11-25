# ZKP Service (零知识证明生成服务)

## 📝 服务简介

ZKP Service 是一个专门用于生成零知识证明（Zero-Knowledge Proof）的后端服务。它使用 `snarkjs` 库来生成 Groth16 证明，支持异步任务处理，并通过 RabbitMQ 发送通知。

## 🎯 核心功能

1. **异步 ZKP 证明生成**
   - 支持 `weeklySummary` 电路的证明生成
   - 后台异步处理，避免长时间阻塞请求
   - 任务状态存储在 Redis 中，带 TTL（1小时）

2. **任务状态查询**
   - 通过 `jobId` 查询证明生成任务的状态
   - 支持三种状态：`processing`, `completed`, `failed`

3. **MQ 通知集成**
   - 证明生成成功后，自动发送通知到 RabbitMQ
   - Notification Service 会接收并推送给用户

## 🚀 快速开始

### 1. 安装依赖

```bash
cd zkp-service
npm install
```

### 2. 配置环境变量

创建 `.env` 文件（参考以下配置）：

```env
# ZKP Service Configuration
PORT=3007
GRPC_PORT=50057

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS Configuration
CORS_ALLOW_ALL=true
CORS_ALLOWED_ORIGINS=http://localhost:8080,http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5400
DB_USER=postgres
DB_PASSWORD=123456
DB_DATABASE=bs_zkp_db

# Redis Configuration
REDIS_URL=redis://localhost:6379

# RabbitMQ Configuration
MQ_URL=amqp://localhost:5672
MQ_EXCHANGE_NAME=exchange.notifications
```

### 3. 准备 ZKP 电路文件

确保 `circuits/weeklySummary/` 目录下包含以下文件：
- `circuit_js/circuit.wasm` - WASM 格式的电路
- `circuit_final.zkey` - Groth16 proving key

这些文件已经从 `ZKP-gen-files` 复制过来了。

### 4. 启动服务

```bash
npm start
```

服务将在 `http://localhost:3007` 启动。

## 📡 API 接口

### 1. 生成周度汇总 ZKP 证明

**POST** `/api/zkp/prove/weekly-summary`

**请求体：**
```json
{
  "inputs": {
    "merkleRoot": "7423237065226347324353380772367382631490014989348495481811164164159255474657",
    "leaves": [
      "1117348568668600",
      "197788718819616",
      "318169178969960",
      "...更多叶子节点..."
    ]
  }
}
```

**响应：**
```json
{
  "success": true,
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "ZKP证明生成任务已启动，请使用 jobId 查询状态。"
}
```

### 2. 查询证明任务状态

**GET** `/api/zkp/proof-status/:jobId`

**响应（处理中）：**
```json
{
  "success": true,
  "status": "processing",
  "circuitName": "weeklySummary",
  "userAddress": "0x1234...",
  "startTime": 1698765432100
}
```

**响应（成功）：**
```json
{
  "success": true,
  "status": "completed",
  "circuitName": "weeklySummary",
  "userAddress": "0x1234...",
  "startTime": 1698765432100,
  "data": {
    "success": true,
    "message": "证明和 Calldata 生成成功!",
    "calldata": "...",
    "proof": { ... },
    "publicSignals": [ ... ]
  }
}
```

**响应（失败）：**
```json
{
  "success": true,
  "status": "failed",
  "circuitName": "weeklySummary",
  "userAddress": "0x1234...",
  "startTime": 1698765432100,
  "data": {
    "success": false,
    "message": "证明生成失败",
    "error": "..."
  }
}
```

### 3. 健康检查

**GET** `/api/zkp/health`

**响应：**
```json
{
  "success": true,
  "service": "zkp-service",
  "status": "UP",
  "timestamp": "2025-10-28T09:18:30.123Z"
}
```

## 🔗 与其他服务的集成

### 与 API Gateway 集成

1. 在 `api-gateway/src/config/index.js` 中添加 ZKP 服务配置：
```javascript
services: {
  // ...其他服务
  zkp: {
    baseUrl: process.env.ZKP_SERVICE_URL || 'http://localhost:3007',
  },
}
```

2. 在 `api-gateway/src/routes/` 中添加 ZKP 路由：
```javascript
// zkp.routes.js
const { createProxyHandler } = require('../utils/proxy.util');
const config = require('../config');
router.use(createProxyHandler('ZKP', config.services.zkp.baseUrl, '/api'));
```

3. 在 `api-gateway/src/routes/index.js` 中注册路由：
```javascript
const zkpRouter = require('./zkp.routes');
router.use('/zkp', zkpRouter);  // 需要认证
```

### 与 Notification Service 集成

ZKP Service 生成证明成功后，会自动发送消息到 RabbitMQ：

```javascript
{
  type: 'zkp.proof.completed',
  priority: 'high',
  payload: {
    recipient_address: userAddress,
    title: 'ZKP证明生成成功',
    message: '您的 weeklySummary ZKP证明已生成完成',
    data: {
      jobId,
      circuitName,
      publicSignals: [...]
    },
    channels: ['push', 'websocket']
  }
}
```

Notification Service 会接收此消息，并通过 WebSocket 和 Push 通知用户。

## 🧪 测试

### 使用 curl 测试

```bash
# 1. 启动证明生成任务
curl -X POST http://localhost:3007/api/zkp/prove/weekly-summary \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "merkleRoot": "7423237065226347324353380772367382631490014989348495481811164164159255474657",
      "leaves": ["1117348568668600", "197788718819616", "318169178969960", ...]
    }
  }'

# 2. 查询任务状态
curl http://localhost:3007/api/zkp/proof-status/<jobId>
```

### 通过 API Gateway 测试

```bash
# 1. 登录获取 token
TOKEN="..."

# 2. 通过 API Gateway 请求
curl -X POST http://localhost:3000/api/zkp/prove/weekly-summary \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "inputs": { ... } }'
```

### 完整使用示例 (JavaScript)

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const TOKEN = 'your_jwt_token';

async function generateWeeklyProof() {
  // 1. 准备输入数据
  const inputs = {
    merkleRoot: "7423237065226347324353380772367382631490014989348495481811164164159255474657",
    leaves: [
      "1117348568668600",  // 第1天打卡
      "197788718819616",   // 第2天打卡
      "318169178969960",   // 第3天打卡
      "450934839234344",   // 第4天打卡
      "567345678965432",   // 第5天打卡
      "689012345678901",   // 第6天打卡
      "812345678901234"    // 第7天打卡
    ]
  };
  
  console.log('🚀 开始生成周度汇总证明...');
  
  // 2. 提交证明生成任务
  const proveResp = await axios.post(
    `${API_BASE}/zkp/prove/weekly-summary`,
    { inputs },
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  
  const jobId = proveResp.data.jobId;
  console.log(`✅ 任务已提交，JobID: ${jobId}`);
  
  // 3. 轮询查询任务状态
  let status = 'processing';
  let attempts = 0;
  const maxAttempts = 60; // 最多等待60秒
  
  while (status === 'processing' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    
    const statusResp = await axios.get(
      `${API_BASE}/zkp/proof-status/${jobId}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    
    status = statusResp.data.status;
    attempts++;
    
    console.log(`⏳ 任务状态: ${status} (${attempts}/${maxAttempts})`);
  }
  
  // 4. 获取最终结果
  const finalResp = await axios.get(
    `${API_BASE}/zkp/proof-status/${jobId}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  
  if (finalResp.data.status === 'completed') {
    console.log('✅ 证明生成成功!');
    console.log('Calldata:', finalResp.data.data.calldata);
    console.log('Proof:', finalResp.data.data.proof);
    console.log('Public Signals:', finalResp.data.data.publicSignals);
    
    return finalResp.data.data;
  } else {
    console.error('❌ 证明生成失败:', finalResp.data.data.error);
    throw new Error('证明生成失败');
  }
}

// 使用示例
generateWeeklyProof()
  .then(result => {
    console.log('🎉 证明数据可以提交到链上了!');
  })
  .catch(error => {
    console.error('错误:', error.message);
  });
```

## 📂 项目结构

```
zkp-service/
├── circuits/                    # ZKP 电路文件
│   └── weeklySummary/
│       ├── circuit_js/
│       │   └── circuit.wasm     # WASM 电路
│       └── circuit_final.zkey   # Groth16 proving key
├── src/
│   ├── config/                  # 配置文件
│   ├── controllers/             # 控制器
│   │   └── zkp.controller.js    # ZKP 控制器
│   ├── services/                # 业务逻辑
│   │   └── zkp.service.js       # ZKP 服务
│   ├── routes/                  # 路由
│   │   ├── index.js
│   │   └── zkp.routes.js        # ZKP 路由
│   ├── middleware/              # 中间件
│   ├── mq/                      # 消息队列
│   │   └── producer.js          # MQ 生产者
│   └── redis/                   # Redis 客户端
├── server.js                    # 主入口
├── package.json
└── README.md
```

## ⚙️ 技术栈

- **Express.js** - Web 框架
- **snarkjs** - ZKP 证明生成库
- **Redis** - 任务状态存储
- **RabbitMQ** - 消息队列
- **UUID** - 任务 ID 生成

## 🔒 安全性

1. **JWT 认证**：如果通过 API Gateway 访问，会自动验证 JWT token
2. **CORS 配置**：可配置允许的跨域源
3. **任务隔离**：每个任务都有唯一 ID，存储在 Redis 中，自动过期

## 🚧 未来计划

1. 支持更多 ZKP 电路（medication check-in, daily summary 等）
2. 集成 ERC4337 服务，自动上链 ZKP 证明
3. 添加证明验证 API
4. 支持批量证明生成
5. 添加证明生成进度跟踪

## 📄 许可证

ISC

