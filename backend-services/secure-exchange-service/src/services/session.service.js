// src/services/session.service.js
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const sessionEntity = require('../entity/session.entity');
const redis = require('../redis/client');

/**
 * 会话管理服务
 */
class SessionService {
  /**
   * 创建新的公钥交换会话
   */
  async createSession({ requesterAddress, recipientAddress, requesterPublicKey, dataType, metadata, expiresIn }) {
    const nonce = uuidv4(); // 使用UUID作为nonce
    const expiresInSeconds = expiresIn || config.session.defaultExpiresIn;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const session = await sessionEntity.create({
      requesterAddress,
      recipientAddress,
      requesterPublicKey: requesterPublicKey || null,
      dataType,
      metadata,
      nonce,
      expiresAt
    });

    // 缓存会话信息到Redis
    await this.cacheSession(session);

    return session;
  }

  /**
   * 根据ID获取会话
   */
  async getSessionById(sessionId) {
    // 先从缓存获取
    const cached = await this.getCachedSession(sessionId);
    if (cached) {
      return cached;
    }

    // 缓存未命中，从数据库获取
    const session = await sessionEntity.findById(sessionId);
    if (session) {
      await this.cacheSession(session);
    }
    return session;
  }

  /**
   * 更新接收方公钥
   */
  async updateRecipientPublicKey(sessionId, recipientPublicKey) {
    const session = await sessionEntity.updateRecipientPublicKey(sessionId, recipientPublicKey);
    if (session) {
      await this.cacheSession(session);
    }
    return session;
  }

  /**
   * 更新会话状态
   */
  async updateSessionStatus(sessionId, status) {
    const session = await sessionEntity.updateStatus(sessionId, status);
    if (session) {
      await this.cacheSession(session);
    }
    return session;
  }

  /**
   * 获取接收方的待处理会话
   */
  async getPendingSessionsForRecipient(recipientAddress, limit = 10) {
    return await sessionEntity.findPendingByRecipient(recipientAddress, limit);
  }

  /**
   * 验证会话访问权限
   * @param {Object} session - 会话对象
   * @param {string} userAddress - 用户地址
   * @returns {boolean} 是否有权限
   */
  validateSessionAccess(session, userAddress) {
    const normalizedUser = userAddress.toLowerCase();
    return (
      session.requester_address === normalizedUser ||
      session.recipient_address === normalizedUser
    );
  }

  /**
   * 验证会话是否就绪（可以发送消息）
   */
  validateSessionReady(session) {
    if (session.status !== 'ready') {
      return { valid: false, error: '会话未就绪，等待接收方提供公钥' };
    }
    
    if (new Date(session.expires_at) < new Date()) {
      return { valid: false, error: '会话已过期' };
    }

    return { valid: true };
  }

  /**
   * 取消会话
   */
  async cancelSession(sessionId) {
    await sessionEntity.updateStatus(sessionId, 'cancelled');
    await this.deleteCachedSession(sessionId);
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId) {
    await sessionEntity.delete(sessionId);
    await this.deleteCachedSession(sessionId);
  }

  /**
   * 缓存会话到Redis
   */
  async cacheSession(session) {
    const key = `session:${session.session_id}`;
    const ttl = Math.floor((new Date(session.expires_at) - new Date()) / 1000);
    if (ttl > 0) {
      await redis.set(key, JSON.stringify(session), { EX: ttl });
    }
  }

  /**
   * 从Redis获取缓存的会话
   */
  async getCachedSession(sessionId) {
    const key = `session:${sessionId}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * 删除Redis中的会话缓存
   */
  async deleteCachedSession(sessionId) {
    const key = `session:${sessionId}`;
    await redis.del(key);
  }

  /**
   * 清理过期会话（定时任务）
   */
  async cleanupExpiredSessions() {
    const count = await sessionEntity.cleanupExpired();
    console.log(`[SessionService] 清理了 ${count} 个过期会话`);
    return count;
  }
}

module.exports = new SessionService();

