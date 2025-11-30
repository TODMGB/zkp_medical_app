<template>
  <div class="group-detail-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="page-title">{{ groupInfo?.group_name || '群组详情' }}</h1>
      <button class="add-btn" @click="inviteToGroup">+</button>
    </div>
    
    <!-- 群组信息卡片 -->
    <div class="group-info-card">
      <div class="group-icon-large">
        {{ getGroupIcon(groupInfo?.group_type) }}
      </div>
      <div class="group-details">
        <h2 class="group-name">{{ groupInfo?.group_name }}</h2>
        <p class="group-type">{{ getGroupTypeText(groupInfo?.group_type) }}</p>
        <p class="group-desc">{{ groupInfo?.description || '暂无描述' }}</p>
        <div class="group-stats">
          <span class="stat-badge">
            <span class="stat-icon">👥</span>
            <span>{{ members.length }} 成员</span>
          </span>
          <span class="stat-badge">
            <span class="stat-icon">📋</span>
            <span>{{ getGroupPermissions(groupInfo?.group_type) }}</span>
          </span>
        </div>
      </div>
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
    
    <!-- 成员列表 -->
    <div class="members-section">
      <div class="section-header">
        <h3 class="section-title">群组成员</h3>
      </div>
      
      <div v-if="members.length === 0 && !isLoading" class="empty-state">
        <p>还没有成员</p>
        <p class="empty-hint">点击右上角 + 邀请成员</p>
      </div>
      
      <div class="members-list">
        <div
          v-for="member in members"
          :key="member.id"
          class="member-card"
        >
          <div class="member-avatar">
            <div class="avatar-icon">👤</div>
          </div>
          <div class="member-info">
            <h4 class="member-name">{{ getMemberDisplayName(member.viewer_address) }}</h4>
            <p class="member-address-sub">{{ formatAddress(member.viewer_address) }}</p>
            <p v-if="memberRemarks[member.viewer_address]" class="member-remark">
              📝 {{ memberRemarks[member.viewer_address] }}
            </p>
            <p class="member-role">{{ getRoleText(member) }}</p>
            <p class="member-status" :class="member.status">
              {{ getStatusText(member.status) }}
            </p>
          </div>
          <div class="member-actions">
            <button 
              class="remark-btn" 
              @click="showRemarkModal(member)"
              :title="memberRemarks[member.viewer_address] ? '编辑备注' : '添加备注'"
            >
              {{ memberRemarks[member.viewer_address] ? '✏️' : '📝' }}
            </button>
            <div class="status-indicator" :class="member.status"></div>
            <button 
              v-if="member.status === 'accepted'"
              class="action-menu-btn" 
              @click="showMemberActions(member)"
            >
              ⋮
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 邀请类型选择弹窗 -->
    <div v-if="showInviteTypeModal" class="modal-overlay" @click="closeInviteTypeModal">
      <div class="invite-type-sheet" @click.stop>
        <div class="sheet-header">
          <h3>选择邀请类型</h3>
          <button class="close-btn" @click="closeInviteTypeModal">×</button>
        </div>
        <div class="type-options">
          <button class="type-option-btn" @click="confirmInviteType('family')">
            <span class="type-icon">👨‍👩‍👧‍👦</span>
            <div class="type-info">
              <h4>邀请家属</h4>
              <p>让家人加入此群组</p>
            </div>
          </button>
          <button class="type-option-btn" @click="confirmInviteType('doctor')">
            <span class="type-icon">👨‍⚕️</span>
            <div class="type-info">
              <h4>邀请医生</h4>
              <p>让医生加入此群组</p>
            </div>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 成员操作菜单 -->
    <div v-if="selectedMember" class="modal-overlay" @click="closeMemberActions">
      <div class="action-sheet" @click.stop>
        <div class="action-header">
          <h3>管理成员</h3>
          <button class="close-btn" @click="closeMemberActions">×</button>
        </div>
        <div class="action-list">
          <button 
            v-if="selectedMember.status === 'accepted'"
            class="action-item suspend" 
            @click="suspendMember"
          >
            <span class="action-icon">⏸️</span>
            <span>暂停访问</span>
          </button>
          <button 
            class="action-item revoke" 
            @click="revokeMember"
          >
            <span class="action-icon">🚫</span>
            <span>撤销授权</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 成员备注弹窗 -->
    <div v-if="showRemarkEditor" class="modal-overlay" @click="closeRemarkModal">
      <div class="remark-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">设置备注</h3>
          <button class="close-btn" @click="closeRemarkModal">×</button>
        </div>
        <div class="modal-content">
          <div class="member-preview">
            <div class="preview-avatar">👤</div>
            <div class="preview-address">{{ formatAddress(remarkTarget?.viewer_address || '') }}</div>
          </div>
          <input
            v-model="remarkInput"
            type="text"
            placeholder="例如：儿子、女儿、主治医生等"
            class="remark-input"
            maxlength="20"
            @keyup.enter="saveRemark"
          />
          <div class="quick-remarks">
            <button 
              v-for="quickRemark in quickRemarkOptions" 
              :key="quickRemark"
              class="quick-remark-btn"
              @click="remarkInput = quickRemark"
            >
              {{ quickRemark }}
            </button>
          </div>
          <div class="button-group">
            <button 
              v-if="memberRemarks[remarkTarget?.viewer_address || '']"
              class="delete-remark-btn" 
              @click="deleteRemark"
            >
              删除备注
            </button>
            <button class="save-remark-btn" @click="saveRemark" :disabled="!remarkInput.trim()">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { relationService } from '@/service/relation'
import { memberRemarkService } from '@/service/memberRemark'
import { memberInfoService, type MemberInfo } from '@/service/memberInfo'

const router = useRouter()
const route = useRoute()

const isLoading = ref(false)
const errorMessage = ref('')
const groupInfo = ref<any>(null)
const members = ref<any[]>([])
const selectedMember = ref<any>(null)
const showInviteTypeModal = ref(false)

// 备注相关状态
const showRemarkEditor = ref(false)
const remarkTarget = ref<any>(null)
const remarkInput = ref('')
const memberRemarks = ref<Record<string, string>>({})
const memberInfos = ref<Record<string, MemberInfo>>({})
const quickRemarkOptions = ['儿子', '女儿', '父亲', '母亲', '主治医生', '护士', '康复师']

// 获取群组ID - 可能是数字或字符串
const groupId = ref<number | string>(
  isNaN(Number(route.params.groupId)) 
    ? route.params.groupId as string 
    : Number(route.params.groupId)
)

// 加载群组信息和成员
const loadGroupDetail = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // 1. 确保用户已登录后端（自动尝试指纹登录）
    console.log('检查后端登录状态...');
    const { authService } = await import('@/service/auth');
    
    try {
      await authService.ensureBackendLoginWithBiometric();
      console.log('✅ 后端登录状态正常');
    } catch (loginError: any) {
      console.error('❌ 后端登录失败:', loginError);
      errorMessage.value = '登录失败: ' + loginError.message;
      // 登录失败时直接返回，不继续执行
      return;
    }
    
    // 2. 获取群组信息
    // 优先从路由state获取，如果没有则从API获取
    if (history.state && history.state.group) {
      console.log('从路由state获取群组信息:', history.state.group);
      groupInfo.value = history.state.group
    } else {
      console.log('路由state中无群组信息，从API获取...');
      console.log('当前 groupId:', groupId.value);
      console.log('groupId 类型:', typeof groupId.value);
      
      // 从访问组列表中查找
      const groups = await relationService.getAccessGroupsStats()
      console.log('获取到的群组数量:', groups.length);
      console.log('所有群组ID列表:', groups.map(g => ({ id: g.id, name: g.group_name, type: typeof g.id })));
      
      const foundGroup = groups.find(g => g.id === groupId.value)
      if (foundGroup) {
        console.log('✅ 找到群组信息:', foundGroup);
        groupInfo.value = foundGroup
      } else {
        console.error('❌ 未找到匹配的群组');
        console.error('要查找的 groupId:', groupId.value);
        console.error('可用的群组列表:', groups.map(g => g.id));
        throw new Error('未找到该访问组')
      }
    }
    
    // 3. 加载成员列表
    const memberList = await relationService.getGroupMembers(groupId.value)
    console.log('群组成员:', memberList)
    members.value = memberList || []
    
    // 4. 加载成员备注
    await loadMemberRemarks()
    
    // 5. 加载成员信息（姓名等）
    await loadMemberInfos()
  } catch (error: any) {
    console.error('加载群组详情失败:', error)
    errorMessage.value = '加载失败: ' + (error.message || '未知错误')
  } finally {
    isLoading.value = false
  }
}

// 加载成员备注
const loadMemberRemarks = async () => {
  try {
    const addresses = members.value.map(m => m.viewer_address)
    if (addresses.length > 0) {
      memberRemarks.value = await memberRemarkService.getBatchRemarks(addresses)
      console.log('已加载成员备注:', memberRemarks.value)
    }
  } catch (error) {
    console.error('加载备注失败:', error)
  }
}

// 加载成员信息
const loadMemberInfos = async () => {
  try {
    console.log('📝 [群组详情] 开始加载成员信息...')
    console.log('  成员数量:', members.value.length)
    
    for (const member of members.value) {
      const viewerAddress = member.viewer_address
      console.log(`  查询成员信息 - viewer_address: ${viewerAddress}`)
      
      // 尝试用 viewer_address 查询
      let memberInfo = await memberInfoService.getMemberInfo(viewerAddress)
      
      // 如果没找到，尝试用 owner_address 查询（如果是作为数据拥有者的情况）
      if (!memberInfo && member.owner_address) {
        console.log(`  尝试用 owner_address 查询: ${member.owner_address}`)
        memberInfo = await memberInfoService.getMemberInfo(member.owner_address)
      }
      
      if (memberInfo) {
        memberInfos.value[viewerAddress] = memberInfo
        console.log(`  ✅ 找到成员信息: ${memberInfo.username} (${memberInfo.smart_account})`)
      } else {
        console.log(`  ⚠️ 未找到成员信息 (viewer_address: ${viewerAddress})`)
        console.log(`  💡 提示: 对方可能还未发送信息，或信息交换正在进行中`)
      }
    }
    
    console.log('📊 [群组详情] 成员信息加载完成:')
    console.log('  已找到:', Object.keys(memberInfos.value).length, '个成员信息')
    console.log('  成员信息详情:', memberInfos.value)
  } catch (error) {
    console.error('❌ [群组详情] 加载成员信息失败:', error)
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

// 格式化地址
const formatAddress = (address: string) => {
  if (!address) return '未知地址'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 获取成员显示名称（优先显示姓名，然后备注，最后地址）
const getMemberDisplayName = (address: string) => {
  const memberInfo = memberInfos.value[address]
  if (memberInfo?.username) {
    return memberInfo.username
  }
  if (memberRemarks.value[address]) {
    return memberRemarks.value[address]
  }
  return formatAddress(address)
}

// 获取角色文本
const getRoleText = (member: any) => {
  // TODO: 从用户信息服务获取真实角色
  if (groupInfo.value?.group_type === 'FAMILY') {
    return '家属'
  } else if (groupInfo.value?.group_type?.includes('DOCTOR') || groupInfo.value?.group_type === 'HOSPITAL') {
    return '医护人员'
  }
  return '成员'
}

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'accepted': return '已加入'
    case 'pending': return '待确认'
    case 'suspended': return '已暂停'
    case 'rejected': return '已拒绝'
    default: return '未知状态'
  }
}

// 显示邀请类型选择弹窗
const inviteToGroup = () => {
  if (!groupInfo.value) {
    alert('群组信息未加载，请稍后重试')
    return
  }
  showInviteTypeModal.value = true
}

// 关闭邀请类型选择弹窗
const closeInviteTypeModal = () => {
  showInviteTypeModal.value = false
}

// 确认邀请类型并跳转
const confirmInviteType = (type: 'family' | 'doctor') => {
  if (!groupInfo.value) {
    alert('群组信息未加载')
    return
  }
  
  console.log('跳转到邀请页面，参数:', {
    groupId: groupId.value,
    groupName: groupInfo.value.group_name,
    groupType: groupInfo.value.group_type,
    type: type
  })
  
  router.push({
    name: 'Invitation',
    query: { 
      groupId: groupId.value,
      groupName: groupInfo.value.group_name,
      groupType: groupInfo.value.group_type,
      type: type
    }
  })
  closeInviteTypeModal()
}

// 显示成员操作菜单
const showMemberActions = (member: any) => {
  selectedMember.value = member
}

// 关闭成员操作菜单
const closeMemberActions = () => {
  selectedMember.value = null
}

// 暂停成员访问
const suspendMember = async () => {
  if (!selectedMember.value) return
  
  try {
    await relationService.suspendRelationship(selectedMember.value.id)
    alert('已暂停该成员的访问权限')
    await loadGroupDetail()
    closeMemberActions()
  } catch (error: any) {
    console.error('暂停失败:', error)
    alert('操作失败: ' + (error.message || '未知错误'))
  }
}

// 撤销成员授权
const revokeMember = async () => {
  if (!selectedMember.value) return
  
  if (!confirm('确定要撤销该成员的授权吗？此操作不可恢复。')) {
    return
  }
  
  try {
    await relationService.revokeRelationship(selectedMember.value.id)
    alert('已撤销该成员的授权')
    await loadGroupDetail()
    closeMemberActions()
  } catch (error: any) {
    console.error('撤销失败:', error)
    alert('操作失败: ' + (error.message || '未知错误'))
  }
}

// 显示备注编辑器
const showRemarkModal = async (member: any) => {
  remarkTarget.value = member
  // 加载现有备注
  const existingRemark = await memberRemarkService.getRemark(member.viewer_address)
  remarkInput.value = existingRemark
  showRemarkEditor.value = true
}

// 关闭备注编辑器
const closeRemarkModal = () => {
  showRemarkEditor.value = false
  remarkTarget.value = null
  remarkInput.value = ''
}

// 保存备注
const saveRemark = async () => {
  if (!remarkTarget.value || !remarkInput.value.trim()) {
    return
  }
  
  try {
    await memberRemarkService.setRemark(remarkTarget.value.viewer_address, remarkInput.value.trim())
    // 更新本地显示
    memberRemarks.value[remarkTarget.value.viewer_address] = remarkInput.value.trim()
    console.log('备注已保存')
    closeRemarkModal()
  } catch (error) {
    console.error('保存备注失败:', error)
    alert('保存失败，请重试')
  }
}

// 删除备注
const deleteRemark = async () => {
  if (!remarkTarget.value) {
    return
  }
  
  if (!confirm('确定要删除该备注吗？')) {
    return
  }
  
  try {
    await memberRemarkService.deleteRemark(remarkTarget.value.viewer_address)
    // 更新本地显示
    delete memberRemarks.value[remarkTarget.value.viewer_address]
    console.log('备注已删除')
    closeRemarkModal()
  } catch (error) {
    console.error('删除备注失败:', error)
    alert('删除失败，请重试')
  }
}

const goBack = () => {
  router.back()
}

onMounted(async () => {
  await loadGroupDetail()
})

// 页面激活时也重新加载（从其他页面返回时）
onActivated(async () => {
  console.log('页面激活，重新加载群组详情')
  await loadGroupDetail()
})
</script>

<style scoped>
.group-detail-page {
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
  flex: 1;
  text-align: center;
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


.group-info-card {
  background: #667eea;
  margin: 20px;
  padding: 30px 20px;
  border-radius: 16px;
  color: white;
  text-align: center;
  box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
}

.group-icon-large {
  font-size: 4rem;
  margin-bottom: 15px;
}

.group-details {
  text-align: center;
}

.group-name {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.group-type {
  font-size: 0.95rem;
  opacity: 0.9;
  margin: 0 0 10px 0;
}

.group-desc {
  font-size: 0.9rem;
  opacity: 0.85;
  margin: 0 0 15px 0;
}

.group-stats {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: rgba(255,255,255,0.2);
  padding: 8px 15px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.stat-icon {
  font-size: 1.1rem;
}

.loading-container {
  text-align: center;
  padding: 40px 20px;
  color: #a0aec0;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 10px;
  border: 3px solid #e2e8f0;
  border-top-color: #4299e1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  margin: 20px;
  padding: 15px;
  background-color: #fed7d7;
  border-left: 4px solid #e53e3e;
  border-radius: 8px;
  color: #c53030;
}

.members-section {
  padding: 20px;
}

.section-header {
  margin-bottom: 15px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
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

.members-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.member-card {
  background-color: white;
  border-radius: 12px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.member-avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background-color: #f7fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-icon {
  font-size: 1.3rem;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.member-address-sub {
  font-size: 0.8rem;
  color: #718096;
  font-family: monospace;
  margin: 0 0 6px 0;
}

.member-role {
  font-size: 0.85rem;
  color: #718096;
  margin: 0 0 4px 0;
}

.member-status {
  font-size: 0.8rem;
  font-weight: 500;
  margin: 0;
}

.member-status.accepted {
  color: #48bb78;
}

.member-status.pending {
  color: #ed8936;
}

.member-status.suspended {
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

.status-indicator.accepted {
  background-color: #48bb78;
}

.status-indicator.pending {
  background-color: #ed8936;
}

.status-indicator.suspended {
  background-color: #e53e3e;
}

.action-menu-btn {
  background: none;
  border: none;
  font-size: 1.3rem;
  color: #a0aec0;
  cursor: pointer;
  padding: 4px 8px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.action-sheet,
.invite-type-sheet {
  background-color: white;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 600px;
  padding-bottom: 20px;
}

.action-header,
.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.action-header h3,
.sheet-header h3 {
  font-size: 1.1rem;
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

.type-options {
  padding: 10px 0;
}

.type-option-btn {
  width: 100%;
  background: none;
  border: none;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.type-option-btn:hover {
  background-color: #f7fafc;
}

.type-option-btn .type-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.type-option-btn .type-info {
  text-align: left;
  flex: 1;
}

.type-option-btn .type-info h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.type-option-btn .type-info p {
  font-size: 0.9rem;
  color: #718096;
  margin: 0;
}

.action-list {
  padding: 10px 0;
}

.action-item {
  width: 100%;
  background: none;
  border: none;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 1rem;
  color: #2d3748;
  transition: background-color 0.2s;
}

.action-item:hover {
  background-color: #f7fafc;
}

.action-item.suspend {
  color: #ed8936;
}

.action-item.revoke {
  color: #e53e3e;
}

.action-icon {
  font-size: 1.3rem;
}

/* 成员备注相关样式 */
.member-remark {
  font-size: 0.85rem;
  color: #4299e1;
  margin: 4px 0;
  font-weight: 500;
}

.remark-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  padding: 8px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s, transform 0.2s;
  margin-right: 8px;
}

.remark-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.remark-modal {
  background: white;
  border-radius: 20px;
  padding: 0;
  max-width: 420px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
}

.remark-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.remark-modal .modal-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.remark-modal .modal-content {
  padding: 20px;
}

.member-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  background: #f7fafc;
  border-radius: 12px;
  margin-bottom: 20px;
}

.preview-avatar {
  width: 40px;
  height: 40px;
  background: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.preview-address {
  font-size: 0.95rem;
  color: #4a5568;
  font-weight: 500;
}

.remark-input {
  width: 100%;
  padding: 14px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.remark-input:focus {
  outline: none;
  border-color: #4299e1;
}

.quick-remarks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 15px;
  margin-bottom: 20px;
}

.quick-remark-btn {
  padding: 8px 16px;
  background: #edf2f7;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-remark-btn:hover {
  background: #4299e1;
  color: white;
  border-color: #4299e1;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.delete-remark-btn,
.save-remark-btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-remark-btn {
  background: #fff5f5;
  color: #e53e3e;
  border: 1px solid #feb2b2;
}

.delete-remark-btn:hover {
  background: #fed7d7;
}

.save-remark-btn {
  background: #4299e1;
  color: white;
}

.save-remark-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
}

.save-remark-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

