// tests/test-http-api.js
// ==========================================
// HTTP API 测试脚本
// ==========================================

const BASE_URL = 'http://localhost:3006';

// 模拟JWT Token（需要替换为真实token）
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzbWFydF9hY2NvdW50IjoiMHgxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4IiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

let createdNotificationId = null;

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║        🧪 Notification Service HTTP API Tests     ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    await test1_healthCheck();
    await test2_sendNotification();
    await test3_getNotifications();
    await test4_getUnreadCount();
    await test5_markAsRead();
    await test6_markAllAsRead();
    
    log('green', '\n✅ All HTTP API tests passed!\n');
  } catch (error) {
    log('red', `\n❌ Tests failed: ${error.message}\n`);
    process.exit(1);
  }
}

// ==========================================
// Test 1: 健康检查
// ==========================================
async function test1_healthCheck() {
  log('blue', '📋 Test 1: Health Check');
  
  const response = await fetch(`${BASE_URL}/health`);
  const data = await response.json();
  
  if (response.status === 200 && data.status === 'UP') {
    log('green', '   ✅ Service is healthy');
    log('yellow', `   → Service: ${data.service}`);
    log('yellow', `   → WebSocket clients: ${data.websocket.clients}`);
  } else {
    throw new Error('Health check failed');
  }
}

// ==========================================
// Test 2: 发送通知
// ==========================================
async function test2_sendNotification() {
  log('blue', '\n📋 Test 2: Send Notification (High Priority)');
  
  const notification = {
    recipient_address: '0x1234567890abcdef1234567890abcdef12345678',
    type: 'MEDICATION_REMINDER',
    priority: 'HIGH',
    title: '🔔 测试用药提醒',
    body: '这是一条测试通知 - 用药提醒',
    data: {
      medication_id: 'test_med_123',
      medication_name: '测试药物',
      dosage: '1片'
    },
    channels: ['websocket', 'push']
  };
  
  const response = await fetch(`${BASE_URL}/api/notifications/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(notification)
  });
  
  const data = await response.json();
  
  if (response.status === 201 && data.success) {
    createdNotificationId = data.data.notification_id;
    log('green', '   ✅ Notification sent successfully');
    log('yellow', `   → Notification ID: ${createdNotificationId}`);
    log('yellow', `   → Type: ${data.data.type}`);
    log('yellow', `   → Priority: ${data.data.priority}`);
  } else {
    throw new Error(`Failed to send notification: ${data.error}`);
  }
}

// ==========================================
// Test 3: 获取通知列表
// ==========================================
async function test3_getNotifications() {
  log('blue', '\n📋 Test 3: Get Notifications');
  
  const response = await fetch(`${BASE_URL}/api/notifications?limit=10&offset=0`, {
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`
    }
  });
  
  const data = await response.json();
  
  if (response.status === 200 && data.success) {
    log('green', '   ✅ Retrieved notifications successfully');
    log('yellow', `   → Total notifications: ${data.data.length}`);
    if (data.data.length > 0) {
      log('yellow', `   → Latest: ${data.data[0].title}`);
    }
  } else {
    throw new Error(`Failed to get notifications: ${data.error}`);
  }
}

// ==========================================
// Test 4: 获取未读数量
// ==========================================
async function test4_getUnreadCount() {
  log('blue', '\n📋 Test 4: Get Unread Count');
  
  const response = await fetch(`${BASE_URL}/api/notifications/unread/count`, {
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`
    }
  });
  
  const data = await response.json();
  
  if (response.status === 200 && data.success) {
    log('green', '   ✅ Retrieved unread count successfully');
    log('yellow', `   → Unread notifications: ${data.data.count}`);
  } else {
    throw new Error(`Failed to get unread count: ${data.error}`);
  }
}

// ==========================================
// Test 5: 标记单条为已读
// ==========================================
async function test5_markAsRead() {
  if (!createdNotificationId) {
    log('yellow', '\n⚠️  Test 5: Skipped (no notification to mark)');
    return;
  }
  
  log('blue', '\n📋 Test 5: Mark Notification as Read');
  
  const response = await fetch(`${BASE_URL}/api/notifications/${createdNotificationId}/read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`
    }
  });
  
  const data = await response.json();
  
  if (response.status === 200 && data.success) {
    log('green', '   ✅ Marked notification as read');
    log('yellow', `   → Notification ID: ${createdNotificationId}`);
    log('yellow', `   → Read at: ${data.data.read_at}`);
  } else {
    throw new Error(`Failed to mark as read: ${data.error}`);
  }
}

// ==========================================
// Test 6: 标记全部为已读
// ==========================================
async function test6_markAllAsRead() {
  log('blue', '\n📋 Test 6: Mark All as Read');
  
  const response = await fetch(`${BASE_URL}/api/notifications/read-all`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`
    }
  });
  
  const data = await response.json();
  
  if (response.status === 200 && data.success) {
    log('green', '   ✅ Marked all notifications as read');
    log('yellow', `   → Total marked: ${data.data.count}`);
  } else {
    throw new Error(`Failed to mark all as read: ${data.error}`);
  }
}

// 运行测试
runTests().catch(error => {
  log('red', `\n❌ Unexpected error: ${error.message}`);
  process.exit(1);
});

