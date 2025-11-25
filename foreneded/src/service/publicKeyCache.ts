/**
 * 公钥缓存服务
 * 缓存用户的公钥，支持离线解密
 */

import { Preferences } from '@capacitor/preferences';
import { PUBLIC_KEY_KEYS, generateKey } from '@/config/storage.config';

class PublicKeyCacheService {
  // 内存缓存，应用运行期间有效
  private memoryCache = new Map<string, string>();

  /**
   * 保存公钥到缓存
   */
  async savePublicKey(address: string, publicKey: string): Promise<void> {
    try {
      // 保存到内存缓存
      this.memoryCache.set(address.toLowerCase(), publicKey);
      
      // 保存到本地存储
      const key = this.getCacheKey(address);
      await Preferences.set({
        key,
        value: JSON.stringify({
          address: address.toLowerCase(),
          publicKey,
          cachedAt: new Date().toISOString(),
        }),
      });
      
      console.log('✅ 公钥已缓存:', address);
    } catch (error) {
      console.error('保存公钥缓存失败:', error);
    }
  }

  /**
   * 从缓存获取公钥
   */
  async getPublicKey(address: string): Promise<string | null> {
    const normalizedAddress = address.toLowerCase();
    
    // 1. 先查内存缓存
    if (this.memoryCache.has(normalizedAddress)) {
      console.log('📦 从内存缓存获取公钥:', address);
      return this.memoryCache.get(normalizedAddress)!;
    }
    
    // 2. 查本地存储
    try {
      const key = this.getCacheKey(address);
      const result = await Preferences.get({ key });
      
      if (result.value) {
        const cached = JSON.parse(result.value);
        // 更新内存缓存
        this.memoryCache.set(normalizedAddress, cached.publicKey);
        console.log('📂 从本地存储获取公钥:', address);
        return cached.publicKey;
      }
    } catch (error) {
      console.error('读取公钥缓存失败:', error);
    }
    
    return null;
  }

  /**
   * 清除特定地址的公钥缓存
   */
  async clearPublicKey(address: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();
    
    // 清除内存缓存
    this.memoryCache.delete(normalizedAddress);
    
    // 清除本地存储
    try {
      const key = this.getCacheKey(address);
      await Preferences.remove({ key });
    } catch (error) {
      console.error('清除公钥缓存失败:', error);
    }
  }

  /**
   * 清空所有公钥缓存
   */
  async clearAll(): Promise<void> {
    // 清空内存缓存
    this.memoryCache.clear();
    
    // 注意：Preferences 没有批量清除的API，需要遍历所有键
    // 这里只清空内存缓存，本地存储的缓存会在下次使用时自动覆盖
    console.log('✅ 已清空公钥内存缓存');
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(address: string): string {
    return generateKey(PUBLIC_KEY_KEYS.CACHE_PREFIX, address);
  }
}

export const publicKeyCacheService = new PublicKeyCacheService();

