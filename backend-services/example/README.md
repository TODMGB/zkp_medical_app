# 🏗️ 微服务脚手架模板

这是一个功能完整的微服务模板，包含了构建现代化微服务所需的所有基础设施组件。

## ✨ 特性

- ✅ **Express HTTP Server** - RESTful API 服务
- ✅ **WebSocket Server** - 实时双向通信
- ✅ **RabbitMQ Integration** - 异步消息队列
- ✅ **PostgreSQL Database** - 关系型数据库
- ✅ **Redis Cache** - 缓存和会话管理
- ✅ **gRPC Support** - 高性能 RPC 通信
- ✅ **JWT Authentication** - Token 认证
- ✅ **CORS Middleware** - 跨域资源共享
- ✅ **Security Middleware** - Helmet 安全防护
- ✅ **Request Logging** - Morgan 请求日志
- ✅ **Error Handling** - 统一错误处理
- ✅ **Environment Config** - dotenv 配置管理
- ✅ **Graceful Shutdown** - 优雅关闭处理

## 📋 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| **Runtime** | Node.js | >= 18.x |
| **Framework** | Express | 5.1.0 |
| **WebSocket** | ws | 8.18.0 |
| **Message Queue** | RabbitMQ (amqplib) | 0.10.9 |
| **Database** | PostgreSQL (pg) | 8.16.3 |
| **Cache** | Redis | 5.8.3 |
| **RPC** | gRPC | 1.14.0 |
| **Authentication** | JWT | 9.0.2 |
| **Security** | Helmet | 8.1.0 |

## 🚀 快速开始

### 1. 复制模板

```bash
# 创建新服务
cp -r example my-new-service
cd my-new-service
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件：

```env
# 服务端口（HTTP 和 WebSocket 共用同一端口）
PORT=3000
GRPC_PORT=50051

# JWT密钥
JWT_SECRET=elder_medical_zkp_secret_key_2024

# CORS配置
CORS_ALLOW_ALL=true
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# 数据库配置
DB_HOST=localhost
DB_PORT=5400
DB_USER=postgres
DB_PASSWORD=your_password
DB_DATABASE=service_db

# Redis配置
REDIS_URL=redis://localhost:6379

# RabbitMQ配置
MQ_URL=amqp://localhost
MQ_EXCHANGE_NAME=exchange.notifications

# WebSocket配置
WS_PATH=/ws
WS_HEARTBEAT_INTERVAL=30000
```

### 4. 启动服务

```bash
npm start
```

服务将在以下端口启动：
- **HTTP API**: `http://localhost:3000`
- **WebSocket**: `ws://localhost:3000/ws`
- **Health Check**: `http://localhost:3000/api/health`
- **gRPC** (可选): `localhost:50051`

## 📁 项目结构

```
example/
├── server.js                      # 服务入口
├── package.json                   # 项目配置
├── .env.example                   # 环境变量模板
├── .gitignore                     # Git忽略文件
└── src/
    ├── config/
    │   └── index.js              # 统一配置管理
    ├── middleware/
    │   ├── cors.middleware.js    # CORS跨域
    │   ├── security.middleware.js # 安全防护
    │   ├── requestLogger.middleware.js # 请求日志
    │   ├── errorHandler.middleware.js  # 错误处理
    │   └── notFoundHandler.middleware.js # 404处理
    ├── routes/
    │   ├── index.js              # 路由入口
    │   └── users.routes.js       # 用户路由示例
    ├── controllers/
    │   └── user.controller.js    # 控制器示例
    ├── services/
    │   └── user.service.js       # 业务逻辑示例
    ├── entity/
    │   ├── db.js                 # 数据库连接池
    │   └── user.entity.js        # 数据访问层示例
    ├── websocket/
    │   └── server.js             # WebSocket服务器
    ├── mq/
    │   ├── client.js             # MQ客户端
    │   ├── index.js              # MQ消费者启动器
    │   ├── producer.js           # MQ生产者
    │   └── consumers/
    │       └── user.consumer.js  # 消费者示例
    ├── redis/
    │   └── client.js             # Redis客户端
    └── rpc/
        ├── server.js             # gRPC服务器
        ├── handlers/
        │   └── user.handler.js   # gRPC处理器
        ├── clients/
        │   └── user.client.js    # gRPC客户端
        └── proto/
            └── user.proto        # protobuf定义
```

## 🔧 核心功能说明

### WebSocket 服务器

**位置**: `src/websocket/server.js`

**特性**:
- 支持两种认证方式：
  - API Gateway 代理认证（推荐）
  - 直接 JWT Token 认证
- 自动心跳检测（30秒）
- Redis 在线状态管理
- 用户地址统一小写处理

**使用示例**:
```javascript
const wsServer = require('./src/websocket/server');

// 发送消息给指定用户
wsServer.sendToUser('0x123...', {
  type: 'notification',
  data: { message: 'Hello!' }
});

// 广播消息
wsServer.broadcast({
  type: 'announcement',
  data: { text: 'System maintenance' }
});

// 检查用户是否在线
const isOnline = wsServer.isUserOnline('0x123...');
```

### MQ 消息队列

**位置**: `src/mq/`

**组件**:
- `client.js` - MQ连接管理
- `index.js` - 消费者启动器
- `producer.js` - 消息发布
- `consumers/` - 消息消费者

**使用示例**:
```javascript
// 发布消息
const { publishUserCreated } = require('./src/mq/producer');
await publishUserCreated({ userId: 123, name: 'John' });

// 消费消息（在 index.js 中配置）
async function handleUserEvent(event, wss) {
  console.log('User event:', event);
  // 处理业务逻辑
}
```

### 配置管理

**位置**: `src/config/index.js`

所有配置都通过环境变量管理，支持默认值。

## 🔐 安全最佳实践

1. ✅ **永远不要提交 `.env` 文件到 Git**
2. ✅ **使用强密码和密钥**
3. ✅ **定期更新依赖包** (`npm update`)
4. ✅ **启用 HTTPS** (生产环境)
5. ✅ **限制 CORS 来源** (生产环境设置 `CORS_ALLOW_ALL=false`)
6. ✅ **使用环境变量管理敏感信息**
7. ✅ **实施速率限制** (API Gateway 层)

## 📊 HTTP 和 WebSocket 共享端口

本模板使用 **同一端口** 服务 HTTP 和 WebSocket：

```
                同一端口 (例如 3000)
                        |
        ┌───────────────┴───────────────┐
        |                               |
   HTTP 请求                      WebSocket 连接
  (GET, POST...)                (ws://.../ws)
        |                               |
   Express Router                 ws Server
```

**优点**:
- 简化部署（只需开放一个端口）
- 防火墙友好
- 符合 WebSocket 标准

## 🎯 开发工作流

### 1. 创建新的 API 端点

```javascript
// src/routes/example.routes.js
const { Router } = require('express');
const router = Router();

router.get('/example', (req, res) => {
  res.json({ message: 'Hello World' });
});

module.exports = router;
```

### 2. 注册路由

```javascript
// src/routes/index.js
const exampleRouter = require('./example.routes');
router.use('/example', exampleRouter);
```

### 3. 添加数据库操作

```javascript
// src/entity/example.entity.js
const pool = require('./db');

async function findAll() {
  const result = await pool.query('SELECT * FROM examples');
  return result.rows;
}

module.exports = { findAll };
```

### 4. 创建业务逻辑

```javascript
// src/services/example.service.js
const exampleEntity = require('../entity/example.entity');

async function getAllExamples() {
  return await exampleEntity.findAll();
}

module.exports = { getAllExamples };
```

### 5. 实现控制器

```javascript
// src/controllers/example.controller.js
const exampleService = require('../services/example.service');

async function list(req, res, next) {
  try {
    const examples = await exampleService.getAllExamples();
    res.json({ success: true, data: examples });
  } catch (error) {
    next(error);
  }
}

module.exports = { list };
```

## 🧪 测试

```bash
# 健康检查
curl http://localhost:3000/api/health

# WebSocket 连接测试
wscat -c ws://localhost:3000/ws?token=YOUR_JWT_TOKEN
```

## 📚 常见任务

### 添加新的 MQ 消费者

1. 在 `src/mq/consumers/` 创建新的消费者文件
2. 在 `src/mq/index.js` 中注册新队列
3. 实现消息处理逻辑

### 添加定时任务

```javascript
// 安装 node-cron
npm install node-cron

// 在 server.js 中添加
const cron = require('node-cron');

cron.schedule('0 * * * *', () => {
  console.log('每小时执行一次');
});
```

### 集成到 API Gateway

1. 在 API Gateway 的 `config/index.js` 添加服务 URL
2. 创建路由代理文件
3. 注册到主路由
4. 配置 WebSocket 代理
5. 添加数据库权限

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

ISC

---

**🎉 现在你有一个功能完整的微服务模板了！开始构建你的服务吧！**

