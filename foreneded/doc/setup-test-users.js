/**
 * 测试用户设置脚本
 * 创建并注册三个测试用户（老人、医生、家属），并将数据持久化到JSON文件
 * 
 * 运行方式：node tests/setup-test-users.js
 * 
 * 功能：
 * 1. 清理数据库
 * 2. 创建三个角色的EOA钱包
 * 3. 预计算Smart Account地址
 * 4. 注册用户到数据库
 * 5. 部署Smart Account到区块链
 * 6. 用户登录获取Token
 * 7. 初始化访问组
 * 8. 保存所有数据到test-data.json
 */

const axios = require('axios');
const ethers = require('ethers');
const { Client } = require('pg');
const { saveTestData, testDataExists } = require('./utils/test-data-manager');

// 配置
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// 数据库配置
const DB_CONFIG_USER = {
  user: 'root',
  host: 'localhost',
  database: 'bs_user_service_db',
  password: '123456',
  port: 5400
};

const DB_CONFIG_RELATION = {
  user: 'root',
  host: 'localhost',
  database: 'bs_relationship_db',
  password: '123456',
  port: 5400
};

const DB_CONFIG_MIGRATION = {
  user: 'root',
  host: 'localhost',
  database: 'migration_db',
  password: '123456',
  port: 5400
};

// 测试数据结构
const testData = {
  elder: { 
    role: '老人',
    username: '王秀英',
    id_card_number: '110101195803151234',
    phone_number: '13810010001',
    email: 'wang.xiuying@example.net',
    eoaAddress: null,
    eoaPrivateKey: null,
    smartAccount: null, 
    salt: null,
    token: null, 
    accessGroups: []
  },
  doctor: { 
    role: '医生',
    username: '李建国',
    id_card_number: '310101196207222345',
    phone_number: '13910010002',
    email: 'li.jianguo@clinic.com',
    eoaAddress: null,
    eoaPrivateKey: null,
    smartAccount: null,
    salt: null,
    token: null 
  },
  family: { 
    role: '家属',
    username: '张敏',
    id_card_number: '440111197011013456',
    phone_number: '13711110003',
    email: 'zhang1.min@example.net',
    eoaAddress: null,
    eoaPrivateKey: null,
    smartAccount: null,
    salt: null,
    token: null 
  },
  metadata: {
    createdAt: null,
    apiBaseUrl: BASE_URL
  }
};

// 颜色输出
const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', green: '\x1b[32m',
  red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m'
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
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`📍 ${step}`, 'bright');
  log('='.repeat(60), 'blue');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTP 请求封装
async function apiRequest(method, path, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${path}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    console.log(`🔄 [API Request] ${method} ${config.url}`);
    if (data) {
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

// 步骤0: 清理数据库
async function step0_cleanDatabase() {
  logStep('步骤0: 清理数据库数据');

  // 清理 user-service 数据库
  const userClient = new Client(DB_CONFIG_USER);
  try {
    await userClient.connect();
    logInfo('正在清理 user-service 数据库...');
    
    const userResult = await userClient.query('DELETE FROM users');
    logSuccess('users 表', `清除了 ${userResult.rowCount} 条记录`);
    
    const userRoleResult = await userClient.query('DELETE FROM user_roles');
    logSuccess('user roles 表', `清除了 ${userRoleResult.rowCount} 条记录`);
    await userClient.end();
  } catch (error) {
    logError('user-service 数据库', `清理失败: ${error.message}`);
    try { await userClient.end(); } catch (e) {}
    throw error;
  }

  await sleep(300);

  // 清理 relation-service 数据库
  const relationClient = new Client(DB_CONFIG_RELATION);
  try {
    await relationClient.connect();
    logInfo('正在清理 relation-service 数据库...');
    
    const relResult = await relationClient.query('DELETE FROM relationships');
    logSuccess('relationships 表', `清除了 ${relResult.rowCount} 条记录`);
    
    const invResult = await relationClient.query('DELETE FROM invitations');
    logSuccess('invitations 表', `清除了 ${invResult.rowCount} 条记录`);
    
    const groupResult = await relationClient.query('DELETE FROM access_groups');
    logSuccess('access_groups 表', `清除了 ${groupResult.rowCount} 条记录`);
    
    await relationClient.end();
  } catch (error) {
    logError('relation-service 数据库', `清理失败: ${error.message}`);
    try { await relationClient.end(); } catch (e) {}
    throw error;
  }

  await sleep(300);

  // 清理 migration-service 数据库
  const migrationClient = new Client(DB_CONFIG_MIGRATION);
  try {
    await migrationClient.connect();
    logInfo('正在清理 migration-service 数据库...');
    
    const migrationResult = await migrationClient.query('DELETE FROM migration_sessions');
    logSuccess('migration_sessions 表', `清除了 ${migrationResult.rowCount} 条记录`);
    
    await migrationClient.end();
  } catch (error) {
    logError('migration-service 数据库', `清理失败: ${error.message}`);
    try { await migrationClient.end(); } catch (e) {}
    logInfo('迁移数据库可能未初始化，跳过清理');
  }

  logSuccess('数据库清理', '所有测试数据已清除');
}

// 步骤1: 创建EOA钱包（EOA密钥对同时用于ECIES加密）
async function step1_createWallets() {
  logStep('步骤1: 创建三个角色的EOA钱包（EOA公钥同时用于ECIES加密）');

  for (const role of ['elder', 'doctor', 'family']) {
    const wallet = ethers.Wallet.createRandom();
    testData[role].eoaAddress = wallet.address;
    testData[role].eoaPrivateKey = wallet.privateKey;
    
    // ✅ 直接使用 EOA 钱包的压缩公钥作为加密公钥
    // secp256k1 曲线的密钥对既可用于签名也可用于 ECIES 加密
    testData[role].encryptionPublicKey = wallet.signingKey.compressedPublicKey;
    testData[role].encryptionPrivateKey = wallet.privateKey; // 和 EOA 私钥相同
    
    logSuccess(testData[role].role, `EOA: ${wallet.address}`);
    logInfo(`   └─ EOA 私钥: ${wallet.privateKey.substring(0, 20)}...`);
    logInfo(`   └─ 加密公钥: ${testData[role].encryptionPublicKey.substring(0, 30)}...`);
  }
}

// 步骤2: 预计算Smart Account地址
async function step2_calculateSmartAccountAddresses() {
  logStep('步骤2: 预计算Smart Account地址');

  for (const role of ['elder', 'doctor', 'family']) {
    const user = testData[role];
    const salt = Math.floor(Math.random() * 1000000);
    
    logInfo(`正在为${user.role}计算Smart Account地址...`);
    logInfo(`使用 salt 值: ${salt}`);
    logInfo(`Owner EOA: ${user.eoaAddress}`);

    const result = await apiRequest('POST', '/api/erc4337/account/address', {
      ownerAddress: user.eoaAddress,
      guardians: [],
      threshold: 0,
      salt: salt
    });

    if (result.success) {
      const erc4337Response = result.data;
      
      if (erc4337Response.success && erc4337Response.data && erc4337Response.data.accountAddress) {
        user.smartAccount = erc4337Response.data.accountAddress;
        user.salt = salt;
        logSuccess(user.role, `Smart Account地址: ${user.smartAccount}`);
      } else {
        logError(user.role, `响应数据结构错误: ${JSON.stringify(erc4337Response)}`);
        throw new Error(`计算Smart Account地址失败: 响应数据结构错误`);
      }
    } else {
      logError(user.role, `计算失败: ${JSON.stringify(result.error)}`);
      throw new Error(`计算Smart Account地址失败: ${role}`);
    }
    await sleep(300);
  }
}

// 步骤3: 注册用户到数据库（包含加密公钥）
async function step3_registerUsers() {
  logStep('步骤3: 注册用户账户（写入数据库，包含加密公钥）');

  for (const role of ['elder', 'doctor', 'family']) {
    const user = testData[role];
    logInfo(`正在注册${user.role}...`);

    const registerData = {
      eoa_address: user.eoaAddress,
      smart_account_address: user.smartAccount,
      phone_number: user.phone_number,
      id_card_number: user.id_card_number,
      email: user.email,
      encryption_public_key: user.encryptionPublicKey  // ✅ 添加加密公钥（EOA的压缩公钥）
    };

    logInfo(`注册数据: EOA=${registerData.eoa_address?.substring(0, 10)}..., SmartAccount=${registerData.smart_account_address?.substring(0, 10)}...`);
    logInfo(`   └─ 加密公钥: ${user.encryptionPublicKey?.substring(0, 30)}...`);

    const result = await apiRequest('POST', '/api/auth/register', registerData);

    if (result.success) {
      logSuccess(user.role, '注册成功（包含加密公钥）');
      if (result.data && result.data.data) {
        logInfo(`用户名: ${result.data.data.username}, 角色: ${result.data.data.role}`);
        if (result.data.data.encryption_public_key) {
          logInfo(`已保存加密公钥: ${result.data.data.encryption_public_key.substring(0, 20)}...`);
        }
      }
    } else if (result.status === 409) {
      logInfo(`${user.role}账户已存在，继续测试`);
    } else {
      logError(user.role, `注册失败: ${JSON.stringify(result.error)}`);
      throw new Error(`注册失败: ${role}`);
    }
    await sleep(300);
  }
}

// 步骤4: 部署Smart Account到区块链
async function step4_deploySmartAccounts() {
  logStep('步骤4: 部署Smart Account到区块链');

  for (const role of ['elder', 'doctor', 'family']) {
    const user = testData[role];
    
    logInfo(`正在为${user.role}部署Smart Account...`);

    const result = await apiRequest('POST', '/api/erc4337/account', {
      ownerAddress: user.eoaAddress,
      guardians: [],
      threshold: 0,
      salt: user.salt
    });

    if (result.success && result.data.success) {
      const accountData = result.data.data;
      logSuccess(user.role, `账户已部署: ${accountData.accountAddress}`);
      if (accountData.txHash) {
        logInfo(`部署交易: ${accountData.txHash}`);
      }
    } else {
      logError(user.role, `部署失败: ${JSON.stringify(result.error || result.data)}`);
      throw new Error(`部署Smart Account失败: ${role}`);
    }
    await sleep(1500);
  }
}

// 步骤5: 用户登录
async function step5_loginUsers() {
  logStep('步骤5: 用户登录获取Token');

  for (const role of ['elder', 'doctor', 'family']) {
    const user = testData[role];
    logInfo(`${user.role}正在登录...`);

    const wallet = new ethers.Wallet(user.eoaPrivateKey);
    const loginTime = new Date().toISOString();
    const message = `LOGIN_TIME:${loginTime}`;
    const signature = await wallet.signMessage(message);

    const result = await apiRequest('POST', '/api/auth/login', {
      eoa_address: user.eoaAddress,
      login_time: loginTime,
      signature: signature
    });

    if (result.success) {
      user.token = result.data.data.token;
      logSuccess(user.role, '登录成功');
      logInfo(`Token: ${user.token.substring(0, 50)}...`);
    } else {
      logError(user.role, `登录失败: ${JSON.stringify(result.error)}`);
      throw new Error(`登录失败: ${role}`);
    }
    await sleep(300);
  }
}

// 步骤6: 查看访问组（仅针对老人）
async function step6_checkAccessGroups() {
  logStep('步骤6: 老人查看访问组（应有5个预设群组）');

  const result = await apiRequest(
    'GET', 
    `/api/relation/access-groups/stats?user_smart_account=${testData.elder.smartAccount}`, 
    null, 
    testData.elder.token
  );

  if (result.success) {
    testData.elder.accessGroups = result.data.data || result.data || [];
    logSuccess('老人', `拥有 ${testData.elder.accessGroups.length} 个访问组`);
    testData.elder.accessGroups.forEach(g => {
      logInfo(`   - ${g.group_name} (ID: ${g.id}, 类型: ${g.group_type || '自定义'})`);
    });
  } else {
    logError('老人', `获取访问组失败: ${JSON.stringify(result.error)}`);
    throw new Error('获取访问组失败');
  }
}

// 主函数：执行所有设置步骤
async function setupTestUsers() {
  log('\n' + '='.repeat(70), 'bright');
  log('🚀 开始设置测试用户', 'bright');
  log('='.repeat(70) + '\n', 'bright');

  // 检查是否已存在测试数据
  if (testDataExists()) {
    log('⚠️  检测到已存在的测试数据文件', 'yellow');
    log('如果继续，将清空数据库并重新创建用户', 'yellow');
    log('按 Ctrl+C 取消，或等待 5 秒继续...', 'yellow');
    await sleep(5000);
  }

  const startTime = Date.now();

  try {
    await step0_cleanDatabase();
    await step1_createWallets();
    await step2_calculateSmartAccountAddresses();
    await step3_registerUsers();
    await step4_deploySmartAccounts();
    await step5_loginUsers();
    await step6_checkAccessGroups();

    // 添加元数据
    testData.metadata.createdAt = new Date().toISOString();

    // 保存测试数据
    logStep('保存测试数据到文件');
    const saved = saveTestData(testData);
    
    if (saved) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      log('\n' + '='.repeat(70), 'green');
      log('🎉 测试用户设置完成！', 'green');
      log('='.repeat(70), 'green');
      log(`⏱️  总耗时: ${duration} 秒`, 'cyan');
      log('\n📊 测试数据总结:', 'bright');
      log(`   - 创建账户数: 3 (老人、医生、家属)`, 'cyan');
      log(`   - 老人访问组数: ${testData.elder.accessGroups.length}`, 'cyan');
      log(`   - API Base URL: ${BASE_URL}`, 'cyan');
      log('\n✅ 现在可以运行其他测试脚本了！\n', 'green');
    } else {
      throw new Error('保存测试数据失败');
    }

  } catch (error) {
    log('\n' + '='.repeat(70), 'red');
    log('❌ 设置失败', 'red');
    log('='.repeat(70), 'red');
    logError('错误', error.message);
    log(`\n堆栈信息:\n${error.stack}`, 'red');
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行设置
if (require.main === module) {
  log('\n检查环境...', 'yellow');
  log(`API Base URL: ${BASE_URL}`, 'cyan');
  log('请确保以下服务已启动:', 'yellow');
  log('  - PostgreSQL 数据库', 'yellow');
  log('  - Redis', 'yellow');
  log('  - relationship-service (gRPC :50053)', 'yellow');
  log('  - user-service (gRPC :50051)', 'yellow');
  log('  - erc4337-service (HTTP :4337)', 'yellow');
  log('  - api-gateway (HTTP :3000)', 'yellow');
  log('\n开始设置...\n', 'yellow');

  setupTestUsers().catch(err => {
    logError('主函数', err.message);
    process.exit(1);
  });
}

module.exports = {
  setupTestUsers,
  testData
};

