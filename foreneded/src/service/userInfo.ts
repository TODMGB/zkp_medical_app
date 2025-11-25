/**
 * 用户信息服务
 * 用于查询用户个人档案信息
 */

import { buildUserInfoUrl } from '../config/api.config';

export interface PersonInfo {
  id: number;
  name: string; // 姓名 (API文档字段名)
  id_card_number: string; // 身份证号（已脱敏）
  phone_number: string; // 手机号
  email: string; // 邮箱
  role?: 'elderly' | 'doctor'; // 角色：elderly(老人) 或 doctor(医生) (可选)
  home_address?: string; // 家庭地址（可选）
  work_unit?: string; // 工作单位（可选）
  created_at?: string; // 创建时间
  updated_at?: string; // 更新时间
}

class UserInfoService {
  /**
   * 查询个人档案
   * @param params 查询参数（身份证号、手机号或邮箱）
   */
  public async lookupPerson(params: {
    id_card_number?: string;
    phone_number?: string;
    email?: string;
  }): Promise<PersonInfo | null> {
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (params.id_card_number) {
        queryParams.append('id_card_number', params.id_card_number);
      }
      if (params.phone_number) {
        queryParams.append('phone_number', params.phone_number);
      }
      if (params.email) {
        queryParams.append('email', params.email);
      }

      // 检查是否至少有一个参数
      if (queryParams.toString() === '') {
        throw new Error('至少需要提供一个查询参数');
      }

      console.log('查询用户信息:', queryParams.toString());

      const response = await fetch(
        `${buildUserInfoUrl('lookup')}?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 404) {
        return null; // 未找到用户
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '查询失败');
      }

      const person = await response.json();
      console.log('查询到用户信息:', person.name, `(${person.role || '未知角色'})`);
      return person;
    } catch (error: any) {
      console.error('查询用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  public async checkHealth(): Promise<boolean> {
    try {
      // 使用userinfo服务的健康检查端点
      const baseUrl = buildUserInfoUrl('lookup').replace('/userinfo/api/persons/lookup', '/userinfo/health');
      const response = await fetch(baseUrl);
      const data = await response.json();
      return data.status === 'UP';
    } catch (error) {
      console.error('用户信息服务健康检查失败:', error);
      return false;
    }
  }
}

export const userInfoService = new UserInfoService();

