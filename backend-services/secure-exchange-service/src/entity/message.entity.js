// src/entity/message.entity.js
const pool = require('./db');

/**
 * 加密消息数据访问层
 */
class MessageEntity {
  /**
   * 创建新消息
   */
  async create({ sessionId, senderAddress, recipientAddress, encryptedData, signature, dataType, metadata, nonce, timestamp, expiresAt }) {
    const query = `
      INSERT INTO encrypted_messages 
        (session_id, sender_address, recipient_address, encrypted_data, signature, data_type, metadata, nonce, timestamp, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      sessionId,
      senderAddress.toLowerCase(),
      recipientAddress.toLowerCase(),
      encryptedData,
      signature,
      dataType,
      metadata ? JSON.stringify(metadata) : null,
      nonce,
      timestamp,
      expiresAt
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * 根据ID查询消息
   */
  async findById(messageId) {
    const query = 'SELECT * FROM encrypted_messages WHERE message_id = $1';
    const result = await pool.query(query, [messageId]);
    return result.rows[0];
  }

  /**
   * 查询用户的待处理消息（作为接收方）
   */
  async findPendingByRecipient(recipientAddress, dataType = null, limit = 10) {
    let query = `
      SELECT * FROM encrypted_messages 
      WHERE recipient_address = $1 
        AND status = 'pending'
        AND expires_at > NOW()
    `;
    const values = [recipientAddress.toLowerCase()];

    if (dataType) {
      query += ' AND data_type = $2';
      values.push(dataType);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (values.length + 1);
    values.push(limit);

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * 查询用户的所有消息（作为接收方） - 支持未读筛选
   */
  async findByRecipient(recipientAddress, options = {}) {
    const { dataType = null, unreadOnly = false, limit = 50, offset = 0 } = options;

    let query = `
      SELECT * FROM encrypted_messages 
      WHERE recipient_address = $1 
        AND expires_at > NOW()
    `;
    const values = [recipientAddress.toLowerCase()];

    if (dataType) {
      values.push(dataType);
      query += ` AND data_type = $${values.length}`;
    }

    if (unreadOnly) {
      query += ' AND read_at IS NULL';
    }

    values.push(limit, offset);
    query += ` ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const result = await pool.query(query, values);
    
    // 获取总数和未读数
    let countQuery = `
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread_count
      FROM encrypted_messages 
      WHERE recipient_address = $1 
        AND expires_at > NOW()
    `;
    const countValues = [recipientAddress.toLowerCase()];

    if (dataType) {
      countQuery += ` AND data_type = $2`;
      countValues.push(dataType);
    }

    const countResult = await pool.query(countQuery, countValues);

    return {
      messages: result.rows,
      total_count: parseInt(countResult.rows[0].total_count),
      unread_count: parseInt(countResult.rows[0].unread_count)
    };
  }

  async findPlanShareRecipients(planId, senderAddress) {
    const normalizedSender = (senderAddress || '').toLowerCase();

    let query = `
      SELECT DISTINCT recipient_address
      FROM encrypted_messages
      WHERE data_type = 'plan_share'
        AND (metadata::jsonb ->> 'plan_id') = $1
    `;
    const values = [String(planId)];

    if (normalizedSender) {
      values.push(normalizedSender);
      query += ` AND sender_address = $${values.length}`;
    }

    query += ' ORDER BY recipient_address ASC';

    const result = await pool.query(query, values);
    return result.rows.map(r => r.recipient_address);
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(messageId, userAddress) {
    const query = `
      UPDATE encrypted_messages 
      SET read_at = NOW()
      WHERE message_id = $1 
        AND recipient_address = $2
        AND read_at IS NULL
      RETURNING *
    `;
    const result = await pool.query(query, [messageId, userAddress.toLowerCase()]);
    return result.rows[0];
  }

  /**
   * 更新消息状态
   */
  async updateStatus(messageId, status) {
    const query = `
      UPDATE encrypted_messages 
      SET status = $1::text,
          delivered_at = CASE WHEN $1::text = 'delivered' THEN NOW() ELSE delivered_at END,
          acknowledged_at = CASE WHEN $1::text = 'acknowledged' THEN NOW() ELSE acknowledged_at END
      WHERE message_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, messageId]);
    return result.rows[0];
  }

  /**
   * 创建接收确认记录
   */
  async createAcknowledgment(messageId, recipientAddress, ackStatus, errorMessage = null) {
    const query = `
      INSERT INTO message_acknowledgments (message_id, recipient_address, ack_status, error_message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [messageId, recipientAddress.toLowerCase(), ackStatus, errorMessage]);
    return result.rows[0];
  }

  /**
   * 清理过期消息
   */
  async cleanupExpired() {
    const query = `
      DELETE FROM encrypted_messages 
      WHERE expires_at < NOW()
        AND status IN ('pending', 'delivered', 'acknowledged')
      RETURNING message_id
    `;
    const result = await pool.query(query);
    return result.rows.length;
  }

  /**
   * 删除消息
   */
  async delete(messageId) {
    const query = 'DELETE FROM encrypted_messages WHERE message_id = $1';
    await pool.query(query, [messageId]);
  }
}

module.exports = new MessageEntity();

