// src/rpc/clients/user.client.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const config = require('../../config');

// 路径指向根目录统一管理的 proto 文件
const USER_AUTH_PROTO_PATH = path.join(__dirname, '../../../../proto/user_auth.proto');

const packageDefinition = protoLoader.loadSync(USER_AUTH_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const userAuthProto = grpc.loadPackageDefinition(packageDefinition).user_auth;

// ✅ 从配置文件读取 user-service 的 gRPC 地址
const USER_SERVICE_URL = config.grpc.userService;

const userAuthClient = new userAuthProto.UserAuthService(
  USER_SERVICE_URL,
  grpc.credentials.createInsecure()
);

/**
 * 获取用户的加密公钥
 * @param {string} smartAccount - 智能合约账户地址
 * @returns {Promise<Object>} 包含公钥信息的对象
 */
function getUserPublicKey(smartAccount) {
  return new Promise((resolve, reject) => {
    userAuthClient.GetUserPublicKey({ smart_account: smartAccount }, (error, response) => {
      if (error) {
        console.error('[User Client] GetUserPublicKey error:', error);
        return reject(error);
      }
      resolve(response);
    });
  });
}

module.exports = {
  getUserPublicKey,
};