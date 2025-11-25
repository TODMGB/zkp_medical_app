# 端到端测试说明文档

## 📋 测试概述

这是一个完整的端到端（E2E）测试脚本，覆盖从创建抽象账户到关系管理的整个业务流程。

### 测试流程

```
步骤1: 创建EOA钱包（老人、医生、家属）
  ↓
步骤2: 创建Smart Account（抽象账户）
  ↓
步骤3: 注册用户账户
  ↓
步骤4: 用户登录获取Token
  ↓
步骤5: 老人查看访问组（预设5个群组）
  ↓
步骤6: 老人创建自定义访问组
  ↓
步骤7: 老人创建邀请（医生、家属）
  ↓
步骤8: 医生和家属接受邀请
  ↓
步骤9: 查看访问组成员
  ↓
步骤10: 关系管理（暂停、恢复、撤销）
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd api-gateway
npm install axios ethers
```

### 2. 启动所有服务

```bash
# 返回项目根目录
cd g:\biyesheji\Elder_Medical_ZKP_project

# 启动所有服务
.\start-all-services.ps1
```

确保以下服务正常运行：
- ✅ PostgreSQL 数据库（:5432）
- ✅ Redis（:6379）
- ✅ relationship-service（gRPC :50053）
- ✅ user-service（gRPC :50051）
- ✅ erc4337-service（HTTP :4337）
- ✅ api-gateway（HTTP :3000）

### 3. 执行数据库迁移

```bash
cd relationship-service
psql -U root -d your_database_name -f migrations/001_enhance_relationship_tables.sql
```

### 4. 运行测试

```bash
cd api-gateway
node tests/e2e-relationship-flow.test.js
```

---

## 📊 测试输出示例

```
检查环境...
API Base URL: http://localhost:3000
请确保以下服务已启动:
  - PostgreSQL 数据库
  - Redis
  - relationship-service (gRPC :50053)
  - user-service (gRPC :50051)
  - erc4337-service (HTTP :4337)
  - api-gateway (HTTP :3000)

开始测试...

======================================================================
📍 步骤1: 创建三个角色的EOA钱包
======================================================================
✅ [老人] EOA: 0x1234...5678
✅ [医生] EOA: 0xabcd...efgh
✅ [家属] EOA: 0x9876...5432

======================================================================
📍 步骤2: 创建Smart Account（抽象账户）
======================================================================
ℹ️  正在为老人创建Smart Account...
✅ [老人] Smart Account: 0xaaaa...bbbb
ℹ️  正在为医生创建Smart Account...
✅ [医生] Smart Account: 0xcccc...dddd
ℹ️  正在为家属创建Smart Account...
✅ [家属] Smart Account: 0xeeee...ffff

... (省略中间步骤)

======================================================================
🎉 测试完成！所有步骤执行成功
======================================================================
⏱️  总耗时: 15.34 秒

📊 测试数据总结:
   - 创建账户数: 3 (老人、医生、家属)
   - 访问组数: 6
   - 邀请数: 2
   - 关系数: 1

✅ 所有功能验证通过！
```

---

## 🧪 测试覆盖的功能

### 账户管理
- [x] 创建EOA钱包
- [x] 创建Smart Account（ERC-4337抽象账户）
- [x] 用户注册
- [x] 用户登录（签名验证）

### 访问组管理
- [x] 自动初始化5个预设访问组
  - 主治医生组
  - 医护团队
  - 家人
  - 紧急联系人
  - 康复师/理疗师
- [x] 创建自定义访问组
- [x] 查看访问组列表
- [x] 查看访问组详情（含成员统计）
- [x] 查看访问组成员

### 邀请管理
- [x] 创建标准邀请
- [x] 接受邀请
- [x] 建立关系

### 关系管理
- [x] 暂停关系（临时禁用访问权限）
- [x] 恢复关系（重新启用访问权限）
- [x] 撤销关系（永久删除关系）

---

## 🔧 环境变量配置

测试脚本支持通过环境变量配置：

```bash
# 设置API基础URL
export API_BASE_URL=http://localhost:3000

# 运行测试
node tests/e2e-relationship-flow.test.js
```

或者在 Windows PowerShell 中：

```powershell
$env:API_BASE_URL="http://localhost:3000"
node tests/e2e-relationship-flow.test.js
```

---

## 📝 测试数据结构

测试过程中生成的数据会存储在 `testData` 对象中：

```javascript
{
  elder: {
    role: '老人',
    eoaWallet: Wallet,        // ethers.js Wallet对象
    smartAccount: '0x...',    // Smart Account地址
    salt: 123456,             // 创建Smart Account时使用的盐值
    token: 'JWT...',          // 认证Token
    accessGroups: []          // 访问组列表
  },
  doctor: {
    role: '医生',
    eoaWallet: Wallet,
    smartAccount: '0x...',
    salt: 234567,
    token: 'JWT...'
  },
  family: {
    role: '家属',
    eoaWallet: Wallet,
    smartAccount: '0x...',
    salt: 345678,
    token: 'JWT...'
  },
  invitations: [
    { token: '...', role: 'doctor', groupId: 1 }
  ],
  relationships: [
    { id: 1, role: 'doctor' }
  ]
}
```

---

## 🐛 常见问题

### Q1: 提示 "ECONNREFUSED"
**原因**：服务未启动或端口错误  
**解决**：
```bash
# 检查服务状态
netstat -ano | findstr "3000"
netstat -ano | findstr "4337"
netstat -ano | findstr "50051"
netstat -ano | findstr "50053"

# 启动服务
.\start-all-services.ps1
```

### Q2: 数据库错误
**原因**：数据库迁移未执行  
**解决**：
```bash
cd relationship-service
psql -U root -d your_database -f migrations/001_enhance_relationship_tables.sql
```

### Q3: 签名验证失败
**原因**：登录逻辑问题  
**解决**：确保 user-service 的签名验证逻辑与测试脚本一致

### Q4: Smart Account 创建失败
**原因**：erc4337-service 未正常工作  
**解决**：
```bash
# 检查 erc4337-service 日志
cd erc4337-service
npm start
```

---

## 📦 在 package.json 中添加测试脚本

在 `api-gateway/package.json` 中添加：

```json
{
  "scripts": {
    "test:e2e": "node tests/e2e-relationship-flow.test.js",
    "test:e2e:watch": "nodemon tests/e2e-relationship-flow.test.js"
  }
}
```

然后可以这样运行：

```bash
npm run test:e2e
```

---

## 🔍 调试模式

如果需要查看详细的HTTP请求和响应，可以修改 `apiRequest` 函数：

```javascript
async function apiRequest(method, path, data = null, token = null) {
  console.log(`[DEBUG] ${method} ${path}`, data); // 添加这行
  
  // ... 原有代码
  
  console.log(`[DEBUG] Response:`, response.data); // 添加这行
}
```

---

## 🎯 自定义测试

你可以单独运行某个步骤：

```javascript
const test = require('./tests/e2e-relationship-flow.test');

(async () => {
  // 只运行前4步
  await test.step1_createWallets();
  await test.step2_createSmartAccounts();
  await test.step3_registerUsers();
  await test.step4_loginUsers();
  
  console.log('测试数据:', test.testData);
})();
```

---

## 📊 性能基准

参考性能指标（在本地环境测试）：

| 步骤 | 预期耗时 |
|------|---------|
| 步骤1-2（创建钱包和账户） | 2-3秒 |
| 步骤3-4（注册和登录） | 2-3秒 |
| 步骤5-6（访问组操作） | 1-2秒 |
| 步骤7-8（邀请流程） | 2-3秒 |
| 步骤9-10（查看和管理） | 2-3秒 |
| **总计** | **约15秒** |

---

## ✅ 测试检查清单

运行测试前检查：

- [ ] PostgreSQL 已启动
- [ ] Redis 已启动
- [ ] 所有微服务已启动（user, erc4337, relationship）
- [ ] API Gateway 已启动
- [ ] 数据库迁移已执行
- [ ] 依赖已安装（axios, ethers）

---

## 📞 技术支持

如有问题，请查看：
1. 测试脚本：`tests/e2e-relationship-flow.test.js`
2. API文档：`tests/relationship-api.test.md`
3. 集成文档：`RELATIONSHIP_API_INTEGRATION.md`

---

**祝测试顺利！** 🎉
