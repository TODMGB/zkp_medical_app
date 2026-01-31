import { Preferences } from '@capacitor/preferences';
import { CHECKIN_SHARE_KEYS, generateKey } from '@/config/storage.config';

export interface SharedCheckinStatsInfo {
  group_id: string;
  week_key: string;
  sender_address?: string;
  created_at: string;
  updated_at: string;
  message_id: string;
}

export interface SharedCheckinStatsRecord {
  group_id: string;
  week_key: string;
  stats: any;
  start_date?: string;
  end_date?: string;
  sender_address?: string;
  created_at: string;
  updated_at: string;
}

class SharedCheckinStatsStorageService {
  public async saveSharedStats(record: SharedCheckinStatsRecord, messageId: string): Promise<void> {
    const groupId = String(record.group_id);
    const weekKey = String(record.week_key);

    const saved: SharedCheckinStatsRecord = {
      ...record,
      group_id: groupId,
      week_key: weekKey,
      created_at: record.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const key = this.getStatsKey(groupId, weekKey);
    await Preferences.set({ key, value: JSON.stringify(saved) });

    const list = await this.getStatsList();
    const idx = list.findIndex(i => i.group_id === groupId && i.week_key === weekKey);

    const info: SharedCheckinStatsInfo = {
      group_id: groupId,
      week_key: weekKey,
      sender_address: record.sender_address,
      created_at: saved.created_at,
      updated_at: saved.updated_at,
      message_id: messageId,
    };

    if (idx >= 0) {
      list[idx] = info;
    } else {
      list.push(info);
    }

    await Preferences.set({
      key: CHECKIN_SHARE_KEYS.SHARED_STATS_LIST,
      value: JSON.stringify(list),
    });
  }

  public async getSharedStats(groupId: number | string, weekKey: string): Promise<SharedCheckinStatsRecord | null> {
    try {
      const key = this.getStatsKey(String(groupId), String(weekKey));
      const result = await Preferences.get({ key });
      if (!result.value) return null;
      return JSON.parse(result.value) as SharedCheckinStatsRecord;
    } catch (error) {
      console.error('获取共享统计失败:', error);
      return null;
    }
  }

  public async getSharedStatsByGroup(groupId: number | string): Promise<SharedCheckinStatsRecord[]> {
    const id = String(groupId);
    const list = await this.getStatsList();
    const filtered = list.filter(i => i.group_id === id);

    const result: SharedCheckinStatsRecord[] = [];
    for (const info of filtered) {
      const rec = await this.getSharedStats(info.group_id, info.week_key);
      if (rec) result.push(rec);
    }

    result.sort((a, b) => String(b.week_key).localeCompare(String(a.week_key)));
    return result;
  }

  private async getStatsList(): Promise<SharedCheckinStatsInfo[]> {
    try {
      const result = await Preferences.get({ key: CHECKIN_SHARE_KEYS.SHARED_STATS_LIST });
      if (!result.value) return [];
      return JSON.parse(result.value) as SharedCheckinStatsInfo[];
    } catch (error) {
      console.error('获取共享统计索引失败:', error);
      return [];
    }
  }

  private getStatsKey(groupId: string, weekKey: string): string {
    return generateKey(CHECKIN_SHARE_KEYS.SHARED_STATS_PREFIX, `${groupId}_${weekKey}`);
  }
}

export const sharedCheckinStatsStorageService = new SharedCheckinStatsStorageService();
