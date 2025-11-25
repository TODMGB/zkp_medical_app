// server.js
// =======================================================
// ZKP 服务主入口文件
// =======================================================
const express = require('express');
const config = require('./src/config');
const mainRouter = require('./src/routes');

// 引入所有中间件
const corsMiddleware = require('./src/middleware/cors.middleware');
const securityMiddleware = require('./src/middleware/security.middleware');
const requestLogger = require('./src/middleware/requestLogger.middleware');
const notFoundHandler = require('./src/middleware/notFoundHandler.middleware');
const errorHandler = require('./src/middleware/errorHandler.middleware');

// 引入 MQ 生产者（用于发送通知）
const { initMQ } = require('./src/mq/producer');

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

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP',
    service: 'zkp-service',
    timestamp: new Date().toISOString()
  });
});

// =======================================================
// 启动服务器
// =======================================================

async function startServer() {
  try {
    // 初始化 RabbitMQ 连接（用于发送通知）
    await initMQ();
    console.log('✅ RabbitMQ Producer initialized');

    // 启动Express服务器监听指定端口
    app.listen(config.PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════════════════════╗');
      console.log('║       🔐 ZKP Service Started Successfully         ║');
      console.log('╠════════════════════════════════════════════════════╣');
      console.log(`║   HTTP Server:   http://localhost:${config.PORT}           ║`);
      console.log('║                                                    ║');
      console.log('║   📡 API Endpoints:                                ║');
      console.log('║     POST /api/zkp/prove/weekly-summary             ║');
      console.log('║     GET  /api/zkp/proof-status/:jobId              ║');
      console.log('║     GET  /api/zkp/health                           ║');
      console.log('╚════════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start ZKP service:', error);
    process.exit(1);
  }
}

// 执行启动函数
startServer();