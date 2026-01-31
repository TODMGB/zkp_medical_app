<template>
  <div class="recover-page">
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="arrow" />
      </button>
      <div class="progress-dots">
        <span class="dot active"></span>
        <span class="dot"></span>
      </div>
    </div>

    <div class="content">
      <div class="title-section">
        <h1 class="title">恢复账号</h1>
        <p class="subtitle">请输入身份信息找回您的账号</p>
      </div>

      <form class="form" @submit.prevent="handleSubmit">
        <div class="form-group" :class="{ focused: focusedField === 'idCard', error: errors.idCard }">
          <label class="label">
            <CreditCard class="label-icon" />
            <span class="label-text">身份证号</span>
          </label>
          <input
            v-model="formData.idCard"
            class="input"
            placeholder="请输入18位身份证号"
            @focus="focusedField = 'idCard'"
            @blur="focusedField = ''"
          />
          <transition name="error">
            <span v-if="errors.idCard" class="error-message">{{ errors.idCard }}</span>
          </transition>
        </div>

        <div class="form-group" :class="{ focused: focusedField === 'phone', error: errors.phone }">
          <label class="label">
            <Smartphone class="label-icon" />
            <span class="label-text">手机号</span>
          </label>
          <input
            v-model="formData.phone"
            class="input"
            placeholder="请输入11位手机号"
            @focus="focusedField = 'phone'"
            @blur="focusedField = ''"
          />
          <transition name="error">
            <span v-if="errors.phone" class="error-message">{{ errors.phone }}</span>
          </transition>
        </div>

        <div class="form-group" :class="{ focused: focusedField === 'email', error: errors.email }">
          <label class="label">
            <Mail class="label-icon" />
            <span class="label-text">邮箱（可选）</span>
          </label>
          <input
            v-model="formData.email"
            class="input"
            placeholder="请输入邮箱"
            @focus="focusedField = 'email'"
            @blur="focusedField = ''"
          />
          <transition name="error">
            <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
          </transition>
        </div>

        <transition name="slide-fade">
          <div v-if="globalError" class="global-error">
            <AlertTriangle class="error-icon" />
            <span>{{ globalError }}</span>
          </div>
        </transition>

        <button type="submit" class="submit-btn" :class="{ loading: isLoading }" :disabled="isLoading">
          <span v-if="!isLoading" class="btn-text">
            下一步
            <ArrowRight class="btn-arrow" />
          </span>
          <span v-else class="btn-loading">
            <Loader2 class="spinner" />
            处理中...
          </span>
        </button>
      </form>

      <div v-if="resolvedAccount" class="result-card">
        <div class="result-title">已找到账号</div>
        <div class="result-row">
          <span class="result-label">用户名</span>
          <span class="result-value">{{ resolvedAccount.username || '未设置' }}</span>
        </div>
        <div class="result-row">
          <span class="result-label">账号地址</span>
          <span class="result-value mono">{{ resolvedAccount.smart_account }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { authService, type ResolveSmartAccountResponse } from '../../service/auth';
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Mail,
  AlertTriangle,
  ArrowRight,
  Loader2,
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
const resolvedAccount = ref<ResolveSmartAccountResponse | null>(null);

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
    return true;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = '邮箱格式不正确';
    return false;
  }
  errors.email = '';
  return true;
};

const handleSubmit = async () => {
  globalError.value = '';
  resolvedAccount.value = null;

  const isIdCardValid = validateIdCard(formData.idCard);
  const isPhoneValid = validatePhone(formData.phone);
  const isEmailValid = validateEmail(formData.email);

  if (!isIdCardValid || !isPhoneValid || !isEmailValid) {
    return;
  }

  isLoading.value = true;

  try {
    const result = await authService.resolveSmartAccount({
      id_card_number: formData.idCard,
      phone_number: formData.phone,
      email: formData.email || undefined
    });

    resolvedAccount.value = result;

    router.push({
      name: 'RecoverSetPassword',
      state: {
        identity: JSON.stringify({
          id_card_number: formData.idCard,
          phone_number: formData.phone,
          email: formData.email || ''
        }),
        oldAccount: JSON.stringify(result)
      }
    });
  } catch (error: any) {
    globalError.value = error?.message || '解析失败，请重试';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.recover-page {
  min-height: 100vh;
  background: #667eea;
  display: flex;
  flex-direction: column;
}

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

.back-btn:active {
  transform: scale(0.95);
}

.arrow {
  color: white;
  width: 24px;
  height: 24px;
}

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

.content {
  flex: 1;
  background: white;
  border-radius: 32px 32px 0 0;
  padding: 40px 24px 30px;
  margin-top: auto;
}

.title-section {
  margin-bottom: 28px;
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
  margin: 0;
  font-weight: 400;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  position: relative;
  transition: all 0.3s;
}

.form-group.focused {
  transform: translateY(-2px);
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
  padding: 16px;
  border: 2px solid var(--gray-200);
  border-radius: 16px;
  font-size: 1rem;
  transition: all 0.3s;
  background: white;
}

.form-group.focused .input {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.form-group.error .input {
  border-color: var(--color-danger);
}

.error-message {
  display: block;
  margin-top: 8px;
  color: var(--color-danger);
  font-size: 0.85rem;
}

.global-error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 16px;
  color: var(--color-danger);
  font-size: 0.95rem;
}

.error-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}

.submit-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 18px;
  padding: 18px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 6px;
}

.submit-btn:active {
  transform: scale(0.98);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-text {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-arrow {
  width: 20px;
  height: 20px;
}

.btn-loading {
  display: flex;
  align-items: center;
  gap: 10px;
}

.spinner {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.result-card {
  margin-top: 22px;
  border: 2px solid var(--gray-100);
  border-radius: 18px;
  padding: 16px;
  background: white;
}

.result-title {
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.result-label {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.result-value {
  color: var(--text-primary);
  font-size: 0.95rem;
  text-align: right;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.85rem;
  word-break: break-all;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.25s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.error-enter-active,
.error-leave-active {
  transition: all 0.2s ease;
}

.error-enter-from,
.error-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
