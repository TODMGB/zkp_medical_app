// src/services/message.service.js
const config = require('../config');
const messageEntity = require('../entity/message.entity');
const cryptoUtil = require('../utils/crypto.util');
const replayGuard = require('../utils/replay-guard.util');

/**
 * 消息管理服务
 */
class MessageService {
  /**
   * 创建加密消息
   */
  async createMessage({ sessionId, senderAddress, signerAddress, recipientAddress, encryptedData, signature, dataType, metadata, nonce, timestamp }) {
    // 1. 验证时间戳和nonce（防重放）
    const replayValidation = await replayGuard.validate(timestamp, nonce);
    if (!replayValidation.valid) {
      throw new Error(replayValidation.error);
    }

    // 2. 验证签名（签名是对 signaturePayload 对象的签名）
    const crypto = require('crypto');
    const dataHash = crypto.createHash('sha256').update(encryptedData).digest('hex');
    const signaturePayload = {
      recipient_address: recipientAddress.toLowerCase(), // ✅ 统一使用小写地址
      timestamp,
      nonce,
      data_hash: dataHash
    };
    // 使用 signerAddress（通常是 EOA 地址）进行签名验证
    const addressToVerify = signerAddress || senderAddress;
    
    // 🔍 调试日志
    console.log('[MessageService] 签名验证调试:');
    console.log('  signaturePayload:', JSON.stringify(signaturePayload));
    console.log('  signature:', signature);
    console.log('  addressToVerify:', addressToVerify);
    console.log('  signerAddress:', signerAddress);
    console.log('  senderAddress:', senderAddress);
    
    const isValidSignature = cryptoUtil.verifySignaturePayload(signaturePayload, signature, addressToVerify);
    
    console.log('  isValidSignature:', isValidSignature);
    
    if (!isValidSignature) {
      throw new Error('签名验证失败');
    }

    // 3. 计算过期时间
    const expiresAt = new Date(Date.now() + config.message.defaultExpiresIn * 1000);

    // 4. 创建消息（sessionId 可为 null）
    const message = await messageEntity.create({
      sessionId: sessionId || null, // sessionId 变为可选
      senderAddress,
      recipientAddress,
      encryptedData,
      signature,
      dataType,
      metadata,
      nonce,
      timestamp,
      expiresAt
    });

    return message;
  }

  /**
   * 根据ID获取消息
   */
  async getMessageById(messageId) {
    return await messageEntity.findById(messageId);
  }

  /**
   * 获取用户的待处理消息
   */
  async getPendingMessagesForRecipient(recipientAddress, dataType = null, limit = 10) {
    return await messageEntity.findPendingByRecipient(recipientAddress, dataType, limit);
  }

  /**
   * 更新消息状态
   */
  async updateMessageStatus(messageId, status) {
    return await messageEntity.updateStatus(messageId, status);
  }

  /**
   * 确认消息接收
   */
  async acknowledgeMessage(messageId, recipientAddress, ackStatus, errorMessage = null) {
    // 1. 更新消息状态
    await messageEntity.updateStatus(messageId, 'acknowledged');

    // 2. 创建确认记录
    await messageEntity.createAcknowledgment(messageId, recipientAddress, ackStatus, errorMessage);

    return { 
      success: true, 
      status: 'acknowledged',
      acknowledgedAt: new Date() 
    };
  }

  /**
   * 验证消息访问权限
   */
  validateMessageAccess(message, userAddress) {
    const normalizedUser = userAddress.toLowerCase();
    return (
      message.sender_address === normalizedUser ||
      message.recipient_address === normalizedUser
    );
  }

  /**
   * 获取用户的消息列表
   */
  async getMessages(options) {
    const {
      recipientAddress,
      dataType = null,
      unreadOnly = false,
      limit = 50,
      offset = 0
    } = options;

    return await messageEntity.findByRecipient(recipientAddress, {
      dataType,
      unreadOnly,
      limit,
      offset
    });
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(messageId, userAddress) {
    return await messageEntity.markAsRead(messageId, userAddress);
  }

  /**
   * 删除消息
   */
  async deleteMessage(messageId) {
    await messageEntity.delete(messageId);
  }

  /**
   * 清理过期消息（定时任务）
   */
  async cleanupExpiredMessages() {
    const count = await messageEntity.cleanupExpired();
    console.log(`[MessageService] 清理了 ${count} 条过期消息`);
    return count;
  }
}

module.exports = new MessageService();

