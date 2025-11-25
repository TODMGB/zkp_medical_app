// server.js
// =======================================================
// 用户服务主入口文件
// 负责启动 Express 服务器、gRPC 服务器和消息队列消费者
// =======================================================
const express = require('express');
const config = require('./src/config');
const mainRouter = require('./src/routes');

// 引入所有中间件
const corsMiddleware = require('./src/middleware/cors.middleware');                 // CORS 跨域中间件
const securityMiddleware = require('./src/middleware/security.middleware');         // 安全中间件
const requestLogger = require('./src/middleware/requestLogger.middleware');         // 请求日志中间件
const notFoundHandler = require('./src/middleware/notFoundHandler.middleware');     // 404 处理中间件
const errorHandler = require('./src/middleware/errorHandler.middleware');           // 错误处理中间件
const startGrpcServer = require('./src/rpc/server');                               // gRPC 服务器
const { startConsumers } = require('./src/mq');                                    // 消息队列消费者

// 创建 Express 应用实例
const app = express();

// =======================================================
// 应用中间件（注意：中间件的顺序至关重要）
// =======================================================

// 1. 安全中间件 - 应尽早应用以保护所有后续请求
app.use(securityMiddleware);

// 2. CORS 跨域中间件 - 允许指定的前端源访问 API
app.use(corsMiddleware);

// 3. JSON 请求体解析器 - 解析 JSON 格式的请求体，使 req.body 可用
app.use(express.json());

// 4. HTTP 请求日志记录器 - 记录所有进入的 HTTP 请求
app.use(requestLogger);

// =======================================================
// 业务路由
// =======================================================

// 将所有以 /api 开头的请求路由到主路由器
app.use('/api', mainRouter);

// =======================================================
// 错误处理中间件（必须在所有业务路由之后定义）
// =======================================================

// 5. 404 错误处理 - 处理未匹配到的路由
app.use(notFoundHandler);

// 6. 统一错误处理器 - 捕获并处理所有错误
app.use(errorHandler);

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// =======================================================
// 启动服务器
// =======================================================

/**
 * 异步启动服务器函数
 * 顺序启动 gRPC 服务器、消息队列消费者和 HTTP 服务器
 */
async function startServer() {
  try {
    // 启动 gRPC 服务器
    startGrpcServer();

    // 启动消息队列消费者
    await startConsumers();
    
    // 启动 Express HTTP 服务器
    app.listen(config.PORT, () => {
      console.log(`🚀 用户服务运行在 http://localhost:${config.PORT}`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 执行服务器启动函数
startServer();