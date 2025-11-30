<template>
  <div class="aa-page">
    <header class="header">
      <div class="icon-wrapper">
        <ShieldCheck class="header-icon" />
      </div>
      <h1>ERC-4337 账户抽象</h1>
      <p class="subtitle">基于智能合约的账户系统</p>
      
      <!-- 网络状态 -->
      <div class="network-status">
        <div class="network-info">
          <div class="network-item">
            <span class="network-label">RPC</span>
            <span class="network-value" :class="networkStatus.rpc">
              {{ RPC_CONFIG.url }}
              <div class="status-dot" :class="networkStatus.rpc"></div>
            </span>
          </div>
          <div class="network-item">
            <span class="network-label">API</span>
            <span class="network-value" :class="networkStatus.api">
              {{ API_CONFIG.baseUrl }}
              <div class="status-dot" :class="networkStatus.api"></div>
            </span>
          </div>
        </div>
        <button @click="testConnection" :disabled="isLoading" class="btn btn-sm btn-outline">
          <Activity class="btn-icon-sm" :class="{ 'spin': isLoading }" />
          {{ isLoading ? '测试中...' : '测试网络' }}
        </button>
      </div>
    </header>

    <main>
      <!-- 未注册/未登录状态 -->
      <div class="card" v-if="!isLoggedIn">
        <div class="card-header">
          <User v-if="isRegistered" class="card-icon" />
          <UserPlus v-else class="card-icon" />
          <h2>{{ isRegistered ? '登录账户' : '注册新账户' }}</h2>
        </div>
        <p class="description">
          {{ isRegistered 
            ? '请输入密码以解锁您的账户' 
            : '首次使用，将为您创建一个智能合约账户（无需预存Gas）' 
          }}
        </p>

        <div class="form-group">
          <label>密码</label>
          <div class="input-wrapper">
            <input 
              v-model="password" 
              type="password" 
              placeholder="请输入密码（至少6位）"
              @keyup.enter="handleAuth"
              class="input"
            />
          </div>
        </div>

        <button 
          @click="handleAuth" 
          :disabled="isLoading || password.length < 6"
          class="btn btn-primary"
        >
          <LogIn v-if="isRegistered" class="btn-icon" />
          <UserPlus v-else class="btn-icon" />
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
          class="btn btn-biometric"
        >
          <Fingerprint class="btn-icon" />
          {{ isLoading ? '验证中...' : `使用${biometricName}登录` }}
        </button>

        <div class="biometric-info" v-if="isRegistered && biometricAvailable && !biometricEnabled">
          <Lightbulb class="info-icon" />
          <p>您可以启用{{ biometricName }}快速登录</p>
        </div>

        <div class="info-box" v-if="!isRegistered">
          <h4><HelpCircle class="info-icon-sm" /> 什么是账户抽象？</h4>
          <ul>
            <li><CheckCircle2 class="list-icon" /> 无需持有ETH即可使用（Gas由Paymaster支付）</li>
            <li><CheckCircle2 class="list-icon" /> 智能合约账户，支持社交恢复</li>
            <li><CheckCircle2 class="list-icon" /> 更安全的密钥管理方式</li>
            <li><CheckCircle2 class="list-icon" /> 一键部署，无需手动操作</li>
          </ul>
        </div>
      </div>

      <!-- 已登录状态 -->
      <div v-else>
        <!-- 账户信息 -->
        <div class="card">
          <div class="card-header">
            <User class="card-icon" />
            <h2>账户信息</h2>
          </div>
          
          <div class="account-info">
            <div class="info-item">
              <label>EOA地址（签名账户）</label>
              <div class="address-display">
                <span class="address">{{ eoaAddress }}</span>
                <button class="copy-btn" @click="copyToClipboard(eoaAddress)" title="复制">
                  <Copy class="icon-sm" />
                </button>
              </div>
            </div>

            <div class="info-item">
              <label>智能账户地址（抽象账户）</label>
              <div class="address-display">
                <span class="address">{{ abstractAddress }}</span>
                <button class="copy-btn" @click="copyToClipboard(abstractAddress)" title="复制">
                  <Copy class="icon-sm" />
                </button>
              </div>
            </div>

            <div class="balance-row">
              <div class="balance-item">
                <label>账户余额</label>
                <div class="balance">{{ balance }} <span class="unit">ETH</span></div>
              </div>
              <div class="balance-item">
                <label>EntryPoint存款</label>
                <div class="balance">{{ depositBalance }} <span class="unit">ETH</span></div>
              </div>
            </div>

            <button @click="refreshBalances" class="btn btn-secondary">
              <RefreshCw class="btn-icon" :class="{ 'spin': status.includes('刷新') }" />
              刷新余额
            </button>
          </div>
        </div>

        <!-- 发送交易 -->
        <div class="card">
          <div class="card-header">
            <Send class="card-icon" />
            <h2>发送交易</h2>
          </div>
          <p class="description">
            使用智能账户发送交易，Gas由Paymaster支付
          </p>

          <div class="form-group">
            <label>接收地址</label>
            <input 
              v-model="txForm.to" 
              placeholder="0x..."
              class="input"
            />
          </div>

          <div class="form-group">
            <label>金额 (ETH)</label>
            <input 
              v-model="txForm.amount" 
              type="number" 
              step="0.01"
              placeholder="0.1"
              class="input"
            />
          </div>

          <div class="form-group">
            <label>附加数据 (可选)</label>
            <input 
              v-model="txForm.data" 
              placeholder="0x (十六进制数据)"
              class="input"
            />
          </div>

          <button 
            @click="handleSendTransaction" 
            :disabled="isLoading || !txForm.to"
            class="btn btn-primary"
          >
            <Send class="btn-icon" />
            {{ isLoading ? '发送中...' : '发送交易' }}
          </button>
        </div>

        <!-- 流程说明 -->
        <div class="card info-card">
          <div class="card-header">
            <GitMerge class="card-icon" />
            <h2>账户抽象流程</h2>
          </div>
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
        <Info v-if="statusType === 'info'" class="status-icon" />
        <CheckCircle2 v-else-if="statusType === 'success'" class="status-icon" />
        <AlertTriangle v-else class="status-icon" />
        <p>{{ status }}</p>
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
import { 
  ShieldCheck, 
  Activity, 
  User, 
  UserPlus, 
  LogIn, 
  Fingerprint, 
  Lightbulb, 
  HelpCircle, 
  CheckCircle2, 
  Copy, 
  RefreshCw, 
  Send, 
  GitMerge, 
  Info, 
  AlertTriangle 
} from 'lucide-vue-next';

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
  isLoading.value = true;
  
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
  } finally {
    isLoading.value = false;
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
    
    // 确保amount是字符串类型
    const amountStr = String(txForm.value.amount || '0');
    const parsedValue = ethers.parseEther(amountStr);
    const value = parsedValue.toString();
    const data = txForm.value.data || '0x';
    
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
    
    // 清空表单
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

/* 网络状态样式 */
.network-status {
  background: var(--bg-surface);
  border-radius: var(--border-radius-lg);
  padding: 16px;
  margin-top: 16px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  width: 100%;
  max-width: 500px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.network-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.network-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
}

.network-label {
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 30px;
}

.network-value {
  font-family: 'SF Mono', monospace;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--gray-50);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--gray-400);
}

.status-dot.connected {
  background-color: var(--color-success);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.status-dot.disconnected {
  background-color: var(--color-danger);
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
  margin-bottom: 20px;
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

.input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  font-size: 1rem;
  transition: all 0.2s;
  background: var(--bg-body);
  color: var(--text-primary);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: var(--border-radius-lg);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 0.9rem;
  width: auto;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-outline:hover {
  background: var(--gray-50);
  border-color: var(--gray-300);
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
  margin-top: 16px;
}

.btn-secondary:hover {
  background: var(--gray-200);
}

.btn-biometric {
  background: #667eea;
  color: white;
  margin-top: 12px;
}

.btn-biometric:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-icon {
  width: 20px;
  height: 20px;
}

.btn-icon-sm {
  width: 16px;
  height: 16px;
}

.biometric-info {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: var(--border-radius-lg);
  padding: 12px;
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #b45309;
}

.info-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.info-box {
  background: #667eea;
  color: white;
  padding: 24px;
  border-radius: var(--border-radius-xl);
  margin-top: 24px;
}

.info-box h4 {
  margin: 0 0 16px 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-icon-sm {
  width: 18px;
  height: 18px;
}

.info-box ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.info-box li {
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.95rem;
}

.list-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.9;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-item label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.address-display {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--gray-50);
  padding: 12px;
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--border-color);
}

.address {
  flex: 1;
  font-family: 'SF Mono', monospace;
  font-size: 0.9rem;
  word-break: break-all;
  color: var(--text-primary);
}

.copy-btn {
  padding: 6px;
  background: transparent;
  color: var(--text-secondary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-btn:hover {
  background: var(--gray-200);
  color: var(--color-primary);
}

.icon-sm {
  width: 16px;
  height: 16px;
}

.balance-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.balance-item label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 6px;
  display: block;
}

.balance {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--primary-50);
  padding: 16px;
  border-radius: var(--border-radius-lg);
  text-align: center;
}

.unit {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 4px;
}

.info-card {
  background: var(--gray-50);
  border: none;
}

.flow-steps {
  display: grid;
  gap: 16px;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: var(--bg-surface);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--border-color);
}

.step-number {
  width: 32px;
  height: 32px;
  background: var(--primary-100);
  color: var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.step-content h4 {
  margin: 0 0 4px 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.step-content p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.status-box {
  padding: 16px;
  border-radius: var(--border-radius-lg);
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
}

.status-box.info {
  background: var(--primary-50);
  border: 1px solid var(--primary-200);
  color: var(--primary-700);
}

.status-box.success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
}

.status-box.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.status-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .balance-row {
    grid-template-columns: 1fr;
  }
  
  .network-status {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
