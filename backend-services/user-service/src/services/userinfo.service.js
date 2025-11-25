// src/services/userinfo.service.js
// =======================================================
// 用户信息查询服务 - 处理用户信息查询业务逻辑
// =======================================================

const axios = require('axios');

const USERINFO_SERVICE_URL = process.env.USER_INFO_SERVICE_URL || 'http://localhost:5000';

/**
 * 查询个人档案信息（从外部userinfo-service）
 * @param {Object} params - 查询参数
 * @param {string} params.id_card_number - 身份证号
 * @param {string} params.phone_number - 手机号
 * @param {string} params.email - 邮箱
 * @returns {Promise<Object|null>} 返回个人档案信息或null
 */
async function lookupPersonInfo(params) {
  try {
    const { id_card_number, phone_number, email } = params;
    
    console.log('🔄 [Userinfo Service] 查询个人档案信息');
    console.log('📤 [Query Params]', JSON.stringify(params, null, 2));
    
    // 至少需要一个查询参数
    if (!id_card_number && !phone_number && !email) {
      throw new Error('至少需要提供一个查询参数');
    }
    
    // 调用外部userinfo-service
    const response = await axios.get(`${USERINFO_SERVICE_URL}/api/persons/lookup`, {
      params: {
        id_card_number,
        phone_number,
        email
      },
      timeout: 30000
    });
    
    console.log('✅ [Userinfo Service] 个人档案查询成功');
    console.log('📥 [Person Info]', {
      name: response.data.name,
      role: response.data.role,
      phone: response.data.phone_number
    });
    
    return response.data;
    
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('ℹ️ [Userinfo Service] 个人档案不存在');
      return null;
    }
    
    console.error('❌ [Userinfo Service] 个人档案查询失败:', error.message);
    throw new Error('个人档案查询失败: ' + error.message);
  }
}

module.exports = {
  lookupPersonInfo
};
