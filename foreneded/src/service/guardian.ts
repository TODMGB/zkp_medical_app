/**
 * 守护者管理服务
 * 处理社交恢复相关功能：添加守护者、设置阈值、发起恢复等
 */

import { ethers } from 'ethers';
import { buildERC4337Url } from '../config/api.config';

// UserOp 接口
interface UserOperation {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

// 守护者信息接口
export interface GuardianInfo {
  count: number;
  threshold: number;
  guardians: string[];
}

// 恢复状态接口
export interface RecoveryStatus {
  newOwner: string;
  approvalCount: number;
  executed: boolean;
}

class GuardianService {
  /**
   * 添加守护者 - 构建 UserOp
   */
  public async buildAddGuardianUserOp(
    accountAddress: string,
    guardianAddress: string
  ): Promise<{ userOp: UserOperation; userOpHash: string }> {
    try {
      const response = await fetch(
        buildERC4337Url('buildAddGuardian'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountAddress,
            guardianAddress,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '构建添加守护者UserOp失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('构建添加守护者UserOp失败:', error);
      throw error;
    }
  }

  /**
   * 移除守护者 - 构建 UserOp
   */
  public async buildRemoveGuardianUserOp(
    accountAddress: string,
    guardianAddress: string
  ): Promise<{ userOp: UserOperation; userOpHash: string }> {
    try {
      const response = await fetch(buildERC4337Url('buildRemoveGuardian'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountAddress,
          guardianAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '构建移除守护者UserOp失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('构建移除守护者UserOp失败:', error);
      throw error;
    }
  }

  /**
   * 提交已签名的 UserOp（添加守护者）
   */
  public async submitGuardianUserOp(
    userOp: UserOperation
  ): Promise<{ txHash: string; blockNumber?: number }> {
    try {
      const response = await fetch(
        buildERC4337Url('submitUserOp'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userOp,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '提交守护者UserOp失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('提交守护者UserOp失败:', error);
      throw error;
    }
  }

  /**
   * 添加守护者（完整流程）
   */
  public async addGuardian(
    accountAddress: string,
    guardianAddress: string,
    eoaWallet: ethers.Wallet | ethers.HDNodeWallet
  ): Promise<{ txHash: string }> {
    try {
      console.log('开始添加守护者...');
      console.log('账户地址:', accountAddress);
      console.log('守护者地址:', guardianAddress);

      // 步骤 1: 构建未签名 UserOp
      const { userOp, userOpHash } = await this.buildAddGuardianUserOp(
        accountAddress,
        guardianAddress
      );
      console.log('UserOp已构建, Hash:', userOpHash);

      // 步骤 2: EOA 签名
      const signature = await eoaWallet.signMessage(ethers.getBytes(userOpHash));
      userOp.signature = signature;
      console.log('UserOp已签名');

      // 步骤 3: 提交已签名 UserOp
      const result = await this.submitGuardianUserOp(userOp);
      console.log('✅ 守护者添加成功, 交易:', result.txHash);

      return result;
    } catch (error: any) {
      console.error('添加守护者失败:', error);
      throw error;
    }
  }

  /**
   * 移除守护者（完整流程）
   */
  public async removeGuardian(
    accountAddress: string,
    guardianAddress: string,
    eoaWallet: ethers.Wallet | ethers.HDNodeWallet
  ): Promise<{ txHash: string }> {
    try {
      console.log('开始移除守护者...');
      console.log('账户地址:', accountAddress);
      console.log('守护者地址:', guardianAddress);

      const { userOp, userOpHash } = await this.buildRemoveGuardianUserOp(
        accountAddress,
        guardianAddress
      );

      const signature = await eoaWallet.signMessage(ethers.getBytes(userOpHash));
      userOp.signature = signature;

      const result = await this.submitGuardianUserOp(userOp);
      console.log('✅ 守护者移除成功, 交易:', result.txHash);

      return result;
    } catch (error: any) {
      console.error('移除守护者失败:', error);
      throw error;
    }
  }

  /**
   * 设置恢复阈值 - 构建 UserOp
   */
  public async buildSetThresholdUserOp(
    accountAddress: string,
    newThreshold: number
  ): Promise<{ userOp: UserOperation; userOpHash: string }> {
    try {
      const response = await fetch(
        buildERC4337Url('buildSetThreshold'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountAddress,
            newThreshold,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '构建设置阈值UserOp失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('构建设置阈值UserOp失败:', error);
      throw error;
    }
  }

  /**
   * 设置恢复阈值（完整流程）
   */
  public async setRecoveryThreshold(
    accountAddress: string,
    newThreshold: number,
    eoaWallet: ethers.Wallet | ethers.HDNodeWallet
  ): Promise<{ txHash: string }> {
    try {
      console.log('开始设置恢复阈值...');
      console.log('账户地址:', accountAddress);
      console.log('新阈值:', newThreshold);

      // 步骤 1: 构建未签名 UserOp
      const { userOp, userOpHash } = await this.buildSetThresholdUserOp(
        accountAddress,
        newThreshold
      );
      console.log('UserOp已构建, Hash:', userOpHash);

      // 步骤 2: EOA 签名
      const signature = await eoaWallet.signMessage(ethers.getBytes(userOpHash));
      userOp.signature = signature;
      console.log('UserOp已签名');

      // 步骤 3: 提交已签名 UserOp
      const result = await this.submitGuardianUserOp(userOp);
      console.log('✅ 阈值设置成功, 交易:', result.txHash);

      return result;
    } catch (error: any) {
      console.error('设置阈值失败:', error);
      throw error;
    }
  }

  /**
   * 查询守护者列表
   */
  public async getGuardians(accountAddress: string): Promise<GuardianInfo> {
    try {
      const response = await fetch(
        buildERC4337Url('getGuardians').replace(':accountAddress', accountAddress),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '查询守护者失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('查询守护者失败:', error);
      throw error;
    }
  }

  /**
   * 发起恢复 - 构建 UserOp
   */
  public async buildInitiateRecoveryUserOp(
    accountAddress: string,
    guardianAccountAddress: string,
    newOwnerAddress: string
  ): Promise<{ userOp: UserOperation; userOpHash: string }> {
    try {
      const response = await fetch(
        buildERC4337Url('buildInitiateRecovery'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountAddress,
            guardianAccountAddress,
            newOwnerAddress,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '构建发起恢复UserOp失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('构建发起恢复UserOp失败:', error);
      throw error;
    }
  }

  /**
   * 支持恢复 - 构建 UserOp
   */
  public async buildSupportRecoveryUserOp(
    accountAddress: string,
    guardianAccountAddress: string,
    newOwnerAddress: string
  ): Promise<{ userOp: UserOperation; userOpHash: string }> {
    try {
      console.log('========================================');
      console.log('[Guardian Service] buildSupportRecoveryUserOp 被调用');
      console.log('  accountAddress:', accountAddress);
      console.log('  guardianAccountAddress:', guardianAccountAddress);
      console.log('  newOwnerAddress:', newOwnerAddress);
      
      const url = buildERC4337Url('buildSupportRecovery');
      console.log('  请求URL:', url);
      
      const requestBody = {
        accountAddress,
        guardianAccountAddress,
        newOwnerAddress,
      };
      console.log('  请求Body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('  响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('  响应错误:', error);
        throw new Error(error.message || '构建支持恢复UserOp失败');
      }

      const result = await response.json();
      console.log('  响应成功:', result);
      console.log('========================================');
      return result.data;
    } catch (error: any) {
      console.error('========================================');
      console.error('[Guardian Service] 构建支持恢复UserOp失败:', error);
      console.error('========================================');
      throw error;
    }
  }

  /**
   * 取消恢复 - 构建 UserOp
   */
  public async buildCancelRecoveryUserOp(
    accountAddress: string
  ): Promise<{ userOp: UserOperation; userOpHash: string }> {
    try {
      const response = await fetch(buildERC4337Url('buildCancelRecovery'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '构建取消恢复UserOp失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('构建取消恢复UserOp失败:', error);
      throw error;
    }
  }

  /**
   * 提交恢复 UserOp
   */
  public async submitRecoveryUserOp(
    userOp: UserOperation
  ): Promise<{ txHash: string; blockNumber?: number }> {
    try {
      const response = await fetch(
        buildERC4337Url('submitRecoveryUserOp'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userOp,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '提交恢复UserOp失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('提交恢复UserOp失败:', error);
      throw error;
    }
  }

  /**
   * 查询恢复状态
   */
  public async getRecoveryStatus(accountAddress: string): Promise<RecoveryStatus> {
    try {
      const response = await fetch(
        buildERC4337Url('getRecoveryStatus').replace(':accountAddress', accountAddress),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '查询恢复状态失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('查询恢复状态失败:', error);
      throw error;
    }
  }

  /**
   * 查询账户信息（包含Owner）
   */
  public async getAccountInfo(accountAddress: string): Promise<{ owner: string }> {
    try {
      const response = await fetch(
        buildERC4337Url('getAccountInfo').replace(':accountAddress', accountAddress),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '查询账户信息失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('查询账户信息失败:', error);
      throw error;
    }
  }

  public async initiateRecovery(
    accountAddress: string,
    guardianAccountAddress: string,
    newOwnerAddress: string,
    eoaWallet: ethers.Wallet | ethers.HDNodeWallet
  ): Promise<{ txHash: string }> {
    try {
      const { userOp, userOpHash } = await this.buildInitiateRecoveryUserOp(
        accountAddress,
        guardianAccountAddress,
        newOwnerAddress
      );
      const signature = await eoaWallet.signMessage(ethers.getBytes(userOpHash));
      userOp.signature = signature;
      const result = await this.submitRecoveryUserOp(userOp);
      return result;
    } catch (error: any) {
      console.error('发起恢复失败:', error);
      throw error;
    }
  }

  public async supportRecovery(
    accountAddress: string,
    guardianAccountAddress: string,
    newOwnerAddress: string,
    eoaWallet: ethers.Wallet | ethers.HDNodeWallet
  ): Promise<{ txHash: string }> {
    try {
      console.log('========================================');
      console.log('[Guardian Service] supportRecovery 开始');
      console.log('  accountAddress:', accountAddress);
      console.log('  guardianAccountAddress:', guardianAccountAddress);
      console.log('  newOwnerAddress:', newOwnerAddress);
      console.log('========================================');
      
      const { userOp, userOpHash } = await this.buildSupportRecoveryUserOp(
        accountAddress,
        guardianAccountAddress,
        newOwnerAddress
      );
      
      console.log('[Guardian Service] UserOp 构建完成，开始签名...');
      const signature = await eoaWallet.signMessage(ethers.getBytes(userOpHash));
      userOp.signature = signature;
      console.log('[Guardian Service] 签名完成，提交 UserOp...');
      
      const result = await this.submitRecoveryUserOp(userOp);
      console.log('[Guardian Service] ✅ 支持恢复成功:', result);
      return result;
    } catch (error: any) {
      console.error('[Guardian Service] ❌ 支持恢复失败:', error);
      throw error;
    }
  }

  public async cancelRecovery(
    accountAddress: string,
    eoaWallet: ethers.Wallet | ethers.HDNodeWallet
  ): Promise<{ txHash: string }> {
    try {
      const { userOp, userOpHash } = await this.buildCancelRecoveryUserOp(accountAddress);
      const signature = await eoaWallet.signMessage(ethers.getBytes(userOpHash));
      userOp.signature = signature;
      const result = await this.submitRecoveryUserOp(userOp);
      return result;
    } catch (error: any) {
      console.error('取消恢复失败:', error);
      throw error;
    }
  }
}

export const guardianService = new GuardianService();
