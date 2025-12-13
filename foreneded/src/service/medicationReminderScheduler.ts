import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { localNotificationService } from './localNotification';

export interface MedicationReminderTask {
  id: string;
  time: string;              // HH:mm
  medication: string;
  dosage: string;
  instructions?: string;
  planId: string;
  medicationCode: string;
  status: 'pending' | 'completed';
  isTimeReached: boolean;
  error?: boolean;
}

class MedicationReminderScheduler {
  private readonly REMINDER_TYPE = 'medication_reminder';

  public async scheduleTasks(tasks: MedicationReminderTask[]): Promise<void> {
    if (!this.isReminderEnabled()) {
      await this.clearExistingReminders();
      return;
    }

    let hasPermission = await localNotificationService.checkPermission();
    if (!hasPermission) {
      hasPermission = await localNotificationService.requestPermission();
    }
    if (!hasPermission) {
      console.warn('⚠️ 用户未授予通知权限，跳过本地用药提醒调度');
      return;
    }

    const reminders = this.buildReminderNotifications(tasks);

    await this.clearExistingReminders();

    if (reminders.length === 0) {
      console.log('ℹ️ 没有需要调度的用药提醒（可能全部已过期或已完成）');
      return;
    }

    await LocalNotifications.schedule({
      notifications: reminders,
    });

    console.log(`📅 已调度 ${reminders.length} 条本地用药提醒`);
  }

  private isReminderEnabled(): boolean {
    const setting = localStorage.getItem('medicationReminder');
    return setting === null || setting === 'true';
  }

  private buildReminderNotifications(tasks: MedicationReminderTask[]): LocalNotificationSchema[] {
    const notifications: LocalNotificationSchema[] = [];
    const now = Date.now();

    for (const task of tasks) {
      if (task.error || task.status === 'completed') {
        continue;
      }

      const reminderDate = this.buildReminderDate(task.time);
      if (!reminderDate) {
        continue;
      }

      // 仅调度未来的提醒
      if (reminderDate.getTime() <= now) {
        continue;
      }

      notifications.push({
        id: this.generateNotificationId(task, reminderDate),
        title: '💊 用药提醒',
        body: `${task.medication} · ${task.dosage}${task.instructions ? ` · ${task.instructions}` : ''}`,
        schedule: { at: reminderDate },
        channelId: 'normal',
        smallIcon: 'ic_stat_notifications',
        sound: 'default',
        extra: {
          type: this.REMINDER_TYPE,
          plan_id: task.planId,
          medication_code: task.medicationCode,
          task_id: task.id,
        },
      });
    }

    return notifications;
  }

  private buildReminderDate(time: string): Date | null {
    if (!time) return null;
    const [hourStr, minuteStr] = time.split(':');
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return null;
    }

    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date;
  }

  private async clearExistingReminders(): Promise<void> {
    const pending = await LocalNotifications.getPending();
    if (!pending.notifications.length) return;

    const reminderNotifications = pending.notifications.filter(
      (notification) => notification.extra?.type === this.REMINDER_TYPE,
    );

    if (reminderNotifications.length === 0) return;

    await LocalNotifications.cancel({ notifications: reminderNotifications });
  }

  private generateNotificationId(task: MedicationReminderTask, at: Date): number {
    const seed = `${task.planId}_${task.medicationCode}_${at.getTime()}`;
    return Math.abs(this.hashCode(seed));
  }

  private hashCode(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

export const medicationReminderScheduler = new MedicationReminderScheduler();
