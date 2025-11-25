# API Gateway 快速参考

## 基础信息
- **基础URL**: `http://localhost:3000/api`
- **认证方式**: JWT Token (`Authorization: Bearer <token>`)

## 接口概览

### 🔓 公开接口（无需认证）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/health` | API Gateway健康检查 |
| POST | `/auth/register` | 用户注册 |
| POST | `/auth/login` | 用户登录 |
| GET | `/userinfo/phone/:phoneNumber` | 根据手机号查询用户 |

### 🔓 ERC4337 服务（账户抽象）

#### 账户管理
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/erc4337/health` | 服务健康检查 |
| POST | `/erc4337/account` | 创建社交恢复账户 |
| POST | `/erc4337/account/address` | 预计算账户地址 |
| GET | `/erc4337/account/:address` | 查询账户信息 |
| GET | `/erc4337/account/:address/nonce` | 获取账户Nonce |

#### 守护者管理
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/erc4337/guardian/build` | 构建添加守护者UserOp ⭐ |
| GET | `/erc4337/guardian/:address` | 查询守护者列表 |
| POST | `/erc4337/guardian/threshold/build` | 构建修改阈值UserOp ⭐ |
| POST | `/erc4337/guardian/submit` | 提交已签名UserOp ⭐ |

#### 社交恢复
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/erc4337/recovery/initiate/build` | 构建发起恢复UserOp ⭐ |
| POST | `/erc4337/recovery/support/build` | 构建支持恢复UserOp ⭐ |
| POST | `/erc4337/recovery/cancel/build` | 构建取消恢复UserOp ⭐ |
| POST | `/erc4337/recovery/submit` | 提交恢复UserOp ⭐ |
| GET | `/erc4337/recovery/status/:address` | 查询恢复状态 |

### 🔓 账户迁移服务

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/migration/health` | 服务健康检查 |
| POST | `/migration/create` | 创建迁移会话 |
| GET | `/migration/session/:id` | 获取迁移会话信息 |
| POST | `/migration/verify` | 验证确认码 |
| POST | `/migration/confirm` | 确认迁移完成 |
| GET | `/migration/status/:id` | 查询迁移状态 |

### 🔒 关系管理（需要认证）

#### 访问组管理
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/relation/access-groups` | 创建访问组 |
| GET | `/relation/access-groups` | 获取访问组列表 |
| GET | `/relation/access-groups/stats` | 获取访问组统计 |
| GET | `/relation/access-groups/:id/members` | 获取访问组成员 |

#### 邀请管理
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/relation/invitations` | 发送标准邀请 |
| POST | `/relation/invitations/hospital` | 发送医院预授权邀请 |
| GET | `/relation/invitations/my` | 获取我的邀请 |
| DELETE | `/relation/invitations/cancel` | 取消邀请 |

#### 关系管理
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/relation/relationships/accept` | 接受邀请 |
| PUT | `/relation/relationships/:id/suspend` | 暂停关系 |
| PUT | `/relation/relationships/:id/resume` | 恢复关系 |
| DELETE | `/relation/relationships/:id` | 撤销关系 |

## 重要说明

### ⭐ 推荐使用的安全接口
- **build + submit 模式**: 先构建未签名的UserOperation，客户端本地签名后提交
- **避免私钥上传**: 不要使用已弃用的需要私钥的接口

### 🔐 认证流程
1. 调用 `/auth/login` 获取JWT Token
2. 在后续请求的Header中添加: `Authorization: Bearer <token>`
3. API Gateway会自动从JWT Token中提取用户Smart Account地址，并注入到请求头 `x-user-smart-account` 中
4. 后端服务使用注入的地址进行权限验证和业务处理

### 📱 典型业务流程

#### 用户注册流程
```
1. POST /userinfo/phone/:phoneNumber (检查用户是否存在)
2. POST /auth/register (注册用户)
3. POST /erc4337/account (创建智能合约账户)
```

#### 添加守护者流程
```
1. POST /erc4337/guardian/build (构建UserOp)
2. [客户端本地签名]
3. POST /erc4337/guardian/submit (提交已签名UserOp)
```

#### 社交恢复流程
```
1. POST /erc4337/recovery/initiate/build (守护者1发起恢复)
2. POST /erc4337/recovery/submit (提交发起恢复)
3. POST /erc4337/recovery/support/build (守护者2支持恢复)
4. POST /erc4337/recovery/submit (提交支持恢复)
5. GET /erc4337/recovery/status/:address (查询恢复状态)
```

#### 账户迁移流程
```
1. POST /migration/create (创建迁移会话)
2. POST /migration/verify (验证确认码)
3. POST /migration/confirm (确认迁移完成)
4. GET /migration/status/:id (查询迁移状态)
```

#### 关系管理流程
```
1. POST /relation/access-groups (老人创建访问组)
2. POST /relation/invitations (老人发送邀请)
3. POST /relation/relationships/accept (医生接受邀请)
4. GET /relation/access-groups/:id/members (查看组成员)
```

## 错误码参考

| 状态码 | 错误码 | 描述 |
|--------|--------|------|
| 400 | MISSING_REQUIRED_FIELDS | 缺少必要参数 |
| 401 | UNAUTHORIZED | 未授权访问 |
| 403 | FORBIDDEN | 权限不足 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 资源冲突 |
| 500 | INTERNAL_SERVER_ERROR | 服务器内部错误 |
| 503 | SERVICE_UNAVAILABLE | 服务不可用 |

## 开发工具

- **Postman集合**: 导入 `api-postman-collection.json` 进行接口测试
- **完整文档**: 查看 `api-gateway-documentation.md` 获取详细信息
