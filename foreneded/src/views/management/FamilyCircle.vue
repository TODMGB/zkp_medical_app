<template>
  <div class="family-circle-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="page-title">我的访问组</h1>
      <button class="add-btn" @click="showCreateModal">+</button>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="errorMessage && !isLoading" class="error-banner">
      {{ errorMessage }}
    </div>
    
    <!-- 访问组列表 -->
    <div v-if="!isLoading" class="groups-container">
      <div class="section-header">
        <h2 class="section-title">访问组管理 ({{ accessGroups.length }})</h2>
        <p class="section-desc">管理不同权限的访问群组</p>
      </div>
      
      <!-- 访问组卡片列表 -->
      <div class="groups-list">
        <div v-if="accessGroups.length === 0" class="empty-state">
          <p>还没有访问组</p>
          <p class="empty-hint">点击右上角 + 创建访问组</p>
        </div>
        
        <div
          v-for="group in accessGroups"
          :key="group.id"
          class="group-card"
          @click="viewGroupDetail(group)"
        >
          <div class="group-icon">
            {{ getGroupIcon(group.group_type) }}
          </div>
          <div class="group-info">
            <h3 class="group-name">{{ group.group_name }}</h3>
            <p class="group-type">{{ getGroupTypeText(group.group_type) }}</p>
            <p class="group-desc">{{ group.description || '暂无描述' }}</p>
            <div class="group-stats">
              <span class="stat-item">
                <span class="stat-icon">👥</span>
                <span class="stat-text">{{ group.member_count || 0 }} 成员</span>
              </span>
              <span class="stat-item">
                <span class="stat-icon">📋</span>
                <span class="stat-text">{{ getGroupPermissions(group.group_type) }}</span>
              </span>
            </div>
          </div>
          <div class="group-actions">
            <button 
              class="invite-btn" 
              @click.stop="inviteToGroup(group)"
              title="邀请成员"
            >
              +
            </button>
            <div class="action-arrow">›</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 快捷操作按钮 -->
    <div class="quick-actions">
      <button class="action-btn primary" @click="showInviteModal">
        <div class="btn-icon">➕</div>
        <span>邀请加入群组</span>
      </button>
      
      <button class="action-btn secondary" @click="scanToJoin">
        <div class="btn-icon">📷</div>
        <span>扫码加入其他人的群组</span>
      </button>
    </div>
    
    <!-- 创建群组弹窗 -->
    <div v-if="showCreateGroupModal" class="modal-overlay" @click="closeCreateGroupModal">
      <div class="create-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">创建自定义群组</h3>
          <button class="close-btn" @click="closeCreateGroupModal">×</button>
        </div>
        <div class="modal-content">
          <div class="form-group">
            <label>群组名称</label>
            <input 
              v-model="newGroupName" 
              type="text" 
              placeholder="例如：我的康复团队"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>群组描述（选填）</label>
            <textarea 
              v-model="newGroupDesc" 
              placeholder="简单描述这个群组的用途"
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>
          <div class="modal-actions">
            <button class="cancel-btn" @click="closeCreateGroupModal">取消</button>
            <button class="confirm-btn" @click="createNewGroup" :disabled="!newGroupName">创建</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 邀请加入群组弹窗 -->
    <div v-if="showInviteSelectModal" class="modal-overlay" @click="closeInviteSelectModal">
      <div class="invite-select-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">邀请加入群组</h3>
          <button class="close-btn" @click="closeInviteSelectModal">×</button>
        </div>
        <div class="modal-content">
          <div class="form-group">
            <label>选择群组</label>
            <select v-model="selectedGroupId" class="form-select">
              <option value="" disabled>请选择要邀请加入的群组</option>
              <option 
                v-for="group in accessGroups" 
                :key="group.id" 
                :value="group.id"
              >
                {{ getGroupIcon(group.group_type) }} {{ group.group_name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>邀请类型</label>
            <div class="invite-type-options">
              <button 
                class="type-option" 
                :class="{ active: inviteTypeSelect === 'family' }"
                @click="inviteTypeSelect = 'family'"
              >
                <span class="option-icon">👨‍👩‍👧‍👦</span>
                <span class="option-label">家属</span>
              </button>
              <button 
                class="type-option" 
                :class="{ active: inviteTypeSelect === 'doctor' }"
                @click="inviteTypeSelect = 'doctor'"
              >
                <span class="option-icon">👨‍⚕️</span>
                <span class="option-label">医生</span>
              </button>
            </div>
          </div>
          <div class="modal-actions">
            <button class="cancel-btn" @click="closeInviteSelectModal">取消</button>
            <button 
              class="confirm-btn" 
              @click="confirmInvite" 
              :disabled="!selectedGroupId"
            >
              生成邀请
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { relationService } from '@/service/relation'

const router = useRouter()

const showCreateGroupModal = ref(false)
const showInviteSelectModal = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

// 访问组列表
const accessGroups = ref<any[]>([])

// 创建群组表单
const newGroupName = ref('')
const newGroupDesc = ref('')

// 邀请选择表单
const selectedGroupId = ref<number | string | ''>('')
const inviteTypeSelect = ref<'family' | 'doctor'>('family')

// 加载所有访问组
const loadAccessGroups = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // 确保用户已登录后端（自动尝试指纹登录）
    console.log('检查后端登录状态...')
    const { authService } = await import('@/service/auth')
    
    try {
      await authService.ensureBackendLoginWithBiometric()
      console.log('后端登录状态正常')
    } catch (loginError: any) {
      console.error('自动登录失败:', loginError)
      errorMessage.value = loginError.message
      return
    }
    
    // 获取我的访问组统计（带成员数量）
    const groups = await relationService.getAccessGroupsStats()
    console.log('访问组列表:', groups)
    accessGroups.value = groups || []
  } catch (error: any) {
    console.error('加载访问组失败:', error)
    errorMessage.value = '加载失败: ' + (error.message || '未知错误')
  } finally {
    isLoading.value = false
  }
}

// 获取群组图标
const getGroupIcon = (groupType: string) => {
  const icons: Record<string, string> = {
    'FAMILY': '👨‍👩‍👧‍👦',
    'PRIMARY_DOCTOR': '👨‍⚕️',
    'FAMILY_DOCTOR': '🏥',
    'SPECIALIST': '🔬',
    'HOSPITAL': '🏨',
    'CUSTOM': '📋'
  }
  return icons[groupType] || '📁'
}

// 获取群组类型文本
const getGroupTypeText = (groupType: string) => {
  const texts: Record<string, string> = {
    'FAMILY': '家人群组',
    'PRIMARY_DOCTOR': '主治医生',
    'FAMILY_DOCTOR': '家庭医生',
    'SPECIALIST': '专科医生',
    'HOSPITAL': '医院',
    'CUSTOM': '自定义群组'
  }
  return texts[groupType] || '未知类型'
}

// 获取群组权限描述
const getGroupPermissions = (groupType: string) => {
  const permissions: Record<string, string> = {
    'FAMILY': '基础数据',
    'PRIMARY_DOCTOR': '完整数据',
    'FAMILY_DOCTOR': '医疗数据',
    'SPECIALIST': '专科数据',
    'HOSPITAL': '住院数据',
    'CUSTOM': '自定义权限'
  }
  return permissions[groupType] || '自定义'
}

// 查看群组详情
const viewGroupDetail = (group: any) => {
  // 跳转到群组详情页（显示成员列表）
  router.push({
    name: 'GroupDetail',
    params: { groupId: group.id },
    state: { group }
  })
}

// 快速邀请到指定群组（卡片上的+按钮）
const inviteToGroup = (group: any) => {
  // 预选该群组，然后显示邀请弹框
  selectedGroupId.value = group.id
  inviteTypeSelect.value = group.group_type === 'FAMILY' ? 'family' : 'doctor'
  showInviteSelectModal.value = true
}

// 显示创建群组弹窗（右上角+按钮）
const showCreateModal = () => {
  newGroupName.value = ''
  newGroupDesc.value = ''
  showCreateGroupModal.value = true
}

// 关闭创建群组弹窗
const closeCreateGroupModal = () => {
  showCreateGroupModal.value = false
}

// 创建新群组
const createNewGroup = async () => {
  if (!newGroupName.value.trim()) {
    alert('请输入群组名称')
    return
  }
  
  try {
    isLoading.value = true
    const group = await relationService.createAccessGroup(
      newGroupName.value.trim(),
      newGroupDesc.value.trim()
    )
    console.log('创建群组成功:', group)
    
    // 重新加载群组列表
    await loadAccessGroups()
    closeCreateGroupModal()
    
    alert('群组创建成功！')
  } catch (error: any) {
    console.error('创建群组失败:', error)
    alert('创建失败: ' + (error.message || '未知错误'))
  } finally {
    isLoading.value = false
  }
}

// 显示邀请弹窗（底部按钮）
const showInviteModal = () => {
  selectedGroupId.value = ''
  inviteTypeSelect.value = 'family'
  showInviteSelectModal.value = true
}

// 关闭邀请弹窗
const closeInviteSelectModal = () => {
  showInviteSelectModal.value = false
}

// 确认邀请
const confirmInvite = () => {
  if (!selectedGroupId.value) {
    alert('请选择群组')
    return
  }
  
  const selectedGroup = accessGroups.value.find(g => g.id === selectedGroupId.value)
  
  router.push({
    name: 'Invitation',
    query: { 
      groupId: selectedGroupId.value,
      groupName: selectedGroup?.group_name,
      groupType: selectedGroup?.group_type,
      type: inviteTypeSelect.value
    }
  })
  
  closeInviteSelectModal()
}

// 扫码加入其他人的群组
const scanToJoin = () => {
  router.push('/qr-scanner')
}

const goBack = () => {
  router.back()
}

onMounted(async () => {
  await loadAccessGroups()
})

// 页面激活时也重新加载（从其他页面返回时刷新数据）
onActivated(async () => {
  console.log('FamilyCircle页面激活，重新加载访问组数据')
  await loadAccessGroups()
})
</script>

<style scoped>
.family-circle-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 20px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.add-btn {
  background-color: #4299e1;
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.groups-container {
  padding: 20px;
}

.section-header {
  margin-bottom: 20px;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 5px 0;
}

.section-desc {
  font-size: 0.9rem;
  color: #718096;
  margin: 0;
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 80px;
}

.group-card {
  background-color: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 15px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

.group-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f7fafc;
  border-radius: 12px;
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.group-type {
  font-size: 0.85rem;
  color: #4299e1;
  font-weight: 500;
  margin: 0 0 6px 0;
}

.group-desc {
  font-size: 0.9rem;
  color: #718096;
  margin: 0 0 10px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-stats {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85rem;
  color: #718096;
}

.stat-icon {
  font-size: 1rem;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.invite-btn {
  background-color: #4299e1;
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.invite-btn:hover {
  background-color: #3182ce;
  transform: scale(1.1);
}

.action-arrow {
  font-size: 1.5rem;
  color: #cbd5e0;
}

.avatar-icon {
  font-size: 1.5rem;
}

.member-info {
  flex: 1;
}

.member-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 5px 0;
}

.member-relation {
  font-size: 0.9rem;
  color: #718096;
  margin: 0 0 5px 0;
}

.member-status {
  font-size: 0.8rem;
  font-weight: 500;
  margin: 0;
}

.member-status.active {
  color: #48bb78;
}

.member-status.pending {
  color: #ed8936;
}

.member-status.inactive {
  color: #e53e3e;
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.active {
  background-color: #48bb78;
}

.status-indicator.pending {
  background-color: #ed8936;
}

.status-indicator.inactive {
  background-color: #e53e3e;
}

.action-arrow {
  font-size: 1.2rem;
  color: #a0aec0;
  font-weight: 300;
}

.quick-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 15px 20px;
  background-color: white;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  display: flex;
  gap: 10px;
  z-index: 10;
}

.action-btn {
  flex: 1;
  border: none;
  border-radius: 12px;
  padding: 15px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.action-btn.primary {
  background-color: #4299e1;
  color: white;
}

.action-btn.primary:hover {
  background-color: #3182ce;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
}

.action-btn.secondary {
  background-color: white;
  color: #4299e1;
  border: 2px solid #4299e1;
}

.action-btn.secondary:hover {
  background-color: #ebf8ff;
}

.btn-icon {
  font-size: 1.2rem;
  line-height: 1;
}

.scan-join-btn span {
  font-size: 1rem;
  font-weight: 600;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #4299e1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-container p {
  color: #718096;
  font-size: 0.95rem;
}

.error-banner {
  background-color: #fed7d7;
  color: #c53030;
  padding: 16px 20px;
  margin: 16px;
  border-radius: 8px;
  font-size: 0.95rem;
  border-left: 4px solid #e53e3e;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #a0aec0;
}

.empty-state p {
  margin: 0 0 8px 0;
  font-size: 1rem;
}

.empty-hint {
  font-size: 0.9rem;
  color: #cbd5e0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.invite-modal,
.create-modal {
  background-color: white;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
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
  padding: 4px;
}

.modal-content {
  padding: 20px;
}

.modal-desc {
  color: #718096;
  margin: 0 0 20px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 0.95rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 8px;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #4299e1;
}

.form-textarea {
  resize: vertical;
}

.form-select {
  background-color: white;
  cursor: pointer;
}

.invite-type-options {
  display: flex;
  gap: 12px;
}

.type-option {
  flex: 1;
  background-color: #f7fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.type-option:hover {
  background-color: #edf2f7;
  border-color: #cbd5e0;
}

.type-option.active {
  background-color: #ebf8ff;
  border-color: #4299e1;
}

.type-option .option-icon {
  font-size: 2rem;
}

.type-option .option-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #2d3748;
}

.invite-select-modal {
  background-color: white;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.cancel-btn,
.confirm-btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.cancel-btn {
  background-color: #e2e8f0;
  color: #4a5568;
}

.cancel-btn:hover {
  background-color: #cbd5e0;
}

.confirm-btn {
  background-color: #4299e1;
  color: white;
}

.confirm-btn:hover {
  background-color: #3182ce;
}

.confirm-btn:disabled {
  background-color: #cbd5e0;
  cursor: not-allowed;
}
</style>
