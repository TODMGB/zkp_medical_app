import type { Wallet, HDNodeWallet } from 'ethers';
import type { MedicationPlan, MedicationPlanData } from './medication';
import { relationService } from './relation';
import { secureExchangeService } from './secureExchange';
import { accessGroupKeyService } from './accessGroupKeyService';
import { aesGcmEncryptHexKey, randomHex } from './groupCrypto';
import { sharedMedicationPlanOutboxStorageService } from './sharedMedicationPlanOutboxStorage';

export interface PlanSharePayload {
  group_id: string;
  plan_id: string;
  key_version: number;
  wrapped_plan_key?: string;
  encrypted_plan_data?: string;
  owner_address?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  plan_summary?: {
    start_date?: string;
    end_date?: string | null;
  };
}

class PlanShareService {
  public async sharePlanToRecipients(
    wallet: Wallet | HDNodeWallet,
    plan: MedicationPlan,
    planData: MedicationPlanData | null,
    groupId: number | string,
    includeDetails: boolean,
    recipients: string[],
    shareGroupKey = true
  ): Promise<{ sharedCount: number; keyVersion: number }> {
    const normalizedRecipients = recipients.filter(addr => !!addr);
    if (normalizedRecipients.length === 0) {
      return { sharedCount: 0, keyVersion: 0 };
    }

    const keyVersion = shareGroupKey
      ? (await accessGroupKeyService.shareGroupKeyToMembers(wallet, groupId, normalizedRecipients)).keyVersion
      : (await accessGroupKeyService.ensureGroupKey(groupId)).keyVersion;

    let encryptedPlanData: string | undefined;
    let wrappedPlanKey: string | undefined;

    if (includeDetails) {
      if (!planData) {
        throw new Error('缺少计划明文数据，无法分享完整计划');
      }

      const { groupKey } = await accessGroupKeyService.ensureGroupKey(groupId);
      const planKey = randomHex(32);
      encryptedPlanData = await aesGcmEncryptHexKey(JSON.stringify(planData), planKey);
      wrappedPlanKey = await aesGcmEncryptHexKey(planKey, groupKey);
    }

    let sharedCount = 0;
    for (const recipient of normalizedRecipients) {
      const payload: PlanSharePayload = {
        group_id: String(groupId),
        plan_id: String(plan.plan_id),
        key_version: keyVersion,
        wrapped_plan_key: wrappedPlanKey,
        encrypted_plan_data: encryptedPlanData,
        owner_address: plan.patient_address,
        status: plan.status,
        created_at: plan.created_at,
        updated_at: plan.updated_at || plan.created_at,
        plan_summary: {
          start_date: plan.start_date,
          end_date: plan.end_date,
        },
      };

      await secureExchangeService.sendEncryptedData(wallet, recipient, payload, 'plan_share', {
        group_id: String(groupId),
        plan_id: String(plan.plan_id),
        key_version: keyVersion,
      });
      sharedCount++;
    }

    return { sharedCount, keyVersion };
  }

  public async sharePlanToGroup(
    wallet: Wallet | HDNodeWallet,
    plan: MedicationPlan,
    planData: MedicationPlanData | null,
    groupId: number | string,
    includeDetails = false
  ): Promise<{ sharedCount: number; keyVersion: number }> {
    const members = await relationService.getGroupMembers(groupId);
    const acceptedMembers = members.filter(m => m.status === 'accepted');
    const recipients = acceptedMembers.map(m => m.viewer_address).filter(addr => !!addr);
    const result = await this.sharePlanToRecipients(
      wallet,
      plan,
      planData,
      groupId,
      includeDetails,
      recipients,
      true
    );

    await sharedMedicationPlanOutboxStorageService.saveOutbox({
      group_id: String(groupId),
      plan_id: String(plan.plan_id),
      include_details: !!includeDetails,
      plan_summary: {
        start_date: plan.start_date,
        end_date: plan.end_date,
      },
      status: plan.status,
      created_at: plan.created_at,
      updated_at: plan.updated_at || plan.created_at,
    });

    return result;
  }
}

export const planShareService = new PlanShareService();
