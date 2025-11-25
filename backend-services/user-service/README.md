# 用户服务 (User Service)

## 📋 服务概述

用户服务是老年医疗零知识证明系统的核心认证服务，负责用户注册、登录、身份验证和加密密钥管理。

## 🎯 核心功能

- ✅ **用户注册**：基于区块链地址的无密码注册
- ✅ **用户登录**：签名验证登录，生成JWT Token
- ✅ **加密公钥管理**：存储和更新用户的加密公钥
- ✅ **JWT认证**：为其他服务提供身份验证
- ✅ **gRPC服务**：提供内部服务间调用接口

## 📊 数据库

### 数据库信息
- **数据库名称**：`bs_user_service_db`
- **端口**：`5400`
- **用户**：`root`
- **密码**：`123456`

### 数据表结构

#### users - 用户表
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | UUID | 用户ID（主键） |
| eoa_address | VARCHAR(42) | EOA地址（唯一） |
| smart_account_address | VARCHAR(42) | 智能合约账户地址（唯一） |
| username | VARCHAR(50) | 用户名 |
| phone_number | VARCHAR(20) | 手机号（唯一） |
| id_card_number | VARCHAR(18) | 身份证号（唯一） |
| email | VARCHAR(100) | 邮箱（唯一） |
| encryption_public_key | TEXT | 加密公钥 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### user_roles - 用户角色表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 记录ID |
| user_id | UUID | 用户ID（外键） |
| role | VARCHAR(50) | 角色类型 |
| created_at | TIMESTAMP | 创建时间 |

### 角色类型
- `elderly` - 老人
- `doctor` - 医生
- `guardian` - 家属/监护人
- `admin` - 管理员

## 🚀 启动服务

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
PORT=3001
GRPC_PORT=50051
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# 数据库配置
DB_HOST=localhost
DB_PORT=5400
DB_USER=root
DB_PASSWORD=123456
DB_NAME=bs_user_service_db

# Redis配置
REDIS_URL=redis://localhost:6379

# RabbitMQ配置
MQ_URL=amqp://localhost:5672
MQ_EXCHANGE_NAME=exchange.users

# CORS配置
CORS_ALLOW_ALL=true
```

### 3. 启动服务

```bash
npm start
```

服务将在以下端口启动：
- **HTTP API**: `http://localhost:3001`
- **gRPC**: `localhost:50051`

## 🔌 API 端点

### 基础URL
- 直接访问: `http://localhost:3001/api/auth`
- 通过API Gateway: `http://localhost:3000/api/auth`

### 认证接口

#### 1. 用户注册

**端点**: `POST /api/auth/register`

**请求体**:
```json
{
  "eoa_address": "0x745dEBe1faA7bc662E75f84DC330b82316A12f23",
  "smart_account_address": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
  "phone_number": "13810010001",
  "id_card_number": "110101195803151234",
  "email": "wang.xiuying@example.net"
}
```

**响应**:
```json
{
  "success": true,
  "message": "用户注册成功",
  "data": {
    "user_id": "uuid",
    "eoa_address": "0x745dEBe1faA7bc662E75f84DC330b82316A12f23",
    "smart_account_address": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
    "username": "王秀英",
    "role": "elderly",
    "created_at": "2025-10-30T14:02:03.437Z"
  }
}
```

**说明**:
- 注册时会根据身份证号自动分配角色（老人/医生/家属）
- 系统会自动生成用户名
- EOA地址和Smart Account地址必须唯一

#### 2. 用户登录

**端点**: `POST /api/auth/login`

**请求体**:
```json
{
  "eoa_address": "0x745dEBe1faA7bc662E75f84DC330b82316A12f23",
  "login_time": "2025-10-30T14:15:22.000Z",
  "signature": "0x..."
}
```

**签名生成示例** (JavaScript):
```javascript
const { ethers } = require('ethers');

// 1. 生成登录时间
const loginTime = new Date().toISOString();

// 2. 构建消息
const message = `LOGIN_TIME:${loginTime}`;

// 3. 使用私钥签名
const wallet = new ethers.Wallet(privateKey);
const signature = await wallet.signMessage(message);

// 4. 发送登录请求
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eoa_address: wallet.address,
    login_time: loginTime,
    signature: signature
  })
});
```

**响应**:
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "user_id": "uuid",
      "eoa_address": "0x745dEBe1faA7bc662E75f84DC330b82316A12f23",
      "smart_account": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
      "username": "王秀英",
      "roles": ["elderly"]
    }
  }
}
```

**Token使用**:
```http
GET /api/some-protected-endpoint
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 3. 更新加密公钥

**端点**: `PUT /api/auth/encryption-key`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**请求体**:
```json
{
  "encryption_public_key": "0x02fcd2313687146ca8d6ccc04bf489b72e292990f5868306c63dfa9b6c0a33b740"
}
```

**响应**:
```json
{
  "success": true,
  "message": "加密公钥更新成功"
}
```

## 🔐 gRPC 接口

### Proto 定义

文件位置: `../proto/user.proto`

### 主要接口

#### 1. GetUserBySmartAccount
根据智能账户地址查询用户信息

**请求**:
```protobuf
message GetUserBySmartAccountRequest {
  string smart_account_address = 1;
}
```

**响应**:
```protobuf
message UserInfo {
  string user_id = 1;
  string eoa_address = 2;
  string smart_account_address = 3;
  string username = 4;
  repeated string roles = 5;
  string encryption_public_key = 6;
}
```

#### 2. GetEncryptionPublicKey
获取用户的加密公钥

**请求**:
```protobuf
message GetEncryptionPublicKeyRequest {
  string smart_account_address = 1;
}
```

**响应**:
```protobuf
message EncryptionPublicKeyResponse {
  string encryption_public_key = 1;
  string smart_account_address = 2;
}
```

#### 3. ValidateUser
验证用户是否存在

**请求**:
```protobuf
message ValidateUserRequest {
  string smart_account_address = 1;
}
```

**响应**:
```protobuf
message ValidateUserResponse {
  bool exists = 1;
  UserInfo user = 2;
}
```

## 🔄 与其他服务的集成

### 1. API Gateway
- 所有HTTP请求通过API Gateway转发
- API Gateway负责JWT验证
- Gateway将用户信息注入请求头

### 2. Secure Exchange Service
- 通过gRPC调用 `GetEncryptionPublicKey` 获取用户公钥
- 用于端到端加密通信

### 3. Relationship Service
- 通过gRPC调用 `GetUserBySmartAccount` 验证用户身份
- 用于关系管理权限验证

### 4. Notification Service
- 通过gRPC验证用户存在性
- 用于通知推送

## 📝 开发说明

### 技术栈

- **Node.js** + **Express** (HTTP服务)
- **gRPC** (微服务间通信)
- **PostgreSQL** 17.6 (数据库)
- **Redis** (缓存)
- **RabbitMQ** (消息队列)
- **JWT** (身份验证)
- **ethers.js** (签名验证)

### 项目结构

```
user-service/
├── src/
│   ├── config/                 # 配置
│   │   └── index.js
│   ├── controllers/            # 控制器
│   │   └── auth.controller.js
│   ├── entity/                 # 数据库操作
│   │   ├── db.js
│   │   └── user.entity.js
│   ├── middleware/             # 中间件
│   │   ├── auth.middleware.js
│   │   ├── cors.middleware.js
│   │   ├── errorHandler.middleware.js
│   │   └── requestLogger.middleware.js
│   ├── routes/                 # 路由
│   │   ├── index.js
│   │   └── auth.routes.js
│   ├── rpc/                    # gRPC
│   │   ├── server.js
│   │   └── handlers/
│   │       └── user.handler.js
│   ├── services/               # 业务逻辑
│   │   └── auth.service.js
│   ├── mq/                     # 消息队列
│   └── redis/                  # Redis客户端
├── server.js                   # 服务入口
└── package.json
```

## 🔒 安全特性

### 1. 无密码登录
- 基于区块链签名验证
- 防止密码泄露风险
- 每次登录需要新签名

### 2. JWT Token
- 24小时有效期
- 包含用户ID、地址、角色信息
- 使用HS256算法签名

### 3. 签名验证
- 验证签名与地址匹配
- 防止中间人攻击
- 时间戳验证（防重放）

### 4. 加密公钥管理
- 存储用户的加密公钥
- 用于端到端加密通信
- 支持动态更新

## 📚 使用示例

### 完整注册登录流程

```javascript
const { ethers } = require('ethers');
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function registerAndLogin() {
  // 1. 创建钱包
  const wallet = ethers.Wallet.createRandom();
  
  // 2. 预计算Smart Account地址（调用ERC4337服务）
  const accountResp = await axios.post(`${API_BASE}/erc4337/account/address`, {
    ownerAddress: wallet.address,
    guardians: [],
    threshold: 0,
    salt: Math.floor(Math.random() * 1000000)
  });
  
  const smartAccount = accountResp.data.data.accountAddress;
  
  // 3. 注册用户
  const registerResp = await axios.post(`${API_BASE}/auth/register`, {
    eoa_address: wallet.address,
    smart_account_address: smartAccount,
    phone_number: '13800138000',
    id_card_number: '110101199001011234',
    email: 'user@example.com'
  });
  
  console.log('注册成功:', registerResp.data);
  
  // 4. 登录
  const loginTime = new Date().toISOString();
  const message = `LOGIN_TIME:${loginTime}`;
  const signature = await wallet.signMessage(message);
  
  const loginResp = await axios.post(`${API_BASE}/auth/login`, {
    eoa_address: wallet.address,
    login_time: loginTime,
    signature: signature
  });
  
  const token = loginResp.data.data.token;
  console.log('登录成功, Token:', token.substring(0, 50) + '...');
  
  // 5. 使用Token访问受保护接口
  const protectedResp = await axios.get(`${API_BASE}/some-endpoint`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return { wallet, smartAccount, token };
}
```

## ⚠️ 注意事项

1. **私钥安全**：私钥永远不应该发送到服务器
2. **Token管理**：Token应安全存储，不要暴露给第三方
3. **签名唯一性**：每次登录应使用新的时间戳
4. **数据库索引**：EOA地址、Smart Account地址、手机号等字段已建立索引
5. **角色权限**：不同角色拥有不同的系统权限

## 🏥 健康检查

访问 `http://localhost:3001/health` 查看服务状态

**响应**:
```json
{
  "status": "UP"
}
```

---

**文档版本**: 1.0.0  
**最后更新**: 2025-10-31

