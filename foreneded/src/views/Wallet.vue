<!-- src/views/Wallet.vue -->
<template>
  <div class="page-container">
    <header>
      <h1>嵌入式钱包 MVP</h1>
    </header>
    <main>
      <!-- 钱包初始化模块 -->
      <div class="container" v-if="!walletAddress">
        <h2>钱包初始化</h2>
        <p class="description">
          {{ hasWallet ? '检测到设备上已存在加密钱包，请输入密码解锁。' : '未在设备上发现钱包，请输入一个安全密码来创建一个新的。' }}
        </p>
        <input v-model="password" type="password" placeholder="请输入密码" />
        <button @click="initializeWallet">
          {{ hasWallet ? '解锁钱包' : '创建新钱包' }}
        </button>
      </div>

      <!-- 钱包信息模块 -->
      <div class="container" v-else>
        <h2>钱包已就绪</h2>
        <div class="wallet-info">
          <p><strong>您的地址:</strong></p>
          <div class="address-display">
            <span>{{ walletAddress }}</span>
            <button class="copy-button" @click="copyAddress">复制</button>
          </div>
          <p><strong>rpcurl:</strong> <span class="url">{{ rpcurl }}</span></p>
          <p><strong>余额:</strong> <span class="balance">{{ balance }} ETH</span></p>
        </div>
        <button @click="fetchBalance">刷新余额</button>
      </div>

      <!-- 交易模块 -->
      <div class="container" v-if="walletAddress">
        <h2>发送交易</h2>
        <input v-model="recipient" placeholder="接收方地址 (0x...)" />
        <input v-model="amount" type="number" step="0.01" placeholder="金额 (ETH)" />
        <button @click="handleSendTransaction">发送</button>
      </div>
      
      <!-- 状态显示模块 -->
      <div class="status-box">
        <p><strong>状态:</strong> {{ status }}</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { walletService } from '../service/wallet'; // 导入我们的钱包服务
import { ethers } from 'ethers';

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
/* 全局样式 */
:root {
  --primary-color: #4299e1;
  --primary-hover-color: #2b6cb0;
  --background-color: #f0f2f5;
  --container-bg-color: #ffffff;
  --text-color: #2d3748;
  --secondary-text-color: #718096;
  --border-color: #e2e8f0;
  --success-color: #38a169;
  --error-color: #e53e3e;
}
.page-container {
  max-width: 600px;
  margin: 20px auto;
  padding: 0 20px;
}
header h1 {
  text-align: center;
  color: var(--text-color, #2d3748);
  font-weight: 600;
  margin-bottom: 30px;
}
.container {
  background: var(--container-bg-color, #ffffff);
  padding: 25px;
  border-radius: 12px;
  margin-bottom: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--border-color, #e2e8f0);
}
h2 {
  margin-top: 0;
  color: var(--text-color, #2d3748);
  font-size: 1.5em;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  padding-bottom: 15px;
  margin-bottom: 20px;
}
p { line-height: 1.6; }
.description {
  color: var(--secondary-text-color, #718096);
  font-size: 0.9em;
  margin-bottom: 20px;
}
input {
  width: 100%;
  padding: 12px 15px;
  border-radius: 8px;
  border: 1px solid var(--border-color, #e2e8f0);
  font-size: 1em;
  margin-bottom: 15px;
  box-sizing: border-box;
}
input:focus {
  outline: none;
  border-color: var(--primary-color, #4299e1);
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5);
}
button {
  display: block;
  width: 100%;
  background-color: var(--primary-color, #4299e1);
  color: white;
  border: none;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
}
button:disabled { background-color: #a0aec0; cursor: not-allowed; }
button:hover:not(:disabled) { background-color: var(--primary-hover-color, #2b6cb0); }
.wallet-info .address-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--background-color, #f0f2f5);
  padding: 8px 12px;
  border-radius: 6px;
  font-family: 'Courier New', Courier, monospace;
  word-break: break-all;
}
.wallet-info .balance { font-weight: bold; color: var(--success-color, #38a169); }
.copy-button {
  width: auto;
  padding: 6px 12px;
  font-size: 0.8em;
  margin-left: 10px;
  background-color: var(--secondary-text-color, #718096);
}
.copy-button:hover:not(:disabled) { background-color: var(--text-color, #2d3748); }
.status-box {
  background-color: #e2e8f0;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #cbd5e0;
}
.status-box p { margin: 0; font-weight: 500; word-wrap: break-word; }
</style>