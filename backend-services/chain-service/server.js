// server.js
// =======================================================
// Chain 服务主入口文件
// 负责启动 Express 服务器并检测区块链连接
// 提供 Chain 账户抽象服务（Bundler 和 Paymaster）
// =======================================================
const express = require('express');
const { ethers } = require('ethers');
const config = require('./src/config');
const mainRouter = require('./src/routes');

// 引入所有中间件
const corsMiddleware = require('./src/middleware/cors.middleware');
const securityMiddleware = require('./src/middleware/security.middleware');
const requestLogger = require('./src/middleware/requestLogger.middleware');
const notFoundHandler = require('./src/middleware/notFoundHandler.middleware');
const errorHandler = require('./src/middleware/errorHandler.middleware');

// 创建 Express 应用实例
const app = express();


// =======================================================
// 应用中间件（注意：中间件的顺序至关重要）
// =======================================================

// 1. 安全中间件
app.use(securityMiddleware);

// 2. CORS 跨域中间件
app.use(corsMiddleware);

// 3. JSON 请求体解析器
app.use(express.json());

// 4. HTTP 请求日志记录器
app.use(requestLogger);


// =======================================================
// 业务路由
// =======================================================

// 直接使用主路由器（不添加  前缀，由 API Gateway 统一管理）
app.use('/', mainRouter);


// =======================================================
// 错误处理中间件（必须在所有业务路由之后定义）
// =======================================================

// 5. 404 错误处理
app.use(notFoundHandler);

// 6. 统一错误处理器
app.use(errorHandler);

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// =======================================================
// 区块链连接检测
// =======================================================

/**
 * 测试区块链节点连接
 * 检测以太坊 RPC 节点是否可访问，并获取基本网络信息
 * @returns {Promise<boolean>} 返回连接是否成功
 */
async function testBlockchainConnection() {
  console.log('\n🔗 检测区块链连接...');
  console.log('   节点 URL:', config.ethconfig.ethNodeUrl);
  
  try {
    // 创建以太坊 RPC 提供者
    const provider = new ethers.JsonRpcProvider(config.ethconfig.ethNodeUrl);
    
    // 设置 5 秒超时
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('连接超时（5秒）')), 5000)
    );
    
    // 尝试获取网络信息（带超时）
    const network = await Promise.race([
      provider.getNetwork(),
      timeoutPromise
    ]);
    
    // 获取当前区块高度（带超时）
    const blockNumber = await Promise.race([
      provider.getBlockNumber(),
      timeoutPromise
    ]);
    
    console.log('✅ 区块链连接成功');
    console.log('   Chain ID:', network.chainId.toString());
    console.log('   当前区块高度:', blockNumber);
    console.log('   网络名称:', network.name || 'unknown');
    
    return true;
  } catch (error) {
    console.error('❌ 区块链连接失败');
    console.error('   错误:', error.message);
    console.error('\n⚠️  警告: chain 服务需要连接到以太坊节点才能正常工作');
    console.error('   请检查 .env 文件中的 ETH_NODE_URL 配置');
    console.error('   当前配置:', config.ethconfig.ethNodeUrl);
    console.error('\n💡 解决方案:');
    console.error('   1. 启动本地节点: npx hardhat node 或 ganache-cli');
    console.error('   2. 使用测试网: 修改 ETH_NODE_URL 为公共 RPC (如 Sepolia)');
    console.error('   3. 服务将继续启动，但创建账户等功能将无法使用\n');
    
    return false;
  }
}

// =======================================================
// 启动服务器
// =======================================================

/**
 * 异步启动服务器函数
 * 检测区块链连接后启动 HTTP 服务器
 */
async function startServer() {
  try {
    // 先检测区块链连接是否正常
    await testBlockchainConnection();
    
    // ✅ 初始化MQ连接（确保能发送通知）
    const { getChannel } = require('./src/mq/client');
    try {
      await getChannel();
      console.log('✅ RabbitMQ connected successfully');
    } catch (mqError) {
      console.error('❌ Warning: Failed to connect to RabbitMQ:', mqError.message);
      console.error('   Notifications will not be sent until RabbitMQ is available');
    }
    
    // 启动 HTTP 服务器
    app.listen(config.PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log('🚀 Chain 服务已启动');
      console.log('='.repeat(50));
      console.log('服务地址: http://localhost:' + config.PORT);
      console.log('健康检查: http://localhost:' + config.PORT + '/health');
      console.log('区块链节点: ' + config.ethconfig.ethNodeUrl);
      console.log('='.repeat(50) + '\n');
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 执行服务器启动函数
startServer();