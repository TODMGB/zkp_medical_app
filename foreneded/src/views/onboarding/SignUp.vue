<template>
  <div class="signup-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="arrow" />
      </button>
      <div class="progress-dots">
        <span class="dot active"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>
    
    <!-- 主要内容 -->
    <div class="content">
      <div class="title-section">
        <h1 class="title">验证身份</h1>
        <p class="subtitle">请输入您的个人信息</p>
        <div class="info-hint">
          <Lightbulb class="hint-icon-small" />
          <span>若系统查询到您的信息将自动识别角色，否则将注册为家属账户</span>
        </div>
      </div>
      
      <form @submit.prevent="handleSubmit" class="form">
        <!-- 身份证号 -->
        <div class="form-group" :class="{ 'focused': focusedField === 'idCard', 'error': errors.idCard }">
          <label class="label">
            <CreditCard class="label-icon" />
            <span class="label-text">身份证号</span>
          </label>
          <input
            v-model="formData.idCard"
            type="text"
            placeholder="请输入身份证号"
            maxlength="18"
            @focus="focusedField = 'idCard'"
            @blur="focusedField = ''"
            class="input"
          />
          <transition name="error">
            <span v-if="errors.idCard" class="error-message">{{ errors.idCard }}</span>
          </transition>
        </div>
        
        <!-- 手机号 -->
        <div class="form-group" :class="{ 'focused': focusedField === 'phone', 'error': errors.phone }">
          <label class="label">
            <Smartphone class="label-icon" />
            <span class="label-text">手机号码</span>
          </label>
          <input
            v-model="formData.phone"
            type="tel"
            placeholder="请输入手机号"
            maxlength="11"
            @focus="focusedField = 'phone'"
            @blur="focusedField = ''"
            class="input"
          />
          <transition name="error">
            <span v-if="errors.phone" class="error-message">{{ errors.phone }}</span>
          </transition>
        </div>
        
        <!-- 邮箱 -->
        <div class="form-group" :class="{ 'focused': focusedField === 'email', 'error': errors.email }">
          <label class="label">
            <Mail class="label-icon" />
            <span class="label-text">电子邮箱</span>
          </label>
          <input
            v-model="formData.email"
            type="email"
            placeholder="请输入邮箱地址"
            @focus="focusedField = 'email'"
            @blur="focusedField = ''"
            class="input"
          />
          <transition name="error">
            <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
          </transition>
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
            下一步
            <ArrowRight class="btn-arrow" />
          </span>
          <span v-else class="btn-loading">
            <Loader2 class="spinner" />
            验证中...
          </span>
        </button>
      </form>
      
      <!-- 底部提示 -->
      <div class="footer-hint">
        <p class="hint-text">
          <Lock class="hint-icon" />
          您的信息将被安全加密存储
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { userInfoService } from '../../service/userInfo';
import { 
  ArrowLeft, 
  CreditCard, 
  Smartphone, 
  Mail, 
  AlertTriangle, 
  ArrowRight, 
  Loader2, 
  Lock,
  Lightbulb
} from 'lucide-vue-next';

const router = useRouter();

const formData = reactive({
  idCard: '',
  phone: '',
  email: ''
});

const errors = reactive({
  idCard: '',
  phone: '',
  email: ''
});

const focusedField = ref('');
const globalError = ref('');
const isLoading = ref(false);

const goBack = () => {
  router.back();
};

const validateIdCard = (idCard: string): boolean => {
  if (!idCard) {
    errors.idCard = '请输入身份证号';
    return false;
  }
  if (!/^\d{17}[\dXx]$/.test(idCard)) {
    errors.idCard = '身份证号格式不正确';
    return false;
  }
  errors.idCard = '';
  return true;
};

const validatePhone = (phone: string): boolean => {
  if (!phone) {
    errors.phone = '请输入手机号';
    return false;
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    errors.phone = '手机号格式不正确';
    return false;
  }
  errors.phone = '';
  return true;
};

const validateEmail = (email: string): boolean => {
  if (!email) {
    errors.email = '';
    return true; // 邮箱可选
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = '邮箱格式不正确';
    return false;
  }
  errors.email = '';
  return true;
};

const handleSubmit = async () => {
  // 清除之前的错误
  globalError.value = '';
  
  // 验证表单
  const isIdCardValid = validateIdCard(formData.idCard);
  const isPhoneValid = validatePhone(formData.phone);
  const isEmailValid = validateEmail(formData.email);
  
  if (!isIdCardValid || !isPhoneValid || !isEmailValid) {
    return;
  }
  
  isLoading.value = true;
  
  try {
    // 查询用户信息
    const person = await userInfoService.lookupPerson({
      id_card_number: formData.idCard,
      phone_number: formData.phone,
      email: formData.email || undefined
    });
    
    // 根据是否找到用户信息，决定角色
    let username: string;
    let userId: string;
    let userRole: string;
    
    if (person) {
      // 找到用户信息 → 使用查询到的角色（老人/医生）
      console.log('✅ 查询到用户信息:', person.name, `(${person.role})`);
      username = person.name;
      userId = person.id.toString();
      userRole = person.role || 'elderly';
    } else {
      // 未找到用户信息 → 注册为家属
      console.log('ℹ️  未查询到用户信息，将注册为家属');
      // 从手机号提取姓名（简单处理，实际可让用户输入）
      username = `用户_${formData.phone.slice(-4)}`;
      userId = '0'; // 临时ID，后端会生成真实ID
      userRole = 'family'; // 默认注册为家属
    }
    
    // 跳转到设置密码页面（通过state传递完整信息）
    router.push({
      name: 'SetProtectionPin',
      params: {
        username: username,
        userId: userId,
        userRole: userRole
      },
      state: {
        userInfo: {
          id_card_number: formData.idCard,
          phone_number: formData.phone,
          email: formData.email || '',
          name: username,
          role: userRole
        }
      }
    });
    
  } catch (error: any) {
    console.error('验证失败:', error);
    globalError.value = error.message || '验证失败，请重试';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.signup-page {
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

.back-btn:active {
  transform: scale(0.95);
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
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
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
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
  font-weight: 400;
}

.info-hint {
  font-size: 0.85rem;
  color: var(--color-primary);
  margin: 0;
  padding: 12px;
  background: var(--primary-50);
  border-radius: 12px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.hint-icon-small {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

/* 表单 */
.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  position: relative;
  transition: all 0.3s;
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

.input {
  width: 100%;
  padding: 16px 20px;
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

.error-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
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
  transition: transform 0.3s;
}

.submit-btn:hover .btn-arrow {
  transform: translateX(4px);
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

/* 底部提示 */
.footer-hint {
  margin-top: 30px;
  text-align: center;
}

.hint-text {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.hint-icon {
  width: 16px;
  height: 16px;
}

/* 响应式 */
@media (max-width: 768px) {
  .title {
    font-size: 1.75rem;
  }
}
</style>
