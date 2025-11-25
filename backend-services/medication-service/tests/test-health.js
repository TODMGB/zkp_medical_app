// tests/test-health.js
// ==========================================
// 健康检查测试
// ==========================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:3007';

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testHealthCheck() {
  console.log('\n' + '='.repeat(60));
  log('bright', '🏥 医药服务健康检查测试');
  console.log('='.repeat(60) + '\n');

  try {
    log('blue', '📋 测试 1: 服务健康检查');
    log('cyan', `   → 请求: GET ${BASE_URL}/api/health`);

    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();

    if (response.status === 200 && data.status === 'UP') {
      log('green', '   ✅ 服务运行正常');
      log('yellow', `   → 服务名称: ${data.service}`);
      log('yellow', `   → 版本: ${data.version}`);
      log('yellow', `   → 状态: ${data.status}`);
    } else {
      throw new Error(`健康检查失败: ${JSON.stringify(data)}`);
    }

    console.log('\n' + '='.repeat(60));
    log('green', '✅ 所有健康检查测试通过！');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    log('red', `❌ 测试失败: ${error.message}`);
    console.log('='.repeat(60) + '\n');
    
    if (error.cause) {
      log('red', `原因: ${error.cause.message}`);
    }
    
    process.exit(1);
  }
}

// 运行测试
testHealthCheck();

