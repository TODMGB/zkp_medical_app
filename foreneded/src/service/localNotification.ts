/**
 * 本地通知服务
 * 使用Capacitor Local Notifications显示系统通知栏
 */

import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'
import type { Notification } from './notification'

class LocalNotificationService {
  private notificationId = 1
  private hasPermission = false

  /**
   * 请求通知权限
   */
  public async requestPermission(): Promise<boolean> {
    try {
      const result = await LocalNotifications.requestPermissions()
      this.hasPermission = result.display === 'granted'
      console.log('通知权限:', this.hasPermission ? '已授予' : '被拒绝')
      return this.hasPermission
    } catch (error) {
      console.error('请求通知权限失败:', error)
      return false
    }
  }

  /**
   * 检查通知权限
   */
  public async checkPermission(): Promise<boolean> {
    try {
      const result = await LocalNotifications.checkPermissions()
      this.hasPermission = result.display === 'granted'
      return this.hasPermission
    } catch (error) {
      console.error('检查通知权限失败:', error)
      return false
    }
  }

  /**
   * 显示通知
   */
  public async showNotification(notification: Notification): Promise<void> {
    try {
      // 检查权限
      if (!this.hasPermission) {
        const granted = await this.requestPermission()
        if (!granted) {
          console.warn('通知权限未授予，无法显示通知')
          return
        }
      }

      // 获取通知图标
      const icon = this.getNotificationIcon(notification.type)
      const channelId = this.getChannelId(notification.priority)

      // 构建通知内容
      const localNotification: LocalNotificationSchema = {
        id: this.notificationId++,
        title: `${icon} ${notification.title}`,
        body: notification.body,
        schedule: undefined, // 立即显示
        sound: 'default', // 使用默认声音
        smallIcon: 'ic_stat_notifications', // Android通知栏小图标
        largeIcon: undefined,
        channelId: channelId,
        extra: {
          notification_id: notification.notification_id,
          type: notification.type,
          data: notification.data
        }
      }

      // 根据优先级设置不同的样式
      if (notification.priority === 'urgent') {
        localNotification.actionTypeId = 'URGENT_ACTION'
        localNotification.ongoing = false
        localNotification.autoCancel = true
      } else if (notification.priority === 'high') {
        localNotification.actionTypeId = 'HIGH_ACTION'
        localNotification.autoCancel = true
      } else {
        localNotification.autoCancel = true
      }

      await LocalNotifications.schedule({
        notifications: [localNotification]
      })

      console.log('✅ 通知已显示:', notification.title)
    } catch (error) {
      console.error('显示通知失败:', error)
    }
  }

  /**
   * 批量显示通知
   */
  public async showNotifications(notifications: Notification[]): Promise<void> {
    if (notifications.length === 0) return

    try {
      if (!this.hasPermission) {
        const granted = await this.requestPermission()
        if (!granted) return
      }

      const localNotifications: LocalNotificationSchema[] = notifications.map(notification => {
        const icon = this.getNotificationIcon(notification.type)
        return {
          id: this.notificationId++,
          title: `${icon} ${notification.title}`,
          body: notification.body,
          schedule: undefined,
          channelId: this.getChannelId(notification.priority),
          extra: {
            notification_id: notification.notification_id,
            type: notification.type,
            data: notification.data
          }
        }
      })

      await LocalNotifications.schedule({
        notifications: localNotifications
      })

      console.log(`✅ 已显示 ${notifications.length} 条通知`)
    } catch (error) {
      console.error('批量显示通知失败:', error)
    }
  }

  /**
   * 取消所有通知
   */
  public async cancelAllNotifications(): Promise<void> {
    try {
      const pending = await LocalNotifications.getPending()
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending)
        console.log('已取消所有待显示的通知')
      }
    } catch (error) {
      console.error('取消通知失败:', error)
    }
  }

  /**
   * 创建通知渠道（Android 8.0+）
   */
  public async createChannels(): Promise<void> {
    try {
      // 先检查是否有权限
      const hasPermission = await this.checkPermission()
      if (!hasPermission) {
        console.warn('没有通知权限，跳过创建渠道')
        return
      }

      // 创建紧急通知渠道
      await LocalNotifications.createChannel({
        id: 'urgent',
        name: '紧急通知',
        description: '紧急重要的通知（账户恢复、安全警告等）',
        importance: 5, // 最高优先级
        sound: 'default',
        vibration: true,
        visibility: 1, // 公开
        lights: true,
        lightColor: '#FF0000'
      })

      // 创建高优先级通知渠道
      await LocalNotifications.createChannel({
        id: 'high',
        name: '重要通知',
        description: '重要但不紧急的通知（关系管理、权限变更等）',
        importance: 4,
        sound: 'default',
        vibration: true,
        visibility: 1,
        lights: true,
        lightColor: '#FFA500'
      })

      // 创建普通通知渠道
      await LocalNotifications.createChannel({
        id: 'normal',
        name: '普通通知',
        description: '一般性通知（用药提醒、系统消息等）',
        importance: 3,
        sound: 'default',
        vibration: false,
        visibility: 1,
        lights: false
      })

      console.log('✅ 通知渠道已创建')
    } catch (error) {
      console.error('创建通知渠道失败:', error)
      // 在Web平台或不支持的设备上，这是预期的错误，不需要抛出
    }
  }

  /**
   * 注册通知点击监听器
   */
  public registerClickListener(callback: (notification: any) => void): void {
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      console.log('通知被点击:', action)
      const notification = action.notification
      callback({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        extra: notification.extra
      })
    })
  }

  /**
   * 移除所有监听器
   */
  public async removeAllListeners(): Promise<void> {
    await LocalNotifications.removeAllListeners()
  }

  /**
   * 获取通知图标
   */
  private getNotificationIcon(type: string): string {
    const typeMap: Record<string, string> = {
      'medication_reminder': '💊',
      'new_medication_plan': '📋',
      'medication_plan_updated': '📝',
      'relationship_invitation_accepted': '✅',
      'relationship_joined_group': '👋',
      'relationship_suspended': '⏸️',
      'relationship_resumed': '▶️',
      'relationship_revoked': '❌',
      'invitation_created': '📬',
      'migration_session_created': '🔐',
      'migration_completed': '✨',
      'recovery_request_received': '🆘',
      'encrypted_message': '💬',
      'system_notification': '🔔'
    }
    return typeMap[type] || '📢'
  }

  /**
   * 根据优先级获取渠道ID
   */
  private getChannelId(priority?: string): string {
    switch (priority) {
      case 'urgent':
        return 'urgent'
      case 'high':
        return 'high'
      case 'normal':
      default:
        return 'normal'
    }
  }
}

export const localNotificationService = new LocalNotificationService()

