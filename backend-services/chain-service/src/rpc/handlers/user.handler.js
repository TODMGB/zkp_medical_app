// src/rpc/handlers/user.handler.js
const userService = require('../../services/user.service');
const grpc = require('@grpc/grpc-js');

/**
 * 实现了 proto 文件中定义的 GetUserById RPC 方法
 * @param {object} call - 包含请求元数据和请求体 (call.request)
 * @param {function} callback - 用于发送响应 (callback(error, response))
 */
async function getUserById(call, callback) {
  try {
    const id = call.request.id;
    // 重要：调用与REST API完全相同的service层方法
    const user = await userService.findUserById(id);

    if (!user) {
      // 如果用户未找到，返回 gRPC 的 NOT_FOUND 状态码
      return callback({
        code: grpc.status.NOT_FOUND,
        details: 'User not found',
      });
    }

    // 成功找到用户，通过回调函数返回响应
    callback(null, user);
  } catch (error) {
    // 捕获未知错误，返回 INTERNAL 状态码
    console.error('gRPC handler error in getUserById:', error);
    callback({
      code: grpc.status.INTERNAL,
      details: 'An internal error occurred while fetching the user.',
    });
  }
}

/**
 * 实现了 proto 文件中定义的 CreateUser RPC 方法
 * @param {object} call - 包含请求元数据和请求体 (call.request)
 * @param {function} callback - 用于发送响应 (callback(error, response))
 */
async function createUser(call, callback) {
  try {
    // 1. 从 gRPC 请求体中解构出需要的数据
    const { username, email } = call.request;

    // 2. 调用核心的 service 层来处理业务逻辑
    const newUser = await userService.createUser({ username, email });

    // 3. 成功创建后，通过回调函数返回新创建的用户信息
    callback(null, newUser);
    
  } catch (error) {
    // 4. 精细化地处理已知错误
    // 检查错误是否是由于唯一约束冲突（用户已存在）引起的
    if (error.code === '23505') { // PostgreSQL's unique violation error code
      return callback({
        code: grpc.status.ALREADY_EXISTS,
        details: 'A user with this username or email already exists.',
      });
    }

    // 捕获其他未知错误，返回 INTERNAL 状态码
    console.error('gRPC handler error in createUser:', error);
    callback({
      code: grpc.status.INTERNAL,
      details: 'An internal error occurred while creating the user.',
    });
  }
}

// 导出所有处理器
module.exports = {
  getUserById,
  createUser, // 确保导出了新的处理器
};