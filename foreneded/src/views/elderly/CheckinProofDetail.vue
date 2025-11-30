<template>
  <div class="checkin-proof-detail-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="page-title">打卡证明详情</h1>
      <div class="header-actions"></div>
    </div>

    <!-- 主要内容 -->
    <div class="content">
      <div v-if="loading" class="loading-state">
        <Loader2 class="spinner" />
        <p>加载中...</p>
      </div>

      <div v-else-if="proofData" class="proof-info">
        <!-- 基本信息 -->
        <div class="info-section">
          <h2 class="section-title">基本信息</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">打卡时间</span>
              <span class="value">{{ formatDate(proofData.timestamp) }}</span>
            </div>
            <div class="info-item">
              <span class="label">药物名称</span>
              <span class="value">{{ proofData.medicationName }}</span>
            </div>
            <div class="info-item">
              <span class="label">用量</span>
              <span class="value">{{ proofData.dosage }}</span>
            </div>
            <div class="info-item">
              <span class="label">状态</span>
              <span class="value">{{ proofData.status }}</span>
            </div>
          </div>
        </div>

        <!-- 验证状态 -->
        <div class="verification-section">
          <h2 class="section-title">链上验证</h2>
          <div class="verification-status" :class="verificationStatus">
            <div class="status-icon">
              <CheckCircle v-if="verificationStatus === 'verified'" class="icon-status" />
              <XCircle v-else-if="verificationStatus === 'failed'" class="icon-status" />
              <Loader2 v-else class="icon-status spinning" />
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
            <Loader2 v-if="verifying" class="spinner-small" />
            <span v-else>开始验证</span>
          </button>
        </div>

        <!-- 证明数据 -->
        <div v-if="proofData.proof" class="data-section">
          <h2 class="section-title">证明数据</h2>

          <!-- Proof -->
          <div class="data-item">
            <div class="data-header">
              <h3>Proof</h3>
              <button class="copy-btn" @click="copyToClipboard(proofData.proof)">
                <Clipboard class="icon-small" />
                <span>复制</span>
              </button>
            </div>
            <div class="data-content">
              <pre>{{ formatJson(proofData.proof) }}</pre>
            </div>
          </div>

          <!-- Public Signals -->
          <div class="data-item">
            <div class="data-header">
              <h3>Public Signals</h3>
              <button class="copy-btn" @click="copyToClipboard(proofData.publicSignals)">
                <Clipboard class="icon-small" />
                <span>复制</span>
              </button>
            </div>
            <div class="data-content">
              <pre>{{ formatJson(proofData.publicSignals) }}</pre>
            </div>
          </div>

          <!-- Calldata -->
          <div v-if="proofData.calldata" class="data-item">
            <div class="data-header">
              <h3>Calldata</h3>
              <button class="copy-btn" @click="copyToClipboard(proofData.calldata)">
                <Clipboard class="icon-small" />
                <span>复制</span>
              </button>
            </div>
            <div class="data-content calldata">
              <pre>{{ proofData.calldata }}</pre>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button class="btn btn-primary" @click="goBack">返回</button>
          <button v-if="proofData.proof" class="btn btn-secondary" @click="downloadProof">
            <Download class="icon-small" />
            <span>下载证明</span>
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
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { authService } from '@/service/auth';
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clipboard, 
  Download 
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

const loading = ref(true);
const proofData = ref<any>(null);
const verifying = ref(false);
const verificationStatus = ref<'pending' | 'verified' | 'failed'>('pending');
const verificationMessage = ref('');

const goBack = () => {
  router.back();
};

const getVerificationLabel = () => {
  const labels: Record<string, string> = {
    pending: '未验证',
    verified: '验证成功',
    failed: '验证失败',
  };
  return labels[verificationStatus.value] || '未知状态';
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN');
};

const formatJson = (data: any) => {
  return JSON.stringify(data, null, 2);
};

const copyToClipboard = async (data: any) => {
  try {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(text);
    alert('✅ 已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    alert('❌ 复制失败');
  }
};

const downloadProof = () => {
  if (!proofData.value) return;

  const data = {
    timestamp: proofData.value.timestamp,
    medicationName: proofData.value.medicationName,
    dosage: proofData.value.dosage,
    proof: proofData.value.proof,
    publicSignals: proofData.value.publicSignals,
    calldata: proofData.value.calldata,
    downloadTime: new Date().toISOString(),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `checkin_proof_${new Date(proofData.value.timestamp).getTime()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const verifyProof = async () => {
  if (!proofData.value || verifying.value) return;

  verifying.value = true;
  verificationMessage.value = '';

  try {
    const calldata = proofData.value.calldata;

    console.log('=== 开始验证 ===');
    console.log('Calldata 类型:', typeof calldata);
    console.log('Calldata 值:', calldata);
    console.log('Calldata 长度:', calldata ? calldata.length : 0);

    if (!calldata) {
      verificationMessage.value = '缺少 Calldata 数据';
      verificationStatus.value = 'failed';
      return;
    }

    // 从 calldata 中解析 pA, pB, pC, pubSignals
    let pA: any = [];
    let pB: any = [];
    let pC: any = [];
    let pubSignals: any = [];

    try {
      // calldata 格式: [pA],[pB],[pC],[pubSignals] 或 [[pA],[pB],[pC],[pubSignals]]
      if (typeof calldata === 'string') {
        console.log('解析 calldata 字符串...');
        
        // 尝试直接解析为 JSON
        let parsed: any;
        try {
          parsed = JSON.parse(calldata);
          console.log('✓ 直接 JSON 解析成功');
        } catch (e) {
          // 如果直接解析失败，尝试用方括号包装
          console.log('直接解析失败，尝试包装为数组...');
          try {
            parsed = JSON.parse(`[${calldata}]`);
            console.log('✓ 包装后解析成功');
          } catch (e2) {
            console.error('❌ 包装解析也失败:', e2);
            throw e;
          }
        }
        
        // 处理两种情况：
        // 1. 直接解析得到 [pA, pB, pC, pubSignals]
        // 2. 包装解析得到 [[pA, pB, pC, pubSignals]]
        if (Array.isArray(parsed)) {
          if (parsed.length === 4 && Array.isArray(parsed[0])) {
            // 情况1: [pA, pB, pC, pubSignals]
            console.log('✓ 格式1: [pA, pB, pC, pubSignals]');
            pA = parsed[0];
            pB = parsed[1];
            pC = parsed[2];
            pubSignals = parsed[3];
          } else if (parsed.length === 1 && Array.isArray(parsed[0]) && Array.isArray(parsed[0][0])) {
            // 情况2: [[pA, pB, pC, pubSignals]]
            console.log('✓ 格式2: [[pA, pB, pC, pubSignals]]');
            pA = parsed[0][0];
            pB = parsed[0][1];
            pC = parsed[0][2];
            pubSignals = parsed[0][3];
          } else {
            console.error('❌ 数组格式不符合预期');
            verificationMessage.value = 'Calldata 格式错误';
            verificationStatus.value = 'failed';
            return;
          }
        } else {
          console.error('❌ 解析结果不是数组');
          verificationMessage.value = 'Calldata 格式错误';
          verificationStatus.value = 'failed';
          return;
        }
      } else if (Array.isArray(calldata) && calldata.length >= 4) {
        console.log('✓ Calldata 已是数组格式');
        pA = calldata[0];
        pB = calldata[1];
        pC = calldata[2];
        pubSignals = calldata[3];
      } else {
        console.error('❌ 未知的 calldata 格式:', typeof calldata);
        verificationMessage.value = '证明数据格式不支持';
        verificationStatus.value = 'failed';
        return;
      }
      
      console.log('✓ 参数提取成功:', {
        pA: Array.isArray(pA) ? `长度 ${pA.length}` : '非数组',
        pB: Array.isArray(pB) ? `长度 ${pB.length}` : '非数组',
        pC: Array.isArray(pC) ? `长度 ${pC.length}` : '非数组',
        pubSignals: Array.isArray(pubSignals) ? `长度 ${pubSignals.length}` : '非数组',
      });
    } catch (parseError) {
      console.error('❌ 解析 calldata 失败:', parseError);
      console.error('原始 calldata:', calldata);
      verificationMessage.value = '证明数据解析失败';
      verificationStatus.value = 'failed';
      return;
    }

    console.log('数据完整性检查:');
    console.log('- pA 完整:', pA.length > 0);
    console.log('- pB 完整:', pB.length > 0);
    console.log('- pC 完整:', pC.length > 0);
    console.log('- pubSignals 完整:', pubSignals.length > 0);

    if (!pA.length || !pB.length || !pC.length || !pubSignals.length) {
      verificationMessage.value = `证明数据不完整 (pA: ${pA.length}, pB: ${pB.length}, pC: ${pC.length}, pubSignals: ${pubSignals.length})`;
      verificationStatus.value = 'failed';
      console.error('证明数据不完整:', { pA: pA.length, pB: pB.length, pC: pC.length, pubSignals: pubSignals.length });
      return;
    }

    // 构建请求体 - 发送 pA, pB, pC, pubSignals
    const requestBody = {
      pA: pA,
      pB: pB,
      pC: pC,
      pubSignals: pubSignals,
    };

    console.log('发送验证请求:', {
      pA: JSON.stringify(pA),
      pB: JSON.stringify(pB),
      pC: JSON.stringify(pC),
      pubSignals: JSON.stringify(pubSignals),
    });

    // 调用验证 API
    const token = await authService.getToken();
    const API_GATEWAY_URL = (await import('@/config/api.config')).API_GATEWAY_URL;

    const response = await fetch(`${API_GATEWAY_URL}/erc4337/zkp/verify/medical-checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('验证响应状态:', response.status);
    const result = await response.json();
    console.log('验证响应数据:', JSON.stringify(result, null, 2));
    console.log('响应字段检查:');
    console.log('- result.success:', result.success);
    console.log('- result.verified:', result.verified);
    console.log('- result.valid:', result.valid);
    console.log('- result.message:', result.message);
    console.log('- result.error:', result.error);

    // 检查验证是否成功
    // 后端返回 success: true 和 valid: true 表示验证成功
    if ((result.success && result.valid) || (result.success && result.verified)) {
      verificationStatus.value = 'verified';
      verificationMessage.value = result.message || '✅ 证明验证成功';
      console.log('✅ 验证成功');
    } else if (result.valid === true || result.verified === true) {
      verificationStatus.value = 'verified';
      verificationMessage.value = result.message || '✅ 证明验证成功';
      console.log('✅ 验证成功');
    } else {
      verificationStatus.value = 'failed';
      verificationMessage.value = result.message || result.error || '❌ 证明验证失败';
      console.error('❌ 验证失败，完整响应:', result);
    }
  } catch (error) {
    console.error('验证证明失败:', error);
    verificationStatus.value = 'failed';
    verificationMessage.value = error instanceof Error ? error.message : '验证过程中出错';
  } finally {
    verifying.value = false;
  }
};

onMounted(async () => {
  try {
    // 从路由参数获取证明数据
    const proofJson = route.query.proof as string;
    if (!proofJson) {
      alert('❌ 缺少证明数据');
      goBack();
      return;
    }

    proofData.value = JSON.parse(decodeURIComponent(proofJson));

    if (!proofData.value) {
      alert('❌ 证明数据格式错误');
    }
  } catch (error) {
    console.error('加载证明详情失败:', error);
    alert('❌ 加载失败');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.checkin-proof-detail-page {
  min-height: 100vh;

  background: #f5f7fa;

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
  transition: all 0.3s ease;
}

.back-btn:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.95);
}

.icon {
  width: 24px;
  height: 24px;
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
.verification-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-md);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #ebf4ff;
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
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-status {
  width: 24px;
  height: 24px;
}

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
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.verify-btn:active:not(:disabled) {
  background: #5a67d8;
  transform: scale(0.98);
}

.verify-btn:disabled {
  background: var(--gray-300);
  cursor: not-allowed;
}

.spinner-small {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

/* 数据项 */
.data-item {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
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
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.copy-btn:active {
  background: #dbeafe;
  transform: scale(0.95);
}

.icon-small {
  width: 14px;
  height: 14px;
}

.data-content {
  background: #f7fafc;
  border-radius: 8px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:active {
  background: #5a67d8;
  transform: scale(0.98);
}

.btn-secondary {
  background: white;
  color: #2d3748;
  border: 1px solid #e2e8f0;
}

.btn-secondary:active {
  background: #f7fafc;
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
