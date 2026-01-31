<template>
  <div class="weekly-summary-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="page-title">每周汇总打卡</h1>
      <div class="header-actions">
        <button class="refresh-btn" @click="refreshData" :disabled="loading">
          <RefreshCw v-if="!loading" class="icon-small" />
          <Loader2 v-else class="icon-small spinner" />
        </button>
      </div>
    </div>

    <!-- 本周信息卡片 -->
    <div class="this-week-section">
      <div class="week-header">
        <h2 class="week-title">
          <Calendar class="title-icon" />
          {{ thisWeekTitle }}
        </h2>
        <span class="week-range">{{ thisWeekRange }}</span>
      </div>

      <!-- 本周统计 -->
      <div class="week-stats">
        <div class="stat-item">
          <CheckCircle2 class="stat-icon" />
          <div class="stat-value">{{ thisWeekData?.stats.totalCount || 0 }}</div>
          <div class="stat-label">打卡次数</div>
        </div>
        <div class="stat-item">
          <CalendarDays class="stat-icon" />
          <div class="stat-value">{{ thisWeekData?.stats.daysCovered || 0 }}/7</div>
          <div class="stat-label">覆盖天数</div>
        </div>
        <div class="stat-item">
          <TrendingUp class="stat-icon" />
          <div class="stat-value">{{ thisWeekData?.stats.completionRate || 0 }}%</div>
          <div class="stat-label">完成率</div>
        </div>
      </div>

      <!-- 本周打卡列表 -->
      <div v-if="thisWeekData && thisWeekData.records.length > 0" class="week-records">
        <h3 class="records-title">
          <List class="title-icon" />
          本周打卡记录
        </h3>
        <div class="records-list">
          <div
            v-for="record in thisWeekData.records"
            :key="record.id"
            class="record-item"
          >
            <Clock class="record-icon" />
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
            <Shield v-if="!proofGenerating" class="btn-icon" />
            <Loader2 v-else class="btn-icon spinner" />
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
            <p class="result-text">
              <CheckCircle2 class="result-icon" />
              证明生成成功
            </p>
            <div class="result-actions">
              <button class="action-btn" @click="() => copyCalldata()">
                <Copy class="btn-icon" />
                复制 Calldata
              </button>
              <button class="action-btn" @click="() => viewProofDetail()">
                <Eye class="btn-icon" />
                查看详情
              </button>
            </div>
          </div>
          <div v-else-if="thisWeekProofStatus.status === 'failed'" class="proof-error">
            <p class="error-text">
              <XCircle class="error-icon" />
              {{ thisWeekProofStatus.error || '证明生成失败' }}
            </p>
            <button class="retry-btn" @click="() => generateWeeklyProof()">
              <RotateCw class="btn-icon" />
              重试
            </button>
          </div>
          <div v-else class="proof-polling">
            <Loader2 class="polling-spinner" />
            <p>证明生成中，请稍候...</p>
          </div>
        </div>
      </div>

      <!-- 链上记录 -->
      <div v-if="thisWeekOnchainRecord" class="onchain-card">
        <h3>
          <Shield class="title-icon" />
          链上记录
        </h3>
        <div class="onchain-field">
          <span class="field-label">CID</span>
          <div class="field-value">
            <span class="mono">{{ thisWeekOnchainRecord?.ipfsCid }}</span>
            <button class="ghost-btn" @click="() => copyText(thisWeekOnchainRecord?.ipfsCid || '')">
              <Copy class="icon-mini" />
              复制
            </button>
          </div>
        </div>
        <div class="onchain-field">
          <span class="field-label">交易哈希</span>
          <div class="field-value">
            <span class="mono">{{ thisWeekOnchainRecord?.txHash }}</span>
            <button class="ghost-btn" @click="() => copyText(thisWeekOnchainRecord?.txHash || '')">
              <Copy class="icon-mini" />
              复制
            </button>
          </div>
        </div>
        <div class="onchain-field meta">
          <span class="field-label">提交时间</span>
          <span class="field-value">{{ formatDateTime(thisWeekOnchainRecord?.timestamp) }}</span>
        </div>
      </div>
    </div>

    <!-- 历史周卡片列表 -->
    <div class="previous-weeks-section">
      <h2 class="section-title">
        <History class="title-icon" />
        历史周汇总
      </h2>
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
            <span class="stat-badge">
              <Activity class="badge-icon" />
              {{ weekData.stats.totalCount }} 次打卡
            </span>
            <span class="stat-badge">
              <CalendarCheck class="badge-icon" />
              {{ weekData.stats.daysCovered }}/7 天
            </span>
            <span class="stat-badge">
              <Percent class="badge-icon" />
              {{ weekData.stats.completionRate }}%
            </span>
            <span
              class="stat-badge status"
              :class="getOnchainRecord(weekData.weekKey) ? 'success' : 'pending'"
            >
              <Shield class="badge-icon" />
              {{ getOnchainRecord(weekData.weekKey) ? '链上已记录' : '待上链' }}
            </span>
          </div>

          <div class="card-actions">
            <button
              v-if="!getWeekProofStatus(weekData.weekKey)"
              class="action-btn secondary"
              @click="() => generateWeeklyProof(weekData.weekKey)"
              :disabled="weekData.stats.totalCount === 0"
            >
              <Plus class="btn-icon" />
              补生成
            </button>
            <button
              v-else
              class="action-btn secondary"
              @click="() => viewProofDetail(weekData.weekKey)"
            >
              <Eye class="btn-icon" />
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
import { weeklyCheckinService, type WeeklyProofResult, type WeeklyOnchainRecord, type WeeklyCheckinData } from '@/service/weeklyCheckinService'
import { checkinIpfsRestoreService } from '@/service/checkinIpfsRestore'
import type { CheckInRecord } from '@/service/checkinStorage'
import { authService } from '@/service/auth'
import { API_GATEWAY_URL, buildZkpUrl } from '@/config/api.config'
import { notificationService } from '@/service/notification'
import { 
  ArrowLeft, 
  RefreshCw, 
  Loader2, 
  Calendar, 
  CheckCircle2, 
  CalendarDays, 
  TrendingUp, 
  List, 
  Clock, 
  Shield, 
  Copy, 
  Eye, 
  XCircle, 
  RotateCw, 
  History, 
  Activity, 
  CalendarCheck, 
  Percent, 
  Plus 
} from 'lucide-vue-next'

const router = useRouter()

// 状态
const loading = ref(false)
const proofGenerating = ref(false)
const thisWeekData = ref<WeeklyCheckinData | null>(null)
const previousWeeksData = ref<WeeklyCheckinData[]>([])
const proofStatusMap = ref<Record<string, WeeklyProofResult>>({})
const thisWeekProofStatus = ref<WeeklyProofResult | null>(null)
const onchainStatusMap = ref<Record<string, WeeklyOnchainRecord>>({})

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

const thisWeekOnchainRecord = computed(() => {
  return getOnchainRecord(thisWeekKey.value)
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

type DailyCheckinPayload = {
  dayKey: string
  totalCount: number
  checkins: Array<{
    recordId: string
    timestamp: number
    checkinCommitment: string
    userCommitment: string
    medicationCommitment: string
    proof?: any
    publicSignals?: string[]
  }>
}

type WeeklySummaryPayload = {
  weekKey: string
  startDate: string
  endDate: string
  merkleRoot?: string
  leavesCount: number
  stats: WeeklyCheckinData['stats']
}

type SanitizedCheckinRecord = {
  recordId: string
  timestamp: number
  checkinCommitment: string
  userCommitment: string
  medicationCommitment: string
  proof?: any
  publicSignals?: string[]
}

const refreshData = async () => {
  loading.value = true
  try {
    thisWeekData.value = await weeklyCheckinService.getThisWeekData()
    previousWeeksData.value = await weeklyCheckinService.getPreviousWeeksData(4)
    proofStatusMap.value = await weeklyCheckinService.getAllProofStatus()
    thisWeekProofStatus.value = proofStatusMap.value[thisWeekKey.value] || null
    onchainStatusMap.value = await weeklyCheckinService.getAllOnchainStatus()
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

const buildDailyRecordsPayload = (records: CheckInRecord[]): DailyCheckinPayload[] => {
  const grouped = new Map<string, DailyCheckinPayload>()

  records.forEach(record => {
    const dayKey = new Date(record.timestamp).toISOString().split('T')[0]
    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, {
        dayKey,
        totalCount: 0,
        checkins: [],
      })
    }

    grouped.get(dayKey)!.checkins.push({
      recordId: record.id,
      timestamp: record.timestamp,
      checkinCommitment: record.checkin_commitment,
      userCommitment: record.user_id_commitment,
      medicationCommitment: record.medication_commitment,
      proof: record.zkp_proof,
      publicSignals: record.zkp_public_signals,
    })
    grouped.get(dayKey)!.totalCount++
  })

  return Array.from(grouped.values()).sort((a, b) => a.dayKey.localeCompare(b.dayKey))
}

const buildWeeklySummaryPayload = (weekData: WeeklyCheckinData): WeeklySummaryPayload => {
  return {
    weekKey: weekData.weekKey,
    startDate: weekData.startDate,
    endDate: weekData.endDate,
    merkleRoot: weekData.merkleRoot,
    leavesCount: weekData.leaves.length,
    stats: weekData.stats,
  }
}

const sanitizeRecordsForUpload = (records: CheckInRecord[]): SanitizedCheckinRecord[] => {
  return records.map(record => ({
    recordId: record.id,
    timestamp: record.timestamp,
    checkinCommitment: record.checkin_commitment,
    userCommitment: record.user_id_commitment,
    medicationCommitment: record.medication_commitment,
    proof: record.zkp_proof,
    publicSignals: record.zkp_public_signals,
  }))
}

const getOnchainRecord = (weekKey: string): WeeklyOnchainRecord | null => {
  return onchainStatusMap.value[weekKey] || null
}

const formatDateTime = (timestamp?: number) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    console.log('✅ 已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
  }
}

const generateWeeklyProof = async (weekKey: string = thisWeekKey.value) => {
  try {
    proofGenerating.value = true

    const weekData = weekKey === thisWeekKey.value 
      ? thisWeekData.value 
      : previousWeeksData.value.find(w => w.weekKey === weekKey)

    if (!weekData || weekData.records.length === 0) {
      console.warn('该周暂无打卡记录')
      return
    }

    const merkleRoot = await weeklyCheckinService.calculateMerkleRoot(weekData.leaves)
    const token = await authService.getToken()

    const response = await fetch(buildZkpUrl('proveWeeklySummary'), {
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

      pollProofStatus(weekKey, data.jobId)
      console.log('✅ 证明生成任务已启动，jobId:', data.jobId)
    } else {
      throw new Error(data.message || '启动证明生成失败')
    }
  } catch (error: any) {
    console.error('生成周度证明失败:', error)
    const errorMsg = error.message || '生成失败，请重试'
    
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

const submitProofToChain = async (weekKey: string, proofResult: WeeklyProofResult) => {
  try {
    if (!proofResult.proof || !proofResult.calldata || !proofResult.publicSignals) {
      console.warn('证明数据不完整，无法上链')
      return
    }

    const weekData = weekKey === thisWeekKey.value 
      ? thisWeekData.value 
      : previousWeeksData.value.find(w => w.weekKey === weekKey)

    if (!weekData) {
      console.warn('周数据不存在')
      return
    }

    const token = await authService.getToken()
    const userInfo = await authService.getUserInfo()
    
    if (!userInfo?.smart_account) {
      console.warn('无法获取用户 Smart Account 地址')
      return
    }
    
    // 构建上链数据
    const onchainData = {
      weekKey,
      proof: proofResult.proof,
      publicSignals: proofResult.publicSignals,
      calldata: proofResult.calldata,
      records: sanitizeRecordsForUpload(weekData.records),
      leaves: weekData.leaves,
      merkleRoot: weekData.merkleRoot,
      timestamp: Date.now(),
      smartAccountAddress: userInfo.smart_account,
    }

    console.log('📤 开始上链流程，发送数据到后端...')

    const response = await fetch(`${API_GATEWAY_URL}/chain/medication-checkin/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(onchainData),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      console.log('✅ 上链请求已提交，等待链上确认...')
      // 后端会通过通知服务异步发送交易结果
    } else {
      console.error('❌ 上链请求失败:', result.message)
    }
  } catch (error) {
    console.error('❌ 上链流程出错:', error)
  }
}

const pollProofStatus = (weekKey: string, jobId: string, maxAttempts: number = 120) => {
  let attempts = 0

  const poll = async () => {
    try {
      const token = await authService.getToken()
      const response = await fetch(buildZkpUrl('proofStatus', { pathParams: { jobId } }), {
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

        const proofResult: WeeklyProofResult = {
          weekKey,
          jobId,
          status: status as any,
          createdAt: proofStatusMap.value[weekKey]?.createdAt || Date.now(),
          updatedAt: Date.now(),
        }

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

        if (status === 'completed') {
          clearInterval(pollingIntervals.value[weekKey])
          delete pollingIntervals.value[weekKey]
          console.log(`✅ 证明状态更新: ${status}`)
          // 证明完成后，提交到链上
          await submitProofToChain(weekKey, proofResult)
        } else if (status === 'failed') {
          clearInterval(pollingIntervals.value[weekKey])
          delete pollingIntervals.value[weekKey]
          console.log(`❌ 证明状态更新: ${status}`)
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

  poll()
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
  try {
    await checkinIpfsRestoreService.restoreFromChainCids()
  } catch (e) {
    console.warn('IPFS 周包回灌失败（不影响页面继续加载）:', e)
  }

  await refreshData()

  // 连接 WebSocket 以接收通知
  try {
    await notificationService.connect()
    console.log('✅ 通知服务已连接')
  } catch (error) {
    console.error('连接通知服务失败:', error)
  }

  // 监听用药打卡成功通知
  notificationService.on('notification', handleMedicationCheckInNotification)
})

onBeforeUnmount(() => {
  Object.values(pollingIntervals.value).forEach(interval => clearInterval(interval))
  
  // 取消通知监听
  notificationService.off('notification', handleMedicationCheckInNotification)
})

/**
 * 处理用药打卡通知
 */
const handleMedicationCheckInNotification = async (notification: any) => {
  try {
    // 只处理用药打卡相关通知
    if (!notification.type?.includes('medication_checkin')) {
      return
    }

    console.log('📬 收到用药打卡通知:', notification)

    const { weekKey, ipfsCid, txHash, status } = notification.data || {}

    if (!weekKey || !ipfsCid) {
      console.warn('通知数据不完整')
      return
    }

    if (status === 'success' && txHash) {
      // 构建链上记录
      const onchainRecord: WeeklyOnchainRecord = {
        weekKey,
        ipfsCid,
        txHash,
        timestamp: notification.data?.timestamp || Date.now(),
        status: 'confirmed'
      }

      // 保存到本地
      await weeklyCheckinService.saveWeeklyOnchainRecord(onchainRecord)
      onchainStatusMap.value = {
        ...onchainStatusMap.value,
        [weekKey]: onchainRecord,
      }

      console.log(`✅ 交易已确认，weekKey: ${weekKey}, txHash: ${txHash}`)
      console.log(`📝 链上记录已保存到本地`)

      // 刷新数据显示最新状态
      await refreshData()
    } else if (status === 'failed') {
      console.error(`❌ 用药打卡上链失败: ${notification.data?.error}`)
    }
  } catch (error) {
    console.error('处理通知失败:', error)
  }
}
</script>

<style scoped>
.weekly-summary-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 80px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;

  background: #667eea;

  color: white;
  box-shadow: var(--shadow-md);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn,
.refresh-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
}

.back-btn {
  width: 40px;
  height: 40px;
}

.refresh-btn {
  width: 36px;
  height: 36px;
}

.back-btn:hover,
.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon {
  width: 24px;
  height: 24px;
}

.icon-small {
  width: 18px;
  height: 18px;
}

.page-title {
  flex: 1;
  font-size: 18px;
  font-weight: 700;
  color: white;
  margin: 0 12px;
}

.this-week-section {
  padding: 20px;
}

.week-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.week-title {
  font-size: 18px;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  width: 20px;
  height: 20px;
  color: #667eea;
}

.week-range {
  font-size: 13px;
  color: #718096;
  background: white;
  padding: 6px 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.week-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  background: white;
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  border: 1px solid #e2e8f0;
  transition: all 0.3s;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-icon {
  width: 28px;
  height: 28px;
  color: #667eea;
  margin: 0 auto 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: #667eea;
  margin-bottom: 4px;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #718096;
  font-weight: 500;
}

.stat-badge {
  background: #f7fafc;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  box-shadow: var(--shadow-sm);
  border: 1px solid #e2e8f0;
  transition: all 0.3s;
}

.stat-badge.status {
  background: #ecfeff;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.stat-badge.status.success {
  background: #dcfce7;
  color: #065f46;
  border-color: #bbf7d0;
}

.stat-badge.status.pending {
  background: #fef9c3;
  color: #92400e;
  border-color: #fde68a;
}

.stat-badge .badge-icon {
  width: 14px;
  height: 14px;
  color: inherit;
}

.week-records {
  background: white;
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
  border: 1px solid #e2e8f0;
}

.records-title {
  font-size: 16px;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
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
  background: #f7fafc;
  border-radius: 12px;
  border-left: 3px solid #667eea;
  transition: all 0.3s;
}

.record-item:hover {
  background: #ebf4ff;
  transform: translateX(4px);
}

.record-icon {
  width: 18px;
  height: 18px;
  color: #667eea;
}

.record-time {
  font-weight: 600;
  color: #667eea;
  min-width: 50px;
  font-size: 14px;
}

.record-info {
  flex: 1;
}

.record-name {
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 2px;
}

.record-dosage {
  font-size: 13px;
  color: #718096;
}

.record-date {
  font-size: 12px;
  color: #a0aec0;
}

.proof-section {
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  border: 1px solid #e2e8f0;
}

.onchain-card {
  margin-top: 16px;
  background: #ecfeff;
  border: 1px solid #bae6fd;
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.onchain-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.onchain-field.meta {
  font-size: 13px;
  color: #0369a1;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.field-label {
  font-size: 13px;
  color: #0f172a;
  font-weight: 600;
}

.field-value {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: #0c4a6e;
}

.mono {
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 13px;
  word-break: break-all;
}

.ghost-btn {
  border: 1px solid #0ea5e9;
  background: transparent;
  color: #0369a1;
  border-radius: 999px;
  padding: 4px 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.ghost-btn:hover {
  background: rgba(14, 165, 233, 0.12);
}

.icon-mini {
  width: 14px;
  height: 14px;
}

.proof-action {
  text-align: center;
}

.generate-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: var(--shadow-sm);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.generate-btn:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.proof-hint {
  font-size: 13px;
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
  font-size: 13px;
  font-weight: 700;
  width: fit-content;
}

.status-badge.processing {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.completed {
  background: #dcfce7;
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
}

.proof-result {
  background: #ebf4ff;
}

.result-text,
.error-text {
  margin: 0 0 12px 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-text {
  color: #065f46;
}

.error-text {
  color: #7f1d1d;
}

.result-icon,
.error-icon {
  width: 20px;
  height: 20px;
}

.result-actions,
.proof-error {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.action-btn:hover {
  background: var(--primary-700);
  transform: translateY(-2px);
}

.action-btn.secondary {
  background: white;
  color: var(--color-primary);
  border: 1px solid var(--border-color);
}

.action-btn.secondary:hover {
  background: var(--primary-50);
  border-color: var(--color-primary);
}

.retry-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.retry-btn:hover {
  background: var(--primary-700);
  transform: translateY(-2px);
}

.proof-polling {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
}

.polling-spinner {
  width: 32px;
  height: 32px;
  color: var(--color-primary);
  animation: spin 1s linear infinite;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.previous-weeks-section {
  padding: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.weeks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.week-card {
  background: white;
  border-radius: 20px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  transition: all 0.3s;
}

.week-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.card-header {
  margin-bottom: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0 0 4px 0;
}

.card-range {
  font-size: 13px;
  color: var(--text-secondary);
}

.card-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-body);
  padding: 4px 10px;
  border-radius: 10px;
  font-weight: 500;
}

.badge-icon {
  width: 14px;
  height: 14px;
}

.card-actions {
  display: flex;
  gap: 8px;
}
</style>
