import { Preferences } from '@capacitor/preferences'
import { API_GATEWAY_URL } from '@/config/api.config'
import { authService } from './auth'
import { CHECKIN_KEYS } from '@/config/storage.config'
import {
  weeklyCheckinService,
  type WeeklyOnchainRecord,
  type WeeklyProofResult,
  type WeeklyCheckinData,
} from './weeklyCheckinService'

type IpfsWeeklyPackage = {
  weekKey?: string
  proof?: WeeklyProofResult['proof']
  publicSignals?: string[]
  calldata?: string
  records?: Array<{ timestamp?: number; checkinCommitment?: string }>
  leaves?: string[]
  merkleRoot?: string
  timestamp?: number
  submittedAt?: number
}

class CheckinIpfsRestoreService {
  private getRestoreFlagKey(account: string): string {
    return `checkin_ipfs_restore_done_${account.toLowerCase()}`
  }

  private async upsertWeeklyGroupedCache(weekData: Omit<WeeklyCheckinData, 'records'> & { recordCount: number }): Promise<void> {
    const { value } = await Preferences.get({ key: CHECKIN_KEYS.WEEKLY_GROUPED })
    const existing = value ? JSON.parse(value) : []

    const map = new Map<string, any>()
    if (Array.isArray(existing)) {
      existing.forEach((item: any) => {
        if (item?.weekKey) map.set(String(item.weekKey), item)
      })
    }

    map.set(weekData.weekKey, {
      weekKey: weekData.weekKey,
      startDate: weekData.startDate,
      endDate: weekData.endDate,
      leaves: weekData.leaves,
      stats: weekData.stats,
      recordCount: weekData.recordCount,
      merkleRoot: weekData.merkleRoot,
    })

    await Preferences.set({
      key: CHECKIN_KEYS.WEEKLY_GROUPED,
      value: JSON.stringify(Array.from(map.values())),
    })
  }

  private buildStatsFromTimestamps(timestamps: number[]): WeeklyCheckinData['stats'] {
    const daySet = new Set<string>()
    timestamps.forEach(ts => {
      if (!Number.isFinite(ts)) return
      const day = new Date(ts).toISOString().split('T')[0]
      daySet.add(day)
    })

    const daysCovered = daySet.size
    return {
      totalCount: timestamps.length,
      daysCovered,
      completionRate: Math.round((daysCovered / 7) * 100),
    }
  }

  public async restoreFromChainCids(options?: { maxCids?: number }): Promise<{ restoredWeeks: number; skipped: number }> {
    const token = await authService.getToken()
    if (!token) {
      throw new Error('未登录或缺少 token')
    }

    const userInfo = await authService.getUserInfo()
    const smartAccount = userInfo?.smart_account
    if (smartAccount) {
      const flagKey = this.getRestoreFlagKey(smartAccount)
      const { value } = await Preferences.get({ key: flagKey })
      if (value === '1') {
        return { restoredWeeks: 0, skipped: 0 }
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }

    const cidsResp = await fetch(`${API_GATEWAY_URL}/chain/medication-checkin/cids`, {
      method: 'GET',
      headers,
    })

    if (!cidsResp.ok) {
      throw new Error(`获取 CID 列表失败: HTTP ${cidsResp.status}`)
    }

    const cidsJson = await cidsResp.json()
    const cids: string[] = cidsJson?.data?.cids || []
    const slice = typeof options?.maxCids === 'number' ? cids.slice(-options.maxCids) : cids

    let restoredWeeks = 0
    let skipped = 0

    for (const cid of slice) {
      try {
        const pkgResp = await fetch(`${API_GATEWAY_URL}/chain/medication-checkin/ipfs/${cid}`, {
          method: 'GET',
          headers,
        })

        if (!pkgResp.ok) {
          skipped++
          continue
        }

        const pkgJson = await pkgResp.json()
        const pkg: IpfsWeeklyPackage = pkgJson?.data

        const weekKey = String(pkg?.weekKey || '')
        if (!weekKey) {
          skipped++
          continue
        }

        const createdAt = Number(pkg?.submittedAt || pkg?.timestamp || Date.now())

        const proofResult: WeeklyProofResult = {
          weekKey,
          jobId: `restored-${cid}`,
          status: 'completed',
          createdAt,
          updatedAt: Date.now(),
          proof: pkg?.proof,
          publicSignals: pkg?.publicSignals,
          calldata: pkg?.calldata,
        }

        await weeklyCheckinService.saveWeeklyProofResult(proofResult)

        const onchainRecord: WeeklyOnchainRecord = {
          weekKey,
          ipfsCid: cid,
          txHash: '',
          timestamp: Number(pkg?.timestamp || pkg?.submittedAt || Date.now()),
          status: 'confirmed',
        }

        await weeklyCheckinService.saveWeeklyOnchainRecord(onchainRecord)

        const timestamps = Array.isArray(pkg?.records)
          ? pkg.records.map(r => Number(r?.timestamp || 0)).filter(v => Number.isFinite(v) && v > 0)
          : []

        const stats = this.buildStatsFromTimestamps(timestamps)
        const { startDate, endDate } = weeklyCheckinService.getWeekDateRange(weekKey)

        const leaves = Array.isArray(pkg?.leaves) ? pkg.leaves : []

        await this.upsertWeeklyGroupedCache({
          weekKey,
          startDate,
          endDate,
          leaves,
          merkleRoot: pkg?.merkleRoot,
          stats,
          recordCount: stats.totalCount,
        })

        restoredWeeks++
      } catch (e) {
        skipped++
      }
    }

    if (smartAccount) {
      await Preferences.set({ key: this.getRestoreFlagKey(smartAccount), value: '1' })
    }

    return { restoredWeeks, skipped }
  }
}

export const checkinIpfsRestoreService = new CheckinIpfsRestoreService()
