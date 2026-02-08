<template>
  <div class="set-pin-page">
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="arrow" />
      </button>
      <div class="progress-dots">
        <span class="dot completed"></span>
        <span class="dot active"></span>
      </div>
    </div>

    <div class="content">
      <div class="title-section">
        <h1 class="title">设置新密码</h1>
        <p class="subtitle">将生成新的密钥用于恢复账号</p>
      </div>

      <form v-if="step === 'form'" @submit.prevent="handleSubmit" class="form">
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">待恢复账号</span>
            <span class="info-value mono">{{ oldAccount?.smart_account || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">用户名</span>
            <span class="info-value">{{ oldAccount?.username || '未设置' }}</span>
          </div>
        </div>

        <div class="form-group" :class="{ focused: focusedField === 'password', error: errors.password }">
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
            <button type="button" class="toggle-password" @click="showPassword = !showPassword">
              <Eye v-if="showPassword" class="eye-icon" />
              <EyeOff v-else class="eye-icon" />
            </button>
          </div>
          <transition name="error">
            <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
          </transition>
        </div>

        <div class="form-group" :class="{ focused: focusedField === 'confirmPassword', error: errors.confirmPassword }">
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
            <button type="button" class="toggle-password" @click="showConfirmPassword = !showConfirmPassword">
              <Eye v-if="showConfirmPassword" class="eye-icon" />
              <EyeOff v-else class="eye-icon" />
            </button>
          </div>
          <transition name="error">
            <span v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</span>
          </transition>
        </div>

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
              <div class="toggle-switch" :class="{ active: enableBiometric }">
                <div class="toggle-knob"></div>
              </div>
            </div>
          </div>
        </div>

        <transition name="slide-fade">
          <div v-if="globalError" class="global-error">
            <AlertTriangle class="error-icon" />
            <span>{{ globalError }}</span>
          </div>
        </transition>

        <button type="submit" class="submit-btn" :class="{ loading: isLoading }" :disabled="isLoading">
          <span v-if="!isLoading" class="btn-text">
            发起恢复请求
            <ArrowRight class="btn-arrow" />
          </span>
          <span v-else class="btn-loading">
            <Loader2 class="spinner" />
            处理中...
          </span>
        </button>
      </form>

      <div v-else class="result">
        <div class="result-card">
          <div class="result-title">{{ isRecovered ? '恢复成功' : '恢复请求已提交' }}</div>
          <div class="result-row">
            <span class="result-label">新Owner地址</span>
            <span class="result-value mono">{{ newOwnerAddress || '-' }}</span>
          </div>
          <div class="result-row">
            <span class="result-label">旧账号</span>
            <span class="result-value mono">{{ oldAccount?.smart_account || '-' }}</span>
          </div>
          <div v-if="recoverySessionId" class="result-row">
            <span class="result-label">会话ID</span>
            <span class="result-value mono">{{ recoverySessionId }}</span>
          </div>
          <div v-if="autoLoginMessage" class="result-row">
            <span class="result-label">状态</span>
            <span class="result-value">{{ autoLoginMessage }}</span>
          </div>
        </div>

        <button class="secondary-btn" :disabled="isLoading" @click="goToRecoveryProgress">
          <Loader2 v-if="isLoading" class="spinner" />
          <span v-else>查看恢复进度</span>
        </button>

        <button class="link-btn" @click="goToLogin">返回登录</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Preferences } from '@capacitor/preferences';
import { ethers } from 'ethers';
import { aaService } from '../../service/accountAbstraction';
import { biometricService } from '../../service/biometric';
import { WALLET_KEYS } from '../../config/storage.config';
import { authService, type ResolveSmartAccountResponse } from '../../service/auth';
import { recoveryPendingService } from '@/service/recoveryPending';
import { guardianService } from '@/service/guardian';
import {
  ArrowLeft,
  Key,
  Lock,
  Eye,
  EyeOff,
  Fingerprint,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from 'lucide-vue-next';

const router = useRouter();

const focusedField = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const globalError = ref('');
const isLoading = ref(false);

const biometricAvailable = ref(false);
const biometricName = ref('生物识别');
const enableBiometric = ref(false);

const step = ref<'form' | 'done'>('form');

const formData = reactive({
  password: '',
  confirmPassword: ''
});

const errors = reactive({
  password: '',
  confirmPassword: ''
});

const identity = ref<{ id_card_number: string; phone_number: string; email: string } | null>(null);
const oldAccount = ref<ResolveSmartAccountResponse | null>(null);
const newOwnerAddress = ref<string>('');
const recoverySessionId = ref<string>('');

const isRecovered = ref(false);
const autoLoginMessage = ref('');
let recoveryPollTimer: any = null;

onMounted(async () => {
  const state = history.state as any;
  try {
    if (state?.identity) {
      identity.value = JSON.parse(state.identity);
    }
    if (state?.oldAccount) {
      oldAccount.value = JSON.parse(state.oldAccount);
    }
  } catch (e) {
  }

  if (!identity.value || !oldAccount.value?.smart_account) {
    try {
      const pending = await recoveryPendingService.getPending();
      if (pending?.old_smart_account) {
        oldAccount.value = {
          smart_account: pending.old_smart_account,
          username: null,
          roles: [],
        } as any;
      }
    } catch (e) {
    }
  }

  biometricAvailable.value = await aaService.isBiometricAvailable();
  if (biometricAvailable.value) {
    biometricName.value = await biometricService.getBiometricName();
    enableBiometric.value = true;
  }

  if (!identity.value || !oldAccount.value?.smart_account) {
    globalError.value = '缺少恢复信息，请重新开始恢复流程';
  }
});

const stopRecoveryPoll = () => {
  if (recoveryPollTimer) {
    clearInterval(recoveryPollTimer);
    recoveryPollTimer = null;
  }
};

const checkRecoveryAndAutoLogin = async () => {
  if (step.value !== 'done') return;
  if (isLoading.value) return;
  if (!oldAccount.value?.smart_account) return;
  if (!newOwnerAddress.value) return;

  try {
    const [statusRes, accountInfo] = await Promise.all([
      guardianService.getRecoveryStatus(oldAccount.value.smart_account).catch(() => null),
      guardianService.getAccountInfo(oldAccount.value.smart_account).catch(() => null),
    ]);

    const owner = accountInfo?.owner ? String(accountInfo.owner) : '';
    const ownerRecovered = owner && String(owner).toLowerCase() === String(newOwnerAddress.value).toLowerCase();
    const executedRecovered =
      statusRes?.executed &&
      String(statusRes?.newOwner || '').toLowerCase() === String(newOwnerAddress.value).toLowerCase();

    if (ownerRecovered || executedRecovered) {
      isRecovered.value = true;
      stopRecoveryPoll();

      autoLoginMessage.value = '恢复完成，正在登录...';
      try {
        await aaService.loginToBackend();
      } catch (e) {
      }

      try {
        await recoveryPendingService.clearPending();
      } catch (e) {
      }

      autoLoginMessage.value = '登录成功，正在进入系统...';
      router.replace('/home');
    } else {
      autoLoginMessage.value = '等待守护者确认与链上执行...';
    }
  } catch (e) {
  }
};

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

  if (!validatePassword() || !validateConfirmPassword()) {
    return;
  }

  if (!identity.value || !oldAccount.value?.smart_account) {
    globalError.value = '缺少恢复信息，请重新开始恢复流程';
    return;
  }

  isLoading.value = true;

  try {
    const isRegistered = await aaService.isRegistered();
    if (isRegistered) {
      throw new Error('当前设备已存在账户，请先在设置中清除账户或使用迁移功能');
    }

    const randomWallet = ethers.Wallet.createRandom();
    const encryptedKey = await randomWallet.encrypt(formData.password);

    await Preferences.set({
      key: WALLET_KEYS.EOA_PRIVATE_KEY,
      value: encryptedKey,
    });

    await Preferences.set({
      key: WALLET_KEYS.ACCOUNT_ADDRESS,
      value: oldAccount.value.smart_account,
    });

    await aaService.login(formData.password);

    if (enableBiometric.value) {
      try {
        await aaService.enableBiometric(formData.password);
      } catch (e) {
      }
    }

    const eoaWallet = aaService.getEOAWallet();
    if (!eoaWallet) {
      throw new Error('无法获取新EOA钱包');
    }
    newOwnerAddress.value = eoaWallet.address;

    const recoveryResult = await authService.startRecovery({
      id_card_number: identity.value.id_card_number,
      phone_number: identity.value.phone_number,
      email: identity.value.email || undefined,
      new_owner_address: newOwnerAddress.value,
    });
    recoverySessionId.value = recoveryResult.session_id;

    try {
      await recoveryPendingService.setPending({
        session_id: recoveryResult.session_id,
        old_smart_account: recoveryResult.old_smart_account,
        new_owner_address: recoveryResult.new_owner_address,
        expires_at: recoveryResult.expires_at,
        guardians: recoveryResult.guardians,
        threshold: recoveryResult.threshold,
      });
    } catch (e) {
    }

    step.value = 'done';

    stopRecoveryPoll();
    await checkRecoveryAndAutoLogin();
    recoveryPollTimer = setInterval(() => {
      checkRecoveryAndAutoLogin();
    }, 5000);
  } catch (error: any) {
    globalError.value = error?.message || '操作失败，请重试';

    // 回滚：避免产生“无效账户”残留
    try {
      await biometricService.deleteCredentials();
    } catch (e) {
    }
    try {
      aaService.clearLocalSession();
    } catch (e) {
    }
    try {
      await Preferences.remove({ key: WALLET_KEYS.EOA_PRIVATE_KEY });
      await Preferences.remove({ key: WALLET_KEYS.ACCOUNT_ADDRESS });
    } catch (e) {
    }
    try {
      await recoveryPendingService.clearPending();
    } catch (e) {
    }
  } finally {
    isLoading.value = false;
  }
};

const goToRecoveryProgress = () => {
  router.replace('/recovery-progress');
};

const goToLogin = () => {
  router.replace('/login');
};

onUnmounted(() => {
  stopRecoveryPoll();
});
</script>

<style scoped>
.set-pin-page {
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
}

.dot.active {
  width: 24px;
  border-radius: 4px;
  background: white;
}

.dot.completed {
  background: rgba(255, 255, 255, 0.7);
}

.content {
  flex: 1;
  background: white;
  border-radius: 32px 32px 0 0;
  padding: 40px 24px 30px;
  margin-top: auto;
}

.title-section {
  margin-bottom: 24px;
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
  gap: 18px;
}

.info-card {
  border: 2px solid var(--gray-100);
  border-radius: 18px;
  padding: 14px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.info-row:first-child {
  margin-top: 0;
}

.info-label {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.info-value {
  color: var(--text-primary);
  font-size: 0.95rem;
  text-align: right;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.85rem;
  word-break: break-all;
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

.password-wrapper {
  position: relative;
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

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-secondary);
}

.eye-icon {
  width: 20px;
  height: 20px;
}

.error-message {
  display: block;
  margin-top: 8px;
  color: var(--color-danger);
  font-size: 0.85rem;
}

.biometric-option {
  margin-top: 4px;
}

.option-card {
  background: rgba(102, 126, 234, 0.06);
  border: 2px solid rgba(102, 126, 234, 0.15);
  border-radius: 18px;
  padding: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.option-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.option-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(102, 126, 234, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.option-icon {
  width: 22px;
  height: 22px;
  color: var(--color-primary);
}

.option-title {
  font-weight: 700;
  color: var(--text-primary);
}

.option-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.toggle-switch {
  width: 48px;
  height: 28px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 999px;
  position: relative;
  transition: all 0.25s;
}

.toggle-switch.active {
  background: rgba(102, 126, 234, 0.9);
}

.toggle-knob {
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: all 0.25s;
}

.toggle-switch.active .toggle-knob {
  left: 23px;
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

.result {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.result-card {
  border: 2px solid var(--gray-100);
  border-radius: 18px;
  padding: 16px;
}

.result-title {
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
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

.secondary-btn {
  border: 2px solid rgba(102, 126, 234, 0.35);
  background: white;
  border-radius: 18px;
  padding: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.secondary-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.status-card {
  padding: 14px;
  background: rgba(102, 126, 234, 0.08);
  border-radius: 16px;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.link-btn {
  background: none;
  border: none;
  padding: 10px;
  color: var(--text-secondary);
  font-size: 0.95rem;
  cursor: pointer;
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
