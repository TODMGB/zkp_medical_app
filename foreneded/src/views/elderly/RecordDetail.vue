<template>
  <div class="record-detail-page">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <button @click="goBack" class="back-btn">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="title">打卡详情</h1>
      <div class="placeholder"></div>
    </div>

    <div class="content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <Loader2 class="spinner" />
        <p>加载中...</p>
      </div>

      <!-- 记录不存在 -->
      <div v-else-if="!record" class="empty-state">
        <ClipboardList class="empty-icon" />
        <p>记录不存在</p>
        <button @click="goBack" class="back-btn-alt">返回</button>
      </div>

      <!-- 记录详情 -->
      <div v-else class="record-content">
        <!-- 基本信息卡片 -->
        <div class="info-card">
          <div class="card-header">
            <div class="icon-wrapper">
              <Pill class="icon-large" />
            </div>
            <h2 class="medication-name">{{ record.medication_name }}</h2>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <div class="label">打卡时间</div>
              <div class="value">{{ formatDateTime(record.timestamp) }}</div>
            </div>
            <div class="info-item">
              <div class="label">药物代码</div>
              <div class="value mono">{{ record.medication_code }}</div>
            </div>
            <div class="info-item">
              <div class="label">剂量</div>
              <div class="value">{{ record.dosage }}</div>
            </div>
            <div class="info-item">
              <div class="label">同步状态</div>
              <div class="value">
                <span class="status-badge" :class="record.synced ? 'synced' : 'local'">
                  {{ record.synced ? '✓ 已同步' : '📱 本地' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ZKP证明信息 -->
        <div class="proof-card">
          <div class="card-title">
            <Lock class="icon" />
            <span>零知识证明（ZKP）</span>
          </div>
          
          <!-- Commitments -->
          <div class="proof-section">
            <h3 class="section-title">Commitments</h3>
            
            <div class="commitment-item">
              <div class="commitment-label">User ID Commitment</div>
              <div class="commitment-value">{{ formatHash(record.user_id_commitment) }}</div>
              <button @click="copyToClipboard(record.user_id_commitment)" class="copy-btn">复制</button>
            </div>
            
            <div class="commitment-item">
              <div class="commitment-label">Medication Commitment</div>
              <div class="commitment-value">{{ formatHash(record.medication_commitment) }}</div>
              <button @click="copyToClipboard(record.medication_commitment)" class="copy-btn">复制</button>
            </div>
            
            <div class="commitment-item">
              <div class="commitment-label">Check-in Commitment</div>
              <div class="commitment-value">{{ formatHash(record.checkin_commitment) }}</div>
              <button @click="copyToClipboard(record.checkin_commitment)" class="copy-btn">复制</button>
            </div>
          </div>

          <!-- ZKP Proof (如果存在) -->
          <div v-if="record.zkp_proof" class="proof-section">
            <h3 class="section-title">Proof Data</h3>
            
            <div class="proof-data">
              <div class="data-label">Proof</div>
              <div class="data-value collapsible" :class="{ expanded: showFullProof }">
                <pre>{{ JSON.stringify(record.zkp_proof, null, 2) }}</pre>
              </div>
              <button @click="showFullProof = !showFullProof" class="toggle-btn">
                {{ showFullProof ? '收起' : '展开' }}
              </button>
            </div>
            
            <div v-if="record.zkp_public_signals" class="proof-data">
              <div class="data-label">Public Signals</div>
              <div class="data-value collapsible" :class="{ expanded: showFullSignals }">
                <pre>{{ JSON.stringify(record.zkp_public_signals, null, 2) }}</pre>
              </div>
              <button @click="showFullSignals = !showFullSignals" class="toggle-btn">
                {{ showFullSignals ? '收起' : '展开' }}
              </button>
            </div>
          </div>

          <!-- 隐私保护说明 -->
          <div class="privacy-note">
            <Info class="note-icon" />
            <div class="note-text">
              <strong>隐私保护：</strong>
              使用零知识证明技术，在不泄露您的身份和药物信息的前提下，证明您按时完成了用药打卡。
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="actions">
          <button v-if="!record.synced" @click="syncRecord" class="action-btn sync" :disabled="syncing">
            <CloudUpload v-if="!syncing" class="icon-small" />
            <Loader2 v-else class="icon-small spinning" />
            <span v-if="!syncing">同步到云端</span>
            <span v-else>同步中...</span>
          </button>
          <button @click="exportRecord" class="action-btn export">
            <Download class="icon-small" />
            <span>导出记录</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { checkinStorageService, type CheckInRecord } from '@/service/checkinStorage';
import { 
  ArrowLeft, 
  Loader2, 
  ClipboardList, 
  Pill, 
  Lock, 
  Info, 
  CloudUpload, 
  Download 
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

// ==================== 状态管理 ====================

const loading = ref(false);
const syncing = ref(false);
const record = ref<CheckInRecord | null>(null);
const showFullProof = ref(false);
const showFullSignals = ref(false);

// ==================== 生命周期 ====================

onMounted(async () => {
  await loadRecord();
});

// ==================== 方法 ====================

/**
 * 加载记录
 */
async function loadRecord() {
  try {
    loading.value = true;
    const recordId = route.params.id as string;
    
    if (!recordId) {
      console.error('缺少记录ID');
      return;
    }
    
    const foundRecord = await checkinStorageService.getRecordById(recordId);
    
    if (foundRecord) {
      record.value = foundRecord;
      console.log('✅ 加载记录成功:', foundRecord);
    } else {
      console.warn('记录不存在:', recordId);
    }
  } catch (error: any) {
    console.error('加载记录失败:', error);
    alert('加载记录失败: ' + error.message);
  } finally {
    loading.value = false;
  }
}

/**
 * 格式化日期时间
 */
function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 格式化哈希值（显示前10位和后8位）
 */
function formatHash(hash: string): string {
  if (!hash || hash.length < 20) return hash;
  return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
}

/**
 * 复制到剪贴板
 */
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    alert('复制失败');
  }
}

/**
 * 同步记录
 */
async function syncRecord() {
  try {
    syncing.value = true;
    
    // TODO: 实现同步到服务器的逻辑
    console.log('同步记录到服务器...');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    alert('同步成功！');
    
    // 重新加载记录
    await loadRecord();
  } catch (error: any) {
    console.error('同步失败:', error);
    alert('同步失败: ' + error.message);
  } finally {
    syncing.value = false;
  }
}

/**
 * 导出记录
 */
function exportRecord() {
  if (!record.value) return;
  
  const exportData = {
    基本信息: {
      药物名称: record.value.medication_name,
      药物代码: record.value.medication_code,
      剂量: record.value.dosage,
      打卡时间: formatDateTime(record.value.timestamp),
    },
    零知识证明: {
      user_id_commitment: record.value.user_id_commitment,
      medication_commitment: record.value.medication_commitment,
      checkin_commitment: record.value.checkin_commitment,
    },
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `打卡记录_${record.value.id}.json`;
  link.click();
  URL.revokeObjectURL(url);
  
  console.log('导出记录成功');
}

/**
 * 返回
 */
function goBack() {
  router.back();
}
</script>

<style scoped>
.record-detail-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 20px;
}

/* 顶部导航栏 */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.icon {
  width: 24px;
  height: 24px;
}

.title {
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.placeholder {
  width: 40px;
}

/* 内容区域 */
.content {
  padding: 20px;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  color: white;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: white;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 20px;
  color: rgba(255, 255, 255, 0.8);
}

.back-btn-alt {
  padding: 12px 28px;
  border-radius: 12px;
  background: white;
  color: var(--color-primary);
  border: none;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 20px;
}

.back-btn-alt:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* 记录内容 */
.record-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 信息卡片 */
.info-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.icon-large {
  width: 28px;
  height: 28px;
}

.medication-name {
  font-size: 20px;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 12px;
  color: #718096;
  font-weight: 500;
}

.value {
  font-size: 14px;
  color: #2d3748;
  font-weight: 600;
}

.value.mono {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.synced {
  background: #d4f4dd;
  color: #22c55e;
}

.status-badge.local {
  background: #fef3c7;
  color: #f59e0b;
}

/* 证明卡片 */
.proof-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: var(--shadow-md);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 20px;
}

.proof-section {
  margin-bottom: 24px;
}

.proof-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Commitment 项 */
.commitment-item {
  background: #f7fafc;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}

.commitment-item:last-child {
  margin-bottom: 0;
}

.commitment-label {
  font-size: 12px;
  color: #718096;
  font-weight: 500;
  margin-bottom: 6px;
}

.commitment-value {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #2d3748;
  word-break: break-all;
  margin-bottom: 8px;
}

/* 隐私说明 */
.privacy-note {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #ebf4ff;
  border-radius: 12px;
  border-left: 4px solid #667eea;
}

.note-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #667eea;
}

.note-text {
  font-size: 13px;
  color: #718096;
  line-height: 1.6;
}

.note-text strong {
  color: #667eea;
  font-weight: 600;
}

/* 操作按钮 */
.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.action-btn.sync {
  background: #667eea;
  color: white;
}

.action-btn.sync:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.sync:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.action-btn.export {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.action-btn.export:hover {
  background: #667eea;
  color: white;
  transform: translateY(-2px);
}

.icon-small {
  width: 18px;
  height: 18px;
}

.spinning {
  animation: spin 1s linear infinite;
}
</style>
