/**
 * 成员信息管理服务
 * 用于存储和查询通过安全交换接收到的成员信息
 */

import { Preferences } from '@capacitor/preferences';
import { MEMBER_KEYS, generateKey } from '@/config/storage.config';

// 成员信息接口
export interface MemberInfo {
  smart_account: string;
  username: string;
  roles: string[];
  eoa_address: string;
  phone_number?: string;
  email?: string;
  // 附加信息
  lastUpdated: string; // 最后更新时间
  relationshipId?: string; // 关联的关系ID
  accessGroupName?: string; // 访问组名称
}


class MemberInfoService {
  /**
   * 保存成员信息
   */
  public async saveMemberInfo(memberInfo: MemberInfo): Promise<void> {
    try {
      const key = `${MEMBER_KEYS.INFO_PREFIX}${memberInfo.smart_account}`;
      const data = {
        ...memberInfo,
        lastUpdated: new Date().toISOString(),
      };
      
      await Preferences.set({
        key,
        value: JSON.stringify(data),
      });
      
      console.log('✅ 成员信息已保存:', memberInfo.username, memberInfo.smart_account);
    } catch (error) {
      console.error('保存成员信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取成员信息
   * 支持通过 smart_account 或 eoa_address 查询
   */
  public async getMemberInfo(address: string): Promise<MemberInfo | null> {
    try {
      // 首先尝试用 smart_account 查询
      const key = `${MEMBER_KEYS.INFO_PREFIX}${address}`;
      const { value } = await Preferences.get({ key });
      
      if (value) {
        return JSON.parse(value);
      }
      
      // 如果没找到，尝试在所有成员中查找匹配的 eoa_address
      const allMembers = await this.getAllMemberInfo();
      const found = allMembers.find(member => 
        member.smart_account.toLowerCase() === address.toLowerCase() ||
        member.eoa_address?.toLowerCase() === address.toLowerCase()
      );
      
      if (found) {
        console.log(`✅ 通过地址匹配找到成员信息: ${address} -> ${found.smart_account}`);
        return found;
      }
      
      return null;
    } catch (error) {
      console.error('获取成员信息失败:', error);
      return null;
    }
  }

  /**
   * 获取所有成员信息
   */
  public async getAllMemberInfo(): Promise<MemberInfo[]> {
    try {
      const { keys } = await Preferences.keys();
      const memberInfoKeys = keys.filter(key => key.startsWith(MEMBER_KEYS.INFO_PREFIX));
      
      const members: MemberInfo[] = [];
      for (const key of memberInfoKeys) {
        const { value } = await Preferences.get({ key });
        if (value) {
          members.push(JSON.parse(value));
        }
      }
      
      // 按最后更新时间排序
      members.sort((a, b) => {
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      });
      
      return members;
    } catch (error) {
      console.error('获取所有成员信息失败:', error);
      return [];
    }
  }

  /**
   * 删除成员信息
   */
  public async deleteMemberInfo(smartAccount: string): Promise<void> {
    try {
      const key = `${MEMBER_KEYS.INFO_PREFIX}${smartAccount}`;
      await Preferences.remove({ key });
      console.log('成员信息已删除:', smartAccount);
    } catch (error) {
      console.error('删除成员信息失败:', error);
      throw error;
    }
  }

  /**
   * 批量保存成员信息（从关系列表）
   */
  public async saveMemberInfoBatch(members: MemberInfo[]): Promise<void> {
    try {
      for (const member of members) {
        await this.saveMemberInfo(member);
      }
      console.log(`✅ 批量保存了 ${members.length} 个成员信息`);
    } catch (error) {
      console.error('批量保存成员信息失败:', error);
      throw error;
    }
  }

  /**
   * 更新成员信息（部分更新）
   */
  public async updateMemberInfo(
    smartAccount: string,
    updates: Partial<MemberInfo>
  ): Promise<void> {
    try {
      const existingInfo = await this.getMemberInfo(smartAccount);
      if (!existingInfo) {
        throw new Error('成员信息不存在');
      }

      const updatedInfo = {
        ...existingInfo,
        ...updates,
        lastUpdated: new Date().toISOString(),
      };

      await this.saveMemberInfo(updatedInfo);
      console.log('成员信息已更新:', smartAccount);
    } catch (error) {
      console.error('更新成员信息失败:', error);
      throw error;
    }
  }

  /**
   * 清空所有成员信息
   */
  public async clearAllMemberInfo(): Promise<void> {
    try {
      const { keys } = await Preferences.keys();
      const memberInfoKeys = keys.filter(key => key.startsWith(MEMBER_KEYS.INFO_PREFIX));
      
      for (const key of memberInfoKeys) {
        await Preferences.remove({ key });
      }
      
      console.log('所有成员信息已清空');
    } catch (error) {
      console.error('清空成员信息失败:', error);
      throw error;
    }
  }

  /**
   * 根据角色筛选成员
   */
  public async getMembersByRole(role: string): Promise<MemberInfo[]> {
    try {
      const allMembers = await this.getAllMemberInfo();
      return allMembers.filter(member => member.roles.includes(role));
    } catch (error) {
      console.error('按角色筛选成员失败:', error);
      return [];
    }
  }

  /**
   * 打印所有已存储的成员信息（调试用）
   */
  public async debugPrintAllMembers(): Promise<void> {
    try {
      const allMembers = await this.getAllMemberInfo();
      console.log('=== 📋 已存储的成员信息列表 ===');
      console.log(`总数: ${allMembers.length} 个`);
      allMembers.forEach((member, index) => {
        console.log(`\n[${index + 1}] ${member.username}`);
        console.log(`  Smart Account: ${member.smart_account}`);
        console.log(`  EOA Address: ${member.eoa_address}`);
        console.log(`  角色: ${member.roles.join(', ')}`);
        console.log(`  最后更新: ${member.lastUpdated}`);
      });
      console.log('================================\n');
    } catch (error) {
      console.error('打印成员信息失败:', error);
    }
  }
}

export const memberInfoService = new MemberInfoService();

