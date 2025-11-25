<template>
  <div class="profile-page">
    <!-- 顶部个人信息卡片 -->
    <div class="profile-header">
      <div class="user-card">
        <div class="user-avatar">
          <span class="avatar-icon">{{ avatarEmoji }}</span>
        </div>
      <div class="user-info">
          <h2 class="user-name">
            {{ isEditingName ? '' : userName }}
            <button v-if="!isEditingName" class="edit-name-btn" @click="startEditName">
              ✏️
            </button>
          </h2>
          <div v-if="isEditingName" class="name-edit-form">
            <input
              v-model="newUserName"
              type="text"
              class="name-input"
              placeholder="输入新用户名"
              @keyup.enter="saveNewName"
            />
            <button class="save-btn" @click="saveNewName">保存</button>
            <button class="cancel-btn" @click="cancelEditName">取消</button>
          </div>
          <div class="role-tags">
            <span v-for="role in userRoles" :key="role" class="role-tag" :class="role">
              {{ getRoleText(role) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 账户信息卡片 -->
    <div class="account-section">
      <h3 class="section-title">账户信息</h3>
      
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">👤 EOA 地址</span>
          <div class="info-value-group">
            <span class="info-value">{{ eoaAddress || '未设置' }}</span>
            <button class="copy-btn" @click="copyAddress(eoaAddress)" title="复制">
              📋
            </button>
        </div>
      </div>
        
        <div class="info-row">
          <span class="info-label">🔐 智能账户地址</span>
          <div class="info-value-group">
            <span class="info-value">{{ smartAccount || '未设置' }}</span>
            <button class="copy-btn" @click="copyAddress(smartAccount)" title="复制">
              📋
      </button>
          </div>
        </div>
        
        <div class="info-row">
          <span class="info-label">📱 设备ID</span>
          <div class="info-value-group">
            <span class="info-value">{{ deviceId || '加载中...' }}</span>
          </div>
        </div>
        
        <div class="info-row">
          <span class="info-label">🌐 账户状态</span>
          <div class="info-value-group">
            <span class="status-badge" :class="{ online: isBackendOnline, offline: !isBackendOnline }">
              {{ isBackendOnline ? '✓ 在线' : '✗ 离线' }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 功能菜单 -->
    <div class="menu-section">
      <div class="menu-item" @click="goToFamilyCircle">
        <div class="menu-icon">👨‍👩‍👧‍👦</div>
        <div class="menu-content">
          <h3 class="menu-title">我的家庭圈</h3>
          <p class="menu-desc">管理家人和医生</p>
        </div>
        <div class="menu-arrow">›</div>
      </div>
      
      <div class="menu-item" @click="goToGuardianSetup">
        <div class="menu-icon">🛡️</div>
        <div class="menu-content">
          <h3 class="menu-title">守护者设置</h3>
          <p class="menu-desc">设置账户恢复守护者</p>
        </div>
        <div class="menu-arrow">›</div>
      </div>
      
      <div class="menu-item" @click="goToAccountMigration">
        <div class="menu-icon">📱</div>
        <div class="menu-content">
          <h3 class="menu-title">账户迁移</h3>
          <p class="menu-desc">迁移到新设备</p>
        </div>
        <div class="menu-arrow">›</div>
      </div>
      
      <div class="menu-item" @click="goToNotifications">
        <div class="menu-icon">🔔</div>
        <div class="menu-content">
          <h3 class="menu-title">消息通知</h3>
          <p class="menu-desc">系统消息和家人关怀</p>
        </div>
        <div class="menu-badge" v-if="unreadCount > 0">{{ unreadCount }}</div>
        <div class="menu-arrow">›</div>
      </div>
      
      <div class="menu-item" @click="goToSettings">
        <div class="menu-icon">⚙️</div>
        <div class="menu-content">
          <h3 class="menu-title">设置</h3>
          <p class="menu-desc">字体大小、通知提醒</p>
        </div>
        <div class="menu-arrow">›</div>
      </div>
      </div>
      
    <!-- Toast 提示 -->
    <div v-if="showToast" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
    
    <!-- 底部导航栏 -->
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Device } from '@capacitor/device'
import { authService } from '@/service/auth'
import { aaService } from '@/service/accountAbstraction'
import { unreadCount, notificationBadgeService } from '@/service/notificationBadge'
import BottomNav from '@/components/BottomNav.vue'

const router = useRouter()

// 用户信息
const userName = ref('用户')
const userRoles = ref<string[]>([])
const eoaAddress = ref('')
const smartAccount = ref('')
const deviceId = ref('')
const isBackendOnline = ref(false)

// 编辑用户名
const isEditingName = ref(false)
const newUserName = ref('')

// Toast提示
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

// 头像表情
const avatarEmoji = computed(() => {
  if (userRoles.value.includes('elderly')) return '👴'
  if (userRoles.value.includes('doctor')) return '👨‍⚕️'
  if (userRoles.value.includes('guardian')) return '👨‍👩‍👧'
  return '👤'
})

// 获取角色文本
const getRoleText = (role: string) => {
  const roleMap: Record<string, string> = {
    elderly: '老人',
    doctor: '医生',
    guardian: '家属'
  }
  return roleMap[role] || role
}

// 开始编辑用户名
const startEditName = () => {
  isEditingName.value = true
  newUserName.value = userName.value
}

// 取消编辑
const cancelEditName = () => {
  isEditingName.value = false
  newUserName.value = ''
}

// 保存新用户名
const saveNewName = async () => {
  if (!newUserName.value.trim()) {
    showToastMessage('用户名不能为空', 'error')
    return
  }
  
  if (newUserName.value === userName.value) {
    isEditingName.value = false
    return
  }
  
  try {
    // 更新本地用户信息
    const userInfo = await authService.getUserInfo()
    if (userInfo) {
      userInfo.username = newUserName.value
      await authService.saveUserInfo(userInfo)
      
      userName.value = newUserName.value
      isEditingName.value = false
      
      showToastMessage('用户名更新成功', 'success')
    }
  } catch (error) {
    console.error('更新用户名失败:', error)
    showToastMessage('更新用户名失败', 'error')
  }
}

// 复制地址
const copyAddress = async (address: string) => {
  if (!address) {
    showToastMessage('地址为空，无法复制', 'error')
    return
  }
  
  try {
    await navigator.clipboard.writeText(address)
    showToastMessage('地址已复制到剪贴板', 'success')
  } catch (error) {
    console.error('复制失败:', error)
    showToastMessage('复制失败', 'error')
  }
}

// 显示Toast
const showToastMessage = (message: string, type: 'success' | 'error') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

// 页面跳转
const goToFamilyCircle = () => {
  router.push('/family-circle')
}

const goToGuardianSetup = () => {
  router.push('/guardian-setup')
}

const goToAccountMigration = () => {
  router.push('/account-migration')
}

const goToNotifications = () => {
  router.push('/notifications')
}

const goToSettings = () => {
  router.push('/settings')
}

// 加载用户信息
const loadUserInfo = async () => {
  try {
    // 获取用户信息
    const userInfo = await authService.getUserInfo()
    if (userInfo) {
      userName.value = userInfo.username || '用户'
      userRoles.value = userInfo.roles || []
      eoaAddress.value = userInfo.eoa_address || ''
      smartAccount.value = userInfo.smart_account || ''
    }
    
    // 获取EOA地址（如果authService中没有）
    if (!eoaAddress.value) {
      eoaAddress.value = aaService.getEOAAddress() || ''
    }
    
    // 获取智能账户地址
    if (!smartAccount.value) {
      smartAccount.value = aaService.getAbstractAccountAddress() || ''
    }
    
    // 获取设备ID
    try {
      const device = await Device.getId()
      deviceId.value = device.identifier
    } catch (error) {
      console.error('获取设备ID失败:', error)
      deviceId.value = '无法获取'
    }
    
    // 检查后端登录状态
    isBackendOnline.value = await aaService.isBackendLoggedIn()
    
    console.log('个人信息加载完成:', {
      userName: userName.value,
      roles: userRoles.value,
      eoaAddress: eoaAddress.value,
      smartAccount: smartAccount.value,
      deviceId: deviceId.value,
      isOnline: isBackendOnline.value
    })
  } catch (error) {
    console.error('加载个人信息失败:', error)
  }
}

onMounted(async () => {
  await loadUserInfo()
  
  // 启动通知红点服务
  notificationBadgeService.startPolling()
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 80px;
}

/* 顶部个人信息 */
.profile-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px 20px 40px;
  border-radius: 0 0 24px 24px;
}

.user-card {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 3px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.avatar-icon {
  font-size: 3rem;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  color: white;
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-name-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-name-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.name-edit-form {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.name-input {
  flex: 1;
  padding: 10px 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  color: #2d3748;
  outline: none;
}

.name-input:focus {
  border-color: white;
  background: white;
}

.save-btn, .cancel-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.save-btn {
  background: white;
  color: #667eea;
}

.save-btn:hover {
  transform: scale(1.05);
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.role-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.role-tag {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 0.85rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.25);
  color: white;
  backdrop-filter: blur(10px);
}

.role-tag.elderly {
  background: rgba(72, 187, 120, 0.3);
}

.role-tag.doctor {
  background: rgba(66, 153, 225, 0.3);
}

.role-tag.guardian {
  background: rgba(237, 137, 54, 0.3);
}

/* 账户信息区块 */
.account-section {
  padding: 20px;
  margin-top: -20px;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 16px 0;
}

.info-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #e2e8f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #4a5568;
}

.info-value-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: flex-end;
  min-width: 0;
}

.info-value {
  font-size: 0.85rem;
  color: #2d3748;
  font-family: 'Courier New', monospace;
  background: #f7fafc;
  padding: 6px 10px;
  border-radius: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.copy-btn {
  background: #667eea;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-btn:hover {
  background: #5568d3;
  transform: scale(1.1);
}

.status-badge {
  padding: 6px 14px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-badge.online {
  background: #c6f6d5;
  color: #2f855a;
}

.status-badge.offline {
  background: #fed7d7;
  color: #c53030;
}

/* 功能菜单 */
.menu-section {
  padding: 20px;
}

.menu-item {
  background-color: white;
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  border: 2px solid transparent;
}

.menu-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-color: #667eea;
}

.menu-icon {
  font-size: 1.8rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f4ff 0%, #e6eeff 100%);
  border-radius: 12px;
  flex-shrink: 0;
}

.menu-content {
  flex: 1;
  min-width: 0;
}

.menu-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.menu-desc {
  font-size: 0.85rem;
  color: #718096;
  margin: 0;
}

.menu-badge {
  background-color: #e53e3e;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

.menu-arrow {
  font-size: 1.5rem;
  color: #a0aec0;
  font-weight: 300;
}

/* Toast 提示 */
.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  animation: slideDown 0.3s;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.toast.success {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
}

.toast.error {
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
  color: white;
}
</style>
