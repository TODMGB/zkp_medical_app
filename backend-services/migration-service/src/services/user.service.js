// src/services/user.service.js
const userEntity = require('../entity/user.entity'); // CHANGED: 引入 user.entity
const redisClient = require('../redis/client');
const userRpcClient = require('../rpc/clients/user.client'); 
const mqProducer = require('../mq/producer'); // 引入消息生产者

const USER_CACHE_KEY_PREFIX = 'user:';
const CACHE_TTL = 3600; // 1 hour

/**
 * 按ID查找用户，包含缓存逻辑
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function findUserById(id) {
  const cacheKey = `${USER_CACHE_KEY_PREFIX}${id}`;

  // 1. 尝试从缓存获取 (逻辑不变)
  if (redisClient.isOpen) {
    const cachedUser = await redisClient.get(cacheKey);
    if (cachedUser) {
      console.log(`Cache HIT for user ${id}`);
      return JSON.parse(cachedUser);
    }
  }

  // 2. 缓存未命中，调用 entity 层从数据库获取 (逻辑改变)
  console.log(`Cache MISS for user ${id}`);
  // CHANGED: 不再直接执行SQL，而是调用entity层的方法
  const user = await userEntity.findById(id);

  // 3. 如果找到用户，则存入缓存 (逻辑不变)
  if (user && redisClient.isOpen) {
    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(user));
  }

  return user;
}


/**
 * 创建一个新用户，并主动更新缓存（缓存预热）
 * @param {object} userData
 * @returns {Promise<object>}
 */
async function createUser({ username, email }) {
  // CHANGED: 调用entity层的方法来创建用户
  const newUser = await userEntity.create({ username, email });

  // 最佳实践：创建成功后，主动将新数据写入缓存
  if (newUser && redisClient.isOpen) {
    // 它会异步地将事件发送到消息队列
    mqProducer.publishUserCreated(newUser);
    // 同时，主动将新用户数据写入缓存进行预热
    const cacheKey = `${USER_CACHE_KEY_PREFIX}${newUser.id}`;
    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(newUser));
    console.log(`Cache WARMED for new user ${newUser.id}`);
  }

  return newUser;
}


/**
 * 演示：通过RPC代理来查找用户
 * 这个方法会通过gRPC调用本服务自己暴露的gRPC接口
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function findUserByIdViaRpc(id) {
  try {
    console.log(`[Service] Calling gRPC client for user ID: ${id}`);
    const user = await userRpcClient.getUserById(id);
    return user;
  } catch (error) {
    // 如果RPC调用返回NOT_FOUND，我们将其转换为null
    if (error.code === grpc.status.NOT_FOUND) {
      return null;
    }
    // 其他错误则向上抛出
    throw error;
  }
}

module.exports = {
  findUserById,
  createUser,
  findUserByIdViaRpc,
};