<template>
  <div class="set-pin-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="arrow" />
      </button>
      <div class="progress-dots">
        <span class="dot completed"></span>
        <span class="dot active"></span>
        <span class="dot"></span>
      </div>
    </div>
    
    <!-- 主要内容 -->
    <div class="content">
      <div class="title-section">
        <h1 class="title">设置密码</h1>
        <p class="subtitle">欢迎，{{ username }} 👋</p>
        <p class="user-role">{{ roleText }}</p>
        <p class="hint">请设置一个安全的密码来保护您的账户</p>
      </div>
      
      <form @submit.prevent="handleSubmit" class="form">
        <!-- 密码输入 -->
        <div class="form-group" :class="{ 'focused': focusedField === 'password', 'error': errors.password }">
          <label class="label">
            <Key class="label-icon" />
            <span class="label-text">设置密码</span>
          </label>
          <div class="password-wrapper">
            <input
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码（至少6位）"
              @focus="focusedField = 'password'"
              @blur="focusedField = ''"
              class="input"
            />
            <button 
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
            >
              <Eye v-if="showPassword" class="eye-icon" />
              <EyeOff v-else class="eye-icon" />
            </button>
          </div>
          <transition name="error">
            <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
          </transition>
        </div>
        
        <!-- 确认密码 -->
        <div class="form-group" :class="{ 'focused': focusedField === 'confirmPassword', 'error': errors.confirmPassword }">
          <label class="label">
            <Lock class="label-icon" />
            <span class="label-text">确认密码</span>
          </label>
          <div class="password-wrapper">
            <input
              v-model="formData.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              placeholder="请再次输入密码"
              @focus="focusedField = 'confirmPassword'"
              @blur="focusedField = ''"
              class="input"
            />
            <button 
              type="button"
              class="toggle-password"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <Eye v-if="showConfirmPassword" class="eye-icon" />
              <EyeOff v-else class="eye-icon" />
            </button>
          </div>
          <transition name="error">
            <span v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</span>
          </transition>
        </div>
        
        <!-- 生物识别选项 -->
        <div v-if="biometricAvailable" class="biometric-option">
          <div class="option-card" @click="enableBiometric = !enableBiometric">
            <div class="option-left">
              <div class="option-icon-wrapper">
                <Fingerprint class="option-icon" />
              </div>
              <div class="option-text">
                <div class="option-title">启用{{ biometricName }}</div>
                <div class="option-subtitle">快速安全登录</div>
              </div>
            </div>
            <div class="option-right">
              <div class="toggle-switch" :class="{ 'active': enableBiometric }">
                <div class="toggle-knob"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 错误提示 -->
        <transition name="slide-fade">
          <div v-if="globalError" class="global-error">
            <AlertTriangle class="error-icon" />
            <span>{{ globalError }}</span>
          </div>
        </transition>
        
        <!-- 提交按钮 -->
        <button 
          type="submit" 
          class="submit-btn"
          :class="{ 'loading': isLoading }"
          :disabled="isLoading"
        >
          <span v-if="!isLoading" class="btn-text">
            完成注册
            <Check class="btn-arrow" />
          </span>
          <span v-else class="btn-loading">
            <Loader2 class="spinner" />
            注册中...
          </span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { aaService } from '../../service/accountAbstraction';
import { biometricService } from '../../service/biometric';
import { authService } from '../../service/auth';
import { 
  ArrowLeft, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  Fingerprint, 
  AlertTriangle, 
  Check, 
  Loader2 
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

const username = ref(route.params.username as string || '用户');
const userId = ref(route.params.userId as string);
const userRole = ref(route.params.userRole as string || 'elderly');

// 从路由state获取用户信息
const userInfo = ref<any>(null);

// 角色显示文本
const roleText = userRole.value === 'elderly' ? '老人' : '医生';

const formData = reactive({
  password: '',
  confirmPassword: ''
});

const errors = reactive({
  password: '',
  confirmPassword: ''
});

const focusedField = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const globalError = ref('');
const isLoading = ref(false);

// 生物识别相关
const biometricAvailable = ref(false);
const biometricName = ref('生物识别');
const enableBiometric = ref(false);

onMounted(async () => {
  // 获取从SignUp传递的用户信息
  const state = history.state as any;
  if (state && state.userInfo) {
    userInfo.value = state.userInfo;
    console.log('接收到用户信息:', userInfo.value);
  } else {
    console.warn('未接收到用户信息，可能影响后端注册');
  }
  
  // 检查生物识别可用性
  biometricAvailable.value = await aaService.isBiometricAvailable();
  if (biometricAvailable.value) {
    biometricName.value = await biometricService.getBiometricName();
    enableBiometric.value = true; // 默认启用
  }
});

const goBack = () => {
  router.back();
};

const validatePassword = (): boolean => {
  if (!formData.password) {
    errors.password = '请输入密码';
    return false;
  }
  if (formData.password.length < 6) {
    errors.password = '密码至少需要6位字符';
    return false;
  }
  errors.password = '';
  return true;
};

const validateConfirmPassword = (): boolean => {
  if (!formData.confirmPassword) {
    errors.confirmPassword = '请确认密码';
    return false;
  }
  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = '两次密码输入不一致';
    return false;
  }
  errors.confirmPassword = '';
  return true;
};

const handleSubmit = async () => {
  globalError.value = '';
  
  // 验证表单
  const isPasswordValid = validatePassword();
  const isConfirmPasswordValid = validateConfirmPassword();
  
  if (!isPasswordValid || !isConfirmPasswordValid) {
    return;
  }
  
  // 检查是否有用户信息
  if (!userInfo.value) {
    globalError.value = '缺少用户信息，请重新开始注册流程';
    return;
  }
  
  isLoading.value = true;
  
  try {
    console.log('步骤1: 创建本地EOA和智能账户...');
    // 注册账户（会自动尝试启用生物识别）
    await aaService.register(formData.password, enableBiometric.value);
    
    console.log('步骤2: 获取EOA钱包、地址和智能账户地址...');
    // 获取EOA钱包（用于提取公钥）
    const eoaWallet = aaService.getEOAWallet();
    if (!eoaWallet) {
      throw new Error('无法获取EOA钱包');
    }
    
    // 获取创建的地址
    const eoaAddress = aaService.getEOAAddress();
    const smartAccountAddress = aaService.getAbstractAccountAddress();
    
    if (!eoaAddress || !smartAccountAddress) {
      throw new Error('无法获取账户地址');
    }
    
    console.log('EOA地址:', eoaAddress);
    console.log('智能账户地址:', smartAccountAddress);
    
    // 获取加密公钥
    const encryptionPublicKey = eoaWallet.signingKey.compressedPublicKey;
    console.log('加密公钥:', encryptionPublicKey);
    
    console.log('步骤3: 注册到后端服务器...');
    // 调用后端注册API
    await authService.register({
      id_card_number: userInfo.value.id_card_number,
      phone_number: userInfo.value.phone_number,
      email: userInfo.value.email,
      eoa_address: eoaAddress,
      smart_account_address: smartAccountAddress,
      encryption_public_key: encryptionPublicKey,
    });
    
    console.log('步骤4: 自动登录获取token...');
    
    // 自动登录获取token
    await authService.login(eoaWallet);
    console.log('登录成功');
    
    console.log('步骤5: 部署抽象账户到区块链...');
    // 部署抽象账户
    const deployResult = await aaService.deployAccount();
    console.log('抽象账户部署结果:', deployResult);
    
    console.log('✅ 注册和部署完成！');
    // 注册成功，跳转到添加家人页面
    router.replace({
      name: 'AddFamily',
      params: {
        userRole: userInfo.value.role || 'FAMILY'
      }
    });
    
  } catch (error: any) {
    console.error('注册失败:', error);
    globalError.value = error.message || '注册失败，请重试';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.set-pin-page {
  min-height: 100vh;
  background: #667eea;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(10px);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.arrow {
  color: white;
  width: 24px;
  height: 24px;
}

/* 进度指示器 */
.progress-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transition: all 0.3s;
}

.dot.completed {
  background: rgba(255, 255, 255, 0.7);
}

.dot.active {
  width: 24px;
  border-radius: 4px;
  background: white;
}

/* 主要内容 */
.content {
  flex: 1;
  background: white;
  border-radius: 32px 32px 0 0;
  padding: 40px 24px 30px;
  margin-top: auto;
  animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* 标题部分 */
.title-section {
  margin-bottom: 40px;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.subtitle {
  font-size: 1.2rem;
  color: var(--color-primary);
  margin: 0 0 4px 0;
  font-weight: 600;
}

.user-role {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  padding: 4px 12px;
  background: var(--gray-100);
  border-radius: 12px;
  display: inline-block;
  font-weight: 500;
}

.hint {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0;
}

/* 表单 */
.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  position: relative;
}

.label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.label-icon {
  width: 18px;
  height: 18px;
}

.password-wrapper {
  position: relative;
}

.input {
  width: 100%;
  padding: 16px 50px 16px 20px;
  border: 2px solid var(--border-color);
  border-radius: 16px;
  font-size: 1rem;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  background: var(--bg-body);
  color: var(--text-primary);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: white;
  box-shadow: 0 0 0 4px var(--primary-100);
}

.toggle-password {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.eye-icon {
  width: 20px;
  height: 20px;
}

.toggle-password:hover {
  color: var(--text-primary);
}

.form-group.focused .label {
  color: var(--color-primary);
}

.form-group.error .input {
  border-color: var(--error);
  background: #fff5f5;
}

.error-message {
  color: var(--error);
  font-size: 0.85rem;
  margin-top: 6px;
  display: block;
}

.error-enter-active, .error-leave-active {
  transition: all 0.3s;
}

.error-enter-from, .error-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* 生物识别选项 */
.biometric-option {
  margin: 8px 0;
}

.option-card {
  background: #f6f8fb;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border: 2px solid transparent;
}

.option-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
  border-color: var(--primary-200);
}

.option-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.option-icon-wrapper {
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
}

.option-icon {
  width: 24px;
  height: 24px;
  color: var(--color-primary);
}

.option-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.option-subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* 开关按钮 */
.toggle-switch {
  width: 52px;
  height: 28px;
  background: var(--gray-300);
  border-radius: 14px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toggle-switch.active {
  background: var(--color-primary);
}

.toggle-knob {
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-knob {
  left: 27px;
}

/* 全局错误 */
.global-error {
  background: #fff5f5;
  color: #c53030;
  padding: 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  border: 1px solid #feb2b2;
}

.slide-fade-enter-active, .slide-fade-leave-active {
  transition: all 0.3s;
}

.slide-fade-enter-from, .slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  padding: 18px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  margin-top: 16px;
  box-shadow: var(--shadow-md);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-arrow {
  width: 20px;
  height: 20px;
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.spinner {
  width: 18px;
  height: 18px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
