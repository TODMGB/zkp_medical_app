// src/middleware/auth.middleware.js

const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../config');
const { hasPermission } = require('../services/permission.service');

const RELATIONSHIP_SERVICE_URL = config.services.relationship.baseUrl;

async function authMiddleware(req, res, next) {
  try {
    // --- JWT认证 ---
    const authHeader = req.headers.authorization;
    let roles = ['guest'];
    let user = null;

    console.log(`[Auth Middleware] Authorization Header: ${authHeader}`);
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.JWT_SECRET);
        
        // 统一将地址转为小写（EIP-55 校验和地址可能有大小写混合）
        if (decoded.smart_account) {
          decoded.smart_account = decoded.smart_account.toLowerCase();
        }
        
        user = decoded;
        req.user = user;
        console.log(`[Auth Middleware] 解析的JWT Token: ${JSON.stringify(decoded)}`);
        if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
          roles = user.roles;
          console.log(`[Auth Middleware] 用户角色: ${JSON.stringify(roles)}`);
        } else {
          console.log(`[Auth Middleware] ⚠️  用户没有角色，使用默认guest角色`);
        }
    }

    // --- 授权上下文增强 ---
    // 使用可选链 (?.) 安全地访问可能不存在的属性
    const principalAddress = req.query?.ownerAddress || req.body?.ownerAddress;
    const viewerAddress = user?.smart_account;  // 使用smart_account作为用户标识

    // 仅当 principalAddress 存在时，才执行此逻辑
    if (principalAddress && viewerAddress && principalAddress.toLowerCase() !== viewerAddress.toLowerCase()) {
        try {
            const response = await axios.get(`${RELATIONSHIP_SERVICE_URL}/api/relation/authorizations`, {
                params: {
                    principal_address: principalAddress,
                    viewer_address: viewerAddress
                }
            });
            const groups = response.data.groups;
            
            if (groups && groups.length > 0) {
                req.headers['x-access-groups'] = groups.map(g => g.id).join(',');
                console.log(`[Auth Middleware] Injected access groups for ${viewerAddress}: ${req.headers['x-access-groups']}`);
            }
        } catch (error) {
            if (error.response && error.response.status !== 404) {
                console.error('Failed to get authorizations from RelationshipService:', error.message);
            }
        }
    }

    // --- RBAC检查 ---
    const requestPath = req.originalUrl.split('?')[0];
    
    console.log(`[Auth Middleware] Checking permission for roles: [${roles.join(', ')}] on -> ${req.method} ${requestPath}`);
    
    const isAuthorized = await hasPermission(roles, req.method, requestPath);
    
    if (isAuthorized) {
      // 将用户的smart_account和eoa_address添加到请求头，供后端服务使用
      if (user && user.smart_account) {
        req.headers['x-user-smart-account'] = user.smart_account;
        console.log(`[Auth Middleware] 添加用户标识到请求头: ${user.smart_account}`);
      }
      if (user && user.eoa_address) {
        req.headers['x-user-eoa-address'] = user.eoa_address;
      }
      next();
    } else {
      const isGuest = roles.length === 1 && roles[0] === 'guest';
      const statusCode = isGuest ? 401 : 403;
      const message = statusCode === 401 
        ? 'Unauthorized: Authentication is required to access this resource.' 
        : 'Forbidden: You do not have permission to perform this action.';
      
      return res.status(statusCode).json({ message });
    }

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: `Unauthorized: ${error.message}` });
    }
    next(error);
  }
}

module.exports = authMiddleware;