// src/utils/crypto.util.js
const { ethers } = require('ethers');

/**
 * 加密工具类
 */
class CryptoUtil {
  /**
   * 验证ECDSA签名
   * @param {string} message - 原始消息（hex）
   * @param {string} signature - 签名（hex）
   * @param {string} expectedAddress - 期望的签名者地址
   * @returns {boolean} 验证是否成功
   */
  verifySignature(message, signature, expectedAddress) {
    try {
      // 确保消息有 0x 前缀（ethers.js 要求）
      const messageWithPrefix = message.startsWith('0x') ? message : `0x${message}`;
      const messageHash = ethers.keccak256(messageWithPrefix);
      const messageHashBytes = ethers.getBytes(messageHash);
      const recoveredAddress = ethers.verifyMessage(messageHashBytes, signature);
      
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      console.error('签名验证失败:', error);
      return false;
    }
  }

  /**
   * 从签名中恢复地址
   * @param {string} message - 原始消息（hex）
   * @param {string} signature - 签名（hex）
   * @returns {string} 恢复的地址
   */
  recoverAddress(message, signature) {
    try {
      // 确保消息有 0x 前缀（ethers.js 要求）
      const messageWithPrefix = message.startsWith('0x') ? message : `0x${message}`;
      const messageHash = ethers.keccak256(messageWithPrefix);
      const messageHashBytes = ethers.getBytes(messageHash);
      return ethers.verifyMessage(messageHashBytes, signature);
    } catch (error) {
      console.error('地址恢复失败:', error);
      return null;
    }
  }

  /**
   * 验证签名载荷（对象）
   * @param {Object} payload - 签名载荷对象
   * @param {string} signature - 签名（hex）
   * @param {string} expectedAddress - 期望的签名者地址
   * @returns {boolean} 验证是否成功
   */
  verifySignaturePayload(payload, signature, expectedAddress) {
    try {
      // 将载荷转为 JSON 字符串
      const message = JSON.stringify(payload);
      
      // 使用 ethers.verifyMessage（与测试脚本的 signData 匹配）
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
      
      return isValid;
    } catch (error) {
      console.error('签名载荷验证失败:', error);
      return false;
    }
  }

  /**
   * 生成消息哈希（用于签名验证）
   * @param {Object} data - 数据对象
   * @returns {string} 哈希值
   */
  generateMessageHash(data) {
    const message = JSON.stringify(data);
    return ethers.keccak256(ethers.toUtf8Bytes(message));
  }
}

module.exports = new CryptoUtil();

