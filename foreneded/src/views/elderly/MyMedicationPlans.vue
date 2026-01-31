<template>
  <div class="my-plans-page">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <button @click="goBack" class="back-btn">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="title">我的用药计划</h1>
      <button @click="refreshPlans" class="refresh-btn" :disabled="loading">
        <Loader2 v-if="loading" class="icon spinning" />
        <RefreshCw v-else class="icon" />
      </button>
    </div>

    <div class="content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <Loader2 class="spinner" />
        <p>加载中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="syncError" class="error-state">
        <AlertTriangle class="error-icon" />
        <p class="error-title">同步失败</p>
        <p class="error-message">{{ syncError }}</p>
        <button @click="retrySync" class="retry-btn">重试</button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="plans.length === 0" class="empty-state">
        <Pill class="empty-icon" />
        <p>暂无用药计划</p>
        <p class="hint">等待医生为您创建用药计划</p>
        <button @click="refreshPlans" class="refresh-btn-text">检查新计划</button>
      </div>

      <!-- 计划列表 -->
      <div v-else class="plans-list">
        <!-- 今日用药提示 -->
        <div v-if="todayTotalTasks > 0" class="today-reminder">
          <div class="reminder-icon">
            <AlarmClock class="icon-large" />
          </div>
          <div class="reminder-content">
            <div class="reminder-title">{{ todayPendingTasks > 0 ? '今日待服药' : '今日任务已完成' }}</div>
            <div class="reminder-count">{{ todayTasks }} 次</div>
            <div class="reminder-sub">已完成 {{ todayCompletedTasks }}/{{ todayTotalTasks }}</div>
          </div>
          <button @click="goToCheckIn" class="check-in-btn">去打卡</button>
        </div>

        <!-- 计划卡片 -->
        <div 
          v-for="plan in plans" 
          :key="plan.plan_id"
          class="plan-card"
          @click="viewPlan(plan)"
        >
          <div class="plan-header">
            <div class="plan-status" :class="plan.status">
              <span class="status-dot"></span>
              {{ getStatusText(plan.status) }}
            </div>
            <div class="plan-date">
              {{ formatDate(plan.created_at) }}
            </div>
          </div>

          <div class="plan-body">
            <!-- 医生信息 -->
            <div class="doctor-info">
              <div class="doctor-avatar">
                <Stethoscope class="icon-small" />
              </div>
              <div class="doctor-details">
                <div class="doctor-label">主治医生</div>
                <div class="doctor-name">
                  {{ getDoctorName(plan.doctor_address) }}
                </div>
              </div>
            </div>

            <!-- 计划信息（加密状态） -->
            <div class="plan-info">
              <div class="info-item">
                <Lock class="info-icon" />
                <span class="text">端到端加密保护</span>
              </div>
              <div class="info-item">
                <Calendar class="info-icon" />
                <span class="text">
                  {{ formatDate(plan.start_date) }} - {{ formatDate(plan.end_date) }}
                </span>
              </div>
              <div class="plan-progress">
                <div class="progress-text">
                  进度 {{ getPlanProgress(plan).percent }}% · 剩余 {{ getPlanProgress(plan).daysLeft }} 天
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: `${getPlanProgress(plan).percent}%` }"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="plan-footer">
            <button @click.stop="viewDetails(plan)" class="action-btn primary">
              查看详情
            </button>
            <button
              v-if="plan.status === 'active'"
              @click.stop="goToCheckInWithPlan(plan)"
              class="action-btn success"
            >
              立即打卡
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部导航 -->
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import BottomNav from '@/components/BottomNav.vue';
import { medicationService, type MedicationPlan } from '@/service/medication';
import { medicationPlanStorageService } from '@/service/medicationPlanStorage';
import { secureExchangeService } from '@/service/secureExchange';
import { authService } from '@/service/auth';
import { aaService } from '@/service/accountAbstraction';
import { checkinStorageService } from '@/service/checkinStorage';
import { memberInfoService, type MemberInfo } from '@/service/memberInfo';
import { uiService } from '@/service/ui';
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Pill,
  AlarmClock,
  Stethoscope,
  Lock,
  Calendar,
} from 'lucide-vue-next';

const router = useRouter();

// ==================== 状态管理 ====================

const loading = ref(false);
const plans = ref<MedicationPlan[]>([]);
const doctorNames = ref<Map<string, string>>(new Map());
const syncError = ref('');

const todayTotalTasks = ref(0);
const todayCompletedTasks = ref(0);
const todayPendingTasks = ref(0);

// ==================== 计算属性 ====================

const todayTasks = computed(() => {
  return todayPendingTasks.value;
});

// ==================== 生命周期 ====================

onMounted(async () => {
  await loadPlans();
  await loadDoctorNames();
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

// ==================== 方法 ====================

/**
 * 加载用药计划列表
 * 策略：优先从本地加载，后台同步最新数据
 */
async function loadPlans() {
  try {
    loading.value = true;
    syncError.value = '';
    
    const user = await authService.getUserInfo();
    if (!user) {
      throw new Error('请先登录');
    }
    
    // 1. 先从本地加载（快速显示）
    console.log('📂 从本地加载用药计划...');
    const localPlans = await medicationPlanStorageService.getAllPlans();
    if (localPlans.length > 0) {
      plans.value = localPlans;
      console.log('  ✅ 本地加载:', localPlans.length, '个计划');
    }
    
    // 2. 检查是否需要同步
    const shouldSync = await medicationPlanStorageService.shouldSync();
    console.log('  同步检查:', shouldSync ? '需要同步' : '无需同步');
    console.log('  本地计划数量:', localPlans.length);
    
    // 3. 尝试检查新消息（确保不错过医生发送的新计划）
    // 注意：同步失败不应该影响本地数据的显示
    console.log('  尝试检查服务器新消息...');
    try {
      await syncPlansFromServer();
      console.log('  ✅ 服务器同步成功');
    } catch (syncError: any) {
      console.warn('  ⚠️ 服务器同步失败（可能离线）:', syncError.message);
      // 同步失败不影响本地数据显示，继续执行
    }
    
    // 4. 批量解密计划（缓存医生公钥，支持后续离线使用）
    if (plans.value.length > 0) {
      console.log('🔓 开始解密计划并缓存公钥...');
      await decryptAllPlans();
    }

    // 4.1 计算今日待服药次数（基于提醒 + 本地打卡记录）
    await updateTodayTaskStats();
    
    // 5. 显示统计信息
    const stats = await medicationPlanStorageService.getStatistics();
    console.log('📊 计划统计:', stats);
    
  } catch (error: any) {
    console.error('❌ 加载用药计划失败:', error);
    // 只有当本地加载也失败时才显示错误
    if (plans.value.length === 0) {
      syncError.value = error.message || '加载失败，请重试';
    }
  } finally {
    loading.value = false;
  }
}

function formatLocalDateOnly(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateOnly(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(`${dateStr}T00:00:00`);
}

function isDateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  const d = parseDateOnly(dateStr);
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  d.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

async function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') return;
  await updateTodayTaskStats();
}

function isReminderActiveToday(reminderDays: string | undefined, date: Date = new Date()): boolean {
  if (!reminderDays || reminderDays === 'everyday') return true;
  const day = date.getDay(); // 0=Sun ... 6=Sat
  if (reminderDays === 'weekdays') return day >= 1 && day <= 5;
  if (reminderDays === 'weekends') return day === 0 || day === 6;
  return true;
}

async function updateTodayTaskStats(): Promise<void> {
  todayTotalTasks.value = 0;
  todayCompletedTasks.value = 0;
  todayPendingTasks.value = 0;

  try {
    const todayKey = formatLocalDateOnly(new Date());

    const activePlans = plans.value.filter(p => p.status === 'active');
    if (activePlans.length === 0) return;

    const wallet = await aaService.getEOAWallet();
    if (!wallet) return;

    const allRecords = await checkinStorageService.getAllRecords();
    const todayRecords = allRecords.filter(r => formatLocalDateOnly(new Date(r.timestamp)) === todayKey);
    const checkinCountByCode = new Map<string, number>();
    for (const r of todayRecords) {
      if (!r?.medication_code) continue;
      checkinCountByCode.set(r.medication_code, (checkinCountByCode.get(r.medication_code) || 0) + 1);
    }
    const expectedCountByCode = new Map<string, number>();
    for (const plan of activePlans) {
      if (!plan.start_date || !plan.end_date) continue;
      if (!isDateInRange(todayKey, plan.start_date, plan.end_date)) continue;

      try {
        const doctorPublicKey = await secureExchangeService.getRecipientPublicKey(plan.doctor_address);
        const planData = await medicationService.decryptPlanData(
          plan.encrypted_plan_data,
          wallet.privateKey,
          doctorPublicKey
        );

        const reminders = planData?.reminders || [];
        for (const reminder of reminders) {
          if (!isReminderActiveToday(reminder?.reminder_days, new Date())) continue;
          const code = reminder?.medication_code;
          if (!code) continue;
          expectedCountByCode.set(code, (expectedCountByCode.get(code) || 0) + 1);
        }
      } catch (error: any) {
        console.warn(`⚠️ 统计提醒失败（计划 ${plan.plan_id}）:`, error?.message || error);
      }
    }

    let total = 0;
    let completed = 0;
    expectedCountByCode.forEach((expected, code) => {
      total += expected;
      completed += Math.min(expected, checkinCountByCode.get(code) || 0);
    });

    todayTotalTasks.value = total;
    todayCompletedTasks.value = completed;
    todayPendingTasks.value = Math.max(0, total - completed);
  } catch (error: any) {
    console.warn('⚠️ 计算今日待服药统计失败:', error?.message || error);
  }
}

function getPlanProgress(plan: MedicationPlan): { percent: number; daysLeft: number; daysTotal: number } {
  try {
    if (!plan.start_date || !plan.end_date) return { percent: 0, daysLeft: 0, daysTotal: 0 };

    if (plan.status === 'completed') {
      const daysTotal = Math.max(1, Math.floor((parseDateOnly(plan.end_date).getTime() - parseDateOnly(plan.start_date).getTime()) / 86400000) + 1);
      return { percent: 100, daysLeft: 0, daysTotal };
    }

    const start = parseDateOnly(plan.start_date);
    const end = parseDateOnly(plan.end_date);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const daysTotal = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
    const elapsed = Math.max(0, Math.min(daysTotal, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1));
    const percent = Math.max(0, Math.min(100, Math.round((elapsed / daysTotal) * 100)));
    const daysLeft = Math.max(0, daysTotal - elapsed);
    return { percent, daysLeft, daysTotal };
  } catch {
    return { percent: 0, daysLeft: 0, daysTotal: 0 };
  }
}

/**
 * 批量解密所有计划
 * 目的：缓存所有医生的公钥，支持后续完全离线使用
 */
async function decryptAllPlans() {
  try {
    console.log('  批量解密', plans.value.length, '个计划...');
    
    // 获取钱包
    const wallet = await aaService.getEOAWallet();
    if (!wallet) {
      console.warn('  ⚠️ 无法获取钱包，跳过解密');
      return;
    }
    
    let successCount = 0;
    
    for (const plan of plans.value) {
      try {
        // 获取医生公钥（会自动缓存）
        console.log(`    📥 获取医生公钥: ${plan.doctor_address.slice(0, 10)}...`);
        const doctorPublicKey = await secureExchangeService.getRecipientPublicKey(
          plan.doctor_address
        );
        
        // 解密计划（验证数据完整性）
        await medicationService.decryptPlanData(
          plan.encrypted_plan_data,
          wallet.privateKey,
          doctorPublicKey
        );
        
        successCount++;
        console.log(`    ✅ 计划 ${plan.plan_id} 解密成功，公钥已缓存`);
        
      } catch (error: any) {
        console.warn(`    ⚠️ 计划 ${plan.plan_id} 解密失败:`, error.message);
        // 单个计划失败不影响其他
      }
    }
    
    console.log(`  ✅ 解密完成: ${successCount}/${plans.value.length} 个计划`);
    console.log(`  💾 已缓存 ${successCount} 个医生的公钥，现在可以完全离线使用！`);
    
  } catch (error: any) {
    console.error('  ❌ 批量解密失败:', error);
    // 解密失败不影响计划列表显示
  }
}

/**
 * 从服务器同步用药计划
 */
async function syncPlansFromServer() {
  try {
    console.log('🔄 从服务器同步用药计划...');
    
    // 1. 查询 medication_plan 类型的消息
    console.log('  步骤1: 查询消息...');
    const messages = await secureExchangeService.getPendingMessages('medication_plan');
    console.log('  收到消息数量:', messages.length);
    
    if (messages.length === 0) {
      console.log('  暂无新的用药计划消息');
      return;
    }
    
    // 2. 获取本地已有的计划ID，避免重复获取
    const existingPlans = await medicationPlanStorageService.getAllPlans();
    const existingPlanIds = new Set(existingPlans.map(p => p.plan_id));
    console.log('  本地已有计划ID:', Array.from(existingPlanIds));
    
    // 3. 从每条消息中获取计划详情并保存到本地
    console.log('  步骤2: 获取计划详情...');
    const plansToSave: Array<{ plan: MedicationPlan; messageId: string }> = [];
    const errors: string[] = [];
    
    for (const msg of messages) {
      try {
        const planId = msg.metadata?.plan_id;
        if (!planId) {
          const error = `消息 ${msg.message_id} 缺少 plan_id`;
          console.warn('  ⚠️', error);
          errors.push(error);
          continue;
        }
        
        // 检查是否已经存在
        if (existingPlanIds.has(planId)) {
          console.log('    ⏭️  计划已存在，跳过:', planId);
          continue;
        }
        
        console.log('    📥 获取新计划详情:', planId);
        const plan = await medicationService.getPlan(planId);
        
        plansToSave.push({
          plan,
          messageId: msg.message_id,
        });
        
        console.log('    ✅ 计划获取成功:', plan.plan_id);
      } catch (error: any) {
        const errorMsg = `获取计划失败: ${error.message}`;
        console.error('    ❌', errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // 3. 批量保存到本地
    if (plansToSave.length > 0) {
      console.log('  步骤3: 保存到本地存储...');
      await medicationPlanStorageService.savePlans(plansToSave);
      console.log('    ✅ 本地保存完成');
      
      // 4. 更新显示
      console.log('  步骤4: 更新显示...');
      plans.value = await medicationPlanStorageService.getAllPlans();
      console.log('✅ 同步完成:', plansToSave.length, '个计划');
    }
    
    // 如果有错误但也有成功的，显示部分成功的提示
    if (errors.length > 0 && plansToSave.length > 0) {
      console.warn('⚠️ 部分计划同步失败:', errors);
    } else if (errors.length > 0) {
      throw new Error(`同步失败: ${errors[0]}`);
    }
    
  } catch (error: any) {
    console.error('❌ 同步用药计划失败:', error);
    console.error('  错误详情:', {
      message: error.message,
      stack: error.stack,
      error: error
    });
    throw error; // 重新抛出错误，让外层捕获
  }
}

/**
 * 手动刷新计划
 */
async function refreshPlans() {
  syncError.value = '';
  await loadPlans();
}

/**
 * 重试同步
 */
async function retrySync() {
  syncError.value = '';
  loading.value = true;
  try {
    // 先刷新本地数据显示
    const localPlans = await medicationPlanStorageService.getAllPlans();
    if (localPlans.length > 0) {
      plans.value = localPlans;
    }
    
    // 尝试同步服务器
    await syncPlansFromServer();
    console.log('✅ 重试同步成功');
  } catch (error: any) {
    console.warn('⚠️ 重试同步失败:', error.message);
    // 如果本地有数据，不显示错误
    if (plans.value.length === 0) {
      syncError.value = error.message || '同步失败，请检查网络连接';
    }
  } finally {
    loading.value = false;
  }
}

/**
 * 加载医生姓名
 */
async function loadDoctorNames() {
  try {
    const members = await memberInfoService.getAllMemberInfo();
    members.forEach((member: MemberInfo) => {
      doctorNames.value.set(member.smart_account, member.username);
    });
  } catch (error) {
    console.error('加载医生姓名失败:', error);
  }
}

/**
 * 获取医生姓名
 */
function getDoctorName(address: string): string {
  return doctorNames.value.get(address) || formatAddress(address);
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
 * 格式化地址
 */
function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * 查看计划
 */
function viewPlan(plan: MedicationPlan) {
  viewDetails(plan);
}

/**
 * 查看详情
 */
function viewDetails(plan: MedicationPlan) {
  router.push(`/medication/plan/${plan.plan_id}`);
}

/**
 * 去打卡
 */
function goToCheckIn() {
  router.push('/elderly/medication-checkin');
}

/**
 * 带计划去打卡
 */
function goToCheckInWithPlan(plan: MedicationPlan) {
  if (plan.status !== 'active') {
    uiService.toast('该用药计划已结束，无法继续打卡', { type: 'warning' });
    return;
  }
  router.push({
    path: '/elderly/medication-checkin',
    query: { planId: plan.plan_id }
  });
}

/**
 * 返回
 */
function goBack() {
  router.back();
}
</script>

<style scoped>
.my-plans-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 80px;
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

.title {
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.refresh-btn {
  background: transparent;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  color: white;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  width: 24px;
  height: 24px;
}

.spinning {
  animation: spin 1s linear infinite;
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

/* 错误状态 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.error-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 20px;
  color: #ef4444;
  animation: shake 0.5s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.error-title {
  font-size: 18px;
  font-weight: 600;
  color: #ef4444;
  margin-bottom: 12px;
}

.error-message {
  color: white;
  opacity: 0.9;
  margin-bottom: 24px;
  max-width: 280px;
  line-height: 1.5;
}

.retry-btn {
  background: white;
  color: #667eea;
  border: none;
  padding: 12px 32px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: all 0.3s;
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
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

.empty-state p {
  margin: 12px 0;
  font-size: 16px;
}

.empty-state .hint {
  font-size: 14px;
  opacity: 0.8;
}

.refresh-btn-text {
  margin-top: 20px;
  background: white;
  color: #667eea;
  border: none;
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.refresh-btn-text:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* 计划列表 */
.plans-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 今日提醒 */
.today-reminder {
  background: #f59e0b;
  border-radius: 20px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 16px rgba(251, 191, 36, 0.3);
  animation: pulse-reminder 2s ease-in-out infinite;
}

.action-btn.success {
  background: #22c55e;
  color: white;
}

.action-btn.success:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

 .reminder-sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
 }

 .plan-progress {
  margin-top: 10px;
 }

 .progress-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 6px;
 }

 .progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  overflow: hidden;
 }

 .progress-fill {
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 999px;
 }
</style>
