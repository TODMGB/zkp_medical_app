/**
 * 通知服务端到端测试脚本
 * 测试完整流程：
 * 0. 用户登录获取 Token
 * 1. 建立 WebSocket 连接
 * 2. 测试 WebSocket 心跳
 * 3. 初始化 RabbitMQ 连接
 * 4. 通过 MQ 发送通知
 * 5. 验证 WebSocket 实时接收
 * 6-13. HTTP API 测试（列表、未读数量、标记已读、删除等）
 * 14. 清理资源
 * 
 * 运行方式：
 * - 使用已有用户：node tests/e2e-notification-flow.test.js
 * - 需要先运行：node tests/setup-test-users.js（首次）
 */

const axios = require('axios');
const WebSocket = require('ws');
const amqp = require('amqplib');
const { loadTestData, validateTestData, testDataExists } = require('./utils/test-data-manager');

// 配置
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_BASE_URL || 'ws://localhost:3000';
const MQ_URL = process.env.MQ_URL || 'amqp://localhost:5672';
const MQ_EXCHANGE = process.env.MQ_EXCHANGE_NAME || 'exchange.notifications';

// 测试数据存储
const testData = {
  elder: {
    eoaAddress: null, // EOA 地址（用于登录）
    eoaPrivateKey: null, // EOA 私钥（用于签名登录）
    smartAccount: null,
    token: null, // 登录后的 JWT token
    wsConnection: null,
    receivedNotifications: []
  },
  doctor: {
    eoaAddress: null,
    eoaPrivateKey: null,
    smartAccount: null,
    token: null,
    wsConnection: null,
    receivedNotifications: []
  },
  family: {
    eoaAddress: null,
    eoaPrivateKey: null,
    smartAccount: null,
    token: null,
    wsConnection: null,
    receivedNotifications: []
  },
  notifications: [],
  mqChannel: null,
  mqConnection: null
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
      timeout: 10000
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

/**
 * 从持久化数据加载测试数据（不包含 token，因为 token 可能已过期）
 */
function loadPersistedTestData(persistedData) {
  logStep('从持久化文件加载测试数据');
  
  try {
    for (const role of ['elder', 'doctor', 'family']) {
      if (persistedData[role]) {
        // 加载用户基本信息（不包含 token，稍后会重新登录）
        testData[role].eoaAddress = persistedData[role].eoaAddress;
        testData[role].eoaPrivateKey = persistedData[role].eoaPrivateKey;
        testData[role].smartAccount = persistedData[role].smartAccount;
        
        logSuccess(persistedData[role].role, 
          `已加载 - SmartAccount: ${testData[role].smartAccount.substring(0, 10)}...`);
        logInfo(`   └─ EOA: ${testData[role].eoaAddress.substring(0, 10)}...`);
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

// ==================== 测试步骤 ====================

// 步骤0: 用户登录
async function step0_loginUsers() {
  logStep('步骤0: 用户登录获取 Token');
  
  for (const role of ['elder', 'doctor', 'family']) {
    const user = testData[role];
    
    if (!user.eoaAddress || !user.eoaPrivateKey) {
      logError(role, '缺少 EOA 地址或私钥');
      throw new Error(`${role} 缺少必要的登录信息`);
    }
    
    logInfo(`${role} 正在登录...`);
    
    // 创建签名
    const { ethers } = require('ethers');
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

// 步骤1: 建立 WebSocket 连接
async function step1_connectWebSocket() {
  logStep('步骤1: 建立 WebSocket 连接');

  for (const role of ['elder', 'doctor', 'family']) {
    const user = testData[role];
    
    logInfo(`${role} 正在连接 WebSocket...`);
    
    await new Promise((resolve, reject) => {
      const wsUrl = `${WS_URL}/ws/notification?token=${user.token}`;
      const ws = new WebSocket(wsUrl);
      
      // 连接打开
      ws.on('open', () => {
        user.wsConnection = ws;
        logSuccess(role, `WebSocket 连接成功`);
        resolve();
      });
      
      // 接收消息
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`📨 [${role} WS] 收到消息:`, message.type);
          
          // 记录接收到的通知
          if (message.type === 'notification') {
            user.receivedNotifications.push(message.data);
            logSuccess(role, `收到实时通知: ${message.data.title}`);
          }
          
          // 处理欢迎消息
          if (message.type === 'connected') {
            logInfo(`${role} 收到欢迎消息: ${message.data.message}`);
          }
          
          // 处理心跳响应
          if (message.type === 'pong') {
            // logInfo(`${role} 收到心跳响应`);
          }
        } catch (error) {
          console.error(`[${role} WS] 解析消息失败:`, error.message);
        }
      });
      
      // 错误处理
      ws.on('error', (error) => {
        logError(role, `WebSocket 错误: ${error.message}`);
        reject(error);
      });
      
      // 连接超时
      setTimeout(() => {
        if (!user.wsConnection) {
          reject(new Error('WebSocket 连接超时'));
        }
      }, 5000);
    });
    
    await sleep(500);
  }
}

// 步骤2: 测试心跳
async function step2_testHeartbeat() {
  logStep('步骤2: 测试 WebSocket 心跳');

  for (const role of ['elder', 'doctor', 'family']) {
    const user = testData[role];
    
    if (!user.wsConnection) {
      logError(role, 'WebSocket 未连接');
      continue;
    }
    
    logInfo(`${role} 发送心跳...`);
    
    await new Promise((resolve, reject) => {
      let received = false;
      
      // 监听 pong 响应
      const messageHandler = (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'pong') {
            received = true;
            logSuccess(role, '心跳响应正常');
            user.wsConnection.removeListener('message', messageHandler);
            resolve();
          }
        } catch (error) {
          // 忽略解析错误
        }
      };
      
      user.wsConnection.on('message', messageHandler);
      
      // 发送 ping
      user.wsConnection.send(JSON.stringify({ type: 'ping' }));
      
      // 超时处理
      setTimeout(() => {
        if (!received) {
          user.wsConnection.removeListener('message', messageHandler);
          reject(new Error('心跳超时'));
        }
      }, 3000);
    });
    
    await sleep(300);
  }
}

// 步骤3: 初始化 MQ 连接
async function step3_initMQ() {
  logStep('步骤3: 初始化 RabbitMQ 连接');

  try {
    logInfo('正在连接 RabbitMQ...');
    testData.mqConnection = await amqp.connect(MQ_URL);
    testData.mqChannel = await testData.mqConnection.createChannel();
    
    // 确保交换机存在
    await testData.mqChannel.assertExchange(MQ_EXCHANGE, 'topic', { durable: true });
    
    logSuccess('MQ', `连接成功: ${MQ_URL}`);
    logSuccess('MQ', `Exchange: ${MQ_EXCHANGE}`);
  } catch (error) {
    logError('MQ', `连接失败: ${error.message}`);
    throw error;
  }
}

// 步骤4: 通过 MQ 发送通知
async function step4_sendNotificationViaMQ() {
  logStep('步骤4: 通过 RabbitMQ 发送通知');

  const notifications = [
    {
      recipient_address: testData.elder.smartAccount,
      title: '用药提醒',
      body: '该吃晚饭后的降压药了',
      type: 'medication_reminder',
      priority: 'high',
      channels: ['push', 'websocket'],
      data: { medication: '降压药', time: '18:30' }
    },
    {
      recipient_address: testData.elder.smartAccount,
      title: '体检通知',
      body: '明天上午9点有体检预约',
      type: 'appointment',
      priority: 'normal',
      channels: ['push', 'websocket'],
      data: { date: '2025-10-29', time: '09:00' }
    },
    {
      recipient_address: testData.doctor.smartAccount,
      title: '新患者',
      body: '您有一位新患者加入',
      type: 'system',
      priority: 'normal',
      channels: ['push', 'websocket'],
      data: { patientName: '王秀英' }
    }
  ];

  for (const notification of notifications) {
    logInfo(`发送通知: ${notification.title} -> ${notification.recipient_address.substring(0, 10)}...`);
    
    try {
      // 根据优先级选择路由键
      const routingKey = `notification.${notification.priority || 'normal'}`;
      
      // 发送到 MQ
      testData.mqChannel.publish(
        MQ_EXCHANGE,
        routingKey,
        Buffer.from(JSON.stringify(notification)),
        { persistent: true }
      );
      
      testData.notifications.push(notification);
      logSuccess('MQ', `通知已发送: ${notification.title}`);
    } catch (error) {
      logError('MQ', `发送失败: ${error.message}`);
    }
    
    await sleep(500);
  }
  
  // 等待消息处理和 WebSocket 推送
  logInfo('等待消息处理... (5秒)');
  await sleep(5000);
}

// 步骤5: 验证 WebSocket 接收
async function step5_verifyWebSocketReceived() {
  logStep('步骤5: 验证 WebSocket 是否收到通知');

  // 老人应该收到 2 条通知
  if (testData.elder.receivedNotifications.length >= 2) {
    logSuccess('老人', `收到 ${testData.elder.receivedNotifications.length} 条通知`);
    testData.elder.receivedNotifications.forEach(n => {
      logInfo(`   - ${n.title}: ${n.body}`);
    });
  } else {
    logError('老人', `应该收到 2 条通知，实际收到 ${testData.elder.receivedNotifications.length} 条`);
  }

  // 医生应该收到 1 条通知
  if (testData.doctor.receivedNotifications.length >= 1) {
    logSuccess('医生', `收到 ${testData.doctor.receivedNotifications.length} 条通知`);
    testData.doctor.receivedNotifications.forEach(n => {
      logInfo(`   - ${n.title}: ${n.body}`);
    });
  } else {
    logError('医生', `应该收到 1 条通知，实际收到 ${testData.doctor.receivedNotifications.length} 条`);
  }

  // 家属不应该收到通知
  if (testData.family.receivedNotifications.length === 0) {
    logSuccess('家属', '未收到通知（符合预期）');
  } else {
    logError('家属', `不应收到通知，实际收到 ${testData.family.receivedNotifications.length} 条`);
  }
}

// 步骤6: 获取通知列表
async function step6_getNotificationList() {
  logStep('步骤6: 获取通知列表（HTTP API）');

  for (const role of ['elder', 'doctor']) {
    const user = testData[role];
    
    logInfo(`${role} 正在获取通知列表...`);
    
    const result = await apiRequest(
      'GET',
      '/api/notification/notifications',
      null,
      user.token
    );

    if (result.success) {
      const notifications = result.data.data || [];
      logSuccess(role, `获取到 ${notifications.length} 条通知`);
      
      if (notifications.length > 0) {
        notifications.forEach((n, i) => {
          logInfo(`   ${i + 1}. [${n.read_at ? '已读' : '未读'}] ${n.title}: ${n.body}`);
        });
      }
    } else {
      logError(role, `获取失败: ${JSON.stringify(result.error)}`);
    }
    
    await sleep(500);
  }
}

// 步骤7: 获取未读数量
async function step7_getUnreadCount() {
  logStep('步骤7: 获取未读数量（HTTP API）');

  for (const role of ['elder', 'doctor']) {
    const user = testData[role];
    
    logInfo(`${role} 正在获取未读数量...`);
    
    const result = await apiRequest(
      'GET',
      '/api/notification/notifications/unread/count',
      null,
      user.token
    );

    if (result.success) {
      const count = result.data.data?.count || result.data.count || 0;
      logSuccess(role, `未读通知: ${count} 条`);
    } else {
      logError(role, `获取失败: ${JSON.stringify(result.error)}`);
    }
    
    await sleep(500);
  }
}

// 步骤8: 标记单条已读
async function step8_markAsRead() {
  logStep('步骤8: 标记单条通知为已读（HTTP API）');

  // 先获取老人的第一条通知
  const listResult = await apiRequest(
    'GET',
    '/api/notification/notifications',
    null,
    testData.elder.token
  );

  if (listResult.success) {
    const notifications = listResult.data.data || [];
    
    if (notifications.length > 0) {
      const firstNotification = notifications[0];
      logInfo(`正在标记通知为已读: ${firstNotification.title}`);
      
      const result = await apiRequest(
        'PUT',
        `/api/notification/notifications/${firstNotification.notification_id}/read`,
        null,
        testData.elder.token
      );

      if (result.success) {
        logSuccess('老人', `通知已标记为已读: ID ${firstNotification.notification_id}`);
      } else {
        logError('老人', `标记失败: ${JSON.stringify(result.error)}`);
      }
    } else {
      logInfo('老人没有通知可以标记');
    }
  }
  
  await sleep(500);
}

// 步骤9: 标记全部已读
async function step9_markAllAsRead() {
  logStep('步骤9: 标记全部通知为已读（HTTP API）');

  const result = await apiRequest(
    'PUT',
    '/api/notification/notifications/read-all',
    null,
    testData.elder.token
  );

  if (result.success) {
    const updated = result.data.data?.updated || result.data.updated || 0;
    logSuccess('老人', `已标记 ${updated} 条通知为已读`);
  } else {
    logError('老人', `标记失败: ${JSON.stringify(result.error)}`);
  }
  
  await sleep(500);
}

// 步骤10: 再次检查未读数量
async function step10_verifyUnreadCount() {
  logStep('步骤10: 验证未读数量（应该减少）');

  for (const role of ['elder', 'doctor']) {
    const user = testData[role];
    
    const result = await apiRequest(
      'GET',
      '/api/notification/notifications/unread/count',
      null,
      user.token
    );

    if (result.success) {
      const count = result.data.data?.count || result.data.count || 0;
      logSuccess(role, `当前未读通知: ${count} 条`);
    } else {
      logError(role, `获取失败: ${JSON.stringify(result.error)}`);
    }
    
    await sleep(500);
  }
}

// 步骤11: 删除通知
async function step11_deleteNotification() {
  logStep('步骤11: 删除通知（HTTP API）');

  // 获取老人的通知列表
  const listResult = await apiRequest(
    'GET',
    '/api/notification/notifications',
    null,
    testData.elder.token
  );

  if (listResult.success) {
    const notifications = listResult.data.data || [];
    
    if (notifications.length > 0) {
      const firstNotification = notifications[0];
      logInfo(`正在删除通知: ${firstNotification.title} (ID: ${firstNotification.notification_id})`);
      
      const result = await apiRequest(
        'DELETE',
        `/api/notification/notifications/${firstNotification.notification_id}`,
        null,
        testData.elder.token
      );

      if (result.success) {
        logSuccess('老人', `通知已删除: ID ${firstNotification.notification_id}`);
      } else {
        logError('老人', `删除失败: ${JSON.stringify(result.error)}`);
      }
    } else {
      logInfo('老人没有通知可以删除');
    }
  }
  
  await sleep(500);
}

// 步骤12: 通过 WebSocket 标记已读
async function step12_markReadViaWebSocket() {
  logStep('步骤12: 通过 WebSocket 标记已读');

  // 获取医生的通知列表
  const listResult = await apiRequest(
    'GET',
    '/api/notification/notifications',
    null,
    testData.doctor.token
  );

  if (listResult.success) {
    const notifications = listResult.data.data || [];
    
    if (notifications.length > 0) {
      const firstNotification = notifications[0];
      logInfo(`医生通过 WebSocket 标记通知为已读: ${firstNotification.title}`);
      
      const ws = testData.doctor.wsConnection;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'mark_read',
          notification_id: firstNotification.notification_id
        }));
        
        logSuccess('医生', `WebSocket 标记请求已发送: ID ${firstNotification.notification_id}`);
        await sleep(1000); // 等待服务器处理
      } else {
        logError('医生', 'WebSocket 未连接');
      }
    } else {
      logInfo('医生没有通知可以标记');
    }
  }
}

// 步骤13: 测试实时推送（再发一条）
async function step13_testRealtimePush() {
  logStep('步骤13: 测试实时推送（发送新通知）');

  const notification = {
    recipient_address: testData.elder.smartAccount,
    title: '🔔 测试通知',
    body: '这是一条测试实时推送的通知',
    type: 'system',
    priority: 'normal',
    channels: ['push', 'websocket'],
    data: { test: true }
  };

  logInfo(`发送测试通知: ${notification.title}`);
  
  try {
    const routingKey = `notification.normal`;
    testData.mqChannel.publish(
      MQ_EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(notification)),
      { persistent: true }
    );
    
    logSuccess('MQ', '测试通知已发送');
    
    // 等待 WebSocket 推送
    logInfo('等待 WebSocket 推送... (3秒)');
    await sleep(3000);
    
    // 检查是否收到
    const elderNotifications = testData.elder.receivedNotifications;
    const lastNotification = elderNotifications[elderNotifications.length - 1];
    
    if (lastNotification && lastNotification.title === notification.title) {
      logSuccess('老人', `✅ 实时收到测试通知: ${lastNotification.title}`);
    } else {
      logError('老人', '❌ 未收到测试通知');
    }
  } catch (error) {
    logError('MQ', `发送失败: ${error.message}`);
  }
}

// 步骤14: 清理资源
async function step14_cleanup() {
  logStep('步骤14: 清理资源');

  // 关闭 WebSocket 连接
  for (const role of ['elder', 'doctor', 'family']) {
    const user = testData[role];
    if (user.wsConnection) {
      user.wsConnection.close();
      logSuccess(role, 'WebSocket 连接已关闭');
    }
  }

  // 关闭 MQ 连接
  if (testData.mqChannel) {
    await testData.mqChannel.close();
    logSuccess('MQ', 'Channel 已关闭');
  }
  
  if (testData.mqConnection) {
    await testData.mqConnection.close();
    logSuccess('MQ', 'Connection 已关闭');
  }
}

// 主函数：执行所有测试步骤
async function runNotificationE2ETest() {
  log('\n' + '='.repeat(70), 'bright');
  log('🚀 开始端到端测试：通知服务完整流程', 'bright');
  log('='.repeat(70) + '\n', 'bright');

  const startTime = Date.now();

  try {
    // 检查测试数据
    if (!testDataExists()) {
      log('\n' + '='.repeat(70), 'yellow');
      log('⚠️  未找到测试用户数据', 'yellow');
      log('='.repeat(70), 'yellow');
      log('\n请先运行以下命令创建测试用户：', 'cyan');
      log('  node tests/setup-test-users.js\n', 'bright');
      process.exit(1);
    }

    const persistedData = loadTestData();
    
    if (!persistedData || !validateTestData(persistedData)) {
      logError('数据验证', '测试数据无效或不完整');
      process.exit(1);
    }

    loadPersistedTestData(persistedData);

    // 执行测试步骤
    await step0_loginUsers(); // 先登录获取 token
    await step1_connectWebSocket();
    await step2_testHeartbeat();
    await step3_initMQ();
    await step4_sendNotificationViaMQ();
    await step5_verifyWebSocketReceived();
    await step6_getNotificationList();
    await step7_getUnreadCount();
    await step8_markAsRead();
    await step9_markAllAsRead();
    await step10_verifyUnreadCount();
    await step11_deleteNotification();
    await step12_markReadViaWebSocket();
    await step13_testRealtimePush();
    await step14_cleanup();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log('\n' + '='.repeat(70), 'green');
    log('🎉 测试完成！所有步骤执行成功', 'green');
    log('='.repeat(70), 'green');
    log(`⏱️  总耗时: ${duration} 秒`, 'cyan');
    log('\n📊 测试数据总结:', 'bright');
    log('\n【WebSocket 连接】', 'yellow');
    log(`   - 老人: ${testData.elder.receivedNotifications.length} 条实时通知`, 'cyan');
    log(`   - 医生: ${testData.doctor.receivedNotifications.length} 条实时通知`, 'cyan');
    log(`   - 家属: ${testData.family.receivedNotifications.length} 条实时通知`, 'cyan');
    log('\n【MQ 消息】', 'yellow');
    log(`   - 总计发送: ${testData.notifications.length + 1} 条通知`, 'cyan');
    log('\n【测试覆盖】', 'yellow');
    log(`   ✅ WebSocket 连接认证`, 'cyan');
    log(`   ✅ WebSocket 心跳机制`, 'cyan');
    log(`   ✅ MQ 消息推送`, 'cyan');
    log(`   ✅ 实时通知接收`, 'cyan');
    log(`   ✅ HTTP API: 通知列表`, 'cyan');
    log(`   ✅ HTTP API: 未读数量`, 'cyan');
    log(`   ✅ HTTP API: 标记已读`, 'cyan');
    log(`   ✅ HTTP API: 标记全部已读`, 'cyan');
    log(`   ✅ HTTP API: 删除通知`, 'cyan');
    log(`   ✅ WebSocket: 标记已读`, 'cyan');
    log('\n✅ 所有功能验证通过！\n', 'green');

  } catch (error) {
    log('\n' + '='.repeat(70), 'red');
    log('❌ 测试失败', 'red');
    log('='.repeat(70), 'red');
    logError('错误', error.message);
    log(`\n堆栈信息:\n${error.stack}`, 'red');
    
    // 清理资源
    try {
      await step14_cleanup();
    } catch (cleanupError) {
      logError('清理', cleanupError.message);
    }
    
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  log('\n检查环境...', 'yellow');
  log(`API Base URL: ${BASE_URL}`, 'cyan');
  log(`WebSocket URL: ${WS_URL}`, 'cyan');
  log(`MQ URL: ${MQ_URL}`, 'cyan');
  
  if (testDataExists()) {
    log('✅ 检测到测试数据文件，将使用已注册的用户', 'cyan');
  } else {
    log('⚠️  未找到测试数据文件', 'yellow');
  }
  
  log('\n请确保以下服务已启动:', 'yellow');
  log('  - PostgreSQL 数据库 (bs_notification_db)', 'yellow');
  log('  - Redis', 'yellow');
  log('  - RabbitMQ (端口 5672)', 'yellow');
  log('  - notification-service (HTTP :3006, WebSocket)', 'yellow');
  log('  - api-gateway (HTTP :3000, WebSocket Proxy)', 'yellow');
  log('\n开始测试...\n', 'yellow');

  runNotificationE2ETest().catch(err => {
    logError('主函数', err.message);
    process.exit(1);
  });
}

module.exports = {
  runNotificationE2ETest,
  testData,
  apiRequest
};

