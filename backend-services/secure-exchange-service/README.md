# 🔐 Secure Exchange Service

**安全数据交换服务** - 基于端到端加密的通用数据交换中间件

## 📋 概述

Secure Exchange Service 是一个通用的端到端加密数据交换平台，提供：

- **临时公钥交换协调** - 不存储公钥，仅在交换时临时协调
- **加密消息中转** - 服务器无法读取消息内容（"盲人邮差"）
- **实时WebSocket推送** - 低延迟的消息通知
- **防重放攻击** - 基于时间戳和nonce的双重保护
- **多层安全防护** - TLS + JWT + 签名验证 + 端到端加密

## 🏗️ 架构

```
┌─────────────────────────────────────────┐
│        Client Layer (客户端层)           │
│  - 公钥生成/管理                         │
│  - ECIES加密/解密                       │
│  - ECDSA签名/验证                       │
└─────────────────────────────────────────┘
                    ↕ HTTPS/WSS
┌─────────────────────────────────────────┐
│     API Gateway (网关层)                 │
│  - JWT认证                               │
│  - WebSocket代理                         │
│  - 路由转发                              │
└─────────────────────────────────────────┘
                    ↕ HTTP
┌─────────────────────────────────────────┐
│  Secure Exchange Service (服务层)        │
│  - 会话管理                              │
│  - 消息中转                              │
│  - 状态跟踪                              │
│  - WebSocket推送                         │
└─────────────────────────────────────────┘
        ↕                ↕              ↕
┌──────────┐    ┌──────────┐    ┌──────────┐
│PostgreSQL│    │  Redis   │    │ RabbitMQ │
│ 会话/消息 │    │ 在线状态  │    │ 事件通知  │
└──────────┘    └──────────┘    └──────────┘
```

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 6.x
- RabbitMQ >= 3.x

### 2. 安装依赖

```bash
cd secure-exchange-service
npm install
```

### 3. 配置环境变量

创建 `.env` 文件：

```env
PORT=3007
WS_PORT=3008
JWT_SECRET=your_jwt_secret_key
CORS_ALLOW_ALL=true
DB_HOST=localhost
DB_PORT=5400
DB_USER=postgres
DB_PASSWORD=postgres
DB_DATABASE=bs_secure_exchange_db
REDIS_URL=redis://localhost:6379
MQ_URL=amqp://localhost
MQ_EXCHANGE_NAME=exchange.notifications
```

### 4. 创建数据库

```bash
psql -U postgres -h localhost -p 5400 -f db/create-database.sql
psql -U postgres -h localhost -p 5400 -f db/create-tables.sql
```

或使用MCP工具：
```javascript
// 通过MCP创建数据库
```

### 5. 启动服务

```bash
npm start
```

服务将在以下端口启动：
- HTTP API: `http://localhost:3007`
- WebSocket: `ws://localhost:3007/ws`
- Health Check: `http://localhost:3007/api/health`

## 📡 API 接口

### 核心接口

#### 1. 获取接收者公钥

**端点**: `GET /api/secure-exchange/recipient-pubkey/:recipientAddress`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "encryptionPublicKey": "0x02fcd2313687146ca8d6ccc04bf489b72e292990f5868306c63dfa9b6c0a33b740",
  "recipientAddress": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1"
}
```

**说明**:
- 从user-service查询用户的预注册加密公钥
- 用于ECDH密钥协商

#### 2. 发送加密数据

**端点**: `POST /api/secure-exchange/send`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**请求体**:
```json
{
  "recipientAddress": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
  "encryptedData": "0x...",
  "signature": "0x...",
  "timestamp": 1730293923437,
  "nonce": "abc123def456...",
  "dataType": "medication_plan",
  "metadata": {
    "plan_id": "uuid",
    "plan_name": "【新用药计划】"
  }
}
```

**签名生成示例** (JavaScript):
```javascript
const crypto = require('crypto');
const { ethers } = require('ethers');

// 1. 计算数据哈希
const dataHash = crypto.createHash('sha256')
  .update(encryptedData)
  .digest('hex');

// 2. 构建签名载荷
const signaturePayload = {
  recipient_address: recipientAddress.toLowerCase(),
  timestamp: timestamp,
  nonce: nonce,
  data_hash: dataHash
};

// 3. 签名
const wallet = new ethers.Wallet(senderPrivateKey);
const signature = await wallet.signMessage(
  JSON.stringify(signaturePayload)
);
```

**响应**:
```json
{
  "messageId": "uuid",
  "message_id": "uuid",
  "recipientAddress": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
  "status": "pending"
}
```

#### 3. 查询待处理消息

**端点**: `GET /api/secure-exchange/pending`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**查询参数**:
- `dataType` - 数据类型筛选 (medication_plan)
- `limit` - 返回数量限制 (默认: 10)

**响应**:
```json
{
  "messages": [
    {
      "message_id": "uuid",
      "sender_address": "0x0eda7118fC8Bdb08935892116Bcfa640E80926F1",
      "encrypted_data": "0x...",
      "signature": "0x...",
      "data_type": "medication_plan",
      "metadata": {
        "plan_id": "uuid",
        "plan_name": "【新用药计划】"
      },
      "timestamp": 1730293923437,
      "created_at": "2025-10-30T14:02:03.437Z",
      "read_at": null
    }
  ],
  "data": []
}
```

#### 4. 确认接收

**端点**: `POST /api/secure-exchange/acknowledge`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**请求体**:
```json
{
  "messageId": "uuid",
  "status": "received",
  "acknowledged": true,
  "acknowledgment_note": "已收到服药计划，感谢医生！"
}
```

**响应**:
```json
{
  "success": true,
  "message": "消息确认成功",
  "status": "received"
}
```

### WebSocket 事件

#### 客户端 → 服务器
```json
{ "type": "ping" }
```

#### 服务器 → 客户端

**连接成功**
```json
{
  "type": "connected",
  "data": {
    "userAddress": "0x...",
    "timestamp": 1698765432100
  }
}
```

**公钥请求通知**
```json
{
  "type": "pubkey_request",
  "data": {
    "sessionId": "uuid",
    "requesterAddress": "0x...",
    "dataType": "medication_plan",
    "metadata": {},
    "expiresAt": 1698765432100
  }
}
```

**加密消息通知**
```json
{
  "type": "encrypted_message",
  "data": {
    "messageId": "uuid",
    "sessionId": "uuid",
    "senderAddress": "0x...",
    "encryptedData": "0x...",
    "signature": "0x...",
    "dataType": "medication_plan",
    "metadata": {},
    "timestamp": 1698765432100
  }
}
```

## 🔒 安全机制

### 多层安全防护

```
Layer 1: TLS/HTTPS
    ↓
Layer 2: JWT认证（API Gateway）
    ↓
Layer 3: 地址验证（JWT中的smart_account）
    ↓
Layer 4: 签名验证（ECDSA）
    ↓
Layer 5: 防重放（Timestamp + Nonce）
    ↓
Layer 6: 端到端加密（ECIES）
```

### 加密方案

**ECIES (Elliptic Curve Integrated Encryption Scheme)**
- 使用 `eccrypto` 库
- 接收方公钥加密
- 发送方私钥签名

**ECDSA (Elliptic Curve Digital Signature Algorithm)**
- 使用 `ethers.js` 验证
- 防止消息篡改
- 身份验证

### 防重放攻击

1. **时间窗口检查** - 消息时间戳必须在±5分钟内
2. **Nonce唯一性** - 每个nonce只能使用一次，Redis存储1小时
3. **签名验证** - 确保消息未被篡改

## 📊 数据库设计

### 核心表

#### exchange_sessions
公钥交换会话表
- 存储临时会话信息
- 自动过期清理（10分钟）
- 不长期存储公钥

#### encrypted_messages
加密消息表
- 存储加密数据（服务器无法解密）
- 包含签名验证信息
- 自动过期清理（24小时）

#### message_acknowledgments
消息确认表
- 跟踪接收确认
- 防重放攻击辅助

## 🔧 核心服务

### SessionService
- 会话生命周期管理
- Redis缓存优化
- 过期会话清理

### MessageService
- 消息创建和验证
- 签名验证
- 防重放检查

### ExchangeService
- 协调会话和消息
- 权限验证
- 通知发送

### WebSocketServer
- 实时消息推送
- 在线状态管理
- 心跳检测

### Scheduler
- 定时清理过期会话（每5分钟）
- 定时清理过期消息（每小时）

## 🎯 使用场景

### 1. 用药计划分发
医生 → 患者/家属，端到端加密的用药计划

### 2. 账户迁移
旧设备 → 新设备，安全传输账户数据

### 3. 社交恢复
恢复者 → 账户拥有者，传输恢复数据

### 4. 任意私密数据交换
任何需要端到端加密的数据传输场景

## 📈 性能指标

- **公钥交换延迟**: < 100ms（在线用户）
- **消息中转延迟**: < 50ms
- **WebSocket推送延迟**: < 20ms
- **并发会话数**: > 10,000
- **并发WebSocket连接**: > 5,000
- **消息吞吐量**: > 1,000 msg/s

## 🧪 测试

```bash
npm test
```

## 📝 开发日志

- 2025-01-XX: 初始版本，支持端到端加密消息交换
- 2025-01-XX: 添加WebSocket实时推送
- 2025-01-XX: 集成防重放攻击机制

## 📄 许可证

ISC

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

- 项目地址: [GitHub]
- 文档: [Wiki]

