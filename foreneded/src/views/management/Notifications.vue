<template>
  <div class="notifications-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="page-title">消息通知</h1>
      <button class="mark-all-btn" @click="markAllRead" v-if="unreadCount > 0">
        全部已读
      </button>
    </div>
    
    <!-- 通知统计 -->
    <div class="notification-stats">
      <div class="stat-item">
        <div class="stat-number">{{ totalNotifications }}</div>
        <div class="stat-label">总消息</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">{{ unreadCount }}</div>
        <div class="stat-label">未读</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">{{ urgentCount }}</div>
        <div class="stat-label">紧急</div>
      </div>
    </div>
    
    <!-- 通知类型筛选 -->
    <div class="filter-tabs">
      <button
        v-for="filter in filters"
        :key="filter.value"
        class="filter-tab"
        :class="{ active: selectedFilter === filter.value }"
        @click="selectedFilter = filter.value"
      >
        {{ filter.icon }} {{ filter.label }}
        <span v-if="filter.count > 0" class="filter-count">{{ filter.count }}</span>
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
    
    <!-- 通知列表 -->
    <div v-if="!isLoading" class="notifications-list">
      <div
        v-for="notification in filteredNotifications"
        :key="notification.notification_id"
        class="notification-item"
        :class="{ 
          unread: !notification.read_at,
          urgent: notification.priority === 'urgent'
        }"
        @click="showNotificationDetail(notification)"
      >
        <div class="notification-icon" :class="getNotificationCategoryClass(notification.type)">
          {{ getNotificationIcon(notification.type) }}
        </div>
        <div class="notification-content">
          <div class="notification-header">
            <h3 class="notification-title">{{ notification.title }}</h3>
            <span class="notification-time">{{ formatTime(notification.created_at) }}</span>
          </div>
          <p class="notification-message">{{ formatMessageWithAddress(notification.body) }}</p>
          <div class="notification-meta">
            <span class="notification-category">{{ getNotificationCategory(notification.type) }}</span>
            <span class="notification-priority" :class="notification.priority">
              {{ getPriorityText(notification.priority) }}
            </span>
          </div>
        </div>
        <div v-if="!notification.read_at" class="unread-indicator"></div>
      </div>
      
      <!-- 空状态 -->
      <div v-if="filteredNotifications.length === 0 && !isLoading" class="empty-state">
        <div class="empty-icon">📭</div>
        <h3 class="empty-title">暂无{{ getFilterName() }}</h3>
        <p class="empty-desc">当有新消息时会在这里显示</p>
      </div>
    </div>
    
    <!-- 消息详情弹窗 -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">{{ selectedNotification?.title }}</h2>
          <button class="modal-close-btn" @click="closeDetailModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="detail-section">
            <div class="detail-label">消息内容</div>
            <div class="detail-value">{{ selectedNotification?.body }}</div>
          </div>
          
          <div class="detail-section">
            <div class="detail-label">消息类型</div>
            <div class="detail-value">
              <span class="category-badge" :class="getNotificationCategoryClass(selectedNotification?.type || '')">
                {{ getNotificationIcon(selectedNotification?.type || '') }} {{ getNotificationCategory(selectedNotification?.type || '') }}
              </span>
            </div>
          </div>
          
          <div class="detail-section">
            <div class="detail-label">优先级</div>
            <div class="detail-value">
              <span class="priority-badge" :class="selectedNotification?.priority">
                {{ getPriorityText(selectedNotification?.priority || 'normal') }}
              </span>
            </div>
          </div>
          
          <div class="detail-section">
            <div class="detail-label">接收时间</div>
            <div class="detail-value">{{ formatFullTime(selectedNotification?.created_at || '') }}</div>
          </div>
          
          <!-- 显示附加数据 -->
          <div v-if="selectedNotification?.data && Object.keys(selectedNotification.data).length > 0" class="detail-section">
            <div class="detail-label">详细信息</div>
            <div class="detail-data">
              <div v-for="(value, key) in selectedNotification.data" :key="key" class="data-item">
                <span class="data-key">{{ formatDataKey(key) }}:</span>
                <span class="data-value">{{ formatDataValue(key, value) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="modal-action-btn primary" @click="handleDetailAction">
            前往处理
          </button>
          <button class="modal-action-btn" @click="closeDetailModal">
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { notificationService, type Notification } from '@/service/notification'
import { authService } from '@/service/auth'
import { notificationBadgeService } from '@/service/notificationBadge'

const router = useRouter()

const selectedFilter = ref('all')
const isLoading = ref(false)
const errorMessage = ref('')
const showDetailModal = ref(false)
const selectedNotification = ref<Notification | null>(null)

const notifications = ref<Notification[]>([])

// ==================== 通知分类 ====================

// 获取通知类型的分类
const getNotificationCategory = (type: string) => {
  const categoryMap: Record<string, string> = {
    // 用药相关
    'medication_reminder': '用药提醒',
    'new_medication_plan': '用药计划',
    'medication_plan_updated': '用药计划',
    'medication_plan_created': '用药计划',
    'medication_plan_shared': '用药计划',
    
    // 关系管理
    'relationship_invitation_accepted': '关系管理',
    'relationship_joined_group': '关系管理',
    'relationship_suspended': '关系管理',
    'relationship_resumed': '关系管理',
    'relationship_revoked': '关系管理',
    'invitation_created': '关系邀请',
    
    // 系统通知
    'migration_session_created': '账户迁移',
    'migration_completed': '账户迁移',
    'system_notification': '系统通知',
    
    // 安全相关
    'recovery_request_received': '账户恢复',
    'guardian_added': '守护者管理',
    'threshold_changed': '守护者管理',
    'recovery_initiated': '账户恢复',
    'recovery_supported': '账户恢复',
    'recovery_cancelled': '账户恢复',
    'recovery_completed': '账户恢复',
    
    // 消息
    'encrypted_message': '加密消息'
  }
  return categoryMap[type] || '其他通知'
}

// 获取通知分类的主类别（用于筛选）
const getNotificationMainCategory = (type: string) => {
  const category = getNotificationCategory(type)
  if (category.includes('用药')) return 'medication'
  if (category.includes('关系') || category.includes('邀请')) return 'relationship'
  if (category.includes('恢复') || category.includes('守护者')) return 'security'
  if (category.includes('迁移') || category.includes('系统')) return 'system'
  if (category.includes('消息')) return 'message'
  return 'other'
}

// 获取分类对应的CSS类名
const getNotificationCategoryClass = (type: string) => {
  const mainCategory = getNotificationMainCategory(type)
  return `category-${mainCategory}`
}

const filters = computed(() => [
  { label: '全部', icon: '📋', value: 'all', count: notifications.value.length },
  { label: '用药', icon: '💊', value: 'medication', count: notifications.value.filter(n => getNotificationMainCategory(n.type) === 'medication').length },
  { label: '关系', icon: '👥', value: 'relationship', count: notifications.value.filter(n => getNotificationMainCategory(n.type) === 'relationship').length },
  { label: '安全', icon: '🔒', value: 'security', count: notifications.value.filter(n => getNotificationMainCategory(n.type) === 'security').length },
  { label: '系统', icon: '🔔', value: 'system', count: notifications.value.filter(n => getNotificationMainCategory(n.type) === 'system').length }
])

const totalNotifications = computed(() => notifications.value.length)
const unreadCount = computed(() => notifications.value.filter(n => !n.read_at).length)
const urgentCount = computed(() => notifications.value.filter(n => n.priority === 'urgent').length)

const filteredNotifications = computed(() => {
  if (selectedFilter.value === 'all') {
    return notifications.value
  }
  return notifications.value.filter(n => getNotificationMainCategory(n.type) === selectedFilter.value)
})

// 获取通知图标
const getNotificationIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    // 用药
    'medication_reminder': '💊',
    'new_medication_plan': '📋',
    'medication_plan_updated': '📝',
    'medication_plan_created': '📋',
    'medication_plan_shared': '📤',
    
    // 关系
    'relationship_invitation_accepted': '✅',
    'relationship_joined_group': '👋',
    'relationship_suspended': '⏸️',
    'relationship_resumed': '▶️',
    'relationship_revoked': '❌',
    'invitation_created': '📬',
    
    // 系统
    'migration_session_created': '🔐',
    'migration_completed': '✨',
    'system_notification': '🔔',
    
    // 安全
    'recovery_request_received': '🆘',
    'guardian_added': '🛡️',
    'threshold_changed': '⚙️',
    'recovery_initiated': '⚠️',
    'recovery_supported': '👍',
    'recovery_cancelled': '🚫',
    'recovery_completed': '✅',
    
    // 消息
    'encrypted_message': '💬'
  }
  return iconMap[type] || '📢'
}

const getFilterName = () => {
  const filter = filters.value.find(f => f.value === selectedFilter.value)
  return filter ? filter.label : '消息'
}

// ==================== 优先级处理 ====================

const getPriorityText = (priority: string) => {
  const priorityMap: Record<string, string> = {
    'urgent': '🔴 紧急',
    'high': '🟠 重要',
    'normal': '🟢 普通'
  }
  return priorityMap[priority] || '🟢 普通'
}

// ==================== 时间格式化 ====================

const formatTime = (timeStr: string) => {
  // 将UTC时间转换为本地时间
  const time = new Date(timeStr)
  const now = new Date()
  
  // 确保时间有效
  if (isNaN(time.getTime())) {
    return '时间未知'
  }
  
  const diff = now.getTime() - time.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) {
    return '刚刚'
  } else if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 7) {
    return `${days}天前`
  } else {
    // 超过7天，显示具体日期（本地时间）
    const month = time.getMonth() + 1
    const date = time.getDate()
    const hour = time.getHours()
    const minute = time.getMinutes()
    return `${month}月${date}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }
}

const formatFullTime = (timeStr: string) => {
  const time = new Date(timeStr)
  if (isNaN(time.getTime())) return '时间未知'
  
  const year = time.getFullYear()
  const month = (time.getMonth() + 1).toString().padStart(2, '0')
  const date = time.getDate().toString().padStart(2, '0')
  const hour = time.getHours().toString().padStart(2, '0')
  const minute = time.getMinutes().toString().padStart(2, '0')
  const second = time.getSeconds().toString().padStart(2, '0')
  
  return `${year}-${month}-${date} ${hour}:${minute}:${second}`
}

// ==================== 地址格式化 ====================

// 缩写以太坊地址
const shortenAddress = (address: string) => {
  if (!address || address.length < 10) return address
  if (!address.startsWith('0x')) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 格式化消息体中的地址
const formatMessageWithAddress = (message: string) => {
  // 匹配以太坊地址格式 (0x + 40个十六进制字符)
  const addressRegex = /(0x[a-fA-F0-9]{40})/g
  return message.replace(addressRegex, (match) => shortenAddress(match))
}

// ==================== 详情弹窗相关 ====================

// 显示通知详情
const showNotificationDetail = async (notification: Notification) => {
  selectedNotification.value = notification
  showDetailModal.value = true
  
  // 标记为已读
  if (!notification.read_at) {
    await markAsRead(notification)
  }
}

// 关闭详情弹窗
const closeDetailModal = () => {
  showDetailModal.value = false
  selectedNotification.value = null
}

// 处理详情页的操作
const handleDetailAction = () => {
  if (!selectedNotification.value) return
  
  const notification = selectedNotification.value
  const mainCategory = getNotificationMainCategory(notification.type)
  
  closeDetailModal()
  
  // 根据通知类型跳转到相应页面
  switch (mainCategory) {
    case 'medication':
      router.push('/medication-history')
      break
    case 'relationship':
      router.push('/relationships')
      break
    case 'security':
      router.push('/guardian-setup')
      break
    case 'system':
      if (notification.type.includes('migration')) {
        router.push('/account-migration')
      } else {
        router.push('/settings')
      }
      break
    case 'message':
      // 跳转到加密消息页面（如果有的话）
      router.push('/home')
      break
    default:
      console.log('查看通知详情:', notification)
  }
}

// 格式化数据键名
const formatDataKey = (key: string) => {
  const keyMap: Record<string, string> = {
    'account_address': '账户地址',
    'guardian_address': '守护者地址',
    'viewer_address': '访问者地址',
    'owner_address': '拥有者地址',
    'access_group_id': '访问组ID',
    'access_group_name': '访问组名称',
    'access_group_type': '访问组类型',
    'tx_hash': '交易哈希',
    'timestamp': '时间戳',
    'old_threshold': '旧阈值',
    'new_threshold': '新阈值',
    'new_owner_address': '新拥有者地址',
    'old_owner_address': '旧拥有者地址',
    'current_approvals': '当前支持数',
    'required_approvals': '需要支持数',
    'migration_id': '迁移ID',
    'confirm_code': '确认码',
    'old_device_id': '旧设备ID',
    'new_device_id': '新设备ID',
    'completed_at': '完成时间',
    'expires_at': '过期时间',
    'cancelled_by': '取消者',
    'reason': '原因'
  }
  return keyMap[key] || key
}

// 格式化数据值
const formatDataValue = (key: string, value: any) => {
  if (value === null || value === undefined) return '-'
  
  // 地址类型的字段
  if (key.includes('address') || key === 'tx_hash') {
    return shortenAddress(String(value))
  }
  
  // 时间戳
  if (key.includes('timestamp') || key.includes('_at')) {
    if (typeof value === 'number') {
      return formatFullTime(new Date(value).toISOString())
    }
    return formatFullTime(String(value))
  }
  
  // 原因字段
  if (key === 'reason') {
    const reasonMap: Record<string, string> = {
      'suspended_by_owner': '由拥有者暂停',
      'revoked_by_owner': '由拥有者撤销',
      'expired': '已过期',
      'user_requested': '用户请求'
    }
    return reasonMap[String(value)] || String(value)
  }
  
  return String(value)
}

const goBack = () => {
  router.back()
}

// 加载通知列表
const loadNotifications = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    await authService.ensureBackendLoginWithBiometric()
    const data = await notificationService.getNotifications()
    notifications.value = data
    console.log(`加载了 ${data.length} 条通知`)
  } catch (error: any) {
    console.error('加载通知失败:', error)
    errorMessage.value = error.message || '加载失败'
  } finally {
    isLoading.value = false
  }
}

// 标记单条已读
const markAsRead = async (notification: Notification) => {
  if (notification.read_at) return // 已读则跳过
  
  try {
    await notificationService.markAsRead(notification.notification_id)
    notification.read_at = new Date().toISOString()
    
    // 更新红点数量
    notificationBadgeService.decreaseUnreadCount()
  } catch (error) {
    console.error('标记已读失败:', error)
  }
}

// 标记全部已读
const markAllRead = async () => {
  if (unreadCount.value === 0) return
  
  try {
    const count = unreadCount.value
    await notificationService.markAllRead()
    notifications.value.forEach(n => {
      if (!n.read_at) {
        n.read_at = new Date().toISOString()
      }
    })
    
    // 更新红点数量
    notificationBadgeService.decreaseUnreadCount(count)
  } catch (error) {
    console.error('标记全部已读失败:', error)
    alert('操作失败，请重试')
  }
}

// WebSocket事件处理
const handleNewNotification = (data: any) => {
  console.log('🔔 收到新通知:', data)
  // 添加到列表顶部
  notifications.value.unshift(data)
  
  // 注意：红点数量已由 notificationBadgeService.listenForNewNotifications() 自动更新
  // 无需在这里手动增加
}

onMounted(async () => {
  await loadNotifications()
  
  // 连接WebSocket
  notificationService.connect()
  
  // 订阅新通知事件
  notificationService.on('notification', handleNewNotification)
})

onBeforeUnmount(() => {
  // 取消订阅
  notificationService.off('notification', handleNewNotification)
})
</script>

<style scoped>
.notifications-page {
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

.mark-all-btn {
  background-color: #4299e1;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

.notification-stats {
  display: flex;
  justify-content: space-around;
  padding: 20px;
  gap: 15px;
}

.stat-item {
  background-color: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  flex: 1;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #4299e1;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 0.9rem;
  color: #718096;
}

.filter-tabs {
  display: flex;
  padding: 0 20px 20px;
  gap: 10px;
  overflow-x: auto;
}

.filter-tab {
  background-color: white;
  border: 1px solid #e2e8f0;
  padding: 10px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-tab.active {
  background-color: #4299e1;
  color: white;
  border-color: #4299e1;
}

.filter-count {
  background-color: rgba(255,255,255,0.2);
  color: white;
  font-size: 0.8rem;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.filter-tab:not(.active) .filter-count {
  background-color: #e53e3e;
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

.notifications-list {
  padding: 0 20px;
}

.notification-item {
  background-color: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 10px;
  display: flex;
  align-items: flex-start;
  gap: 15px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  position: relative;
}

.notification-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.notification-item.unread {
  border-left: 4px solid #4299e1;
}

.notification-item.urgent {
  border-left: 4px solid #e53e3e;
  background: linear-gradient(to right, #fff5f5, white);
}

.notification-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  flex-shrink: 0;
}

/* 分类样式 */
.notification-icon.category-medication {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
}

.notification-icon.category-relationship {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.notification-icon.category-security {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.notification-icon.category-system {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
}

.notification-icon.category-message {
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
}

.notification-icon.category-other {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
}

.notification-content {
  flex: 1;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.notification-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.notification-time {
  font-size: 0.8rem;
  color: #a0aec0;
  flex-shrink: 0;
}

.notification-message {
  color: #718096;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 10px 0;
  word-break: break-word;
}

.notification-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.notification-category {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 12px;
  background: #f7fafc;
  color: #4a5568;
  font-weight: 600;
}

.notification-priority {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.notification-priority.urgent {
  background: #fed7d7;
  color: #c53030;
}

.notification-priority.high {
  background: #feebc8;
  color: #c05621;
}

.notification-priority.normal {
  background: #c6f6d5;
  color: #2f855a;
}

.unread-indicator {
  width: 8px;
  height: 8px;
  background-color: #e53e3e;
  border-radius: 50%;
  position: absolute;
  top: 20px;
  right: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.empty-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #4a5568;
  margin: 0 0 10px 0;
}

.empty-desc {
  color: #718096;
  margin: 0;
}

.batch-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: white;
  border-top: 1px solid #e2e8f0;
  padding: 15px 20px;
  display: flex;
  gap: 15px;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
}

.batch-btn {
  flex: 1;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.batch-btn:first-child {
  background-color: #4299e1;
  color: white;
}

.batch-btn:first-child:hover {
  background-color: #3182ce;
}

.batch-btn.delete {
  background-color: #e53e3e;
  color: white;
}

.batch-btn.delete:hover {
  background-color: #c53030;
}

/* 详情弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 20px;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
  flex: 1;
  padding-right: 20px;
}

.modal-close-btn {
  background: #f7fafc;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.5rem;
  color: #718096;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-close-btn:hover {
  background: #e2e8f0;
  color: #2d3748;
  transform: scale(1.1);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #718096;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 1rem;
  color: #2d3748;
  line-height: 1.6;
  word-break: break-word;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
}

.category-badge.category-medication {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #0c4a6e;
}

.category-badge.category-relationship {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #14532d;
}

.category-badge.category-security {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #78350f;
}

.category-badge.category-system {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #3730a3;
}

.category-badge.category-message {
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
  color: #831843;
}

.priority-badge {
  display: inline-block;
  padding: 8px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
}

.priority-badge.urgent {
  background: linear-gradient(135deg, #fed7d7 0%, #fc8181 100%);
  color: #742a2a;
}

.priority-badge.high {
  background: linear-gradient(135deg, #feebc8 0%, #fbd38d 100%);
  color: #7c2d12;
}

.priority-badge.normal {
  background: linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%);
  color: #22543d;
}

.detail-data {
  background: #f7fafc;
  border-radius: 12px;
  padding: 16px;
}

.data-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
  gap: 16px;
}

.data-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.data-item:first-child {
  padding-top: 0;
}

.data-key {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a5568;
  min-width: 100px;
  flex-shrink: 0;
}

.data-value {
  font-size: 0.9rem;
  color: #2d3748;
  font-family: 'Courier New', monospace;
  word-break: break-all;
  text-align: right;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
}

.modal-action-btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.modal-action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.modal-action-btn:not(.primary) {
  background: #f7fafc;
  color: #4a5568;
}

.modal-action-btn:not(.primary):hover {
  background: #e2e8f0;
}
</style>
