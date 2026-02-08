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

/**
 * 通过智能账户地址查询EOA地址
 * @param {Object} call - gRPC call 对象
 * @param {Function} callback - 回调函数
 */
async function getEOABySmartAccount(call, callback) {
  try {
    const { smart_account } = call.request;
    
    if (!smart_account) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        details: 'smart_account is required'
      });
    }

    console.log(`[RPC] 查询智能账户 ${smart_account} 的EOA地址`);
    
    // 查询用户信息
    const user = await userEntity.findUserBySmartAccount(smart_account.toLowerCase());
    
    if (!user) {
      console.log(`[RPC] 未找到智能账户 ${smart_account}`);
      return callback(null, {
        smart_account: smart_account,
        eoa_address: '',
        found: false
      });
    }

    console.log(`[RPC] 找到EOA地址: ${user.eoa_address}`);
    
    callback(null, {
      smart_account: user.smart_account,
      eoa_address: user.eoa_address,
      found: true
    });

  } catch (error) {
    console.error('[RPC] 查询EOA地址失败:', error);
    callback({
      code: grpc.status.INTERNAL,
      details: 'Failed to get EOA address'
    });
  }
}

/**
 * 批量查询智能账户地址对应的EOA地址
 * @param {Object} call - gRPC call 对象
 * @param {Function} callback - 回调函数
 */
async function batchGetEOABySmartAccounts(call, callback) {
  try {
    const { smart_accounts } = call.request;
    
    if (!smart_accounts || smart_accounts.length === 0) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        details: 'smart_accounts array is required and cannot be empty'
      });
    }

    console.log(`[RPC] 批量查询 ${smart_accounts.length} 个智能账户的EOA地址`);
    
    // 批量查询
    const mappings = await Promise.all(
      smart_accounts.map(async (smart_account) => {
        try {
          const user = await userEntity.findUserBySmartAccount(smart_account.toLowerCase());
          return {
            smart_account: smart_account,
            eoa_address: user ? user.eoa_address : '',
            found: !!user
          };
        } catch (error) {
          console.error(`[RPC] 查询 ${smart_account} 失败:`, error);
          return {
            smart_account: smart_account,
            eoa_address: '',
            found: false
          };
        }
      })
    );

    const foundCount = mappings.filter(m => m.found).length;
    console.log(`[RPC] 批量查询完成: ${foundCount}/${smart_accounts.length} 个找到`);
    
    callback(null, {
      mappings: mappings,
      total: smart_accounts.length,
      found: foundCount
    });

  } catch (error) {
    console.error('[RPC] 批量查询EOA地址失败:', error);
    callback({
      code: grpc.status.INTERNAL,
      details: 'Failed to batch get EOA addresses'
    });
  }
}

module.exports = { 
  Register: register,
  Login: login,
  GetUserPublicKey: getUserPublicKey,
  GetEOABySmartAccount: getEOABySmartAccount,
  BatchGetEOABySmartAccounts: batchGetEOABySmartAccounts
};