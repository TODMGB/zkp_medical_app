// src/services/bundler.service.js
// =======================================================
// Bundler 服务
// 处理 ERC4337 UserOperation 的打包和提交
// =======================================================
const { getWallet } = require('../chain/client');
const { ethers } = require('ethers');
const addresses = require('../../smart_contract/addresses.json');

// 获取钱包实例（用于签名交易）
const wallet = getWallet();
// EntryPoint 合约地址（ERC4337 核心合约）
const ENTRYPOINT_ADDRESS = addresses.EntryPoint.address;
const entryAbi = addresses.EntryPoint.abi;

// 创建 EntryPoint 合约实例
const entryContract = new ethers.Contract(ENTRYPOINT_ADDRESS, entryAbi, wallet);

/**
 * 规范化 UserOperation 对象
 * 确保所有数值字段为 BigInt 类型，字节字段为十六进制字符串
 * @param {object} u - 原始 UserOperation 对象
 * @returns {object} 规范化后的 UserOperation
 */
function normalizeUserOp(u) {
  // 将数值字段转换为 BigInt，字节字段保持为十六进制字符串
  return {
    sender: u.sender,                                    // 发送者地址（Smart Account）
    nonce: u.nonce != null ? BigInt(u.nonce) : 0n,      // 随机数
    initCode: u.initCode && u.initCode !== '' ? u.initCode : '0x',  // 初始化代码（创建账户时用）
    callData: u.callData && u.callData !== '' ? u.callData : '0x',  // 调用数据
    callGasLimit: u.callGasLimit != null ? BigInt(u.callGasLimit) : 0n,  // 调用 gas 限制
    verificationGasLimit: u.verificationGasLimit != null ? BigInt(u.verificationGasLimit) : 0n,  // 验证 gas 限制
    preVerificationGas: u.preVerificationGas != null ? BigInt(u.preVerificationGas) : 0n,  // 预验证 gas
    maxFeePerGas: u.maxFeePerGas != null ? BigInt(u.maxFeePerGas) : 0n,  // 每 gas 最大费用
    maxPriorityFeePerGas: u.maxPriorityFeePerGas != null ? BigInt(u.maxPriorityFeePerGas) : 0n,  // 优先费
    paymasterAndData: u.paymasterAndData && u.paymasterAndData !== '' ? u.paymasterAndData : '0x',  // Paymaster 数据
    signature: u.signature && u.signature !== '' ? u.signature : '0x',  // 签名
  };
}

/**
 * 处理并提交 UserOperation
 * 将 UserOperation 打包并提交到 EntryPoint 合约
 * @param {object} userOp - 用户操作对象
 * @returns {Promise<object>} 返回交易结果
 */
async function handleSubmit(userOp) {
  console.log('[Bundler] 收到 UserOp:', userOp?.sender || userOp);
  if (!userOp) throw new Error('UserOp 不能为空');

  // 在真实的 Bundler 中，这里应该：验证签名、估算 gas、批量处理多个 UserOps
  const normalized = normalizeUserOp(userOp);

  // 设置受益人地址（默认使用钱包地址）
  const beneficiary = await wallet.getAddress();

  // 调用 EntryPoint.handleOps 方法，传入单个 UserOp
  const tx = await entryContract.handleOps([normalized], beneficiary);

  console.log('[Bundler] 已提交交易，hash:', tx.hash);
  // 等待交易确认
  const receipt = await tx.wait();
  
  // 返回交易结果
  return {
    txHash: tx.hash,                                    // 交易哈希
    blockNumber: receipt.blockNumber,                   // 区块号
    gasUsed: receipt.gasUsed?.toString?.() || receipt.gasUsed,  // 使用的 gas
    status: receipt.status,                             // 状态（1=成功，0=失败）
    logs: receipt.logs?.length || 0                     // 日志数量
  };
}

// 导出 Bundler 服务函数
module.exports = { handleSubmit };
