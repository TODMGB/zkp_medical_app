// src/routes/paymaster.routes.js
// =======================================================
// Paymaster 路由 - 仅包含 Paymaster 管理功能
// 账户管理已移至 /account
// =======================================================
const { Router } = require('express');
const paymasterController = require('../controllers/paymaster.controller');

const router = Router();

/**
 * Paymaster 充值
 * POST /paymaster/deposit
 * Body: { amount }
 */
router.post('/deposit', paymasterController.deposit);

/**
 * 验证 Paymaster UserOperation
 * POST /paymaster/validate
 * Body: { userOp }
 */
router.post('/validate', paymasterController.validatePaymaster);

module.exports = router;
