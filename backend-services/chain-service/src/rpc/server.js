// src/rpc/server.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const userHandlers = require('./handlers/user.handler');
const config = require('../config');

const PROTO_PATH = path.join(__dirname, './proto/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;

/**
 * 创建并启动 gRPC 服务器
 */
function startGrpcServer() {
  const server = new grpc.Server();
  
  // 将 userHandlers 绑定到 UserService 服务上
  server.addService(userProto.UserService.service, userHandlers);

  server.bindAsync(
    `0.0.0.0:${config.GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('Failed to bind gRPC server:', err);
        return;
      }
      server.start();
      console.log(`📡 gRPC server running on port ${port}`);
    }
  );
}

module.exports = startGrpcServer;