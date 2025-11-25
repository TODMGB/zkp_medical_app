<template>
  <div class="login-page">
    <!-- 背景渐变 -->
    <div class="background-gradient"></div>
    
    <!-- 内容 -->
    <div class="content">
      <!-- Logo部分 -->
      <div class="logo-section">
        <div class="logo-circle">
          <div class="icon">💊</div>
        </div>
        <h1 class="app-name">健康守护</h1>
        <p class="welcome-back">欢迎回来</p>
      </div>
      
      <!-- 生物识别登录区域 -->
      <div v-if="biometricEnabled" class="biometric-section">
        <div class="biometric-card" @click="handleBiometricLogin">
          <div class="biometric-icon">
            <div class="icon-wrapper">
              <span class="fingerprint-icon">🔐</span>
              <div class="ripple"></div>
            </div>
          </div>
          <p class="biometric-text">使用{{ biometricName }}登录</p>
          <p class="biometric-hint">点击验证</p>
        </div>
        
        <div class="divider">
          <span class="divider-text">或使用密码登录</span>
        </div>
      </div>
      
      <!-- 密码登录表单 -->
      <form 
        v-if="showPasswordForm" 
        @submit.prevent="handlePasswordLogin" 
        class="password-form"
        :class="{ 'show': showPasswordForm }"
      >
        <div class="form-group" :class="{ 'error': errorMessage }">
          <label class="label">
            <span class="label-icon">🔑</span>
            <span class="label-text">密码</span>
          </label>
          <div class="password-wrapper">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              class="input"
              required
            />
            <button 
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
        </div>
        
        <transition name="error">
          <div v-if="errorMessage" class="error-message">
            <span class="error-icon">⚠️</span>
            <span>{{ errorMessage }}</span>
          </div>
        </transition>
        
        <button 
          type="submit" 
          class="login-btn"
          :class="{ 'loading': isLoading }"
          :disabled="isLoading"
        >
          <span v-if="!isLoading">登录</span>
          <span v-else class="btn-loading">
            <span class="spinner"></span>
            登录中...
          </span>
        </button>
      </form>
      
      <!-- 使用密码登录按钮（生物识别可用时显示） -->
      <button 
        v-if="biometricEnabled && !showPasswordForm"
        @click="showPasswordForm = true"
        class="use-password-btn"
      >
        使用密码登录
      </button>
      
      <!-- 底部链接 -->
      <div class="footer-links">
        <p class="footer-text">
          还没有账户？
          <router-link to="/splash" class="link">开始使用</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { aaService } from '../../service/accountAbstraction';
import { biometricService } from '../../service/biometric';
import { authService } from '../../service/auth';
import { ethers } from 'ethers';

const router = useRouter();

const password = ref('');
const showPassword = ref(false);
const errorMessage = ref('');
const isLoading = ref(false);

// 生物识别相关
const biometricEnabled = ref(false);
const biometricName = ref('生物识别');
const showPasswordForm = ref(false);

onMounted(async () => {
  // 检查是否已注册
  const isRegistered = await aaService.isRegistered();
  if (!isRegistered) {
    router.replace('/splash');
    return;
  }
  
  // 检查生物识别
  biometricEnabled.value = await aaService.isBiometricEnabled();
  
  if (biometricEnabled.value) {
    biometricName.value = await biometricService.getBiometricName();
    
    // 自动触发生物识别登录
    setTimeout(() => {
      handleBiometricLogin();
    }, 800);
  } else {
    // 没有生物识别，直接显示密码表单
    showPasswordForm.value = true;
  }
});

// 生物识别登录
const handleBiometricLogin = async () => {
  errorMessage.value = '';
  isLoading.value = true;
  
  try {
    console.log('步骤1: 使用生物识别解密...');
    await aaService.loginWithBiometric();
    
    console.log('步骤2: 尝试调用后端登录API...');
    // 尝试调用后端登录（失败不影响本地登录）
    try {
      await aaService.loginToBackend();
      console.log('✅ 后端登录成功');
    } catch (backendError: any) {
      console.warn('⚠️ 后端登录失败（离线模式）:', backendError.message);
      // 不阻止登录，继续进入系统
    }
    
    console.log('✅ 登录成功（本地）！');
    // 登录成功，跳转到主页
    router.replace('/home');
    
  } catch (error: any) {
    console.error('生物识别登录失败:', error);
    
    // 显示错误并切换到密码登录
    if (error.message.includes('已取消')) {
      errorMessage.value = '验证已取消';
    } else if (error.message.includes('失败')) {
      errorMessage.value = '验证失败，请重试或使用密码登录';
    } else {
      errorMessage.value = error.message || '登录失败';
    }
    
    // 显示密码登录表单
    showPasswordForm.value = true;
  } finally {
    isLoading.value = false;
  }
};

// 密码登录
const handlePasswordLogin = async () => {
  if (!password.value) {
    errorMessage.value = '请输入密码';
    return;
  }
  
  if (password.value.length < 6) {
    errorMessage.value = '密码至少需要6位字符';
    return;
  }
  
  errorMessage.value = '';
  isLoading.value = true;
  
  try {
    console.log('步骤1: 本地解密EOA钱包...');
    // 先使用本地密码解密EOA
    await aaService.login(password.value);
    
    console.log('步骤2: 尝试调用后端登录API...');
    // 尝试调用后端登录（失败不影响本地登录）
    try {
      await aaService.loginToBackend();
      console.log('✅ 后端登录成功');
    } catch (backendError: any) {
      console.warn('⚠️ 后端登录失败（离线模式）:', backendError.message);
      // 不阻止登录，继续进入系统
      // 后续需要后端功能时会提示用户
    }
    
    console.log('✅ 登录成功（本地）！');
    // 登录成功，跳转到主页
    router.replace('/home');
    
  } catch (error: any) {
    console.error('密码登录失败:', error);
    errorMessage.value = error.message || '密码错误，请重试';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: #000;
}

/* 背景渐变 */
.background-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  animation: gradientShift 10s ease infinite;
}

@keyframes gradientShift {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.9;
  }
}

/* 内容容器 */
.content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  padding: 40px 30px;
  animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Logo部分 */
.logo-section {
  text-align: center;
  margin-bottom: 50px;
}

.logo-circle {
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
  animation: float 3s ease-in-out infinite;
}

.icon {
  font-size: 3rem;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.app-name {
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin: 0 0 8px 0;
}

.welcome-back {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1rem;
  margin: 0;
}

/* 生物识别卡片 */
.biometric-section {
  margin-bottom: 30px;
}

.biometric-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.biometric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.biometric-icon {
  margin-bottom: 20px;
}

.icon-wrapper {
  position: relative;
  display: inline-block;
}

.fingerprint-icon {
  font-size: 4rem;
  display: block;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  animation: ripple 2s ease-out infinite;
}

@keyframes ripple {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

.biometric-text {
  color: white;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.biometric-hint {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin: 0;
}

/* 分割线 */
.divider {
  text-align: center;
  margin: 30px 0;
  position: relative;
}

.divider-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0 16px;
  position: relative;
  z-index: 1;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
}

/* 密码表单 */
.password-form {
  opacity: 0;
  transform: translateY(20px);
  animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.password-form.show {
  opacity: 1;
  transform: translateY(0);
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

.form-group {
  margin-bottom: 20px;
}

.label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  font-size: 0.95rem;
}

.label-icon {
  font-size: 1.2rem;
}

.password-wrapper {
  position: relative;
}

.input {
  width: 100%;
  padding: 16px 50px 16px 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: white;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1);
}

.toggle-password {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.3s;
}

.toggle-password:hover {
  opacity: 1;
}

.error-message {
  background: rgba(252, 129, 129, 0.15);
  backdrop-filter: blur(10px);
  color: #feb2b2;
  padding: 14px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  border: 1px solid rgba(252, 129, 129, 0.3);
  margin-bottom: 16px;
}

.error-enter-active, .error-leave-active {
  transition: all 0.3s;
}

.error-enter-from, .error-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.login-btn {
  width: 100%;
  padding: 18px;
  background: rgba(255, 255, 255, 0.95);
  color: #667eea;
  border: none;
  border-radius: 16px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 使用密码登录按钮 */
.use-password-btn {
  width: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(10px);
}

.use-password-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

/* 底部链接 */
.footer-links {
  text-align: center;
  margin-top: 30px;
}

.footer-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.95rem;
  margin: 0;
}

.link {
  color: white;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.3s;
}

.link:hover {
  opacity: 0.8;
  text-decoration: underline;
}
</style>
