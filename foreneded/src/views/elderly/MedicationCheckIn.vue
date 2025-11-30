<template>
  <div class="checkin-page">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <button @click="goBack" class="back-btn">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="title">用药打卡</h1>
      <button @click="goToHistory" class="history-btn">
        <ClipboardList class="icon" />
      </button>
    </div>

    <div class="content">
      <!-- 打卡方式选择 -->
      <div class="checkin-modes">
        <div 
          class="mode-card"
          :class="{ active: checkInMode === 'scan' }"
          @click="checkInMode = 'scan'"
        >
          <div class="mode-icon-wrapper">
            <Camera class="mode-icon" />
          </div>
          <div class="mode-title">扫码打卡</div>
          <div class="mode-desc">扫描药品二维码</div>
        </div>
        <div 
          class="mode-card"
          :class="{ active: checkInMode === 'manual' }"
          @click="checkInMode = 'manual'"
        >
          <div class="mode-icon-wrapper">
            <PenTool class="mode-icon" />
          </div>
          <div class="mode-title">手动打卡</div>
          <div class="mode-desc">从列表选择药物</div>
        </div>
      </div>

      <!-- 扫码模式 -->
      <div v-if="checkInMode === 'scan'" class="scan-mode">
        <div class="scan-container">
          <div class="scan-frame">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="corner bottom-left"></div>
            <div class="corner bottom-right"></div>
            <div class="scan-line"></div>
          </div>
          <p class="scan-hint">将二维码对准扫描框</p>
        </div>
        
        <button @click="startScan" class="scan-btn" :disabled="scanning">
          <Loader2 v-if="scanning" class="spinner-small" />
          <span v-else>开始扫描</span>
        </button>
      </div>

      <!-- 手动模式 -->
      <div v-else class="manual-mode">
        <!-- 今日待服药列表 -->
        <div v-if="todayMedications.length > 0" class="today-section">
          <h2 class="section-title">
            <Calendar class="section-icon" />
            今日待服药
          </h2>
          <div class="medications-list">
            <div 
              v-for="med in todayMedications"
              :key="med.medication_code"
              class="medication-card"
              @click="selectMedication(med)"
            >
              <div class="med-time">{{ med.reminder_time }}</div>
              <div class="med-info">
                <div class="med-name">{{ med.medication_name }}</div>
                <div class="med-dosage">{{ med.dosage }}</div>
              </div>
              <div class="med-action">
                <button class="checkin-btn">打卡</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 所有药物列表 -->
        <div class="all-section">
          <h2 class="section-title">
            <Pill class="section-icon" />
            所有药物
          </h2>
          <div v-if="allMedications.length === 0" class="empty-medications">
            <p>暂无用药计划</p>
            <button @click="goToPlans" class="view-plans-btn">查看计划</button>
          </div>
          <div v-else class="medications-grid">
            <div 
              v-for="med in allMedications"
              :key="med.medication_code"
              class="med-item"
              @click="selectMedication(med)"
            >
              <div class="med-icon-circle">
                <Pill class="med-icon" />
              </div>
              <div class="med-name">{{ med.medication_name }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 打卡成功提示 -->
      <div v-if="showSuccess" class="success-overlay" @click="showSuccess = false">
        <div class="success-card" @click.stop>
          <div class="success-icon-wrapper">
            <CheckCircle class="success-icon" />
          </div>
          <h2 class="success-title">打卡成功！</h2>
          <p class="success-message">{{ successMessage }}</p>
          <div class="success-time">{{ currentTime }}</div>
          <div class="success-actions">
            <button @click="continueCheckIn" class="action-btn secondary">
              继续打卡
            </button>
            <button v-if="lastCheckInRecord?.proof" @click="viewProofDetail" class="action-btn primary">
              查看证明
            </button>
            <button v-else @click="viewHistory" class="action-btn primary">
              查看记录
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { medicationService, type MedicationPlanData, type MedicationDetail } from '@/service/medication';
import { authService } from '@/service/auth';
import { aaService } from '@/service/accountAbstraction';
import { secureExchangeService } from '@/service/secureExchange';
import { medicationPlanStorageService } from '@/service/medicationPlanStorage';
import { checkinStorageService } from '@/service/checkinStorage';
import { 
  ArrowLeft, 
  ClipboardList, 
  Camera, 
  PenTool, 
  Loader2, 
  Calendar, 
  Pill, 
  CheckCircle 
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

// ==================== 状态管理 ====================

const checkInMode = ref<'scan' | 'manual'>('scan');
const scanning = ref(false);
const showSuccess = ref(false);
const successMessage = ref('');
const currentTime = ref('');
const lastCheckInRecord = ref<any>(null);

// 药物数据
const todayMedications = ref<any[]>([]);
const allMedications = ref<MedicationDetail[]>([]);

// ==================== 生命周期 ====================

onMounted(async () => {
  await loadMedications();
  
  // 如果有planId参数，自动加载该计划的药物
  const planId = route.query.planId as string;
  if (planId) {
    await loadPlanMedications(planId);
    checkInMode.value = 'manual'; // 切换到手动模式以便查看药物
  }
});

// ==================== 方法 ====================

/**
 * 加载药物列表
 * 从本地存储加载用药计划并提取药物信息
 */
async function loadMedications() {
  try {
    const userInfo = await authService.getUserInfo();
    if (!userInfo) return;
    
    // 从本地存储获取活动的用药计划
    console.log('📂 从本地加载用药计划...');
    const plans = await medicationPlanStorageService.getActivePlans();
    
    if (plans.length === 0) {
      console.log('暂无活动的用药计划');
      return;
    }
    
    console.log('  ✅ 加载到', plans.length, '个活动计划');
    
    // 解密所有计划并提取药物
    const wallet = await aaService.getEOAWallet();
    if (!wallet) return;
    
    const allMeds: MedicationDetail[] = [];
    const todayMeds: any[] = [];
    
    for (const plan of plans) {
      try {
        // 获取医生公钥（优先从缓存，支持完全离线）
        console.log('  获取医生公钥:', plan.doctor_address);
        const doctorPublicKey = await secureExchangeService.getRecipientPublicKey(
          plan.doctor_address
        );
        console.log('  ✅ 公钥已获取');
        
        // 解密计划
        console.log('  解密计划数据...');
        const planData = await medicationService.decryptPlanData(
          plan.encrypted_plan_data,
          wallet.privateKey,
          doctorPublicKey
        );
        console.log('  ✅ 计划解密成功');
        
        // 添加药物到列表
        allMeds.push(...planData.medications);
        
        // 提取今日提醒
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        
        planData.reminders.forEach(reminder => {
          const [hour, minute] = reminder.reminder_time.split(':').map(Number);
          const reminderTime = hour * 60 + minute;
          
          // 在提醒时间前后30分钟内显示
          if (Math.abs(currentTime - reminderTime) <= 30) {
            const med = planData.medications.find(
              m => m.medication_code === reminder.medication_code
            );
            if (med) {
              todayMeds.push({
                ...med,
                reminder_time: reminder.reminder_time,
                reminder_message: reminder.reminder_message,
              });
            }
          }
        });
      } catch (error: any) {
        console.error('❌ 解密计划失败:', plan.plan_id, error);
        // 单个计划失败不影响其他计划
        if (error.message && error.message.includes('公钥')) {
          console.warn('  ⚠️ 无法获取公钥，请先在线查看一次');
        }
      }
    }
    
    allMedications.value = allMeds;
    todayMedications.value = todayMeds;
    
    console.log('  今日待服药:', todayMeds.length, '个');
    console.log('  所有药物:', allMeds.length, '个');
  } catch (error) {
    console.error('❌ 加载药物失败:', error);
  }
}

/**
 * 加载指定计划的药物
 */
async function loadPlanMedications(planId: string) {
  try {
    const plan = await medicationService.getPlan(planId);
    const wallet = await aaService.getEOAWallet();
    if (!wallet) return;
    
    const doctorPublicKey = await secureExchangeService.getRecipientPublicKey(
      plan.doctor_address
    );
    
    const planData = await medicationService.decryptPlanData(
      plan.encrypted_plan_data,
      wallet.privateKey,
      doctorPublicKey
    );
    
    allMedications.value = planData.medications;
  } catch (error) {
    console.error('加载计划药物失败:', error);
  }
}

/**
 * 开始扫描
 */
async function startScan() {
  scanning.value = true;
  
  try {
    // TODO: 集成实际的扫码功能
    // 模拟扫码延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 模拟扫描成功
    const mockMedication = {
      medication_code: 'MED001',
      medication_name: '阿司匹林肠溶片',
      dosage: '100mg',
    };
    
    await performCheckIn(mockMedication);
  } catch (error: any) {
    console.error('扫码失败:', error);
    alert('扫码失败: ' + error.message);
  } finally {
    scanning.value = false;
  }
}

/**
 * 选择药物
 */
async function selectMedication(medication: any) {
  await performCheckIn(medication);
}

/**
 * 执行打卡（支持离线）
 */
async function performCheckIn(medication: any) {
  try {
    console.log('💊 开始打卡:', medication.medication_name);
    
    // 1. 获取用户地址
    const userInfo = await authService.getUserInfo();
    if (!userInfo) {
      throw new Error('请先登录');
    }
    
    // 2. 创建打卡记录（包含ZKP数据，本地生成）
    console.log('  📝 创建打卡记录...');
    const record = await checkinStorageService.createCheckInRecord(
      userInfo.smart_account,
      medication.medication_code,
      medication.medication_name,
      medication.dosage
    );
    
    // 3. 保存到本地存储（离线可用）
    console.log('  💾 保存到本地...');
    await checkinStorageService.saveCheckInRecord(record);
    console.log('  ✅ 本地保存成功');
    
    // 4. 尝试同步到服务器（如果在线）
    try {
      console.log('  🔄 尝试同步到服务器...');
      await syncCheckInToServer(record);
      console.log('  ✅ 服务器同步成功');
    } catch (syncError) {
      console.warn('  ⚠️ 服务器同步失败（将在下次联网时重试）:', syncError);
      // 离线时同步失败是正常的，不影响打卡成功
    }
    
    // 5. 保存最后的打卡记录（用于查看证明）
    lastCheckInRecord.value = {
      ...record,
      medicationName: medication.medication_name,
      dosage: medication.dosage,
      timestamp: Date.now(),
    };
    
    // 6. 显示成功提示
    successMessage.value = `已完成 ${medication.medication_name} 打卡`;
    const now = new Date();
    currentTime.value = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    showSuccess.value = true;
    
    console.log('✅ 打卡完成');
  } catch (error: any) {
    console.error('❌ 打卡失败:', error);
    alert('打卡失败: ' + error.message);
  }
}

/**
 * 同步打卡记录到服务器
 */
async function syncCheckInToServer(record: any) {
  // TODO: 实现服务器同步逻辑
  // 这里应该调用后端API保存打卡记录
  // 如果成功，更新record的synced状态
  
  // 模拟网络请求
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      // 模拟网络检查
      if (navigator.onLine) {
        resolve(true);
      } else {
        reject(new Error('网络不可用'));
      }
    }, 500);
  });
  
  // 更新同步状态
  // 注意：实际实现需要调用后端API并更新本地记录
  console.log('    记录ID:', record.id, '已标记为已同步');
}

/**
 * 继续打卡
 */
function continueCheckIn() {
  showSuccess.value = false;
  successMessage.value = '';
}

/**
 * 查看证明详情
 */
function viewProofDetail() {
  if (!lastCheckInRecord.value) return;
  
  const proofJson = encodeURIComponent(JSON.stringify(lastCheckInRecord.value));
  router.push({
    name: 'CheckinProofDetail',
    query: { proof: proofJson }
  });
}

/**
 * 查看记录
 */
function viewHistory() {
  router.push('/elderly/checkin-records');
}

/**
 * 去历史记录
 */
function goToHistory() {
  router.push('/elderly/checkin-records');
}

/**
 * 去计划列表
 */
function goToPlans() {
  router.push('/elderly/my-medication-plans');
}

/**
 * 返回
 */
function goBack() {
  router.back();
}
</script>

<style scoped>
.checkin-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 20px;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #667eea;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.back-btn, .history-btn {
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
}

.back-btn:hover, .history-btn:hover {
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

/* 内容区域 */
.content {
  padding: 20px;
}

/* 打卡方式选择 */
.checkin-modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.mode-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  position: relative;
  overflow: hidden;
}

.mode-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.mode-card.active {
  border-color: #667eea;
  background: #f0fdfa;
  box-shadow: 0 10px 15px -3px rgba(102, 126, 234, 0.1), 0 4px 6px -2px rgba(102, 126, 234, 0.05);
}

.mode-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--primary-50);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: var(--color-primary);
}

.mode-icon {
  width: 32px;
  height: 32px;
}

.mode-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.mode-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 扫码模式 */
.scan-mode {
  background: white;
  border-radius: 24px;
  padding: 40px 20px;
  text-align: center;
  box-shadow: var(--shadow-lg);
}

.scan-container {
  margin-bottom: 32px;
}

.scan-frame {
  width: 70vw;
  height: 70vw;
  max-width: 280px;
  max-height: 280px;
  margin: 0 auto 20px;
  position: relative;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 24px;
  overflow: hidden;
}

.corner {
  position: absolute;
  width: 40px;
  height: 40px;
}

.corner::before {
  content: '';
  position: absolute;
  background: var(--color-primary);
}

.corner.top-left {
  top: 10px;
  left: 10px;
}

.corner.top-left::before {
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
}

.corner.top-left::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: var(--color-primary);
}

.corner.top-right {
  top: 10px;
  right: 10px;
}

.corner.top-right::before {
  top: 0;
  right: 0;
  width: 100%;
  height: 3px;
}

.corner.top-right::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 3px;
  height: 100%;
  background: var(--color-primary);
}

.corner.bottom-left {
  bottom: 10px;
  left: 10px;
}

.corner.bottom-left::before {
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
}

.corner.bottom-left::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: var(--color-primary);
}

.corner.bottom-right {
  bottom: 10px;
  right: 10px;
}

.corner.bottom-right::before {
  bottom: 0;
  right: 0;
  width: 100%;
  height: 3px;
}

.corner.bottom-right::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 3px;
  height: 100%;
  background: var(--color-primary);
}

.scan-line {
  position: absolute;
  width: 80%;
  height: 2px;
  background: #667eea;
  left: 10%;
  top: 50%;
  animation: scan 2s ease-in-out infinite;
}

@keyframes scan {
  0%, 100% {
    top: 20%;
  }
  50% {
    top: 80%;
  }
}

.scan-hint {
  color: var(--text-secondary);
  font-size: 14px;
}

.scan-btn {
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  background: #667eea;
  color: white;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.scan-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.spinner-small {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 手动模式 */
.manual-mode {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  color: #2d3748;
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  width: 20px;
  height: 20px;
  color: #667eea;
}

.today-section {
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--shadow-md);
}

.today-section .section-title {
  color: var(--text-primary);
}

.medications-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.medication-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  background: #fff5f5;
  border: 2px solid #ffc9c9;
  cursor: pointer;
  transition: all 0.3s;
}

.medication-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.2);
}

.med-time {
  font-size: 20px;
  font-weight: bold;
  color: #ff6b6b;
  min-width: 60px;
}

.med-info {
  flex: 1;
}

.med-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.med-dosage {
  font-size: 13px;
  color: var(--text-secondary);
}

.med-action .checkin-btn {
  padding: 8px 20px;
  border-radius: 12px;
  background: #e53e3e;
  color: white;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.all-section {
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--shadow-md);
}

.all-section .section-title {
  color: var(--text-primary);
}

.empty-medications {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.view-plans-btn {
  margin-top: 12px;
  padding: 8px 16px;
  background: var(--primary-100);
  color: var(--color-primary);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.medications-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
}

.med-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 16px;
  background: var(--bg-body);
  cursor: pointer;
  transition: all 0.2s;
}

.med-item:hover {
  background: var(--primary-50);
}

.med-icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  color: var(--color-primary);
}

.med-icon {
  width: 24px;
  height: 24px;
}

.med-item .med-name {
  font-size: 14px;
  text-align: center;
}

/* 打卡成功提示 */
.success-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.success-card {
  background: white;
  width: 85%;
  max-width: 320px;
  border-radius: 24px;
  padding: 30px;
  text-align: center;
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.success-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #d4f4dd;
  color: #22c55e;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.success-icon {
  width: 40px;
  height: 40px;
}

.success-title {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.success-message {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.success-time {
  font-size: 32px;
  font-weight: bold;
  color: var(--color-primary);
  margin-bottom: 24px;
}

.success-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn.primary {
  background: #667eea;
  color: white;
}

.action-btn.secondary {
  background: var(--bg-body);
  color: var(--text-primary);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
</style>
