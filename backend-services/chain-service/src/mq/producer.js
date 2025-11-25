// src/mq/producer.js
// =======================================================
// 消息队列生产者 - 发送通知到 Notification Service
// =======================================================
const { getChannel } = require('./client');
const config = require('../config');

// 从配置中获取交换机名称
const EXCHANGE_NAME = config.mq.exchangeName;

/**
 * 发布通知到消息队列（通用方法）
 * @param {object} notification - 通知对象
 */
async function publishNotification(notification) {
  try {
    const channel = await getChannel();
    // 确保交换机存在，类型为'topic'，并且是持久化的
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    // 确定优先级和路由键（映射到通知服务的优先级）
    let priority = (notification.priority || 'normal').toLowerCase();
    // 将 urgent 映射到 high（因为通知服务只有 high/normal/low）
    if (priority === 'urgent') {
      priority = 'high';
    }
    
    // ✅ 转为大写，匹配通知服务的数据库格式
    const normalizedPriority = priority.toUpperCase();
    
    // 发送到队列时使用小写路由键
    const routingKey = `notification.${priority}`;
    
    // 修改通知对象的priority为大写格式
    const notificationToSend = {
      ...notification,
      priority: normalizedPriority
    };
    
    const message = Buffer.from(JSON.stringify(notificationToSend));

    // 发布消息到指定的交换机
    channel.publish(EXCHANGE_NAME, routingKey, message, {
      persistent: true, // 将消息标记为持久化
      priority: priority === 'high' ? 10 : priority === 'low' ? 1 : 5
    });

    console.log(`[MQ Producer] ✅ Sent notification '${routingKey}' to ${notification.recipient_address}`);
  } catch (error) {
    console.error('[MQ Producer] ❌ Error publishing notification:', error);
  }
}

// =======================================================
// 守护者管理相关通知
// =======================================================

/**
 * 发布"添加守护者"通知
 * @param {string} accountAddress - 账户地址
 * @param {string} guardianAddress - 守护者地址
 * @param {string} txHash - 交易哈希
 */
async function publishGuardianAdded(accountAddress, guardianAddress, txHash) {
  await publishNotification({
    recipient_address: accountAddress,
    title: '守护者已添加',
    body: `新守护者 ${guardianAddress.substring(0, 10)}... 已成功添加到您的账户`,
    type: 'guardian_added',
    data: {
      account_address: accountAddress,
      guardian_address: guardianAddress,
      tx_hash: txHash,
      timestamp: Date.now()
    },
    priority: 'high',
    channels: ['push', 'websocket']
  });
}

/**
 * 发布"修改恢复阈值"通知
 * @param {string} accountAddress - 账户地址
 * @param {number} oldThreshold - 旧阈值
 * @param {number} newThreshold - 新阈值
 * @param {string} txHash - 交易哈希
 */
async function publishThresholdChanged(accountAddress, oldThreshold, newThreshold, txHash) {
  await publishNotification({
    recipient_address: accountAddress,
    title: '恢复阈值已修改',
    body: `账户恢复阈值已从 ${oldThreshold} 修改为 ${newThreshold}`,
    type: 'threshold_changed',
    data: {
      account_address: accountAddress,
      old_threshold: oldThreshold,
      new_threshold: newThreshold,
      tx_hash: txHash,
      timestamp: Date.now()
    },
    priority: 'high',
    channels: ['push', 'websocket']
  });
}

// =======================================================
// 账户恢复相关通知
// =======================================================

/**
 * 发布"发起账户恢复"通知
 * @param {string} accountAddress - 被恢复的账户地址
 * @param {string} guardianAddress - 发起恢复的守护者地址
 * @param {string} newOwnerAddress - 新Owner地址
 * @param {string} txHash - 交易哈希
 */
async function publishRecoveryInitiated(accountAddress, guardianAddress, newOwnerAddress, txHash) {
  // 通知账户拥有者：有守护者发起了恢复请求
  await publishNotification({
    recipient_address: accountAddress,
    title: '⚠️ 账户恢复已发起',
    body: `守护者 ${guardianAddress.substring(0, 10)}... 发起了账户恢复请求`,
    type: 'recovery_initiated',
    data: {
      account_address: accountAddress,
      guardian_address: guardianAddress,
      new_owner_address: newOwnerAddress,
      tx_hash: txHash,
      timestamp: Date.now()
    },
    priority: 'urgent',
    channels: ['push', 'websocket']
  });
}

/**
 * 发布"支持账户恢复"通知
 * @param {string} accountAddress - 被恢复的账户地址
 * @param {string} guardianAddress - 支持恢复的守护者地址
 * @param {string} newOwnerAddress - 新Owner地址
 * @param {number} currentApprovals - 当前支持数
 * @param {number} requiredApprovals - 需要的支持数
 * @param {string} txHash - 交易哈希
 */
async function publishRecoverySupported(accountAddress, guardianAddress, newOwnerAddress, currentApprovals, requiredApprovals, txHash) {
  await publishNotification({
    recipient_address: accountAddress,
    title: '⚠️ 账户恢复获得新支持',
    body: `守护者 ${guardianAddress.substring(0, 10)}... 支持了恢复请求 (${currentApprovals}/${requiredApprovals})`,
    type: 'recovery_supported',
    data: {
      account_address: accountAddress,
      guardian_address: guardianAddress,
      new_owner_address: newOwnerAddress,
      current_approvals: currentApprovals,
      required_approvals: requiredApprovals,
      tx_hash: txHash,
      timestamp: Date.now()
    },
    priority: 'high',
    channels: ['push', 'websocket']
  });
}

/**
 * 发布"取消账户恢复"通知
 * @param {string} accountAddress - 账户地址
 * @param {string} cancelledBy - 取消者地址
 * @param {string} txHash - 交易哈希
 * @param {Array<string>} guardianAddresses - 守护者地址列表（需要通知他们）
 */
async function publishRecoveryCancelled(accountAddress, cancelledBy, txHash, guardianAddresses = []) {
  // 通知账户拥有者
  await publishNotification({
    recipient_address: accountAddress,
    title: '账户恢复已取消',
    body: '您的账户恢复请求已被取消',
    type: 'recovery_cancelled',
    data: {
      account_address: accountAddress,
      cancelled_by: cancelledBy,
      tx_hash: txHash,
      timestamp: Date.now()
    },
    priority: 'high',
    channels: ['push', 'websocket']
  });

  // 通知所有相关守护者
  for (const guardianAddr of guardianAddresses) {
    await publishNotification({
      recipient_address: guardianAddr,
      title: '账户恢复已取消',
      body: `账户 ${accountAddress.substring(0, 10)}... 的恢复请求已被取消`,
      type: 'recovery_cancelled_guardian',
      data: {
        account_address: accountAddress,
        cancelled_by: cancelledBy,
        tx_hash: txHash,
        timestamp: Date.now()
      },
      priority: 'high',
      channels: ['push', 'websocket']
    });
  }
}

/**
 * 发布"账户恢复成功"通知
 * @param {string} accountAddress - 账户地址
 * @param {string} oldOwnerAddress - 旧Owner地址
 * @param {string} newOwnerAddress - 新Owner地址
 * @param {string} txHash - 交易哈希
 */
async function publishRecoveryCompleted(accountAddress, oldOwnerAddress, newOwnerAddress, txHash) {
  // 通知新Owner
  await publishNotification({
    recipient_address: newOwnerAddress,
    title: '✅ 账户恢复成功',
    body: `账户 ${accountAddress.substring(0, 10)}... 已成功恢复到您的控制`,
    type: 'recovery_completed',
    data: {
      account_address: accountAddress,
      old_owner_address: oldOwnerAddress,
      new_owner_address: newOwnerAddress,
      tx_hash: txHash,
      timestamp: Date.now()
    },
    priority: 'urgent',
    channels: ['push', 'websocket']
  });

  // 通知旧Owner（如果地址不同）
  if (oldOwnerAddress.toLowerCase() !== newOwnerAddress.toLowerCase()) {
    await publishNotification({
      recipient_address: oldOwnerAddress,
      title: '⚠️ 账户已被恢复',
      body: `您的账户 ${accountAddress.substring(0, 10)}... 已被恢复到新的Owner`,
      type: 'recovery_completed_old_owner',
      data: {
        account_address: accountAddress,
        old_owner_address: oldOwnerAddress,
        new_owner_address: newOwnerAddress,
        tx_hash: txHash,
        timestamp: Date.now()
      },
      priority: 'urgent',
      channels: ['push', 'websocket']
    });
  }
}

/**
 * 发布一个"用户已创建"的事件到消息队列（保留原有功能）
 * @param {object} user - 新创建的用户对象
 */
async function publishUserCreated(user) {
  try {
    const channel = await getChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    const routingKey = 'user.created';
    const message = Buffer.from(JSON.stringify(user));

    channel.publish(EXCHANGE_NAME, routingKey, message, {
      persistent: true,
    });

    console.log(`[MQ Producer] Sent event '${routingKey}':`, user);
  } catch (error) {
    console.error('[MQ Producer] Error publishing user.created event:', error);
  }
}

module.exports = {
  // 通用方法
  publishNotification,
  
  // 守护者管理通知
  publishGuardianAdded,
  publishThresholdChanged,
  
  // 账户恢复通知
  publishRecoveryInitiated,
  publishRecoverySupported,
  publishRecoveryCancelled,
  publishRecoveryCompleted,
  
  // 原有功能
  publishUserCreated,
};