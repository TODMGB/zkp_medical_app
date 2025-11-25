# Secure Exchange Service - gRPC 服务指南

**版本**: 1.0.0  
**创建日期**: 2025-10-30  
**gRPC 端口**: 50057

---

## 📋 概述

Secure Exchange Service 现已支持 **gRPC** 服务，允许其他微服务（如 medication-service）通过 RPC 调用发送和接收加密数据。

---

## 🔌 gRPC 服务端点

### 服务地址
```
localhost:50057
```

### Proto 文件位置
```
proto/secure-exchange.proto
```

---

## 📡 可用的 RPC 方法

### 1. SendEncryptedMessage
**功能**: 发送加密消息给接收者

**请求参数**:
```protobuf
message EncryptedMessageRequest {
    string sender_address = 1;           // 发送者地址
    string recipient_address = 2;        // 接收者地址
    bytes encrypted_data = 3;            // 加密数据
    string data_type = 4;                // 数据类型
    string metadata = 5;                 // 元数据(JSON)
    string timestamp = 6;                // 时间戳
}
```

**响应**:
```protobuf
message EncryptedMessageResponse {
    string message_id = 1;               // 消息ID
    bytes encrypted_data = 2;            // 再次加密的数据
    string recipient_address = 3;        // 接收者地址
    string encrypted_at = 4;             // 加密时间
    bool success = 5;                    // 是否成功
    string error_message = 6;            // 错误信息
}
```

**示例调用** (Node.js):
```javascript
const result = await secureExchangeClient.sendEncryptedData({
    senderAddress: '0xDoctor...',
    recipientAddress: '0xPatient...',
    encryptedData: Buffer.from('...'),
    dataType: 'medication_plan',
    metadata: {
        plan_id: 'uuid',
        plan_name: '高血压治疗方案'
    }
});
```

---

### 2. GetEncryptedMessages
**功能**: 获取用户的加密消息列表

**请求参数**:
```protobuf
message GetMessagesRequest {
    string recipient_address = 1;        // 接收者地址
    int32 limit = 2;                     // 分页限制
    int32 offset = 3;                    // 分页偏移
    string data_type = 4;                // 过滤类型
    bool unread_only = 5;                // 只获取未读
}
```

**响应**:
```protobuf
message MessageList {
    repeated MessageSummary messages = 1; // 消息列表
    int32 total_count = 2;                // 总数
    int32 unread_count = 3;               // 未读数
    bool has_more = 4;                    // 是否还有更多
}
```

---

### 3. GetMessageById
**功能**: 获取单个消息详情

**请求参数**:
```protobuf
message MessageIdRequest {
    string message_id = 1;               // 消息ID
    string user_address = 2;             // 用户地址
}
```

**响应**:
```protobuf
message MessageDetail {
    string message_id = 1;
    string sender_address = 2;
    string recipient_address = 3;
    bytes encrypted_data = 4;            // 加密数据
    string data_type = 5;
    string metadata = 6;
    string encrypted_at = 7;
    string read_at = 8;
    bool is_read = 9;
}
```

---

### 4. MarkMessageAsRead
**功能**: 标记消息为已读

**请求参数**:
```protobuf
message MessageIdRequest {
    string message_id = 1;
    string user_address = 2;
}
```

**响应**:
```protobuf
message StatusResponse {
    bool success = 1;
    string message = 2;
    int32 affected_count = 3;
}
```

---

### 5. RevokeMessage
**功能**: 撤销/删除消息

**请求参数**:
```protobuf
message MessageIdRequest {
    string message_id = 1;
    string user_address = 2;
}
```

**响应**:
```protobuf
message StatusResponse {
    bool success = 1;
    string message = 2;
    int32 affected_count = 3;
}
```

---

### 6. MarkMultipleAsRead
**功能**: 批量标记已读

**请求参数**:
```protobuf
message MultipleMessageIdRequest {
    repeated string message_ids = 1;     // 消息ID列表
    string user_address = 2;
}
```

**响应**:
```protobuf
message StatusResponse {
    bool success = 1;
    string message = 2;
    int32 affected_count = 3;
}
```

---

## 🔄 数据流

### 发送加密消息的完整流程

```
medication-service (客户端)
    ↓
1. 用医生公钥加密计划 → 密文1
    ↓
2. 调用 SendEncryptedMessage (gRPC)
    {
        senderAddress: "0xDoctor",
        recipientAddress: "0xPatient",
        encryptedData: Buffer<密文1>
    }
    ↓
secure-exchange-service (服务端)
    ↓
3. exchange.handler.sendEncryptedMessage()
    ↓
4. exchange.service.sendEncryptedMessage()
    ├─ 获取患者公钥
    ├─ 用患者公钥再次加密 → 密文2
    └─ 保存到数据库
    ↓
5. 返回响应
    {
        message_id: "uuid",
        encrypted_data: Buffer<密文2>,
        success: true
    }
    ↓
medication-service 继续处理
```

---

## 🛠️ 客户端集成示例

### 1. 创建 gRPC 客户端

```javascript
// medication-service/src/rpc/clients/secure-exchange.client.js

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../../../proto/secure-exchange.proto');

async function initializeClient() {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });

    const secureExchangeProto = grpc.loadPackageDefinition(packageDefinition);
    const secureExchangeService = secureExchangeProto.secure_exchange;

    const client = new secureExchangeService.SecureExchange(
        'localhost:50057',  // ⚠️ 注意端口是 50057
        grpc.credentials.createInsecure()
    );

    return client;
}
```

### 2. 发送加密数据

```javascript
async function sendEncryptedData(options) {
    const client = await initializeClient();
    
    return new Promise((resolve, reject) => {
        client.SendEncryptedMessage(
            {
                sender_address: options.senderAddress,
                recipient_address: options.recipientAddress,
                encrypted_data: options.encryptedData,
                data_type: options.dataType,
                metadata: JSON.stringify(options.metadata),
                timestamp: new Date().toISOString()
            },
            (error, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            }
        );
    });
}
```

---

## 🔧 配置

### 环境变量 (.env)

```bash
# gRPC 服务端口
GRPC_PORT=50057

# HTTP 服务端口
PORT=3006

# 数据库配置
DB_HOST=localhost
DB_PORT=5400
DB_USER=postgres
DB_PASSWORD=your_password
DB_DATABASE=bs_secure_exchange_db

# Redis
REDIS_URL=redis://localhost:6379

# MQ
MQ_URL=amqp://localhost
```

---

## 🚀 启动服务

```bash
# 启动 secure-exchange-service
cd secure-exchange-service
npm start

# 输出：
# ✅ WebSocket服务器已启动
# ✅ MQ消费者已启动
# ✅ 定时任务已启动
# ✅ gRPC服务器已启动
# 📡 gRPC Port:   50057
# 🔐 Service:     SecureExchange
```

---

## 🧪 测试 gRPC 服务

### 使用 grpcurl 测试

```bash
# 列出所有服务
grpcurl -plaintext localhost:50057 list

# 列出 SecureExchange 服务的方法
grpcurl -plaintext localhost:50057 list secure_exchange.SecureExchange

# 调用 SendEncryptedMessage
grpcurl -plaintext -d '{
  "sender_address": "0x123",
  "recipient_address": "0x456",
  "encrypted_data": "aGVsbG8=",
  "data_type": "test",
  "metadata": "{}",
  "timestamp": "2025-10-30T10:00:00Z"
}' localhost:50057 secure_exchange.SecureExchange/SendEncryptedMessage
```

---

## 📊 架构图

```
┌──────────────────────────────────────────────────────────────┐
│           Secure Exchange Service Architecture               │
└──────────────────────────────────────────────────────────────┘

                          External Services
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                HTTP API      gRPC API    WebSocket
                (3006)        (50057)      (3006/ws)
                    │            │            │
                    └────────────┼────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │                         │
            ┌───────▼────────┐     ┌────────▼────────┐
            │   Controllers   │     │   RPC Handlers  │
            └───────┬────────┘     └────────┬────────┘
                    │                       │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │      Services         │
                    │  - exchange.service   │
                    │  - message.service    │
                    │  - session.service    │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │      Entities         │
                    │  - message.entity     │
                    │  - session.entity     │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │      Database         │
                    │   (PostgreSQL)        │
                    └───────────────────────┘
```

---

## 🔐 安全特性

### 双层加密
1. **第一层**: 客户端用发送者公钥加密
2. **第二层**: secure-exchange 用接收者公钥再次加密
3. **结果**: 只有接收者能解密查看

### 防重放攻击
- Timestamp 验证
- Nonce 机制
- replay-guard.util.js

### 访问控制
- 只有接收者能查看消息
- 只有发送者能撤销消息
- 权限验证在每个 handler 中

---

## 📝 注意事项

### ⚠️ 端口配置
- **secure-exchange-service gRPC 端口**: 50057
- **medication-service 客户端配置**: 需要连接到 50057

### ⚠️ Proto 文件
- 所有微服务共享同一个 proto 文件
- 位于项目根目录 `proto/secure-exchange.proto`

### ⚠️ 数据格式
- `encrypted_data` 字段是 `bytes` 类型
- Node.js 中使用 `Buffer.from()` 转换

---

## 📚 相关文档

- `proto/secure-exchange.proto` - gRPC API 定义
- `src/rpc/handlers/exchange.handler.js` - RPC 处理器
- `src/rpc/server.js` - gRPC 服务器
- `server.js` - 主入口文件

---

**最后更新**: 2025-10-30  
**维护者**: Development Team  
**状态**: ✅ 已上线并运行

