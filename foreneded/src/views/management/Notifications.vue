<template>
  <div class="notifications-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
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
        <component :is="filter.icon" class="filter-icon" />
        {{ filter.label }}
        <span v-if="filter.count > 0" class="filter-count">{{ filter.count }}</span>
      </button>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-container">
      <Loader2 class="spinner" />
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
          <component :is="getNotificationIcon(notification.type)" class="icon-medium" />
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
        <Inbox class="empty-icon" />
        <h3 class="empty-title">暂无{{ getFilterName() }}</h3>
        <p class="empty-desc">当有新消息时会在这里显示</p>
      </div>
    </div>
    
    <!-- 消息详情弹窗 -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">{{ selectedNotification?.title }}</h2>
          <button class="modal-close-btn" @click="closeDetailModal">
            <X class="icon-small" />
          </button>
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
                <component :is="getNotificationIcon(selectedNotification?.type || '')" class="icon-mini" />
                {{ getNotificationCategory(selectedNotification?.type || '') }}
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
          <template v-if="selectedNotification?.type === 'friend_request_received'">
            <button class="modal-action-btn primary" @click="acceptFriendRequest" :disabled="isHandlingFriendRequest">
              同意
            </button>
            <button class="modal-action-btn danger" @click="rejectFriendRequest" :disabled="isHandlingFriendRequest">
              拒绝
            </button>
            <button class="modal-action-btn" @click="closeDetailModal" :disabled="isHandlingFriendRequest">
              关闭
            </button>
          </template>
          <template v-else>
            <button class="modal-action-btn primary" @click="handleDetailAction">
              前往处理
            </button>
            <button class="modal-action-btn" @click="closeDetailModal">
              关闭
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { notificationService, type Notification, getNotificationRoute, getNotificationCategoryLabel, getNotificationMainCategory } from '@/service/notification'
import { authService } from '@/service/auth'
import { notificationBadgeService } from '@/service/notificationBadge'
import { uiService } from '@/service/ui'
import { relationService } from '@/service/relation'
import { 
  ArrowLeft, 
  ClipboardList, 
  Pill, 
  Users, 
  Lock, 
  Bell, 
  FileText, 
  Share2, 
  CheckCircle, 
  Hand, 
  PauseCircle, 
  PlayCircle, 
  XCircle, 
  Mail, 
  Key, 
  Sparkles, 
  AlertTriangle, 
  Shield, 
  Settings, 
  AlertCircle, 
  ThumbsUp, 
  Ban, 
  MessageSquare, 
  Megaphone, 
  Inbox, 
  Loader2, 
  X 
} from 'lucide-vue-next'

const router = useRouter()

const selectedFilter = ref('all')
const isLoading = ref(false)
const errorMessage = ref('')
const showDetailModal = ref(false)
const selectedNotification = ref<Notification | null>(null)

const isHandlingFriendRequest = ref(false)

const notifications = ref<Notification[]>([])

// ==================== 通知分类 ====================

// 获取通知类型的分类
const getNotificationCategory = (type: string) => getNotificationCategoryLabel(type)

// 获取通知分类的主类别（用于筛选）
const getNotificationMainCategoryLocal = (type: string) => getNotificationMainCategory(type)

// 获取分类对应的CSS类名
const getNotificationCategoryClass = (type: string) => {
  const mainCategory = getNotificationMainCategoryLocal(type)
  return `category-${mainCategory}`
}

const filters = computed(() => [
  { label: '全部', icon: ClipboardList, value: 'all', count: notifications.value.length },
  { label: '用药', icon: Pill, value: 'medication', count: notifications.value.filter(n => getNotificationMainCategoryLocal(n.type) === 'medication').length },
  { label: '关系', icon: Users, value: 'relationship', count: notifications.value.filter(n => getNotificationMainCategoryLocal(n.type) === 'relationship').length },
  { label: '安全', icon: Lock, value: 'security', count: notifications.value.filter(n => getNotificationMainCategoryLocal(n.type) === 'security').length },
  { label: '系统', icon: Bell, value: 'system', count: notifications.value.filter(n => getNotificationMainCategoryLocal(n.type) === 'system').length }
])

const totalNotifications = computed(() => notifications.value.length)
const unreadCount = computed(() => notifications.value.filter(n => !n.read_at).length)
const urgentCount = computed(() => notifications.value.filter(n => n.priority === 'urgent').length)

const filteredNotifications = computed(() => {
  if (selectedFilter.value === 'all') {
    return notifications.value
  }
  return notifications.value.filter(n => getNotificationMainCategoryLocal(n.type) === selectedFilter.value)
})

// 获取通知图标
const getNotificationIcon = (type: string) => {
  const iconMap: Record<string, any> = {
    // 用药
    'medication_reminder': Pill,
    'new_medication_plan': FileText,
    'medication_plan_updated': FileText,
    'medication_plan_created': ClipboardList,
    'medication_plan_shared': Share2,
    'medication_plan_cancelled': Ban,
    
    // 关系
    'relationship_invitation_accepted': CheckCircle,
    'relationship_joined_group': Hand,
    'relationship_suspended': PauseCircle,
    'relationship_resumed': PlayCircle,
    'relationship_revoked': XCircle,
    'invitation_created': Mail,

    'friend_request_received': Mail,
    'friend_request_sent': Mail,
    'friend_request_accepted': CheckCircle,
    'friend_request_rejected': XCircle,
    'friend_added': Users,
    
    // 系统
    'migration_session_created': Key,
    'migration_completed': Sparkles,
    'system_notification': Bell,
    
    // 安全
    'recovery_request_received': AlertTriangle,
    'recovery_requested': AlertTriangle,
    'guardian_added': Shield,
    'threshold_changed': Settings,
    'recovery_initiated': AlertCircle,
    'recovery_supported': ThumbsUp,
    'recovery_cancelled': Ban,
    'recovery_cancelled_guardian': Ban,
    'recovery_completed': CheckCircle,
    'recovery_completed_old_owner': CheckCircle,
    
    // 消息
    'encrypted_message': MessageSquare
  }
  return iconMap[type] || Megaphone
}

const acceptFriendRequest = async () => {
  if (!selectedNotification.value) return
  const friendRequestId = selectedNotification.value.data?.friend_request_id
  if (!friendRequestId) {
    uiService.toast('缺少好友申请ID', { type: 'error' })
    return
  }

  try {
    isHandlingFriendRequest.value = true
    await relationService.acceptFriendRequest(friendRequestId)
    uiService.toast('已同意好友申请', { type: 'success' })
    closeDetailModal()
    await loadNotifications()
  } catch (error: any) {
    console.error('同意好友申请失败:', error)
    uiService.toast(error.message || '同意失败', { type: 'error' })
  } finally {
    isHandlingFriendRequest.value = false
  }
}

const rejectFriendRequest = async () => {
  if (!selectedNotification.value) return
  const friendRequestId = selectedNotification.value.data?.friend_request_id
  if (!friendRequestId) {
    uiService.toast('缺少好友申请ID', { type: 'error' })
    return
  }

  try {
    isHandlingFriendRequest.value = true
    await relationService.rejectFriendRequest(friendRequestId)
    uiService.toast('已拒绝好友申请', { type: 'success' })
    closeDetailModal()
    await loadNotifications()
  } catch (error: any) {
    console.error('拒绝好友申请失败:', error)
    uiService.toast(error.message || '拒绝失败', { type: 'error' })
  } finally {
    isHandlingFriendRequest.value = false
  }
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
    'normal': '🟢 普通',
    'low': '🔵 低'
  }
  return priorityMap[priority] || '🟢 普通'
}

// ==================== 时间格式化 ====================

const addHours = (d: Date, hours: number) => {
  const out = new Date(d.getTime())
  out.setHours(out.getHours() + hours)
  return out
}

const formatTime = (timeStr: string) => {
  // 将UTC时间转换为本地时间
  const time = addHours(new Date(timeStr), 8)
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
  const time = addHours(new Date(timeStr), 8)
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
  
  closeDetailModal()

  router.push(getNotificationRoute(notification.type, notification.data))
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
    uiService.toast('操作失败，请重试', { type: 'error' })
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
  padding: 16px 20px;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  background: none;
  border: none;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4a5568;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background-color: #f7fafc;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.mark-all-btn {
  font-size: 0.875rem;
  color: #4299e1;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.notification-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 20px;
}

.stat-item {
  background: white;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.875rem;
  color: #718096;
}

.filter-tabs {
  display: flex;
  overflow-x: auto;
  padding: 0 20px 20px;
  gap: 12px;
  scrollbar-width: none;
}

.filter-tabs::-webkit-scrollbar {
  display: none;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  color: #718096;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tab.active {
  background: #4299e1;
  color: white;
  border-color: #4299e1;
}

.filter-count {
  background: rgba(0,0,0,0.1);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.75rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  color: #718096;
}

.spinner {
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

.error-banner {
  margin: 0 20px 20px;
  padding: 12px;
  background: #fff5f5;
  color: #c53030;
  border-radius: 8px;
  font-size: 0.875rem;
  text-align: center;
}

.notifications-list {
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 16px;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.notification-item:active {
  transform: scale(0.98);
}

.notification-item.unread {
  background: #ebf8ff;
}

.notification-item.urgent {
  border-left: 4px solid #f56565;
}

.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
}

.category-medication { background: #4299e1; }
.category-relationship { background: #48bb78; }
.category-security { background: #ed8936; }
.category-system { background: #a0aec0; }
.category-message { background: #9f7aea; }
.category-other { background: #cbd5e0; }

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.notification-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
  line-height: 1.4;
}

.notification-time {
  font-size: 0.75rem;
  color: #a0aec0;
  white-space: nowrap;
  margin-left: 8px;
}

.notification-message {
  font-size: 0.875rem;
  color: #4a5568;
  margin: 0 0 8px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-meta {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
}

.notification-category {
  color: #718096;
  background: #f7fafc;
  padding: 2px 6px;
  border-radius: 4px;
}

.notification-priority.urgent { color: #e53e3e; font-weight: 600; }
.notification-priority.high { color: #dd6b20; }
.notification-priority.normal { color: #38a169; }

.unread-indicator {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 8px;
  height: 8px;
  background: #f56565;
  border-radius: 50%;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #a0aec0;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #4a5568;
  margin: 0 0 8px 0;
}

.empty-desc {
  font-size: 0.875rem;
}

/* Modal Styles */
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

.modal-content {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.modal-close-btn {
  background: none;
  border: none;
  color: #a0aec0;
  cursor: pointer;
  padding: 4px;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-label {
  font-size: 0.875rem;
  color: #718096;
  margin-bottom: 8px;
}

.detail-value {
  font-size: 1rem;
  color: #2d3748;
  line-height: 1.6;
}

.category-badge, .priority-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
}

.data-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #edf2f7;
  font-size: 0.875rem;
}

.data-key {
  color: #718096;
}

.data-value {
  color: #2d3748;
  font-family: monospace;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
}

.modal-action-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-action-btn.primary {
  background: #4299e1;
  color: white;
}

 .modal-action-btn.danger {
  background: #f56565;
  color: white;
 }

.modal-action-btn:not(.primary):not(.danger) {
  background: #edf2f7;
  color: #4a5568;
}

.modal-action-btn:hover {
  transform: translateY(-1px);
  filter: brightness(0.95);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
