// src/routes/zkp.routes.js
// =======================================================
// ZKP 服务路由
// 将请求转发到 ZKP 服务，处理零知识证明生成
// =======================================================
const { Router } = require('express');
const { createProxyHandler } = require('../utils/proxy.util');
const config = require('../config');

const router = Router();

// =======================================================
// 路由映射说明
// =======================================================
/**
 * 所有请求都会被代理到 ZKP 服务
 * 
 * ZKP 证明生成：
 * - POST   /api/zkp/prove/weekly-summary       - 异步启动周度汇总证明任务（需认证）
 * - GET    /api/zkp/proof-status/:jobId        - 查询证明任务状态（需认证）
 * - GET    /api/zkp/health                     - ZKP服务健康检查（需认证）
 * 
 * 注意：
 * - 所有ZKP请求都需要通过 API Gateway 的 JWT 认证
 * - 用户地址会自动从 JWT token 中提取并转发到 ZKP 服务
 * - 证明生成是异步的，需要通过 jobId 轮询状态
 * - 证明完成后，会通过 MQ 发送通知到 Notification Service
 */

/**
 * 使用统一的代理工具转发请求到 ZKP Service
 * 目标服务：${config.services.zkp.baseUrl}
 */
router.use(createProxyHandler('ZKP', config.services.zkp.baseUrl, '/api/zkp'));

module.exports = router;

