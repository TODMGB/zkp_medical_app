// src/rpc/server.js
// ==========================================
// Secure Exchange Service gRPC服务器
// ==========================================
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const exchangeHandlers = require('./handlers/exchange.handler');
const config = require('../config');

// Proto 文件路径
const SECURE_EXCHANGE_PROTO_PATH = path.join(__dirname, '../../../proto/secure-exchange.proto');

/**
 * 创建并启动 gRPC 服务器
 */
function startGrpcServer() {
  try {
    console.log('🔧 正在初始化 gRPC 服务器...');

    // 加载 proto 文件
    const packageDefinition = protoLoader.loadSync(SECURE_EXCHANGE_PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    // 加载 secure_exchange 包
    const secureExchangeProto = grpc.loadPackageDefinition(packageDefinition).secure_exchange;

    if (!secureExchangeProto || !secureExchangeProto.SecureExchange) {
      throw new Error('Failed to load SecureExchange service from proto');
    }

    // 创建 gRPC 服务器
    const server = new grpc.Server();

    // 绑定 SecureExchange 服务的处理器
    server.addService(secureExchangeProto.SecureExchange.service, {
      SendEncryptedMessage: exchangeHandlers.sendEncryptedMessage,
      GetEncryptedMessages: exchangeHandlers.getEncryptedMessages,
      GetMessageById: exchangeHandlers.getMessageById,
      MarkMessageAsRead: exchangeHandlers.markMessageAsRead,
      RevokeMessage: exchangeHandlers.revokeMessage,
      MarkMultipleAsRead: exchangeHandlers.markMultipleAsRead
    });

    // 绑定并启动服务器
    const grpcPort = config.GRPC_PORT || 50051;
    server.bindAsync(
      `0.0.0.0:${grpcPort}`,
      grpc.ServerCredentials.createInsecure(),
      (err, port) => {
        if (err) {
          console.error('❌ Failed to bind gRPC server:', err);
          return;
        }
        server.start();
        console.log('='.repeat(60));
        console.log(`✅ gRPC 服务器已启动`);
        console.log(`📡 gRPC Port:   ${port}`);
        console.log(`🔐 Service:     SecureExchange`);
        console.log('='.repeat(60));
      }
    );

    return server;
  } catch (error) {
    console.error('❌ gRPC 服务器初始化失败:', error);
    throw error;
  }
}

module.exports = { startGrpcServer };