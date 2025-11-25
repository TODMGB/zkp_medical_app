// src/middleware/auth.middleware.js
// =======================================================
// 认证中间件 - 从 API Gateway 传递的请求头中提取用户信息
// =======================================================

/**
 * 认证中间件
 * API Gateway 会在请求头中添加 x-user-smart-account 和 x-user-eoa-address
 */
function authMiddleware(req, res, next) {
  try {
    // 从 API Gateway 传递的请求头中获取用户地址
    const smartAccount = req.headers['x-user-smart-account'];
    const eoaAddress = req.headers['x-user-eoa-address'];
    
    if (smartAccount && eoaAddress) {
      // 设置 req.user 以便控制器使用
      req.user = {
        smart_account: smartAccount.toLowerCase(),
        eoa_address: eoaAddress.toLowerCase(),
        address: eoaAddress.toLowerCase() // 将 EOA 地址作为默认地址
      };
      
      console.log(`[Auth Middleware] 用户认证成功: ${smartAccount} (EOA: ${eoaAddress})`);
      return next();
    }
    
    // 如果没有认证信息，返回 401
    console.log(`[Auth Middleware] ⚠️  未找到用户认证信息`);
    return res.status(401).json({
      success: false,
      message: '未认证',
      code: 'UNAUTHORIZED'
    });
    
  } catch (error) {
    console.error('[Auth Middleware] 错误:', error);
    return res.status(500).json({
      success: false,
      message: '认证失败',
      code: 'AUTH_FAILED'
    });
  }
}

module.exports = authMiddleware;

