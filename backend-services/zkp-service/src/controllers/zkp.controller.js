// src/controllers/zkp.controller.js
// =======================================================
// ZKP 证明生成控制器
// =======================================================
const zkpService = require('../services/zkp.service');
const { v4: uuidv4 } = require('uuid');

/**
 * 异步启动周度汇总证明任务
 */
async function proveWeeklySummaryAsync(req, res) {
  try {
    const { inputs } = req.body;

    // 验证输入
    if (typeof inputs !== 'object' || Array.isArray(inputs) || inputs === null) {
      return res.status(400).json({ 
        success: false, 
        error: '输入必须是一个JSON对象，包含 merkleRoot 和 leaves 字段。' 
      });
    }

    if (!inputs.merkleRoot || !Array.isArray(inputs.leaves)) {
      return res.status(400).json({ 
        success: false, 
        error: '输入必须包含 merkleRoot (字符串) 和 leaves (数组)。' 
      });
    }

    // 生成唯一任务ID
    const jobId = uuidv4();
    
    // 获取用户地址（如果通过 API Gateway 认证）
    const userAddress = req.headers['x-user-smart-account'] || 'anonymous';

    console.log(`[ZKP Controller] 新建任务 ${jobId}, 用户: ${userAddress}`);

    // 启动异步证明生成任务
    zkpService.startWeeklySummaryProof(jobId, inputs, userAddress);

    // 立即返回任务ID
    res.status(202).json({ 
      success: true,
      jobId: jobId,
      message: 'ZKP证明生成任务已启动，请使用 jobId 查询状态。'
    });

  } catch (error) {
    console.error('[ZKP Controller] proveWeeklySummaryAsync error:', error);
    res.status(500).json({ 
      success: false, 
      error: '启动证明生成任务失败',
      message: error.message 
    });
  }
}

/**
 * 查询证明任务状态
 */
async function getProofStatus(req, res) {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少 jobId 参数' 
      });
    }

    const jobStatus = await zkpService.getJobStatus(jobId);

    if (!jobStatus) {
      return res.status(404).json({ 
        success: false, 
        error: '未找到指定的任务' 
      });
    }

    res.json({
      success: true,
      ...jobStatus
    });

  } catch (error) {
    console.error('[ZKP Controller] getProofStatus error:', error);
    res.status(500).json({ 
      success: false, 
      error: '查询任务状态失败',
      message: error.message 
    });
  }
}

/**
 * 健康检查
 */
function healthCheck(req, res) {
  res.json({ 
    success: true,
    service: 'zkp-service',
    status: 'UP',
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  proveWeeklySummaryAsync,
  getProofStatus,
  healthCheck
};

