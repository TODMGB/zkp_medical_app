<template>
  <div class="family-circle-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="page-title">我的访问组</h1>
      <button class="add-btn" @click="showCreateModal">
        <Plus class="icon" />
      </button>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-container">
      <Loader2 class="spinner" />
      <p>加载中...</p>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="errorMessage && !isLoading" class="error-banner">
      <AlertCircle class="error-icon" />
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
          <Users class="empty-icon" />
          <p>还没有访问组</p>
          <p class="empty-hint">点击右上角 + 创建访问组</p>
        </div>
        
        <div
          v-for="group in accessGroups"
          :key="group.id"
          class="group-card"
          @click="viewGroupDetail(group)"
        >
          <div class="group-icon-wrapper" :class="getGroupColorClass(group.group_type)">
            <component :is="getGroupIcon(group.group_type)" class="group-icon" />
          </div>
          <div class="group-info">
            <h3 class="group-name">{{ group.group_name }}</h3>
            <p class="group-type">{{ getGroupTypeText(group.group_type) }}</p>
            <p class="group-desc">{{ group.description || '暂无描述' }}</p>
            <div class="group-stats">
              <span class="stat-item">
                <Users class="stat-icon" />
                <span class="stat-text">{{ group.member_count || 0 }} 成员</span>
              </span>
              <span class="stat-item">
                <Shield class="stat-icon" />
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
              <Plus class="icon-small" />
            </button>
            <ChevronRight class="action-arrow" />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 快捷操作按钮 -->
    <div class="quick-actions">
      <button class="action-btn primary" @click="showInviteModal">
        <UserPlus class="btn-icon" />
        <span>邀请加入群组</span>
      </button>
      
      <button class="action-btn secondary" @click="scanToJoin">
        <QrCode class="btn-icon" />
        <span>扫码加入其他人的群组</span>
      </button>
    </div>
    
    <!-- 创建群组弹窗 -->
    <div v-if="showCreateGroupModal" class="modal-overlay" @click="closeCreateGroupModal">
      <div class="create-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">创建自定义群组</h3>
          <button class="close-btn" @click="closeCreateGroupModal">
            <X class="icon" />
          </button>
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
          <button class="close-btn" @click="closeInviteSelectModal">
            <X class="icon" />
          </button>
        </div>
        <div class="modal-content">
          <div class="form-group">
            <label>选择群组</label>
            <div class="select-wrapper">
              <select v-model="selectedGroupId" class="form-select">
                <option value="" disabled>请选择要邀请加入的群组</option>
                <option 
                  v-for="group in accessGroups" 
                  :key="group.id" 
                  :value="group.id"
                >
                  {{ group.group_name }} ({{ getGroupTypeText(group.group_type) }})
                </option>
              </select>
              <ChevronDown class="select-arrow" />
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
import { uiService } from '@/service/ui'
import { 
  ArrowLeft, 
  Plus, 
  Users, 
  ClipboardList, 
  Stethoscope, 
  Hospital, 
  Microscope, 
  Building2, 
  Folder, 
  QrCode, 
  X, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  Shield,
  UserPlus,
  ChevronDown
} from 'lucide-vue-next'

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
  const icons: Record<string, any> = {
    'FAMILY': Users,
    'PRIMARY_DOCTOR': Stethoscope,
    'FAMILY_DOCTOR': Hospital,
    'SPECIALIST': Microscope,
    'HOSPITAL': Building2,
    'CUSTOM': ClipboardList
  }
  return icons[groupType] || Folder
}

// 获取群组颜色类
const getGroupColorClass = (groupType: string) => {
  const colors: Record<string, string> = {
    'FAMILY': 'blue',
    'PRIMARY_DOCTOR': 'green',
    'FAMILY_DOCTOR': 'teal',
    'SPECIALIST': 'purple',
    'HOSPITAL': 'orange',
    'CUSTOM': 'gray'
  }
  return colors[groupType] || 'gray'
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
  router.push({
    name: 'Invitation',
    query: {
      groupId: group.id,
      groupName: group.group_name,
      groupType: group.group_type,
    }
  })
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
    uiService.toast('请输入群组名称', { type: 'warning' })
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
    
    uiService.toast('群组创建成功！', { type: 'success' })
  } catch (error: any) {
    console.error('创建群组失败:', error)
    uiService.toast('创建失败: ' + (error.message || '未知错误'), { type: 'error' })
  } finally {
    isLoading.value = false
  }
}

// 显示邀请弹窗（底部按钮）
const showInviteModal = () => {
  selectedGroupId.value = ''
  showInviteSelectModal.value = true
}

// 关闭邀请弹窗
const closeInviteSelectModal = () => {
  showInviteSelectModal.value = false
}

// 确认邀请
const confirmInvite = () => {
  if (!selectedGroupId.value) {
    uiService.toast('请选择群组', { type: 'warning' })
    return
  }
  
  const selectedGroup = accessGroups.value.find(g => g.id == selectedGroupId.value)
  
  router.push({
    name: 'Invitation',
    query: { 
      groupId: selectedGroupId.value,
      groupName: selectedGroup?.group_name,
      groupType: selectedGroup?.group_type,
    }
  })
  
  closeInviteSelectModal()
}

// 扫码加入其他人的群组
const scanToJoin = () => {
  router.push({
    name: 'QRScanner',
    query: { mode: 'group' }
  })
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
  padding-bottom: 90px;
}


.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn, .add-btn {
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

.back-btn:hover, .add-btn:hover {
  background: #f7fafc;
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

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 15px;
  color: #718096;
}

.spinner {
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
  color: #667eea;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  margin: 20px;
  padding: 15px;
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  border-radius: 8px;
  color: #b91c1c;
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-icon {
  width: 20px;
  height: 20px;
}

.groups-container {
  padding: 20px;
}

.section-header {
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.section-desc {
  font-size: 13px;
  color: #718096;
  margin: 0;
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.group-card {
  background-color: white;
  border-radius: 20px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  border: 1px solid transparent;
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-color: #ebf8ff;
}

.group-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.group-icon-wrapper.blue { background: #e0f2fe; color: #0ea5e9; }
.group-icon-wrapper.green { background: #dcfce7; color: #22c55e; }
.group-icon-wrapper.teal { background: #ccfbf1; color: #14b8a6; }
.group-icon-wrapper.purple { background: #f3e8ff; color: #a855f7; }
.group-icon-wrapper.orange { background: #ffedd5; color: #f97316; }
.group-icon-wrapper.gray { background: #f3f4f6; color: #6b7280; }

.group-icon {
  width: 28px;
  height: 28px;
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.group-type {
  font-size: 12px;
  color: #667eea;
  font-weight: 500;
  margin: 0 0 6px 0;
  background: #ebf4ff;
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
}

.group-desc {
  font-size: 13px;
  color: #718096;
  margin: 0 0 10px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #a0aec0;
}

.stat-icon {
  width: 14px;
  height: 14px;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.invite-btn {
  background-color: #ebf4ff;
  color: #667eea;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.invite-btn:hover {
  background-color: #667eea;
  color: white;
  transform: scale(1.05);
}

.icon-small {
  width: 18px;
  height: 18px;
}

.action-arrow {
  width: 20px;
  height: 20px;
  color: #cbd5e0;
}

.quick-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 20px 24px;
  background-color: white;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.05);
  display: flex;
  gap: 12px;
  z-index: 90;
}

.action-btn {
  flex: 1;
  border: none;
  border-radius: 16px;
  padding: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s;
}

.action-btn.primary {

  background: #4299e1;

  color: white;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
}

.action-btn.secondary {
  background-color: white;
  color: #667eea;
  border: 1px solid #bfdbfe;
}

.action-btn.secondary:hover {
  background-color: #ebf4ff;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #718096;
  background: white;
  border-radius: 20px;
  border: 2px dashed #e2e8f0;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: #cbd5e0;
  margin-bottom: 16px;
}

.empty-hint {
  font-size: 13px;
  color: #a0aec0;
  margin-top: 8px;
}

/* 模态框样式 */
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
  backdrop-filter: blur(4px);
  padding: 20px;
}

.create-modal, .invite-select-modal {
  background-color: white;
  border-radius: 24px;
  width: 100%;
  max-width: 400px;
  max-height: min(560px, calc(100dvh - 40px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
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
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
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
  flex: 1;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.form-input, .form-textarea, .form-select {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-body);
  transition: all 0.3s;
}

.form-input:focus, .form-textarea:focus, .form-select:focus {
  outline: none;
  border-color: var(--color-primary);
  background: white;
  box-shadow: 0 0 0 3px var(--primary-100);
}

.select-wrapper {
  position: relative;
}

.form-select {
  appearance: none;
  padding-right: 40px;
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.invite-type-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.type-option {
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.type-option.active {
  border-color: var(--color-primary);
  background: var(--primary-50);
}

.option-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.option-icon-wrapper.blue { background: #e0f2fe; color: #0ea5e9; }
.option-icon-wrapper.green { background: #dcfce7; color: #22c55e; }

.option-icon {
  width: 24px;
  height: 24px;
}

.option-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: auto;
  padding-top: 20px;
}

@media (max-width: 420px) {
  .modal-overlay {
    padding: 12px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
  }

  .create-modal, .invite-select-modal {
    border-radius: 20px;
    max-width: 100%;
    max-height: calc(100dvh - 24px - env(safe-area-inset-bottom));
  }

  .modal-header {
    padding: 16px;
  }

  .modal-content {
    padding: 16px;
  }
}

.cancel-btn, .confirm-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn {
  background: var(--bg-body);
  border: none;
  color: var(--text-secondary);
}

.cancel-btn:hover {
  background: #e2e8f0;
}

.confirm-btn {
  background: var(--color-primary);
  border: none;
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  background: var(--primary-700);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
