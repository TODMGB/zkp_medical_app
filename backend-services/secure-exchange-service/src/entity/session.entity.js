// src/entity/session.entity.js
const pool = require('./db');

/**
 * 会话数据访问层
 */
class SessionEntity {
  /**
   * 创建新会话
   */
  async create({ requesterAddress, recipientAddress, requesterPublicKey, dataType, metadata, nonce, expiresAt }) {
    const query = `
      INSERT INTO exchange_sessions 
        (requester_address, recipient_address, requester_public_key, data_type, metadata, nonce, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      requesterAddress.toLowerCase(),
      recipientAddress.toLowerCase(),
      requesterPublicKey,
      dataType,
      metadata ? JSON.stringify(metadata) : null,
      nonce,
      expiresAt
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * 根据ID查询会话
   */
  async findById(sessionId) {
    const query = 'SELECT * FROM exchange_sessions WHERE session_id = $1';
    const result = await pool.query(query, [sessionId]);
    return result.rows[0];
  }

  /**
   * 更新接收方公钥并将状态改为ready
   */
  async updateRecipientPublicKey(sessionId, recipientPublicKey) {
    const query = `
      UPDATE exchange_sessions 
      SET recipient_public_key = $1, status = 'ready'
      WHERE session_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [recipientPublicKey, sessionId]);
    return result.rows[0];
  }

  /**
   * 更新会话状态
   */
  async updateStatus(sessionId, status) {
    const query = `
      UPDATE exchange_sessions 
      SET status = $1::text, 
          completed_at = CASE WHEN $1::text IN ('expired', 'cancelled', 'completed') THEN NOW() ELSE NULL END
      WHERE session_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, sessionId]);
    return result.rows[0];
  }

  /**
   * 查询用户的待处理会话（作为接收方）
   */
  async findPendingByRecipient(recipientAddress, limit = 10) {
    const query = `
      SELECT * FROM exchange_sessions 
      WHERE recipient_address = $1 
        AND status = 'pending'
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [recipientAddress.toLowerCase(), limit]);
    return result.rows;
  }

  /**
   * 清理过期会话
   */
  async cleanupExpired() {
    const query = `
      UPDATE exchange_sessions 
      SET status = 'expired'
      WHERE status = 'pending' 
        AND expires_at < NOW()
      RETURNING session_id
    `;
    const result = await pool.query(query);
    return result.rows.length;
  }

  /**
   * 删除会话
   */
  async delete(sessionId) {
    const query = 'DELETE FROM exchange_sessions WHERE session_id = $1';
    await pool.query(query, [sessionId]);
  }
}

module.exports = new SessionEntity();

