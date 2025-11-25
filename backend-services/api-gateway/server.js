// server.js
// =======================================================
// API 网关主入口文件
// 作为系统的单一入口，路由所有外部 API 请求到后端微服务
// =======================================================
const express = require('express');
const http = require('http');
const config = require('./src/config');
const mainRouter = require('./src/routes');
const { createWebSocketProxy } = require('./src/middleware/ws-proxy.middleware');

// 引入所有中间件
const corsMiddleware = require('./src/middleware/cors.middleware');
const securityMiddleware = require('./src/middleware/security.middleware');
const requestLogger = require('./src/middleware/requestLogger.middleware');
const notFoundHandler = require('./src/middleware/notFoundHandler.middleware');
const errorHandler = require('./src/middleware/errorHandler.middleware');

// 创建 Express 应用实例
const app = express();
const server = http.createServer(app);  // ✅ 使用http.createServer支持WebSocket

// =======================================================
// 应用中间件（注意：中间件的顺序至关重要）
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
// 错误处理中间件（必须在所有业务路由之后定义）
// =======================================================

// 5. 处理未匹配到的路由 (404 Not Found)
app.use(notFoundHandler);

// 6. 统一的错误处理器，捕获所有从路由和中间件传递过来的错误
app.use(errorHandler);

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// =======================================================
// WebSocket 代理配置（从配置文件读取）
// =======================================================
const wsProxies = config.websocket.proxies;

// 监听upgrade事件（WebSocket握手）
server.on('upgrade', (req, socket, head) => {
  console.log(`[WS Gateway] 📡 Upgrade request received: ${req.url}`);
  
  // 遍历所有代理配置，找到匹配的
  for (const proxyConfig of wsProxies) {
    if (req.url.startsWith(proxyConfig.path)) {
      console.log(`[WS Gateway] 🎯 Matched proxy: ${proxyConfig.name}`);
      const wsProxy = createWebSocketProxy(proxyConfig);
      wsProxy(req, socket, head);
      return;
    }
  }
  
  // 没有匹配的代理，拒绝连接
  console.log(`[WS Gateway] ❌ No proxy found for ${req.url}`);
  socket.write('HTTP/1.1 404 Not Found\r\n');
  socket.write('Content-Type: text/plain\r\n');
  socket.write('\r\n');
  socket.write('WebSocket endpoint not found');
  socket.destroy();
});

// =======================================================
// 启动服务器
// =======================================================
async function startServer() {
  try {
    // 启动HTTP服务器
    server.listen(config.PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════════════════════╗');
      console.log('║       🌐 API Gateway Started Successfully         ║');
      console.log('╠════════════════════════════════════════════════════╣');
      console.log(`║   HTTP Server:   http://localhost:${config.PORT}           ║`);
      console.log('║                                                    ║');
      console.log('║   📡 WebSocket Proxies:                            ║');
      wsProxies.forEach(proxy => {
        const authBadge = proxy.requireAuth ? '🔒' : '🔓';
        console.log(`║   ${authBadge} [${proxy.name}]`);
        console.log(`║     ${proxy.path} -> ${proxy.targetUrl}`);
      });
      console.log('╚════════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 执行服务器启动函数
startServer();