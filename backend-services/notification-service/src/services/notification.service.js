// src/services/notification.service.js
// ==========================================
// Notification 业务逻辑层
// ==========================================
const notificationEntity = require('../entity/notification.entity');
const redis = require('../redis/client');

/**
 * 创建通知
 */
async function create(notificationData) {
  try {
    // 验证必填字段
    if (!notificationData.recipient_address) {
      throw new Error('recipient_address is required');
    }
    if (!notificationData.type) {
      throw new Error('type is required');
    }
    if (!notificationData.title) {
      throw new Error('title is required');
    }
    if (!notificationData.body) {
      throw new Error('body is required');
    }
    
    // 创建通知
    const notification = await notificationEntity.create(notificationData);
    
    // 缓存最新通知到Redis（用于快速查询）
    await cacheLatestNotification(notification);
    
    // 删除未读数量缓存，强制下次查询时重新计算
    const cacheKey = `unread_count:${notificationData.recipient_address.toLowerCase()}`;
    console.log(`[Notification Service] 🗑️  Deleting cache key: ${cacheKey}`);
    const deleted = await redis.del(cacheKey);
    console.log(`[Notification Service] 🗑️  Cache deletion result: ${deleted} (1=deleted, 0=not_found)`);
    
    console.log(`[Notification Service] Created notification: ${notification.notification_id}`);
    return notification;
    
  } catch (error) {
    console.error('[Notification Service] Error creating notification:', error.message);
    throw error;
  }
}

/**
 * 根据ID查询通知
 */
async function findById(notificationId) {
  try {
    return await notificationEntity.findById(notificationId);
  } catch (error) {
    console.error('[Notification Service] Error finding notification:', error.message);
    throw error;
  }
}

/**
 * 查询用户的通知列表
 */
async function findByRecipient(recipientAddress, options = {}) {
  try {
    return await notificationEntity.findByRecipient(recipientAddress, options);
  } catch (error) {
    console.error('[Notification Service] Error finding notifications:', error.message);
    throw error;
  }
}

/**
 * 获取未读通知数量
 */
async function getUnreadCount(recipientAddress) {
  try {
    const normalizedAddress = recipientAddress.toLowerCase();
    const cacheKey = `unread_count:${normalizedAddress}`;
    
    console.log(`[Notification Service] 📊 Getting unread count for: ${normalizedAddress}`);
    console.log(`[Notification Service] 📊 Cache key: ${cacheKey}`);
    
    // 先尝试从Redis获取
    const cached = await redis.get(cacheKey);
    console.log(`[Notification Service] 📊 Cache result: ${cached === null ? 'MISS' : `HIT (${cached})`}`);
    
    if (cached !== null) {
      console.log(`[Notification Service] 📊 Returning cached count: ${cached}`);
      return parseInt(cached, 10);
    }
    
    // 从数据库查询
    console.log(`[Notification Service] 📊 Querying database for: ${normalizedAddress}`);
    const count = await notificationEntity.getUnreadCount(normalizedAddress);
    console.log(`[Notification Service] 📊 Database returned count: ${count}`);
    
    // 缓存到Redis（5分钟）
    await redis.set(cacheKey, count.toString(), 'EX', 300);
    console.log(`[Notification Service] 📊 Cached count: ${count}`);
    
    return count;
  } catch (error) {
    console.error('[Notification Service] Error getting unread count:', error.message);
    throw error;
  }
}

/**
 * 标记为已发送
 */
async function markAsSent(notificationId, channel) {
  try {
    const notification = await notificationEntity.markAsSent(notificationId, channel);
    console.log(`[Notification Service] Notification ${notificationId} marked as sent via ${channel}`);
    return notification;
  } catch (error) {
    console.error('[Notification Service] Error marking as sent:', error.message);
    throw error;
  }
}

/**
 * 标记为已送达
 */
async function markAsDelivered(notificationId) {
  try {
    return await notificationEntity.markAsDelivered(notificationId);
  } catch (error) {
    console.error('[Notification Service] Error marking as delivered:', error.message);
    throw error;
  }
}

/**
 * 标记为已读
 */
async function markAsRead(notificationId, recipientAddress) {
  try {
    const notification = await notificationEntity.markAsRead(notificationId, recipientAddress);
    
    // 清除未读数量缓存
    await redis.del(`unread_count:${recipientAddress}`);
    
    console.log(`[Notification Service] Notification ${notificationId} marked as read`);
    return notification;
  } catch (error) {
    console.error('[Notification Service] Error marking as read:', error.message);
    throw error;
  }
}

/**
 * 批量标记为已读
 */
async function markAllAsRead(recipientAddress) {
  try {
    const notificationIds = await notificationEntity.markAllAsRead(recipientAddress);
    
    // 清除未读数量缓存
    await redis.del(`unread_count:${recipientAddress}`);
    
    console.log(`[Notification Service] Marked ${notificationIds.length} notifications as read`);
    return notificationIds;
  } catch (error) {
    console.error('[Notification Service] Error marking all as read:', error.message);
    throw error;
  }
}

/**
 * 删除通知
 */
async function deleteById(notificationId, recipientAddress) {
  try {
    const result = await notificationEntity.deleteById(notificationId, recipientAddress);
    
    // 清除相关缓存
    await redis.del(`unread_count:${recipientAddress}`);
    
    return result;
  } catch (error) {
    console.error('[Notification Service] Error deleting notification:', error.message);
    throw error;
  }
}

/**
 * 清理过期通知
 */
async function cleanupExpired() {
  try {
    const count = await notificationEntity.cleanupExpired();
    console.log(`[Notification Service] Cleaned up ${count} expired notifications`);
    return count;
  } catch (error) {
    console.error('[Notification Service] Error cleaning up:', error.message);
    throw error;
  }
}

/**
 * 缓存最新通知到Redis
 */
async function cacheLatestNotification(notification) {
  try {
    const key = `latest_notifications:${notification.recipient_address}`;
    await redis.lPush(key, JSON.stringify(notification));
    await redis.lTrim(key, 0, 9); // 只保留最新10条
    await redis.expire(key, 3600); // 1小时过期
  } catch (error) {
    console.error('[Notification Service] Error caching notification:', error.message);
  }
}

module.exports = {
  create,
  findById,
  findByRecipient,
  getUnreadCount,
  markAsSent,
  markAsDelivered,
  markAsRead,
  markAllAsRead,
  deleteById,
  cleanupExpired,
};

