// src/services/exchange.service.js
const messageService = require('./message.service');
const { publishEncryptedMessageNotification } = require('../mq/producer');
const { getUserPublicKey } = require('../rpc/clients/user.client');

/**
 * 安全数据交换核心服务
 * 基于用户预注册公钥的端到端加密消息传输
 */
class ExchangeService {
  /**
   * 发送加密数据（简化版 - 基于预注册公钥）
   * @returns {Object} 消息信息
   */
  async sendEncryptedData({ recipientAddress, senderAddress, signerAddress, encryptedData, signature, timestamp, nonce, dataType, metadata }) {
    // 1. 验证接收者是否有注册的加密公钥
    let recipientPublicKeyInfo;
    try {
      recipientPublicKeyInfo = await getUserPublicKey(recipientAddress);
      if (!recipientPublicKeyInfo || !recipientPublicKeyInfo.encryption_public_key) {
        throw new Error('接收者未注册加密公钥，无法接收加密消息');
      }
      console.log(`[ExchangeService] 已获取接收者 ${recipientAddress} 的加密公钥`);
    } catch (error) {
      console.error('[ExchangeService] 获取接收者公钥失败:', error);
      throw new Error(`接收者 ${recipientAddress} 未注册加密公钥或用户不存在`);
    }

    // 2. 创建消息（不再需要 sessionId）
    const message = await messageService.createMessage({
      sessionId: null, // 新版本不再使用会话
      senderAddress,
      signerAddress, // 用于签名验证的地址（通常是 EOA 地址）
      recipientAddress: recipientAddress.toLowerCase(),
      encryptedData,
      signature,
      dataType,
      metadata,
      nonce,
      timestamp
    });

    // 3. 发送通知给接收方（通过MQ，WebSocket由MQ消费者处理）
    const messageData = {
      messageId: message.message_id,
      senderAddress: message.sender_address,
      encryptedData: message.encrypted_data,
      signature: message.signature,
      dataType: message.data_type,
      metadata: message.metadata,
      timestamp: message.timestamp
    };

    // 发送MQ通知（MQ消费者会自动通过WebSocket推送给在线用户）
    await publishEncryptedMessageNotification(recipientAddress.toLowerCase(), messageData).catch(err => {
      console.error('[ExchangeService] 发送加密消息通知失败:', err);
    });

    return {
      messageId: message.message_id,
      recipientAddress: recipientAddress.toLowerCase(),
      recipientPublicKey: recipientPublicKeyInfo.encryption_public_key, // 返回公钥供发送者验证
      status: message.status,
      deliveryStatus: 'queued'
    };
  }

  /**
   * 确认接收消息
   */
  async acknowledgeMessage({ messageId, recipientAddress, status, errorMessage }) {
    // 1. 获取消息
    const message = await messageService.getMessageById(messageId);
    if (!message) {
      throw new Error('消息不存在');
    }

    // 2. 验证权限（只有接收方可以确认）
    if (message.recipient_address !== recipientAddress.toLowerCase()) {
      throw new Error('无权确认此消息');
    }

    // 3. 确认消息
    const result = await messageService.acknowledgeMessage(messageId, recipientAddress, status, errorMessage);

    return result;
  }

  /**
   * 获取待处理消息
   */
  async getPendingMessages({ recipientAddress, dataType, limit }) {
    const messages = await messageService.getPendingMessagesForRecipient(recipientAddress, dataType, limit);
    
    // 返回格式化的消息列表（使用snake_case以保持与数据库和其他服务的一致性）
    return messages.map(msg => ({
      message_id: msg.message_id,
      session_id: msg.session_id,
      sender_address: msg.sender_address,
      encrypted_data: msg.encrypted_data,  // hex字符串格式
      signature: msg.signature,
      data_type: msg.data_type,
      metadata: msg.metadata,
      created_at: msg.created_at,
      read_at: msg.read_at || null,
      is_read: !!msg.read_at
    }));
  }

  /**
   * 获取接收者的加密公钥（供发送者查询）
   */
  async getRecipientPublicKey({ recipientAddress }) {
    try {
      const publicKeyInfo = await getUserPublicKey(recipientAddress);
      if (!publicKeyInfo || !publicKeyInfo.encryption_public_key) {
        throw new Error('用户未注册加密公钥');
      }
      
      return {
        recipientAddress: publicKeyInfo.smart_account,
        encryptionPublicKey: publicKeyInfo.encryption_public_key,
        updatedAt: publicKeyInfo.encryption_key_updated_at
      };
    } catch (error) {
      console.error('[ExchangeService] 获取接收者公钥失败:', error);
      throw new Error('无法获取接收者的加密公钥');
    }
  }
}

module.exports = new ExchangeService();

