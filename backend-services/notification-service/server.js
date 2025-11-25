// server.js
// ==========================================
// Notification Service 主入口
// ==========================================
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const config = require('./src/config');
const mainRouter = require('./src/routes');


// 引入所有中间件 (使用新的.middleware.js后缀)
const corsMiddleware = require('./src/middleware/cors.middleware');
const securityMiddleware = require('./src/middleware/security.middleware');
const requestLogger = require('./src/middleware/requestLogger.middleware');
const notFoundHandler = require('./src/middleware/notFoundHandler.middleware');
const errorHandler = require('./src/middleware/errorHandler.middleware');
const startGrpcServer = require('./src/rpc/server'); 
const { startConsumers } = require('./src/mq'); 
const { initializeWebSocket } = require('./src/websocket/server');

const app = express();
const server = http.createServer(app);  // ✅ 使用http.createServer

// ==========================================
// 创建WebSocket服务器
// ==========================================
const wss = new WebSocket.Server({
  server,  // ✅ 附加到HTTP服务器
  path: config.websocket.path  // WebSocket路径: /socket.io
});

console.log(`[Server] WebSocket path: ${config.websocket.path}`);


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

// 根路径健康检查
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'notification-service',
    websocket: {
      path: config.websocket.path,
      clients: wss.clients.size
    },
    timestamp: new Date().toISOString()
  });
});

// =======================================================
// 启动服务器
// =======================================================
async function startServer() {
  try {
    console.log('[Server] 🚀 Starting Notification Service...');
    
    // 1. 初始化WebSocket服务器
    initializeWebSocket(wss);
    
    // 2. 启动gRPC服务器
    startGrpcServer();
    
    // 3. 启动MQ消费者（传入wss实例）
    await startConsumers(wss);
    
    // 4. 启动HTTP服务器
    server.listen(config.PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════════════════════╗');
      console.log('║   🔔 Notification Service Started Successfully    ║');
      console.log('╠════════════════════════════════════════════════════╣');
      console.log(`║   HTTP Server:   http://localhost:${config.PORT}           ║`);
      console.log(`║   WebSocket:     ws://localhost:${config.PORT}${config.websocket.path}   ║`);
      console.log(`║   gRPC Server:   localhost:${config.GRPC_PORT}             ║`);
      console.log('╚════════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 执行启动函数
startServer();

module.exports = { wss };