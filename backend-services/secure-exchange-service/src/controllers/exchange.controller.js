// src/controllers/exchange.controller.js
const exchangeService = require('../services/exchange.service');

/**
 * 安全数据交换控制器
 * 基于用户预注册公钥的端到端加密消息传输
 */
class ExchangeController {
  /**
   * 获取接收者的加密公钥
   * GET /api/secure-exchange/recipient-pubkey/:recipientAddress
   */
  async getRecipientPublicKey(req, res, next) {
    try {
      const { recipientAddress } = req.params;

      if (!recipientAddress) {
        return res.status(400).json({
          success: false,
          error: '缺少必需参数: recipientAddress'
        });
      }

      const result = await exchangeService.getRecipientPublicKey({ recipientAddress });

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('[ExchangeController] getRecipientPublicKey error:', error);
      next(error);
    }
  }

  /**
   * 发送加密数据（简化版）
   * POST /api/secure-exchange/send
   */
  async sendEncryptedData(req, res, next) {
    try {
      const { recipientAddress, encryptedData, signature, timestamp, nonce, dataType, metadata } = req.body;
      const senderAddress = req.user?.smart_account || req.user?.address;
      const signerAddress = req.user?.eoa_address || req.user?.address || req.user?.smart_account; // EOA 地址用于签名验证

      // 验证必需参数
      if (!recipientAddress || !encryptedData || !signature || !timestamp || !nonce || !dataType) {
        return res.status(400).json({
          success: false,
          error: '缺少必需参数: recipientAddress, encryptedData, signature, timestamp, nonce, dataType'
        });
      }

      const result = await exchangeService.sendEncryptedData({
        recipientAddress,
        senderAddress,
        signerAddress,
        encryptedData,
        signature,
        timestamp,
        nonce,
        dataType,
        metadata
      });

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('[ExchangeController] sendEncryptedData error:', error);
      next(error);
    }
  }

  /**
   * 请求对方同意后交换 user_info
   * POST /api/secure-exchange/user-info/request
   */
  async requestUserInfo(req, res, next) {
    try {
      const { recipientAddress, encryptedData, signature, timestamp, nonce, metadata } = req.body;
      const senderAddress = req.user?.smart_account || req.user?.address;
      const signerAddress = req.user?.eoa_address || req.user?.address || req.user?.smart_account;

      if (!recipientAddress || !encryptedData || !signature || !timestamp || !nonce) {
        return res.status(400).json({
          success: false,
          error: '缺少必需参数: recipientAddress, encryptedData, signature, timestamp, nonce'
        });
      }

      const result = await exchangeService.sendEncryptedData({
        recipientAddress,
        senderAddress,
        signerAddress,
        encryptedData,
        signature,
        timestamp,
        nonce,
        dataType: 'user_info_request',
        metadata
      });

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('[ExchangeController] requestUserInfo error:', error);
      next(error);
    }
  }

  /**
   * 同意并发送 user_info（由客户端加密后提交）
   * POST /api/secure-exchange/user-info/approve
   */
  async approveUserInfo(req, res, next) {
    try {
      const { recipientAddress, encryptedData, signature, timestamp, nonce, metadata } = req.body;
      const senderAddress = req.user?.smart_account || req.user?.address;
      const signerAddress = req.user?.eoa_address || req.user?.address || req.user?.smart_account;

      if (!recipientAddress || !encryptedData || !signature || !timestamp || !nonce) {
        return res.status(400).json({
          success: false,
          error: '缺少必需参数: recipientAddress, encryptedData, signature, timestamp, nonce'
        });
      }

      const result = await exchangeService.sendEncryptedData({
        recipientAddress,
        senderAddress,
        signerAddress,
        encryptedData,
        signature,
        timestamp,
        nonce,
        dataType: 'user_info',
        metadata
      });

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('[ExchangeController] approveUserInfo error:', error);
      next(error);
    }
  }

  /**
   * 确认接收
   * POST /api/secure-exchange/acknowledge
   */
  async acknowledgeMessage(req, res, next) {
    try {
      const { messageId, status, errorMessage } = req.body;
      const recipientAddress = req.user?.smart_account || req.user?.address;

      // 验证必需参数
      if (!messageId || !status) {
        return res.status(400).json({
          success: false,
          error: '缺少必需参数: messageId 和 status'
        });
      }

      const result = await exchangeService.acknowledgeMessage({
        messageId,
        recipientAddress,
        status,
        errorMessage
      });

      res.status(200).json({
        success: true,
        messageId,
        ...result
      });
    } catch (error) {
      console.error('[ExchangeController] acknowledgeMessage error:', error);
      next(error);
    }
  }

  /**
   * 查询待处理消息
   * GET /api/secure-exchange/pending
   */
  async getPendingMessages(req, res, next) {
    try {
      const recipientAddress = req.user?.smart_account || req.user?.address;
      const { dataType, limit } = req.query;

      const messages = await exchangeService.getPendingMessages({
        recipientAddress,
        dataType,
        limit: limit ? parseInt(limit) : 10
      });

      res.status(200).json({
        success: true,
        messages
      });
    } catch (error) {
      console.error('[ExchangeController] getPendingMessages error:', error);
      next(error);
    }
  }

}

module.exports = new ExchangeController();

