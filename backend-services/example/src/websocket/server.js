// src/websocket/server.js
// ==========================================
// WebSocket 服务器 - 使用原生ws库
// ==========================================
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config');
const redis = require('../redis/client');

// 存储所有活跃连接 Map<userAddress, WebSocket>
const connections = new Map();

/**
 * 初始化WebSocket服务器
 * @param {WebSocket.Server} wss - WebSocket服务器实例
 */
function initializeWebSocket(wss) {
  console.log('[WebSocket] Initializing WebSocket server...');
  
  wss.on('connection', async (ws, req) => {
    let userAddress = null;
    let userRole = null;
    
    try {
      // ==========================================
      // 认证方式1：从API Gateway代理转发的请求头获取用户信息（推荐）
      // ==========================================
      if (req.headers['x-user-smart-account']) {
        // 通过API Gateway代理，用户已经过网关认证
        userAddress = req.headers['x-user-smart-account'];
        userRole = req.headers['x-user-role'] || 'user';
        console.log('[WebSocket] ✅ Authenticated via API Gateway proxy');
        console.log(`[WebSocket] User: ${userAddress}, Role: ${userRole}`);
      } 
      // ==========================================
      // 认证方式2：直接连接，使用JWT token认证（兼容模式）
      // ==========================================
      else {
        // 从URL参数获取token
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        
        if (!token) {
          console.log('[WebSocket] ❌ Connection rejected: No token or user info provided');
          ws.close(1008, 'No authentication provided');
          return;
        }
        
        // 验证JWT token
        const decoded = jwt.verify(token, config.JWT_SECRET);
        userAddress = decoded.smart_account;
        userRole = decoded.role || 'user';
        
        if (!userAddress) {
          console.log('[WebSocket] ❌ Connection rejected: Invalid token payload');
          ws.close(1008, 'Invalid token');
          return;
        }
        
        console.log('[WebSocket] ✅ Authenticated via direct JWT token');
        console.log(`[WebSocket] User: ${userAddress}, Role: ${userRole}`);
      }
      
      // 保存用户信息到WebSocket实例（统一使用小写地址）
      const normalizedAddress = userAddress.toLowerCase();
      ws.userAddress = normalizedAddress;
      ws.userRole = userRole;
      ws.isAlive = true;
      
      // 存储连接
      connections.set(normalizedAddress, ws);
      
      // 保存在线状态到Redis
      await redis.set(`ws:service:${normalizedAddress}`, 'connected', { EX: 3600 }); // 1小时过期
      await redis.hSet('online_users', normalizedAddress, Date.now().toString());
      
      console.log(`[WebSocket] ✅ User connected: ${normalizedAddress} (Total: ${connections.size})`);
      
      // 发送欢迎消息
      sendToClient(ws, {
        type: 'connected',
        data: {
          userAddress: normalizedAddress,
          timestamp: Date.now()
        }
      });
      
      // ==========================================
      // 处理客户端消息
      // ==========================================
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          handleClientMessage(ws, message);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error.message);
          sendToClient(ws, {
            type: 'error',
            message: 'Invalid message format'
          });
        }
      });
      
      // ==========================================
      // 处理连接关闭
      // ==========================================
      ws.on('close', async () => {
        console.log(`[WebSocket] ❌ User disconnected: ${normalizedAddress} (Total: ${connections.size - 1})`);
        
        // 移除连接
        connections.delete(normalizedAddress);
        
        // 移除Redis在线状态
        try {
          await redis.del(`ws:service:${normalizedAddress}`);
          await redis.hDel('online_users', normalizedAddress);
        } catch (error) {
          console.error('[WebSocket] Error cleaning up Redis:', error.message);
        }
      });
      
      // ==========================================
      // 处理错误
      // ==========================================
      ws.on('error', (error) => {
        console.error(`[WebSocket] Connection error for ${normalizedAddress}:`, error.message);
      });
      
      // ==========================================
      // Pong响应（心跳）
      // ==========================================
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
    } catch (error) {
      console.error('[WebSocket] Authentication error:', error.message);
      ws.close(1008, 'Authentication failed');
    }
  });
  
  // ==========================================
  // 心跳检测（每30秒）
  // ==========================================
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log(`[WebSocket] ⏱ Terminating inactive connection: ${ws.userAddress}`);
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, config.websocket.heartbeatInterval);
  
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });
  
  console.log('[WebSocket] ✅ WebSocket server initialized successfully');
}

/**
 * 处理客户端消息
 * @param {WebSocket} ws - WebSocket连接
 * @param {Object} message - 消息对象
 */
function handleClientMessage(ws, message) {
  console.log(`[WebSocket] Received message from ${ws.userAddress}:`, message.type);
  
  switch (message.type) {
    case 'ping':
      // 心跳响应
      sendToClient(ws, {
        type: 'pong',
        timestamp: Date.now()
      });
      break;
      
    default:
      console.log(`[WebSocket] Unknown message type: ${message.type}`);
      sendToClient(ws, {
        type: 'error',
        message: `Unknown message type: ${message.type}`
      });
  }
}

/**
 * 发送消息到客户端
 * @param {WebSocket} ws - WebSocket连接
 * @param {Object} data - 要发送的数据
 */
function sendToClient(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * 发送消息到指定用户
 * @param {string} userAddress - 用户地址
 * @param {Object} data - 要发送的数据
 * @returns {boolean} 是否发送成功
 */
function sendToUser(userAddress, data) {
  const normalizedAddress = userAddress.toLowerCase();
  const ws = connections.get(normalizedAddress);
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendToClient(ws, data);
    console.log(`[WebSocket] ✅ Message sent to ${normalizedAddress}`);
    return true;
  }
  
  console.log(`[WebSocket] ⚠️ User ${normalizedAddress} is not connected`);
  return false;
}

/**
 * 广播消息给所有在线用户
 * @param {Object} data - 要发送的数据
 * @param {Function} filter - 过滤函数，返回true则发送
 */
function broadcast(data, filter = null) {
  let count = 0;
  connections.forEach((ws, userAddress) => {
    if (!filter || filter(userAddress, ws)) {
      if (ws.readyState === WebSocket.OPEN) {
        sendToClient(ws, data);
        count++;
      }
    }
  });
  console.log(`[WebSocket] 📢 Broadcast to ${count} users`);
  return count;
}

/**
 * 检查用户是否在线
 * @param {string} userAddress - 用户地址
 * @returns {boolean}
 */
function isUserOnline(userAddress) {
  const normalizedAddress = userAddress.toLowerCase();
  return connections.has(normalizedAddress);
}

/**
 * 获取在线用户数量
 * @returns {number}
 */
function getOnlineCount() {
  return connections.size;
}

/**
 * 获取所有在线用户地址
 * @returns {string[]}
 */
function getOnlineUsers() {
  return Array.from(connections.keys());
}

module.exports = {
  initializeWebSocket,
  sendToUser,
  broadcast,
  isUserOnline,
  getOnlineCount,
  getOnlineUsers
};

