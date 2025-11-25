// src/routes/recovery.routes.js
// =======================================================
// 社交恢复路由 - 仅包含恢复流程相关接口
// 账户管理 -> /account
// 守护者管理 -> /guardian
// =======================================================
const { Router } = require('express');
const recoveryController = require('../controllers/recovery.controller');

const router = Router();

// =======================================================
// 社交恢复流程路由
// =======================================================

/**
 * 构建守护者发起恢复的未签名 UserOperation（安全方法）
 * POST /recovery/initiate/build
 * Body: { accountAddress, guardianAccountAddress, newOwnerAddress }
 */
router.post('/initiate/build', recoveryController.buildInitiateRecovery);

/**
 * 守护者发起恢复（已弃用：不安全，需要私钥）
 * POST /recovery/initiate
 * Body: { accountAddress, guardianAccountAddress, guardianOwnerPrivateKey, newOwnerAddress }
 * @deprecated 请使用 POST /recovery/initiate/build + POST /recovery/submit
 */
router.post('/initiate', recoveryController.initiateRecovery);

/**
 * 构建守护者支持恢复的未签名 UserOperation（安全方法）
 * POST /recovery/support/build
 * Body: { accountAddress, guardianAccountAddress, newOwnerAddress }
 */
router.post('/support/build', recoveryController.buildSupportRecovery);

/**
 * 守护者支持恢复（已弃用：不安全，需要私钥）
 * POST /recovery/support
 * Body: { accountAddress, guardianAccountAddress, guardianOwnerPrivateKey, newOwnerAddress }
 * @deprecated 请使用 POST /recovery/support/build + POST /recovery/submit
 */
router.post('/support', recoveryController.supportRecovery);

/**
 * 构建Owner取消恢复的未签名 UserOperation（安全方法）
 * POST /recovery/cancel/build
 * Body: { accountAddress }
 */
router.post('/cancel/build', recoveryController.buildCancelRecovery);

/**
 * Owner取消恢复（已弃用：不安全，需要私钥）
 * POST /recovery/cancel
 * Body: { accountAddress, ownerPrivateKey }
 * @deprecated 请使用 POST /recovery/cancel/build + POST /recovery/submit
 */
router.post('/cancel', recoveryController.cancelRecovery);

/**
 * 提交已签名的 UserOperation
 * POST /recovery/submit
 * Body: { userOp (包含签名) }
 */
router.post('/submit', recoveryController.submitUserOp);

/**
 * 查询恢复状态
 * GET /recovery/status/:accountAddress
 */
router.get('/status/:accountAddress', recoveryController.getRecoveryStatus);

module.exports = router;
