// src/utils/scheduler.js
const cron = require('node-cron');
const sessionService = require('../services/session.service');
const messageService = require('../services/message.service');

/**
 * 定时任务调度器
 */
class Scheduler {
  /**
   * 启动所有定时任务
   */
  start() {
    console.log('[Scheduler] 启动定时任务...');

    // 每5分钟清理一次过期会话
    cron.schedule('*/5 * * * *', async () => {
      try {
        await sessionService.cleanupExpiredSessions();
      } catch (error) {
        console.error('[Scheduler] 清理过期会话失败:', error);
      }
    });

    // 每小时清理一次过期消息
    cron.schedule('0 * * * *', async () => {
      try {
        await messageService.cleanupExpiredMessages();
      } catch (error) {
        console.error('[Scheduler] 清理过期消息失败:', error);
      }
    });

    console.log('[Scheduler] 定时任务已启动');
  }
}

module.exports = new Scheduler();

