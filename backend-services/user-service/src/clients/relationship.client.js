// src/clients/relationship.client.js
// =======================================================
// Relationship Service gRPC 客户端
// =======================================================
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// 从环境变量读取 Relationship Service 的地址
const RELATIONSHIP_SERVICE_URL = process.env.RELATIONSHIP_RPC_SERVER || 'localhost:50053';

// 加载 proto 文件
const PROTO_PATH = path.join(__dirname, '../../../proto/relationship.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const relationshipProto = grpc.loadPackageDefinition(packageDefinition).relationship;

// 创建 gRPC 客户端
const client = new relationshipProto.RelationshipService(
  RELATIONSHIP_SERVICE_URL,
  grpc.credentials.createInsecure()
);

/**
 * 初始化用户的默认访问组
 * @param {string} ownerAddress - 用户的 smart account 地址
 * @returns {Promise<Object>} 返回初始化结果 { success, groups, count }
 */
function initializeDefaultGroups(ownerAddress) {
  return new Promise((resolve, reject) => {
    client.InitializeDefaultGroups(
      { owner_address: ownerAddress },
      (error, response) => {
        if (error) {
          console.error('[Relationship Client] 初始化默认访问组失败:', error);
          reject(error);
        } else {
          console.log(`[Relationship Client] 成功初始化 ${response.count} 个默认访问组`);
          resolve(response);
        }
      }
    );
  });
}

module.exports = {
  initializeDefaultGroups
};
