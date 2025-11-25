// src/middleware/auth.middleware.js
// ==========================================
// JWT 认证中间件
// ==========================================
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * 验证JWT Token 或从 API Gateway 传递的请求头中获取用户信息
 */
function authMiddleware(req, res, next) {
  try {
    // 优先从 API Gateway 传递的请求头中获取用户信息（代理场景）
    const smartAccount = req.headers['x-user-smart-account'];
    const eoaAddress = req.headers['x-user-eoa-address'];
    
    if (smartAccount) {
      // 来自 API Gateway 的代理请求
      req.user = {
        address: smartAccount.toLowerCase(), // controller 使用 req.user.address
        smart_account: smartAccount.toLowerCase(),
        eoa_address: eoaAddress ? eoaAddress.toLowerCase() : null
      };
      console.log(`[Auth Middleware] 用户认证成功 (来自 API Gateway): ${smartAccount}`);
      return next();
    }
    
    // 否则，尝试从 JWT token 中解析用户信息（直接访问场景）
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // 验证token
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // 将用户信息附加到请求对象，确保格式统一
    req.user = {
      address: (decoded.smart_account || decoded.address).toLowerCase(),
      smart_account: (decoded.smart_account || decoded.address).toLowerCase(),
      eoa_address: decoded.eoa_address ? decoded.eoa_address.toLowerCase() : null
    };
    
    console.log(`[Auth Middleware] 用户认证成功 (来自 JWT): ${decoded.smart_account || decoded.address}`);
    next();
    
  } catch (error) {
    console.error('[Auth Middleware] Token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
}

module.exports = authMiddleware;

