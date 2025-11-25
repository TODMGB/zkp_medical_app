import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import { Preferences } from '@capacitor/preferences';

// 导入存储配置
import { BIOMETRIC_KEYS } from '@/config/storage.config';

/**
 * 生物识别服务 - 使用指纹加密和解密密码
 */
class BiometricService {
  /**
   * 检查设备是否支持生物识别
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (error) {
      console.error('检查生物识别可用性失败:', error);
      return false;
    }
  }

  /**
   * 获取生物识别类型
   */
  public async getBiometricType(): Promise<BiometryType | null> {
    try {
      const result = await NativeBiometric.isAvailable();
      return result.biometryType || null;
    } catch (error) {
      console.error('获取生物识别类型失败:', error);
      return null;
    }
  }

  /**
   * 检查是否已启用生物识别
   */
  public async isEnabled(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: BIOMETRIC_KEYS.ENABLED });
      return value === 'true';
    } catch (error) {
      console.error('检查生物识别状态失败:', error);
      return false;
    }
  }

  /**
   * 注册时：使用指纹加密并保存密码
   * @param password - 用户密码
   */
  public async savePasswordWithBiometric(password: string): Promise<void> {
    try {
      // 验证生物识别
      await NativeBiometric.verifyIdentity({
        reason: '验证指纹以加密保存密码',
        title: '指纹验证',
        subtitle: '请验证指纹',
        description: '使用指纹加密您的密码，以便下次快速登录',
      });

      // 使用生物识别加密密码并保存
      await NativeBiometric.setCredentials({
        username: 'user',
        password: password,
        server: 'zk-app',
      });

      // 标记生物识别已启用
      await Preferences.set({
        key: BIOMETRIC_KEYS.ENABLED,
        value: 'true',
      });

      console.log('✅ 密码已使用指纹加密保存');
    } catch (error: any) {
      console.error('保存密码失败:', error);
      // 如果用户取消或验证失败，抛出错误
      if (error.code === 10 || error.code === 13) {
        throw new Error('指纹验证已取消');
      } else if (error.code === 11) {
        throw new Error('指纹验证失败，请重试');
      } else {
        throw new Error('保存密码失败: ' + error.message);
      }
    }
  }

  /**
   * 登录时：使用指纹解密并获取密码
   * @returns 解密后的密码
   */
  public async getPasswordWithBiometric(): Promise<string> {
    try {
      // 🔐 先强制进行生物识别验证
      await NativeBiometric.verifyIdentity({
        reason: '验证身份以登录',
        title: '生物识别验证',
        subtitle: '请验证您的身份',
        description: '使用生物识别解锁账户',
      });

      // 验证成功后，获取保存的凭据
      const credentials = await NativeBiometric.getCredentials({
        server: 'zk-app',
      });

      if (!credentials.password) {
        throw new Error('未找到保存的密码');
      }

      console.log('✅ 密码已通过指纹解密');
      return credentials.password;
    } catch (error: any) {
      console.error('获取密码失败:', error);
      // 处理各种错误情况
      if (error.code === 10 || error.code === 13) {
        throw new Error('指纹验证已取消');
      } else if (error.code === 11) {
        throw new Error('指纹验证失败，请重试');
      } else if (error.code === 1) {
        throw new Error('未找到保存的密码，请使用密码登录');
      } else {
        throw new Error('获取密码失败: ' + error.message);
      }
    }
  }

  /**
   * 删除保存的生物识别凭据
   */
  public async deleteCredentials(): Promise<void> {
    try {
      await NativeBiometric.deleteCredentials({
        server: 'zk-app',
      });

      await Preferences.set({
        key: BIOMETRIC_KEYS.ENABLED,
        value: 'false',
      });

      console.log('✅ 生物识别凭据已删除');
    } catch (error) {
      console.error('删除凭据失败:', error);
      throw error;
    }
  }

  /**
   * 仅验证指纹（不获取凭据）
   */
  public async verifyBiometric(reason: string = '请验证指纹'): Promise<void> {
    try {
      await NativeBiometric.verifyIdentity({
        reason: reason,
        title: '指纹验证',
        subtitle: '身份验证',
        description: '',
      });
    } catch (error: any) {
      if (error.code === 10 || error.code === 13) {
        throw new Error('指纹验证已取消');
      } else if (error.code === 11) {
        throw new Error('指纹验证失败，请重试');
      } else {
        throw new Error('验证失败: ' + error.message);
      }
    }
  }

  /**
   * 身份验证（用于迁移等敏感操作）
   */
  public async authenticate(reason: string = '请验证身份'): Promise<{ success: boolean; error?: string }> {
    try {
      await this.verifyBiometric(reason);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || '身份验证失败' 
      };
    }
  }

  /**
   * 获取生物识别友好名称
   */
  public async getBiometricName(): Promise<string> {
    const type = await this.getBiometricType();
    switch (type) {
      case BiometryType.FACE_ID:
        return '面容ID';
      case BiometryType.TOUCH_ID:
        return '触控ID';
      case BiometryType.FINGERPRINT:
        return '指纹';
      case BiometryType.FACE_AUTHENTICATION:
        return '面部识别';
      case BiometryType.IRIS_AUTHENTICATION:
        return '虹膜识别';
      default:
        return '生物识别';
    }
  }
}

// 导出单例
export const biometricService = new BiometricService();

