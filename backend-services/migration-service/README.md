# Migration Service - 账户迁移服务

## 概述

Migration Service 是老年医疗零知识证明系统的账户迁移服务，允许用户安全地将账户从旧设备迁移到新设备。

## 功能特性

- ✅ 创建迁移会话
- ✅ 二维码和确认码双重验证
- ✅ 会话过期管理
- ✅ 设备间安全传输
- ✅ 加密数据上传和下载（新增）
- ✅ 自动清理过期会话
- ✅ 完整的API接口

## 快速开始

### 1. 安装依赖

```bash
cd migration-service
npm install
```

### 2. 配置环境

复制并编辑 `.env` 文件：

```bash
cp .env.example .env
```

主要配置项：
```env
PORT=3004
DB_NAME=migration_db
DB_USER=root
DB_PASS=123456
MIGRATION_SESSION_TIMEOUT=300000  # 5分钟
```

### 3. 启动服务

```bash
npm start
```

服务将在 `http://localhost:3004` 启动

### 4. 验证服务

```bash
curl http://localhost:3004/health
```

## API 接口

### 基础URL
- 直接访问: `http://localhost:3004/api/migration`
- 通过API Gateway: `http://localhost:3000/api/migration`

### 主要接口

#### 1. 创建迁移会话

**端点**: `POST /api/migration/create`

**请求体**:
```json
{
  "id": "mig_1730293923_abc123",
  "oldDeviceId": "device_old_001",
  "confirmCode": "123456",
  "status": "pending",
  "createdAt": 1730293923437,
  "expiresAt": 1730294223437
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "migrationId": "mig_1730293923_abc123",
    "confirmCode": "123456",
    "oldDeviceId": "device_old_001",
    "status": "pending",
    "expiresAt": 1730294223437
  }
}
```

**说明**:
- 会话默认5分钟过期
- 确认码为6位数字

#### 2. 获取迁移会话

**端点**: `GET /api/migration/session/:migrationId`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "mig_1730293923_abc123",
    "status": "pending",
    "oldDeviceId": "device_old_001",
    "newDeviceId": null,
    "createdAt": "1730293923437",
    "expiresAt": "1730294223437",
    "confirmedAt": null
  }
}
```

#### 3. 验证确认码

**端点**: `POST /api/migration/verify`

**请求体**:
```json
{
  "migrationId": "mig_1730293923_abc123",
  "confirmCode": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "valid": true
  }
}
```

**错误响应** (确认码错误):
```json
{
  "success": true,
  "data": {
    "valid": false
  }
}
```

#### 4. 上传加密迁移数据 🆕

**端点**: `POST /api/migration/upload`

**需要认证**: ✅ 是（JWT Token）

**请求头**:
```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**请求体**:
```json
{
  "migrationId": "mig_1730293923_abc123",
  "encryptedData": "U2FsdGVkX1+YxNZ4xvZ8M0k5...",
  "expiresAt": 1730294223437
}
```

**响应**:
```json
{
  "success": true,
  "message": "迁移数据上传成功",
  "migrationId": "mig_1730293923_abc123",
  "expiresAt": 1730294223437
}
```

**说明**:
- `encryptedData`: Base64 编码的加密数据
- 最大大小：5MB
- 不能重复上传

#### 5. 下载加密迁移数据 🆕

**端点**: `GET /api/migration/download/:migrationId`

**需要认证**: ❌ 否（新设备无 Token）

**响应**:
```json
{
  "success": true,
  "encryptedData": "U2FsdGVkX1+YxNZ4xvZ8M0k5...",
  "expiresAt": 1730294223437
}
```

**错误响应** (数据不存在):
```json
{
  "success": false,
  "message": "迁移数据不存在或已过期",
  "code": "DATA_NOT_FOUND"
}
```

**说明**:
- 下载时自动增加下载计数
- 检查数据是否过期

#### 6. 完成迁移

**端点**: `POST /api/migration/confirm`

**请求体**:
```json
{
  "migrationId": "mig_1730293923_abc123",
  "newDeviceId": "device_new_002",
  "status": "completed",
  "timestamp": 1730293923437
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "migrationId": "mig_1730293923_abc123",
    "status": "completed",
    "newDeviceId": "device_new_002"
  }
}
```

#### 5. 查询迁移状态

**端点**: `GET /api/migration/status/:migrationId`

**响应**:
```json
{
  "success": true,
  "data": {
    "status": "completed"
  }
}
```

**状态说明**:
- `pending` - 等待新设备确认
- `completed` - 迁移已完成
- `expired` - 会话已过期

## 测试

### 运行测试脚本

```bash
node test-migration-api.js
```

### 手动测试

1. 启动服务
2. 创建迁移会话
3. 获取会话信息
4. 验证确认码
5. 确认迁移完成

## 数据库

### 表结构

```sql
CREATE TABLE migration_sessions (
  id VARCHAR(50) PRIMARY KEY,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  old_device_id VARCHAR(100) NOT NULL,
  new_device_id VARCHAR(100),
  confirm_code VARCHAR(6) NOT NULL,
  confirmed_at BIGINT
);
```

### 状态说明

- `pending`: 等待新设备确认
- `completed`: 迁移已完成
- `expired`: 会话已过期

## 安全特性

1. **会话过期**: 默认5分钟自动过期
2. **确认码验证**: 6位数字确认码
3. **设备绑定**: 记录设备ID防止跨设备攻击
4. **自动清理**: 定时清理过期会话

## 集成到API Gateway

Migration Service 已集成到API Gateway中，通过以下路由访问：

```
http://localhost:3000/api/migration/*
```

API Gateway会自动将请求转发到Migration Service。

## 监控和日志

- 健康检查: `/health`
- 调试接口: `/sessions` (获取所有会话)
- 清理接口: `/cleanup` (手动清理过期会话)

## 部署

### Docker部署

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .
EXPOSE 3004
CMD ["npm", "start"]
```

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 3004 |
| DB_HOST | 数据库主机 | localhost |
| DB_NAME | 数据库名称 | migration_db |
| MIGRATION_SESSION_TIMEOUT | 会话过期时间(ms) | 300000 |
| MIGRATION_CLEANUP_INTERVAL | 清理间隔(ms) | 3600000 |

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查PostgreSQL是否运行
   - 验证数据库连接配置

2. **端口被占用**
   - 修改PORT环境变量
   - 检查其他服务是否占用端口

3. **API Gateway代理失败**
   - 确认Migration Service正在运行
   - 检查MIGRATION_SERVICE_URL配置

### 日志级别

- `console.log`: 一般信息
- `console.error`: 错误信息
- `console.warn`: 警告信息

## 贡献

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

ISC License
