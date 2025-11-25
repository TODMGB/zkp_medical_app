// src/mq/producer.js
// =======================================================
// RabbitMQ 生产者 - 发送通知事件
// =======================================================
const amqp = require('amqplib');
const config = require('../config');

let channel = null;

/**
 * 初始化 RabbitMQ 连接和 channel
 */
async function initMQ() {
  try {
    const connection = await amqp.connect(config.mq.url);
    channel = await connection.createChannel();
    
    // 确保交换机存在（Topic 类型）
    await channel.assertExchange(config.mq.exchangeName, 'topic', { durable: true });
    
    console.log('[MQ Producer] RabbitMQ connected and exchange asserted:', config.mq.exchangeName);
  } catch (error) {
    console.error('[MQ Producer] Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

/**
 * 发布通知事件到 RabbitMQ
 * @param {object} notificationData - 通知数据
 * @param {string} notificationData.type - 通知类型 (例如 'zkp.proof.completed')
 * @param {string} notificationData.priority - 优先级 ('high', 'normal', 'low')
 * @param {object} notificationData.payload - 通知负载
 */
async function publishNotification(notificationData) {
  if (!channel) {
    await initMQ();
  }

  const { type, priority = 'normal', payload } = notificationData;

  // 构造 routing key: notification.{priority}
  const routingKey = `notification.${priority}`;

  const message = {
    type,
    ...payload,
    timestamp: Date.now()
  };

  try {
    channel.publish(
      config.mq.exchangeName,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true, // 消息持久化
        contentType: 'application/json'
      }
    );

    console.log(`[MQ Producer] Published to ${routingKey}:`, type);
  } catch (error) {
    console.error('[MQ Producer] Failed to publish message:', error);
    throw error;
  }
}

module.exports = {
  initMQ,
  publishNotification
};
