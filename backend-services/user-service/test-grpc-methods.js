// test-grpc-methods.js
// 测试 gRPC 方法是否正确注册
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/user_auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const userAuthProto = grpc.loadPackageDefinition(packageDefinition).user_auth;

console.log('========================================');
console.log('UserAuthService 方法列表:');
console.log('========================================');

// 打印服务定义中的所有方法
const serviceDefinition = userAuthProto.UserAuthService.service;
for (const methodName in serviceDefinition) {
  console.log(`✓ ${methodName}`);
}

console.log('========================================');
console.log('Handler 导出的方法:');
console.log('========================================');

const handlers = require('./src/rpc/handlers/user_auth.handler');
for (const methodName in handlers) {
  console.log(`✓ ${methodName}`);
}

console.log('========================================');
console.log('方法匹配检查:');
console.log('========================================');

for (const methodName in serviceDefinition) {
  if (handlers[methodName]) {
    console.log(`✅ ${methodName} - 已实现`);
  } else {
    console.log(`❌ ${methodName} - 未实现`);
  }
}

console.log('========================================');
