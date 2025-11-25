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
    console.log('Connecting to RabbitMQ...');
    connection = await amqp.connect(config.mq.url);
    channel = await connection.createChannel();
    console.log('RabbitMQ connected and channel created.');

    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err.message);
      // 在这里可以添加重连逻辑
    });
    
    connection.on('close', () => {
      console.warn('RabbitMQ connection closed. Reconnecting...');
      // 重置单例，以便下次调用时重新连接
      connection = null;
      channel = null;
      // 在生产环境中，这里应该有更健壮的重连策略
      setTimeout(getChannel, 5000); 
    });

    return channel;
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    // 延迟后重试
    setTimeout(getChannel, 5000);
    throw error;
  }
}

module.exports = { getChannel };