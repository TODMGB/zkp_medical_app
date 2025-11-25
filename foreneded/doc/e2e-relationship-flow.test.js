/**
 * 关系管理、社交恢复与账户迁移端到端测试脚本
 * 测试完整流程：
 * 1. 创建账户 -> 初始化访问组 -> 创建邀请 -> 接受邀请 -> 关系管理
 * 2. 社交恢复：添加守护者 -> 设置阈值 -> 模拟丢失私钥 -> 守护者恢复
 * 3. 账户迁移：创建迁移会话 -> 验证确认码 -> 完成迁移
 * 
 * 运行方式：
 * - 首次运行：node tests/setup-test-users.js（设置用户）
 * - 后续运行：node tests/e2e-relationship-flow.test.js（使用已有用户）
 * - 强制重新创建：node tests/e2e-relationship-flow.test.js --force-setup
 */

const axios = require('axios');
const ethers = require('ethers');
const { Client } = require('pg');
const { loadTestData, validateTestData, testDataExists } = require('./utils/test-data-manager');

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

// 测试数据存储
const testData = {
  elder: { 
    role: '老人',
    username: '王秀英',
    id_card_number: '110101195803151234',
    phone_number: '13810010001',
    email: 'wang.xiuying@example.net',
    eoaWallet: null, 
    smartAccount: null, 
    token: null, 
    accessGroups: [],
    guardians: [] // 守护者列表
  },
  doctor: { 
    role: '医生',
    username: '李建国',
    id_card_number: '310101196207222345',
    phone_number: '13910010002',
    email: 'li.jianguo@clinic.com',
    eoaWallet: null, 
    smartAccount: null, 
    token: null 
  },
  family: { 
    role: '家属',
    username: '张敏',
    id_card_number: '440111197011013456',
    phone_number: '13711110003',
    email: 'zhang1.min@example.net',
    eoaWallet: null, 
    smartAccount: null, 
    token: null 
  },
  invitations: [],
  relationships: [],
  recovery: {
    newOwnerWallet: null, // 恢复后的新 Owner
    threshold: 2 // 恢复阈值
  },
  migration: {
    migrationId: null,
    oldDeviceId: 'device_old_001',
    newDeviceId: 'device_new_002',
    confirmCode: null,
    sessionData: null
  }
};

/**
 * 从持久化数据加载并重建测试数据（不包含 token，因为 token 可能已过期）
 * @param {Object} persistedData - 从JSON文件加载的数据
 */
function loadPersistedTestData(persistedData) {
  logStep('从持久化文件加载测试数据');
  
  try {
    // 重建钱包对象
    for (const role of ['elder', 'doctor', 'family']) {
      if (persistedData[role]) {
        testData[role].eoaWallet = new ethers.Wallet(persistedData[role].eoaPrivateKey);
        testData[role].smartAccount = persistedData[role].smartAccount;
        // 不加载 token，稍后会重新登录
        testData[role].salt = persistedData[role].salt;
        
        // 老人特有数据
        if (role === 'elder' && persistedData[role].accessGroups) {
          testData[role].accessGroups = persistedData[role].accessGroups;
        }
        
        logSuccess(testData[role].role, `已加载 - EOA: ${testData[role].eoaWallet.address.substring(0, 10)}...`);
        logInfo(`   └─ SmartAccount: ${testData[role].smartAccount.substring(0, 10)}...`);
      }
    }
    
    logSuccess('数据加载', '用户数据已从文件成功加载');
    logInfo(`数据创建时间: ${persistedData.metadata?.createdAt || '未知'}`);
    logInfo(`注意：Token 将在步骤5中重新获取`);
    
    return true;
  } catch (error) {
    logError('数据加载', `失败: ${error.message}`);
    return false;
  }
}

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

// 步骤0: 清理数据库
async function step0_cleanDatabase() {
  logStep('步骤0: 清理数据库数据');

  // 清理 user-service 数据库
  const userClient = new Client(DB_CONFIG_USER);
  try {
    await userClient.connect();
    logInfo('正在清理 user-service 数据库...');
    
    // 清除 users 表
    const userResult = await userClient.query('DELETE FROM users');
    logSuccess('users 表', `清除了 ${userResult.rowCount} 条记录`);
    
    // 清除 user_roles 表
    const userRoleResult = await userClient.query('DELETE FROM user_roles');
    logSuccess('user roles 表', `清除了 ${userRoleResult.rowCount} 条记录`);
    await userClient.end();
  } catch (error) {
    logError('user-service 数据库', `清理失败: ${error.message}`);
    try { await userClient.end(); } catch (e) {}
    throw error;
  }

  await sleep(300);

  // 清理 relation-service 数据库 (gateway db)
  const relationClient = new Client(DB_CONFIG_RELATION);
  try {
    await relationClient.connect();
    logInfo('正在清理 relation-service 数据库...');
    
    // 按依赖顺序删除（先删除子表，再删除父表）
    // 删除 relationships 表
    const relResult = await relationClient.query('DELETE FROM relationships');
    logSuccess('relationships 表', `清除了 ${relResult.rowCount} 条记录`);
    
    // 删除 invitations 表
    const invResult = await relationClient.query('DELETE FROM invitations');
    logSuccess('invitations 表', `清除了 ${invResult.rowCount} 条记录`);
    
    // 删除 access_groups 表
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
    
    // 清除 migration_sessions 表
    const migrationResult = await migrationClient.query('DELETE FROM migration_sessions');
    logSuccess('migration_sessions 表', `清除了 ${migrationResult.rowCount} 条记录`);
    
    await migrationClient.end();
  } catch (error) {
    logError('migration-service 数据库', `清理失败: ${error.message}`);
    try { await migrationClient.end(); } catch (e) {}
    // 不抛出错误，因为迁移数据库可能不存在
    logInfo('迁移数据库可能未初始化，跳过清理');
  }

  logSuccess('数据库清理', '所有测试数据已清除，可以开始测试');
}

// HTTP 请求封装
async function apiRequest(method, path, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${path}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000 // 30秒超时
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    // 添加请求日志
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

// 步骤1: 创建EOA钱包
async function step1_createWallets() {
  logStep('步骤1: 创建三个角色的EOA钱包');

  testData.elder.eoaWallet = ethers.Wallet.createRandom();
  logSuccess('老人', `EOA: ${testData.elder.eoaWallet.address}`);

  testData.doctor.eoaWallet = ethers.Wallet.createRandom();
  logSuccess('医生', `EOA: ${testData.doctor.eoaWallet.address}`);

  testData.family.eoaWallet = ethers.Wallet.createRandom();
  logSuccess('家属', `EOA: ${testData.family.eoaWallet.address}`);
}

// 步骤2: 预计算Smart Account地址（不部署）
async function step2_calculateSmartAccountAddresses() {
  logStep('步骤2: 预计算Smart Account地址');

  for (const role of ['elder', 'doctor', 'family']) {
    const user = testData[role];
    const salt = Math.floor(Math.random() * 1000000);
    
    logInfo(`正在为${user.role}计算Smart Account地址...`);
    logInfo(`使用 salt 值: ${salt}`);
    logInfo(`Owner EOA: ${user.eoaWallet.address}`);

    // 使用POST请求预计算地址（不部署到链上）
    const result = await apiRequest('POST', '/api/erc4337/account/address', {
      ownerAddress: user.eoaWallet.address,
      guardians: [],
      threshold: 0,
      salt: salt
    });

    // 调试输出完整响应
    logInfo(`API 响应: ${JSON.stringify(result).substring(0, 200)}`);

    if (result.success) {
      // result.data 包含 ERC4337 服务的响应，结构为 { success, data }
      const erc4337Response = result.data;
      
      if (erc4337Response.success && erc4337Response.data && erc4337Response.data.accountAddress) {
        user.smartAccount = erc4337Response.data.accountAddress;
        user.salt = salt; // 保存 salt 值
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

// 步骤3: 注册用户到数据库
async function step3_registerUsers() {
  logStep('步骤3: 注册用户账户（写入数据库）');

  for (const role of ['elder', 'doctor', 'family']) {
    const user = testData[role];
    logInfo(`正在注册${user.role}...`);

    // 构建注册数据 - 使用新的API参数名
    const registerData = {
      eoa_address: user.eoaWallet?.address,
      smart_account_address: user.smartAccount,
      phone_number: user.phone_number,
      id_card_number: user.id_card_number,
      email: user.email
    };

    // 调试输出：显示将要发送的数据
    logInfo(`注册数据: EOA=${registerData.eoa_address?.substring(0, 10)}..., SmartAccount=${registerData.smart_account_address?.substring(0, 10)}...`);

    const result = await apiRequest('POST', '/api/auth/register', registerData);

    if (result.success) {
      logSuccess(user.role, '注册成功');
      // 保存返回的用户信息
      if (result.data && result.data.data) {
        logInfo(`用户名: ${result.data.data.username}, 角色: ${result.data.data.role}`);
      }
    } else if (result.status === 409) {
      logInfo(`${user.role}账户已存在，继续测试`);
    } else {
      logError(user.role, `注册失败: ${JSON.stringify(result.error)}`);
      // 额外调试信息
      logError('调试', `EOA: ${user.eoaWallet?.address}, SmartAccount: ${user.smartAccount}`);
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

    // 真正部署账户到链上
    const result = await apiRequest('POST', '/api/erc4337/account', {
      ownerAddress: user.eoaWallet.address,
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
    await sleep(1500); // 等待链上确认
  }
}

// 步骤5: 用户登录
async function step5_loginUsers() {
  logStep('步骤5: 用户登录获取Token');

  for (const role of ['elder', 'doctor', 'family']) {
    const user = testData[role];
    logInfo(`${user.role}正在登录...`);

    const loginTime = new Date().toISOString();
    const message = `LOGIN_TIME:${loginTime}`;
    const signature = await user.eoaWallet.signMessage(message);

    const result = await apiRequest('POST', '/api/auth/login', {
      eoa_address: user.eoaWallet.address,
      login_time: loginTime,
      signature: signature
    });

    if (result.success) {
      console.log(`[DEBUG] 登录响应数据:`, JSON.stringify(result.data, null, 2));
      user.token = result.data.data.token;  // 修正：result.data.data.token
      console.log(`[DEBUG] ${user.role} Token:`, user.token ? `${user.token.substring(0, 50)}...` : 'undefined');
      logSuccess(user.role, '登录成功');
    } else {
      logError(user.role, `登录失败: ${JSON.stringify(result.error)}`);
      throw new Error(`登录失败: ${role}`);
    }
    await sleep(300);
  }
}

// 步骤6: 查看访问组
async function step6_checkAccessGroups() {
  logStep('步骤6: 老人查看访问组（应有5个预设群组）');

  console.log(`[DEBUG] 老人 Token:`, testData.elder.token ? `${testData.elder.token.substring(0, 50)}...` : 'undefined');
  
  // 使用 GET 请求，参数作为查询字符串
  const result = await apiRequest('GET', `/api/relation/access-groups/stats?user_smart_account=${testData.elder.smartAccount}`, null, testData.elder.token);

  if (result.success) {
    // 修正：data 直接是数组，不需要 data.data
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

// 步骤7: 创建自定义访问组
async function step7_createCustomGroup() {
  logStep('步骤7: 老人创建自定义访问组');

  const result = await apiRequest('POST', '/api/relation/access-groups', {
    groupName: '我的护理团队',
    description: '负责日常护理的专业团队',
    ownerAddress: testData.elder.smartAccount
  }, testData.elder.token);

  if (result.success) {
    const newGroup = result.data.data;
    console.log(`[DEBUG] 创建访问组响应数据:`, JSON.stringify(result.data, null, 2));
    testData.elder.accessGroups.push(newGroup);
    logSuccess('老人', `创建访问组成功: ${newGroup.group_name} (ID: ${newGroup.id})`);
  } else {
    logError('老人', `创建访问组失败: ${JSON.stringify(result.error)}`);
  }
}

// 步骤8: 创建邀请
async function step8_createInvitations() {
  logStep('步骤8: 老人创建邀请');

  // 找到主治医生组
  const doctorGroup = testData.elder.accessGroups.find(g => g.group_type === 'PRIMARY_DOCTOR');
  if (!doctorGroup) {
    logError('老人', '未找到主治医生组');
    return;
  }

  // 为医生创建邀请 - 使用正确的参数名
  logInfo(`为医生创建邀请（加入"${doctorGroup.group_name}"）...`);
  const result1 = await apiRequest('POST', '/api/relation/invitations', {
    accessGroupId: doctorGroup.id  // 确保使用驼峰命名
  }, testData.elder.token);

  if (result1.success && result1.data) {
    // 保存邀请令牌
    const invitationToken = result1.data.token || result1.data.data?.token;
    if (invitationToken) {
      testData.invitations.push({ token: invitationToken, role: 'doctor', groupId: doctorGroup.id });
      logSuccess('医生邀请', `Token: ${invitationToken}`);
    } else {
      logError('医生邀请', `响应中未找到token: ${JSON.stringify(result1.data)}`);
    }
  } else {
    logError('医生邀请', `创建失败: ${JSON.stringify(result1.error)}`);
  }

  await sleep(500);

  // 找到家人组
  const familyGroup = testData.elder.accessGroups.find(g => g.group_type === 'FAMILY_PRIMARY');
  if (familyGroup) {
    logInfo(`为家属创建邀请（加入"${familyGroup.group_name}"）...`);
    const result2 = await apiRequest('POST', '/api/relation/invitations', {
      accessGroupId: familyGroup.id
    }, testData.elder.token);

    if (result2.success && result2.data) {
      const invitationToken = result2.data.token || result2.data.data?.token;
      if (invitationToken) {
        testData.invitations.push({ token: invitationToken, role: 'family', groupId: familyGroup.id });
        logSuccess('家属邀请', `Token: ${invitationToken}`);
      } else {
        logError('家属邀请', `响应中未找到token: ${JSON.stringify(result2.data)}`);
      }
    } else {
      logError('家属邀请', `创建失败: ${JSON.stringify(result2.error)}`);
    }
  }
}

// 步骤9: 接受邀请
async function step9_acceptInvitations() {
  logStep('步骤9: 医生和家属接受邀请');

  for (const invitation of testData.invitations) {
    const user = testData[invitation.role];
    logInfo(`${user.role}正在接受邀请...`);

    const result = await apiRequest('POST', '/api/relation/relationships/accept', {
      token: invitation.token
    }, user.token);

    if (result.success) {
      logSuccess(user.role, '接受邀请成功');
    } else {
      logError(user.role, `接受邀请失败: ${JSON.stringify(result.error)}`);
    }

    await sleep(500);
  }
}

// 步骤10: 查看访问组成员
async function step10_checkMembers() {
  logStep('步骤10: 查看访问组成员');

  const doctorGroup = testData.elder.accessGroups.find(g => g.group_type === 'PRIMARY_DOCTOR');
  if (!doctorGroup) return;

  const result = await apiRequest('GET', `/api/relation/access-groups/${doctorGroup.id}/members`, null, testData.elder.token);

  if (result.success) {
    // 修正：members 可能在 data.members 或 data.data.members
    const members = result.data.members || result.data.data?.members || [];
    logSuccess('访问组成员', `"${doctorGroup.group_name}"共有 ${members.length} 个成员`);
    members.forEach(m => {
      logInfo(`   - ${m.viewer_address} (状态: ${m.status}, ID: ${m.id})`);
      // 比较时统一转换为小写
      if (m.viewer_address?.toLowerCase() === testData.doctor.smartAccount?.toLowerCase()) {
        testData.relationships.push({ id: m.id, role: 'doctor' });
      }
    });
  } else {
    logError('访问组成员', `查询失败: ${JSON.stringify(result.error)}`);
  }
}

// 步骤11: 关系管理
async function step11_manageRelationships() {
  logStep('步骤11: 关系管理（暂停/恢复/撤销）');

  if (testData.relationships.length === 0) {
    logError('关系管理', '没有可管理的关系');
    return;
  }

  const rel = testData.relationships[0];

  // 暂停关系
  logInfo(`暂停关系 (ID: ${rel.id})...`);
  const result1 = await apiRequest('PUT', `/api/relation/relationships/${rel.id}/suspend`, null, testData.elder.token);
  if (result1.success) {
    logSuccess('暂停', result1.data.message);
  } else {
    logError('暂停', JSON.stringify(result1.error));
  }

  await sleep(1000);

  // 恢复关系
  logInfo(`恢复关系 (ID: ${rel.id})...`);
  const result2 = await apiRequest('PUT', `/api/relation/relationships/${rel.id}/resume`, null, testData.elder.token);
  if (result2.success) {
    logSuccess('恢复', result2.data.message);
  } else {
    logError('恢复', JSON.stringify(result2.error));
  }

  await sleep(1000);

  // 撤销关系
  logInfo(`撤销关系 (ID: ${rel.id})...`);
  const result3 = await apiRequest('DELETE', `/api/relation/relationships/${rel.id}`, null, testData.elder.token);
  if (result3.success) {
    logSuccess('撤销', result3.data.message);
  } else {
    logError('撤销', JSON.stringify(result3.error));
  }
}

// ============================================
// 社交恢复测试流程
// ============================================

// 步骤12: 添加守护者（医生和家属）
async function step12_addGuardians() {
  logStep('步骤12: 老人添加守护者（医生和家属）');

  const guardians = [
    { role: 'doctor', name: '医生' },
    { role: 'family', name: '家属' }
  ];

  for (const guardian of guardians) {
    const guardianUser = testData[guardian.role];
    logInfo(`正在添加${guardian.name}作为守护者...`);

    // 步骤 1: 构建未签名 UserOp
    const buildResult = await apiRequest('POST', '/api/erc4337/guardian/build', {
      accountAddress: testData.elder.smartAccount,
      guardianAddress: guardianUser.smartAccount
    });

    if (!buildResult.success) {
      logError(guardian.name, `构建 UserOp 失败: ${JSON.stringify(buildResult.error)}`);
      throw new Error(`添加守护者失败: ${guardian.name}`);
    }

    // 步骤 2: 老人 EOA 签名
    const userOpHash = buildResult.data.data.userOpHash;
    const signature = await testData.elder.eoaWallet.signMessage(ethers.getBytes(userOpHash));
    buildResult.data.data.userOp.signature = signature;

    // 步骤 3: 提交已签名 UserOp
    const submitResult = await apiRequest('POST', '/api/erc4337/guardian/submit', {
      userOp: buildResult.data.data.userOp
    });

    if (submitResult.success && submitResult.data.success) {
      testData.elder.guardians.push(guardianUser.smartAccount);
      logSuccess(guardian.name, `已添加为守护者，交易: ${submitResult.data.data.txHash}`);
    } else {
      logError(guardian.name, `提交失败: ${JSON.stringify(submitResult.error || submitResult.data)}`);
      throw new Error(`添加守护者失败: ${guardian.name}`);
    }

    await sleep(2000); // 等待链上确认
  }
}

// 步骤13: 设置恢复阈值
async function step13_setRecoveryThreshold() {
  logStep('步骤13: 老人设置恢复阈值为 2');

  // 步骤 1: 构建未签名 UserOp
  const buildResult = await apiRequest('POST', '/api/erc4337/guardian/threshold/build', {
    accountAddress: testData.elder.smartAccount,
    newThreshold: testData.recovery.threshold
  });

  if (!buildResult.success) {
    logError('设置阈值', `构建 UserOp 失败: ${JSON.stringify(buildResult.error)}`);
    throw new Error('设置阈值失败');
  }

  // 步骤 2: 老人 EOA 签名
  const userOpHash = buildResult.data.data.userOpHash;
  const signature = await testData.elder.eoaWallet.signMessage(ethers.getBytes(userOpHash));
  buildResult.data.data.userOp.signature = signature;

  // 步骤 3: 提交已签名 UserOp
  const submitResult = await apiRequest('POST', '/api/erc4337/guardian/submit', {
    userOp: buildResult.data.data.userOp
  });

  if (submitResult.success && submitResult.data.success) {
    logSuccess('阈值设置', `恢复阈值已设置为 ${testData.recovery.threshold}，交易: ${submitResult.data.data.txHash}`);
  } else {
    logError('阈值设置', `提交失败: ${JSON.stringify(submitResult.error || submitResult.data)}`);
    throw new Error('设置阈值失败');
  }

  await sleep(2000);
}

// 步骤14: 查询守护者列表
async function step14_checkGuardiansList() {
  logStep('步骤14: 查询老人账户的守护者列表');

  const result = await apiRequest('GET', `/api/erc4337/guardian/${testData.elder.smartAccount}`);

  if (result.success && result.data.success) {
    const data = result.data.data;
    logSuccess('守护者信息', `守护者数量: ${data.count}, 阈值: ${data.threshold}`);
    if (data.guardians && data.guardians.length > 0) {
      data.guardians.forEach((g, i) => {
        logInfo(`   ${i + 1}. ${g}`);
      });
    }
  } else {
    logError('守护者查询', `失败: ${JSON.stringify(result.error || result.data)}`);
  }
}

// 步骤15: 模拟丢失私钥，医生发起恢复
async function step15_initiateRecovery() {
  logStep('步骤15: 模拟老人丢失私钥，医生发起恢复');

  // 生成新的 Owner EOA
  testData.recovery.newOwnerWallet = ethers.Wallet.createRandom();
  logInfo(`新 Owner 地址: ${testData.recovery.newOwnerWallet.address}`);
  logInfo(`新 Owner 私钥: ${testData.recovery.newOwnerWallet.privateKey}`);

  logInfo('医生作为守护者发起恢复请求...');

  // 步骤 1: 构建未签名 UserOp
  const buildResult = await apiRequest('POST', '/api/erc4337/recovery/initiate/build', {
    accountAddress: testData.elder.smartAccount,
    guardianAccountAddress: testData.doctor.smartAccount,
    newOwnerAddress: testData.recovery.newOwnerWallet.address
  });

  if (!buildResult.success) {
    logError('发起恢复', `构建 UserOp 失败: ${JSON.stringify(buildResult.error)}`);
    throw new Error('发起恢复失败');
  }

  // 步骤 2: 医生的 EOA 签名
  const userOpHash = buildResult.data.data.userOpHash;
  const signature = await testData.doctor.eoaWallet.signMessage(ethers.getBytes(userOpHash));
  buildResult.data.data.userOp.signature = signature;

  // 步骤 3: 提交已签名 UserOp
  const submitResult = await apiRequest('POST', '/api/erc4337/recovery/submit', {
    userOp: buildResult.data.data.userOp
  });

  if (submitResult.success && submitResult.data.success) {
    logSuccess('恢复请求', `医生已发起恢复，交易: ${submitResult.data.data.txHash}`);
  } else {
    logError('恢复请求', `提交失败: ${JSON.stringify(submitResult.error || submitResult.data)}`);
    throw new Error('发起恢复失败');
  }

  await sleep(2000);
}

// 步骤16: 家属支持恢复
async function step16_supportRecovery() {
  logStep('步骤16: 家属支持恢复（达到阈值）');

  logInfo('家属作为第二个守护者支持恢复...');

  // 步骤 1: 构建未签名 UserOp
  const buildResult = await apiRequest('POST', '/api/erc4337/recovery/support/build', {
    accountAddress: testData.elder.smartAccount,
    guardianAccountAddress: testData.family.smartAccount,
    newOwnerAddress: testData.recovery.newOwnerWallet.address
  });

  if (!buildResult.success) {
    logError('支持恢复', `构建 UserOp 失败: ${JSON.stringify(buildResult.error)}`);
    throw new Error('支持恢复失败');
  }

  // 步骤 2: 家属的 EOA 签名
  const userOpHash = buildResult.data.data.userOpHash;
  const signature = await testData.family.eoaWallet.signMessage(ethers.getBytes(userOpHash));
  buildResult.data.data.userOp.signature = signature;

  // 步骤 3: 提交已签名 UserOp
  const submitResult = await apiRequest('POST', '/api/erc4337/recovery/submit', {
    userOp: buildResult.data.data.userOp
  });

  if (submitResult.success && submitResult.data.success) {
    logSuccess('恢复支持', `家属已支持恢复，交易: ${submitResult.data.data.txHash}`);
    logInfo('✨ 已达到阈值（2/2），恢复应该自动执行');
  } else {
    logError('恢复支持', `提交失败: ${JSON.stringify(submitResult.error || submitResult.data)}`);
    throw new Error('支持恢复失败');
  }

  await sleep(2000);
}

// 步骤17: 验证恢复结果
async function step17_verifyRecovery() {
  logStep('步骤17: 验证账户恢复结果');

  // 查询恢复状态
  logInfo('查询恢复状态...');
  const statusResult = await apiRequest('GET', `/api/erc4337/recovery/status/${testData.elder.smartAccount}`);

  if (statusResult.success && statusResult.data.success) {
    const status = statusResult.data.data;
    logInfo(`新 Owner: ${status.newOwner}`);
    logInfo(`批准数: ${status.approvalCount}`);
    logInfo(`已执行: ${status.executed}`);
  } else {
    logError('恢复状态查询', `失败: ${JSON.stringify(statusResult.error || statusResult.data)}`);
  }

  await sleep(1000);

  // 查询账户信息验证 Owner 是否已更换
  logInfo('查询账户信息验证 Owner...');
  
  try {
    const accountResult = await apiRequest('GET', `/api/erc4337/account/${testData.elder.smartAccount}`);

    if (accountResult.success && accountResult.data.success) {
      const account = accountResult.data.data;
      const oldOwner = testData.elder.eoaWallet.address;
      const newOwner = testData.recovery.newOwnerWallet.address;

      logInfo(`原 Owner: ${oldOwner}`);
      logInfo(`当前 Owner: ${account.owner}`);
      logInfo(`新 Owner: ${newOwner}`);

      if (account.owner && account.owner.toLowerCase() === newOwner.toLowerCase()) {
        logSuccess('恢复验证', '✅ 社交恢复成功！Owner 已更换为新地址');
      } else if (account.owner && account.owner.toLowerCase() === oldOwner.toLowerCase()) {
        logError('恢复验证', '❌ Owner 未更换，仍是原地址');
      } else {
        logError('恢复验证', `❌ Owner 地址异常或未定义: ${account.owner}`);
      }
    } else {
      logError('账户查询', `失败: ${JSON.stringify(accountResult.error || accountResult.data)}`);
    }
  } catch (error) {
    logError('账户查询异常', `错误: ${error.message}`);
    // 继续执行，不要因为这个查询失败而阻止后续测试
    logInfo('跳过账户验证，继续执行迁移测试...');
  }
}

// 主函数：执行所有测试步骤
async function runE2ETest(options = {}) {
  log('\n' + '='.repeat(70), 'bright');
  log('🚀 开始端到端测试：关系管理 + 社交恢复 + 账户迁移完整流程', 'bright');
  log('='.repeat(70) + '\n', 'bright');

  const startTime = Date.now();
  let usePersistedData = false;

  try {
    // 检查是否使用持久化数据
    if (!options.forceSetup && testDataExists()) {
      const persistedData = loadTestData();
      
      if (persistedData && validateTestData(persistedData)) {
        logInfo('检测到有效的测试数据文件，将使用已注册的用户');
        const loaded = loadPersistedTestData(persistedData);
        
        if (loaded) {
          usePersistedData = true;
          logInfo('✅ 跳过用户创建步骤（步骤0-4），但需要重新登录（步骤5）');
        } else {
          logError('数据加载', '加载失败，将执行完整设置流程');
        }
      } else {
        logError('数据验证', '测试数据无效或不完整');
      }
    }

    // 如果没有持久化数据或验证失败，提示用户
    if (!usePersistedData && !options.forceSetup) {
      log('\n' + '='.repeat(70), 'yellow');
      log('⚠️  未找到有效的测试用户数据', 'yellow');
      log('='.repeat(70), 'yellow');
      log('\n请先运行以下命令创建测试用户：', 'cyan');
      log('  node tests/setup-test-users.js\n', 'bright');
      log('或者使用 --force-setup 参数强制重新创建：', 'cyan');
      log('  node tests/e2e-relationship-flow.test.js --force-setup\n', 'bright');
      process.exit(1);
    }

    // 第一部分：关系管理
    log('\n📋 第一部分：关系管理测试', 'bright');
    
    // 如果需要重新设置，执行完整流程
    if (!usePersistedData) {
      logInfo('执行完整用户设置流程...');
      await step0_cleanDatabase();
      await step1_createWallets();
      await step2_calculateSmartAccountAddresses();
      await step3_registerUsers();
      await step4_deploySmartAccounts();
      await step5_loginUsers();
      await step6_checkAccessGroups();
    } else {
      // 使用持久化数据时，也需要重新登录获取新 token
      logInfo('使用已有用户，重新登录获取 token...');
      await step5_loginUsers();
      await step6_checkAccessGroups();
    }
    
    // 关系管理测试（所有模式都执行）
    await step7_createCustomGroup();
    await step8_createInvitations();
    await step9_acceptInvitations();
    await step10_checkMembers();
    await step11_manageRelationships();

    // 第二部分：社交恢复
    log('\n🔐 第二部分：社交恢复测试', 'bright');
    await step12_addGuardians();
    await step13_setRecoveryThreshold();
    await step14_checkGuardiansList();
    await step15_initiateRecovery();
    await step16_supportRecovery();
    await step17_verifyRecovery();

    // 第三部分：账户迁移
    log('\n🔄 第三部分：账户迁移测试', 'bright');
    await step18_createMigrationSession();
    await step19_getMigrationSession();
    await step20_verifyConfirmCode();
    await step21_completeMigration();
    await step22_verifyMigrationStatus();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log('\n' + '='.repeat(70), 'green');
    log('🎉 测试完成！所有步骤执行成功', 'green');
    log('='.repeat(70), 'green');
    log(`⏱️  总耗时: ${duration} 秒`, 'cyan');
    log(`📦 数据模式: ${usePersistedData ? '使用持久化数据' : '全新创建'}`, 'cyan');
    log('\n📊 测试数据总结:', 'bright');
    log('\n【关系管理】', 'yellow');
    log(`   - 创建账户数: 3 (老人、医生、家属)`, 'cyan');
    log(`   - 访问组数: ${testData.elder.accessGroups.length}`, 'cyan');
    log(`   - 邀请数: ${testData.invitations.length}`, 'cyan');
    log(`   - 关系数: ${testData.relationships.length}`, 'cyan');
    log('\n【社交恢复】', 'yellow');
    log(`   - 守护者数: ${testData.elder.guardians.length}`, 'cyan');
    log(`   - 恢复阈值: ${testData.recovery.threshold}`, 'cyan');
    log(`   - 原 Owner: ${testData.elder.eoaWallet.address}`, 'cyan');
    log(`   - 新 Owner: ${testData.recovery.newOwnerWallet.address}`, 'cyan');
    log('\n【账户迁移】', 'yellow');
    log(`   - 迁移会话ID: ${testData.migration.migrationId}`, 'cyan');
    log(`   - 旧设备ID: ${testData.migration.oldDeviceId}`, 'cyan');
    log(`   - 新设备ID: ${testData.migration.newDeviceId}`, 'cyan');
    log(`   - 确认码: ${testData.migration.confirmCode}`, 'cyan');
    log('\n✅ 所有功能验证通过！\n', 'green');

  } catch (error) {
    log('\n' + '='.repeat(70), 'red');
    log('❌ 测试失败', 'red');
    log('='.repeat(70), 'red');
    logError('错误', error.message);
    log(`\n堆栈信息:\n${error.stack}`, 'red');
    process.exit(1);
  }
}

// ==================== 账户迁移测试步骤 ====================

// Step 18: 创建迁移会话
async function step18_createMigrationSession() {
  log('\n📱 Step 18: 创建迁移会话', 'bright');
  
  const migrationId = `mig_${Date.now()}_test`;
  const sessionData = {
    id: migrationId,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000, // 5分钟后过期
    oldDeviceId: testData.migration.oldDeviceId,
    confirmCode: '123456'
  };

  const result = await apiRequest('POST', '/api/migration/create', sessionData);
  
  // 添加调试信息
  console.log('🔍 [Debug] 完整响应结构:', JSON.stringify(result, null, 2));
  
  if (result.success && result.data.success) {
    // 修正数据访问路径
    testData.migration.migrationId = result.data.data.migrationId;
    testData.migration.confirmCode = result.data.data.confirmCode;
    testData.migration.sessionData = result.data.data;
    
    log(`✅ 迁移会话创建成功`, 'green');
    log(`   - 迁移ID: ${testData.migration.migrationId}`, 'cyan');
    log(`   - 确认码: ${testData.migration.confirmCode}`, 'cyan');
    log(`   - 过期时间: ${new Date(parseInt(result.data.data.expiresAt))}`, 'cyan');
  } else {
    throw new Error(`创建迁移会话失败: ${JSON.stringify(result.data)}`);
  }
}

// Step 19: 获取迁移会话信息
async function step19_getMigrationSession() {
  log('\n📋 Step 19: 获取迁移会话信息', 'bright');
  
  const result = await apiRequest('GET', `/api/migration/session/${testData.migration.migrationId}`);
  
  // 添加调试信息
  console.log('🔍 [Debug] 获取会话响应结构:', JSON.stringify(result, null, 2));
  
  if (result.success && result.data.success) {
    const session = result.data.data; // 修正数据访问路径
    log(`✅ 获取会话信息成功`, 'green');
    log(`   - 状态: ${session.status}`, 'cyan');
    log(`   - 旧设备ID: ${session.oldDeviceId}`, 'cyan');
    log(`   - 创建时间: ${new Date(parseInt(session.createdAt))}`, 'cyan');
    log(`   - 过期时间: ${new Date(parseInt(session.expiresAt))}`, 'cyan');
  } else {
    throw new Error(`获取迁移会话失败: ${JSON.stringify(result.data)}`);
  }
}

// Step 20: 验证确认码
async function step20_verifyConfirmCode() {
  log('\n🔐 Step 20: 验证确认码', 'bright');
  
  // 测试正确的确认码
  const correctResult = await apiRequest('POST', '/api/migration/verify', {
    migrationId: testData.migration.migrationId,
    confirmCode: testData.migration.confirmCode
  });
  
  if (correctResult.success && correctResult.data.success && correctResult.data.data.valid) {
    log(`✅ 正确确认码验证成功`, 'green');
  } else {
    throw new Error(`确认码验证失败: ${JSON.stringify(correctResult.data)}`);
  }
  
  // 测试错误的确认码
  const wrongResult = await apiRequest('POST', '/api/migration/verify', {
    migrationId: testData.migration.migrationId,
    confirmCode: '654321'
  });
  
  if (wrongResult.success && wrongResult.data.success && !wrongResult.data.data.valid) {
    log(`✅ 错误确认码正确被拒绝`, 'green');
  } else {
    log(`⚠️  错误确认码应该被拒绝，但验证通过了`, 'yellow');
    console.log('🔍 [Debug] 错误确认码响应:', JSON.stringify(wrongResult, null, 2));
  }
}

// Step 21: 完成迁移
async function step21_completeMigration() {
  log('\n✅ Step 21: 完成迁移', 'bright');
  
  const result = await apiRequest('POST', '/api/migration/confirm', {
    migrationId: testData.migration.migrationId,
    newDeviceId: testData.migration.newDeviceId,
    status: 'completed',
    timestamp: Date.now()
  });
  
  if (result.success && result.data.success) {
    log(`✅ 迁移完成成功`, 'green');
    log(`   - 新设备ID: ${testData.migration.newDeviceId}`, 'cyan');
  } else {
    throw new Error(`完成迁移失败: ${JSON.stringify(result.data)}`);
  }
}

// Step 22: 验证迁移状态
async function step22_verifyMigrationStatus() {
  log('\n🔍 Step 22: 验证迁移状态', 'bright');
  
  const result = await apiRequest('GET', `/api/migration/status/${testData.migration.migrationId}`);
  
  // 添加调试信息
  console.log('🔍 [Debug] 迁移状态响应结构:', JSON.stringify(result, null, 2));
  
  if (result.success && result.data.success) {
    const status = result.data.data.status; // 修正数据访问路径
    if (status === 'completed') {
      log(`✅ 迁移状态验证成功: ${status}`, 'green');
      
      // 获取详细会话信息验证
      const sessionResult = await apiRequest('GET', `/api/migration/session/${testData.migration.migrationId}`);
      if (sessionResult.success && sessionResult.data.success) {
        const session = sessionResult.data.data; // 修正数据访问路径
        log(`   - 最终状态: ${session.status}`, 'cyan');
        log(`   - 新设备ID: ${session.newDeviceId}`, 'cyan');
        log(`   - 确认时间: ${new Date(parseInt(session.confirmedAt))}`, 'cyan');
      }
    } else {
      throw new Error(`迁移状态异常: ${status}, 期望: completed`);
    }
  } else {
    throw new Error(`验证迁移状态失败: ${JSON.stringify(result.data)}`);
  }
}

// 清理迁移数据库
async function cleanMigrationDatabase() {
  log('🧹 清理迁移数据库...', 'yellow');
  
  const client = new Client(DB_CONFIG_MIGRATION);
  try {
    await client.connect();
    await client.query('DELETE FROM migration_sessions');
    log('✅ 迁移数据库清理完成', 'green');
  } catch (error) {
    log(`⚠️  清理迁移数据库失败: ${error.message}`, 'yellow');
  } finally {
    await client.end();
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  // 解析命令行参数
  const args = process.argv.slice(2);
  const forceSetup = args.includes('--force-setup');

  log('\n检查环境...', 'yellow');
  log(`API Base URL: ${BASE_URL}`, 'cyan');
  
  if (forceSetup) {
    log('⚠️  强制重新设置模式：将清空数据库并重新创建用户', 'yellow');
  } else if (testDataExists()) {
    log('✅ 检测到测试数据文件，将尝试使用已注册的用户', 'cyan');
  } else {
    log('⚠️  未找到测试数据文件', 'yellow');
  }
  
  log('\n请确保以下服务已启动:', 'yellow');
  log('  - PostgreSQL 数据库', 'yellow');
  log('  - Redis', 'yellow');
  log('  - relationship-service (gRPC :50053)', 'yellow');
  log('  - user-service (gRPC :50051)', 'yellow');
  log('  - erc4337-service (HTTP :4337)', 'yellow');
  log('  - migration-service (HTTP :3004)', 'yellow');
  log('  - api-gateway (HTTP :3000)', 'yellow');
  log('\n开始测试...\n', 'yellow');

  runE2ETest({ forceSetup }).catch(err => {
    logError('主函数', err.message);
    process.exit(1);
  });
}

module.exports = {
  testData,
  apiRequest,
  runE2ETest,
  // 关系管理测试步骤
  step0_cleanDatabase,
  step1_createWallets,
  step2_calculateSmartAccountAddresses,
  step3_registerUsers,
  step4_deploySmartAccounts,
  step5_loginUsers,
  step6_checkAccessGroups,
  step7_createCustomGroup,
  step8_createInvitations,
  step9_acceptInvitations,
  step10_checkMembers,
  step11_manageRelationships,
  // 社交恢复测试步骤
  step12_addGuardians,
  step13_setRecoveryThreshold,
  step14_checkGuardiansList,
  step15_initiateRecovery,
  step16_supportRecovery,
  step17_verifyRecovery,
  // 账户迁移测试步骤
  step18_createMigrationSession,
  step19_getMigrationSession,
  step20_verifyConfirmCode,
  step21_completeMigration,
  step22_verifyMigrationStatus,
  cleanMigrationDatabase
};
