// src/services/user.service.js
// =======================================================
// 用户服务层
// 处理用户注册、登录等业务逻辑
// =======================================================
const userEntity = require('../entity/user.entity');
const userInfoServiceClient = require('../clients/userInfo.client');
const relationshipClient = require('../rpc/clients/relationship.client');
const { ethers } = require('ethers');
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * 用户注册服务
 * 执行用户身份验证、账户创建和角色分配
 * @param {object} registrationData - 注册数据
 * @param {string} registrationData.id_card_number - 身份证号
 * @param {string} registrationData.phone_number - 手机号
 * @param {string} registrationData.email - 邮箱地址
 * @param {string} registrationData.eoa_address - EOA 地址（用于签名验证）
 * @param {string} registrationData.smart_account - Smart Account 地址（用户主键）
 * @returns {Promise<object>} 返回完整的用户信息
 */
async function registerUser(registrationData) {
  try {
    const { id_card_number, phone_number, email, eoa_address, smart_account } = registrationData;

    // 1. 调用用户信息源服务进行身份验证
    // 查询权威数据库以验证身份信息
    const personInfo = await userInfoServiceClient.findPerson({ id_card_number, phone_number, email });
  
    console.log('身份验证结果:', personInfo);
  
    // 2. 检查 Smart Account 是否已经注册
    let user = await userEntity.findUserBySmartAccount(smart_account);
    let isNewUser = !user;
    console.log(`是否为新用户: ${isNewUser}`);
    
    // 3. 如果是新用户，创建用户账户
    if (isNewUser) {
      user = await userEntity.createUser({
        eoaAddress: eoa_address,
        smartAccount: smart_account,
        uId: userEntity.generateUId(), // 生成唯一 UUID
        username: personInfo ? personInfo.full_name : '新用户', // 使用真实姓名或默认名
      });
      console.log('用户创建成功:', user);
    }
  
    // 4. 根据身份验证结果分配角色
    let assignedRole = 'guardian'; // 默认角色
    if (personInfo) {
      // 如果在权威信息库中验证成功，分配对应角色（elderly/doctor）
      assignedRole = personInfo.role;
      await userEntity.addUserRole(smart_account, assignedRole);
      console.log(`已为用户 ${smart_account} 分配角色 '${assignedRole}'`);
    } else {
      // 如果未能验证身份，分配默认角色 'guardian'（家属）
      await userEntity.addUserRole(smart_account, assignedRole);
      console.log(`已为用户 ${smart_account} 分配默认角色 '${assignedRole}'`);
    }
  
    console.log("身份验证详情:", personInfo);
    console.log("分配的角色:", assignedRole);
    console.log("是否为新用户:", isNewUser);
    // 5. 如果是老人角色且是新用户，初始化预设访问组
    if (isNewUser && assignedRole === 'elderly') {
      try {
        console.log(`正在为老人 ${smart_account} 初始化预设访问组...`);
        const result = await relationshipClient.initializeDefaultGroups(smart_account);
        console.log(`✅ 成功创建 ${result.count} 个预设访问组`);
      } catch (error) {
        console.error('⚠️  初始化预设访问组失败（非致命错误，用户仍可正常使用）:', error.message);
        // 不抛出错误，允许注册继续完成
      }
    }
  
    // 6. 返回完整的用户信息（包含所有角色）
    return await userEntity.findUserBySmartAccount(smart_account);
  } catch (error) {
    console.error('用户注册过程中发生错误:', error);
    throw { type: 'ERROR', message: '注册用户时发生错误。' };
  }
}

/**
 * 用户登录服务
 * 通过验证签名确认用户身份，然后签发 JWT Token
 * @param {object} loginData - 登录数据
 * @param {string} loginData.login_time - 登录时间戳
 * @param {string} loginData.signature - 使用 EOA 私钥签名的消息
 * @returns {Promise<object>} 返回 token 和用户信息
 * @note 签名必须使用 EOA 地址对应的私钥，Smart Account（合约地址）不能签名
 */
async function loginUser(loginData) {
  try{
    console.log('登录请求数据:', loginData);
    const { login_time, signature } = loginData;

    // 1. 构建被签名的消息原文
    // 注意：客户端和服务器必须使用完全相同的消息格式
    const message = `LOGIN_TIME:${login_time}`;
    console.log('验证消息:', message);
    
    // 2. 从签名中恢复 EOA 地址
    let recoveredEoaAddress;
    try {
      // 使用 ethers.js 验证签名并恢复签名者地址
      recoveredEoaAddress = ethers.verifyMessage(message, signature);
    } catch (error) {
      throw { type: 'AUTH_ERROR', message: '无效的签名格式。' };
    }
    
    // 3. 验证恢复的地址是否有效
    if (!ethers.isAddress(recoveredEoaAddress)) {
        throw { type: 'AUTH_ERROR', message: '无法恢复有效地址。' };
    }
    console.log('恢复的 EOA 地址:', recoveredEoaAddress);
    
    // 4. 通过 EOA 地址查找用户
    const user = await userEntity.findUserByEoaAddress(recoveredEoaAddress);
    if (!user || !user.is_active) {
      throw { type: 'NOT_FOUND', message: '用户不存在或已被禁用。' };
    }
  
    // 5. 签发 JWT Token，包含 EOA 地址和 Smart Account
    const payload = {
      eoa_address: user.eoa_address,         // EOA 地址（用于签名）
      smart_account: user.smart_account,     // Smart Account（用户主键）
      uId: user.u_id,                        // 用户 ID
      roles: user.roles,                     // 用户角色列表
    };
    console.log('JWT 载荷:', payload);
    console.log('JWT_SECRET 配置状态:', !!config.JWT_SECRET);
  
    // 生成 Token，有效期8小时
    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '8h' });
  
    return { token, user };

  } catch (error) {
    console.error('用户登录过程中发生错误:', error);
    throw { type: 'ERROR', message: '登录时发生错误。' };
  }
}

// 导出用户服务函数
module.exports = {
  registerUser,    // 用户注册
  loginUser,       // 用户登录
};