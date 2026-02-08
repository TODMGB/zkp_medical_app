// src/routes/exchange.routes.js
const express = require('express');
const router = express.Router();
const exchangeController = require('../controllers/exchange.controller');
const authMiddleware = require('../middleware/auth.middleware');

// 所有路由都需要认证
router.use(authMiddleware);

// 获取接收者的加密公钥
router.get('/recipient-pubkey/:recipientAddress', (req, res, next) => exchangeController.getRecipientPublicKey(req, res, next));

// 发送加密数据
router.post('/send', (req, res, next) => exchangeController.sendEncryptedData(req, res, next));

// 请求对方同意后交换 user_info
router.post('/user-info/request', (req, res, next) => exchangeController.requestUserInfo(req, res, next));

// 同意并发送 user_info（仍由客户端加密后提交）
router.post('/user-info/approve', (req, res, next) => exchangeController.approveUserInfo(req, res, next));

// 确认接收
router.post('/acknowledge', (req, res, next) => exchangeController.acknowledgeMessage(req, res, next));

// 查询待处理消息
router.get('/pending', (req, res, next) => exchangeController.getPendingMessages(req, res, next));

module.exports = router;

