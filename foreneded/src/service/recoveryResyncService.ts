import { Preferences } from '@capacitor/preferences'
import { authService } from './auth'
import { relationService } from './relation'
import { secureExchangeService } from './secureExchange'
import { memberInfoService } from './memberInfo'
import { UserRole } from '@/utils/userRoles'

class RecoveryResyncService {
  private getResyncEnabledFlagKey(account: string): string {
    return `recovery_resync_enabled_${account.toLowerCase()}`
  }

  private getUserInfoFlagKey(account: string): string {
    return `recovery_resync_userinfo_done_${account.toLowerCase()}`
  }

  private getPlanReqFlagKey(account: string): string {
    return `recovery_resync_planreq_done_${account.toLowerCase()}`
  }

  public async resyncAfterRecovery(options?: { force?: boolean; skipMessageCheck?: boolean }): Promise<{ userInfoSent: number; planResendRequestsSent: number }> {
    const userInfo = await authService.getUserInfo()
    const smartAccount = userInfo?.smart_account
    if (!smartAccount) {
      throw new Error('无法获取当前用户 smart_account')
    }

    const force = !!options?.force

    if (!force) {
      try {
        const { value } = await Preferences.get({ key: this.getResyncEnabledFlagKey(smartAccount) })
        if (value !== '1') {
          return { userInfoSent: 0, planResendRequestsSent: 0 }
        }
      } catch (e) {
        return { userInfoSent: 0, planResendRequestsSent: 0 }
      }
    }

    const [{ value: userInfoDone }, { value: planReqDone }] = await Promise.all([
      Preferences.get({ key: this.getUserInfoFlagKey(smartAccount) }),
      Preferences.get({ key: this.getPlanReqFlagKey(smartAccount) }),
    ])

    if (!force && userInfoDone === '1' && planReqDone === '1') {
      return { userInfoSent: 0, planResendRequestsSent: 0 }
    }

    const { aaService } = await import('./accountAbstraction')
    const wallet = aaService.getEOAWallet()
    if (!wallet) {
      throw new Error('无法获取钱包')
    }

    const relationships = await relationService.getMyRelationships()

    const targets = new Set<string>()

    if (Array.isArray(relationships?.asOwner)) {
      relationships.asOwner.forEach(rel => {
        if (String(rel?.status || '').toLowerCase() !== 'accepted') return
        if (!rel?.visitor_address) return
        targets.add(String(rel.visitor_address).toLowerCase())
      })
    }

    if (Array.isArray(relationships?.asViewer)) {
      relationships.asViewer.forEach(rel => {
        if (String(rel?.status || '').toLowerCase() !== 'accepted') return
        if (!rel?.data_owner_address) return
        targets.add(String(rel.data_owner_address).toLowerCase())
      })
    }

    targets.delete(String(smartAccount).toLowerCase())

    const myUserInfoData = {
      smart_account: smartAccount,
      username: userInfo?.username,
      roles: userInfo?.roles || [],
      eoa_address: userInfo?.eoa_address,
    }

    let userInfoSent = 0
    if (force || userInfoDone !== '1') {
      for (const addr of targets) {
        try {
          await secureExchangeService.sendUserInfo(wallet, addr, myUserInfoData)
          userInfoSent++
        } catch (e) {
        }
      }

      if (targets.size === 0 || userInfoSent > 0) {
        await Preferences.set({ key: this.getUserInfoFlagKey(smartAccount), value: '1' })
      }
    }

    if (!options?.skipMessageCheck) {
      try {
        const { messageListenerService } = await import('./messageListener')
        await messageListenerService.checkMessagesNow(wallet)
      } catch (e) {
      }
    }

    let planResendRequestsSent = 0
    if (force || planReqDone !== '1') {
      const members = await memberInfoService.getAllMemberInfo()
      const doctors = members.filter(m => Array.isArray(m.roles) && m.roles.includes(UserRole.DOCTOR) && targets.has(String(m.smart_account).toLowerCase()))

      for (const doctor of doctors) {
        try {
          await secureExchangeService.sendEncryptedData(
            wallet,
            doctor.smart_account,
            {
              patient_address: smartAccount,
              reason: 'social_recovery',
              created_at: new Date().toISOString(),
            },
            'plan_resend_request',
            {
              title: '【补发用药计划请求】',
              patient_address: smartAccount,
              reason: 'social_recovery',
            }
          )
          planResendRequestsSent++
        } catch (e) {
        }
      }

      if (planResendRequestsSent > 0) {
        await Preferences.set({ key: this.getPlanReqFlagKey(smartAccount), value: '1' })
      }
    }

    return { userInfoSent, planResendRequestsSent }
  }
}

export const recoveryResyncService = new RecoveryResyncService()
