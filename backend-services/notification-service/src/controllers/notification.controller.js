// src/controllers/notification.controller.js
// ==========================================
// Notification 控制器
// ==========================================
const notificationService = require('../services/notification.service');
const { sendToUser } = require('../websocket/server');

/**
 * 创建并发送通知（HTTP接口）
 */
async function sendNotification(req, res) {
  try {
    const {
      recipient_address,
      type,
      priority = 'NORMAL',
      title,
      body,
      data = null,
      channels = ['push', 'websocket']
    } = req.body;
    
    // 创建通知
    const notification = await notificationService.create({
      recipient_address,
      type,
      priority,
      title,
      body,
      data,
      channels
    });
    
    // 如果用户在线，通过WebSocket实时推送
    if (channels.includes('websocket')) {
      const sent = await sendToUser(recipient_address, {
        type: 'notification',
        data: notification
      });
      
      if (sent) {
        await notificationService.markAsSent(notification.notification_id, 'websocket');
      }
    }
    
    res.status(201).json({
      success: true,
      data: notification
    });
    
  } catch (error) {
    console.error('[Notification Controller] Error sending notification:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 获取用户的通知列表
 */
async function getNotifications(req, res) {
  try {
    const { smart_account } = req.user; // 从JWT中间件获取
    const {
      status = null,
      limit = 50,
      offset = 0
    } = req.query;
    
    const notifications = await notificationService.findByRecipient(smart_account, {
      status,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
    
    res.json({
      success: true,
      data: notifications
    });
    
  } catch (error) {
    console.error('[Notification Controller] Error getting notifications:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 获取未读通知数量
 */
async function getUnreadCount(req, res) {
  try {
    const { smart_account } = req.user;
    
    const count = await notificationService.getUnreadCount(smart_account);
    
    res.json({
      success: true,
      data: { count }
    });
    
  } catch (error) {
    console.error('[Notification Controller] Error getting unread count:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 标记通知为已读
 */
async function markAsRead(req, res) {
  try {
    const { smart_account } = req.user;
    const { notification_id } = req.params;
    
    const notification = await notificationService.markAsRead(notification_id, smart_account);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      data: notification
    });
    
  } catch (error) {
    console.error('[Notification Controller] Error marking as read:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 标记所有通知为已读
 */
async function markAllAsRead(req, res) {
  try {
    const { smart_account } = req.user;
    
    const notificationIds = await notificationService.markAllAsRead(smart_account);
    
    res.json({
      success: true,
      data: {
        count: notificationIds.length,
        notification_ids: notificationIds
      }
    });
    
  } catch (error) {
    console.error('[Notification Controller] Error marking all as read:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 删除通知
 */
async function deleteNotification(req, res) {
  try {
    const { smart_account } = req.user;
    const { notification_id } = req.params;
    
    const result = await notificationService.deleteById(notification_id, smart_account);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      data: { notification_id }
    });
    
  } catch (error) {
    console.error('[Notification Controller] Error deleting notification:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  sendNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

