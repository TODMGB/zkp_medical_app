// src/routes/notification.routes.js
// =======================================================
// 通知服务路由
// 将请求转发到通知服务，处理实时通知推送和管理
// =======================================================
const { Router } = require('express');
const { createProxyHandler } = require('../utils/proxy.util');
const config = require('../config');

const router = Router();

// =======================================================
// 路由映射说明
// =======================================================
/**
 * 所有请求都会被代理到通知服务
 * 
 * 通知管理：
 * - POST   /api/notification/send                        - 发送通知（内部服务调用）
 * - GET    /api/notification/notifications               - 获取通知列表（需认证）
 * - GET    /api/notification/notifications/unread/count  - 获取未读数量（需认证）
 * - PUT    /api/notification/notifications/:id/read      - 标记已读（需认证）
 * - PUT    /api/notification/notifications/read-all      - 标记全部已读（需认证）
 * - DELETE /api/notification/notifications/:id           - 删除通知（需认证）
 * 
 * WebSocket 实时推送：
 * - 路径：ws://gateway:3000/ws/notification/socket.io?token=JWT_TOKEN
 * - 通过 WebSocket 代理转发到 notification-service
 */

/**
 * 使用统一的代理工具转发请求到 Notification Service
 * 目标服务：${config.services.notification.baseUrl}
 */
router.use(createProxyHandler('Notification', config.services.notification.baseUrl, '/api'));

module.exports = router;

