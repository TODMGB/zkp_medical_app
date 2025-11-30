<template>
  <div class="qr-scanner-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="page-title">扫描邀请码</h1>
    </div>
    
    <!-- 扫描区域 -->
    <div class="scanner-content">
      <div class="scanner-frame" @click="startScan" v-if="!isScanning">
        <div class="camera-placeholder">
          <div class="camera-icon">📷</div>
          <p class="camera-text">{{ scannerSupported ? '点击开始扫描' : '浏览器不支持扫码' }}</p>
          <div class="scan-line" v-if="scannerSupported"></div>
        </div>
        <div class="corner top-left"></div>
        <div class="corner top-right"></div>
        <div class="corner bottom-left"></div>
        <div class="corner bottom-right"></div>
      </div>
      
      <div v-else class="scanning-indicator">
        <div class="scanning-spinner"></div>
        <p class="scanning-text">扫描中...</p>
      </div>
      
      <p v-if="errorMessage" class="error-hint">{{ errorMessage }}</p>
      <button v-if="permissionDenied" class="settings-btn" @click="openSettings">
        前往设置开启权限
      </button>
      
      <p class="scanner-hint">{{ scannerSupported ? '对准家人或医生的邀请二维码' : '请使用手动输入' }}</p>
      
      <!-- 手动输入选项 -->
      <div class="manual-input-section">
        <button class="manual-input-btn" @click="showManualInput = true">
          手动输入邀请码
        </button>
      </div>
    </div>
    
    <!-- 手动输入弹窗 -->
    <div v-if="showManualInput" class="modal-overlay" @click="closeManualInput">
      <div class="manual-input-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">输入邀请码</h3>
          <button class="close-btn" @click="closeManualInput">×</button>
        </div>
        <div class="modal-content">
          <input
            v-model="manualCode"
            type="text"
            placeholder="请输入邀请码"
            class="code-input"
            maxlength="50"
          />
          <button 
            class="confirm-btn" 
            @click="handleManualCode"
            :disabled="!manualCode || isProcessing"
          >
            <span v-if="!isProcessing">确认</span>
            <span v-else class="spinner-text">
              <span class="spinner"></span>
              处理中...
            </span>
          </button>
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        </div>
      </div>
    </div>
    
    <!-- 成功提示弹窗 -->
    <div v-if="showSuccessModal" class="modal-overlay">
      <div class="success-modal" @click.stop>
        <div class="success-icon">✓</div>
        <h3 class="success-title">加入成功！</h3>
        <p class="success-message">您已成功加入群组</p>
        <button class="success-btn" @click="goToHome">
          前往首页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { relationService } from '../../service/relation';
import { scannerService } from '../../service/scanner';

const router = useRouter();

const showManualInput = ref(false);
const showSuccessModal = ref(false);
const manualCode = ref('');
const isScanning = ref(false);
const isProcessing = ref(false);
const permissionDenied = ref(false);
const scannerSupported = ref(false);
const errorMessage = ref('');

const goBack = () => {
  router.back();
};

const closeManualInput = () => {
  showManualInput.value = false;
  manualCode.value = '';
  errorMessage.value = '';
};

const startScan = async () => {
  if (isScanning.value) return;
  
  isScanning.value = true;
  errorMessage.value = '';
  permissionDenied.value = false;
  
  try {
    console.log('开始扫描...');
    const result = await scannerService.startScan();
    
    if (result) {
      console.log('扫描成功:', result);
      await handleScanSuccess(result);
    } else {
      console.log('扫描取消或无内容');
    }
  } catch (error: any) {
    console.error('扫描失败:', error);
    
    if (error.message && error.message.includes('权限')) {
      permissionDenied.value = true;
      errorMessage.value = '需要相机权限才能扫描二维码';
    } else {
      errorMessage.value = '扫描失败: ' + (error.message || '未知错误');
    }
  } finally {
    isScanning.value = false;
  }
};

// 处理扫描成功
const handleScanSuccess = async (code: string) => {
  manualCode.value = code;
  await handleManualCode();
};

// 处理手动输入或扫描的邀请码
const handleManualCode = async () => {
  if (!manualCode.value) {
    errorMessage.value = '请输入邀请码';
    return;
  }
  
  isProcessing.value = true;
  errorMessage.value = '';
  
  try {
    // 1. 确保用户已登录后端（自动尝试指纹登录）
    console.log('检查后端登录状态...');
    const { authService } = await import('@/service/auth');
    const { aaService } = await import('@/service/accountAbstraction');
    
    try {
      await authService.ensureBackendLoginWithBiometric();
      console.log('后端登录状态正常');
    } catch (loginError: any) {
      console.error('自动登录失败:', loginError);
      errorMessage.value = '请先登录账户';
      
      // 跳转到登录页面
      router.push({
        name: 'Login',
        query: {
          redirect: '/qr-scanner',
          inviteCode: manualCode.value
        }
      });
      return;
    }
    
    // 2. 获取EOA钱包（用于加密发送用户信息）
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
    await relationService.acceptInvitation(manualCode.value, wallet);
    
    console.log('成功加入家庭圈');
    
    // 显示成功提示
    errorMessage.value = '';
    showManualInput.value = false;
    showSuccessModal.value = true;
    
  } catch (error: any) {
    console.error('接受邀请失败:', error);
    errorMessage.value = error.message || '邀请码无效或已过期';
  } finally {
    isProcessing.value = false;
  }
};

// 前往首页
const goToHome = () => {
  showSuccessModal.value = false;
  router.push({
    name: 'Home',
    state: { message: '成功加入群组！' }
  });
};

const openSettings = async () => {
  try {
    await scannerService.openSettings();
  } catch (error) {
    console.error('打开设置失败:', error);
  }
};

onMounted(async () => {
  // 检查是否支持扫码
  scannerSupported.value = await scannerService.isSupported();
  console.log('扫码功能支持:', scannerSupported.value);
  
  if (scannerSupported.value) {
    // 检查权限
    const permission = await scannerService.checkPermission();
    console.log('相机权限状态:', permission);
  }
});

onUnmounted(async () => {
  // 确保清理扫描状态
  if (isScanning.value) {
    await scannerService.stopScan();
  }
});
</script>

<style scoped>
.qr-scanner-page {
  min-height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.page-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.scanner-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.scanner-frame {
  position: relative;
  width: 280px;
  height: 280px;
  margin-bottom: 30px;
}

.camera-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  position: relative;
  overflow: hidden;
}

.camera-icon {
  font-size: 3rem;
  opacity: 0.6;
}

.camera-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
  margin: 0;
}

.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #4299e1;
  animation: scan 2s linear infinite;
}

@keyframes scan {
  0% {
    top: 0;
  }
  100% {
    top: 100%;
  }
}

.corner {
  position: absolute;
  width: 30px;
  height: 30px;
  border: 3px solid #4299e1;
}

.corner.top-left {
  top: -2px;
  left: -2px;
  border-right: none;
  border-bottom: none;
  border-radius: 12px 0 0 0;
}

.corner.top-right {
  top: -2px;
  right: -2px;
  border-left: none;
  border-bottom: none;
  border-radius: 0 12px 0 0;
}

.corner.bottom-left {
  bottom: -2px;
  left: -2px;
  border-right: none;
  border-top: none;
  border-radius: 0 0 0 12px;
}

.corner.bottom-right {
  bottom: -2px;
  right: -2px;
  border-left: none;
  border-top: none;
  border-radius: 0 0 12px 0;
}

.scanning-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 40px;
}

.scanning-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top-color: #4299e1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.scanning-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  margin: 0;
  font-weight: 500;
}

.error-hint {
  color: #fc8181;
  font-size: 0.95rem;
  margin: 15px 0;
  text-align: center;
  padding: 10px 20px;
  background: rgba(252, 129, 129, 0.1);
  border-radius: 8px;
}

.settings-btn {
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  margin: 10px 0;
}

.settings-btn:hover {
  background: #3182ce;
  transform: translateY(-1px);
}

.scanner-hint {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  margin: 0 0 30px 0;
  text-align: center;
}

.manual-input-section {
  margin-top: 20px;
}

.manual-input-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 14px 28px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.manual-input-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.manual-input-modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
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
  padding: 4px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f7fafc;
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
  transition: border-color 0.3s;
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
  transition: background 0.3s;
}

.confirm-btn:hover:not(:disabled) {
  background: #3182ce;
}

.confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  color: #e53e3e;
  font-size: 0.9rem;
  margin: 10px 0 0 0;
  text-align: center;
}

/* 成功提示弹窗 */
.success-modal {
  background: white;
  border-radius: 20px;
  padding: 40px 30px;
  max-width: 320px;
  width: 90%;
  text-align: center;
  animation: slideUp 0.3s ease-out;
}

.success-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: #48bb78;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: white;
  font-weight: bold;
  animation: scaleIn 0.4s ease-out 0.1s both;
}

.success-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 10px 0;
}

.success-message {
  font-size: 1rem;
  color: #718096;
  margin: 0 0 30px 0;
  line-height: 1.5;
}

.success-btn {
  width: 100%;
  padding: 14px;
  background: #48bb78;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.success-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
}

.success-btn:active {
  transform: translateY(0);
}

@keyframes scaleIn {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
