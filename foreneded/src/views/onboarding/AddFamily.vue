<template>
  <div class="add-family-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="skip-btn" @click="skipStep">跳过</button>
    </div>
    
    <!-- 主要内容 -->
    <div class="content">
      <div class="welcome-section">
        <div class="welcome-icon">🎉</div>
        <h1 class="welcome-title">注册成功！</h1>
        <p class="welcome-desc">
          {{ userRole === 'ELDERLY' ? '您可以邀请成员加入访问组，让他们按权限查看您的健康数据' : '您可以扫描邀请码加入对方的访问组' }}
        </p>
      </div>
      
      <!-- 老人角色：显示邀请选项 -->
      <div v-if="userRole === 'ELDERLY'" class="invite-section">
        <h2 class="section-title">邀请成员加入访问组</h2>
        
        <div class="invite-options">
          <button class="invite-option-btn" @click="showInviteMembers">
            <div class="option-icon">👥</div>
            <div class="option-text">
              <h3>生成邀请码/二维码</h3>
              <p>选择访问组后邀请对方加入</p>
            </div>
            <div class="option-arrow">→</div>
          </button>
        </div>
      </div>
      
      <!-- 家属角色：显示扫码选项 -->
      <div v-else class="scan-section">
        <h2 class="section-title">加入家人的健康圈</h2>
        
        <button class="scan-btn" @click="goToScanner">
          <div class="scan-icon">📷</div>
          <span>扫描老人的邀请码</span>
        </button>
        
        <div class="manual-option">
          <span class="divider-text">或</span>
          <button class="manual-btn" @click="showManualInput = true">
            手动输入邀请码
          </button>
        </div>
      </div>
      
      <!-- 继续按钮 -->
      <div class="actions">
        <button class="continue-btn" @click="continueToHome">
          进入应用
        </button>
      </div>
    </div>
    
    <!-- 手动输入弹窗 -->
    <div v-if="showManualInput" class="modal-overlay" @click="closeManualInput">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>输入邀请码</h3>
          <button class="close-btn" @click="closeManualInput">×</button>
        </div>
        <div class="modal-content">
          <input
            v-model="inviteCode"
            type="text"
            placeholder="请输入邀请码"
            class="code-input"
          />
          <button class="confirm-btn" @click="handleInviteCode" :disabled="!inviteCode">
            确认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { relationService } from '../../service/relation';
import { uiService } from '@/service/ui';

const router = useRouter();
const route = useRoute();

const userRole = ref(route.params.userRole || 'FAMILY'); // 默认家属
const showManualInput = ref(false);
const inviteCode = ref('');

const skipStep = () => {
  router.push({ name: 'Home' });
};

const continueToHome = () => {
  router.push({ name: 'Home' });
};

const showInviteMembers = () => {
  router.push({ name: 'Invitation' });
};

const goToScanner = () => {
  router.push({ name: 'QRScanner' });
};

const closeManualInput = () => {
  showManualInput.value = false;
  inviteCode.value = '';
};

const handleInviteCode = async () => {
  if (!inviteCode.value) return;
  
  try {
    // 1. 确保用户已登录后端
    const { authService } = await import('@/service/auth');
    const { aaService } = await import('@/service/accountAbstraction');
    
    try {
      await authService.ensureBackendLoginWithBiometric();
      console.log('后端登录状态正常');
    } catch (loginError: any) {
      console.error('自动登录失败:', loginError);
      uiService.toast('请先登录账户', { type: 'warning' });
      router.push({ name: 'Login', query: { redirect: '/add-family' } });
      return;
    }
    
    // 2. 获取EOA钱包（用于自动发送用户信息）
    let wallet = null;
    try {
      wallet = aaService.getEOAWallet();
      if (wallet) {
        console.log('✅ 已获取EOA钱包，地址:', wallet.address);
        console.log('   将自动发送用户信息给邀请者');
      } else {
        console.warn('⚠️ 钱包未初始化，可能用户未登录');
        console.warn('   用户信息将在消息监听服务启动后自动交换');
      }
    } catch (walletError: any) {
      console.warn('⚠️ 获取钱包时出错:', walletError);
      console.warn('   用户信息将在消息监听服务启动后自动交换');
    }
    
    // 3. 接受邀请（如果有wallet，会自动发送用户信息；否则会在消息监听服务中处理）
    await relationService.acceptInvitation(inviteCode.value, wallet);
    
    console.log('✅ 成功加入家庭圈');
    closeManualInput();
    router.push({ name: 'Home', state: { message: '成功加入！' } });
  } catch (error: any) {
    console.error('接受邀请失败:', error);
    uiService.toast(error.message || '邀请码无效', { type: 'error' });
  }
};
</script>

<style scoped>
.add-family-page {
  min-height: 100vh;
  background: #667eea;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 20px;
  display: flex;
  justify-content: flex-end;
}

.skip-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.3s;
}

.skip-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.content {
  flex: 1;
  background: white;
  border-radius: 32px 32px 0 0;
  padding: 40px 24px 30px;
  margin-top: auto;
}

.welcome-section {
  text-align: center;
  margin-bottom: 40px;
}

.welcome-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.welcome-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 15px 0;
}

.welcome-desc {
  font-size: 1rem;
  color: #718096;
  line-height: 1.6;
  margin: 0;
}

.invite-section,
.scan-section {
  margin-bottom: 30px;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 20px 0;
  text-align: center;
}

.invite-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.invite-option-btn {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: all 0.3s;
}

.invite-option-btn:hover {
  border-color: #4299e1;
  background: #f7fafc;
  transform: translateY(-2px);
}

.option-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.option-text {
  flex: 1;
  text-align: left;
}

.option-text h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 5px 0;
}

.option-text p {
  font-size: 0.9rem;
  color: #718096;
  margin: 0;
}

.option-arrow {
  font-size: 1.5rem;
  color: #a0aec0;
}

.scan-btn {
  width: 100%;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.3s;
  margin-bottom: 20px;
}

.scan-btn:hover {
  transform: translateY(-2px);
}

.scan-icon {
  font-size: 2rem;
}

.manual-option {
  text-align: center;
  margin-top: 20px;
}

.divider-text {
  display: block;
  color: #a0aec0;
  margin-bottom: 15px;
}

.manual-btn {
  background: transparent;
  color: #4299e1;
  border: 1px solid #4299e1;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.manual-btn:hover {
  background: #4299e1;
  color: white;
}

.actions {
  margin-top: 30px;
}

.continue-btn {
  width: 100%;
  background: #48bb78;
  color: white;
  border: none;
  border-radius: 16px;
  padding: 18px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.continue-btn:hover {
  background: #38a169;
}

/* 弹窗样式 */
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

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #a0aec0;
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: 50%;
}

.modal-content {
  padding: 20px;
}

.code-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  margin-bottom: 15px;
}

.code-input:focus {
  outline: none;
  border-color: #4299e1;
}

.confirm-btn {
  width: 100%;
  padding: 14px;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
