// src/redis/client.js
const { createClient } = require('redis');
const config = require('../config');

const redisClient = createClient({
  url: config.redis.url,
  socket: {
    reconnectStrategy: (retries) => {
      // 指数退避重连策略
      if (retries > 10) {
        console.error('❌ Redis 重连失败次数过多，停止重连');
        return new Error('Redis 重连失败次数过多');
      }
      const delay = Math.min(retries * 100, 3000);
      console.log(`⏳ Redis 重连中... (第 ${retries} 次，延迟 ${delay}ms)`);
      return delay;
    },
    connectTimeout: 10000,
  },
  // 启用离线队列，连接断开时缓存命令
  enableOfflineQueue: true,
});

// 错误处理
redisClient.on('error', (err) => {
  console.error('❌ Redis 客户端错误:', err.message);
});

// 连接成功
redisClient.on('connect', () => {
  console.log('🔄 Redis 正在连接...');
});

// 准备就绪
redisClient.on('ready', () => {
  console.log('✅ Redis 已准备就绪');
});

// 重新连接
redisClient.on('reconnecting', () => {
  console.log('🔄 Redis 正在重新连接...');
});

// 连接断开
redisClient.on('end', () => {
  console.log('⚠️  Redis 连接已断开');
});

// 立即执行的异步函数来连接 Redis
(async () => {
  try {
    // 添加连接超时，避免阻塞
    const connectPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Redis连接超时')), 5000);
    });
    
    await Promise.race([connectPromise, timeoutPromise]);
    console.log('✅ Redis 初始连接成功');
  } catch (err) {
    console.error('❌ Redis 初始连接失败:', err.message);
    console.log('⏳ 将在后台自动重试...');
    console.log('💡 如果不需要Redis功能，可以忽略此错误');
  }
})();

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('⏹️  正在关闭 Redis 连接...');
  await redisClient.quit();
  process.exit(0);
});

module.exports = redisClient;