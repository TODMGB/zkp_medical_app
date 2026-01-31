/**
 * 关系管理服务
 * 处理家人/医生邀请、访问组管理等
 */

import { buildRelationUrl } from '../config/api.config';
import { authService } from './auth';
import { Preferences } from '@capacitor/preferences';

// 访问组接口
export interface AccessGroup {
  id: number | string;  // 后端实际返回数字ID，但也兼容字符串
  group_name: string;
  group_type?: string;
  description?: string;
  owner_address: string;
  created_at: string;
  member_count?: number;
}

// 访问组统计接口
export interface AccessGroupStats {
  id: number | string;  // 后端实际返回数字ID，但也兼容字符串
  group_name: string;
  group_type: string;
  description: string;
  member_count: number;
  created_at: string;
}

// 邀请接口
export interface Invitation {
  id: number;
  token: string;
  access_group_id: number;
  inviter_address: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export interface FriendRequest {
  id: number;
  requester_address: string;
  recipient_address: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message?: string | null;
  created_at: string;
  responded_at?: string | null;
}

// 关系接口
export interface Relationship {
  id: number;
  owner_address: string;
  viewer_address: string;
  access_group_id: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// 我的关系接口 - 作为访问者（例如：医生访问患者）
export interface RelationshipAsViewer {
  id: string;
  relationship_type: 'as_viewer';
  data_owner_address: string; // 数据拥有者地址（被访问者）
  my_address: string; // 我的地址
  access_group_id: number | string;
  access_group_name: string;
  group_type: string;
  status: string;
  permissions?: Record<string, boolean>;
  permission_level?: number;
  joined_at: string;
  last_accessed_at?: string | null;
  description?: string;
}

// 我的关系接口 - 作为数据拥有者（例如：患者被医生访问）
export interface RelationshipAsOwner {
  id: string;
  relationship_type: 'as_owner';
  data_owner_address: string; // 我的地址（数据拥有者）
  visitor_address: string; // 访问者地址
  access_group_id: number | string;
  access_group_name: string;
  group_type: string;
  status: string;
  permissions?: Record<string, boolean>;
  permission_level?: number;
  joined_at: string;
  last_accessed_at?: string | null;
  description?: string;
}

// 关系列表响应接口
export interface MyRelationshipsResponse {
  asViewer: RelationshipAsViewer[]; // 我作为访问者的关系
  asOwner: RelationshipAsOwner[]; // 我作为数据拥有者的关系
  summary: {
    total: number;
    as_viewer_count: number;
    as_owner_count: number;
  };
}

// 兼容旧接口（逐步废弃）
export interface MyRelationship {
  id: string;
  owner_address: string;
  viewer_address: string;
  access_group_id: number | string;
  access_group_name: string;
  group_type: string;
  status: string;
  permissions?: Record<string, boolean>;
  permission_level?: number;
  joined_at: string;
  last_accessed_at?: string | null;
}

class RelationService {
  private readonly USER_INFO_AUTO_SEND_TTL_MS = 24 * 60 * 60 * 1000;

  private getAutoUserInfoSentKey(myAccount: string, peerAddress: string): string {
    return `auto_user_info_sent_${String(myAccount).toLowerCase()}_${String(peerAddress).toLowerCase()}`;
  }

  private async canAutoSendUserInfo(myAccount: string, peerAddress: string): Promise<boolean> {
    const key = this.getAutoUserInfoSentKey(myAccount, peerAddress);
    try {
      const { value } = await Preferences.get({ key });
      if (!value) return true;
      const lastSentAt = Number(value);
      if (!Number.isFinite(lastSentAt) || lastSentAt <= 0) return true;
      return Date.now() - lastSentAt > this.USER_INFO_AUTO_SEND_TTL_MS;
    } catch (e) {
      return true;
    }
  }

  private async markAutoUserInfoSent(myAccount: string, peerAddress: string): Promise<void> {
    const key = this.getAutoUserInfoSentKey(myAccount, peerAddress);
    try {
      await Preferences.set({ key, value: String(Date.now()) });
    } catch (e) {
    }
  }

  /**
   * 获取访问组列表
   */
  public async getAccessGroups(): Promise<AccessGroup[]> {
    try {
      const headers = await authService.getAuthHeader();
      const userInfo = await authService.getUserInfo();
      
      console.log('获取访问组 - 用户信息:', {
        hasUserInfo: !!userInfo,
        smart_account: userInfo?.smart_account
      });
      
      if (!userInfo || !userInfo.smart_account) {
        console.error('❌ 缺少用户标识 (getAccessGroups)');
        throw new Error('缺少用户标识 - 请确保已登录并获取用户信息');
      }

      // 添加 user_smart_account 查询参数
      const baseUrl = buildRelationUrl('listGroups');
      const url = `${baseUrl}?user_smart_account=${encodeURIComponent(userInfo.smart_account)}`;
      console.log('请求URL:', url);
      
      const response = await fetch(
        url,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
      );

      console.log('响应状态:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.log('错误响应:', JSON.stringify(error, null, 2));
        throw new Error(error.message || '获取访问组失败');
      }

      const data = await response.json();
      console.log('成功响应:', JSON.stringify(data, null, 2));
      // 根据API文档，响应格式是 { "data": [...] }
      const result = data.data || data || [];
      console.log('返回的访问组数量:', Array.isArray(result) ? result.length : 0);
      return result;
    } catch (error: any) {
      console.error('获取访问组失败:', error);
      throw error;
    }
  }

  /**
   * 获取访问组详情（含成员统计）
   */
  public async getAccessGroupsStats(): Promise<AccessGroupStats[]> {
    try {
      const headers = await authService.getAuthHeader();
      const userInfo = await authService.getUserInfo();
      
      console.log('获取访问组统计 - 用户信息:', JSON.stringify({
        hasUserInfo: !!userInfo,
        user_id: userInfo?.user_id,
        smart_account: userInfo?.smart_account,
        username: userInfo?.username,
        headers: Object.keys(headers)
      }, null, 2));
      
      if (!userInfo || !userInfo.smart_account) {
        console.error('❌ 缺少用户标识:', {
          hasUserInfo: !!userInfo,
          hasSmartAccount: !!userInfo?.smart_account
        });
        throw new Error('缺少用户标识 - 请确保已登录并获取用户信息');
      }
      
      // 根据测试脚本：在URL中添加user_smart_account查询参数
      const baseUrl = buildRelationUrl('groupsStats');
      console.log('基础URL:', baseUrl);
      console.log('查询参数 user_smart_account:', userInfo.smart_account);
      
      const url = `${baseUrl}?user_smart_account=${encodeURIComponent(userInfo.smart_account)}`;
      console.log('最终请求URL:', url);
      
      const response = await fetch(
        url,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
      );

      console.log('响应状态:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.log('错误响应:', JSON.stringify(error, null, 2));
        throw new Error(error.message || '获取访问组统计失败');
      }

      const data = await response.json();
      console.log('成功响应 - 原始数据:', JSON.stringify(data, null, 2));
      
      // 根据API文档，响应格式是 { "data": [...] }，没有success字段
      // 优先取 data 字段，如果没有就返回整个对象
      const result = data.data || data;
      
      console.log('处理后的结果 - 类型:', Array.isArray(result) ? 'Array' : typeof result);
      console.log('处理后的结果 - 长度:', Array.isArray(result) ? result.length : 'N/A');
      
      // 标准化数据：将 total_member_count/active_member_count 映射为 member_count
      const normalizedResult = Array.isArray(result) ? result.map(group => {
        // 将字符串类型的成员数量转换为数字
        const memberCount = parseInt(group.total_member_count || group.active_member_count || '0', 10);
        return {
          ...group,
          member_count: memberCount  // 添加标准化的 member_count 字段
        };
      }) : result;
      
      if (Array.isArray(normalizedResult) && normalizedResult.length > 0) {
        console.log('标准化后的第一个群组数据:', JSON.stringify(normalizedResult[0], null, 2));
      }
      
      return normalizedResult;
    } catch (error: any) {
      console.error('获取访问组统计失败:', error);
      throw error;
    }
  }

  /**
   * 创建访问组
   */
  public async createAccessGroup(
    groupName: string,
    description?: string,
    ownerAddress?: string
  ): Promise<AccessGroup> {
    try {
      const headers = await authService.getAuthHeader();
      const userInfo = await authService.getUserInfo();
      
      // 如果没有提供ownerAddress，使用当前用户的smart_account
      const finalOwnerAddress = ownerAddress || userInfo?.smart_account;
      
      if (!finalOwnerAddress) {
        throw new Error('缺少用户标识');
      }
      
      const response = await fetch(
        buildRelationUrl('createGroup'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({
            groupName,
            description,
            ownerAddress: finalOwnerAddress,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建访问组失败');
      }

      const result = await response.json();
      console.log('创建访问组响应:', JSON.stringify(result, null, 2));
      // 根据API文档，响应格式是 { "data": {...} }
      return result.data || result;
    } catch (error: any) {
      console.error('创建访问组失败:', error);
      throw error;
    }
  }

  /**
   * 创建邀请
   * @param accessGroupId 访问组ID (数字或字符串)
   */
  public async createInvitation(
    accessGroupId: number | string
  ): Promise<{ token: string }> {
    try {
      const headers = await authService.getAuthHeader();
      
      // 后端通过JWT Token识别用户，不需要额外的用户标识
      const response = await fetch(
        buildRelationUrl('createInvitation'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({
            accessGroupId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建邀请失败');
      }

      const result = await response.json();
      console.log('创建邀请响应:', JSON.stringify(result, null, 2));
      // 根据API文档，响应格式是直接返回 { "token": "...", "expiresAt": "..." }
      return result;
    } catch (error: any) {
      console.error('创建邀请失败:', error);
      throw error;
    }
  }

  /**
   * 创建医院邀请
   */
  public async createHospitalInvitation(
    accessGroupId: number | string,
    hospitalId: string,
    hospitalName: string,
    inviteeAddress: string
  ): Promise<{ token: string }> {
    try {
      const headers = await authService.getAuthHeader();
      
      // 后端通过JWT Token识别用户，不需要额外的用户标识
      const response = await fetch(
        buildRelationUrl('createHospitalInvitation'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({
            accessGroupId,
            hospitalId,
            hospitalName,
            inviteeAddress,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建医院邀请失败');
      }

      const result = await response.json();
      console.log('创建医院邀请响应:', JSON.stringify(result, null, 2));
      // 根据API文档，响应格式应该是直接返回 { "token": "..." }
      return result;
    } catch (error: any) {
      console.error('创建医院邀请失败:', error);
      throw error;
    }
  }

  /**
   * 接受邀请
   * @param token 邀请令牌
   * @param wallet 可选的EOA钱包，用于自动发送用户信息
   * @returns 关系信息（包含owner_address等）
   */
  public async acceptInvitation(
    token: string, 
    wallet?: any
  ): Promise<{ relationship_id: string; owner_address: string; status: string }> {
    try {
      const headers = await authService.getAuthHeader();
      
      // 后端通过JWT Token识别用户
      const response = await fetch(
        buildRelationUrl('acceptInvitation'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({
            token,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '接受邀请失败');
      }

      const result = await response.json();
      console.log('接受邀请成功:', JSON.stringify(result, null, 2));
      
      // 获取关系数据
      const relationshipData = result.data || result;
      
      // 调试日志
      console.log('🔍 检查是否发送用户信息:', JSON.stringify({
        hasWallet: !!wallet,
        walletType: wallet ? typeof wallet : 'undefined',
        walletAddress: wallet?.address || 'N/A',
        hasOwnerAddress: !!relationshipData.owner_address,
        ownerAddress: relationshipData.owner_address,
        relationshipKeys: Object.keys(relationshipData),
        relationshipData: relationshipData
      }, null, 2));
      
      // 如果未提供钱包，尝试从 accountAbstraction 服务获取
      if (!wallet) {
        console.log('⚠️ 未提供钱包，尝试从 accountAbstraction 服务获取...');
        try {
          const { aaService } = await import('./accountAbstraction');
          wallet = aaService.getEOAWallet();
          if (wallet) {
            console.log('✅ 成功从 accountAbstraction 获取钱包:', wallet.address);
          } else {
            console.warn('⚠️ accountAbstraction 服务中也没有钱包，可能用户未登录');
          }
        } catch (error: any) {
          console.error('❌ 获取钱包失败:', error);
        }
      }
      
      // 如果提供了钱包，自动发送用户信息给邀请者
      if (wallet && relationshipData.owner_address) {
        console.log('✅ 条件满足，开始发送用户信息...');
        console.log('  钱包地址:', wallet.address);
        console.log('  接收者地址:', relationshipData.owner_address);
        try {
          await this.sendUserInfoToOwner(wallet, relationshipData.owner_address);
          console.log('✅ 用户信息发送成功');
        } catch (sendError: any) {
          console.error('❌ 发送用户信息失败，但关系已建立:', sendError);
          console.error('错误详情:', sendError.message);
          console.error('错误堆栈:', sendError.stack);
          // 不抛出错误，因为关系已经建立成功
        }
      } else {
        console.warn('⚠️ 跳过发送用户信息:', JSON.stringify({
          hasWallet: !!wallet,
          walletAddress: wallet?.address || 'N/A',
          hasOwnerAddress: !!relationshipData.owner_address,
          ownerAddress: relationshipData.owner_address,
          reason: !wallet ? '未提供wallet且无法从accountAbstraction获取' : '未提供owner_address'
        }, null, 2));
        console.warn('💡 提示: 用户信息将在消息监听服务启动后自动交换');
      }
      
      // 接受邀请后，立即触发一次消息检查，以便接收对方可能已发送的信息
      if (wallet) {
        console.log('🔄 接受邀请后，立即检查是否有待接收的消息...');
        try {
          const { messageListenerService } = await import('./messageListener');
          await messageListenerService.checkMessagesNow(wallet);
          console.log('✅ 消息检查完成');
        } catch (checkError: any) {
          console.warn('⚠️ 立即检查消息失败（不影响关系建立）:', checkError);
          console.warn('   消息将在下次定时检查时处理');
        }
      }
      
      return relationshipData;
    } catch (error: any) {
      console.error('接受邀请失败:', error);
      throw error;
    }
  }

  public async createFriendRequest(recipientAddress: string, message?: string | null): Promise<any> {
    try {
      const headers = await authService.getAuthHeader();

      const response = await fetch(buildRelationUrl('createFriendRequest'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          recipient_address: recipientAddress,
          message: message || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '发送好友申请失败');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error: any) {
      console.error('发送好友申请失败:', error);
      throw error;
    }
  }

  public async getIncomingFriendRequests(status: string = 'pending'): Promise<FriendRequest[]> {
    try {
      const headers = await authService.getAuthHeader();
      const baseUrl = buildRelationUrl('getIncomingFriendRequests');
      const url = `${baseUrl}?status=${encodeURIComponent(status)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '获取收到的好友申请失败');
      }

      const result = await response.json();
      return result.data || result || [];
    } catch (error: any) {
      console.error('获取收到的好友申请失败:', error);
      throw error;
    }
  }

  public async getOutgoingFriendRequests(status: string = 'pending'): Promise<FriendRequest[]> {
    try {
      const headers = await authService.getAuthHeader();
      const baseUrl = buildRelationUrl('getOutgoingFriendRequests');
      const url = `${baseUrl}?status=${encodeURIComponent(status)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '获取发出的好友申请失败');
      }

      const result = await response.json();
      return result.data || result || [];
    } catch (error: any) {
      console.error('获取发出的好友申请失败:', error);
      throw error;
    }
  }

  public async acceptFriendRequest(friendRequestId: number | string): Promise<any> {
    try {
      const headers = await authService.getAuthHeader();

      const response = await fetch(buildRelationUrl('acceptFriendRequest'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          id: friendRequestId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '同意好友申请失败');
      }

      const result = await response.json();
      const friendRequestData = result.data || result;

      // 同意好友后，自动尝试交换用户信息（加密消息）
      try {
        const userInfo = await authService.getUserInfo();
        const myAccount = String(userInfo?.smart_account || '').toLowerCase();
        const requester = String(friendRequestData?.requester_address || '').toLowerCase();
        const recipient = String(friendRequestData?.recipient_address || '').toLowerCase();

        let peerAddress = '';
        if (myAccount && requester && recipient) {
          peerAddress = myAccount === requester ? recipient : requester;
        }

        let wallet = null;
        try {
          const { aaService } = await import('./accountAbstraction');
          wallet = aaService.getEOAWallet();
        } catch (e) {
        }

        if (wallet && peerAddress) {
          await this.sendUserInfoToPeer(wallet, peerAddress);
          try {
            const { messageListenerService } = await import('./messageListener');
            await messageListenerService.checkMessagesNow(wallet);
          } catch (e) {
          }
        }
      } catch (e) {
      }

      return friendRequestData;
    } catch (error: any) {
      console.error('同意好友申请失败:', error);
      throw error;
    }
  }

  private async sendUserInfoToPeer(wallet: any, peerAddress: string): Promise<void> {
    await this.sendUserInfoToOwner(wallet, peerAddress);
  }

  public async rejectFriendRequest(friendRequestId: number | string): Promise<any> {
    try {
      const headers = await authService.getAuthHeader();

      const response = await fetch(buildRelationUrl('rejectFriendRequest'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          id: friendRequestId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '拒绝好友申请失败');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error: any) {
      console.error('拒绝好友申请失败:', error);
      throw error;
    }
  }

  public async cancelFriendRequest(friendRequestId: number | string): Promise<any> {
    try {
      const headers = await authService.getAuthHeader();

      const response = await fetch(buildRelationUrl('cancelFriendRequest'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          id: friendRequestId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '撤回好友申请失败');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error: any) {
      console.error('撤回好友申请失败:', error);
      throw error;
    }
  }

  public async addGroupMember(accessGroupId: number | string, memberAddress: string): Promise<any> {
    try {
      const headers = await authService.getAuthHeader();
      const url = buildRelationUrl('addGroupMember').replace(':accessGroupId', String(accessGroupId));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          member_address: memberAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '添加成员失败');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error: any) {
      console.error('添加成员失败:', error);
      throw error;
    }
  }

  /**
   * 发送用户信息给关系的所有者（邀请者）
   * 在接受邀请后自动调用
   */
  private async sendUserInfoToOwner(wallet: any, ownerAddress: string): Promise<void> {
    try {
      console.log('📤 [自动信息交换] 开始发送用户信息给邀请者...');
      console.log('  目标地址:', ownerAddress);
      console.log('  钱包信息:', wallet ? '有效' : '无效');
      
      // 获取当前用户信息
      console.log('  1️⃣ 获取当前用户信息...');
      const userInfo = await authService.getUserInfo();
      if (!userInfo) {
        throw new Error('无法获取当前用户信息');
      }

      const myAccount = userInfo?.smart_account ? String(userInfo.smart_account) : '';
      if (myAccount) {
        const canSend = await this.canAutoSendUserInfo(myAccount, ownerAddress);
        if (!canSend) {
          console.log('ℹ️ [自动信息交换] 已发送过用户信息，跳过自动发送:', ownerAddress);
          return;
        }
      }
      console.log('  ✅ 用户信息获取成功:', JSON.stringify({
        username: userInfo.username,
        smart_account: userInfo.smart_account,
        roles: userInfo.roles
      }, null, 2));

      // 动态导入secureExchangeService以避免循环依赖
      console.log('  2️⃣ 导入安全交换服务...');
      const { secureExchangeService } = await import('./secureExchange');
      console.log('  ✅ 安全交换服务导入成功');
      
      // 准备要发送的用户信息
      const userInfoData = {
        smart_account: userInfo.smart_account,
        username: userInfo.username,
        roles: userInfo.roles,
        eoa_address: userInfo.eoa_address,
      };
      console.log('  3️⃣ 准备发送的数据:', JSON.stringify(userInfoData, null, 2));

      // 发送加密的用户信息
      console.log('  4️⃣ 调用 sendUserInfo...');
      const messageId = await secureExchangeService.sendUserInfo(
        wallet,
        ownerAddress,
        userInfoData
      );

      if (myAccount) {
        await this.markAutoUserInfoSent(myAccount, ownerAddress);
      }
      
      console.log('✅ [自动信息交换] 用户信息已成功发送给邀请者！');
      console.log('  消息ID:', messageId);
      console.log('  接收者将收到加密的用户信息通知');
    } catch (error: any) {
      console.error('❌ [自动信息交换] 发送用户信息失败:', error);
      console.error('  错误类型:', error.constructor.name);
      console.error('  错误消息:', error.message);
      console.error('  错误堆栈:', error.stack);
      throw error;
    }
  }

  /**
   * 获取访问组成员
   */
  public async getGroupMembers(groupId: number | string): Promise<Relationship[]> {
    try {
      const headers = await authService.getAuthHeader();
      
      // 后端通过JWT Token识别用户
      const url = buildRelationUrl('getGroupMembers').replace(':accessGroupId', String(groupId));
      console.log('获取群组成员 - URL:', url, '- groupId类型:', typeof groupId);
      const response = await fetch(
        url,
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
        throw new Error(error.message || '获取成员失败');
      }

      const data = await response.json();
      console.log('获取成员响应 - 原始数据:', JSON.stringify(data, null, 2));
      console.log('获取成员响应 - data.members:', data.members);
      console.log('获取成员响应 - data.data:', data.data);
      console.log('获取成员响应 - data.data.members:', data.data?.members);
      console.log('获取成员响应 - data数组判断:', Array.isArray(data));
      
      // 根据API实际返回，响应格式可能是：
      // 1. { success: true, data: { members: [...], count: N } }
      // 2. { members: [...] }
      // 3. 直接是数组 [...]
      let members = [];
      if (data.data && data.data.members) {
        // 格式1: { success, data: { members } }
        members = data.data.members;
      } else if (data.members) {
        // 格式2: { members }
        members = data.members;
      } else if (Array.isArray(data)) {
        // 格式3: 直接是数组
        members = data;
      } else if (data.data && Array.isArray(data.data)) {
        // 格式4: { data: [...] }
        members = data.data;
      }
      
      console.log('解析后的成员列表 - 数量:', members.length, '- 内容:', JSON.stringify(members, null, 2));
      return members;
    } catch (error: any) {
      console.error('获取成员失败:', error);
      throw error;
    }
  }

  /**
   * 暂停关系
   */
  public async suspendRelationship(relationshipId: number): Promise<void> {
    try {
      const headers = await authService.getAuthHeader();
      
      // 后端通过JWT Token识别用户
      const url = buildRelationUrl('suspendRelationship').replace(':relationshipId', relationshipId.toString());
      const response = await fetch(
        url,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '暂停关系失败');
      }

      console.log('暂停关系成功');
    } catch (error: any) {
      console.error('暂停关系失败:', error);
      throw error;
    }
  }

  /**
   * 恢复关系
   */
  public async resumeRelationship(relationshipId: number): Promise<void> {
    try {
      const headers = await authService.getAuthHeader();
      
      // 后端通过JWT Token识别用户
      const url = buildRelationUrl('resumeRelationship').replace(':relationshipId', relationshipId.toString());
      const response = await fetch(
        url,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '恢复关系失败');
      }

      console.log('恢复关系成功');
    } catch (error: any) {
      console.error('恢复关系失败:', error);
      throw error;
    }
  }

  /**
   * 撤销关系
   */
  public async revokeRelationship(relationshipId: number): Promise<void> {
    try {
      const headers = await authService.getAuthHeader();
      
      // 后端通过JWT Token识别用户
      const url = buildRelationUrl('revokeRelationship').replace(':relationshipId', relationshipId.toString());
      const response = await fetch(
        url,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '撤销关系失败');
      }

      console.log('撤销关系成功');
    } catch (error: any) {
      console.error('撤销关系失败:', error);
      throw error;
    }
  }

  /**
   * 获取我的邀请（发送和收到的）
   */
  public async getMyInvitations(): Promise<{ sent: Invitation[], received: Invitation[] }> {
    try {
      const headers = await authService.getAuthHeader();
      
      // 后端通过JWT Token识别用户
      const response = await fetch(
        buildRelationUrl('getMyInvitations'),
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
        throw new Error(error.message || '获取邀请列表失败');
      }

      const data = await response.json();
      console.log('获取邀请列表响应:', JSON.stringify(data, null, 2));
      // 兼容多种响应格式
      return data.data || data || { sent: [], received: [] };
    } catch (error: any) {
      console.error('获取邀请列表失败:', error);
      throw error;
    }
  }

  /**
   * 取消邀请
   */
  public async cancelInvitation(token: string): Promise<void> {
    try {
      const headers = await authService.getAuthHeader();
      
      // 后端通过JWT Token识别用户
      const response = await fetch(
        buildRelationUrl('cancelInvitation'),
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({ token }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '取消邀请失败');
      }

      console.log('取消邀请成功');
    } catch (error: any) {
      console.error('取消邀请失败:', error);
      throw error;
    }
  }

  /**
   * 获取我作为访问者的所有关系
   * 用于医生/家属查看自己可以访问的所有患者/老人
   */
  /**
   * 获取我的关系列表（新版接口）
   * 返回结构化数据，区分作为访问者和作为数据拥有者的关系
   */
  public async getMyRelationships(): Promise<MyRelationshipsResponse> {
    try {
      const headers = await authService.getAuthHeader();
      
      console.log('获取我的关系列表（新版接口）...');
      const response = await fetch(
        buildRelationUrl('getMyRelationships'),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
      );

      console.log('响应状态:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.log('错误响应:', JSON.stringify(error, null, 2));
        throw new Error(error.message || '获取关系列表失败');
      }

      const result = await response.json();
      console.log('获取关系响应 - 原始数据:', JSON.stringify(result, null, 2));
      
      // 新版API响应格式: { success: true, data: { asViewer, asOwner, summary } }
      const relationshipsData = result.data as MyRelationshipsResponse;
      
      console.log('解析后的关系列表:');
      console.log('  - 作为访问者:', relationshipsData.asViewer?.length || 0);
      console.log('  - 作为数据拥有者:', relationshipsData.asOwner?.length || 0);
      console.log('  - 总计:', relationshipsData.summary?.total || 0);
      
      return relationshipsData;
    } catch (error: any) {
      console.error('获取关系列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取我的关系列表（兼容旧格式）
   * @deprecated 请使用 getMyRelationships() 获取结构化数据
   */
  public async getMyRelationshipsFlat(): Promise<MyRelationship[]> {
    try {
      const structuredData = await this.getMyRelationships();
      
      // 将结构化数据转换为扁平数组（兼容旧代码）
      const flatList: MyRelationship[] = [];
      
      // 转换 asViewer
      structuredData.asViewer?.forEach(rel => {
        flatList.push({
          id: rel.id,
          owner_address: rel.data_owner_address,
          viewer_address: rel.my_address,
          access_group_id: rel.access_group_id,
          access_group_name: rel.access_group_name,
          group_type: rel.group_type,
          status: rel.status,
          permissions: rel.permissions,
          permission_level: rel.permission_level,
          joined_at: rel.joined_at,
          last_accessed_at: rel.last_accessed_at,
        });
      });
      
      // 转换 asOwner
      structuredData.asOwner?.forEach(rel => {
        flatList.push({
          id: rel.id,
          owner_address: rel.data_owner_address,
          viewer_address: rel.visitor_address,
          access_group_id: rel.access_group_id,
          access_group_name: rel.access_group_name,
          group_type: rel.group_type,
          status: rel.status,
          permissions: rel.permissions,
          permission_level: rel.permission_level,
          joined_at: rel.joined_at,
          last_accessed_at: rel.last_accessed_at,
        });
      });
      
      return flatList;
    } catch (error: any) {
      console.error('获取扁平关系列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有关系
   * @deprecated 该接口在文档中不存在，请使用 getMyRelationships 或 getGroupMembers
   */
  public async getRelationships(): Promise<Relationship[]> {
    console.warn('该方法已过时，请使用 getMyRelationships 或 getGroupMembers');
    return [];
  }
}

export const relationService = new RelationService();
