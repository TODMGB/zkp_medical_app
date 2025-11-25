# 🔔 Notification Service

实时消息通知服务 - 支持WebSocket推送、FCM推送和多优先级消息队列

## ✨ 功能特性

- ✅ **WebSocket 实时推送** - 使用原生`ws`库，轻量高效
- ✅ **多优先级消息队列** - 高/普通/低三级优先级，确保重要消息及时处理
- ✅ **多渠道推送** - WebSocket + FCM（Firebase Cloud Messaging）
- ✅ **在线状态管理** - Redis实时追踪用户在线状态
- ✅ **通知持久化** - PostgreSQL存储通知历史
- ✅ **gRPC 接口** - 支持微服务间高性能调用
- ✅ **HTTP REST API** - 标准RESTful接口

## 🏗️ 架构设计

```
┌─────────────┐
│   Client    │
│  (Mobile/   │
│    Web)     │
└──────┬──────┘
       │ WebSocket
       │ (ws://gateway:3000/ws/notification)
       ▼
┌─────────────────┐
│  API Gateway    │ ← WebSocket代理
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Notification Service :3006    │
│  ┌──────────────────────────┐   │
│  │  WebSocket Server (ws)   │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │    HTTP REST API         │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │    gRPC Server :50056    │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │  RabbitMQ Consumer       │   │
│  │  - High Priority Queue   │   │
│  │  - Normal Priority Queue │   │
│  │  - Low Priority Queue    │   │
│  └──────────────────────────┘   │
└────────┬────────────────────────┘
         │
    ┌────┴────┬──────────┬────────┐
    ▼         ▼          ▼        ▼
┌────────┐ ┌──────┐ ┌────────┐ ┌──────┐
│  Rabb │ │ Red │ │  Post  │ │ FCM  │
│  itMQ │ │ is  │ │  greSQL│ │ Push │
└────────┘ └──────┘ └────────┘ └──────┘
```

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 16.x
- PostgreSQL >= 13.x
- Redis >= 6.x
- RabbitMQ >= 3.x

### 2. 安装依赖

```bash
cd notification-service
npm install
```

### 3. 配置环境变量

复制`.env.example`为`.env`并修改配置：

```bash
# 服务端口
PORT=3006
GRPC_PORT=50056

# JWT密钥
JWT_SECRET=your_jwt_secret_key_here

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456
DB_DATABASE=notification_db

# Redis配置
REDIS_URL=redis://localhost:6379

# RabbitMQ配置
MQ_URL=amqp://localhost
MQ_EXCHANGE_NAME=exchange.notifications

# CORS配置
CORS_ALLOW_ALL=true
```

### 4. 初始化数据库

```powershell
cd db
.\init-database.ps1
```

或手动执行：

```bash
psql -U postgres -f db/create-notification-database.sql
```

### 5. 启动服务

```bash
npm start
```

服务启动后会显示：

```
╔════════════════════════════════════════════════════╗
║   🔔 Notification Service Started Successfully    ║
╠════════════════════════════════════════════════════╣
║   HTTP Server:   http://localhost:3006             ║
║   WebSocket:     ws://localhost:3006/socket.io     ║
║   gRPC Server:   localhost:50056                   ║
╚════════════════════════════════════════════════════╝
```

## 📡 API 接口

### 基础URL
- 直接访问: `http://localhost:3006/api/notification`
- 通过API Gateway: `http://localhost:3000/api/notification`

### HTTP REST API

#### 1. 获取通知列表

**端点**: `GET /api/notification/notifications`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**查询参数**:
- `status` - 通知状态 (unread/read)
- `limit` - 每页数量 (默认: 50)
- `offset` - 偏移量 (默认: 0)

**响应**:
```json
{
  "data": [
    {
      "notification_id": "uuid",
      "recipient_address": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
      "type": "medication_reminder",
      "priority": "high",
      "title": "用药提醒",
      "body": "该吃晚饭后的降压药了",
      "data": {
        "medication": "降压药",
        "time": "18:30"
      },
      "channels": ["push", "websocket"],
      "status": "sent",
      "created_at": "2025-10-30T14:02:03.437Z",
      "sent_at": "2025-10-30T14:02:03.500Z",
      "read_at": null
    }
  ]
}
```

#### 2. 获取未读数量

**端点**: `GET /api/notification/notifications/unread/count`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "count": 5,
  "data": {
    "count": 5
  }
}
```

#### 3. 标记单条已读

**端点**: `PUT /api/notification/notifications/:notificationId/read`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "success": true,
  "message": "通知已标记为已读",
  "data": {
    "notification_id": "uuid",
    "read_at": "2025-10-30T14:15:00.000Z"
  }
}
```

#### 4. 标记全部已读

**端点**: `PUT /api/notification/notifications/read-all`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "success": true,
  "message": "所有通知已标记为已读",
  "data": {
    "updated": 5
  }
}
```

#### 5. 删除通知

**端点**: `DELETE /api/notification/notifications/:notificationId`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "success": true,
  "message": "通知已删除"
}
```

### WebSocket 连接

#### 客户端连接示例

```javascript
const token = 'your_jwt_token';
const ws = new WebSocket(`ws://localhost:3000/ws/notification/socket.io?token=${token}`);

ws.onopen = () => {
  console.log('Connected to notification service');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'connected':
      console.log('Welcome:', data.data.message);
      break;
      
    case 'notification':
      // 处理新通知
      showNotification(data.data);
      break;
      
    case 'pong':
      // 心跳响应
      break;
  }
};

// 发送心跳
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);

// 标记已读
function markAsRead(notificationId) {
  ws.send(JSON.stringify({
    type: 'mark_read',
    notification_id: notificationId
  }));
}
```

### gRPC 接口

Proto定义：

```protobuf
service NotificationService {
  rpc SendNotification(NotificationRequest) returns (NotificationResponse);
  rpc GetNotifications(GetNotificationsRequest) returns (NotificationList);
}
```

## 🔧 集成到其他服务

### 通过RabbitMQ发送通知（推荐）

```javascript
// 在其他服务中发布通知事件
const { getChannel } = require('./mq/client');

async function sendNotification(notification) {
  const channel = await getChannel();
  const EXCHANGE_NAME = 'exchange.notifications';
  
  await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
  
  // 构建路由键：notification.{priority}.{type}
  const routingKey = `notification.${notification.priority.toLowerCase()}.${notification.type.toLowerCase()}`;
  
  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(notification)),
    { persistent: true }
  );
}

// 使用示例
await sendNotification({
  recipient_address: '0x1234...abcd',
  type: 'INVITATION_ACCEPTED',
  priority: 'NORMAL',
  title: '邀请已接受',
  body: '用户接受了您的邀请',
  channels: ['push', 'websocket']
});
```

### 通过HTTP REST API

```javascript
const response = await fetch('http://localhost:3006/api/notifications/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recipient_address: '0x1234...abcd',
    type: 'SYSTEM_NOTIFICATION',
    title: '系统通知',
    body: '您有新的消息'
  })
});
```

## 📊 数据库表结构

### notifications - 通知表

| 字段 | 类型 | 说明 |
|------|------|------|
| notification_id | VARCHAR(66) | 通知ID |
| recipient_address | VARCHAR(42) | 接收者地址 |
| type | VARCHAR(50) | 通知类型 |
| priority | VARCHAR(10) | 优先级 |
| title | VARCHAR(255) | 标题 |
| body | TEXT | 内容 |
| data | JSONB | 附加数据 |
| channels | TEXT[] | 推送渠道 |
| status | VARCHAR(20) | 状态 |
| created_at | TIMESTAMP | 创建时间 |
| sent_at | TIMESTAMP | 发送时间 |
| read_at | TIMESTAMP | 已读时间 |
| expires_at | TIMESTAMP | 过期时间 |

## 🎯 通知类型

```javascript
// 系统通知
SYSTEM_NOTIFICATION

// 用药相关
MEDICATION_REMINDER
NEW_MEDICATION_PLAN
MEDICATION_PLAN_UPDATED

// 关系管理
INVITATION_RECEIVED
INVITATION_ACCEPTED
INVITATION_REJECTED
RELATIONSHIP_SUSPENDED
RELATIONSHIP_RESUMED

// 账户管理
ACCOUNT_MIGRATION_INITIATED
RECOVERY_REQUEST_RECEIVED

// 权限管理
PERMISSION_GRANTED
PERMISSION_REVOKED
```

## 🔒 安全性

- ✅ JWT认证
- ✅ CORS跨域保护
- ✅ Helmet安全头
- ✅ 消息加密（可选）

## 📝 开发指南

### 项目结构

```
notification-service/
├── src/
│   ├── config/              # 配置文件
│   ├── controllers/         # 控制器
│   ├── entity/             # 数据访问层
│   ├── middleware/         # 中间件
│   ├── mq/                 # 消息队列
│   │   ├── client.js
│   │   ├── index.js
│   │   ├── producer.js
│   │   └── consumers/
│   ├── redis/              # Redis客户端
│   ├── routes/             # 路由
│   ├── rpc/                # gRPC服务
│   ├── services/           # 业务逻辑
│   └── websocket/          # WebSocket服务
├── db/                     # 数据库脚本
├── server.js               # 主入口
├── package.json
└── .env                    # 环境变量
```

### 添加新通知类型

1. 在其他服务发布事件
2. Notification Service自动消费并处理
3. 通过WebSocket实时推送给在线用户

## 📚 相关文档

- [WebSocket API文档](./docs/websocket-api.md)
- [gRPC API文档](./docs/grpc-api.md)
- [数据库设计](./db/README.md)

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

## 📄 License

MIT

