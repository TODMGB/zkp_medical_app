// src/middleware/notFoundHandler.js
/**
 * 处理未找到的路由 (404)
 * @param {object} req
 * @param {object} res
 * @param {function} next
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error); // 将错误传递给下一个错误处理中间件
}

module.exports = notFoundHandler;