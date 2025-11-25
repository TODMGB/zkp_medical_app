// src/controllers/zkp.controller.js
// =======================================================
// ZKP验证控制器
// 处理医药打卡的零知识证明验证请求
// =======================================================
const zkpService = require('../services/zkp.service');

/**
 * 验证日常医药打卡ZKP证明
 * POST /zkp/verify/medical-checkin
 * Body: {
 *   pA: [string, string],
 *   pB: [[string, string], [string, string]],
 *   pC: [string, string],
 *   pubSignals: [string, string, string, string, string, string]
 * }
 */
async function verifyMedicalCheckin(req, res, next) {
  try {
    const { pA, pB, pC, pubSignals } = req.body;

    // 参数验证
    if (!pA || !Array.isArray(pA) || pA.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'pA 必须是长度为2的数组'
      });
    }

    if (!pB || !Array.isArray(pB) || pB.length !== 2 || 
        !Array.isArray(pB[0]) || pB[0].length !== 2 ||
        !Array.isArray(pB[1]) || pB[1].length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'pB 必须是 2x2 的二维数组'
      });
    }

    if (!pC || !Array.isArray(pC) || pC.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'pC 必须是长度为2的数组'
      });
    }

    if (!pubSignals || !Array.isArray(pubSignals) || pubSignals.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'pubSignals 必须是长度为6的数组 [userIdCommitment, medicationCommitment, weekStartDate, dayOfWeek, timestamp, challenge]'
      });
    }

    console.log('📥 收到日常医药打卡ZKP验证请求');
    console.log('  - userIdCommitment:', pubSignals[0]);
    console.log('  - medicationCommitment:', pubSignals[1]);

    const result = await zkpService.verifyMedicalCheckin(pA, pB, pC, pubSignals);

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ 验证日常医药打卡ZKP失败:', error);
    next(error);
  }
}

/**
 * 验证每周打卡汇总ZKP证明
 * POST /zkp/verify/weekly-summary
 * Body: {
 *   pA: [string, string],
 *   pB: [[string, string], [string, string]],
 *   pC: [string, string],
 *   pubSignals: [string]
 * }
 */
async function verifyWeeklySummary(req, res, next) {
  try {
    const { pA, pB, pC, pubSignals } = req.body;

    // 参数验证
    if (!pA || !Array.isArray(pA) || pA.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'pA 必须是长度为2的数组'
      });
    }

    if (!pB || !Array.isArray(pB) || pB.length !== 2 || 
        !Array.isArray(pB[0]) || pB[0].length !== 2 ||
        !Array.isArray(pB[1]) || pB[1].length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'pB 必须是 2x2 的二维数组'
      });
    }

    if (!pC || !Array.isArray(pC) || pC.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'pC 必须是长度为2的数组'
      });
    }

    if (!pubSignals || !Array.isArray(pubSignals) || pubSignals.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'pubSignals 必须是长度为1的数组 [weeklyMerkleRoot]'
      });
    }

    console.log('📥 收到每周打卡汇总ZKP验证请求');
    console.log('  - weeklyMerkleRoot:', pubSignals[0]);

    const result = await zkpService.verifyWeeklySummary(pA, pB, pC, pubSignals);

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ 验证每周打卡汇总ZKP失败:', error);
    next(error);
  }
}

/**
 * 批量验证日常医药打卡ZKP证明
 * POST /zkp/verify/batch-medical-checkin
 * Body: {
 *   proofs: [
 *     {
 *       pA: [string, string],
 *       pB: [[string, string], [string, string]],
 *       pC: [string, string],
 *       pubSignals: [string, string, string, string, string, string]
 *     },
 *     ...
 *   ]
 * }
 */
async function batchVerifyMedicalCheckins(req, res, next) {
  try {
    const { proofs } = req.body;

    // 参数验证
    if (!proofs || !Array.isArray(proofs) || proofs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'proofs 必须是非空数组'
      });
    }

    // 验证每个证明的格式
    for (let i = 0; i < proofs.length; i++) {
      const proof = proofs[i];
      if (!proof.pA || !proof.pB || !proof.pC || !proof.pubSignals) {
        return res.status(400).json({
          success: false,
          message: `证明 ${i} 缺少必需字段 (pA, pB, pC, pubSignals)`
        });
      }

      if (!Array.isArray(proof.pA) || proof.pA.length !== 2) {
        return res.status(400).json({
          success: false,
          message: `证明 ${i} 的 pA 必须是长度为2的数组`
        });
      }

      if (!Array.isArray(proof.pubSignals) || proof.pubSignals.length !== 6) {
        return res.status(400).json({
          success: false,
          message: `证明 ${i} 的 pubSignals 必须是长度为6的数组`
        });
      }
    }

    console.log(`📥 收到批量验证请求，共 ${proofs.length} 个证明`);

    const result = await zkpService.batchVerifyMedicalCheckins(proofs);

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ 批量验证失败:', error);
    next(error);
  }
}

/**
 * 获取ZKP验证器信息
 * GET /zkp/verifiers
 */
async function getVerifierInfo(req, res, next) {
  try {
    const addresses = require('../../smart_contract/addresses.json');

    const info = {
      success: true,
      verifiers: {
        medicalCheckin: {
          name: 'Medical ZKP Verifier',
          description: '日常医药打卡ZKP验证器',
          address: addresses.MedicalZKPVerifier.address,
          publicSignalsFormat: [
            'userIdCommitment (uint256)',
            'medicationCommitment (uint256)',
            'weekStartDate (uint256)',
            'dayOfWeek (uint256)',
            'timestamp (uint256)',
            'challenge (uint256)'
          ],
          endpoint: 'POST /zkp/verify/medical-checkin'
        },
        weeklySummary: {
          name: 'Weekly Summary Verifier',
          description: '每周打卡汇总ZKP验证器',
          address: addresses.WeeklySummaryVerifier.address,
          publicSignalsFormat: [
            'weeklyMerkleRoot (uint256)'
          ],
          endpoint: 'POST /zkp/verify/weekly-summary'
        }
      }
    };

    res.status(200).json(info);

  } catch (error) {
    console.error('❌ 获取验证器信息失败:', error);
    next(error);
  }
}

module.exports = {
  verifyMedicalCheckin,
  verifyWeeklySummary,
  batchVerifyMedicalCheckins,
  getVerifierInfo
};

