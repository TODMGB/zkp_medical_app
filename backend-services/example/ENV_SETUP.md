# 🔧 环境变量配置指南

## 快速配置

创建 `.env` 文件并复制以下内容：

```env
# ============================================================
# 微服务环境变量配置
# ============================================================

# 服务端口（HTTP 和 WebSocket 共用同一端口）
PORT=3000
GRPC_PORT=50051

# JWT密钥（与其他服务保持一致）
JWT_SECRET=elder_medical_zkp_secret_key_2024

# CORS配置
CORS_ALLOW_ALL=true
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# 数据库配置
DB_HOST=localhost
DB_PORT=5400
DB_USER=postgres
DB_PASSWORD=TJUtjjj66
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

## 📋 配置项详解

### 服务端口

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | HTTP 和 WebSocket 共用端口 | 3000 |
| `GRPC_PORT` | gRPC 服务端口 | 50051 |

**注意**: HTTP 和 WebSocket 使用同一个端口是标准做法。

### JWT 配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 签名密钥 | your_jwt_secret_key_here |

**重要**: 生产环境必须使用强密钥，并与其他微服务保持一致。

### CORS 配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `CORS_ALLOW_ALL` | 是否允许所有源 | false |
| `CORS_ALLOWED_ORIGINS` | 允许的源列表（逗号分隔） | 空 |

**开发环境**: 设置 `CORS_ALLOW_ALL=true`  
**生产环境**: 设置 `CORS_ALLOW_ALL=false` 并指定具体的 `CORS_ALLOWED_ORIGINS`

### 数据库配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_HOST` | PostgreSQL 主机 | localhost |
| `DB_PORT` | PostgreSQL 端口 | 5432 |
| `DB_USER` | 数据库用户名 | postgres |
| `DB_PASSWORD` | 数据库密码 | 123456 |
| `DB_DATABASE` | 数据库名称 | service_db |

### Redis 配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `REDIS_URL` | Redis 连接 URL | redis://localhost:6379 |

**格式**: `redis://[username]:[password]@[host]:[port]/[db]`

### RabbitMQ 配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MQ_URL` | RabbitMQ 连接 URL | amqp://localhost |
| `MQ_EXCHANGE_NAME` | 交换机名称 | exchange.notifications |

**格式**: `amqp://[username]:[password]@[host]:[port]/[vhost]`

### WebSocket 配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `WS_PATH` | WebSocket 路径 | /ws |
| `WS_HEARTBEAT_INTERVAL` | 心跳间隔（毫秒） | 30000 |

## 🔒 安全建议

### ⚠️ 生产环境必做

1. **更改所有默认密码和密钥**
2. **设置 `CORS_ALLOW_ALL=false`**
3. **指定具体的 `CORS_ALLOWED_ORIGINS`**
4. **使用强密码**（至少 16 字符，包含大小写字母、数字、特殊字符）
5. **不要将 `.env` 文件提交到 Git**

### ✅ 密钥生成建议

```bash
# 生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 📝 环境特定配置

你可以创建多个环境配置文件：

- `.env.development` - 开发环境
- `.env.staging` - 测试环境
- `.env.production` - 生产环境

然后在启动时指定：

```bash
# 开发环境
NODE_ENV=development npm start

# 生产环境
NODE_ENV=production npm start
```

## 🔍 配置验证

启动服务后，检查日志确认配置是否正确：

```bash
npm start
```

应该看到类似输出：

```
============================================================
🔧 正在初始化微服务...
============================================================
CORS allowAll: true
CORS allowedOrigins: [ 'http://localhost:3000', 'http://localhost:8080' ]
[WebSocket] Initializing WebSocket server...
[WebSocket] ✅ WebSocket server initialized successfully
✅ WebSocket服务器已启动
[MQ Client] 初始化成功
✅ MQ消费者已启动
============================================================
🚀 微服务启动成功！
============================================================
📡 HTTP API:    http://localhost:3000
🔌 WebSocket:   ws://localhost:3000/ws
🏥 Health:      http://localhost:3000/api/health
============================================================
```

## 🆘 常见问题

### Q: 数据库连接失败

**A**: 检查以下内容：
- PostgreSQL 服务是否运行
- 端口是否正确（默认 5432）
- 用户名和密码是否正确
- 数据库是否已创建

### Q: Redis 连接失败

**A**: 确认：
- Redis 服务是否运行 (`redis-cli ping`)
- URL 格式是否正确
- 防火墙是否允许连接

### Q: RabbitMQ 连接失败

**A**: 验证：
- RabbitMQ 服务是否运行
- Management UI 是否可访问 (http://localhost:15672)
- 用户权限是否正确

### Q: WebSocket 连接被拒绝

**A**: 检查：
- JWT token 是否有效
- `WS_PATH` 是否正确
- 用户地址是否在 token 中

## 📚 更多资源

- [dotenv 文档](https://github.com/motdotla/dotenv)
- [Express 配置最佳实践](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js 环境变量管理](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)

---

**配置完成后，记得测试所有功能是否正常工作！** ✅

