import { Preferences } from '@capacitor/preferences';
import { MEDICATION_SHARE_KEYS, generateKey } from '@/config/storage.config';

export interface SharedPlanOutboxInfo {
  group_id: string;
  plan_id: string;
  include_details: boolean;
  created_at: string;
  updated_at: string;
}

export interface SharedPlanOutboxRecord {
  group_id: string;
  plan_id: string;
  include_details: boolean;
  plan_summary?: any;
  status?: string;
  created_at: string;
  updated_at: string;
}

class SharedMedicationPlanOutboxStorageService {
  public async saveOutbox(record: SharedPlanOutboxRecord): Promise<void> {
    const groupId = String(record.group_id);
    const planId = String(record.plan_id);

    const saved: SharedPlanOutboxRecord = {
      ...record,
      group_id: groupId,
      plan_id: planId,
      created_at: record.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const key = this.getOutboxKey(groupId, planId);
    await Preferences.set({ key, value: JSON.stringify(saved) });

    const list = await this.getOutboxList();
    const idx = list.findIndex(i => i.group_id === groupId && i.plan_id === planId);

    const info: SharedPlanOutboxInfo = {
      group_id: groupId,
      plan_id: planId,
      include_details: !!saved.include_details,
      created_at: saved.created_at,
      updated_at: saved.updated_at,
    };

    if (idx >= 0) {
      list[idx] = info;
    } else {
      list.push(info);
    }

    await Preferences.set({
      key: MEDICATION_SHARE_KEYS.SHARED_PLAN_OUTBOX_LIST,
      value: JSON.stringify(list),
    });
  }

  public async getOutbox(groupId: number | string, planId: string): Promise<SharedPlanOutboxRecord | null> {
    try {
      const key = this.getOutboxKey(String(groupId), String(planId));
      const result = await Preferences.get({ key });
      if (!result.value) return null;
      return JSON.parse(result.value) as SharedPlanOutboxRecord;
    } catch (error) {
      console.error('获取计划分发记录失败:', error);
      return null;
    }
  }

  public async getOutboxByGroup(groupId: number | string): Promise<SharedPlanOutboxRecord[]> {
    const id = String(groupId);
    const list = await this.getOutboxList();
    const filtered = list.filter(i => i.group_id === id);

    const result: SharedPlanOutboxRecord[] = [];
    for (const info of filtered) {
      const rec = await this.getOutbox(info.group_id, info.plan_id);
      if (rec) result.push(rec);
    }

    result.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    return result;
  }

  private async getOutboxList(): Promise<SharedPlanOutboxInfo[]> {
    try {
      const result = await Preferences.get({ key: MEDICATION_SHARE_KEYS.SHARED_PLAN_OUTBOX_LIST });
      if (!result.value) return [];
      return JSON.parse(result.value) as SharedPlanOutboxInfo[];
    } catch (error) {
      console.error('获取计划分发索引失败:', error);
      return [];
    }
  }

  private getOutboxKey(groupId: string, planId: string): string {
    return generateKey(MEDICATION_SHARE_KEYS.SHARED_PLAN_OUTBOX_PREFIX, `${groupId}_${planId}`);
  }
}

export const sharedMedicationPlanOutboxStorageService = new SharedMedicationPlanOutboxStorageService();
