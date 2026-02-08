<template>
  <div class="profile-page">
    <!-- 顶部个人信息卡片 -->
    <div class="profile-header">
      <button class="qr-entry-btn" @click="showQrModal = true">
        <QrCode class="qr-entry-icon" />
      </button>
      <div class="user-card">
        <div class="user-avatar">
          <div class="avatar-icon-wrapper">
            <User v-if="isElderly" class="avatar-icon" />
            <Stethoscope v-else-if="isDoctor" class="avatar-icon" />
            <Heart v-else-if="isGuardian" class="avatar-icon" />
            <User v-else class="avatar-icon" />
          </div>
        </div>
        <div class="user-info">
          <h2 class="user-name">
            {{ isEditingName ? '' : userName }}
            <button v-if="!isEditingName" class="edit-name-btn" @click="startEditName">
              <Edit2 class="icon-small" />
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
          <span class="info-label">
            <User class="label-icon" />
            EOA 地址
          </span>
          <div class="info-value-group">
            <span class="info-value">{{ formatAddress(eoaAddress) || '未设置' }}</span>
            <button class="copy-btn" @click="copyAddress(eoaAddress)" title="复制">
              <Copy class="icon-mini" />
            </button>
          </div>
        </div>
        
        <div class="info-row">
          <span class="info-label">
            <Shield class="label-icon" />
            智能账户地址
          </span>
          <div class="info-value-group">
            <span class="info-value">{{ formatAddress(smartAccount) || '未设置' }}</span>
            <button class="copy-btn" @click="copyAddress(smartAccount)" title="复制">
              <Copy class="icon-mini" />
            </button>
          </div>
        </div>
        
        <div class="info-row">
          <span class="info-label">
            <Smartphone class="label-icon" />
            设备ID
          </span>
          <div class="info-value-group">
            <span class="info-value">{{ formatDeviceId(deviceId) || '加载中...' }}</span>
          </div>
        </div>
        
        <div class="info-row">
          <span class="info-label">
            <Globe class="label-icon" />
            账户状态
          </span>
          <div class="info-value-group">
            <span class="status-badge" :class="{ online: isBackendOnline, offline: !isBackendOnline }">
              <CheckCircle2 v-if="isBackendOnline" class="status-icon" />
              <XCircle v-else class="status-icon" />
              {{ isBackendOnline ? '在线' : '离线' }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 功能菜单 -->
    <div class="menu-section">
      <div class="menu-item" @click="goToGuardianSetup">
        <div class="menu-icon-wrapper orange">
          <Shield class="menu-icon" />
        </div>
        <div class="menu-content">
          <h3 class="menu-title">守护者设置</h3>
          <p class="menu-desc">设置账户恢复守护者</p>
        </div>
        <ChevronRight class="menu-arrow" />
      </div>
      
      <div class="menu-item" @click="goToGuardianRecoveryList" v-if="isGuardian">
        <div class="menu-icon-wrapper blue">
          <Shield class="menu-icon" />
        </div>
        <div class="menu-content">
          <h3 class="menu-title">恢复请求</h3>
          <p class="menu-desc">查看需要我处理的恢复请求</p>
        </div>
        <ChevronRight class="menu-arrow" />
      </div>
      
      <div class="menu-item" @click="goToAccountMigration">
        <div class="menu-icon-wrapper purple">
          <Smartphone class="menu-icon" />
        </div>
        <div class="menu-content">
          <h3 class="menu-title">账户迁移</h3>
          <p class="menu-desc">迁移到新设备</p>
        </div>
        <ChevronRight class="menu-arrow" />
      </div>
      
      <div class="menu-item" @click="goToNotifications">
        <div class="menu-icon-wrapper red">
          <Bell class="menu-icon" />
        </div>
        <div class="menu-content">
          <h3 class="menu-title">消息通知</h3>
          <p class="menu-desc">系统消息和家人关怀</p>
        </div>
        <div class="menu-badge" v-if="unreadCount > 0">{{ unreadCount }}</div>
        <ChevronRight class="menu-arrow" />
      </div>
      
      <div class="menu-item" @click="goToSettings">
        <div class="menu-icon-wrapper gray">
          <Settings class="menu-icon" />
        </div>
        <div class="menu-content">
          <h3 class="menu-title">设置</h3>
          <p class="menu-desc">字体大小、通知提醒</p>
        </div>
        <ChevronRight class="menu-arrow" />
      </div>
    </div>

    <div v-if="showQrModal" class="qr-modal-overlay" @click="showQrModal = false">
      <div class="qr-modal" @click.stop>
        <div class="qr-modal-header">
          <h3 class="qr-modal-title">我的二维码</h3>
          <button class="qr-modal-close" @click="showQrModal = false">×</button>
        </div>
        <div class="qr-modal-body">
          <QRCode :value="smartAccount" :size="220" />
          <div class="qr-modal-address">{{ formatAddress(smartAccount) }}</div>
          <button class="qr-modal-copy" @click="copyAddress(smartAccount)">复制地址</button>
        </div>
      </div>
    </div>
      
    <!-- Toast 提示 -->
    <div v-if="showToast" class="toast" :class="toastType">
      <CheckCircle2 v-if="toastType === 'success'" class="toast-icon" />
      <AlertCircle v-else class="toast-icon" />
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
import QRCode from '@/components/QRCode.vue'
import BottomNav from '@/components/BottomNav.vue'
import { 
  User, 
  Stethoscope, 
  Heart, 
  Edit2, 
  Copy, 
  Shield, 
  Smartphone, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Bell, 
  Settings, 
  ChevronRight, 
  AlertCircle,
  QrCode
} from 'lucide-vue-next'

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

const showQrModal = ref(false)

// 角色判断
const isElderly = computed(() => userRoles.value.includes('elderly'))
const isDoctor = computed(() => userRoles.value.includes('doctor'))
const isGuardian = computed(() => userRoles.value.includes('guardian'))

// 获取角色文本
const getRoleText = (role: string) => {
  const roleMap: Record<string, string> = {
    elderly: '老人',
    doctor: '医生',
    guardian: '家属'
  }
  return roleMap[role] || role
}

// 格式化地址
const formatAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 格式化设备ID
const formatDeviceId = (id: string) => {
  if (!id) return ''
  if (id.length > 10) return `${id.slice(0, 10)}...`
  return id
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
const goToGuardianSetup = () => {
  router.push('/guardian-setup')
}

const goToGuardianRecoveryList = () => {
  router.push('/guardian-recovery-list')
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
  background: #667eea;

  padding: 30px 20px 50px;
  border-radius: 0 0 30px 30px;
  box-shadow: var(--shadow-lg);
  position: relative;
}

.qr-entry-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.qr-entry-icon {
  width: 22px;
  height: 22px;
}

.qr-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
}

.qr-modal {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.qr-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px;
  border-bottom: 1px solid var(--border-color);
}

.qr-modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #2d3748;
}

.qr-modal-close {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: none;
  background: #f3f4f6;
  color: #334155;
  font-size: 18px;
  cursor: pointer;
}

.qr-modal-body {
  padding: 18px 16px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.qr-modal-address {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #475569;
}

.qr-modal-copy {
  border: none;
  background: var(--color-primary);
  color: white;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-avatar {
  flex-shrink: 0;
}

.avatar-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 3px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.avatar-icon {
  width: 40px;
  height: 40px;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  color: white;
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.edit-name-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: white;
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

.icon-small {
  width: 16px;
  height: 16px;
}

.name-edit-form {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.name-input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  color: #2d3748;
  outline: none;
}

.name-input:focus {
  border-color: white;
  background: white;
}

.save-btn, .cancel-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.save-btn {
  background: white;
  color: var(--color-primary);
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.role-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.role-tag {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.25);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.role-tag.elderly {
  background: rgba(34, 197, 94, 0.3);
}

.role-tag.doctor {
  background: rgba(59, 130, 246, 0.3);
}

.role-tag.guardian {
  background: rgba(249, 115, 22, 0.3);
}

/* 账户信息区块 */
.account-section {
  padding: 0 20px;
  margin-top: -30px;
  margin-bottom: 24px;
  position: relative;
  z-index: 10;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #718096;
  margin: 0 0 12px 0;
  padding-left: 4px;
  display: none; /* 隐藏标题，因为卡片已经很明显了 */
}

.info-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--shadow-md);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-color);
}

.info-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-row:first-child {
  padding-top: 0;
}

.info-label {
  font-size: 14px;
  font-weight: 500;
  color: #718096;
  display: flex;
  align-items: center;
  gap: 8px;
}

.label-icon {
  width: 16px;
  height: 16px;
  color: #a0aec0;
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
  font-size: 13px;
  color: #2d3748;
  font-family: 'Courier New', monospace;
  background: #f7fafc;
  padding: 6px 10px;
  border-radius: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}

.copy-btn {
  background: var(--primary-50);
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-btn:hover {
  background: var(--primary-100);
  transform: scale(1.05);
}

.icon-mini {
  width: 14px;
  height: 14px;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-badge.online {
  background: #d4f4dd;
  color: #22c55e;
}

.status-badge.offline {
  background: #ffebee;
  color: #ef4444;
}

.status-icon {
  width: 14px;
  height: 14px;
}

/* 功能菜单 */
.menu-section {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.menu-item {
  background-color: white;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: var(--shadow-sm);
  border: 1px solid transparent;
}

.menu-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-100);
}

.menu-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.menu-icon-wrapper.blue { background: #e0f2fe; color: #0ea5e9; }
.menu-icon-wrapper.orange { background: #ffedd5; color: #f97316; }
.menu-icon-wrapper.purple { background: #f3e8ff; color: #a855f7; }
.menu-icon-wrapper.red { background: #fee2e2; color: #ef4444; }
.menu-icon-wrapper.gray { background: #f3f4f6; color: #6b7280; }

.menu-icon {
  width: 24px;
  height: 24px;
}

.menu-content {
  flex: 1;
  min-width: 0;
}

.menu-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.menu-desc {
  font-size: 13px;
  color: #718096;
  margin: 0;
}

.menu-badge {
  background-color: #ef4444;
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.menu-arrow {
  width: 20px;
  height: 20px;
  color: #cbd5e0;
}

/* Toast 提示 */
.toast {
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  animation: slideDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  align-items: center;
  gap: 8px;
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
  background: white;
  color: #22c55e;
  border: 1px solid #d4f4dd;
}

.toast.error {
  background: white;
  color: #ef4444;
  border: 1px solid #ffebee;
}

.toast-icon {
  width: 18px;
  height: 18px;
}
</style>
