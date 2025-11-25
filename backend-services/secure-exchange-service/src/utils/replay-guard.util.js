// src/utils/replay-guard.util.js
const redis = require('../redis/client');

/**
 * 防重放攻击工具类
 */
class ReplayGuard {
  /**
   * 检查时间戳是否在有效窗口内（默认5分钟）
   * @param {number} timestamp - 消息时间戳（毫秒）
   * @param {number} windowMs - 时间窗口（毫秒），默认300000（5分钟）
   * @returns {boolean} 是否有效
   */
  isTimestampValid(timestamp, windowMs = 300000) {
    const now = Date.now();
    const diff = Math.abs(now - timestamp);
    return diff <= windowMs;
  }

  /**
   * 检查nonce是否已使用
   * @param {string} nonce - 随机nonce
   * @returns {Promise<boolean>} 是否已使用
   */
  async isNonceUsed(nonce) {
    const key = `replay:nonce:${nonce}`;
    const exists = await redis.exists(key);
    return exists === 1;
  }

  /**
   * 标记nonce为已使用（1小时TTL）
   * @param {string} nonce - 随机nonce
   * @param {number} ttl - 过期时间（秒），默认3600（1小时）
   */
  async markNonceAsUsed(nonce, ttl = 3600) {
    const key = `replay:nonce:${nonce}`;
    await redis.set(key, '1', { EX: ttl });
  }

  /**
   * 完整的防重放检查
   * @param {number} timestamp - 消息时间戳
   * @param {string} nonce - 随机nonce
   * @returns {Promise<{valid: boolean, error: string}>}
   */
  async validate(timestamp, nonce) {
    // 1. 检查时间戳
    if (!this.isTimestampValid(timestamp)) {
      return {
        valid: false,
        error: '消息已过期或时间戳无效（超过5分钟）'
      };
    }

    // 2. 检查nonce是否已使用
    const nonceUsed = await this.isNonceUsed(nonce);
    if (nonceUsed) {
      return {
        valid: false,
        error: '检测到重放攻击：nonce已使用'
      };
    }

    // 3. 标记nonce为已使用
    await this.markNonceAsUsed(nonce);

    return { valid: true };
  }
}

module.exports = new ReplayGuard();

