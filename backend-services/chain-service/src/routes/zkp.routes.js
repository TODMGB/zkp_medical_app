// src/routes/zkp.routes.js
// =======================================================
// ZKP验证路由
// 处理零知识证明验证相关的HTTP请求
// =======================================================
const { Router } = require('express');
const zkpController = require('../controllers/zkp.controller');

const router = Router();

// =======================================================
// ZKP验证路由
// =======================================================

/**
 * 验证日常医药打卡ZKP证明
 * POST /zkp/verify/medical-checkin
 * Body: { pA, pB, pC, pubSignals }
 */
router.post('/verify/medical-checkin', zkpController.verifyMedicalCheckin);

/**
 * 验证每周打卡汇总ZKP证明
 * POST /zkp/verify/weekly-summary
 * Body: { pA, pB, pC, pubSignals }
 */
router.post('/verify/weekly-summary', zkpController.verifyWeeklySummary);

/**
 * 批量验证日常医药打卡ZKP证明
 * POST /zkp/verify/batch-medical-checkin
 * Body: { proofs: [...] }
 */
router.post('/verify/batch-medical-checkin', zkpController.batchVerifyMedicalCheckins);

/**
 * 获取ZKP验证器信息
 * GET /zkp/verifiers
 */
router.get('/verifiers', zkpController.getVerifierInfo);

module.exports = router;

