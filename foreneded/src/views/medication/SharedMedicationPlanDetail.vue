<template>
  <div class="plan-detail-page">
    <div class="top-bar">
      <button @click="goBack" class="back-btn">←</button>
      <h1 class="title">共享计划详情</h1>
      <div class="placeholder"></div>
    </div>

    <div class="content">
      <div v-if="loading" class="loading-state">
        <p>加载中...</p>
      </div>

      <div v-else-if="decrypting" class="loading-state">
        <p>解密中...</p>
        <p class="hint">正在使用本地组密钥解密数据</p>
      </div>

      <div v-else-if="decryptError" class="error-state">
        <p class="error-message">{{ decryptError }}</p>
        <button @click="retry" class="retry-btn">重试</button>
      </div>

      <div v-else class="plan-details">
        <div class="info-card">
          <div class="card-header">
            <h2>{{ planData?.plan_name || '（仅共享摘要）' }}</h2>
            <div class="status-badge">共享</div>
          </div>

          <div v-if="planData" class="info-section">
            <div class="info-label">诊断</div>
            <div class="info-value">{{ planData.diagnosis }}</div>
          </div>

          <div class="info-section">
            <div class="info-label">计划周期</div>
            <div class="info-value">
              {{ startDateText }} 至 {{ endDateText }}
            </div>
          </div>

          <div v-if="planData?.notes" class="info-section">
            <div class="info-label">医嘱备注</div>
            <div class="info-value notes">{{ planData.notes }}</div>
          </div>

          <div v-if="!planData" class="info-section">
            <div class="info-label">提示</div>
            <div class="info-value">该计划仅共享摘要，未共享具体用药信息</div>
          </div>
        </div>

        <div v-if="planData" class="section-card">
          <div class="section-header">
            <h3>用药清单</h3>
            <div class="count-badge">{{ planData.medications.length }} 种</div>
          </div>

          <div class="medications-list">
            <div v-for="(med, index) in planData.medications" :key="index" class="medication-item">
              <div class="med-number">{{ index + 1 }}</div>
              <div class="med-content">
                <div class="med-name">{{ med.medication_name }}</div>
                <div class="med-generic">{{ med.generic_name }}</div>

                <div class="med-details-grid">
                  <div class="detail-item">
                    <span class="label">剂量</span>
                    <span class="value">{{ med.dosage }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">频率</span>
                    <span class="value">{{ med.frequency }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">疗程</span>
                    <span class="value">{{ med.duration }}</span>
                  </div>
                </div>

                <div v-if="med.instructions" class="med-instructions">
                  <span class="label">用法：</span>
                  <span>{{ med.instructions }}</span>
                </div>

                <div v-if="med.side_effects" class="med-warning">
                  <span class="label">副作用：</span>
                  <span>{{ med.side_effects }}</span>
                </div>

                <div v-if="med.precautions" class="med-warning">
                  <span class="label">注意事项：</span>
                  <span>{{ med.precautions }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="planData?.reminders && planData.reminders.length > 0" class="section-card">
          <div class="section-header">
            <h3>服药提醒</h3>
            <div class="count-badge">{{ planData.reminders.length }} 条</div>
          </div>

          <div class="reminders-list">
            <div v-for="(reminder, index) in planData.reminders" :key="index" class="reminder-item">
              <div class="reminder-time">{{ reminder.reminder_time }}</div>
              <div class="reminder-content">
                <div class="reminder-med">{{ reminder.medication_name }}</div>
                <div class="reminder-message">{{ reminder.reminder_message }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="encryption-info">
          <div class="encryption-text">
            <div class="encryption-title">按访问组共享</div>
            <div class="encryption-desc">完整内容仅在分享者授权并下发组密钥后可解密</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { MedicationPlanData } from '@/service/medication';
import { sharedMedicationPlanStorageService } from '@/service/sharedMedicationPlanStorage';
import { accessGroupKeyStorageService } from '@/service/accessGroupKeyStorage';
import { aesGcmDecryptHexKey } from '@/service/groupCrypto';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const decrypting = ref(false);
const decryptError = ref('');

const sharedPlan = ref<any>(null);
const planData = ref<MedicationPlanData | null>(null);

const startDateText = computed(() => {
  const d = planData.value?.start_date || sharedPlan.value?.plan_summary?.start_date;
  return d || '-';
});

const endDateText = computed(() => {
  const d = planData.value?.end_date || sharedPlan.value?.plan_summary?.end_date;
  return d || '长期';
});

async function loadAndDecrypt() {
  try {
    loading.value = true;
    decryptError.value = '';

    const groupId = String(route.params.groupId || '');
    const planId = String(route.params.planId || '');

    if (!groupId || !planId) {
      throw new Error('缺少 groupId/planId');
    }

    sharedPlan.value = await sharedMedicationPlanStorageService.getSharedPlan(groupId, planId);
    if (!sharedPlan.value) {
      throw new Error('未找到本地共享计划记录');
    }

    if (!sharedPlan.value.encrypted_plan_data || !sharedPlan.value.wrapped_plan_key) {
      planData.value = null;
      return;
    }

    decrypting.value = true;

    const keyRecord = await accessGroupKeyStorageService.getGroupKey(groupId);
    if (!keyRecord?.group_key) {
      throw new Error('缺少本地组密钥，无法解密');
    }

    if (sharedPlan.value.key_version && keyRecord.key_version && Number(sharedPlan.value.key_version) !== Number(keyRecord.key_version)) {
      throw new Error(`组密钥版本不匹配：计划使用 v${sharedPlan.value.key_version}，当前本地为 v${keyRecord.key_version}`);
    }

    const planKey = await aesGcmDecryptHexKey(String(sharedPlan.value.wrapped_plan_key), String(keyRecord.group_key));
    const plaintext = await aesGcmDecryptHexKey(String(sharedPlan.value.encrypted_plan_data), planKey);

    planData.value = JSON.parse(plaintext) as MedicationPlanData;
  } catch (e: any) {
    planData.value = null;
    decryptError.value = e?.message || '解密失败';
  } finally {
    decrypting.value = false;
    loading.value = false;
  }
}

async function retry() {
  await loadAndDecrypt();
}

function goBack() {
  router.back();
}

onMounted(loadAndDecrypt);
</script>

<style scoped>
.plan-detail-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 20px;
}

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
}

.title {
  color: white;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.placeholder {
  width: 40px;
}

.content {
  padding: 20px;
}

.loading-state,
.error-state {
  background: white;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.hint {
  color: #718096;
  margin-top: 6px;
  font-size: 13px;
}

.error-message {
  color: #e53e3e;
  margin: 0 0 16px;
}

.retry-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
}

.plan-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card,
.section-card {
  background: white;
  border-radius: 16px;
  padding: 18px;
  box-shadow: var(--shadow-sm);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-badge {
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: #edf2f7;
  color: #4a5568;
}

.info-section {
  margin-top: 10px;
}

.info-label {
  font-size: 12px;
  font-weight: 600;
  color: #718096;
  margin-bottom: 4px;
}

.info-value {
  color: #2d3748;
}

.notes {
  white-space: pre-wrap;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.count-badge {
  background: #edf2f7;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  color: #4a5568;
}

.medications-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.medication-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f7fafc;
  border-radius: 12px;
}

.med-number {
  width: 26px;
  height: 26px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.med-name {
  font-weight: 700;
}

.med-generic {
  color: #718096;
  font-size: 12px;
  margin-top: 2px;
}

.med-details-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 8px;
}

.detail-item {
  background: white;
  padding: 8px;
  border-radius: 10px;
}

.detail-item .label {
  display: block;
  font-size: 11px;
  color: #718096;
}

.detail-item .value {
  display: block;
  font-weight: 600;
  color: #2d3748;
  margin-top: 2px;
}

.med-instructions,
.med-warning {
  margin-top: 8px;
  font-size: 12px;
  color: #2d3748;
}

.med-warning {
  color: #c05621;
}

.reminders-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reminder-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f7fafc;
  border-radius: 12px;
}

.reminder-time {
  font-weight: 700;
  color: #667eea;
  min-width: 64px;
}

.reminder-med {
  font-weight: 700;
}

.reminder-message {
  color: #718096;
  font-size: 12px;
  margin-top: 2px;
}

.encryption-info {
  background: #f0fff4;
  border-radius: 16px;
  padding: 14px;
  border: 1px solid #c6f6d5;
}

.encryption-title {
  font-weight: 700;
  color: #276749;
}

.encryption-desc {
  color: #2f855a;
  font-size: 12px;
  margin-top: 4px;
}
</style>
