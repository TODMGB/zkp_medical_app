<template>
  <div class="page-container">
    <header class="header">
      <div class="icon-wrapper">
        <ArrowRightLeft class="header-icon" />
      </div>
      <h1>账户迁移功能测试</h1>
      <p class="subtitle">测试账户迁移、二维码生成与解析</p>
    </header>
    
    <main>
      <!-- 生成迁移二维码 -->
      <div class="card">
        <div class="card-header">
          <QrCode class="card-icon" />
          <h2>1. 生成迁移二维码测试</h2>
        </div>
        <p class="description">模拟旧设备生成迁移二维码，包含加密的账户信息。</p>
        
        <button @click="testGenerateQR" :disabled="loading" class="btn btn-primary">
          <QrCode class="btn-icon" />
          {{ loading ? '生成中...' : '测试生成二维码' }}
        </button>
        
        <div v-if="qrResult" class="result-box success">
          <div class="result-header">
            <CheckCircle2 class="result-icon" />
            <h3>生成成功</h3>
          </div>
          <div class="result-content">
            <div class="info-row">
              <span class="label">确认码</span>
              <span class="value code">{{ qrResult.confirmCode }}</span>
            </div>
            <div class="qr-display">
              <img :src="qrResult.qrCode" alt="测试二维码" />
            </div>
          </div>
        </div>
      </div>

      <!-- 解析二维码 -->
      <div class="card">
        <div class="card-header">
          <ScanLine class="card-icon" />
          <h2>2. 解析二维码测试</h2>
        </div>
        <p class="description">模拟新设备扫描二维码并解析账户信息。</p>
        
        <div class="form-group">
          <label>二维码数据</label>
          <textarea 
            v-model="testQRData" 
            placeholder="粘贴二维码数据进行测试"
            rows="4"
            class="textarea"
          ></textarea>
        </div>

        <div class="form-group">
          <label>测试密码</label>
          <div class="input-wrapper">
            <input 
              v-model="testPassword" 
              type="password"
              placeholder="输入测试密码"
              class="input"
            />
          </div>
        </div>

        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="testEnableBiometric" class="checkbox" />
            <span class="checkbox-text">启用指纹识别</span>
          </label>
        </div>

        <button @click="testProcessQR" :disabled="loading" class="btn btn-primary">
          <ScanLine class="btn-icon" />
          {{ loading ? '处理中...' : '测试解析二维码' }}
        </button>
        
        <div v-if="processResult" class="result-box success">
          <div class="result-header">
            <CheckCircle2 class="result-icon" />
            <h3>解析成功</h3>
          </div>
          <pre class="json-display">{{ JSON.stringify(processResult, null, 2) }}</pre>
        </div>
      </div>

      <!-- 服务状态测试 -->
      <div class="card">
        <div class="card-header">
          <Activity class="card-icon" />
          <h2>3. 服务状态测试</h2>
        </div>
        <p class="description">检测设备功能支持情况。</p>
        
        <button @click="testServices" :disabled="loading" class="btn btn-secondary">
          <Activity class="btn-icon" />
          {{ loading ? '检测中...' : '测试服务状态' }}
        </button>
        
        <div v-if="serviceStatus" class="status-grid">
          <div class="status-item">
            <span class="label">设备ID</span>
            <span class="value mono">{{ serviceStatus.deviceId }}</span>
          </div>
          <div class="status-item">
            <span class="label">生物识别</span>
            <span class="status-badge" :class="serviceStatus.biometric ? 'success' : 'error'">
              {{ serviceStatus.biometric ? '支持' : '不支持' }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">扫码功能</span>
            <span class="status-badge" :class="serviceStatus.scanner ? 'success' : 'error'">
              {{ serviceStatus.scanner ? '支持' : '不支持' }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">本地存储</span>
            <span class="status-badge" :class="serviceStatus.storage ? 'success' : 'error'">
              {{ serviceStatus.storage ? '正常' : '异常' }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="error" class="result-box error">
        <div class="result-header">
          <AlertTriangle class="result-icon" />
          <h3>错误信息</h3>
        </div>
        <p>{{ error }}</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { migrationService } from '@/service/migration';
import { biometricService } from '@/service/biometric';
import { scannerService } from '@/service/scanner';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { 
  ArrowRightLeft, 
  QrCode, 
  ScanLine, 
  Activity, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-vue-next';

// 响应式数据
const loading = ref(false);
const error = ref('');
const qrResult = ref<any>(null);
const processResult = ref<any>(null);
const serviceStatus = ref<any>(null);
const testQRData = ref('');
const testPassword = ref('test123'); // 测试密码
const testEnableBiometric = ref(false); // 是否启用指纹

/**
 * 测试生成二维码
 */
async function testGenerateQR() {
  try {
    loading.value = true;
    error.value = '';
    
    // 模拟账户数据
    await Preferences.set({
      key: 'accountInfo',
      value: JSON.stringify({
        address: '0x1234567890abcdef',
        ownerAddress: '0xabcdef1234567890',
        encryptedWallet: '{"encrypted":"test"}',
        salt: 12345,
        isDeployed: true
      })
    });
    
    await Preferences.set({
      key: 'userInfo',
      value: JSON.stringify({
        username: '测试用户', // 使用 UserInfo 接口的字段名
        idCardNumber: '110101199001011234',
        phoneNumber: '13800138000'
      })
    });
    
    const result = await migrationService.generateMigrationQR();
    qrResult.value = result;
    
  } catch (err: any) {
    error.value = err.message || '生成失败';
  } finally {
    loading.value = false;
  }
}

/**
 * 测试处理二维码
 */
async function testProcessQR() {
  try {
    loading.value = true;
    error.value = '';
    
    if (!testQRData.value.trim()) {
      throw new Error('请输入二维码数据');
    }
    
    if (!testPassword.value.trim()) {
      throw new Error('请输入测试密码');
    }
    
    const result = await migrationService.processMigrationQR(
      testQRData.value,
      testPassword.value,
      testEnableBiometric.value
    );
    processResult.value = result;
    
  } catch (err: any) {
    error.value = err.message || '处理失败';
  } finally {
    loading.value = false;
  }
}

/**
 * 测试服务状态
 */
async function testServices() {
  try {
    loading.value = true;
    error.value = '';
    
    const deviceInfo = await Device.getId();
    const biometricAvailable = await biometricService.isAvailable();
    const scannerSupported = await scannerService.isSupported();
    
    // 测试本地存储
    await Preferences.set({ key: 'test', value: 'test' });
    const storageTest = await Preferences.get({ key: 'test' });
    await Preferences.remove({ key: 'test' });
    
    serviceStatus.value = {
      deviceId: deviceInfo.identifier,
      biometric: biometricAvailable,
      scanner: scannerSupported,
      storage: storageTest.value === 'test'
    };
    
  } catch (err: any) {
    error.value = err.message || '检测失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 20px;
  min-height: 100vh;
  background: var(--bg-body);
}

.header {
  text-align: center;
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.icon-wrapper {
  width: 64px;
  height: 64px;
  background: #667eea;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  margin-bottom: 8px;
}

.header-icon {
  width: 32px;
  height: 32px;
  color: white;
}

.header h1 {
  font-size: 1.75rem;
  color: var(--text-primary);
  margin: 0;
  font-weight: 700;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1rem;
  margin: 0;
}

.card {
  background: var(--bg-surface);
  padding: 24px;
  border-radius: var(--border-radius-xl);
  margin-bottom: 24px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.card-icon {
  width: 24px;
  height: 24px;
  color: var(--color-primary);
}

.card-header h2 {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin: 0;
  font-weight: 600;
}

.description {
  color: var(--text-secondary);
  margin-bottom: 24px;
  line-height: 1.6;
  font-size: 0.95rem;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.input, .textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  font-size: 1rem;
  transition: all 0.2s;
  background: var(--bg-body);
  color: var(--text-primary);
  font-family: inherit;
}

.textarea {
  resize: vertical;
  min-height: 100px;
  font-family: 'SF Mono', monospace;
  font-size: 0.9rem;
}

.input:focus, .textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}

.checkbox-text {
  color: var(--text-primary);
  font-size: 0.95rem;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: var(--border-radius-lg);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: var(--gray-300);
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--gray-100);
  color: var(--text-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--gray-200);
}

.btn-icon {
  width: 20px;
  height: 20px;
}

.result-box {
  margin-top: 24px;
  padding: 16px;
  border-radius: var(--border-radius-lg);
  border: 1px solid transparent;
}

.result-box.success {
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.result-box.error {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.result-icon {
  width: 20px;
  height: 20px;
}

.result-box.success .result-icon {
  color: #059669;
}

.result-box.error .result-icon {
  color: #dc2626;
}

.result-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.result-box.success h3 {
  color: #065f46;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.info-row .label {
  color: #065f46;
  font-weight: 500;
}

.info-row .value.code {
  font-family: 'SF Mono', monospace;
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #a7f3d0;
  color: #059669;
  font-weight: 700;
}

.qr-display {
  display: flex;
  justify-content: center;
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.qr-display img {
  max-width: 200px;
  height: auto;
}

.json-display {
  background: white;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #a7f3d0;
  overflow-x: auto;
  font-family: 'SF Mono', monospace;
  font-size: 0.85rem;
  color: #064e3b;
  margin: 0;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.status-item {
  background: var(--gray-50);
  padding: 12px;
  border-radius: var(--border-radius-lg);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item .label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.status-item .value.mono {
  font-family: 'SF Mono', monospace;
  font-size: 0.85rem;
  color: var(--text-primary);
  word-break: break-all;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  width: fit-content;
}

.status-badge.success {
  background: #ecfdf5;
  color: #059669;
}

.status-badge.error {
  background: #fef2f2;
  color: #dc2626;
}
</style>
