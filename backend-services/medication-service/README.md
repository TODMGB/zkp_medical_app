# 医药服务（Medication Service）

## 📋 服务概述

医药服务负责管理老人的用药计划，支持医生创建、编辑用药计划，并由老人控制隐私分享给相关人员。

## 🎯 核心功能

- ✅ **用药计划管理**：创建、查询、更新、删除用药计划（完全加密存储）
- ✅ **常用药物库**：预置150种常用药物，支持搜索和分类
- ✅ **端到端加密**：所有敏感医疗数据客户端加密，后端无法读取
- ✅ **权限管理**：医生、老人的分级权限控制

## 📊 数据库

### 数据库信息
- **数据库名称**：`bs_medication_db`
- **端口**：`5400`
- **用户**：`root`
- **密码**：`123456`

### 数据表结构（2个表）

1. **medication_plans** - 用药计划表
   - 存储加密的用药计划数据
   - 包含患者地址、医生地址、计划哈希等
   
2. **common_medications** - 常用药物库表
   - 预置150种常用药物
   - 包含药物名称、分类、剂量、适应症等

### 数据库初始化

```powershell
cd db
.\init-db.ps1
```

或手动执行：
```powershell
cd db
$env:PGPASSWORD="123456"
$env:PGCLIENTENCODING="UTF8"

# 创建数据库
psql -h localhost -p 5400 -U root -d postgres -f create-medication-database.sql

# 启用扩展
psql -h localhost -p 5400 -U root -d bs_medication_db -f init-extensions.sql

# 创建表
psql -h localhost -p 5400 -U root -d bs_medication_db -f create-tables.sql

# 填充药物数据
psql -h localhost -p 5400 -U root -d bs_medication_db -f seed-medications.sql
```

## 🚀 启动服务

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
npm start
```

服务将在以下端口启动：
- **HTTP API**: `http://localhost:3007`
- **gRPC**: `localhost:50057`
- **WebSocket**: `ws://localhost:3007/ws`

## 🔌 API 端点

### 基础URL
- 直接访问: `http://localhost:3007/api/medication`
- 通过API Gateway: `http://localhost:3000/api/medication`

### 用药计划管理

#### 1. 创建用药计划（加密版）

**端点**: `POST /api/medication/plans`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**请求体**:
```json
{
  "patient_address": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
  "start_date": "2025-10-30T00:00:00.000Z",
  "end_date": "2026-01-30T00:00:00.000Z",
  "encrypted_plan_data": "0x..."
}
```

**加密数据结构** (明文，客户端加密前):
```json
{
  "plan_name": "高血压综合治疗方案",
  "diagnosis": "原发性高血压（II级）",
  "start_date": "2025-10-30T00:00:00.000Z",
  "end_date": "2026-01-30T00:00:00.000Z",
  "medications": [
    {
      "medication_id": "uuid",
      "medication_code": "CV004",
      "medication_name": "阿司匹林肠溶片",
      "dosage": "100mg",
      "frequency": "每日一次",
      "instructions": "早餐后服用"
    }
  ],
  "reminders": [
    {
      "medication_code": "CV004",
      "medication_name": "阿司匹林肠溶片",
      "reminder_time": "08:00:00",
      "reminder_days": "everyday",
      "reminder_message": "早餐后服用高血压药物"
    }
  ],
  "notes": "请定期监测血压，每周至少测量3次"
}
```

**加密示例** (JavaScript):
```javascript
const crypto = require('crypto');
const { ethers } = require('ethers');

// 派生共享密钥 (ECDH)
function deriveSharedSecret(privateKey, peerPublicKey) {
  const wallet = new ethers.Wallet(privateKey);
  const sharedPoint = wallet.signingKey.computeSharedSecret(peerPublicKey);
  return crypto.createHash('sha256')
    .update(Buffer.from(sharedPoint.slice(2), 'hex'))
    .digest();
}

// 加密数据
function encrypt(plaintext, sharedSecret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sharedSecret, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // 返回格式: iv(24) + authTag(32) + encrypted
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

// 使用示例
const doctorPrivateKey = '0x...'; // 医生的私钥
const patientPublicKey = '0x...';  // 患者的公钥

const planData = {
  plan_name: '高血压综合治疗方案',
  diagnosis: '原发性高血压（II级）',
  medications: [...],
  reminders: [...],
  notes: '...'
};

const sharedSecret = deriveSharedSecret(doctorPrivateKey, patientPublicKey);
const encryptedData = encrypt(JSON.stringify(planData), sharedSecret);

// 发送到服务器
await axios.post('/api/medication/plans', {
  patient_address: patientAddress,
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 90*24*60*60*1000).toISOString(),
  encrypted_plan_data: encryptedData
}, {
  headers: { Authorization: `Bearer ${doctorToken}` }
});
```

**响应**:
```json
{
  "plan_id": "uuid",
  "patient_address": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
  "doctor_address": "0x0eda7118fC8Bdb08935892116Bcfa640E80926F1",
  "start_date": "2025-10-30T00:00:00.000Z",
  "end_date": "2026-01-30T00:00:00.000Z",
  "status": "active",
  "plan_hash": "0x...",
  "encryption_key_hash": "0x...",
  "created_at": "2025-10-30T14:02:03.437Z"
}
```

#### 2. 查询计划详情

**端点**: `GET /api/medication/plans/:planId`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "data": {
    "plan_id": "uuid",
    "patient_address": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
    "doctor_address": "0x0eda7118fC8Bdb08935892116Bcfa640E80926F1",
    "start_date": "2025-10-30T00:00:00.000Z",
    "end_date": "2026-01-30T00:00:00.000Z",
    "status": "active",
    "encrypted_plan_data": "0x...",
    "created_at": "2025-10-30T14:02:03.437Z"
  }
}
```

**解密示例** (JavaScript):
```javascript
// 解密数据
function decrypt(encryptedData, sharedSecret) {
  const iv = Buffer.from(encryptedData.slice(0, 24), 'hex');
  const authTag = Buffer.from(encryptedData.slice(24, 56), 'hex');
  const encrypted = encryptedData.slice(56);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', sharedSecret, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// 患者解密计划
const patientPrivateKey = '0x...'; // 患者的私钥
const doctorPublicKey = '0x...';    // 医生的公钥

const sharedSecret = deriveSharedSecret(patientPrivateKey, doctorPublicKey);
const decryptedText = decrypt(plan.encrypted_plan_data, sharedSecret);
const planData = JSON.parse(decryptedText);

console.log('计划名称:', planData.plan_name);
console.log('诊断:', planData.diagnosis);
console.log('药物:', planData.medications);
```

#### 3. 查询医生创建的计划

**端点**: `GET /api/medication/plans/doctor/:doctorAddress`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**查询参数**:
- `page` - 页码 (默认: 1)
- `limit` - 每页数量 (默认: 10)

**响应**:
```json
{
  "plans": [
    {
      "plan_id": "uuid",
      "patient_address": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
      "start_date": "2025-10-30T00:00:00.000Z",
      "end_date": "2026-01-30T00:00:00.000Z",
      "status": "active",
      "encrypted_plan_data": "0x...",
      "created_at": "2025-10-30T14:02:03.437Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 10
}
```

#### 4. 更新计划

**端点**: `PUT /api/medication/plans/:planId`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**请求体**:
```json
{
  "encrypted_plan_data": "0x..."
}
```

**响应**:
```json
{
  "message": "用药计划更新成功",
  "plan_id": "uuid"
}
```

#### 5. 删除计划

**端点**: `DELETE /api/medication/plans/:planId`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "message": "用药计划已删除"
}
```

### 常用药物库

#### 6. 搜索药物

**端点**: `GET /api/medication/medications/search`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**查询参数**:
- `search` - 药物名称关键词
- `category` - 药物分类
- `limit` - 返回数量限制（默认20）

**示例请求**:
```
GET /api/medication/medications/search?search=阿司匹林
GET /api/medication/medications/search?category=心血管系统用药&limit=10
```

**响应**:
```json
{
  "data": [
    {
      "medication_id": "uuid",
      "medication_code": "CV004",
      "medication_name": "阿司匹林肠溶片",
      "generic_name": "乙酰水杨酸",
      "category": "心血管系统用药",
      "dosage_form": "片剂",
      "common_dosage": "75-100mg/次，每日1次",
      "indications": "预防血栓形成，用于心脑血管疾病",
      "side_effects": "可能引起胃肠道不适、出血倾向",
      "precautions": "消化性溃疡患者慎用，服药期间注意观察有无出血倾向"
    }
  ]
}
```

#### 7. 获取药物详情

**端点**: `GET /api/medication/medications/:medicationId`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "data": {
    "medication_id": "uuid",
    "medication_code": "CV004",
    "medication_name": "阿司匹林肠溶片",
    "generic_name": "乙酰水杨酸",
    "category": "心血管系统用药",
    "dosage_form": "片剂",
    "common_dosage": "75-100mg/次，每日1次",
    "common_frequency": "每日1次",
    "administration_route": "口服",
    "indications": "预防血栓形成，用于心脑血管疾病",
    "contraindications": "活动性消化性溃疡、严重肝肾功能不全",
    "side_effects": "可能引起胃肠道不适、出血倾向",
    "drug_interactions": "与抗凝药物合用时需谨慎",
    "precautions": "消化性溃疡患者慎用，服药期间注意观察有无出血倾向",
    "storage_conditions": "密封，在干燥处保存"
  }
}
```

#### 8. 获取药物分类列表

**端点**: `GET /api/medication/categories`

**响应**:
```json
{
  "data": [
    "心血管系统用药",
    "消化系统用药",
    "呼吸系统用药",
    "神经系统用药",
    "内分泌系统用药",
    "抗感染药",
    "镇痛抗炎药",
    "维生素和矿物质",
    "其他常用药"
  ]
}
```

## 🔐 权限设计（隐私优先）

### 角色权限矩阵

| 功能 | 医生 | 老人 |
|------|------|------|
| 创建用药计划 | ✅ | ❌ |
| 查看用药计划 | ✅ | ✅ |
| 编辑用药计划 | ✅ | ❌ |
| 删除用药计划 | ✅ | ✅ |
| 搜索药物 | ✅ | ✅ |

**核心原则：完全端到端加密，后端无法读取医疗数据明文**

### 业务流程

1. **医生搜索药物** → 从药物库选择合适的药物
2. **医生创建计划** → 使用患者公钥加密所有敏感信息
3. **通过secure-exchange发送** → 加密传输给患者
4. **患者解密查看** → 使用私钥解密查看完整内容
5. **医生可更新计划** → 重新加密后更新

## 📦 常用药物数据

系统预置了150种常用药物，包括：

- **心血管系统用药**：25种（如氨氯地平、美托洛尔、阿司匹林等）
- **消化系统用药**：20种（如奥美拉唑、雷贝拉唑等）
- **呼吸系统用药**：15种（如氨溴索、孟鲁司特等）
- **神经系统用药**：15种（如布洛芬、加巴喷丁等）
- **内分泌系统用药**：15种（如二甲双胍、格列美脲等）
- **抗感染药**：20种（如阿莫西林、左氧氟沙星等）
- **镇痛抗炎药**：10种（如塞来昔布、美洛昔康等）
- **维生素和矿物质**：15种（如复合维生素B、钙尔奇等）
- **其他常用药**：15种（如氯雷他定、泼尼松等）

每种药物包含：
- 药物名称、编码、分类
- 常用剂量、频率、途径
- 适应症、副作用、禁忌症
- 特殊说明

## 📚 完整使用示例

### 医生创建并发送加密用药计划

```javascript
const axios = require('axios');
const crypto = require('crypto');
const { ethers } = require('ethers');

const API_BASE = 'http://localhost:3000/api';

// 加密工具函数
function deriveSharedSecret(privateKey, peerPublicKey) {
  const wallet = new ethers.Wallet(privateKey);
  const sharedPoint = wallet.signingKey.computeSharedSecret(peerPublicKey);
  return crypto.createHash('sha256')
    .update(Buffer.from(sharedPoint.slice(2), 'hex'))
    .digest();
}

function encrypt(plaintext, sharedSecret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sharedSecret, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

async function createMedicationPlan() {
  const doctorToken = 'doctor_jwt_token';
  const doctorPrivateKey = '0x...';
  const patientPublicKey = '0x...';
  const patientAddress = '0xPatientAddress';
  
  // 1. 搜索药物
  const searchResp = await axios.get(
    `${API_BASE}/medication/medications/search`,
    { 
      params: { search: '阿司匹林' },
      headers: { Authorization: `Bearer ${doctorToken}` }
    }
  );
  
  const medication = searchResp.data.data[0];
  console.log('找到药物:', medication.medication_name);
  
  // 2. 构建计划数据（明文）
  const planData = {
    plan_name: '高血压综合治疗方案',
    diagnosis: '原发性高血压（II级）',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 90*24*60*60*1000).toISOString(),
    medications: [
      {
        medication_id: medication.medication_id,
        medication_code: medication.medication_code,
        medication_name: medication.medication_name,
        dosage: '100mg',
        frequency: '每日一次',
        instructions: '早餐后服用'
      }
    ],
    reminders: [
      {
        medication_code: medication.medication_code,
        medication_name: medication.medication_name,
        reminder_time: '08:00:00',
        reminder_days: 'everyday',
        reminder_message: '早餐后服用高血压药物'
      }
    ],
    notes: '请定期监测血压'
  };
  
  // 3. 加密计划数据
  const sharedSecret = deriveSharedSecret(doctorPrivateKey, patientPublicKey);
  const encryptedData = encrypt(JSON.stringify(planData), sharedSecret);
  
  console.log('计划数据已加密，长度:', encryptedData.length);
  
  // 4. 创建用药计划
  const createResp = await axios.post(
    `${API_BASE}/medication/plans`,
    {
      patient_address: patientAddress,
      start_date: planData.start_date,
      end_date: planData.end_date,
      encrypted_plan_data: encryptedData
    },
    { headers: { Authorization: `Bearer ${doctorToken}` } }
  );
  
  const planId = createResp.data.plan_id;
  console.log('计划已创建，ID:', planId);
  
  // 5. 通过 secure-exchange 发送通知
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const dataHash = crypto.createHash('sha256')
    .update(encryptedData)
    .digest('hex');
  
  const signaturePayload = {
    recipient_address: patientAddress.toLowerCase(),
    timestamp: timestamp,
    nonce: nonce,
    data_hash: dataHash
  };
  
  const wallet = new ethers.Wallet(doctorPrivateKey);
  const signature = await wallet.signMessage(JSON.stringify(signaturePayload));
  
  await axios.post(
    `${API_BASE}/secure-exchange/send`,
    {
      recipientAddress: patientAddress,
      encryptedData: encryptedData,
      signature: signature,
      timestamp: timestamp,
      nonce: nonce,
      dataType: 'medication_plan',
      metadata: {
        plan_id: planId,
        plan_name: '【新用药计划】'
      }
    },
    { headers: { Authorization: `Bearer ${doctorToken}` } }
  );
  
  console.log('通知已发送给患者');
  
  return planId;
}
```

### 患者接收并解密用药计划

```javascript
function decrypt(encryptedData, sharedSecret) {
  const iv = Buffer.from(encryptedData.slice(0, 24), 'hex');
  const authTag = Buffer.from(encryptedData.slice(24, 56), 'hex');
  const encrypted = encryptedData.slice(56);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', sharedSecret, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

async function receiveAndDecryptPlan() {
  const patientToken = 'patient_jwt_token';
  const patientPrivateKey = '0x...';
  const doctorPublicKey = '0x...';
  
  // 1. 获取待处理消息
  const messagesResp = await axios.get(
    `${API_BASE}/secure-exchange/pending`,
    { 
      params: { dataType: 'medication_plan' },
      headers: { Authorization: `Bearer ${patientToken}` }
    }
  );
  
  const message = messagesResp.data.messages[0];
  console.log('收到加密消息，ID:', message.message_id);
  
  // 2. 解密消息
  const sharedSecret = deriveSharedSecret(patientPrivateKey, doctorPublicKey);
  const decryptedText = decrypt(message.encrypted_data, sharedSecret);
  const planData = JSON.parse(decryptedText);
  
  console.log('计划名称:', planData.plan_name);
  console.log('诊断:', planData.diagnosis);
  console.log('药物:', planData.medications);
  console.log('提醒:', planData.reminders);
  
  // 3. 确认收到
  await axios.post(
    `${API_BASE}/secure-exchange/acknowledge`,
    {
      messageId: message.message_id,
      status: 'received',
      acknowledged: true
    },
    { headers: { Authorization: `Bearer ${patientToken}` } }
  );
  
  console.log('已确认收到计划');
  
  return planData;
}
```

## 🔄 与其他服务的集成

### 1. User Service
- 验证用户身份和角色
- 权限控制
- 获取用户的加密公钥（用于ECDH密钥协商）

### 2. Secure Exchange Service
- 加密发送用药计划
- 保护医疗隐私数据
- 通过端到端加密确保后端无法读取明文
- 实时通知患者有新的用药计划

### 3. Notification Service (可选)
- 发送用药提醒通知
- WebSocket实时推送

## 📝 开发说明

### 技术栈

- **Node.js** + **Express**
- **PostgreSQL** 17.6（数据库）
- **Redis**（缓存）
- **RabbitMQ**（消息队列）
- **gRPC**（服务间通信）
- **WebSocket**（实时推送）

### 项目结构

```
medication-service/
├── db/                          # 数据库脚本
│   ├── create-medication-database.sql
│   ├── create-tables.sql
│   ├── seed-medications.sql     # 150种药物数据
│   └── init-db.ps1
├── src/
│   ├── config/                  # 配置
│   ├── entity/                  # 数据库操作
│   │   ├── db.js
│   │   └── medication.entity.js
│   ├── controllers/             # 控制器
│   ├── services/                # 业务逻辑
│   ├── routes/                  # 路由
│   ├── middleware/              # 中间件
│   ├── mq/                      # 消息队列
│   ├── rpc/                     # gRPC
│   └── redis/                   # Redis
├── httpTest/                    # HTTP测试
├── server.js                    # 服务入口
└── package.json

```

## 🎯 后续开发计划

### 未来增强功能
- [ ] 药物相互作用检查（基于药物代码）
- [ ] 计划模板功能（预定义常见病症的用药方案）
- [ ] 支持附件上传（检查报告等，加密存储）
- [ ] 多语言药物信息支持

## ⚠️ 注意事项

1. **隐私保护**：所有医疗数据必须在客户端加密，后端只存储密文
2. **权限验证**：每个接口都需要验证JWT Token和用户角色
3. **密钥管理**：使用ECDH密钥协商，基于用户的EOA密钥对
4. **错误处理**：优雅处理异常，不暴露敏感信息或加密细节

---

## 🏥 健康检查

访问 `http://localhost:3007/api/health` 查看服务状态

---

**文档版本**: 1.0.0  
**最后更新**: 2025-10-30
