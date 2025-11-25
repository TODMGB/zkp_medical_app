// server.js - Migration Service
const express = require('express');
const config = require('./src/config');
const mainRouter = require('./src/routes');
const migrationService = require('./src/services/migration.service');

// 引入中间件
const corsMiddleware = require('./src/middleware/cors.middleware');
const securityMiddleware = require('./src/middleware/security.middleware');
const requestLogger = require('./src/middleware/requestLogger.middleware');
const notFoundHandler = require('./src/middleware/notFoundHandler.middleware');
const errorHandler = require('./src/middleware/errorHandler.middleware');

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

// 健康检查接口
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP',
    service: 'migration-service',
    timestamp: Date.now()
  });
});

// =======================================================
// 启动服务器
// =======================================================

async function startServer() {
  try {
    // 初始化数据库表
    await migrationService.initializeDatabase();
    
    // ✅ 初始化MQ连接（确保能发送通知）
    const { getChannel } = require('./src/mq/client');
    try {
      await getChannel();
      console.log('✅ RabbitMQ connected successfully');
    } catch (mqError) {
      console.error('❌ Warning: Failed to connect to RabbitMQ:', mqError.message);
      console.error('   Notifications will not be sent until RabbitMQ is available');
    }
    
    // 启动定时清理任务
    migrationService.startCleanupTask();
    
    // 启动Express服务器监听指定端口
    app.listen(config.PORT, () => {
      console.log(`🚀 Migration Service is running on http://localhost:${config.PORT}`);
      console.log(`📋 Health check: http://localhost:${config.PORT}/health`);
      console.log(`🔄 Migration API: http://localhost:${config.PORT}/api/migration`);
    });
  } catch (error) {
    console.error('❌ Failed to start migration server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭迁移服务器...');
  process.exit(0);
});

// 执行启动函数
startServer();