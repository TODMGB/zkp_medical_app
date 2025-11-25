// examples/test-api.js
// =======================================================
// AI Service API 测试脚本
// =======================================================

const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3002/api',
  timeout: 120000,
});

/**
 * 测试 1: 健康检查
 */
async function testHealth() {
  console.log('\n📋 测试 1: 健康检查\n');
  try {
    const response = await client.get('/health');
    console.log('✅ 健康检查成功');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message);
  }
}

/**
 * 测试 2: 简单对话
 */
async function testSimpleChat() {
  console.log('\n📋 测试 2: 简单对话\n');
  try {
    const response = await client.post('/ai/chat', {
      message: '你好，请用一句话介绍一下你自己',
      history: [],
    });
    console.log('✅ 简单对话成功');
    console.log('问题: 你好，请用一句话介绍一下你自己');
    console.log('回答:', response.data.data.message);
  } catch (error) {
    console.error('❌ 简单对话失败:', error.message);
    if (error.response?.data) {
      console.error('错误详情:', error.response.data);
    }
  }
}

/**
 * 测试 3: 多轮对话
 */
async function testMultiTurnChat() {
  console.log('\n📋 测试 3: 多轮对话\n');
  try {
    const history = [];

    // 第一轮
    console.log('用户: 你好');
    const response1 = await client.post('/ai/chat', {
      message: '你好',
      history: history,
    });
    const reply1 = response1.data.data.message;
    console.log('助手:', reply1);
    history.push({ role: 'user', content: '你好' });
    history.push({ role: 'assistant', content: reply1 });

    // 第二轮
    console.log('\n用户: 你能帮我写一个简单的 JavaScript 函数吗？');
    const response2 = await client.post('/ai/chat', {
      message: '你能帮我写一个简单的 JavaScript 函数吗？',
      history: history,
    });
    const reply2 = response2.data.data.message;
    console.log('助手:', reply2);

    console.log('\n✅ 多轮对话成功');
  } catch (error) {
    console.error('❌ 多轮对话失败:', error.message);
    if (error.response?.data) {
      console.error('错误详情:', error.response.data);
    }
  }
}

/**
 * 测试 4: 多模态对话（文本 + 图片）
 */
async function testMultimodalChat() {
  console.log('\n📋 测试 4: 多模态对话（文本 + 图片）\n');
  try {
    const response = await client.post('/ai/multimodal', {
      content: [
        {
          type: 'text',
          text: '请描述一下这个场景',
        },
        {
          type: 'image_url',
          image_url: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/1200px-Good_Food_Display_-_NCI_Visuals_Online.jpg',
            detail: 'high',
          },
        },
      ],
      history: [],
      options: {
        temperature: 0.7,
        max_tokens: 1024,
      },
    });

    console.log('✅ 多模态对话成功');
    console.log('模型:', response.data.data.model);
    console.log('使用 token:', response.data.data.usage.total_tokens);
    console.log('回答:', response.data.data.choices[0].message.content);
  } catch (error) {
    console.error('❌ 多模态对话失败:', error.message);
    if (error.response?.data) {
      console.error('错误详情:', error.response.data);
    }
  }
}

/**
 * 测试 5: 图片分析
 */
async function testImageAnalysis() {
  console.log('\n📋 测试 5: 图片分析\n');
  try {
    const response = await client.post('/ai/image', {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/1200px-Good_Food_Display_-_NCI_Visuals_Online.jpg',
      question: '这张图片中有哪些食物？',
      options: {
        detail: 'high',
      },
    });

    console.log('✅ 图片分析成功');
    console.log('问题: 这张图片中有哪些食物？');
    console.log('分析结果:', response.data.data.analysis);
  } catch (error) {
    console.error('❌ 图片分析失败:', error.message);
    if (error.response?.data) {
      console.error('错误详情:', error.response.data);
    }
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🧪 AI Service API 测试');
  console.log('='.repeat(60));

  await testHealth();
  await testSimpleChat();
  await testMultiTurnChat();
  await testMultimodalChat();
  await testImageAnalysis();

  console.log('\n' + '='.repeat(60));
  console.log('✅ 测试完成');
  console.log('='.repeat(60) + '\n');
}

// 运行测试
runAllTests().catch(console.error);
