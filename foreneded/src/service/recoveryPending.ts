import { Preferences } from '@capacitor/preferences'
import { RECOVERY_KEYS } from '@/config/storage.config'

export type RecoveryPending = {
  session_id?: string
  old_smart_account: string
  new_owner_address: string
  expires_at?: string
  guardians?: string[]
  threshold?: number
  created_at?: string
}

class RecoveryPendingService {
  private normalizeAddress(value: any): string {
    return String(value || '').trim().toLowerCase()
  }

  public async setPending(pending: RecoveryPending): Promise<void> {
    const normalized: RecoveryPending = {
      ...pending,
      old_smart_account: this.normalizeAddress(pending.old_smart_account),
      new_owner_address: this.normalizeAddress(pending.new_owner_address),
      session_id: pending.session_id ? String(pending.session_id) : pending.session_id,
      expires_at: pending.expires_at ? String(pending.expires_at) : pending.expires_at,
      created_at: pending.created_at ? String(pending.created_at) : pending.created_at,
      guardians: Array.isArray(pending.guardians) ? pending.guardians.map(a => this.normalizeAddress(a)) : pending.guardians,
      threshold: typeof pending.threshold === 'number' ? pending.threshold : (pending.threshold !== undefined ? Number(pending.threshold) : pending.threshold),
    }

    await Preferences.set({
      key: RECOVERY_KEYS.PENDING,
      value: JSON.stringify(normalized),
    })
  }

  public async getPending(): Promise<RecoveryPending | null> {
    try {
      const { value } = await Preferences.get({ key: RECOVERY_KEYS.PENDING })
      if (!value) return null
      const parsed = JSON.parse(value)
      if (!parsed?.old_smart_account || !parsed?.new_owner_address) return null
      return parsed as RecoveryPending
    } catch (e) {
      return null
    }
  }

  public async clearPending(): Promise<void> {
    await Preferences.remove({ key: RECOVERY_KEYS.PENDING })
  }

  public async isPending(): Promise<boolean> {
    const pending = await this.getPending()
    return !!pending
  }
}

export const recoveryPendingService = new RecoveryPendingService()
