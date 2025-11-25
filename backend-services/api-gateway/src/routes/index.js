// src/routes/index.js
const { Router } = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const relationshipRouter = require('./relationship.routes');
const authRouter = require('./auth.routes');
const userinfoRouter = require('./userinfo.routes');
const chainRouter = require('./chain.routes');
const migrationRouter = require('./migration.routes');
const notificationRouter = require('./notification.routes');
const zkpRouter = require('./zkp.routes');
const secureExchangeRouter = require('./secure-exchange.routes');
const medicationRouter = require('./medication.routes');

const router = Router();

// 健康检查端点
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'api-gateway' });
});

// 公开路由（无需认证）
router.use('/auth', authRouter);
router.use('/userinfo', userinfoRouter); // 用户信息查询（注册前需要）
router.use('/chain', chainRouter); // chain 服务（账户抽象）
router.use('/migration', migrationRouter); // 账户迁移服务（无需认证）

// 应用认证中间件，保护后续路由
router.use(authMiddleware);

// 受保护的路由（需要认证）
router.use('/relation', relationshipRouter);
router.use('/notification', notificationRouter); // 通知服务（需要认证）
router.use('/zkp', zkpRouter); // ZKP 服务（需要认证）
router.use('/secure-exchange', secureExchangeRouter); // 安全数据交换服务（需要认证）
router.use('/medication', medicationRouter); // 医药服务（需要认证）

module.exports = router;