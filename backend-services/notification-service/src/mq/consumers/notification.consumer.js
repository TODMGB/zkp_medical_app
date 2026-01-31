// src/mq/consumers/notification.consumer.js
// ==========================================
// 通知消费者 - 处理通知事件
// ==========================================
const notificationService = require('../../services/notification.service');
const { sendToUser } = require('../../websocket/server');

/**
 * 处理通知事件
 * @param {object} notification - 通知数据
 * @param {WebSocket.Server} wss - WebSocket服务器实例
 */
async function handleNotification(notification, wss) {
  try {
    const recipient_address = notification?.recipient_address || notification?.userId || notification?.recipient;
    const type = notification?.type;
    let priority = (notification?.priority || 'NORMAL').toString().toUpperCase();
    if (priority === 'URGENT') priority = 'HIGH';
    if (!['HIGH', 'NORMAL', 'LOW'].includes(priority)) priority = 'NORMAL';
    const title = notification?.title || type || 'Notification';
    const body = notification?.body || notification?.message || '您有一条新通知';
    const data = notification?.data || null;
    const channels = Array.isArray(notification?.channels)
      ? notification.channels
      : ['push', 'websocket'];

    console.log(`[Notification Consumer] Processing notification: ${type}`);
    
    // 1. 存储到数据库
    const savedNotif = await notificationService.create({
      recipient_address,
      type,
      priority,
      title,
      body,
      data,
      channels,
    });
    
    console.log(`[Notification Consumer] ✅ Notification saved: ${savedNotif.notification_id}`);
    
    // 2. WebSocket推送（如果用户在线）
    if (channels.includes('websocket') || channels.includes('push')) {
      const sent = await sendToUser(recipient_address, {
        type: 'notification',
        data: savedNotif
      });
      
      if (sent) {
        await notificationService.markAsSent(savedNotif.notification_id, 'websocket');
        console.log(`[Notification Consumer] ✅ Notification sent via WebSocket to ${recipient_address}`);
      } else {
        console.log(`[Notification Consumer] ⚠️ User ${recipient_address} is offline`);
      }
    }
    
    // 3. FCM推送（如果配置了且用户离线）
    // TODO: 集成FCM推送服务
    // if (notification.channels.includes('push') && !sent) {
    //   await pushService.sendFCM(notification);
    //   await notificationService.markAsSent(savedNotif.notification_id, 'fcm');
    // }
    
    console.log(`[Notification Consumer] ✅ Notification processed successfully: ${savedNotif.notification_id}`);
    
  } catch (error) {
    console.error('[Notification Consumer] ❌ Error handling notification:', error.message);
    // 在生产环境中，这里可以将失败的通知发送到死信队列（DLQ）
    throw error;
  }
}

module.exports = {
  handleNotification,
};

