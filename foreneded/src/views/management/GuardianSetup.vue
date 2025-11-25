<template>
  <div class="guardian-setup-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="page-title">守护者设置</h1>
    </div>
    
    <!-- 主要内容 -->
    <div class="content">
      <!-- 说明卡片 -->
      <div class="info-card">
        <div class="info-icon">🛡️</div>
        <h2 class="info-title">什么是守护者？</h2>
        <p class="info-desc">
          守护者是您信任的人，当您遗失密码时，他们可以帮助您恢复账户访问权限。建议至少添加2位守护者。
        </p>
      </div>
      
      <!-- 当前守护者列表 -->
      <div class="guardian-section">
        <h2 class="section-title">
          我的守护者
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
              ×
            </button>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <div class="empty-icon">🔒</div>
          <p class="empty-text">还没有设置守护者</p>
        </div>
        
        <!-- 添加守护者按钮 -->
        <button
          v-if="guardians.length < maxGuardians"
          class="add-guardian-btn"
          @click="showAddGuardian = true"
        >
          <span class="add-icon">+</span>
          添加守护者
        </button>
      </div>
      
      <!-- 恢复阈值设置 -->
      <div class="threshold-section">
        <h2 class="section-title">恢复阈值</h2>
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
        </div>
        
        <button
          v-if="threshold > 0 && threshold !== currentThreshold"
          class="save-threshold-btn"
          @click="saveThreshold"
          :disabled="isSaving"
        >
          <span v-if="!isSaving">保存阈值设置</span>
          <span v-else class="spinner-text">
            <span class="spinner"></span>
            保存中...
          </span>
        </button>
      </div>
    </div>
    
    <!-- 添加守护者弹窗 -->
    <div v-if="showAddGuardian" class="modal-overlay" @click="closeAddGuardian">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>添加守护者</h3>
          <button class="close-btn" @click="closeAddGuardian">×</button>
        </div>
        <div class="modal-content">
          <p class="modal-desc">从您的家人和医生中选择守护者</p>
          
          <div v-if="relations.length === 0" class="empty-relations">
            <p>您还没有添加家人或医生</p>
            <button class="go-family-btn" @click="goToFamilyCircle">前往家庭圈</button>
          </div>
          
          <div v-else class="relation-list">
            <div
              v-for="relation in availableRelations"
              :key="relation.id"
              class="relation-item"
              :class="{ selected: selectedRelationId === relation.id }"
              @click="selectedRelationId = relation.id"
            >
              <div class="relation-avatar">
                {{ getGroupIcon(relation.groupType) }}
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
              <div v-if="selectedRelationId === relation.id" class="check-icon">✓</div>
            </div>
          </div>
          
          <p v-if="addError" class="error-text">{{ addError }}</p>
          <button
            class="confirm-btn"
            @click="addGuardian"
            :disabled="!selectedRelationId || isAdding"
          >
            <span v-if="!isAdding">确认添加</span>
            <span v-else class="spinner-text">
              <span class="spinner"></span>
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
import type { Relationship } from '../../service/relation';

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
  if (!groupType) return '👤';
  
  const icons: Record<string, string> = {
    'FAMILY': '👨‍👩‍👧‍👦',
    'FAMILY_PRIMARY': '👨‍👩‍👧‍👦',
    'PRIMARY_DOCTOR': '👨‍⚕️',
    'FAMILY_DOCTOR': '🏥',
    'SPECIALIST': '🔬',
    'HOSPITAL': '🏨',
    'HEALTHCARE_TEAM': '🏥',
    'EMERGENCY_CONTACT': '🚨',
    'THERAPIST': '🧘',
    'CUSTOM': '📋'
  };
  
  return icons[groupType] || '👤';
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

const loadGuardians = async () => {
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
  } catch (error: any) {
    console.error('加载守护者失败:', error);
  }
};

const addGuardian = async () => {
  if (!selectedRelationId.value) return;
  
  isAdding.value = true;
  addError.value = '';
  
  try {
    const accountAddress = aaService.getAbstractAccountAddress();
    const eoaWallet = (aaService as any).eoaWallet;
    
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
    await loadGuardians();
    closeAddGuardian();
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
    const eoaWallet = (aaService as any).eoaWallet;
    
    if (!accountAddress || !eoaWallet) {
      throw new Error('请先登录');
    }
    
    await guardianService.setRecoveryThreshold(
      accountAddress,
      threshold.value,
      eoaWallet
    );
    
    currentThreshold.value = threshold.value;
    alert('阈值设置成功！');
  } catch (error: any) {
    console.error('设置阈值失败:', error);
    alert(error.message || '设置失败');
  } finally {
    isSaving.value = false;
  }
};

const confirmRemove = (guardian: string) => {
  if (confirm(`确定要移除守护者 ${formatAddress(guardian)} 吗？`)) {
    // TODO: 实现移除守护者功能
    alert('移除功能暂未实现');
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
  gap: 15px;
  padding: 20px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.back-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #4299e1;
  cursor: pointer;
  padding: 8px;
}

.page-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.content {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.info-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px;
  padding: 25px;
  margin-bottom: 25px;
  text-align: center;
}

.info-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.info-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.info-desc {
  font-size: 0.95rem;
  line-height: 1.6;
  opacity: 0.9;
  margin: 0;
}

.guardian-section,
.threshold-section {
  background: white;
  border-radius: 16px;
  padding: 25px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.count-badge {
  background: #edf2f7;
  color: #4a5568;
  font-size: 0.9rem;
  padding: 4px 12px;
  border-radius: 12px;
}

.section-desc {
  color: #718096;
  font-size: 0.9rem;
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
  gap: 15px;
  padding: 15px;
  background: #f7fafc;
  border-radius: 12px;
  transition: background 0.2s;
}

.guardian-item:hover {
  background: #edf2f7;
}

.guardian-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  color: white;
  font-size: 1.2rem;
  font-weight: 600;
}

.guardian-info {
  flex: 1;
}

.guardian-name {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.guardian-address {
  font-size: 0.85rem;
  color: #718096;
  font-family: monospace;
  margin: 0;
}

.remove-btn {
  background: #fed7d7;
  color: #c53030;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: #fc8181;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 15px;
  opacity: 0.5;
}

.empty-text {
  color: #a0aec0;
  margin: 0;
}

.add-guardian-btn {
  width: 100%;
  background: white;
  color: #4299e1;
  border: 2px dashed #4299e1;
  border-radius: 12px;
  padding: 16px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.add-guardian-btn:hover {
  background: #f7fafc;
  border-color: #3182ce;
}

.add-icon {
  font-size: 1.5rem;
}

.threshold-selector {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.threshold-btn {
  flex: 1;
  min-width: 60px;
  background: #f7fafc;
  color: #4a5568;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  font-size: 1.3rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.threshold-btn:hover:not(:disabled) {
  border-color: #4299e1;
}

.threshold-btn.active {
  background: #4299e1;
  color: white;
  border-color: #4299e1;
}

.threshold-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.save-threshold-btn {
  width: 100%;
  background: #48bb78;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 16px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.save-threshold-btn:hover:not(:disabled) {
  background: #38a169;
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
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 450px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #a0aec0;
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f7fafc;
}

.modal-content {
  padding: 20px;
}

.modal-desc {
  color: #718096;
  font-size: 0.95rem;
  margin: 0 0 15px 0;
}

.address-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.95rem;
  font-family: monospace;
  margin-bottom: 15px;
  transition: border-color 0.2s;
}

.address-input:focus {
  outline: none;
  border-color: #4299e1;
}

.error-text {
  color: #e53e3e;
  font-size: 0.9rem;
  margin: -10px 0 15px 0;
}

.confirm-btn {
  width: 100%;
  padding: 14px;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.confirm-btn:hover:not(:disabled) {
  background: #3182ce;
}

.confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-text {
  display: flex;
  align-items: center;
  gap: 10px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 关系人列表样式 */
.empty-relations {
  text-align: center;
  padding: 30px 20px;
}

.empty-relations p {
  color: #718096;
  margin-bottom: 16px;
}

.go-family-btn {
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
}

.go-family-btn:hover {
  background: #3182ce;
}

.relation-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.relation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.relation-item:hover {
  border-color: #4299e1;
  background: #f7fafc;
}

.relation-item.selected {
  border-color: #4299e1;
  background: #ebf8ff;
}

.relation-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.relation-info {
  flex: 1;
}

.relation-name {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 4px;
}

.relation-address {
  font-size: 0.85rem;
  color: #718096;
  font-family: monospace;
}

.check-icon {
  color: #4299e1;
  font-size: 1.5rem;
  font-weight: bold;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 关系人列表样式 */
.relation-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.relation-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: #f7fafc;
  margin-bottom: 10px;
}

.relation-item:hover {
  background: #edf2f7;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.relation-item.selected {
  background: #ebf8ff;
  border: 2px solid #4299e1;
}

.relation-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.relation-info {
  flex: 1;
  min-width: 0;
}

.relation-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 6px;
  font-family: monospace;
}

.relation-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.group-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #e6fffa;
  color: #047857;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid #a7f3d0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.active,
.status-badge.accepted {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.status-badge.suspended,
.status-badge.revoked {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.check-icon {
  font-size: 1.5rem;
  color: #4299e1;
  font-weight: bold;
  flex-shrink: 0;
}
</style>
