import type { Wallet, HDNodeWallet } from 'ethers';
import { relationService } from './relation';
import { secureExchangeService } from './secureExchange';
import { accessGroupKeyStorageService } from './accessGroupKeyStorage';

export interface GroupKeySharePayload {
  group_id: string;
  key_version: number;
  group_key: string;
}

class AccessGroupKeyService {
  public async ensureGroupKey(groupId: number | string): Promise<{ keyVersion: number; groupKey: string }> {
    const existing = await accessGroupKeyStorageService.getGroupKey(groupId);
    if (existing?.group_key && Number.isFinite(existing.key_version) && existing.key_version > 0) {
      return { keyVersion: existing.key_version, groupKey: existing.group_key };
    }

    const keyVersion = 1;
    const groupKey = accessGroupKeyStorageService.generateGroupKeyHex(32);
    await accessGroupKeyStorageService.setGroupKey(groupId, keyVersion, groupKey);
    return { keyVersion, groupKey };
  }

  public async shareGroupKeyToMembers(
    wallet: Wallet | HDNodeWallet,
    groupId: number | string,
    recipients: string[],
    revokedViewerAddress?: string
  ): Promise<{ keyVersion: number; sharedCount: number }> {
    const { keyVersion, groupKey } = await this.ensureGroupKey(groupId);

    const normalizedRecipients = recipients
      .filter(addr => !!addr)
      .filter(addr => addr.toLowerCase() !== (revokedViewerAddress || '').toLowerCase());

    let sharedCount = 0;
    for (const recipient of normalizedRecipients) {
      const payload: GroupKeySharePayload = {
        group_id: String(groupId),
        key_version: keyVersion,
        group_key: groupKey,
      };

      await secureExchangeService.sendEncryptedData(wallet, recipient, payload, 'group_key_share', {
        group_id: String(groupId),
        key_version: keyVersion,
      });
      sharedCount++;
    }

    return { keyVersion, sharedCount };
  }

  public async rotateGroupKeyAndShare(
    wallet: Wallet | HDNodeWallet,
    groupId: number | string,
    revokedViewerAddress?: string
  ): Promise<{ keyVersion: number; sharedCount: number }> {
    const members = await relationService.getGroupMembers(groupId);

    const acceptedMembers = members.filter(m => m.status === 'accepted');
    const recipients = acceptedMembers
      .map(m => m.viewer_address)
      .filter(addr => !!addr)
      .filter(addr => addr.toLowerCase() !== (revokedViewerAddress || '').toLowerCase());

    const existing = await accessGroupKeyStorageService.getGroupKey(groupId);
    const keyVersion = (existing?.key_version || 0) + 1;
    const groupKey = accessGroupKeyStorageService.generateGroupKeyHex(32);
    await accessGroupKeyStorageService.setGroupKey(groupId, keyVersion, groupKey);

    return this.shareGroupKeyToMembers(wallet, groupId, recipients, revokedViewerAddress);
  }
}

export const accessGroupKeyService = new AccessGroupKeyService();
