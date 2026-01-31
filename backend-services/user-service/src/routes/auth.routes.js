// src/routes/auth.routes.js
// =======================================================
// 认证路由 - 提供HTTP接口给API Gateway调用
// =======================================================
const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const recoveryController = require('../controllers/recovery.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = Router();

/**
 * 用户注册
 * POST /auth/register
 * Body: { eoa_address, smart_account, phone_number, signature, message, encryption_public_key }
 */
router.post('/register', authController.register);

/**
 * 用户登录
 * POST /auth/login
 * Body: { eoa_address, signature, message }
 */
router.post('/login', authController.login);

router.post('/resolve-smart-account', authController.resolveSmartAccount);

router.post('/start-recovery', recoveryController.startRecovery);

/**
 * 更新加密公钥
 * PUT /auth/encryption-key
 * Body: { encryption_public_key }
 * Headers: x-user-smart-account, x-user-eoa-address (来自 API Gateway)
 */
router.put('/encryption-key', authMiddleware, authController.updateEncryptionKey);

module.exports = router;
