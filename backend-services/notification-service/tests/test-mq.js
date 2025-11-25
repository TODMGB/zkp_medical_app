// tests/test-mq.js
// ==========================================
// RabbitMQ 消息队列测试脚本
// ==========================================

const amqp = require('amqplib');

const MQ_URL = 'amqp://localhost';
const EXCHANGE_NAME = 'exchange.notifications';

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runMQTests() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║      📨 Notification Service MQ Tests             ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  let connection;
  let channel;
  
  try {
    // ==========================================
    // Test 1: 连接到RabbitMQ
    // ==========================================
    log('blue', '📋 Test 1: Connecting to RabbitMQ...');
    connection = await amqp.connect(MQ_URL);
    channel = await connection.createChannel();
    log('green', '   ✅ Connected to RabbitMQ successfully\n');
    
    // ==========================================
    // Test 2: 确保交换机存在
    // ==========================================
    log('blue', '📋 Test 2: Verifying Exchange...');
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    log('green', `   ✅ Exchange "${EXCHANGE_NAME}" is ready\n`);
    
    // ==========================================
    // Test 3: 发布高优先级通知
    // ==========================================
    await publishTestNotification(channel, 'HIGH', 'MEDICATION_REMINDER', {
      recipient_address: '0x1234567890abcdef1234567890abcdef12345678',
      type: 'MEDICATION_REMINDER',
      priority: 'HIGH',
      title: '🔴 高优先级 - 紧急用药提醒',
      body: '您有一个重要的用药提醒！',
      data: {
        medication_id: 'urgent_med_001',
        urgency: 'high'
      },
      channels: ['push', 'websocket']
    });
    
    // ==========================================
    // Test 4: 发布普通优先级通知
    // ==========================================
    await publishTestNotification(channel, 'NORMAL', 'INVITATION_ACCEPTED', {
      recipient_address: '0x1234567890abcdef1234567890abcdef12345678',
      type: 'INVITATION_ACCEPTED',
      priority: 'NORMAL',
      title: '🟡 普通优先级 - 邀请已接受',
      body: '张医生接受了您的邀请',
      data: {
        inviter_address: '0xabcdef1234567890'
      },
      channels: ['websocket']
    });
    
    // ==========================================
    // Test 5: 发布低优先级通知
    // ==========================================
    await publishTestNotification(channel, 'LOW', 'SYSTEM_NOTIFICATION', {
      recipient_address: '0x1234567890abcdef1234567890abcdef12345678',
      type: 'SYSTEM_NOTIFICATION',
      priority: 'LOW',
      title: '🟢 低优先级 - 系统通知',
      body: '系统将于今晚进行维护',
      data: {
        maintenance_time: '2025-10-28 23:00:00'
      },
      channels: ['push']
    });
    
    // ==========================================
    // Test 6: 批量发送测试
    // ==========================================
    log('blue', '\n📋 Test 6: Batch Sending (5 notifications)...');
    for (let i = 1; i <= 5; i++) {
      await publishTestNotification(channel, 'NORMAL', `TEST_${i}`, {
        recipient_address: '0x1234567890abcdef1234567890abcdef12345678',
        type: `BATCH_TEST_${i}`,
        priority: 'NORMAL',
        title: `📦 批量测试通知 ${i}/5`,
        body: `这是批量测试的第 ${i} 条通知`,
        data: { batch_id: i },
        channels: ['websocket']
      }, false); // 不打印详细日志
    }
    log('green', '   ✅ Sent 5 batch notifications\n');
    
    log('green', '✅ All MQ tests passed!\n');
    log('yellow', '💡 Tip: Check the notification-service console to see if messages are being consumed.\n');
    
  } catch (error) {
    log('red', `\n❌ MQ test failed: ${error.message}\n`);
    throw error;
  } finally {
    if (channel) await channel.close();
    if (connection) await connection.close();
  }
}

/**
 * 发布测试通知
 */
async function publishTestNotification(channel, priority, type, notification, verbose = true) {
  const routingKey = `notification.${priority.toLowerCase()}.${type.toLowerCase()}`;
  
  if (verbose) {
    log('blue', `\n📋 Test: Publishing ${priority} Priority Notification...`);
  }
  
  const message = Buffer.from(JSON.stringify(notification));
  
  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    message,
    {
      persistent: true,
      priority: getPriorityValue(priority)
    }
  );
  
  if (verbose) {
    log('green', `   ✅ Published successfully`);
    log('yellow', `   → Routing Key: ${routingKey}`);
    log('yellow', `   → Title: ${notification.title}`);
    log('yellow', `   → Recipient: ${notification.recipient_address.substring(0, 10)}...`);
  }
}

/**
 * 获取优先级数值
 */
function getPriorityValue(priority) {
  const priorityMap = {
    'HIGH': 10,
    'NORMAL': 5,
    'LOW': 1
  };
  return priorityMap[priority] || 5;
}

// 运行测试
runMQTests()
  .then(() => {
    log('green', '🎉 All MQ tests completed!\n');
    process.exit(0);
  })
  .catch(error => {
    log('red', `❌ Tests failed: ${error.message}\n`);
    process.exit(1);
  });

