// src/rpc/clients/user.client.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const config = require('../../config');

// 路径指向根目录统一管理的 proto 文件
const PROTO_PATH = path.join(__dirname, '../../../../proto/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, { /* ... options ... */ });
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

// 创建一个到gRPC服务器的客户端连接
// 注意：在真实微服务环境中，地址应该是 'other-service-name:50051'
// 这里为了演示，我们连接到自己启动的gRPC服务
const target = `localhost:${config.GRPC_PORT}`;

const userServiceClient = new userProto.UserService(
  target,
  grpc.credentials.createInsecure()
);

// 将回调式的gRPC调用封装成Promise，以便在async/await中使用
function getUserById(id) {
  return new Promise((resolve, reject) => {
    userServiceClient.getUserById({ id }, (error, response) => {
      if (error) {
        return reject(error);
      }
      resolve(response);
    });
  });
}

module.exports = {
  getUserById,
};