/**
 * 通知红点管理服务
 * 管理未读消息数量和红点显示
 */

import { ref } from 'vue'
import { notificationService } from './notification'

// 全局未读数量
export const unreadCount = ref(0)

class NotificationBadgeService {
  private updateTimer: number | null = null
  private readonly UPDATE_INTERVAL = 30000 // 30秒更新一次

  /**
   * 启动未读数量轮询
   */
  public startPolling(): void {
    // 立即更新一次
    this.updateUnreadCount()

    // 定时更新
    this.stopPolling() // 先停止之前的
    this.updateTimer = window.setInterval(() => {
      this.updateUnreadCount()
    }, this.UPDATE_INTERVAL)

    console.log('✅ 未读消息轮询已启动')
  }

  /**
   * 停止轮询
   */
  public stopPolling(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
      console.log('未读消息轮询已停止')
    }
  }

  /**
   * 更新未读数量
   */
  public async updateUnreadCount(): Promise<void> {
    try {
      const count = await notificationService.getUnreadCount()
      unreadCount.value = count
      console.log(`📊 未读消息数量: ${count}`)
    } catch (error) {
      console.error('更新未读数量失败:', error)
    }
  }

  /**
   * 标记已读（减少未读数量）
   */
  public decreaseUnreadCount(amount: number = 1): void {
    unreadCount.value = Math.max(0, unreadCount.value - amount)
  }

  /**
   * 增加未读数量
   */
  public increaseUnreadCount(amount: number = 1): void {
    unreadCount.value += amount
  }

  /**
   * 清空未读数量
   */
  public clearUnreadCount(): void {
    unreadCount.value = 0
  }

  /**
   * 监听新通知事件
   */
  public listenForNewNotifications(): void {
    notificationService.on('notification', () => {
      this.increaseUnreadCount()
    })
  }
}

export const notificationBadgeService = new NotificationBadgeService()

