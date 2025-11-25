/**
 * 消息监听服务
 * 自动监听和处理通过安全交换接收到的消息
 */

import { secureExchangeService } from './secureExchange';
import { memberInfoService, type MemberInfo } from './memberInfo';
import { authService } from './auth';

class MessageListenerService {
  private isListening = false;
  private listenerInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 30000; // 30秒检查一次

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

      // 获取待处理的user_info类型消息
      console.log('📡 [消息监听] 查询 user_info 类型的待处理消息...');
      const messages = await secureExchangeService.getPendingMessages('user_info');
      
      console.log(`📊 [消息监听] 查询结果: 找到 ${messages.length} 条待处理的用户信息消息`);
      
      if (messages.length === 0) {
        console.log('ℹ️ [消息监听] 没有待处理的用户信息消息');
        return;
      }

      // 打印消息详情
      messages.forEach((msg, index) => {
        console.log(`📨 [消息监听] 消息 ${index + 1}/${messages.length}:`);
        console.log(`   消息ID: ${msg.message_id}`);
        console.log(`   发送者: ${msg.sender_address}`);
        console.log(`   数据类型: ${msg.data_type}`);
        console.log(`   创建时间: ${msg.created_at}`);
      });

      // 处理每条消息
      for (const message of messages) {
        try {
          await this.processUserInfoMessage(message, wallet);
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

      // 获取发送者的公钥
      const senderPublicKey = await secureExchangeService.getRecipientPublicKey(
        message.sender_address
      );

      // 解密消息
      const decryptedData = await secureExchangeService.decryptMessage(
        message.encrypted_data,
        wallet,
        senderPublicKey
      );

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

      // 🔄 双向交换：自动回复发送者自己的信息
      try {
        await this.sendMyInfoToSender(wallet, message.sender_address);
      } catch (replyError) {
        console.error('回复发送者信息失败（但不影响接收）:', replyError);
        // 不抛出错误，因为接收已经成功
      }

      // 确认消息已接收
      await secureExchangeService.acknowledgeMessage(
        message.message_id,
        '用户信息已接收并保存，已回复我的信息'
      );
      console.log('✅ 消息已确认');
    } catch (error) {
      console.error('处理用户信息消息失败:', error);
      throw error;
    }
  }

  /**
   * 自动回复发送者自己的信息（实现双向交换）
   */
  private async sendMyInfoToSender(wallet: any, senderAddress: string): Promise<void> {
    try {
      console.log('🔄 准备回复发送者我的信息...');

      // 获取当前用户信息
      const userInfo = await authService.getUserInfo();
      if (!userInfo) {
        console.warn('无法获取当前用户信息，跳过回复');
        return;
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

      console.log('✅ 已自动回复我的信息给发送者，消息ID:', messageId);
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

