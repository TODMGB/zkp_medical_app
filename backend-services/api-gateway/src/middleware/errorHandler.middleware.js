// src/middleware/errorHandler.js

const config = require('../config'); // 假设config中有环境信息

/**
 * 统一的错误处理中间件
 * @param {Error} err
 * @param {object} req
 * @param {object} res
 * @param {function} next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // 如果响应头已经被发送，则委托给Express的默认错误处理器
  if (res.headersSent) {
    return next(err);
  }

  // 根据错误类型或状态码设置HTTP状态
  // 如果res.statusCode已经被设置（如在notFoundHandler中），则使用它，否则默认为500
  const statusCode = res.statusCode >= 400 ? res.statusCode : 500;

  let errorMessage = {
    message: err.message,
  };

  // 在开发环境中，包含详细的堆栈跟踪信息
  if (process.env.NODE_ENV !== 'production') {
    errorMessage.stack = err.stack;
  }
  
  // 处理特定类型的错误
  // 例如，处理PostgreSQL唯一约束冲突错误
  if (err.code === '23505') {
    return res.status(409).json({
      message: 'Conflict: A resource with this value already exists.',
      // 可以更具体地解析错误详情
      detail: err.detail,
    });
  }
  
  // 处理HTTP服务调用错误
  if (err.response && err.response.status) {
      console.error(`[HTTP Error] Status: ${err.response.status}, Message: ${err.message}`);
      return res.status(err.response.status).json(err.response.data || { 
        message: 'Service Error: An error occurred while communicating with a downstream service.'
      });
  }
  // ... 在这里可以添加更多自定义错误类型的处理

  res.status(statusCode).json(errorMessage);
}

module.exports = errorHandler;