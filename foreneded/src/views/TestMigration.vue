<template>
  <div class="test-migration">
    <h1>账户迁移功能测试</h1>
    
    <div class="test-section">
      <h2>1. 生成迁移二维码测试</h2>
      <button @click="testGenerateQR" :disabled="loading">
        {{ loading ? '生成中...' : '测试生成二维码' }}
      </button>
      
      <div v-if="qrResult" class="result">
        <h3>生成结果：</h3>
        <p>确认码: {{ qrResult.confirmCode }}</p>
        <img :src="qrResult.qrCode" alt="测试二维码" style="max-width: 200px;" />
      </div>
    </div>

    <div class="test-section">
      <h2>2. 解析二维码测试</h2>
      <textarea 
        v-model="testQRData" 
        placeholder="粘贴二维码数据进行测试"
        rows="4"
        style="width: 100%; margin-bottom: 10px;"
      ></textarea>
      <input 
        v-model="testPassword" 
        type="password"
        placeholder="输入测试密码"
        style="width: 100%; margin-bottom: 10px; padding: 8px;"
      />
      <label style="display: block; margin-bottom: 10px;">
        <input type="checkbox" v-model="testEnableBiometric" />
        启用指纹识别
      </label>
      <button @click="testProcessQR" :disabled="loading">
        {{ loading ? '处理中...' : '测试解析二维码' }}
      </button>
      
      <div v-if="processResult" class="result">
        <h3>解析结果：</h3>
        <pre>{{ JSON.stringify(processResult, null, 2) }}</pre>
      </div>
    </div>

    <div class="test-section">
      <h2>3. 服务状态测试</h2>
      <button @click="testServices" :disabled="loading">
        {{ loading ? '检测中...' : '测试服务状态' }}
      </button>
      
      <div v-if="serviceStatus" class="result">
        <h3>服务状态：</h3>
        <ul>
          <li>设备ID: {{ serviceStatus.deviceId }}</li>
          <li>生物识别: {{ serviceStatus.biometric ? '✅' : '❌' }}</li>
          <li>扫码功能: {{ serviceStatus.scanner ? '✅' : '❌' }}</li>
          <li>本地存储: {{ serviceStatus.storage ? '✅' : '❌' }}</li>
        </ul>
      </div>
    </div>

    <div v-if="error" class="error">
      <h3>错误信息：</h3>
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { migrationService } from '@/service/migration';
import { biometricService } from '@/service/biometric';
import { scannerService } from '@/service/scanner';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';

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
.test-migration {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.test-section h2 {
  margin-top: 0;
  color: #333;
}

button {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background: #5a6fd8;
}

.result {
  margin-top: 15px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 6px;
}

.result h3 {
  margin-top: 0;
  color: #28a745;
}

.result pre {
  background: white;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}

.result ul {
  margin: 0;
  padding-left: 20px;
}

.result li {
  margin-bottom: 5px;
}

.error {
  margin-top: 20px;
  padding: 15px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  color: #721c24;
}

.error h3 {
  margin-top: 0;
}

textarea {
  font-family: monospace;
  font-size: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
}
</style>
