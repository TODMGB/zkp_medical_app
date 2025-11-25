# Chain 服务 - 社交恢复账户

基于 ERC4337 标准的账户抽象服务，支持社交恢复功能。所有交易由 Paymaster 代付 gas 费用。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

编辑 `.env` 文件：

```bash
# 服务端口
PORT=4337

# 区块链节点（Hardhat 本地节点）
ETH_NODE_URL=http://localhost:8545

# 服务器钱包私钥（用于提交交易）
PRIVATE_KEY=your_private_key_here
```

### 3. 部署智能合约

确保已部署以下合约，并更新 `smart_contract/addresses.json`：

- `EntryPoint` - ERC4337 入口点
- `SocialRecoveryAccountFactory` - 账户工厂
- `SimplePaymaster` - Gas 代付合约
- `SocialRecoveryAccount` - 社交恢复账户实现

### 4. Paymaster 充值

Paymaster 需要充值才能代付 gas：

```bash
# 使用 Hardhat 脚本充值
npx hardhat run scripts/fund-paymaster.js --network localhost
```

### 5. 启动服务

```bash
npm start
```

服务将在 `http://localhost:4337` 启动。

---

## 📁 API 路由架构

**📖 完整 API 文档**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

服务按功能模块划分为 6 个路由组：

```
/account      # 抽象账户管理
/guardian     # 守护者管理
/recovery     # 社交恢复流程
/bundler      # UserOperation 提交
/paymaster    # Paymaster 管理
/zkp          # ZKP 证明验证 ⭐新增
```

### 快速参考

### 核心路由

#### 1️⃣ 账户管理 `/account`

- `POST /account` - 创建社交恢复账户
- `POST /account/address` - 预计算账户地址
- `GET /account/:accountAddress` - 查询账户信息
- `GET /account/:accountAddress/nonce` - 获取账户 nonce
- `POST /account/initcode` - 构建 InitCode

#### 2️⃣ 守护者管理 `/guardian`

- `POST /guardian` - 添加守护者
- `GET /guardian/:accountAddress` - 查询守护者列表
- `PUT /guardian/threshold` - 修改恢复阈值

#### 3️⃣ 社交恢复 `/recovery`

- `POST /recovery/initiate` - 守护者发起恢复
- `POST /recovery/support` - 守护者支持恢复
- `POST /recovery/cancel` - Owner 取消恢复
- `GET /recovery/status/:accountAddress` - 查询恢复状态

#### 4️⃣ Bundler `/bundler`

- `POST /bundler/submit` - 提交 UserOperation

#### 5️⃣ Paymaster `/paymaster`

- `POST /paymaster/deposit` - Paymaster 充值
- `POST /paymaster/validate` - 验证 Paymaster

#### 6️⃣ ZKP验证 `/zkp` ⭐新增

- `POST /zkp/verify/medical-checkin` - 验证日常医药打卡证明
- `POST /zkp/verify/weekly-summary` - 验证每周打卡汇总证明
- `POST /zkp/verify/batch-medical-checkin` - 批量验证日常打卡证明
- `GET /zkp/verifiers` - 获取验证器信息

---

## 🧪 测试演示

### 运行完整流程演示

```bash
node scripts/demo-flow.js
```

该脚本将演示：

1. ✅ 创建用户抽象账户
2. ✅ 执行无费用交易（Paymaster 代付）
3. ✅ 创建 3 个守护者抽象账户
4. ✅ 添加守护者并设置阈值为 2
5. ✅ 社交恢复流程（2/3 守护者同意）
6. ✅ 验证 Owner 已更换
7. ✅ 新 Owner 执行无费用交易

### 使用 HTTP 测试

使用 VS Code REST Client 插件打开 `httpTest/api-test.http` 进行交互式测试。

---

## 💡 快速使用示例

### 创建账户
```bash
curl -X POST http://localhost:4337/account \
  -H "Content-Type: application/json" \
  -d '{
    "ownerAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "guardians": [],
    "threshold": 0,
    "salt": 100
  }'
```

### 添加守护者（安全方式）

**步骤 1: 构建未签名 UserOp**
```bash
curl -X POST http://localhost:4337/guardian/build \
  -H "Content-Type: application/json" \
  -d '{
    "accountAddress": "0xYourAccountAddress",
    "guardianAddress": "0xGuardianAddress"
  }'
```

**步骤 2: 客户端签名**（使用 ethers.js 在本地签名）

**步骤 3: 提交已签名 UserOp**
```bash
curl -X POST http://localhost:4337/guardian/submit \
  -H "Content-Type: application/json" \
  -d '{
    "userOp": {
      "sender": "0xYourAccountAddress",
      "nonce": "0",
      "signature": "0x<your_signature>",
      ...
    }
  }'
```

### 查询账户信息
```bash
curl http://localhost:4337/account/0xYourAccountAddress
```

**📖 更多示例**: 查看下方完整 API 文档

---

## 📖 文档

- **[📚 完整 API 文档](API_DOCUMENTATION.md)** - 包含所有端点、请求/响应示例和 cURL 命令
- **[API 路由文档](doc/API_ROUTES.md)** - API 路由架构和设计
- **[社交恢复 API](doc/RECOVERY_API.md)** - 社交恢复详细说明
- **[ZKP验证 API](doc/ZKP_VERIFICATION_API.md)** - ZKP证明验证接口文档 ⭐新增
- **[HTTP 测试集合](httpTest/api-test.http)** - 可执行的 API 测试
- **[ZKP验证测试](httpTest/zkp-verify.http)** - ZKP验证接口测试 ⭐新增

---

## 🏗️ 项目结构

```
erc4337-service/
├── src/
│   ├── controllers/          # 控制器层
│   │   ├── account.controller.js      # 账户管理
│   │   ├── guardian.controller.js     # 守护者管理
│   │   ├── recovery.controller.js     # 社交恢复
│   │   ├── bundler.controller.js      # Bundler
│   │   ├── paymaster.controller.js    # Paymaster
│   │   └── zkp.controller.js          # ZKP验证 ⭐新增
│   ├── routes/               # 路由层
│   │   ├── index.js                   # 主路由
│   │   ├── account.routes.js          # 账户路由
│   │   ├── guardian.routes.js         # 守护者路由
│   │   ├── recovery.routes.js         # 恢复路由
│   │   ├── bundler.routes.js          # Bundler 路由
│   │   ├── paymaster.routes.js        # Paymaster 路由
│   │   └── zkp.routes.js              # ZKP验证路由 ⭐新增
│   ├── services/             # 服务层
│   │   ├── recovery.service.js        # 恢复服务
│   │   ├── bundler.service.js         # Bundler 服务
│   │   ├── paymaster.service.js       # Paymaster 服务
│   │   ├── accountFactory.service.js  # 账户工厂服务
│   │   └── zkp.service.js             # ZKP验证服务 ⭐新增
│   ├── chain/                # 区块链客户端
│   └── config/               # 配置
├── smart_contract/           # 智能合约
│   └── addresses.json        # 合约地址和 ABI
├── scripts/                  # 脚本
│   └── demo-flow.js          # 完整流程演示
├── httpTest/                 # HTTP 测试
│   ├── api-test.http         # API 测试集合
│   └── zkp-verify.http       # ZKP验证测试 ⭐新增
├── doc/                      # 文档
│   ├── API_ROUTES.md         # API 文档
│   ├── RECOVERY_API.md       # 恢复 API 文档
│   └── ZKP_VERIFICATION_API.md  # ZKP验证文档 ⭐新增
└── server.js                 # 服务入口
```

---

## 🔑 核心概念

### EOA vs Smart Account

- **EOA (Externally Owned Account)**: 外部账户，有私钥，用于签名
- **Smart Account**: 智能合约账户，抽象账户的实现

在本系统中：
- 用户使用 **EOA 私钥签名** UserOperation
- 用户的身份是 **Smart Account 地址**（合约地址）
- Smart Account 可以有守护者，支持社交恢复
- 所有操作由 **Paymaster 代付 gas**

### 社交恢复流程

1. 用户设置 N 个守护者和阈值 M（M ≤ N）
2. 当用户丢失私钥时，守护者可以发起恢复
3. 需要至少 M 个守护者同意，才能将账户 Owner 更换为新地址
4. 恢复有时间锁保护（默认 2 天）

### Paymaster 代付

- 用户无需持有 ETH 即可使用服务
- 所有交易由 Paymaster 合约代付 gas
- Paymaster 需要提前充值

### ZKP证明验证 ⭐新增

- 支持两种类型的ZKP验证：
  - **日常医药打卡** - 验证用户的单次用药打卡证明
  - **每周打卡汇总** - 验证一周打卡记录的默克尔根证明
- 所有验证在链上执行，保证不可伪造
- 证明包含隐私保护的承诺值（commitment），不泄露真实数据
- 支持批量验证多个打卡证明

---

## 🔧 开发

### 本地开发

1. 启动 Hardhat 节点：
```bash
npx hardhat node
```

2. 部署合约：
```bash
npx hardhat run scripts/deploy.js --network localhost
```

3. 启动服务：
```bash
npm run dev
```

### 健康检查

```bash
curl http://localhost:4337/health
```

返回：
```json
{
  "status": "UP",
  "timestamp": "2025-10-31T08:37:00.000Z",
  "routes": {
    "account": "/account - 抽象账户管理",
    "guardian": "/guardian - 守护者管理",
    "recovery": "/recovery - 社交恢复流程",
    "bundler": "/bundler - UserOperation 提交",
    "paymaster": "/paymaster - Paymaster 管理",
    "zkp": "/zkp - ZKP证明验证"
  }
}
```

---

## 📋 完整 API 接口文档

### 🔐 安全架构说明

本服务采用 **两步式安全架构**，确保私钥永不离开客户端：

```
1️⃣ 调用 /build 接口 → 后端构建未签名 UserOperation
2️⃣ 客户端本地签名 → 使用私钥签名 UserOpHash
3️⃣ 调用 /submit 接口 → 提交已签名 UserOperation
```

**✅ 安全优势**：
- 私钥永不上传到服务器
- 符合 ERC-4337 标准
- Paymaster 代付所有 gas 费用

---

### 1️⃣ 账户管理 API

#### 创建社交恢复账户

**端点**: `POST /account`

**请求体**:
```json
{
  "ownerAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "guardians": [],
  "threshold": 0,
  "salt": 100
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "accountAddress": "0xAccountAddress",
    "ownerAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "txHash": "0xTransactionHash",
    "blockNumber": 12345
  }
}
```

#### 查询账户信息

**端点**: `GET /account/:accountAddress`

**响应**:
```json
{
  "success": true,
  "data": {
    "accountAddress": "0xAccountAddress",
    "owner": "0xOwnerAddress",
    "guardians": ["0xGuardian1", "0xGuardian2"],
    "threshold": "2",
    "guardiansCount": 2
  }
}
```

---

### 2️⃣ 守护者管理 API（安全版本）

#### 添加守护者（三步流程）

##### 步骤 1: 构建未签名 UserOp

**端点**: `POST /guardian/build`

**请求体**:
```json
{
  "accountAddress": "0xUserAccountAddress",
  "guardianAddress": "0xGuardianAddress"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "userOp": {
      "sender": "0xUserAccountAddress",
      "nonce": "0",
      "initCode": "0x",
      "callData": "0x...",
      "callGasLimit": "300000",
      "verificationGasLimit": "500000",
      "preVerificationGas": "100000",
      "maxFeePerGas": "10000000000",
      "maxPriorityFeePerGas": "2000000000",
      "paymasterAndData": "0xPaymasterAddress",
      "signature": "0x"
    },
    "userOpHash": "0xUserOpHash",
    "guardianAddress": "0xGuardianAddress"
  },
  "message": "请使用返回的 userOpHash 在客户端签名，然后调用 /guardian/submit 提交"
}
```

##### 步骤 2: 客户端签名（JavaScript 示例）

```javascript
const { ethers } = require('ethers');

// 使用用户的 EOA 私钥
const signer = new ethers.Wallet(privateKey, provider);

// 签名 UserOpHash
const signature = await signer.signMessage(
  ethers.getBytes(buildResp.data.userOpHash)
);

// 将签名添加到 UserOp
buildResp.data.userOp.signature = signature;
```

##### 步骤 3: 提交已签名 UserOp

**端点**: `POST /guardian/submit`

**请求体**:
```json
{
  "userOp": {
    "sender": "0xUserAccountAddress",
    "nonce": "0",
    "initCode": "0x",
    "callData": "0x...",
    "callGasLimit": "300000",
    "verificationGasLimit": "500000",
    "preVerificationGas": "100000",
    "maxFeePerGas": "10000000000",
    "maxPriorityFeePerGas": "2000000000",
    "paymasterAndData": "0xPaymasterAddress",
    "signature": "0x<已签名的signature>"
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "txHash": "0xTransactionHash",
    "blockNumber": 12345,
    "gasUsed": "250000",
    "status": 1
  }
}
```

#### 修改恢复阈值（三步流程）

##### 步骤 1: 构建未签名 UserOp

**端点**: `POST /guardian/threshold/build`

**请求体**:
```json
{
  "accountAddress": "0xUserAccountAddress",
  "newThreshold": 2
}
```

**响应**: 同上 `/guardian/build`

##### 步骤 2 & 3: 客户端签名 + 提交

使用 `POST /guardian/submit` 提交（同上）

#### 查询守护者列表

**端点**: `GET /guardian/:accountAddress`

**响应**:
```json
{
  "success": true,
  "data": {
    "accountAddress": "0xAccountAddress",
    "guardians": ["0xGuardian1", "0xGuardian2", "0xGuardian3"],
    "threshold": "2",
    "count": 3
  }
}
```

---

### 3️⃣ 社交恢复 API（安全版本）

#### 守护者发起恢复（三步流程）

##### 步骤 1: 构建未签名 UserOp

**端点**: `POST /recovery/initiate/build`

**请求体**:
```json
{
  "accountAddress": "0xUserAccountAddress",
  "guardianAccountAddress": "0xGuardianAccountAddress",
  "newOwnerAddress": "0xNewOwnerAddress"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "userOp": { /* UserOperation 对象 */ },
    "userOpHash": "0xUserOpHash",
    "newOwnerAddress": "0xNewOwnerAddress"
  },
  "message": "请使用返回的 userOpHash 在客户端签名，然后调用 /recovery/submit 提交"
}
```

##### 步骤 2: 守护者签名（JavaScript 示例）

```javascript
// 使用守护者的 EOA 私钥
const guardianSigner = new ethers.Wallet(guardianPrivateKey, provider);

// 签名 UserOpHash
const signature = await guardianSigner.signMessage(
  ethers.getBytes(buildResp.data.userOpHash)
);

// 将签名添加到 UserOp
buildResp.data.userOp.signature = signature;
```

##### 步骤 3: 提交已签名 UserOp

**端点**: `POST /recovery/submit`

**请求体**: 同 `/guardian/submit`

**响应**: 同 `/guardian/submit`

#### 守护者支持恢复（三步流程）

##### 步骤 1: 构建未签名 UserOp

**端点**: `POST /recovery/support/build`

**请求体**:
```json
{
  "accountAddress": "0xUserAccountAddress",
  "guardianAccountAddress": "0xGuardianAccountAddress",
  "newOwnerAddress": "0xNewOwnerAddress"
}
```

**响应**: 同 `/recovery/initiate/build`

##### 步骤 2 & 3: 守护者签名 + 提交

使用 `POST /recovery/submit` 提交

#### Owner 取消恢复（三步流程）

##### 步骤 1: 构建未签名 UserOp

**端点**: `POST /recovery/cancel/build`

**请求体**:
```json
{
  "accountAddress": "0xUserAccountAddress"
}
```

**响应**: 返回未签名 UserOp

##### 步骤 2 & 3: Owner 签名 + 提交

使用 `POST /recovery/submit` 提交

#### 查询恢复状态

**端点**: `GET /recovery/status/:accountAddress`

**响应**:
```json
{
  "success": true,
  "data": {
    "accountAddress": "0xAccountAddress",
    "newOwner": "0xNewOwnerAddress",
    "approvalCount": "2",
    "createdAt": "1234567890",
    "executed": false,
    "remainingTime": "172800"
  }
}
```

---

### 4️⃣ 完整使用示例

#### Node.js + ethers.js 示例

```javascript
const { ethers } = require('ethers');

// 1. 添加守护者的完整流程
async function addGuardian(userPrivateKey, accountAddress, guardianAddress) {
  // 步骤 1: 构建未签名 UserOp
  const buildResp = await fetch('http://localhost:4337/guardian/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountAddress,
      guardianAddress
    })
  }).then(r => r.json());

  // 步骤 2: 客户端签名
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');
  const signer = new ethers.Wallet(userPrivateKey, provider);
  const signature = await signer.signMessage(
    ethers.getBytes(buildResp.data.userOpHash)
  );
  buildResp.data.userOp.signature = signature;

  // 步骤 3: 提交已签名 UserOp
  const submitResp = await fetch('http://localhost:4337/guardian/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userOp: buildResp.data.userOp })
  }).then(r => r.json());

  console.log('交易哈希:', submitResp.data.txHash);
  return submitResp;
}

// 2. 守护者发起恢复
async function initiateRecovery(
  guardianPrivateKey,
  accountAddress,
  guardianAccountAddress,
  newOwnerAddress
) {
  // 步骤 1: 构建未签名 UserOp
  const buildResp = await fetch('http://localhost:4337/recovery/initiate/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountAddress,
      guardianAccountAddress,
      newOwnerAddress
    })
  }).then(r => r.json());

  // 步骤 2: 守护者签名
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');
  const guardianSigner = new ethers.Wallet(guardianPrivateKey, provider);
  const signature = await guardianSigner.signMessage(
    ethers.getBytes(buildResp.data.userOpHash)
  );
  buildResp.data.userOp.signature = signature;

  // 步骤 3: 提交已签名 UserOp
  const submitResp = await fetch('http://localhost:4337/recovery/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userOp: buildResp.data.userOp })
  }).then(r => r.json());

  console.log('恢复请求已发起，交易:', submitResp.data.txHash);
  return submitResp;
}
```

---

### ⚠️ 已弃用的 API（不安全）

以下 API 需要在请求中上传私钥，**已标记为弃用**，仅保留用于向后兼容：

- ❌ `POST /guardian` - 添加守护者（需要 `ownerPrivateKey`）
- ❌ `PUT /guardian/threshold` - 修改阈值（需要 `ownerPrivateKey`）
- ❌ `POST /recovery/initiate` - 发起恢复（需要 `guardianOwnerPrivateKey`）
- ❌ `POST /recovery/support` - 支持恢复（需要 `guardianOwnerPrivateKey`）
- ❌ `POST /recovery/cancel` - 取消恢复（需要 `ownerPrivateKey`）

**⚠️ 警告**: 请迁移到新的安全 API（`/build` + `/submit` 架构）

---

## ⚠️ 注意事项

1. **✅ 安全性**: 使用新的两步式 API，私钥永不离开客户端
2. **Gas 优化**: 当前 gas 参数为演示用途，实际使用需根据链上情况调整
3. **阈值设置**: 建议阈值设置为 `Math.ceil(guardians.length / 2)` 或更高
4. **时间锁**: 社交恢复有 2 天时间锁，可在合约中配置
5. **签名格式**: 使用 `signMessage()` 方法签名 UserOpHash

---

## 📝 许可证

MIT

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
