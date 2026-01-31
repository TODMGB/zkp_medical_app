import type { Wallet, HDNodeWallet } from 'ethers';
import { secureExchangeService } from './secureExchange';
import { relationService } from './relation';
import { sharedMedicationPlanOutboxStorageService } from './sharedMedicationPlanOutboxStorage';
import { medicationPlanStorageService } from './medicationPlanStorage';
import { medicationService, type MedicationPlanData, type MedicationPlan } from './medication';
import { planShareService } from './planShareService';
import { accessGroupKeyService } from './accessGroupKeyService';
import { checkinStatsShareService } from './checkinStatsShareService';

export interface SyncRequestPayload {
  group_id: string;
  weeks_back?: number;
  include_plans?: boolean;
  include_stats?: boolean;
  created_at?: string;
}

export interface SyncDonePayload {
  group_id: string;
  plans_shared: number;
  stats_shared: number;
  key_version?: number;
  finished_at: string;
  note?: string;
}

class SyncService {
  public async requestSyncToOwner(
    wallet: Wallet | HDNodeWallet,
    ownerAddress: string,
    groupId: number | string,
    options?: {
      weeksBack?: number;
      includePlans?: boolean;
      includeStats?: boolean;
    }
  ): Promise<string> {
    const payload: SyncRequestPayload = {
      group_id: String(groupId),
      weeks_back: options?.weeksBack ?? 8,
      include_plans: options?.includePlans ?? true,
      include_stats: options?.includeStats ?? true,
      created_at: new Date().toISOString(),
    };

    return secureExchangeService.sendEncryptedData(wallet, ownerAddress, payload, 'sync_request', {
      group_id: String(groupId),
    });
  }

  public async handleSyncRequest(
    wallet: Wallet | HDNodeWallet,
    requesterAddress: string,
    payload: SyncRequestPayload
  ): Promise<{ plansShared: number; statsShared: number; keyVersion?: number }> {
    const groupId = String(payload.group_id);
    const weeksBack = Number(payload.weeks_back ?? 8);
    const includePlans = payload.include_plans !== false;
    const includeStats = payload.include_stats !== false;

    const members = await relationService.getGroupMembers(groupId);
    const ok = members.some(m =>
      String(m.viewer_address || '').toLowerCase() === requesterAddress.toLowerCase() &&
      String(m.status || '').toLowerCase() === 'accepted'
    );
    if (!ok) {
      throw new Error('请求者不在该访问组或未被接受');
    }

    const sharedKeyResult = await accessGroupKeyService.shareGroupKeyToMembers(wallet, groupId, [requesterAddress]);
    const keyVersion = sharedKeyResult.keyVersion;

    let plansShared = 0;
    if (includePlans) {
      const outbox = await sharedMedicationPlanOutboxStorageService.getOutboxByGroup(groupId);
      for (const item of outbox) {
        const plan = await medicationPlanStorageService.getPlan(String(item.plan_id));
        if (!plan) continue;

        const includeDetails = !!item.include_details;
        let planData: MedicationPlanData | null = null;

        if (includeDetails) {
          planData = await this.tryDecryptPlanAsOwner(wallet, plan);
        }

        const result = await planShareService.sharePlanToRecipients(
          wallet,
          plan,
          planData,
          groupId,
          includeDetails && !!planData,
          [requesterAddress],
          false
        );

        plansShared += result.sharedCount;
      }
    }

    let statsShared = 0;
    if (includeStats) {
      const result = await checkinStatsShareService.sendRecentWeeklyStatsToRecipient(wallet, requesterAddress, groupId, weeksBack);
      statsShared += result.sharedCount;
    }

    const donePayload: SyncDonePayload = {
      group_id: groupId,
      plans_shared: plansShared,
      stats_shared: statsShared,
      key_version: keyVersion,
      finished_at: new Date().toISOString(),
      note: 'sync_request 已处理完成',
    };

    await secureExchangeService.sendEncryptedData(wallet, requesterAddress, donePayload, 'sync_done', {
      group_id: groupId,
      plans_shared: plansShared,
      stats_shared: statsShared,
    });

    return { plansShared, statsShared, keyVersion };
  }

  private async tryDecryptPlanAsOwner(wallet: Wallet | HDNodeWallet, plan: MedicationPlan): Promise<MedicationPlanData | null> {
    try {
      const peerAddress = plan.doctor_address || plan.doctor_eoa;
      if (!peerAddress) {
        return null;
      }

      const peerPublicKey = await secureExchangeService.getRecipientPublicKey(peerAddress);
      return await medicationService.decryptPlanData(plan.encrypted_plan_data, wallet.privateKey, peerPublicKey);
    } catch (error) {
      console.warn('同步时解密计划失败（将降级为仅摘要）:', error);
      return null;
    }
  }
}

export const syncService = new SyncService();
