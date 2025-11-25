# 前端开发快速指南

> **最常用的 API 接口速查表**  
> 基于 API Gateway v2.0

---

## 🚀 快速开始

### 基础配置

```javascript
const API_BASE = 'http://localhost:3000';
const WS_BASE = 'ws://localhost:3000';

// 全局请求头
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}` // 登录后获取
};
```

---

## 1️⃣ 认证相关

### 登录

```javascript
const { ethers } = require('ethers');

async function login(privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  const loginTime = new Date().toISOString();
  const message = `LOGIN_TIME:${loginTime}`;
  const signature = await wallet.signMessage(message);
  
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eoa_address: wallet.address,
      login_time: loginTime,
      signature
    })
  });
  
  const { data } = await response.json();
  return data.token; // 保存此 token 用于后续请求
}
```

---

## 2️⃣ 医药服务

### 搜索药物

```javascript
async function searchMedications(keyword, token) {
  const response = await fetch(
    `${API_BASE}/api/medication/medications/search?search=${keyword}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return await response.json();
}
```

### 创建加密用药计划

```javascript
const crypto = require('crypto');

// 工具函数
function deriveSharedSecret(myPrivateKey, theirPublicKey) {
  const wallet = new ethers.Wallet(myPrivateKey);
  const sharedPoint = wallet.signingKey.computeSharedSecret(theirPublicKey);
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

async function createMedicationPlan(doctorPrivateKey, patientPublicKey, patientAddress, planData, token) {
  // 1. 加密计划数据
  const sharedSecret = deriveSharedSecret(doctorPrivateKey, patientPublicKey);
  const encryptedData = encrypt(JSON.stringify(planData), sharedSecret);
  
  // 2. 创建计划
  const response = await fetch(`${API_BASE}/api/medication/plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      patient_address: patientAddress,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 90*24*60*60*1000).toISOString(),
      encrypted_plan_data: encryptedData
    })
  });
  
  return await response.json();
}

// 计划数据格式
const planData = {
  plan_name: '高血压治疗方案',
  diagnosis: '原发性高血压',
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
      reminder_message: '早餐后服用药物'
    }
  ],
  notes: '请定期监测血压'
};
```

### 查询并解密用药计划

```javascript
function decrypt(encryptedData, sharedSecret) {
  const iv = Buffer.from(encryptedData.slice(0, 24), 'hex');
  const authTag = Buffer.from(encryptedData.slice(24, 56), 'hex');
  const encrypted = encryptedData.slice(56);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', sharedSecret, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}

async function getPlanAndDecrypt(planId, patientPrivateKey, doctorPublicKey, token) {
  // 1. 获取加密计划
  const response = await fetch(
    `${API_BASE}/api/medication/plans/${planId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const { data: plan } = await response.json();
  
  // 2. 解密
  const sharedSecret = deriveSharedSecret(patientPrivateKey, doctorPublicKey);
  const planData = decrypt(plan.encrypted_plan_data, sharedSecret);
  
  return planData;
}
```

---

## 3️⃣ 安全交换服务

### 获取公钥

```javascript
async function getRecipientPublicKey(recipientAddress, token) {
  const response = await fetch(
    `${API_BASE}/api/secure-exchange/recipient-pubkey/${recipientAddress}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return await response.json();
}
```

### 发送加密消息

```javascript
async function sendEncryptedMessage(senderPrivateKey, recipientAddress, recipientPublicKey, data, token) {
  // 1. 加密数据
  const sharedSecret = deriveSharedSecret(senderPrivateKey, recipientPublicKey);
  const encryptedData = encrypt(JSON.stringify(data), sharedSecret);
  
  // 2. 生成签名
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const dataHash = crypto.createHash('sha256').update(encryptedData).digest('hex');
  
  const signaturePayload = {
    recipient_address: recipientAddress.toLowerCase(),
    timestamp,
    nonce,
    data_hash: dataHash
  };
  
  const wallet = new ethers.Wallet(senderPrivateKey);
  const signature = await wallet.signMessage(JSON.stringify(signaturePayload));
  
  // 3. 发送
  const response = await fetch(`${API_BASE}/api/secure-exchange/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      recipientAddress,
      encryptedData,
      signature,
      timestamp,
      nonce,
      dataType: 'medication_plan',
      metadata: {
        plan_name: '【新用药计划】'
      }
    })
  });
  
  return await response.json();
}
```

### 查询待处理消息

```javascript
async function getPendingMessages(token) {
  const response = await fetch(
    `${API_BASE}/api/secure-exchange/pending`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const { messages } = await response.json();
  return messages;
}
```

### 确认消息

```javascript
async function acknowledgeMessage(messageId, token) {
  const response = await fetch(`${API_BASE}/api/secure-exchange/acknowledge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      messageId,
      status: 'received',
      acknowledged: true,
      acknowledgment_note: '已收到，谢谢！'
    })
  });
  
  return await response.json();
}
```

---

## 4️⃣ 通知服务

### WebSocket 连接

```javascript
class NotificationService {
  constructor(token) {
    this.token = token;
    this.ws = null;
    this.handlers = {
      notification: [],
      connected: []
    };
  }
  
  connect() {
    this.ws = new WebSocket(`${WS_BASE}/ws/notification?token=${this.token}`);
    
    this.ws.onopen = () => {
      console.log('通知服务已连接');
      this.startHeartbeat();
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'notification') {
        this.handlers.notification.forEach(h => h(data.data));
      } else if (data.type === 'connected') {
        this.handlers.connected.forEach(h => h(data.data));
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket 已关闭，5秒后重连...');
      setTimeout(() => this.connect(), 5000);
    };
  }
  
  startHeartbeat() {
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }
  
  on(event, handler) {
    if (this.handlers[event]) {
      this.handlers[event].push(handler);
    }
  }
  
  markAsRead(notificationId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'mark_read',
        notification_id: notificationId
      }));
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// 使用示例
const notificationService = new NotificationService(token);
notificationService.connect();

notificationService.on('notification', (notification) => {
  console.log('新通知:', notification.title);
  // 显示通知UI
  showNotification(notification);
});
```

### HTTP API

```javascript
// 获取通知列表
async function getNotifications(status = 'unread', limit = 20, token) {
  const response = await fetch(
    `${API_BASE}/api/notification/notifications?status=${status}&limit=${limit}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return await response.json();
}

// 获取未读数量
async function getUnreadCount(token) {
  const response = await fetch(
    `${API_BASE}/api/notification/notifications/unread/count`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const { count } = await response.json();
  return count;
}

// 标记单条已读
async function markAsRead(notificationId, token) {
  await fetch(
    `${API_BASE}/api/notification/notifications/${notificationId}/read`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
}

// 标记全部已读
async function markAllAsRead(token) {
  await fetch(
    `${API_BASE}/api/notification/notifications/read-all`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
}

// 删除通知
async function deleteNotification(notificationId, token) {
  await fetch(
    `${API_BASE}/api/notification/notifications/${notificationId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
}
```

---

## 5️⃣ 关系管理

### 查看访问组

```javascript
async function getAccessGroups(smartAccount, token) {
  const response = await fetch(
    `${API_BASE}/api/relation/access-groups/stats?user_smart_account=${smartAccount}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return await response.json();
}
```

### 创建邀请

```javascript
async function createInvitation(accessGroupId, token) {
  const response = await fetch(`${API_BASE}/api/relation/invitations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ accessGroupId })
  });
  
  const { token: invitationToken } = await response.json();
  return invitationToken;
}
```

### 接受邀请

```javascript
async function acceptInvitation(invitationToken, token) {
  const response = await fetch(`${API_BASE}/api/relation/relationships/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ token: invitationToken })
  });
  
  return await response.json();
}
```

### 查看访问组成员

```javascript
async function getAccessGroupMembers(accessGroupId, token) {
  const response = await fetch(
    `${API_BASE}/api/relation/access-groups/${accessGroupId}/members`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const { members } = await response.json();
  return members;
}
```

### 关系操作

```javascript
// 暂停关系
async function suspendRelationship(relationshipId, token) {
  await fetch(
    `${API_BASE}/api/relation/relationships/${relationshipId}/suspend`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
}

// 恢复关系
async function resumeRelationship(relationshipId, token) {
  await fetch(
    `${API_BASE}/api/relation/relationships/${relationshipId}/resume`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
}

// 撤销关系
async function revokeRelationship(relationshipId, token) {
  await fetch(
    `${API_BASE}/api/relation/relationships/${relationshipId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
}
```

---

## 6️⃣ ZKP 证明服务

### 生成证明

```javascript
async function generateWeeklyProof(inputs, token) {
  // 1. 提交任务
  const response = await fetch(`${API_BASE}/api/zkp/prove/weekly-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ inputs })
  });
  
  const { jobId } = await response.json();
  
  // 2. 轮询查询状态
  let status = 'processing';
  let attempts = 0;
  const maxAttempts = 60;
  
  while (status === 'processing' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResp = await fetch(
      `${API_BASE}/api/zkp/proof-status/${jobId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const statusData = await statusResp.json();
    status = statusData.status;
    attempts++;
    
    if (status === 'completed') {
      return statusData.data;
    } else if (status === 'failed') {
      throw new Error(statusData.data.error);
    }
  }
  
  throw new Error('证明生成超时');
}

// 使用示例
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

const proof = await generateWeeklyProof(inputs, token);
console.log('证明生成成功:', proof);
```

---

## 7️⃣ 账户迁移

### 创建迁移会话

```javascript
async function createMigrationSession(oldDeviceId) {
  const migrationId = `mig_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const confirmCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6位数字
  
  const response = await fetch(`${API_BASE}/api/migration/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: migrationId,
      oldDeviceId,
      confirmCode,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000 // 5分钟后过期
    })
  });
  
  const { data } = await response.json();
  return {
    migrationId: data.migrationId,
    confirmCode: data.confirmCode
  };
}
```

### 验证确认码

```javascript
async function verifyConfirmCode(migrationId, confirmCode) {
  const response = await fetch(`${API_BASE}/api/migration/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ migrationId, confirmCode })
  });
  
  const { data } = await response.json();
  return data.valid;
}
```

### 完成迁移

```javascript
async function completeMigration(migrationId, newDeviceId) {
  const response = await fetch(`${API_BASE}/api/migration/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      migrationId,
      newDeviceId,
      status: 'completed',
      timestamp: Date.now()
    })
  });
  
  return await response.json();
}
```

---

## 8️⃣ 完整流程示例

### 医生创建并发送用药计划（完整流程）

```javascript
async function doctorSendMedicationPlan() {
  // 0. 前置条件
  const doctorToken = await login(doctorPrivateKey);
  const patientSmartAccount = '0x...';
  
  // 1. 获取患者公钥
  const { encryptionPublicKey: patientPublicKey } = await getRecipientPublicKey(
    patientSmartAccount,
    doctorToken
  );
  
  // 2. 搜索药物
  const { data: medications } = await searchMedications('阿司匹林', doctorToken);
  
  // 3. 准备计划数据
  const planData = {
    plan_name: '高血压治疗方案',
    diagnosis: '原发性高血压',
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
        reminder_message: '早餐后服用药物'
      }
    ],
    notes: '请定期监测血压'
  };
  
  // 4. 创建加密计划
  const { plan_id } = await createMedicationPlan(
    doctorPrivateKey,
    patientPublicKey,
    patientSmartAccount,
    planData,
    doctorToken
  );
  
  console.log('计划已创建:', plan_id);
  
  // 5. 通过 secure-exchange 通知患者
  await sendEncryptedMessage(
    doctorPrivateKey,
    patientSmartAccount,
    patientPublicKey,
    planData,
    doctorToken
  );
  
  console.log('已通知患者');
}
```

### 患者接收并处理用药计划（完整流程）

```javascript
async function patientReceiveMedicationPlan() {
  // 0. 前置条件
  const patientToken = await login(patientPrivateKey);
  
  // 1. 建立 WebSocket 连接接收实时通知
  const ws = new WebSocket(`${WS_BASE}/ws/secure-exchange?token=${patientToken}`);
  
  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    
    if (message.type === 'encrypted_message') {
      console.log('收到新的加密消息');
      
      // 2. 解密消息
      const sharedSecret = deriveSharedSecret(patientPrivateKey, doctorPublicKey);
      const decryptedText = decrypt(message.data.encryptedData, sharedSecret);
      const planData = JSON.parse(decryptedText);
      
      console.log('计划名称:', planData.plan_name);
      console.log('药物:', planData.medications);
      console.log('提醒:', planData.reminders);
      
      // 3. 显示给用户
      showMedicationPlanUI(planData);
      
      // 4. 确认收到
      await acknowledgeMessage(message.data.messageId, patientToken);
    }
  };
  
  // 或者主动查询待处理消息
  const messages = await getPendingMessages(patientToken);
  
  for (const msg of messages) {
    const sharedSecret = deriveSharedSecret(patientPrivateKey, doctorPublicKey);
    const decryptedText = decrypt(msg.encrypted_data, sharedSecret);
    const planData = JSON.parse(decryptedText);
    
    showMedicationPlanUI(planData);
    await acknowledgeMessage(msg.message_id, patientToken);
  }
}
```

---

## 💡 最佳实践

### 1. Token 管理

```javascript
class TokenManager {
  constructor() {
    this.token = localStorage.getItem('auth_token');
    this.expiresAt = localStorage.getItem('token_expires_at');
  }
  
  setToken(token, expiresIn = 24 * 60 * 60 * 1000) {
    this.token = token;
    this.expiresAt = Date.now() + expiresIn;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token_expires_at', this.expiresAt);
  }
  
  getToken() {
    if (Date.now() >= this.expiresAt) {
      this.clearToken();
      return null;
    }
    return this.token;
  }
  
  clearToken() {
    this.token = null;
    this.expiresAt = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token_expires_at');
  }
  
  isValid() {
    return this.token && Date.now() < this.expiresAt;
  }
}
```

### 2. 错误处理

```javascript
async function apiRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = await response.json();
        
        if (response.status === 401) {
          // Token 过期，重新登录
          throw new Error('UNAUTHORIZED');
        }
        
        throw new Error(error.message || '请求失败');
      }
      
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1 || error.message === 'UNAUTHORIZED') {
        throw error;
      }
      
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### 3. WebSocket 重连

```javascript
class ReconnectingWebSocket {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectInterval = 1000;
    this.maxReconnectInterval = 30000;
    this.reconnectAttempts = 0;
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('WebSocket 已连接');
      this.reconnectAttempts = 0;
      this.reconnectInterval = 1000;
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket 已关闭');
      this.reconnect();
    };
  }
  
  reconnect() {
    this.reconnectAttempts++;
    const timeout = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectInterval
    );
    
    console.log(`${timeout/1000}秒后重连...`);
    setTimeout(() => this.connect(), timeout);
  }
  
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }
  
  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
```

---

## 📞 技术支持

- **API 文档**: `/doc/api-gateway-complete-reference.md`
- **问题反馈**: GitHub Issues
- **技术支持**: support@example.com

---

**最后更新**: 2025-10-31

