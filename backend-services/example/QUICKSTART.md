# ⚡ 5分钟快速开始

按照以下步骤，快速启动一个新的微服务！

## 步骤 1: 复制模板 (30秒)

```bash
# 复制 example 目录作为新服务
cp -r example my-new-service

# 进入新服务目录
cd my-new-service
```

## 步骤 2: 安装依赖 (1分钟)

```bash
npm install
```

## 步骤 3: 配置环境变量 (1分钟)

创建 `.env` 文件：

```bash
# Windows
copy ENV_SETUP.md .env

# macOS/Linux
cat > .env << 'EOF'
PORT=3000
JWT_SECRET=elder_medical_zkp_secret_key_2024
CORS_ALLOW_ALL=true
DB_HOST=localhost
DB_PORT=5400
DB_USER=postgres
DB_PASSWORD=TJUtjjj66
DB_DATABASE=my_service_db
REDIS_URL=redis://localhost:6379
MQ_URL=amqp://localhost
MQ_EXCHANGE_NAME=exchange.notifications
WS_PATH=/ws
EOF
```

或者直接复制以下内容到 `.env`:

```env
PORT=3000
JWT_SECRET=elder_medical_zkp_secret_key_2024
CORS_ALLOW_ALL=true
DB_HOST=localhost
DB_PORT=5400
DB_USER=postgres
DB_PASSWORD=TJUtjjj66
DB_DATABASE=my_service_db
REDIS_URL=redis://localhost:6379
MQ_URL=amqp://localhost
MQ_EXCHANGE_NAME=exchange.notifications
WS_PATH=/ws
```

## 步骤 4: 创建数据库 (1分钟)

```powershell
# PowerShell
$env:PGPASSWORD = "TJUtjjj66"
psql -h localhost -p 5400 -U postgres -c "CREATE DATABASE my_service_db;"
Remove-Item Env:\PGPASSWORD
```

## 步骤 5: 启动服务 (30秒)

```bash
npm start
```

## ✅ 验证服务

访问以下 URL 验证服务是否正常：

### 1. HTTP API 健康检查

```bash
curl http://localhost:3000/api/health
```

**预期输出:**
```json
{
  "status": "UP"
}
```

### 2. WebSocket 连接测试

```bash
# 使用 wscat（需要先安装: npm install -g wscat）
wscat -c "ws://localhost:3000/ws?token=YOUR_JWT_TOKEN"
```

**预期输出:**
```json
{"type":"connected","data":{"userAddress":"0x...","timestamp":1234567890}}
```

## 🎯 下一步

现在你的服务已经运行了！接下来可以：

### 1. 修改服务名称

**package.json:**
```json
{
  "name": "my-new-service",
  "description": "My awesome microservice"
}
```

### 2. 添加新的 API 端点

**src/routes/example.routes.js:**
```javascript
const { Router } = require('express');
const router = Router();

router.get('/hello', (req, res) => {
  res.json({ message: 'Hello from my new service!' });
});

module.exports = router;
```

**src/routes/index.js:**
```javascript
const exampleRouter = require('./example.routes');
router.use('/example', exampleRouter);
```

测试:
```bash
curl http://localhost:3000/api/example/hello
```

### 3. 添加数据库表

**创建 SQL 文件 `db/create-tables.sql`:**
```sql
CREATE TABLE IF NOT EXISTS my_table (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**执行:**
```powershell
$env:PGPASSWORD = "TJUtjjj66"
psql -h localhost -p 5400 -U postgres -d my_service_db -f db/create-tables.sql
Remove-Item Env:\PGPASSWORD
```

### 4. 添加 MQ 消费者

**src/mq/consumers/my.consumer.js:**
```javascript
async function handleMyEvent(event) {
  console.log('Received event:', event);
  // 处理业务逻辑
}

module.exports = { handleMyEvent };
```

**在 src/mq/index.js 中注册:**
```javascript
const { handleMyEvent } = require('./consumers/my.consumer');

// 创建队列并绑定
const myQueue = await channel.assertQueue('my.events', { durable: true });
await channel.bindQueue(myQueue.queue, EXCHANGE_NAME, 'my.#');

// 消费消息
channel.consume(myQueue.queue, async (msg) => {
  if (msg) {
    const event = JSON.parse(msg.content.toString());
    await handleMyEvent(event);
    channel.ack(msg);
  }
});
```

### 5. 集成到 API Gateway

参考 `README.md` 的 "集成到 API Gateway" 部分。

## 📚 完整文档

- [README.md](./README.md) - 完整文档
- [ENV_SETUP.md](./ENV_SETUP.md) - 环境变量配置详解

## 🆘 遇到问题？

### 服务启动失败

**检查前置条件:**
```bash
# PostgreSQL
psql --version

# Redis
redis-cli ping

# RabbitMQ
rabbitmqctl status
```

### 端口被占用

修改 `.env` 中的 `PORT`:
```env
PORT=3001  # 使用其他端口
```

### 数据库连接失败

检查 `.env` 中的数据库配置是否正确。

## 🎉 完成！

你的微服务现在已经运行了！开始添加你的业务逻辑吧！

**有问题？查看完整文档或提交 Issue！** 📝

