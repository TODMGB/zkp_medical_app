# 通信架构更新说明

## 架构变更概述

本次更新将系统通信架构从 **API Gateway → gRPC** 模式改为 **API Gateway → HTTP → gRPC** 模式，实现了更清晰的分层架构。

## 新架构设计

### 🌐 外部通信层 (HTTP)
- **API Gateway** 作为统一入口，对外提供RESTful API
- **下层服务** 提供HTTP接口供API Gateway调用
- **客户端** 只与API Gateway通信，不直接访问下层服务

### 🔗 内部通信层 (gRPC)
- **服务间通信** 继续使用gRPC，保持高性能
- **数据库访问** 和 **消息队列** 等内部操作保持不变

## 服务端口配置

| 服务 | HTTP端口 | gRPC端口 | 说明 |
|------|----------|----------|------|
| API Gateway | 3000 | - | 统一入口 |
| User Service | 50051 | 50052 | 用户服务 |
| Relationship Service | 50054 | 50053 | 关系服务 |
| ERC4337 Service | 4337 | - | 账户抽象服务 |
| Migration Service | 3004 | - | 账户迁移服务 |
| Userinfo Service | 5000 | - | 用户信息服务 |

## 修改内容详解

### 1. User Service 修改

#### 新增HTTP接口层
- **路由**: `src/routes/auth.routes.js`, `src/routes/userinfo.routes.js`
- **控制器**: `src/controllers/auth.controller.js`, `src/controllers/userinfo.controller.js`
- **服务层**: `src/services/auth.service.js`, `src/services/userinfo.service.js`

#### HTTP接口
```javascript
// 认证接口
POST /api/auth/register  // 用户注册
POST /api/auth/login     // 用户登录

// 用户信息查询接口
GET /api/userinfo/phone/:phoneNumber  // 根据手机号查询用户
```

#### 保持gRPC内部通信
- gRPC服务器继续运行在端口50052
- 用于服务间内部调用

### 2. Relationship Service 修改

#### 新增HTTP服务器
- **服务器**: 修改 `server.js` 同时启动HTTP和gRPC服务器
- **路由**: `src/routes/relationship.routes.js`
- **控制器**: `src/controllers/relationship.controller.js`

#### HTTP接口
```javascript
// 访问组管理
POST /api/relation/access-groups
GET /api/relation/access-groups
GET /api/relation/access-groups/stats
GET /api/relation/access-groups/:id/members

// 邀请管理
POST /api/relation/invitations
POST /api/relation/invitations/hospital
GET /api/relation/invitations/my
DELETE /api/relation/invitations/cancel

// 关系管理
POST /api/relation/relationships/accept
PUT /api/relation/relationships/:id/suspend
PUT /api/relation/relationships/:id/resume
DELETE /api/relation/relationships/:id
```

### 3. API Gateway 修改

#### 控制器改为HTTP代理
- **认证控制器**: `src/controllers/auth.controller.js` - 使用axios代理到user-service
- **用户信息控制器**: `src/controllers/userinfo.controller.js` - 代理用户查询请求
- **关系管理控制器**: `src/controllers/relationship-proxy.controller.js` - 通用HTTP代理实现

#### 代理实现示例
```javascript
// HTTP代理调用
const response = await axios.post(`${USER_SERVICE_URL}/api/auth/register`, {
  eoa_address,
  smart_account,
  phone_number,
  signature,
  message
});
```

## 环境变量配置

### API Gateway (.env)
```bash
# HTTP服务URL配置
USER_SERVICE_URL=http://localhost:50051
RELATIONSHIP_SERVICE_URL=http://localhost:50054
USERINFO_SERVICE_URL=http://localhost:5000
ERC4337_SERVICE_URL=http://localhost:4337
MIGRATION_SERVICE_URL=http://localhost:3004

# gRPC配置（内部通信）
USER_SERVICE_GRPC_URL=localhost:50052
RELATIONSHIP_SERVICE_GRPC_URL=localhost:50053
```

## 架构优势

### ✅ **统一接口标准**
- 所有外部接口都是RESTful HTTP API
- 一致的请求/响应格式
- 标准的HTTP状态码和错误处理

### ✅ **更好的可扩展性**
- 服务可以独立部署和扩展
- 支持负载均衡和服务发现
- 容易添加新的服务节点

### ✅ **开发友好**
- HTTP接口易于测试和调试
- 支持标准的API文档工具
- 前端开发更加便利

### ✅ **保持高性能**
- 内部服务间通信仍使用gRPC
- 数据库和缓存访问效率不变
- 只在边界层增加HTTP转换

## 兼容性说明

### 🔄 **API接口保持不变**
- 客户端无需修改
- API Gateway对外接口完全兼容
- 只是内部实现方式改变

### 🔄 **gRPC服务保留**
- 现有gRPC服务继续运行
- 用于服务间内部通信
- 保持原有性能优势

## 部署说明

### 启动顺序
1. 启动数据库服务 (PostgreSQL, Redis)
2. 启动下层服务 (User Service, Relationship Service等)
3. 启动API Gateway

### 健康检查
```bash
# 检查各服务状态
curl http://localhost:3000/health          # API Gateway
curl http://localhost:50051/health         # User Service
curl http://localhost:50054/health         # Relationship Service
curl http://localhost:4337/health          # ERC4337 Service
curl http://localhost:3004/health          # Migration Service
```

## 测试验证

### API测试
- 使用提供的Postman集合测试所有接口
- 验证请求/响应格式正确性
- 确认错误处理机制正常

### 性能测试
- 对比修改前后的响应时间
- 验证并发处理能力
- 监控资源使用情况

## 后续优化建议

1. **服务发现**: 考虑引入服务注册中心
2. **负载均衡**: 在服务前添加负载均衡器
3. **API网关增强**: 添加限流、熔断等功能
4. **监控告警**: 完善服务监控和日志系统

---

**更新日期**: 2025-10-26  
**版本**: v2.0  
**状态**: ✅ 已完成
