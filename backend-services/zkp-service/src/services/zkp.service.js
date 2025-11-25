// src/services/zkp.service.js
// =======================================================
// ZKP 证明生成服务
// =======================================================
const path = require('path');
const fs = require('fs');
const snarkjs = require('snarkjs');
const redis = require('../redis/client');
const { publishNotification } = require('../mq/producer');

// 任务状态存储在 Redis 中，带 TTL (1小时)
const JOB_TTL = 3600; // 1小时

/**
 * 核心函数：为单个输入生成零知识证明
 * @param {string} circuitName - 电路名称 (例如 'weeklySummary')
 * @param {object} inputs - 输入
 * @returns {Promise<object>} 证明结果
 */
async function generateProof(circuitName, inputs) {
  console.log(`[ZKP Service] 开始为 ${circuitName} 生成证明...`);
  
  try {
    const circuitDir = path.join(__dirname, '../../circuits', circuitName);
    const wasmPath = path.join(circuitDir, 'circuit_js', 'circuit.wasm');
    const zkeyPath = path.join(circuitDir, 'circuit_final.zkey');

    // 检查电路文件是否存在
    if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
      throw new Error(
        `电路文件未找到。请确保 'circuits/${circuitName}' 目录包含 circuit.wasm 和 circuit_final.zkey`
      );
    }

    // 生成证明
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      inputs,
      wasmPath,
      zkeyPath
    );
    console.log(`[ZKP Service] ${circuitName} 证明生成成功.`);

    // 生成 Solidity Calldata
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    console.log(`[ZKP Service] ${circuitName} Calldata 生成成功.`);

    return {
      success: true,
      message: '证明和 Calldata 生成成功!',
      calldata: calldata,
      proof: proof,
      publicSignals: publicSignals
    };
  } catch (error) {
    console.error(`[ZKP Service] ${circuitName} 证明任务失败:`, error.message);
    return {
      success: false,
      message: '证明生成失败',
      error: error.message
    };
  }
}

/**
 * 启动周度汇总证明生成任务（异步）
 * @param {string} jobId - 任务ID
 * @param {object} inputs - 输入数据
 * @param {string} userAddress - 用户地址
 */
async function startWeeklySummaryProof(jobId, inputs, userAddress) {
  const circuitName = 'weeklySummary';
  
  // 将任务初始状态存入 Redis
  await redis.set(
    `zkp:job:${jobId}`,
    JSON.stringify({
      status: 'processing',
      circuitName,
      userAddress,
      startTime: Date.now()
    }),
    'EX',
    JOB_TTL
  );
  
  console.log(`[ZKP Service] 任务 ${jobId} 开始处理 (用户: ${userAddress})...`);

  // 在后台执行耗时任务（不要 await）
  (async () => {
    try {
      const result = await generateProof(circuitName, inputs);
      
      // 更新任务状态
      const finalStatus = result.success ? 'completed' : 'failed';
      await redis.set(
        `zkp:job:${jobId}`,
        JSON.stringify({
          status: finalStatus,
          circuitName,
          userAddress,
          startTime: Date.now(),
          data: result
        }),
        'EX',
        JOB_TTL
      );
      
      console.log(`[ZKP Service] 任务 ${jobId} 已完成, 状态: ${finalStatus}`);

      // 如果成功，发送 MQ 消息通知
      if (result.success) {
        await publishNotification({
          type: 'zkp.proof.completed',
          priority: 'high',
          payload: {
            recipient_address: userAddress,
            title: 'ZKP证明生成成功',
            body: `您的 ${circuitName} ZKP证明已生成完成`,  // ✅ 改为 body
            data: {
              jobId,
              circuitName,
              publicSignals: result.publicSignals
            },
            channels: ['push', 'websocket']
          }
        });
        console.log(`[ZKP Service] 成功通知已发送到 MQ (任务 ${jobId})`);
      }

    } catch (error) {
      // 捕获意外错误
      await redis.set(
        `zkp:job:${jobId}`,
        JSON.stringify({
          status: 'failed',
          circuitName,
          userAddress,
          startTime: Date.now(),
          data: {
            success: false,
            message: '证明生成时发生严重错误',
            error: error.message
          }
        }),
        'EX',
        JOB_TTL
      );
      console.error(`[ZKP Service] 任务 ${jobId} 失败:`, error);
    }
  })();
}

/**
 * 获取任务状态
 * @param {string} jobId - 任务ID
 * @returns {Promise<object|null>} 任务状态对象，如果不存在则返回 null
 */
async function getJobStatus(jobId) {
  const jobData = await redis.get(`zkp:job:${jobId}`);
  
  if (!jobData) {
    return null;
  }

  const job = JSON.parse(jobData);

  // 如果任务已完成或失败，返回完整数据
  // 注意：我们不删除 Redis 中的数据，让其自动过期
  return job;
}

module.exports = {
  startWeeklySummaryProof,
  getJobStatus
};

