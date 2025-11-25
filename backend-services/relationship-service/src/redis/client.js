// src/redis/client.js
// =======================================================
// Redis 客户端配置
// 创建并导出 Redis 客户端实例，用于缓存和会话管理
// =======================================================
const { createClient } = require('redis');
const config = require('../config');

// 创建 Redis 客户端实例
const redisClient = createClient({
  url: config.redis.url,
});

// 监听 Redis 客户端错误事件
redisClient.on('error', (err) => console.error('Redis 客户端错误:', err));

// 立即执行的异步函数来连接 Redis
// 使用 IIFE (Immediately Invoked Function Expression) 模式
(async () => {
  try {
    await redisClient.connect();
    console.log('✅ Redis 连接成功');
  } catch (err) {
    console.error('❌ Redis 连接失败:', err);
  }
})();

// 导出 Redis 客户端实例供其他模块使用
module.exports = redisClient;