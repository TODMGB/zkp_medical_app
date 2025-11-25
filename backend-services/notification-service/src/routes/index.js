// src/routes/index.js
// ==========================================
// 路由主入口
// ==========================================
const { Router } = require('express');
const notificationRoutes = require('./notification.routes');
const router = Router();

// 健康检查
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
});

// 通知路由
router.use('/notifications', notificationRoutes);

// 根路径
router.get('/', (req, res) => {
  res.json({
    message: '🔔 Notification Service API',
    version: '1.0.0',
    endpoints: {
      notifications: '/api/notifications',
      health: '/api/health'
    }
  });
});

module.exports = router;