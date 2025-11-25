# API 文档目录

## 文档说明

本目录包含老年医疗零知识证明系统API Gateway的完整接口文档。

## 📚 核心文档（推荐）

### 🎯 [api-gateway-complete-reference.md](./api-gateway-complete-reference.md) ⭐ NEW
**完整接口参考文档** - 面向前端开发者的最新、最全面的API文档
- ✅ 基于真实测试用例编写，100%准确
- ✅ 包含所有服务的API接口（用户、医药、关系、通知、安全交换、ZKP等）
- ✅ 详细的请求/响应示例和参数说明
- ✅ 完整的加密解密工具函数
- ✅ 12个完整业务流程示例（含代码）
- ✅ 认证、签名、加密等核心逻辑说明
- 📖 **推荐前端开发者优先阅读此文档**

### ⚡ [frontend-quick-guide.md](./frontend-quick-guide.md) ⭐ NEW
**前端开发快速指南** - 最常用API的速查表
- ✅ 即用型代码示例（可直接复制使用）
- ✅ 医药服务完整流程（搜索药物、创建计划、加密发送、解密接收）
- ✅ 通知服务 WebSocket 封装类
- ✅ 安全交换服务完整示例
- ✅ Token 管理、错误处理、WebSocket 重连等最佳实践
- 📖 **推荐快速上手时使用**

---

## 📖 旧版文档（参考）

### [api-gateway-documentation.md](./api-gateway-documentation.md)
**旧版API文档** - 基础接口说明
- 接口分类和认证机制
- 详细的请求/响应示例
- 错误处理和状态码
- 安全考虑和最佳实践
- 服务架构说明

### [api-quick-reference.md](./api-quick-reference.md)
**旧版快速参考** - 开发者速查表
- 所有接口的简洁列表
- 典型业务流程示例
- 重要注意事项
- 错误码快速参考

### 🔧 [api-postman-collection.json](./api-postman-collection.json)
**Postman测试集合** - 可直接导入Postman进行接口测试
- 包含所有接口的示例请求
- 自动设置认证Token
- 预设测试数据
- 环境变量配置

## 🚀 快速开始

### 推荐学习路径

#### 📖 前端开发者
1. **第一步**: 阅读 [前端开发快速指南](./frontend-quick-guide.md)
   - 10分钟快速了解最常用的API
   - 复制即用的代码示例
   
2. **第二步**: 参考 [完整接口参考文档](./api-gateway-complete-reference.md)
   - 查找具体接口的详细说明
   - 了解完整的业务流程
   
3. **第三步**: 使用 Postman 测试
   - 导入 `api-postman-collection.json`
   - 实际测试接口调用

#### 🧪 接口测试
1. 打开Postman
2. 点击 `Import` 按钮
3. 选择 `api-postman-collection.json` 文件
4. 设置环境变量 `baseUrl` 为 `http://localhost:3000/api`
5. 运行 "健康检查" 测试服务是否正常
6. 使用 "用户认证" 获取 Token
7. 测试其他需要认证的接口

## 服务端口

| 服务 | 端口 | 描述 |
|------|------|------|
| API Gateway | 3000 | 统一入口 |
| ERC4337 Service | 4337 | 账户抽象服务 |
| Migration Service | 3004 | 账户迁移服务 |
| User Service | 50051 | 用户服务(gRPC) |
| Relationship Service | 50053 | 关系服务(gRPC) |
| PostgreSQL | 5400 | 数据库 |
| Redis | 6379 | 缓存 |

## 认证说明

### JWT Token结构
```json
{
  "user_id": "uuid",
  "eoa_address": "0x...",
  "smart_account": "0x...",
  "roles": ["elderly", "doctor", "guardian"],
  "iat": 1234567890,
  "exp": 1234567890
}
```

**字段说明**:
- `user_id`: 用户唯一标识符（UUID）
- `eoa_address`: EOA地址，用于签名验证
- `smart_account`: Smart Account地址，用户主键
- `roles`: 用户角色数组，用于RBAC权限控制
- `iat`: Token签发时间
- `exp`: Token过期时间

### 使用方式
在请求Header中添加：
```
Authorization: Bearer <your-jwt-token>
```

### 自动注入机制
API Gateway在转发受保护接口时，会自动添加以下请求头：
- `x-user-smart-account`: 用户的Smart Account地址（从Token提取）
- 后端服务可直接使用此请求头获取当前用户标识，无需手动解析JWT

## 重要提醒

### 🔒 安全最佳实践
1. **使用build+submit模式**: 避免私钥上传到服务器
2. **Token管理**: 及时更新过期的JWT Token
3. **HTTPS**: 生产环境必须使用HTTPS
4. **输入验证**: 客户端和服务端都要进行参数验证

### ⭐ 推荐接口
- 守护者管理: 使用 `/guardian/build` + `/guardian/submit`
- 社交恢复: 使用 `/recovery/*/build` + `/recovery/submit`
- 避免使用标记为 `@deprecated` 的接口

### 🚀 性能优化
- 合理使用缓存
- 批量操作时考虑分页
- 监控接口响应时间

## 更新日志

- **v2.0.0** (2025-10-31): 文档体系重构 ⭐ NEW
  - ✨ 新增 `api-gateway-complete-reference.md` - 完整接口参考文档
    - 基于真实E2E测试用例编写，100%准确
    - 涵盖所有10个服务的完整API接口
    - 包含12个完整业务流程示例
    - 详细的加密、签名、认证逻辑说明
  - ✨ 新增 `frontend-quick-guide.md` - 前端开发快速指南
    - 即用型代码示例（可直接复制使用）
    - 医药服务、通知服务、安全交换完整流程
    - WebSocket 封装类和最佳实践
    - Token管理、错误处理、重连机制
  - 📝 更新文档目录结构，标记新旧文档
  - 📝 添加推荐学习路径

- **v1.1.0** (2025-10-26): 认证授权增强
  - ✨ JWT Token中添加 `roles` 字段，支持RBAC权限控制
  - ✨ API Gateway自动注入 `x-user-smart-account` 请求头
  - 🔧 优化访问组统计接口，自动从Token获取用户标识
  - 📝 更新登录接口响应文档
  - 📝 更新认证机制说明

- **v1.0.0** (2025-10-26): 初始版本
  - 完整的API Gateway接口文档
  - Postman测试集合
  - 快速参考手册

## 联系方式

如有问题或建议，请联系开发团队。
