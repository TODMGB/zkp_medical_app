/**
 * 成员备注服务
 * 本地存储成员备注信息
 */

import { Preferences } from '@capacitor/preferences';
import { MEMBER_KEYS } from '@/config/storage.config';

export interface MemberRemark {
  memberAddress: string;  // 成员的地址
  remark: string;         // 备注内容
  updatedAt: string;      // 更新时间
}

class MemberRemarkService {
  /**
   * 获取所有备注
   */
  private async getAllRemarks(): Promise<Record<string, MemberRemark>> {
    try {
      const { value } = await Preferences.get({ key: MEMBER_KEYS.REMARKS });
      if (value) {
        return JSON.parse(value);
      }
      return {};
    } catch (error) {
      console.error('获取备注失败:', error);
      return {};
    }
  }

  /**
   * 保存所有备注
   */
  private async saveAllRemarks(remarks: Record<string, MemberRemark>): Promise<void> {
    try {
      await Preferences.set({
        key: MEMBER_KEYS.REMARKS,
        value: JSON.stringify(remarks)
      });
    } catch (error) {
      console.error('保存备注失败:', error);
      throw error;
    }
  }

  /**
   * 设置成员备注
   */
  public async setRemark(memberAddress: string, remark: string): Promise<void> {
    const remarks = await this.getAllRemarks();
    remarks[memberAddress.toLowerCase()] = {
      memberAddress: memberAddress.toLowerCase(),
      remark: remark.trim(),
      updatedAt: new Date().toISOString()
    };
    await this.saveAllRemarks(remarks);
    console.log('备注已保存:', memberAddress, '->', remark);
  }

  /**
   * 获取成员备注
   */
  public async getRemark(memberAddress: string): Promise<string> {
    const remarks = await this.getAllRemarks();
    const remark = remarks[memberAddress.toLowerCase()];
    return remark ? remark.remark : '';
  }

  /**
   * 删除成员备注
   */
  public async deleteRemark(memberAddress: string): Promise<void> {
    const remarks = await this.getAllRemarks();
    delete remarks[memberAddress.toLowerCase()];
    await this.saveAllRemarks(remarks);
    console.log('备注已删除:', memberAddress);
  }

  /**
   * 批量获取备注
   */
  public async getBatchRemarks(memberAddresses: string[]): Promise<Record<string, string>> {
    const remarks = await this.getAllRemarks();
    const result: Record<string, string> = {};
    
    memberAddresses.forEach(address => {
      const key = address.toLowerCase();
      if (remarks[key]) {
        result[address] = remarks[key].remark;
      }
    });
    
    return result;
  }

  /**
   * 清空所有备注
   */
  public async clearAllRemarks(): Promise<void> {
    await Preferences.remove({ key: MEMBER_KEYS.REMARKS });
    console.log('所有备注已清空');
  }
}

export const memberRemarkService = new MemberRemarkService();

