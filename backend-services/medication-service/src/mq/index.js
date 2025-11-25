// src/mq/index.js
// ==========================================
// MQ 消费者启动器
// ==========================================
const { getChannel } = require('./client');
const config = require('../config');
const wsServer = require('../websocket/server');

const EXCHANGE_NAME = config.mq.exchangeName;

/**
 * 启动此服务的所有消息消费者
 * @param {WebSocket.Server} wss - WebSocket服务器实例（可选）
 */
async function startConsumers(wss) {
  try {
    const channel = await getChannel();
    
    // 确保交换机存在
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    
    // ==========================================
    // 示例队列：监听服务相关事件
    // ==========================================
    const serviceQueue = await channel.assertQueue('service.events', {
      durable: true
    });
    
    // 绑定路由键：监听所有 service.* 事件
    await channel.bindQueue(serviceQueue.queue, EXCHANGE_NAME, 'service.#');
    
    console.log(`[MQ Consumer] Queue "${serviceQueue.queue}" is ready`);
    
    // ==========================================
    // 消费队列
    // ==========================================
    channel.prefetch(5); // 一次处理5条消息
    channel.consume(serviceQueue.queue, async (msg) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          await handleServiceEvent(event, wss);
          channel.ack(msg);
        } catch (error) {
          console.error('[MQ Consumer] Error processing message:', error.message);
          channel.nack(msg, false, false); // 拒绝消息，不重新入队
        }
      }
    }, { noAck: false });
    
    console.log('[MQ Consumer] ✅ All consumers started successfully');

  } catch (error) {
    console.error('[MQ Consumer] ❌ Failed to start consumers:', error.message);
    throw error;
  }
}

/**
 * 处理服务事件
 * @param {Object} event - 事件对象
 * @param {WebSocket.Server} wss - WebSocket服务器实例
 */
async function handleServiceEvent(event, wss) {
  console.log('[MQ Consumer] Processing event:', event.type || 'unknown');
  
  const { type, recipient_address, data } = event;
  
  // 根据事件类型处理
  switch (type) {
    case 'user_created':
      console.log('[MQ Consumer] User created:', data);
      // 可以通过 WebSocket 推送给相关用户
      // wsServer.sendToUser(recipient_address, { type: 'user_created', data });
      break;
      
    case 'notification':
      // 推送通知到用户
      if (recipient_address && data) {
        wsServer.sendToUser(recipient_address, {
          type: 'notification',
          data
        });
      }
      break;
      
    default:
      console.log(`[MQ Consumer] Unknown event type: ${type}`);
  }
}

module.exports = { startConsumers };
