// src/middleware/ws-proxy.middleware.js
// ==========================================
// WebSocket 代理中间件 - 支持JWT认证
// ==========================================
const http = require('http');
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * 创建WebSocket代理中间件
 * @param {object} proxyConfig - 代理配置
 * @param {string} proxyConfig.name - 服务名称
 * @param {string} proxyConfig.targetUrl - 目标服务地址（如 'ws://localhost:3006'）
 * @param {string} proxyConfig.path - 代理路径（如 '/ws/notification'）
 * @param {boolean} proxyConfig.requireAuth - 是否需要JWT认证
 * @returns {Function} WebSocket代理处理函数
 */
function createWebSocketProxy(proxyConfig) {
  const { name, targetUrl, path, requireAuth = false } = proxyConfig;
  const target = new URL(targetUrl);
  
  return function wsProxyMiddleware(req, socket, head) {
    // 只处理匹配的路径
    if (!req.url.startsWith(path)) {
      return;
    }
    
    console.log(`[${name} WS Proxy] 📡 Proxying ${req.url} -> ${targetUrl}`);
    
    // ==========================================
    // 添加 socket 错误处理（防止进程崩溃）
    // ==========================================
    socket.on('error', (err) => {
      console.error(`[${name} WS Proxy] ❌ Client socket error (early):`, err.message);
      try {
        socket.destroy();
      } catch (e) {
        // 忽略销毁时的错误
      }
    });
    
    // ==========================================
    // JWT 认证（如果需要）
    // ==========================================
    if (requireAuth) {
      try {
        // 从URL参数或Cookie中获取token
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token') || 
                     extractTokenFromCookie(req.headers.cookie);
        
        if (!token) {
          console.error(`[${name} WS Proxy] ❌ No token provided`);
          socket.write('HTTP/1.1 401 Unauthorized\r\n');
          socket.write('Content-Type: text/plain\r\n');
          socket.write('\r\n');
          socket.write('No token provided');
          socket.destroy();
          return;
        }
        
        // 验证JWT token
        const decoded = jwt.verify(token, config.JWT_SECRET);
        console.log(`[${name} WS Proxy] ✅ Token verified for user: ${decoded.smart_account}`);
        
        // 将用户信息添加到请求头（可选，用于后端服务识别）
        req.headers['x-user-smart-account'] = decoded.smart_account;
        req.headers['x-user-role'] = decoded.role || 'user';
        
      } catch (error) {
        console.error(`[${name} WS Proxy] ❌ Token verification failed:`, error.message);
        socket.write('HTTP/1.1 401 Unauthorized\r\n');
        socket.write('Content-Type: text/plain\r\n');
        socket.write('\r\n');
        socket.write(`Authentication failed: ${error.message}`);
        socket.destroy();
        return;
      }
    }
    
    // ==========================================
    // 创建到目标服务的代理连接
    // ==========================================
    // 计算转发路径：将 /ws/xxx 替换为 /ws，保留查询参数
    let forwardPath = req.url;
    if (path === '/ws/notification') {
      forwardPath = req.url.replace('/ws/notification', '/ws');
    } else if (path === '/ws/secure-exchange') {
      forwardPath = req.url.replace('/ws/secure-exchange', '/ws');
    }
    
    const proxyReq = http.request({
      hostname: target.hostname,
      port: target.port || 80,
      path: forwardPath,
      method: req.method,
      headers: {
        ...req.headers,
        host: target.host,  // 重要：修改host头
      }
    });
    
    // ==========================================
    // 转发upgrade请求
    // ==========================================
    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      // 检查目标服务的响应状态
      if (proxyRes.statusCode !== 101) {
        console.error(`[${name} WS Proxy] ❌ Target service rejected upgrade: ${proxyRes.statusCode}`);
        socket.write(`HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n\r\n`);
        socket.destroy();
        return;
      }
      
      // 将目标服务的响应头转发给客户端
      socket.write(`HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n`);
      proxyRes.rawHeaders.forEach((header, i) => {
        if (i % 2 === 0) {
          socket.write(`${header}: ${proxyRes.rawHeaders[i + 1]}\r\n`);
        }
      });
      socket.write('\r\n');
      
      // 建立双向管道
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
      
      console.log(`[${name} WS Proxy] ✅ WebSocket connection established`);
      
      // ==========================================
      // 错误处理
      // ==========================================
      proxySocket.on('error', (err) => {
        console.error(`[${name} WS Proxy] ProxySocket error:`, err.message);
        socket.destroy();
      });
      
      socket.on('error', (err) => {
        console.error(`[${name} WS Proxy] Client socket error:`, err.message);
        proxySocket.destroy();
      });
      
      // ==========================================
      // 断开处理
      // ==========================================
      proxySocket.on('close', () => {
        console.log(`[${name} WS Proxy] 🔌 ProxySocket closed`);
        socket.destroy();
      });
      
      socket.on('close', () => {
        console.log(`[${name} WS Proxy] 🔌 Client socket closed`);
        proxySocket.destroy();
      });
    });
    
    // ==========================================
    // 代理请求错误处理
    // ==========================================
    proxyReq.on('error', (err) => {
      console.error(`[${name} WS Proxy] ❌ Proxy request error:`, err.message);
      
      try {
        if (err.code === 'ECONNREFUSED') {
          socket.write('HTTP/1.1 503 Service Unavailable\r\n');
          socket.write('Content-Type: text/plain\r\n');
          socket.write('\r\n');
          socket.write(`${name} service is unavailable`);
        } else if (err.code === 'ECONNRESET') {
          socket.write('HTTP/1.1 502 Bad Gateway\r\n');
          socket.write('Content-Type: text/plain\r\n');
          socket.write('\r\n');
          socket.write(`${name} service connection reset`);
        } else {
          socket.write('HTTP/1.1 502 Bad Gateway\r\n');
          socket.write('Content-Type: text/plain\r\n');
          socket.write('\r\n');
          socket.write(`Gateway error: ${err.message}`);
        }
        
        socket.destroy();
      } catch (writeError) {
        console.error(`[${name} WS Proxy] ⚠️  Failed to write error response:`, writeError.message);
        try {
          socket.destroy();
        } catch (e) {
          // 忽略销毁错误
        }
      }
    });
    
    // 发送upgrade请求
    proxyReq.end();
  };
}

/**
 * 从Cookie中提取token
 * @param {string} cookieHeader - Cookie头字符串
 * @returns {string|null} Token或null
 */
function extractTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith('token=')) {
      return cookie.substring(6);
    }
  }
  
  return null;
}

module.exports = { createWebSocketProxy };

