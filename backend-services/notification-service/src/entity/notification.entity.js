// src/entity/notification.entity.js
// ==========================================
// Notification 数据访问层
// ==========================================
const pool = require('./db');
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomUUID() } : require('crypto');

/**
 * 创建通知
 */
async function create(notification) {
  const {
    recipient_address,
    type,
    priority = 'NORMAL',
    title,
    body,
    data = null,
    channels = ['push']
  } = notification;
  
  // 统一转为小写地址
  const normalizedAddress = recipient_address.toLowerCase();
  
  const notification_id = `0x${uuidv4().replace(/-/g, '')}`;
  
  const query = `
    INSERT INTO notifications (
      notification_id,
      recipient_address,
      type,
      priority,
      title,
      body,
      data,
      channels,
      status,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    RETURNING *;
  `;
  
  const values = [
    notification_id,
    normalizedAddress,
    type,
    priority,
    title,
    body,
    JSON.stringify(data),
    channels,
    'pending'
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * 根据ID查询通知
 */
async function findById(notificationId) {
  const query = `
    SELECT * FROM notifications
    WHERE notification_id = $1;
  `;
  
  const result = await pool.query(query, [notificationId]);
  return result.rows[0] || null;
}

/**
 * 查询用户的通知列表
 */
async function findByRecipient(recipientAddress, options = {}) {
  const {
    status = null,
    limit = 50,
    offset = 0,
    orderBy = 'created_at',
    order = 'DESC'
  } = options;
  
  // 统一转为小写地址
  const normalizedAddress = recipientAddress.toLowerCase();
  
  let query = `
    SELECT * FROM notifications
    WHERE recipient_address = $1
  `;
  
  const values = [normalizedAddress];
  
  if (status) {
    query += ` AND status = $2`;
    values.push(status);
  }
  
  query += ` ORDER BY ${orderBy} ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  values.push(limit, offset);
  
  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * 获取未读通知数量
 */
async function getUnreadCount(recipientAddress) {
  // 统一转为小写地址
  const normalizedAddress = recipientAddress.toLowerCase();
  
  console.log(`[Notification Entity] 🔍 Querying unread count for: ${normalizedAddress}`);
  
  const query = `
    SELECT COUNT(*) as count
    FROM notifications
    WHERE recipient_address = $1 AND read_at IS NULL;
  `;
  
  const result = await pool.query(query, [normalizedAddress]);
  const count = parseInt(result.rows[0].count, 10);
  
  console.log(`[Notification Entity] 🔍 SQL Result: ${count} unread notifications`);
  
  return count;
}

/**
 * 标记为已发送
 */
async function markAsSent(notificationId, channel) {
  const query = `
    UPDATE notifications
    SET sent_at = CURRENT_TIMESTAMP,
        status = 'sent'
    WHERE notification_id = $1
    RETURNING *;
  `;
  
  const result = await pool.query(query, [notificationId]);
  return result.rows[0];
}

/**
 * 标记为已送达
 */
async function markAsDelivered(notificationId) {
  const query = `
    UPDATE notifications
    SET delivered_at = CURRENT_TIMESTAMP,
        status = 'delivered'
    WHERE notification_id = $1
    RETURNING *;
  `;
  
  const result = await pool.query(query, [notificationId]);
  return result.rows[0];
}

/**
 * 标记为已读
 */
async function markAsRead(notificationId, recipientAddress) {
  // 统一转为小写地址
  const normalizedAddress = recipientAddress.toLowerCase();
  
  const query = `
    UPDATE notifications
    SET read_at = CURRENT_TIMESTAMP
    WHERE notification_id = $1 AND recipient_address = $2
    RETURNING *;
  `;
  
  const result = await pool.query(query, [notificationId, normalizedAddress]);
  return result.rows[0];
}

/**
 * 批量标记为已读
 */
async function markAllAsRead(recipientAddress) {
  // 统一转为小写地址
  const normalizedAddress = recipientAddress.toLowerCase();
  
  const query = `
    UPDATE notifications
    SET read_at = CURRENT_TIMESTAMP
    WHERE recipient_address = $1 AND read_at IS NULL
    RETURNING notification_id;
  `;
  
  const result = await pool.query(query, [normalizedAddress]);
  return result.rows.map(row => row.notification_id);
}

/**
 * 删除通知
 */
async function deleteById(notificationId, recipientAddress) {
  // 统一转为小写地址
  const normalizedAddress = recipientAddress.toLowerCase();
  
  const query = `
    DELETE FROM notifications
    WHERE notification_id = $1 AND recipient_address = $2
    RETURNING notification_id;
  `;
  
  const result = await pool.query(query, [notificationId, normalizedAddress]);
  return result.rows[0] || null;
}

/**
 * 清理过期通知（超过30天）
 */
async function cleanupExpired() {
  const query = `
    DELETE FROM notifications
    WHERE expires_at < CURRENT_TIMESTAMP
    RETURNING notification_id;
  `;
  
  const result = await pool.query(query);
  return result.rows.length;
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

