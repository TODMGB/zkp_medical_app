// src/config/index.js
// =======================================================
// AI Service 配置文件
// =======================================================

require('dotenv').config();

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',');

module.exports = {
  // 服务端口
  PORT: process.env.PORT || 3002,

  // CORS 配置
  cors: {
    allowAll: process.env.CORS_ALLOW_ALL === 'true',
    allowedOrigins: allowedOrigins.map(origin => origin.trim()),
  },

  // 硅基流动 API 配置
  siliconflow: {
    apiKey: process.env.SILICONFLOW_API_KEY,
    baseUrl: process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
    model: process.env.SILICONFLOW_MODEL || 'Qwen/Qwen3-VL-235B-A22B-Thinking',
  },
};
