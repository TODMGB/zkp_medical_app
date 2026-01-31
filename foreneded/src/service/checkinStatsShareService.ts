import type { Wallet, HDNodeWallet } from 'ethers';
import { secureExchangeService } from './secureExchange';
import { weeklyCheckinService, type WeeklyCheckinData } from './weeklyCheckinService';

export interface CheckinStatsSharePayload {
  group_id: string;
  week_key: string;
  start_date: string;
  end_date: string;
  stats: WeeklyCheckinData['stats'];
  created_at?: string;
}

class CheckinStatsShareService {
  public async sendWeeklyStatsToRecipient(
    wallet: Wallet | HDNodeWallet,
    recipientAddress: string,
    groupId: number | string,
    weekData: WeeklyCheckinData
  ): Promise<string> {
    const payload: CheckinStatsSharePayload = {
      group_id: String(groupId),
      week_key: weekData.weekKey,
      start_date: weekData.startDate,
      end_date: weekData.endDate,
      stats: weekData.stats,
      created_at: new Date().toISOString(),
    };

    return secureExchangeService.sendEncryptedData(wallet, recipientAddress, payload, 'checkin_stats_share', {
      group_id: String(groupId),
      week_key: weekData.weekKey,
    });
  }

  public async sendRecentWeeklyStatsToRecipient(
    wallet: Wallet | HDNodeWallet,
    recipientAddress: string,
    groupId: number | string,
    weeksBack = 8
  ): Promise<{ sharedCount: number }> {
    const weeks = await weeklyCheckinService.getPreviousWeeksData(weeksBack);
    let sharedCount = 0;
    for (const weekData of weeks) {
      await this.sendWeeklyStatsToRecipient(wallet, recipientAddress, groupId, weekData);
      sharedCount++;
    }

    return { sharedCount };
  }
}

export const checkinStatsShareService = new CheckinStatsShareService();
