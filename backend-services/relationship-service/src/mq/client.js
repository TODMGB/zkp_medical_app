// src/mq/client.js
// =======================================================
// RabbitMQ 消息队列客户端
// 提供 RabbitMQ 连接和通道的单例管理
// =======================================================
const amqp = require('amqplib');
const config = require('../config');

// 单例变量，用于存储 RabbitMQ 连接和通道
let connection = null;
let channel = null;

/**
 * 获取 RabbitMQ 通道单例
 * 如果连接或通道不存在，则自动创建
 * @returns {Promise<import('amqplib').Channel>} 返回一个通道实例
 */
async function getChannel() {
  // 如果通道已存在，直接返回
  if (channel) {
    return channel;
  }
  
  try {
    console.log('正在连接 RabbitMQ...');
    // 连接到 RabbitMQ 服务器
    connection = await amqp.connect(config.mq.url);
    // 创建通道
    channel = await connection.createChannel();
    console.log('✅ RabbitMQ 连接成功，通道已创建');

    // 监听连接错误事件
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ 连接错误:', err.message);
      // 可以在这里添加重连逻辑
    });
    
    // 监听连接关闭事件
    connection.on('close', () => {
      console.warn('⚠️ RabbitMQ 连接已关闭，5秒后尝试重连...');
      // 重置单例变量，以便下次调用时重新连接
      connection = null;
      channel = null;
      // 5秒后尝试重连（生产环境应使用更健壮的重连策略）
      setTimeout(getChannel, 5000); 
    });

    return channel;
  } catch (error) {
    console.error('❌ RabbitMQ 连接失败:', error);
    // 5秒后尝试重连
    setTimeout(getChannel, 5000);
    throw error;
  }
}

// 导出获取通道的函数
module.exports = { getChannel };