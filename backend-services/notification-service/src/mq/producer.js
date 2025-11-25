// src/mq/producer.js
// ==========================================
// MQ 生产者 - 发布通知事件
// ==========================================
const { getChannel } = require('./client');
const config = require('../config');

// 从配置中获取交换机名称
const EXCHANGE_NAME = config.mq.exchangeName;

/**
 * 发布通知事件到消息队列
 * @param {object} notification - 通知对象
 */
async function publishNotificationEvent(notification) {
  try {
    const channel = await getChannel();
    
    // 确保交换机存在，类型为'topic'，并且是持久化的
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    
    // 构建路由键：notification.{priority}.{type}
    const priority = (notification.priority || 'NORMAL').toLowerCase();
    const type = notification.type.toLowerCase().replace(/_/g, '.');
    const routingKey = `notification.${priority}.${type}`;
    
    const message = Buffer.from(JSON.stringify(notification));
    
    // 发布消息到指定的交换机
    channel.publish(EXCHANGE_NAME, routingKey, message, {
      persistent: true,  // 将消息标记为持久化
      priority: getPriorityValue(notification.priority)  // 设置消息优先级
    });
    
    console.log(`[MQ Producer] 📤 Published notification: ${routingKey}`, {
      recipient: notification.recipient_address,
      type: notification.type,
      priority: notification.priority
    });
    
  } catch (error) {
    console.error('[MQ Producer] ❌ Error publishing notification event:', error.message);
    // 在生产环境中，这里可以添加失败重试或备用处理逻辑
    throw error;
  }
}

/**
 * 获取优先级数值
 */
function getPriorityValue(priority) {
  const priorityMap = {
    'HIGH': 10,
    'NORMAL': 5,
    'LOW': 1
  };
  return priorityMap[priority] || 5;
}

module.exports = {
  publishNotificationEvent,
};
