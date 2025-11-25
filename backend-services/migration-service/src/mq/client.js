// src/mq/client.js
const amqp = require('amqplib');
const config = require('../config');

// 单例变量，用于存储连接和通道
let connection = null;
let channel = null;

/**
 * 获取一个 RabbitMQ 通道单例。
 * 如果连接或通道不存在，则会创建它们。
 * @returns {Promise<import('amqplib').Channel>} 返回一个通道实例
 */
async function getChannel() {
  if (channel) {
    return channel;
  }
  
  try {
    console.log('[MQ Client] 🔄 Connecting to RabbitMQ:', config.mq.url);
    connection = await amqp.connect(config.mq.url);
    channel = await connection.createChannel();
    console.log('[MQ Client] ✅ RabbitMQ connected and channel created.');
    console.log('[MQ Client] 📡 Using exchange:', config.mq.exchangeName);

    connection.on('error', (err) => {
      console.error('[MQ Client] ❌ RabbitMQ connection error:', err.message);
      // 在这里可以添加重连逻辑
    });
    
    connection.on('close', () => {
      console.warn('[MQ Client] ⚠️ RabbitMQ connection closed. Will reconnect on next use...');
      // 重置单例，以便下次调用时重新连接
      connection = null;
      channel = null;
    });

    return channel;
  } catch (error) {
    console.error('[MQ Client] ❌ Failed to connect to RabbitMQ:', error.message);
    console.error('[MQ Client] ❌ Make sure RabbitMQ is running at:', config.mq.url);
    console.error('[MQ Client] ❌ Exchange name:', config.mq.exchangeName);
    throw error;
  }
}

module.exports = { getChannel };