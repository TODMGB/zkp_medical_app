# 账户迁移 - 上传下载功能实现指南

**实现日期**: 2025-11-02  
**服务**: Migration Service  
**功能**: 加密数据上传和下载

---

## 📋 功能概述

实现了基于加密数据传输的账户迁移功能，支持：

- ✅ 上传加密的迁移数据（旧设备）
- ✅ 下载加密的迁移数据（新设备）
- ✅ 数据大小限制（5MB）
- ✅ 自动过期清理
- ✅ 下载次数统计
- ✅ 防止重复上传

---

## 🗄️ 数据库变更

### 新增字段

```sql
ALTER TABLE migration_sessions 
ADD COLUMN encrypted_data TEXT,           -- 加密数据（Base64）
ADD COLUMN data_size BIGINT DEFAULT 0,    -- 数据大小
ADD COLUMN download_count INTEGER DEFAULT 0,  -- 下载次数
ADD COLUMN uploaded_at BIGINT,            -- 上传时间戳
ADD COLUMN created_by VARCHAR(42);        -- 创建者地址
```

### 执行迁移脚本

```powershell
# 进入 db 目录
cd migration-service/db

# 运行迁移脚本
.\run-add-encrypted-data-column.ps1
```

**或者手动执行**：
```bash
psql -h localhost -p 5400 -U root -d migration_db -f add-encrypted-data-column.sql
```

---

## 🔌 API 接口

### 1️⃣ 上传加密数据

**端点**: `POST /api/migration/upload`

**需要认证**: ✅ 是（JWT Token）

**请求头**:
```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
x-user-smart-account: 0x...  (可选，从 JWT 自动提取)
```

**请求体**:
```json
{
  "migrationId": "mig_1234567890_abcdef",
  "encryptedData": "U2FsdGVkX1+YxNZ4xvZ8M0k5...",
  "expiresAt": 1699999999000
}
```

**响应**:

成功 (200):
```json
{
  "success": true,
  "message": "迁移数据上传成功",
  "migrationId": "mig_1234567890_abcdef",
  "expiresAt": 1699999999000
}
```

失败 (400 - 已存在):
```json
{
  "success": false,
  "message": "迁移数据已存在，不能重复上传",
  "code": "DATA_ALREADY_EXISTS"
}
```

失败 (404 - 会话不存在):
```json
{
  "success": false,
  "message": "迁移会话不存在",
  "code": "MIGRATION_SESSION_NOT_FOUND"
}
```

失败 (413 - 数据过大):
```json
{
  "success": false,
  "message": "数据大小超过限制（最大 5242880 字节）",
  "code": "PAYLOAD_TOO_LARGE"
}
```

---

### 2️⃣ 下载加密数据

**端点**: `GET /api/migration/download/:migrationId`

**需要认证**: ❌ 否（新设备还没有 Token）

**路径参数**:
- `migrationId`: 迁移会话ID

**响应**:

成功 (200):
```json
{
  "success": true,
  "encryptedData": "U2FsdGVkX1+YxNZ4xvZ8M0k5...",
  "expiresAt": 1699999999000
}
```

失败 (404 - 不存在):
```json
{
  "success": false,
  "message": "迁移数据不存在或已过期",
  "code": "DATA_NOT_FOUND"
}
```

失败 (404 - 已过期):
```json
{
  "success": false,
  "message": "迁移数据已过期",
  "code": "DATA_EXPIRED"
}
```

失败 (404 - 未上传):
```json
{
  "success": false,
  "message": "迁移数据尚未上传",
  "code": "DATA_NOT_UPLOADED"
}
```

---

## 🔄 完整流程示例

### 旧设备（发送方）

```javascript
// 步骤 1: 创建迁移会话
const createResp = await axios.post('http://localhost:50052/api/migration/create', {
  id: migrationId,
  oldDeviceId: deviceId,
  expiresAt: Date.now() + 5 * 60 * 1000  // 5分钟后过期
});

const confirmCode = createResp.data.data.confirmCode;
console.log('确认码:', confirmCode);  // 显示给用户

// 步骤 2: 准备迁移数据
const migrationData = {
  privateKey: userPrivateKey,
  mnemonic: userMnemonic,
  // ... 其他需要迁移的数据
};

// 步骤 3: 加密数据（使用确认码）
const encryptedData = encryptWithConfirmCode(
  JSON.stringify(migrationData), 
  confirmCode
);

// 步骤 4: 上传加密数据
await axios.post(
  'http://localhost:50052/api/migration/upload',
  {
    migrationId,
    encryptedData,
    expiresAt: createResp.data.data.expiresAt
  },
  {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'x-user-smart-account': userAddress
    }
  }
);

console.log('✅ 数据上传成功！');
```

### 新设备（接收方）

```javascript
// 步骤 1: 用户输入迁移ID和确认码
const migrationId = prompt('请输入迁移ID');
const confirmCode = prompt('请输入6位确认码');

// 步骤 2: 验证确认码
const verifyResp = await axios.post('http://localhost:50052/api/migration/verify', {
  migrationId,
  confirmCode
});

if (!verifyResp.data.data.valid) {
  throw new Error('确认码错误！');
}

// 步骤 3: 下载加密数据
const downloadResp = await axios.get(
  `http://localhost:50052/api/migration/download/${migrationId}`
);

const encryptedData = downloadResp.data.encryptedData;

// 步骤 4: 解密数据（使用确认码）
const decryptedData = decryptWithConfirmCode(encryptedData, confirmCode);
const migrationData = JSON.parse(decryptedData);

// 步骤 5: 恢复账户
const wallet = new ethers.Wallet(migrationData.privateKey);
console.log('✅ 账户迁移成功！');
```

---

## 🔐 安全特性

### 1. 数据加密

```
客户端加密流程：
1. 使用 AES-256-GCM 加密迁移数据
2. 密钥从确认码派生（PBKDF2）
3. 服务器存储加密数据，无法解密
```

### 2. 大小限制

```javascript
// 最大 5MB
const MAX_SIZE = 5 * 1024 * 1024;

if (dataSize > MAX_SIZE) {
  throw new Error('数据超过 5MB 限制');
}
```

### 3. 过期机制

```
- 创建时设置过期时间（默认 5 分钟）
- 下载时检查是否过期
- 定时任务自动清理过期数据
```

### 4. 防重复上传

```sql
-- 检查是否已存在数据
SELECT encrypted_data IS NOT NULL FROM migration_sessions WHERE id = ?

-- 如果已存在，返回错误
```

### 5. 下载统计

```sql
-- 每次下载增加计数
UPDATE migration_sessions 
SET download_count = download_count + 1 
WHERE id = ?
```

---

## 📊 数据库表结构

```sql
CREATE TABLE migration_sessions (
    id VARCHAR(50) PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    old_device_id VARCHAR(100) NOT NULL,
    new_device_id VARCHAR(100),
    confirm_code VARCHAR(6) NOT NULL,
    confirmed_at BIGINT,
    
    -- 新增字段
    encrypted_data TEXT,              -- 加密数据
    data_size BIGINT DEFAULT 0,       -- 数据大小
    download_count INTEGER DEFAULT 0, -- 下载次数
    uploaded_at BIGINT,               -- 上传时间
    created_by VARCHAR(42),           -- 创建者地址
    
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT migration_sessions_status_check 
    CHECK (status IN ('pending', 'completed', 'expired'))
);
```

---

## 🧪 测试用例

### 1. 正常流程测试

```bash
# 1. 创建会话
curl -X POST http://localhost:50052/api/migration/create \
  -H "Content-Type: application/json" \
  -d '{
    "id": "mig_test_001",
    "oldDeviceId": "device_001",
    "expiresAt": 1699999999000
  }'

# 2. 上传数据
curl -X POST http://localhost:50052/api/migration/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "migrationId": "mig_test_001",
    "encryptedData": "U2FsdGVkX1+...",
    "expiresAt": 1699999999000
  }'

# 3. 下载数据
curl -X GET http://localhost:50052/api/migration/download/mig_test_001
```

### 2. 错误场景测试

```bash
# 测试：重复上传
curl -X POST http://localhost:50052/api/migration/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "migrationId": "mig_test_001",
    "encryptedData": "duplicate",
    "expiresAt": 1699999999000
  }'
# 预期：400 DATA_ALREADY_EXISTS

# 测试：下载不存在的数据
curl -X GET http://localhost:50052/api/migration/download/mig_nonexistent
# 预期：404 DATA_NOT_FOUND

# 测试：数据过大
curl -X POST http://localhost:50052/api/migration/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "migrationId": "mig_test_002",
    "encryptedData": "'$(head -c 6000000 /dev/urandom | base64)'"
  }'
# 预期：413 PAYLOAD_TOO_LARGE
```

---

## 📝 代码文件清单

### 修改的文件

1. **数据库**
   - `db/add-encrypted-data-column.sql` - 新增字段SQL
   - `db/run-add-encrypted-data-column.ps1` - 执行脚本

2. **Service 层**
   - `src/services/migration.service.js`
     - `uploadEncryptedData()` - 上传方法
     - `downloadEncryptedData()` - 下载方法
     - `checkDataExists()` - 检查数据存在性

3. **Controller 层**
   - `src/controllers/migration.controller.js`
     - `uploadEncryptedData()` - 上传控制器
     - `downloadEncryptedData()` - 下载控制器

4. **Routes 层**
   - `src/routes/migration.routes.js`
     - `POST /upload` - 上传路由
     - `GET /download/:migrationId` - 下载路由

5. **测试文件**
   - `httpTest/migration-upload-download.http` - HTTP 测试文件

---

## 🚀 部署步骤

### 1. 数据库迁移

```powershell
cd migration-service/db
.\run-add-encrypted-data-column.ps1
```

### 2. 重启服务

```powershell
cd migration-service
npm start
```

### 3. 验证功能

```bash
# 健康检查
curl http://localhost:50052/api/migration/health

# 预期响应
{
  "success": true,
  "message": "迁移服务正常",
  "timestamp": 1699999999000
}
```

---

## ⚠️ 注意事项

### 1. 安全性

- ✅ 服务器不存储明文数据
- ✅ 服务器无法解密数据
- ✅ 确认码仅客户端知道
- ⚠️ 上传接口需要 JWT 认证
- ⚠️ 下载接口不需要认证（使用确认码验证）

### 2. 性能

- 数据大小限制：5MB
- 过期时间建议：5-10 分钟
- 定时清理：每小时执行一次

### 3. 错误处理

- 400: 参数错误、数据已存在
- 404: 数据不存在、已过期
- 413: 数据过大
- 500: 服务器错误

---

## 📚 相关文档

- [API 完整文档](./API_DOCUMENTATION.md)
- [数据库设计](./db/README.md)
- [测试指南](./httpTest/README.md)

---

**实现完成** ✅  
**测试状态**: 待测试  
**部署状态**: 待部署


