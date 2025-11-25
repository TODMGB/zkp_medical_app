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
      await redis.set(`ws:${normalizedAddress}`, 'connected', 'EX', 3600); // 1小时过期
      await redis.hSet('online_users', normalizedAddress, Date.now().toString());
      
      console.log(`[WebSocket] ✅ User connected: ${normalizedAddress} (Total: ${connections.size})`);
      
      // 发送欢迎消息
      sendToClient(ws, {
        type: 'connected',
        data: {
          message: 'Connected to notification service',
          user_address: userAddress,
          timestamp: Date.now()
        }
      });
      
      // ==========================================
      // 消息处理
      // ==========================================
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          // 心跳响应
          if (data.type === 'ping') {
            ws.isAlive = true;
            sendToClient(ws, { type: 'pong', timestamp: Date.now() });
            return;
          }
          
          // 标记通知已读
          if (data.type === 'mark_read') {
            await handleMarkRead(userAddress, data.notification_id);
            sendToClient(ws, {
              type: 'mark_read_success',
              data: { notification_id: data.notification_id }
            });
            return;
          }
          
          // 获取未读通知数量
          if (data.type === 'get_unread_count') {
            const count = await getUnreadCount(userAddress);
            sendToClient(ws, {
              type: 'unread_count',
              data: { count }
            });
            return;
          }
          
          console.log(`[WebSocket] Message from ${userAddress}:`, data.type);
          
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error.message);
          sendToClient(ws, {
            type: 'error',
            data: { message: 'Invalid message format' }
          });
        }
      });
      
      // ==========================================
      // Pong 响应（心跳检测）
      // ==========================================
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      // ==========================================
      // 断开连接处理
      // ==========================================
      ws.on('close', async () => {
        if (ws.userAddress) {
          console.log(`[WebSocket] User disconnected: ${ws.userAddress} (Remaining: ${connections.size - 1})`);
          connections.delete(ws.userAddress);
          await redis.del(`ws:${ws.userAddress}`);
          await redis.hDel('online_users', ws.userAddress);
        }
      });
      
      // ==========================================
      // 错误处理
      // ==========================================
      ws.on('error', (error) => {
        console.error(`[WebSocket] Error for ${ws.userAddress || 'unknown'}:`, error.message);
      });
      
    } catch (error) {
      console.error('[WebSocket] Connection error:', error.message);
      ws.close(1008, 'Authentication failed');
    }
  });
  
  // ==========================================
  // 定期清理死连接（心跳检测）
  // ==========================================
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log(`[WebSocket] Terminating dead connection: ${ws.userAddress}`);
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, config.websocket.heartbeatInterval);
  
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });
  
  console.log('[WebSocket] ✅ Server initialized successfully');
}

// ==========================================
// 工具函数
// ==========================================

/**
 * 向客户端发送消息
 * @param {WebSocket} ws - WebSocket连接
 * @param {object} data - 要发送的数据
 */
function sendToClient(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * 向特定用户发送通知
 * @param {string} userAddress - 用户地址
 * @param {object} data - 通知数据
 * @returns {boolean} 是否发送成功
 */
async function sendToUser(userAddress, data) {
  // 统一使用小写地址
  const normalizedAddress = userAddress.toLowerCase();
  const ws = connections.get(normalizedAddress);
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendToClient(ws, data);
    console.log(`[WebSocket] 📤 Sent ${data.type} to ${normalizedAddress}`);
    return true;
  }
  
  console.log(`[WebSocket] ⚠️ User ${normalizedAddress} is offline`);
  return false;
}

/**
 * 广播给所有在线用户
 * @param {object} data - 要广播的数据
 */
function broadcast(data) {
  const message = JSON.stringify(data);
  let count = 0;
  
  connections.forEach((ws, userAddress) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      count++;
    }
  });
  
  console.log(`[WebSocket] 📡 Broadcast to ${count} users`);
}

/**
 * 获取在线用户列表
 * @returns {Array<string>} 在线用户地址列表
 */
function getOnlineUsers() {
  return Array.from(connections.keys());
}

/**
 * 检查用户是否在线
 * @param {string} userAddress - 用户地址
 * @returns {boolean} 是否在线
 */
function isUserOnline(userAddress) {
  const normalizedAddress = userAddress.toLowerCase();
  const ws = connections.get(normalizedAddress);
  return ws && ws.readyState === WebSocket.OPEN;
}

/**
 * 获取在线用户数量
 * @returns {number} 在线用户数量
 */
function getOnlineCount() {
  return connections.size;
}

/**
 * 处理标记通知已读
 * @param {string} userAddress - 用户地址
 * @param {string} notificationId - 通知ID
 */
async function handleMarkRead(userAddress, notificationId) {
  try {
    const notificationService = require('../services/notification.service');
    await notificationService.markAsRead(notificationId, userAddress);
    console.log(`[WebSocket] Notification ${notificationId} marked as read by ${userAddress}`);
  } catch (error) {
    console.error('[WebSocket] Error marking notification as read:', error.message);
    throw error;
  }
}

/**
 * 获取未读通知数量
 * @param {string} userAddress - 用户地址
 * @returns {Promise<number>} 未读数量
 */
async function getUnreadCount(userAddress) {
  try {
    const notificationService = require('../services/notification.service');
    return await notificationService.getUnreadCount(userAddress);
  } catch (error) {
    console.error('[WebSocket] Error getting unread count:', error.message);
    return 0;
  }
}

module.exports = {
  initializeWebSocket,
  sendToUser,
  broadcast,
  getOnlineUsers,
  isUserOnline,
  getOnlineCount,
};

