<template>
  <div class="migration-container">
    <!-- 标题栏 -->
    <div class="header">
      <button @click="$router.back()" class="back-btn">
        <span class="back-icon">←</span>
      </button>
      <h1>账户迁移</h1>
    </div>

    <!-- 迁移说明 -->
    <div class="info-card">
      <div class="info-icon">🔄</div>
      <h2>安全迁移您的账户</h2>
      <p>将您的账户安全地迁移到新设备，包括钱包信息、用药记录等所有数据。</p>
    </div>

    <!-- 迁移步骤 -->
    <div class="steps-container">
      <div class="step" :class="{ active: currentStep >= 1 }">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3>生物识别验证</h3>
          <p>验证您的身份以确保安全</p>
        </div>
      </div>

      <div class="step" :class="{ active: currentStep >= 2 }">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3>生成迁移二维码</h3>
          <p>创建包含账户信息的加密二维码</p>
        </div>
      </div>

      <div class="step" :class="{ active: currentStep >= 3 }">
        <div class="step-content">
          <h3>新设备扫码</h3>
          <p>在新设备上扫描二维码完成迁移</p>
        </div>
      </div>
    </div>

    <!-- 当前状态显示 -->
    <div class="current-state">
      <!-- 初始状态 -->
      <div v-if="migrationState === 'initial'" class="state-content">
        <div class="warning-card">
          <div class="warning-icon">⚠️</div>
          <h3>重要提醒</h3>
          <ul>
            <li>迁移完成后，本设备上的账户数据将被清理</li>
            <li>请确保新设备已安装健康守护应用</li>
            <li>迁移过程中请保持网络连接</li>
            <li>二维码有效期为5分钟</li>
          </ul>
        </div>
        
        <button @click="startMigration" class="primary-btn" :disabled="isLoading">
          <span v-if="isLoading">验证中...</span>
          <span v-else>开始迁移</span>
        </button>
      </div>

      <!-- 显示二维码 -->
      <div v-else-if="migrationState === 'qr-generated'" class="state-content">
        <div class="qr-card">
          <h3>请在新设备上扫描此二维码</h3>
          
          <div class="qr-code-container">
            <img :src="qrCodeData" alt="迁移二维码" class="qr-code" />
          </div>

          <div class="confirm-code-section">
            <h4>确认码</h4>
            <div class="confirm-code">{{ confirmCode }}</div>
            <p class="code-hint">如果扫码失败，可在新设备上手动输入此确认码</p>
          </div>

          <div class="countdown">
            <div class="countdown-circle">
              <span class="countdown-text">{{ remainingTime }}s</span>
            </div>
            <p>二维码剩余有效时间</p>
          </div>

          <div class="migration-status">
            <div class="status-indicator" :class="{ active: isWaitingConfirmation }"></div>
            <span>等待新设备确认...</span>
          </div>
        </div>

        <div class="action-buttons">
          <button @click="regenerateQR" class="secondary-btn">重新生成</button>
          <button @click="manualConfirm" class="primary-btn">手动确认完成</button>
        </div>
      </div>

      <!-- 迁移完成 -->
      <div v-else-if="migrationState === 'completed'" class="state-content">
        <div class="success-card">
          <div class="success-icon">✅</div>
          <h3>迁移成功！</h3>
          <p>您的账户已成功迁移到新设备</p>
          <p class="cleanup-info">本设备数据将在3秒后自动清理</p>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="migrationState === 'error'" class="state-content">
        <div class="error-card">
          <div class="error-icon">❌</div>
          <h3>迁移失败</h3>
          <p>{{ errorMessage }}</p>
        </div>
        
        <div class="action-buttons">
          <button @click="resetMigration" class="secondary-btn">重新开始</button>
          <button @click="$router.back()" class="primary-btn">返回设置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { migrationService } from '@/service/migration';
import { biometricService } from '@/service/biometric';

const router = useRouter();

// 响应式数据
const migrationState = ref<'initial' | 'qr-generated' | 'completed' | 'error'>('initial');
const currentStep = ref(1);
const isLoading = ref(false);
const qrCodeData = ref('');
const confirmCode = ref('');
const remainingTime = ref(300); // 5分钟
const isWaitingConfirmation = ref(false);
const errorMessage = ref('');

// 定时器
let countdownTimer: NodeJS.Timeout | null = null;

/**
 * 开始迁移流程
 */
async function startMigration() {
  try {
    isLoading.value = true;
    currentStep.value = 1;

    // 1. 生物识别验证
    const biometricResult = await biometricService.authenticate('请验证身份以开始账户迁移');
    
    if (!biometricResult.success) {
      throw new Error('身份验证失败，无法进行账户迁移');
    }

    currentStep.value = 2;

    // 2. 生成迁移二维码
    const result = await migrationService.generateMigrationQR();
    
    qrCodeData.value = result.qrCode;
    confirmCode.value = result.confirmCode;
    migrationState.value = 'qr-generated';
    currentStep.value = 3;
    
    // 3. 开始倒计时
    startCountdown();
    isWaitingConfirmation.value = true;

  } catch (error) {
    console.error('开始迁移失败:', error);
    errorMessage.value = error instanceof Error ? error.message : '未知错误';
    migrationState.value = 'error';
  } finally {
    isLoading.value = false;
  }
}

/**
 * 重新生成二维码
 */
async function regenerateQR() {
  try {
    isLoading.value = true;
    
    const result = await migrationService.generateMigrationQR();
    qrCodeData.value = result.qrCode;
    confirmCode.value = result.confirmCode;
    
    // 重置倒计时
    remainingTime.value = 300;
    startCountdown();
    
  } catch (error) {
    console.error('重新生成二维码失败:', error);
    errorMessage.value = '重新生成失败，请稍后重试';
    migrationState.value = 'error';
  } finally {
    isLoading.value = false;
  }
}

/**
 * 手动确认迁移完成
 */
async function manualConfirm() {
  try {
    await migrationService.manualConfirmMigration();
    migrationState.value = 'completed';
    
    // 3秒后跳转
    setTimeout(() => {
      router.push('/splash');
    }, 3000);
    
  } catch (error) {
    console.error('手动确认失败:', error);
    errorMessage.value = '确认失败，请重试';
    migrationState.value = 'error';
  }
}

/**
 * 重置迁移状态
 */
function resetMigration() {
  migrationState.value = 'initial';
  currentStep.value = 1;
  qrCodeData.value = '';
  confirmCode.value = '';
  remainingTime.value = 300;
  isWaitingConfirmation.value = false;
  errorMessage.value = '';
  
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

/**
 * 开始倒计时
 */
function startCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  
  countdownTimer = setInterval(() => {
    remainingTime.value--;
    
    if (remainingTime.value <= 0) {
      clearInterval(countdownTimer!);
      countdownTimer = null;
      errorMessage.value = '二维码已过期，请重新生成';
      migrationState.value = 'error';
    }
  }, 1000);
}

// 组件挂载
onMounted(() => {
  // 可以在这里检查是否有待处理的迁移
});

// 组件卸载
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
});
</script>

<style scoped>
.migration-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  color: white;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 12px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.back-icon {
  font-size: 20px;
  color: white;
}

.header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.info-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 30px;
  text-align: center;
}

.info-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.info-card h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.info-card p {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
  line-height: 1.5;
}

.steps-container {
  margin-bottom: 30px;
}

.step {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.step.active {
  opacity: 1;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 16px;
}

.step.active .step-number {
  background: white;
  color: #667eea;
}

.step-content h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.step-content p {
  font-size: 14px;
  opacity: 0.8;
  margin: 0;
}

.current-state {
  flex: 1;
}

.state-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.warning-card, .qr-card, .success-card, .error-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
}

.warning-icon, .success-icon, .error-icon {
  font-size: 32px;
  margin-bottom: 16px;
}

.warning-card h3, .success-card h3, .error-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.warning-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.warning-card li {
  padding: 8px 0;
  padding-left: 20px;
  position: relative;
}

.warning-card li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: #ffd700;
}

.qr-code-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.qr-code {
  width: 200px;
  height: 200px;
  border-radius: 16px;
  background: white;
  padding: 16px;
}

.confirm-code-section {
  text-align: center;
  margin: 20px 0;
}

.confirm-code-section h4 {
  font-size: 16px;
  margin: 0 0 12px 0;
}

.confirm-code {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 4px;
  background: rgba(255, 255, 255, 0.2);
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 8px;
}

.code-hint {
  font-size: 14px;
  opacity: 0.8;
  margin: 0;
}

.countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px 0;
}

.countdown-circle {
  width: 60px;
  height: 60px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.countdown-text {
  font-size: 16px;
  font-weight: 600;
}

.migration-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.status-indicator.active {
  background: #00ff88;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.primary-btn, .secondary-btn {
  flex: 1;
  padding: 16px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.primary-btn {
  background: white;
  color: #667eea;
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.3);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  backdrop-filter: blur(10px);
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.success-card, .error-card {
  text-align: center;
}

.cleanup-info {
  font-size: 14px;
  opacity: 0.8;
  margin-top: 12px;
}
</style>
