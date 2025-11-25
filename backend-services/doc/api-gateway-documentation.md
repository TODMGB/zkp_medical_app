# API Gateway 接口文档

## 概述

**基础URL**: `http://localhost:3000/api`

## 认证机制

系统使用JWT Token进行身份认证和权限控制（RBAC）。

### JWT Token 包含的信息

- `user_id`: 用户唯一标识符（UUID）
- `eoa_address`: EOA地址，用于签名验证（登录时使用）
- `smart_account`: Smart Account地址，作为用户主键和身份标识
- `roles`: 用户角色数组，用于权限控制

### 认证流程

1. 用户使用EOA私钥签名登录消息
2. 系统验证签名后颁发包含角色信息的JWT Token
3. 后续请求在Header中携带Token：`Authorization: Bearer <token>`
4. API Gateway自动验证Token并提取用户信息
5. API Gateway将用户的 `smart_account`注入到请求头 `x-user-smart-account`中转发给后端服务

### 自动注入的请求头

API Gateway在转发受保护接口的请求时，会自动添加以下请求头：

- `x-user-smart-account`: 从JWT Token中提取的用户Smart Account地址
- 后端服务无需手动解析JWT Token，直接使用该请求头即可获取用户标识

## 接口分类

### 🔓 公开接口（无需认证）

- 健康检查
- 用户认证
- 用户信息查询
- ERC4337服务（账户抽象）
- 账户迁移服务

### 🔒 受保护接口（需要认证）

- 关系管理

---

## 1. 健康检查

### GET /health

检查API Gateway服务状态

**响应示例**:

```json
{
  "status": "UP",
  "service": "api-gateway"
}
```

---

## 2. 用户认证

### POST /auth/register

用户注册

**请求体**:

```json
{
  "eoa_address": "0x...",
  "smart_account_address": "0x...",
  "phone_number": "13800138000",
  "id_card_number": "110101199001011234",
  "email": "user@example.com"
}
```

**说明**:

- `eoa_address`: EOA钱包地址（必填）
- `smart_account_address`: Smart Account地址（必填）
- `phone_number`: 手机号（可选，至少需要提供一个身份标识）
- `id_card_number`: 身份证号（可选）
- `email`: 邮箱（可选）

**响应示例**:

```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user_id": "uuid-here",
    "eoa_address": "0x...",
    "smart_account_address": "0x...",
    "username": "张三",
    "role": "elderly",
    "token": "eyJ..."
  }
}
```

### POST /auth/login

用户登录

**请求体**:

```json
{
  "eoa_address": "0x...",
  "login_time": "2025-10-27T10:00:00.000Z",
  "signature": "0x..."
}
```

**说明**:

- `eoa_address`: EOA钱包地址
- `login_time`: 登录时间（ISO 8601格式）
- `signature`: 对消息 `LOGIN_TIME:${login_time}` 的签名
- 服务器会自动构建消息并验证签名

**响应示例**:

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user_id": "uuid",
    "eoa_address": "0x...",
    "smart_account_address": "0x...",
    "username": "张三",
    "phone_number": "13800138000",
    "roles": ["elderly"],
    "token": "eyJ..."
  }
}
```

**响应字段说明**:

- `roles`: 用户角色数组，可能的值包括：
  - `elderly`: 老人
  - `doctor`: 医生
  - `guardian`: 家属/监护人
  - `nurse`: 护士
  - `hospital_admin`: 医院管理员

---

## 3. 用户信息查询

### GET /userinfo/api/persons/lookup

根据身份信息查询个人档案（注册前验证）

**查询参数**:

- `id_card_number`: 身份证号（可选）
- `phone_number`: 手机号（可选）
- `email`: 邮箱（可选）
- 注：至少需要提供一个查询参数

**响应示例**:

```json
{
  "id": 1,
  "full_name": "张三",
  "id_card_number": "1101**********1234",
  "phone_number": "13800138000",
  "email": "zhangsan@example.com",
  "role": "elderly",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

**错误响应**:

```json
{
  "message": "未找到人员记录。"
}
```

---

## 4. ERC4337 服务（账户抽象）

> **转发服务**: 所有请求转发到 `erc4337-service:4337`

### 4.1 健康检查

#### GET /erc4337/health

检查ERC4337服务状态

### 4.2 账户管理

#### POST /erc4337/account

创建社交恢复账户

**请求体**:

```json
{
  "ownerAddress": "0x...",
  "guardians": [],
  "threshold": 0,
  "salt": 123456
}
```

**说明**:

- `ownerAddress`: 账户所有者的EOA地址（必填）
- `guardians`: 初始守护者列表（可选，默认为空数组）
- `threshold`: 社交恢复阈值（可选，默认为0）
- `salt`: 用于确定性地址生成的盐值（可选）

**响应示例**:

```json
{
  "success": true,
  "data": {
    "accountAddress": "0x...",
    "txHash": "0x...",
    "isDeployed": true
  }
}
```

#### POST /erc4337/account/address

预计算账户地址（不创建账户）

**请求体**:

```json
{
  "ownerAddress": "0x...",
  "guardians": [],
  "threshold": 0,
  "salt": 123456
}
```

**说明**:

- 此接口仅计算Smart Account地址，不会在链上部署
- 用于注册前预先获取账户地址

**响应示例**:

```json
{
  "success": true,
  "data": {
    "accountAddress": "0x..."
  }
}
```

#### POST /erc4337/account/initcode

构建账户创建的InitCode

#### GET /erc4337/account/:accountAddress

查询账户完整信息

**响应示例**:

```json
{
  "accountAddress": "0x...",
  "ownerAddress": "0x...",
  "guardians": ["0x...", "0x..."],
  "threshold": 2,
  "isDeployed": true
}
```

#### GET /erc4337/account/:accountAddress/nonce

获取账户Nonce

### 4.3 守护者管理

#### POST /erc4337/guardian/build

构建添加守护者的未签名UserOperation（推荐）

**请求体**:

```json
{
  "accountAddress": "0x...",
  "guardianAddress": "0x..."
}
```

**说明**:

- 构建未签名的UserOperation，由客户端进行签名
- 保证私钥安全，不会上传到服务器

**响应示例**:

```json
{
  "success": true,
  "data": {
    "userOp": {
      "sender": "0x...",
      "nonce": "0x0",
      "initCode": "0x",
      "callData": "0x...",
      "callGasLimit": "300000",
      "verificationGasLimit": "500000",
      "preVerificationGas": "50000",
      "maxFeePerGas": "2000000000",
      "maxPriorityFeePerGas": "1000000000",
      "paymasterAndData": "0x...",
      "signature": "0x"
    },
    "userOpHash": "0x..."
  }
}
```

#### POST /erc4337/guardian

添加守护者（已弃用，需要私钥）

**⚠️ 警告**: 此接口需要上传私钥，不推荐使用。请使用 `POST /guardian/build` + `POST /guardian/submit` 组合。

#### GET /erc4337/guardian/:accountAddress

查询守护者列表

**响应示例**:

```json
{
  "success": true,
  "data": {
    "guardians": ["0x...", "0x..."],
    "threshold": 2,
    "count": 2
  }
}
```

#### POST /erc4337/guardian/threshold/build

构建修改阈值的未签名UserOperation（推荐）

**请求体**:

```json
{
  "accountAddress": "0x...",
  "newThreshold": 2
}
```

**说明**:

- 修改社交恢复所需的守护者签名阈值
- 阈值不能大于守护者总数

**响应示例**:

```json
{
  "success": true,
  "data": {
    "userOp": { ... },
    "userOpHash": "0x..."
  }
}
```

#### PUT /erc4337/guardian/threshold

修改阈值（已弃用，需要私钥）

**⚠️ 警告**: 此接口需要上传私钥，不推荐使用。

#### POST /erc4337/guardian/submit

提交已签名的UserOperation

**请求体**:

```json
{
  "userOp": {
    "sender": "0x...",
    "nonce": "0x0",
    "initCode": "0x",
    "callData": "0x...",
    "callGasLimit": "300000",
    "verificationGasLimit": "500000",
    "preVerificationGas": "50000",
    "maxFeePerGas": "2000000000",
    "maxPriorityFeePerGas": "1000000000",
    "paymasterAndData": "0x...",
    "signature": "0x..."
  }
}
```

**说明**:

- 提交客户端签名后的UserOperation到链上执行
- 适用于所有需要签名的操作（添加守护者、修改阈值等）

**响应示例**:

```json
{
  "success": true,
  "data": {
    "txHash": "0x...",
    "userOpHash": "0x..."
  }
}
```

### 4.4 社交恢复

#### POST /erc4337/recovery/initiate/build

构建守护者发起恢复的未签名UserOperation（推荐）

**请求体**:

```json
{
  "accountAddress": "0x...",
  "guardianAccountAddress": "0x...",
  "newOwnerAddress": "0x..."
}
```

**说明**:

- `accountAddress`: 需要恢复的账户地址
- `guardianAccountAddress`: 发起恢复的守护者账户地址
- `newOwnerAddress`: 新的所有者EOA地址
- 守护者使用其EOA私钥对UserOpHash进行签名

**响应示例**:

```json
{
  "success": true,
  "data": {
    "userOp": { ... },
    "userOpHash": "0x..."
  }
}
```

#### POST /erc4337/recovery/initiate

守护者发起恢复（已弃用，需要私钥）

**⚠️ 警告**: 此接口需要上传私钥，不推荐使用。

#### POST /erc4337/recovery/support/build

构建守护者支持恢复的未签名UserOperation（推荐）

**请求体**:

```json
{
  "accountAddress": "0x...",
  "guardianAccountAddress": "0x...",
  "newOwnerAddress": "0x..."
}
```

**说明**:

- 其他守护者调用此接口表示支持恢复
- 当支持数达到阈值时，恢复自动执行

**响应示例**:

```json
{
  "success": true,
  "data": {
    "userOp": { ... },
    "userOpHash": "0x..."
  }
}
```

#### POST /erc4337/recovery/support

守护者支持恢复（已弃用，需要私钥）

**⚠️ 警告**: 此接口需要上传私钥，不推荐使用。

#### POST /erc4337/recovery/cancel/build

构建Owner取消恢复的未签名UserOperation（推荐）

**请求体**:

```json
{
  "accountAddress": "0x..."
}
```

**说明**:

- 原Owner可以在恢复未执行前取消恢复流程
- 需要使用当前Owner的EOA私钥签名

**响应示例**:

```json
{
  "success": true,
  "data": {
    "userOp": { ... },
    "userOpHash": "0x..."
  }
}
```

#### POST /erc4337/recovery/cancel

Owner取消恢复（已弃用，需要私钥）

**⚠️ 警告**: 此接口需要上传私钥，不推荐使用。

#### POST /erc4337/recovery/submit

提交已签名的UserOperation

**请求体**:

```json
{
  "userOp": {
    "sender": "0x...",
    "signature": "0x...",
    ...
  }
}
```

**说明**:

- 用于提交所有恢复相关的已签名UserOperation
- 包括发起恢复、支持恢复、取消恢复

**响应示例**:

```json
{
  "success": true,
  "data": {
    "txHash": "0x...",
    "userOpHash": "0x..."
  }
}
```

#### GET /erc4337/recovery/status/:accountAddress

查询恢复状态

**响应示例**:

```json
{
  "success": true,
  "data": {
    "newOwner": "0x...",
    "approvalCount": 2,
    "executed": true,
    "threshold": 2
  }
}
```

**字段说明**:

- `newOwner`: 新的Owner地址
- `approvalCount`: 当前支持恢复的守护者数量
- `executed`: 恢复是否已执行
- `threshold`: 需要的守护者签名数量

---

## 5. 账户迁移服务

> **转发服务**: 所有请求转发到 `migration-service:3004`

### GET /migration/health

检查迁移服务状态

### POST /migration/create

创建迁移会话

**请求体**:

```json
{
  "id": "mig_1234567890_test",
  "status": "pending",
  "createdAt": 1234567890000,
  "expiresAt": 1234567890000,
  "oldDeviceId": "device_old_001",
  "confirmCode": "123456"
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "迁移会话创建成功",
  "data": {
    "migrationId": "mig_1234567890_test",
    "expiresAt": "1234567890000",
    "confirmCode": "123456"
  }
}
```

### GET /migration/session/:migrationId

获取迁移会话信息

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "mig_1234567890_test",
    "status": "pending",
    "createdAt": "1234567890000",
    "expiresAt": "1234567890000",
    "oldDeviceId": "device_old_001",
    "newDeviceId": null,
    "confirmCode": "123456"
  }
}
```

### POST /migration/verify

验证确认码

**请求体**:

```json
{
  "migrationId": "mig_1234567890_test",
  "confirmCode": "123456"
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "valid": true,
    "migrationId": "mig_1234567890_test"
  }
}
```

### POST /migration/confirm

确认迁移完成

**请求体**:

```json
{
  "migrationId": "mig_1234567890_test",
  "newDeviceId": "device_new_002",
  "status": "completed",
  "timestamp": 1234567890000
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "迁移确认成功",
  "data": {
    "migrationId": "mig_1234567890_test",
    "confirmedAt": 1234567890000
  }
}
```

### GET /migration/status/:migrationId

查询迁移状态

**响应示例**:

```json
{
  "success": true,
  "data": {
    "status": "completed",
    "migrationId": "mig_1234567890_test"
  }
}
```

### DELETE /migration/cleanup

清理过期会话（内部接口）

### GET /migration/sessions

获取所有迁移会话（调试用）

---

## 6. 关系管理 🔒

> **需要认证**: 所有关系管理接口都需要JWT Token认证

### 6.1 访问组管理

#### POST /relation/access-groups

创建访问组（由老人调用）

**请求体**:

```json
{
  "groupName": "主治医生组",
  "description": "负责日常医疗监护",
  "ownerAddress": "0x..."
}
```

**说明**:

- `groupName`: 访问组名称（必填）
- `description`: 访问组描述（可选）
- `ownerAddress`: 所有者Smart Account地址（必填）

**响应示例**:

```json
{
  "success": true,
  "message": "访问组创建成功",
  "data": {
    "id": 1,
    "group_name": "主治医生组",
    "owner_address": "0x...",
    "description": "负责日常医疗监护",
    "created_at": "2025-10-26T10:00:00.000Z"
  }
}
```

#### GET /relation/access-groups

获取当前用户的所有访问组

**说明**:

- 需要JWT Token认证
- 用户身份（Smart Account地址）自动从请求头 `x-user-smart-account` 中获取（API Gateway注入）
- 返回当前用户创建的所有访问组（不含成员统计）

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "group_name": "主治医生",
      "group_type": "PRIMARY_DOCTOR",
      "description": "我的主治医生",
      "owner_address": "0x...",
      "created_at": "2025-10-26T10:00:00.000Z"
    }
  ]
}
```

#### GET /relation/access-groups/stats

获取当前用户的访问组详情（含成员统计）

**请求头**:

```
Authorization: Bearer <token>
x-user-smart-account: 0x... (自动注入)
```

**说明**:

- 自动从JWT Token中提取用户标识
- 返回当前用户创建的所有访问组及其成员统计信息

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "group_name": "主治医生",
      "group_type": "PRIMARY_DOCTOR",
      "description": "我的主治医生",
      "member_count": 2,
      "created_at": "2025-10-26T10:00:00.000Z"
    }
  ]
}
```

#### GET /relation/access-groups/:accessGroupId/members

获取访问组成员列表

**说明**:

- 需要JWT Token认证
- API Gateway会自动从token中提取用户身份

**响应示例**:

```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": 1,
        "viewer_address": "0x...",
        "status": "active",
        "permission_level": 1,
        "created_at": "2025-10-26T10:00:00.000Z",
        "last_accessed_at": null
      }
    ],
    "count": 1
  }
}
```

### 6.2 邀请管理

#### POST /relation/invitations

创建标准邀请（由老人调用）

**请求体**:

```json
{
  "accessGroupId": 1
}
```

**说明**:

- 需要JWT Token认证
- `accessGroupId`: 访问组ID（必填）
- 邀请人身份（Smart Account地址）自动从请求头 `x-user-smart-account` 中获取（API Gateway注入）
- 会生成一个邀请令牌（token），通过链下方式（如二维码）分享给被邀请人

**响应示例**:

```json
{
  "success": true,
  "message": "邀请创建成功",
  "data": {
    "token": "inv_abc123def456"
  }
}
```

#### POST /relation/invitations/hospital

创建医院预授权邀请

**请求体**:

```json
{
  "accessGroupId": 1,
  "hospitalId": "hospital_001",
  "hospitalName": "XX社区卫生服务中心",
  "inviteeAddress": "0x..."
}
```

**说明**:

- 需要JWT Token认证
- 用于医院场景，医生/护士可以通过医院ID直接加入
- `accessGroupId`: 访问组ID（必填）
- `hospitalId`: 医院ID（必填）
- `hospitalName`: 医院名称（必填）
- `inviteeAddress`: 被邀请人的Smart Account地址（必填）
- 邀请人身份自动从请求头 `x-user-smart-account` 中获取（API Gateway注入）

**响应示例**:

```json
{
  "success": true,
  "message": "医院邀请创建成功",
  "token": "inv_hospital_xyz789"
}
```

#### GET /relation/invitations/my

获取我的邀请列表

**说明**:

- 需要JWT Token认证
- 用户身份（Smart Account地址）自动从请求头 `x-user-smart-account` 中获取（API Gateway注入）
- 返回该用户发出和收到的所有邀请

**响应示例**:

```json
{
  "success": true,
  "data": {
    "sent": [
      {
        "id": 1,
        "token": "inv_abc123",
        "access_group_id": 1,
        "status": "pending",
        "created_at": "2025-10-26T10:00:00.000Z"
      }
    ],
    "received": []
  }
}
```

#### DELETE /relation/invitations/cancel

取消邀请

**请求体**:

```json
{
  "token": "inv_abc123def456"
}
```

**说明**:

- 需要JWT Token认证
- `token`: 邀请令牌（必填）
- 只有邀请的创建者才能取消邀请

**响应示例**:

```json
{
  "success": true,
  "message": "邀请已取消"
}
```

### 6.3 关系管理

#### POST /relation/relationships/accept

接受邀请

**请求体**:

```json
{
  "token": "inv_abc123def456"
}
```

**说明**:

- 需要JWT Token认证
- `token`: 邀请令牌（必填）
- 被邀请人使用此接口接受邀请并建立关系
- 被邀请人身份（Smart Account地址）自动从请求头 `x-user-smart-account` 中获取（API Gateway注入）

**响应示例**:

```json
{
  "success": true,
  "message": "邀请接受成功",
  "data": {
    "relationship_id": 1,
    "access_group_id": 1,
    "principal_address": "0x...",
    "viewer_address": "0x...",
    "status": "active",
    "permission_level": 1
  }
}
```

#### PUT /relation/relationships/:relationshipId/suspend

暂停关系

**URL参数**:

- `relationshipId`: 关系ID（必填）

**说明**:

- 需要JWT Token认证
- 暂停与指定成员的关系，该成员将无法访问数据
- 可以通过 resume 恢复
- 用户身份（Smart Account地址）自动从请求头 `x-user-smart-account` 中获取（API Gateway注入）
- 只有关系的所有者（principal）才能暂停关系

**响应示例**:

```json
{
  "success": true,
  "message": "关系暂停成功",
  "data": {
    "id": 1,
    "status": "suspended"
  }
}
```

#### PUT /relation/relationships/:relationshipId/resume

恢复关系

**URL参数**:

- `relationshipId`: 关系ID（必填）

**说明**:

- 需要JWT Token认证
- 恢复已暂停的关系
- 用户身份（Smart Account地址）自动从请求头 `x-user-smart-account` 中获取（API Gateway注入）
- 只有关系的所有者（principal）才能恢复关系

**响应示例**:

```json
{
  "success": true,
  "message": "关系恢复成功",
  "data": {
    "id": 1,
    "status": "active"
  }
}
```

#### DELETE /relation/relationships/:relationshipId

撤销关系

**URL参数**:

- `relationshipId`: 关系ID（必填）

**说明**:

- 需要JWT Token认证
- 永久删除关系，被撤销的成员将无法再访问数据
- 此操作不可逆
- 用户身份（Smart Account地址）自动从请求头 `x-user-smart-account` 中获取（API Gateway注入）
- 只有关系的所有者（principal）才能撤销关系

**响应示例**:

```json
{
  "success": true,
  "message": "关系撤销成功",
  "data": {
    "deleted": true
  }
}
```

---

## 错误处理

### 标准错误响应格式

```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

### 常见错误码

| 状态码 | 错误码                  | 描述           |
| ------ | ----------------------- | -------------- |
| 400    | MISSING_REQUIRED_FIELDS | 缺少必要参数   |
| 401    | UNAUTHORIZED            | 未授权访问     |
| 403    | FORBIDDEN               | 权限不足       |
| 404    | NOT_FOUND               | 资源不存在     |
| 409    | CONFLICT                | 资源冲突       |
| 500    | INTERNAL_SERVER_ERROR   | 服务器内部错误 |
| 503    | SERVICE_UNAVAILABLE     | 服务不可用     |

---

## 开发说明

### 服务架构

- **API Gateway**: 统一入口，HTTP端口3000
- **User Service**: 用户服务，gRPC端口50051
- **Relationship Service**: 关系服务，gRPC端口50053
- **ERC4337 Service**: 账户抽象服务，HTTP端口4337
- **Migration Service**: 账户迁移服务，HTTP端口3004
- **Userinfo Service**: 个人档案服务，HTTP端口3002

### 数据库

- **PostgreSQL**: 主数据库，端口5400
  - `bs_user_service_db`: 用户服务数据库
  - `bs_relationship_db`: 关系服务数据库
  - `migration_db`: 迁移服务数据库
  - `userinfo_db`: 个人档案数据库
- **Redis**: 缓存和会话存储，端口6379
- **RabbitMQ**: 消息队列，端口5672

### 安全考虑

1. **私钥安全**: 推荐使用build+submit模式，避免私钥上传到服务器
2. **签名验证**: 所有关键操作都需要数字签名验证
3. **权限控制**: 基于JWT Token的细粒度权限控制（RBAC）
4. **数据加密**: 敏感数据传输和存储加密
5. **请求头注入**: API Gateway自动将 `x-user-smart-account`注入到受保护接口的请求头

### 版本信息

- API版本: v1.0
- 最后更新: 2025-10-27
