// src/mq/producer.js
const { getChannel } = require('./client');
const config = require('../config');

// 从配置中获取交换机名称
const EXCHANGE_NAME = config.mq.exchangeName;

/**
 * 发布通知消息到消息队列
 * @param {object} notificationData - 通知数据
 */
async function publishNotification(notificationData) {
  try {
    const channel = await getChannel();
    // 确保交换机存在，类型为'topic'，并且是持久化的
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    const routingKey = `notification.${notificationData.type}`; // 如: notification.medication_plan_created
    const message = Buffer.from(JSON.stringify(notificationData));

    // 发布消息到指定的交换机
    channel.publish(EXCHANGE_NAME, routingKey, message, {
      persistent: true, // 将消息标记为持久化
    });

    console.log(`[MQ Producer] Sent notification '${routingKey}' to ${notificationData.recipient}`);
  } catch (error) {
    console.error('[MQ Producer] Error publishing notification:', error);
    // 在这里可以添加失败重试或备用处理逻辑
  }
}

/**
 * 发布用药计划创建事件
 * @param {object} planData - 用药计划数据
 */
async function publishMedicationPlanCreated(planData) {
  try {
    console.log('[MQ Producer] 准备发送用药计划创建通知...');
    console.log('  患者地址:', planData.patient_address);
    console.log('  计划ID:', planData.plan_id);
    
    await publishNotification({
      type: 'medication_plan_created',
      recipient_address: planData.patient_address,  // ✅ 改为 recipient_address 以匹配通知服务的字段
      data: planData
    });
    console.log('[MQ Producer] ✅ 用药计划创建通知已发送');
  } catch (error) {
    console.error('[MQ Producer] ❌ 发送用药计划创建通知失败:', error);
    throw error;
  }
}

/**
 * 发布用药计划更新事件
 * @param {object} planData - 用药计划数据
 */
async function publishMedicationPlanUpdated(planData) {
  try {
    await publishNotification({
      type: 'medication_plan_updated',
      recipient_address: planData.patient_address,
      data: planData
    });
  } catch (error) {
    console.error('[MQ Producer] ❌ 发送用药计划更新通知失败:', error);
    throw error;
  }
}

/**
 * 发布用药计划分享事件
 * @param {object} shareData - 分享数据
 */
async function publishMedicationPlanShared(shareData) {
  try {
    await publishNotification({
      type: 'medication_plan_shared',
      recipient_address: shareData.recipient,
      data: shareData
    });
  } catch (error) {
    console.error('[MQ Producer] ❌ 发送用药计划分享通知失败:', error);
    throw error;
  }
}

module.exports = {
  publishNotification,
  publishMedicationPlanCreated,
  publishMedicationPlanUpdated,
  publishMedicationPlanShared
};
