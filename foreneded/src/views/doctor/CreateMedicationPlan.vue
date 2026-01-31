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

        <div class="reminder-bulk">
          <div class="bulk-row">
            <div class="bulk-label">批量添加</div>
            <div class="bulk-times">
              <button type="button" class="bulk-time-btn" @click="bulkReminderTime = '08:00'">08:00</button>
              <button type="button" class="bulk-time-btn" @click="bulkReminderTime = '12:00'">12:00</button>
              <button type="button" class="bulk-time-btn" @click="bulkReminderTime = '18:00'">18:00</button>
              <button type="button" class="bulk-time-btn" @click="bulkReminderTime = '21:00'">21:00</button>
            </div>
          </div>

          <div class="bulk-form">
            <div class="form-group">
              <label>提醒时间</label>
              <input v-model="bulkReminderTime" type="time" class="input-field small" />
            </div>
            <div class="form-group">
              <label>提醒日期</label>
              <select v-model="bulkReminderDays" class="select-field">
                <option value="everyday">每天</option>
                <option value="weekdays">工作日</option>
                <option value="weekends">周末</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label>提醒文案</label>
              <input v-model="bulkMessageTemplate" type="text" class="input-field" />
            </div>
          </div>

          <button type="button" class="bulk-apply-btn" @click="addRemindersForAllMedications">
            <Plus class="icon" />
            <span>为所有药物生成提醒</span>
          </button>
        </div>

        <div v-if="planForm.reminders.length === 0" class="empty-state">
          <Pill class="empty-icon" />
          <p>暂无提醒，请先生成或手动添加</p>
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
              <div class="form-group">
                <label>提醒日期</label>
                <select v-model="reminder.reminder_days" class="select-field">
                  <option value="everyday">每天</option>
                  <option value="weekdays">工作日</option>
                  <option value="weekends">周末</option>
                </select>
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
import { uiService } from '@/service/ui';
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

const bulkReminderTime = ref('08:00');
const bulkReminderDays = ref<'everyday' | 'weekdays' | 'weekends'>('everyday');
const bulkMessageTemplate = ref('请按时服用{medication}');

function formatLocalDateOnly(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildReminderMessage(medicationName: string): string {
  const name = medicationName || '';
  return String(bulkMessageTemplate.value || '').replace('{medication}', name);
}

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
  start_date: formatLocalDateOnly(new Date()),
  end_date: formatLocalDateOnly(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
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

    if (!selectedPatient.value && patients.value.length === 1) {
      selectedPatient.value = patients.value[0];
    }
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
    uiService.toast('加载患者列表失败: ' + error.message, { type: 'error' });
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
      uiService.toast('无法获取钱包', { type: 'error' });
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
      uiService.toast(`✅ 成功获取到 ${patients.value.length} 个患者！`, { type: 'success', durationMs: 2600 });
    } else {
      await uiService.alert('暂未收到患者信息，请确认患者已接受邀请并发送信息', { title: '提示' });
    }
  } catch (error: any) {
    console.error('检查消息失败:', error);
    uiService.toast('检查消息失败: ' + error.message, { type: 'error' });
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
    uiService.toast('该药物已添加', { type: 'warning' });
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

  if (!planForm.value.reminders.some(r => r.medication_code === medicationDetail.medication_code)) {
    planForm.value.reminders.push({
      medication_code: medicationDetail.medication_code,
      medication_name: medicationDetail.medication_name,
      reminder_time: bulkReminderTime.value,
      reminder_days: bulkReminderDays.value,
      reminder_message: buildReminderMessage(medicationDetail.medication_name),
    });
  }
  
  // 清空搜索
  searchKeyword.value = '';
  searchResults.value = [];
  
  console.log('已添加药物:', medicationDetail);
}

/**
 * 移除药物
 */
function removeMedication(index: number) {
  const removed = planForm.value.medications[index];
  planForm.value.medications.splice(index, 1);
  if (removed?.medication_code) {
    planForm.value.reminders = planForm.value.reminders.filter(r => r.medication_code !== removed.medication_code);
  }
}

/**
 * 添加提醒
 */
function addReminder() {
  const firstMed = planForm.value.medications[0];
  if (!firstMed) {
    uiService.toast('请先添加药物', { type: 'warning' });
    return;
  }
  
  planForm.value.reminders.push({
    medication_code: firstMed.medication_code,
    medication_name: firstMed.medication_name,
    reminder_time: bulkReminderTime.value,
    reminder_days: bulkReminderDays.value,
    reminder_message: buildReminderMessage(firstMed.medication_name),
  });
}

function addRemindersForAllMedications() {
  if (planForm.value.medications.length === 0) {
    uiService.toast('请先添加药物', { type: 'warning' });
    return;
  }

  let added = 0;
  for (const med of planForm.value.medications) {
    if (!med?.medication_code) continue;
    const exists = planForm.value.reminders.some(r => r.medication_code === med.medication_code && r.reminder_time === bulkReminderTime.value);
    if (exists) continue;

    planForm.value.reminders.push({
      medication_code: med.medication_code,
      medication_name: med.medication_name,
      reminder_time: bulkReminderTime.value,
      reminder_days: bulkReminderDays.value,
      reminder_message: buildReminderMessage(med.medication_name),
    });
    added += 1;
  }

  if (added === 0) {
    uiService.toast('没有需要新增的提醒', { type: 'info' });
    return;
  }
  uiService.toast(`已添加 ${added} 条提醒`, { type: 'success' });
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
    uiService.toast('请填写必填项', { type: 'warning' });
    return;
  }

  if (!planForm.value.start_date || !planForm.value.end_date) {
    uiService.toast('请设置开始和结束日期', { type: 'warning' });
    return;
  }

  if (planForm.value.start_date > planForm.value.end_date) {
    uiService.toast('开始日期不能晚于结束日期', { type: 'warning' });
    return;
  }

  if (planForm.value.reminders.length === 0) {
    uiService.toast('请至少添加一个用药提醒', { type: 'warning' });
    return;
  }

  const validReminders = planForm.value.reminders.filter(r => !!r.medication_code && !!r.reminder_time);
  const medsWithoutReminders = planForm.value.medications.filter(med => 
    !validReminders.some(rem => rem.medication_code === med.medication_code)
  );
  if (medsWithoutReminders.length > 0) {
    const names = medsWithoutReminders.map(m => m.medication_name || m.medication_code).join('、');
    await uiService.alert(`以下药物尚未设置提醒，请先补充：${names}`, { title: '请完善提醒' });
    return;
  }

  const reminders = validReminders.map(r => {
    const med = planForm.value.medications.find(m => m.medication_code === r.medication_code);
    const medicationName = med?.medication_name || r.medication_name || r.medication_code;
    return {
      ...r,
      medication_name: medicationName,
      reminder_days: (r.reminder_days as any) || 'everyday',
      reminder_message: r.reminder_message || buildReminderMessage(medicationName),
    } as MedicationReminder;
  });
  
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
      reminders,
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
      uiService.toast('用药计划已创建，但通知患者失败', { type: 'warning', durationMs: 3000 });
      // 继续执行，因为计划已经创建成功
    }
    
    // 6. 跳转到计划列表
    uiService.toast('用药计划创建成功！', { type: 'success', durationMs: 2200 });
    router.push('/doctor/medication-plans');
  } catch (error: any) {
    console.error('❌ 创建用药计划失败:', error);
    uiService.toast('创建用药计划失败: ' + error.message, { type: 'error' });
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
    const doctorPublicKey = wallet.signingKey.publicKey;
    const notificationData = {
      plan_id: planId,
      plan_name: '【新用药计划】',
      doctor_address: userInfo.smart_account,
      doctor_eoa: wallet.address,
      doctor_public_key: doctorPublicKey,
      message: '您有一份新的用药计划，请查看。',
      encrypted_plan_data: encryptedData,  // ✅ 包含加密的计划数据
    };
    console.log('3. 通知数据:', notificationData);
    console.log('  加密数据长度:', encryptedData.length, '字符');
    
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
  background: #667eea;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.top-bar .title {
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  flex: 1;
  text-align: center;
}

.back-btn, .save-btn {
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  font-size: 14px;
  font-weight: 600;
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
  color: rgba(255, 255, 255, 0.6);
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

/* 内容区域 */
.content {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

/* 步骤区域 */
.section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.step-badge {
  width: 40px;
  height: 40px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.section-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
}

/* 表单组 */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
}

.input-field,
.textarea-field,
.select-field {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.3s;
  color: #2d3748;
  background: white;
}

.input-field:focus,
.textarea-field:focus,
.select-field:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-field.small {
  font-size: 13px;
  padding: 10px;
}

.textarea-field {
  resize: vertical;
  min-height: 100px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

/* 患者选择 */
.patient-selector {
  margin-bottom: 16px;
}

.select-patient-btn {
  width: 100%;
  padding: 16px;
  border: 2px dashed #cbd5e0;
  border-radius: 12px;
  background: #f9fafb;
  color: #667eea;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s;
}

.select-patient-btn:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

.selected-patient-card {
  background: #f0f4ff;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.patient-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.patient-avatar {
  width: 48px;
  height: 48px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}

.patient-details {
  flex: 1;
}

.patient-name {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 4px;
}

.patient-address {
  font-size: 13px;
  color: #718096;
  font-family: monospace;
}

.change-btn {
  padding: 8px 16px;
  background: white;
  color: #667eea;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.change-btn:hover {
  background: #667eea;
  color: white;
}

/* 药物列表 */
.medications-list {
  margin-bottom: 16px;
}

.med-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.med-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.med-name {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
}

.remove-btn {
  padding: 6px 12px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.remove-btn:hover {
  background: #fecaca;
}

.med-form {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.med-form .form-group.full-width {
  grid-column: 1 / -1;
}

/* 提醒列表 */
.reminder-bulk {
  background: #f0f4ff;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
}

.bulk-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.bulk-label {
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
  white-space: nowrap;
}

.bulk-times {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.bulk-time-btn {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #c7d2fe;
  background: white;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.bulk-time-btn:hover {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.bulk-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.bulk-form .form-group.full-width {
  grid-column: 1 / -1;
}

.bulk-apply-btn {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: none;
  background: #667eea;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s;
}

.bulk-apply-btn:hover {
  background: #5a67d8;
}

.reminders-list {
  margin-bottom: 16px;
}

.reminder-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.reminder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.reminder-time {
  font-size: 16px;
  font-weight: 600;
  color: #667eea;
}

.reminder-form {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.reminder-form .form-group.full-width {
  grid-column: 1 / -1;
}

/* 按钮 */
.add-medication-btn,
.add-reminder-btn {
  width: 100%;
  padding: 12px;
  background: white;
  color: #667eea;
  border: 2px dashed #cbd5e0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s;
}

.add-medication-btn:hover,
.add-reminder-btn:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

/* 加密提示 */
.encryption-notice {
  background: #f0fdf4;
  border: 1px solid #dcfce7;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.notice-icon {
  width: 24px;
  height: 24px;
  color: #22c55e;
  flex-shrink: 0;
}

.notice-text {
  flex: 1;
}

.notice-title {
  font-size: 14px;
  font-weight: 600;
  color: #166534;
  margin-bottom: 4px;
}

.notice-desc {
  font-size: 13px;
  color: #4ade80;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  flex: 1;
}

.refresh-btn,
.close-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f3f4f6;
  color: #667eea;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.refresh-btn:hover,
.close-btn:hover {
  background: #e5e7eb;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.textarea-field.small {
  min-height: 80px;
}

.search-box {
  position: relative;
  margin: 16px 0 12px;
}

.search-input {
  width: 100%;
  padding: 14px 48px 14px 16px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  font-size: 15px;
  color: #0f172a;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: #7c3aed;
  box-shadow: 0 12px 28px rgba(124, 58, 237, 0.18);
  outline: none;
}

.search-icon {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  width: 20px;
  height: 20px;
}

.search-results {
  margin-top: 12px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.15s ease;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: #f8fafc;
}

.med-name {
  font-weight: 600;
  color: #0f172a;
  flex: 1;
}

.med-info {
  font-size: 13px;
  color: #64748b;
}

.add-btn {
  border: none;
  background: #0ea5e9;
  color: #fff;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background: #0284c7;
  box-shadow: 0 6px 14px rgba(14, 165, 233, 0.3);
}

.medications-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.patient-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.patient-item:hover {
  background: #f0f4ff;
  border-color: #667eea;
}

.select-icon {
  width: 20px;
  height: 20px;
  color: #cbd5e0;
}

.patient-item:hover .select-icon {
  color: #667eea;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #718096;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  color: #cbd5e0;
}

.empty-state p {
  margin: 12px 0;
  font-size: 16px;
}

.empty-state .hint {
  font-size: 14px;
  color: #a0aec0;
}

.refresh-manual-btn {
  margin-top: 16px;
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.refresh-manual-btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.icon {
  width: 24px;
  height: 24px;
}

.icon-small {
  width: 20px;
  height: 20px;
}

.arrow {
  width: 20px;
  height: 20px;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .med-form {
    grid-template-columns: 1fr;
  }

  .reminder-form {
    grid-template-columns: 1fr;
  }

  .bulk-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .bulk-times {
    justify-content: flex-start;
  }

  .bulk-form {
    grid-template-columns: 1fr;
  }

  .section {
    padding: 16px;
  }

  .modal-content {
    max-height: 90vh;
  }
}
</style>
