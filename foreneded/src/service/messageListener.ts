/**
 * 消息监听服务
 * 自动监听和处理通过安全交换接收到的消息
 */

import { Preferences } from '@capacitor/preferences';
import { secureExchangeService } from './secureExchange';
import { publicKeyCacheService } from './publicKeyCache';
import { memberInfoService, type MemberInfo } from './memberInfo';
import { authService } from './auth';
import { medicationPlanStorageService } from './medicationPlanStorage';
import { accessGroupKeyStorageService } from './accessGroupKeyStorage';
import { sharedMedicationPlanStorageService } from './sharedMedicationPlanStorage';
import { sharedCheckinStatsStorageService } from './sharedCheckinStatsStorage';
import { syncService } from './syncService';

class MessageListenerService {
  private isListening = false;
  private listenerInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 30000; // 30秒检查一次
  private readonly USER_INFO_AUTO_SEND_TTL_MS = 24 * 60 * 60 * 1000;

  private readonly USER_INFO_REQUESTS_KEY = 'user_info_requests';

  private async loadUserInfoRequests(): Promise<any[]> {
    try {
      const { value } = await Preferences.get({ key: this.USER_INFO_REQUESTS_KEY });
      if (!value) return [];
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  private async saveUserInfoRequests(list: any[]): Promise<void> {
    try {
      await Preferences.set({ key: this.USER_INFO_REQUESTS_KEY, value: JSON.stringify(list || []) });
    } catch (e) {
    }
  }

  private getAutoUserInfoSentKey(myAccount: string, peerAddress: string): string {
    return `auto_user_info_sent_${String(myAccount).toLowerCase()}_${String(peerAddress).toLowerCase()}`;
  }

  private async processUserInfoRequestMessage(message: any, wallet: any): Promise<void> {
    try {
      console.log('📨 处理用户信息请求消息:', message.message_id);
      console.log('  发送者地址:', message.sender_address);

      let payload: any = null;
      try {
        const senderPublicKey = await secureExchangeService.getRecipientPublicKey(message.sender_address);
        payload = await secureExchangeService.decryptMessage(message.encrypted_data, wallet, senderPublicKey);
      } catch (e) {
        try {
          console.warn('⚠️ [user_info_request] 首次解密失败，准备清缓存并强制刷新公钥重试:', {
            message_id: message.message_id,
            sender: message.sender_address,
          });

          const oldKey = await publicKeyCacheService.getPublicKey(message.sender_address);
          await publicKeyCacheService.clearPublicKey(message.sender_address);
          const senderPublicKey = await secureExchangeService.getRecipientPublicKey(message.sender_address, { forceRefresh: true });
          try {
            console.log('🔁 [user_info_request] 公钥对比:', {
              oldPrefix: oldKey ? String(oldKey).slice(0, 4) : null,
              oldLength: oldKey ? String(oldKey).length : null,
              newPrefix: String(senderPublicKey).slice(0, 4),
              newLength: String(senderPublicKey).length,
              changed: oldKey ? String(oldKey) !== String(senderPublicKey) : null,
            });
          } catch (e3) {}
          payload = await secureExchangeService.decryptMessage(message.encrypted_data, wallet, senderPublicKey);
        } catch (e2) {
        }
      }

      const current = await this.loadUserInfoRequests();
      const exists = current.some(r => String(r.message_id) === String(message.message_id));
      if (!exists) {
        current.unshift({
          message_id: message.message_id,
          sender_address: message.sender_address,
          created_at: message.created_at,
          payload,
        });
        await this.saveUserInfoRequests(current);
      }

      try {
        if (typeof window !== 'undefined' && window?.dispatchEvent) {
          window.dispatchEvent(
            new CustomEvent('user_info_request', {
              detail: {
                message_id: message.message_id,
                sender_address: message.sender_address,
                payload,
              },
            })
          );
        }
      } catch (e) {
      }

      await secureExchangeService.acknowledgeMessage(message.message_id, '用户信息请求已接收');
      console.log('✅ 用户信息请求消息已确认');
    } catch (error) {
      console.error('处理用户信息请求消息失败:', error);
      throw error;
    }
  }

  private async canAutoSendUserInfo(myAccount: string, peerAddress: string): Promise<boolean> {
    const key = this.getAutoUserInfoSentKey(myAccount, peerAddress);
    try {
      const { value } = await Preferences.get({ key });
      if (!value) return true;
      const lastSentAt = Number(value);
      if (!Number.isFinite(lastSentAt) || lastSentAt <= 0) return true;
      return Date.now() - lastSentAt > this.USER_INFO_AUTO_SEND_TTL_MS;
    } catch (e) {
      return true;
    }
  }

  private async markAutoUserInfoSent(myAccount: string, peerAddress: string): Promise<void> {
    const key = this.getAutoUserInfoSentKey(myAccount, peerAddress);
    try {
      await Preferences.set({ key, value: String(Date.now()) });
    } catch (e) {
    }
  }

  /**
   * 启动消息监听
   */
  public async startListening(wallet: any): Promise<void> {
    if (this.isListening) {
      console.log('⚠️ [消息监听] 服务已在运行中');
      return;
    }

    console.log('🚀 [消息监听] 启动消息监听服务...');
    console.log('  钱包地址:', wallet?.address || 'N/A');
    this.isListening = true;

    // 立即检查一次
    console.log('🔍 [消息监听] 立即执行首次检查...');
    await this.checkAndProcessMessages(wallet);

    // 设置定期检查
    this.listenerInterval = setInterval(() => {
      this.checkAndProcessMessages(wallet).catch(error => {
        console.error('❌ [消息监听] 检查消息时出错:', error);
      });
    }, this.CHECK_INTERVAL);

    console.log(`✅ [消息监听] 服务已启动，每 ${this.CHECK_INTERVAL / 1000} 秒检查一次`);
  }

  /**
   * 停止消息监听
   */
  public stopListening(): void {
    if (this.listenerInterval) {
      clearInterval(this.listenerInterval);
      this.listenerInterval = null;
    }
    this.isListening = false;
    console.log('消息监听服务已停止');
  }

  /**
   * 检查并处理消息
   */
  private async checkAndProcessMessages(wallet: any): Promise<void> {
    try {
      console.log('🔍 [消息监听] 开始检查待处理消息...');
      
      // 确保已登录
      const isLoggedIn = await authService.isLoggedIn();
      if (!isLoggedIn) {
        console.log('⚠️ [消息监听] 用户未登录，跳过消息检查');
        return;
      }
      console.log('✅ [消息监听] 用户已登录');

      // 1. 获取待处理的user_info类型消息
      console.log('📡 [消息监听] 查询 user_info 类型的待处理消息...');
      const userInfoMessages = await secureExchangeService.getPendingMessages('user_info');
      console.log(`📊 [消息监听] 查询结果: 找到 ${userInfoMessages.length} 条待处理的用户信息消息`);

      // 1.1 获取待处理的 user_info_request 类型消息
      console.log('📡 [消息监听] 查询 user_info_request 类型的待处理消息...');
      const userInfoRequestMessages = await secureExchangeService.getPendingMessages('user_info_request');
      console.log(`📊 [消息监听] 查询结果: 找到 ${userInfoRequestMessages.length} 条待处理的用户信息请求消息`);
      
      // 2. 获取待处理的medication_plan类型消息
      console.log('📡 [消息监听] 查询 medication_plan 类型的待处理消息...');
      const medicationPlanMessages = await secureExchangeService.getPendingMessages('medication_plan');
      console.log(`📊 [消息监听] 查询结果: 找到 ${medicationPlanMessages.length} 条待处理的用药计划消息`);

      // 3. 获取待处理的group_key_share类型消息
      console.log('📡 [消息监听] 查询 group_key_share 类型的待处理消息...');
      const groupKeyShareMessages = await secureExchangeService.getPendingMessages('group_key_share');
      console.log(`📊 [消息监听] 查询结果: 找到 ${groupKeyShareMessages.length} 条待处理的访问组密钥消息`);

      // 4. 获取待处理的plan_share类型消息
      console.log('📡 [消息监听] 查询 plan_share 类型的待处理消息...');
      const planShareMessages = await secureExchangeService.getPendingMessages('plan_share');
      console.log(`📊 [消息监听] 查询结果: 找到 ${planShareMessages.length} 条待处理的共享用药计划消息`);

      // 5. 获取待处理的checkin_stats_share类型消息
      console.log('📡 [消息监听] 查询 checkin_stats_share 类型的待处理消息...');
      const checkinStatsShareMessages = await secureExchangeService.getPendingMessages('checkin_stats_share');
      console.log(`📊 [消息监听] 查询结果: 找到 ${checkinStatsShareMessages.length} 条待处理的打卡统计共享消息`);

      // 6. 获取待处理的sync_request类型消息
      console.log('📡 [消息监听] 查询 sync_request 类型的待处理消息...');
      const syncRequestMessages = await secureExchangeService.getPendingMessages('sync_request');
      console.log(`📊 [消息监听] 查询结果: 找到 ${syncRequestMessages.length} 条待处理的同步请求消息`);

      // 7. 获取待处理的sync_done类型消息
      console.log('📡 [消息监听] 查询 sync_done 类型的待处理消息...');
      const syncDoneMessages = await secureExchangeService.getPendingMessages('sync_done');
      console.log(`📊 [消息监听] 查询结果: 找到 ${syncDoneMessages.length} 条待处理的同步完成消息`);

      // 9. 获取待处理的plan_resend_request类型消息
      console.log('📡 [消息监听] 查询 plan_resend_request 类型的待处理消息...');
      const planResendRequestMessages = await secureExchangeService.getPendingMessages('plan_resend_request');
      console.log(`📊 [消息监听] 查询结果: 找到 ${planResendRequestMessages.length} 条待处理的补发计划请求消息`);

      // 8. 合并所有消息
      const allMessages = [
        ...userInfoRequestMessages,
        ...userInfoMessages,
        ...medicationPlanMessages,
        ...groupKeyShareMessages,
        ...planShareMessages,
        ...checkinStatsShareMessages,
        ...syncRequestMessages,
        ...syncDoneMessages,
        ...planResendRequestMessages,
      ];
      
      if (allMessages.length === 0) {
        console.log('ℹ️ [消息监听] 没有待处理的消息');
        return;
      }

      // 打印消息详情
      allMessages.forEach((msg, index) => {
        console.log(`📨 [消息监听] 消息 ${index + 1}/${allMessages.length}:`);
        console.log(`   消息ID: ${msg.message_id}`);
        console.log(`   发送者: ${msg.sender_address}`);
        console.log(`   数据类型: ${msg.data_type}`);
        console.log(`   创建时间: ${msg.created_at}`);
      });

      // 处理每条消息
      for (const message of allMessages) {
        try {
          if (message.data_type === 'user_info_request') {
            await this.processUserInfoRequestMessage(message, wallet);
          } else if (message.data_type === 'user_info') {
            await this.processUserInfoMessage(message, wallet);
          } else if (message.data_type === 'medication_plan') {
            await this.processMedicationPlanMessage(message, wallet);
          } else if (message.data_type === 'group_key_share') {
            await this.processGroupKeyShareMessage(message, wallet);
          } else if (message.data_type === 'plan_share') {
            await this.processPlanShareMessage(message, wallet);
          } else if (message.data_type === 'checkin_stats_share') {
            await this.processCheckinStatsShareMessage(message, wallet);
          } else if (message.data_type === 'sync_request') {
            await this.processSyncRequestMessage(message, wallet);
          } else if (message.data_type === 'sync_done') {
            await this.processSyncDoneMessage(message, wallet);
          } else if (message.data_type === 'plan_resend_request') {
            await this.processPlanResendRequestMessage(message, wallet);
          } else {
            console.warn(`⚠️ [消息监听] 未知的消息类型: ${message.data_type}`);
          }
        } catch (error) {
          console.error(`❌ [消息监听] 处理消息失败 (${message.message_id}):`, error);
        }
      }
    } catch (error) {
      console.error('❌ [消息监听] 检查消息失败:', error);
      console.error('错误详情:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 处理用户信息消息
   */
  private async processUserInfoMessage(message: any, wallet: any): Promise<void> {
    try {
      console.log('📨 处理用户信息消息:', message.message_id);
      console.log('  发送者地址:', message.sender_address);

      let decryptedData: any;
      try {
        const senderPublicKey = await secureExchangeService.getRecipientPublicKey(message.sender_address);
        decryptedData = await secureExchangeService.decryptMessage(message.encrypted_data, wallet, senderPublicKey);
      } catch (e) {
        console.warn('⚠️ [user_info] 首次解密失败，准备清缓存并强制刷新公钥重试:', {
          message_id: message.message_id,
          sender: message.sender_address,
        });

        const oldKey = await publicKeyCacheService.getPublicKey(message.sender_address);
        await publicKeyCacheService.clearPublicKey(message.sender_address);
        const senderPublicKey = await secureExchangeService.getRecipientPublicKey(message.sender_address, { forceRefresh: true });
        try {
          console.log('🔁 [user_info] 公钥对比:', {
            oldPrefix: oldKey ? String(oldKey).slice(0, 4) : null,
            oldLength: oldKey ? String(oldKey).length : null,
            newPrefix: String(senderPublicKey).slice(0, 4),
            newLength: String(senderPublicKey).length,
            changed: oldKey ? String(oldKey) !== String(senderPublicKey) : null,
          });
        } catch (e3) {}
        decryptedData = await secureExchangeService.decryptMessage(message.encrypted_data, wallet, senderPublicKey);
      }

      // 打印完整的解密数据
      console.log('✅ 解密成功！');
      console.log('📋 解密后的完整数据:');
      console.log(JSON.stringify(decryptedData, null, 2));
      
      console.log('📝 用户信息摘要:');
      console.log('  姓名:', decryptedData.username);
      console.log('  Smart Account:', decryptedData.smart_account);
      console.log('  EOA:', decryptedData.eoa_address);
      console.log('  角色:', decryptedData.roles);
      if (decryptedData.phone_number) {
        console.log('  电话:', decryptedData.phone_number);
      }
      if (decryptedData.email) {
        console.log('  邮箱:', decryptedData.email);
      }

      // 保存成员信息
      const memberInfo: MemberInfo = {
        smart_account: decryptedData.smart_account,
        username: decryptedData.username,
        roles: decryptedData.roles,
        eoa_address: decryptedData.eoa_address,
        phone_number: decryptedData.phone_number,
        email: decryptedData.email,
        lastUpdated: new Date().toISOString(),
      };

      await memberInfoService.saveMemberInfo(memberInfo);
      console.log('✅ 成员信息已保存:');
      console.log('  存储 Key:', memberInfo.smart_account);
      console.log('  姓名:', memberInfo.username);

      try {
        const { recoveryResyncService } = await import('./recoveryResyncService')
        await recoveryResyncService.resyncAfterRecovery({ skipMessageCheck: true })
      } catch (e) {
      }

      // 🔄 双向交换：自动回复发送者自己的信息
      let replied = false;
      try {
        replied = await this.sendMyInfoToSender(wallet, message.sender_address);
      } catch (replyError) {
        console.error('回复发送者信息失败（但不影响接收）:', replyError);
        // 不抛出错误，因为接收已经成功
      }

      // 确认消息已接收
      await secureExchangeService.acknowledgeMessage(
        message.message_id,
        replied ? '用户信息已接收并保存，已回复我的信息' : '用户信息已接收并保存'
      );
      console.log('✅ 消息已确认');
    } catch (error) {
      console.error('处理用户信息消息失败:', error);
      throw error;
    }
  }

  private async processPlanResendRequestMessage(message: any, wallet: any): Promise<void> {
    try {
      console.log('📨 处理补发用药计划请求消息:', message.message_id);
      console.log('  发送者地址:', message.sender_address);

      const senderPublicKey = await secureExchangeService.getRecipientPublicKey(message.sender_address);
      const decryptedData = await secureExchangeService.decryptMessage(message.encrypted_data, wallet, senderPublicKey);

      console.log('✅ 补发请求解密成功');
      console.log('📋 请求数据:', decryptedData);

      const currentUser = await authService.getUserInfo();
      const currentRoles = Array.isArray(currentUser?.roles) ? currentUser!.roles : [];
      const isDoctor = currentRoles.includes('doctor');

      const patientAddressRaw = decryptedData?.patient_address;
      const patientAddress = patientAddressRaw ? String(patientAddressRaw).toLowerCase() : '';

      if (!patientAddress) {
        throw new Error('补发请求消息中缺少 patient_address');
      }

      if (isDoctor && currentUser?.smart_account) {
        console.log('👨‍⚕️ 当前用户为医生，开始补发用药计划...');
        console.log('  医生地址:', currentUser.smart_account);
        console.log('  目标患者:', patientAddress);

        const { medicationService } = await import('./medication');
        const doctorPlansResult = await medicationService.getDoctorPlans(
          currentUser.smart_account,
          1,
          1000
        );
        const allPlans = Array.isArray(doctorPlansResult?.plans) ? doctorPlansResult.plans : [];
        const patientPlans = allPlans.filter(p => String(p.patient_address || '').toLowerCase() === patientAddress);

        console.log(`📋 找到需要补发的计划数量: ${patientPlans.length}`);

        let resentCount = 0;
        for (const plan of patientPlans) {
          if (!plan?.encrypted_plan_data) {
            console.warn('⚠️ 跳过缺少 encrypted_plan_data 的计划:', plan?.plan_id);
            continue;
          }

          const doctorPublicKey = wallet.signingKey.publicKey;
          const notificationData = {
            plan_id: plan.plan_id,
            plan_name: '【新用药计划】',
            doctor_address: currentUser.smart_account,
            doctor_eoa: wallet.address,
            doctor_public_key: doctorPublicKey,
            patient_address: patientAddress,
            start_date: plan.start_date,
            end_date: plan.end_date,
            plan_hash: plan.plan_hash,
            encryption_key_hash: plan.encryption_key_hash,
            message: '补发您的用药计划，请查看。',
            encrypted_plan_data: plan.encrypted_plan_data,
          };

          await secureExchangeService.sendEncryptedData(
            wallet,
            patientAddress,
            notificationData,
            'medication_plan',
            notificationData
          );
          resentCount++;
        }

        console.log('✅ 补发完成，补发数量:', resentCount);
      } else {
        console.log('ℹ️ 当前用户非医生或缺少 smart_account，跳过补发，仅确认消息');
      }

      try {
        if (typeof window !== 'undefined' && window?.dispatchEvent) {
          window.dispatchEvent(
            new CustomEvent('plan_resend_request', {
              detail: {
                message_id: message.message_id,
                sender_address: message.sender_address,
                payload: decryptedData,
              },
            })
          )
        }
      } catch (e) {
      }

      await secureExchangeService.acknowledgeMessage(message.message_id, '补发用药计划请求已接收');
      console.log('✅ 补发请求消息已确认');
    } catch (error) {
      console.error('处理补发用药计划请求消息失败:', error);
      throw error;
    }
  }

  /**
   * 处理用药计划消息
   */
  private async processMedicationPlanMessage(message: any, wallet: any): Promise<void> {
    try {
      console.log('📨 处理用药计划消息:', message.message_id);
      console.log('  发送者地址:', message.sender_address);

      // 获取发送者的公钥
      const senderPublicKey = await secureExchangeService.getRecipientPublicKey(
        message.sender_address
      );

      // 解密消息（第一层：secure-exchange 加密）
      const decryptedData = await secureExchangeService.decryptMessage(
        message.encrypted_data,
        wallet,
        senderPublicKey
      );

      // 打印完整的解密数据
      console.log('✅ 用药计划消息解密成功！');
      console.log('📋 解密后的消息数据:');
      console.log(JSON.stringify(decryptedData, null, 2));

      const planId = decryptedData?.plan_id ? String(decryptedData.plan_id) : '';
      if (!planId) {
        throw new Error('消息中缺少 plan_id 字段');
      }

      const statusRaw = decryptedData?.status ? String(decryptedData.status) : '';
      const status = (statusRaw === 'active' || statusRaw === 'completed' || statusRaw === 'cancelled')
        ? statusRaw
        : 'active';

      console.log('📝 用药计划摘要:');
      console.log('  计划ID:', planId);
      console.log('  计划名称:', decryptedData.plan_name);
      console.log('  医生地址:', decryptedData.doctor_address);
      console.log('  状态:', status);
      if (decryptedData?.encrypted_plan_data) {
        console.log('  加密数据长度:', decryptedData.encrypted_plan_data.length, '字符');
      }

      const currentUser = await authService.getUserInfo();
      if (!currentUser) {
        throw new Error('无法获取当前用户信息');
      }
      const patientSmartAccount = decryptedData.patient_address || currentUser.smart_account || wallet.address;

      const createdAt = decryptedData?.created_at
        ? String(decryptedData.created_at)
        : (message?.created_at ? String(message.created_at) : new Date().toISOString());
      const updatedAt = decryptedData?.updated_at ? String(decryptedData.updated_at) : createdAt;

      if (!decryptedData?.encrypted_plan_data) {
        const existing = await medicationPlanStorageService.getPlan(planId);
        if (!existing) {
          throw new Error('本地不存在该计划，且消息不包含 encrypted_plan_data，无法更新');
        }

        const updatedPlan = {
          ...existing,
          status: status as any,
          start_date: decryptedData?.start_date ? String(decryptedData.start_date) : existing.start_date,
          end_date: decryptedData?.end_date !== undefined ? decryptedData.end_date : existing.end_date,
          updated_at: updatedAt,
        };

        await medicationPlanStorageService.savePlan(updatedPlan, message.message_id);
        console.log('✅ 用药计划状态已更新到本地:', { planId, status });

        await secureExchangeService.acknowledgeMessage(
          message.message_id,
          '用药计划状态已接收并保存'
        );
        console.log('✅ 用药计划消息已确认');
        return;
      }

      // 构建用药计划对象（包含加密的计划数据）
      const medicationPlan = {
        plan_id: planId,
        doctor_address: decryptedData.doctor_address,
        doctor_eoa: decryptedData.doctor_eoa,
        doctor_public_key: decryptedData.doctor_public_key,
        patient_address: patientSmartAccount,
        patient_eoa: wallet.address,
        start_date: decryptedData.start_date || new Date().toISOString().split('T')[0],
        end_date: decryptedData.end_date || null,
        encrypted_plan_data: decryptedData.encrypted_plan_data,  // 保存加密的计划数据
        status: status as any,
        created_at: createdAt,
        updated_at: updatedAt,
        plan_hash: decryptedData.plan_hash,
        encryption_key_hash: decryptedData.encryption_key_hash,
      };

      // 保存用药计划到本地
      await medicationPlanStorageService.savePlan(medicationPlan, message.message_id);
      console.log('✅ 用药计划已保存到本地');

      // 确认消息已接收
      await secureExchangeService.acknowledgeMessage(
        message.message_id,
        '用药计划已接收并保存'
      );
      console.log('✅ 用药计划消息已确认');
    } catch (error) {
      console.error('处理用药计划消息失败:', error);
      throw error;
    }
  }

  private async processGroupKeyShareMessage(message: any, wallet: any): Promise<void> {
    try {
      console.log('📨 处理访问组密钥消息:', message.message_id);
      console.log('  发送者地址:', message.sender_address);

      const senderPublicKey = await secureExchangeService.getRecipientPublicKey(message.sender_address);

      const decryptedData = await secureExchangeService.decryptMessage(
        message.encrypted_data,
        wallet,
        senderPublicKey
      );

      if (!decryptedData?.group_id || !decryptedData?.key_version || !decryptedData?.group_key) {
        throw new Error('消息中缺少 group_id/key_version/group_key 字段');
      }

      const groupId = String(decryptedData.group_id);
      const keyVersion = Number(decryptedData.key_version);
      const groupKey = String(decryptedData.group_key);

      if (!Number.isFinite(keyVersion) || keyVersion <= 0) {
        throw new Error('key_version 非法');
      }

      await accessGroupKeyStorageService.setGroupKey(groupId, keyVersion, groupKey);
      console.log('✅ 访问组密钥已保存到本地:', { groupId, keyVersion });

      await secureExchangeService.acknowledgeMessage(message.message_id, '访问组密钥已接收并保存');
      console.log('✅ 访问组密钥消息已确认');
    } catch (error) {
      console.error('处理访问组密钥消息失败:', error);
      throw error;
    }
  }

  private async processPlanShareMessage(message: any, wallet: any): Promise<void> {
    try {
      console.log('📨 处理共享用药计划消息:', message.message_id);
      console.log('  发送者地址:', message.sender_address);

      const senderPublicKey = await secureExchangeService.getRecipientPublicKey(message.sender_address);

      const decryptedData = await secureExchangeService.decryptMessage(
        message.encrypted_data,
        wallet,
        senderPublicKey
      );

      if (!decryptedData?.group_id || !decryptedData?.plan_id) {
        throw new Error('消息中缺少 group_id/plan_id 字段');
      }

      const sharedPlan = {
        group_id: String(decryptedData.group_id),
        plan_id: String(decryptedData.plan_id),
        key_version: decryptedData.key_version != null ? Number(decryptedData.key_version) : undefined,
        wrapped_plan_key: decryptedData.wrapped_plan_key ? String(decryptedData.wrapped_plan_key) : undefined,
        encrypted_plan_data: decryptedData.encrypted_plan_data ? String(decryptedData.encrypted_plan_data) : undefined,
        plan_summary: decryptedData.plan_summary,
        owner_address: decryptedData.owner_address ? String(decryptedData.owner_address) : undefined,
        sender_address: message.sender_address,
        status: decryptedData.status ? String(decryptedData.status) : 'active',
        created_at: decryptedData.created_at ? String(decryptedData.created_at) : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await sharedMedicationPlanStorageService.saveSharedPlan(sharedPlan, message.message_id);
      console.log('✅ 共享用药计划已保存到本地:', { groupId: sharedPlan.group_id, planId: sharedPlan.plan_id });

      await secureExchangeService.acknowledgeMessage(message.message_id, '共享用药计划已接收并保存');
      console.log('✅ 共享用药计划消息已确认');
    } catch (error) {
      console.error('处理共享用药计划消息失败:', error);
      throw error;
    }
  }

  private async processCheckinStatsShareMessage(message: any, wallet: any): Promise<void> {
    try {
      console.log('📨 处理打卡统计共享消息:', message.message_id);
      console.log('  发送者地址:', message.sender_address);

      const senderPublicKey = await secureExchangeService.getRecipientPublicKey(message.sender_address);
      const decryptedData = await secureExchangeService.decryptMessage(message.encrypted_data, wallet, senderPublicKey);

      if (!decryptedData?.group_id || !decryptedData?.week_key || !decryptedData?.stats) {
        throw new Error('消息中缺少 group_id/week_key/stats 字段');
      }

      await sharedCheckinStatsStorageService.saveSharedStats(
        {
          group_id: String(decryptedData.group_id),
          week_key: String(decryptedData.week_key),
          stats: decryptedData.stats,
          start_date: decryptedData.start_date,
          end_date: decryptedData.end_date,
          sender_address: message.sender_address,
          created_at: decryptedData.created_at ? String(decryptedData.created_at) : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        message.message_id
      );

      console.log('✅ 打卡统计已保存到本地:', { groupId: decryptedData.group_id, weekKey: decryptedData.week_key });
      await secureExchangeService.acknowledgeMessage(message.message_id, '打卡统计已接收并保存');
      console.log('✅ 打卡统计共享消息已确认');
    } catch (error) {
      console.error('处理打卡统计共享消息失败:', error);
      throw error;
    }
  }

  private async processSyncRequestMessage(message: any, wallet: any): Promise<void> {
    try {
      console.log('📨 处理同步请求消息:', message.message_id);
      console.log('  发送者地址:', message.sender_address);

      const senderPublicKey = await secureExchangeService.getRecipientPublicKey(message.sender_address);
      const decryptedData = await secureExchangeService.decryptMessage(message.encrypted_data, wallet, senderPublicKey);

      if (!decryptedData?.group_id) {
        throw new Error('消息中缺少 group_id 字段');
      }

      await syncService.handleSyncRequest(wallet, message.sender_address, decryptedData);
      await secureExchangeService.acknowledgeMessage(message.message_id, '同步请求已处理');
      console.log('✅ 同步请求消息已确认');
    } catch (error) {
      console.error('处理同步请求消息失败:', error);
      throw error;
    }
  }

  private async processSyncDoneMessage(message: any, wallet: any): Promise<void> {
    try {
      console.log('📨 处理同步完成消息:', message.message_id);
      console.log('  发送者地址:', message.sender_address);

      const senderPublicKey = await secureExchangeService.getRecipientPublicKey(message.sender_address);
      const decryptedData = await secureExchangeService.decryptMessage(message.encrypted_data, wallet, senderPublicKey);

      console.log('✅ 同步完成摘要:', decryptedData);

      try {
        if (typeof window !== 'undefined' && window?.dispatchEvent) {
          window.dispatchEvent(
            new CustomEvent('sync_done', {
              detail: {
                message_id: message.message_id,
                sender_address: message.sender_address,
                payload: decryptedData,
              },
            })
          );
        }
      } catch (e) {
        console.warn('⚠️ sync_done 事件广播失败（不影响消息处理）:', e);
      }

      await secureExchangeService.acknowledgeMessage(message.message_id, '同步完成消息已接收');
      console.log('✅ 同步完成消息已确认');
    } catch (error) {
      console.error('处理同步完成消息失败:', error);
      throw error;
    }
  }

  /**
   * 自动回复发送者自己的信息（实现双向交换）
   */
  private async sendMyInfoToSender(wallet: any, senderAddress: string): Promise<boolean> {
    try {
      console.log('🔄 准备回复发送者我的信息...');

      // 获取当前用户信息
      const userInfo = await authService.getUserInfo();
      if (!userInfo) {
        console.warn('无法获取当前用户信息，跳过回复');
        return false;
      }

      const myAccount = userInfo?.smart_account ? String(userInfo.smart_account) : '';
      if (myAccount) {
        const canSend = await this.canAutoSendUserInfo(myAccount, senderAddress);
        if (!canSend) {
          console.log('ℹ️ 已发送过用户信息，跳过自动回复:', senderAddress);
          return false;
        }
      }

      // 检查是否已经发送过（通过查询已发送的消息）
      // 这里我们简化处理：每次收到都尝试发送，后端会去重
      const userInfoData = {
        smart_account: userInfo.smart_account,
        username: userInfo.username,
        roles: userInfo.roles,
        eoa_address: userInfo.eoa_address,
      };

      const messageId = await secureExchangeService.sendUserInfo(
        wallet,
        senderAddress,
        userInfoData
      );

      if (myAccount) {
        await this.markAutoUserInfoSent(myAccount, senderAddress);
      }
      console.log('✅ 已自动回复我的信息给发送者，消息ID:', messageId);
      return true;
    } catch (error) {
      console.error('回复发送者信息失败:', error);
      throw error;
    }
  }

  /**
   * 手动触发一次消息检查
   */
  public async checkMessagesNow(wallet: any): Promise<void> {
    console.log('手动触发消息检查...');
    await this.checkAndProcessMessages(wallet);
  }

  /**
   * 获取监听状态
   */
  public isActive(): boolean {
    return this.isListening;
  }
}

export const messageListenerService = new MessageListenerService();

