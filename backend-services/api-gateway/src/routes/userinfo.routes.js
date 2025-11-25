// src/routes/userinfo.routes.js
const { Router } = require('express');
const { createProxyHandler } = require('../utils/proxy.util');
const config = require('../config');

const router = Router();

/**
 * 使用统一的代理工具转发请求到 Userinfo Service
 */
router.use(createProxyHandler('Userinfo', config.services.userinfo.baseUrl));

module.exports = router;
