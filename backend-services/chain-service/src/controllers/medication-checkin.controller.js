// src/controllers/medication-checkin.controller.js
// =======================================================
// 用药打卡上链控制器
// 处理周度证明的上链请求
// =======================================================

const { uploadJSONToIPFS } = require('../services/ipfs.service');
const { submitMedicationCheckIn } = require('../services/medication-checkin.service');

/**
 * 提交周度证明到链上
 * POST /chain/medication-checkin/submit
 */
async function submitProofToChain(req, res) {
  try {
    const { weekKey, proof, publicSignals, calldata, records, leaves, merkleRoot, timestamp, smartAccountAddress: bodySenderAddress } = req.body;
    const userId = req.user?.id || req.user?.smart_account || req.user?.address;
    const middlewareSenderAddress = req.user?.smart_account || req.user?.address;
    
    // 优先使用请求体中的地址，其次使用中间件提取的地址
    const smartAccountAddress = bodySenderAddress || middlewareSenderAddress;

    if (!userId || !smartAccountAddress) {
      return res.status(401).json({
        success: false,
        message: '未授权：缺少用户信息或 Smart Account 地址'
      });
    }

    if (!weekKey || !proof || !calldata || !records || !records.length) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：weekKey, proof, calldata, records'
      });
    }

    console.log(`[MedicationCheckIn] 收到上链请求，weekKey: ${weekKey}, userId: ${userId}`);

    // 构建 JSON 文档
    const jsonData = {
      weekKey,
      userId,
      proof,
      publicSignals,
      calldata,
      records,
      leaves,
      merkleRoot,
      timestamp,
      submittedAt: Date.now()
    };

    // 上传到 IPFS
    console.log('[MedicationCheckIn] 上传数据到 IPFS...');
    const ipfsResult = await uploadJSONToIPFS(
      jsonData,
      `medication-checkin-${weekKey}-${userId}`,
      { weekKey, userId }
    );

    const ipfsCid = ipfsResult.cid;
    console.log(`[MedicationCheckIn] IPFS 上传成功，CID: ${ipfsCid}`);

    // 异步提交到链上（不等待结果）
    submitMedicationCheckIn(weekKey, userId, smartAccountAddress, ipfsCid, calldata, publicSignals, proof)
      .catch(error => {
        console.error(`[MedicationCheckIn] 上链失败: ${error.message}`);
      });

    // 立即返回响应
    return res.status(200).json({
      success: true,
      message: '上链请求已提交，处理中...',
      data: {
        weekKey,
        ipfsCid,
        ipfsUrl: ipfsResult.url,
        submittedAt: Date.now()
      }
    });
  } catch (error) {
    console.error('[MedicationCheckIn] 提交失败:', error);
    return res.status(500).json({
      success: false,
      message: '提交失败',
      error: error.message
    });
  }
}

/**
 * 查询打卡记录总数
 * GET /chain/medication-checkin/count
 */
async function getMedicationCheckInCount(req, res) {
  try {
    const smartAccountAddress = req.user?.smart_account || req.user?.address;

    if (!smartAccountAddress) {
      return res.status(401).json({
        success: false,
        message: '未授权'
      });
    }

    console.log(`[MedicationCheckIn] 查询打卡记录总数，address: ${smartAccountAddress}`);

    const { getMedicationCheckInCount } = require('../services/medication-checkin.service');
    const count = await getMedicationCheckInCount(smartAccountAddress);

    return res.status(200).json({
      success: true,
      data: {
        count,
        address: smartAccountAddress
      }
    });
  } catch (error) {
    console.error('[MedicationCheckIn] 查询失败:', error);
    return res.status(500).json({
      success: false,
      message: '查询失败',
      error: error.message
    });
  }
}

/**
 * 获取所有打卡的 CID 列表
 * GET /chain/medication-checkin/cids
 */
async function getAllCheckInCids(req, res) {
  try {
    const smartAccountAddress = req.user?.smart_account || req.user?.address;

    if (!smartAccountAddress) {
      return res.status(401).json({
        success: false,
        message: '未授权'
      });
    }

    console.log(`[MedicationCheckIn] 查询所有 CID，address: ${smartAccountAddress}`);

    const { getAllCheckInCids } = require('../services/medication-checkin.service');
    const cids = await getAllCheckInCids(smartAccountAddress);

    return res.status(200).json({
      success: true,
      data: {
        cids,
        count: cids.length,
        address: smartAccountAddress
      }
    });
  } catch (error) {
    console.error('[MedicationCheckIn] 查询失败:', error);
    return res.status(500).json({
      success: false,
      message: '查询失败',
      error: error.message
    });
  }
}

/**
 * 查询指定 CID 的打卡时间戳
 * GET /chain/medication-checkin/timestamp/:cid
 */
async function getCheckInTimestamp(req, res) {
  try {
    const { cid } = req.params;
    const smartAccountAddress = req.user?.smart_account || req.user?.address;

    if (!smartAccountAddress) {
      return res.status(401).json({
        success: false,
        message: '未授权'
      });
    }

    if (!cid) {
      return res.status(400).json({
        success: false,
        message: '缺少 CID 参数'
      });
    }

    console.log(`[MedicationCheckIn] 查询时间戳，CID: ${cid}, address: ${smartAccountAddress}`);

    const { getCheckInTimestamp } = require('../services/medication-checkin.service');
    const timestamp = await getCheckInTimestamp(smartAccountAddress, cid);

    return res.status(200).json({
      success: true,
      data: {
        cid,
        timestamp,
        address: smartAccountAddress
      }
    });
  } catch (error) {
    console.error('[MedicationCheckIn] 查询失败:', error);
    return res.status(500).json({
      success: false,
      message: '查询失败',
      error: error.message
    });
  }
}

module.exports = {
  submitProofToChain,
  getMedicationCheckInCount,
  getAllCheckInCids,
  getCheckInTimestamp
};
