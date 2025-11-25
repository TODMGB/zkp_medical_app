// src/services/paymaster.service.js
// =======================================================
// Paymaster 服务
// 处理智能账户创建、Paymaster 操作等业务逻辑
// =======================================================
const { getWallet } = require('../chain/client');
const { ethers } = require('ethers');
const addresses = require('../../smart_contract/addresses.json');

// 获取钱包实例（用于签名交易）
const wallet = getWallet();

// 从 addresses.json 加载合约地址和 ABI
const ACCOUNT_FACTROY = addresses.SocialRecoveryAccountFactory.address;  // 账户工厂合约地址
const PAYMASTER_ADDRESS = addresses.SimplePaymaster.address;             // Paymaster 合约地址
const ENTRYPOINT_ADDRESS = addresses.EntryPoint.address;                 // EntryPoint 合约地址

const paymasterAbi = addresses.SimplePaymaster.abi;
const accountFactoryAbi = addresses.SocialRecoveryAccountFactory.abi;
const entryPointAbi = addresses.EntryPoint.abi;

// 创建合约实例
const paymasterContract = new ethers.Contract(PAYMASTER_ADDRESS, paymasterAbi, wallet);
const accountFactoryContract = new ethers.Contract(ACCOUNT_FACTROY, accountFactoryAbi, wallet);
const entryPointContract = new ethers.Contract(ENTRYPOINT_ADDRESS, entryPointAbi, wallet);

/**
 * 验证 Paymaster UserOperation
 * @param {object} userOp - 用户操作对象
 * @returns {Promise<object>} 返回验证结果
 */
async function validatePaymasterUserOp(userOp) {
  if (!userOp || !userOp.sender) throw new Error('无效的 userOp');
  console.log('[Paymaster] 验证请求:', userOp.sender);
  // 原型实现：返回简单的上下文和 validationData=0
  return { context: 'proto-context', validationData: 0 };
}

/**
 * 创建智能账户（社交恢复账户，无守护者）
 * 通过 SocialRecoveryAccountFactory 合约创建新的 Smart Account
 * 注意：此方法创建无守护者的账户，如需守护者请使用 recovery.service.js
 * @param {string} owner - 账户所有者地址（EOA）
 * @param {number|bigint} salt - 随机数盐值，用于生成不同地址
 * @returns {Promise<object>} 返回交易回执
 */
async function createAccount(owner, salt) {
  // 社交恢复账户工厂需要 guardians 和 threshold 参数
  const tx = await accountFactoryContract.createAccount(owner, [], 0, salt);
  const receipt = await tx.wait();
  return receipt;
}

/**
 * 向 Paymaster 充值
 * 充值 ETH 到 Paymaster 合约，用于代付 gas 费
 * @param {number|string} amount - 充值金额（wei）
 * @returns {Promise<object>} 返回交易回执
 */
async function deposit(amount) {
  const value = BigInt(amount || 0);
  if (value <= 0n) throw new Error('充值金额必须大于 0');
  const tx = await paymasterContract.deposit({ value });
  const receipt = await tx.wait();
  return receipt;
}

/**
 * 获取智能账户地址
 * 根据 owner 和 salt 计算智能账户地址（不在链上创建）
 * 注意：此方法计算无守护者账户的地址
 * @param {string} owner - 账户所有者地址
 * @param {number|bigint} salt - 随机数盐值
 * @returns {Promise<string>} 返回智能账户地址
 */
async function getAccountAddress(owner, salt) {
  if (!owner) throw new Error('缺少 owner 参数');
  const s = salt != null ? BigInt(salt) : 0n;
  // 社交恢复账户工厂需要 guardians 和 threshold 参数
  const addr = await accountFactoryContract.getAccountAddress(owner, [], 0, s);
  return addr;
}

/**
 * 构建 InitCode
 * 生成创建智能账户的 initCode，用于 UserOperation
 * 注意：此方法构建无守护者账户的 initCode
 * @param {string} owner - 账户所有者地址
 * @param {number|bigint} salt - 随机数盐值
 * @returns {Promise<string>} 返回 initCode（十六进制字符串）
 */
async function buildInitCode(owner, salt) {
  if (!owner) throw new Error('缺少 owner 参数');
  const s = salt != null ? BigInt(salt) : 0n;
  // 编码 createAccount 函数调用（社交恢复账户需要 guardians 和 threshold）
  const encoded = accountFactoryContract.interface.encodeFunctionData('createAccount', [owner, [], 0, s]);
  // initCode = AccountFactory 地址 + 编码后的函数调用
  const initCode = ethers.concat([ACCOUNT_FACTROY, encoded]);
  return initCode;
}

/**
 * 获取账户 Nonce
 * 从 EntryPoint 合约获取指定账户的当前 nonce
 * @param {string} sender - 账户地址
 * @returns {Promise<bigint>} 返回 nonce 值
 */
async function getNonce(sender) {
  if (!sender) throw new Error('缺少 sender 参数');
  const nonce = await entryPointContract.getNonce(sender);
  return nonce;
}

// 导出 Paymaster 服务函数
module.exports = { 
  validatePaymasterUserOp,  // 验证 Paymaster UserOp
  deposit,                  // 充值
  createAccount,            // 创建账户
  getAccountAddress,        // 获取账户地址
  buildInitCode,            // 构建 InitCode
  getNonce                  // 获取 Nonce
};
