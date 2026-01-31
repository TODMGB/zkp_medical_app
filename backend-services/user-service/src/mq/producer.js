// src/mq/producer.js
const { getChannel } = require('./client');
const config =require('../config');

// 从配置中获取交换机名称
const EXCHANGE_NAME = config.mq.exchangeName;

async function publishNotification(notification) {
  try {
    const channel = await getChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    let priority = (notification.priority || 'normal').toLowerCase();
    if (priority === 'urgent') {
      priority = 'high';
    }

    const normalizedPriority = priority.toUpperCase();
    const routingKey = `notification.${priority}`;

    const notificationToSend = {
      ...notification,
      priority: normalizedPriority
    };

    const message = Buffer.from(JSON.stringify(notificationToSend));
    channel.publish(EXCHANGE_NAME, routingKey, message, {
      persistent: true,
      priority: priority === 'high' ? 10 : priority === 'low' ? 1 : 5
    });

    console.log(`[MQ Producer] Sent notification '${routingKey}' to ${notification.recipient_address}`);
  } catch (error) {
    console.error('[MQ Producer] Error publishing notification:', error);
  }
}

/**
 * 发布一个"用户已创建"的事件到消息队列
 * @param {object} user - 新创建的用户对象
 */
async function publishUserCreated(user) {
  try {
    const channel = await getChannel();
    // 确保交换机存在，类型为'topic'，并且是持久化的
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    const routingKey = 'user.created'; // 定义路由键
    const message = Buffer.from(JSON.stringify(user));

    // 发布消息到指定的交换机
    channel.publish(EXCHANGE_NAME, routingKey, message, {
      persistent: true, // 将消息标记为持久化
    });

    console.log(`[MQ Producer] Sent event '${routingKey}':`, user);
  } catch (error) {
    console.error('[MQ Producer] Error publishing user.created event:', error);
    // 在这里可以添加失败重试或备用处理逻辑
  }
}

module.exports = {
  publishUserCreated,
  publishNotification,
};