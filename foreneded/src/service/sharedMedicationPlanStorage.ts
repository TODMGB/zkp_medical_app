import { Preferences } from '@capacitor/preferences';
import { MEDICATION_SHARE_KEYS, generateKey } from '@/config/storage.config';

export interface SharedPlanInfo {
  group_id: string;
  plan_id: string;
  owner_address?: string;
  sender_address?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  message_id: string;
}

export interface SharedMedicationPlanRecord {
  group_id: string;
  plan_id: string;
  key_version?: number;
  wrapped_plan_key?: string;
  encrypted_plan_data?: string;
  plan_summary?: any;
  owner_address?: string;
  sender_address?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

class SharedMedicationPlanStorageService {
  public async saveSharedPlan(plan: SharedMedicationPlanRecord, messageId: string): Promise<void> {
    const groupId = String(plan.group_id);
    const planId = String(plan.plan_id);

    const record: SharedMedicationPlanRecord = {
      ...plan,
      group_id: groupId,
      plan_id: planId,
      created_at: plan.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const planKey = this.getSharedPlanKey(groupId, planId);
    await Preferences.set({
      key: planKey,
      value: JSON.stringify(record),
    });

    const list = await this.getSharedPlanList();
    const idx = list.findIndex(p => p.group_id === groupId && p.plan_id === planId);

    const info: SharedPlanInfo = {
      group_id: groupId,
      plan_id: planId,
      owner_address: plan.owner_address,
      sender_address: plan.sender_address,
      status: plan.status,
      created_at: record.created_at,
      updated_at: record.updated_at,
      message_id: messageId,
    };

    if (idx >= 0) {
      list[idx] = info;
    } else {
      list.push(info);
    }

    await Preferences.set({
      key: MEDICATION_SHARE_KEYS.SHARED_PLAN_LIST,
      value: JSON.stringify(list),
    });
  }

  public async getSharedPlan(groupId: number | string, planId: string): Promise<SharedMedicationPlanRecord | null> {
    try {
      const key = this.getSharedPlanKey(String(groupId), planId);
      const result = await Preferences.get({ key });
      if (!result.value) return null;
      return JSON.parse(result.value) as SharedMedicationPlanRecord;
    } catch (error) {
      console.error('获取共享计划失败:', error);
      return null;
    }
  }

  public async getAllSharedPlans(): Promise<SharedMedicationPlanRecord[]> {
    const list = await this.getSharedPlanList();
    if (list.length === 0) return [];

    const result: SharedMedicationPlanRecord[] = [];
    for (const info of list) {
      const plan = await this.getSharedPlan(info.group_id, info.plan_id);
      if (plan) result.push(plan);
    }

    result.sort((a, b) => {
      return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
    });

    return result;
  }

  public async getSharedPlansByGroup(groupId: number | string): Promise<SharedMedicationPlanRecord[]> {
    const all = await this.getAllSharedPlans();
    const id = String(groupId);
    return all.filter(p => String(p.group_id) === id);
  }

  private async getSharedPlanList(): Promise<SharedPlanInfo[]> {
    try {
      const result = await Preferences.get({ key: MEDICATION_SHARE_KEYS.SHARED_PLAN_LIST });
      if (!result.value) return [];
      return JSON.parse(result.value) as SharedPlanInfo[];
    } catch (error) {
      console.error('获取共享计划列表失败:', error);
      return [];
    }
  }

  private getSharedPlanKey(groupId: string, planId: string): string {
    return generateKey(MEDICATION_SHARE_KEYS.SHARED_PLAN_PREFIX, `${groupId}_${planId}`);
  }
}

export const sharedMedicationPlanStorageService = new SharedMedicationPlanStorageService();
