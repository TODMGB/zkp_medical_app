# API 网关

Elder Medical 智慧养老系统的统一 API 网关，负责路由所有外部请求到后端微服务。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制并编辑 `.env` 文件：

```bash
cp .env.example .env
```

主要配置项：

```bash
# 服务端口
PORT=3000

# JWT 密钥
JWT_SECRET=your_jwt_secret_key_here

# 微服务 URL
USERINFO_SERVICE_URL=http://localhost:5000
CHAIN_SERVICE_URL=http://localhost:4337

# CORS 配置
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8100

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=elder_medical_gateway
DB_USER=postgres
DB_PASSWORD=your_password

# Redis 配置
REDIS_URL=redis://localhost:6379

# RabbitMQ 配置
MQ_URL=amqp://localhost
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3000` 启动。

---

## 📁 项目结构

```
api-gateway/
├── src/
│   ├── config/              # 配置文件
│   ├── controllers/         # 控制器层
│   ├── routes/              # 路由层
│   │   ├── index.js         # 主路由
│   │   ├── auth.routes.js   # 认证路由
│   │   ├── userinfo.routes.js # 用户信息路由
│   │   ├── relationship.routes.js # 关系管理路由
│   │   └── chain.routes.js # Chain 账户抽象路由
│   ├── middleware/          # 中间件
│   │   ├── auth.middleware.js # JWT 认证
│   │   ├── cors.middleware.js # 跨域处理
│   │   ├── security.middleware.js # 安全头
│   │   ├── requestLogger.middleware.js # 请求日志
│   │   ├── errorHandler.middleware.js # 错误处理
│   │   └── notFoundHandler.middleware.js # 404 处理
│   ├── services/            # 服务层
│   ├── utils/               # 工具函数
│   │   └── proxy.util.js    # 代理工具
│   ├── rpc/                 # gRPC 客户端
│   ├── redis/               # Redis 客户端
│   └── mq/                  # 消息队列
├── docs/                    # 文档
│   └── CHAIN_INTEGRATION.md # Chain 集成文档
├── httpTest/                # HTTP 测试文件
├── server.js                # 服务入口
└── package.json
```

---

## 📡 API 路由

### 公开路由（无需认证）

#### 1. 认证服务 `/api/auth`

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/refresh` - 刷新 Token

#### 2. 用户信息服务 `/api/userinfo`

- `GET /api/userinfo/check-eoa/:eoaAddress` - 检查 EOA 是否已注册
- `GET /api/userinfo/check-smart/:smartAccount` - 检查 Smart Account 是否已注册

#### 3. Chain 账户抽象服务 `/api/chain`

**🔐 安全架构：两步式流程（私钥永不上传）**

**账户管理：**
- `POST /api/chain/account` - 创建社交恢复账户
- `GET /api/chain/account/:address` - 查询账户信息

**守护者管理（安全版本）：**
- `POST /api/chain/guardian/build` - 🔒 构建添加守护者 UserOp
- `POST /api/chain/guardian/threshold/build` - 🔒 构建修改阈值 UserOp
- `POST /api/chain/guardian/submit` - 🔒 提交已签名 UserOp
- `GET /api/chain/guardian/:address` - 查询守护者列表

**社交恢复（安全版本）：**
- `POST /api/chain/recovery/initiate/build` - 🔒 构建发起恢复 UserOp
- `POST /api/chain/recovery/support/build` - 🔒 构建支持恢复 UserOp
- `POST /api/chain/recovery/cancel/build` - 🔒 构建取消恢复 UserOp
- `POST /api/chain/recovery/submit` - 🔒 提交已签名 UserOp
- `GET /api/chain/recovery/status/:address` - 查询恢复状态

🔒 = 需要客户端本地签名

**📖 详细文档**: [Chain 集成文档](./docs/CHAIN_INTEGRATION.md)

### 受保护路由（需要 JWT 认证）

#### 4. 关系管理服务 `/api/relation`

- `POST /api/relation/follow` - 关注用户
- `POST /api/relation/unfollow` - 取消关注
- `GET /api/relation/followers/:smartAccount` - 获取粉丝列表
- `GET /api/relation/following/:smartAccount` - 获取关注列表
- `GET /api/relation/friends/:smartAccount` - 获取好友列表

---

## 🔐 Chain 集成说明

### 安全架构

所有 Chain 操作采用**两步式安全架构**，确保私钥永不离开客户端：

```
1️⃣ 客户端调用 /build 接口 → 后端构建未签名 UserOperation
2️⃣ 客户端本地签名 → 使用 EOA 私钥签名 UserOpHash
3️⃣ 客户端调用 /submit 接口 → 提交已签名 UserOperation
```

### 快速示例

```javascript
const { ethers } = require('ethers');

// 添加守护者
async function addGuardian(userPrivateKey, accountAddress, guardianAddress) {
  const apiGateway = 'http://localhost:3000';
  
  // 1. 构建未签名 UserOp
  const buildResp = await fetch(`${apiGateway}/api/chain/guardian/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountAddress, guardianAddress })
  }).then(r => r.json());

  // 2. 客户端签名
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');
  const signer = new ethers.Wallet(userPrivateKey, provider);
  const signature = await signer.signMessage(
    ethers.getBytes(buildResp.data.userOpHash)
  );
  buildResp.data.userOp.signature = signature;

  // 3. 提交已签名 UserOp
  const submitResp = await fetch(`${apiGateway}/api/chain/guardian/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userOp: buildResp.data.userOp })
  }).then(r => r.json());

  console.log('交易哈希:', submitResp.data.txHash);
  return submitResp;
}
```

**📖 完整文档**: [Chain 集成文档](./docs/CHAIN_INTEGRATION.md)

---

## 🔒 安全特性

### 1. JWT 认证

受保护的路由需要在请求头中携带 JWT Token：

```bash
Authorization: Bearer <your_jwt_token>
```

### 2. CORS 配置

配置允许的前端源地址：

```bash
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8100
```

### 3. 安全头

自动添加安全响应头：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

### 4. 请求日志

所有请求都会被记录，包含：
- 请求方法和路径
- 响应状态码
- 响应时间
- 错误信息（如有）

---

## 🔧 开发

### 健康检查

```bash
# 网关健康检查
curl http://localhost:3000/health

# API 健康检查
curl http://localhost:3000/api/health
```

### 测试

```bash
# 运行测试
npm test

# 使用 HTTP 测试文件
# 在 VS Code 中安装 REST Client 插件
# 打开 httpTest/*.http 文件并执行请求
```

### 日志

查看实时日志：

```bash
# 开发模式（带颜色输出）
npm run dev

# 生产模式
npm start 2>&1 | tee api-gateway.log
```

---

## 🏗️ 架构设计

### 代理模式

API 网关使用统一的代理工具转发请求到微服务：

```javascript
// 使用代理工具
const { createProxyHandler } = require('./utils/proxy.util');

router.use(createProxyHandler('ServiceName', serviceUrl));
```

优势：
- ✅ 统一的错误处理
- ✅ 自动日志记录
- ✅ 请求/响应转发
- ✅ 超时控制（60秒）

### 中间件链

```
请求 → 安全中间件 → CORS → JSON解析 → 请求日志 
     → 路由 → 认证中间件 → 业务逻辑 
     → 404处理 → 错误处理 → 响应
```

---

## 📊 监控

### 请求日志示例

```
[ERC4337 Proxy] POST /api/erc4337/guardian/build
[ERC4337 Proxy] 转发到: http://localhost:4337/guardian/build
[ERC4337 Proxy] 响应状态: 200 (125ms)
```

### 错误日志示例

```
[ERC4337 Proxy] 错误 (1523ms): connect ECONNREFUSED 127.0.0.1:4337
[ERC4337 Proxy] 无法连接到目标服务: http://localhost:4337
```

---

## ⚠️ 注意事项

1. **微服务可用性**：确保所有后端微服务正常运行
2. **环境变量**：生产环境必须配置强密码和密钥
3. **HTTPS**：生产环境必须使用 HTTPS
4. **速率限制**：建议添加速率限制中间件
5. **日志管理**：生产环境使用专业日志管理系统

---

## 📚 文档

- [ERC4337 集成文档](./docs/ERC4337_INTEGRATION.md)
- [ERC4337 服务文档](../erc4337-service/README.md)
- [API 测试集合](./httpTest/)

---

## 🤝 支持

### 健康检查端点

- 网关：`http://localhost:3000/health`
- API：`http://localhost:3000/api/health`
- ERC4337：`http://localhost:4337/health`

### 常见问题

**Q: ERC4337 服务不可用（503错误）**
```bash
# 检查 ERC4337 服务是否运行
curl http://localhost:4337/health

# 启动 ERC4337 服务
cd ../erc4337-service && npm start
```

**Q: CORS 错误**
```bash
# 在 .env 中添加前端源地址
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

**Q: JWT 认证失败**
```bash
# 确保请求头包含有效的 Token
Authorization: Bearer <your_jwt_token>
```

---

## 📝 许可证

MIT

---

## 🎯 未来计划

- [ ] 添加速率限制中间件
- [ ] 集成分布式追踪（Jaeger）
- [ ] 添加 GraphQL 网关
- [ ] 实现服务熔断和降级
- [ ] 添加 WebSocket 支持
