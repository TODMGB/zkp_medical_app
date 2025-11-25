// src/routes/zkp.routes.js
// =======================================================
// ZKP 证明生成路由
// =======================================================
const { Router } = require('express');
const zkpController = require('../controllers/zkp.controller');

const router = Router();

/**
 * @api {post} /api/zkp/prove/weekly-summary 异步生成周度汇总 ZKP
 * @description 接收输入并启动后台证明任务，立即返回任务ID
 * @body { inputs: { merkleRoot: string, leaves: string[] } }
 * @returns { jobId: string }
 */
router.post('/prove/weekly-summary', zkpController.proveWeeklySummaryAsync);

/**
 * @api {get} /api/zkp/proof-status/:jobId 查询证明任务状态
 * @description 根据任务ID查询后台任务的当前状态
 * @param {string} jobId - 任务ID
 * @returns { status: string, data?: object }
 */
router.get('/proof-status/:jobId', zkpController.getProofStatus);

/**
 * @api {get} /api/zkp/health ZKP服务健康检查
 * @description 检查ZKP服务是否正常运行
 */
router.get('/health', zkpController.healthCheck);

module.exports = router;

