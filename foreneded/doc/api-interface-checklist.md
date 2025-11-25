# API 接口实现检查清单

> 逐个接口对照检查  
> 日期: 2025-10-31

---

## 📖 图例说明

- ✅ **完全实现且正确**
- ⚠️ **已实现但有问题**
- ❌ **完全未实现**
- 🔧 **需要修复**

---

## 1️⃣ 认证服务 API (auth.ts)

| # | 接口名称 | 方法 | 端点 | 状态 | 问题描述 |
|---|---------|------|------|------|----------|
| 1.1 | 用户注册 | POST | `/api/auth/register` | ⚠️ | 缺少 `encryption_public_key` 参数 |
| 1.2 | 用户登录 | POST | `/api/auth/login` | ✅ | 完全正确 |
| 1.3 | 更新加密公钥 | PUT | `/api/auth/encryption-key` | ❌ | 完全未实现 |

**修复建议**:
- [ ] 在 `RegisterRequest` 接口添加 `encryption_public_key: string`
- [ ] 在 `accountAbstraction.register()` 调用时传递公钥
- [ ] 实现 `updateEncryptionKey()` 方法

---

## 2️⃣ 用户信息服务 API (userInfo.ts)

| # | 接口名称 | 方法 | 端点 | 状态 | 问题描述 |
|---|---------|------|------|------|----------|
| 2.1 | 查询个人档案 | GET | `/api/userinfo/persons/lookup` | ⚠️ | 1. 路径多了`/api` <br> 2. 响应字段不匹配 |

**修复建议**:
- [ ] 修改 `api.config.ts`: `/userinfo/api/persons/lookup` → `/userinfo/persons/lookup`
- [ ] 修改 `PersonInfo` 接口: `full_name` → `name`

---

## 3️⃣ 关系管理服务 API (relation.ts)

| # | 接口名称 | 方法 | 端点 | 状态 | 问题描述 |
|---|---------|------|------|------|----------|
| 3.1 | 查看访问组 | GET | `/api/relation/access-groups/stats` | ✅ | 完全正确 |
| 3.2 | 创建访问组 | POST | `/api/relation/access-groups` | ✅ | 完全正确 |
| 3.3 | 创建邀请 | POST | `/api/relation/invitations` | ✅ | 完全正确 |
| 3.4 | 接受邀请 | POST | `/api/relation/relationships/accept` | ✅ | 完全正确 |
| 3.5 | 查看访问组成员 | GET | `/api/relation/access-groups/:id/members` | ✅ | 完全正确 |
| 3.6 | 暂停关系 | PUT | `/api/relation/relationships/:id/suspend` | ✅ | 完全正确 |
| 3.7 | 恢复关系 | PUT | `/api/relation/relationships/:id/resume` | ✅ | 完全正确 |
| 3.8 | 撤销关系 | DELETE | `/api/relation/relationships/:id` | ✅ | 完全正确 |

**状态**: ✅ 关系管理服务完全正确，无需修改

---

## 4️⃣ 医药服务 API (medication.ts) ❌ 文件不存在

| # | 接口名称 | 方法 | 端点 | 状态 | 问题描述 |
|---|---------|------|------|------|----------|
| 4.1 | 搜索常用药物 | GET | `/api/medication/medications/search` | ❌ | 未实现 |
| 4.2 | 获取药物详情 | GET | `/api/medication/medications/:id` | ❌ | 未实现 |
| 4.3 | 创建加密用药计划 | POST | `/api/medication/plans` | ❌ | 未实现 |
| 4.4 | 查询用药计划 | GET | `/api/medication/plans/:id` | ❌ | 未实现 |
| 4.5 | 查询医生创建的计划 | GET | `/api/medication/plans/doctor/:address` | ❌ | 未实现 |
| 4.6 | 更新用药计划 | PUT | `/api/medication/plans/:id` | ❌ | 未实现 |
| 4.7 | 删除用药计划 | DELETE | `/api/medication/plans/:id` | ❌ | 未实现 |

**修复建议**:
- [ ] 创建 `src/service/medication.ts` 文件
- [ ] 在 `api.config.ts` 添加 MEDICATION_CONFIG
- [ ] 实现所有7个接口
- [ ] 集成加密逻辑（依赖 crypto.ts）

---

## 5️⃣ 安全交换服务 API (secureExchange.ts) ❌ 文件不存在

| # | 接口名称 | 方法 | 端点 | 状态 | 问题描述 |
|---|---------|------|------|------|----------|
| 5.1 | 获取接收者加密公钥 | GET | `/api/secure-exchange/recipient-pubkey/:address` | ❌ | 未实现 |
| 5.2 | 发送加密数据 | POST | `/api/secure-exchange/send` | ❌ | 未实现 |
| 5.3 | 查询待处理消息 | GET | `/api/secure-exchange/pending` | ❌ | 未实现 |
| 5.4 | 确认接收消息 | POST | `/api/secure-exchange/acknowledge` | ❌ | 未实现 |
| 5.5 | WebSocket连接 | WS | `ws://localhost:3000/ws/secure-exchange` | ❌ | 未实现 |

**修复建议**:
- [ ] 创建 `src/service/secureExchange.ts` 文件
- [ ] 在 `api.config.ts` 添加 SECURE_EXCHANGE_CONFIG
- [ ] 实现HTTP接口 (4个)
- [ ] 实现WebSocket连接和消息处理
- [ ] 集成加密逻辑（依赖 crypto.ts）

---

## 6️⃣ 通知服务 API (notification.ts) ❌ 文件不存在

| # | 接口名称 | 方法 | 端点 | 状态 | 问题描述 |
|---|---------|------|------|------|----------|
| 6.1 | WebSocket连接 | WS | `ws://localhost:3000/ws/notification` | ❌ | 未实现 |
| 6.2 | 获取通知列表 | GET | `/api/notification/notifications` | ❌ | 未实现 |
| 6.3 | 获取未读数量 | GET | `/api/notification/notifications/unread/count` | ❌ | 未实现 |
| 6.4 | 标记单条已读 | PUT | `/api/notification/notifications/:id/read` | ❌ | 未实现 |
| 6.5 | 标记全部已读 | PUT | `/api/notification/notifications/read-all` | ❌ | 未实现 |
| 6.6 | 删除通知 | DELETE | `/api/notification/notifications/:id` | ❌ | 未实现 |

**修复建议**:
- [ ] 创建 `src/service/notification.ts` 文件
- [ ] 在 `api.config.ts` 添加 NOTIFICATION_CONFIG
- [ ] 实现WebSocket连接类
- [ ] 实现HTTP接口 (5个)
- [ ] 实现心跳机制和重连逻辑

---

## 7️⃣ ERC4337 服务 API (accountAbstraction.ts + guardian.ts)

| # | 接口名称 | 方法 | 端点 | 状态 | 问题描述 |
|---|---------|------|------|------|----------|
| 7.1 | 预计算Smart Account地址 | POST | `/api/erc4337/account/address` | ✅ | 完全正确 |
| 7.2 | 部署Smart Account | POST | `/api/erc4337/account` | ✅ | 完全正确 |
| 7.3 | 查询账户信息 | GET | `/api/erc4337/account/:address` | ✅ | 完全正确 |
| 7.4 | 构建添加守护者UserOp | POST | `/api/erc4337/guardian/build` | ✅ | 完全正确 |
| 7.5 | 提交守护者UserOp | POST | `/api/erc4337/guardian/submit` | ✅ | 完全正确 |
| 7.6 | 查询守护者列表 | GET | `/api/erc4337/guardian/:address` | ✅ | 完全正确 |
| 7.7 | 构建设置阈值UserOp | POST | `/api/erc4337/guardian/threshold/build` | ✅ | 完全正确 |
| 7.8 | 构建发起恢复UserOp | POST | `/api/erc4337/recovery/initiate/build` | ✅ | 完全正确 |
| 7.9 | 构建支持恢复UserOp | POST | `/api/erc4337/recovery/support/build` | ✅ | 完全正确 |
| 7.10 | 提交恢复UserOp | POST | `/api/erc4337/recovery/submit` | ✅ | 完全正确 |
| 7.11 | 查询恢复状态 | GET | `/api/erc4337/recovery/status/:address` | ✅ | 完全正确 |

**状态**: ✅ ERC4337服务完全正确，无需修改

---

## 8️⃣ 账户迁移服务 API (migration.ts)

| # | 接口名称 | 方法 | 端点 | 状态 | 问题描述 |
|---|---------|------|------|------|----------|
| 8.1 | 创建迁移会话 | POST | `/api/migration/create` | ✅ | 完全正确 |
| 8.2 | 获取迁移会话 | GET | `/api/migration/session/:id` | ✅ | 完全正确 |
| 8.3 | 验证确认码 | POST | `/api/migration/verify` | ✅ | 完全正确 |
| 8.4 | 完成迁移 | POST | `/api/migration/confirm` | ✅ | 完全正确 |
| 8.5 | 查询迁移状态 | GET | `/api/migration/status/:id` | ✅ | 完全正确 |

**状态**: ✅ 账户迁移服务完全正确，无需修改

---

## 9️⃣ ZKP 证明服务 API (zkp.ts) ❌ 文件不存在

| # | 接口名称 | 方法 | 端点 | 状态 | 问题描述 |
|---|---------|------|------|------|----------|
| 9.1 | 生成周度汇总证明 | POST | `/api/zkp/prove/weekly-summary` | ❌ | 未实现 |
| 9.2 | 查询证明任务状态 | GET | `/api/zkp/proof-status/:jobId` | ❌ | 未实现 |

**修复建议**:
- [ ] 创建 `src/service/zkp.ts` 文件
- [ ] 在 `api.config.ts` 添加 ZKP_CONFIG
- [ ] 实现证明生成接口
- [ ] 实现状态查询接口（支持轮询）

---

## 🔧 加密解密工具函数 (crypto.ts) ❌ 文件不存在

| # | 函数名称 | 功能 | 状态 | 问题描述 |
|---|---------|------|------|----------|
| 10.1 | `deriveSharedSecret()` | ECDH 密钥派生 | ❌ | 未实现 |
| 10.2 | `encrypt()` | AES-256-GCM 加密 | ❌ | 未实现 |
| 10.3 | `decrypt()` | AES-256-GCM 解密 | ❌ | 未实现 |
| 10.4 | `signData()` | ECDSA 签名（防重放） | ❌ | 未实现 |

**修复建议**:
- [ ] 创建 `src/utils/crypto.ts` 文件
- [ ] 实现 ECDH 密钥派生（使用 ethers.js）
- [ ] 实现 AES-256-GCM 加密（使用 crypto-js 或 node:crypto）
- [ ] 实现 AES-256-GCM 解密
- [ ] 实现 ECDSA 签名工具函数
- [ ] 编写单元测试

**参考实现** (来自 API 文档):
```typescript
const crypto = require('crypto');
const { ethers } = require('ethers');

// 1. ECDH 密钥派生
function deriveSharedSecret(privateKey: string, peerPublicKey: string): Buffer {
  const wallet = new ethers.Wallet(privateKey);
  const sharedPoint = wallet.signingKey.computeSharedSecret(peerPublicKey);
  return crypto.createHash('sha256')
    .update(Buffer.from(sharedPoint.slice(2), 'hex'))
    .digest();
}

// 2. AES-256-GCM 加密
function encrypt(plaintext: string, sharedSecret: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sharedSecret, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

// 3. AES-256-GCM 解密
function decrypt(encryptedData: string, sharedSecret: Buffer): string {
  const iv = Buffer.from(encryptedData.slice(0, 24), 'hex');
  const authTag = Buffer.from(encryptedData.slice(24, 56), 'hex');
  const encrypted = encryptedData.slice(56);
  const decipher = crypto.createDecipheriv('aes-256-gcm', sharedSecret, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

## 📊 总体完成度统计

### 按模块统计

| 模块名称 | 接口总数 | 已实现 | 有问题 | 未实现 | 完成度 |
|---------|---------|--------|--------|--------|--------|
| 认证服务 | 3 | 2 | 1 | 0 | 66% |
| 用户信息服务 | 1 | 1 | 0 | 0 | 100%* |
| 关系管理服务 | 8 | 8 | 0 | 0 | 100% |
| 医药服务 | 7 | 0 | 0 | 7 | 0% |
| 安全交换服务 | 5 | 0 | 0 | 5 | 0% |
| 通知服务 | 6 | 0 | 0 | 6 | 0% |
| ERC4337服务 | 11 | 11 | 0 | 0 | 100% |
| 账户迁移服务 | 5 | 5 | 0 | 0 | 100% |
| ZKP服务 | 2 | 0 | 0 | 2 | 0% |
| 加密工具 | 4 | 0 | 0 | 4 | 0% |
| **总计** | **52** | **27** | **1** | **24** | **52%** |

*注: 用户信息服务虽然完成度100%，但有路径和字段映射问题需要修复

### 按状态统计

```
✅ 完全正确:  27个接口 (52%)
⚠️ 需要修复:  1个接口  (2%)
❌ 完全未实现: 24个接口 (46%)
```

### 可视化进度条

```
完全正确  ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░ 52%
需要修复  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2%
未实现    ██████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░ 46%
```

---

## 🎯 优先级矩阵

| 优先级 | 模块 | 理由 | 预计工作量 |
|--------|------|------|-----------|
| 🔴 P0 | 修复现有bug (3个) | 影响现有功能 | 0.5天 |
| 🔴 P0 | 加密工具 (crypto.ts) | 其他模块依赖 | 2天 |
| 🟠 P1 | 医药服务 | 核心业务功能 | 5天 |
| 🟠 P1 | 安全交换服务 | 医患数据交换 | 5天 |
| 🟡 P2 | 通知服务 | 用户体验 | 3天 |
| 🟢 P3 | ZKP服务 | 隐私保护 | 2天 |
| 🟢 P3 | 更新加密公钥接口 | 密钥管理 | 0.5天 |

**总预计工作量**: 18天

---

## ✅ 每日检查清单

### Day 1: 修复现有问题
- [ ] 在 `auth.ts` 添加 `encryption_public_key`
- [ ] 修复 `api.config.ts` 用户信息路径
- [ ] 修复 `userInfo.ts` 字段映射
- [ ] 运行测试验证修复

### Day 2-3: 实现加密工具
- [ ] 创建 `src/utils/crypto.ts`
- [ ] 实现 `deriveSharedSecret()`
- [ ] 实现 `encrypt()`
- [ ] 实现 `decrypt()`
- [ ] 实现 `signData()`
- [ ] 编写单元测试
- [ ] 测试加解密流程

### Day 4-8: 实现医药服务
- [ ] 创建 `src/service/medication.ts`
- [ ] 在 `api.config.ts` 添加 MEDICATION_CONFIG
- [ ] 实现搜索药物接口
- [ ] 实现获取药物详情接口
- [ ] 实现创建用药计划接口（含加密）
- [ ] 实现查询用药计划接口（含解密）
- [ ] 实现更新/删除用药计划接口
- [ ] 集成到相关页面
- [ ] 端到端测试

### Day 9-13: 实现安全交换服务
- [ ] 创建 `src/service/secureExchange.ts`
- [ ] 在 `api.config.ts` 添加 SECURE_EXCHANGE_CONFIG
- [ ] 实现获取公钥接口
- [ ] 实现发送消息接口
- [ ] 实现查询消息接口
- [ ] 实现确认消息接口
- [ ] 实现WebSocket连接和监听
- [ ] 集成到相关页面
- [ ] 测试消息收发流程

### Day 14-16: 实现通知服务
- [ ] 创建 `src/service/notification.ts`
- [ ] 在 `api.config.ts` 添加 NOTIFICATION_CONFIG
- [ ] 实现WebSocket连接类
- [ ] 实现获取通知列表接口
- [ ] 实现未读数量接口
- [ ] 实现标记已读接口
- [ ] 实现删除通知接口
- [ ] 实现心跳和重连机制
- [ ] 集成到应用全局

### Day 17-18: 实现ZKP服务
- [ ] 创建 `src/service/zkp.ts`
- [ ] 在 `api.config.ts` 添加 ZKP_CONFIG
- [ ] 实现生成证明接口
- [ ] 实现查询状态接口（支持轮询）
- [ ] 集成到相关功能
- [ ] 测试证明生成流程

---

## 📝 代码审查检查点

在实现每个服务时，确保：

- [ ] 接口路径与API文档完全一致
- [ ] 请求参数类型正确
- [ ] 请求头包含必要的 Authorization
- [ ] 响应格式处理正确（`data` vs 直接返回）
- [ ] 错误处理完善
- [ ] TypeScript 类型定义完整
- [ ] 添加必要的日志输出
- [ ] 编写单元测试
- [ ] 更新文档

---

**最后更新**: 2025-10-31  
**下次复查**: 2025-11-07  
**负责人**: 前端开发团队


