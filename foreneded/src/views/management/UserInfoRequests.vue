<template>
  <div class="user-info-requests-page">
    <div class="header">
      <button class="back-btn" @click="goBack">返回</button>
      <h1 class="page-title">信息交换请求</h1>
      <button class="refresh-btn" :disabled="isPulling" @click="pullFromServer">
        {{ isPulling ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <div v-if="isLoading" class="loading">加载中...</div>

    <div v-else class="content">
      <div v-if="requests.length === 0" class="empty">
        暂无待处理请求
      </div>

      <div v-else class="list">
        <div v-for="req in requests" :key="req.message_id" class="card">
          <div class="row">
            <div class="label">来自</div>
            <div class="value mono">{{ req.sender_address }}</div>
          </div>
          <div class="row">
            <div class="label">时间</div>
            <div class="value">{{ formatTime(req.created_at) }}</div>
          </div>

          <div class="actions">
            <button class="btn primary" :disabled="busyId === req.message_id" @click="approve(req)">
              {{ busyId === req.message_id ? '处理中...' : '同意交换' }}
            </button>
            <button class="btn" :disabled="busyId === req.message_id" @click="reject(req)">
              拒绝
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { uiService } from '@/service/ui'
import { authService } from '@/service/auth'
import { secureExchangeService } from '@/service/secureExchange'

const router = useRouter()

const isLoading = ref(true)
const requests = ref<any[]>([])
const busyId = ref<string>('')
const isPulling = ref(false)

const USER_INFO_REQUESTS_KEY = 'user_info_requests'

const loadRequests = async () => {
  isLoading.value = true
  try {
    const { value } = await Preferences.get({ key: USER_INFO_REQUESTS_KEY })
    const parsed = value ? JSON.parse(value) : []
    requests.value = Array.isArray(parsed) ? parsed : []
  } catch (e) {
    requests.value = []
  } finally {
    isLoading.value = false
  }
}

const saveRequests = async (list: any[]) => {
  try {
    await Preferences.set({ key: USER_INFO_REQUESTS_KEY, value: JSON.stringify(list || []) })
  } catch (e) {
  }
}

const removeRequest = async (messageId: string) => {
  const next = requests.value.filter(r => String(r.message_id) !== String(messageId))
  requests.value = next
  await saveRequests(next)
}

const pullFromServer = async () => {
  try {
    isPulling.value = true
    await authService.ensureBackendLoginWithBiometric()

    const pending = await secureExchangeService.getPendingMessages('user_info_request')
    if (!Array.isArray(pending) || pending.length === 0) {
      await loadRequests()
      return
    }

    const current = requests.value.slice()
    const seen = new Set(current.map(r => String(r.message_id)))

    for (const msg of pending) {
      const mid = String(msg.message_id)
      if (!seen.has(mid)) {
        current.unshift({
          message_id: msg.message_id,
          sender_address: msg.sender_address,
          created_at: msg.created_at,
          payload: null,
        })
        seen.add(mid)
      }

      try {
        await secureExchangeService.acknowledgeMessage(mid, '用户信息请求已接收')
      } catch (e) {
      }
    }

    await saveRequests(current)
    requests.value = current
  } catch (error: any) {
    console.error('拉取请求失败:', error)
    uiService.toast(error.message || '刷新失败', { type: 'error' })
  } finally {
    isPulling.value = false
  }
}

const approve = async (req: any) => {
  try {
    busyId.value = String(req.message_id)

    const userInfo = await authService.getUserInfo()
    if (!userInfo?.smart_account) {
      throw new Error('无法获取当前用户信息，请先登录')
    }

    const { aaService } = await import('@/service/accountAbstraction')
    const wallet = aaService.getEOAWallet()
    if (!wallet) {
      throw new Error('无法获取本地钱包')
    }

    await secureExchangeService.approveUserInfo(wallet, String(req.sender_address), {
      smart_account: String(userInfo.smart_account),
      username: String(userInfo.username || ''),
      roles: Array.isArray(userInfo.roles) ? userInfo.roles : [],
      eoa_address: String(userInfo.eoa_address || ''),
    })

    await removeRequest(String(req.message_id))
    uiService.toast('已同意交换并发送信息', { type: 'success' })
  } catch (error: any) {
    console.error('同意交换失败:', error)
    uiService.toast(error.message || '同意失败', { type: 'error' })
  } finally {
    busyId.value = ''
  }
}

const reject = async (req: any) => {
  try {
    busyId.value = String(req.message_id)
    await removeRequest(String(req.message_id))
    uiService.toast('已拒绝', { type: 'success' })
  } catch (error: any) {
    uiService.toast(error.message || '操作失败', { type: 'error' })
  } finally {
    busyId.value = ''
  }
}

const formatTime = (timeStr: string) => {
  const d = new Date(timeStr)
  if (isNaN(d.getTime())) return '-'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  loadRequests()
  pullFromServer()

  try {
    window.addEventListener('user_info_request', loadRequests as any)
  } catch (e) {
  }
})
</script>

<style scoped>
.user-info-requests-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #2d3748;
}

.back-btn {
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 12px;
  height: 36px;
  padding: 0 12px;
}

.header-right {
  width: 60px;
}

.refresh-btn {
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 12px;
  height: 36px;
  padding: 0 12px;
  font-weight: 600;
}

.refresh-btn:disabled {
  opacity: 0.6;
}

.content {
  padding: 16px;
}

.loading,
.empty {
  padding: 40px 16px;
  text-align: center;
  color: #718096;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}

.label {
  width: 46px;
  color: #718096;
  font-size: 0.85rem;
}

.value {
  flex: 1;
  color: #2d3748;
  font-size: 0.9rem;
}

.mono {
  font-family: monospace;
  font-size: 0.82rem;
  word-break: break-all;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.btn {
  border: none;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  background: #edf2f7;
  color: #4a5568;
}

.btn.primary {
  background: #667eea;
  color: white;
}

.btn:disabled {
  opacity: 0.6;
}
</style>
