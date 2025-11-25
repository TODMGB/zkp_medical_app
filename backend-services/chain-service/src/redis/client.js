// src/redis/client.js
const { createClient } = require('redis');
const config = require('../config');

const redisClient = createClient({
  url: config.redis.url,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

//立即执行的异步函数来连接Redis
(async () => {
  try {
    await redisClient.connect();
    console.log('Redis connected successfully.');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
})();

module.exports = redisClient;