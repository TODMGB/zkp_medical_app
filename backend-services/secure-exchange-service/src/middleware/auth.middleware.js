// src/middleware/auth.middleware.js

/**
 * 认证中间件 - 从 API Gateway 传递的请求头中提取用户信息
 * API Gateway 会在请求头中添加 x-user-smart-account
 */
function authMiddleware(req, res, next) {
  try {
    // 从 API Gateway 传递的请求头中获取用户地址
    const smartAccount = req.headers['x-user-smart-account'];
    const eoaAddress = req.headers['x-user-eoa-address'];
    
    if (smartAccount) {
      // 设置 req.user 以便控制器使用
      req.user = {
        smart_account: smartAccount.toLowerCase(),
        address: eoaAddress ? eoaAddress.toLowerCase() : smartAccount.toLowerCase() // EOA 地址（用于签名验证）
      };
      
      console.log(`[Auth Middleware] 用户认证成功: ${smartAccount} (EOA: ${eoaAddress || 'N/A'})`);
    } else {
      console.log(`[Auth Middleware] ⚠️  未找到用户认证信息`);
      // 不阻止请求，某些端点可能不需要认证
    }
    
    next();
  } catch (error) {
    console.error('[Auth Middleware] 错误:', error);
    next(error);
  }
}

module.exports = authMiddleware;

