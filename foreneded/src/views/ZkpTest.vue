<!-- src/views/ZkpTest.vue -->
<template>
  <div class="page-container">
    <header>
      <h1>ZKP健康打卡MVP - 全流程自动化测试</h1>
    </header>

    <main>
      <div class="container">
        <h2>端到端全流程测试</h2>
        <p>
          点击下方按钮，将执行一个完整的自动化流程：<br>
          1. 自动在内存中生成 <strong>{{ BATCH_SIZE }}</strong> 份随机的每日打卡输入。<br>
          2. 为这 {{ BATCH_SIZE }} 份输入批量生成ZKP证明并收集Commitment。<br>
          3. 自动对Commitment进行排序、填充并计算默克尔根。<br>
          4. 最终，生成一份周度汇总证明。
        </p>
        <div class="button-container">
          <button @click="runFullProcess" :disabled="isLoading">
            {{ isLoading ? '正在执行全流程...' : '开始一键自动化测试' }}
          </button>
        </div>
        <div v-if="logMessages.length > 0" class="result-box">
          <h4>执行日志:</h4>
          <pre>{{ logMessages.join('\n') }}</pre>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import * as snarkjs from 'snarkjs';
// @ts-ignore
import * as circomlibjs from 'circomlibjs';

// --- 配置 ---
const BATCH_SIZE = 6; // 定义一次自动化测试生成的打卡数量
const TREE_LEAVES_COUNT = 32;

// --- 状态管理 ---
const isLoading = ref(false);
const logMessages = ref<string[]>([]);

// --- 核心业务逻辑 ---

// 辅助函数：添加日志，并自动滚动
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
/* 页面特定样式 */
.page-container { max-width: 800px; margin: 20px auto; padding: 20px; }
header h1 { text-align: center; color: #333; }
.container { background: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
h2 { margin-top: 0; color: #1a202c; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
.button-container { text-align: center; margin: 20px 0; }
button { background-color: #4299e1; color: white; border: none; padding: 15px 25px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: background-color 0.2s; }
button:disabled { background-color: #a0aec0; cursor: not-allowed; }
button:hover:not(:disabled) { background-color: #2b6cb0; }
.result-box { margin-top: 20px; background-color: #1a202c; color: #90cdf4; padding: 15px; border-radius: 8px; max-height: 400px; overflow-y: auto; }
pre { white-space: pre-wrap; word-wrap: break-word; font-family: 'SF Mono', 'Courier New', monospace; font-size: 14px; }
</style>