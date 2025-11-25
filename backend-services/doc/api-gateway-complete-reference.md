# API Gateway 完整接口文档

> **面向前端开发者的完整调用指南**  
> 版本: v2.0  
> 更新日期: 2025-10-31

---

## 📋 目录

- [1. 概述](#1-概述)
- [2. 认证流程](#2-认证流程)
- [3. 用户服务 API](#3-用户服务-api)
- [4. 关系管理服务 API](#4-关系管理服务-api)
- [5. 医药服务 API](#5-医药服务-api)
- [6. 安全交换服务 API](#6-安全交换服务-api)
- [7. 通知服务 API](#7-通知服务-api)
- [8. ERC4337 服务 API](#8-erc4337-服务-api)
- [9. 账户迁移服务 API](#9-账户迁移服务-api)
- [10. ZKP 证明服务 API](#10-zkp-证明服务-api)
- [11. 加密解密工具函数](#11-加密解密工具函数)
- [12. 完整业务流程示例](#12-完整业务流程示例)

---

## 1. 概述

### 1.1 基础信息

- **API Gateway 地址**: `http://localhost:3000`
- **WebSocket 地址**: `ws://localhost:3000`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

### 1.2 通用响应格式

**成功响应**:
```json
{
  "success": true,
  "data": { /* 业务数据 */ },
  "message": "操作成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

### 1.3 通用请求头

```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

---

## 2. 认证流程

### 2.1 用户注册

**端点**: `POST /api/auth/register`

**描述**: 创建新用户账户（首次使用时）

**请求体**:
```json
{
  "eoa_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "smart_account_address": "0xAccountAddress",
  "phone_number": "13810010001",
  "id_card_number": "110101195803151234",
  "email": "user@example.com",
  "encryption_public_key": "0x02fcd2313687146ca8d6ccc04bf489b72e292990f5868306c63dfa9b6c0a33b740"
}
```

**参数说明**:
- `eoa_address`: 用户的EOA钱包地址
- `smart_account_address`: 预计算的Smart Account地址
- `phone_number`: 手机号（用于身份验证）
- `id_card_number`: 身份证号
- `email`: 电子邮箱
- `encryption_public_key`: 用于ECIES加密的压缩公钥（与EOA公钥相同）

**响应**:
```json
{
  "success": true,
  "data": {
    "smart_account": "0xAccountAddress",
    "username": "王秀英",
    "role": "patient",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "encryption_public_key": "0x02fcd2..."
  }
}
```

### 2.2 用户登录

**端点**: `POST /api/auth/login`

**描述**: 用户登录获取JWT Token

**请求体**:
```json
{
  "eoa_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "login_time": "2025-10-31T08:30:00.000Z",
  "signature": "0x..."
}
```

**签名生成（JavaScript）**:
```javascript
const { ethers } = require('ethers');

// 1. 准备签名消息
const loginTime = new Date().toISOString();
const message = `LOGIN_TIME:${loginTime}`;

// 2. 使用EOA私钥签名
const wallet = new ethers.Wallet(privateKey);
const signature = await wallet.signMessage(message);

// 3. 发送登录请求
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eoa_address: wallet.address,
    login_time: loginTime,
    signature: signature
  })
});
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "smart_account": "0xAccountAddress",
      "eoa_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "username": "王秀英",
      "role": "patient"
    }
  }
}
```

### 2.3 更新加密公钥

**端点**: `PUT /api/auth/encryption-key`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**请求体**:
```json
{
  "encryption_public_key": "0x03..."
}
```

**响应**:
```json
{
  "success": true,
  "message": "加密公钥已更新"
}
```

---

## 3. 用户服务 API

### 3.1 查询个人档案

**端点**: `GET /api/userinfo/persons/lookup`

**查询参数**:
- `id_card_number`: 身份证号
- `phone_number`: 手机号
- `email`: 邮箱

**示例**:
```javascript
const response = await fetch(
  'http://localhost:3000/api/userinfo/persons/lookup?phone_number=13810010001'
);
```

**响应**:
```json
{
  "id": 1,
  "id_card_number": "1101**********1234",
  "phone_number": "13810010001",
  "email": "user@example.com",
  "name": "王秀英"
}
```

---

## 4. 关系管理服务 API

### 4.1 查看访问组

**端点**: `GET /api/relation/access-groups/stats`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**查询参数**:
- `user_smart_account`: Smart Account地址

**响应**:
```json
{
  "data": [
    {
      "id": "uuid",
      "group_name": "主治医生",
      "group_type": "PRIMARY_DOCTOR",
      "owner_address": "0x...",
      "member_count": 1
    },
    {
      "id": "uuid",
      "group_name": "主要家人",
      "group_type": "FAMILY_PRIMARY",
      "owner_address": "0x...",
      "member_count": 2
    }
  ]
}
```

### 4.2 创建自定义访问组

**端点**: `POST /api/relation/access-groups`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**请求体**:
```json
{
  "groupName": "我的护理团队",
  "description": "负责日常护理的专业团队",
  "ownerAddress": "0x..."
}
```

**响应**:
```json
{
  "data": {
    "id": "uuid",
    "group_name": "我的护理团队",
    "owner_address": "0x...",
    "created_at": "2025-10-31T08:30:00.000Z"
  }
}
```

### 4.3 创建邀请

**端点**: `POST /api/relation/invitations`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**请求体**:
```json
{
  "accessGroupId": "uuid"
}
```

**响应**:
```json
{
  "token": "INV_abc123def456...",
  "expiresAt": "2025-11-01T08:30:00.000Z"
}
```

### 4.4 接受邀请

**端点**: `POST /api/relation/relationships/accept`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**请求体**:
```json
{
  "token": "INV_abc123def456..."
}
```

**响应**:
```json
{
  "success": true,
  "message": "邀请已接受",
  "data": {
    "relationship_id": "uuid",
    "status": "active"
  }
}
```

### 4.5 查看访问组成员

**端点**: `GET /api/relation/access-groups/:accessGroupId/members`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**响应**:
```json
{
  "members": [
    {
      "id": "uuid",
      "viewer_address": "0x...",
      "status": "active",
      "joined_at": "2025-10-31T08:30:00.000Z"
    }
  ]
}
```

### 4.6 获取我的关系列表 🆕

**端点**: `GET /api/relation/relationships/my`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**描述**: 获取当前用户作为访问者（viewer）的所有关系记录，用于显示"我的患者列表"或"我的家人列表"

**适用场景**:
- 👨‍⚕️ 医生查看自己可以访问的所有患者
- 👨‍👩‍👧 家属查看自己可以照护的所有老人
- 🏥 护士查看自己负责的患者

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "relationship_uuid",
      "owner_address": "0x123...",
      "viewer_address": "0x456...",
      "access_group_id": 123,
      "access_group_name": "家人",
      "group_type": "FAMILY_PRIMARY",
      "status": "active",
      "permissions": {
        "canView": true,
        "canViewMedication": true,
        "canViewAppointments": true
      },
      "permission_level": 1,
      "joined_at": "2025-10-31T08:30:00.000Z",
      "last_accessed_at": "2025-10-31T10:00:00.000Z"
    }
  ],
  "count": 2
}
```

**使用示例**:
```javascript
// 医生查看自己的患者列表
const response = await fetch(
  'http://localhost:3000/api/relation/relationships/my',
  {
    headers: { 'Authorization': `Bearer ${doctorToken}` }
  }
);

const { data: myPatients, count } = await response.json();
console.log(`我有 ${count} 个患者`);

myPatients.forEach(relationship => {
  console.log(`患者: ${relationship.owner_address}`);
  console.log(`访问组: ${relationship.access_group_name}`);
  console.log(`状态: ${relationship.status}`);
});
```

### 4.7 关系管理操作

**暂停关系**: `PUT /api/relation/relationships/:relationshipId/suspend`

**恢复关系**: `PUT /api/relation/relationships/:relationshipId/resume`

**撤销关系**: `DELETE /api/relation/relationships/:relationshipId`

**说明**: 这些操作会自动通过 MQ 发送通知给相关用户

---

## 5. 医药服务 API

### 5.1 搜索常用药物

**端点**: `GET /api/medication/medications/search`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**查询参数**:
- `search`: 药物名称关键词
- `category`: 药物分类

**示例**:
```javascript
const response = await fetch(
  'http://localhost:3000/api/medication/medications/search?search=阿司匹林',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

**响应**:
```json
{
  "data": [
    {
      "medication_id": 1,
      "medication_name": "阿司匹林肠溶片",
      "generic_name": "阿司匹林",
      "medication_code": "CV004",
      "category": "心血管系统用药",
      "dosage_form": "片剂",
      "common_dosage": "100mg",
      "side_effects": "胃肠道反应...",
      "precautions": "不宜空腹服用..."
    }
  ]
}
```

### 5.2 获取药物详情

**端点**: `GET /api/medication/medications/:medicationId`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**响应**: 同上

### 5.3 创建加密用药计划

**端点**: `POST /api/medication/plans`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**请求体**:
```json
{
  "patient_address": "0xPatientSmartAccount",
  "start_date": "2025-10-31T00:00:00.000Z",
  "end_date": "2026-01-31T00:00:00.000Z",
  "encrypted_plan_data": "..."
}
```

**加密逻辑（JavaScript）**:
```javascript
const crypto = require('crypto');
const { ethers } = require('ethers');

// 1. 准备计划数据（明文）
const planData = {
  plan_name: '高血压综合治疗方案',
  diagnosis: '原发性高血压（II级）',
  medications: [
    {
      medication_id: 1,
      medication_code: 'CV004',
      medication_name: '阿司匹林肠溶片',
      dosage: '100mg',
      frequency: '每日一次',
      instructions: '早餐后服用'
    }
  ],
  reminders: [
    {
      medication_code: 'CV004',
      medication_name: '阿司匹林肠溶片',
      reminder_time: '08:00:00',
      reminder_days: 'everyday',
      reminder_message: '早餐后服用高血压药物'
    }
  ],
  notes: '请定期监测血压'
};

// 2. 派生共享密钥（ECDH）
function deriveSharedSecret(doctorPrivateKey, patientPublicKey) {
  const wallet = new ethers.Wallet(doctorPrivateKey);
  const sharedPoint = wallet.signingKey.computeSharedSecret(patientPublicKey);
  return crypto.createHash('sha256')
    .update(Buffer.from(sharedPoint.slice(2), 'hex'))
    .digest();
}

// 3. 加密数据（AES-256-GCM）
function encrypt(plaintext, sharedSecret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sharedSecret, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // 返回格式: iv(24) + authTag(32) + encrypted
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

// 4. 加密并发送
const sharedSecret = deriveSharedSecret(doctorPrivateKey, patientPublicKey);
const encryptedData = encrypt(JSON.stringify(planData), sharedSecret);

const response = await fetch('http://localhost:3000/api/medication/plans', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${doctorToken}`
  },
  body: JSON.stringify({
    patient_address: patientSmartAccount,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 90*24*60*60*1000).toISOString(),
    encrypted_plan_data: encryptedData
  })
});
```

**响应**:
```json
{
  "plan_id": "uuid",
  "patient_address": "0x...",
  "doctor_address": "0x...",
  "start_date": "2025-10-31T00:00:00.000Z",
  "end_date": "2026-01-31T00:00:00.000Z",
  "status": "active",
  "plan_hash": "0x...",
  "encryption_key_hash": "0x...",
  "created_at": "2025-10-31T08:30:00.000Z"
}
```

### 5.4 查询用药计划

**端点**: `GET /api/medication/plans/:planId`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**响应**:
```json
{
  "data": {
    "plan_id": "uuid",
    "patient_address": "0x...",
    "doctor_address": "0x...",
    "encrypted_plan_data": "...",
    "status": "active",
    "created_at": "2025-10-31T08:30:00.000Z"
  }
}
```

**解密逻辑（JavaScript）**:
```javascript
function decrypt(encryptedData, patientPrivateKey, doctorPublicKey) {
  // 派生相同的共享密钥
  const sharedSecret = deriveSharedSecret(patientPrivateKey, doctorPublicKey);
  
  // 解析加密数据
  const iv = Buffer.from(encryptedData.slice(0, 24), 'hex');
  const authTag = Buffer.from(encryptedData.slice(24, 56), 'hex');
  const encrypted = encryptedData.slice(56);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', sharedSecret, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}

// 使用示例
const planData = decrypt(
  plan.encrypted_plan_data,
  patientPrivateKey,
  doctorPublicKey
);
console.log('计划名称:', planData.plan_name);
console.log('药物:', planData.medications);
```

### 5.5 查询医生创建的计划

**端点**: `GET /api/medication/plans/doctor/:doctorAddress`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**查询参数**:
- `page`: 页码（默认1）
- `limit`: 每页数量（默认10）

**响应**:
```json
{
  "plans": [
    {
      "plan_id": "uuid",
      "patient_address": "0x...",
      "start_date": "2025-10-31T00:00:00.000Z",
      "status": "active",
      "created_at": "2025-10-31T08:30:00.000Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 10
}
```

### 5.6 更新用药计划

**端点**: `PUT /api/medication/plans/:planId`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**请求体**:
```json
{
  "encrypted_plan_data": "..."
}
```

### 5.7 删除用药计划

**端点**: `DELETE /api/medication/plans/:planId`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

---

## 6. 安全交换服务 API

### 6.1 获取接收者加密公钥

**端点**: `GET /api/secure-exchange/recipient-pubkey/:recipientAddress`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**响应**:
```json
{
  "encryptionPublicKey": "0x02fcd2313687146ca8d6ccc04bf489b72e292990f5868306c63dfa9b6c0a33b740",
  "recipientAddress": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1"
}
```

### 6.2 发送加密数据

**端点**: `POST /api/secure-exchange/send`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**请求体**:
```json
{
  "recipientAddress": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
  "encryptedData": "...",
  "signature": "0x...",
  "timestamp": 1730293923437,
  "nonce": "abc123def456...",
  "dataType": "medication_plan",
  "metadata": {
    "plan_id": "uuid",
    "plan_name": "【新用药计划】"
  }
}
```

**签名生成示例**:
```javascript
const crypto = require('crypto');
const { ethers } = require('ethers');

// 1. 计算数据哈希
const dataHash = crypto.createHash('sha256')
  .update(encryptedData)
  .digest('hex');

// 2. 构建签名载荷
const signaturePayload = {
  recipient_address: recipientAddress.toLowerCase(),
  timestamp: Date.now(),
  nonce: crypto.randomBytes(16).toString('hex'),
  data_hash: dataHash
};

// 3. 签名
const wallet = new ethers.Wallet(senderPrivateKey);
const signature = await wallet.signMessage(
  JSON.stringify(signaturePayload)
);

// 4. 发送请求
const response = await fetch('http://localhost:3000/api/secure-exchange/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    recipientAddress: recipientAddress,
    encryptedData: encryptedData,
    signature: signature,
    timestamp: signaturePayload.timestamp,
    nonce: signaturePayload.nonce,
    dataType: 'medication_plan',
    metadata: {
      plan_id: planId,
      plan_name: '【新用药计划】'
    }
  })
});
```

**响应**:
```json
{
  "messageId": "uuid",
  "message_id": "uuid",
  "recipientAddress": "0x...",
  "status": "pending"
}
```

### 6.3 查询待处理消息

**端点**: `GET /api/secure-exchange/pending`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**查询参数**:
- `dataType`: 数据类型（可选）
- `limit`: 返回数量（默认10）

**响应**:
```json
{
  "messages": [
    {
      "message_id": "uuid",
      "sender_address": "0x...",
      "encrypted_data": "...",
      "signature": "0x...",
      "data_type": "medication_plan",
      "metadata": {
        "plan_id": "uuid",
        "plan_name": "【新用药计划】"
      },
      "timestamp": 1730293923437,
      "created_at": "2025-10-31T08:30:00.000Z",
      "read_at": null
    }
  ]
}
```

### 6.4 确认接收消息

**端点**: `POST /api/secure-exchange/acknowledge`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**请求体**:
```json
{
  "messageId": "uuid",
  "status": "received",
  "acknowledged": true,
  "acknowledgment_note": "已收到服药计划，感谢医生！"
}
```

**响应**:
```json
{
  "success": true,
  "message": "消息确认成功",
  "status": "received"
}
```

### 6.5 WebSocket 连接（实时通知）

**连接地址**: `ws://localhost:3000/ws/secure-exchange?token=<JWT_TOKEN>`

**接收消息格式**:
```javascript
const ws = new WebSocket(`ws://localhost:3000/ws/secure-exchange?token=${token}`);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'connected':
      console.log('WebSocket连接成功:', message.data);
      break;
      
    case 'encrypted_message':
      console.log('收到新的加密消息:', message.data);
      // message.data 包含: messageId, senderAddress, encryptedData, dataType, metadata
      break;
      
    case 'message_acknowledged':
      console.log('消息已被确认:', message.data);
      break;
  }
};
```

---

## 7. 通知服务 API

### 7.1 WebSocket 连接

**连接地址**: `ws://localhost:3000/ws/notification?token=<JWT_TOKEN>`

**示例**:
```javascript
const ws = new WebSocket(`ws://localhost:3000/ws/notification?token=${token}`);

ws.onopen = () => {
  console.log('通知服务 WebSocket 连接成功');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'connected':
      console.log('欢迎:', data.data.message);
      break;
      
    case 'notification':
      // 处理新通知
      showNotification(data.data);
      break;
      
    case 'pong':
      // 心跳响应
      break;
  }
};

// 发送心跳
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);

// 标记已读（通过WebSocket）
function markAsRead(notificationId) {
  ws.send(JSON.stringify({
    type: 'mark_read',
    notification_id: notificationId
  }));
}
```

### 7.2 获取通知列表

**端点**: `GET /api/notification/notifications`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**查询参数**:
- `status`: 通知状态（unread/read）
- `limit`: 每页数量（默认50）
- `offset`: 偏移量（默认0）

**响应**:
```json
{
  "data": [
    {
      "notification_id": "uuid",
      "recipient_address": "0x...",
      "type": "medication_reminder",
      "priority": "high",
      "title": "用药提醒",
      "body": "该吃晚饭后的降压药了",
      "data": {
        "medication": "降压药",
        "time": "18:30"
      },
      "channels": ["push", "websocket"],
      "status": "sent",
      "created_at": "2025-10-31T14:02:03.437Z",
      "sent_at": "2025-10-31T14:02:03.500Z",
      "read_at": null
    }
  ]
}
```

### 7.3 获取未读数量

**端点**: `GET /api/notification/notifications/unread/count`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**响应**:
```json
{
  "count": 5,
  "data": {
    "count": 5
  }
}
```

### 7.4 标记单条已读

**端点**: `PUT /api/notification/notifications/:notificationId/read`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**响应**:
```json
{
  "success": true,
  "message": "通知已标记为已读",
  "data": {
    "notification_id": "uuid",
    "read_at": "2025-10-31T14:15:00.000Z"
  }
}
```

### 7.5 标记全部已读

**端点**: `PUT /api/notification/notifications/read-all`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**响应**:
```json
{
  "success": true,
  "message": "所有通知已标记为已读",
  "data": {
    "updated": 5
  }
}
```

### 7.6 删除通知

**端点**: `DELETE /api/notification/notifications/:notificationId`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**响应**:
```json
{
  "success": true,
  "message": "通知已删除"
}
```

---

## 8. ERC4337 服务 API

### 8.1 预计算Smart Account地址

**端点**: `POST /api/erc4337/account/address`

**请求体**:
```json
{
  "ownerAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "guardians": [],
  "threshold": 0,
  "salt": 123456
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "accountAddress": "0xCalculatedSmartAccountAddress"
  }
}
```

### 8.2 部署Smart Account

**端点**: `POST /api/erc4337/account`

**请求体**: 同上

**响应**:
```json
{
  "success": true,
  "data": {
    "accountAddress": "0x...",
    "ownerAddress": "0x...",
    "txHash": "0x...",
    "blockNumber": 12345
  }
}
```

### 8.3 查询账户信息

**端点**: `GET /api/erc4337/account/:accountAddress`

**响应**:
```json
{
  "success": true,
  "data": {
    "accountAddress": "0x...",
    "owner": "0x...",
    "guardians": ["0x...", "0x..."],
    "threshold": "2",
    "guardiansCount": 2
  }
}
```

### 8.4 添加守护者（安全方式）

**步骤1**: 构建未签名 UserOp

**端点**: `POST /api/erc4337/guardian/build`

**请求体**:
```json
{
  "accountAddress": "0xYourAccountAddress",
  "guardianAddress": "0xGuardianAddress"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "userOp": {
      "sender": "0x...",
      "nonce": "0",
      "initCode": "0x",
      "callData": "0x...",
      "callGasLimit": "100000",
      "verificationGasLimit": "300000",
      "preVerificationGas": "50000",
      "maxFeePerGas": "1000000000",
      "maxPriorityFeePerGas": "1000000000",
      "paymasterAndData": "0x...",
      "signature": "0x"
    },
    "userOpHash": "0x..."
  }
}
```

**步骤2**: 客户端签名

```javascript
const { ethers } = require('ethers');

const wallet = new ethers.Wallet(ownerPrivateKey);
const signature = await wallet.signMessage(ethers.getBytes(userOpHash));

// 将签名填入 userOp
userOp.signature = signature;
```

**步骤3**: 提交已签名 UserOp

**端点**: `POST /api/erc4337/guardian/submit`

**请求体**:
```json
{
  "userOp": {
    "sender": "0x...",
    "signature": "0x<签名>",
    ...
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "txHash": "0x...",
    "receipt": { ... }
  }
}
```

### 8.5 查询守护者列表

**端点**: `GET /api/erc4337/guardian/:accountAddress`

**响应**:
```json
{
  "success": true,
  "data": {
    "guardians": ["0x...", "0x..."],
    "threshold": "2",
    "count": 2
  }
}
```

### 8.6 社交恢复流程

**发起恢复**: `POST /api/erc4337/recovery/initiate/build`

**支持恢复**: `POST /api/erc4337/recovery/support/build`

**取消恢复**: `POST /api/erc4337/recovery/cancel/build`

**提交恢复操作**: `POST /api/erc4337/recovery/submit`

**查询恢复状态**: `GET /api/erc4337/recovery/status/:accountAddress`

---

## 9. 账户迁移服务 API

### 9.1 创建迁移会话

**端点**: `POST /api/migration/create`

**请求头**: `Authorization: Bearer <JWT_TOKEN>` (可选，用于发送通知)

**请求体**:
```json
{
  "id": "mig_1730293923_abc123",
  "oldDeviceId": "device_old_001",
  "confirmCode": "123456",
  "status": "pending",
  "createdAt": 1730293923437,
  "expiresAt": 1730294223437,
  "userAddress": "0x..."
}
```

**参数说明**:
- `userAddress`: 用户的 Smart Account 地址（可选，用于发送通知）

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

**自动通知**: 如果提供了 `userAddress`，系统会自动发送包含确认码的通知到用户设备

### 9.2 获取迁移会话

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

### 9.3 验证确认码

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

### 9.4 完成迁移

**端点**: `POST /api/migration/confirm`

**请求头**: `Authorization: Bearer <JWT_TOKEN>` (可选，用于发送通知)

**请求体**:
```json
{
  "migrationId": "mig_1730293923_abc123",
  "newDeviceId": "device_new_002",
  "status": "completed",
  "timestamp": 1730293923437,
  "userAddress": "0x..."
}
```

**参数说明**:
- `userAddress`: 用户的 Smart Account 地址（可选，用于发送通知）

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

**自动通知**: 如果提供了 `userAddress`，系统会自动发送迁移成功通知到新旧设备

### 9.5 查询迁移状态

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

---

## 10. ZKP 证明服务 API

### 10.1 生成周度汇总证明

**端点**: `POST /api/zkp/prove/weekly-summary`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**请求体**:
```json
{
  "inputs": {
    "merkleRoot": "7423237065226347324353380772367382631490014989348495481811164164159255474657",
    "leaves": [
      "1117348568668600",
      "197788718819616",
      "318169178969960",
      "450934839234344",
      "567345678965432",
      "689012345678901",
      "812345678901234"
    ]
  }
}
```

**响应**:
```json
{
  "success": true,
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "ZKP证明生成任务已启动，请使用 jobId 查询状态。"
}
```

### 10.2 查询证明任务状态

**端点**: `GET /api/zkp/proof-status/:jobId`

**请求头**: `Authorization: Bearer <JWT_TOKEN>`

**响应（处理中）**:
```json
{
  "success": true,
  "status": "processing",
  "circuitName": "weeklySummary",
  "userAddress": "0x...",
  "startTime": 1698765432100
}
```

**响应（成功）**:
```json
{
  "success": true,
  "status": "completed",
  "circuitName": "weeklySummary",
  "userAddress": "0x...",
  "startTime": 1698765432100,
  "data": {
    "success": true,
    "message": "证明和 Calldata 生成成功!",
    "calldata": "...",
    "proof": {
      "pi_a": ["...", "..."],
      "pi_b": [["...", "..."], ["...", "..."]],
      "pi_c": ["...", "..."]
    },
    "publicSignals": ["..."]
  }
}
```

### 10.3 完整使用示例

```javascript
const axios = require('axios');

async function generateWeeklyProof(token) {
  const API_BASE = 'http://localhost:3000/api';
  
  // 1. 准备输入数据
  const inputs = {
    merkleRoot: "7423237065226347324353380772367382631490014989348495481811164164159255474657",
    leaves: [
      "1117348568668600",
      "197788718819616",
      "318169178969960",
      "450934839234344",
      "567345678965432",
      "689012345678901",
      "812345678901234"
    ]
  };
  
  console.log('🚀 开始生成周度汇总证明...');
  
  // 2. 提交证明生成任务
  const proveResp = await axios.post(
    `${API_BASE}/zkp/prove/weekly-summary`,
    { inputs },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  const jobId = proveResp.data.jobId;
  console.log(`✅ 任务已提交，JobID: ${jobId}`);
  
  // 3. 轮询查询任务状态
  let status = 'processing';
  let attempts = 0;
  const maxAttempts = 60;
  
  while (status === 'processing' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResp = await axios.get(
      `${API_BASE}/zkp/proof-status/${jobId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    status = statusResp.data.status;
    attempts++;
    
    console.log(`⏳ 任务状态: ${status} (${attempts}/${maxAttempts})`);
  }
  
  // 4. 获取最终结果
  const finalResp = await axios.get(
    `${API_BASE}/zkp/proof-status/${jobId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  if (finalResp.data.status === 'completed') {
    console.log('✅ 证明生成成功!');
    console.log('Calldata:', finalResp.data.data.calldata);
    return finalResp.data.data;
  } else {
    throw new Error('证明生成失败');
  }
}
```

---

## 11. 加密解密工具函数

### 11.1 ECDH 密钥派生

```javascript
const crypto = require('crypto');
const { ethers } = require('ethers');

/**
 * 派生共享密钥（ECDH）
 * @param {string} privateKey - 自己的私钥（0x开头的hex字符串）
 * @param {string} peerPublicKey - 对方的公钥（压缩格式，0x开头）
 * @returns {Buffer} 共享密钥（32字节）
 */
function deriveSharedSecret(privateKey, peerPublicKey) {
  const wallet = new ethers.Wallet(privateKey);
  const sharedPoint = wallet.signingKey.computeSharedSecret(peerPublicKey);
  return crypto.createHash('sha256')
    .update(Buffer.from(sharedPoint.slice(2), 'hex'))
    .digest();
}
```

### 11.2 AES-256-GCM 加密

```javascript
/**
 * 加密数据（AES-256-GCM）
 * @param {string} plaintext - 要加密的明文
 * @param {Buffer} sharedSecret - 共享密钥（32字节）
 * @returns {string} 加密数据（hex格式：iv24 + authTag32 + encrypted）
 */
function encrypt(plaintext, sharedSecret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sharedSecret, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // 返回格式: iv(24字符) + authTag(32字符) + encrypted
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}
```

### 11.3 AES-256-GCM 解密

```javascript
/**
 * 解密数据（AES-256-GCM）
 * @param {string} encryptedData - 加密数据（hex格式）
 * @param {Buffer} sharedSecret - 共享密钥（32字节）
 * @returns {string} 明文
 */
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
```

### 11.4 ECDSA 签名（防重放）

```javascript
/**
 * 生成ECDSA签名（用于防重放攻击）
 * @param {Object} payload - 签名载荷
 * @param {string} privateKey - 私钥
 * @returns {Promise<string>} 签名（0x开头的hex字符串）
 */
async function signData(payload, privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  const message = JSON.stringify(payload);
  return await wallet.signMessage(message);
}
```

---

## 12. 完整业务流程示例

### 12.1 用户注册和登录流程

```javascript
const { ethers } = require('ethers');

// ============================================
// 步骤1: 创建钱包（客户端本地）
// ============================================
const wallet = ethers.Wallet.createRandom();
const eoaAddress = wallet.address;
const eoaPrivateKey = wallet.privateKey;
const encryptionPublicKey = wallet.signingKey.compressedPublicKey;

console.log('EOA地址:', eoaAddress);
console.log('加密公钥:', encryptionPublicKey);

// ============================================
// 步骤2: 预计算Smart Account地址
// ============================================
const salt = Math.floor(Math.random() * 1000000);

const addressResp = await fetch('http://localhost:3000/api/erc4337/account/address', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ownerAddress: eoaAddress,
    guardians: [],
    threshold: 0,
    salt: salt
  })
});

const { data: { accountAddress } } = await addressResp.json();
console.log('Smart Account地址:', accountAddress);

// ============================================
// 步骤3: 注册用户
// ============================================
const registerResp = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eoa_address: eoaAddress,
    smart_account_address: accountAddress,
    phone_number: '13800138000',
    id_card_number: '110101199001011234',
    email: 'user@example.com',
    encryption_public_key: encryptionPublicKey
  })
});

const registerResult = await registerResp.json();
console.log('注册成功:', registerResult.data.username);

// ============================================
// 步骤4: 部署Smart Account到区块链
// ============================================
const deployResp = await fetch('http://localhost:3000/api/erc4337/account', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ownerAddress: eoaAddress,
    guardians: [],
    threshold: 0,
    salt: salt
  })
});

const deployResult = await deployResp.json();
console.log('部署交易:', deployResult.data.txHash);

// ============================================
// 步骤5: 用户登录
// ============================================
const loginTime = new Date().toISOString();
const message = `LOGIN_TIME:${loginTime}`;
const signature = await wallet.signMessage(message);

const loginResp = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eoa_address: eoaAddress,
    login_time: loginTime,
    signature: signature
  })
});

const { data: { token } } = await loginResp.json();
console.log('登录成功，Token:', token);

// 之后的所有请求都带上这个 token
```

### 12.2 医生创建并发送加密用药计划

```javascript
const crypto = require('crypto');

// ============================================
// 前置条件：医生和患者都已登录
// ============================================
const doctorToken = '医生的JWT Token';
const doctorPrivateKey = '医生的EOA私钥';
const patientSmartAccount = '患者的Smart Account地址';
const patientPublicKey = '患者的加密公钥';

// ============================================
// 步骤1: 搜索药物
// ============================================
const medicationsResp = await fetch(
  'http://localhost:3000/api/medication/medications/search?search=阿司匹林',
  {
    headers: { 'Authorization': `Bearer ${doctorToken}` }
  }
);
const { data: medications } = await medicationsResp.json();
console.log('找到药物:', medications.length);

// ============================================
// 步骤2: 准备用药计划数据
// ============================================
const planData = {
  plan_name: '高血压综合治疗方案',
  diagnosis: '原发性高血压（II级）',
  medications: [
    {
      medication_id: medications[0].medication_id,
      medication_code: medications[0].medication_code,
      medication_name: medications[0].medication_name,
      dosage: '100mg',
      frequency: '每日一次',
      instructions: '早餐后服用'
    }
  ],
  reminders: [
    {
      medication_code: medications[0].medication_code,
      medication_name: medications[0].medication_name,
      reminder_time: '08:00:00',
      reminder_days: 'everyday',
      reminder_message: '早餐后服用高血压药物'
    }
  ],
  notes: '请定期监测血压'
};

// ============================================
// 步骤3: 加密计划数据
// ============================================
// 派生共享密钥
const sharedSecret = deriveSharedSecret(doctorPrivateKey, patientPublicKey);

// 加密数据
const encryptedPlanData = encrypt(JSON.stringify(planData), sharedSecret);

// ============================================
// 步骤4: 创建用药计划
// ============================================
const createPlanResp = await fetch('http://localhost:3000/api/medication/plans', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${doctorToken}`
  },
  body: JSON.stringify({
    patient_address: patientSmartAccount,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 90*24*60*60*1000).toISOString(),
    encrypted_plan_data: encryptedPlanData
  })
});

const { plan_id } = await createPlanResp.json();
console.log('用药计划已创建:', plan_id);

// ============================================
// 步骤5: 通过 secure-exchange 通知患者
// ============================================
const timestamp = Date.now();
const nonce = crypto.randomBytes(16).toString('hex');
const dataHash = crypto.createHash('sha256').update(encryptedPlanData).digest('hex');

const signaturePayload = {
  recipient_address: patientSmartAccount.toLowerCase(),
  timestamp,
  nonce,
  data_hash: dataHash
};

const doctorWallet = new ethers.Wallet(doctorPrivateKey);
const signature = await doctorWallet.signMessage(JSON.stringify(signaturePayload));

const sendResp = await fetch('http://localhost:3000/api/secure-exchange/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${doctorToken}`
  },
  body: JSON.stringify({
    recipientAddress: patientSmartAccount,
    encryptedData: encryptedPlanData,
    signature,
    timestamp,
    nonce,
    dataType: 'medication_plan',
    metadata: {
      plan_id,
      plan_name: '【新用药计划】'
    }
  })
});

const { messageId } = await sendResp.json();
console.log('已通知患者，消息ID:', messageId);
```

### 12.3 患者接收并解密用药计划

```javascript
// ============================================
// 前置条件：患者已登录并建立WebSocket连接
// ============================================
const patientToken = '患者的JWT Token';
const patientPrivateKey = '患者的EOA私钥';
const doctorPublicKey = '医生的加密公钥';

// ============================================
// 方式1: 通过WebSocket实时接收（推荐）
// ============================================
const ws = new WebSocket(`ws://localhost:3000/ws/secure-exchange?token=${patientToken}`);

ws.onmessage = async (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'encrypted_message') {
    console.log('收到新的加密消息:', message.data);
    
    // 解密数据
    const sharedSecret = deriveSharedSecret(patientPrivateKey, doctorPublicKey);
    const decryptedText = decrypt(message.data.encryptedData, sharedSecret);
    const planData = JSON.parse(decryptedText);
    
    console.log('计划名称:', planData.plan_name);
    console.log('诊断:', planData.diagnosis);
    console.log('药物:', planData.medications);
    
    // 确认收到
    await fetch('http://localhost:3000/api/secure-exchange/acknowledge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        messageId: message.data.messageId,
        status: 'received',
        acknowledged: true,
        acknowledgment_note: '已收到服药计划，感谢医生！'
      })
    });
  }
};

// ============================================
// 方式2: 主动查询待处理消息
// ============================================
const pendingResp = await fetch(
  'http://localhost:3000/api/secure-exchange/pending?dataType=medication_plan',
  {
    headers: { 'Authorization': `Bearer ${patientToken}` }
  }
);

const { messages } = await pendingResp.json();

for (const msg of messages) {
  // 解密每条消息
  const sharedSecret = deriveSharedSecret(patientPrivateKey, doctorPublicKey);
  const decryptedText = decrypt(msg.encrypted_data, sharedSecret);
  const planData = JSON.parse(decryptedText);
  
  console.log('收到计划:', planData.plan_name);
  
  // 确认收到
  await fetch('http://localhost:3000/api/secure-exchange/acknowledge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      messageId: msg.message_id,
      status: 'received',
      acknowledged: true
    })
  });
}
```

### 12.4 通知流程

```javascript
// ============================================
// 建立通知服务WebSocket连接
// ============================================
const token = '用户的JWT Token';
const ws = new WebSocket(`ws://localhost:3000/ws/notification?token=${token}`);

ws.onopen = () => {
  console.log('通知服务连接成功');
  
  // 发送心跳
  setInterval(() => {
    ws.send(JSON.stringify({ type: 'ping' }));
  }, 30000);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'connected':
      console.log('欢迎:', data.data.message);
      break;
      
    case 'notification':
      // 显示新通知
      showNotification({
        title: data.data.title,
        body: data.data.body,
        type: data.data.type,
        priority: data.data.priority
      });
      
      // 可选：自动标记为已读
      ws.send(JSON.stringify({
        type: 'mark_read',
        notification_id: data.data.notification_id
      }));
      break;
      
    case 'pong':
      // 心跳响应
      break;
  }
};

// ============================================
// HTTP API方式管理通知
// ============================================

// 获取通知列表
const listResp = await fetch(
  'http://localhost:3000/api/notification/notifications?status=unread&limit=20',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const { data: notifications } = await listResp.json();

// 获取未读数量
const countResp = await fetch(
  'http://localhost:3000/api/notification/notifications/unread/count',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const { count } = await countResp.json();

// 标记单条已读
await fetch(
  `http://localhost:3000/api/notification/notifications/${notificationId}/read`,
  {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  }
);

// 标记全部已读
await fetch(
  'http://localhost:3000/api/notification/notifications/read-all',
  {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  }
);

// 删除通知
await fetch(
  `http://localhost:3000/api/notification/notifications/${notificationId}`,
  {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
```

### 12.5 关系管理流程

```javascript
// ============================================
// 老人创建邀请
// ============================================
const elderToken = '老人的JWT Token';

// 1. 查看访问组
const groupsResp = await fetch(
  `http://localhost:3000/api/relation/access-groups/stats?user_smart_account=${elderSmartAccount}`,
  {
    headers: { 'Authorization': `Bearer ${elderToken}` }
  }
);
const { data: accessGroups } = await groupsResp.json();

// 2. 为主治医生组创建邀请
const doctorGroup = accessGroups.find(g => g.group_type === 'PRIMARY_DOCTOR');

const inviteResp = await fetch('http://localhost:3000/api/relation/invitations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${elderToken}`
  },
  body: JSON.stringify({
    accessGroupId: doctorGroup.id
  })
});

const { token: invitationToken } = await inviteResp.json();
console.log('邀请令牌:', invitationToken);

// 3. 将邀请令牌发送给医生（通过二维码、短信等）

// ============================================
// 医生接受邀请（会自动发送通知）
// ============================================
const doctorToken = '医生的JWT Token';

const acceptResp = await fetch('http://localhost:3000/api/relation/relationships/accept', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${doctorToken}`
  },
  body: JSON.stringify({
    token: invitationToken
  })
});

const acceptResult = await acceptResp.json();
console.log('接受邀请成功:', acceptResult);

// 📨 此时系统会自动发送两条通知：
// 1. 通知老人：有新成员（医生）加入了您的访问组
// 2. 通知医生：您已成功加入访问组

// ============================================
// 医生查看自己的患者列表 🆕
// ============================================
const myPatientsResp = await fetch(
  'http://localhost:3000/api/relation/relationships/my',
  {
    headers: { 'Authorization': `Bearer ${doctorToken}` }
  }
);

const { data: myPatients, count } = await myPatientsResp.json();
console.log(`我有 ${count} 个患者`);

myPatients.forEach(relationship => {
  console.log(`患者: ${relationship.owner_address}`);
  console.log(`访问组: ${relationship.access_group_name}`);
  console.log(`状态: ${relationship.status}`);
  console.log(`权限: ${JSON.stringify(relationship.permissions)}`);
});

// ============================================
// 查看访问组成员（老人视角）
// ============================================
const membersResp = await fetch(
  `http://localhost:3000/api/relation/access-groups/${doctorGroup.id}/members`,
  {
    headers: { 'Authorization': `Bearer ${elderToken}` }
  }
);

const { members } = await membersResp.json();
console.log('访问组成员数:', members.length);

// ============================================
// 关系管理操作（会自动发送通知）
// ============================================
const relationshipId = members[0].id;

// 暂停关系（会通知医生）
await fetch(`http://localhost:3000/api/relation/relationships/${relationshipId}/suspend`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${elderToken}` }
});
// 📨 通知医生：您对"XXX"的访问权限已被暂停

// 恢复关系（会通知医生）
await fetch(`http://localhost:3000/api/relation/relationships/${relationshipId}/resume`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${elderToken}` }
});
// 📨 通知医生：您对"XXX"的访问权限已恢复

// 撤销关系（会通知医生）
await fetch(`http://localhost:3000/api/relation/relationships/${relationshipId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${elderToken}` }
});
// 📨 通知医生：您对"XXX"的访问权限已被撤销
```

### 12.6 账户迁移流程（含通知）🆕

```javascript
// ============================================
// 旧设备：创建迁移会话
// ============================================
const oldDeviceToken = '旧设备的JWT Token';
const userSmartAccount = '用户的Smart Account地址';

const migrationId = `mig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createResp = await fetch('http://localhost:3000/api/migration/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${oldDeviceToken}`
  },
  body: JSON.stringify({
    id: migrationId,
    oldDeviceId: 'device_old_001',
    userAddress: userSmartAccount  // 提供此参数以接收通知
  })
});

const { data: session } = await createResp.json();
console.log('迁移会话已创建');
console.log('确认码:', session.confirmCode);

// 📨 系统自动发送通知：
// 标题：账户迁移会话已创建
// 内容：您的确认码是: XXXXXX

// ============================================
// 新设备：验证确认码并完成迁移
// ============================================
// 用户在新设备上输入确认码
const userInputCode = '123456';

// 1. 验证确认码
const verifyResp = await fetch('http://localhost:3000/api/migration/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    migrationId: migrationId,
    confirmCode: userInputCode
  })
});

const { data: { valid } } = await verifyResp.json();

if (valid) {
  // 2. 完成迁移
  const confirmResp = await fetch('http://localhost:3000/api/migration/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      migrationId: migrationId,
      newDeviceId: 'device_new_002',
      userAddress: userSmartAccount  // 提供此参数以接收通知
    })
  });

  const confirmResult = await confirmResp.json();
  console.log('迁移成功:', confirmResult);

  // 📨 系统自动发送通知：
  // 标题：账户迁移成功
  // 内容：您的账户已成功迁移到新设备
}
```

---

## 附录

### A. 错误代码说明

| 错误代码 | HTTP状态码 | 说明 |
|---------|-----------|------|
| UNAUTHORIZED | 401 | 未授权，Token无效或已过期 |
| FORBIDDEN | 403 | 禁止访问，权限不足 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| DUPLICATE_ENTRY | 409 | 资源已存在（如重复注册） |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

### B. 通知类型说明

| 类型 | 说明 | 优先级 | 触发时机 |
|-----|------|--------|---------|
| **系统通知** |
| SYSTEM_NOTIFICATION | 系统通知 | normal | 系统发布重要消息 |
| **用药相关** |
| MEDICATION_REMINDER | 用药提醒 | high | 定时提醒服药 |
| NEW_MEDICATION_PLAN | 新用药计划 | normal | 医生创建用药计划 |
| MEDICATION_PLAN_UPDATED | 用药计划已更新 | normal | 医生更新用药计划 |
| **关系管理** 🆕 |
| relationship_invitation_accepted | 新成员加入 | normal | 有人接受了您的邀请 |
| relationship_joined_group | 加入成功 | normal | 成功加入访问组 |
| relationship_suspended | 关系已暂停 | high | 访问权限被暂停 |
| relationship_resumed | 关系已恢复 | normal | 访问权限被恢复 |
| relationship_revoked | 关系已撤销 | high | 访问权限被撤销 |
| invitation_created | 邀请已创建 | normal | 邀请链接生成成功 |
| **账户迁移** 🆕 |
| migration_session_created | 迁移会话已创建 | urgent | 创建迁移会话 |
| migration_completed | 账户迁移成功 | urgent | 迁移完成 |
| **社交恢复** |
| RECOVERY_REQUEST_RECEIVED | 收到恢复请求 | urgent | 守护者收到恢复请求 |
| **安全交换** |
| encrypted_message | 新的加密消息 | high | 收到加密数据 |

### C. 自动通知机制 🆕

系统会在以下操作时自动通过 MQ 发送通知：

**关系管理服务**:
1. ✅ **接受邀请** - 通知老人（新成员加入）和接受者（加入成功）
2. ✅ **暂停关系** - 通知被暂停的 viewer
3. ✅ **恢复关系** - 通知被恢复的 viewer
4. ✅ **撤销关系** - 通知被撤销的 viewer

**迁移服务**:
1. ✅ **创建迁移会话** - 发送包含确认码的通知
2. ✅ **完成迁移** - 通知迁移成功

**通知发送流程**:
```
操作触发 → 业务逻辑完成 → MQ Producer 发送消息 
→ Notification Service 接收 → WebSocket/Push 推送给用户
```

**通知优先级**:
- `urgent` (20): 紧急通知（账户迁移、安全相关）
- `high` (10): 高优先级（权限变更、重要消息）
- `normal` (5): 普通通知（一般信息）

### D. 常见问题

**Q: Token 有效期多久？**
A: JWT Token 默认有效期为 24 小时，建议在过期前刷新。

**Q: 加密公钥和 EOA 公钥是同一个吗？**
A: 是的，我们使用 EOA 的 secp256k1 压缩公钥作为 ECIES 加密公钥。

**Q: WebSocket 连接断开后如何重连？**
A: 实现指数退避重连机制，每次重连间隔时间翻倍（1s, 2s, 4s...），最大间隔 30 秒。

**Q: 如何处理加密数据解密失败？**
A: 检查是否使用了正确的密钥对，确认发送方公钥和接收方私钥匹配。

**Q: 哪些操作会触发通知？** 🆕
A: 所有关键操作都会触发通知，包括：关系管理（接受邀请、暂停/恢复/撤销关系）、账户迁移（创建会话、完成迁移）、用药计划（创建/更新）等。通知通过 WebSocket 实时推送，也可通过 HTTP API 查询。

**Q: 如何确保通知不丢失？**
A: 系统采用 MQ 持久化机制，即使 WebSocket 断开，通知也会保存在数据库中，用户重新连接后可通过 HTTP API 获取未读通知。

---

## 版本历史

- **v2.1** (2025-10-31): 新增"获取我的关系列表"接口，完善 MQ 自动通知机制说明
- **v2.0** (2025-10-31): 完整版本，包含所有服务接口和完整流程示例
- **v1.0** (2025-10-30): 初始版本

---

**文档维护**: API Gateway 团队  
**技术支持**: support@example.com  
**更新周期**: 每月更新


