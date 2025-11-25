// src/routes/guardian.routes.js
// =======================================================
// 守护者路由 - 守护者管理
// =======================================================
const { Router } = require('express');
const guardianController = require('../controllers/guardian.controller');

const router = Router();

/**
 * 构建添加守护者的未签名 UserOperation（安全方法）
 * POST /guardian/build
 * Body: { accountAddress, guardianAddress }
 */
router.post('/build', guardianController.buildAddGuardian);

/**
 * 添加守护者（已弃用：不安全，需要私钥）
 * POST /guardian
 * Body: { accountAddress, ownerPrivateKey, guardianAddress }
 * @deprecated 请使用 POST /guardian/build + POST /guardian/submit
 */
router.post('/', guardianController.addGuardian);

/**
 * 查询守护者列表
 * GET /guardian/:accountAddress
 */
router.get('/:accountAddress', guardianController.getGuardians);

/**
 * 构建修改阈值的未签名 UserOperation（安全方法）
 * POST /guardian/threshold/build
 * Body: { accountAddress, newThreshold }
 */
router.post('/threshold/build', guardianController.buildChangeThreshold);

/**
 * 修改阈值（已弃用：不安全，需要私钥）
 * PUT /guardian/threshold
 * Body: { accountAddress, ownerPrivateKey, newThreshold }
 * @deprecated 请使用 POST /guardian/threshold/build + POST /guardian/submit
 */
router.put('/threshold', guardianController.changeThreshold);

/**
 * 提交已签名的 UserOperation
 * POST /guardian/submit
 * Body: { userOp (包含签名) }
 */
router.post('/submit', guardianController.submitUserOp);

module.exports = router;
