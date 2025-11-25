// src/middleware/cors.middleware.js
// =======================================================
// CORS 中间件
// 处理跨域资源共享
// =======================================================

const config = require('../config');

module.exports = (req, res, next) => {
  const origin = req.headers.origin;

  if (config.cors.allowAll) {
    // 允许所有源
    res.header('Access-Control-Allow-Origin', '*');
  } else if (config.cors.allowedOrigins.includes(origin)) {
    // 允许指定的源
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
};
