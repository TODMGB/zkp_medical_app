/**
 * 用药计划本地存储服务
 * 使用 Capacitor Preferences 存储用药计划数据
 * 支持离线访问和快速加载
 */

import { Preferences } from '@capacitor/preferences';
import type { MedicationPlan } from './medication';
import { MEDICATION_PLAN_KEYS, generateKey } from '@/config/storage.config';

export interface StoredPlanInfo {
  plan_id: string;
  doctor_address: string;
  status: string;
  created_at: string;
  updated_at: string;
  message_id: string; // 关联的 secure-exchange 消息ID
}

class MedicationPlanStorageService {
  /**
   * 保存用药计划到本地
   */
  async savePlan(plan: MedicationPlan, messageId: string): Promise<void> {
    try {
      console.log('💾 保存用药计划到本地:', plan.plan_id);

      // 1. 保存完整的计划数据
      const planKey = this.getPlanKey(plan.plan_id);
      await Preferences.set({
        key: planKey,
        value: JSON.stringify(plan),
      });

      // 2. 更新计划列表索引
      const planList = await this.getPlanList();
      const existingIndex = planList.findIndex(p => p.plan_id === plan.plan_id);
      
      const planInfo: StoredPlanInfo = {
        plan_id: plan.plan_id,
        doctor_address: plan.doctor_address,
        status: plan.status,
        created_at: plan.created_at,
        updated_at: plan.updated_at || plan.created_at,
        message_id: messageId,
      };

      if (existingIndex >= 0) {
        // 更新现有计划
        planList[existingIndex] = planInfo;
      } else {
        // 添加新计划
        planList.push(planInfo);
      }

      await Preferences.set({
        key: MEDICATION_PLAN_KEYS.PLAN_LIST,
        value: JSON.stringify(planList),
      });

      console.log('  ✅ 计划保存成功');
    } catch (error) {
      console.error('❌ 保存计划失败:', error);
      throw error;
    }
  }

  /**
   * 批量保存用药计划
   */
  async savePlans(plans: Array<{ plan: MedicationPlan; messageId: string }>): Promise<void> {
    try {
      console.log('💾 批量保存用药计划:', plans.length, '个');
      
      for (const { plan, messageId } of plans) {
        await this.savePlan(plan, messageId);
      }

      // 更新最后同步时间
      await this.updateLastSyncTime();
      
      console.log('  ✅ 批量保存完成');
    } catch (error) {
      console.error('❌ 批量保存失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个用药计划
   */
  async getPlan(planId: string): Promise<MedicationPlan | null> {
    try {
      const planKey = this.getPlanKey(planId);
      const result = await Preferences.get({ key: planKey });
      
      if (!result.value) {
        return null;
      }

      return JSON.parse(result.value) as MedicationPlan;
    } catch (error) {
      console.error('获取计划失败:', planId, error);
      return null;
    }
  }

  /**
   * 获取所有用药计划
   */
  async getAllPlans(): Promise<MedicationPlan[]> {
    try {
      const planList = await this.getPlanList();
      
      if (planList.length === 0) {
        return [];
      }

      const plans: MedicationPlan[] = [];
      for (const info of planList) {
        const plan = await this.getPlan(info.plan_id);
        if (plan) {
          plans.push(plan);
        }
      }

      // 按创建时间倒序排列（最新的在前）
      plans.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return plans;
    } catch (error) {
      console.error('获取所有计划失败:', error);
      return [];
    }
  }

  /**
   * 获取活动的用药计划（状态为active）
   */
  async getActivePlans(): Promise<MedicationPlan[]> {
    try {
      const allPlans = await this.getAllPlans();
      return allPlans.filter(plan => plan.status === 'active');
    } catch (error) {
      console.error('获取活动计划失败:', error);
      return [];
    }
  }

  /**
   * 删除单个用药计划
   */
  async deletePlan(planId: string): Promise<void> {
    try {
      console.log('🗑️ 删除本地计划:', planId);

      // 1. 删除计划数据
      const planKey = this.getPlanKey(planId);
      await Preferences.remove({ key: planKey });

      // 2. 从列表索引中移除
      const planList = await this.getPlanList();
      const updatedList = planList.filter(p => p.plan_id !== planId);
      
      await Preferences.set({
        key: MEDICATION_PLAN_KEYS.PLAN_LIST,
        value: JSON.stringify(updatedList),
      });

      console.log('  ✅ 计划删除成功');
    } catch (error) {
      console.error('❌ 删除计划失败:', error);
      throw error;
    }
  }

  /**
   * 清空所有用药计划
   */
  async clearAllPlans(): Promise<void> {
    try {
      console.log('🗑️ 清空所有本地计划...');

      const planList = await this.getPlanList();
      
      // 删除所有计划数据
      for (const info of planList) {
        const planKey = this.getPlanKey(info.plan_id);
        await Preferences.remove({ key: planKey });
      }

      // 清空列表索引
      await Preferences.remove({ key: MEDICATION_PLAN_KEYS.PLAN_LIST });
      
      // 清空同步时间
      await Preferences.remove({ key: MEDICATION_PLAN_KEYS.LAST_SYNC });

      console.log('  ✅ 已清空所有计划');
    } catch (error) {
      console.error('❌ 清空计划失败:', error);
      throw error;
    }
  }

  /**
   * 获取计划列表索引
   */
  private async getPlanList(): Promise<StoredPlanInfo[]> {
    try {
      const result = await Preferences.get({ key: MEDICATION_PLAN_KEYS.PLAN_LIST });
      
      if (!result.value) {
        return [];
      }

      return JSON.parse(result.value) as StoredPlanInfo[];
    } catch (error) {
      console.error('获取计划列表失败:', error);
      return [];
    }
  }

  /**
   * 更新最后同步时间
   */
  private async updateLastSyncTime(): Promise<void> {
    try {
      const now = new Date();
      await Preferences.set({
        key: MEDICATION_PLAN_KEYS.LAST_SYNC,
        value: now.toISOString(),
      });
    } catch (error) {
      console.error('更新同步时间失败:', error);
    }
  }

  /**
   * 获取最后同步时间
   */
  async getLastSyncTime(): Promise<string | null> {
    try {
      const result = await Preferences.get({ key: MEDICATION_PLAN_KEYS.LAST_SYNC });
      return result.value;
    } catch (error) {
      console.error('获取同步时间失败:', error);
      return null;
    }
  }

  /**
   * 检查是否需要同步（超过1小时）
   */
  async shouldSync(): Promise<boolean> {
    try {
      const lastSync = await this.getLastSyncTime();
      
      if (!lastSync) {
        return true; // 从未同步过
      }

      const lastSyncTime = new Date(lastSync).getTime();
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      return (now - lastSyncTime) > oneHour;
    } catch (error) {
      console.error('检查同步状态失败:', error);
      return true;
    }
  }

  /**
   * 清理过期计划（状态为completed且超过30天）
   */
  async cleanupExpiredPlans(): Promise<void> {
    try {
      console.log('🧹 清理过期计划...');

      const allPlans = await this.getAllPlans();
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      let cleanedCount = 0;
      for (const plan of allPlans) {
        const planDate = new Date(plan.updated_at || plan.created_at).getTime();
        
        if (plan.status === 'completed' && planDate < thirtyDaysAgo) {
          await this.deletePlan(plan.plan_id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`  ✅ 清理了 ${cleanedCount} 个过期计划`);
      } else {
        console.log('  ℹ️ 没有需要清理的计划');
      }
    } catch (error) {
      console.error('❌ 清理过期计划失败:', error);
    }
  }

  /**
   * 获取存储的键名
   */
  private getPlanKey(planId: string): string {
    return generateKey(MEDICATION_PLAN_KEYS.PLAN_PREFIX, planId);
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    completed: number;
    lastSync: string | null;
  }> {
    try {
      const allPlans = await this.getAllPlans();
      const lastSync = await this.getLastSyncTime();

      return {
        total: allPlans.length,
        active: allPlans.filter(p => p.status === 'active').length,
        completed: allPlans.filter(p => p.status === 'completed').length,
        lastSync,
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return {
        total: 0,
        active: 0,
        completed: 0,
        lastSync: null,
      };
    }
  }
}

export const medicationPlanStorageService = new MedicationPlanStorageService();

