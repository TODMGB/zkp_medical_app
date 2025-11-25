// src/controllers/recovery.controller.js
// =======================================================
// 社交恢复控制器 - 仅处理恢复流程
// 账户管理已移至 account.controller.js
// 守护者管理已移至 guardian.controller.js
// =======================================================
const recoveryService = require('../services/recovery.service');
const bundlerService = require('../services/bundler.service');
const mqProducer = require('../mq/producer');

/**
 * 构建守护者发起恢复的未签名 UserOperation（安全方法）
 * POST /recovery/initiate/build
 * Body: { accountAddress, guardianAccountAddress, newOwnerAddress }
 */
async function buildInitiateRecovery(req, res, next) {
  try {
    const { accountAddress, guardianAccountAddress, newOwnerAddress } = req.body;
    
    if (!accountAddress || !guardianAccountAddress || !newOwnerAddress) {
      return res.status(400).json({ 
        success: false, 
        message: '所有字段为必填项：accountAddress, guardianAccountAddress, newOwnerAddress' 
      });
    }

    const result = await recoveryService.buildInitiateRecoveryUserOp(
      accountAddress,
      guardianAccountAddress,
      newOwnerAddress
    );
    
    res.status(200).json({ 
      success: true, 
      data: result,
      message: '请使用返回的 userOpHash 在客户端签名，然后调用 /recovery/submit 提交'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 守护者发起恢复（已弃用：不安全，需要私钥）
 * POST /recovery/initiate
 * Body: { accountAddress, guardianAccountAddress, guardianOwnerPrivateKey, newOwnerAddress }
 * @deprecated 请使用 buildInitiateRecovery + submitUserOp
 */
async function initiateRecovery(req, res, next) {
  try {
    const { 
      accountAddress, 
      guardianAccountAddress, 
      guardianOwnerPrivateKey, 
      newOwnerAddress 
    } = req.body;
    
    if (!accountAddress || !guardianAccountAddress || !guardianOwnerPrivateKey || !newOwnerAddress) {
      return res.status(400).json({ 
        success: false, 
        message: '所有字段为必填项：accountAddress, guardianAccountAddress, guardianOwnerPrivateKey, newOwnerAddress' 
      });
    }

    const result = await recoveryService.initiateRecoveryViaUserOp(
      accountAddress,
      guardianAccountAddress,
      guardianOwnerPrivateKey,
      newOwnerAddress
    );
    
    // 📨 发送MQ通知：账户恢复已发起
    if (result.success) {
      try {
        await mqProducer.publishRecoveryInitiated(
          accountAddress,
          guardianAccountAddress,
          newOwnerAddress,
          result.txHash
        );
        console.log('📨 [MQ] 已发送"发起账户恢复"通知');
      } catch (mqError) {
        console.error('❌ [MQ] 发送通知失败（不影响主流程）:', mqError);
      }
    }
    
    res.status(200).json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 构建守护者支持恢复的未签名 UserOperation（安全方法）
 * POST /recovery/support/build
 * Body: { accountAddress, guardianAccountAddress, newOwnerAddress }
 */
async function buildSupportRecovery(req, res, next) {
  try {
    const { accountAddress, guardianAccountAddress, newOwnerAddress } = req.body;
    
    if (!accountAddress || !guardianAccountAddress || !newOwnerAddress) {
      return res.status(400).json({ 
        success: false, 
        message: '所有字段为必填项：accountAddress, guardianAccountAddress, newOwnerAddress' 
      });
    }

    const result = await recoveryService.buildSupportRecoveryUserOp(
      accountAddress,
      guardianAccountAddress,
      newOwnerAddress
    );
    
    res.status(200).json({ 
      success: true, 
      data: result,
      message: '请使用返回的 userOpHash 在客户端签名，然后调用 /recovery/submit 提交'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 守护者支持恢复（已弃用：不安全，需要私钥）
 * POST /recovery/support
 * Body: { accountAddress, guardianAccountAddress, guardianOwnerPrivateKey, newOwnerAddress }
 * @deprecated 请使用 buildSupportRecovery + submitUserOp
 */
async function supportRecovery(req, res, next) {
  try {
    const { 
      accountAddress, 
      guardianAccountAddress, 
      guardianOwnerPrivateKey, 
      newOwnerAddress 
    } = req.body;
    
    if (!accountAddress || !guardianAccountAddress || !guardianOwnerPrivateKey || !newOwnerAddress) {
      return res.status(400).json({ 
        success: false, 
        message: '所有字段为必填项：accountAddress, guardianAccountAddress, guardianOwnerPrivateKey, newOwnerAddress' 
      });
    }

    const result = await recoveryService.supportRecoveryViaUserOp(
      accountAddress,
      guardianAccountAddress,
      guardianOwnerPrivateKey,
      newOwnerAddress
    );
    
    // 📨 发送MQ通知：守护者支持恢复
    if (result.success) {
      try {
        // 获取当前恢复状态以获取支持数
        const recoveryStatus = await recoveryService.getRecoveryStatus(accountAddress);
        const guardianInfo = await recoveryService.getGuardians(accountAddress);
        
        await mqProducer.publishRecoverySupported(
          accountAddress,
          guardianAccountAddress,
          newOwnerAddress,
          parseInt(recoveryStatus.approvalCount),
          parseInt(guardianInfo.threshold),
          result.txHash
        );
        console.log('📨 [MQ] 已发送"支持账户恢复"通知');
      } catch (mqError) {
        console.error('❌ [MQ] 发送通知失败（不影响主流程）:', mqError);
      }
    }
    
    res.status(200).json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 构建Owner取消恢复的未签名 UserOperation（安全方法）
 * POST /recovery/cancel/build
 * Body: { accountAddress }
 */
async function buildCancelRecovery(req, res, next) {
  try {
    const { accountAddress } = req.body;
    
    if (!accountAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'accountAddress 为必填项' 
      });
    }

    const result = await recoveryService.buildCancelRecoveryUserOp(accountAddress);
    
    res.status(200).json({ 
      success: true, 
      data: result,
      message: '请使用返回的 userOpHash 在客户端签名，然后调用 /recovery/submit 提交'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Owner取消恢复（已弃用：不安全，需要私钥）
 * POST /recovery/cancel
 * Body: { accountAddress, ownerPrivateKey }
 * @deprecated 请使用 buildCancelRecovery + submitUserOp
 */
async function cancelRecovery(req, res, next) {
  try {
    const { accountAddress, ownerPrivateKey } = req.body;
    
    if (!accountAddress || !ownerPrivateKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'accountAddress 和 ownerPrivateKey 为必填项' 
      });
    }

    const result = await recoveryService.cancelRecoveryViaUserOp(
      accountAddress,
      ownerPrivateKey
    );
    
    // 📨 发送MQ通知：账户恢复已取消
    if (result.success) {
      try {
        // 获取守护者列表以便通知他们
        const guardianInfo = await recoveryService.getGuardians(accountAddress);
        const accountInfo = await recoveryService.getAccountInfo(accountAddress);
        
        await mqProducer.publishRecoveryCancelled(
          accountAddress,
          accountInfo.owner,
          result.txHash,
          guardianInfo.guardians
        );
        console.log('📨 [MQ] 已发送"取消账户恢复"通知');
      } catch (mqError) {
        console.error('❌ [MQ] 发送通知失败（不影响主流程）:', mqError);
      }
    }
    
    res.status(200).json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    next(error);
  }
}


/**
 * 查询恢复状态
 * GET /recovery/status/:accountAddress
 */
async function getRecoveryStatus(req, res, next) {
  try {
    const { accountAddress } = req.params;
    
    if (!accountAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'accountAddress 为必填项' 
      });
    }

    const result = await recoveryService.getRecoveryStatus(accountAddress);
    
    res.status(200).json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    next(error);
  }
}


/**
 * 提交已签名的 UserOperation
 * POST /recovery/submit
 * Body: { userOp (包含签名) }
 */
async function submitUserOp(req, res, next) {
  try {
    const { userOp } = req.body;
    
    if (!userOp || !userOp.signature || userOp.signature === '0x') {
      return res.status(400).json({ 
        success: false, 
        message: 'userOp 必须包含有效的签名' 
      });
    }

    const result = await bundlerService.handleSubmit(userOp);
    
    res.status(200).json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    next(error);
  }
}

// 导出控制器函数
module.exports = {
  // 新的安全方法
  buildInitiateRecovery,
  buildSupportRecovery,
  buildCancelRecovery,
  submitUserOp,
  // 旧的不安全方法（已弃用但保留向后兼容）
  initiateRecovery,
  supportRecovery,
  cancelRecovery,
  // 查询方法
  getRecoveryStatus
};
