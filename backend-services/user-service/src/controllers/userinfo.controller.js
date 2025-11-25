// src/controllers/userinfo.controller.js
// =======================================================
// 用户信息查询控制器 - 代理到userinfo-service
// =======================================================
const axios = require('axios');
const config = require('../config');

const USERINFO_SERVICE_URL = process.env.USER_INFO_SERVICE_URL || 'http://localhost:5000';

/**
 * 根据手机号查询用户信息HTTP接口
 */
async function getUserByPhone(req, res, next) {
  try {
    console.log('🔄 [Userinfo Proxy] 收到查询用户请求');
    console.log('📤 [Request Params]', JSON.stringify(req.params, null, 2));

    const { phoneNumber } = req.params;

    // 基本输入验证
    if (!phoneNumber) {
      console.log('❌ [Validation] 缺少手机号参数');
      return res.status(400).json({ 
        success: false,
        message: '缺少手机号参数',
        code: 'MISSING_PHONE_NUMBER'
      });
    }

    // 代理到userinfo-service
    console.log('🔄 [Proxy] 转发请求到 userinfo-service...');
    const response = await axios.get(`${USERINFO_SERVICE_URL}/api/persons/lookup`, {
      params: { phone_number: phoneNumber },
      timeout: 30000
    });

    console.log('✅ [Proxy] userinfo-service 响应成功');
    res.status(response.status).json(response.data);

  } catch (error) {
    console.error('❌ [Proxy Error] 查询用户失败:', error.message);
    
    // 处理HTTP错误
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    // 处理网络错误
    res.status(500).json({
      success: false,
      message: '用户信息服务不可用',
      code: 'USERINFO_SERVICE_UNAVAILABLE'
    });
  }
}

module.exports = {
  getUserByPhone
};
