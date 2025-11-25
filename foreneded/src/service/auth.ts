/**
 * 认证服务
 * 处理用户注册和登录
 */

import { ethers } from 'ethers';
import { Preferences } from '@capacitor/preferences';
import { buildAuthUrl } from '../config/api.config';

// 导入存储配置
import { AUTH_KEYS } from '@/config/storage.config';

// 用户信息接口
export interface UserInfo {
  user_id: string; // UUID
  eoa_address: string;
  smart_account: string;
  username: string;
  roles: string[]; // 角色数组: elderly, doctor, guardian, nurse, hospital_admin
}

// 注册请求接口
export interface RegisterRequest {
  id_card_number: string;
  phone_number: string;
  email: string;
  eoa_address: string;
  smart_account_address: string;
  encryption_public_key: string; // ECIES加密公钥（压缩格式）
}

// 登录请求接口
export interface LoginRequest {
  login_time: string;
  signature: string;
}

// API登录响应接口
export interface LoginAPIResponse {
  success: boolean;
  message: string;
  data: {
    user_id: string;
    eoa_address: string;
    smart_account_address: string;
    username: string;
    phone_number?: string;
    roles: string[];
    token: string;
  };
}

// 服务层登录响应接口
export interface LoginResponse {
  token: string;
  user: UserInfo;
}

class AuthService {
  private token: string | null = null;
  private userInfo: UserInfo | null = null;
  private backendLoggedIn: boolean = false; // 后端登录状态

  /**
   * 用户注册
   * @param registerData 注册数据
   * @returns 用户信息
   */
  public async register(registerData: RegisterRequest): Promise<UserInfo> {
    try {
      console.log('调用注册API...', {
        id_card_number: registerData.id_card_number,
        phone_number: registerData.phone_number,
        eoa_address: registerData.eoa_address,
        smart_account_address: registerData.smart_account_address,
      });

      const response = await fetch(
        buildAuthUrl('register'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(registerData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '注册失败');
      }

      const result = await response.json();
      
      console.log('注册API完整响应:', JSON.stringify(result, null, 2));
      
      if (result.success && result.data) {
        console.log('注册响应data字段:', {
          user_id: result.data.user_id,
          eoa_address: result.data.eoa_address,
          smart_account_address: result.data.smart_account_address,
          username: result.data.username,
          role: result.data.role
        });
        
        // 处理 smart_account 字段的映射
        let smartAccount = result.data.smart_account_address;
        
        // 如果 API 响应中没有 smart_account_address，尝试使用其他可能的字段名
        if (!smartAccount) {
          smartAccount = (result.data as any).smart_account || 
                        (result.data as any).smartAccount || 
                        (result.data as any).account_address;
          
          console.warn('注册响应未找到 smart_account_address 字段，使用备用字段:', smartAccount);
        }
        
        // 如果仍然没有，尝试从 AccountAbstraction 服务获取
        if (!smartAccount) {
          console.warn('注册时无法获取smart_account，尝试从 AccountAbstraction 服务获取...');
          try {
            const { aaService } = await import('./accountAbstraction');
            const accountAddress = aaService.getAbstractAccountAddress();
            if (accountAddress) {
              smartAccount = accountAddress;
              console.log('从 AccountAbstraction 服务获取 smart_account:', smartAccount);
            }
          } catch (error) {
            console.error('注册时无法获取 smart_account 地址:', error);
          }
        }
        
        const userInfo: UserInfo = {
          user_id: result.data.user_id,
          eoa_address: result.data.eoa_address,
          smart_account: smartAccount || '',
          username: result.data.username,
          roles: [result.data.role] // 注册时只返回单个角色
        };
        
        console.log('注册映射后的用户信息:', {
          user_id: userInfo.user_id,
          smart_account: userInfo.smart_account,
          username: userInfo.username
        });
        
        console.log('注册成功:', userInfo.username);
        
        // 保存用户信息（注册时不保存token，需要登录）
        await this.saveUserInfo(userInfo);
        this.userInfo = userInfo;

        return userInfo;
      } else {
        throw new Error(result.message || '注册失败');
      }
    } catch (error: any) {
      console.error('注册失败:', error);
      throw error;
    }
  }

  /**
   * 用户登录
   * @param eoaWallet EOA钱包（用于签名）
   * @returns 登录响应（包含token和用户信息）
   */
  public async login(eoaWallet: ethers.Wallet | ethers.HDNodeWallet): Promise<LoginResponse> {
    try {
      // 1. 构造登录时间戳
      const loginTime = new Date().toISOString();
      const message = `LOGIN_TIME:${loginTime}`;
      
      console.log('生成登录签名...');
      console.log('消息:', message);
      console.log('EOA地址:', eoaWallet.address);

      // 2. 使用EOA私钥签名
      const signature = await eoaWallet.signMessage(message);
      console.log('签名完成');

      // 3. 调用登录API
      console.log('调用登录API...');
      const response = await fetch(
        buildAuthUrl('login'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eoa_address: eoaWallet.address,
            login_time: loginTime,
            signature: signature,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '登录失败');
      }

      const loginResponse: LoginAPIResponse = await response.json();
      
      console.log('登录API完整响应:', JSON.stringify(loginResponse, null, 2));
      
      if (loginResponse.success && loginResponse.data) {
        console.log('登录响应data字段:', {
          user_id: loginResponse.data.user_id,
          eoa_address: loginResponse.data.eoa_address,
          smart_account_address: loginResponse.data.smart_account_address,
          username: loginResponse.data.username,
          roles: loginResponse.data.roles
        });
        
        // 处理 smart_account 字段的映射
        let smartAccount = loginResponse.data.smart_account_address;
        
        // 如果 API 响应中没有 smart_account_address，尝试使用其他可能的字段名
        if (!smartAccount) {
          // 尝试其他可能的字段名
          smartAccount = (loginResponse.data as any).smart_account || 
                        (loginResponse.data as any).smartAccount || 
                        (loginResponse.data as any).account_address;
          
          console.warn('未找到 smart_account_address 字段，使用备用字段:', smartAccount);
        }
        
        // 如果仍然没有，尝试从本地存储或AccountAbstraction服务获取
        if (!smartAccount) {
          console.warn('无法从登录响应获取smart_account，尝试从本地获取...');
          try {
            const { aaService } = await import('./accountAbstraction');
            const accountAddress = aaService.getAbstractAccountAddress();
            if (accountAddress) {
              smartAccount = accountAddress;
              console.log('从 AccountAbstraction 服务获取 smart_account:', smartAccount);
            }
          } catch (error) {
            console.error('无法获取 smart_account 地址:', error);
          }
        }
        
        const userInfo: UserInfo = {
          user_id: loginResponse.data.user_id,
          eoa_address: loginResponse.data.eoa_address,
          smart_account: smartAccount || '',
          username: loginResponse.data.username,
          roles: loginResponse.data.roles
        };
        
        console.log('映射后的用户信息:', {
          user_id: userInfo.user_id,
          smart_account: userInfo.smart_account,
          username: userInfo.username,
          roles: userInfo.roles
        });
        
        console.log('登录成功:', userInfo.username);

        // 4. 保存token和用户信息
        await this.saveToken(loginResponse.data.token);
        await this.saveUserInfo(userInfo);
        
        this.token = loginResponse.data.token;
        this.userInfo = userInfo;
        this.backendLoggedIn = true; // 标记后端已登录

        return {
          token: loginResponse.data.token,
          user: userInfo
        };
      } else {
        throw new Error(loginResponse.message || '登录失败');
      }
    } catch (error: any) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前JWT Token
   */
  public async getToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
    }

    const { value } = await Preferences.get({ key: AUTH_KEYS.JWT_TOKEN });
    this.token = value;
    return value;
  }

  /**
   * 获取当前用户信息
   */
  public async getUserInfo(): Promise<UserInfo | null> {
    if (this.userInfo) {
      console.log('从内存获取的原始用户信息:', JSON.stringify(this.userInfo, null, 2));
      
      // 检查并修复缺失的 smart_account 字段
      if (!this.userInfo.smart_account) {
        console.warn('内存中的用户信息缺少 smart_account 字段，尝试修复...');
        
        try {
          const { aaService } = await import('./accountAbstraction');
          const accountAddress = aaService.getAbstractAccountAddress();
          if (accountAddress) {
            this.userInfo.smart_account = accountAddress;
            // 更新存储
            await this.saveUserInfo(this.userInfo);
            console.log('已修复内存中的 smart_account 字段:', accountAddress);
          }
        } catch (error) {
          console.error('无法修复内存中的 smart_account 字段:', error);
        }
      }
      
      console.log('最终内存用户信息:', JSON.stringify({
        user_id: this.userInfo?.user_id,
        smart_account: this.userInfo?.smart_account,
        username: this.userInfo?.username
      }, null, 2));
      
      return this.userInfo;
    }

    const { value } = await Preferences.get({ key: AUTH_KEYS.USER_INFO });
    if (value) {
      this.userInfo = JSON.parse(value);
      
      console.log('从存储获取的原始用户信息:', JSON.stringify(this.userInfo, null, 2));
      
      // 检查并修复缺失的 smart_account 字段
      if (this.userInfo && !this.userInfo.smart_account) {
        console.warn('存储的用户信息缺少 smart_account 字段，尝试修复...');
        
        try {
          const { aaService } = await import('./accountAbstraction');
          const accountAddress = aaService.getAbstractAccountAddress();
          if (accountAddress) {
            this.userInfo.smart_account = accountAddress;
            // 更新存储
            await this.saveUserInfo(this.userInfo);
            console.log('已修复 smart_account 字段:', accountAddress);
          }
        } catch (error) {
          console.error('无法修复 smart_account 字段:', error);
        }
      }
      
      console.log('最终用户信息:', JSON.stringify({
        user_id: this.userInfo?.user_id,
        smart_account: this.userInfo?.smart_account,
        username: this.userInfo?.username
      }, null, 2));
      
      return this.userInfo;
    }
    
    console.log('未找到用户信息');
    return null;
  }

  /**
   * 保存JWT Token
   */
  private async saveToken(token: string): Promise<void> {
    await Preferences.set({
      key: AUTH_KEYS.JWT_TOKEN,
      value: token,
    });
  }

  /**
   * 保存用户信息
   */
  public async saveUserInfo(userInfo: UserInfo): Promise<void> {
    this.userInfo = userInfo; // 同时更新内存中的用户信息
    await Preferences.set({
      key: AUTH_KEYS.USER_INFO,
      value: JSON.stringify(userInfo),
    });
  }

  /**
   * 清除认证信息（登出）
   */
  public async logout(): Promise<void> {
    await Preferences.remove({ key: AUTH_KEYS.JWT_TOKEN });
    await Preferences.remove({ key: AUTH_KEYS.USER_INFO });
    this.token = null;
    this.userInfo = null;
    this.backendLoggedIn = false;
    console.log('已登出');
  }

  /**
   * 检查是否已登录
   */
  public async isLoggedIn(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }

  /**
   * 获取认证头（用于需要认证的API调用）
   */
  public async getAuthHeader(): Promise<{ Authorization: string } | {}> {
    const token = await this.getToken();
        console.log('获取认证头:', JSON.stringify({
          hasToken: !!token,
          tokenLength: token ? token.length : 0,
          backendLoggedIn: this.backendLoggedIn
        }, null, 2));
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  /**
   * 检查是否已登录后端
   */
  public isBackendLoggedIn(): boolean {
    return this.backendLoggedIn;
  }

  /**
   * 确保已登录后端（用于需要后端功能的操作）
   * 如果未登录后端，会尝试使用当前EOA钱包登录
   * @param eoaWallet 可选的EOA钱包，如果不提供则需要从外部获取
   */
  public async ensureBackendLogin(eoaWallet?: any): Promise<void> {
    // 如果已经登录后端，直接返回
    if (this.backendLoggedIn) {
      console.log('已登录后端，无需重新登录');
      return;
    }

    // 如果有token，说明之前登录过，尝试验证token是否仍然有效
    const token = await this.getToken();
    if (token) {
      console.log('检测到已保存的token，尝试验证...');
      // 这里可以添加token验证逻辑
      // 暂时假设token有效
      this.backendLoggedIn = true;
      return;
    }

    // 如果没有token且提供了eoaWallet，尝试登录
    if (eoaWallet) {
      console.log('尝试登录后端...');
      try {
        await this.login(eoaWallet);
        console.log('✅ 后端登录成功');
      } catch (error: any) {
        console.error('后端登录失败:', error);
        throw new Error('需要网络连接才能执行此操作，请检查网络后重试');
      }
    } else {
      throw new Error('未登录后端，且无法自动登录。请先登录。');
    }
  }
  
  /**
   * 智能后端登录 - 自动尝试指纹识别登录
   * 用于在组件中自动处理后端登录需求
   */
  public async ensureBackendLoginWithBiometric(): Promise<void> {
    // 检查是否已登录后端
    if (this.backendLoggedIn) {
      console.log('已登录后端');
      return;
    }
    
    // 如果有token，尝试验证
    const token = await this.getToken();
    if (token) {
      console.log('检测到已保存的token，标记为已登录');
      this.backendLoggedIn = true;
      return;
    }
    
    console.log('未登录后端，尝试指纹登录...');
    
    // 动态导入aaService以避免循环依赖
    const { aaService } = await import('./accountAbstraction');
    
    try {
      // 检查是否支持指纹识别
      const isBiometricAvailable = await aaService.isBiometricAvailable();
      const isBiometricEnabled = await aaService.isBiometricEnabled();
      
      if (isBiometricAvailable && isBiometricEnabled) {
        console.log('弹出指纹识别登录...');
        await aaService.loginWithBiometric();
        await aaService.loginToBackend();
        console.log('指纹登录成功');
      } else {
        console.log('指纹识别不可用，尝试自动登录...');
        await aaService.ensureBackendLogin();
      }
    } catch (loginError: any) {
      console.error('自动登录失败:', loginError);
      throw new Error('登录失败: ' + loginError.message + '。请手动重新登录。');
    }
  }
}

export const authService = new AuthService();
