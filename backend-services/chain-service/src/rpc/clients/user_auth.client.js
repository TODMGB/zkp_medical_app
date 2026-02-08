// src/rpc/clients/user_auth.client.js
// =======================================================
// User Auth Service gRPC 客户端
// 用于调用 user-service 的认证相关 gRPC 接口
// =======================================================
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// 路径指向根目录统一管理的 proto 文件
const PROTO_PATH = path.join(__dirname, '../../../../proto/user_auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const userAuthProto = grpc.loadPackageDefinition(packageDefinition).user_auth;

// User Service 的 gRPC 地址
const USER_SERVICE_GRPC_HOST = process.env.USER_SERVICE_GRPC_HOST || 'localhost';
const USER_SERVICE_GRPC_PORT = process.env.USER_SERVICE_GRPC_PORT || '50051';
const target = `${USER_SERVICE_GRPC_HOST}:${USER_SERVICE_GRPC_PORT}`;

console.log(`[User Auth Client] 连接到 User Service gRPC: ${target}`);

// 创建 gRPC 客户端
const userAuthServiceClient = new userAuthProto.UserAuthService(
  target,
  grpc.credentials.createInsecure()
);

/**
 * 通过智能账户地址查询对应的EOA地址
 * @param {string} smartAccount - 智能账户地址
 * @returns {Promise<{smart_account: string, eoa_address: string, found: boolean}>}
 */
function getEOABySmartAccount(smartAccount) {
  return new Promise((resolve, reject) => {
    userAuthServiceClient.GetEOABySmartAccount(
      { smart_account: smartAccount },
      { deadline: Date.now() + 5000 }, // 5秒超时
      (error, response) => {
        if (error) {
          console.error(`[User Auth Client] GetEOABySmartAccount 失败:`, error.message);
          return reject(error);
        }
        resolve(response);
      }
    );
  });
}

/**
 * 批量查询智能账户地址对应的EOA地址
 * @param {string[]} smartAccounts - 智能账户地址数组
 * @returns {Promise<{mappings: Array, total: number, found: number}>}
 */
function batchGetEOABySmartAccounts(smartAccounts) {
  return new Promise((resolve, reject) => {
    userAuthServiceClient.BatchGetEOABySmartAccounts(
      { smart_accounts: smartAccounts },
      { deadline: Date.now() + 10000 }, // 10秒超时
      (error, response) => {
        if (error) {
          console.error(`[User Auth Client] BatchGetEOABySmartAccounts 失败:`, error.message);
          return reject(error);
        }
        resolve(response);
      }
    );
  });
}

/**
 * 获取用户的加密公钥
 * @param {string} smartAccount - 智能账户地址
 * @returns {Promise<{smart_account: string, encryption_public_key: string, encryption_key_updated_at: string}>}
 */
function getUserPublicKey(smartAccount) {
  return new Promise((resolve, reject) => {
    userAuthServiceClient.GetUserPublicKey(
      { smart_account: smartAccount },
      { deadline: Date.now() + 5000 },
      (error, response) => {
        if (error) {
          console.error(`[User Auth Client] GetUserPublicKey 失败:`, error.message);
          return reject(error);
        }
        resolve(response);
      }
    );
  });
}

module.exports = {
  getEOABySmartAccount,
  batchGetEOABySmartAccounts,
  getUserPublicKey,
};
