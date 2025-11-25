// src/mq/index.js
const { getChannel } = require('./client');
const { handleUserCreated } = require('./consumers/user.consumer');
const config = require('../config');

const EXCHANGE_NAME = config.mq.exchangeName;
const QUEUE_NAME = 'user_service_queue'; // 定义此服务的队列名称

/**
 * 启动此服务的所有消息消费者
 */
async function startConsumers() {
  try {
    const channel = await getChannel();
    
    // 确保交换机存在
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    
    // 创建一个持久化的、非独占的队列
    const q = await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`[MQ Consumer] Queue "${q.queue}" is waiting for messages.`);
    
    // 定义我们感兴趣的路由键
    const bindingKeys = ['user.created']; 
    
    // 将队列绑定到交换机，并指定路由键
    for (const key of bindingKeys) {
      await channel.bindQueue(q.queue, EXCHANGE_NAME, key);
    }
    
    // 开始消费消息
    channel.consume(q.queue, (msg) => {
      if (msg.content) {
        const routingKey = msg.fields.routingKey;
        const messageContent = JSON.parse(msg.content.toString());
        
        console.log(`[MQ Consumer] Received message with routing key: "${routingKey}"`);
        
        // 根据路由键分发到不同的处理器
        if (routingKey === 'user.created') {
          handleUserCreated(messageContent);
        }
        
        // 手动确认消息已被成功处理
        channel.ack(msg);
      }
    }, {
      noAck: false // 我们将手动确认消息
    });

  } catch (error) {
    console.error('[MQ Consumer] Failed to start consumers:', error);
  }
}

module.exports = { startConsumers };