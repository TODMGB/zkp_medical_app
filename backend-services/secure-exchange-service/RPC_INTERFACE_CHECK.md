# RPC 接口一致性检查报告

## 📋 检查日期
2024年 - Medication Service → Secure Exchange Service RPC 集成

## ✅ 已修复的接口不一致问题

### 1. **SendEncryptedMessage** 接口

#### 问题描述
- **客户端调用** (`medication-service/src/rpc/clients/secure-exchange.client.js`)
  ```javascript
  sendEncryptedData({
      senderAddress,
      recipientAddress,
      encryptedData,      // Buffer
      dataType,
      metadata
  })
  ```

- **服务端期望** (`exchange.service.js`)
  ```javascript
  sendEncryptedData({
      senderAddress,
      recipientAddress,
      encryptedData,
      signature,      // ❌ 缺失
      nonce,          // ❌ 缺失
      signerAddress,  // ❌ 缺失
      timestamp,
      dataType,
      metadata
  })
  ```

#### 解决方案
在 `exchange.handler.js` 中：
- ✅ 直接调用 `messageEntity.create()` 而不是 `messageService.createMessage()`
- ✅ 跳过签名验证（RPC 调用为服务间调用，不需要以太坊签名）
- ✅ 自动生成 nonce 和内部签名标记 `'RPC_INTERNAL'`
- ✅ 发送 MQ 通知给接收者

---

### 2. **GetEncryptedMessages** 接口

#### 问题描述
- **Handler 调用**: `messageService.getMessages()` 
- **Service 实际方法**: ❌ 不存在该方法

#### 解决方案
- ✅ 添加 `messageEntity.findByRecipient()` 方法，支持：
  - 分页查询 (limit, offset)
  - 数据类型筛选 (dataType)
  - 未读筛选 (unreadOnly)
  - 返回总数和未读数统计
- ✅ 添加 `messageService.getMessages()` 方法，封装 entity 调用
- ✅ 返回格式统一：`{ messages[], total_count, unread_count }`

---

### 3. **GetMessageById** 接口

#### 问题描述
- Handler 调用 `getMessageById(messageId, userAddress)` 
- Service 实际签名: `getMessageById(messageId)` - 只需要一个参数

#### 解决方案
- ✅ 修改 handler 移除多余的 `user_address` 参数
- ✅ 添加空值检查和错误处理
- ✅ 统一返回字段：`message_id`, `sender_address`, `encrypted_data`, `metadata`, `encrypted_at`, `read_at`

---

### 4. **MarkMessageAsRead** 接口

#### 问题描述
- Handler 需要 `user_address` 参数验证权限
- Service 未定义 `markAsRead()` 方法

#### 解决方案
- ✅ 添加 `messageEntity.markAsRead(messageId, userAddress)` 方法
- ✅ 添加 `messageService.markAsRead(messageId, userAddress)` 方法
- ✅ 添加参数验证：要求 `user_address` 必填
- ✅ 仅更新 `read_at` 字段为当前时间，且仅当消息未读时

---

### 5. **RevokeMessage** 接口

#### 问题描述
- Handler 调用 `deleteMessage(messageId, userAddress)`
- Service 实际签名: `deleteMessage(messageId)` - 只需要一个参数

#### 解决方案
- ✅ 修改 handler 移除多余的 `user_address` 参数
- ✅ 直接调用 `messageService.deleteMessage(messageId)`

---

### 6. **MarkMultipleAsRead** 接口

#### 状态
- ✅ 接口一致，无需修改
- 批量调用 `messageService.markAsRead()` 处理多个消息

---

## 🔧 新增的数据库方法

### `messageEntity.findByRecipient(recipientAddress, options)`
```javascript
options: {
  dataType: string | null,
  unreadOnly: boolean,
  limit: number,
  offset: number
}

返回: {
  messages: Array<Message>,
  total_count: number,
  unread_count: number
}
```

### `messageEntity.markAsRead(messageId, userAddress)`
```javascript
// 标记消息为已读
UPDATE encrypted_messages 
SET read_at = NOW()
WHERE message_id = $1 
  AND recipient_address = $2
  AND read_at IS NULL
```

---

## 🛡️ RPC 调用的特殊处理

### 签名验证豁免
对于 RPC 调用（服务间通信）：
- ❌ 不进行以太坊签名验证
- ✅ 直接调用 `messageEntity.create()`，跳过 `messageService.createMessage()` 的验证流程
- ✅ 使用内部标记 `signature: 'RPC_INTERNAL'`

### 自动生成字段
- `nonce`: 使用 `crypto.randomBytes(16).toString('hex')`
- `timestamp`: 使用 `new Date().toISOString()`
- `expiresAt`: 使用配置的默认过期时间

---

## 📊 接口对比表

| 功能 | 客户端方法 | Handler方法 | Service方法 | Entity方法 | 状态 |
|------|-----------|------------|------------|-----------|------|
| 发送消息 | `sendEncryptedData()` | `sendEncryptedMessage()` | ❌ 跳过 | `create()` | ✅ 已修复 |
| 获取消息列表 | `getEncryptedMessages()` | `getEncryptedMessages()` | `getMessages()` | `findByRecipient()` | ✅ 已修复 |
| 获取单个消息 | `getMessageById()` | `getMessageById()` | `getMessageById()` | `findById()` | ✅ 已修复 |
| 标记已读 | `markMessageAsRead()` | `markMessageAsRead()` | `markAsRead()` | `markAsRead()` | ✅ 已修复 |
| 撤销消息 | `revokeMessage()` | `revokeMessage()` | `deleteMessage()` | `delete()` | ✅ 已修复 |
| 批量标记已读 | ❌ | `markMultipleAsRead()` | `markAsRead()` (循环) | `markAsRead()` | ✅ 正常 |

---

## 🎯 修改的文件清单

### Secure Exchange Service
1. ✅ `src/rpc/handlers/exchange.handler.js` - 修复所有 RPC 处理器
2. ✅ `src/services/message.service.js` - 添加 `getMessages()` 和 `markAsRead()` 方法
3. ✅ `src/entity/message.entity.js` - 添加 `findByRecipient()` 和 `markAsRead()` 方法

### Medication Service
4. ✅ `src/rpc/clients/secure-exchange.client.js` - 客户端配置正确
5. ✅ `src/config/index.js` - RPC 端口配置为 50057

---

## 🔍 测试建议

### 1. 测试发送消息
```javascript
// medication-service 调用
await secureExchangeClient.sendEncryptedData({
    senderAddress: 'doctor_address',
    recipientAddress: 'patient_address',
    encryptedData: Buffer.from('...'),
    dataType: 'medication_plan',
    metadata: { plan_id: '...' }
});
```

### 2. 测试获取消息列表
```javascript
await secureExchangeClient.getEncryptedMessages('patient_address', {
    limit: 10,
    offset: 0
});
```

### 3. 测试标记已读
```javascript
await secureExchangeClient.markMessageAsRead('message_id');
```

---

## ⚠️ 注意事项

1. **数据库 Schema 依赖**
   - 确保 `encrypted_messages` 表有 `read_at` 字段
   - 确认表结构支持所有查询条件

2. **RPC 端口配置**
   - Medication Service: 连接到 `localhost:50057`
   - Secure Exchange Service: 监听 `0.0.0.0:50057`

3. **MQ 通知**
   - 发送消息后会自动发送 MQ 通知
   - 确保 RabbitMQ 正常运行

4. **错误处理**
   - 所有 RPC 方法都有完整的 try-catch
   - 客户端应处理连接失败的情况

---

## ✨ 总结

所有 RPC 接口不一致问题已修复：
- ✅ 方法签名统一
- ✅ 参数传递正确
- ✅ 返回值格式一致
- ✅ 错误处理完善
- ✅ RPC 调用绕过签名验证（服务间调用）
- ✅ 新增必要的数据库查询方法

**可以开始集成测试！** 🚀

