<!-- src/views/Wallet.vue -->
<template>
  <div class="page-container">
    <header class="header">
      <div class="icon-wrapper">
        <Wallet class="header-icon" />
      </div>
      <h1>嵌入式钱包 MVP</h1>
    </header>
    <main>
      <!-- 钱包初始化模块 -->
      <div class="card" v-if="!walletAddress">
        <div class="card-header">
          <Lock v-if="hasWallet" class="card-icon" />
          <PlusCircle v-else class="card-icon" />
          <h2>钱包初始化</h2>
        </div>
        <p class="description">
          {{ hasWallet ? '检测到设备上已存在加密钱包，请输入密码解锁。' : '未在设备上发现钱包，请输入一个安全密码来创建一个新的。' }}
        </p>
        <div class="input-group">
          <input v-model="password" type="password" placeholder="请输入密码" class="input" />
        </div>
        <button @click="initializeWallet" class="btn btn-primary">
          <Unlock v-if="hasWallet" class="btn-icon" />
          <Plus v-else class="btn-icon" />
          {{ hasWallet ? '解锁钱包' : '创建新钱包' }}
        </button>
      </div>

      <!-- 钱包信息模块 -->
      <div class="card" v-else>
        <div class="card-header">
          <CreditCard class="card-icon" />
          <h2>钱包已就绪</h2>
        </div>
        <div class="wallet-info">
          <div class="info-item">
            <span class="label">您的地址</span>
            <div class="address-display">
              <span class="address-text">{{ walletAddress }}</span>
              <button class="copy-button" @click="copyAddress" title="复制地址">
                <Copy class="icon-sm" />
              </button>
            </div>
          </div>
          <div class="info-item">
            <span class="label">RPC URL</span>
            <span class="value url">{{ rpcurl }}</span>
          </div>
          <div class="info-item balance-item">
            <span class="label">余额</span>
            <span class="balance">{{ balance }} ETH</span>
          </div>
        </div>
        <button @click="fetchBalance" class="btn btn-secondary">
          <RefreshCw class="btn-icon" :class="{ 'spin': status.includes('获取余额') }" />
          刷新余额
        </button>
      </div>

      <!-- 交易模块 -->
      <div class="card" v-if="walletAddress">
        <div class="card-header">
          <Send class="card-icon" />
          <h2>发送交易</h2>
        </div>
        <div class="form-group">
          <div class="input-wrapper">
            <input v-model="recipient" placeholder="接收方地址 (0x...)" class="input" />
          </div>
          <div class="input-wrapper">
            <input v-model="amount" type="number" step="0.01" placeholder="金额 (ETH)" class="input" />
          </div>
          <button @click="handleSendTransaction" class="btn btn-primary">
            <Send class="btn-icon" />
            发送
          </button>
        </div>
      </div>
      
      <!-- 状态显示模块 -->
      <div class="status-box" :class="{ 'error': status.includes('错误') || status.includes('失败'), 'success': status.includes('成功') || status.includes('✅') }">
        <Info class="status-icon" />
        <p>{{ status }}</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { walletService } from '../service/wallet'; // 导入我们的钱包服务
import { ethers } from 'ethers';
import { 
  Wallet, 
  Lock, 
  Unlock, 
  PlusCircle, 
  Plus, 
  CreditCard, 
  Copy, 
  RefreshCw, 
  Send, 
  Info 
} from 'lucide-vue-next';

const password = ref('');
const walletAddress = ref<string | null>(null);
const balance = ref('...');
const hasWallet = ref(false);
const status = ref('等待初始化...');
const rpcurl = walletService.getrpcurl();

const recipient = ref('');
const amount = ref('');

onMounted(async () => {
  hasWallet.value = await walletService.walletExists();
  status.value = hasWallet.value ? '检测到现有钱包，请输入密码解锁。' : '未发现钱包，请输入密码以创建一个新的。';
});

const initializeWallet = async () => {
  if (!password.value) {
    status.value = '错误：密码不能为空！';
    return;
  }
  status.value = '正在初始化钱包...';
  try {
    await walletService.init(password.value);
    walletAddress.value = walletService.address;
    status.value = '钱包已成功加载！';
    await fetchBalance();
  } catch (e: any) {
    status.value = `错误: ${e.message}`;
  }
};

const fetchBalance = async () => {
  if (walletService.wallet) {
    status.value = '正在获取余额...';
    try {
      const bal = await walletService.getBalance();
      balance.value = bal // 格式化并保留5位小数
      status.value = '余额已刷新。';
    } catch (e: any) {
      status.value = `获取余额失败: ${e.message}`;
    }
  }
};

const handleSendTransaction = async () => {
  if (!recipient.value || !amount.value) {
    status.value = '错误：接收地址和金额不能为空！';
    return;
  }
  status.value = `正在发送 ${amount.value} ETH...`;
  try {
    const txResponse = await walletService.sendTransaction(recipient.value, amount.value);
    status.value = `交易已发送！等待区块链确认... 哈希: ${txResponse.hash.substring(0, 10)}...`;
    const receipt = await txResponse.wait();
    status.value = `✅ 交易已确认！区块号: ${receipt?.blockNumber}`;
    await fetchBalance();
  } catch(e: any) {
    status.value = `❌ 交易失败: ${e.message}`;
  }
};

const copyAddress = async () => {
    if (walletAddress.value) {
        try {
            await navigator.clipboard.writeText(walletAddress.value);
            status.value = '地址已复制到剪贴板！';
        } catch (err) {
            status.value = '复制失败，请手动复制。';
        }
    }
};
</script>

<style scoped>
.page-container {
  max-width: 600px;
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
  gap: 16px;
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
}

.header-icon {
  width: 32px;
  height: 32px;
  color: white;
}

.header h1 {
  color: var(--text-primary);
  font-weight: 700;
  font-size: 1.5rem;
  margin: 0;
}

.card {
  background: var(--bg-surface);
  padding: 24px;
  border-radius: var(--border-radius-xl);
  margin-bottom: 24px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
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
  margin: 0;
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 600;
}

.description {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin-bottom: 24px;
  line-height: 1.6;
}

.input {
  width: 100%;
  padding: 12px 16px;
  border-radius: var(--border-radius-lg);
  border: 2px solid var(--border-color);
  font-size: 1rem;
  background: var(--bg-body);
  color: var(--text-primary);
  transition: all 0.2s ease;
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
  padding: 14px 24px;
  border-radius: var(--border-radius-lg);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--gray-100);
  color: var(--text-primary);
  margin-top: 16px;
}

.btn-secondary:hover {
  background: var(--gray-200);
}

.btn-icon {
  width: 20px;
  height: 20px;
}

.wallet-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.address-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--gray-50);
  padding: 12px;
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--border-color);
}

.address-text {
  font-family: 'SF Mono', 'Roboto Mono', monospace;
  font-size: 0.9rem;
  color: var(--text-primary);
  word-break: break-all;
}

.copy-button {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-button:hover {
  background: var(--gray-200);
  color: var(--color-primary);
}

.icon-sm {
  width: 16px;
  height: 16px;
}

.value {
  font-size: 1rem;
  color: var(--text-primary);
  font-weight: 500;
}

.url {
  word-break: break-all;
  font-family: monospace;
}

.balance-item .balance {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-box {
  background: var(--gray-50);
  padding: 16px;
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border-color);
  margin-top: 24px;
}

.status-box.error {
  background: #fef2f2;
  border-color: #fee2e2;
  color: #ef4444;
}

.status-box.success {
  background: #ecfdf5;
  border-color: #d1fae5;
  color: #10b981;
}

.status-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.status-box p {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>