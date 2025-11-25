/**
 * 医药服务端到端测试脚本 - 完全隐私保护版本
 * 
 * 🔒 隐私保护架构：
 * - 所有敏感信息（计划名称、诊断、药物、提醒）前端加密
 * - 后端只存储加密数据，无法读取明文
 * - 使用 ECDH (医生私钥 + 患者公钥) 派生共享密钥
 * - 只有患者本人可以用私钥解密查看完整内容
 * 
 * 🔐 ZKP打卡支持：
 * - 每个药物包含 medication_code（药物代码）
 * - medication_code 用于生成 medicationCommitment（ZKP电路输入）
 * - 患者以太坊账户用于生成 userIdCommitment（ZKP电路输入）
 * - 支持隐私保护的用药依从性证明
 * 
 * 测试完整流程：
 * 0. 加载测试用户数据
 * 0.5. 用户登录获取 Token
 * 1. 医生搜索药物信息（无需加密，药物库公开）
 * 2. 医生创建加密用药计划
 *    - 前端用患者公钥加密所有敏感信息（包含medication_code）
 *    - 后端存储加密数据
 *    - 通过 secure-exchange 通知患者
 * 3. 老人接收并解密查看计划
 *    - 使用私钥 + 医生公钥 ECDH 解密
 * 4. 医生查询自己创建的计划列表
 *    - 可查看列表，但内容已加密
 *    - 验证患者也可以解密查看
 * 5. 医生更新用药计划
 *    - 重新加密所有敏感信息
 *    - 患者验证可解密更新后的内容
 * 
 * 运行方式：
 * - 使用已有用户：node tests/e2e-medication-flow.test.js
 * - 需要先运行：node tests/setup-test-users.js（首次）
 */

const axios = require('axios');
const crypto = require('crypto');
const { ethers } = require('ethers');
const { loadTestData, validateTestData, testDataExists } = require('./utils/test-data-manager');

// 配置
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// 测试数据存储
const testData = {
  elder: {
    smartAccount: null,
    token: null,
    eoaAddress: null,
    eoaPrivateKey: null,
    publicKey: null,  // 加密公钥
    username: null
  },
  doctor: {
    smartAccount: null,
    token: null,
    eoaAddress: null,
    eoaPrivateKey: null,
    publicKey: null,  // 加密公钥
    username: null
  },
  family: {
    smartAccount: null,
    token: null,
    eoaAddress: null,
    eoaPrivateKey: null,
    publicKey: null,  // 加密公钥
    username: null
  },
  // 测试中创建的数据
  medications: [],
  medicationPlans: [],
  reminders: [],
  encryptedMessages: []
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(step, message) {
  log(`✅ [步骤 ${step}] ${message}`, 'green');
}

function logError(step, message) {
  log(`❌ [步骤 ${step}] ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logStep(step, title) {
  log(`\n${'='.repeat(70)}`, 'blue');
  log(`📍 步骤 ${step}: ${title}`, 'bright');
  log('='.repeat(70), 'blue');
}

function logSection(title) {
  log(`\n${'━'.repeat(70)}`, 'magenta');
  log(`🔷 ${title}`, 'bright');
  log('━'.repeat(70), 'magenta');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 加密解密辅助函数 ====================

/**
 * 派生共享密钥（ECDH）
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
 * 从私钥派生对称密钥（用于自己加密自己的数据）
 * @param {string} privateKey - 私钥（hex格式）
 * @returns {Buffer} 对称密钥
 */
function deriveSymmetricKey(privateKey) {
  // 从私钥 hash 派生对称密钥（只有拥有私钥的人才能解密）
  return crypto.createHash('sha256').update(Buffer.from(privateKey.slice(2), 'hex')).digest();
}

/**
 * 加密数据（AES-256-GCM）- 标准 ECDH 模式
 * @param {string} plaintext - 要加密的明文
 * @param {Buffer} sharedSecret - 共享密钥
 * @returns {string} 加密数据（hex格式：iv24字符 + authTag32字符 + 加密数据）
 */
function encrypt(plaintext, sharedSecret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sharedSecret, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

/**
 * 解密数据（AES-256-GCM）- 支持 ECIES 格式（包含临时公钥）
 * @param {string} encryptedData - 加密数据（hex格式）
 * @param {string} receiverPrivateKey - 接收者私钥
 * @param {string} senderPublicKey - 发送者公钥（如果已知，用于ECDH）或null（用于ECIES）
 * @returns {string} 明文
 */
function decrypt(encryptedData, receiverPrivateKey, senderPublicKey = null) {
  // 检查数据格式
  if (encryptedData.length > 122 && !senderPublicKey) {
    // ECIES 格式：临时公钥(66) + iv(24) + authTag(32) + encrypted
    // 总共至少 122 字符
    const ephemeralPubKey = '0x' + encryptedData.slice(0, 66);
    const iv = Buffer.from(encryptedData.slice(66, 90), 'hex');
    const authTag = Buffer.from(encryptedData.slice(90, 122), 'hex');
    const encrypted = encryptedData.slice(122);
    
    console.log(`🔓 ECIES 解密 - 提取临时公钥: ${ephemeralPubKey.substring(0, 20)}...`);
    
    // 使用接收者私钥 + 临时公钥派生共享密钥
    const sharedSecret = deriveSharedSecret(receiverPrivateKey, ephemeralPubKey);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', sharedSecret, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } else if (senderPublicKey) {
    // ECDH 格式：iv(24) + authTag(32) + encrypted
    const sharedSecret = deriveSharedSecret(receiverPrivateKey, senderPublicKey);
    
    const iv = Buffer.from(encryptedData.slice(0, 24), 'hex');
    const authTag = Buffer.from(encryptedData.slice(24, 56), 'hex');
    const encrypted = encryptedData.slice(56);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', sharedSecret, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } else {
    throw new Error('无法解密：数据格式不正确或缺少必要参数');
  }
}

// HTTP 请求封装
async function apiRequest(method, path, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${path}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      if (method === 'GET') {
        config.params = data;
      } else {
        config.data = data;
      }
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// ============================================
// 步骤 0: 加载测试用户数据
// ============================================
async function step0_LoadTestUsers() {
  logStep(0, '加载测试用户数据');

  try {
    // 检查测试数据文件是否存在
    if (!testDataExists()) {
      throw new Error('未找到测试数据文件！请先运行: node tests/setup-test-users.js');
    }

    // 加载并验证数据
    const data = loadTestData();
    validateTestData(data);

    // 填充测试数据（不加载token，将在步骤0.5中重新登录获取）
    testData.elder.smartAccount = data.elder.smartAccount;
    testData.elder.eoaAddress = data.elder.eoaAddress;
    testData.elder.username = data.elder.username;
    testData.elder.eoaPrivateKey = data.elder.eoaPrivateKey;
    testData.elder.publicKey = data.elder.encryptionPublicKey; // 加载公钥

    testData.doctor.smartAccount = data.doctor.smartAccount;
    testData.doctor.eoaAddress = data.doctor.eoaAddress;
    testData.doctor.username = data.doctor.username;
    testData.doctor.eoaPrivateKey = data.doctor.eoaPrivateKey;
    testData.doctor.publicKey = data.doctor.encryptionPublicKey; // 加载公钥

    testData.family.smartAccount = data.family.smartAccount;
    testData.family.eoaAddress = data.family.eoaAddress;
    testData.family.username = data.family.username;
    testData.family.eoaPrivateKey = data.family.eoaPrivateKey;
    testData.family.publicKey = data.family.encryptionPublicKey; // 加载公钥

    logSuccess(0, `老人账户: ${testData.elder.username} (${testData.elder.smartAccount})`);
    logSuccess(0, `医生账户: ${testData.doctor.username} (${testData.doctor.smartAccount})`);
    logSuccess(0, `家属账户: ${testData.family.username} (${testData.family.smartAccount})`);
    logInfo(`数据创建时间: ${data.metadata?.createdAt || '未知'}`);
    logInfo(`Token 将在下一步骤中通过登录获取`);

    return true;
  } catch (error) {
    logError(0, `加载测试用户失败: ${error.message}`);
    return false;
  }
}

// ============================================
// 步骤 0.5: 用户登录获取Token
// ============================================
async function step0_5_LoginUsers() {
  logStep('0.5', '用户登录获取Token');

  const ethers = require('ethers');

  try {
    for (const role of ['elder', 'doctor', 'family']) {
      const user = testData[role];
      logInfo(`${user.username}正在登录...`);

      // 创建钱包实例
      const wallet = new ethers.Wallet(user.eoaPrivateKey);

      // 准备登录数据
      const loginTime = new Date().toISOString();
      const message = `LOGIN_TIME:${loginTime}`;
      const signature = await wallet.signMessage(message);

      // 调用登录API
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        eoa_address: user.eoaAddress,
        login_time: loginTime,
        signature: signature
      });

      if (response.data && response.data.data && response.data.data.token) {
        user.token = response.data.data.token;
        logSuccess('0.5', `${user.username} 登录成功`);
      } else {
        throw new Error(`登录响应格式错误: ${JSON.stringify(response.data)}`);
      }

      await sleep(300);
    }

    return true;
  } catch (error) {
    logError('0.5', `用户登录失败: ${error.message}`);
    if (error.response) {
      logError('0.5', `响应数据: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// ============================================
// 步骤 1: 医生搜索药物信息
// ============================================
async function step1_SearchMedications() {
  logStep(1, '医生搜索药物信息');

  try {
    // 1.1 搜索药物（按名称）
    logInfo('1.1 按名称搜索药物...');
    let result = await apiRequest(
      'GET',
      '/api/medication/medications/search',
      { search: '阿司匹林' },
      testData.doctor.token
    );

    if (!result.success) {
      throw new Error(`搜索失败: ${result.error}`);
    }

    const medications1 = result.data.data || [];
    logSuccess('1.1', `找到 ${medications1.length} 个匹配的药物`);
    if (medications1.length > 0) {
      testData.medications.push(...medications1.slice(0, 2));
      logInfo(`  - ${medications1[0].medication_name}`);
    }

    // 1.2 按类别搜索
    logInfo('1.2 按类别搜索药物...');
    result = await apiRequest(
      'GET',
      '/api/medication/medications/search',
      { category: '心血管系统用药' },
      testData.doctor.token
    );

    if (result.success) {
      const medications2 = result.data.data || [];
      logSuccess('1.2', `找到 ${medications2.length} 个心血管类药物`);
      if (medications2.length > 0 && testData.medications.length < 3) {
        testData.medications.push(...medications2.slice(0, 3 - testData.medications.length));
      }
    }

    // 1.3 获取药物详情
    if (testData.medications.length > 0) {
      const medicationId = testData.medications[0].medication_id;
      logInfo(`1.3 获取药物详情: ${medicationId}...`);
      
      result = await apiRequest(
        'GET',
        `/api/medication/medications/${medicationId}`,
        null,
        testData.doctor.token
      );

      if (result.success) {
        const medication = result.data.data || result.data;
        logSuccess('1.3', `获取药物详情成功: ${medication.medication_name || '未知'}`);
        logInfo(`  用法用量: ${medication.dosage_form || medication.common_dosage || '未知'}`);
        if (medication.precautions) {
          logInfo(`  注意事项: ${medication.precautions.substring(0, 50)}...`);
        }
      }
    }

    logSuccess(1, `药物搜索测试完成，共找到 ${testData.medications.length} 个可用药物`);
    return true;
  } catch (error) {
    logError(1, `药物搜索失败: ${error.message}`);
    return false;
  }
}

// ============================================
// 步骤 2: 医生为老人创建加密的用药计划（完全隐私保护）
// ============================================
async function step2_CreateMedicationPlan() {
  logStep(2, '医生为老人创建加密的用药计划（完全隐私保护 - 零明文）');

  try {
    // ===== 第一步：构建完整的计划数据（所有敏感信息） =====
    // 🔒 注意：计划名称、诊断也是敏感信息，需要加密！
    const fullPlanData = {
      plan_name: '高血压综合治疗方案',           // ⭐ 敏感：不应暴露病情
      diagnosis: '原发性高血压（II级）',          // ⭐ 敏感：诊断信息
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      
      // 药物明细（敏感数据）
      medications: testData.medications.slice(0, 2).map((med, index) => ({
        medication_id: med.medication_id,
        medication_code: med.medication_code || med.drug_code || `MED${med.medication_id}`,  // ⭐ ZKP打卡用的药物代码
        medication_name: med.medication_name,
        generic_name: med.generic_name,
        dosage: index === 0 ? '100mg' : '5mg',
        frequency: index === 0 ? '每日一次' : '每日两次',
        duration: '90天',
        instructions: index === 0 ? '早餐后服用' : '早晚餐后各服用一次',
        side_effects: med.side_effects || '请咨询医生',
        precautions: med.precautions || '请遵医嘱'
      })),
      
      // 服药提醒设置（敏感数据）
      reminders: [
        {
          medication_code: testData.medications[0]?.medication_code || testData.medications[0]?.drug_code || 'MED1',  // ⭐ ZKP打卡关联
          medication_name: testData.medications[0]?.medication_name || '药物A',
          reminder_time: '08:00:00',
          reminder_days: 'everyday',
          reminder_message: '早餐后服用高血压药物'
        },
        {
          medication_code: testData.medications[1]?.medication_code || testData.medications[1]?.drug_code || 'MED2',  // ⭐ ZKP打卡关联
          medication_name: testData.medications[1]?.medication_name || '药物B',
          reminder_time: '08:00:00',
          reminder_days: 'everyday',
          reminder_message: '早餐后服用药物'
        },
        {
          medication_code: testData.medications[1]?.medication_code || testData.medications[1]?.drug_code || 'MED2',  // ⭐ ZKP打卡关联
          medication_name: testData.medications[1]?.medication_name || '药物B',
          reminder_time: '18:00:00',
          reminder_days: 'everyday',
          reminder_message: '晚餐后服用药物'
        }
      ],
      
      // 医嘱备注（敏感数据）
      notes: '请定期监测血压，每周至少测量3次。如出现头晕、胸闷等症状，请立即就医。'
    };

    logInfo('🔐 前端加密计划数据（隐私保护模式）...');
    logInfo(`  患者: ${testData.elder.username}`);
    logInfo(`  计划名称: ${fullPlanData.plan_name}`);
    logInfo(`  诊断: ${fullPlanData.diagnosis}`);
    logInfo(`  药物数量: ${fullPlanData.medications.length}`);
    if (fullPlanData.medications.length > 0) {
      logInfo(`  首个药物代码(ZKP): ${fullPlanData.medications[0].medication_code}`);
    }
    logInfo(`  提醒数量: ${fullPlanData.reminders.length}`);
    logInfo(`  🔒 以上信息（包含medication_code）将全部加密，后端不可读取`);

    // ===== 第二步：用患者公钥加密（患者可解密查看） =====
    const sharedSecretPatient = deriveSharedSecret(testData.doctor.eoaPrivateKey, testData.elder.publicKey);
    const encryptedForPatient = encrypt(JSON.stringify(fullPlanData), sharedSecretPatient);
    
    logInfo(`  患者端加密数据长度: ${encryptedForPatient.length} 字符`);

    // ===== 第三步：发送到 medication-service（只存加密数据，无明文） =====
    const requestData = {
      patient_address: testData.elder.smartAccount,
      start_date: new Date().toISOString(),                              // 非敏感：时间范围
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),  // 非敏感
      encrypted_plan_data: encryptedForPatient  // ⭐ 全部敏感信息都在这里
      // ⚠️ 注意：不再发送 plan_name 和 diagnosis 明文字段！
    };

    logInfo('📤 发送加密数据到 medication-service...');
    const result = await apiRequest(
      'POST',
      '/api/medication/plans',
      requestData,
      testData.doctor.token
    );

    if (!result.success) {
      throw new Error(`创建计划失败: ${result.error}`);
    }

    // 保存创建的计划
    const planId = result.data.plan_id;
    testData.medicationPlans.push(result.data);
    
    logSuccess(2, '✅ 用药计划创建成功！');
    logInfo(`  计划ID: ${planId}`);
    logInfo(`  🔒 后端存储: 完全加密（后端不可读取）`);
    logInfo(`  🔑 只有患者可以解密查看完整内容`);
    logInfo(`  📋 计划哈希: ${result.data.plan_hash?.substring(0, 16)}...`);
    logInfo(`  🔐 密钥哈希: ${result.data.encryption_key_hash?.substring(0, 16)}...`);
    
    // ===== 第四步：通过 secure-exchange 通知老人（可选） =====
    logInfo('\n📬 通过 secure-exchange 通知老人有新计划...');
    
    try {
      // 准备签名数据（与 secure-exchange 的验证逻辑匹配）
      const timestamp = Date.now();
      const nonce = crypto.randomBytes(16).toString('hex');
      const dataHash = crypto.createHash('sha256').update(encryptedForPatient).digest('hex');
      
      // 构造签名 payload
      const signaturePayload = {
        recipient_address: testData.elder.smartAccount.toLowerCase(),
        timestamp: timestamp,
        nonce: nonce,
        data_hash: dataHash
      };
      
      // 使用 EOA 私钥签名
      const wallet = new ethers.Wallet(testData.doctor.eoaPrivateKey);
      const signature = await wallet.signMessage(JSON.stringify(signaturePayload));
      
      const exchangeResult = await apiRequest(
        'POST',
        '/api/secure-exchange/send',
        {
          recipientAddress: testData.elder.smartAccount,
          encryptedData: encryptedForPatient,  // ⭐ 患者公钥加密的数据
          signature: signature,
          timestamp: timestamp,
          nonce: nonce,
          dataType: 'medication_plan',
          metadata: {
            plan_id: planId,
            plan_name: '【新用药计划】',  // ⭐ 不暴露具体病情
            doctor_address: testData.doctor.smartAccount
          }
        },
        testData.doctor.token
      );

      if (exchangeResult.success) {
        const messageId = exchangeResult.data?.message_id || exchangeResult.message_id;
        if (messageId) {
          testData.encryptedMessages.push(messageId);
        }
        logSuccess(2, '✅ 已通过 secure-exchange 通知患者');
        logInfo(`  消息ID: ${messageId || '未返回'}`);
      } else {
        logInfo(`  ⚠️ secure-exchange 通知失败: ${exchangeResult.error}`);
      }
    } catch (exchangeError) {
      logInfo(`  ⚠️ secure-exchange 通知异常: ${exchangeError.message}`);
    }

    await sleep(1000); // 等待异步处理完成

    return true;
  } catch (error) {
    logError(2, `创建用药计划失败: ${error.message}`);
    return false;
  }
}

// ============================================
// 步骤 3: 老人接收加密的计划消息并解密查看
// ============================================
async function step3_ElderReceiveAndDecryptPlan() {
  logStep(3, '老人接收加密的计划消息并解密查看');

  try {
    logInfo('查询老人的加密消息...');
    
    // 使用 /pending 端点（与 e2e-secure-exchange-flow.test.js 一致）
    const result = await apiRequest(
      'GET',
      '/api/secure-exchange/pending',
      { 
        dataType: 'medication_plan',
        limit: 10
      },
      testData.elder.token
    );

    if (!result.success) {
      throw new Error(`获取消息失败: ${result.error}`);
    }

    const messages = result.data.messages || result.data.data || [];
    logSuccess(3, `老人收到 ${messages.length} 条加密消息`);
    
    if (messages.length > 0) {
      const message = messages[0]; // 取最新的一条
      logInfo(`  消息ID: ${message.message_id}`);
      logInfo(`  发送者: ${message.sender_address}`);
      logInfo(`  数据类型: ${message.data_type}`);
      logInfo(`  加密数据长度: ${message.encrypted_data?.length || 0} 字符`);
      logInfo(`  已读状态: ${message.read_at ? '已读' : '未读'}`);
      
      // 验证加密数据存在
      if (!message.encrypted_data) {
        throw new Error('加密数据不存在！');
      }
      
      // 🔑 老人使用自己的私钥和医生的公钥解密消息（ECDH）
      logInfo('\n🔓 老人开始解密用药计划...');
      logInfo(`  使用老人私钥 + 医生公钥 ECDH 生成共享密钥`);
      logInfo(`  医生公钥: ${testData.doctor.publicKey.substring(0, 20)}...`);
      try {
        // 确保 encrypted_data 是字符串
        const encryptedDataStr = typeof message.encrypted_data === 'string' 
          ? message.encrypted_data 
          : message.encrypted_data.toString('hex');
        
        // 使用 ECDH 模式解密
        // 医生加密时用：医生私钥 + 老人公钥 → 共享密钥
        // 老人解密时用：老人私钥 + 医生公钥 → 同样的共享密钥
        const decryptedText = decrypt(
          encryptedDataStr,
          testData.elder.eoaPrivateKey,
          testData.doctor.publicKey  // 提供医生公钥，使用 ECDH 模式
        );
        const decryptedPlanData = JSON.parse(decryptedText);
        
        logSuccess(3, '✅ 解密成功！查看用药计划内容（敏感数据）：');
        
        if (decryptedPlanData.medications && decryptedPlanData.medications.length > 0) {
          logInfo(`  药物数量: ${decryptedPlanData.medications.length}`);
          decryptedPlanData.medications.forEach((med, index) => {
            logInfo(`    ${index + 1}. ${med.medication_name}: ${med.dosage}, ${med.frequency}`);
            logInfo(`       药物代码(ZKP): ${med.medication_code || '未设置'}`);
            logInfo(`       说明: ${med.instructions}`);
          });
        }
        
        if (decryptedPlanData.reminders && decryptedPlanData.reminders.length > 0) {
          logInfo(`  提醒数量: ${decryptedPlanData.reminders.length}`);
          decryptedPlanData.reminders.forEach((reminder, index) => {
            logInfo(`    ${index + 1}. ${reminder.medication_name}: ${reminder.reminder_time} (${reminder.reminder_days})`);
            logInfo(`       提醒: ${reminder.reminder_message}`);
          });
        }
        
        if (decryptedPlanData.notes) {
          logInfo(`  医嘱备注: ${decryptedPlanData.notes}`);
        }
        
        // 保存解密后的数据供后续验证
        testData.decryptedPlanData = decryptedPlanData;
        
      } catch (decryptError) {
        throw new Error(`解密失败: ${decryptError.message}`);
      }
      
    } else {
      logError(3, '未收到任何加密消息！可能是异步发送延迟');
    }

    return true;
  } catch (error) {
    logError(3, `接收和解密消息失败: ${error.message}`);
    return false;
  }
}

// ============================================
// 步骤 4: 医生查询自己创建的计划列表
// ============================================
async function step4_DoctorQueryPlans() {
  logStep(4, '医生查询自己创建的计划列表');

  try {
    // 等待数据库写入完成
    await sleep(500);
    logInfo('查询医生创建的所有用药计划...');
    
    const result = await apiRequest(
      'GET',
      `/api/medication/plans/doctor/${testData.doctor.smartAccount}`,
      { page: 1, limit: 10 },
      testData.doctor.token
    );

    if (!result.success) {
      throw new Error(`查询失败: ${result.error}`);
    }

    logSuccess(4, `医生共创建 ${result.data.total || 0} 个用药计划`);
    
    if (result.data.plans && result.data.plans.length > 0) {
      const createdPlanId = testData.medicationPlans[0]?.plan_id;
      
      // 🔍 在所有计划中查找本次测试创建的计划
      const createdPlan = result.data.plans.find(plan => plan.plan_id === createdPlanId);
      
      if (createdPlan) {
        logInfo(`\n📋 本次测试创建的计划 (ID: ${createdPlan.plan_id.substring(0, 8)}...):`);
        logInfo(`  - 患者: ${createdPlan.patient_address}`);
        logInfo(`  - 状态: ${createdPlan.status}`);
        logInfo(`  - 开始日期: ${new Date(createdPlan.start_date).toLocaleDateString('zh-CN')}`);
        logInfo(`  - 结束日期: ${createdPlan.end_date ? new Date(createdPlan.end_date).toLocaleDateString('zh-CN') : '长期'}`);
        logInfo(`  - 创建时间: ${new Date(createdPlan.created_at).toLocaleString('zh-CN')}`);
        logInfo(`  - 🔒 敏感信息: 已加密（计划名称、诊断等）`);
        
        // 🔓 患者可以解密查看完整计划（使用 ECDH）
        if (createdPlan.encrypted_plan_data) {
          try {
            logInfo(`\n  🔓 尝试用患者私钥解密查看计划详情...`);
            // 确保 encrypted_plan_data 是字符串
            const encryptedDataStr = typeof createdPlan.encrypted_plan_data === 'string' 
              ? createdPlan.encrypted_plan_data 
              : (Buffer.isBuffer(createdPlan.encrypted_plan_data) 
                  ? createdPlan.encrypted_plan_data.toString('hex') 
                  : JSON.stringify(createdPlan.encrypted_plan_data));
            
            // 使用 ECDH 解密（患者私钥 + 医生公钥）
            const decryptedText = decrypt(
              encryptedDataStr,
              testData.elder.eoaPrivateKey,
              testData.doctor.publicKey
            );
            const decryptedData = JSON.parse(decryptedText);
            
            logInfo(`  ✅ 解密成功！查看加密的敏感信息：`);
            logInfo(`  - 计划名称: ${decryptedData.plan_name || '未设置'}`);
            logInfo(`  - 诊断: ${decryptedData.diagnosis || '未设置'}`);
            logInfo(`  - 药物数量: ${decryptedData.medications?.length || 0}`);
            logInfo(`  - 提醒数量: ${decryptedData.reminders?.length || 0}`);
            if (decryptedData.medications && decryptedData.medications.length > 0) {
              logInfo(`  - 首个药物: ${decryptedData.medications[0].medication_name} - ${decryptedData.medications[0].dosage}`);
              logInfo(`    药物代码(ZKP): ${decryptedData.medications[0].medication_code || '未设置'}`);
            }
            if (decryptedData.reminders && decryptedData.reminders.length > 0) {
              logInfo(`  - 首个提醒: ${decryptedData.reminders[0].medication_name} - ${decryptedData.reminders[0].reminder_time}`);
            }
          } catch (err) {
            logInfo(`  ⚠️ 解密失败: ${err.message}`);
          }
        }
      } else {
        logInfo(`\n⚠️ 未找到本次测试创建的计划 (ID: ${createdPlanId})`);
      }
      
      // 显示数据库中其他计划的基本信息（用于了解数据状态）
      const otherPlans = result.data.plans.filter(plan => plan.plan_id !== createdPlanId);
      if (otherPlans.length > 0) {
        logInfo(`\n📚 数据库中的其他计划 (共${otherPlans.length}个，均为旧数据):`);
        otherPlans.slice(0, 3).forEach((plan, index) => {
          const patientShort = plan.patient_address.substring(0, 10) + '...';
          const dateStr = new Date(plan.created_at).toLocaleString('zh-CN');
          logInfo(`  ${index + 1}. 患者: ${patientShort} - ${dateStr} (ID: ${plan.plan_id.substring(0, 8)}...) [已加密]`);
        });
        if (otherPlans.length > 3) {
          logInfo(`  ... 还有 ${otherPlans.length - 3} 个计划`);
        }
      }
    }

    return true;
  } catch (error) {
    logError(4, `查询医生计划失败: ${error.message}`);
    return false;
  }
}

// ============================================
// 步骤 5: 医生更新用药计划（完全隐私保护）
// ============================================
async function step5_UpdateMedicationPlan() {
  logStep(5, '医生更新用药计划（重新加密所有敏感信息）');

  try {
    const planId = testData.medicationPlans[0]?.plan_id;
    if (!planId) {
      throw new Error('未找到已创建的计划ID');
    }

    logInfo(`📝 更新计划 ID: ${planId.substring(0, 8)}...`);
    
    // ===== 第一步：构建更新后的完整计划数据（包含所有敏感信息） =====
    logInfo('🔐 步骤1: 构建更新后的计划数据（包含敏感信息）...');
    
    const updatedPlanData = {
      plan_name: '高血压综合治疗方案（已调整）',      // ⭐ 敏感信息
      diagnosis: '原发性高血压（II级）- 血压控制良好',  // ⭐ 敏感信息
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      
      medications: [
        {
          medication_id: testData.medications[0]?.medication_id || 'unknown',
          medication_code: testData.medications[0]?.medication_code || testData.medications[0]?.drug_code || 'CV004',  // ⭐ ZKP打卡用的药物代码
          medication_name: '阿司匹林肠溶片',
          dosage: '50mg',  // 调整剂量
          frequency: '每日一次',
          timing: '早餐后',
          duration: '90天',
          instructions: '早餐后服用（剂量已调整）',
          special_instructions: '注意观察有无出血倾向'
        }
      ],
      reminders: [
        {
          medication_code: testData.medications[0]?.medication_code || testData.medications[0]?.drug_code || 'CV004',  // ⭐ ZKP打卡关联
          medication_name: '阿司匹林肠溶片',
          reminder_time: '08:00:00',
          reminder_days: 'everyday',
          reminder_message: '早餐后服用调整后的药物'
        },
        {
          medication_code: testData.medications[0]?.medication_code || testData.medications[0]?.drug_code || 'CV004',  // ⭐ ZKP打卡关联
          medication_name: '阿司匹林肠溶片',
          reminder_time: '20:00:00',
          reminder_days: 'everyday',
          reminder_message: '晚间血压监测提醒'
        }
      ],
      notes: '已根据最新检查结果调整用药方案。请定期监测血压。如有不适请及时联系医生。'
    };

    logInfo(`  计划名称: ${updatedPlanData.plan_name}`);
    logInfo(`  诊断: ${updatedPlanData.diagnosis}`);
    logInfo(`  药物数量: ${updatedPlanData.medications.length}`);
    logInfo(`  提醒数量: ${updatedPlanData.reminders.length}`);

    // ===== 第二步：用患者公钥加密（患者可解密） =====
    logInfo('\n🔐 步骤2: 用患者公钥重新加密所有数据...');
    const sharedSecretPatient = deriveSharedSecret(testData.doctor.eoaPrivateKey, testData.elder.publicKey);
    const encryptedPlanData = encrypt(JSON.stringify(updatedPlanData), sharedSecretPatient);

    logInfo(`  加密后数据长度: ${encryptedPlanData.length} 字符`);
    logInfo(`  🔒 所有敏感信息已加密，后端不可读取`);

    // ===== 第三步：发送加密数据更新 =====
    logInfo('\n📤 步骤3: 发送加密数据到后端...');
    const encryptedUpdateResult = await apiRequest(
      'PUT',
      `/api/medication/plans/${planId}`,
      { encrypted_plan_data: encryptedPlanData },
      testData.doctor.token
    );

    if (!encryptedUpdateResult.success) {
      throw new Error(`更新加密数据失败: ${encryptedUpdateResult.error}`);
    }

    logInfo('  ✅ 加密数据更新成功');

    // ===== 第四步：验证更新 - 患者解密查看更新后的计划 =====
    logInfo('\n🔓 步骤4: 验证更新 - 患者解密查看更新后的计划...');
    const queryResult = await apiRequest(
      'GET',
      `/api/medication/plans/${planId}`,
      null,
      testData.elder.token  // 使用患者token查询
    );

    if (!queryResult.success) {
      throw new Error(`查询更新后的计划失败: ${queryResult.error}`);
    }

    const plan = queryResult.data.data;
    
    // 检查加密数据是否存在
    if (!plan.encrypted_plan_data) {
      throw new Error(`查询结果中没有加密数据字段`);
    }
    
    // 患者解密验证（使用 ECDH）
    const encryptedDataStr = typeof plan.encrypted_plan_data === 'string' 
      ? plan.encrypted_plan_data 
      : (Buffer.isBuffer(plan.encrypted_plan_data) 
          ? plan.encrypted_plan_data.toString('hex') 
          : JSON.stringify(plan.encrypted_plan_data));

    const decryptedText = decrypt(
      encryptedDataStr,
      testData.elder.eoaPrivateKey,
      testData.doctor.publicKey
    );
    const decryptedData = JSON.parse(decryptedText);

    logInfo('  ✅ 患者成功解密！更新后的计划内容:');
    logInfo(`     计划名称: ${decryptedData.plan_name || '未设置'}`);
    logInfo(`     诊断: ${decryptedData.diagnosis || '未设置'}`);
    logInfo(`     药物数量: ${decryptedData.medications?.length || 0}`);
    logInfo(`     提醒数量: ${decryptedData.reminders?.length || 0}`);
    if (decryptedData.medications && decryptedData.medications.length > 0) {
      logInfo(`     首个药物: ${decryptedData.medications[0].medication_name} - ${decryptedData.medications[0].dosage}`);
      logInfo(`     药物代码(ZKP): ${decryptedData.medications[0].medication_code || '未设置'}`);
    }
    if (decryptedData.notes) {
      logInfo(`     医嘱备注: ${decryptedData.notes.substring(0, 50)}...`);
    }

    logSuccess(5, '✅ 用药计划更新成功（完全隐私保护）');
    return true;
  } catch (error) {
    logError(5, `更新用药计划失败: ${error.message}`);
    return false;
  }
}

// ============================================
// 测试总结
// ============================================
function printTestSummary(results, startTime) {
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  log('\n' + '═'.repeat(70), 'blue');
  log('📊 测试结果总结', 'bright');
  log('═'.repeat(70), 'blue');

  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  log(`\n总测试步骤: ${totalTests}`, 'cyan');
  log(`通过步骤: ${passedTests}`, passedTests === totalTests ? 'green' : 'yellow');
  log(`失败步骤: ${totalTests - passedTests}`, totalTests - passedTests === 0 ? 'green' : 'red');
  log(`成功率: ${successRate}%`, successRate === '100.0' ? 'green' : 'yellow');
  log(`总耗时: ${duration} 秒`, 'cyan');

  log('\n详细结果:', 'bright');
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${icon} 步骤 ${index}: ${result.step}`, color);
  });

  log('\n测试数据统计:', 'bright');
  log(`  创建的用药计划: ${testData.medicationPlans.length}`, 'cyan');
  log(`  搜索的药物: ${testData.medications.length}`, 'cyan');
  log(`  加密消息: ${testData.encryptedMessages.length}`, 'cyan');

  if (passedTests === totalTests) {
    log('\n' + '🎉'.repeat(35), 'green');
    log('🎉 所有测试通过！医药服务功能验证成功！', 'green');
    log('🎉'.repeat(35), 'green');
  } else {
    log('\n⚠️  部分测试失败，请检查日志', 'yellow');
  }

  log('\n' + '═'.repeat(70), 'blue');
}

// ============================================
// 主测试流程
// ============================================
async function runTests() {
  const startTime = Date.now();
  const results = [];

  log('╔═══════════════════════════════════════════════════════════════════╗', 'blue');
  log('║       🏥 医药服务端到端测试 - 完整流程验证                        ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════════════╝', 'blue');

  logInfo(`测试开始时间: ${new Date().toLocaleString('zh-CN')}`);
  logInfo(`API地址: ${BASE_URL}`);

  try {
    // 步骤 0: 加载测试用户
    let success = await step0_LoadTestUsers();
    results.push({ step: '加载测试用户数据', success });
    if (!success) {
      throw new Error('测试用户加载失败，无法继续测试');
    }

    // 步骤 0.5: 用户登录获取Token
    success = await step0_5_LoginUsers();
    results.push({ step: '用户登录获取Token', success });
    if (!success) {
      throw new Error('用户登录失败，无法继续测试');
    }

    logSection('第一部分：药物信息管理测试');

    // 步骤 1: 搜索药物信息
    success = await step1_SearchMedications();
    results.push({ step: '医生搜索药物信息', success });

    logSection('第二部分：用药计划管理测试（创建、查询、更新）');

    // 步骤 2: 创建用药计划
    success = await step2_CreateMedicationPlan();
    results.push({ step: '医生创建加密用药计划', success });

    // 步骤 3: 老人接收加密消息
    success = await step3_ElderReceiveAndDecryptPlan();
    results.push({ step: '老人接收加密计划并解密查看', success });

    // 步骤 4: 医生查询计划
    success = await step4_DoctorQueryPlans();
    results.push({ step: '医生查询自己创建的计划', success });

    // 步骤 5: 医生更新用药计划
    success = await step5_UpdateMedicationPlan();
    results.push({ step: '医生更新用药计划', success });

    // 打印测试总结
    printTestSummary(results, startTime);

  } catch (error) {
    log(`\n❌ 测试过程中发生致命错误: ${error.message}`, 'red');
    console.error(error);
    
    printTestSummary(results, startTime);
    process.exit(1);
  }
}

// ============================================
// 启动测试
// ============================================
if (require.main === module) {
  runTests().then(() => {
    logInfo('\n测试脚本执行完成');
    process.exit(0);
  }).catch(error => {
    logError('Main', `未捕获的错误: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testData
};

