// src/mq/producer.js
const { getChannel } = require('./client');
const config = require('../config');

// 从配置中获取交换机名称
const EXCHANGE_NAME = config.mq.exchangeName;

/**
 * 发布通知到消息队列（使用Notification Service的交换机）
 * @param {object} notification - 通知对象
 */
async function publishNotification(notification) {
  try {
    const channel = await getChannel();
    // 确保交换机存在，类型为'topic'，并且是持久化的
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    // 确定优先级和路由键
    let priority = (notification.priority || 'normal').toLowerCase();
    
    // ✅ 转为大写，匹配通知服务的数据库格式
    const normalizedPriority = priority.toUpperCase();
    
    // 发送到队列时使用小写路由键
    const routingKey = `notification.${priority}`;
    
    // 修改通知对象的priority为大写格式
    const notificationToSend = {
      ...notification,
      priority: normalizedPriority
    };
    
    const message = Buffer.from(JSON.stringify(notificationToSend));

    // 发布消息到指定的交换机
    channel.publish(EXCHANGE_NAME, routingKey, message, {
      persistent: true, // 将消息标记为持久化
      priority: priority === 'high' ? 10 : priority === 'urgent' ? 20 : 5
    });

    console.log(`[MQ Producer] Sent notification '${routingKey}' to ${notification.recipient_address}`);
  } catch (error) {
    console.error('[MQ Producer] Error publishing notification:', error);
  }
}

/**
 * 发布加密消息通知
 * @param {string} recipientAddress - 接收方地址
 * @param {object} messageData - 消息数据
 */
async function publishEncryptedMessageNotification(recipientAddress, messageData) {
  const notification = {
    recipient_address: recipientAddress,
    title: '新的加密消息',
    body: `来自 ${messageData.senderAddress} 的加密消息`,
    type: 'encrypted_message',
    data: messageData,
    priority: 'high',
    channels: ['push', 'websocket']
  };
  
  await publishNotification(notification);
}

module.exports = {
  publishNotification,
  publishEncryptedMessageNotification,
};