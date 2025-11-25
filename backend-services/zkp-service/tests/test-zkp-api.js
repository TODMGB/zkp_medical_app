// tests/test-zkp-api.js
// =======================================================
// ZKP 服务 API 测试脚本
// =======================================================
const http = require('http');

const BASE_URL = 'http://localhost:3007';

/**
 * HTTP 请求辅助函数
 */
function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * 测试用例：健康检查
 */
async function testHealthCheck() {
  console.log('\n🧪 测试 1: 健康检查');
  console.log('='.repeat(50));

  try {
    const url = new URL(`${BASE_URL}/api/zkp/health`);
    const result = await httpRequest({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 响应:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200 && result.data.status === 'UP') {
      console.log('✅ 健康检查通过');
      return true;
    } else {
      console.log('❌ 健康检查失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

/**
 * 测试用例：启动证明生成任务
 */
async function testProveWeeklySummary() {
  console.log('\n🧪 测试 2: 启动 ZKP 证明生成任务');
  console.log('='.repeat(50));

  try {
    // 准备测试输入（使用示例数据）
    const testInput = {
      inputs: {
        merkleRoot: "7423237065226347324353380772367382631490014989348495481811164164159255474657",
        leaves: [
          "1117348568668600",
          "197788718819616",
          "318169178969960",
          "503453717598866",
          "75684790322507",
          "758206338560933",
          "770842122412119",
          "801106653726002",
          "940882252616551",
          "980031073956193",
          ...Array(122).fill("0") // 填充剩余的叶子节点
        ]
      }
    };

    const url = new URL(`${BASE_URL}/api/zkp/prove/weekly-summary`);
    const result = await httpRequest({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, testInput);

    console.log('📊 响应状态:', result.status);
    console.log('📊 响应数据:', JSON.stringify(result.data, null, 2));

    if (result.status === 202 && result.data.jobId) {
      console.log('✅ 证明任务启动成功');
      console.log(`📝 任务ID: ${result.data.jobId}`);
      return result.data.jobId;
    } else {
      console.log('❌ 证明任务启动失败');
      return null;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return null;
  }
}

/**
 * 测试用例：查询证明任务状态
 */
async function testProofStatus(jobId, maxAttempts = 10) {
  console.log('\n🧪 测试 3: 查询证明任务状态');
  console.log('='.repeat(50));

  try {
    let attempt = 0;
    
    while (attempt < maxAttempts) {
      attempt++;
      console.log(`\n🔍 第 ${attempt} 次查询 (jobId: ${jobId})...`);

      const url = new URL(`${BASE_URL}/api/zkp/proof-status/${jobId}`);
      const result = await httpRequest({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 响应状态:', result.status);
      console.log('📊 任务状态:', result.data.status);

      if (result.data.status === 'processing') {
        console.log('⏳ 任务处理中，等待 3 秒后重试...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }

      if (result.data.status === 'completed') {
        console.log('✅ 任务完成！');
        console.log('📊 证明数据:', JSON.stringify({
          publicSignals: result.data.data?.publicSignals,
          calldataLength: result.data.data?.calldata?.length || 0
        }, null, 2));
        return true;
      }

      if (result.data.status === 'failed') {
        console.log('❌ 任务失败');
        console.log('📊 错误信息:', result.data.data?.error);
        return false;
      }

      console.log('⚠️  未知状态:', result.data.status);
      return false;
    }

    console.log('⏱️ 超时：任务未在预期时间内完成');
    return false;

  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

/**
 * 测试用例：查询不存在的任务
 */
async function testNonExistentJob() {
  console.log('\n🧪 测试 4: 查询不存在的任务');
  console.log('='.repeat(50));

  try {
    const fakeJobId = '00000000-0000-0000-0000-000000000000';
    const url = new URL(`${BASE_URL}/api/zkp/proof-status/${fakeJobId}`);
    const result = await httpRequest({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 响应状态:', result.status);
    console.log('📊 响应数据:', JSON.stringify(result.data, null, 2));

    if (result.status === 404) {
      console.log('✅ 正确返回 404');
      return true;
    } else {
      console.log('❌ 应该返回 404，实际返回:', result.status);
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║       🧪 ZKP Service API 测试套件                ║');
  console.log('╚════════════════════════════════════════════════════╝');

  let passedTests = 0;
  let totalTests = 0;

  // 测试 1: 健康检查
  totalTests++;
  if (await testHealthCheck()) {
    passedTests++;
  }

  // 测试 2: 启动证明生成任务
  totalTests++;
  const jobId = await testProveWeeklySummary();
  if (jobId) {
    passedTests++;

    // 测试 3: 查询证明任务状态
    totalTests++;
    if (await testProofStatus(jobId)) {
      passedTests++;
    }
  } else {
    console.log('⚠️  跳过测试 3（任务未启动成功）');
  }

  // 测试 4: 查询不存在的任务
  totalTests++;
  if (await testNonExistentJob()) {
    passedTests++;
  }

  // 测试总结
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║                   📊 测试总结                      ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(`║   通过: ${passedTests}/${totalTests} 个测试                                ║`);
  console.log(`║   成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%                                  ║`);
  console.log('╚════════════════════════════════════════════════════╝\n');

  process.exit(passedTests === totalTests ? 0 : 1);
}

// 执行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});

