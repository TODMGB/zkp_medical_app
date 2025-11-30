<template>
  <div class="proof-detail-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="page-title">证明详情</h1>
      <div class="header-actions"></div>
    </div>

    <!-- 主要内容 -->
    <div class="content">
      <div v-if="loading" class="loading-state">
        <Loader2 class="spinner" />
        <p>加载中...</p>
      </div>

      <div v-else-if="proofResult" class="proof-info">
        <!-- 基本信息 -->
        <div class="info-section">
          <h2 class="section-title">
            <Info class="title-icon" />
            基本信息
          </h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">周号</span>
              <span class="value">{{ proofResult.weekKey }}</span>
            </div>
            <div class="info-item">
              <span class="label">任务ID</span>
              <span class="value mono">{{ proofResult.jobId }}</span>
            </div>
            <div class="info-item">
              <span class="label">状态</span>
              <span class="value" :class="proofResult.status">
                {{ getStatusLabel(proofResult.status) }}
              </span>
            </div>
            <div class="info-item">
              <span class="label">创建时间</span>
              <span class="value">{{ formatDate(proofResult.createdAt) }}</span>
            </div>
            <div class="info-item">
              <span class="label">更新时间</span>
              <span class="value">{{ formatDate(proofResult.updatedAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 验证状态 -->
        <div v-if="proofResult.status === 'completed'" class="verification-section">
          <h2 class="section-title">
            <Shield class="title-icon" />
            链上验证
          </h2>
          <div class="verification-status" :class="verificationStatus">
            <div class="status-icon-wrapper">
              <CheckCircle2 v-if="verificationStatus === 'verified'" class="status-icon success" />
              <XCircle v-else-if="verificationStatus === 'failed'" class="status-icon error" />
              <Clock v-else class="status-icon pending" />
            </div>
            <div class="status-content">
              <p class="status-label">{{ getVerificationLabel() }}</p>
              <p v-if="verificationMessage" class="status-message">{{ verificationMessage }}</p>
            </div>
          </div>
          <button 
            v-if="verificationStatus !== 'verified'"
            class="verify-btn"
            :disabled="verifying"
            @click="verifyProof"
          >
            <Shield v-if="!verifying" class="btn-icon" />
            <Loader2 v-else class="btn-icon spinner" />
            {{ verifying ? '验证中...' : '开始验证' }}
          </button>
        </div>

        <!-- 证明数据 -->
        <div v-if="proofResult.status === 'completed'" class="data-section">
          <h2 class="section-title">
            <FileCode class="title-icon" />
            证明数据
          </h2>

          <!-- Proof -->
          <div class="data-item">
            <div class="data-header">
              <h3>Proof</h3>
              <button class="copy-btn" @click="copyToClipboard(proofResult.proof)">
                <Copy class="icon-small" />
                复制
              </button>
            </div>
            <div class="data-content">
              <pre>{{ formatJson(proofResult.proof) }}</pre>
            </div>
          </div>

          <!-- Public Signals -->
          <div class="data-item">
            <div class="data-header">
              <h3>Public Signals</h3>
              <button class="copy-btn" @click="copyToClipboard(proofResult.publicSignals)">
                <Copy class="icon-small" />
                复制
              </button>
            </div>
            <div class="data-content">
              <pre>{{ formatJson(proofResult.publicSignals) }}</pre>
            </div>
          </div>

          <!-- Calldata -->
          <div class="data-item">
            <div class="data-header">
              <h3>Calldata</h3>
              <button class="copy-btn" @click="copyToClipboard(proofResult.calldata)">
                <Copy class="icon-small" />
                复制
              </button>
            </div>
            <div class="data-content calldata">
              <pre>{{ proofResult.calldata }}</pre>
            </div>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-else-if="proofResult.status === 'failed'" class="error-section">
          <h2 class="section-title">
            <AlertTriangle class="title-icon" />
            错误信息
          </h2>
          <div class="error-box">
            <AlertCircle class="error-icon" />
            <p>{{ proofResult.error || '证明生成失败，原因未知' }}</p>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button class="btn btn-secondary" @click="goBack">
            <ArrowLeft class="btn-icon" />
            返回
          </button>
          <button v-if="proofResult.status === 'completed'" class="btn btn-primary" @click="downloadProof">
            <Download class="btn-icon" />
            下载证明
          </button>
        </div>
      </div>

      <div v-else class="empty-state">
        <FileQuestion class="empty-icon" />
        <p>未找到证明数据</p>
        <button class="btn btn-primary" @click="goBack">返回</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { weeklyCheckinService } from '@/service/weeklyCheckinService'
import { 
  ArrowLeft, 
  Info, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileCode, 
  Copy, 
  AlertTriangle, 
  AlertCircle, 
  Download, 
  FileQuestion,
  Loader2
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const proofResult = ref<any>(null)
const verifying = ref(false)
const verificationStatus = ref<'pending' | 'verified' | 'failed'>('pending')
const verificationMessage = ref('')

const goBack = () => {
  router.back()
}

const getVerificationLabel = () => {
  const labels: Record<string, string> = {
    pending: '未验证',
    verified: '验证成功',
    failed: '验证失败',
  }
  return labels[verificationStatus.value] || '未知状态'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    processing: '⏳ 处理中',
    completed: '✅ 已完成',
    failed: '❌ 失败',
  }
  return labels[status] || status
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const formatJson = (data: any) => {
  return JSON.stringify(data, null, 2)
}

const copyToClipboard = async (data: any) => {
  try {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    await navigator.clipboard.writeText(text)
    alert('✅ 已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    alert('❌ 复制失败')
  }
}

const downloadProof = () => {
  if (!proofResult.value) return

  const data = {
    weekKey: proofResult.value.weekKey,
    jobId: proofResult.value.jobId,
    proof: proofResult.value.proof,
    publicSignals: proofResult.value.publicSignals,
    calldata: proofResult.value.calldata,
    timestamp: new Date().toISOString(),
  }

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `proof_${proofResult.value.weekKey}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const verifyProof = async () => {
  if (!proofResult.value || verifying.value) return

  verifying.value = true
  verificationMessage.value = ''

  try {
    const calldata = proofResult.value.calldata

    if (!calldata) {
      verificationMessage.value = '缺少 Calldata 数据'
      verificationStatus.value = 'failed'
      return
    }

    // Parse calldata
    let pA: any = []
    let pB: any = []
    let pC: any = []
    let pubSignals: any = []

    try {
      if (typeof calldata === 'string') {
        let parsed: any
        try {
          parsed = JSON.parse(calldata)
        } catch (e) {
          parsed = JSON.parse(`[${calldata}]`)
        }
        
        if (Array.isArray(parsed)) {
          if (parsed.length === 4 && Array.isArray(parsed[0])) {
            pA = parsed[0]
            pB = parsed[1]
            pC = parsed[2]
            pubSignals = parsed[3]
          } else if (parsed.length === 1 && Array.isArray(parsed[0]) && Array.isArray(parsed[0][0])) {
            pA = parsed[0][0]
            pB = parsed[0][1]
            pC = parsed[0][2]
            pubSignals = parsed[0][3]
          } else {
            verificationMessage.value = 'Calldata 格式错误'
            verificationStatus.value = 'failed'
            return
          }
        }
      } else if (Array.isArray(calldata) && calldata.length >= 4) {
        pA = calldata[0]
        pB = calldata[1]
        pC = calldata[2]
        pubSignals = calldata[3]
      }
    } catch (parseError) {
      verificationMessage.value = '证明数据解析失败'
      verificationStatus.value = 'failed'
      return
    }

    if (!pA.length || !pB.length || !pC.length || !pubSignals.length) {
      verificationMessage.value = '证明数据不完整'
      verificationStatus.value = 'failed'
      return
    }

    const requestBody = { pA, pB, pC, pubSignals }

    const token = await (await import('@/service/auth')).authService.getToken()
    const API_GATEWAY_URL = (await import('@/config/api.config')).API_GATEWAY_URL

    const response = await fetch(`${API_GATEWAY_URL}/erc4337/zkp/verify/weekly-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    })

    const result = await response.json()

    if ((result.success && result.valid) || (result.success && result.verified) || result.valid === true || result.verified === true) {
      verificationStatus.value = 'verified'
      verificationMessage.value = result.message || '✅ 证明验证成功'
    } else {
      verificationStatus.value = 'failed'
      verificationMessage.value = result.message || result.error || '❌ 证明验证失败'
    }
  } catch (error) {
    verificationStatus.value = 'failed'
    verificationMessage.value = error instanceof Error ? error.message : '验证过程中出错'
  } finally {
    verifying.value = false
  }
}

onMounted(async () => {
  try {
    const weekKey = route.params.weekKey as string
    if (!weekKey) {
      alert('❌ 缺少周号参数')
      goBack()
      return
    }

    proofResult.value = await weeklyCheckinService.getWeeklyProofResult(weekKey)

    if (!proofResult.value) {
      alert('❌ 未找到证明数据')
    }
  } catch (error) {
    console.error('加载证明详情失败:', error)
    alert('❌ 加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.proof-detail-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;

  background: #667eea;

  color: white;
  box-shadow: var(--shadow-md);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: all 0.3s;
  backdrop-filter: blur(5px);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.icon {
  width: 24px;
  height: 24px;
}

.icon-small {
  width: 16px;
  height: 16px;
}

.page-title {
  flex: 1;
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px 80px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  color: var(--color-primary);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--text-tertiary);
}

.proof-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.info-section,
.data-section,
.error-section,
.verification-section {
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  width: 20px;
  height: 20px;
  color: #667eea;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-item .label {
  font-size: 12px;
  color: #718096;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-item .value {
  font-size: 14px;
  color: #2d3748;
  font-weight: 500;
  word-break: break-all;
}

.info-item .value.mono {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background: #f7fafc;
  padding: 8px;
  border-radius: 8px;
}

.info-item .value.processing { color: #f59e0b; }
.info-item .value.completed { color: #22c55e; }
.info-item .value.failed { color: #ef4444; }

.data-item {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.data-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.data-header h3 {
  margin: 0;
  font-size: 14px;
  color: #2d3748;
  font-weight: 600;
}

.copy-btn {
  background: #ebf4ff;
  color: #667eea;
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.copy-btn:hover {
  background: #bfdbfe;
  transform: scale(1.05);
}

.data-content {
  background: #f7fafc;
  border-radius: 12px;
  padding: 12px;
  overflow-x: auto;
}

.data-content pre {
  margin: 0;
  font-size: 11px;
  font-family: 'Courier New', monospace;
  color: #2d3748;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.data-content.calldata pre {
  font-size: 10px;
}

.verification-status {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.verification-status.pending {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
}

.verification-status.verified {
  background: #dcfce7;
  border-left: 4px solid #22c55e;
}

.verification-status.failed {
  background: #fee2e2;
  border-left: 4px solid #ef4444;
}

.status-icon-wrapper {
  flex-shrink: 0;
}

.status-icon {
  width: 32px;
  height: 32px;
}

.status-icon.success { color: #22c55e; }
.status-icon.error { color: #ef4444; }
.status-icon.pending { color: #f59e0b; }

.status-content {
  flex: 1;
}

.status-label {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
}

.status-message {
  margin: 0;
  font-size: 12px;
  color: #718096;
  line-height: 1.5;
}

.verify-btn {
  width: 100%;
  padding: 12px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.verify-btn:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.verify-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.error-box {
  background: #fee2e2;
  border-left: 4px solid #ef4444;
  padding: 16px;
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.error-icon {
  width: 24px;
  height: 24px;
  color: #ef4444;
  flex-shrink: 0;
}

.error-box p {
  margin: 0;
  color: #b91c1c;
  font-size: 14px;
  line-height: 1.6;
  flex: 1;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a67d8;
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: white;
  color: #2d3748;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #f7fafc;
  transform: translateY(-2px);
}

@media (max-width: 600px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>
