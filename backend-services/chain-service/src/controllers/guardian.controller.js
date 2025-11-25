// src/controllers/guardian.controller.js
// =======================================================
// 守护者控制器 - 守护者管理
// =======================================================
const recoveryService = require('../services/recovery.service');
const bundlerService = require('../services/bundler.service');
const mqProducer = require('../mq/producer');

/**
 * 构建添加守护者的未签名 UserOperation（安全方法）
 * POST /guardian/build
 * Body: { accountAddress, guardianAddress }
 */
async function buildAddGuardian(req, res, next) {
  try {
    const { accountAddress, guardianAddress } = req.body;
    
    if (!accountAddress || !guardianAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'accountAddress 和 guardianAddress 为必填项' 
      });
    }

    const result = await recoveryService.buildAddGuardianUserOp(
      accountAddress,
      guardianAddress
    );
    
    res.status(200).json({ 
      success: true, 
      data: result,
      message: '请使用返回的 userOpHash 在客户端签名，然后调用 /guardian/submit 提交'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 添加守护者（已弃用：不安全，需要私钥）
 * POST /guardian
 * Body: { accountAddress, ownerPrivateKey, guardianAddress }
 * @deprecated 请使用 buildAddGuardian + submitUserOp
 */
async function addGuardian(req, res, next) {
  try {
    const { accountAddress, ownerPrivateKey, guardianAddress } = req.body;
    
    if (!accountAddress || !ownerPrivateKey || !guardianAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'accountAddress, ownerPrivateKey 和 guardianAddress 为必填项' 
      });
    }

    const result = await recoveryService.addGuardianViaUserOp(
      accountAddress,
      ownerPrivateKey,
      guardianAddress
    );
    
    // 📨 发送MQ通知：守护者已添加
    if (result.success) {
      try {
        await mqProducer.publishGuardianAdded(
          accountAddress,
          guardianAddress,
          result.txHash
        );
        console.log('📨 [MQ] 已发送"添加守护者"通知');
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
 * 查询守护者列表
 * GET /guardian/:accountAddress
 */
async function getGuardians(req, res, next) {
  try {
    const { accountAddress } = req.params;
    
    if (!accountAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'accountAddress 为必填项' 
      });
    }

    const result = await recoveryService.getGuardians(accountAddress);
    
    res.status(200).json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 构建修改阈值的未签名 UserOperation（安全方法）
 * POST /guardian/threshold/build
 * Body: { accountAddress, newThreshold }
 */
async function buildChangeThreshold(req, res, next) {
  try {
    const { accountAddress, newThreshold } = req.body;
    
    if (!accountAddress || newThreshold === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'accountAddress 和 newThreshold 为必填项' 
      });
    }

    const result = await recoveryService.buildChangeThresholdUserOp(
      accountAddress,
      newThreshold
    );
    
    res.status(200).json({ 
      success: true, 
      data: result,
      message: '请使用返回的 userOpHash 在客户端签名，然后调用 /guardian/submit 提交'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 修改阈值（已弃用：不安全，需要私钥）
 * PUT /guardian/threshold
 * Body: { accountAddress, ownerPrivateKey, newThreshold }
 * @deprecated 请使用 buildChangeThreshold + submitUserOp
 */
async function changeThreshold(req, res, next) {
  try {
    const { accountAddress, ownerPrivateKey, newThreshold } = req.body;
    
    if (!accountAddress || !ownerPrivateKey || newThreshold === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'accountAddress, ownerPrivateKey 和 newThreshold 为必填项' 
      });
    }

    // 获取旧阈值（在修改之前）
    let oldThreshold = 0;
    try {
      const guardianInfo = await recoveryService.getGuardians(accountAddress);
      oldThreshold = parseInt(guardianInfo.threshold);
    } catch (error) {
      console.warn('⚠️ 无法获取旧阈值:', error.message);
    }

    const result = await recoveryService.changeThresholdViaUserOp(
      accountAddress,
      ownerPrivateKey,
      newThreshold
    );
    
    // 📨 发送MQ通知：阈值已修改
    if (result.success) {
      try {
        await mqProducer.publishThresholdChanged(
          accountAddress,
          oldThreshold,
          newThreshold,
          result.txHash
        );
        console.log('📨 [MQ] 已发送"修改阈值"通知');
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
 * 提交已签名的 UserOperation
 * POST /guardian/submit
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
  buildAddGuardian,
  buildChangeThreshold,
  submitUserOp,
  // 旧的不安全方法（已弃用但保留向后兼容）
  addGuardian,
  changeThreshold,
  // 查询方法
  getGuardians
};
