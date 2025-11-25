// tests/test-websocket.js
// ==========================================
// WebSocket 连接测试脚本
// ==========================================

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:3006/socket.io';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzbWFydF9hY2NvdW50IjoiMHgxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4IiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runWebSocketTests() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║        🔌 Notification Service WebSocket Tests    ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  return new Promise((resolve, reject) => {
    log('blue', '📡 Connecting to WebSocket server...');
    log('yellow', `   URL: ${WS_URL}?token=***`);
    
    const ws = new WebSocket(`${WS_URL}?token=${TEST_TOKEN}`);
    
    let isConnected = false;
    let receivedMessages = [];
    let testsPassed = 0;
    let testsTotal = 4;
    
    // ==========================================
    // 连接成功
    // ==========================================
    ws.on('open', () => {
      log('green', '\n✅ Test 1: WebSocket Connection Established');
      isConnected = true;
      testsPassed++;
      
      // 等待欢迎消息后开始测试
      setTimeout(() => {
        runTests(ws);
      }, 1000);
    });
    
    // ==========================================
    // 接收消息
    // ==========================================
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        receivedMessages.push(message);
        
        log('cyan', `\n📥 Received message: ${message.type}`);
        
        switch (message.type) {
          case 'connected':
            log('green', '✅ Test 2: Received Welcome Message');
            log('yellow', `   → Message: ${message.data.message}`);
            log('yellow', `   → User: ${message.data.user_address}`);
            testsPassed++;
            break;
            
          case 'pong':
            log('green', '✅ Test 3: Heartbeat (Ping/Pong) Working');
            log('yellow', `   → Timestamp: ${message.timestamp}`);
            testsPassed++;
            break;
            
          case 'notification':
            log('green', '✅ Received Real-time Notification');
            log('yellow', `   → Title: ${message.data.title}`);
            log('yellow', `   → Type: ${message.data.type}`);
            log('yellow', `   → Priority: ${message.data.priority}`);
            break;
            
          case 'unread_count':
            log('green', '✅ Test 4: Received Unread Count');
            log('yellow', `   → Count: ${message.data.count}`);
            testsPassed++;
            break;
            
          case 'mark_read_success':
            log('green', '✅ Notification Marked as Read');
            log('yellow', `   → Notification ID: ${message.data.notification_id}`);
            break;
            
          default:
            log('cyan', `   → Unknown message type: ${message.type}`);
        }
        
        // 检查是否所有测试都完成
        if (testsPassed >= testsTotal) {
          setTimeout(() => {
            log('green', `\n✅ All WebSocket tests passed! (${testsPassed}/${testsTotal})`);
            ws.close();
            resolve();
          }, 1000);
        }
        
      } catch (error) {
        log('red', `❌ Error parsing message: ${error.message}`);
      }
    });
    
    // ==========================================
    // 连接错误
    // ==========================================
    ws.on('error', (error) => {
      log('red', `\n❌ WebSocket error: ${error.message}`);
      reject(error);
    });
    
    // ==========================================
    // 连接关闭
    // ==========================================
    ws.on('close', () => {
      log('yellow', '\n🔌 WebSocket connection closed');
      if (!isConnected) {
        reject(new Error('Failed to connect to WebSocket server'));
      }
    });
    
    // ==========================================
    // 运行测试
    // ==========================================
    function runTests(ws) {
      log('blue', '\n🧪 Running WebSocket tests...\n');
      
      // Test 3: 发送心跳
      setTimeout(() => {
        log('blue', '📤 Test 3: Sending Ping...');
        ws.send(JSON.stringify({ type: 'ping' }));
      }, 500);
      
      // Test 4: 获取未读数量
      setTimeout(() => {
        log('blue', '📤 Test 4: Getting Unread Count...');
        ws.send(JSON.stringify({ type: 'get_unread_count' }));
      }, 1500);
      
      // Test 5: 标记已读（可选）
      setTimeout(() => {
        log('blue', '📤 Test 5 (Optional): Marking notification as read...');
        ws.send(JSON.stringify({
          type: 'mark_read',
          notification_id: '0x123456' // 示例ID
        }));
      }, 2500);
    }
  });
}

// 运行测试
runWebSocketTests()
  .then(() => {
    log('green', '\n🎉 All tests completed successfully!\n');
    process.exit(0);
  })
  .catch(error => {
    log('red', `\n❌ Tests failed: ${error.message}\n`);
    process.exit(1);
  });

