// src/middleware/notFoundHandler.js
// =======================================================
// 404 错误处理中间件
// 处理所有未匹配到路由的请求
// =======================================================

/**
 * 处理未找到的路由 (404)
 * 当请求的 URL 没有匹配到任何路由时，该中间件会被调用
 * @param {object} req - Express 请求对象
 * @param {object} res - Express 响应对象
 * @param {function} next - Express next 函数
 */
function notFoundHandler(req, res, next) {
  // 创建一个 404 错误对象
  const error = new Error(`未找到资源 - ${req.originalUrl}`);
  // 设置 HTTP 状态码为 404
  res.status(404);
  // 将错误传递给下一个错误处理中间件（errorHandler）
  next(error);
}

// 导出 404 处理中间件
module.exports = notFoundHandler;