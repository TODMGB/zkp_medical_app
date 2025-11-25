/**
 * 安全交换服务
 * 使用ECDH + AES-256-GCM加密传输敏感数据
 * 参考：doc/e2e-secure-exchange-flow.test.js
 */

import { ethers } from 'ethers';
import { authService } from './auth';
import { API_GATEWAY_URL } from '../config/api.config';
import { publicKeyCacheService } from './publicKeyCache';

// 安全交换消息接口
export interface SecureMessage {
  message_id: string;
  sender_address: string;
  recipient_address: string;
  encrypted_data: string;
  signature: string;
  data_type: string;
  metadata?: any;
  timestamp: number;
  created_at: string;
  read_at: string | null;
}

// 发送消息请求
export interface SendMessageRequest {
  recipientAddress: string;
  encryptedData: string;
  signature: string;
  timestamp: number;
  nonce: string;
  dataType: string;
  metadata?: any;
}

// 用户信息数据结构（用于传输）
export interface UserInfoData {
  smart_account: string;
  username: string;
  roles: string[];
  eoa_address: string;
  phone_number?: string;
  email?: string;
}

class SecureExchangeService {
  /**
   * 获取接收者的加密公钥（支持离线缓存）
   */
  public async getRecipientPublicKey(recipientAddress: string): Promise<string> {
    try {
      // 1. 先尝试从缓存获取（支持完全离线）
      const cachedKey = await publicKeyCacheService.getPublicKey(recipientAddress);
      if (cachedKey) {
        return cachedKey;
      }

      // 2. 缓存未命中，尝试从服务器获取
      console.log('🌐 缓存未命中，从服务器获取公钥:', recipientAddress);
      
      // 检查网络连接
      if (!navigator.onLine) {
        console.warn('⚠️ 检测到离线状态，无法获取公钥');
        throw new Error('离线状态下无法获取公钥，请先在线查看一次');
      }
      
      const headers = await authService.getAuthHeader();
      const response = await fetch(
        `${API_GATEWAY_URL}/secure-exchange/recipient-pubkey/${recipientAddress}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '获取接收者公钥失败');
      }

      const data = await response.json();
      const publicKey = data.encryptionPublicKey;
      console.log('✅ 服务器获取公钥成功');
      
      // 3. 保存到缓存
      await publicKeyCacheService.savePublicKey(recipientAddress, publicKey);
      
      return publicKey;
    } catch (error: any) {
      console.error('❌ 获取接收者公钥失败:', error);
      
      // 4. 网络失败时，再次尝试从缓存获取（容错机制）
      const cachedKey = await publicKeyCacheService.getPublicKey(recipientAddress);
      if (cachedKey) {
        console.warn('⚠️ 网络失败但找到缓存公钥，使用缓存');
        return cachedKey;
      }
      
      // 5. 提供友好的错误提示
      if (!navigator.onLine || error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络或先在线查看一次');
      }
      
      throw error;
    }
  }

  /**
   * 使用ECDH派生共享密钥
   * 参考测试文件中的 deriveSharedSecret 函数
   * 使用 Web Crypto API 兼容浏览器环境
   */
  private deriveSharedSecret(privateKey: string, peerPublicKey: string): Uint8Array {
    try {
      const wallet = new ethers.Wallet(privateKey);
      const sharedPoint = wallet.signingKey.computeSharedSecret(peerPublicKey);
      
      // 使用SHA256哈希共享点作为对称密钥
      const sharedPointBuffer = ethers.getBytes(sharedPoint);
      
      // 使用 ethers.js 的 sha256 替代 Node.js crypto
      const hash = ethers.sha256(sharedPointBuffer);
      return ethers.getBytes(hash);
    } catch (error: any) {
      console.error('派生共享密钥失败:', error);
      throw error;
    }
  }

  /**
   * 使用AES-256-GCM加密数据
   * 参考测试文件中的 encrypt 函数
   * 使用 Web Crypto API 兼容浏览器环境
   * @returns 返回格式：iv(24字符hex) + authTag(32字符hex) + encrypted
   */
  private async encrypt(plaintext: string, sharedSecret: Uint8Array): Promise<string> {
    try {
      // 生成随机 IV (12 bytes for GCM)
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // 导入密钥
      const key = await crypto.subtle.importKey(
        'raw',
        sharedSecret.buffer as ArrayBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      // 加密数据
      const encodedText = new TextEncoder().encode(plaintext);
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128 // 128 bits = 16 bytes
        },
        key,
        encodedText
      );
      
      // GCM 模式下，加密结果 = encrypted + authTag (最后16字节)
      const encryptedArray = new Uint8Array(encryptedBuffer);
      
      // 分离 encrypted 和 authTag
      const encryptedData = encryptedArray.slice(0, -16);
      const authTag = encryptedArray.slice(-16);
      
      // 格式：iv(24字符hex) + authTag(32字符hex) + encrypted
      const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
      const authTagHex = Array.from(authTag).map(b => b.toString(16).padStart(2, '0')).join('');
      const encryptedHex = Array.from(encryptedData).map(b => b.toString(16).padStart(2, '0')).join('');
      
      return ivHex + authTagHex + encryptedHex;
    } catch (error: any) {
      console.error('加密数据失败:', error);
      throw error;
    }
  }

  /**
   * 使用AES-256-GCM解密数据
   * 参考测试文件中的 decrypt 函数
   * 使用 Web Crypto API 兼容浏览器环境
   */
  private async decrypt(encryptedData: string, sharedSecret: Uint8Array): Promise<string> {
    try {
      // 解析加密数据：iv(24) + authTag(32) + encrypted
      const ivHex = encryptedData.slice(0, 24);
      const authTagHex = encryptedData.slice(24, 56);
      const encryptedHex = encryptedData.slice(56);
      
      // 转换为字节数组
      const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
      const authTag = new Uint8Array(authTagHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
      const encrypted = new Uint8Array(encryptedHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
      
      // 合并 encrypted + authTag
      const ciphertext = new Uint8Array(encrypted.length + authTag.length);
      ciphertext.set(encrypted);
      ciphertext.set(authTag, encrypted.length);
      
      // 导入密钥
      const key = await crypto.subtle.importKey(
        'raw',
        sharedSecret.buffer as ArrayBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      // 解密数据
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128
        },
        key,
        ciphertext
      );
      
      return new TextDecoder().decode(decryptedBuffer);
    } catch (error: any) {
      console.error('解密数据失败:', error);
      throw error;
    }
  }

  /**
   * 加密并发送数据
   * 参考测试文件中的 step2_sendEncryptedData 函数
   */
  public async sendEncryptedData(
    senderWallet: ethers.Wallet | ethers.HDNodeWallet,
    recipientAddress: string,
    plainData: any,
    dataType: string,
    metadata?: any
  ): Promise<string> {
    try {
      console.log('开始发送加密数据...');
      console.log('接收者地址:', recipientAddress);
      console.log('数据类型:', dataType);

      // 1. 获取接收者公钥
      const recipientPublicKey = await this.getRecipientPublicKey(recipientAddress);

      // 2. 派生共享密钥
      const sharedSecret = this.deriveSharedSecret(senderWallet.privateKey, recipientPublicKey);

      // 3. 加密数据
      const plaintext = JSON.stringify(plainData);
      const encryptedData = await this.encrypt(plaintext, sharedSecret);
      console.log('数据加密完成，长度:', encryptedData.length);

      // 4. 生成签名（防重放攻击）
      const timestamp = Date.now();
      
      // 生成随机 nonce（使用 Web Crypto API）
      const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
      const nonce = Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // 计算数据哈希（使用 ethers.js）
      const dataHash = ethers.sha256(ethers.toUtf8Bytes(encryptedData)).slice(2); // 移除 0x 前缀

      const signaturePayload = {
        recipient_address: recipientAddress.toLowerCase(),
        timestamp,
        nonce,
        data_hash: dataHash,
      };

      // 使用 EOA 私钥签名
      const signature = await senderWallet.signMessage(JSON.stringify(signaturePayload));
      console.log('签名生成完成');

      // 5. 发送加密数据
      const headers = await authService.getAuthHeader();
      const response = await fetch(
        `${API_GATEWAY_URL}/secure-exchange/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({
            recipientAddress,
            encryptedData,
            signature,
            timestamp,
            nonce,
            dataType,
            metadata,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '发送加密数据失败');
      }

      const result = await response.json();
      const messageId = result.messageId || result.message_id;
      console.log('✅ 加密数据发送成功，消息ID:', messageId);
      return messageId;
    } catch (error: any) {
      console.error('❌ 发送加密数据失败:', error);
      throw error;
    }
  }

  /**
   * 查询待处理消息
   */
  public async getPendingMessages(dataType?: string): Promise<SecureMessage[]> {
    try {
      const headers = await authService.getAuthHeader();
      let url = `${API_GATEWAY_URL}/secure-exchange/pending`;
      if (dataType) {
        url += `?dataType=${encodeURIComponent(dataType)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '获取待处理消息失败');
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error: any) {
      console.error('获取待处理消息失败:', error);
      throw error;
    }
  }

  /**
   * 解密消息数据
   * 参考测试文件中的 step4_decryptAndAcknowledge 函数
   */
  public async decryptMessage(
    encryptedData: string,
    receiverWallet: ethers.Wallet | ethers.HDNodeWallet,
    senderPublicKey: string
  ): Promise<any> {
    try {
      console.log('开始解密消息...');
      
      // 1. 派生共享密钥
      const sharedSecret = this.deriveSharedSecret(receiverWallet.privateKey, senderPublicKey);

      // 2. 解密数据
      const decryptedText = await this.decrypt(encryptedData, sharedSecret);
      console.log('✅ 解密成功');
      
      // 3. 解析JSON
      return JSON.parse(decryptedText);
    } catch (error: any) {
      console.error('❌ 解密消息失败:', error);
      throw error;
    }
  }

  /**
   * 确认接收消息
   */
  public async acknowledgeMessage(
    messageId: string,
    acknowledgmentNote?: string
  ): Promise<void> {
    try {
      const headers = await authService.getAuthHeader();
      const response = await fetch(
        `${API_GATEWAY_URL}/secure-exchange/acknowledge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({
            messageId,
            status: 'received',
            acknowledged: true,
            acknowledgment_note: acknowledgmentNote,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '确认消息失败');
      }

      console.log('消息已确认:', messageId);
    } catch (error: any) {
      console.error('确认消息失败:', error);
      throw error;
    }
  }

  /**
   * 发送用户信息给对方
   * 用于建立关系时交换身份信息
   */
  public async sendUserInfo(
    senderWallet: ethers.Wallet | ethers.HDNodeWallet,
    recipientAddress: string,
    userInfo: UserInfoData
  ): Promise<string> {
    console.log('📧 [sendUserInfo] 发送用户信息给:', recipientAddress);
    console.log('  用户信息:', {
      username: userInfo.username,
      smart_account: userInfo.smart_account,
      roles: userInfo.roles
    });
    
    try {
      const messageId = await this.sendEncryptedData(
        senderWallet,
        recipientAddress,
        userInfo,
        'user_info',
        {
          title: '【新成员信息】',
          description: `${userInfo.username} 的个人资料`,
        }
      );
      
      console.log('✅ [sendUserInfo] 用户信息发送完成，消息ID:', messageId);
      return messageId;
    } catch (error: any) {
      console.error('❌ [sendUserInfo] 发送失败:', error);
      throw error;
    }
  }
}

export const secureExchangeService = new SecureExchangeService();

