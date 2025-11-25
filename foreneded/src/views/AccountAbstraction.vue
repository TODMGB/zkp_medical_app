<template>
  <div class="aa-page">
    <header>
      <h1>🔐 ERC-4337 账户抽象</h1>
      <p class="subtitle">基于智能合约的账户系统</p>
      
      <!-- 网络状态 -->
      <div class="network-status">
        <div class="network-info">
          <div class="network-item">
            <span class="network-label">RPC:</span>
            <span class="network-value" :class="networkStatus.rpc">
              {{ RPC_CONFIG.url }}
              <span class="status-indicator" :class="networkStatus.rpc"></span>
            </span>
          </div>
          <div class="network-item">
            <span class="network-label">API:</span>
            <span class="network-value" :class="networkStatus.api">
              {{ API_CONFIG.baseUrl }}
              <span class="status-indicator" :class="networkStatus.api"></span>
            </span>
          </div>
        </div>
        <button @click="testConnection" :disabled="isLoading" class="test-btn">
          {{ isLoading ? '测试中...' : '🔍 测试网络' }}
        </button>
      </div>
    </header>

    <main>
      <!-- 未注册/未登录状态 -->
      <div class="container" v-if="!isLoggedIn">
        <h2>{{ isRegistered ? '登录账户' : '注册新账户' }}</h2>
        <p class="description">
          {{ isRegistered 
            ? '请输入密码以解锁您的账户' 
            : '首次使用，将为您创建一个智能合约账户（无需预存Gas）' 
          }}
        </p>

        <div class="form-group">
          <label>密码</label>
          <input 
            v-model="password" 
            type="password" 
            placeholder="请输入密码（至少6位）"
            @keyup.enter="handleAuth"
          />
        </div>

        <button 
          @click="handleAuth" 
          :disabled="isLoading || password.length < 6"
          class="primary-btn"
        >
          {{ isLoading 
            ? (isRegistered ? '登录中...' : '注册中...') 
            : (isRegistered ? '登录' : '注册并创建账户') 
          }}
        </button>

        <!-- 指纹登录按钮 -->
        <button 
          v-if="isRegistered && biometricAvailable && biometricEnabled"
          @click="handleBiometricLogin" 
          :disabled="isLoading"
          class="biometric-btn"
        >
          {{ isLoading ? '验证中...' : `🔐 使用${biometricName}登录` }}
        </button>

        <div class="biometric-info" v-if="isRegistered && biometricAvailable && !biometricEnabled">
          <p>💡 您可以启用{{ biometricName }}快速登录</p>
        </div>

        <div class="info-box" v-if="!isRegistered">
          <h4>📋 什么是账户抽象？</h4>
          <ul>
            <li>✅ 无需持有ETH即可使用（Gas由Paymaster支付）</li>
            <li>✅ 智能合约账户，支持社交恢复</li>
            <li>✅ 更安全的密钥管理方式</li>
            <li>✅ 一键部署，无需手动操作</li>
          </ul>
        </div>
      </div>

      <!-- 已登录状态 -->
      <div v-else>
        <!-- 账户信息 -->
        <div class="container">
          <h2>👤 账户信息</h2>
          
          <div class="account-info">
            <div class="info-item">
              <label>EOA地址（签名账户）</label>
              <div class="address-display">
                <span class="address">{{ eoaAddress }}</span>
                <button class="copy-btn" @click="copyToClipboard(eoaAddress)">📋</button>
              </div>
            </div>

            <div class="info-item">
              <label>智能账户地址（抽象账户）</label>
              <div class="address-display">
                <span class="address">{{ abstractAddress }}</span>
                <button class="copy-btn" @click="copyToClipboard(abstractAddress)">📋</button>
              </div>
            </div>

            <div class="balance-row">
              <div class="balance-item">
                <label>账户余额</label>
                <div class="balance">{{ balance }} ETH</div>
              </div>
              <div class="balance-item">
                <label>EntryPoint存款</label>
                <div class="balance">{{ depositBalance }} ETH</div>
              </div>
            </div>

            <button @click="refreshBalances" class="secondary-btn">
              🔄 刷新余额
            </button>
          </div>
        </div>

        <!-- 发送交易 -->
        <div class="container">
          <h2>💸 发送交易</h2>
          <p class="description">
            使用智能账户发送交易，Gas由Paymaster支付
          </p>

          <div class="form-group">
            <label>接收地址</label>
            <input 
              v-model="txForm.to" 
              placeholder="0x..."
            />
          </div>

          <div class="form-group">
            <label>金额 (ETH)</label>
            <input 
              v-model="txForm.amount" 
              type="number" 
              step="0.01"
              placeholder="0.1"
            />
          </div>

          <div class="form-group">
            <label>附加数据 (可选)</label>
            <input 
              v-model="txForm.data" 
              placeholder="0x (十六进制数据)"
            />
          </div>

          <button 
            @click="handleSendTransaction" 
            :disabled="isLoading || !txForm.to"
            class="primary-btn"
          >
            {{ isLoading ? '发送中...' : '发送交易' }}
          </button>
        </div>

        <!-- 流程说明 -->
        <div class="container info-container">
          <h2>🔄 账户抽象流程</h2>
          <div class="flow-steps">
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>生成EOA</h4>
                <p>随机生成私钥，加密存储在本地</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4>计算账户地址</h4>
                <p>通过Factory预计算智能账户地址</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4>构建UserOperation</h4>
                <p>包含initCode实现原子化部署</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">4</div>
              <div class="step-content">
                <h4>签名并提交</h4>
                <p>EOA签名，Bundler提交到EntryPoint</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 状态消息 -->
      <div class="status-box" :class="statusType">
        <p><strong>状态:</strong> {{ status }}</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { aaService } from '../service/accountAbstraction';
import { biometricService } from '../service/biometric';
import { ethers } from 'ethers';
import { RPC_CONFIG, API_CONFIG } from '../config/api.config';

// 表单数据
const password = ref('');
const isRegistered = ref(false);
const isLoggedIn = ref(false);
const isLoading = ref(false);
const status = ref('等待操作...');
const statusType = ref('info');

// 生物识别相关
const biometricAvailable = ref(false);
const biometricEnabled = ref(false);
const biometricName = ref('生物识别');

// 网络状态
const networkStatus = ref({
  rpc: 'unknown', // 'connected', 'disconnected', 'unknown'
  api: 'unknown'
});

// 账户信息
const eoaAddress = ref('');
const abstractAddress = ref('');
const balance = ref('0.0');
const depositBalance = ref('0.0');

// 交易表单
const txForm = ref<{
  to: string;
  amount: string | number; // 支持字符串和数字（HTML input可能返回任一类型）
  data: string;
}>({
  to: '',
  amount: '0',
  data: '0x'
});

onMounted(async () => {
  // 🔒 每次进入页面都重置登录状态，确保需要重新验证
  isLoggedIn.value = false;
  
  // 检查是否已注册
  isRegistered.value = await aaService.isRegistered();
  status.value = isRegistered.value 
    ? '检测到已有账户，请登录' 
    : '未发现账户，请注册新账户';
  
  // 检查生物识别是否可用
  biometricAvailable.value = await biometricService.isAvailable();
  biometricEnabled.value = await biometricService.isEnabled();
  
  if (biometricAvailable.value) {
    biometricName.value = await biometricService.getBiometricName();
    console.log(`设备支持${biometricName.value}`);
  }
  
  // 自动测试网络连接
  testConnection();
  
  // 🔐 自动触发指纹登录（如果已注册且已启用生物识别）
  if (isRegistered.value && biometricEnabled.value) {
    console.log(`🔐 检测到已启用${biometricName.value}，自动触发登录...`);
    // 延迟500ms，让用户看到界面
    setTimeout(() => {
      handleBiometricLogin();
    }, 500);
  }
});

// 测试网络连接
const testConnection = async () => {
  console.log('🔍 开始测试网络连接...');
  
  try {
    const result = await aaService.testAllConnections();
    
    // 更新网络状态
    networkStatus.value.rpc = result.rpc.success ? 'connected' : 'disconnected';
    networkStatus.value.api = result.api.success ? 'connected' : 'disconnected';
    
    // 显示测试结果
    if (result.overall) {
      setStatus('✅ 网络连接正常！RPC和API服务都可用', 'success');
      console.log('✅ 所有服务正常');
      if (result.rpc.blockNumber) {
        console.log(`📦 当前区块高度: ${result.rpc.blockNumber}`);
      }
    } else {
      let errorMsg = '⚠️ 网络连接异常: ';
      if (!result.rpc.success) {
        errorMsg += `RPC节点失败(${result.rpc.message}); `;
      }
      if (!result.api.success) {
        errorMsg += `API服务失败(${result.api.message})`;
      }
      setStatus(errorMsg, 'error');
      console.error('❌ 部分服务不可用:', result);
    }
  } catch (error: any) {
    console.error('❌ 测试网络失败:', error);
    networkStatus.value.rpc = 'disconnected';
    networkStatus.value.api = 'disconnected';
    setStatus(`❌ 网络测试失败: ${error.message}`, 'error');
  }
};

// 注册或登录
const handleAuth = async () => {
  if (password.value.length < 6) {
    setStatus('密码至少需要6位字符', 'error');
    return;
  }

  isLoading.value = true;
  
  try {
    if (isRegistered.value) {
      // 登录
      setStatus('正在登录...', 'info');
      await aaService.login(password.value);
      setStatus('✅ 登录成功！', 'success');
    } else {
      // 注册 - 如果设备支持生物识别，自动尝试启用
      setStatus('正在注册并创建抽象账户...（这可能需要几秒钟）', 'info');
      const enableBiometric = biometricAvailable.value;
      
      try {
        await aaService.register(password.value, enableBiometric);
        isRegistered.value = true;
        
        // 检查是否成功启用了生物识别
        biometricEnabled.value = await aaService.isBiometricEnabled();
        
        if (biometricEnabled.value) {
          setStatus('✅ 注册成功！已启用指纹快速登录', 'success');
        } else {
          setStatus('✅ 注册成功！抽象账户已创建', 'success');
        }
      } catch (error: any) {
        // 如果是生物识别错误，但账户可能已创建，检查一下
        isRegistered.value = await aaService.isRegistered();
        if (isRegistered.value) {
          setStatus('✅ 注册成功！（未启用指纹）', 'success');
        } else {
          throw error; // 重新抛出真正的注册错误
        }
      }
    }

    // 登录成功，加载账户信息
    isLoggedIn.value = true;
    eoaAddress.value = aaService.getEOAAddress() || '';
    abstractAddress.value = aaService.getAbstractAccountAddress() || '';
    await refreshBalances();
    
  } catch (error: any) {
    console.error('操作失败:', error);
    setStatus(`❌ ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
  }
};

// 指纹登录
const handleBiometricLogin = async () => {
  isLoading.value = true;
  
  try {
    setStatus(`正在验证${biometricName.value}...`, 'info');
    
    // 直接使用账户抽象服务的指纹登录方法
    await aaService.loginWithBiometric();
    setStatus('✅ 登录成功！', 'success');

    // 登录成功，加载账户信息
    isLoggedIn.value = true;
    eoaAddress.value = aaService.getEOAAddress() || '';
    abstractAddress.value = aaService.getAbstractAccountAddress() || '';
    await refreshBalances();
    
  } catch (error: any) {
    console.error('指纹登录失败:', error);
    setStatus(`❌ ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
  }
};

// 刷新余额
const refreshBalances = async () => {
  try {
    setStatus('正在刷新余额...', 'info');
    balance.value = await aaService.getBalance();
    depositBalance.value = await aaService.getDepositBalance();
    setStatus('余额已刷新', 'success');
  } catch (error: any) {
    console.error('刷新余额失败:', error);
    setStatus(`刷新余额失败: ${error.message}`, 'error');
  }
};

// 发送交易
const handleSendTransaction = async () => {
  if (!txForm.value.to) {
    setStatus('请输入接收地址', 'error');
    return;
  }

  isLoading.value = true;
  
  try {
    setStatus('正在构建并提交UserOperation...', 'info');
    
    console.log('==== Vue层：准备发送交易 ====');
    console.log('表单数据:', txForm.value);
    console.log('金额输入值:', txForm.value.amount, '类型:', typeof txForm.value.amount);
    
    // 确保amount是字符串类型（HTML input type="number" 会返回数字）
    const amountStr = String(txForm.value.amount || '0');
    console.log('转换为字符串:', amountStr, '类型:', typeof amountStr);
    
    const parsedValue = ethers.parseEther(amountStr);
    console.log('parseEther结果:', parsedValue, '类型:', typeof parsedValue);
    
    const value = parsedValue.toString();
    console.log('toString结果:', value, '类型:', typeof value);
    
    const data = txForm.value.data || '0x';
    console.log('data:', data, '类型:', typeof data);
    
    console.log('调用executeTransaction，参数:');
    console.log('  - to:', txForm.value.to);
    console.log('  - value:', value);
    console.log('  - data:', data);
    
    const result = await aaService.executeTransaction(
      txForm.value.to,
      value,
      data
    );
    
    setStatus(
      `✅ 交易成功！哈希: ${result.txHash.substring(0, 10)}... 区块: ${result.blockNumber}`,
      'success'
    );
    
    // 刷新余额
    await refreshBalances();
    
    // 清空表单（确保使用字符串类型）
    txForm.value = { to: '', amount: '0', data: '0x' };
    
  } catch (error: any) {
    console.error('交易失败:', error);
    setStatus(`❌ 交易失败: ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
  }
};

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    setStatus('已复制到剪贴板', 'success');
  } catch (error) {
    setStatus('复制失败', 'error');
  }
};

// 设置状态消息
const setStatus = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  status.value = message;
  statusType.value = type;
};
</script>

<style scoped>
.aa-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 30px;
}

header h1 {
  font-size: 2rem;
  color: #2d3748;
  margin: 0 0 10px 0;
}

.subtitle {
  color: #718096;
  font-size: 1.1rem;
  margin: 0 0 15px 0;
}

/* 网络状态样式 */
.network-status {
  background-color: white;
  border-radius: 12px;
  padding: 15px;
  margin-top: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.network-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.network-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
}

.network-label {
  font-weight: 600;
  color: #4a5568;
  min-width: 40px;
}

.network-value {
  font-family: 'Courier New', monospace;
  color: #718096;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  font-size: 0.8rem;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  animation: pulse 2s ease-in-out infinite;
}

.status-indicator.connected {
  background-color: #48bb78;
  box-shadow: 0 0 8px rgba(72, 187, 120, 0.6);
}

.status-indicator.disconnected {
  background-color: #e53e3e;
  box-shadow: 0 0 8px rgba(229, 62, 62, 0.6);
}

.status-indicator.unknown {
  background-color: #a0aec0;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.test-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.test-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5568d3 0%, #653a8b 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.test-btn:disabled {
  background: linear-gradient(135deg, #a0aec0 0%, #718096 100%);
  cursor: not-allowed;
}

.container {
  background: white;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

h2 {
  font-size: 1.5rem;
  color: #2d3748;
  margin: 0 0 20px 0;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 10px;
}

.description {
  color: #718096;
  margin-bottom: 20px;
  line-height: 1.6;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #4299e1;
}

.primary-btn,
.secondary-btn,
.biometric-btn {
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn {
  background-color: #4299e1;
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background-color: #3182ce;
}

.primary-btn:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}

.secondary-btn {
  background-color: #e2e8f0;
  color: #4a5568;
  margin-top: 15px;
}

.secondary-btn:hover {
  background-color: #cbd5e0;
}

.biometric-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  margin-top: 12px;
}

.biometric-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5568d3 0%, #653a8b 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.biometric-btn:disabled {
  background: linear-gradient(135deg, #a0aec0 0%, #718096 100%);
  cursor: not-allowed;
}

.biometric-info {
  background-color: #fef5e7;
  border: 1px solid #f9e79f;
  border-radius: 8px;
  padding: 12px;
  margin-top: 15px;
  text-align: center;
}

.biometric-info p {
  margin: 0;
  color: #7d6608;
  font-size: 0.9rem;
}

.info-box {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-top: 20px;
}

.info-box h4 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
}

.info-box ul {
  margin: 0;
  padding-left: 20px;
}

.info-box li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-item label {
  display: block;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.address-display {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f7fafc;
  padding: 12px;
  border-radius: 8px;
}

.address {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  word-break: break-all;
  color: #2d3748;
}

.copy-btn {
  width: auto;
  padding: 8px 12px;
  background-color: #4299e1;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.copy-btn:hover {
  background-color: #3182ce;
}

.balance-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.balance-item label {
  display: block;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.balance {
  font-size: 1.5rem;
  font-weight: bold;
  color: #48bb78;
  background-color: #f7fafc;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.flow-steps {
  display: grid;
  gap: 15px;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 15px;
  background-color: #f7fafc;
  border-radius: 8px;
}

.step-number {
  width: 35px;
  height: 35px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.step-content h4 {
  margin: 0 0 5px 0;
  color: #2d3748;
}

.step-content p {
  margin: 0;
  color: #718096;
  font-size: 0.9rem;
}

.status-box {
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
  text-align: center;
}

.status-box.info {
  background-color: #bee3f8;
  border: 1px solid #90cdf4;
  color: #2c5282;
}

.status-box.success {
  background-color: #c6f6d5;
  border: 1px solid #9ae6b4;
  color: #22543d;
}

.status-box.error {
  background-color: #fed7d7;
  border: 1px solid #feb2b2;
  color: #742a2a;
}

.status-box p {
  margin: 0;
  word-wrap: break-word;
}

.info-container {
  background: linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%);
}

@media (max-width: 768px) {
  .balance-row {
    grid-template-columns: 1fr;
  }
}
</style>
