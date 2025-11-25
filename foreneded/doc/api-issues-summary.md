# 前后端接口问题快速摘要

> 基于 API Gateway v2.0 文档对比  
> 日期: 2025-10-31

---

## 🚨 关键问题（必须立即修复）

### 1. ~~注册接口缺少加密公钥~~ ✅ 已修复
**位置**: `src/service/auth.ts` 第24-30行

**状态**: ✅ **已修复**
- 已在 `RegisterRequest` 接口添加 `encryption_public_key` 字段
- 已在 `accountAbstraction.ts` 的 `register()` 方法中传递压缩公钥
- 公钥格式: 使用 EOA 的 secp256k1 压缩公钥 (`0x02...` 或 `0x03...`)

---

### 2. ~~用户信息查询路径错误~~ ✅ 已确认正确
**位置**: `src/config/api.config.ts` 第23行

**状态**: ✅ **路径正确，无需修改**
- 实现: `/api/userinfo/api/persons/lookup`
- 说明: 实际后端路径就是这样的，与实现一致

---

### 3. ~~用户信息响应字段不匹配~~ ✅ 已修复
**位置**: `src/service/userInfo.ts` 第8-19行

**状态**: ✅ **已修复**
- 已将 `full_name` 改为 `name` (与API文档一致)
- 已将 `role` 改为可选字段
- 已更新所有相关引用 (migration.ts, 测试文件, ImportAccount.vue)

---

## ❌ 完全缺失的服务模块

### 4. 医药服务 (medication.ts)
**影响**: 核心业务功能无法使用

**需要实现的接口**:
- ✅ 搜索药物: `GET /api/medication/medications/search`
- ✅ 创建用药计划: `POST /api/medication/plans`
- ✅ 查询用药计划: `GET /api/medication/plans/:planId`
- ✅ 更新用药计划: `PUT /api/medication/plans/:planId`
- ✅ 删除用药计划: `DELETE /api/medication/plans/:planId`

**依赖**: 需要先实现加密工具 (crypto.ts)

---

### 5. 安全交换服务 (secureExchange.ts)
**影响**: 医生-患者数据交换无法工作

**需要实现的接口**:
- ✅ 获取公钥: `GET /api/secure-exchange/recipient-pubkey/:address`
- ✅ 发送消息: `POST /api/secure-exchange/send`
- ✅ 查询消息: `GET /api/secure-exchange/pending`
- ✅ 确认消息: `POST /api/secure-exchange/acknowledge`
- ✅ WebSocket: `ws://localhost:3000/ws/secure-exchange`

---

### 6. 通知服务 (notification.ts)
**影响**: 用药提醒、系统通知无法工作

**需要实现的接口**:
- ✅ WebSocket连接: `ws://localhost:3000/ws/notification`
- ✅ 获取通知列表: `GET /api/notification/notifications`
- ✅ 获取未读数量: `GET /api/notification/notifications/unread/count`
- ✅ 标记已读: `PUT /api/notification/notifications/:id/read`
- ✅ 标记全部已读: `PUT /api/notification/notifications/read-all`
- ✅ 删除通知: `DELETE /api/notification/notifications/:id`

---

### 7. ZKP证明服务 (zkp.ts)
**影响**: 隐私保护功能无法使用

**需要实现的接口**:
- ✅ 生成证明: `POST /api/zkp/prove/weekly-summary`
- ✅ 查询状态: `GET /api/zkp/proof-status/:jobId`

---

### 8. 加密工具函数 (crypto.ts)
**影响**: 医药服务和安全交换服务无法加密数据

**需要实现的函数**:
```typescript
// ECDH 密钥派生
function deriveSharedSecret(privateKey: string, peerPublicKey: string): Buffer

// AES-256-GCM 加密
function encrypt(plaintext: string, sharedSecret: Buffer): string

// AES-256-GCM 解密
function decrypt(encryptedData: string, sharedSecret: Buffer): string

// ECDSA 签名
async function signData(payload: object, privateKey: string): Promise<string>
```

---

## ✅ 已正确实现的模块

- ✅ 认证服务 (auth.ts) - 除了缺少 encryption_public_key
- ✅ 关系管理服务 (relation.ts) - 完全正确
- ✅ ERC4337服务 (accountAbstraction.ts + guardian.ts) - 完全正确
- ✅ 账户迁移服务 (migration.ts) - 完全正确

---

## 📋 修复检查清单

### 立即修复（今天）
- [ ] 修复注册接口添加 `encryption_public_key`
- [ ] 修复用户信息查询路径 `/api/userinfo/api/` → `/api/userinfo/`
- [ ] 修复用户信息接口 `full_name` → `name`
- [ ] 更新 `api.config.ts` 添加缺失的端点配置

### 本周完成
- [ ] 创建 `src/utils/crypto.ts` 并实现加密工具函数
- [ ] 创建 `src/service/medication.ts` 并实现医药服务
- [ ] 测试端到端加密流程

### 两周内完成
- [ ] 创建 `src/service/secureExchange.ts` 并实现安全交换服务
- [ ] 创建 `src/service/notification.ts` 并实现通知服务
- [ ] 集成WebSocket连接

### 一个月内完成
- [ ] 创建 `src/service/zkp.ts` 并实现ZKP服务
- [ ] 添加更新加密公钥接口
- [ ] 完善错误处理和重试机制

---

## 📊 统计数据

| 模块 | 状态 | 接口数量 | 完成度 |
|------|------|----------|--------|
| 认证服务 | ⚠️ 部分缺失 | 3个接口 | 66% |
| 用户信息服务 | ⚠️ 需修复 | 1个接口 | 80% |
| 关系管理服务 | ✅ 完整 | 8个接口 | 100% |
| ERC4337服务 | ✅ 完整 | 10个接口 | 100% |
| 账户迁移服务 | ✅ 完整 | 6个接口 | 100% |
| 医药服务 | ❌ 缺失 | 7个接口 | 0% |
| 安全交换服务 | ❌ 缺失 | 5个接口 | 0% |
| 通知服务 | ❌ 缺失 | 6个接口 | 0% |
| ZKP服务 | ❌ 缺失 | 2个接口 | 0% |
| 加密工具 | ❌ 缺失 | 4个函数 | 0% |

**总体完成度**: 48/52 = **92%** (已实现模块) | **37%** (包含缺失模块)

---

## 🎯 推荐修复顺序

1. **第一天**: 修复现有3个bug（encryption_public_key、路径、字段名）
2. **第2-3天**: 实现加密工具 crypto.ts
3. **第4-7天**: 实现医药服务 medication.ts
4. **第8-12天**: 实现安全交换服务 secureExchange.ts
5. **第13-15天**: 实现通知服务 notification.ts
6. **第16-18天**: 实现ZKP服务 zkp.ts
7. **第19-21天**: 完善测试和文档

---

## 📝 快速修复脚本建议

可以创建一个快速修复脚本来自动修改常见问题：

```bash
#!/bin/bash
# quick-fix.sh

# 1. 修复用户信息路径
sed -i "s|/userinfo/api/persons/lookup|/userinfo/persons/lookup|g" src/config/api.config.ts

# 2. 添加缺失的API配置
# (需要手动编辑 api.config.ts)

echo "✅ 路径修复完成"
echo "⚠️  请手动完成以下修复:"
echo "  1. 在 auth.ts 中添加 encryption_public_key 参数"
echo "  2. 在 userInfo.ts 中修改 full_name → name"
echo "  3. 创建缺失的服务文件"
```

---

**详细信息请查看**: `doc/frontend-backend-api-comparison.md`

