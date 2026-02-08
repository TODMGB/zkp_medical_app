// src/controllers/auth.controller.js
// =======================================================
// 认证控制器 - 处理HTTP请求，调用内部服务逻辑
// =======================================================
const authService = require('../services/auth.service');
const userinfoService = require('../services/userinfo.service');
const crypto = require('crypto');
const userEntity = require('../entity/user.entity');

function normalizeEmail(email) {
  if (!email) return null;
  return String(email).trim().toLowerCase();
}

function normalizePhone(phone) {
  if (!phone) return null;
  return String(phone).trim();
}

function normalizeIdCard(idCard) {
  if (!idCard) return null;
  return String(idCard).trim();
}

function sha256Hex(input) {
  if (!input) return null;
  return crypto.createHash('sha256').update(String(input), 'utf8').digest('hex');
}

/**
 * 用户注册HTTP接口
 */
async function register(req, res, next) {
  try {
    console.log('🔄 [Auth Controller] 收到注册请求');
    console.log('📤 [Request Body]', JSON.stringify(req.body, null, 2));

    const { eoa_address, smart_account_address, phone_number, id_card_number, email, encryption_public_key } = req.body;

    // 基本输入验证
    if (!eoa_address || !smart_account_address) {
      console.log('❌ [Validation] 缺少必要参数');
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：eoa_address 和 smart_account_address 是必需的',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 至少需要一个身份标识
    if (!phone_number && !id_card_number && !email) {
      console.log('❌ [Validation] 缺少身份标识参数');
      return res.status(400).json({
        success: false,
        message: '至少需要提供一个身份标识（phone_number、id_card_number 或 email）',
        code: 'MISSING_IDENTITY_FIELDS'
      });
    }

    // 1. 查询个人档案信息
    console.log('🔄 [Service] 查询个人档案信息...');
    const personInfo = await userinfoService.lookupPersonInfo({
      id_card_number,
      phone_number,
      email
    });

    let result;
    if (personInfo) {
      console.log('✅ [Service] 个人档案查询成功:', personInfo);

      // 2. 调用认证服务注册用户
      console.log('🔄 [Service] 调用认证服务...');
      result = await authService.register({
        eoa_address,
        smart_account_address,
        phone_number: personInfo.phone_number,
        email: email || personInfo.email,
        id_card_number,
        username: personInfo.full_name,  // 使用真实姓名
        role: personInfo.role,      // 使用查询到的角色
        encryption_public_key       // 传递加密公钥
      });
    } else {
      //没信息默认家属用户
      console.log('✅ [Service] 个人档案查询失败');
      result = await authService.register({
        eoa_address,
        smart_account_address,
        phone_number: phone_number,
        email,
        id_card_number,
        username: "家属用户_" + phone_number,  // 使用真实姓名
        role: "guardian",     // 使用查询到的角色
        encryption_public_key // 传递加密公钥
      });
    }

    console.log('✅ [Service] 注册成功');
    res.status(201).json({
      success: true,
      message: '注册成功',
      data: result
    });
    console.log('✅ [Response] 响应已发送');

  } catch (error) {
    console.error('❌ [Error] 注册失败:', error);

    // 处理特定错误
    if (error.code === 'USER_ALREADY_EXISTS') {
      return res.status(409).json({
        success: false,
        message: '用户已存在',
        code: 'USER_ALREADY_EXISTS'
      });
    }

    if (error.code === 'IDENTITY_ALREADY_BOUND') {
      return res.status(409).json({
        success: false,
        message: '身份标识已绑定到其他账号',
        code: 'IDENTITY_ALREADY_BOUND'
      });
    }

    res.status(500).json({
      success: false,
      message: '注册失败',
      code: 'REGISTRATION_FAILED'
    });
  }
}

async function resolveSmartAccount(req, res, next) {
  try {
    const { phone_number, id_card_number, email } = req.body || {};

    if (!phone_number && !id_card_number && !email) {
      return res.status(400).json({
        success: false,
        message: '至少需要提供一个身份标识（phone_number、id_card_number 或 email）',
        code: 'MISSING_IDENTITY_FIELDS'
      });
    }

    const personInfo = await userinfoService.lookupPersonInfo({
      id_card_number,
      phone_number,
      email
    });

    if (!personInfo) {
      return res.status(404).json({
        success: false,
        message: '未找到人员记录',
        code: 'PERSON_NOT_FOUND'
      });
    }

    await userEntity.ensureIdentityBindingsTable();

    const binding = await userEntity.findSmartAccountByIdentity({
      phoneHash: sha256Hex(normalizePhone(personInfo.phone_number || phone_number)),
      emailHash: sha256Hex(normalizeEmail(email || personInfo.email)),
      idCardHash: sha256Hex(normalizeIdCard(id_card_number))
    });

    if (!binding) {
      return res.status(404).json({
        success: false,
        message: '未找到对应账号',
        code: 'SMART_ACCOUNT_NOT_FOUND'
      });
    }

    const user = await userEntity.findUserBySmartAccount(binding.smart_account);
    const roles = user?.roles ? user.roles.filter(r => r !== null) : [];

    return res.status(200).json({
      success: true,
      message: '解析成功',
      data: {
        smart_account: binding.smart_account,
        username: user?.username || null,
        roles
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 用户登录HTTP接口
 */
async function login(req, res, next) {
  try {
    console.log('🔄 [Auth Controller] 收到登录请求');
    console.log('📤 [Request Body]', JSON.stringify(req.body, null, 2));

    const { eoa_address, signature, login_time, smart_account } = req.body;
    const message = `LOGIN_TIME:${login_time}`;
    // 基本输入验证
    if (!eoa_address || !signature || !login_time) {
      console.log('❌ [Validation] 缺少必要参数');
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    if (!smart_account) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数 smart_account',
        code: 'MISSING_SMART_ACCOUNT'
      });
    }

    // 调用认证服务
    console.log('🔄 [Service] 调用认证服务...');
    const result = await authService.login({
      eoa_address,
      signature,
      message,
      smart_account
    });

    console.log('✅ [Service] 登录成功');
    res.status(200).json({
      success: true,
      message: '登录成功',
      data: result
    });
    console.log('✅ [Response] 响应已发送');

  } catch (error) {
    console.error('❌ [Error] 登录失败:', error);

    // 处理特定错误
    if (error.code === 'USER_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    if (error.code === 'INVALID_SIGNATURE') {
      return res.status(401).json({
        success: false,
        message: '签名验证失败',
        code: 'INVALID_SIGNATURE'
      });
    }

    if (error.code === 'MISSING_SMART_ACCOUNT') {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数 smart_account',
        code: 'MISSING_SMART_ACCOUNT'
      });
    }

    if (error.code === 'EOA_NOT_OWNER') {
      return res.status(401).json({
        success: false,
        message: '当前EOA不是该智能账户的owner',
        code: 'EOA_NOT_OWNER'
      });
    }

    if (error.code === 'CHAIN_OWNER_LOOKUP_FAILED') {
      return res.status(503).json({
        success: false,
        message: '查询链上账户 owner 失败',
        code: 'CHAIN_OWNER_LOOKUP_FAILED'
      });
    }

    res.status(500).json({
      success: false,
      message: '登录失败',
      code: 'LOGIN_FAILED'
    });
  }
}

/**
 * 更新加密公钥HTTP接口
 * 需要用户认证
 */
async function updateEncryptionKey(req, res, next) {
  try {
    console.log('🔄 [Auth Controller] 收到更新加密公钥请求');
    console.log('📤 [Request Body]', JSON.stringify(req.body, null, 2));

    const { encryption_public_key } = req.body;
    const smartAccount = req.user?.smart_account;

    // 验证用户认证
    if (!smartAccount) {
      console.log('❌ [Validation] 未认证');
      return res.status(401).json({
        success: false,
        message: '未认证',
        code: 'UNAUTHORIZED'
      });
    }

    // 验证公钥格式
    if (!encryption_public_key || !encryption_public_key.startsWith('0x') || encryption_public_key.length !== 132) {
      console.log('❌ [Validation] 加密公钥格式无效');
      return res.status(400).json({
        success: false,
        message: '加密公钥格式无效（必须是 0x 开头的 132 字符十六进制字符串）',
        code: 'INVALID_ENCRYPTION_KEY'
      });
    }

    // 调用实体层更新公钥
    const userEntity = require('../entity/user.entity');
    const updatedUser = await userEntity.updateEncryptionPublicKey(smartAccount, encryption_public_key);

    console.log('✅ [Service] 加密公钥更新成功');
    res.status(200).json({
      success: true,
      message: '加密公钥更新成功',
      data: {
        smart_account: updatedUser.smart_account,
        encryption_public_key: updatedUser.encryption_public_key,
        encryption_key_updated_at: updatedUser.encryption_key_updated_at
      }
    });
    console.log('✅ [Response] 响应已发送');

  } catch (error) {
    console.error('❌ [Error] 更新加密公钥失败:', error);
    res.status(500).json({
      success: false,
      message: '更新加密公钥失败',
      code: 'UPDATE_FAILED'
    });
  }
}

module.exports = {
  register,
  login,
  updateEncryptionKey,
  resolveSmartAccount
};
