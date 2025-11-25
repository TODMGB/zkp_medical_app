<template>
  <div class="medication-plans-page">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <button @click="goBack" class="back-btn">
        <span class="icon">←</span>
      </button>
      <h1 class="title">我的用药计划</h1>
      <button @click="createPlan" class="add-btn">
        <span class="icon">+</span>
      </button>
    </div>

    <div class="content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="plans.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <p>暂无用药计划</p>
        <p class="hint">点击右上角"+"创建新计划</p>
        <button @click="createPlan" class="create-btn">
          <span class="icon">+</span>
          <span>创建用药计划</span>
        </button>
      </div>

      <!-- 计划列表 -->
      <div v-else class="plans-list">
        <div 
          v-for="plan in plans" 
          :key="plan.plan_id"
          @click="viewPlan(plan)"
          class="plan-card"
        >
          <div class="plan-header">
            <div class="plan-status" :class="plan.status">
              {{ getStatusText(plan.status) }}
            </div>
            <div class="plan-date">{{ formatDate(plan.created_at) }}</div>
          </div>
          
          <div class="plan-body">
            <div class="patient-info">
              <div class="patient-avatar">
                {{ getPatientInitial(plan.patient_address) }}
              </div>
              <div class="patient-details">
                <div class="patient-name">
                  {{ getPatientName(plan.patient_address) }}
                </div>
                <div class="patient-address">
                  {{ formatAddress(plan.patient_address) }}
                </div>
              </div>
            </div>
            
            <div class="plan-info">
              <div class="info-item">
                <span class="label">🔐</span>
                <span class="value">端到端加密</span>
              </div>
              <div class="info-item">
                <span class="label">📅</span>
                <span class="value">
                  {{ formatDate(plan.start_date) }} - {{ formatDate(plan.end_date) }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="plan-footer">
            <button @click.stop="viewDetails(plan)" class="action-btn primary">
              查看详情
            </button>
            <button @click.stop="editPlan(plan)" class="action-btn secondary">
              编辑
            </button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="pagination">
        <button 
          @click="prevPage" 
          :disabled="currentPage === 1"
          class="page-btn"
        >
          上一页
        </button>
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button 
          @click="nextPage" 
          :disabled="currentPage === totalPages"
          class="page-btn"
        >
          下一页
        </button>
      </div>
    </div>

    <!-- 底部导航 -->
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { medicationService, type MedicationPlan } from '@/service/medication';
import { authService } from '@/service/auth';
import { memberInfoService } from '@/service/memberInfo';
import BottomNav from '@/components/BottomNav.vue';

const router = useRouter();

// ==================== 状态管理 ====================

const loading = ref(false);
const plans = ref<MedicationPlan[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const patientNames = ref<Map<string, string>>(new Map());

// ==================== 计算属性 ====================

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

// ==================== 生命周期 ====================

onMounted(async () => {
  await loadPlans();
  await loadPatientNames();
});

// ==================== 方法 ====================

/**
 * 加载用药计划列表
 */
async function loadPlans() {
  try {
    loading.value = true;
    
    const user = await authService.getUserInfo();
    if (!user) {
      throw new Error('请先登录');
    }
    
    const result = await medicationService.getDoctorPlans(
      user.smart_account,
      currentPage.value,
      pageSize.value
    );
    
    plans.value = result.plans || [];
    total.value = result.total || 0;
    
    console.log('用药计划列表:', plans.value);
  } catch (error: any) {
    console.error('加载用药计划失败:', error);
    alert('加载用药计划失败: ' + error.message);
  } finally {
    loading.value = false;
  }
}

/**
 * 加载患者姓名
 */
async function loadPatientNames() {
  try {
    const members = await memberInfoService.getAllMemberInfo();
    members.forEach(member => {
      patientNames.value.set(member.smart_account, member.username);
    });
  } catch (error) {
    console.error('加载患者姓名失败:', error);
  }
}

/**
 * 获取患者姓名
 */
function getPatientName(address: string): string {
  return patientNames.value.get(address) || '未知患者';
}

/**
 * 获取患者首字母
 */
function getPatientInitial(address: string): string {
  const name = getPatientName(address);
  return name.charAt(0) || '患';
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
 * 创建新计划
 */
function createPlan() {
  router.push('/doctor/create-medication-plan');
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
 * 编辑计划
 */
function editPlan(plan: MedicationPlan) {
  // TODO: 实现编辑功能
  alert('编辑功能即将推出');
}

/**
 * 上一页
 */
async function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    await loadPlans();
  }
}

/**
 * 下一页
 */
async function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    await loadPlans();
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
.medication-plans-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

.back-btn, .add-btn {
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

.back-btn:hover, .add-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
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

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: white;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  margin: 0;
  font-size: 16px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: white;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state p {
  margin: 12px 0;
  font-size: 16px;
}

.empty-state .hint {
  font-size: 14px;
  opacity: 0.8;
}

.create-btn {
  margin-top: 24px;
  padding: 14px 28px;
  border-radius: 12px;
  background: white;
  color: #667eea;
  border: none;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.create-btn .icon {
  font-size: 20px;
}

/* 计划列表 */
.plans-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 计划卡片 */
.plan-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;
}

.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* 计划头部 */
.plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.plan-status {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.plan-status.active {
  background: #d4f4dd;
  color: #22c55e;
}

.plan-status.completed {
  background: #e0e6ed;
  color: #718096;
}

.plan-status.cancelled {
  background: #ffe4e1;
  color: #ff6b6b;
}

.plan-date {
  font-size: 13px;
  color: #718096;
}

/* 计划主体 */
.plan-body {
  margin-bottom: 16px;
}

.patient-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.patient-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
}

.patient-details {
  flex: 1;
}

.patient-name {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.patient-address {
  font-size: 13px;
  color: #718096;
}

.plan-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #718096;
}

.info-item .label {
  font-size: 16px;
}

.info-item .value {
  flex: 1;
}

/* 计划底部 */
.plan-footer {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.action-btn.primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.action-btn.secondary {
  background: #f5f7fa;
  color: #667eea;
}

.action-btn.secondary:hover {
  background: #e0e6ed;
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.page-btn {
  padding: 10px 20px;
  border-radius: 8px;
  background: white;
  color: #667eea;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
}

.page-info {
  color: white;
  font-size: 14px;
  font-weight: 500;
}
</style>

