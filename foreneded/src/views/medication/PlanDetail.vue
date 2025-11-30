<template>
  <div class="plan-detail-page">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <button @click="goBack" class="back-btn">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="title">用药计划详情</h1>
      <div class="placeholder"></div>
    </div>

    <div class="content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <Loader2 class="spinner" />
        <p>加载计划中...</p>
      </div>

      <!-- 解密状态 -->
      <div v-else-if="decrypting" class="loading-state">
        <Loader2 class="spinner" />
        <p>解密中...</p>
        <p class="hint">正在使用您的私钥解密数据</p>
      </div>

      <!-- 计划详情 -->
      <div v-else-if="planData" class="plan-details">
        <!-- 计划信息卡片 -->
        <div class="info-card">
          <div class="card-header">
            <h2>{{ planData.plan_name }}</h2>
            <div class="status-badge" :class="plan?.status">
              {{ getStatusText(plan?.status || '') }}
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-label">诊断</div>
            <div class="info-value">{{ planData.diagnosis }}</div>
          </div>
          
          <div class="info-section">
            <div class="info-label">计划周期</div>
            <div class="info-value">
              {{ formatDate(planData.start_date) }} 至 {{ formatDate(planData.end_date) }}
            </div>
          </div>
          
          <div v-if="planData.notes" class="info-section">
            <div class="info-label">医嘱备注</div>
            <div class="info-value notes">{{ planData.notes }}</div>
          </div>
        </div>

        <!-- 药物列表 -->
        <div class="section-card">
          <div class="section-header">
            <h3>
              <Pill class="section-icon" />
              用药清单
            </h3>
            <div class="count-badge">{{ planData.medications.length }} 种</div>
          </div>
          
          <div class="medications-list">
            <div 
              v-for="(med, index) in planData.medications" 
              :key="index"
              class="medication-item"
            >
              <div class="med-number">{{ index + 1 }}</div>
              <div class="med-content">
                <div class="med-name">{{ med.medication_name }}</div>
                <div class="med-generic">{{ med.generic_name }}</div>
                
                <div class="med-details-grid">
                  <div class="detail-item">
                    <span class="label">
                      <Scale class="icon-mini" /> 剂量
                    </span>
                    <span class="value">{{ med.dosage }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">
                      <Calendar class="icon-mini" /> 频率
                    </span>
                    <span class="value">{{ med.frequency }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">
                      <Clock class="icon-mini" /> 疗程
                    </span>
                    <span class="value">{{ med.duration }}</span>
                  </div>
                </div>
                
                <div v-if="med.instructions" class="med-instructions">
                  <span class="label">
                    <FileText class="icon-mini" /> 用法：
                  </span>
                  <span>{{ med.instructions }}</span>
                </div>
                
                <div v-if="med.side_effects" class="med-warning">
                  <span class="label">
                    <AlertTriangle class="icon-mini" /> 副作用：
                  </span>
                  <span>{{ med.side_effects }}</span>
                </div>
                
                <div v-if="med.precautions" class="med-warning">
                  <span class="label">
                    <AlertCircle class="icon-mini" /> 注意事项：
                  </span>
                  <span>{{ med.precautions }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 提醒列表 -->
        <div v-if="planData.reminders && planData.reminders.length > 0" class="section-card">
          <div class="section-header">
            <h3>
              <Bell class="section-icon" />
              服药提醒
            </h3>
            <div class="count-badge">{{ planData.reminders.length }} 条</div>
          </div>
          
          <div class="reminders-list">
            <div 
              v-for="(reminder, index) in planData.reminders" 
              :key="index"
              class="reminder-item"
            >
              <div class="reminder-time">{{ reminder.reminder_time }}</div>
              <div class="reminder-content">
                <div class="reminder-med">{{ reminder.medication_name }}</div>
                <div class="reminder-message">{{ reminder.reminder_message }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 加密信息 -->
        <div class="encryption-info">
          <Lock class="encryption-icon" />
          <div class="encryption-text">
            <div class="encryption-title">端到端加密保护</div>
            <div class="encryption-desc">
              此计划使用ECDH加密，只有您可以解密查看完整内容
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div v-if="isDoctor" class="action-buttons">
          <button @click="editPlan" class="action-btn secondary">
            <Edit class="icon" />
            <span>编辑计划</span>
          </button>
          <button @click="deletePlan" class="action-btn danger">
            <Trash2 class="icon" />
            <span>删除计划</span>
          </button>
        </div>
      </div>

      <!-- 解密失败 -->
      <div v-else-if="decryptError" class="error-state">
        <XCircle class="error-icon" />
        <p class="error-message">{{ decryptError }}</p>
        <button @click="retryDecrypt" class="retry-btn">重试</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { medicationService, type MedicationPlan, type MedicationPlanData } from '@/service/medication';
import { authService } from '@/service/auth';
import { aaService } from '@/service/accountAbstraction';
import { secureExchangeService } from '@/service/secureExchange';
import { medicationPlanStorageService } from '@/service/medicationPlanStorage';
import { UserRole, UserRoleUtils } from '@/utils/userRoles';
import { 
  ArrowLeft, 
  Loader2, 
  Pill, 
  Scale, 
  Calendar, 
  Clock, 
  FileText, 
  AlertTriangle, 
  AlertCircle, 
  Bell, 
  Lock, 
  Edit, 
  Trash2, 
  XCircle 
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

// ==================== 状态管理 ====================

const loading = ref(false);
const decrypting = ref(false);
const plan = ref<MedicationPlan | null>(null);
const planData = ref<MedicationPlanData | null>(null);
const decryptError = ref('');
const isDoctor = ref(false);

// ==================== 生命周期 ====================

onMounted(async () => {
  // 检查用户角色
  const userInfo = await authService.getUserInfo();
  if (userInfo) {
    isDoctor.value = UserRoleUtils.hasRole(userInfo.roles, UserRole.DOCTOR);
  }
  
  await loadPlan();
});

// ==================== 方法 ====================

/**
 * 加载计划
 * 优先从本地存储加载，支持离线访问
 */
async function loadPlan() {
  try {
    loading.value = true;
    
    const planId = route.params.planId as string;
    if (!planId) {
      throw new Error('缺少计划ID');
    }
    
    console.log('📂 从本地加载计划:', planId);
    
    // 1. 优先从本地存储获取计划（支持离线）
    plan.value = await medicationPlanStorageService.getPlan(planId);
    
    if (plan.value) {
      console.log('  ✅ 本地计划加载成功');
    } else {
      // 2. 本地没有，尝试从服务器获取（可选）
      console.log('  本地无此计划，尝试从服务器获取...');
      try {
        plan.value = await medicationService.getPlan(planId);
        console.log('  ✅ 服务器计划加载成功');
        
        // 保存到本地以便下次离线使用
        await medicationPlanStorageService.savePlan(plan.value, '');
      } catch (error) {
        console.error('  ❌ 服务器加载失败:', error);
        throw new Error('计划不存在，请先同步计划列表');
      }
    }
    
    // 3. 尝试解密（离线可用，使用缓存的公钥）
    await decryptPlan();
  } catch (error: any) {
    console.error('❌ 加载计划失败:', error);
    decryptError.value = error.message || '加载计划失败';
  } finally {
    loading.value = false;
  }
}

/**
 * 解密计划
 */
async function decryptPlan() {
  try {
    if (!plan.value) return;
    
    decrypting.value = true;
    decryptError.value = '';
    
    console.log('🔓 开始解密计划...');
    
    // 1. 获取当前用户
    const currentUser = await authService.getUserInfo();
    if (!currentUser) {
      throw new Error('请先登录');
    }
    
    // 2. 获取当前用户的私钥
    const wallet = await aaService.getEOAWallet();
    if (!wallet) {
      throw new Error('无法获取钱包');
    }
    const myPrivateKey = wallet.privateKey;
    
    // 3. 确定对方的公钥（医生或患者）
    let peerAddress: string;
    if (currentUser.smart_account === plan.value.patient_address) {
      // 当前用户是患者，对方是医生
      peerAddress = plan.value.doctor_address;
    } else if (currentUser.smart_account === plan.value.doctor_address) {
      // 当前用户是医生，对方是患者
      peerAddress = plan.value.patient_address;
    } else {
      throw new Error('您无权查看此计划');
    }
    
    console.log('  当前用户:', currentUser.smart_account);
    console.log('  对方地址:', peerAddress);
    
    // 4. 获取对方的公钥（优先从缓存，支持完全离线）
    console.log('  获取对方公钥...');
    const peerPublicKey = await secureExchangeService.getRecipientPublicKey(peerAddress);
    console.log('  ✅ 对方公钥已获取');
    
    // 5. 解密
    console.log('  开始解密数据...');
    const decrypted = await medicationService.decryptPlanData(
      plan.value.encrypted_plan_data,
      myPrivateKey,
      peerPublicKey
    );
    
    planData.value = decrypted;
    console.log('✅ 解密成功');
  } catch (error: any) {
    console.error('❌ 解密失败:', error);
    
    // 提供更友好的错误提示
    if (error.message && error.message.includes('公钥')) {
      decryptError.value = '无法获取解密密钥，请先在线查看一次';
    } else {
      decryptError.value = '解密失败: ' + error.message;
    }
  } finally {
    decrypting.value = false;
  }
}

/**
 * 重试解密
 */
async function retryDecrypt() {
  await decryptPlan();
}

/**
 * 获取状态文本
 */
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    active: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
}

/**
 * 格式化日期
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * 编辑计划
 */
function editPlan() {
  // TODO: 实现编辑功能
  alert('编辑功能即将推出');
}

/**
 * 删除计划
 */
async function deletePlan() {
  if (!plan.value) return;
  
  if (!confirm('确定要删除此用药计划吗？')) {
    return;
  }
  
  try {
    await medicationService.deletePlan(plan.value.plan_id);
    alert('用药计划已删除');
    router.back();
  } catch (error: any) {
    console.error('删除计划失败:', error);
    alert('删除计划失败: ' + error.message);
  }
}

/**
 * 返回
 */
function goBack() {
  router.back();
}
</script>

<style scoped>
.plan-detail-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 20px;
}

/* 顶部导航栏 */
.top-bar {
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

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
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
  max-width: 800px;
  margin: 0 auto;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #718096;
}

.spinner {
  width: 40px;
  height: 40px;
  color: #667eea;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  margin: 12px 0;
  font-size: 16px;
}

.loading-state .hint {
  font-size: 13px;
  opacity: 0.8;
}

/* 错误状态 */
.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #718096;
}

.error-icon {
  width: 64px;
  height: 64px;
  color: #ef4444;
  margin-bottom: 20px;
}

.error-message {
  margin: 20px 0;
  font-size: 16px;
  color: #ef4444;
}

.retry-btn {
  padding: 12px 28px;
  border-radius: 12px;
  background: #667eea;
  color: white;
  border: none;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.retry-btn:hover {
  background: #5a67d8;
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* 计划详情 */
.plan-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 信息卡片 */
.info-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  color: #2d3748;
  font-weight: 700;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.completed {
  background: #f3f4f6;
  color: #4b5563;
}

.status-badge.cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.info-section {
  margin-bottom: 20px;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 13px;
  color: #718096;
  margin-bottom: 8px;
  font-weight: 500;
}

.info-value {
  font-size: 15px;
  color: #2d3748;
  line-height: 1.6;
}

.info-value.notes {
  background: #f7fafc;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

/* 区块卡片 */
.section-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2d3748;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  width: 20px;
  height: 20px;
  color: #667eea;
}

.count-badge {
  padding: 4px 10px;
  border-radius: 12px;
  background: #ebf4ff;
  color: #667eea;
  font-size: 12px;
  font-weight: 600;
}

/* 药物列表 */
.medications-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.medication-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.3s;
}

.medication-item:hover {
  border-color: #bfdbfe;
  box-shadow: var(--shadow-sm);
}

.med-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
}

.med-content {
  flex: 1;
}

.med-name {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 4px;
}

.med-generic {
  font-size: 13px;
  color: #718096;
  margin-bottom: 12px;
}

.med-details-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item .label {
  font-size: 12px;
  color: #718096;
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-item .value {
  font-size: 14px;
  color: #2d3748;
  font-weight: 500;
}

.icon-mini {
  width: 14px;
  height: 14px;
}

.med-instructions, .med-warning {
  font-size: 13px;
  color: #718096;
  line-height: 1.6;
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: white;
  border: 1px solid #e2e8f0;
}

.med-warning {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fee2e2;
}

.med-instructions .label, .med-warning .label {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

/* 提醒列表 */
.reminders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reminder-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  background: #fff5f5;
  border: 1px solid #ffc9c9;
}

.reminder-time {
  font-size: 20px;
  font-weight: bold;
  color: #ef4444;
  min-width: 60px;
}

.reminder-content {
  flex: 1;
}

.reminder-med {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.reminder-message {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 加密信息 */
.encryption-info {
  background: #667eea;
  border-radius: 20px;
  padding: 24px;
  color: white;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-md);
}

.encryption-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  opacity: 0.9;
}

.encryption-text {
  flex: 1;
}

.encryption-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.encryption-desc {
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.5;
}

/* 操作按钮 */
.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-btn {
  padding: 14px;
  border-radius: 16px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s;
}

.action-btn.secondary {
  background: white;
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.action-btn.secondary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}

.action-btn.danger {
  background: #fee2e2;
  color: #ef4444;
}

.action-btn.danger:hover {
  background: #fecaca;
  transform: translateY(-2px);
}
</style>
