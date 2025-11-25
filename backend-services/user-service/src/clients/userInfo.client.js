// src/clients/userInfo.client.js
const axios = require('axios');
const config = require('../config');

// 创建一个axios实例，并设置基础URL和超时时间
const apiClient = axios.create({
  baseURL: config.services.USER_INFO_SERVICE_URL,
  timeout: 5000, // 设置5秒的请求超时
});

/**
 * 调用 UserInfo Source Service 来查找个人档案
 * @param {object} params - { id_card_number, phone_number, email }
 * @returns {Promise<object|null>} 返回找到的个人信息，如果未找到则返回null
 */
    async function findPerson(params) {
    try {
    console.log('[UserInfo Client] Sending request to lookup person with params:', params);

    // 发送 GET 请求到 /api/persons/lookup，并附带查询参数
    const response = await apiClient.get('/api/persons/lookup', {
      params: {
        id_card_number: params.id_card_number,
        phone_number: params.phone_number,
        email: params.email,
      },
    });

    // 请求成功，返回响应数据
    console.log('[UserInfo Client] Person found:', response.data.full_name);
    return response.data;

  } catch (error) {
    // 优雅地处理错误
    if (axios.isAxiosError(error) && error.response) {
      // 如果是下游服务返回的特定错误（如404），我们将其视为“未找到”
      if (error.response.status === 404) {
        console.log('[UserInfo Client] Person not found (404).');
        return null; // 返回null，表示没有找到记录
      }
      // 对于其他来自下游服务的错误，可以记录并向上抛出更通用的错误
      console.error(`[UserInfo Client] Error from UserInfo Service: ${error.response.status}`, error.response.data);
    } else {
      // 处理网络错误或超时等问题
      console.error('[UserInfo Client] Network or other error:', error.message);
    }
    
    // 对于所有错误情况，我们可以选择返回null或向上抛出异常
    // 在注册场景下，返回null是更合理的选择，表示“核验失败，未找到此人”
    return null;
  }
}

module.exports = {
  findPerson,
};