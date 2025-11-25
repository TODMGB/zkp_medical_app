# 🔧 Notification Service 部署指南

## 📋 前置条件

### 1. 安装Node.js

```bash
# 检查是否已安装
node --version
# 应该显示 v16.x 或更高版本

# 如未安装，从 https://nodejs.org/ 下载安装
```

### 2. 安装PostgreSQL

```powershell
# Windows下使用Chocolatey安装
choco install postgresql

# 或从 https://www.postgresql.org/download/ 下载安装

# 启动PostgreSQL服务
Start-Service postgresql-x64-14
```

### 3. 安装Redis

```powershell
# Windows下可以使用Memurai（Redis的Windows兼容版本）
# 下载地址: https://www.memurai.com/

# 或使用Docker
docker run -d -p 6379:6379 redis:latest
```

### 4. 安装RabbitMQ

```powershell
# Windows下使用Chocolatey安装
choco install rabbitmq

# 或从 https://www.rabbitmq.com/download.html 下载安装

# 启动RabbitMQ服务
Start-Service RabbitMQ
```

## 🚀 部署步骤

### 步骤1：克隆代码

```bash
cd Elder_Medical_ZKP_project
cd notification-service
```

### 步骤2：安装依赖

```bash
npm install
```

### 步骤3：配置环境变量

创建 `.env` 文件（可以复制`.env.example`）：

```bash
PORT=3006
GRPC_PORT=50056
JWT_SECRET=your_jwt_secret_key_here

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456
DB_DATABASE=notification_db

REDIS_URL=redis://localhost:6379

MQ_URL=amqp://localhost
MQ_EXCHANGE_NAME=exchange.notifications

CORS_ALLOW_ALL=true
```

### 步骤4：初始化数据库

```powershell
cd db
.\init-database.ps1
```

如果脚本执行失败，可以手动执行：

```bash
# 连接PostgreSQL
psql -U postgres

# 执行SQL脚本
\i create-notification-database.sql
```

### 步骤5：启动服务

```bash
# 返回到notification-service根目录
cd ..

# 启动服务
npm start
```

成功启动后会显示：

```
╔════════════════════════════════════════════════════╗
║   🔔 Notification Service Started Successfully    ║
╠════════════════════════════════════════════════════╣
║   HTTP Server:   http://localhost:3006             ║
║   WebSocket:     ws://localhost:3006/socket.io     ║
║   gRPC Server:   localhost:50056                   ║
╚════════════════════════════════════════════════════╝
```

### 步骤6：集成API Gateway（可选）

修改 API Gateway 配置以支持WebSocket代理：

在 `api-gateway/server.js` 中已经配置好了WebSocket代理：

```javascript
const wsProxies = [
  {
    path: '/ws/notification',
    target: 'ws://localhost:3006'
  }
];
```

客户端可以通过API Gateway连接：

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/notification/socket.io?token=YOUR_JWT');
```

## ✅ 验证部署

### 1. 健康检查

```bash
curl http://localhost:3006/health
```

应该返回：

```json
{
  "status": "UP",
  "service": "notification-service",
  "websocket": {
    "path": "/socket.io",
    "clients": 0
  },
  "timestamp": "2025-10-28T10:00:00.000Z"
}
```

### 2. 测试通知发送

使用提供的HTTP测试文件：

```bash
# 打开 httpTest/notification.http
# 使用REST Client插件发送请求
```

或使用curl：

```bash
curl -X POST http://localhost:3006/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_address": "0x1234567890abcdef1234567890abcdef12345678",
    "type": "SYSTEM_NOTIFICATION",
    "priority": "NORMAL",
    "title": "测试通知",
    "body": "这是一条测试通知",
    "channels": ["websocket"]
  }'
```

### 3. 测试WebSocket连接

在浏览器控制台执行：

```javascript
const token = 'your_jwt_token_here';
const ws = new WebSocket(`ws://localhost:3006/socket.io?token=${token}`);

ws.onopen = () => console.log('✅ Connected to notification service');
ws.onmessage = (e) => console.log('📥 Received:', JSON.parse(e.data));
ws.onerror = (e) => console.error('❌ Error:', e);
ws.onclose = () => console.log('🔌 Disconnected');

// 发送心跳
ws.send(JSON.stringify({ type: 'ping' }));
```

## 🔧 故障排查

### 问题1：无法连接PostgreSQL

```bash
# 检查PostgreSQL服务是否运行
Get-Service postgresql*

# 如果未运行，启动服务
Start-Service postgresql-x64-14

# 检查端口是否被占用
netstat -ano | findstr :5432
```

### 问题2：无法连接Redis

```bash
# 检查Redis服务
redis-cli ping
# 应该返回 PONG

# 如果连接失败，检查Redis服务是否启动
Get-Service redis*
Start-Service redis
```

### 问题3：无法连接RabbitMQ

```bash
# 检查RabbitMQ服务
Get-Service RabbitMQ

# 访问管理界面
# http://localhost:15672
# 默认用户名/密码: guest/guest
```

### 问题4：WebSocket连接失败

1. 检查JWT Token是否正确
2. 检查API Gateway是否正确配置WebSocket代理
3. 检查防火墙是否阻止了WebSocket连接
4. 查看浏览器控制台错误信息

### 问题5：通知未推送

1. 检查用户是否在线（WebSocket连接）
2. 检查RabbitMQ消费者是否正常运行
3. 查看服务日志：`[MQ Consumer]` 和 `[WebSocket]` 相关日志

## 📊 监控和日志

### 查看服务日志

服务日志会输出到控制台，包括：

- `[WebSocket]` - WebSocket连接和消息
- `[MQ Consumer]` - 消息队列消费
- `[MQ Producer]` - 消息发布
- `[Notification Service]` - 通知业务逻辑
- `[WS Proxy]` - API Gateway的WebSocket代理

### 监控在线用户数

```bash
# Redis命令行
redis-cli

# 查看在线用户
HGETALL online_users

# 查看WebSocket连接
KEYS ws:*
```

### 监控RabbitMQ队列

访问RabbitMQ管理界面：

```
http://localhost:15672
用户名: guest
密码: guest
```

查看队列：
- `notification.high` - 高优先级队列
- `notification.normal` - 普通优先级队列
- `notification.low` - 低优先级队列

## 🎯 性能优化建议

1. **Redis缓存**：已启用未读数量缓存，5分钟过期
2. **消息队列**：使用多优先级队列，合理分配prefetch值
3. **WebSocket连接**：定期清理死连接（30秒心跳）
4. **数据库索引**：已创建必要索引
5. **过期通知清理**：建议设置定时任务清理30天前的通知

## 📚 相关文档

- [README.md](./README.md) - 功能特性和API文档
- [db/README.md](./db/README.md) - 数据库设计文档
- [httpTest/notification.http](./httpTest/notification.http) - API测试用例

## 🆘 获取帮助

如遇到问题，请：

1. 查看服务日志
2. 检查所有依赖服务是否正常运行
3. 确认配置文件是否正确
4. 参考故障排查章节

祝您部署顺利！ 🎉

