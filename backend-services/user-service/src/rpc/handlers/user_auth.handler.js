// src/rpc/handlers/user_auth.handler.js
const userService = require('../../services/user.service');
const userEntity = require('../../entity/user.entity');
const grpc = require('@grpc/grpc-js');

async function register(call, callback) {
  try {
    console.log(call.request);
    const user = await userService.registerUser(call.request);
    callback(null, { user });
  } catch (error) {
    // ... 错误处理
    callback({ code: grpc.status.INTERNAL, details: 'Registration failed.' });
  }
}

async function login(call, callback) {
  try {
    const { token, user } = await userService.loginUser(call.request);
    callback(null, { token, user });
  } catch (error) {
    let statusCode = grpc.status.INTERNAL;
    if (error.type === 'AUTH_ERROR') statusCode = grpc.status.UNAUTHENTICATED;
    if (error.type === 'NOT_FOUND') statusCode = grpc.status.NOT_FOUND;
    callback({ code: statusCode, details: error.message });
  }
}

/**
 * 获取用户的加密公钥
 * @param {Object} call - gRPC call 对象
 * @param {Function} callback - 回调函数
 */
async function getUserPublicKey(call, callback) {
  try {
    const { smart_account } = call.request;
    
    if (!smart_account) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        details: 'smart_account is required'
      });
    }

    console.log(`[RPC] 查询用户加密公钥: ${smart_account}`);
    
    // 查询用户信息
    const user = await userEntity.findUserBySmartAccount(smart_account.toLowerCase());
    
    if (!user) {
      return callback({
        code: grpc.status.NOT_FOUND,
        details: 'User not found'
      });
    }

    if (!user.encryption_public_key) {
      return callback({
        code: grpc.status.NOT_FOUND,
        details: 'User has not registered encryption public key'
      });
    }

    console.log(`[RPC] 找到加密公钥: ${user.encryption_public_key.substring(0, 20)}...`);
    
    callback(null, {
      smart_account: user.smart_account,
      encryption_public_key: user.encryption_public_key,
      encryption_key_updated_at: user.encryption_key_updated_at ? user.encryption_key_updated_at.toISOString() : null
    });

  } catch (error) {
    console.error('[RPC] 获取加密公钥失败:', error);
    callback({
      code: grpc.status.INTERNAL,
      details: 'Failed to get user public key'
    });
  }
}

module.exports = { register, login, getUserPublicKey };