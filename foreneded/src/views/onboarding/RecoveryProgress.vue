<template>
  <div class="recovery-progress-page">
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="page-title">恢复进度</h1>
      <div class="placeholder"></div>
    </div>

    <div class="content">
      <div v-if="globalError" class="error-banner">{{ globalError }}</div>

      <div v-if="pending" class="card">
        <div class="card-title">恢复会话</div>

        <div class="row">
          <span class="label">旧账号</span>
          <span class="value mono">{{ pending.old_smart_account }}</span>
        </div>

        <div class="row">
          <span class="label">新 Owner</span>
          <span class="value mono">{{ pending.new_owner_address }}</span>
        </div>

        <div class="row" v-if="pending.session_id">
          <span class="label">会话ID</span>
          <span class="value mono">{{ pending.session_id }}</span>
        </div>

        <div class="row" v-if="pending.expires_at">
          <span class="label">过期时间</span>
          <span class="value">{{ formatTime(pending.expires_at) }}</span>
        </div>
      </div>

      <div v-if="status" class="card">
        <div class="card-title">链上状态</div>

        <div class="row">
          <span class="label">当前新Owner</span>
          <span class="value mono">{{ status.newOwner }}</span>
        </div>

        <div class="row">
          <span class="label">支持数</span>
          <span class="value">{{ status.approvalCount }}<span v-if="pending?.threshold"> / {{ pending.threshold }}</span></span>
        </div>

        <div class="row">
          <span class="label">是否已执行</span>
          <span class="value">{{ status.executed ? '是' : '否' }}</span>
        </div>
      </div>

      <div v-if="pending?.session_id" class="card">
        <div class="card-title">提醒守护者</div>

        <div class="row">
          <span class="label">今日剩余次数</span>
          <span class="value">{{ remindDisplay }}</span>
        </div>

        <div v-if="remindCooldownRemainingSeconds > 0" class="row">
          <span class="label">冷却时间</span>
          <span class="value">{{ formatCountdown(remindCooldownRemainingSeconds) }}</span>
        </div>

        <div v-if="remindError" class="error-banner">{{ remindError }}</div>

        <button class="secondary-btn full-width" :disabled="remindDisabled" @click="remind">
          <span v-if="!remindLoading">{{ remindButtonText }}</span>
          <span v-else class="spinner-text">
            <Loader2 class="spinner" />
            发送中...
          </span>
        </button>
      </div>

      <button class="primary-btn" :disabled="isLoading" @click="refresh">
        <span v-if="!isLoading">刷新进度</span>
        <span v-else class="spinner-text">
          <Loader2 class="spinner" />
          刷新中...
        </span>
      </button>

      <button v-if="status?.executed" class="secondary-btn" :disabled="isLoading" @click="finish">
        我已完成恢复，继续登录
      </button>

      <button class="danger-btn" :disabled="isLoading" @click="clearLocal">
        清理本地恢复临时账户
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { ArrowLeft, Loader2 } from 'lucide-vue-next'
import { guardianService, type RecoveryStatus } from '@/service/guardian'
import { aaService } from '@/service/accountAbstraction'
import { biometricService } from '@/service/biometric'
import { uiService } from '@/service/ui'
import { recoveryPendingService, type RecoveryPending } from '@/service/recoveryPending'
import { AUTH_KEYS, WALLET_KEYS } from '@/config/storage.config'
import { authService, type RemindRecoveryResponse } from '@/service/auth'

const router = useRouter()

const isLoading = ref(false)
const globalError = ref('')

const pending = ref<RecoveryPending | null>(null)
const status = ref<RecoveryStatus | null>(null)
const currentOwner = ref('')

const isOwnerRecovered = computed(() => {
  if (!pending.value?.new_owner_address) return false
  if (!currentOwner.value) return false
  return String(currentOwner.value).toLowerCase() === String(pending.value.new_owner_address).toLowerCase()
})

const remindInfo = ref<RemindRecoveryResponse | null>(null)
const remindLoading = ref(false)
const remindError = ref('')
const remindCooldownRemainingSeconds = ref(0)
let remindCooldownTimer: ReturnType<typeof setInterval> | null = null

const canFinish = computed(() => {
  if (!pending.value || !status.value) return false
  if (status.value.executed) {
    if (!pending.value.new_owner_address) return true
    return String(status.value.newOwner || '').toLowerCase() === String(pending.value.new_owner_address || '').toLowerCase()
  }
  return isOwnerRecovered.value
})

const formatTime = (value: string) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('zh-CN')
}

const goBack = () => {
  router.back()
}

const remindDisplay = computed(() => {
  if (!remindInfo.value) return '--'
  return `${remindInfo.value.daily_remaining} / ${remindInfo.value.daily_limit}`
})

const remindDisabled = computed(() => {
  if (!pending.value?.session_id) return true
  if (isLoading.value) return true
  if (remindLoading.value) return true
  if (remindCooldownRemainingSeconds.value > 0) return true
  if (remindInfo.value && remindInfo.value.daily_remaining <= 0) return true
  return false
})

const remindButtonText = computed(() => {
  if (remindCooldownRemainingSeconds.value > 0) {
    return `请等待 ${formatCountdown(remindCooldownRemainingSeconds.value)}`
  }
  if (remindInfo.value && remindInfo.value.daily_remaining <= 0) {
    return '今日次数已用完'
  }
  return '提醒守护者'
})

const formatCountdown = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

const remindCooldownKey = (sessionId: string) => `recovery:remind:cooldown_until:${sessionId}`

const stopRemindTimer = () => {
  if (remindCooldownTimer) {
    clearInterval(remindCooldownTimer)
    remindCooldownTimer = null
  }
}

const syncCooldownFromStorage = (sessionId: string) => {
  stopRemindTimer()
  remindCooldownRemainingSeconds.value = 0

  const untilRaw = localStorage.getItem(remindCooldownKey(sessionId))
  const until = parseInt(String(untilRaw || '0'), 10)
  if (!until || Number.isNaN(until)) return

  const tick = () => {
    const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000))
    remindCooldownRemainingSeconds.value = remaining
    if (remaining <= 0) {
      stopRemindTimer()
      localStorage.removeItem(remindCooldownKey(sessionId))
    }
  }

  tick()
  if (until > Date.now()) {
    remindCooldownTimer = setInterval(tick, 1000)
  }
}

const startCooldown = (sessionId: string, seconds: number) => {
  const until = Date.now() + Math.max(0, seconds) * 1000
  localStorage.setItem(remindCooldownKey(sessionId), String(until))
  syncCooldownFromStorage(sessionId)
}

const loadRemindLimits = async (sessionId: string) => {
  remindError.value = ''
  try {
    const data = await authService.remindRecovery({ session_id: sessionId, dry_run: true })
    remindInfo.value = data

    if (data.cooldown_remaining_seconds > 0) {
      startCooldown(sessionId, data.cooldown_remaining_seconds)
    }
  } catch (e: any) {
    remindError.value = e?.message || '获取提醒次数失败'
  }
}

const refresh = async () => {
  globalError.value = ''
  remindError.value = ''
  isLoading.value = true
  try {
    pending.value = await recoveryPendingService.getPending()
    if (!pending.value?.old_smart_account) {
      globalError.value = '当前没有进行中的恢复记录'
      status.value = null
      currentOwner.value = ''
      remindInfo.value = null
      remindCooldownRemainingSeconds.value = 0
      stopRemindTimer()
      return
    }

    const [statusRes, accountInfo] = await Promise.all([
      guardianService.getRecoveryStatus(pending.value.old_smart_account).catch(() => null),
      guardianService.getAccountInfo(pending.value.old_smart_account).catch(() => null),
    ])

    status.value = statusRes
    currentOwner.value = accountInfo?.owner ? String(accountInfo.owner) : ''

    if (canFinish.value) {
      await recoveryPendingService.clearPending()
    }

    if (pending.value?.session_id) {
      syncCooldownFromStorage(pending.value.session_id)
      await loadRemindLimits(pending.value.session_id)
    }
  } catch (e: any) {
    globalError.value = e?.message || '刷新失败'
  } finally {
    isLoading.value = false
  }
}

const remind = async () => {
  if (!pending.value?.session_id) return
  remindError.value = ''
  remindLoading.value = true
  try {
    const data = await authService.remindRecovery({ session_id: pending.value.session_id })
    remindInfo.value = data

    if (data.cooldown_remaining_seconds > 0) {
      startCooldown(pending.value.session_id, data.cooldown_remaining_seconds)
    } else {
      startCooldown(pending.value.session_id, 300)
    }

    await uiService.toast('已发送提醒', { type: 'success' })
  } catch (e: any) {
    if (e?.code === 'REMIND_COOLDOWN' && e?.cooldown_remaining_seconds) {
      startCooldown(pending.value.session_id, e.cooldown_remaining_seconds)
    }
    remindError.value = e?.message || '提醒失败'
    try {
      await loadRemindLimits(pending.value.session_id)
    } catch (err) {
    }
  } finally {
    remindLoading.value = false
  }
}

const clearLocal = async () => {
  const ok = await uiService.confirm('确定要清理本地恢复临时账户吗？\n\n这会删除本机保存的EOA私钥、抽象账户地址、指纹登录凭据以及恢复进度记录。', {
    title: '确认清理',
    confirmText: '清理',
    cancelText: '取消',
  })
  if (!ok) return

  isLoading.value = true
  try {
    try {
      await biometricService.deleteCredentials()
    } catch (e) {
    }

    aaService.clearLocalSession()

    await Preferences.remove({ key: WALLET_KEYS.EOA_PRIVATE_KEY })
    await Preferences.remove({ key: WALLET_KEYS.ACCOUNT_ADDRESS })
    await Preferences.remove({ key: AUTH_KEYS.JWT_TOKEN })
    await Preferences.remove({ key: AUTH_KEYS.USER_INFO })

    await recoveryPendingService.clearPending()

    await uiService.alert('已清理本地恢复临时账户。', { title: '完成', confirmText: '我知道了' })
    router.replace('/splash')
  } catch (e: any) {
    globalError.value = e?.message || '清理失败'
  } finally {
    isLoading.value = false
  }
}

const finish = async () => {
  if (!canFinish.value) {
    await uiService.toast('恢复尚未完成，请继续等待', { type: 'warning' })
    return
  }

  await recoveryPendingService.clearPending()
  router.replace('/login')
}

onMounted(async () => {
  await refresh()
})

onUnmounted(() => {
  stopRemindTimer()
})
</script>

<style scoped>
.recovery-progress-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #667eea;
  color: white;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon {
  width: 22px;
  height: 22px;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.placeholder {
  width: 40px;
}

.content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  background: white;
  border-radius: 18px;
  padding: 16px;
  border: 1px solid #e2e8f0;
}

.card-title {
  font-weight: 800;
  margin-bottom: 10px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.row:first-of-type {
  margin-top: 0;
}

.label {
  color: #718096;
  font-size: 0.95rem;
}

.value {
  color: #1a202c;
  font-size: 0.95rem;
  text-align: right;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.85rem;
  word-break: break-all;
}

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border-radius: 16px;
  padding: 12px;
  color: #b91c1c;
}

.primary-btn,
.secondary-btn,
.danger-btn {
  border: none;
  border-radius: 18px;
  padding: 16px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

.primary-btn {
  background: #667eea;
  color: white;
}

.secondary-btn {
  background: white;
  color: #667eea;
  border: 2px solid rgba(102, 126, 234, 0.35);
}

.danger-btn {
  background: white;
  color: #dc2626;
  border: 2px solid rgba(220, 38, 38, 0.25);
}

.primary-btn:disabled,
.secondary-btn:disabled,
.danger-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.spinner {
  width: 18px;
  height: 18px;
  animation: spin 1s linear infinite;
}

.full-width {
  width: 100%;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
