// src/controllers/account.controller.js
// =======================================================
// 账户控制器 - 统一的抽象账户管理
// 整合了社交恢复账户的创建和查询功能
// =======================================================
const recoveryService = require('../services/recovery.service');
const paymasterService = require('../services/paymaster.service');

/**
 * 创建社交恢复账户
 * POST /account
 * Body: { ownerAddress, guardians?, threshold?, salt? }
 */
async function createAccount(req, res, next) {
  try {
    const { ownerAddress, guardians = [], threshold = 0, salt = 0 } = req.body;
    
    if (!ownerAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'ownerAddress 为必填项' 
      });
    }

    // 验证守护者和阈值的一致性
    if (guardians.length > 0 && threshold === 0) {
      return res.status(400).json({
        success: false,
        message: '设置了守护者时，threshold 必须大于 0'
      });
    }

    if (threshold > guardians.length) {
      return res.status(400).json({
        success: false,
        message: 'threshold 不能大于守护者数量'
      });
    }

    const result = await recoveryService.createAccount(
      ownerAddress,
      guardians,
      threshold,
      salt
    );
    
    res.status(201).json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 预计算账户地址（不创建账户）
 * POST /account/address
 * Body: { ownerAddress, guardians?, threshold?, salt? }
 */
async function getAccountAddress(req, res, next) {
  try {
    const { ownerAddress, guardians = [], threshold = 0, salt = 0 } = req.body;
    
    if (!ownerAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'ownerAddress 为必填项' 
      });
    }

    const result = await recoveryService.getAccountAddress(
      ownerAddress,
      guardians,
      threshold,
      salt
    );
    
    res.status(200).json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 查询账户完整信息
 * GET /account/:accountAddress
 */
async function getAccountInfo(req, res, next) {
  try {
    const { accountAddress } = req.params;
    
    if (!accountAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'accountAddress 为必填项' 
      });
    }

    const result = await recoveryService.getAccountInfo(accountAddress);
    
    res.status(200).json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 获取账户 Nonce
 * GET /account/:accountAddress/nonce
 */
async function getNonce(req, res, next) {
  try {
    const { accountAddress } = req.params;
    
    if (!accountAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'accountAddress 为必填项' 
      });
    }

    const nonce = await paymasterService.getNonce(accountAddress);
    
    res.status(200).json({ 
      success: true, 
      data: { 
        accountAddress,
        nonce: nonce.toString() 
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 构建账户创建的 InitCode
 * POST /account/initcode
 * Body: { ownerAddress, guardians?, threshold?, salt? }
 */
async function buildInitCode(req, res, next) {
  try {
    const { ownerAddress, guardians = [], threshold = 0, salt = 0 } = req.body;
    
    if (!ownerAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'ownerAddress 为必填项' 
      });
    }

    // 注意：这里需要扩展 paymasterService 以支持守护者参数
    // 暂时使用原有的方法（不支持守护者）
    const initCode = await paymasterService.buildInitCode(ownerAddress, salt);
    
    res.status(200).json({ 
      success: true, 
      data: { 
        initCode,
        ownerAddress,
        salt 
      }
    });
  } catch (error) {
    next(error);
  }
}

// 导出控制器函数
module.exports = {
  createAccount,
  getAccountAddress,
  getAccountInfo,
  getNonce,
  buildInitCode
};
