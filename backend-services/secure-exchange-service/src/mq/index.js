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
    // Secure Exchange Service 专用队列
    // ==========================================
    const exchangeQueue = await channel.assertQueue('secure-exchange.events', {
      durable: true
    });
    
    // 绑定路由键：监听与安全交换相关的事件
    await channel.bindQueue(exchangeQueue.queue, EXCHANGE_NAME, 'exchange.#');
    await channel.bindQueue(exchangeQueue.queue, EXCHANGE_NAME, 'secure-exchange.#');
    
    console.log(`[MQ Consumer] Queue "${exchangeQueue.queue}" is ready`);
    
    // ==========================================
    // 消费队列
    // ==========================================
    channel.prefetch(5); // 一次处理5条消息
    channel.consume(exchangeQueue.queue, async (msg) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          await handleExchangeEvent(event, wss);
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
 * 处理安全交换事件
 * @param {Object} event - 事件对象
 * @param {WebSocket.Server} wss - WebSocket服务器实例
 */
async function handleExchangeEvent(event, wss) {
  console.log('[MQ Consumer] Processing event:', event.type || 'unknown');
  
  const { type, recipient_address, data } = event;
  
  switch (type) {
    case 'pubkey_request':
      // 公钥请求通知
      if (recipient_address && data) {
        wsServer.notifyPublicKeyRequest(recipient_address, data);
      }
      break;
      
    case 'encrypted_message':
      // 加密消息通知
      if (recipient_address && data) {
        wsServer.notifyEncryptedMessage(recipient_address, data);
      }
      break;
      
    case 'message_acknowledged':
      // 消息确认通知
      if (data && data.senderAddress) {
        wsServer.notifyMessageAcknowledged(data.senderAddress, data);
      }
      break;
      
    default:
      console.log(`[MQ Consumer] Unknown event type: ${type}`);
  }
}

module.exports = { startConsumers };
