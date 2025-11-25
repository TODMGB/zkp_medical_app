// src/rpc/server.js
// =======================================================
// gRPC 服务器 (ZKP Service 暂不启用)
// =======================================================
// ZKP Service 目前只提供 HTTP REST API
// 未来如果需要高性能的 gRPC 接口，可以在此实现

/**
 * 启动 gRPC 服务器（占位函数）
 */
function startGrpcServer() {
  // ZKP Service 暂不启用 gRPC
  console.log('ℹ️  gRPC server is disabled for ZKP Service');
}

module.exports = startGrpcServer;