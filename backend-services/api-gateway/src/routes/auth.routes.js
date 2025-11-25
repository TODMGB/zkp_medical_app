// src/routes/auth.routes.js
// =======================================================
// 用户认证服务路由
// 将请求转发到用户服务，处理注册和登录
// =======================================================
const { Router } = require('express');
const { createProxyHandler } = require('../utils/proxy.util');
const config = require('../config');

const router = Router();

// =======================================================
// 路由映射说明
// =======================================================
/**
 * 所有请求都会被代理到用户服务
 * 
 * 认证管理：
 * - POST   /api/auth/register    - 用户注册
 * - POST   /api/auth/login       - 用户登录
 */

/**
 * 使用统一的代理工具转发请求到 User Service
 * 目标服务：${config.services.user.baseUrl}
 */
router.use(createProxyHandler('User', config.services.user.baseUrl, '/api/auth'));

module.exports = router;