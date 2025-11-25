<template>
  <div class="invitation-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="page-title">{{ pageTitle }}</h1>
    </div>
    
    <!-- 邀请信息 -->
    <div class="invitation-content">
      <div v-if="errorMessage" class="error-banner">
        <span class="error-icon">⚠️</span>
        <span>{{ errorMessage }}</span>
      </div>
      
      <div class="invite-header">
        <div class="invite-icon">
          {{ groupIcon }}
        </div>
        <h2 class="invite-title">{{ inviteTitle }}</h2>
        <p class="invite-desc">{{ inviteDescription }}</p>
        <p v-if="groupName" class="group-name-badge">
          <span class="badge-icon">📋</span>
          <span>{{ groupName }}</span>
        </p>
      </div>
      
      <!-- 二维码区域 -->
      <div class="qr-section">
        <div class="qr-container">
          <div class="qr-code">
            <QRCode v-if="inviteToken" :value="inviteToken" :size="120" />
            <div v-else class="qr-placeholder">
              <div class="qr-icon">📱</div>
              <p class="qr-text">生成中...</p>
            </div>
          </div>
          <div class="qr-info">
            <h3 class="qr-title">扫描二维码</h3>
            <p class="qr-desc">让对方扫描此二维码即可快速加入</p>
          </div>
        </div>
        
        <!-- 邀请码 -->
        <div class="invite-code-section">
          <h3 class="code-title">或者使用邀请码</h3>
          <div class="code-container">
            <div class="invite-code">{{ inviteCode }}</div>
            <button class="copy-btn" @click="copyCode">复制</button>
          </div>
          <p class="code-desc">对方输入此邀请码也可以加入</p>
        </div>
      </div>
      
      <!-- 分享方式 -->
      <div class="share-section">
        <h3 class="share-title">分享邀请</h3>
        <div class="share-options">
          <button class="share-btn" @click="shareWechat">
            <div class="share-icon">💬</div>
            <span>微信分享</span>
          </button>
          <button class="share-btn" @click="shareSms">
            <div class="share-icon">📱</div>
            <span>短信分享</span>
          </button>
          <button class="share-btn" @click="shareCopy">
            <div class="share-icon">📋</div>
            <span>复制链接</span>
          </button>
        </div>
      </div>
      
      <!-- 邀请状态 -->
      <div class="status-section">
        <h3 class="status-title">邀请状态</h3>
        <div class="status-list">
          <div
            v-for="invite in pendingInvites"
            :key="invite.id"
            class="status-item"
          >
            <div class="status-info">
              <div class="status-name">{{ invite.name }}</div>
              <div class="status-type">{{ invite.type }}</div>
            </div>
            <div class="status-badge" :class="invite.status">
              {{ getStatusText(invite.status) }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="actions">
        <button class="refresh-btn" @click="refreshInvite">
          刷新邀请码
        </button>
        <button class="done-btn" @click="goBack">
          完成
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { relationService } from '../../service/relation'
import { authService } from '../../service/auth'
import type { AccessGroup, AccessGroupStats, Invitation } from '../../service/relation'
import QRCode from '../../components/QRCode.vue'

const router = useRouter()
const route = useRoute()

const inviteType = computed(() => route.query.type || 'family')
const groupId = computed(() => {
  const id = route.query.groupId
  if (!id) return null
  // 尝试转换为数字，如果失败则保持为字符串
  const numId = Number(id)
  return isNaN(numId) ? id as string : numId
})
const groupName = computed(() => route.query.groupName as string || '')
const groupType = computed(() => route.query.groupType as string || '')

const inviteCode = ref('')
const inviteToken = ref('')
const copySuccess = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const pendingInvites = ref<any[]>([])
// 使用更灵活的类型，因为可能从 getAccessGroupsStats 或 createAccessGroup 获取
const accessGroup = ref<AccessGroup | AccessGroupStats | null>(null)

// 动态计算页面标题
const pageTitle = computed(() => {
  if (groupName.value) {
    return `邀请加入 - ${groupName.value}`
  }
  
  const typeMap: Record<string, string> = {
    'FAMILY': '邀请家人',
    'PRIMARY_DOCTOR': '邀请主治医生',
    'FAMILY_DOCTOR': '邀请家庭医生',
    'SPECIALIST': '邀请专科医生',
    'HOSPITAL': '邀请医院',
    'CUSTOM': '邀请成员'
  }
  
  return typeMap[groupType.value] || (inviteType.value === 'family' ? '邀请家人' : '邀请医生')
})

// 动态获取群组图标
const groupIcon = computed(() => {
  const icons: Record<string, string> = {
    'FAMILY': '👨‍👩‍👧‍👦',
    'PRIMARY_DOCTOR': '👨‍⚕️',
    'FAMILY_DOCTOR': '🏥',
    'SPECIALIST': '🔬',
    'HOSPITAL': '🏨',
    'CUSTOM': '📋'
  }
  
  if (groupType.value && icons[groupType.value]) {
    return icons[groupType.value]
  }
  
  return inviteType.value === 'family' ? '👨‍👩‍👧‍👦' : '👨‍⚕️'
})

// 动态邀请标题
const inviteTitle = computed(() => {
  if (groupName.value) {
    return `邀请加入"${groupName.value}"`
  }
  
  const titleMap: Record<string, string> = {
    'FAMILY': '邀请家人加入',
    'PRIMARY_DOCTOR': '邀请主治医生',
    'FAMILY_DOCTOR': '邀请家庭医生',
    'SPECIALIST': '邀请专科医生',
    'HOSPITAL': '邀请医院机构',
    'CUSTOM': '邀请成员加入'
  }
  
  return titleMap[groupType.value] || (inviteType.value === 'family' ? '邀请家人加入' : '邀请医生加入')
})

// 动态邀请描述
const inviteDescription = computed(() => {
  const descMap: Record<string, string> = {
    'FAMILY': '让家人可以查看您的健康数据，给予及时关怀',
    'PRIMARY_DOCTOR': '让主治医生查看您的完整医疗数据，提供专业治疗方案',
    'FAMILY_DOCTOR': '让家庭医生查看您的健康数据，提供日常健康指导',
    'SPECIALIST': '让专科医生查看相关专科数据，提供专业诊疗建议',
    'HOSPITAL': '让医院机构访问您的住院相关数据',
    'CUSTOM': '让成员访问您指定的健康数据'
  }
  
  if (groupType.value && descMap[groupType.value]) {
    return descMap[groupType.value]
  }
  
  return inviteType.value === 'family' 
    ? '让家人可以查看您的健康数据，给予及时关怀' 
    : '让医生可以查看您的医疗数据，提供专业指导'
})

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return '待确认'
    case 'accepted': return '已接受'
    case 'expired': return '已过期'
    default: return '未知'
  }
}

const goBack = () => {
  router.back()
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(inviteCode.value)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('复制失败:', error)
  }
}

const shareWechat = () => {
  // 微信分享逻辑
  console.log('微信分享')
}

const shareSms = () => {
  // 短信分享逻辑
  console.log('短信分享')
}

const shareCopy = async () => {
  const shareText = `我邀请您加入健康守护App，邀请码：${inviteCode.value}`
  try {
    await navigator.clipboard.writeText(shareText)
    console.log('分享链接已复制')
  } catch (error) {
    console.error('复制失败:', error)
  }
}

const refreshInvite = async () => {
  await createInvitation()
}

const createInvitation = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    if (!accessGroup.value) {
      throw new Error('访问组未加载')
    }
    
    // 创建邀请
    const invitation = await relationService.createInvitation(accessGroup.value.id)
    inviteToken.value = invitation.token
    inviteCode.value = invitation.token.substring(0, 12).toUpperCase() // 显示简短码
    
    console.log('邀请创建成功:', invitation)
    console.log('二维码数据:', inviteToken.value)
  } catch (error: any) {
    console.error('创建邀请失败:', error)
    errorMessage.value = error.message || '创建邀请失败'
  } finally {
    isLoading.value = false
  }
}

const loadAccessGroup = async () => {
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
    
    // 2. 加载访问组
    if (groupId.value) {
      // 如果有groupId，获取所有组然后查找
      const groups = await relationService.getAccessGroupsStats()
      console.log('查找群组 - groupId:', groupId.value, '类型:', typeof groupId.value);
      console.log('可用群组:', groups.map(g => ({ id: g.id, name: g.group_name, type: typeof g.id })));
      
      accessGroup.value = groups.find(g => g.id == groupId.value) || null  // 使用 == 进行宽松比较
      
      if (!accessGroup.value) {
        console.error('未找到访问组 - groupId:', groupId.value);
        throw new Error('访问组不存在')
      }
      console.log('找到访问组:', accessGroup.value);
    } else {
      // 如果没有groupId，使用第一个访问组
      const groups = await relationService.getAccessGroupsStats()
      if (groups.length > 0) {
        accessGroup.value = groups[0]
        console.log('使用第一个访问组:', accessGroup.value);
      } else {
        // 没有访问组时自动创建默认访问组
        console.log('没有访问组，自动创建默认访问组...')
        const groupName = inviteType.value === 'family' ? '家庭成员组' : '医疗团队组'
        const description = inviteType.value === 'family' ? '家庭成员访问组' : '医疗团队访问组'
        
        accessGroup.value = await relationService.createAccessGroup(groupName, description)
        console.log('默认访问组创建成功:', accessGroup.value)
      }
    }
    
    // 3. 自动创建邀请
    await createInvitation()
  } catch (error: any) {
    console.error('加载访问组失败:', error)
    errorMessage.value = error.message || '加载失败'
  }
}

onMounted(() => {
  console.log('===== Invitation 页面参数 =====')
  console.log('邀请类型:', inviteType.value)
  console.log('群组ID:', groupId.value)
  console.log('群组名称:', groupName.value)
  console.log('群组类型:', groupType.value)
  console.log('完整query:', route.query)
  console.log('================================')
  loadAccessGroup()
})
</script>

<style scoped>
.invitation-page {
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

.invitation-content {
  padding: 20px;
  max-width: 500px;
  margin: 0 auto;
}

.error-banner {
  background: #fff5f5;
  color: #c53030;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  border: 1px solid #feb2b2;
}

.error-icon {
  font-size: 1.2rem;
}

.invite-header {
  text-align: center;
  margin-bottom: 30px;
}

.invite-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.invite-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 10px 0;
}

.invite-desc {
  color: #718096;
  line-height: 1.5;
  margin: 0 0 10px 0;
}

.group-name-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: #ebf8ff;
  color: #2c5282;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  margin: 10px 0 0 0;
}

.badge-icon {
  font-size: 1rem;
}

.qr-section {
  background-color: white;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.qr-container {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 25px;
}

.qr-code {
  width: 120px;
  height: 120px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.qr-placeholder {
  text-align: center;
}

.qr-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.qr-text {
  font-size: 0.8rem;
  color: #718096;
  margin: 0;
}

.qr-info {
  flex: 1;
}

.qr-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.qr-desc {
  color: #718096;
  font-size: 0.9rem;
  margin: 0;
}

.invite-code-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
}

.code-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 15px 0;
}

.code-container {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.invite-code {
  flex: 1;
  background-color: #f7fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  text-align: center;
  letter-spacing: 1px;
}

.copy-btn {
  background-color: #4299e1;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.copy-btn:hover {
  background-color: #3182ce;
}

.code-desc {
  font-size: 0.9rem;
  color: #718096;
  margin: 0;
  text-align: center;
}

.share-section {
  background-color: white;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.share-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 20px 0;
}

.share-options {
  display: flex;
  gap: 15px;
}

.share-btn {
  flex: 1;
  background-color: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.share-btn:hover {
  background-color: #edf2f7;
  border-color: #4299e1;
}

.share-icon {
  font-size: 1.5rem;
}

.share-btn span {
  font-size: 0.9rem;
  font-weight: 500;
  color: #4a5568;
}

.status-section {
  background-color: white;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.status-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 20px 0;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #f7fafc;
  border-radius: 8px;
}

.status-info {
  flex: 1;
}

.status-name {
  font-size: 1rem;
  font-weight: 500;
  color: #2d3748;
  margin-bottom: 3px;
}

.status-type {
  font-size: 0.9rem;
  color: #718096;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.pending {
  background-color: #fed7d7;
  color: #e53e3e;
}

.status-badge.accepted {
  background-color: #c6f6d5;
  color: #2f855a;
}

.status-badge.expired {
  background-color: #e2e8f0;
  color: #718096;
}

.actions {
  display: flex;
  gap: 15px;
}

.refresh-btn {
  flex: 1;
  background-color: transparent;
  color: #4299e1;
  border: 1px solid #4299e1;
  border-radius: 12px;
  padding: 16px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background-color: #4299e1;
  color: white;
}

.done-btn {
  flex: 1;
  background-color: #4299e1;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 16px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.done-btn:hover {
  background-color: #3182ce;
}
</style>
