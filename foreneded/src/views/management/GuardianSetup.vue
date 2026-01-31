<template>
  <div class="guardian-setup-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="page-title">守护者设置</h1>
      <div class="placeholder"></div>
    </div>
    
    <!-- 主要内容 -->
    <div class="content">
      <!-- 说明卡片 -->
      <div class="info-card">
        <Shield class="info-icon" />
        <h2 class="info-title">什么是守护者？</h2>
        <p class="info-desc">
          守护者是您信任的人，当您遗失密码时，他们可以帮助您恢复账户访问权限。建议至少添加2位守护者。
        </p>
      </div>
      
      <!-- 当前守护者列表 -->
      <div class="guardian-section">
        <h2 class="section-title">
          <div class="title-left">
            <Users class="title-icon" />
            我的守护者
          </div>
          <span class="count-badge">{{ guardians.length }}/{{ maxGuardians }}</span>
        </h2>
        
        <div v-if="guardians.length > 0" class="guardian-list">
          <div
            v-for="(guardian, index) in guardians"
            :key="index"
            class="guardian-item"
          >
            <div class="guardian-avatar">
              <span class="avatar-text">{{ getInitial(guardian) }}</span>
            </div>
            <div class="guardian-info">
              <h3 class="guardian-name">守护者 {{ index + 1 }}</h3>
              <p class="guardian-address">{{ formatAddress(guardian) }}</p>
            </div>
            <button class="remove-btn" @click="confirmRemove(guardian)">
              <X class="icon-small" />
            </button>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <ShieldAlert class="empty-icon" />
          <p class="empty-text">还没有设置守护者</p>
        </div>
        
        <!-- 添加守护者按钮 -->
        <button
          v-if="guardians.length < maxGuardians"
          class="add-guardian-btn"
          @click="showAddGuardian = true"
        >
          <Plus class="add-icon" />
          添加守护者
        </button>
      </div>
      
      <!-- 恢复阈值设置 -->
      <div class="threshold-section">
        <h2 class="section-title">
          <div class="title-left">
            <Settings class="title-icon" />
            恢复阈值
          </div>
        </h2>
        <p class="section-desc">需要多少位守护者同意才能恢复账户</p>
        
        <div class="threshold-selector">
          <button
            v-for="n in guardians.length"
            :key="n"
            class="threshold-btn"
            :class="{ active: threshold === n }"
            @click="selectThreshold(n)"
            :disabled="guardians.length === 0"
          >
            {{ n }}
          </button>
          <div v-if="guardians.length === 0" class="threshold-placeholder">
            请先添加守护者
          </div>
        </div>
        
        <button
          v-if="threshold > 0 && threshold !== currentThreshold"
          class="save-threshold-btn"
          @click="saveThreshold"
          :disabled="isSaving"
        >
          <span v-if="!isSaving">保存阈值设置</span>
          <span v-else class="spinner-text">
            <Loader2 class="spinner" />
            保存中...
          </span>
        </button>

        <button
          class="save-threshold-btn"
          style="margin-top: 12px"
          @click="checkRecoveryStatus"
        >
          查看恢复状态
        </button>

        <button
          class="save-threshold-btn"
          style="margin-top: 12px"
          @click="initiateRecovery"
        >
          发起恢复
        </button>

        <button
          class="save-threshold-btn"
          style="margin-top: 12px"
          @click="supportRecovery"
        >
          支持恢复
        </button>

        <button
          class="save-threshold-btn"
          style="margin-top: 12px"
          @click="cancelRecovery"
        >
          取消恢复
        </button>
      </div>
    </div>
    
    <!-- 添加守护者弹窗 -->
    <div v-if="showAddGuardian" class="modal-overlay" @click="closeAddGuardian">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>添加守护者</h3>
          <button class="close-btn" @click="closeAddGuardian">
            <X class="icon" />
          </button>
        </div>
        <div class="modal-content">
          <p class="modal-desc">从您的家人和医生中选择守护者</p>
          
          <div v-if="relations.length === 0" class="empty-relations">
            <Users class="empty-icon-small" />
            <p>您还没有添加家人或医生</p>
            <button class="go-family-btn" @click="goToFamilyCircle">
              前往家庭圈
              <ChevronRight class="icon-mini" />
            </button>
          </div>
          
          <div v-else class="relation-list">
            <div
              v-for="relation in availableRelations"
              :key="relation.id"
              class="relation-item"
              :class="{ selected: selectedRelationId === relation.id }"
              @click="selectedRelationId = relation.id"
            >
              <div class="relation-avatar-wrapper" :class="getGroupColorClass(relation.groupType)">
                <component :is="getGroupIcon(relation.groupType)" class="relation-avatar-icon" />
              </div>
              <div class="relation-info">
                <div class="relation-name">{{ formatAddress(relation.viewer_address) }}</div>
                <div class="relation-meta">
                  <span class="group-badge">{{ relation.groupName || '未知群组' }}</span>
                  <span v-if="relation.status" class="status-badge" :class="relation.status">
                    {{ getStatusText(relation.status) }}
                  </span>
                </div>
              </div>
              <div v-if="selectedRelationId === relation.id" class="check-icon">
                <Check class="icon-mini" />
              </div>
            </div>
          </div>
          
          <p v-if="addError" class="error-text">
            <AlertCircle class="icon-mini" />
            {{ addError }}
          </p>
          <button
            class="confirm-btn"
            @click="addGuardian"
            :disabled="!selectedRelationId || isAdding"
          >
            <span v-if="!isAdding">确认添加</span>
            <span v-else class="spinner-text">
              <Loader2 class="spinner" />
              添加中...
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { guardianService } from '../../service/guardian';
import { aaService } from '../../service/accountAbstraction';
import { relationService } from '../../service/relation';
import { authService } from '../../service/auth';
import { uiService } from '@/service/ui';
import type { Relationship } from '../../service/relation';
import { 
  ArrowLeft, 
  Shield, 
  Users, 
  X, 
  ShieldAlert, 
  Plus, 
  Settings, 
  Loader2, 
  ChevronRight, 
  Check, 
  AlertCircle,
  Stethoscope,
  Hospital,
  Microscope,
  Building2,
  ClipboardList
} from 'lucide-vue-next';

const router = useRouter();

const guardians = ref<string[]>([]);
const threshold = ref(0);
const currentThreshold = ref(0);
const maxGuardians = 5;

const showAddGuardian = ref(false);
const isAdding = ref(false);
const isSaving = ref(false);
const addError = ref('');

// 关系人列表（扩展了群组信息）
interface RelationWithGroup extends Relationship {
  groupName?: string;
  groupType?: string;
}
const relations = ref<RelationWithGroup[]>([]);
const selectedRelationId = ref<number | null>(null);

const goBack = () => {
  router.back();
};

const getInitial = (address: string) => {
  return address.substring(2, 4).toUpperCase();
};

const formatAddress = (address: string) => {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// 获取群组图标
const getGroupIcon = (groupType?: string) => {
  if (!groupType) return Users;
  
  const icons: Record<string, any> = {
    'FAMILY': Users,
    'FAMILY_PRIMARY': Users,
    'PRIMARY_DOCTOR': Stethoscope,
    'FAMILY_DOCTOR': Hospital,
    'SPECIALIST': Microscope,
    'HOSPITAL': Building2,
    'HEALTHCARE_TEAM': Hospital,
    'EMERGENCY_CONTACT': ShieldAlert,
    'THERAPIST': Stethoscope,
    'CUSTOM': ClipboardList
  };
  
  return icons[groupType] || Users;
};

// 获取群组颜色类
const getGroupColorClass = (groupType?: string) => {
  if (!groupType) return 'blue';
  
  const colors: Record<string, string> = {
    'FAMILY': 'blue',
    'FAMILY_PRIMARY': 'blue',
    'PRIMARY_DOCTOR': 'green',
    'FAMILY_DOCTOR': 'teal',
    'SPECIALIST': 'purple',
    'HOSPITAL': 'orange',
    'HEALTHCARE_TEAM': 'teal',
    'EMERGENCY_CONTACT': 'red',
    'THERAPIST': 'indigo',
    'CUSTOM': 'gray'
  };
  
  return colors[groupType] || 'blue';
};

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'active': '活跃',
    'accepted': '已接受',
    'pending': '待接受',
    'suspended': '已暂停',
    'revoked': '已撤销'
  };
  
  return statusMap[status] || status;
};

const closeAddGuardian = () => {
  showAddGuardian.value = false;
  selectedRelationId.value = null;
  addError.value = '';
};

const goToFamilyCircle = () => {
  router.push('/family-circle');
};

// 过滤出还未被添加为守护者的关系人
const availableRelations = computed(() => {
  return relations.value.filter(r => !guardians.value.includes(r.viewer_address));
});

// 加载关系人列表（从所有群组中加载）
const loadRelations = async () => {
  try {
    // 确保用户已登录后端（自动尝试指纹登录）
    console.log('检查后端登录状态...');
    const { authService } = await import('@/service/auth');
    await authService.ensureBackendLoginWithBiometric();
    
    const groups = await relationService.getAccessGroupsStats();
    console.log(`找到 ${groups.length} 个群组`);
    
    if (groups.length > 0) {
      // 从所有群组中加载成员
      const allMembers: any[] = [];
      const memberAddressSet = new Set<string>(); // 用于去重
      
      for (const group of groups) {
        try {
          console.log(`正在加载群组 "${group.group_name}" 的成员...`);
          const members = await relationService.getGroupMembers(group.id);
          
          // 去重添加成员（基于 viewer_address）
          members.forEach(member => {
            const address = member.viewer_address.toLowerCase();
            if (!memberAddressSet.has(address)) {
              memberAddressSet.add(address);
              allMembers.push({
                ...member,
                groupName: group.group_name, // 添加群组名称信息
                groupType: group.group_type
              });
            }
          });
        } catch (error: any) {
          console.error(`加载群组 "${group.group_name}" 的成员失败:`, error);
        }
      }
      
      relations.value = allMembers;
      console.log(`加载完成，共 ${allMembers.length} 个不重复的关系人`);
      console.log('关系人列表:', relations.value);
    }
  } catch (error: any) {
    console.error('加载关系人失败:', error);
  }
};

const loadGuardians = async (notifyOnError = false): Promise<boolean> => {
  try {
    const accountAddress = aaService.getAbstractAccountAddress();
    if (!accountAddress) {
      throw new Error('未找到账户地址');
    }
    
    const info = await guardianService.getGuardians(accountAddress);
    guardians.value = info.guardians;
    threshold.value = info.threshold;
    currentThreshold.value = info.threshold;
    
    console.log('守护者信息:', info);
    return true;
  } catch (error: any) {
    console.error('加载守护者失败:', error);
    if (notifyOnError) {
      uiService.toast(error.message || '加载守护者失败', { type: 'error' });
    }
    return false;
  }
};

const addGuardian = async () => {
  if (!selectedRelationId.value) return;
  
  isAdding.value = true;
  addError.value = '';
  
  try {
    const accountAddress = aaService.getAbstractAccountAddress();
    const eoaWallet = aaService.getEOAWallet();
    
    if (!accountAddress || !eoaWallet) {
      throw new Error('请先登录');
    }
    
    // 找到选中的关系人
    const selectedRelation = relations.value.find(r => r.id === selectedRelationId.value);
    if (!selectedRelation) {
      throw new Error('未找到选中的关系人');
    }
    
    // 添加守护者（使用viewer_address）
    await guardianService.addGuardian(
      accountAddress,
      selectedRelation.viewer_address,
      eoaWallet
    );
    
    // 重新加载列表
    const refreshed = await loadGuardians(true);
    await loadRelations();
    closeAddGuardian();
    uiService.toast(refreshed ? '添加守护者成功' : '添加守护者成功，但刷新列表失败', {
      type: refreshed ? 'success' : 'warning',
    });
  } catch (error: any) {
    console.error('添加守护者失败:', error);
    addError.value = error.message || '添加失败';
  } finally {
    isAdding.value = false;
  }
};

const selectThreshold = (n: number) => {
  threshold.value = n;
};

const saveThreshold = async () => {
  isSaving.value = true;
  
  try {
    const accountAddress = aaService.getAbstractAccountAddress();
    const eoaWallet = aaService.getEOAWallet();
    
    if (!accountAddress || !eoaWallet) {
      throw new Error('请先登录');
    }
    
    await guardianService.setRecoveryThreshold(
      accountAddress,
      threshold.value,
      eoaWallet
    );
    
    currentThreshold.value = threshold.value;
    uiService.toast('阈值设置成功！', { type: 'success' });
  } catch (error: any) {
    console.error('设置阈值失败:', error);
    uiService.toast(error.message || '设置失败', { type: 'error' });
  } finally {
    isSaving.value = false;
  }
};

const checkRecoveryStatus = async () => {
  try {
    const accountAddress = aaService.getAbstractAccountAddress();
    if (!accountAddress) {
      throw new Error('未找到账户地址');
    }

    const [info, status] = await Promise.all([
      guardianService.getAccountInfo(accountAddress).catch(() => null),
      guardianService.getRecoveryStatus(accountAddress),
    ]);

    const owner = info?.owner ? String(info.owner) : '未知';
    await uiService.alert(
      `当前Owner: ${owner}\n恢复目标新Owner: ${status.newOwner || '-'}\n已同意人数: ${status.approvalCount || 0}\n是否已执行: ${status.executed ? '是' : '否'}`,
      { title: '恢复状态' }
    );
  } catch (error: any) {
    console.error('查询恢复状态失败:', error);
    uiService.toast(error.message || '查询失败', { type: 'error' });
  }
};

const confirmRemove = async (guardian: string) => {
  const ok = await uiService.confirm(`确定要移除守护者 ${formatAddress(guardian)} 吗？`, { title: '确认操作' });
  if (ok) {
    await removeGuardian(guardian);
  }
};

const removeGuardian = async (guardianAddress: string) => {
  try {
    const accountAddress = aaService.getAbstractAccountAddress();
    const eoaWallet = aaService.getEOAWallet();
    if (!accountAddress || !eoaWallet) {
      throw new Error('请先登录');
    }

    await guardianService.removeGuardian(accountAddress, guardianAddress, eoaWallet);
    const refreshed = await loadGuardians(true);
    uiService.toast(refreshed ? '移除守护者成功' : '移除守护者成功，但刷新列表失败', {
      type: refreshed ? 'success' : 'warning',
    });
  } catch (error: any) {
    console.error('移除守护者失败:', error);
    uiService.toast(error.message || '移除失败', { type: 'error' });
  }
};

const initiateRecovery = async () => {
  try {
    const accountAddressInput = await uiService.prompt({
      title: '发起恢复',
      message: '请输入要恢复的账户地址（Smart Account）',
      defaultValue: aaService.getAbstractAccountAddress() || '',
      placeholder: '0x...',
      confirmText: '下一步',
      cancelText: '取消',
    });
    if (!accountAddressInput) return;

    const newOwnerAddress = await uiService.prompt({
      title: '发起恢复',
      message: '请输入新的Owner地址（EOA）',
      placeholder: '0x...',
      confirmText: '确认发起',
      cancelText: '取消',
    });
    if (!newOwnerAddress) return;

    const guardianAccountAddress = aaService.getAbstractAccountAddress();
    const eoaWallet = aaService.getEOAWallet();
    if (!guardianAccountAddress || !eoaWallet) {
      throw new Error('请先登录');
    }

    await guardianService.initiateRecovery(accountAddressInput, guardianAccountAddress, newOwnerAddress, eoaWallet);
    await checkRecoveryStatus();
    uiService.toast('已发起恢复', { type: 'success' });
  } catch (error: any) {
    console.error('发起恢复失败:', error);
    uiService.toast(error.message || '发起失败', { type: 'error' });
  }
};

const supportRecovery = async () => {
  try {
    const accountAddressInput = await uiService.prompt({
      title: '支持恢复',
      message: '请输入要支持恢复的账户地址（Smart Account）',
      defaultValue: aaService.getAbstractAccountAddress() || '',
      placeholder: '0x...',
      confirmText: '下一步',
      cancelText: '取消',
    });
    if (!accountAddressInput) return;

    const newOwnerAddress = await uiService.prompt({
      title: '支持恢复',
      message: '请输入恢复目标的新Owner地址（EOA）',
      placeholder: '0x...',
      confirmText: '确认支持',
      cancelText: '取消',
    });
    if (!newOwnerAddress) return;

    const guardianAccountAddress = aaService.getAbstractAccountAddress();
    const eoaWallet = aaService.getEOAWallet();
    if (!guardianAccountAddress || !eoaWallet) {
      throw new Error('请先登录');
    }

    await guardianService.supportRecovery(accountAddressInput, guardianAccountAddress, newOwnerAddress, eoaWallet);
    await checkRecoveryStatus();
    uiService.toast('已支持恢复', { type: 'success' });
  } catch (error: any) {
    console.error('支持恢复失败:', error);
    uiService.toast(error.message || '支持失败', { type: 'error' });
  }
};

const cancelRecovery = async () => {
  try {
    const accountAddressInput = await uiService.prompt({
      title: '取消恢复',
      message: '请输入要取消恢复的账户地址（Smart Account）',
      defaultValue: aaService.getAbstractAccountAddress() || '',
      placeholder: '0x...',
      confirmText: '确认取消',
      cancelText: '返回',
    });
    if (!accountAddressInput) return;

    const eoaWallet = aaService.getEOAWallet();
    if (!eoaWallet) {
      throw new Error('请先登录');
    }

    await guardianService.cancelRecovery(accountAddressInput, eoaWallet);
    await checkRecoveryStatus();
    uiService.toast('已取消恢复', { type: 'success' });
  } catch (error: any) {
    console.error('取消恢复失败:', error);
    uiService.toast(error.message || '取消失败', { type: 'error' });
  }
};

onMounted(async () => {
  await loadGuardians();
  await loadRelations();
});
</script>

<style scoped>
.guardian-setup-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 20px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background-color: white;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  background: none;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2d3748;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: var(--bg-body);
}

.icon {
  width: 24px;
  height: 24px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.placeholder {
  width: 40px;
}

.content {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.info-card {
  background: #667eea;
  color: white;
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 24px;
  text-align: center;
  box-shadow: var(--shadow-md);
}

.info-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.9;
}

.info-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 12px 0;
}

.info-desc {
  font-size: 14px;
  line-height: 1.6;
  opacity: 0.9;
  margin: 0;
}

.guardian-section,
.threshold-section {
  background: white;
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  width: 20px;
  height: 20px;
  color: var(--color-primary);
}

.count-badge {
  background: #f7fafc;
  color: #718096;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 10px;
  font-weight: 500;
}

.section-desc {
  color: #718096;
  font-size: 13px;
  margin: 0 0 20px 0;
}

.guardian-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.guardian-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f7fafc;
  border-radius: 16px;
  transition: all 0.3s;
}

.guardian-item:hover {
  background: #f1f5f9;
}

.guardian-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.avatar-text {
  color: white;
  font-size: 18px;
  font-weight: 700;
}

.guardian-info {
  flex: 1;
}

.guardian-name {
  font-size: 15px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.guardian-address {
  font-size: 12px;
  color: #a0aec0;
  font-family: 'Courier New', monospace;
  margin: 0;
}

.remove-btn {
  background: #fee2e2;
  color: #ef4444;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: #fecaca;
  transform: scale(1.05);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  background: #f7fafc;
  border-radius: 16px;
  margin-bottom: 20px;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: #a0aec0;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  color: #718096;
  margin: 0;
  font-size: 14px;
}

.add-guardian-btn {
  width: 100%;
  background: white;
  color: var(--color-primary);
  border: 2px dashed var(--primary-200);
  border-radius: 16px;
  padding: 16px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s;
}

.add-guardian-btn:hover {
  background: var(--primary-50);
  border-color: var(--color-primary);
}

.add-icon {
  width: 20px;
  height: 20px;
}

.threshold-selector {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.threshold-btn {
  flex: 1;
  min-width: 60px;
  background: white;
  color: #718096;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}

.threshold-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-2px);
}

.threshold-btn.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.threshold-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f7fafc;
}

.threshold-placeholder {
  width: 100%;
  text-align: center;
  padding: 20px;
  background: #f7fafc;
  border-radius: 12px;
  color: #a0aec0;
  font-size: 14px;
}

.save-threshold-btn {
  width: 100%;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 16px;
  padding: 16px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.save-threshold-btn:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
}

.save-threshold-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 450px;
  box-shadow: var(--shadow-xl);
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-body);
  color: var(--text-primary);
}

.modal-content {
  padding: 24px;
}

.modal-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0 0 20px 0;
}

.relation-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.relation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.relation-item:hover {
  background: var(--bg-body);
}

.relation-item.selected {
  border-color: var(--color-primary);
  background: var(--primary-50);
}

.relation-avatar-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.relation-avatar-wrapper.blue { background: #e0f2fe; color: #0ea5e9; }
.relation-avatar-wrapper.green { background: #dcfce7; color: #22c55e; }
.relation-avatar-wrapper.teal { background: #ccfbf1; color: #14b8a6; }
.relation-avatar-wrapper.purple { background: #f3e8ff; color: #a855f7; }
.relation-avatar-wrapper.orange { background: #ffedd5; color: #f97316; }
.relation-avatar-wrapper.red { background: #fee2e2; color: #ef4444; }
.relation-avatar-wrapper.indigo { background: #e0e7ff; color: #6366f1; }
.relation-avatar-wrapper.gray { background: #f3f4f6; color: #6b7280; }

.relation-avatar-icon {
  width: 20px;
  height: 20px;
}

.relation-info {
  flex: 1;
}

.relation-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.relation-meta {
  display: flex;
  gap: 6px;
}

.group-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--bg-body);
  border-radius: 4px;
  color: var(--text-secondary);
}

.status-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-badge.active { background: #dcfce7; color: #166534; }
.status-badge.pending { background: #fef3c7; color: #92400e; }

.check-icon {
  width: 24px;
  height: 24px;
  background: var(--color-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-mini {
  width: 14px;
  height: 14px;
}

.empty-relations {
  text-align: center;
  padding: 30px 20px;
  background: var(--bg-body);
  border-radius: 16px;
  margin-bottom: 20px;
}

.empty-icon-small {
  width: 32px;
  height: 32px;
  color: var(--text-tertiary);
  margin-bottom: 10px;
}

.go-family-btn {
  background: white;
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  color: var(--color-primary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
}

.error-text {
  color: #ef4444;
  font-size: 13px;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.confirm-btn {
  width: 100%;
  padding: 14px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.confirm-btn:hover:not(:disabled) {
  background: var(--primary-700);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  width: 18px;
  height: 18px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
