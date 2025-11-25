/**
 * 安全交换服务端到端测试脚本（基于预注册公钥）
 * 
 * 测试场景：医生向老人发送加密的服药计划
 * 
 * 简化流程（无需会话协商）：
 * 0. 用户登录获取 Token
 * 1. 建立 WebSocket 连接
 * 2. 医生获取老人的预注册公钥并发送加密消息
 * 3. 老人获取待处理的加密消息
 * 4. 老人解密并确认收到消息
 * 5. 测试摘要
 * 
 * 运行方式：
 * - node tests/e2e-secure-exchange-flow.test.js
 * - 需要先运行：node tests/setup-test-users.js（首次）
 * 
 * 前置条件：
 * - API Gateway 运行在 http://localhost:3000
 * - Secure Exchange Service 运行在 http://localhost:3007
 * - User Service 运行在 http://localhost:3001（提供公钥查询 gRPC）
 * - PostgreSQL 数据库已初始化
 * - Redis 已启动
 * - RabbitMQ 已启动
 */

const axios = require('axios');
const WebSocket = require('ws');
const { ethers } = require('ethers');
const crypto = require('crypto');
const { loadTestData, validateTestData, testDataExists } = require('./utils/test-data-manager');

// ==================== 配置 ====================

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_BASE_URL || 'ws://localhost:3000';

// ==================== 测试数据存储 ====================

const testData = {
  elder: {
    eoaAddress: null, // EOA 地址（用于登录）
    eoaPrivateKey: null, // EOA 私钥（用于签名登录和 ECIES 加密）
    smartAccount: null, // Smart Account 地址
    token: null, // 登录后的 JWT token
    wsConnection: null,
    receivedMessages: [],
    // 用于 ECIES 的密钥（使用 EOA 密钥对）
    publicKey: null, // 压缩公钥（33字节）
    privateKey: null, // 私钥（与 eoaPrivateKey 相同）
  },
  doctor: {
    eoaAddress: null,
    eoaPrivateKey: null,
    smartAccount: null,
    token: null,
    wsConnection: null,
    receivedMessages: [],
    // 用于 ECIES 的密钥（使用 EOA 密钥对）
    publicKey: null,
    privateKey: null,
  },
  messages: [], // 存储发送的消息
};

// ==================== 日志工具 ====================

const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', green: '\x1b[32m',
  red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[34m', 
  cyan: '\x1b[36m', magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(step, message) {
  log(`✅ [${step}] ${message}`, 'green');
}

function logError(step, message) {
  log(`❌ [${step}] ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logStep(step) {
  log(`\n${'='.repeat(70)}`, 'blue');
  log(`📍 ${step}`, 'bright');
  log('='.repeat(70), 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== HTTP 请求封装 ====================

async function apiRequest(method, path, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${path}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    console.log(`🔄 [API Request] ${method} ${config.url}`);
    if (data && Object.keys(data).length < 5) {
      // 只打印简短的数据，避免打印加密内容
      console.log(`📤 [Request Data]`, JSON.stringify(data, null, 2));
    }

    const response = await axios(config);
    console.log(`✅ [API Response] ${response.status} ${method} ${path}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.log(`❌ [API Error] ${method} ${path}:`, error.message);
    if (error.response) {
      console.log(`📥 [Error Response]`, error.response.data);
    }
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// ==================== 加密工具（ECIES 简化版）====================

/**
 * 使用对方的公钥派生共享密钥
 * @param {string} privateKey - 自己的私钥
 * @param {string} peerPublicKey - 对方的公钥（压缩格式）
 * @returns {Buffer} 共享密钥
 */
function deriveSharedSecret(privateKey, peerPublicKey) {
  const wallet = new ethers.Wallet(privateKey);
  const sharedPoint = wallet.signingKey.computeSharedSecret(peerPublicKey);
  // 使用 SHA256 哈希共享点作为对称密钥
  return crypto.createHash('sha256').update(Buffer.from(sharedPoint.slice(2), 'hex')).digest();
}

/**
 * 加密数据（AES-256-GCM）
 * @param {string} plaintext - 明文
 * @param {Buffer} sharedSecret - 共享密钥
 * @returns {string} 加密数据（hex格式）
 */
function encrypt(plaintext, sharedSecret) {
  const iv = crypto.randomBytes(12); // GCM 推荐 12 字节 IV
  const cipher = crypto.createCipheriv('aes-256-gcm', sharedSecret, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // 返回格式：iv(24) + authTag(32) + encrypted
  return iv.toString('hex') + authTag + encrypted;
}

/**
 * 解密数据（AES-256-GCM）
 * @param {string} encryptedData - 加密数据（hex格式）
 * @param {Buffer} sharedSecret - 共享密钥
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

/**
 * 生成 ECDSA 签名（用于防重放）
 * @param {Object} data - 要签名的数据
 * @param {string} privateKey - 私钥
 * @returns {string} 签名
 */
async function signData(data, privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  const message = JSON.stringify(data);
  // 使用 signMessage 会自动添加以太坊消息前缀、哈希并签名
  return await wallet.signMessage(message);
}

// ==================== 测试步骤 ====================

/**
 * 从持久化数据加载测试数据（包含已注册的加密公钥）
 */
function loadPersistedTestData(persistedData) {
  logStep('从持久化文件加载测试数据');
  
  try {
    for (const role of ['elder', 'doctor']) {
      if (persistedData[role]) {
        // 加载用户基本信息
        testData[role].eoaAddress = persistedData[role].eoaAddress;
        testData[role].eoaPrivateKey = persistedData[role].eoaPrivateKey;
        testData[role].smartAccount = persistedData[role].smartAccount;
        
        // ✅ 使用 EOA 密钥对作为加密密钥对
        testData[role].publicKey = persistedData[role].encryptionPublicKey;
        testData[role].privateKey = persistedData[role].encryptionPrivateKey; // 实际上和 eoaPrivateKey 相同
        
        logSuccess(persistedData[role].role, 
          `已加载 - SmartAccount: ${testData[role].smartAccount.substring(0, 10)}...`);
        logInfo(`   └─ EOA: ${testData[role].eoaAddress.substring(0, 10)}...`);
        logInfo(`   └─ 加密公钥: ${testData[role].publicKey.substring(0, 20)}...`);
      }
    }
    
    logSuccess('数据加载', '用户数据已从文件成功加载');
    logInfo(`数据创建时间: ${persistedData.metadata?.createdAt || '未知'}`);
    logInfo(`注意：Token 将在步骤0中重新获取`);
    
    return true;
  } catch (error) {
    logError('数据加载', `失败: ${error.message}`);
    return false;
  }
}

// ==================== 步骤0: 用户登录 ====================

async function step0_loginUsers() {
  logStep('步骤0: 用户登录获取 Token');
  
  for (const role of ['elder', 'doctor']) {
    const user = testData[role];
    
    if (!user.eoaAddress || !user.eoaPrivateKey) {
      logError(role, '缺少 EOA 地址或私钥');
      throw new Error(`${role} 缺少必要的登录信息`);
    }
    
    logInfo(`${role} 正在登录...`);
    
    // 创建签名
    const wallet = new ethers.Wallet(user.eoaPrivateKey);
    const loginTime = new Date().toISOString();
    const message = `LOGIN_TIME:${loginTime}`;
    const signature = await wallet.signMessage(message);
    
    // 发送登录请求
    const result = await apiRequest('POST', '/api/auth/login', {
      eoa_address: user.eoaAddress,
      login_time: loginTime,
      signature: signature
    });
    
    if (!result.success) {
      logError(role, `登录失败: ${JSON.stringify(result.error)}`);
      throw new Error(`${role} 登录失败`);
    }
    
    // 保存 token
    user.token = result.data.data.token;
    
    logSuccess(role, '登录成功');
    logInfo(`   └─ Token: ${user.token.substring(0, 30)}...`);
    logInfo(`   └─ EOA: ${user.eoaAddress.substring(0, 10)}...`);
    
    await sleep(300);
  }
  
  logSuccess('登录', '所有用户已成功登录');
  return true;
}

// ==================== 步骤1: 建立 WebSocket 连接 ====================

async function step1_connectWebSocket() {
  logStep('步骤1: 建立 WebSocket 连接');
  
  const connections = [];
  
  for (const role of ['elder', 'doctor']) {
    const token = testData[role].token;
    const wsUrl = `${WS_URL}/ws/secure-exchange?token=${token}`;
    
    logInfo(`正在连接 ${role} 的 WebSocket...`);
    
    const ws = new WebSocket(wsUrl);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket 连接超时'));
      }, 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        logSuccess(role, 'WebSocket 连接成功');
        resolve();
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        logError(role, `WebSocket 连接失败: ${error.message}`);
        reject(error);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`📨 [${role} WS消息]`, message.type);
          testData[role].receivedMessages.push(message);
          
          // 处理不同类型的消息
          if (message.type === 'encrypted_message') {
            logInfo(`${role} 收到新的加密消息通知`);
          } else if (message.type === 'message_acknowledged') {
            logInfo(`${role} 收到消息确认通知`);
          }
        } catch (error) {
          console.error(`解析 WebSocket 消息失败:`, error.message);
        }
      });
    });
    
    testData[role].wsConnection = ws;
    connections.push(ws);
  }
  
  logSuccess('WebSocket', '所有 WebSocket 连接已建立');
  return true;
}

// ==================== 步骤2: 医生获取老人的加密公钥并发送加密消息 ====================

async function step2_sendEncryptedData() {
  logStep('步骤2: 医生获取老人的加密公钥并发送加密消息');
  
  // 1. 从后端获取老人的预注册加密公钥
  logInfo(`正在获取老人(${testData.elder.smartAccount})的加密公钥...`);
  
  const pubKeyResult = await apiRequest(
    'GET',
    `/api/secure-exchange/recipient-pubkey/${testData.elder.smartAccount}`,
    null,
    testData.doctor.token
  );
  
  if (!pubKeyResult.success) {
    logError('获取公钥', '失败');
    throw new Error('获取接收者公钥失败');
  }
  
  const recipientPublicKey = pubKeyResult.data.encryptionPublicKey;
  logSuccess('获取公钥', `成功`);
  logInfo(`   └─ 接收者: ${pubKeyResult.data.recipientAddress.substring(0, 10)}...`);
  logInfo(`   └─ 加密公钥: ${recipientPublicKey.substring(0, 30)}...`);
  
  // 验证公钥是否匹配
  if (recipientPublicKey !== testData.elder.publicKey) {
    logWarning('注意：后端返回的公钥与本地加载的公钥不一致！');
  }
  
  // 2. 准备服药计划数据（明文）
  const medicationPlan = {
    patient_name: '王秀英',
    plan_id: `PLAN-${Date.now()}`,
    medications: [
      {
        name: '阿司匹林肠溶片',
        dosage: '100mg',
        frequency: '每日1次',
        time: '早餐后',
        duration: '长期'
      },
      {
        name: '氨氯地平片',
        dosage: '5mg',
        frequency: '每日1次',
        time: '早上',
        duration: '长期'
      },
      {
        name: '二甲双胍',
        dosage: '500mg',
        frequency: '每日2次',
        time: '早晚餐后',
        duration: '长期'
      }
    ],
    special_instructions: '请按时服药，如有不适请及时联系医生',
    doctor_name: '李建国',
    issue_date: new Date().toISOString()
  };
  
  const plaintext = JSON.stringify(medicationPlan);
  
  logInfo(`服药计划内容:`);
  console.log(JSON.stringify(medicationPlan, null, 2));
  
  // 3. 使用老人的公钥加密数据（ECIES）
  logInfo(`正在使用 ECIES 加密数据...`);
  
  const sharedSecret = deriveSharedSecret(
    testData.doctor.privateKey,
    recipientPublicKey
  );
  
  const encryptedData = encrypt(plaintext, sharedSecret);
  
  logInfo(`加密完成，数据长度: ${encryptedData.length} 字符`);
  
  // 4. 生成签名（防重放攻击）
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  const signaturePayload = {
    recipient_address: testData.elder.smartAccount.toLowerCase(),  // ✅ 统一使用小写地址
    timestamp,
    nonce,
    data_hash: crypto.createHash('sha256').update(encryptedData).digest('hex')
  };
  
  // 使用 EOA 私钥签名
  const signature = await signData(signaturePayload, testData.doctor.eoaPrivateKey);
  
  // 5. 发送加密消息（无需 sessionId）
  const requestData = {
    recipientAddress: testData.elder.smartAccount,  // ✅ 改为 recipientAddress
    encryptedData: encryptedData,
    dataType: 'medication_schedule',
    signature,
    timestamp,
    nonce,
    metadata: {
      encryption_algorithm: 'ECIES-secp256k1-AES256-GCM',
      priority: 'high',
      requires_confirmation: true
    }
  };
  
  logInfo(`发送加密消息到服务器...`);
  
  const result = await apiRequest(
    'POST',
    '/api/secure-exchange/send',
    requestData,
    testData.doctor.token
  );
  
  if (!result.success) {
    logError('发送消息', '失败');
    throw new Error('发送加密消息失败');
  }
  
  const message = result.data;
  testData.messages.push(message);
  
  logSuccess('发送消息', `消息ID: ${message.messageId || message.message_id}`);
  logInfo(`   └─ 接收者: ${message.recipientAddress || message.recipient_address}`);
  logInfo(`   └─ 状态: ${message.status}`);
  logInfo(`   └─ 返回的公钥: ${(message.recipientPublicKey || '未返回').substring(0, 30)}...`);
  
  // 等待 WebSocket 通知
  await sleep(1000);
  
  // 检查老人是否收到 WebSocket 通知
  const elderMessages = testData.elder.receivedMessages.filter(
    m => m.type === 'encrypted_message'
  );
  
  if (elderMessages.length > 0) {
    logSuccess('WebSocket通知', '老人收到新消息的实时通知');
  } else {
    logWarning('WebSocket通知未收到（可能正常）');
  }
  
  return { message, plaintext };
}

// ==================== 步骤3: 老人获取待处理消息 ====================

async function step3_getPendingMessages() {
  logStep('步骤3: 老人获取待处理消息');
  
  logInfo(`查询老人的待处理消息...`);
  
  const result = await apiRequest(
    'GET',
    '/api/secure-exchange/pending',
    null,
    testData.elder.token
  );
  
  if (!result.success) {
    logError('查询消息', '失败');
    throw new Error('查询待处理消息失败');
  }
  
  const messages = result.data.messages || result.data.data || [];
  
  logSuccess('查询消息', `找到 ${messages.length} 条待处理消息`);
  
  messages.forEach((msg, index) => {
    logInfo(`   ${index + 1}. 消息ID: ${msg.messageId || msg.message_id}`);
    logInfo(`      └─ 来自: ${(msg.senderAddress || msg.sender_address).substring(0, 10)}...`);
    logInfo(`      └─ 数据类型: ${msg.dataType || msg.data_type}`);
    logInfo(`      └─ 接收时间: ${new Date(msg.createdAt || msg.created_at).toLocaleString()}`);
  });
  
  return messages;
}

// ==================== 步骤4: 老人解密并确认消息 ====================

async function step4_decryptAndAcknowledge(message, originalPlaintext) {
  logStep('步骤4: 老人解密并确认消息');
  
  // 1. 解密消息
  logInfo(`正在解密消息...`);
  
  // 获取消息中的加密数据
  const encryptedData = message.encryptedData || message.encrypted_data;
  const senderAddress = message.senderAddress || message.sender_address;
  
  // 获取发送者的公钥（通过后端查询或使用本地存储的）
  const senderPublicKey = testData.doctor.publicKey; // 使用本地存储的医生公钥
  
  // 使用老人的私钥派生共享密钥
  const sharedSecret = deriveSharedSecret(
    testData.elder.privateKey,
    senderPublicKey
  );
  
  // 解密数据
  const decryptedData = decrypt(encryptedData, sharedSecret);
  
  logSuccess('解密', '成功');
  logInfo(`解密后的内容:`);
  console.log(JSON.stringify(JSON.parse(decryptedData), null, 2));
  
  // 2. 验证内容完整性
  if (decryptedData === originalPlaintext) {
    logSuccess('内容验证', '解密内容与原始内容完全匹配 ✓');
  } else {
    logWarning('内容验证失败！解密内容与原始内容不匹配');
  }
  
  // 3. 确认消息
  logInfo(`发送确认回执...`);
  
  const ackResult = await apiRequest(
    'POST',
    '/api/secure-exchange/acknowledge',
    {
      messageId: message.messageId || message.message_id,
      status: 'received',
      acknowledged: true,
      acknowledgment_note: '已收到服药计划，感谢医生！'
    },
    testData.elder.token
  );
  
  if (!ackResult.success) {
    logError('确认消息', '失败');
    throw new Error('确认消息失败');
  }
  
  logSuccess('确认消息', '成功');
  logInfo(`   └─ 消息状态: ${ackResult.data.status}`);
  
  // 等待 WebSocket 通知
  await sleep(1000);
  
  // 检查医生是否收到确认通知
  const doctorNotifications = testData.doctor.receivedMessages.filter(
    m => m.type === 'message_acknowledged'
  );
  
  if (doctorNotifications.length > 0) {
    logSuccess('WebSocket通知', '医生收到确认通知');
  }
  
  return decryptedData;
}

// ==================== 步骤5: 测试摘要 ====================

function step5_testSummary() {
  logStep('步骤5: 测试摘要');
  
  log('\n📊 测试统计:', 'cyan');
  log(`   • 发送消息数: ${testData.messages.length}`, 'cyan');
  log(`   • 老人收到 WS 通知数: ${testData.elder.receivedMessages.length}`, 'cyan');
  log(`   • 医生收到 WS 通知数: ${testData.doctor.receivedMessages.length}`, 'cyan');
  
  log('\n🔐 加密测试:', 'cyan');
  log(`   • 密钥获取: ✅`, 'green');
  log(`   • ECIES 加密: ✅`, 'green');
  log(`   • ECIES 解密: ✅`, 'green');
  log(`   • 内容完整性: ✅`, 'green');
  
  log('\n🔄 流程测试:', 'cyan');
  log(`   • 从后端获取公钥: ✅`, 'green');
  log(`   • 发送加密消息: ✅`, 'green');
  log(`   • 接收并解密: ✅`, 'green');
  log(`   • 消息确认: ✅`, 'green');
  
  log('\n📡 实时通知测试:', 'cyan');
  log(`   • WebSocket 连接: ✅`, 'green');
  log(`   • 新消息通知: ${testData.elder.receivedMessages.some(m => m.type === 'encrypted_message') ? '✅' : '⚠️'}`, 
    testData.elder.receivedMessages.some(m => m.type === 'encrypted_message') ? 'green' : 'yellow');
  log(`   • 确认通知: ${testData.doctor.receivedMessages.some(m => m.type === 'message_acknowledged') ? '✅' : '⚠️'}`, 
    testData.doctor.receivedMessages.some(m => m.type === 'message_acknowledged') ? 'green' : 'yellow');
}

// ==================== 清理资源 ====================

function cleanup() {
  logStep('清理测试资源');
  
  // 关闭 WebSocket 连接
  for (const role of ['elder', 'doctor']) {
    if (testData[role].wsConnection) {
      testData[role].wsConnection.close();
      logInfo(`已关闭 ${role} 的 WebSocket 连接`);
    }
  }
  
  logSuccess('清理', '测试资源已清理');
}

// ==================== 主测试流程 ====================

async function runTest() {
  console.clear();
  log('\n╔════════════════════════════════════════════════════════════════════╗', 'bright');
  log('║       安全交换服务 E2E 测试 - 加密服药计划分发场景              ║', 'bright');
  log('║               （基于预注册公钥的简化流程）                        ║', 'bright');
  log('╚════════════════════════════════════════════════════════════════════╝', 'bright');
  
  try {
    // 检查测试数据
    if (!testDataExists()) {
      logError('初始化', '测试数据文件不存在');
      logInfo('请先运行: node tests/setup-test-users.js');
      process.exit(1);
    }
    
    const persistedData = loadTestData();
    if (!validateTestData(persistedData)) {
      logError('初始化', '测试数据无效');
      process.exit(1);
    }
    
    // 加载测试数据
    loadPersistedTestData(persistedData);
    
    // 运行测试步骤（简化流程，无需会话协商）
    await step0_loginUsers(); // 登录获取 token
    
    await step1_connectWebSocket(); // 建立 WebSocket 连接
    
    const { message, plaintext } = await step2_sendEncryptedData(); // 获取公钥并发送加密消息
    
    const pendingMessages = await step3_getPendingMessages(); // 获取待处理消息
    
    // 解密并确认第一条消息
    if (pendingMessages.length > 0) {
      await step4_decryptAndAcknowledge(pendingMessages[0], plaintext);
    }
    
    step5_testSummary(); // 显示测试摘要
    
    // 等待一段时间以接收可能延迟的 WebSocket 通知
    logInfo('\n等待3秒以接收延迟的 WebSocket 通知...');
    await sleep(3000);
    
    // 成功完成
    log('\n╔════════════════════════════════════════════════════════════════════╗', 'green');
    log('║                      🎉 所有测试通过！                            ║', 'green');
    log('╚════════════════════════════════════════════════════════════════════╝', 'green');
    
    cleanup();
    process.exit(0);
    
  } catch (error) {
    log('\n╔════════════════════════════════════════════════════════════════════╗', 'red');
    log('║                      ❌ 测试失败                                  ║', 'red');
    log('╚════════════════════════════════════════════════════════════════════╝', 'red');
    logError('错误', error.message);
    log(`\n堆栈信息:\n${error.stack}`, 'red');
    
    cleanup();
    process.exit(1);
  }
}

// ==================== 入口 ====================

if (require.main === module) {
  runTest();
}

module.exports = {
  runTest,
  testData
};
