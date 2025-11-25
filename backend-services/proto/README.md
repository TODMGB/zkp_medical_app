# gRPC Proto 文件统一管理目录

本目录集中管理项目中所有的 gRPC Protocol Buffers 定义文件（`.proto`）。

## 📁 文件说明

### 1. `user_auth.proto`
- **Package**: `user_auth`
- **服务提供方**: `user-service` (gRPC Server)
- **服务消费方**: 无（仅供 user-service 自身使用）
- **功能**: 用户认证相关的 RPC 服务
  - 用户注册 (`Register`)
  - 用户登录 (`Login`)
  - 获取用户加密公钥 (`GetUserPublicKey`)

### 2. `relationship.proto`
- **Package**: `relationship`
- **服务提供方**: `relationship-service` (gRPC Server)
- **服务消费方**: `user-service`, `api-gateway` (gRPC Client)
- **功能**: 关系管理相关的 RPC 服务
  - 访问组管理（创建、查询、初始化默认组）
  - 邀请管理（创建、接受、取消邀请）
  - 关系管理（查询授权、暂停、恢复、撤销关系）

### 3. `user.proto`
- **Package**: `user`
- **服务提供方**: `user-service` (gRPC Server，示例服务)
- **服务消费方**: `notification-service`, `migration-service`, `erc4337-service`, `secure-exchange-service`, `example` (gRPC Client)
- **功能**: 通用用户服务（示例/模板）
  - 通过 ID 获取用户 (`GetUserById`)
  - 创建新用户 (`CreateUser`)
  - **注意**: 这是一个示例服务，实际生产环境可能不使用

## 🔗 服务依赖关系

```
user-service (Server)
  ├─ user_auth.proto (自用)
  └─ relationship.proto (Client → relationship-service)

relationship-service (Server)
  └─ relationship.proto (提供服务)

notification-service (Client)
  └─ user.proto (Client → user-service 示例)

migration-service (Client)
  └─ user.proto (Client → user-service 示例)

erc4337-service (Client)
  └─ user.proto (Client → user-service 示例)

secure-exchange-service (Client)
  └─ user.proto (Client → user-service 示例)
```

## 📝 使用方法

各个服务通过以下方式引用统一的 proto 文件：

```javascript
// 示例：user-service 引用 user_auth.proto
const PROTO_PATH = path.join(__dirname, '../../proto/user_auth.proto');
```

### 服务端（Server）加载示例

```javascript
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../../proto/user_auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const userAuthProto = grpc.loadPackageDefinition(packageDefinition).user_auth;

// 创建服务器并绑定服务
const server = new grpc.Server();
server.addService(userAuthProto.UserAuthService.service, handlers);
```

### 客户端（Client）加载示例

```javascript
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../../proto/relationship.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const relationshipProto = grpc.loadPackageDefinition(packageDefinition).relationship;

// 创建客户端
const client = new relationshipProto.RelationshipService(
  'localhost:50052',
  grpc.credentials.createInsecure()
);
```

## 🛠️ 修改 Proto 文件后的注意事项

1. **修改 proto 文件后**，需要重启所有依赖该文件的服务（包括 Server 和 Client）
2. **如果修改了服务定义**（增删改 RPC 方法），需要同步更新对应的 handler 或 client 调用代码
3. **如果修改了消息定义**（增删改 message 字段），需要确保字段编号（field number）保持兼容性

## 📚 参考资料

- [Protocol Buffers 文档](https://protobuf.dev/)
- [gRPC Node.js 文档](https://grpc.io/docs/languages/node/)
- [Protocol Buffers 风格指南](https://protobuf.dev/programming-guides/style/)

---

**最后更新**: 2025-10-29  
**维护者**: Backend Team

