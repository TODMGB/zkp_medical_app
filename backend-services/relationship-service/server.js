// server.js
// =======================================================
// 启动服务器 - 同时启动HTTP和gRPC服务器
// =======================================================
const express = require('express');
const {startServer:startGrpcServer} = require('./src/rpc/server'); 
const mainRouter = require('./src/routes/index');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 50054; // HTTP端口

// 中间件
app.use(express.json());

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'relationship-service' });
});

// 关系管理路由
app.use('/api', mainRouter);

// 使用async函数包装启动过程，以确保在服务器开始接受请求前
// 完成必要的异步初始化任务（如数据库检查）
async function startServer() {
  try {
    // ✅ 初始化MQ连接（确保能发送通知）
    const { getChannel } = require('./src/mq/client');
    try {
      await getChannel();
      console.log('✅ RabbitMQ connected successfully');
    } catch (mqError) {
      console.error('❌ Warning: Failed to connect to RabbitMQ:', mqError.message);
      console.error('   Notifications will not be sent until RabbitMQ is available');
    }
    
    // 启动gRPC服务器（内部通信）
    startGrpcServer();
    
    // 启动HTTP服务器（外部API）
    app.listen(PORT, () => {
      console.log(`🚀 Relationship Service HTTP server running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`🔄 Relationship API: http://localhost:${PORT}/api/relation`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 执行启动函数
startServer();