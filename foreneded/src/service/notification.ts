/**
 * 通知服务
 * 处理WebSocket连接和通知HTTP API
 */

import { NOTIFICATION_CONFIG, buildNotificationUrl } from '@/config/api.config'
import { authService } from './auth'
import { localNotificationService } from './localNotification'
import { Preferences } from '@capacitor/preferences'

// 通知接口
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low'

export interface Notification {
  notification_id: string
  recipient_address: string
  type: string
  priority: NotificationPriority
  title: string
  body: string
  data?: Record<string, any>
  channels: string[]
  status: string
  created_at: string
  sent_at?: string
  read_at?: string | null
}

const URGENT_NOTIFICATION_TYPES = new Set<string>([
  'recovery_initiated',
  'recovery_completed',
  'recovery_completed_old_owner',
  'migration_session_created',
  'migration_completed',
])

export function getNotificationRoute(type: string, data?: Record<string, any>): string {
  if (!type) return '/notifications'

  if (type.includes('medication_checkin')) {
    return '/weekly-summary'
  }

  if (type.includes('medication_plan') || type === 'new_medication_plan') {
    return '/elderly/my-medication-plans'
  }

  if (type.includes('medication')) {
    return '/medication-history'
  }

  if (type.includes('relationship') || type.includes('friend_request') || type === 'friend_added' || type === 'invitation_created') {
    if (type === 'invitation_created' && data?.token) {
      return '/invitation'
    }
    return '/relationships'
  }

  if (type.includes('migration')) {
    return '/account-migration'
  }

  if (type.includes('recovery')) {
    if (type === 'recovery_requested') {
      // 守护者收到恢复请求通知，跳转到守护者恢复请求列表页面
      return '/guardian-recovery-list'
    }

    if (
      type === 'recovery_initiated' ||
      type === 'recovery_supported' ||
      type === 'recovery_cancelled' ||
      type === 'recovery_cancelled_guardian' ||
      type === 'recovery_completed' ||
      type === 'recovery_completed_old_owner'
    ) {
      const accountAddress = data?.account_address || data?.accountAddress || ''
      const newOwnerAddress = data?.new_owner_address || data?.newOwnerAddress || ''

      const params = new URLSearchParams()
      if (accountAddress) params.set('old_smart_account', String(accountAddress))
      if (newOwnerAddress) params.set('new_owner_address', String(newOwnerAddress))

      const query = params.toString()
      return query ? `/recovery-request?${query}` : '/recovery-request'
    }

    return '/account-security'
  }

  if (type === 'guardian_added' || type === 'threshold_changed') {
    return '/guardian-setup'
  }

  if (type.startsWith('zkp.')) {
    return '/weekly-summary'
  }

  return '/notifications'
}

export type NotificationMainCategory = 'medication' | 'relationship' | 'security' | 'system' | 'message' | 'other'

export function getNotificationCategoryLabel(type: string): string {
  if (!type) return '其他通知'

  if (type.startsWith('zkp.')) return 'ZKP证明'

  if (type.includes('medication_checkin')) return '用药打卡'

  const categoryMap: Record<string, string> = {
    'medication_reminder': '用药提醒',
    'new_medication_plan': '用药计划',
    'medication_plan_updated': '用药计划',
    'medication_plan_created': '用药计划',
    'medication_plan_shared': '用药计划',
    'medication_plan_cancelled': '用药计划',

    'relationship_invitation_accepted': '关系管理',
    'relationship_joined_group': '关系管理',
    'relationship_suspended': '关系管理',
    'relationship_resumed': '关系管理',
    'relationship_revoked': '关系管理',
    'invitation_created': '关系邀请',

    'friend_request_received': '关系管理',
    'friend_request_sent': '关系管理',
    'friend_request_accepted': '关系管理',
    'friend_request_rejected': '关系管理',
    'friend_request_cancelled': '关系管理',
    'friend_added': '关系管理',

    'migration_session_created': '账户迁移',
    'migration_completed': '账户迁移',
    'system_notification': '系统通知',

    'guardian_added': '守护者管理',
    'threshold_changed': '守护者管理',
    'recovery_initiated': '账户恢复',
    'recovery_supported': '账户恢复',
    'recovery_cancelled': '账户恢复',
    'recovery_cancelled_guardian': '账户恢复',
    'recovery_completed': '账户恢复',
    'recovery_completed_old_owner': '账户恢复',
    'recovery_request_received': '账户恢复',
    'recovery_requested': '账户恢复',

    'encrypted_message': '加密消息',
  }
  return categoryMap[type] || '其他通知'
}

export function getNotificationMainCategory(type: string): NotificationMainCategory {
  const category = getNotificationCategoryLabel(type)
  if (category.includes('用药') || category.includes('ZKP')) return 'medication'
  if (category.includes('关系') || category.includes('邀请')) return 'relationship'
  if (category.includes('恢复') || category.includes('守护者')) return 'security'
  if (category.includes('迁移') || category.includes('系统')) return 'system'
  if (category.includes('消息')) return 'message'
  return 'other'
}

export function normalizeNotification(raw: any): Notification {
  const notification_id = String(raw?.notification_id || raw?.notificationId || raw?.id || '')
  const recipient_address = String(raw?.recipient_address || raw?.userId || raw?.recipient || '')
  const type = String(raw?.type || '')

  const rawPriority = String(raw?.priority || 'normal').toLowerCase()
  let basePriority: NotificationPriority
  if (rawPriority === 'urgent') {
    basePriority = 'high'
  } else if (rawPriority === 'high') {
    basePriority = 'high'
  } else if (rawPriority === 'low') {
    basePriority = 'low'
  } else {
    basePriority = 'normal'
  }

  const priority: NotificationPriority = URGENT_NOTIFICATION_TYPES.has(type) ? 'urgent' : basePriority

  const title = String(raw?.title || type || 'Notification')
  const body = String(raw?.body || raw?.message || '您有一条新通知')
  const data = (raw?.data && typeof raw.data === 'object') ? raw.data : undefined
  const channels = Array.isArray(raw?.channels) ? raw.channels : ['push', 'websocket']
  const status = String(raw?.status || 'pending')
  const created_at = normalizeNotificationTime(raw?.created_at) || new Date().toISOString()

  return {
    notification_id,
    recipient_address,
    type,
    priority,
    title,
    body,
    data,
    channels,
    status,
    created_at,
    sent_at: raw?.sent_at ? (normalizeNotificationTime(raw?.sent_at) || String(raw?.sent_at)) : raw?.sent_at,
    read_at: raw?.read_at ? (normalizeNotificationTime(raw?.read_at) || String(raw?.read_at)) : (raw?.read_at ?? null),
  }
}

function normalizeNotificationTime(input: any): string {
  if (input === undefined || input === null) return ''
  if (typeof input === 'number') {
    const d = new Date(input)
    return isNaN(d.getTime()) ? '' : d.toISOString()
  }

  let s = String(input).trim()
  if (!s) return ''

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    s = s.replace(' ', 'T')
  }

  if (/[zZ]$/.test(s) || /[+\-]\d{2}:?\d{2}$/.test(s)) {
    return s
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    return `${s}Z`
  }

  const parsed = new Date(s)
  if (!isNaN(parsed.getTime())) return parsed.toISOString()
  return s
}

// WebSocket消息类型
interface WSMessage {
  type: 'connected' | 'notification' | 'pong' | 'error'
  data?: any
}

class NotificationService {
  private ws: WebSocket | null = null
  private reconnectTimer: number | null = null
  private heartbeatTimer: number | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // 初始1秒
  private isIntentionallyClosed = false
  private listeners: Map<string, Set<(data: any) => void>> = new Map()

  private readonly FILTERED_NOTIFICATION_TYPES = new Set<string>(['encrypted_message'])

  private readonly USER_INFO_AUTO_SEND_TTL_MS = 24 * 60 * 60 * 1000

  private isFilteredNotificationType(type: string): boolean {
    return this.FILTERED_NOTIFICATION_TYPES.has(String(type || ''))
  }

  private async getFilteredUnreadCount(): Promise<number> {
    try {
      const headers = await authService.getAuthHeader()
      const queryParams = new URLSearchParams()
      queryParams.append('status', 'unread')
      queryParams.append('limit', '200')
      queryParams.append('offset', '0')

      const url = buildNotificationUrl('getNotifications')
      const fullUrl = `${url}?${queryParams}`
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      })
      if (!response.ok) return 0

      const result = await response.json()
      const list: Notification[] = (result.data || []).map((n: any) => normalizeNotification(n))
      return list.filter(n => this.isFilteredNotificationType(n.type) && !n.read_at).length
    } catch (e) {
      return 0
    }
  }

  private getAutoUserInfoSentKey(myAccount: string, peerAddress: string): string {
    return `auto_user_info_sent_${String(myAccount).toLowerCase()}_${String(peerAddress).toLowerCase()}`
  }

  private async canAutoSendUserInfo(myAccount: string, peerAddress: string): Promise<boolean> {
    const key = this.getAutoUserInfoSentKey(myAccount, peerAddress)
    try {
      const { value } = await Preferences.get({ key })
      if (!value) return true
      const lastSentAt = Number(value)
      if (!Number.isFinite(lastSentAt) || lastSentAt <= 0) return true
      return Date.now() - lastSentAt > this.USER_INFO_AUTO_SEND_TTL_MS
    } catch (e) {
      return true
    }
  }

  private async markAutoUserInfoSent(myAccount: string, peerAddress: string): Promise<void> {
    const key = this.getAutoUserInfoSentKey(myAccount, peerAddress)
    try {
      await Preferences.set({ key, value: String(Date.now()) })
    } catch (e) {
    }
  }

  /**
   * 连接WebSocket
   */
  public async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket已连接')
      return
    }

    this.isIntentionallyClosed = false

    try {
      const token = await authService.getToken()
      if (!token) {
        throw new Error('无法获取认证token')
      }

      const wsUrl = `${NOTIFICATION_CONFIG.wsUrl}?token=${token}`
      console.log('连接WebSocket:', wsUrl)

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onerror = this.handleError.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
    } catch (error) {
      console.error('连接WebSocket失败:', error)
      this.scheduleReconnect()
    }
  }

  /**
   * 断开WebSocket
   */
  public disconnect(): void {
    this.isIntentionallyClosed = true
    this.stopHeartbeat()
    this.stopReconnect()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    console.log('WebSocket已断开')
  }

  /**
   * 处理连接打开
   */
  private handleOpen(): void {
    console.log('✅ WebSocket连接成功')
    this.reconnectAttempts = 0
    this.reconnectDelay = 1000
    this.startHeartbeat()

    this.cleanupFilteredUnreadNotifications().catch(() => {
    })
  }

  /**
   * 处理收到消息
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      const message: WSMessage = JSON.parse(event.data)
      console.log('收到WebSocket消息:', message)

      switch (message.type) {
        case 'connected':
          console.log('连接确认:', message.data?.message)
          this.emit('connected', message.data)
          break

        case 'notification':
          console.log('收到新通知:', message.data)
          const normalizedNotification = normalizeNotification(message.data)

          if (this.isFilteredNotificationType(normalizedNotification.type)) {
            try {
              if (
                normalizedNotification.type === 'encrypted_message' &&
                normalizedNotification.data?.dataType === 'user_info_request'
              ) {
                this.persistUserInfoRequestFromNotification(normalizedNotification).catch(() => {
                })
              }
            } catch (e) {
            }
            try {
              if (!normalizedNotification.read_at) {
                this.markAsReadViaWS(normalizedNotification.notification_id)
              }
            } catch (e) {
            }
            return
          }
          // 发送事件给订阅者
          this.emit('notification', normalizedNotification)
          // 显示系统通知栏
          this.showLocalNotification(normalizedNotification)
          // 处理特殊通知：新成员加入时自动发送用户信息
          this.handleSpecialNotification(normalizedNotification)
          break

        case 'pong':
          // console.log('收到心跳响应')
          break

        case 'error':
          console.error('WebSocket错误:', message.data)
          this.emit('error', message.data)
          break

        default:
          console.warn('未知消息类型:', message.type)
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error)
    }
  }

  /**
   * 显示本地通知（系统通知栏）
   */
  private async showLocalNotification(notification: Notification): Promise<void> {
    try {
      await localNotificationService.showNotification(notification)
    } catch (error) {
      console.error('显示本地通知失败:', error)
    }
  }

  /**
   * 处理特殊通知（如新成员加入时自动发送用户信息）
   */
  private async handleSpecialNotification(notification: Notification): Promise<void> {
    try {
      if (notification.type === 'recovery_completed') {
        try {
          const { recoveryResyncService } = await import('./recoveryResyncService')
          await recoveryResyncService.resyncAfterRecovery({ force: true })
        } catch (e) {
        }
      }

      // 处理"新成员加入"通知：邀请者自动发送用户信息给新成员
      if (notification.type === 'relationship_invitation_accepted') {
        console.log('📨 检测到新成员加入通知，准备发送用户信息...')
        
        // 获取新成员地址（viewer_address）
        const viewerAddress = notification.data?.viewer_address
        if (!viewerAddress) {
          console.warn('⚠️ 通知中缺少 viewer_address，无法发送用户信息')
          return
        }
        
        console.log('  新成员地址:', viewerAddress)
        
        // 获取钱包和用户信息
        const { aaService } = await import('./accountAbstraction')
        const wallet = aaService.getEOAWallet()
        
        if (!wallet) {
          console.warn('⚠️ 无法获取钱包，跳过发送用户信息')
          return
        }
        
        const userInfo = await authService.getUserInfo()
        if (!userInfo) {
          console.warn('⚠️ 无法获取用户信息，跳过发送用户信息')
          return
        }

        const myAccount = userInfo?.smart_account ? String(userInfo.smart_account) : ''
        if (myAccount) {
          const canSend = await this.canAutoSendUserInfo(myAccount, viewerAddress)
          if (!canSend) {
            console.log('ℹ️ [邀请者自动信息交换] 已发送过用户信息，跳过自动发送:', viewerAddress)
            return
          }
        }
        
        console.log('  ✅ 钱包和用户信息获取成功')
        console.log('  邀请者地址:', userInfo.smart_account)
        
        // 准备用户信息数据
        const userInfoData = {
          smart_account: userInfo.smart_account,
          username: userInfo.username,
          roles: userInfo.roles,
          eoa_address: userInfo.eoa_address,
        }
        
        // 发送加密的用户信息
        const { secureExchangeService } = await import('./secureExchange')
        const messageId = await secureExchangeService.sendUserInfo(
          wallet,
          viewerAddress,
          userInfoData
        )

        if (myAccount) {
          await this.markAutoUserInfoSent(myAccount, viewerAddress)
        }
        
        console.log('✅ [邀请者自动信息交换] 用户信息已成功发送给新成员！')
        console.log('  消息ID:', messageId)
        console.log('  新成员将收到加密的用户信息通知')
      }
    } catch (error: any) {
      console.error('❌ 处理特殊通知失败:', error)
      console.error('  错误详情:', error.message)
      // 不抛出错误，避免影响通知的正常处理
    }
  }

  /**
   * 处理错误
   */
  private handleError(event: Event): void {
    console.error('WebSocket错误:', event)
    this.emit('error', { message: 'WebSocket连接错误' })
  }

  /**
   * 处理连接关闭
   */
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket连接关闭:', event.code, event.reason)
    this.stopHeartbeat()
    this.emit('close', { code: event.code, reason: event.reason })

    if (!this.isIntentionallyClosed) {
      this.scheduleReconnect()
    }
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()

    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // 每30秒发送一次心跳
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * 计划重连
   */
  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连')
      this.emit('max_reconnect_reached', null)
      return
    }

    this.stopReconnect()

    console.log(`${this.reconnectDelay / 1000}秒后尝试重连... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`)

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempts++
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000) // 指数退避，最大30秒
      this.connect()
    }, this.reconnectDelay)
  }

  /**
   * 停止重连
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * 通过WebSocket标记已读
   */
  public markAsReadViaWS(notificationId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'mark_read',
        notification_id: notificationId
      }))
    } else {
      console.warn('WebSocket未连接，无法标记已读')
    }
  }

  /**
   * 订阅事件
   */
  public on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  /**
   * 取消订阅事件
   */
  public off(event: string, callback: (data: any) => void): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  private async persistUserInfoRequestFromNotification(notification: Notification): Promise<void> {
    try {
      const msg = notification.data || {}
      const messageId = String(msg.messageId || msg.message_id || '')
      const sender = String(msg.senderAddress || msg.sender_address || '')
      if (!messageId || !sender) return

      const key = 'user_info_requests'
      const { value } = await Preferences.get({ key })
      const parsed = value ? JSON.parse(value) : []
      const list: any[] = Array.isArray(parsed) ? parsed : []
      const exists = list.some(r => String(r.message_id) === messageId)
      if (!exists) {
        list.unshift({
          message_id: messageId,
          sender_address: sender,
          created_at: notification.created_at,
          payload: null,
        })
        await Preferences.set({ key, value: JSON.stringify(list) })
      }

      try {
        if (typeof window !== 'undefined' && window?.dispatchEvent) {
          window.dispatchEvent(
            new CustomEvent('user_info_request', {
              detail: {
                message_id: messageId,
                sender_address: sender,
              },
            })
          )
        }
      } catch (e) {
      }
    } catch (e) {
    }
  }

  // ==================== HTTP API ====================

  /**
   * 获取通知列表
   */
  public async getNotifications(options?: {
    status?: 'unread' | 'read'
    limit?: number
    offset?: number
  }): Promise<Notification[]> {
    try {
      const headers = await authService.getAuthHeader()
      const queryParams = new URLSearchParams()

      if (options?.status) queryParams.append('status', options.status)
      if (options?.limit) queryParams.append('limit', String(options.limit))
      if (options?.offset) queryParams.append('offset', String(options.offset))

      const url = buildNotificationUrl('getNotifications')
      const fullUrl = queryParams.toString() ? `${url}?${queryParams}` : url

      console.log('获取通知列表:', fullUrl)

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '获取通知列表失败')
      }

      const result = await response.json()
      return (result.data || [])
        .map((n: any) => normalizeNotification(n))
        .filter((n: Notification) => !this.isFilteredNotificationType(n.type))
    } catch (error: any) {
      console.error('获取通知列表失败:', error)
      throw error
    }
  }

  private async cleanupFilteredUnreadNotifications(): Promise<void> {
    try {
      const headers = await authService.getAuthHeader()
      const queryParams = new URLSearchParams()
      queryParams.append('status', 'unread')
      queryParams.append('limit', '200')
      queryParams.append('offset', '0')

      const url = buildNotificationUrl('getNotifications')
      const fullUrl = `${url}?${queryParams}`

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      })

      if (!response.ok) {
        return
      }

      const result = await response.json()
      const list: Notification[] = (result.data || []).map((n: any) => normalizeNotification(n))
      const targets = list.filter(n => this.isFilteredNotificationType(n.type) && !n.read_at)
      if (targets.length === 0) return

      for (const n of targets) {
        try {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.markAsReadViaWS(n.notification_id)
          } else {
            await this.markAsRead(n.notification_id)
          }
        } catch (e) {
        }
      }
    } catch (e) {
    }
  }

  /**
   * 获取未读数量
   */
  public async getUnreadCount(): Promise<number> {
    try {
      const headers = await authService.getAuthHeader()
      const url = buildNotificationUrl('getUnreadCount')

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '获取未读数量失败')
      }

      const result = await response.json()
      const total = result.data?.count || result.count || 0
      const filtered = await this.getFilteredUnreadCount()
      return Math.max(0, total - filtered)
    } catch (error: any) {
      console.error('获取未读数量失败:', error)
      return 0 // 失败时返回0，不影响用户体验
    }
  }

  /**
   * 标记单条已读
   */
  public async markAsRead(notificationId: string): Promise<void> {
    try {
      const headers = await authService.getAuthHeader()
      const url = buildNotificationUrl('markAsRead', { notificationId })

      console.log('标记已读:', notificationId)

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '标记已读失败')
      }

      console.log('✅ 标记已读成功')
    } catch (error: any) {
      console.error('标记已读失败:', error)
      throw error
    }
  }

  /**
   * 标记全部已读
   */
  public async markAllRead(): Promise<number> {
    try {
      const headers = await authService.getAuthHeader()
      const url = buildNotificationUrl('markAllRead')

      console.log('标记全部已读')

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '标记全部已读失败')
      }

      const result = await response.json()
      const updated = result.data?.updated || 0
      console.log(`✅ 已标记${updated}条通知为已读`)
      return updated
    } catch (error: any) {
      console.error('标记全部已读失败:', error)
      throw error
    }
  }

  /**
   * 删除通知
   */
  public async deleteNotification(notificationId: string): Promise<void> {
    try {
      const headers = await authService.getAuthHeader()
      const url = buildNotificationUrl('deleteNotification', { notificationId })

      console.log('删除通知:', notificationId)

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '删除通知失败')
      }

      console.log('✅ 删除通知成功')
    } catch (error: any) {
      console.error('删除通知失败:', error)
      throw error
    }
  }
}

export const notificationService = new NotificationService()

