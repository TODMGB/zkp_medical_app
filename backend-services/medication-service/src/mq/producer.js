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

    const recipient_address = notificationData?.recipient_address || notificationData?.recipient || notificationData?.userId;
    const type = notificationData?.type;

    let priority = (notificationData?.priority || 'NORMAL').toString().toLowerCase();
    if (priority === 'urgent') priority = 'high';
    if (!['high', 'normal', 'low'].includes(priority)) priority = 'normal';
    const normalizedPriority = priority.toUpperCase();

    const title = notificationData?.title || type || 'Notification';
    const body = notificationData?.body || notificationData?.message || '您有一条新通知';
    const data = notificationData?.data || null;
    const channels = Array.isArray(notificationData?.channels)
      ? notificationData.channels
      : ['push', 'websocket'];

    const routingType = (type || 'unknown').toLowerCase().replace(/_/g, '.');
    const routingKey = `notification.${priority}.${routingType}`;
    const message = Buffer.from(JSON.stringify({
      recipient_address,
      type,
      priority: normalizedPriority,
      title,
      body,
      data,
      channels,
    }));

    // 发布消息到指定的交换机
    channel.publish(EXCHANGE_NAME, routingKey, message, {
      persistent: true, // 将消息标记为持久化
      priority: priority === 'high' ? 10 : priority === 'low' ? 1 : 5,
    });

    console.log(`[MQ Producer] ✅ Sent notification '${routingKey}' to ${recipient_address}`);
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
      recipient_address: planData.patient_address,
      title: '新用药计划',
      body: '医生为您创建了新的用药计划，请及时查看',
      priority: 'NORMAL',
      channels: ['push', 'websocket'],
      data: planData,
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
      title: '用药计划已更新',
      body: '您的用药计划已更新，请及时查看',
      priority: 'NORMAL',
      channels: ['push', 'websocket'],
      data: planData,
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
      title: '用药计划已分享',
      body: '有新的用药计划与您分享，请及时查看',
      priority: 'NORMAL',
      channels: ['push', 'websocket'],
      data: shareData,
    });
  } catch (error) {
    console.error('[MQ Producer] ❌ 发送用药计划分享通知失败:', error);
    throw error;
  }
}
async function publishMedicationPlanCancelled(payload) {
  try {
    await publishNotification({
      type: 'medication_plan_cancelled',
      recipient_address: payload.recipient_address,
      title: '用药计划已取消',
      body: '有一份用药计划已被取消，请及时查看',
      priority: 'NORMAL',
      channels: ['push', 'websocket'],
      data: payload,
    });
  } catch (error) {
    console.error('[MQ Producer] ❌ 发送用药计划取消通知失败:', error);
    throw error;
  }
}

module.exports = {
  publishNotification,
  publishMedicationPlanCreated,
  publishMedicationPlanUpdated,
  publishMedicationPlanShared,
  publishMedicationPlanCancelled
};
