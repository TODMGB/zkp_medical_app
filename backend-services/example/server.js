// server.js
// ==========================================
// 微服务主入口文件
// ==========================================
const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const config = require('./src/config');
const mainRouter = require('./src/routes');

// 引入所有中间件
const corsMiddleware = require('./src/middleware/cors.middleware');
const securityMiddleware = require('./src/middleware/security.middleware');
const requestLogger = require('./src/middleware/requestLogger.middleware');
const notFoundHandler = require('./src/middleware/notFoundHandler.middleware');
const errorHandler = require('./src/middleware/errorHandler.middleware');

// 引入WebSocket服务器和MQ消费者
const wsServer = require('./src/websocket/server');
const { startConsumers } = require('./src/mq');

const app = express();

// =======================================================
// 应用中间件 (顺序至关重要)
// =======================================================

// 1. 安全中间件，应尽早应用以保护所有后续请求
app.use(securityMiddleware);

// 2. 跨域策略，允许指定的前端源访问API
app.use(corsMiddleware);

// 3. JSON请求体解析器，以便在后续中间件和路由中访问 req.body
app.use(express.json());

// 4. HTTP请求日志记录器，记录所有进入的请求
app.use(requestLogger);

// =======================================================
// 业务路由
// =======================================================

// 将所有以 /api 开头的请求都路由到主路由器
app.use('/api', mainRouter);

// =======================================================
// 错误处理中间件 (必须在所有业务路由之后定义)
// =======================================================

// 5. 处理未匹配到的路由 (404 Not Found)
app.use(notFoundHandler);

// 6. 统一的错误处理器，捕获所有从路由和中间件传递过来的错误
app.use(errorHandler);

// =======================================================
// 启动服务器
// =======================================================

async function startServer() {
  try {
    console.log('='.repeat(60));
    console.log('🔧 正在初始化微服务...');
    console.log('='.repeat(60));

    // 1. 创建HTTP服务器
    const server = http.createServer(app);

    // 2. 创建WebSocket服务器（使用同一个HTTP server）
    const wss = new WebSocket.Server({ 
      server,
      path: config.websocket.path  // 默认 /ws
    });
    
    // 3. 初始化WebSocket服务器
    wsServer.initializeWebSocket(wss);
    console.log('✅ WebSocket服务器已启动');

    // 4. 启动MQ消费者（可选，如果服务不需要消费MQ消息可以注释掉）
    await startConsumers(wss);
    console.log('✅ MQ消费者已启动');

    // 5. 启动HTTP服务器监听指定端口（HTTP和WebSocket共用同一端口）
    server.listen(config.PORT, () => {
      console.log('='.repeat(60));
      console.log('🚀 微服务启动成功！');
      console.log('='.repeat(60));
      console.log(`📡 HTTP API:    http://localhost:${config.PORT}`);
      console.log(`🔌 WebSocket:   ws://localhost:${config.PORT}${config.websocket.path}`);
      console.log(`🏥 Health:      http://localhost:${config.PORT}/api/health`);
      console.log('='.repeat(60));
    });

    // 优雅关闭
    process.on('SIGTERM', () => {
      console.log('🔄 收到 SIGTERM 信号，正在优雅关闭...');
      wss.close(() => {
        console.log('✅ WebSocket服务器已关闭');
      });
      server.close(() => {
        console.log('✅ HTTP服务器已关闭');
        console.log('👋 服务器已完全关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n🔄 收到 SIGINT 信号，正在优雅关闭...');
      wss.close(() => {
        console.log('✅ WebSocket服务器已关闭');
      });
      server.close(() => {
        console.log('✅ HTTP服务器已关闭');
        console.log('👋 服务器已完全关闭');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('='.repeat(60));
    console.error('❌ 服务器启动失败:', error);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// 执行启动函数
startServer();
