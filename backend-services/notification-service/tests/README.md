# 🧪 Notification Service 测试套件

完整的测试脚本集合，用于验证 Notification Service 的所有功能。

## 📋 测试文件说明

| 文件 | 测试内容 | 运行时间 |
|------|---------|---------|
| `test-http-api.js` | HTTP REST API 接口测试 | ~5秒 |
| `test-websocket.js` | WebSocket 连接和实时推送测试 | ~10秒 |
| `test-mq.js` | RabbitMQ 消息队列测试 | ~5秒 |
| `test-complete-flow.js` | 完整业务流程测试（端到端） | ~15秒 |

## 🚀 快速开始

### 前置条件

1. **确保所有服务正在运行**：
   ```bash
   # PostgreSQL
   Get-Service postgresql*
   
   # Redis
   redis-cli ping
   
   # RabbitMQ
   Get-Service RabbitMQ
   
   # Notification Service
   cd notification-service
   npm start
   ```

2. **安装测试依赖**（已包含在package.json中）：
   ```bash
   npm install
   ```

### 运行测试

#### 方式1：逐个运行测试

```bash
# 测试 HTTP API
node tests/test-http-api.js

# 测试 WebSocket
node tests/test-websocket.js

# 测试 消息队列
node tests/test-mq.js

# 测试 完整流程
node tests/test-complete-flow.js
```

#### 方式2：运行所有测试

```bash
npm test
```

## 📖 详细测试说明

### 1️⃣ HTTP API 测试 (`test-http-api.js`)

测试所有 HTTP REST API 端点：

**测试项目**：
- ✅ 健康检查 (`/health`)
- ✅ 发送通知 (`POST /api/notifications/send`)
- ✅ 获取通知列表 (`GET /api/notifications`)
- ✅ 获取未读数量 (`GET /api/notifications/unread/count`)
- ✅ 标记单条已读 (`PUT /api/notifications/:id/read`)
- ✅ 标记全部已读 (`PUT /api/notifications/read-all`)

**运行示例**：
```bash
node tests/test-http-api.js
```

**预期输出**：
```
╔════════════════════════════════════════════════════╗
║        🧪 Notification Service HTTP API Tests     ║
╚════════════════════════════════════════════════════╝

📋 Test 1: Health Check
   ✅ Service is healthy
   → Service: notification-service
   → WebSocket clients: 0

📋 Test 2: Send Notification (High Priority)
   ✅ Notification sent successfully
   → Notification ID: 0x...
   → Type: MEDICATION_REMINDER
   → Priority: HIGH

...

✅ All HTTP API tests passed!
```

---

### 2️⃣ WebSocket 测试 (`test-websocket.js`)

测试 WebSocket 实时连接和消息推送：

**测试项目**：
- ✅ WebSocket 连接建立
- ✅ 接收欢迎消息
- ✅ 心跳检测 (ping/pong)
- ✅ 获取未读数量
- ✅ 实时通知推送
- ✅ 标记已读

**运行示例**：
```bash
node tests/test-websocket.js
```

**预期输出**：
```
╔════════════════════════════════════════════════════╗
║        🔌 Notification Service WebSocket Tests    ║
╚════════════════════════════════════════════════════╝

📡 Connecting to WebSocket server...
   URL: ws://localhost:3006/socket.io?token=***

✅ Test 1: WebSocket Connection Established

📥 Received message: connected
✅ Test 2: Received Welcome Message
   → Message: Connected to notification service
   → User: 0x1234...

📤 Test 3: Sending Ping...
📥 Received message: pong
✅ Test 3: Heartbeat (Ping/Pong) Working

...

✅ All WebSocket tests passed! (4/4)
```

---

### 3️⃣ 消息队列测试 (`test-mq.js`)

测试 RabbitMQ 消息队列的发布和消费：

**测试项目**：
- ✅ 连接到 RabbitMQ
- ✅ 验证交换机配置
- ✅ 发布高优先级通知
- ✅ 发布普通优先级通知
- ✅ 发布低优先级通知
- ✅ 批量发送测试

**运行示例**：
```bash
node tests/test-mq.js
```

**预期输出**：
```
╔════════════════════════════════════════════════════╗
║      📨 Notification Service MQ Tests             ║
╚════════════════════════════════════════════════════╝

📋 Test 1: Connecting to RabbitMQ...
   ✅ Connected to RabbitMQ successfully

📋 Test 2: Verifying Exchange...
   ✅ Exchange "exchange.notifications" is ready

📋 Test: Publishing HIGH Priority Notification...
   ✅ Published successfully
   → Routing Key: notification.high.medication_reminder
   → Title: 🔴 高优先级 - 紧急用药提醒

...

✅ All MQ tests passed!
```

**注意**：运行此测试后，检查 notification-service 控制台，应该能看到消费者接收并处理消息的日志。

---

### 4️⃣ 完整流程测试 (`test-complete-flow.js`)

模拟真实业务场景的端到端测试：

**测试场景**：
```
患者上线 → 医生创建用药方案 → 实时推送通知 → 患者查看并标记已读
```

**测试流程**：
1. 患者连接 WebSocket（建立长连接）
2. 医生服务发布通知到 MQ
3. Notification Service 消费消息
4. 实时推送给在线患者
5. 患者标记通知已读

**运行示例**：
```bash
node tests/test-complete-flow.js
```

**预期输出**：
```
╔════════════════════════════════════════════════════╗
║    🎬 Complete Notification Flow Test Scenario    ║
╠════════════════════════════════════════════════════╣
║  测试场景：医生创建用药方案 → 实时推送给患者      ║
╚════════════════════════════════════════════════════╝

📱 Step 1: Patient connects to WebSocket...
   ✅ Patient is online and ready to receive notifications

🏥 Step 2: Doctor service connects to Message Queue...
   ✅ Doctor service ready to send notifications

💊 Step 3: Doctor creates medication plan...
   📤 Published: 🔔 新的用药方案
   ✅ Medication plan created and notification published

   🔔 Real-time notification received! (#1)
      → Title: 🔔 新的用药方案
      → Body: 张医生为您创建了新的用药方案，请及时查看
      → Type: NEW_MEDICATION_PLAN
      → Priority: HIGH

   👆 Patient clicks notification, marking as read...
   ✅ Notification marked as read

...

╔════════════════════════════════════════════════════╗
║              ✅ Test Summary                       ║
╠════════════════════════════════════════════════════╣
║  Total notifications received: 6                   ║
║  WebSocket connection: ✅ Working                  ║
║  Message Queue: ✅ Working                         ║
║  Real-time push: ✅ Working                        ║
║  Priority queues: ✅ Working                       ║
╚════════════════════════════════════════════════════╝

🎉 Complete flow test PASSED!
```

---

## 🔧 配置说明

### 修改测试配置

测试脚本中的配置可以根据需要修改：

```javascript
// 服务地址
const BASE_URL = 'http://localhost:3006';
const WS_URL = 'ws://localhost:3006/socket.io';
const MQ_URL = 'amqp://localhost';

// 测试用的JWT Token（需要替换为真实token）
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 生成测试Token

使用 jwt.io 或在代码中生成：

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign({
  smart_account: '0x1234567890abcdef1234567890abcdef12345678',
  role: 'elderly'
}, 'your_jwt_secret_key_here');

console.log(token);
```

---

## 🐛 故障排查

### 问题1：连接被拒绝

```
❌ WebSocket error: connect ECONNREFUSED
```

**解决方案**：
- 确保 notification-service 正在运行
- 检查端口配置（默认3006）

### 问题2：认证失败

```
❌ WebSocket error: Authentication failed
```

**解决方案**：
- 检查 JWT Token 是否正确
- 确认 JWT_SECRET 与服务配置一致

### 问题3：MQ连接失败

```
❌ Failed to connect to RabbitMQ
```

**解决方案**：
- 确保 RabbitMQ 服务正在运行：`Get-Service RabbitMQ`
- 检查 RabbitMQ 管理界面：http://localhost:15672

### 问题4：通知未接收

**解决方案**：
1. 检查 notification-service 控制台日志
2. 检查 RabbitMQ 队列状态
3. 确认用户地址匹配

---

## 📊 性能测试

测试不同负载下的性能表现：

### 批量发送测试

修改 `test-mq.js` 中的批量数量：

```javascript
// 发送1000条通知
for (let i = 1; i <= 1000; i++) {
  await publishTestNotification(...);
}
```

### 并发连接测试

创建多个WebSocket连接：

```javascript
const connections = [];
for (let i = 0; i < 100; i++) {
  const ws = new WebSocket(`${WS_URL}?token=${TEST_TOKEN}`);
  connections.push(ws);
}
```

---

## 📝 测试报告

建议在每次重大更新后运行所有测试，并记录结果：

```
测试日期: 2025-10-28
测试人员: [Your Name]
环境: Development

测试结果:
✅ HTTP API Tests: PASSED (6/6)
✅ WebSocket Tests: PASSED (4/4)
✅ MQ Tests: PASSED (6/6)
✅ Complete Flow: PASSED

性能指标:
- 通知发送延迟: < 100ms
- WebSocket连接数: 100+ 并发
- 消息吞吐量: 1000+ msg/s
```

---

## 🎯 下一步

1. **集成测试框架** - 使用 Jest 或 Mocha
2. **自动化CI/CD** - GitHub Actions
3. **性能基准测试** - k6 或 Artillery
4. **覆盖率报告** - Istanbul/nyc

---

## 📚 相关文档

- [Notification Service README](../README.md)
- [API文档](../httpTest/notification.http)
- [部署指南](../SETUP.md)

祝测试顺利！ 🚀

