// src/routes/notification.routes.js
// ==========================================
// Notification 路由
// ==========================================
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

// 中间件
const authMiddleware = require('../middleware/auth.middleware');

/**
 * 发送通知（仅供内部服务调用，或管理员使用）
 * POST /api/notifications/send
 * Body: { recipient_address, type, title, body, priority, data, channels }
 */
router.post('/send', notificationController.sendNotification);

/**
 * 获取当前用户的通知列表
 * GET /api/notifications
 * Query: ?status=unread&limit=50&offset=0
 */
router.get('/', authMiddleware, notificationController.getNotifications);

/**
 * 获取未读通知数量
 * GET /api/notifications/unread/count
 */
router.get('/unread/count', authMiddleware, notificationController.getUnreadCount);

/**
 * 标记通知为已读
 * PUT /api/notifications/:notification_id/read
 */
router.put('/:notification_id/read', authMiddleware, notificationController.markAsRead);

/**
 * 标记所有通知为已读
 * PUT /api/notifications/read-all
 */
router.put('/read-all', authMiddleware, notificationController.markAllAsRead);

/**
 * 删除通知
 * DELETE /api/notifications/:notification_id
 */
router.delete('/:notification_id', authMiddleware, notificationController.deleteNotification);

module.exports = router;

