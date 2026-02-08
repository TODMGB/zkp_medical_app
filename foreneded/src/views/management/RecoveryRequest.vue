<template>
  <div class="recovery-request-page">
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="page-title">恢复请求</h1>
      <div class="placeholder"></div>
    </div>

    <div class="content">
      <div class="card">
        <div class="card-title">请求信息</div>

        <div class="row">
          <span class="label">旧账号</span>
          <span class="value mono">{{ oldSmartAccount || '-' }}</span>
        </div>

        <div class="row">
          <span class="label">新Owner</span>
          <span class="value mono">{{ newOwnerAddress || '-' }}</span>
        </div>

        <div class="row" v-if="sessionId">
          <span class="label">会话ID</span>
          <span class="value mono">{{ sessionId }}</span>
        </div>

        <div class="row" v-if="expiresAt">
          <span class="label">过期时间</span>
          <span class="value">{{ expiresAt }}</span>
        </div>
      </div>

      <div class="card" v-if="guardians.length > 0">
        <div class="card-title">守护人</div>

        <div class="row">
          <span class="label">数量</span>
          <span class="value">{{ guardians.length }}</span>
        </div>

        <div class="row" v-if="threshold !== null">
          <span class="label">阈值</span>
          <span class="value">{{ threshold }}</span>
        </div>

        <div class="guardian-list">
          <div v-for="g in guardians" :key="g" class="guardian-item mono">{{ g }}</div>
        </div>
      </div>

      <div class="card" v-if="recoveryStatus">
        <div class="card-title">链上状态</div>

        <div class="row" v-if="currentOwner">
          <span class="label">当前Owner</span>
          <span class="value mono">{{ currentOwner }}</span>
        </div>

        <div class="row">
          <span class="label">当前新Owner</span>
          <span class="value mono">{{ recoveryStatus.newOwner }}</span>
        </div>

        <div class="row">
          <span class="label">支持数</span>
          <span class="value">{{ recoveryStatus.approvalCount }}<span v-if="threshold !== null"> / {{ threshold }}</span></span>
        </div>

        <div class="row">
          <span class="label">是否已执行</span>
          <span class="value">{{ recoveryStatus.executed ? '是' : '否' }}</span>
        </div>
      </div>

      <div v-if="globalError" class="error-banner">{{ globalError }}</div>

      <button class="primary-btn" :disabled="isLoading" @click="initiate">
        <span v-if="!isLoading">发起恢复</span>
        <span v-else class="spinner-text">
          <Loader2 class="spinner" />
          处理中...
        </span>
      </button>

      <button class="secondary-btn" :disabled="isLoading || !canSupport" @click="support">支持恢复</button>

      <button class="ghost-btn" :disabled="isLoading" @click="refresh">刷新链上状态</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { guardianService, type RecoveryStatus } from '@/service/guardian'
import { aaService } from '@/service/accountAbstraction'
import { uiService } from '@/service/ui'
import { ArrowLeft, Loader2 } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const isLoading = ref(false)
const globalError = ref('')

const oldSmartAccount = ref('')
const newOwnerAddress = ref('')
const sessionId = ref('')
const expiresAtRaw = ref('')

const guardians = ref<string[]>([])
const threshold = ref<number | null>(null)
const recoveryStatus = ref<RecoveryStatus | null>(null)
const currentOwner = ref('')

const isRecovered = computed(() => {
  if (!currentOwner.value || !newOwnerAddress.value) return false
  return String(currentOwner.value).toLowerCase() === String(newOwnerAddress.value).toLowerCase()
})

const hasActiveOnChainRecovery = computed(() => {
  const newOwner = String(recoveryStatus.value?.newOwner || '').toLowerCase()
  return Boolean(newOwner && newOwner !== '0x0000000000000000000000000000000000000000')
})

const canSupport = computed(() => {
  if (isRecovered.value) return false
  if (!hasActiveOnChainRecovery.value) return false
  const onChainNewOwner = String(recoveryStatus.value?.newOwner || '').toLowerCase()
  return onChainNewOwner === String(newOwnerAddress.value || '').toLowerCase()
})

const expiresAt = computed(() => {
  if (!expiresAtRaw.value) return ''
  const d = new Date(expiresAtRaw.value)
  if (Number.isNaN(d.getTime())) return expiresAtRaw.value
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
})

const goBack = () => {
  router.back()
}

const loadFromRoute = () => {
  const q = route.query as any
  oldSmartAccount.value = String(q.old_smart_account || q.oldSmartAccount || '')
  newOwnerAddress.value = String(q.new_owner_address || q.newOwnerAddress || '')
  sessionId.value = String(q.session_id || q.sessionId || '')
  expiresAtRaw.value = String(q.expires_at || q.expiresAt || '')

  if (!oldSmartAccount.value || !newOwnerAddress.value) {
    const state = history.state as any
    const d = state?.notification?.data || state?.data
    if (d) {
      oldSmartAccount.value = String(d.old_smart_account || d.oldSmartAccount || oldSmartAccount.value || '')
      newOwnerAddress.value = String(d.new_owner_address || d.newOwnerAddress || newOwnerAddress.value || '')
      sessionId.value = String(d.session_id || d.sessionId || sessionId.value || '')
      expiresAtRaw.value = String(d.expires_at || d.expiresAt || expiresAtRaw.value || '')
    }
  }
}

const refresh = async () => {
  globalError.value = ''
  if (!oldSmartAccount.value) {
    globalError.value = '缺少 old_smart_account'
    return
  }

  isLoading.value = true
  try {
    const [guardianInfo, status, accountInfo] = await Promise.all([
      guardianService.getGuardians(oldSmartAccount.value).catch(() => null),
      guardianService.getRecoveryStatus(oldSmartAccount.value).catch(() => null),
      guardianService.getAccountInfo(oldSmartAccount.value).catch(() => null),
    ])

    if (guardianInfo) {
      guardians.value = guardianInfo.guardians || []
      threshold.value = typeof guardianInfo.threshold === 'number'
        ? guardianInfo.threshold
        : parseInt(String(guardianInfo.threshold || ''), 10)
      if (Number.isNaN(threshold.value as any)) threshold.value = null
    }

    if (status) {
      recoveryStatus.value = status
    }

    if (accountInfo?.owner) {
      currentOwner.value = String(accountInfo.owner)
    }

    if (recoveryStatus.value && threshold.value !== null) {
      if (recoveryStatus.value.executed) {
        uiService.toast('恢复已完成', { type: 'success' })
      } else if (isRecovered.value) {
        uiService.toast('恢复已完成（Owner 已更新）', { type: 'success' })
      } else if (recoveryStatus.value.approvalCount >= (threshold.value || 0) && (threshold.value || 0) > 0) {
        uiService.toast('已达成阈值，等待链上执行', { type: 'success' })
      }
    }
  } catch (e: any) {
    globalError.value = e?.message || '刷新失败'
  } finally {
    isLoading.value = false
  }
}

const initiate = async () => {
  globalError.value = ''

  if (!oldSmartAccount.value || !newOwnerAddress.value) {
    globalError.value = '缺少必要信息'
    return
  }

  if (isRecovered.value) {
    uiService.toast('该恢复已完成，无需再次发起', { type: 'success' })
    return
  }

  const guardianAccountAddress = aaService.getAbstractAccountAddress()
  const eoaWallet = aaService.getEOAWallet()
  if (!guardianAccountAddress || !eoaWallet) {
    globalError.value = '请先登录守护人账号'
    return
  }

  isLoading.value = true
  try {
    await guardianService.initiateRecovery(oldSmartAccount.value, guardianAccountAddress, newOwnerAddress.value, eoaWallet)
    await refresh()
    uiService.toast('已发起恢复', { type: 'success' })
  } catch (e: any) {
    globalError.value = e?.message || '发起失败'
  } finally {
    isLoading.value = false
  }
}

const support = async () => {
  console.log('========================================');
  console.log('[RecoveryRequest] support 函数被调用');
  globalError.value = ''

  if (!oldSmartAccount.value || !newOwnerAddress.value) {
    globalError.value = '缺少必要信息'
    console.error('[RecoveryRequest] 缺少必要信息');
    return
  }

  if (!canSupport.value) {
    if (isRecovered.value) {
      uiService.toast('恢复已完成，无需再次支持', { type: 'success' })
      return
    }
    globalError.value = '链上尚未发起恢复，请先点击“发起恢复”'
    return
  }

  const guardianAccountAddress = aaService.getAbstractAccountAddress()
  const eoaWallet = aaService.getEOAWallet()
  
  console.log('[RecoveryRequest] 参数信息:');
  console.log('  oldSmartAccount:', oldSmartAccount.value);
  console.log('  newOwnerAddress:', newOwnerAddress.value);
  console.log('  guardianAccountAddress:', guardianAccountAddress);
  console.log('  eoaWallet:', eoaWallet ? '已获取' : '未获取');
  
  if (!guardianAccountAddress || !eoaWallet) {
    globalError.value = '请先登录守护人账号'
    console.error('[RecoveryRequest] 未登录守护人账号');
    return
  }

  isLoading.value = true
  console.log('[RecoveryRequest] 开始调用 guardianService.supportRecovery...');
  
  try {
    await guardianService.supportRecovery(oldSmartAccount.value, guardianAccountAddress, newOwnerAddress.value, eoaWallet)
    console.log('[RecoveryRequest] ✅ supportRecovery 调用成功');
    await refresh()
    uiService.toast('已支持恢复', { type: 'success' })
  } catch (e: any) {
    console.error('[RecoveryRequest] ❌ supportRecovery 调用失败:', e);
    globalError.value = e?.message || '支持失败'
  } finally {
    isLoading.value = false
    console.log('========================================');
  }
}

onMounted(async () => {
  loadFromRoute()
  await refresh()
})
</script>

<style scoped>
.recovery-request-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.back-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
}

.icon {
  width: 22px;
  height: 22px;
  color: #4299e1;
}

.page-title {
  flex: 1;
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #2d3748;
}

.placeholder {
  width: 40px;
}

.content {
  padding: 18px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card {
  background: white;
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.card-title {
  font-weight: 800;
  color: #2d3748;
  margin-bottom: 10px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-top: 10px;
}

.row:first-of-type {
  margin-top: 0;
}

.label {
  color: #718096;
  font-size: 0.92rem;
}

.value {
  color: #2d3748;
  font-size: 0.92rem;
  text-align: right;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  word-break: break-all;
}

.guardian-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.guardian-item {
  padding: 10px;
  border-radius: 12px;
  background: #f7fafc;
  color: #2d3748;
  font-size: 0.85rem;
}

.error-banner {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #e53e3e;
  padding: 12px;
  border-radius: 12px;
  font-size: 0.95rem;
}

.primary-btn {
  border: none;
  background: #4299e1;
  color: white;
  font-weight: 700;
  padding: 14px;
  border-radius: 14px;
  cursor: pointer;
}

.primary-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.secondary-btn {
  border: 2px solid rgba(66, 153, 225, 0.35);
  background: white;
  color: #2b6cb0;
  font-weight: 700;
  padding: 12px;
  border-radius: 14px;
  cursor: pointer;
}

.secondary-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.ghost-btn {
  border: none;
  background: transparent;
  color: #4a5568;
  font-weight: 600;
  padding: 10px;
  cursor: pointer;
}

.spinner-text {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 18px;
  height: 18px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
