<template>
  <div class="signup-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <span class="arrow">←</span>
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
        <p class="info-hint">💡 若系统查询到您的信息将自动识别角色，否则将注册为家属账户</p>
      </div>
      
      <form @submit.prevent="handleSubmit" class="form">
        <!-- 身份证号 -->
        <div class="form-group" :class="{ 'focused': focusedField === 'idCard', 'error': errors.idCard }">
          <label class="label">
            <span class="label-icon">🪪</span>
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
            <span class="label-icon">📱</span>
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
            <span class="label-icon">📧</span>
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
            <span class="error-icon">⚠️</span>
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
            <span class="btn-arrow">→</span>
          </span>
          <span v-else class="btn-loading">
            <span class="spinner"></span>
            验证中...
          </span>
        </button>
      </form>
      
      <!-- 底部提示 -->
      <div class="footer-hint">
        <p class="hint-text">
          <span class="hint-icon">🔒</span>
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  font-size: 1.5rem;
  line-height: 1;
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
  color: #1a202c;
  margin: 0 0 12px 0;
}

.subtitle {
  font-size: 1rem;
  color: #718096;
  margin: 0 0 8px 0;
  font-weight: 400;
}

.info-hint {
  font-size: 0.85rem;
  color: #667eea;
  margin: 0;
  padding: 8px 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  line-height: 1.4;
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
  color: #4a5568;
  font-size: 0.95rem;
}

.label-icon {
  font-size: 1.2rem;
}

.input {
  width: 100%;
  padding: 16px 20px;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  font-size: 1rem;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  background: #f7fafc;
}

.input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.form-group.focused .label {
  color: #667eea;
}

.form-group.error .input {
  border-color: #fc8181;
  background: #fff5f5;
}

.error-message {
  color: #e53e3e;
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
  font-size: 1.2rem;
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  margin-top: 16px;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4);
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
  font-size: 1.3rem;
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

/* 底部提示 */
.footer-hint {
  margin-top: 30px;
  text-align: center;
}

.hint-text {
  color: #a0aec0;
  font-size: 0.9rem;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.hint-icon {
  font-size: 1rem;
}

/* 响应式 */
@media (max-width: 768px) {
  .title {
    font-size: 1.75rem;
  }
}
</style>
