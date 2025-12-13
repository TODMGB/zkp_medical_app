// src/services/notification.service.js
// =======================================================
// 通知服务
// 通过 gRPC 或 HTTP 与通知服务通信
// =======================================================

const config = require('../config');
const axios = require('axios');

/**
 * 发布通知到通知服务
 * @param {object} notification - 通知对象
 * @param {string} notification.userId - 用户 ID
 * @param {string} notification.type - 通知类型
 * @param {string} notification.title - 通知标题
 * @param {string} notification.message - 通知消息
 * @param {object} notification.data - 通知数据
 * @returns {Promise<object>} 发送结果
 */
async function publishNotification(notification) {
  try {
    const { userId, type, title, message, data } = notification;

    if (!userId || !type || !title || !message) {
      throw new Error('缺少必要的通知字段: userId, type, title, message');
    }

    console.log(`[Notification] 发布通知，userId: ${userId}, type: ${type}`);

    // 构建通知对象
    const notificationPayload = {
      userId,
      type,
      title,
      message,
      data: data || {},
      timestamp: Date.now(),
      read: false
    };

    // 通过 HTTP 发送到通知服务
    const notificationServiceUrl = config.notification?.serviceUrl || 
      `http://localhost:${config.notification?.port || 3003}/api`;

    const response = await axios.post(
      `${notificationServiceUrl}/notifications/publish`,
      notificationPayload,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[Notification] 通知发送成功:`, response.data);
    return response.data;
  } catch (error) {
    console.error('[Notification] 通知发送失败:', error.message);
    // 不抛出错误，只记录日志，避免影响主流程
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 发送交易成功通知
 * @param {string} userId - 用户 ID
 * @param {string} weekKey - 周标识
 * @param {string} ipfsCid - IPFS CID
 * @param {string} txHash - 交易哈希
 * @returns {Promise<object>}
 */
async function sendTransactionSuccessNotification(userId, weekKey, ipfsCid, txHash) {
  return publishNotification({
    userId,
    type: 'medication_checkin_confirmed',
    title: '用药打卡已确认',
    message: `周 ${weekKey} 的用药打卡已在区块链上确认`,
    data: {
      weekKey,
      ipfsCid,
      txHash,
      timestamp: Date.now(),
      status: 'confirmed'
    }
  });
}

/**
 * 发送交易失败通知
 * @param {string} userId - 用户 ID
 * @param {string} weekKey - 周标识
 * @param {string} ipfsCid - IPFS CID
 * @param {string} error - 错误信息
 * @returns {Promise<object>}
 */
async function sendTransactionFailedNotification(userId, weekKey, ipfsCid, error) {
  return publishNotification({
    userId,
    type: 'medication_checkin_failed',
    title: '用药打卡失败',
    message: `周 ${weekKey} 的用药打卡失败: ${error}`,
    data: {
      weekKey,
      ipfsCid,
      error,
      timestamp: Date.now(),
      status: 'failed'
    }
  });
}

module.exports = {
  publishNotification,
  sendTransactionSuccessNotification,
  sendTransactionFailedNotification
};
