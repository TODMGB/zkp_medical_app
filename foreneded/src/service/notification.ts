/**
 * 通知服务
 * 处理WebSocket连接和通知HTTP API
 */

import { NOTIFICATION_CONFIG, buildNotificationUrl } from '@/config/api.config'
import { authService } from './auth'
import { localNotificationService } from './localNotification'

// 通知接口
export interface Notification {
  notification_id: string
  recipient_address: string
  type: string
  priority: 'urgent' | 'high' | 'normal'
  title: string
  body: string
  data?: Record<string, any>
  channels: string[]
  status: string
  created_at: string
  sent_at?: string
  read_at?: string | null
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
  }

  /**
   * 处理收到消息
   */
  private handleMessage(event: MessageEvent): void {
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
          // 发送事件给订阅者
          this.emit('notification', message.data)
          // 显示系统通知栏
          this.showLocalNotification(message.data)
          // 处理特殊通知：新成员加入时自动发送用户信息
          this.handleSpecialNotification(message.data)
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
      return result.data || []
    } catch (error: any) {
      console.error('获取通知列表失败:', error)
      throw error
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
      return result.data?.count || result.count || 0
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

