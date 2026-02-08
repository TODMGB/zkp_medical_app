<template>
  <div class="guardian-recovery-list-page">
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="page-title">恢复请求</h1>
      <button class="refresh-btn" @click="refresh" :disabled="isLoading">
        <RefreshCw class="icon" :class="{ spinning: isLoading }" />
      </button>
    </div>

    <div class="content">
      <!-- 加载中 -->
      <div v-if="isLoading && requests.length === 0" class="loading-state">
        <Loader2 class="spinner" />
        <p>加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="requests.length === 0" class="empty-state">
        <Shield class="empty-icon" />
        <p class="empty-title">暂无恢复请求</p>
        <p class="empty-desc">当有用户请求恢复账号时，您会在这里看到通知</p>
      </div>

      <!-- 请求列表 -->
      <div v-else class="request-list">
        <div
          v-for="request in requests"
          :key="request.session_id"
          class="request-card"
          @click="viewRequest(request)"
        >
          <div class="request-header">
            <div class="request-status" :class="getStatusClass(request)">
              {{ getStatusText(request) }}
            </div>
            <div class="request-time">{{ formatTime(request.created_at) }}</div>
          </div>

          <div class="request-body">
            <div class="request-row">
              <span class="label">账户</span>
              <span class="value mono">{{ shortenAddress(request.old_smart_account) }}</span>
            </div>

            <div class="request-row">
              <span class="label">新Owner</span>
              <span class="value mono">{{ shortenAddress(request.new_owner_address) }}</span>
            </div>

            <div class="request-row">
              <span class="label">阈值</span>
              <span class="value">{{ request.threshold }} 个守护者</span>
            </div>

            <div v-if="request.expires_at" class="request-row">
              <span class="label">过期时间</span>
              <span class="value">{{ formatExpiry(request.expires_at) }}</span>
            </div>
          </div>

          <div class="request-footer">
            <button class="view-btn" @click.stop="viewRequest(request)">
              查看详情
              <ChevronRight class="icon" />
            </button>
          </div>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Loader2, Shield, ChevronRight } from 'lucide-vue-next'
import { aaService } from '@/service/accountAbstraction'

const router = useRouter()

interface RecoveryRequest {
  session_id: string
  old_smart_account: string
  new_owner_address: string
  guardians: string[]
  threshold: number
  status: string
  expires_at: string
  created_at: string
}

const isLoading = ref(false)
const error = ref('')
const requests = ref<RecoveryRequest[]>([])

const goBack = () => {
  router.back()
}

const shortenAddress = (address: string) => {
  if (!address) return ''
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`

  return date.toLocaleDateString('zh-CN')
}

const formatExpiry = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMs < 0) return '已过期'
  if (diffHours < 1) return '即将过期'
  if (diffHours < 24) return `${diffHours}小时后过期`

  const diffDays = Math.floor(diffMs / 86400000)
  return `${diffDays}天后过期`
}

const getStatusClass = (request: RecoveryRequest) => {
  if (request.status === 'COMPLETED') return 'status-completed'
  if (request.status === 'CANCELLED') return 'status-cancelled'
  if (request.expires_at && new Date(request.expires_at) < new Date()) return 'status-expired'
  return 'status-pending'
}

const getStatusText = (request: RecoveryRequest) => {
  if (request.status === 'COMPLETED') return '已完成'
  if (request.status === 'CANCELLED') return '已取消'
  if (request.expires_at && new Date(request.expires_at) < new Date()) return '已过期'
  return '待处理'
}

const viewRequest = (request: RecoveryRequest) => {
  router.push({
    name: 'RecoveryRequest',
    query: {
      old_smart_account: request.old_smart_account,
      new_owner_address: request.new_owner_address,
      session_id: request.session_id,
      expires_at: request.expires_at
    }
  })
}

const refresh = async () => {
  error.value = ''
  isLoading.value = true

  try {
    const mySmartAccount = aaService.getAbstractAccountAddress()
    if (!mySmartAccount) {
      error.value = '请先登录'
      return
    }

    console.log('查询守护者恢复请求:', mySmartAccount)

    // 调用后端API获取与当前用户相关的恢复请求
    const { authService } = await import('@/service/auth')
    const result = await authService.getGuardianRecoveryRequests(mySmartAccount)

    requests.value = result.requests || []
    console.log(`找到 ${requests.value.length} 个恢复请求`)

  } catch (err: any) {
    console.error('获取恢复请求失败:', err)
    error.value = err.message || '获取恢复请求失败'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  refresh()
})
</script>

<style scoped>
.guardian-recovery-list-page {
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

.back-btn,
.refresh-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon {
  width: 22px;
  height: 22px;
  color: #4299e1;
}

.spinning {
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

.page-title {
  flex: 1;
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #2d3748;
}

.content {
  padding: 18px 16px 28px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  color: #4299e1;
  animation: spin 1s linear infinite;
}

.empty-icon {
  width: 80px;
  height: 80px;
  color: #cbd5e0;
  margin-bottom: 20px;
}

.empty-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.empty-desc {
  font-size: 0.95rem;
  color: #718096;
  margin: 0;
}

.request-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.request-card {
  background: white;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s;
}

.request-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.request-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-pending {
  background: rgba(66, 153, 225, 0.1);
  color: #2b6cb0;
}

.status-completed {
  background: rgba(72, 187, 120, 0.1);
  color: #2f855a;
}

.status-cancelled,
.status-expired {
  background: rgba(160, 174, 192, 0.1);
  color: #4a5568;
}

.request-time {
  font-size: 0.85rem;
  color: #718096;
}

.request-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.request-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.label {
  color: #718096;
  font-size: 0.9rem;
}

.value {
  color: #2d3748;
  font-size: 0.9rem;
  text-align: right;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.request-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.view-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: #4299e1;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  padding: 4px 8px;
}

.view-btn .icon {
  width: 18px;
  height: 18px;
}

.error-banner {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #e53e3e;
  padding: 12px;
  border-radius: 12px;
  font-size: 0.95rem;
  margin-top: 14px;
}
</style>
