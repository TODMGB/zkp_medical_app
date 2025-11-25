// relationship-service/server.js
// =======================================================
// gRPC 服务器配置与启动
// 处理关系服务的 gRPC 请求
// =======================================================
require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const config = require('../config');
const relationshipHandlers = require('./handlers/relationship.handler');

// 加载 Protocol Buffer 定义文件（从根目录统一管理的 proto 文件夹）
const PROTO_PATH = path.join(__dirname, '../../../proto/relationship.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const relationshipProto = grpc.loadPackageDefinition(packageDefinition).relationship;

/**
 * 启动 gRPC 服务器
 * 绑定关系服务并开始监听请求
 */
function startServer() {
    // 创建 gRPC 服务器实例
    const server = new grpc.Server();
    // 注册关系服务和对应的处理函数
    server.addService(relationshipProto.RelationshipService.service, relationshipHandlers);

    // 异步绑定端口并启动服务
    server.bindAsync(
        `0.0.0.0:${config.GRPC_PORT}`, // 绑定到所有网络接口
        grpc.ServerCredentials.createInsecure(), // 使用不安全连接（开发环境）
        (err, port) => {
            if (err) {
                console.error('关系服务 gRPC 服务器绑定失败:', err);
                return;
            }
            server.start();
            console.log(`🚀 关系服务 gRPC 服务运行在端口 ${port}`);
        }
    );
}

// 导出服务启动函数
module.exports = {
  startServer
};