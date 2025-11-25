<template>
  <div class="proof-detail-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="page-title">证明详情</h1>
      <div class="header-actions"></div>
    </div>

    <!-- 主要内容 -->
    <div class="content">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="proofResult" class="proof-info">
        <!-- 基本信息 -->
        <div class="info-section">
          <h2 class="section-title">基本信息</h2>
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
          <h2 class="section-title">链上验证</h2>
          <div class="verification-status" :class="verificationStatus">
            <div class="status-icon">
              {{ verificationStatus === 'verified' ? '✅' : verificationStatus === 'failed' ? '❌' : '⏳' }}
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
            {{ verifying ? '验证中...' : '开始验证' }}
          </button>
        </div>

        <!-- 证明数据 -->
        <div v-if="proofResult.status === 'completed'" class="data-section">
          <h2 class="section-title">证明数据</h2>

          <!-- Proof -->
          <div class="data-item">
            <div class="data-header">
              <h3>Proof</h3>
              <button class="copy-btn" @click="copyToClipboard(proofResult.proof)">
                📋 复制
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
                📋 复制
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
                📋 复制
              </button>
            </div>
            <div class="data-content calldata">
              <pre>{{ proofResult.calldata }}</pre>
            </div>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-else-if="proofResult.status === 'failed'" class="error-section">
          <h2 class="section-title">错误信息</h2>
          <div class="error-box">
            <p>{{ proofResult.error || '证明生成失败，原因未知' }}</p>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button class="btn btn-primary" @click="goBack">返回</button>
          <button v-if="proofResult.status === 'completed'" class="btn btn-secondary" @click="downloadProof">
            📥 下载证明
          </button>
        </div>
      </div>

      <div v-else class="empty-state">
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

    console.log('=== 开始验证 ===')
    console.log('Calldata 类型:', typeof calldata)
    console.log('Calldata 值:', calldata)
    console.log('Calldata 长度:', calldata ? calldata.length : 0)

    if (!calldata) {
      verificationMessage.value = '缺少 Calldata 数据'
      verificationStatus.value = 'failed'
      return
    }

    // 从 calldata 中解析 pA, pB, pC, pubSignals
    let pA: any = []
    let pB: any = []
    let pC: any = []
    let pubSignals: any = []

    try {
      // calldata 格式: [pA],[pB],[pC],[pubSignals] 或 [[pA],[pB],[pC],[pubSignals]]
      if (typeof calldata === 'string') {
        console.log('解析 calldata 字符串...')
        
        // 尝试直接解析为 JSON
        let parsed: any
        try {
          parsed = JSON.parse(calldata)
          console.log('✓ 直接 JSON 解析成功')
        } catch (e) {
          // 如果直接解析失败，尝试用方括号包装
          console.log('直接解析失败，尝试包装为数组...')
          try {
            parsed = JSON.parse(`[${calldata}]`)
            console.log('✓ 包装后解析成功')
          } catch (e2) {
            console.error('❌ 包装解析也失败:', e2)
            throw e
          }
        }
        
        // 处理两种情况：
        // 1. 直接解析得到 [pA, pB, pC, pubSignals]
        // 2. 包装解析得到 [[pA, pB, pC, pubSignals]]
        if (Array.isArray(parsed)) {
          if (parsed.length === 4 && Array.isArray(parsed[0])) {
            // 情况1: [pA, pB, pC, pubSignals]
            console.log('✓ 格式1: [pA, pB, pC, pubSignals]')
            pA = parsed[0]
            pB = parsed[1]
            pC = parsed[2]
            pubSignals = parsed[3]
          } else if (parsed.length === 1 && Array.isArray(parsed[0]) && Array.isArray(parsed[0][0])) {
            // 情况2: [[pA, pB, pC, pubSignals]]
            console.log('✓ 格式2: [[pA, pB, pC, pubSignals]]')
            pA = parsed[0][0]
            pB = parsed[0][1]
            pC = parsed[0][2]
            pubSignals = parsed[0][3]
          } else {
            console.error('❌ 数组格式不符合预期')
            verificationMessage.value = 'Calldata 格式错误'
            verificationStatus.value = 'failed'
            return
          }
        } else {
          console.error('❌ 解析结果不是数组')
          verificationMessage.value = 'Calldata 格式错误'
          verificationStatus.value = 'failed'
          return
        }
      } else if (Array.isArray(calldata) && calldata.length >= 4) {
        console.log('✓ Calldata 已是数组格式')
        pA = calldata[0]
        pB = calldata[1]
        pC = calldata[2]
        pubSignals = calldata[3]
      } else {
        console.error('❌ 未知的 calldata 格式:', typeof calldata)
        verificationMessage.value = '证明数据格式不支持'
        verificationStatus.value = 'failed'
        return
      }
      
      console.log('✓ 参数提取成功:', {
        pA: Array.isArray(pA) ? `长度 ${pA.length}` : '非数组',
        pB: Array.isArray(pB) ? `长度 ${pB.length}` : '非数组',
        pC: Array.isArray(pC) ? `长度 ${pC.length}` : '非数组',
        pubSignals: Array.isArray(pubSignals) ? `长度 ${pubSignals.length}` : '非数组',
      })
    } catch (parseError) {
      console.error('❌ 解析 calldata 失败:', parseError)
      console.error('原始 calldata:', calldata)
      verificationMessage.value = '证明数据解析失败'
      verificationStatus.value = 'failed'
      return
    }

    console.log('数据完整性检查:')
    console.log('- pA 完整:', pA.length > 0)
    console.log('- pB 完整:', pB.length > 0)
    console.log('- pC 完整:', pC.length > 0)
    console.log('- pubSignals 完整:', pubSignals.length > 0)

    if (!pA.length || !pB.length || !pC.length || !pubSignals.length) {
      verificationMessage.value = `证明数据不完整 (pA: ${pA.length}, pB: ${pB.length}, pC: ${pC.length}, pubSignals: ${pubSignals.length})`
      verificationStatus.value = 'failed'
      console.error('证明数据不完整:', { pA: pA.length, pB: pB.length, pC: pC.length, pubSignals: pubSignals.length })
      return
    }

    // 构建请求体 - 发送 pA, pB, pC, pubSignals
    const requestBody = {
      pA: pA,
      pB: pB,
      pC: pC,
      pubSignals: pubSignals,
    }

    console.log('发送验证请求:', {
      pA: JSON.stringify(pA),
      pB: JSON.stringify(pB),
      pC: JSON.stringify(pC),
      pubSignals: JSON.stringify(pubSignals),
    })

    // 调用验证 API
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

    console.log('验证响应状态:', response.status)
    const result = await response.json()
    console.log('验证响应数据:', JSON.stringify(result, null, 2))
    console.log('响应字段检查:')
    console.log('- result.success:', result.success)
    console.log('- result.verified:', result.verified)
    console.log('- result.valid:', result.valid)
    console.log('- result.message:', result.message)
    console.log('- result.error:', result.error)

    // 检查验证是否成功
    // 后端返回 success: true 和 valid: true 表示验证成功
    if ((result.success && result.valid) || (result.success && result.verified)) {
      verificationStatus.value = 'verified'
      verificationMessage.value = result.message || '✅ 证明验证成功'
      console.log('✅ 验证成功')
    } else if (result.valid === true || result.verified === true) {
      verificationStatus.value = 'verified'
      verificationMessage.value = result.message || '✅ 证明验证成功'
      console.log('✅ 验证成功')
    } else {
      verificationStatus.value = 'failed'
      verificationMessage.value = result.message || result.error || '❌ 证明验证失败'
      console.error('❌ 验证失败，完整响应:', result)
    }
  } catch (error) {
    console.error('验证证明失败:', error)
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
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
  font-size: 20px;
  transition: all 0.3s ease;
}

.back-btn:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.95);
}

.page-title {
  flex: 1;
  color: white;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

/* 主要内容 */
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
  color: white;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 证明信息 */
.proof-info {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-section,
.data-section,
.error-section,
.verification-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #667eea;
}

/* 信息网格 */
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
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-item .value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  word-break: break-all;
}

.info-item .value.mono {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
}

.info-item .value.processing {
  color: #ff9800;
}

.info-item .value.completed {
  color: #4caf50;
}

.info-item .value.failed {
  color: #f44336;
}

/* 数据项 */
.data-item {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
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
  color: #333;
  font-weight: 600;
}

.copy-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.copy-btn:active {
  background: #764ba2;
  transform: scale(0.95);
}

.data-content {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
}

.data-content pre {
  margin: 0;
  font-size: 11px;
  font-family: 'Courier New', monospace;
  color: #333;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.data-content.calldata pre {
  font-size: 10px;
}

/* 验证状态 */
.verification-status {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.verification-status.pending {
  background: #fff3e0;
  border-left: 4px solid #ff9800;
}

.verification-status.verified {
  background: #e8f5e9;
  border-left: 4px solid #4caf50;
}

.verification-status.failed {
  background: #ffebee;
  border-left: 4px solid #f44336;
}

.status-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.status-content {
  flex: 1;
}

.status-label {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.status-message {
  margin: 0;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

.verify-btn {
  width: 100%;
  padding: 12px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.verify-btn:active:not(:disabled) {
  background: #764ba2;
  transform: scale(0.98);
}

.verify-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 错误框 */
.error-box {
  background: #ffebee;
  border-left: 4px solid #f44336;
  padding: 16px;
  border-radius: 4px;
}

.error-box p {
  margin: 0;
  color: #c62828;
  font-size: 14px;
  line-height: 1.6;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:active {
  background: #764ba2;
  transform: scale(0.98);
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn-secondary:active {
  background: #eee;
  transform: scale(0.98);
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
