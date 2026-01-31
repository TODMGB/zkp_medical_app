import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';
import { buildMigrationUrl } from '@/config/api.config';
import QRCode from 'qrcode';
import { ethers, keccak256, toUtf8Bytes, toUtf8String, hexlify, randomBytes } from 'ethers';
import {
  AUTH_KEYS,
  WALLET_KEYS,
  BIOMETRIC_KEYS,
  MEDICATION_PLAN_KEYS,
  MEDICATION_SHARE_KEYS,
  CHECKIN_KEYS,
  CHECKIN_SHARE_KEYS,
  MEMBER_KEYS,
  PUBLIC_KEY_KEYS,
  ACCESS_GROUP_KEYS,
  CLEAR_GROUPS
} from '@/config/storage.config';
import { authService } from './auth';
import { uiService } from './ui';

// 迁移数据接口
interface MigrationData {
  // 核心账户数据
  encryptedWallet: string;
  salt: number; // 注册时使用的salt值，迁移时必须包含
  accountAddress: string; // Smart Account地址
  ownerAddress: string; // EOA地址
  userInfo: any; // 用户信息（从user_info存储中获取）
  
  // 本地存储数据 
  localStorageData: {
    [key: string]: string; // 所有本地存储的键值对
  };
  
  // 元数据
  timestamp: number;
  deviceId: string;
  isDeployed?: boolean; // 账户是否已部署
  dataVersion: string; // 数据版本，用于兼容性
}

// 迁移会话接口
interface MigrationSession {
  id: string;
  status: 'pending' | 'completed' | 'expired';
  createdAt: number;
  expiresAt: number;
  oldDeviceId: string;
  newDeviceId?: string;
  confirmCode?: string;
}

class MigrationService {
  private readonly MIGRATION_TIMEOUT = 5 * 60 * 1000; // 5分钟过期
  private confirmationPollInterval: NodeJS.Timeout | null = null;

  /**
   * 旧设备：生成迁移二维码（使用服务器存储数据）
   */
  async generateMigrationQR(): Promise<{ qrCode: string; confirmCode: string }> {
    try {
      console.log(' 开始生成迁移二维码...');
      
      // 1. 获取设备ID
      const deviceInfo = await Device.getId();
      const deviceId = deviceInfo.identifier;

      // 2. 获取本地账户数据（包含所有本地存储）
      console.log(' 收集本地数据...');
      const accountData = await this.getLocalAccountData();
      if (!accountData) {
        throw new Error('未找到账户数据');
      }

      // 3. 创建迁移会话
      const migrationId = this.generateMigrationId();
      const confirmCode = this.generateConfirmCode();
      
      console.log(' 迁移ID:', migrationId);
      console.log(' 确认码:', confirmCode);

      // 4. 准备迁移数据
      const migrationData: MigrationData = {
        ...accountData,
        timestamp: Date.now(),
        deviceId: deviceId
      };

      // 5. 加密迁移数据
      console.log(' 加密迁移数据...');
      const encryptedData = await this.encryptMigrationData(migrationData, confirmCode);
      console.log(`  数据大小: ${(encryptedData.length / 1024).toFixed(2)} KB`);

      // 6. 先创建迁移会话 
      console.log(' 创建迁移会话...');
      const migrationSession: MigrationSession = {
        id: migrationId,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + this.MIGRATION_TIMEOUT,
        oldDeviceId: deviceId,
        confirmCode
      };
      await this.createMigrationSession(migrationSession);
      console.log('  会话创建成功');

      // 7. 上传加密数据到服务器 
      console.log(' 上传加密数据...');
      await this.uploadMigrationData(migrationId, encryptedData);
      console.log('  数据上传成功');

      // 8. 生成轻量级二维码（只包含迁移ID） 
      const qrData = {
        migrationId,
        expires: Date.now() + this.MIGRATION_TIMEOUT,
        version: '2.0' // 标记为新版本
      };

      const qrCodeString = await QRCode.toDataURL(JSON.stringify(qrData));
      console.log(' 二维码生成成功');
      
      // 9. 开始监听迁移完成
        this.startServerConfirmationListener(migrationId);

      return { 
        qrCode: qrCodeString, 
        confirmCode 
      };
    } catch (error) {
      console.error(' 生成迁移二维码失败:', error);
      throw error;
    }
  }

  /**
   * 上传迁移数据到服务器 
   */
  private async uploadMigrationData(migrationId: string, encryptedData: string): Promise<void> {
    try {
      const headers = await authService.getAuthHeader();
      const url = buildMigrationUrl('uploadData');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          migrationId,
          encryptedData,
          expiresAt: Date.now() + this.MIGRATION_TIMEOUT
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '上传迁移数据失败');
      }

      const result = await response.json();
      console.log('  服务器响应:', result.message || '上传成功');
    } catch (error: any) {
      console.error('上传迁移数据失败:', error);
      throw new Error('无法上传迁移数据到服务器，请检查网络连接');
    }
  }

  /**
   * 新设备：处理迁移二维码（从服务器下载数据）
   * @param password 用户输入的密码（用于解密EOA私钥）
   * @param enableBiometric 是否启用指纹识别
   */
  async processMigrationQR(
    qrData: string, 
    password: string, 
    enableBiometric: boolean = false
  ): Promise<{ success: boolean; confirmCode?: string }> {
    try {
      console.log(' 开始处理迁移二维码...');
      
      const parsedData = JSON.parse(qrData);
      const { migrationId, expires, version } = parsedData;

      console.log('迁移版本:', version || '1.0');
      console.log('迁移ID:', migrationId);

      // 1. 检查是否过期
      if (Date.now() > expires) {
        throw new Error('迁移二维码已过期');
      }

      // 2. 获取确认码（用户输入）
      const confirmCode = await uiService.prompt({
        title: '账户迁移',
        message: '请输入旧设备显示的6位确认码',
        placeholder: '6位确认码',
        confirmText: '确定',
        cancelText: '取消',
      });
      if (!confirmCode || confirmCode.length !== 6) {
        throw new Error('请输入正确的6位确认码');
      }

      console.log(' 确认码已输入');

      // 3. 从服务器下载迁移数据 
      console.log(' 从服务器下载迁移数据...');
      const encryptedData = await this.downloadMigrationData(migrationId);
      console.log(`  数据大小: ${(encryptedData.length / 1024).toFixed(2)} KB`);

      // 4. 解密迁移数据
      console.log(' 解密迁移数据...');
      const migrationData: MigrationData = await this.decryptMigrationData(encryptedData, confirmCode);
      console.log('  解密成功');

      // 5. 验证数据完整性
      console.log(' 验证数据完整性...');
      if (!this.validateMigrationData(migrationData)) {
        throw new Error('迁移数据验证失败');
      }

      // 6. 先验证密码是否正确（不保存数据）
      console.log(' 验证密码...');
      console.log(`  输入的密码长度: ${password.length}`);
      console.log(`  加密钱包数据长度: ${migrationData.encryptedWallet.length}`);
      
      const { Wallet } = await import('ethers');
      let decryptedWallet: any = null;
      
      try {
        // 尝试解密钱包
        console.log('  正在使用密码解密钱包...');
        decryptedWallet = await Wallet.fromEncryptedJson(migrationData.encryptedWallet, password);
        console.log('  解密完成，检查结果...');
        
        // 额外验证：检查解密后的钱包地址是否与迁移数据中的地址匹配
        if (!decryptedWallet) {
          console.error('  解密结果为空');
          throw new Error('密码错误，无法解密钱包');
        }
        
        if (!decryptedWallet.address) {
          console.error('  解密后的钱包没有地址');
          throw new Error('密码错误，钱包数据无效');
        }
        
        const decryptedAddress = decryptedWallet.address.toLowerCase();
        const expectedAddress = migrationData.ownerAddress.toLowerCase();
        
        console.log(`  解密得到的地址: ${decryptedAddress}`);
        console.log(`  期望的地址:     ${expectedAddress}`);
        
        if (decryptedAddress !== expectedAddress) {
          console.error('  地址不匹配！密码错误！');
          throw new Error('密码错误，解密的钱包地址不匹配');
        }
        
        console.log('  密码正确，地址验证通过');
        
      } catch (error: any) {
        console.error('  密码验证失败！');
        console.error('  错误类型:', error.constructor.name);
        console.error('  错误消息:', error.message);
        
        // 确保抛出明确的错误信息
        const errorMsg = error.message || '';
        
        if (errorMsg.includes('密码错误')) {
          // 已经是我们自己抛出的明确错误
          throw error;
        } else if (errorMsg.toLowerCase().includes('password') || 
                   errorMsg.toLowerCase().includes('decrypt') ||
                   errorMsg.toLowerCase().includes('invalid')) {
          // ethers 库抛出的密码相关错误
          throw new Error('密码错误，请输入旧设备上设置的密码');
        } else {
          // 其他未知错误
          throw new Error(`密码验证失败: ${errorMsg}`);
        }
      }

      // 7. 导入账户数据（包含所有本地存储）
      console.log(' 导入账户数据...');
      await this.importAccountData(migrationData);

      // 8. 初始化EOA钱包
      console.log(' 初始化钱包...');
      const { aaService } = await import('./accountAbstraction');
      await aaService.loginWithDecryptedWallet(decryptedWallet);
      console.log('  钱包解锁成功');

      // 9. 登录后端获取JWT token
      console.log(' 登录后端...');
      await aaService.loginToBackend();
      console.log('  后端登录成功');

      // 10. 如果启用指纹，保存密码
      if (enableBiometric) {
        try {
          const { biometricService } = await import('./biometric');
          await biometricService.savePasswordWithBiometric(password);
          console.log('  已启用指纹登录');
        } catch (error) {
          console.warn('  指纹登录设置失败（不影响迁移）');
        }
      }

      // 11. 发送确认信号给旧设备
      console.log(' 发送确认信号...');
      const deviceInfo = await Device.getId();
      const newDeviceId = deviceInfo.identifier;
      await this.sendMigrationConfirmation(migrationId, newDeviceId);

      console.log(' 账户迁移完成！');
      return { success: true, confirmCode };
    } catch (error) {
      console.error(' 处理迁移二维码失败:', error);
      throw error;
    }
  }

  /**
   * 从服务器下载迁移数据 
   */
  private async downloadMigrationData(migrationId: string): Promise<string> {
    try {
      // 使用配置的endpoint，替换路径参数
      let url = buildMigrationUrl('downloadData');
      url = url.replace(':migrationId', migrationId);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('迁移数据不存在或已过期');
        }
        const error = await response.json();
        throw new Error(error.message || '下载迁移数据失败');
      }

      const result = await response.json();
      
      if (!result.encryptedData) {
        throw new Error('服务器返回的数据格式错误');
      }

      console.log('  下载成功');
      return result.encryptedData;
    } catch (error: any) {
      console.error('下载迁移数据失败:', error);
      throw new Error('无法从服务器下载迁移数据: ' + error.message);
    }
  }

  /**
   * 手动输入确认码验证迁移
   */
  async verifyMigrationWithCode(migrationId: string, confirmCode: string): Promise<boolean> {
    try {
      const response = await fetch(buildMigrationUrl('verifyCode'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migrationId, confirmCode })
      });

      if (response.ok) {
        const result = await response.json();
        return result.success ? result.data.valid : result.valid;
      }
      return false;
    } catch (error) {
      console.error('验证确认码失败:', error);
      return false;
    }
  }

  /**
   * 创建迁移会话（发送到服务器）
   */
  private async createMigrationSession(session: MigrationSession): Promise<void> {
    try {
      // 获取认证头和用户地址
      const headers = await authService.getAuthHeader();
      const { aaService } = await import('./accountAbstraction');
      const userAddress = aaService.getAbstractAccountAddress();
      
      const response = await fetch(buildMigrationUrl('createSession'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers, // 包含JWT token
        },
        body: JSON.stringify({
          ...session,
          userAddress // 添加用户地址以便发送通知
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建迁移会话失败');
      }
      
      console.log(' 迁移会话创建成功（通知已发送）');
    } catch (error: any) {
      console.error('创建迁移会话失败:', error);
      throw new Error('创建迁移会话失败: ' + error.message);
    }
  }

  /**
   * 获取迁移会话
   */
  private async getMigrationSession(migrationId: string): Promise<MigrationSession> {
    const url = buildMigrationUrl('getSession').replace(':migrationId', migrationId);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('获取迁移会话失败');
    }
    const result = await response.json();
    return result.success ? result.data : result;
  }

  /**
   * 发送迁移确认信号（多重策略）
   */
  private async sendMigrationConfirmation(migrationId: string, newDeviceId: string): Promise<void> {
    // 策略1: 尝试通过API Gateway确认（带认证信息）
    try {
      // 获取认证头和用户地址
      const headers = await authService.getAuthHeader();
      const { aaService } = await import('./accountAbstraction');
      const userAddress = aaService.getAbstractAccountAddress();
      
      console.log('发送迁移确认:', {
        migrationId,
        newDeviceId,
        userAddress
      });
      
      const response = await fetch(buildMigrationUrl('confirmMigration'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers, // 包含JWT token
        },
        body: JSON.stringify({
          migrationId,
          newDeviceId,
          status: 'completed',
          timestamp: Date.now(),
          userAddress // 添加用户地址以便发送通知
        })
      });

      if (response.ok) {
        console.log(' 服务器确认成功（通知已发送）');
        return;
      } else {
        const error = await response.json();
        console.warn('服务器确认失败:', error);
      }
    } catch (error) {
      console.warn('服务器确认失败，使用本地存储:', error);
    }

    // 策略2: 本地存储确认状态（用于离线场景）
    await Preferences.set({
      key: `migration_completed_${migrationId}`,
      value: JSON.stringify({
        migrationId,
        newDeviceId,
        timestamp: Date.now()
      })
    });
    console.log(' 本地存储确认已保存');
  }

  /**
   * 监听服务器确认（旧设备轮询）
   */
  private startServerConfirmationListener(migrationId: string): void {
    this.confirmationPollInterval = setInterval(async () => {
      try {
        const url = buildMigrationUrl('getStatus').replace(':migrationId', migrationId);
        const response = await fetch(url);
        
        if (response.ok) {
          const result = await response.json();
          const status = result.success ? result.data.status : result.status;

          if (status === 'completed') {
            this.stopConfirmationListener();
            await this.handleMigrationConfirmed();
          } else if (status === 'expired') {
            this.stopConfirmationListener();
            console.log('迁移会话已过期');
          }
        }
      } catch (error) {
        console.error('检查迁移状态失败:', error);
      }
    }, 3000); // 每3秒检查一次

    // 5分钟后停止轮询
    setTimeout(() => {
      this.stopConfirmationListener();
    }, this.MIGRATION_TIMEOUT);
  }

  /**
   * 停止确认监听
   */
  private stopConfirmationListener(): void {
    if (this.confirmationPollInterval) {
      clearInterval(this.confirmationPollInterval);
      this.confirmationPollInterval = null;
    }
  }

  /**
   * 手动确认迁移完成（旧设备）
   */
  async manualConfirmMigration(): Promise<void> {
    const confirmed = await uiService.confirm(
      '确认账户已成功迁移到新设备？\n确认后将清理本设备上的账户数据。',
      {
        title: '确认迁移完成',
        confirmText: '确认',
        cancelText: '取消',
      }
    );
    
    if (!confirmed) return;
    await this.handleMigrationConfirmed();
  }

  /**
   * 处理迁移确认（清理旧设备数据）
   */
  private async handleMigrationConfirmed(): Promise<void> {
    try {
      console.log('账户迁移已确认，开始清理本地数据...');

      // 1. 备份重要数据（可选）
      await this.backupImportantData();

      // 2. 清理账户数据
      await this.cleanupOldDeviceData();

      // 3. 显示完成消息
      await uiService.alert(
        '✅ 账户迁移完成！\n本设备数据已安全清理。\n感谢使用健康守护！',
        { title: '迁移完成', confirmText: '我知道了' }
      );
      
      // 4. 跳转到欢迎页
      window.location.href = '/splash';
    } catch (error) {
      console.error('处理迁移确认失败:', error);
      uiService.toast('数据清理过程中出现错误，请手动检查设置。', { type: 'error' });
    }
  }

  /**
   * 备份重要数据
   */
  private async backupImportantData(): Promise<void> {
    const backupData = {
      migrationTime: new Date().toISOString(),
      deviceInfo: await Device.getInfo(),
      lastBackup: Date.now()
    };

    await Preferences.set({
      key: 'migration_backup',
      value: JSON.stringify(backupData)
    });
  }

  /**
   * 清理旧设备数据（使用统一配置）
   */
  private async cleanupOldDeviceData(): Promise<void> {
    console.log('🗑️ 开始清理旧设备数据...');
    
    const cleanedKeys: string[] = [];
    let totalCleaned = 0;
    
    // 1. 清理认证数据
    console.log('  清理认证数据...');
    for (const key of CLEAR_GROUPS.AUTH) {
      try {
        await Preferences.remove({ key });
        cleanedKeys.push(key);
        totalCleaned++;
        console.log(`    ✅ ${key}`);
      } catch (error) {
        console.warn(`    ⚠️ ${key} 删除失败`);
      }
    }

    // 清理所有带前缀的共享打卡统计数据
    try {
      const { keys } = await Preferences.keys();
      const sharedStatsKeys = keys.filter(k => k.startsWith(CHECKIN_SHARE_KEYS.SHARED_STATS_PREFIX));
      for (const key of sharedStatsKeys) {
        await Preferences.remove({ key });
        cleanedKeys.push(key);
        totalCleaned++;
        console.log(`    ✅ ${key}`);
      }
    } catch (error) {
      console.warn('    ⚠️ 清理共享打卡统计失败');
    }
    
    // 2. 清理钱包数据
    console.log('  清理钱包数据...');
    for (const key of CLEAR_GROUPS.WALLET) {
      try {
        await Preferences.remove({ key });
        cleanedKeys.push(key);
        totalCleaned++;
        console.log(`    ✅ ${key}`);
      } catch (error) {
        console.warn(`    ⚠️ ${key} 删除失败`);
      }
    }
    
    // 3. 清理生物识别数据
    console.log('  清理生物识别数据...');
    for (const key of CLEAR_GROUPS.BIOMETRIC) {
      try {
        await Preferences.remove({ key });
        cleanedKeys.push(key);
        totalCleaned++;
        console.log(`    ✅ ${key}`);
      } catch (error) {
        console.warn(`    ⚠️ ${key} 删除失败`);
      }
    }
    
    // 4. 清理用药计划数据
    console.log('  清理用药计划数据...');
    for (const key of CLEAR_GROUPS.MEDICATION) {
      try {
        await Preferences.remove({ key });
        cleanedKeys.push(key);
        totalCleaned++;
        console.log(`    ✅ ${key}`);
      } catch (error) {
        console.warn(`    ⚠️ ${key} 删除失败`);
      }
    }
    
    // 清理所有带前缀的计划数据
    try {
      const { keys } = await Preferences.keys();
      const planKeys = keys.filter(k => k.startsWith(MEDICATION_PLAN_KEYS.PLAN_PREFIX));
      for (const key of planKeys) {
        await Preferences.remove({ key });
        cleanedKeys.push(key);
        totalCleaned++;
        console.log(`    ✅ ${key}`);
      }
    } catch (error) {
      console.warn('    ⚠️ 清理计划详情失败');
    }

    // 清理所有带前缀的共享计划数据
    try {
      const { keys } = await Preferences.keys();
      const sharedPlanKeys = keys.filter(k => k.startsWith(MEDICATION_SHARE_KEYS.SHARED_PLAN_PREFIX));
      for (const key of sharedPlanKeys) {
        await Preferences.remove({ key });
        cleanedKeys.push(key);
        totalCleaned++;
        console.log(`    ✅ ${key}`);
      }
    } catch (error) {
      console.warn('    ⚠️ 清理共享计划详情失败');
    }

    // 清理所有带前缀的计划分发 outbox 数据
    try {
      const { keys } = await Preferences.keys();
      const outboxKeys = keys.filter(k => k.startsWith(MEDICATION_SHARE_KEYS.SHARED_PLAN_OUTBOX_PREFIX));
      for (const key of outboxKeys) {
        await Preferences.remove({ key });
        cleanedKeys.push(key);
        totalCleaned++;
        console.log(`    ✅ ${key}`);
      }
    } catch (error) {
      console.warn('    ⚠️ 清理计划分发 outbox 失败');
    }
    
    // 5. 清理打卡数据
    console.log('  清理打卡数据...');
    for (const key of CLEAR_GROUPS.CHECKIN) {
      try {
        await Preferences.remove({ key });
        cleanedKeys.push(key);
        totalCleaned++;
        console.log(`    ✅ ${key}`);
      } catch (error) {
        console.warn(`    ⚠️ ${key} 删除失败`);
      }
    }
    
    // 6. 清理成员数据
    console.log('  清理成员数据...');
    for (const key of CLEAR_GROUPS.MEMBER) {
      try {
        await Preferences.remove({ key });
        cleanedKeys.push(key);
        totalCleaned++;
        console.log(`    ✅ ${key}`);
      } catch (error) {
        console.warn(`    ⚠️ ${key} 删除失败`);
      }
    }
    
    // 清理所有带前缀的成员数据
    try {
      const { keys } = await Preferences.keys();
      const memberKeys = keys.filter(k => k.startsWith(MEMBER_KEYS.INFO_PREFIX));
      for (const key of memberKeys) {
        await Preferences.remove({ key });
        cleanedKeys.push(key);
        totalCleaned++;
        console.log(`    ✅ ${key}`);
      }
    } catch (error) {
      console.warn('    ⚠️ 清理成员详情失败');
    }
    
    // 7. 清理公钥缓存
    console.log('  清理公钥缓存...');
    try {
      const { keys } = await Preferences.keys();
      const publicKeyKeys = keys.filter(k => k.startsWith(PUBLIC_KEY_KEYS.CACHE_PREFIX));
      for (const key of publicKeyKeys) {
        await Preferences.remove({ key });
        cleanedKeys.push(key);
        totalCleaned++;
        console.log(`    ✅ ${key}`);
      }
    } catch (error) {
      console.warn('    ⚠️ 清理公钥缓存失败');
    }

    // 7.1 清理访问组密钥（组密钥）
    console.log('  清理访问组密钥...');
    try {
      const { keys } = await Preferences.keys();
      const groupKeyKeys = keys.filter(k => k.startsWith(ACCESS_GROUP_KEYS.GROUP_KEY_PREFIX));
      for (const key of groupKeyKeys) {
        await Preferences.remove({ key });
        cleanedKeys.push(key);
        totalCleaned++;
        console.log(`    ✅ ${key}`);
      }
    } catch (error) {
      console.warn('    ⚠️ 清理访问组密钥失败');
    }
    
    // 8. 清理其他数据
    console.log('  清理其他数据...');
    const otherKeys = [
      'account_salt',
      'account_imported_via_migration',
      'guardians',
      'familyMembers',
      'preferences'
    ];
    
    for (const key of otherKeys) {
      try {
        await Preferences.remove({ key });
        cleanedKeys.push(key);
        totalCleaned++;
        console.log(`    ✅ ${key}`);
      } catch (error) {
        console.warn(`    ⚠️ ${key} 删除失败`);
      }
    }

    // 标记为已清理
    await Preferences.set({
      key: 'account_migrated_and_cleaned',
      value: JSON.stringify({
        timestamp: Date.now(),
        version: '2.0',
        totalCleaned,
        cleaned_keys: cleanedKeys
      })
    });
    
    console.log(`✅ 旧设备数据清理完成，共清理 ${totalCleaned} 个键`);
  }

  /**
   * 获取本地账户数据（包含所有本地存储）
   */
  private async getLocalAccountData(): Promise<any> {
    console.log('📦 开始收集所有本地数据...');
    
    // 1. 获取核心账户数据
    const userInfo = await Preferences.get({ key: AUTH_KEYS.USER_INFO });
    const eoaKey = await Preferences.get({ key: WALLET_KEYS.EOA_PRIVATE_KEY });
    const saltValue = await Preferences.get({ key: 'account_salt' });
    
    console.log('核心数据状态:', {
      hasUserInfo: !!userInfo.value,
      hasEOAKey: !!eoaKey.value,
      hasSalt: !!saltValue.value
    });
    
    // 检查必要的数据
    if (!userInfo.value || !eoaKey.value || !saltValue.value) {
      console.error('缺少必要的账户数据');
      return null;
    }
    
    // 获取Smart Account地址（优先从存储读取，避免依赖 aaService 内存状态）
    const { value: storedAccountAddress } = await Preferences.get({ key: WALLET_KEYS.ACCOUNT_ADDRESS });
    const smartAccountAddress = storedAccountAddress || null;
    
    if (!smartAccountAddress) {
      console.error('缺少Smart Account地址');
      return null;
    }
    
    const parsedUserInfo = JSON.parse(userInfo.value);
    
    // 2. 收集所有本地存储数据 🆕
    console.log('📥 开始收集本地存储数据...');
    const localStorageData = await this.collectAllLocalStorage();
    
    console.log('✅ 本地数据收集完成:', {
      totalKeys: Object.keys(localStorageData).length,
      coreDataIncluded: true
    });

    return {
      // 核心账户信息
      accountAddress: smartAccountAddress,
      ownerAddress: parsedUserInfo.eoa_address,
      encryptedWallet: eoaKey.value,
      salt: parseInt(saltValue.value),
      isDeployed: true,
      userInfo: parsedUserInfo,
      
      // 所有本地存储数据 🆕
      localStorageData,
      
      // 数据版本
      dataVersion: '2.0' // 标记为新版本（包含完整本地数据）
    };
  }

  /**
   * 收集所有本地存储数据 🆕
   */
  private async collectAllLocalStorage(): Promise<{ [key: string]: string }> {
    const allData: { [key: string]: string } = {};
    let totalSize = 0;
    
    try {
      // 获取所有存储的键
      const { keys } = await Preferences.keys();
      console.log(`  找到 ${keys.length} 个存储键`);
      
      // 逐个读取数据
      for (const key of keys) {
        try {
          const result = await Preferences.get({ key });
          if (result.value) {
            allData[key] = result.value;
            totalSize += result.value.length;
            
            // 打印关键数据的统计
            if (key.includes('medication_plan')) {
              console.log(`  📋 ${key}: ${result.value.length} 字节`);
            } else if (key.includes('checkin')) {
              console.log(`  ✅ ${key}: ${result.value.length} 字节`);
            } else if (key.includes('member')) {
              console.log(`  👥 ${key}: ${result.value.length} 字节`);
            } else if (key.includes('public_key')) {
              console.log(`  🔑 ${key}: ${result.value.length} 字节`);
            }
          }
        } catch (error) {
          console.warn(`  ⚠️ 读取键 ${key} 失败:`, error);
        }
      }
      
      console.log(`  ✅ 成功收集 ${Object.keys(allData).length} 个键`);
      console.log(`  📊 总数据大小: ${(totalSize / 1024).toFixed(2)} KB`);
      
    } catch (error) {
      console.error('收集本地存储数据失败:', error);
    }
    
    return allData;
  }

  /**
   * 导入账户数据到新设备（包含所有本地存储）
   */
  private async importAccountData(migrationData: MigrationData): Promise<void> {
    console.log('📦 开始导入所有数据到新设备...');
    console.log('迁移数据版本:', migrationData.dataVersion || '1.0');
    
    // 1. 导入所有本地存储数据 🆕
    if (migrationData.localStorageData && migrationData.dataVersion === '2.0') {
      console.log('📥 导入完整本地存储（v2.0）...');
      await this.importAllLocalStorage(migrationData.localStorageData);
    } else {
      // 兼容旧版本（v1.0），只导入核心数据
      console.log('📥 导入核心数据（v1.0 兼容模式）...');
      
      // 保存EOA密钥
    await Preferences.set({
        key: WALLET_KEYS.EOA_PRIVATE_KEY,
      value: migrationData.encryptedWallet
    });
    console.log('✅ EOA密钥已保存');

    // 保存Smart Account地址
    await Preferences.set({
        key: WALLET_KEYS.ACCOUNT_ADDRESS,
      value: migrationData.accountAddress
    });
    console.log('✅ Smart Account地址已保存');

      // 保存salt值
    if (migrationData.salt !== undefined && migrationData.salt !== null) {
      await Preferences.set({
        key: 'account_salt',
        value: migrationData.salt.toString()
      });
        console.log('✅ Salt值已保存');
    }

      // 保存用户信息
    await Preferences.set({
        key: AUTH_KEYS.USER_INFO,
      value: JSON.stringify(migrationData.userInfo)
    });
    console.log('✅ 用户信息已保存');
    }

    // 2. 标记为迁移导入
    await Preferences.set({
      key: 'account_imported_via_migration',
      value: JSON.stringify({
        timestamp: Date.now(),
        fromDevice: migrationData.deviceId,
        dataVersion: migrationData.dataVersion || '1.0'
      })
    });
    console.log('✅ 迁移标记已保存');
    
    console.log('✅ 所有数据导入完成');
  }

  /**
   * 导入所有本地存储数据 🆕
   */
  private async importAllLocalStorage(localData: { [key: string]: string }): Promise<void> {
    const keys = Object.keys(localData);
    console.log(`  开始导入 ${keys.length} 个存储键...`);
    
    let successCount = 0;
    let failCount = 0;
    
    // 按类别统计
    const stats = {
      medication: 0,
      checkin: 0,
      member: 0,
      publicKey: 0,
      auth: 0,
      wallet: 0,
      other: 0
    };
    
    for (const key of keys) {
      try {
        await Preferences.set({
          key,
          value: localData[key]
        });
        
        successCount++;
        
        // 统计数据类型
        if (key.includes('medication_plan')) {
          stats.medication++;
          console.log(`  📋 ${key}`);
        } else if (key.includes('checkin')) {
          stats.checkin++;
          console.log(`  ✅ ${key}`);
        } else if (key.includes('member')) {
          stats.member++;
          console.log(`  👥 ${key}`);
        } else if (key.includes('public_key')) {
          stats.publicKey++;
          console.log(`  🔑 ${key}`);
        } else if (key === AUTH_KEYS.JWT_TOKEN || key === AUTH_KEYS.USER_INFO) {
          stats.auth++;
        } else if (key === WALLET_KEYS.EOA_PRIVATE_KEY || key === WALLET_KEYS.ACCOUNT_ADDRESS) {
          stats.wallet++;
        } else {
          stats.other++;
        }
        
      } catch (error) {
        failCount++;
        console.warn(`  ⚠️ 导入失败 ${key}:`, error);
      }
    }
    
    console.log('\n  📊 导入统计:');
    console.log(`    ✅ 成功: ${successCount} 个`);
    console.log(`    ❌ 失败: ${failCount} 个`);
    console.log('\n  📋 数据分类:');
    console.log(`    💊 用药计划: ${stats.medication} 个`);
    console.log(`    ✅ 打卡记录: ${stats.checkin} 个`);
    console.log(`    👥 成员信息: ${stats.member} 个`);
    console.log(`    🔑 公钥缓存: ${stats.publicKey} 个`);
    console.log(`    🔐 认证数据: ${stats.auth} 个`);
    console.log(`    💰 钱包数据: ${stats.wallet} 个`);
    console.log(`    📦 其他数据: ${stats.other} 个`);
  }

  /**
   * 加密迁移数据
   */
  private async encryptMigrationData(data: MigrationData, key: string): Promise<string> {
    // 使用确认码作为加密密钥
    const keyHash = keccak256(toUtf8Bytes(key));
    const dataStr = JSON.stringify(data);
    
    // 简化的加密实现（实际项目中应使用更安全的加密方式）
    const encrypted = hexlify(
      toUtf8Bytes(dataStr + keyHash.slice(0, 10))
    );
    
    return encrypted;
  }

  /**
   * 解密迁移数据
   */
  private async decryptMigrationData(encryptedData: string, key: string): Promise<MigrationData> {
    try {
      const keyHash = keccak256(toUtf8Bytes(key));
      const decrypted = toUtf8String(encryptedData);
      
      // 验证密钥
      if (!decrypted.endsWith(keyHash.slice(0, 10))) {
        throw new Error('确认码错误');
      }
      
      const dataStr = decrypted.slice(0, -10);
      return JSON.parse(dataStr);
    } catch (error) {
      throw new Error('解密失败，请检查确认码是否正确');
    }
  }

  /**
   * 验证迁移数据
   */
  private validateMigrationData(data: MigrationData): boolean {
    // 基本验证
    const basicValid = !!(
      data.encryptedWallet &&
      data.accountAddress &&
      data.ownerAddress &&
      data.userInfo?.username &&
      data.salt !== undefined &&
      data.timestamp &&
      data.deviceId
    );
    
    if (!basicValid) {
      console.error('基本数据验证失败');
      return false;
    }
    
    // v2.0 数据验证
    if (data.dataVersion === '2.0') {
      if (!data.localStorageData) {
        console.error('v2.0 数据缺少 localStorageData');
        return false;
      }
      
      const keyCount = Object.keys(data.localStorageData).length;
      console.log(`✅ v2.0 数据验证通过，包含 ${keyCount} 个存储键`);
    } else {
      console.log('✅ v1.0 数据验证通过（兼容模式）');
    }
    
    return true;
  }

  /**
   * 生成迁移ID
   */
  private generateMigrationId(): string {
    return 'mig_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  }

  /**
   * 生成6位确认码
   */
  private generateConfirmCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 检查是否有待处理的迁移
   */
  async checkPendingMigration(): Promise<boolean> {
    try {
      const keys = await Preferences.keys();
      return keys.keys.some(key => key.startsWith('migration_completed_'));
    } catch (error) {
      return false;
    }
  }
}

export const migrationService = new MigrationService();
