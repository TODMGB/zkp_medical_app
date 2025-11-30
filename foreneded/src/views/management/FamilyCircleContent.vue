<template>
  <div class="family-circle-content">
    <!-- 顶部操作栏 -->
    <div class="action-bar">
      <button class="create-group-btn" @click="showCreateModal">
        <span class="btn-icon">➕</span>
        <span>创建自定义群组</span>
      </button>
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
          <div class="empty-icon">📁</div>
          <p class="empty-text">还没有访问组</p>
          <p class="empty-hint">点击上方按钮创建访问组</p>
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
            <div class="group-stats">
              <span class="stat-item">
                <span class="stat-icon">👥</span>
                <span>{{ group.member_count || 0 }} 成员</span>
              </span>
            </div>
          </div>
          <div class="group-arrow">→</div>
        </div>
      </div>
    </div>
    
    <!-- 创建自定义群组弹窗 -->
    <div v-if="createModalVisible" class="modal-overlay" @click="hideCreateModal">
      <div class="create-modal" @click.stop>
        <h3 class="modal-title">创建自定义群组</h3>
        <div class="modal-body">
          <div class="form-group">
            <label>群组名称</label>
            <input
              v-model="newGroupName"
              type="text"
              placeholder="输入群组名称"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>群组描述（可选）</label>
            <textarea
              v-model="newGroupDesc"
              placeholder="描述这个群组的用途"
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="hideCreateModal">取消</button>
          <button class="btn-confirm" @click="createCustomGroup" :disabled="!newGroupName">
            创建
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { relationService, type AccessGroupStats } from '@/service/relation'
import { authService } from '@/service/auth'

const router = useRouter()

const isLoading = ref(false)
const errorMessage = ref('')
const accessGroups = ref<AccessGroupStats[]>([])

// 创建群组相关
const createModalVisible = ref(false)
const newGroupName = ref('')
const newGroupDesc = ref('')

// 加载访问组
const loadAccessGroups = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    console.log('检查后端登录状态...')
    await authService.ensureBackendLoginWithBiometric()
    console.log('✅ 后端登录状态正常')
    
    const userInfo = await authService.getUserInfo()
    if (!userInfo || !userInfo.smart_account) {
      throw new Error('缺少用户标识')
    }
    
    console.log('加载访问组...')
    const groups = await relationService.getAccessGroupsStats()
    accessGroups.value = groups
    console.log(`加载了 ${groups.length} 个访问组`)
  } catch (error: any) {
    console.error('加载访问组失败:', error)
    errorMessage.value = error.message || '加载失败'
  } finally {
    isLoading.value = false
  }
}

// 查看群组详情
const viewGroupDetail = (group: AccessGroupStats) => {
  console.log('查看群组详情:', group)
  router.push({
    name: 'GroupDetail',
    params: { groupId: String(group.id) }
  })
}

// 显示/隐藏创建弹窗
const showCreateModal = () => {
  createModalVisible.value = true
  newGroupName.value = ''
  newGroupDesc.value = ''
}

const hideCreateModal = () => {
  createModalVisible.value = false
}

// 创建自定义群组
const createCustomGroup = async () => {
  if (!newGroupName.value.trim()) {
    alert('请输入群组名称')
    return
  }
  
  try {
    const userInfo = await authService.getUserInfo()
    if (!userInfo || !userInfo.smart_account) {
      throw new Error('缺少用户标识')
    }
    
    console.log('创建自定义群组:', {
      groupName: newGroupName.value,
      description: newGroupDesc.value,
      ownerAddress: userInfo.smart_account
    })
    
    await relationService.createAccessGroup(
      newGroupName.value,
      newGroupDesc.value || '',
      userInfo.smart_account
    )
    
    alert('群组创建成功！')
    hideCreateModal()
    
    // 重新加载群组列表
    await loadAccessGroups()
  } catch (error: any) {
    console.error('创建群组失败:', error)
    alert('创建失败: ' + (error.message || '未知错误'))
  }
}

// 获取群组图标
const getGroupIcon = (groupType: string) => {
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
  }
  return icons[groupType] || '👥'
}

// 获取群组类型文本
const getGroupTypeText = (groupType: string) => {
  const types: Record<string, string> = {
    'FAMILY': '家人',
    'FAMILY_PRIMARY': '主要家人',
    'PRIMARY_DOCTOR': '主治医生',
    'FAMILY_DOCTOR': '家庭医生',
    'SPECIALIST': '专科医生',
    'HOSPITAL': '医院',
    'HEALTHCARE_TEAM': '医护团队',
    'EMERGENCY_CONTACT': '紧急联系人',
    'THERAPIST': '康复师',
    'CUSTOM': '自定义群组'
  }
  return types[groupType] || groupType
}

onMounted(async () => {
  await loadAccessGroups()
})

onActivated(async () => {
  console.log('FamilyCircleContent激活，重新加载访问组')
  await loadAccessGroups()
})
</script>

<style scoped>
.family-circle-content {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 20px;
}

.action-bar {
  padding: 20px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}


.create-group-btn {
  width: 100%;
  padding: 14px 20px;
  background: #667eea;
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.create-group-btn:hover {
  transform: translateY(-2px);
  background: #5a67d8;
}

.btn-icon {
  font-size: 1.2rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 15px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-banner {
  margin: 20px;
  padding: 15px;
  background: #fff5f5;
  border-left: 4px solid #e53e3e;
  border-radius: 8px;
  color: #c53030;
}

.groups-container {
  padding: 20px;
}

.section-header {
  margin-bottom: 20px;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.section-desc {
  font-size: 0.95rem;
  color: #718096;
  margin: 0;
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 15px;
}

.empty-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 0.95rem;
  color: #718096;
  margin: 0;
}

.group-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
}

.group-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #ebf4ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  flex-shrink: 0;
  color: #667eea;
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
  font-size: 0.9rem;
  color: #718096;
  margin: 0 0 8px 0;
}

.group-stats {
  display: flex;
  gap: 15px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9rem;
  color: #4a5568;
}

.stat-icon {
  font-size: 1rem;
}

.group-arrow {
  font-size: 1.5rem;
  color: #cbd5e0;
  flex-shrink: 0;
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

.create-modal {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 20px 0;
}

.modal-body {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.95rem;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 8px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
}

.modal-footer {
  display: flex;
  gap: 10px;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-cancel:hover {
  background: #cbd5e0;
}

.btn-confirm {
  background: #667eea;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  background: #5a67d8;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #a0aec0;
}
</style>

