# API Gateway - 迁移接口更新指南

**更新日期**: 2025-11-02  
**功能**: 支持账户迁移数据上传和下载

---

## 📋 更新概述

为 API Gateway 添加了两个新的迁移接口代理：

1. ✅ `POST /api/migration/upload` - 上传加密迁移数据（需认证）
2. ✅ `GET /api/migration/download/:migrationId` - 下载加密迁移数据（无需认证）

---

## 🔄 更新内容

### 1. 路由更新

**文件**: `src/routes/migration.routes.js`

**变更**:
```javascript
/**
 * 新增接口：
 * - POST   /api/migration/upload              - 上传加密迁移数据 🆕（需认证）
 * - GET    /api/migration/download/:id        - 下载加密迁移数据 🆕（无需认证）
 */
```

### 2. 权限配置

**新增权限**:

| 接口 | 方法 | 路径 | 允许角色 | 说明 |
|------|------|------|----------|------|
| 上传 | POST | `/api/migration/upload` | ELDER, DOCTOR, FAMILY_MEMBER | 需要认证 |
| 下载 | GET | `/api/migration/download/:migrationId` | **guest**, ELDER, DOCTOR, FAMILY_MEMBER | 无需认证 |

**重要说明**:
- ⚠️ 下载接口允许 `guest` 角色访问
- 原因：新设备还没有 JWT Token，必须允许未认证访问
- 安全性：通过确认码验证（在 migration-service 内部验证）

---

## 🚀 部署步骤

### 步骤 1: 更新路由代码

路由文件已自动更新（使用统一代理，无需额外配置）：

```bash
# 文件已更新
src/routes/migration.routes.js
```

### 步骤 2: 添加数据库权限

```powershell
# 进入 migrations 目录
cd api-gateway/migrations

# 运行权限添加脚本
.\run-migration-permissions.ps1
```

**或者手动执行**:
```bash
psql -h localhost -p 5400 -U root -d bs_gateway_db -f add-migration-upload-download-permissions.sql
```

### 步骤 3: 清除权限缓存

权限缓存在 Redis 中，需要清除：

**方法 1: 使用 Redis CLI**
```bash
redis-cli DEL gateway:permissions
```

**方法 2: 重启 API Gateway**
```bash
# 重启服务会自动重新加载权限
cd api-gateway
npm start
```

### 步骤 4: 验证配置

```bash
# 测试上传接口（需要 token）
curl -X POST http://localhost:3000/api/migration/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "migrationId": "mig_test",
    "encryptedData": "test_data",
    "expiresAt": 1699999999000
  }'

# 测试下载接口（不需要 token）
curl -X GET http://localhost:3000/api/migration/download/mig_test
```

---

## 🔐 权限详解

### 上传接口权限

```sql
-- POST /api/migration/upload
-- 允许角色: ELDER, DOCTOR, FAMILY_MEMBER

INSERT INTO permissions (http_method, path_pattern, description)
VALUES ('POST', '/api/migration/upload', '上传加密迁移数据');

-- 分配给认证用户角色
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE p.path_pattern = '/api/migration/upload'
  AND r.role_name IN ('ELDER', 'DOCTOR', 'FAMILY_MEMBER');
```

### 下载接口权限

```sql
-- GET /api/migration/download/:migrationId
-- 允许角色: guest, ELDER, DOCTOR, FAMILY_MEMBER

INSERT INTO permissions (http_method, path_pattern, description)
VALUES ('GET', '/api/migration/download/:migrationId', '下载加密迁移数据（无需认证）');

-- 分配给所有角色（包括 guest）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE p.path_pattern = '/api/migration/download/:migrationId'
  AND r.role_name IN ('guest', 'ELDER', 'DOCTOR', 'FAMILY_MEMBER');
```

---

## 🔄 请求流程

### 上传流程（旧设备）

```
客户端（旧设备）
    ↓ Authorization: Bearer {token}
API Gateway (3000)
    ↓ 认证中间件验证 JWT
    ↓ 权限检查: ELDER/DOCTOR/FAMILY_MEMBER
    ↓ 添加 x-user-smart-account 请求头
    ↓ 代理转发
Migration Service (3004)
    ↓ 处理上传逻辑
    ↓ 保存到数据库
    ↓ 返回结果
```

### 下载流程（新设备）

```
客户端（新设备，无 token）
    ↓ 无 Authorization 头
API Gateway (3000)
    ↓ 认证中间件: 识别为 guest 角色
    ↓ 权限检查: guest 有权限
    ↓ 代理转发（不添加用户信息）
Migration Service (3004)
    ↓ 验证确认码（内部安全检查）
    ↓ 返回加密数据
    ↓ 客户端用确认码解密
```

---

## 📊 数据库表结构

### permissions 表

```sql
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    http_method VARCHAR(10) NOT NULL,
    path_pattern VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(http_method, path_pattern)
);
```

### role_permissions 表

```sql
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id),
    permission_id INTEGER REFERENCES permissions(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);
```

---

## 🧪 测试用例

### 1. 上传测试（需要认证）

```bash
# 成功：有效 token
curl -X POST http://localhost:3000/api/migration/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "migrationId": "mig_test_001",
    "encryptedData": "U2FsdGVkX1+...",
    "expiresAt": 1699999999000
  }'
# 预期: 200 OK

# 失败：无 token
curl -X POST http://localhost:3000/api/migration/upload \
  -H "Content-Type: application/json" \
  -d '{
    "migrationId": "mig_test_001",
    "encryptedData": "U2FsdGVkX1+...",
    "expiresAt": 1699999999000
  }'
# 预期: 401 Unauthorized
```

### 2. 下载测试（不需要认证）

```bash
# 成功：guest 访问
curl -X GET http://localhost:3000/api/migration/download/mig_test_001
# 预期: 200 OK（如果数据存在）

# 失败：数据不存在
curl -X GET http://localhost:3000/api/migration/download/mig_nonexistent
# 预期: 404 Not Found
```

### 3. 权限验证测试

```bash
# 查询权限配置
psql -h localhost -p 5400 -U root -d bs_gateway_db -c "
SELECT 
    p.http_method,
    p.path_pattern,
    STRING_AGG(r.role_name, ', ') as allowed_roles
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN roles r ON rp.role_id = r.id
WHERE p.path_pattern LIKE '%migration%'
GROUP BY p.id, p.http_method, p.path_pattern;
"
```

---

## ⚠️ 注意事项

### 1. 安全性

- ✅ 上传接口需要认证，防止未授权上传
- ✅ 下载接口虽然不需要认证，但在 migration-service 内部通过确认码验证
- ✅ 数据在客户端加密，服务器无法解密
- ⚠️ 下载接口对 guest 开放，需要确保确认码验证的安全性

### 2. 缓存管理

- 权限缓存在 Redis 中，TTL 为 1 小时
- 更新权限后必须清除缓存或重启服务
- 建议使用: `redis-cli DEL gateway:permissions`

### 3. 日志监控

- 上传接口会记录用户地址（x-user-smart-account）
- 下载接口不记录用户信息（guest 访问）
- 建议监控下载接口的异常访问

### 4. 错误处理

- 401: 上传接口未提供 token
- 403: 用户角色没有权限
- 404: 迁移数据不存在
- 413: 数据大小超过限制（5MB）

---

## 📝 文件清单

### 新增/修改的文件

1. **API Gateway**
   - `src/routes/migration.routes.js` - 更新路由注释
   - `migrations/add-migration-upload-download-permissions.sql` - 权限 SQL
   - `migrations/run-migration-permissions.ps1` - 执行脚本
   - `MIGRATION_API_UPDATE_GUIDE.md` - 本文档

2. **Migration Service** (已在之前步骤完成)
   - `src/services/migration.service.js` - 上传下载逻辑
   - `src/controllers/migration.controller.js` - 控制器
   - `src/routes/migration.routes.js` - 路由
   - `db/add-encrypted-data-column.sql` - 数据库迁移

---

## 🔄 回滚步骤

如果需要回滚权限配置：

```sql
-- 删除权限
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions
    WHERE path_pattern IN ('/api/migration/upload', '/api/migration/download/:migrationId')
);

DELETE FROM permissions
WHERE path_pattern IN ('/api/migration/upload', '/api/migration/download/:migrationId');

-- 清除缓存
-- redis-cli DEL gateway:permissions
```

---

## ✅ 验证检查清单

- [ ] 路由代码已更新
- [ ] 数据库权限已添加
- [ ] Redis 缓存已清除
- [ ] API Gateway 已重启
- [ ] 上传接口测试通过（需 token）
- [ ] 下载接口测试通过（无需 token）
- [ ] guest 角色可以访问下载接口
- [ ] 认证用户可以访问上传接口

---

**更新完成** ✅  
**部署状态**: 待部署  
**测试状态**: 待测试


