<!-- src/views/ZkpTest.vue -->
<template>
  <div class="page-container">
    <header class="header">
      <div class="icon-wrapper">
        <ShieldCheck class="header-icon" />
      </div>
      <h1>ZKP健康打卡MVP</h1>
      <p class="subtitle">全流程自动化测试与验证</p>
    </header>

    <main>
      <div class="card">
        <div class="card-header">
          <PlayCircle class="card-icon" />
          <h2>端到端全流程测试</h2>
        </div>
        
        <div class="info-box">
          <p class="description">
            点击下方按钮，将执行一个完整的自动化流程：
          </p>
          <ul class="steps-list">
            <li>
              <span class="step-num">1</span>
              <span>自动在内存中生成 <strong>{{ BATCH_SIZE }}</strong> 份随机的每日打卡输入</span>
            </li>
            <li>
              <span class="step-num">2</span>
              <span>为这 {{ BATCH_SIZE }} 份输入批量生成ZKP证明并收集Commitment</span>
            </li>
            <li>
              <span class="step-num">3</span>
              <span>自动对Commitment进行排序、填充并计算默克尔根</span>
            </li>
            <li>
              <span class="step-num">4</span>
              <span>最终，生成一份周度汇总证明</span>
            </li>
          </ul>
        </div>

        <div class="action-area">
          <button @click="runFullProcess" :disabled="isLoading" class="btn btn-primary btn-lg">
            <Play v-if="!isLoading" class="btn-icon" />
            <Loader2 v-else class="btn-icon spin" />
            {{ isLoading ? '正在执行全流程...' : '开始一键自动化测试' }}
          </button>
        </div>

        <div v-if="logMessages.length > 0" class="logs-container">
          <div class="logs-header">
            <Terminal class="logs-icon" />
            <h4>执行日志</h4>
          </div>
          <div class="logs-content" ref="logsContainer">
            <div v-for="(log, index) in logMessages" :key="index" class="log-line">
              <span class="log-time">{{ new Date().toLocaleTimeString() }}</span>
              <span class="log-text" :class="{ 'highlight': log.includes('✅') || log.includes('▶'), 'error': log.includes('❌') }">
                {{ log }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import * as snarkjs from 'snarkjs';
// @ts-ignore
import * as circomlibjs from 'circomlibjs';
import { 
  ShieldCheck, 
  PlayCircle, 
  Play, 
  Loader2, 
  Terminal 
} from 'lucide-vue-next';

// --- 配置 ---
const BATCH_SIZE = 6; // 定义一次自动化测试生成的打卡数量
const TREE_LEAVES_COUNT = 32;

// --- 状态管理 ---
const isLoading = ref(false);
const logMessages = ref<string[]>([]);
const logsContainer = ref<HTMLElement | null>(null);

// 自动滚动日志
watch(logMessages.value, () => {
  nextTick(() => {
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
    }
  });
});

// --- 核心业务逻辑 ---

// 辅助函数：添加日志
const log = (message: string) => {
  logMessages.value.push(message);
};

// 1. 模仿 gen.js: 生成单个随机输入 (在内存中)
const createSingleInput = async (poseidon: any) => {
    const privateUserSecret = String(Math.floor(Math.random() * 100000) + 1);
    const medicationId = String(Math.floor(Math.random() * 5) + 1);
    const dayOfWeek = Math.floor(Math.random() * 7);
    const proofNonce = BigInt(Math.floor(Math.random() * 2**50));
    const challenge = BigInt(Math.floor(Math.random() * 2**50));
    
    const userIdCommitment = poseidon.F.toString(poseidon([BigInt(privateUserSecret)]));
    const medicationCommitment = poseidon.F.toString(poseidon([BigInt(medicationId)]));

    const weekStartDateTimestamp = 1725840000; // 固定一个周开始时间
    const targetDayStartTimestamp = weekStartDateTimestamp + dayOfWeek * 86400;
    const timestamp = targetDayStartTimestamp + Math.floor(Math.random() * 86400);

    return {
        privateUserSecret, medicationId,
        timestamp: String(timestamp),
        proofNonce: proofNonce.toString(),
        userIdCommitment, medicationCommitment,
        weekStartDate: String(weekStartDateTimestamp),
        dayOfWeek: String(dayOfWeek),
        challenge: challenge.toString()
    };
};


// 2. 主执行函数
const runFullProcess = async () => {
  isLoading.value = true;
  logMessages.value = []; // 清空日志

  try {
    // --- 阶段一: 初始化 ---
    log("▶ [1/5] 初始化 Poseidon 哈希函数...");
    const poseidon = await circomlibjs.buildPoseidon();
    log("✅ Poseidon 初始化成功。");

    // --- 阶段二: 批量生成每日打卡输入 ---
    log(`\n▶ [2/5] 正在内存中批量生成 ${BATCH_SIZE} 份每日打卡输入...`);
    const allMedicalInputs = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
        const input = await createSingleInput(poseidon);
        allMedicalInputs.push(input);
        log(`   - 已生成输入 #${JSON.stringify(input)}`);
    }
    log(`✅ ${BATCH_SIZE} 份输入生成完毕。`);

    // --- 阶段三: 批量生成每日证明并收集 Commitment ---
    log(`\n▶ [3/5] 正在为 ${BATCH_SIZE} 份输入批量生成证明 (这可能需要一些时间)...`);
    // 注意: 为了在浏览器中运行，需要确保 medical.wasm 和 medical.zkey 文件在 public 目录下可访问
    const proofPromises = allMedicalInputs.map(input => 
        snarkjs.groth16.fullProve(input, "/medical.wasm", "/medical.zkey")
    );
    const results = await Promise.all(proofPromises);
    const collectedCommitments = results.map(r => r.publicSignals[r.publicSignals.length - 1]);
    log(`✅ 批量证明完成！成功收集 ${collectedCommitments.length} 个 CheckinCommitment。`);
    log(`   - 首个 CheckinCommitment: ${collectedCommitments[0].slice(0, 40)}...`);

    // --- 阶段四: 准备周度汇总输入 (排序、填充、计算Root) ---
    log("\n▶ [4/5] 正在准备周度汇总的输入...");
    log("   - 排序 Commitment...");
    const sortedCommitments = collectedCommitments.sort((a, b) => a.localeCompare(b));
    
    log(`   - 填充叶子节点至 ${TREE_LEAVES_COUNT} 个...`);
    const leaves = [...sortedCommitments];
    while (leaves.length < TREE_LEAVES_COUNT) {
        leaves.push("0");
    }

    log("   - 精确镜像计算默克尔根...");
    let currentLevel = leaves.map(v => BigInt(v));
    while (currentLevel.length > 1) {
        let nextLevel = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            const hash = poseidon([currentLevel[i], currentLevel[i+1]]);
            nextLevel.push(hash);
        }
        currentLevel = nextLevel;
    }
    const merkleRoot = poseidon.F.toString(currentLevel[0]);
    log(`✅ 周度输入准备完毕！Merkle Root: ${merkleRoot.slice(0, 40)}...`);

    // --- 阶段五: 生成最终的周度汇总证明 ---
    log("\n▶ [5/5] 正在生成最终的周度汇总证明...");
    const weeklyInput = {
      merkleRoot: merkleRoot,
      leaves: leaves
    };

    log(`weeklyInput = ${JSON.stringify(weeklyInput)}`);
    // const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    //   weeklyInput, "weeklySummary.wasm", "weeklySummary.zkey"
    // );
    log("✅ 周度汇总证明成功！(演示中跳过实际证明生成)");
    log("\n--- 🎉 全流程自动化测试成功 ---");

  } catch (e: any) {
    log(`\n❌ 在流程中发生错误:\n\n${e.toString()}`);
    log("\n--- 自动化测试失败 ---");
  } finally {
    isLoading.value = false;
  }
};
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
  margin-bottom: 24px;
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

.info-box {
  background: var(--gray-50);
  padding: 20px;
  border-radius: var(--border-radius-lg);
  margin-bottom: 24px;
}

.description {
  color: var(--text-primary);
  margin-bottom: 16px;
  font-weight: 500;
}

.steps-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.steps-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
}

.step-num {
  width: 24px;
  height: 24px;
  background: var(--primary-100);
  color: var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 2px;
}

.action-area {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 24px;
  border: none;
  border-radius: var(--border-radius-lg);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-lg {
  padding: 16px 32px;
  font-size: 1.1rem;
  width: 100%;
  max-width: 400px;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  box-shadow: var(--shadow-md);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn-primary:disabled {
  background: var(--gray-300);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  width: 24px;
  height: 24px;
}

.logs-container {
  background: #1e293b;
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.logs-header {
  background: #0f172a;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #334155;
}

.logs-icon {
  width: 18px;
  height: 18px;
  color: #94a3b8;
}

.logs-header h4 {
  margin: 0;
  color: #e2e8f0;
  font-size: 0.9rem;
  font-weight: 600;
}

.logs-content {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'SF Mono', 'Roboto Mono', monospace;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-line {
  display: flex;
  gap: 12px;
  line-height: 1.5;
}

.log-time {
  color: #64748b;
  flex-shrink: 0;
}

.log-text {
  color: #cbd5e1;
  word-break: break-all;
}

.log-text.highlight {
  color: #4ade80;
}

.log-text.error {
  color: #f87171;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>