// src/mq/index.js
// ==========================================
// MQ 消费者启动器
// ==========================================
const { getChannel } = require('./client');
const { handleNotification } = require('./consumers/notification.consumer');
const config = require('../config');

const EXCHANGE_NAME = config.mq.exchangeName;

/**
 * 启动此服务的所有消息消费者
 * @param {WebSocket.Server} wss - WebSocket服务器实例
 */
async function startConsumers(wss) {
  try {
    const channel = await getChannel();
    
    // 确保交换机存在
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    
    // ==========================================
    // 高优先级队列
    // ==========================================
    const highQueue = await channel.assertQueue('notification.high', {
      durable: true,
      maxPriority: 10
    });
    // 绑定两种格式的 routing key
    await channel.bindQueue(highQueue.queue, EXCHANGE_NAME, 'notification.high');
    await channel.bindQueue(highQueue.queue, EXCHANGE_NAME, 'notification.high.*');
    await channel.bindQueue(highQueue.queue, EXCHANGE_NAME, 'notification.high.#');
    console.log(`[MQ Consumer] Queue "${highQueue.queue}" is ready (HIGH priority)`);
    
    // ==========================================
    // 普通优先级队列
    // ==========================================
    const normalQueue = await channel.assertQueue('notification.normal', {
      durable: true
    });
    // 绑定两种格式的 routing key
    await channel.bindQueue(normalQueue.queue, EXCHANGE_NAME, 'notification.normal');
    await channel.bindQueue(normalQueue.queue, EXCHANGE_NAME, 'notification.normal.*');
    await channel.bindQueue(normalQueue.queue, EXCHANGE_NAME, 'notification.normal.#');
    console.log(`[MQ Consumer] Queue "${normalQueue.queue}" is ready (NORMAL priority)`);
    
    // ==========================================
    // 低优先级队列
    // ==========================================
    const lowQueue = await channel.assertQueue('notification.low', {
      durable: true
    });
    // 绑定两种格式的 routing key
    await channel.bindQueue(lowQueue.queue, EXCHANGE_NAME, 'notification.low');
    await channel.bindQueue(lowQueue.queue, EXCHANGE_NAME, 'notification.low.*');
    await channel.bindQueue(lowQueue.queue, EXCHANGE_NAME, 'notification.low.#');
    console.log(`[MQ Consumer] Queue "${lowQueue.queue}" is ready (LOW priority)`);
    
    // ==========================================
    // 消费高优先级队列（一次处理1条）
    // ==========================================
    channel.prefetch(1);
    channel.consume(highQueue.queue, async (msg) => {
      if (msg) {
        try {
          const notification = JSON.parse(msg.content.toString());
          await handleNotification(notification, wss);
          channel.ack(msg);
        } catch (error) {
          console.error('[MQ Consumer] Error processing HIGH priority message:', error.message);
          channel.nack(msg, false, false); // 拒绝消息，不重新入队
        }
      }
    }, { noAck: false });
    
    // ==========================================
    // 消费普通优先级队列（一次处理5条）
    // ==========================================
    const normalChannel = await getChannel(); // 使用新通道
    normalChannel.prefetch(5);
    normalChannel.consume(normalQueue.queue, async (msg) => {
      if (msg) {
        try {
          const notification = JSON.parse(msg.content.toString());
          await handleNotification(notification, wss);
          normalChannel.ack(msg);
        } catch (error) {
          console.error('[MQ Consumer] Error processing NORMAL priority message:', error.message);
          normalChannel.nack(msg, false, false);
        }
      }
    }, { noAck: false });
    
    // ==========================================
    // 消费低优先级队列（一次处理10条）
    // ==========================================
    const lowChannel = await getChannel(); // 使用新通道
    lowChannel.prefetch(10);
    lowChannel.consume(lowQueue.queue, async (msg) => {
      if (msg) {
        try {
          const notification = JSON.parse(msg.content.toString());
          await handleNotification(notification, wss);
          lowChannel.ack(msg);
        } catch (error) {
          console.error('[MQ Consumer] Error processing LOW priority message:', error.message);
          lowChannel.nack(msg, false, false);
        }
      }
    }, { noAck: false });
    
    console.log('[MQ Consumer] ✅ All notification consumers started successfully');

  } catch (error) {
    console.error('[MQ Consumer] ❌ Failed to start consumers:', error.message);
    throw error;
  }
}

module.exports = { startConsumers };