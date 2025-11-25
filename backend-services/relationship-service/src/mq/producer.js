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
// 关系管理相关通知
// =======================================================

/**
 * 发布"接受邀请"通知
 * @param {string} ownerAddress - 老人/owner地址
 * @param {string} viewerAddress - 接受邀请的viewer地址
 * @param {object} accessGroupInfo - 访问组信息 {id, name, type}
 */
async function publishInvitationAccepted(ownerAddress, viewerAddress, accessGroupInfo) {
  // 通知老人：有新成员加入
  await publishNotification({
    recipient_address: ownerAddress,
    title: '新成员加入',
    body: `有新成员加入了您的"${accessGroupInfo.name}"访问组`,
    type: 'relationship_invitation_accepted',
    data: {
      viewer_address: viewerAddress,
      access_group_id: accessGroupInfo.id,
      access_group_name: accessGroupInfo.name,
      access_group_type: accessGroupInfo.type
    },
    priority: 'normal',
    channels: ['push', 'websocket']
  });

  // 通知接受者：成功加入访问组
  await publishNotification({
    recipient_address: viewerAddress,
    title: '加入成功',
    body: `您已成功加入访问组"${accessGroupInfo.name}"`,
    type: 'relationship_joined_group',
    data: {
      owner_address: ownerAddress,
      access_group_id: accessGroupInfo.id,
      access_group_name: accessGroupInfo.name,
      access_group_type: accessGroupInfo.type
    },
    priority: 'normal',
    channels: ['push', 'websocket']
  });
}

/**
 * 发布"关系暂停"通知
 * @param {string} viewerAddress - 被暂停的viewer地址
 * @param {string} ownerAddress - owner地址
 * @param {object} accessGroupInfo - 访问组信息
 */
async function publishRelationshipSuspended(viewerAddress, ownerAddress, accessGroupInfo) {
  await publishNotification({
    recipient_address: viewerAddress,
    title: '访问权限已暂停',
    body: `您对"${accessGroupInfo.name}"的访问权限已被暂停`,
    type: 'relationship_suspended',
    data: {
      owner_address: ownerAddress,
      access_group_id: accessGroupInfo.id,
      access_group_name: accessGroupInfo.name,
      reason: 'suspended_by_owner'
    },
    priority: 'high',
    channels: ['push', 'websocket']
  });
}

/**
 * 发布"关系恢复"通知
 * @param {string} viewerAddress - 被恢复的viewer地址
 * @param {string} ownerAddress - owner地址
 * @param {object} accessGroupInfo - 访问组信息
 */
async function publishRelationshipResumed(viewerAddress, ownerAddress, accessGroupInfo) {
  await publishNotification({
    recipient_address: viewerAddress,
    title: '访问权限已恢复',
    body: `您对"${accessGroupInfo.name}"的访问权限已恢复`,
    type: 'relationship_resumed',
    data: {
      owner_address: ownerAddress,
      access_group_id: accessGroupInfo.id,
      access_group_name: accessGroupInfo.name
    },
    priority: 'normal',
    channels: ['push', 'websocket']
  });
}

/**
 * 发布"关系撤销"通知
 * @param {string} viewerAddress - 被撤销的viewer地址
 * @param {string} ownerAddress - owner地址
 * @param {object} accessGroupInfo - 访问组信息
 */
async function publishRelationshipRevoked(viewerAddress, ownerAddress, accessGroupInfo) {
  await publishNotification({
    recipient_address: viewerAddress,
    title: '访问权限已撤销',
    body: `您对"${accessGroupInfo.name}"的访问权限已被撤销`,
    type: 'relationship_revoked',
    data: {
      owner_address: ownerAddress,
      access_group_id: accessGroupInfo.id,
      access_group_name: accessGroupInfo.name,
      reason: 'revoked_by_owner'
    },
    priority: 'high',
    channels: ['push', 'websocket']
  });
}

/**
 * 发布"创建邀请"通知（可选）
 * @param {string} recipientAddress - 接收通知的地址
 * @param {object} invitationInfo - 邀请信息 {token, accessGroupName, expiresAt}
 */
async function publishInvitationCreated(recipientAddress, invitationInfo) {
  await publishNotification({
    recipient_address: recipientAddress,
    title: '邀请已创建',
    body: `您的"${invitationInfo.accessGroupName}"访问组邀请已创建`,
    type: 'invitation_created',
    data: {
      token: invitationInfo.token,
      access_group_name: invitationInfo.accessGroupName,
      expires_at: invitationInfo.expiresAt
    },
    priority: 'normal',
    channels: ['websocket']
  });
}

// =======================================================
// 账户迁移相关通知
// =======================================================

/**
 * 发布"迁移会话创建"通知
 * @param {string} userAddress - 用户地址
 * @param {object} sessionInfo - 会话信息 {id, confirmCode, expiresAt}
 */
async function publishMigrationSessionCreated(userAddress, sessionInfo) {
  await publishNotification({
    recipient_address: userAddress,
    title: '账户迁移会话已创建',
    body: `您的确认码是: ${sessionInfo.confirmCode}`,
    type: 'migration_session_created',
    data: {
      migration_id: sessionInfo.id,
      confirm_code: sessionInfo.confirmCode,
      expires_at: sessionInfo.expiresAt
    },
    priority: 'urgent',
    channels: ['push', 'websocket']
  });
}

/**
 * 发布"迁移完成"通知
 * @param {string} userAddress - 用户地址
 * @param {object} migrationInfo - 迁移信息 {migrationId, oldDeviceId, newDeviceId}
 */
async function publishMigrationCompleted(userAddress, migrationInfo) {
  await publishNotification({
    recipient_address: userAddress,
    title: '账户迁移成功',
    body: '您的账户已成功迁移到新设备',
    type: 'migration_completed',
    data: {
      migration_id: migrationInfo.migrationId,
      old_device_id: migrationInfo.oldDeviceId,
      new_device_id: migrationInfo.newDeviceId,
      completed_at: Date.now()
    },
    priority: 'urgent',
    channels: ['push', 'websocket']
  });
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
  
  // 关系管理通知
  publishInvitationAccepted,
  publishRelationshipSuspended,
  publishRelationshipResumed,
  publishRelationshipRevoked,
  publishInvitationCreated,
  
  // 账户迁移通知
  publishMigrationSessionCreated,
  publishMigrationCompleted,
  
  // 原有功能
  publishUserCreated,
};