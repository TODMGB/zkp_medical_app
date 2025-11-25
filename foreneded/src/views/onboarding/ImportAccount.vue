<template>
  <div class="import-container">
    <!-- 标题栏 -->
    <div class="header">
      <button @click="$router.back()" class="back-btn">
        <span class="back-icon">←</span>
      </button>
      <h1>导入账户</h1>
    </div>

    <!-- 导入说明 -->
    <div class="info-card">
      <div class="info-icon">📱</div>
      <h2>从旧设备导入账户</h2>
      <p>扫描旧设备生成的二维码，或手动输入确认码来导入您的账户。</p>
    </div>

    <!-- 导入方式选择 -->
    <div class="import-methods">
      <div class="method-card" :class="{ active: importMethod === 'qr' }" @click="selectMethod('qr')">
        <div class="method-icon">📷</div>
        <h3>扫描二维码</h3>
        <p>推荐方式，快速安全</p>
      </div>

      <div class="method-card" :class="{ active: importMethod === 'manual' }" @click="selectMethod('manual')">
        <div class="method-icon">⌨️</div>
        <h3>手动输入</h3>
        <p>输入6位确认码</p>
      </div>
    </div>

    <!-- 导入内容 -->
    <div class="import-content">
      <!-- 二维码扫描 -->
      <div v-if="importMethod === 'qr'" class="qr-scanner-section">
        <div v-if="!isScanning" class="scanner-placeholder">
          <div class="scanner-icon">📷</div>
          <h3>准备扫描</h3>
          <p>点击下方按钮开始扫描旧设备上的迁移二维码</p>
          
          <button @click="startScanning" class="primary-btn" :disabled="isLoading">
            <span v-if="isLoading">准备中...</span>
            <span v-else>开始扫描</span>
          </button>
        </div>

        <div v-else class="scanner-active">
          <div class="scanner-frame">
            <div class="scanner-overlay">
              <div class="scan-area"></div>
            </div>
          </div>
          
          <div class="scanner-controls">
            <button @click="stopScanning" class="secondary-btn">取消扫描</button>
            <button @click="switchToManual" class="link-btn">改用手动输入</button>
          </div>
        </div>
      </div>

      <!-- 手动输入 -->
      <div v-else-if="importMethod === 'manual'" class="manual-input-section">
        <div class="input-card">
          <h3>输入确认码</h3>
          <p>请输入旧设备显示的6位确认码</p>
          
          <div class="code-input-container">
            <input
              v-for="(digit, index) in confirmCodeDigits"
              :key="index"
              :ref="(el) => { codeInputs[index] = el as HTMLInputElement | null }"
              v-model="confirmCodeDigits[index]"
              @input="handleCodeInput(index, $event)"
              @keydown="handleKeyDown(index, $event)"
              type="text"
              maxlength="1"
              class="code-input"
              :class="{ error: hasCodeError }"
            />
          </div>
          
          <div v-if="hasCodeError" class="error-message">
            {{ codeErrorMessage }}
          </div>

          <button 
            @click="importWithCode" 
            class="primary-btn" 
            :disabled="!isCodeComplete || isLoading"
          >
            <span v-if="isLoading">导入中...</span>
            <span v-else>确认导入</span>
          </button>
        </div>

        <div class="manual-help">
          <h4>找不到确认码？</h4>
          <p>确认码显示在旧设备的账户迁移页面上，是一个6位数字。</p>
          <button @click="switchToQR" class="link-btn">改用扫码方式</button>
        </div>
      </div>
    </div>

    <!-- 密码输入界面 -->
    <div v-if="importState === 'password'" class="password-input">
      <div class="password-card">
        <div class="password-icon">🔑</div>
        <h3>输入账户密码</h3>
        <p>请输入您在旧设备上设置的账户密码</p>
        
        <div class="form-group">
          <label>密码</label>
          <div class="password-input-wrapper">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              class="password-field"
              :class="{ 'error': passwordError }"
              @input="passwordError = ''"
              @keyup.enter="completeImportWithPassword"
            />
            <button 
              @click="showPassword = !showPassword" 
              class="toggle-password"
              type="button"
            >
              {{ showPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
          <div v-if="passwordError" class="password-error-message">
            {{ passwordError }}
          </div>
        </div>

        <div class="biometric-option">
          <label class="checkbox-label">
            <input 
              v-model="enableBiometric" 
              type="checkbox"
              class="checkbox-input"
            />
            <span class="checkbox-text">启用指纹/面容登录</span>
          </label>
          <p class="hint-text">启用后，下次可以使用生物识别快速登录</p>
        </div>

        <div class="button-group">
          <button @click="resetImport" class="secondary-btn">取消</button>
          <button 
            @click="completeImportWithPassword" 
            class="primary-btn"
            :disabled="!password"
          >
            确认导入
          </button>
        </div>
      </div>
    </div>

    <!-- 导入进度 -->
    <div v-if="importState === 'importing'" class="import-progress">
      <div class="progress-card">
        <div class="progress-icon">⏳</div>
        <h3>正在导入账户...</h3>
        <div class="progress-steps">
          <div class="progress-step" :class="{ completed: progressStep >= 1 }">
            <span class="step-dot"></span>
            <span>验证数据</span>
          </div>
          <div class="progress-step" :class="{ completed: progressStep >= 2 }">
            <span class="step-dot"></span>
            <span>解密账户</span>
          </div>
          <div class="progress-step" :class="{ completed: progressStep >= 3 }">
            <span class="step-dot"></span>
            <span>导入完成</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入成功 -->
    <div v-if="importState === 'success'" class="import-success">
      <div class="success-card">
        <div class="success-icon">✅</div>
        <h3>导入成功！</h3>
        <p>您的账户已成功导入到本设备</p>
        <div class="account-info">
          <div class="info-item">
            <span class="label">用户名：</span>
            <span class="value">{{ importedUserInfo?.username }}</span>
          </div>
          <div class="info-item">
            <span class="label">手机号：</span>
            <span class="value">{{ maskPhoneNumber(importedUserInfo?.phoneNumber) }}</span>
          </div>
        </div>
        
        <div v-if="biometricError" class="biometric-error">
          <div class="error-icon">❌</div>
          <p>{{ biometricError }}</p>
        </div>
        
        <button 
          @click="completeImport" 
          class="primary-btn"
          :disabled="isVerifying"
        >
          <span v-if="isVerifying">验证中...</span>
          <span v-else>{{ biometricError ? '重试验证' : '开始使用' }}</span>
        </button>
      </div>
    </div>

    <!-- 导入失败 -->
    <div v-if="importState === 'error'" class="import-error">
      <div class="error-card">
        <div class="error-icon">❌</div>
        <h3>导入失败</h3>
        <p>{{ errorMessage }}</p>
        
        <div class="error-actions">
          <button @click="resetImport" class="secondary-btn">重新尝试</button>
          <button @click="$router.push('/signup')" class="primary-btn">创建新账户</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { migrationService } from '@/service/migration';
import { scannerService } from '@/service/scanner';

const router = useRouter();

// 响应式数据
const importMethod = ref<'qr' | 'manual'>('qr');
const importState = ref<'selecting' | 'password' | 'importing' | 'success' | 'error'>('selecting');
const isScanning = ref(false);
const isLoading = ref(false);
const progressStep = ref(0);
const errorMessage = ref('');

// 确认码相关
const confirmCodeDigits = ref(['', '', '', '', '', '']);
const codeInputs = ref<(HTMLInputElement | null)[]>([]);
const hasCodeError = ref(false);
const codeErrorMessage = ref('');

// 密码和生物识别
const pendingQRData = ref<string>('');
const password = ref('');
const enableBiometric = ref(false);
const showPassword = ref(false);
const passwordError = ref('');

// 导入结果
const importedUserInfo = ref<any>(null);

// 指纹验证相关
const isVerifying = ref(false);
const biometricError = ref('');

// 计算属性
const isCodeComplete = computed(() => {
  return confirmCodeDigits.value.every(digit => digit.length === 1);
});

/**
 * 选择导入方式
 */
function selectMethod(method: 'qr' | 'manual') {
  importMethod.value = method;
  resetImport();
}

/**
 * 开始扫描二维码
 */
async function startScanning() {
  try {
    isLoading.value = true;
    
    // 检查相机权限
    const permission = await scannerService.checkPermission();
    if (!permission.granted) {
      const requestResult = await scannerService.requestPermission();
      if (!requestResult) {
        throw new Error('需要相机权限才能扫描二维码');
      }
    }

    isScanning.value = true;
    
    // 开始扫描
    const result = await scannerService.startScan();
    
    if (result) {
      await processQRCode(result);
    }
    
  } catch (error) {
    console.error('扫描失败:', error);
    errorMessage.value = error instanceof Error ? error.message : '扫描失败';
    importState.value = 'error';
  } finally {
    isLoading.value = false;
    isScanning.value = false;
  }
}

/**
 * 停止扫描
 */
async function stopScanning() {
  try {
    await scannerService.stopScan();
    isScanning.value = false;
  } catch (error) {
    console.error('停止扫描失败:', error);
  }
}

/**
 * 处理二维码数据
 */
async function processQRCode(qrData: string) {
  try {
    // 先保存二维码数据
    pendingQRData.value = qrData;
    
    // 显示密码输入界面
    importState.value = 'password';
    
  } catch (error) {
    console.error('处理二维码失败:', error);
    errorMessage.value = error instanceof Error ? error.message : '处理失败';
    importState.value = 'error';
  }
}

/**
 * 使用密码完成导入
 */
async function completeImportWithPassword() {
  // 清除之前的错误
  passwordError.value = '';
  
  try {
    if (!password.value || !pendingQRData.value) {
      passwordError.value = '请输入密码';
      return;
    }
    
    // 验证密码不为空且长度合理
    if (password.value.trim().length < 6) {
      passwordError.value = '密码长度不能少于6位';
      return;
    }
    
    console.log('🔐 开始验证密码并处理迁移...');
    
    // ✅ 先调用迁移服务验证密码（不切换界面）
    let result;
    try {
      result = await migrationService.processMigrationQR(
        pendingQRData.value,
        password.value,
        enableBiometric.value
      );
      
      // ✅ 密码验证成功，才显示导入进度界面
      console.log('✅ 密码验证通过，显示导入进度...');
      importState.value = 'importing';
      progressStep.value = 1;
      
    } catch (migrationError: any) {
      // ❌ 密码验证失败，停留在密码输入界面
      console.error('❌ 密码验证失败:', migrationError);
      
      // 判断是否是密码错误
      const errorMsg = migrationError.message || '';
      if (errorMsg.includes('密码错误') || 
          errorMsg.includes('invalid password') || 
          errorMsg.includes('解密') ||
          errorMsg.includes('地址不匹配') ||
          errorMsg.includes('incorrect password')) {
        // 停留在密码输入界面，清空密码，显示错误提示
        password.value = '';
        passwordError.value = '❌ 密码错误，请输入旧设备上设置的密码';
        return; // 不继续执行，停留在当前密码输入界面
      } else {
        // 其他错误（如网络错误等），显示到错误界面
        errorMessage.value = errorMsg || '导入失败';
        importState.value = 'error';
        return;
      }
    }
    
    // 密码验证通过，显示导入进度动画
    await new Promise(resolve => setTimeout(resolve, 500));
    progressStep.value = 2;
    
    await new Promise(resolve => setTimeout(resolve, 500));
    progressStep.value = 3;

    if (result && result.success) {
      // 获取导入的用户信息用于显示
      importedUserInfo.value = await getUserInfo();
      importState.value = 'success';
    } else {
      errorMessage.value = '导入失败，未知错误';
      importState.value = 'error';
    }

  } catch (error) {
    console.error('❌ 处理导入失败:', error);
    errorMessage.value = error instanceof Error ? error.message : '处理失败';
    importState.value = 'error';
  }
}

/**
 * 使用确认码导入
 */
async function importWithCode() {
  try {
    hasCodeError.value = false;
    isLoading.value = true;
    
    const confirmCode = confirmCodeDigits.value.join('');
    
    // 这里需要结合二维码数据，实际实现中可能需要先扫码获取加密数据
    // 然后用确认码解密，这里简化处理
    
    importState.value = 'importing';
    progressStep.value = 1;

    await new Promise(resolve => setTimeout(resolve, 500));
    progressStep.value = 2;

    // 模拟导入过程
    await new Promise(resolve => setTimeout(resolve, 1000));
    progressStep.value = 3;

    // 获取用户信息
    importedUserInfo.value = await getUserInfo();
    importState.value = 'success';

  } catch (error) {
    console.error('确认码导入失败:', error);
    hasCodeError.value = true;
    codeErrorMessage.value = error instanceof Error ? error.message : '导入失败';
  } finally {
    isLoading.value = false;
  }
}

/**
 * 处理确认码输入
 */
function handleCodeInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement;
  const value = target.value.replace(/[^0-9]/g, ''); // 只允许数字
  
  confirmCodeDigits.value[index] = value;
  hasCodeError.value = false;

  // 自动跳转到下一个输入框
  if (value && index < 5) {
    nextTick(() => {
      const nextInput = codeInputs.value[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    });
  }
}

/**
 * 处理键盘事件
 */
function handleKeyDown(index: number, event: KeyboardEvent) {
  // 退格键处理
  if (event.key === 'Backspace' && !confirmCodeDigits.value[index] && index > 0) {
    nextTick(() => {
      const prevInput = codeInputs.value[index - 1];
      if (prevInput) {
        prevInput.focus();
      }
    });
  }
}

/**
 * 切换到手动输入
 */
function switchToManual() {
  stopScanning();
  importMethod.value = 'manual';
}

/**
 * 切换到二维码扫描
 */
function switchToQR() {
  importMethod.value = 'qr';
  resetCodeInput();
}

/**
 * 重置确认码输入
 */
function resetCodeInput() {
  confirmCodeDigits.value = ['', '', '', '', '', ''];
  hasCodeError.value = false;
  codeErrorMessage.value = '';
}

/**
 * 重置导入状态
 */
async function resetImport() {
  // 重置UI状态
  importState.value = 'selecting';
  progressStep.value = 0;
  errorMessage.value = '';
  importedUserInfo.value = null;
  password.value = '';
  passwordError.value = '';
  pendingQRData.value = '';
  enableBiometric.value = false;
  isVerifying.value = false;
  biometricError.value = '';
  resetCodeInput();
  
  if (isScanning.value) {
    stopScanning();
  }
  
  // 清理可能残留的导入数据（防止第一次失败后有残留）
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const keysToClean = [
      'temp_migration_wallet',
      'account_imported_via_migration'
    ];
    
    for (const key of keysToClean) {
      await Preferences.remove({ key });
    }
    console.log('✅ 已清理残留数据');
  } catch (error) {
    console.warn('清理残留数据失败:', error);
  }
}

/**
 * 完成导入
 */
async function completeImport() {
  try {
    isVerifying.value = true;
    biometricError.value = '';
    
    // 1. 检查是否启用了指纹验证
    if (enableBiometric.value) {
      console.log('✅ 已启用指纹验证，尝试登录后端...');
      
      // 2. 尝试使用指纹验证登录后端
      const { authService } = await import('@/service/auth');
      
      try {
        await authService.ensureBackendLoginWithBiometric();
        console.log('✅ 指纹验证成功，后端登录完成');
      } catch (error: any) {
        console.error('❌ 指纹验证失败:', error);
        
        // 3. 验证失败，显示错误信息，允许重试
        biometricError.value = error.message || '指纹验证失败，请重试';
        isVerifying.value = false;
        return; // 不跳转，停留在当前页面让用户重试
      }
    } else {
      console.log('⚠️ 未启用指纹验证，跳过后端登录');
    }
    
    // 4. 验证成功或未启用指纹，跳转到主页
    console.log('✅ 导入完成，跳转到主页');
    router.push('/home');
    
  } catch (error: any) {
    console.error('完成导入失败:', error);
    biometricError.value = error.message || '登录失败，请重试';
  } finally {
    isVerifying.value = false;
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo() {
  // 从本地存储获取导入的用户信息
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const userInfo = await Preferences.get({ key: 'userInfo' });
    return userInfo.value ? JSON.parse(userInfo.value) : null;
  } catch (error) {
    return null;
  }
}

/**
 * 手机号脱敏
 */
function maskPhoneNumber(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

// 组件挂载
onMounted(() => {
  // 检查是否有待处理的迁移
  migrationService.checkPendingMigration().then(hasPending => {
    if (hasPending) {
      console.log('检测到待处理的迁移');
    }
  });
});
</script>

<style scoped>
.import-container {
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

.import-methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 30px;
}

.method-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.method-card:hover {
  background: rgba(255, 255, 255, 0.15);
}

.method-card.active {
  background: rgba(255, 255, 255, 0.2);
  border-color: white;
}

.method-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.method-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.method-card p {
  font-size: 14px;
  opacity: 0.8;
  margin: 0;
}

.import-content {
  margin-bottom: 30px;
}

.scanner-placeholder {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 40px 24px;
  text-align: center;
}

.scanner-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.scanner-placeholder h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.scanner-placeholder p {
  font-size: 16px;
  opacity: 0.9;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.scanner-active {
  text-align: center;
}

.scanner-frame {
  position: relative;
  width: 250px;
  height: 250px;
  margin: 0 auto 20px;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.8);
}

.scanner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-area {
  width: 180px;
  height: 180px;
  border: 2px solid #00ff88;
  border-radius: 12px;
  position: relative;
  animation: scan-pulse 2s infinite;
}

@keyframes scan-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.scanner-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.manual-input-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.input-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  text-align: center;
}

.input-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.input-card p {
  font-size: 16px;
  opacity: 0.9;
  margin: 0 0 24px 0;
}

.code-input-container {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
}

.code-input {
  width: 48px;
  height: 56px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  outline: none;
  transition: all 0.3s ease;
}

.code-input:focus {
  border-color: white;
  background: rgba(255, 255, 255, 0.2);
}

.code-input.error {
  border-color: #ff4757;
  background: rgba(255, 71, 87, 0.1);
}

.error-message {
  color: #ff4757;
  font-size: 14px;
  margin-bottom: 16px;
}

.manual-help {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
}

.manual-help h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.manual-help p {
  font-size: 14px;
  opacity: 0.8;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

/* 密码输入界面 */
.password-input {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(102, 126, 234, 0.95);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.password-card {
  background: white;
  border-radius: 24px;
  padding: 32px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.password-icon {
  font-size: 48px;
  text-align: center;
  margin-bottom: 16px;
}

.password-card h3 {
  color: #2c3e50;
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  text-align: center;
}

.password-card > p {
  color: #7f8c8d;
  font-size: 14px;
  margin: 0 0 24px 0;
  text-align: center;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  color: #2c3e50;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-field {
  flex: 1;
  padding: 12px 40px 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
  transition: all 0.3s ease;
}

.password-field:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.password-field.error {
  border-color: #ff4757;
  background: rgba(255, 71, 87, 0.05);
}

.password-field.error:focus {
  border-color: #ff4757;
  box-shadow: 0 0 0 3px rgba(255, 71, 87, 0.1);
}

.password-error-message {
  color: #ff4757;
  font-size: 13px;
  margin-top: 8px;
  text-align: left;
  padding: 8px 12px;
  background: rgba(255, 71, 87, 0.1);
  border-radius: 8px;
  border-left: 3px solid #ff4757;
}

.toggle-password {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  transition: opacity 0.2s;
}

.toggle-password:hover {
  opacity: 0.7;
}

.biometric-option {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  margin-bottom: 8px;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.checkbox-text {
  color: #2c3e50;
  font-size: 16px;
  font-weight: 500;
}

.hint-text {
  color: #7f8c8d;
  font-size: 13px;
  margin: 0;
  padding-left: 32px;
}

.button-group {
  display: flex;
  gap: 12px;
}

.button-group .secondary-btn,
.button-group .primary-btn {
  flex: 1;
}

.import-progress, .import-success, .import-error {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(102, 126, 234, 0.95);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.progress-card, .success-card, .error-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 40px 24px;
  text-align: center;
  max-width: 320px;
  width: 100%;
}

.progress-icon, .success-icon, .error-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.progress-card h3, .success-card h3, .error-card h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 20px 0;
}

.progress-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
}

.progress-step {
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.progress-step.completed {
  opacity: 1;
}

.step-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transition: background 0.3s ease;
}

.progress-step.completed .step-dot {
  background: #00ff88;
}

.account-info {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin: 20px 0;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.label {
  opacity: 0.8;
}

.value {
  font-weight: 600;
}

.biometric-error {
  background: rgba(255, 71, 87, 0.2);
  border: 2px solid rgba(255, 71, 87, 0.5);
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
  text-align: center;
}

.biometric-error .error-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.biometric-error p {
  color: #ff4757;
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

.error-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.primary-btn, .secondary-btn, .link-btn {
  padding: 16px 24px;
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
  flex: 1;
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
  flex: 1;
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.link-btn {
  background: none;
  color: white;
  text-decoration: underline;
  padding: 8px 0;
}

.link-btn:hover {
  opacity: 0.8;
}
</style>
