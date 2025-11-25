// user-service/src/rpc/clients/relationship.client.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const config = require('../../config');

// 路径指向根目录统一管理的 proto 文件
const PROTO_PATH = path.join(__dirname, '../../../../proto/relationship.proto');

// gRPC proto-loader 配置
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// 加载 relationship 包
const relationshipProto = grpc.loadPackageDefinition(packageDefinition).relationship;

// 从配置中获取 RelationshipService 的地址
const target = config.RELATIONSHIP_RPC_SERVER || 'localhost:50053';

// 创建一个到 RelationshipService 的 gRPC 客户端实例
const client = new relationshipProto.RelationshipService(
  target,
  grpc.credentials.createInsecure()
);

/**
 * 初始化用户的默认访问组
 * @param {string} ownerAddress - 用户的 smart account 地址
 * @returns {Promise<object>} 返回创建的访问组列表
 */
function initializeDefaultGroups(ownerAddress) {
  return new Promise((resolve, reject) => {
    client.initializeDefaultGroups({ owner_address: ownerAddress }, (error, response) => {
      if (error) {
        console.error('调用 initializeDefaultGroups RPC 失败:', error);
        return reject(error);
      }
      resolve(response);
    });
  });
}

// 导出客户端方法
module.exports = {
  initializeDefaultGroups,
};
