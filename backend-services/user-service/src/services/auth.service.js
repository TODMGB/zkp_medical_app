// src/services/auth.service.js
// =======================================================
// 认证服务 - 处理用户注册和登录业务逻辑
// =======================================================
const userEntity = require('../entity/user.entity');
const relationshipClient = require('../clients/relationship.client');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { ethers } = require('ethers');

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
 * 用户注册服务
 */
async function register(userData) {
  const {
    eoa_address,
    smart_account_address,
    phone_number,
    id_card_number,
    email,
    username,
    role,
    encryption_public_key
  } = userData;

  try {
    // 1. 检查用户是否已存在
    const existingUser = await userEntity.findUserByEoaAddress(eoa_address);
    if (existingUser) {
      const error = new Error('用户已存在');
      error.code = 'USER_ALREADY_EXISTS';
      throw error;
    }

    // 2. 验证加密公钥格式（如果提供）
    if (encryption_public_key) {
      if (!encryption_public_key.startsWith('0x')) {
        const error = new Error('加密公钥格式无效（必须以 0x 开头）');
        error.code = 'INVALID_ENCRYPTION_KEY';
        throw error;
      }
      
      // 支持压缩公钥（68字符：0x + 66）和非压缩公钥（132字符：0x + 130）
      const validLengths = [68, 132];
      if (!validLengths.includes(encryption_public_key.length)) {
        const error = new Error(`加密公钥长度无效（当前: ${encryption_public_key.length}，应为 68 或 132）`);
        error.code = 'INVALID_ENCRYPTION_KEY';
        throw error;
      }
      
      // 验证是否为有效的十六进制
      if (!/^0x[0-9a-fA-F]+$/.test(encryption_public_key)) {
        const error = new Error('加密公钥必须是十六进制格式');
        error.code = 'INVALID_ENCRYPTION_KEY';
        throw error;
      }
      
      console.log(`✅ [Auth Service] 用户提供了加密公钥（${encryption_public_key.length === 68 ? '压缩' : '非压缩'}）: ${encryption_public_key.substring(0, 20)}...`);
    }

    // 3. 创建用户（使用真实姓名，保存加密公钥）
    const newUser = await userEntity.createUser({
      eoaAddress: eoa_address.toLowerCase(),
      smartAccount: smart_account_address.toLowerCase(),
      uId: userEntity.generateUId(),
      username: username, // 使用真实姓名，如果没有则使用手机号
      encryptionPublicKey: encryption_public_key || null // 保存加密公钥
    });

    try {
      await userEntity.ensureIdentityBindingsTable();
      await userEntity.upsertIdentityBinding({
        smartAccount: smart_account_address.toLowerCase(),
        phoneHash: sha256Hex(normalizePhone(phone_number)),
        emailHash: sha256Hex(normalizeEmail(email)),
        idCardHash: sha256Hex(normalizeIdCard(id_card_number))
      });
    } catch (bindError) {
      if (bindError && bindError.code === '23505') {
        const error = new Error('身份标识已绑定到其他账号');
        error.code = 'IDENTITY_ALREADY_BOUND';
        throw error;
      }
      throw bindError;
    }

    // 4. 添加用户角色（如果提供了角色）
    const roles = [];
    if (role) {
      console.log(`🔄 [Auth Service] 为用户添加角色: ${role}`);
      await userEntity.addUserRole(smart_account_address.toLowerCase(), role);
      roles.push(role);
    }

    // 4.5. 如果是老人角色，初始化默认访问组
    if (role === 'elderly') {
      try {
        console.log(`🔄 [Auth Service] 为老人用户初始化默认访问组: ${smart_account_address}`);
        const initResult = await relationshipClient.initializeDefaultGroups(smart_account_address.toLowerCase());
        console.log(`✅ [Auth Service] 成功初始化 ${initResult.count} 个默认访问组`);
      } catch (error) {
        console.error('❌ [Auth Service] 初始化默认访问组失败:', error);
        // 不阻塞注册流程，仅记录错误
      }
    }

    // 5. 生成JWT Token（包含角色信息）
    const token = jwt.sign(
      {
        user_id: newUser.id,
        eoa_address: newUser.eoa_address,
        smart_account: newUser.smart_account,
        roles: roles  // 添加角色到JWT Token
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return {
      user_id: newUser.u_id,
      eoa_address: newUser.eoa_address,
      smart_account: newUser.smart_account,
      phone_number: phone_number,
      username: newUser.username,
      role: role,
      encryption_public_key: newUser.encryption_public_key, // 返回加密公钥
      token
    };

  } catch (error) {
    console.error('认证服务注册错误:', error);
    throw error;
  }
}

/**
 * 用户登录服务
 */
async function login(loginData) {
  const { eoa_address, signature, message } = loginData;

  try {
    // 1. 查找用户
    console.log(`🔄 [Auth Service] 查找用户: ${eoa_address}`);
    const user = await userEntity.findUserByEoaAddress(eoa_address.toLowerCase());
    console.log(`✅ [Auth Service] 查找用户成功: ${JSON.stringify(user)}`);
    if (!user) {
      const error = new Error('用户不存在');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // 2. 验证签名
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== eoa_address.toLowerCase()) {
        const error = new Error('签名验证失败');
        error.code = 'INVALID_SIGNATURE';
        throw error;
      }
    } catch (sigError) {
      const error = new Error('签名验证失败');
      error.code = 'INVALID_SIGNATURE';
      throw error;
    }

    // 3. 生成JWT Token（包含角色信息）
    const roles = user.roles ? user.roles.filter(r => r !== null) : [];
    console.log(`✅ [Auth Service] 查询到的用户对象: ${JSON.stringify(user)}`);
    console.log(`✅ [Auth Service] 提取的角色列表: ${JSON.stringify(roles)}`);
    
    const tokenPayload = {
      user_id: user.u_id,
      eoa_address: user.eoa_address,
      smart_account: user.smart_account,
      roles: roles  // 添加角色到JWT Token
    };
    console.log(`✅ [Auth Service] JWT Token Payload: ${JSON.stringify(tokenPayload)}`);
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return {
      user_id: user.u_id,
      eoa_address: user.eoa_address,
      smart_account: user.smart_account,
      username: user.username,
      roles: roles,
      encryption_public_key: user.encryption_public_key, // 返回加密公钥
      token
    };

  } catch (error) {
    console.error('认证服务登录错误:', error);
    throw error;
  }
}

module.exports = {
  register,
  login
};
