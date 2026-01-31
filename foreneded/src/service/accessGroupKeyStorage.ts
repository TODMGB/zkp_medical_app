import { Preferences } from '@capacitor/preferences';
import { ACCESS_GROUP_KEYS, generateKey } from '@/config/storage.config';

export interface AccessGroupKeyRecord {
  group_id: string;
  key_version: number;
  group_key: string;
  updated_at: string;
}

class AccessGroupKeyStorageService {
  public async getGroupKey(groupId: number | string): Promise<AccessGroupKeyRecord | null> {
    try {
      const key = this.getGroupKeyStorageKey(groupId);
      const result = await Preferences.get({ key });
      if (!result.value) return null;
      return JSON.parse(result.value) as AccessGroupKeyRecord;
    } catch (error) {
      console.error('获取访问组密钥失败:', error);
      return null;
    }
  }

  public async setGroupKey(groupId: number | string, keyVersion: number, groupKey: string): Promise<void> {
    const record: AccessGroupKeyRecord = {
      group_id: String(groupId),
      key_version: keyVersion,
      group_key: groupKey,
      updated_at: new Date().toISOString(),
    };

    const key = this.getGroupKeyStorageKey(groupId);
    await Preferences.set({
      key,
      value: JSON.stringify(record),
    });
  }

  public async clearGroupKey(groupId: number | string): Promise<void> {
    const key = this.getGroupKeyStorageKey(groupId);
    await Preferences.remove({ key });
  }

  public generateGroupKeyHex(byteLength = 32): string {
    const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private getGroupKeyStorageKey(groupId: number | string): string {
    return generateKey(ACCESS_GROUP_KEYS.GROUP_KEY_PREFIX, String(groupId));
  }
}

export const accessGroupKeyStorageService = new AccessGroupKeyStorageService();
