<template>
  <div class="weekly-summary-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="page-title">每周汇总打卡</h1>
      <div class="header-actions">
        <button class="refresh-btn" @click="refreshData" :disabled="loading">
          {{ loading ? '加载中...' : '刷新' }}
        </button>
      </div>
    </div>

    <!-- 本周信息卡片 -->
    <div class="this-week-section">
      <div class="week-header">
        <h2 class="week-title">{{ thisWeekTitle }}</h2>
        <span class="week-range">{{ thisWeekRange }}</span>
      </div>

      <!-- 本周统计 -->
      <div class="week-stats">
        <div class="stat-item">
          <div class="stat-value">{{ thisWeekData?.stats.totalCount || 0 }}</div>
          <div class="stat-label">打卡次数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ thisWeekData?.stats.daysCovered || 0 }}/7</div>
          <div class="stat-label">覆盖天数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ thisWeekData?.stats.completionRate || 0 }}%</div>
          <div class="stat-label">完成率</div>
        </div>
      </div>

      <!-- 本周打卡列表 -->
      <div v-if="thisWeekData && thisWeekData.records.length > 0" class="week-records">
        <h3 class="records-title">本周打卡记录</h3>
        <div class="records-list">
          <div
            v-for="record in thisWeekData.records"
            :key="record.id"
            class="record-item"
          >
            <div class="record-time">{{ formatTime(record.timestamp) }}</div>
            <div class="record-info">
              <div class="record-name">{{ record.medication_name }}</div>
              <div class="record-dosage">{{ record.dosage }}</div>
            </div>
            <div class="record-date">{{ formatDate(record.timestamp) }}</div>
          </div>
        </div>
      </div>

      <!-- 生成证明区域 -->
      <div class="proof-section">
        <div v-if="!thisWeekProofStatus" class="proof-action">
          <button
            v-if="!thisWeekProofStatus"
            class="generate-btn"
            @click="() => generateWeeklyProof()"
            :disabled="!thisWeekData || thisWeekData.records.length === 0 || proofGenerating"
          >
            {{ proofGenerating ? '生成中...' : '生成周总结证明' }}
          </button>
          <p class="proof-hint">
            {{ thisWeekData && thisWeekData.records.length > 0 
              ? '点击生成本周的ZKP证明' 
              : '本周暂无打卡记录' }}
          </p>
        </div>

        <div v-else class="proof-status">
          <div class="status-badge" :class="thisWeekProofStatus.status">
            {{ getStatusLabel(thisWeekProofStatus.status) }}
          </div>
          <div v-if="thisWeekProofStatus.status === 'completed'" class="proof-result">
            <p class="result-text">✅ 证明生成成功</p>
            <div class="result-actions">
              <button class="action-btn" @click="() => copyCalldata()">复制 Calldata</button>
              <button class="action-btn" @click="() => viewProofDetail()">查看详情</button>
            </div>
          </div>
          <div v-else-if="thisWeekProofStatus.status === 'failed'" class="proof-error">
            <p class="error-text">❌ {{ thisWeekProofStatus.error || '证明生成失败' }}</p>
            <button class="retry-btn" @click="() => generateWeeklyProof()">重试</button>
          </div>
          <div v-else class="proof-polling">
            <div class="spinner"></div>
            <p>证明生成中，请稍候...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 历史周卡片列表 -->
    <div class="previous-weeks-section">
      <h2 class="section-title">历史周汇总</h2>
      <div class="weeks-list">
        <div
          v-for="weekData in previousWeeksData"
          :key="weekData.weekKey"
          class="week-card"
        >
          <div class="card-header">
            <div class="card-title">{{ weekData.weekKey }}</div>
            <div class="card-range">{{ weekData.startDate }} ~ {{ weekData.endDate }}</div>
          </div>

          <div class="card-stats">
            <span class="stat-badge">{{ weekData.stats.totalCount }} 次打卡</span>
            <span class="stat-badge">{{ weekData.stats.daysCovered }}/7 天</span>
            <span class="stat-badge">{{ weekData.stats.completionRate }}%</span>
          </div>

          <div class="card-actions">
            <button
              v-if="!getWeekProofStatus(weekData.weekKey)"
              class="action-btn secondary"
              @click="() => generateWeeklyProof(weekData.weekKey)"
              :disabled="weekData.stats.totalCount === 0"
            >
              补打卡
            </button>
            <button
              v-else
              class="action-btn secondary"
              @click="() => viewProofDetail(weekData.weekKey)"
            >
              查看证明
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部导航栏 -->
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import BottomNav from '@/components/BottomNav.vue'
import { weeklyCheckinService, type WeeklyCheckinData, type WeeklyProofResult } from '@/service/weeklyCheckinService'
import { API_GATEWAY_URL } from '@/config/api.config'
import { authService } from '@/service/auth'

const router = useRouter()

// 状态
const loading = ref(false)
const proofGenerating = ref(false)
const thisWeekData = ref<WeeklyCheckinData | null>(null)
const previousWeeksData = ref<WeeklyCheckinData[]>([])
const proofStatusMap = ref<Record<string, WeeklyProofResult>>({})
const thisWeekProofStatus = ref<WeeklyProofResult | null>(null)

// 轮询相关
const pollingIntervals = ref<Record<string, NodeJS.Timeout>>({})

// 计算属性
const thisWeekKey = computed(() => weeklyCheckinService.getISOWeekKey())

const thisWeekTitle = computed(() => {
  const year = new Date().getFullYear()
  const weekNo = thisWeekKey.value.split('-W')[1]
  return `${year} 年第 ${weekNo} 周`
})

const thisWeekRange = computed(() => {
  if (!thisWeekData.value) return ''
  return `${thisWeekData.value.startDate} ~ ${thisWeekData.value.endDate}`
})

// 方法
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toISOString().split('T')[0]
}

const goBack = () => {
  router.back()
}

const refreshData = async () => {
  loading.value = true
  try {
    thisWeekData.value = await weeklyCheckinService.getThisWeekData()
    previousWeeksData.value = await weeklyCheckinService.getPreviousWeeksData(4)
    proofStatusMap.value = await weeklyCheckinService.getAllProofStatus()
    thisWeekProofStatus.value = proofStatusMap.value[thisWeekKey.value] || null
    console.log('✅ 数据已刷新')
  } catch (error) {
    console.error('刷新数据失败:', error)
  } finally {
    loading.value = false
  }
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  }
  return labels[status] || status
}

const getWeekProofStatus = (weekKey: string): WeeklyProofResult | null => {
  return proofStatusMap.value[weekKey] || null
}

const generateWeeklyProof = async (weekKey: string = thisWeekKey.value) => {
  try {
    proofGenerating.value = true

    // 获取该周的数据
    const weekData = weekKey === thisWeekKey.value 
      ? thisWeekData.value 
      : previousWeeksData.value.find(w => w.weekKey === weekKey)

    if (!weekData || weekData.records.length === 0) {
      console.warn('该周暂无打卡记录')
      return
    }

    // 计算 Merkle 根
    const merkleRoot = await weeklyCheckinService.calculateMerkleRoot(weekData.leaves)
    console.log('📊 Merkle 根:', merkleRoot)

    // 获取 JWT Token
    const token = await authService.getToken()

    // 调用后端 API 生成证明
    const response = await fetch(`${API_GATEWAY_URL}/zkp/prove/weekly-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        inputs: {
          merkleRoot,
          leaves: weekData.leaves,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.success && data.jobId) {
      // 保存初始状态
      const proofResult: WeeklyProofResult = {
        weekKey,
        jobId: data.jobId,
        status: 'processing',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await weeklyCheckinService.saveWeeklyProofResult(proofResult)
      proofStatusMap.value[weekKey] = proofResult

      if (weekKey === thisWeekKey.value) {
        thisWeekProofStatus.value = proofResult
      }

      // 开始轮询状态
      pollProofStatus(weekKey, data.jobId)
      console.log('✅ 证明生成任务已启动，jobId:', data.jobId)
    } else {
      throw new Error(data.message || '启动证明生成失败')
    }
  } catch (error: any) {
    console.error('生成周度证明失败:', error)
    const errorMsg = error.message || '生成失败，请重试'
    
    // 保存错误状态
    const proofResult: WeeklyProofResult = {
      weekKey: weekKey || thisWeekKey.value,
      jobId: '',
      status: 'failed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      error: errorMsg,
    }
    
    await weeklyCheckinService.saveWeeklyProofResult(proofResult)
    proofStatusMap.value[weekKey] = proofResult
    
    if (weekKey === thisWeekKey.value) {
      thisWeekProofStatus.value = proofResult
    }
  } finally {
    proofGenerating.value = false
  }
}

const pollProofStatus = (weekKey: string, jobId: string, maxAttempts: number = 120) => {
  let attempts = 0

  const poll = async () => {
    try {
      const token = await authService.getToken()
      const response = await fetch(`${API_GATEWAY_URL}/zkp/proof-status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        const status = data.status

        // 更新状态
        const proofResult: WeeklyProofResult = {
          weekKey,
          jobId,
          status: status as any,
          createdAt: proofStatusMap.value[weekKey]?.createdAt || Date.now(),
          updatedAt: Date.now(),
        }

        // 如果完成，保存完整结果
        if (status === 'completed' && data.data) {
          proofResult.proof = data.data.proof
          proofResult.publicSignals = data.data.publicSignals
          proofResult.calldata = data.data.calldata
        }

        if (status === 'failed') {
          proofResult.error = data.error || '证明生成失败'
        }

        await weeklyCheckinService.saveWeeklyProofResult(proofResult)
        proofStatusMap.value[weekKey] = proofResult

        if (weekKey === thisWeekKey.value) {
          thisWeekProofStatus.value = proofResult
        }

        // 如果完成或失败，停止轮询
        if (status === 'completed' || status === 'failed') {
          clearInterval(pollingIntervals.value[weekKey])
          delete pollingIntervals.value[weekKey]
          console.log(`✅ 证明状态更新: ${status}`)
        }
      }
    } catch (error) {
      console.error('轮询证明状态失败:', error)
    }

    attempts++
    if (attempts >= maxAttempts) {
      clearInterval(pollingIntervals.value[weekKey])
      delete pollingIntervals.value[weekKey]
      console.warn('轮询超时，停止查询')
    }
  }

  // 立即执行一次
  poll()

  // 每 2 秒轮询一次
  pollingIntervals.value[weekKey] = setInterval(poll, 2000)
}

const copyCalldata = async () => {
  if (thisWeekProofStatus.value?.calldata) {
    try {
      await navigator.clipboard.writeText(thisWeekProofStatus.value.calldata)
      console.log('✅ Calldata 已复制到剪贴板')
    } catch (error) {
      console.error('复制失败:', error)
    }
  }
}

const viewProofDetail = (weekKey: string = thisWeekKey.value) => {
  const proofResult = proofStatusMap.value[weekKey]
  if (proofResult) {
    router.push({
      name: 'ProofDetail',
      params: { weekKey },
      query: { jobId: proofResult.jobId },
    })
  }
}

onMounted(async () => {
  await refreshData()
})

// 清理轮询
onBeforeUnmount(() => {
  Object.values(pollingIntervals.value).forEach(interval => clearInterval(interval))
})
</script>

<style scoped>
.weekly-summary-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 80px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.back-btn,
.refresh-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s;
}

.back-btn {
  font-size: 1.5rem;
}

.back-btn:hover,
.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.page-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.this-week-section {
  padding: 20px;
}

.week-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.week-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: white;
  margin: 0;
}

.week-range {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 12px;
}

.week-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.stat-item {
  flex: 1;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.85rem;
  color: #4a5568;
  font-weight: 600;
}

.week-records {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.records-title {
  font-size: 1rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 16px 0;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-radius: 12px;
  border-left: 4px solid #667eea;
}

.record-time {
  font-weight: 700;
  color: #667eea;
  min-width: 50px;
  font-size: 0.9rem;
}

.record-info {
  flex: 1;
}

.record-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #2d3748;
}

.record-dosage {
  font-size: 0.85rem;
  color: #718096;
}

.record-date {
  font-size: 0.85rem;
  color: #a0aec0;
}

.proof-section {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.proof-action {
  text-align: center;
}

.generate-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.proof-hint {
  font-size: 0.9rem;
  color: #718096;
  margin: 12px 0 0 0;
}

.proof-status {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  width: fit-content;
}

.status-badge.processing {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.completed {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.failed {
  background: #fee2e2;
  color: #7f1d1d;
}

.proof-result,
.proof-error {
  padding: 16px;
  border-radius: 12px;
  background: rgba(102, 126, 234, 0.05);
}

.result-text,
.error-text {
  margin: 0 0 12px 0;
  font-weight: 600;
}

.result-text {
  color: #065f46;
}

.error-text {
  color: #7f1d1d;
}

.result-actions,
.proof-error {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.retry-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.retry-btn:hover {
  transform: translateY(-2px);
}

.proof-polling {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.previous-weeks-section {
  padding: 20px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  margin: 0 0 16px 0;
}

.weeks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.week-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s;
}

.week-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.card-header {
  margin-bottom: 12px;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: #667eea;
  margin: 0;
}

.card-range {
  font-size: 0.85rem;
  color: #718096;
}

.card-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.stat-badge {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.action-btn.secondary {
  flex: 1;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.action-btn.secondary:hover:not(:disabled) {
  background: rgba(102, 126, 234, 0.2);
}

.action-btn.secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
