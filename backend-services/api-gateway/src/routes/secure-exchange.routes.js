// src/routes/secure-exchange.routes.js
// =======================================================
// 安全数据交换服务路由
// 将请求转发到安全数据交换服务，处理端到端加密数据传输
// =======================================================
const { Router } = require('express');
const { createProxyHandler } = require('../utils/proxy.util');
const config = require('../config');

const router = Router();

// =======================================================
// 路由映射说明
// =======================================================
/**
 * 所有请求都会被代理到安全数据交换服务
 * 
 * 公钥交换：
 * - POST   /api/secure-exchange/request-pubkey              - 请求公钥交换（需认证）
 * - POST   /api/secure-exchange/provide-pubkey              - 提供公钥（需认证）
 * 
 * 消息传输：
 * - POST   /api/secure-exchange/send                        - 发送加密数据（需认证）
 * - POST   /api/secure-exchange/acknowledge                 - 确认接收消息（需认证）
 * - GET    /api/secure-exchange/pending                     - 查询待处理消息（需认证）
 * 
 * 会话管理：
 * - GET    /api/secure-exchange/sessions/:sessionId         - 查询会话详情（需认证）
 * - DELETE /api/secure-exchange/sessions/:sessionId         - 取消会话（需认证）
 * 
 * WebSocket 实时推送：
 * - 路径：ws://gateway:3000/ws/secure-exchange
 * - 通过 WebSocket 代理转发到 secure-exchange-service
 * - 推送事件：pubkey_request（公钥请求）、encrypted_message（加密消息）
 * 
 * 注意：
 * - 所有请求都需要通过 API Gateway 的 JWT 认证
 * - 用户地址会自动从 JWT token 中提取并转发到服务
 * - 服务端无法读取加密内容，实现端到端加密（E2EE）
 * - 支持防重放攻击（Timestamp + Nonce）
 * - 临时公钥交换，不长期存储公钥
 */

/**
 * 使用统一的代理工具转发请求到 Secure Exchange Service
 * 目标服务：${config.services.secureExchange.baseUrl}
 */
router.use(createProxyHandler('SecureExchange', config.services.secureExchange.baseUrl, '/api/secure-exchange'));

module.exports = router;

