// src/routes/account.routes.js
// =======================================================
// 账户路由 - 抽象账户管理统一入口
// =======================================================
const { Router } = require('express');
const accountController = require('../controllers/account.controller');

const router = Router();

/**
 * 创建社交恢复账户
 * POST /account
 * Body: { ownerAddress, guardians?, threshold?, salt? }
 */
router.post('/', accountController.createAccount);

/**
 * 预计算账户地址（不创建账户）
 * POST /account/address
 * Body: { ownerAddress, guardians?, threshold?, salt? }
 */
router.post('/address', accountController.getAccountAddress);

/**
 * 构建账户创建的 InitCode
 * POST /account/initcode
 * Body: { ownerAddress, guardians?, threshold?, salt? }
 */
router.post('/initcode', accountController.buildInitCode);

/**
 * 查询账户完整信息
 * GET /account/:accountAddress
 */
router.get('/:accountAddress', accountController.getAccountInfo);

/**
 * 获取账户 Nonce
 * GET /account/:accountAddress/nonce
 */
router.get('/:accountAddress/nonce', accountController.getNonce);

module.exports = router;
