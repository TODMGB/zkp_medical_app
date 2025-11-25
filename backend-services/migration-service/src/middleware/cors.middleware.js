// src/middleware/cors.middleware.js
const cors = require('cors');
const config = require('../config'); // 引入我们的统一配置

// 从配置中读取是否允许任意跨域和允许的源地址白名单
const { allowAll, allowedOrigins } = config.cors;

console.log('CORS allowAll:', allowAll);
console.log('CORS allowedOrigins:', allowedOrigins);

const corsOptions = {
  /**
   * origin 回调函数决定是否允许一个请求源。
   * @param {string|undefined} origin - 请求的来源，如果请求不是跨域的（如同源或来自服务器本身，如curl），则为undefined。
   * @param {function} callback - 回调函数，格式为 callback(error, isAllowed)
   */
  origin: (origin, callback) => {
    // 如果配置了允许任意跨域，直接允许所有请求
    if (allowAll) {
      callback(null, true);
      return;
    }
    
    // 否则使用白名单逻辑：
    // 1. 如果请求没有origin (例如，来自Postman或服务器内部请求)，则允许。
    // 2. 如果origin在我们的白名单中，则允许。
    // 3. 否则，拒绝。
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Origin not allowed:', origin);
      callback(new Error('This origin is not allowed by CORS'));
    }
  },
  
  // 其他CORS选项保持不变
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-smart-account'],
  credentials: true,
};

// 导出配置好的cors中间件实例
module.exports = cors(corsOptions);