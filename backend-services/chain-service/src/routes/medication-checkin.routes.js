// src/routes/medication-checkin.routes.js
// =======================================================
// 用药打卡上链路由
// =======================================================

const express = require('express');
const router = express.Router();
const {
  submitProofToChain,
  getMedicationCheckInCount,
  getAllCheckInCids,
  getCheckInTimestamp,
  getWeeklyCheckinFromIpfs
} = require('../controllers/medication-checkin.controller');
const authMiddleware = require('../middleware/auth.middleware');

/**
 * POST /chain/medication-checkin/submit
 * 提交周度证明到链上
 */
router.post('/submit', authMiddleware, submitProofToChain);

/**
 * GET /chain/medication-checkin/count
 * 查询打卡记录总数
 */
router.get('/count', authMiddleware, getMedicationCheckInCount);

/**
 * GET /chain/medication-checkin/cids
 * 获取所有打卡的 CID 列表
 */
router.get('/cids', authMiddleware, getAllCheckInCids);
router.get('/ipfs/:cid', authMiddleware, getWeeklyCheckinFromIpfs);

/**
 * GET /chain/medication-checkin/timestamp/:cid
 * 查询指定 CID 的打卡时间戳
 */
router.get('/timestamp/:cid', authMiddleware, getCheckInTimestamp);

module.exports = router;
