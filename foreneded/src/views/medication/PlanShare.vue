<template>
  <div class="plan-share-page">
    <div class="top-bar">
      <button @click="goBack" class="back-btn">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="title">分享用药计划</h1>
      <div class="placeholder"></div>
    </div>

    <div class="content">
      <div v-if="loading" class="loading-state">
        <Loader2 class="spinner" />
        <p>加载中...</p>
      </div>

      <div v-else-if="loadError" class="error-state">
        <AlertCircle class="error-icon" />
        <p class="error-message">{{ loadError }}</p>
        <button class="retry-btn" @click="init">重试</button>
      </div>

      <div v-else class="main">
        <div class="plan-card">
          <div class="plan-card-top">
            <div class="plan-meta">
              <div class="plan-id">计划ID: {{ plan?.plan_id }}</div>
              <div class="plan-range">{{ plan?.start_date || '-' }} - {{ plan?.end_date || '长期' }}</div>
            </div>
            <div class="plan-status" :class="plan?.status">
              {{ getStatusText(plan?.status || '') }}
            </div>
          </div>

          <div class="share-mode">
            <div class="mode-title">分享内容</div>
            <div class="mode-buttons">
              <button
                class="mode-btn"
                :class="{ active: !includeDetails }"
                @click="setIncludeDetails(false)"
                :disabled="sharingAny"
              >
                仅摘要
              </button>
              <button
                class="mode-btn"
                :class="{ active: includeDetails }"
                @click="setIncludeDetails(true)"
                :disabled="sharingAny"
              >
                完整计划
              </button>
            </div>
            <div class="mode-hint">
              {{ includeDetails ? '将对访问组成员下发组密钥，并用组密钥加密分享完整计划内容。' : '仅分享计划摘要（不包含具体用药信息）。' }}
            </div>
          </div>

          <div v-if="!isOwner" class="owner-warning">
            <AlertTriangle class="icon-small" />
            只有计划拥有者（患者）可分享此计划。
          </div>
        </div>

        <div class="groups">
          <div class="section-title">
            <Users class="icon-small" />
            访问组
          </div>

          <div v-if="groups.length === 0" class="empty-state">
            <p class="empty-text">暂无可用访问组</p>
            <button class="create-btn" @click="goToGroups">去创建/管理访问组</button>
          </div>

          <div v-else class="group-list">
            <div v-for="g in groups" :key="String(g.id)" class="group-card">
              <div class="group-top" @click="toggleExpand(String(g.id))">
                <div class="group-left">
                  <div class="group-icon" :class="getGroupColorClass(g.group_type)">
                    <component :is="getGroupIcon(g.group_type)" class="group-icon-inner" />
                  </div>
                  <div class="group-info">
                    <div class="group-name">{{ g.group_name }}</div>
                    <div class="group-sub">
                      {{ Number(g.member_count || 0) }} 人
                      <span v-if="g.outbox" class="outbox-badge">
                        已分享({{ g.outbox.include_details ? '完整' : '摘要' }})
                      </span>
                    </div>
                  </div>
                </div>

                <div class="group-actions">
                  <button
                    class="action-btn"
                    @click.stop="shareToGroup(String(g.id))"
                    :disabled="!isOwner || sharingGroupId === String(g.id) || planStatusNotShareable"
                  >
                    <span v-if="sharingGroupId !== String(g.id)">分享</span>
                    <span v-else class="spinner-text">
                      <Loader2 class="spinner-mini" />
                      分享中
                    </span>
                  </button>
                  <ChevronDown v-if="expandedGroupId !== String(g.id)" class="chevron" />
                  <ChevronUp v-else class="chevron" />
                </div>
              </div>

              <div v-if="expandedGroupId === String(g.id)" class="group-body">
                <div v-if="membersLoadingId === String(g.id)" class="members-loading">
                  <Loader2 class="spinner-mini" />
                  正在加载成员...
                </div>

                <div v-else>
                  <div class="members-summary">
                    已接受: {{ acceptedCount(String(g.id)) }}
                    <span class="sep">|</span>
                    待接受: {{ pendingCount(String(g.id)) }}
                  </div>

                  <div v-if="(membersByGroup[String(g.id)] || []).length === 0" class="members-empty">
                    暂无成员
                  </div>

                  <div v-else class="member-list">
                    <div
                      v-for="m in membersByGroup[String(g.id)]"
                      :key="String(m.id || m.viewer_address || Math.random())"
                      class="member-item"
                    >
                      <div class="member-avatar">
                        {{ getInitial(String(m.viewer_address || '0x')) }}
                      </div>
                      <div class="member-info">
                        <div class="member-address">{{ formatAddress(String(m.viewer_address || '')) }}</div>
                        <div class="member-status" :class="String(m.status || '')">
                          {{ getMemberStatusText(String(m.status || '')) }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="members-foot">
                    <button class="secondary-btn" @click="refreshGroup(String(g.id))" :disabled="membersLoadingId === String(g.id)">
                      刷新成员
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { aaService } from '@/service/accountAbstraction';
import { authService } from '@/service/auth';
import { medicationPlanStorageService } from '@/service/medicationPlanStorage';
import { medicationService, type MedicationPlan, type MedicationPlanData } from '@/service/medication';
import { relationService } from '@/service/relation';
import { planShareService } from '@/service/planShareService';
import { sharedMedicationPlanOutboxStorageService } from '@/service/sharedMedicationPlanOutboxStorage';
import { secureExchangeService } from '@/service/secureExchange';
import { uiService } from '@/service/ui';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Hospital,
  Microscope,
  Building2,
  ClipboardList,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const loadError = ref('');

const plan = ref<MedicationPlan | null>(null);
const planData = ref<MedicationPlanData | null>(null);

const groups = ref<any[]>([]);
const expandedGroupId = ref<string>('');
const membersByGroup = reactive<Record<string, any[]>>({});
const membersLoadingId = ref<string>('');

const includeDetails = ref(false);
const sharingGroupId = ref<string>('');

const isOwner = ref(false);

const sharingAny = computed(() => !!sharingGroupId.value);
const planStatusNotShareable = computed(() => {
  const s = String(plan.value?.status || '');
  return s !== 'active' && s !== 'completed' && s !== 'cancelled';
});

function goBack() {
  router.back();
}

function goToGroups() {
  router.push('/relationships');
}

function formatAddress(address: string) {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getInitial(address: string) {
  return address?.substring(2, 4)?.toUpperCase() || '??';
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    active: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
}

function getMemberStatusText(status: string) {
  const map: Record<string, string> = {
    accepted: '已接受',
    pending: '待接受',
    active: '活跃',
    suspended: '已暂停',
    revoked: '已撤销',
  };
  return map[status] || status;
}

function getGroupIcon(groupType?: string) {
  const icons: Record<string, any> = {
    FAMILY: Users,
    FAMILY_PRIMARY: Users,
    PRIMARY_DOCTOR: Stethoscope,
    FAMILY_DOCTOR: Hospital,
    SPECIALIST: Microscope,
    HOSPITAL: Building2,
    HEALTHCARE_TEAM: Hospital,
    EMERGENCY_CONTACT: AlertTriangle,
    THERAPIST: Stethoscope,
    CUSTOM: ClipboardList,
  };

  if (!groupType) return Users;
  return icons[groupType] || Users;
}

function getGroupColorClass(groupType?: string) {
  const colors: Record<string, string> = {
    FAMILY: 'blue',
    FAMILY_PRIMARY: 'blue',
    PRIMARY_DOCTOR: 'green',
    FAMILY_DOCTOR: 'teal',
    SPECIALIST: 'purple',
    HOSPITAL: 'orange',
    HEALTHCARE_TEAM: 'teal',
    EMERGENCY_CONTACT: 'red',
    THERAPIST: 'indigo',
    CUSTOM: 'gray',
  };

  if (!groupType) return 'blue';
  return colors[groupType] || 'blue';
}

async function loadPlan() {
  const planId = String(route.params.planId || '');
  if (!planId) {
    throw new Error('缺少计划ID');
  }

  const local = await medicationPlanStorageService.getPlan(planId);
  if (local) {
    plan.value = local;
    return;
  }

  plan.value = await medicationService.getPlan(planId);
  if (plan.value) {
    await medicationPlanStorageService.savePlan(plan.value, '');
  }
}

async function resolveOwner() {
  const userInfo = await authService.getUserInfo();
  const wallet = aaService.getEOAWallet();

  if (!userInfo || !wallet || !plan.value) {
    isOwner.value = false;
    return;
  }

  const currentSmart = String(userInfo.smart_account || '').toLowerCase();
  const currentEOA = String(wallet.address || '').toLowerCase();

  const patientSmart = String(plan.value.patient_address || '').toLowerCase();
  const patientEOA = String(plan.value.patient_eoa || '').toLowerCase();

  isOwner.value = currentSmart === patientSmart || (!!patientEOA && currentEOA === patientEOA);
}

async function ensureDecryptedPlanData(): Promise<MedicationPlanData | null> {
  if (planData.value) {
    return planData.value;
  }

  if (!plan.value) {
    return null;
  }

  const wallet = aaService.getEOAWallet();
  const userInfo = await authService.getUserInfo();
  if (!wallet || !userInfo) {
    return null;
  }

  const peerAddress = plan.value.doctor_address || plan.value.doctor_eoa;
  if (!peerAddress) {
    return null;
  }

  const peerPublicKey = await secureExchangeService.getRecipientPublicKey(peerAddress);
  const decrypted = await medicationService.decryptPlanData(
    plan.value.encrypted_plan_data,
    wallet.privateKey,
    peerPublicKey
  );

  planData.value = decrypted;
  return decrypted;
}

async function loadGroups() {
  const list = await relationService.getAccessGroupsStats();
  const planId = String(plan.value?.plan_id || '');

  const withOutbox = [] as any[];
  for (const g of list || []) {
    const outbox = planId ? await sharedMedicationPlanOutboxStorageService.getOutbox(String(g.id), planId) : null;
    withOutbox.push({ ...g, outbox });
  }

  groups.value = withOutbox;
}

async function loadMembers(groupId: string) {
  membersLoadingId.value = groupId;
  try {
    const members = await relationService.getGroupMembers(groupId);
    membersByGroup[groupId] = members || [];
  } finally {
    membersLoadingId.value = '';
  }
}

async function refreshGroup(groupId: string) {
  await loadMembers(groupId);
  const planId = String(plan.value?.plan_id || '');
  if (!planId) return;

  const outbox = await sharedMedicationPlanOutboxStorageService.getOutbox(groupId, planId);
  const idx = groups.value.findIndex(g => String(g.id) === String(groupId));
  if (idx >= 0) {
    groups.value[idx] = { ...groups.value[idx], outbox };
  }
}

async function toggleExpand(groupId: string) {
  if (expandedGroupId.value === groupId) {
    expandedGroupId.value = '';
    return;
  }

  expandedGroupId.value = groupId;
  if (!membersByGroup[groupId]) {
    await loadMembers(groupId);
  }
}

function acceptedCount(groupId: string) {
  const list = membersByGroup[groupId] || [];
  return list.filter(m => String(m.status || '').toLowerCase() === 'accepted').length;
}

function pendingCount(groupId: string) {
  const list = membersByGroup[groupId] || [];
  return list.filter(m => String(m.status || '').toLowerCase() !== 'accepted').length;
}

async function setIncludeDetails(v: boolean) {
  includeDetails.value = v;
  if (v && isOwner.value) {
    try {
      await ensureDecryptedPlanData();
    } catch (e: any) {
      includeDetails.value = false;
      uiService.toast(e?.message || '解密失败，无法分享完整计划', { type: 'error' });
    }
  }
}

async function shareToGroup(groupId: string) {
  if (!plan.value) return;
  if (!isOwner.value) return;

  try {
    sharingGroupId.value = groupId;

    const wallet = aaService.getEOAWallet();
    if (!wallet) {
      throw new Error('无法获取钱包');
    }

    let data: MedicationPlanData | null = null;
    if (includeDetails.value) {
      data = await ensureDecryptedPlanData();
      if (!data) {
        throw new Error('计划未解密，无法分享完整内容');
      }
    }

    const result = await planShareService.sharePlanToGroup(
      wallet,
      plan.value,
      includeDetails.value ? data : null,
      groupId,
      includeDetails.value
    );

    uiService.toast(`分享完成：已发送给 ${result.sharedCount} 个成员（组密钥版本 v${result.keyVersion}）`, {
      type: 'success',
      durationMs: 2600,
    });
    await refreshGroup(groupId);
  } catch (e: any) {
    uiService.toast(e?.message || '分享失败', { type: 'error' });
  } finally {
    sharingGroupId.value = '';
  }
}

async function init() {
  try {
    loading.value = true;
    loadError.value = '';

    await loadPlan();
    await resolveOwner();
    await loadGroups();
  } catch (e: any) {
    loadError.value = e?.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(init);
</script>

<style scoped>
.plan-share-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #667eea;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon {
  width: 22px;
  height: 22px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.placeholder {
  width: 40px;
}

.content {
  padding: 18px;
  max-width: 900px;
  margin: 0 auto;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #718096;
}

.spinner {
  width: 40px;
  height: 40px;
  color: #667eea;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.spinner-mini {
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  width: 46px;
  height: 46px;
  color: #ef4444;
  margin-bottom: 12px;
}

.error-message {
  color: #ef4444;
  margin: 12px 0 18px;
}

.retry-btn {
  padding: 10px 16px;
  border-radius: 10px;
  background: #667eea;
  color: #fff;
  border: none;
}

.plan-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.plan-card-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.plan-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plan-id {
  font-size: 13px;
  color: #4a5568;
}

.plan-range {
  font-size: 12px;
  color: #718096;
}

.plan-status {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: #edf2f7;
  color: #4a5568;
}

.plan-status.active {
  background: #dcfce7;
  color: #166534;
}

.plan-status.cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.plan-status.completed {
  background: #e0e7ff;
  color: #3730a3;
}

.share-mode {
  margin-top: 14px;
}

.mode-title {
  font-size: 13px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 8px;
}

.mode-buttons {
  display: flex;
  gap: 10px;
}

.mode-btn {
  flex: 1;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #2d3748;
  font-weight: 600;
}

.mode-btn.active {
  background: #667eea;
  border-color: #667eea;
  color: #fff;
}

.mode-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #718096;
  line-height: 1.5;
}

.owner-warning {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff7ed;
  color: #9a3412;
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}

.icon-small {
  width: 16px;
  height: 16px;
}

.groups {
  margin-top: 18px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  color: #2d3748;
  margin: 12px 0;
}

.empty-state {
  background: #fff;
  padding: 18px;
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
}

.empty-text {
  margin: 0 0 12px;
  color: #4a5568;
}

.create-btn {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: none;
  background: #667eea;
  color: #fff;
  font-weight: 700;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.group-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  gap: 12px;
  cursor: pointer;
}

.group-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.group-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.group-icon-inner {
  width: 20px;
  height: 20px;
  color: #fff;
}

.group-icon.blue { background: linear-gradient(135deg, #60a5fa, #2563eb); }
.group-icon.green { background: linear-gradient(135deg, #34d399, #059669); }
.group-icon.teal { background: linear-gradient(135deg, #2dd4bf, #0f766e); }
.group-icon.purple { background: linear-gradient(135deg, #a78bfa, #6d28d9); }
.group-icon.orange { background: linear-gradient(135deg, #fb923c, #ea580c); }
.group-icon.red { background: linear-gradient(135deg, #f87171, #dc2626); }
.group-icon.indigo { background: linear-gradient(135deg, #818cf8, #4f46e5); }
.group-icon.gray { background: linear-gradient(135deg, #94a3b8, #475569); }

.group-info {
  min-width: 0;
}

.group-name {
  font-size: 15px;
  font-weight: 800;
  color: #1a202c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #718096;
  display: flex;
  gap: 8px;
  align-items: center;
}

.outbox-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
  font-weight: 700;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-btn {
  padding: 8px 12px;
  border-radius: 12px;
  border: none;
  background: #667eea;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chevron {
  width: 18px;
  height: 18px;
  color: #718096;
}

.group-body {
  padding: 12px 14px 14px;
  border-top: 1px solid #edf2f7;
}

.members-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #718096;
  font-size: 13px;
}

.members-summary {
  font-size: 12px;
  color: #4a5568;
  margin-bottom: 10px;
}

.sep {
  margin: 0 8px;
  color: #cbd5e0;
}

.members-empty {
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.member-avatar {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: #eef2ff;
  color: #4338ca;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.member-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.member-address {
  font-size: 13px;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-status {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  flex-shrink: 0;
}

.member-status.accepted {
  background: #dcfce7;
  color: #166534;
}

.member-status.pending {
  background: #fef3c7;
  color: #92400e;
}

.members-foot {
  margin-top: 12px;
}

.secondary-btn {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #2d3748;
  font-weight: 700;
}
</style>
