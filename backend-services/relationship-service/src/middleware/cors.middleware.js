// src/middleware/cors.middleware.js
// =======================================================
// CORS 跨域资源共享中间件
// 配置并控制允许访问 API 的源地址
// =======================================================
const cors = require('cors');
const config = require('../config');

// 从配置文件中读取是否允许任意跨域和允许的源地址白名单
const { allowAll, allowedOrigins } = config.cors;

console.log('CORS allowAll:', allowAll);
console.log('CORS allowedOrigins:', allowedOrigins);

// CORS 配置选项
const corsOptions = {
  /**
   * origin 回调函数决定是否允许一个请求源
   * @param {string|undefined} origin - 请求的来源，如果请求不是跨域的（如同源、Postman、curl），则为undefined
   * @param {function} callback - 回调函数，格式为 callback(error, isAllowed)
   */
  origin: (origin, callback) => {
    // 如果配置了允许任意跨域，直接允许所有请求
    if (allowAll) {
      callback(null, true);
      return;
    }
    
    // 否则使用白名单逻辑：
    // 1. 如果请求没有 origin（例如 Postman 或服务器内部请求），则允许
    // 2. 如果 origin 在白名单中，则允许
    // 3. 否则拒绝访问
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Origin not allowed:', origin);
      callback(new Error('该源地址不在 CORS 白名单中'));
    }
  },
  
  // 其他 CORS 配置
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],     // 允许的 HTTP 方法
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-smart-account'],       // 允许的请求头
  credentials: true,                                       // 允许携带凭证（cookies）
};

// 导出配置好的 CORS 中间件实例
module.exports = cors(corsOptions);