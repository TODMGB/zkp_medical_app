// src/middleware/errorHandler.middleware.js
// =======================================================
// 统一错误处理中间件
// =======================================================

module.exports = (err, req, res, next) => {
  console.error('[Error Handler]', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: {
      status,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
