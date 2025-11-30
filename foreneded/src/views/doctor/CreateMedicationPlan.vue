<template>
  <div class="create-plan-page">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <button @click="goBack" class="back-btn">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="title">创建用药计划</h1>
      <button @click="savePlan" class="save-btn" :disabled="!canSave || isSaving">
        <Loader2 v-if="isSaving" class="spinner-small" />
        <span v-else>保存</span>
      </button>
    </div>

    <div class="content">
      <!-- 步骤1: 选择患者 -->
      <div class="section">
        <div class="section-header">
          <div class="step-badge">1</div>
          <h2>选择患者</h2>
        </div>
        <div v-if="!selectedPatient" class="patient-selector">
          <button @click="showPatientList = true" class="select-patient-btn">
            <User class="icon" />
            <span>选择患者</span>
            <ChevronRight class="arrow" />
          </button>
        </div>
        <div v-else class="selected-patient-card">
          <div class="patient-info">
            <div class="patient-avatar">{{ selectedPatient.username?.charAt(0) || '患' }}</div>
            <div class="patient-details">
              <div class="patient-name">{{ selectedPatient.username }}</div>
              <div class="patient-address">{{ formatAddress(selectedPatient.smart_account) }}</div>
            </div>
          </div>
          <button @click="selectedPatient = null" class="change-btn">更换</button>
        </div>
      </div>

      <!-- 步骤2: 计划基本信息 -->
      <div class="section" v-if="selectedPatient">
        <div class="section-header">
          <div class="step-badge">2</div>
          <h2>计划基本信息</h2>
        </div>
        <div class="form-group">
          <label>计划名称 *</label>
          <input 
            v-model="planForm.plan_name" 
            type="text" 
            placeholder="例如：高血压综合治疗方案"
            class="input-field"
          />
        </div>
        <div class="form-group">
          <label>诊断 *</label>
          <textarea 
            v-model="planForm.diagnosis" 
            placeholder="例如：原发性高血压（II级）"
            class="textarea-field"
            rows="3"
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>开始日期</label>
            <input 
              v-model="planForm.start_date" 
              type="date" 
              class="input-field"
            />
          </div>
          <div class="form-group">
            <label>结束日期</label>
            <input 
              v-model="planForm.end_date" 
              type="date" 
              class="input-field"
            />
          </div>
        </div>
      </div>

      <!-- 步骤3: 添加药物 -->
      <div class="section" v-if="selectedPatient">
        <div class="section-header">
          <div class="step-badge">3</div>
          <h2>添加药物</h2>
        </div>
        
        <!-- 药物搜索 -->
        <div class="search-box">
          <input 
            v-model="searchKeyword" 
            @input="searchMedications"
            type="text" 
            placeholder="搜索药物名称..."
            class="search-input"
          />
          <Search class="search-icon" />
        </div>

        <!-- 搜索结果 -->
        <div v-if="searchResults.length > 0" class="search-results">
          <div 
            v-for="med in searchResults" 
            :key="med.medication_id"
            @click="addMedication(med)"
            class="search-result-item"
          >
            <div class="med-name">{{ med.medication_name }}</div>
            <div class="med-info">{{ med.generic_name }} · {{ med.common_dosage }}</div>
            <button class="add-btn">添加</button>
          </div>
        </div>

        <!-- 已添加的药物列表 -->
        <div v-if="planForm.medications.length > 0" class="medications-list">
          <div 
            v-for="(med, index) in planForm.medications" 
            :key="index"
            class="medication-card"
          >
            <div class="med-header">
              <div class="med-name">{{ med.medication_name }}</div>
              <button @click="removeMedication(index)" class="remove-btn">
                <X class="icon-small" />
              </button>
            </div>
            <div class="med-form">
              <div class="form-group">
                <label>剂量</label>
                <input 
                  v-model="med.dosage" 
                  type="text" 
                  placeholder="例如：100mg"
                  class="input-field small"
                />
              </div>
              <div class="form-group">
                <label>频率</label>
                <input 
                  v-model="med.frequency" 
                  type="text" 
                  placeholder="例如：每日一次"
                  class="input-field small"
                />
              </div>
              <div class="form-group">
                <label>疗程</label>
                <input 
                  v-model="med.duration" 
                  type="text" 
                  placeholder="例如：90天"
                  class="input-field small"
                />
              </div>
              <div class="form-group full-width">
                <label>用药说明</label>
                <textarea 
                  v-model="med.instructions" 
                  placeholder="例如：早餐后服用"
                  class="textarea-field small"
                  rows="2"
                />
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <Pill class="empty-icon" />
          <p>暂无药物，请搜索并添加</p>
        </div>
      </div>

      <!-- 步骤4: 设置提醒 -->
      <div class="section" v-if="selectedPatient && planForm.medications.length > 0">
        <div class="section-header">
          <div class="step-badge">4</div>
          <h2>设置提醒</h2>
        </div>
        <div class="reminders-list">
          <div 
            v-for="(reminder, index) in planForm.reminders" 
            :key="index"
            class="reminder-card"
          >
            <div class="reminder-header">
              <div class="reminder-title">提醒 {{ index + 1 }}</div>
              <button @click="removeReminder(index)" class="remove-btn">
                <X class="icon-small" />
              </button>
            </div>
            <div class="reminder-form">
              <div class="form-group">
                <label>关联药物</label>
                <select v-model="reminder.medication_code" class="select-field">
                  <option value="">请选择</option>
                  <option 
                    v-for="med in planForm.medications" 
                    :key="med.medication_code"
                    :value="med.medication_code"
                  >
                    {{ med.medication_name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>提醒时间</label>
                <input 
                  v-model="reminder.reminder_time" 
                  type="time" 
                  class="input-field small"
                />
              </div>
              <div class="form-group full-width">
                <label>提醒消息</label>
                <input 
                  v-model="reminder.reminder_message" 
                  type="text" 
                  placeholder="例如：早餐后服用高血压药物"
                  class="input-field"
                />
              </div>
            </div>
          </div>
        </div>
        <button @click="addReminder" class="add-reminder-btn">
          <Plus class="icon" />
          <span>添加提醒</span>
        </button>
      </div>

      <!-- 步骤5: 医嘱备注 -->
      <div class="section" v-if="selectedPatient">
        <div class="section-header">
          <div class="step-badge">5</div>
          <h2>医嘱备注</h2>
        </div>
        <div class="form-group">
          <textarea 
            v-model="planForm.notes" 
            placeholder="例如：请定期监测血压，每周至少测量3次..."
            class="textarea-field"
            rows="4"
          />
        </div>
      </div>

      <!-- 加密提示 -->
      <div class="encryption-notice" v-if="selectedPatient">
        <Lock class="notice-icon" />
        <div class="notice-text">
          <div class="notice-title">端到端加密保护</div>
          <div class="notice-desc">所有敏感信息将使用ECDH加密，只有患者可以解密查看</div>
        </div>
      </div>
    </div>

    <!-- 患者选择弹窗 -->
    <div v-if="showPatientList" class="modal-overlay" @click="showPatientList = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>选择患者</h2>
          <button @click="refreshPatients" class="refresh-btn" :disabled="loadingPatients" title="刷新患者列表">
            <RefreshCw class="icon-small" :class="{ 'spinning': loadingPatients }" />
          </button>
          <button @click="showPatientList = false" class="close-btn">
            <X class="icon-small" />
          </button>
        </div>
        <div class="modal-body">
          <div v-if="loadingPatients" class="loading-state">
            <Loader2 class="spinner" />
            <p>加载患者列表...</p>
          </div>
          <div v-else-if="patients.length === 0" class="empty-state">
            <Users class="empty-icon" />
            <p>暂无患者</p>
            <p class="hint">请先添加患者关系</p>
            <button @click="checkMessagesAndRefresh" class="refresh-manual-btn">
              <Mail class="icon-small" />
              <span>检查待接收的信息</span>
            </button>
          </div>
          <div v-else class="patients-list">
            <div 
              v-for="patient in patients" 
              :key="patient.smart_account"
              @click="selectPatient(patient)"
              class="patient-item"
            >
              <div class="patient-avatar">{{ patient.username?.charAt(0) || '患' }}</div>
              <div class="patient-info">
                <div class="patient-name">{{ patient.username || '未知患者' }}</div>
                <div class="patient-address">{{ formatAddress(patient.smart_account) }}</div>
              </div>
              <ChevronRight class="select-icon" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载遮罩 -->
    <div v-if="isSaving" class="loading-overlay">
      <div class="loading-card">
        <Loader2 class="spinner large" />
        <p>正在保存用药计划...</p>
        <p class="hint">加密中，请稍候</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { medicationService, type Medication, type MedicationDetail, type MedicationReminder, type MedicationPlanData } from '@/service/medication';
import { authService } from '@/service/auth';
import { aaService } from '@/service/accountAbstraction';
import { memberInfoService, type MemberInfo } from '@/service/memberInfo';
import { relationService } from '@/service/relation';
import { secureExchangeService } from '@/service/secureExchange';
import { 
  ArrowLeft, 
  User, 
  ChevronRight, 
  Search, 
  Plus, 
  X, 
  Lock, 
  RefreshCw, 
  Users, 
  Mail, 
  Loader2,
  Pill
} from 'lucide-vue-next';

const router = useRouter();

// ==================== 状态管理 ====================

const showPatientList = ref(false);
const loadingPatients = ref(false);
const isSaving = ref(false);

const selectedPatient = ref<MemberInfo | null>(null);
const patients = ref<MemberInfo[]>([]);

const searchKeyword = ref('');
const searchResults = ref<Medication[]>([]);

// 计划表单
const planForm = ref<{
  plan_name: string;
  diagnosis: string;
  start_date: string;
  end_date: string;
  medications: MedicationDetail[];
  reminders: MedicationReminder[];
  notes: string;
}>({
  plan_name: '',
  diagnosis: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 默认90天
  medications: [],
  reminders: [],
  notes: '',
});

// ==================== 计算属性 ====================

const canSave = computed(() => {
  return selectedPatient.value &&
    planForm.value.plan_name.trim() !== '' &&
    planForm.value.diagnosis.trim() !== '' &&
    planForm.value.medications.length > 0;
});

// ==================== 生命周期 ====================

onMounted(async () => {
  await loadPatients();
});

// ==================== 方法 ====================

/**
 * 加载患者列表
 * 新方案：从关系列表中获取患者，不依赖本地存储
 */
async function loadPatients() {
  try {
    loadingPatients.value = true;
    
    console.log('🔍 开始加载患者列表...');
    
    // 方案1：从本地存储获取（旧方案）
    const elderly = await memberInfoService.getMembersByRole('elderly');
    const patients_from_storage = await memberInfoService.getMembersByRole('patient');
    const localPatients = [...elderly, ...patients_from_storage];
    
    console.log('  从本地存储获取到:', localPatients.length, '个患者');
    
    // 方案2：从关系列表获取（新方案 - 更可靠）
    const relationships = await relationService.getMyRelationships();
    console.log('  获取到关系数据:', relationships);
    
    // 获取我作为访问者的关系（医生访问患者）
    const patientsFromRelations: MemberInfo[] = [];
    
    if (relationships.asViewer && relationships.asViewer.length > 0) {
      console.log('  作为访问者的关系数量:', relationships.asViewer.length);
      
      for (const rel of relationships.asViewer) {
        // 检查本地存储中是否有该成员的信息
        const memberInfo = await memberInfoService.getMemberInfo(rel.data_owner_address);
        
        if (memberInfo) {
          console.log('    ✅ 找到成员信息:', memberInfo.username);
          patientsFromRelations.push(memberInfo);
        } else {
          // 如果本地没有，创建一个基础的MemberInfo对象
          console.log('    ⚠️ 本地无成员信息，使用地址:', rel.data_owner_address);
          patientsFromRelations.push({
            smart_account: rel.data_owner_address,
            username: `患者 (${rel.data_owner_address.slice(0, 6)}...)`,
            roles: ['patient'], // 假设是患者
            eoa_address: '',
            lastUpdated: new Date().toISOString(),
          });
        }
      }
    }
    
    console.log('  从关系列表获取到:', patientsFromRelations.length, '个患者');
    
    // 合并两个来源，去重（优先使用本地存储的完整信息）
    const allPatients = [...localPatients];
    for (const patient of patientsFromRelations) {
      if (!allPatients.some(p => p.smart_account === patient.smart_account)) {
        allPatients.push(patient);
      }
    }
    
    patients.value = allPatients;
    console.log('✅ 最终患者列表:', patients.value.length, '个');
    console.log('  患者详情:', patients.value.map(p => ({ 
      name: p.username, 
      address: p.smart_account 
    })));
    
    if (patients.value.length === 0) {
      console.warn('⚠️ 未找到任何患者，请检查：');
      console.warn('  1. 是否已建立关系？');
      console.warn('  2. 患者是否已发送用户信息？');
      console.warn('  3. 消息监听器是否正常运行？');
    }
  } catch (error: any) {
    console.error('❌ 加载患者列表失败:', error);
    alert('加载患者列表失败: ' + error.message);
  } finally {
    loadingPatients.value = false;
  }
}

/**
 * 刷新患者列表
 */
async function refreshPatients() {
  console.log('🔄 手动刷新患者列表...');
  await loadPatients();
}

/**
 * 检查待接收的消息并刷新
 */
async function checkMessagesAndRefresh() {
  try {
    loadingPatients.value = true;
    console.log('📬 检查待接收的消息...');
    
    // 获取钱包
    const wallet = await aaService.getEOAWallet();
    if (!wallet) {
      alert('无法获取钱包');
      return;
    }
    
    // 动态导入 messageListener
    const { messageListenerService } = await import('@/service/messageListener');
    
    // 手动触发消息检查
    await messageListenerService.checkMessagesNow(wallet);
    
    // 等待一下让消息处理完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 刷新患者列表
    await loadPatients();
    
    if (patients.value.length > 0) {
      alert(`✅ 成功获取到 ${patients.value.length} 个患者！`);
    } else {
      alert('暂未收到患者信息，请确认患者已接受邀请并发送信息');
    }
  } catch (error: any) {
    console.error('检查消息失败:', error);
    alert('检查消息失败: ' + error.message);
  } finally {
    loadingPatients.value = false;
  }
}

/**
 * 选择患者
 */
function selectPatient(patient: MemberInfo) {
  selectedPatient.value = patient;
  showPatientList.value = false;
}

/**
 * 搜索药物（防抖）
 */
let searchTimer: NodeJS.Timeout;
async function searchMedications() {
  clearTimeout(searchTimer);
  
  if (!searchKeyword.value.trim()) {
    searchResults.value = [];
    return;
  }
  
  searchTimer = setTimeout(async () => {
    try {
      const results = await medicationService.searchMedications(searchKeyword.value);
      searchResults.value = results;
      console.log('搜索结果:', results);
    } catch (error: any) {
      console.error('搜索药物失败:', error);
    }
  }, 300);
}

/**
 * 添加药物到计划
 */
function addMedication(med: Medication) {
  // 检查是否已添加
  if (planForm.value.medications.some(m => m.medication_id === med.medication_id)) {
    alert('该药物已添加');
    return;
  }
  
  // 添加药物
  const medicationDetail: MedicationDetail = {
    medication_id: med.medication_id,
    medication_code: med.medication_code,
    medication_name: med.medication_name,
    generic_name: med.generic_name,
    dosage: med.common_dosage || '',
    frequency: '每日一次',
    duration: '90天',
    instructions: '',
    side_effects: med.side_effects,
    precautions: med.precautions,
  };
  
  planForm.value.medications.push(medicationDetail);
  
  // 清空搜索
  searchKeyword.value = '';
  searchResults.value = [];
  
  console.log('已添加药物:', medicationDetail);
}

/**
 * 移除药物
 */
function removeMedication(index: number) {
  planForm.value.medications.splice(index, 1);
}

/**
 * 添加提醒
 */
function addReminder() {
  const firstMed = planForm.value.medications[0];
  if (!firstMed) {
    alert('请先添加药物');
    return;
  }
  
  planForm.value.reminders.push({
    medication_code: firstMed.medication_code,
    medication_name: firstMed.medication_name,
    reminder_time: '08:00',
    reminder_days: 'everyday',
    reminder_message: `请按时服用${firstMed.medication_name}`,
  });
}

/**
 * 移除提醒
 */
function removeReminder(index: number) {
  planForm.value.reminders.splice(index, 1);
}

/**
 * 保存计划
 */
async function savePlan() {
  if (!canSave.value) {
    alert('请填写必填项');
    return;
  }
  
  try {
    isSaving.value = true;
    
    // 1. 获取患者公钥
    console.log('📝 开始创建用药计划...');
    console.log('  患者地址:', selectedPatient.value!.smart_account);
    
    const patientPublicKey = await secureExchangeService.getRecipientPublicKey(
      selectedPatient.value!.smart_account
    );
    console.log('  患者公钥:', patientPublicKey);
    
    // 2. 获取医生的EOA私钥
    const wallet = await aaService.getEOAWallet();
    if (!wallet) {
      throw new Error('无法获取医生钱包');
    }
    const doctorPrivateKey = wallet.privateKey;
    
    // 3. 构建计划数据
    const planData: MedicationPlanData = {
      plan_name: planForm.value.plan_name,
      diagnosis: planForm.value.diagnosis,
      start_date: planForm.value.start_date,
      end_date: planForm.value.end_date,
      medications: planForm.value.medications,
      reminders: planForm.value.reminders,
      notes: planForm.value.notes || '',
    };
    
    console.log('  计划数据:', planData);
    
    // 4. 创建加密的用药计划
    const result = await medicationService.createEncryptedPlan(
      planData,
      selectedPatient.value!.smart_account,
      patientPublicKey,
      doctorPrivateKey
    );
    
    console.log('✅ 用药计划创建成功:', result);
    
    // 5. 通过secure-exchange通知患者（必须成功）
    console.log('📬 准备通知患者...');
    console.log('  计划ID:', result.plan_id);
    console.log('  患者地址:', selectedPatient.value?.smart_account);
    
    try {
      await notifyPatient(result.plan_id, result.encrypted_plan_data);
      console.log('✅ 通知患者成功！');
    } catch (error) {
      console.error('❌ 通知患者失败:', error);
      alert('用药计划已创建，但通知患者失败: ' + error);
      // 继续执行，因为计划已经创建成功
    }
    
    // 6. 跳转到计划列表
    alert('用药计划创建成功！');
    router.push('/doctor/medication-plans');
  } catch (error: any) {
    console.error('❌ 创建用药计划失败:', error);
    alert('创建用药计划失败: ' + error.message);
  } finally {
    isSaving.value = false;
  }
}

/**
 * 通知患者
 */
async function notifyPatient(planId: string, encryptedData: string) {
  console.log('=== 开始通知患者 ===');
  console.log('  计划ID:', planId);
  console.log('  患者信息:', selectedPatient.value);
    
  try {
    // 1. 获取钱包
    console.log('1. 获取医生钱包...');
    const wallet = await aaService.getEOAWallet();
    if (!wallet) {
      console.error('❌ 无法获取医生钱包');
      throw new Error('无法获取医生钱包');
    }
    console.log('  ✅ 钱包获取成功');
    
    // 2. 获取医生信息
    console.log('2. 获取医生信息...');
    const userInfo = await authService.getUserInfo();
    if (!userInfo) {
      console.error('❌ 无法获取医生信息');
      throw new Error('无法获取医生信息');
    }
    console.log('  ✅ 医生信息:', userInfo.smart_account);
    
    // 3. 准备通知数据
    const notificationData = {
      plan_id: planId,
      plan_name: '【新用药计划】',
      doctor_address: userInfo.smart_account,
      message: '您有一份新的用药计划，请查看。',
    };
    console.log('3. 通知数据:', notificationData);
    
    // 4. 发送消息
    console.log('4. 发送 secure-exchange 消息...');
    console.log('  接收者地址:', selectedPatient.value!.smart_account);
    console.log('  数据类型: medication_plan');
    
    const result = await secureExchangeService.sendEncryptedData(
      wallet,
      selectedPatient.value!.smart_account,
      notificationData,
      'medication_plan',  // ✅ 与患者查询时一致
      notificationData    // metadata
    );
    
    console.log('  ✅ 消息发送成功:', result);
    console.log('=== 通知患者完成 ===');
  } catch (error) {
    console.error('=== 通知患者失败 ===');
    console.error('错误详情:', error);
    throw error;
  }
}

/**
 * 格式化地址
 */
function formatAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * 返回
 */
function goBack() {
  router.back();
}
</script>

<style scoped>
.create-plan-page {
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

.back-btn, .save-btn {
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
}

.back-btn:hover, .save-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}


.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--text-secondary);
  gap: 12px;
}
</style>
