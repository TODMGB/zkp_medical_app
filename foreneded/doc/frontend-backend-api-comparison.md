# 前后端接口对比报告

> 对比日期: 2025-10-31  
> 文档版本: v1.0  
> 对比范围: 前端实现 vs API Gateway 完整文档 v2.0

---

## 📊 总体对比摘要

### ✅ 已实现并正确对齐的模块
1. ✅ 认证服务 (auth.ts)
2. ✅ 用户信息服务 (userInfo.ts)
3. ✅ 关系管理服务 (relation.ts)
4. ✅ ERC4337服务 (accountAbstraction.ts + guardian.ts)
5. ✅ 账户迁移服务 (migration.ts)

### ⚠️ 缺失或不完整的模块
1. ❌ **医药服务** - 完全缺失
2. ❌ **安全交换服务** - 完全缺失
3. ❌ **通知服务** - 完全缺失
4. ❌ **ZKP证明服务** - 完全缺失

---

## 1. 认证服务 (auth.ts)

### 1.1 注册接口

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **端点** | `POST /api/auth/register` | ✅ `POST /api/auth/register` | ✅ |
| **请求参数** | | | |
| - `eoa_address` | ✅ | ✅ | ✅ |
| - `smart_account_address` | ✅ | ✅ | ✅ |
| - `phone_number` | ✅ | ✅ | ✅ |
| - `id_card_number` | ✅ | ✅ | ✅ |
| - `email` | ✅ | ✅ | ✅ |
| - `encryption_public_key` | ✅ | ❌ **缺失** | ⚠️ |
| **响应处理** | `data.token`, `data.username`, `data.role` | ✅ 正确处理 | ✅ |

**✅ 已修复：已添加 `encryption_public_key` 参数**

```typescript
// ✅ 已完成修复
export interface RegisterRequest {
  id_card_number: string;
  phone_number: string;
  email: string;
  eoa_address: string;
  smart_account_address: string;
  encryption_public_key: string; // ✅ 已添加此字段
}
```

**已实现：**
在 `accountAbstraction.ts` 的 `register` 方法中已添加公钥传递：

```typescript
// ✅ 已实现
const encryptionPublicKey = this.eoaWallet.signingKey.compressedPublicKey;

await authService.register({
  ...userInfo,
  eoa_address: this.eoaWallet.address,
  smart_account_address: this.abstractAccountAddress!,
  encryption_public_key: encryptionPublicKey, // ✅ 已添加
});
```

---

### 1.2 登录接口

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **端点** | `POST /api/auth/login` | ✅ `POST /api/auth/login` | ✅ |
| **请求参数** | | | |
| - `eoa_address` | ✅ | ✅ | ✅ |
| - `login_time` | ✅ | ✅ | ✅ |
| - `signature` | ✅ | ✅ | ✅ |
| **签名格式** | `LOGIN_TIME:${loginTime}` | ✅ 正确 | ✅ |
| **响应处理** | `data.token`, `data.user` | ✅ 正确处理 | ✅ |

**✅ 状态：完全正确**

---

### 1.3 更新加密公钥接口

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **端点** | `PUT /api/auth/encryption-key` | ❌ 未实现 | ❌ |
| **请求参数** | `encryption_public_key` | - | - |
| **请求头** | `Authorization: Bearer <token>` | - | - |

**❌ 问题：完全未实现**

**建议：** 在 `auth.ts` 中添加：

```typescript
/**
 * 更新加密公钥
 */
public async updateEncryptionKey(encryptionPublicKey: string): Promise<void> {
  try {
    const headers = await this.getAuthHeader();
    const response = await fetch(
      buildAuthUrl('updateEncryptionKey'),
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          encryption_public_key: encryptionPublicKey
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '更新加密公钥失败');
    }
    
    console.log('加密公钥已更新');
  } catch (error: any) {
    console.error('更新加密公钥失败:', error);
    throw error;
  }
}
```

并在 `api.config.ts` 中添加端点：
```typescript
endpoints: {
  register: '/auth/register',
  login: '/auth/login',
  updateEncryptionKey: '/auth/encryption-key', // 添加此行
}
```

---

## 2. 用户信息服务 (userInfo.ts)

### 2.1 查询个人档案接口

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **端点** | `GET /api/userinfo/persons/lookup` | ✅ `GET /api/userinfo/api/persons/lookup` | ⚠️ |
| **查询参数** | | | |
| - `id_card_number` | ✅ | ✅ | ✅ |
| - `phone_number` | ✅ | ✅ | ✅ |
| - `email` | ✅ | ✅ | ✅ |
| **响应字段** | `id`, `id_card_number`, `phone_number`, `email`, `name` | 前端期待 `full_name`, `role` | ⚠️ |

**✅ 已确认路径正确**
- 实现路径: `/api/userinfo/api/persons/lookup`
- 说明: 实际后端路径就是这样的，无需修改

**✅ 已修复字段映射问题**
- 已将 `full_name` 改为 `name` (与API文档一致)
- 已将 `role` 改为可选字段
- 已更新所有相关引用

**已完成修复 `userInfo.ts` 接口定义:**
```typescript
export interface PersonInfo {
  id: number;
  name: string; // ✅ 已改为 name (与API文档一致)
  id_card_number: string;
  phone_number: string;
  email: string;
  role?: 'elderly' | 'doctor'; // ✅ 已改为可选字段
  home_address?: string;
  work_unit?: string;
  created_at?: string;
  updated_at?: string;
}
```

---

## 3. 关系管理服务 (relation.ts)

### 3.1 查看访问组接口

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **端点** | `GET /api/relation/access-groups/stats` | ✅ 正确 | ✅ |
| **查询参数** | `user_smart_account` | ✅ 正确 | ✅ |
| **请求头** | `Authorization: Bearer <token>` | ✅ 正确 | ✅ |
| **响应处理** | `data` 数组 | ✅ 正确 | ✅ |

**✅ 状态：完全正确**

---

### 3.2 创建访问组接口

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **端点** | `POST /api/relation/access-groups` | ✅ 正确 | ✅ |
| **请求参数** | | | |
| - `groupName` | ✅ | ✅ | ✅ |
| - `description` | ✅ | ✅ | ✅ |
| - `ownerAddress` | ✅ | ✅ | ✅ |

**✅ 状态：完全正确**

---

### 3.3 创建邀请接口

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **端点** | `POST /api/relation/invitations` | ✅ 正确 | ✅ |
| **请求参数** | `accessGroupId` | ✅ 正确 | ✅ |
| **响应处理** | `token`, `expiresAt` | ✅ 正确 | ✅ |

**✅ 状态：完全正确**

---

### 3.4 接受邀请接口

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **端点** | `POST /api/relation/relationships/accept` | ✅ 正确 | ✅ |
| **请求参数** | `token` | ✅ 正确 | ✅ |

**✅ 状态：完全正确**

---

### 3.5 关系管理操作

| 操作 | API文档端点 | 前端实现 | 状态 |
|------|------------|----------|------|
| 暂停关系 | `PUT /api/relation/relationships/:id/suspend` | ✅ 正确 | ✅ |
| 恢复关系 | `PUT /api/relation/relationships/:id/resume` | ✅ 正确 | ✅ |
| 撤销关系 | `DELETE /api/relation/relationships/:id` | ✅ 正确 | ✅ |

**✅ 状态：完全正确**

---

## 4. ERC4337 服务 (accountAbstraction.ts + guardian.ts)

### 4.1 预计算Smart Account地址

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **端点** | `POST /api/erc4337/account/address` | ✅ 正确 | ✅ |
| **请求参数** | | | |
| - `ownerAddress` | ✅ | ✅ | ✅ |
| - `guardians` | ✅ | ✅ | ✅ |
| - `threshold` | ✅ | ✅ | ✅ |
| - `salt` | ✅ | ✅ | ✅ |
| **响应处理** | `data.accountAddress` | ✅ 正确 | ✅ |

**✅ 状态：完全正确**

---

### 4.2 部署Smart Account

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **端点** | `POST /api/erc4337/account` | ✅ 正确 | ✅ |
| **请求参数** | 同预计算 | ✅ 正确 | ✅ |

**✅ 状态：完全正确**

---

### 4.3 添加守护者流程

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **构建UserOp** | `POST /api/erc4337/guardian/build` | ✅ 正确 | ✅ |
| **提交UserOp** | `POST /api/erc4337/guardian/submit` | ✅ 正确 | ✅ |
| **签名逻辑** | 使用EOA签名 | ✅ 正确 | ✅ |

**✅ 状态：完全正确**

---

### 4.4 查询守护者列表

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **端点** | `GET /api/erc4337/guardian/:accountAddress` | ✅ 正确 | ✅ |
| **响应处理** | `data.guardians`, `data.threshold`, `data.count` | ✅ 正确 | ✅ |

**✅ 状态：完全正确**

---

### 4.5 社交恢复流程

| 操作 | API文档端点 | 前端实现 | 状态 |
|------|------------|----------|------|
| 发起恢复 | `POST /api/erc4337/recovery/initiate/build` | ✅ 正确 | ✅ |
| 支持恢复 | `POST /api/erc4337/recovery/support/build` | ✅ 正确 | ✅ |
| 提交恢复 | `POST /api/erc4337/recovery/submit` | ✅ 正确 | ✅ |
| 查询状态 | `GET /api/erc4337/recovery/status/:accountAddress` | ✅ 正确 | ✅ |

**✅ 状态：完全正确**

---

## 5. 账户迁移服务 (migration.ts)

### 5.1 创建迁移会话

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **端点** | `POST /api/migration/create` | ✅ 正确 | ✅ |
| **请求参数** | | | |
| - `id` | ✅ | ✅ | ✅ |
| - `oldDeviceId` | ✅ | ✅ | ✅ |
| - `confirmCode` | ✅ | ✅ | ✅ |
| - `status` | ✅ | ✅ | ✅ |
| - `createdAt` | ✅ | ✅ | ✅ |
| - `expiresAt` | ✅ | ✅ | ✅ |

**✅ 状态：完全正确**

---

### 5.2 验证确认码

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **端点** | `POST /api/migration/verify` | ✅ 正确 | ✅ |
| **请求参数** | `migrationId`, `confirmCode` | ✅ 正确 | ✅ |

**✅ 状态：完全正确**

---

### 5.3 完成迁移

| 对比项 | API文档 | 前端实现 | 状态 |
|--------|---------|----------|------|
| **端点** | `POST /api/migration/confirm` | ✅ 正确 | ✅ |
| **请求参数** | `migrationId`, `newDeviceId`, `status`, `timestamp` | ✅ 正确 | ✅ |

**✅ 状态：完全正确**

---

## 6. 医药服务 (medication.ts) ❌ 完全缺失

### 应实现的接口清单：

#### 6.1 搜索药物
```typescript
// ❌ 缺失
GET /api/medication/medications/search
查询参数: search, category
```

#### 6.2 获取药物详情
```typescript
// ❌ 缺失
GET /api/medication/medications/:medicationId
```

#### 6.3 创建加密用药计划
```typescript
// ❌ 缺失
POST /api/medication/plans
请求体: {
  patient_address: string,
  start_date: string,
  end_date: string,
  encrypted_plan_data: string  // ECDH + AES-256-GCM 加密
}
```

#### 6.4 查询用药计划
```typescript
// ❌ 缺失
GET /api/medication/plans/:planId
```

#### 6.5 查询医生创建的计划
```typescript
// ❌ 缺失
GET /api/medication/plans/doctor/:doctorAddress
```

#### 6.6 更新用药计划
```typescript
// ❌ 缺失
PUT /api/medication/plans/:planId
```

#### 6.7 删除用药计划
```typescript
// ❌ 缺失
DELETE /api/medication/plans/:planId
```

**建议：创建 `src/service/medication.ts` 文件并实现所有接口**

---

## 7. 安全交换服务 (secure-exchange.ts) ❌ 完全缺失

### 应实现的接口清单：

#### 7.1 获取接收者加密公钥
```typescript
// ❌ 缺失
GET /api/secure-exchange/recipient-pubkey/:recipientAddress
```

#### 7.2 发送加密数据
```typescript
// ❌ 缺失
POST /api/secure-exchange/send
请求体: {
  recipientAddress: string,
  encryptedData: string,
  signature: string,
  timestamp: number,
  nonce: string,
  dataType: string,
  metadata: object
}
```

#### 7.3 查询待处理消息
```typescript
// ❌ 缺失
GET /api/secure-exchange/pending
查询参数: dataType, limit
```

#### 7.4 确认接收消息
```typescript
// ❌ 缺失
POST /api/secure-exchange/acknowledge
请求体: {
  messageId: string,
  status: string,
  acknowledged: boolean,
  acknowledgment_note?: string
}
```

#### 7.5 WebSocket 连接
```typescript
// ❌ 缺失
ws://localhost:3000/ws/secure-exchange?token=<JWT_TOKEN>
```

**建议：创建 `src/service/secureExchange.ts` 文件并实现所有接口**

---

## 8. 通知服务 (notification.ts) ❌ 完全缺失

### 应实现的接口清单：

#### 8.1 WebSocket 连接
```typescript
// ❌ 缺失
ws://localhost:3000/ws/notification?token=<JWT_TOKEN>
```

#### 8.2 获取通知列表
```typescript
// ❌ 缺失
GET /api/notification/notifications
查询参数: status, limit, offset
```

#### 8.3 获取未读数量
```typescript
// ❌ 缺失
GET /api/notification/notifications/unread/count
```

#### 8.4 标记单条已读
```typescript
// ❌ 缺失
PUT /api/notification/notifications/:notificationId/read
```

#### 8.5 标记全部已读
```typescript
// ❌ 缺失
PUT /api/notification/notifications/read-all
```

#### 8.6 删除通知
```typescript
// ❌ 缺失
DELETE /api/notification/notifications/:notificationId
```

**建议：创建 `src/service/notification.ts` 文件并实现所有接口**

---

## 9. ZKP 证明服务 (zkp.ts) ❌ 完全缺失

### 应实现的接口清单：

#### 9.1 生成周度汇总证明
```typescript
// ❌ 缺失
POST /api/zkp/prove/weekly-summary
请求体: {
  inputs: {
    merkleRoot: string,
    leaves: string[]
  }
}
```

#### 9.2 查询证明任务状态
```typescript
// ❌ 缺失
GET /api/zkp/proof-status/:jobId
```

**建议：创建 `src/service/zkp.ts` 文件并实现接口**

---

## 10. 加密解密工具函数 (crypto.ts) ❌ 完全缺失

### 应实现的函数清单：

#### 10.1 ECDH 密钥派生
```typescript
// ❌ 缺失
function deriveSharedSecret(
  privateKey: string,
  peerPublicKey: string
): Buffer
```

#### 10.2 AES-256-GCM 加密
```typescript
// ❌ 缺失
function encrypt(
  plaintext: string,
  sharedSecret: Buffer
): string
```

#### 10.3 AES-256-GCM 解密
```typescript
// ❌ 缺失
function decrypt(
  encryptedData: string,
  sharedSecret: Buffer
): string
```

#### 10.4 ECDSA 签名
```typescript
// ❌ 缺失
async function signData(
  payload: object,
  privateKey: string
): Promise<string>
```

**建议：创建 `src/utils/crypto.ts` 文件并实现所有加密工具函数**

---

## 📝 修复优先级建议

### 🔴 高优先级（立即修复）

1. **修复注册接口缺少 `encryption_public_key`**
   - 文件: `auth.ts`, `accountAbstraction.ts`
   - 影响: 无法进行端到端加密通信

2. **修复用户信息查询接口路径错误**
   - 文件: `api.config.ts`, `userInfo.ts`
   - 影响: 接口调用失败

3. **实现加密解密工具函数**
   - 创建: `src/utils/crypto.ts`
   - 影响: 医药服务、安全交换服务依赖此模块

### 🟡 中优先级（2周内完成）

4. **实现医药服务**
   - 创建: `src/service/medication.ts`
   - 更新: `src/config/api.config.ts` 添加医药服务配置
   - 影响: 核心业务功能

5. **实现安全交换服务**
   - 创建: `src/service/secureExchange.ts`
   - 影响: 医生-患者数据交换

6. **实现通知服务**
   - 创建: `src/service/notification.ts`
   - 影响: 用户体验、用药提醒

### 🟢 低优先级（1个月内完成）

7. **实现ZKP证明服务**
   - 创建: `src/service/zkp.ts`
   - 影响: 隐私保护功能

8. **添加更新加密公钥接口**
   - 文件: `auth.ts`
   - 影响: 密钥管理

---

## 📦 推荐的文件结构调整

```
src/
├── service/
│   ├── auth.ts                 ✅ 已有
│   ├── userInfo.ts             ✅ 已有
│   ├── relation.ts             ✅ 已有
│   ├── accountAbstraction.ts   ✅ 已有
│   ├── guardian.ts             ✅ 已有
│   ├── migration.ts            ✅ 已有
│   ├── wallet.ts               ✅ 已有
│   ├── biometric.ts            ✅ 已有
│   ├── scanner.ts              ✅ 已有
│   ├── medication.ts           ❌ 需创建
│   ├── secureExchange.ts       ❌ 需创建
│   ├── notification.ts         ❌ 需创建
│   └── zkp.ts                  ❌ 需创建
├── utils/
│   ├── userRoles.ts            ✅ 已有
│   └── crypto.ts               ❌ 需创建
└── config/
    └── api.config.ts           ✅ 已有（需更新）
```

---

## 🎯 下一步行动计划

### 第1阶段：修复现有问题（1天）
- [ ] 修复注册接口添加 `encryption_public_key`
- [ ] 修复用户信息查询路径
- [ ] 更新相关接口定义

### 第2阶段：实现加密工具（2天）
- [ ] 创建 `src/utils/crypto.ts`
- [ ] 实现 ECDH 密钥派生
- [ ] 实现 AES-256-GCM 加解密
- [ ] 编写单元测试

### 第3阶段：实现医药服务（3-5天）
- [ ] 创建 `src/service/medication.ts`
- [ ] 实现药物搜索
- [ ] 实现加密用药计划CRUD
- [ ] 集成到相关页面

### 第4阶段：实现安全交换服务（3-5天）
- [ ] 创建 `src/service/secureExchange.ts`
- [ ] 实现HTTP API调用
- [ ] 实现WebSocket连接
- [ ] 集成消息接收功能

### 第5阶段：实现通知服务（2-3天）
- [ ] 创建 `src/service/notification.ts`
- [ ] 实现WebSocket连接
- [ ] 实现通知管理API
- [ ] 集成到应用全局

### 第6阶段：实现ZKP服务（2天）
- [ ] 创建 `src/service/zkp.ts`
- [ ] 实现证明生成和查询
- [ ] 集成到相关功能

---

## 📞 联系与反馈

如有疑问，请联系开发团队。

**报告生成时间**: 2025-10-31  
**报告版本**: v1.0  
**下次复查日期**: 2025-11-07


