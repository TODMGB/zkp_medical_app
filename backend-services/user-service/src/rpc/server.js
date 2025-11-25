// src/rpc/server.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const config = require('../config');

// 1. [修正] 引入正确的处理器文件
const userAuthHandlers = require('./handlers/user_auth.handler');

// 2. [修正] 指向根目录统一管理的 proto 文件
const PROTO_PATH = path.join(__dirname, '../../../proto/user_auth.proto');

// Proto loader 配置保持不变
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// 3. [修正] 从正确的包名加载 gRPC 服务定义
const userAuthProto = grpc.loadPackageDefinition(packageDefinition).user_auth;

/**
 * 创建并启动 gRPC 服务器
 */
function startGrpcServer() {
  const server = new grpc.Server();
  
  // 4. [修正] 将正确的处理器 (userAuthHandlers) 绑定到正确的服务 (userAuthProto.UserAuthService.service)
  server.addService(userAuthProto.UserAuthService.service, userAuthHandlers);

  // bindAsync 逻辑保持不变
  server.bindAsync(
    `0.0.0.0:${config.GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('Failed to bind gRPC server:', err);
        return;
      }
      server.start();
      console.log(`📡 gRPC server for UserAuthService running on port ${port}`);
    }
  );
}

module.exports = startGrpcServer;