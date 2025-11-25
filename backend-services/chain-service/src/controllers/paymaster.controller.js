// src/controllers/paymaster.controller.js
// =======================================================
// Paymaster 控制器
// 处理 Paymaster 相关请求（账户创建、链上操作等）
// =======================================================
const paymasterService = require('../services/paymaster.service');

/**
 * 验证 Paymaster UserOperation
 * @param {object} req - Express 请求对象
 * @param {object} res - Express 响应对象
 * @param {function} next - Express next 函数
 */
async function validatePaymaster(req, res, next) {
  try {
    const { userOp } = req.body;
    // 验证 Paymaster 操作
    const validation = await paymasterService.validatePaymasterUserOp(userOp);
    res.json({ ok: true, validation });
  } catch (err) {
    next(err);
  }
}

/**
 * Paymaster 充值
 * 向 Paymaster 合约充值 ETH，用于支付 gas 费
 * @param {object} req - Express 请求对象
 * @param {object} res - Express 响应对象
 * @param {function} next - Express next 函数
 */
async function deposit(req, res, next) {
  try {
    const { amount } = req.body;
    // 充值到 Paymaster
    const tx = await paymasterService.deposit(amount);
    res.json({ ok: true, txHash: tx.hash });
  } catch (err) {
    next(err);
  }
}

/**
 * 创建智能账户
 * 通过 AccountFactory 创建新的 Smart Account
 * @param {object} req - Express 请求对象
 * @param {object} res - Express 响应对象
 * @param {function} next - Express next 函数
 */
async function createAccount(req, res, next) {
  try {
    const { owner, salt } = req.body;
    // 创建智能账户
    const tx = await paymasterService.createAccount(owner, salt);
    res.json({ ok: true, txHash: tx.hash });
  } catch (err) {
    next(err);
  }
}

/**
 * 获取智能账户地址
 * 根据 owner 和 salt 计算智能账户地址（不创建）
 * @param {object} req - Express 请求对象
 * @param {object} res - Express 响应对象
 * @param {function} next - Express next 函数
 */
async function getAccountAddress(req, res, next) {
  try {
    const { owner, salt } = req.query;
    // 计算账户地址
    const address = await paymasterService.getAccountAddress(owner, salt);
    res.json({ ok: true, address });
  } catch (err) {
    next(err);
  }
}

/**
 * 构建 InitCode
 * 生成创建智能账户的 initCode（用于 UserOperation）
 * @param {object} req - Express 请求对象
 * @param {object} res - Express 响应对象
 * @param {function} next - Express next 函数
 */
async function buildInitCode(req, res, next) {
  try {
    const { owner, salt } = req.body;
    // 构建 initCode
    const initCode = await paymasterService.buildInitCode(owner, salt);
    res.json({ ok: true, initCode });
  } catch (err) {
    next(err);
  }
}

/**
 * 获取账户 Nonce
 * 从 EntryPoint 合约获取指定账户的 nonce
 * @param {object} req - Express 请求对象
 * @param {object} res - Express 响应对象
 * @param {function} next - Express next 函数
 */
async function getNonce(req, res, next) {
  try {
    const { sender } = req.query;
    // 获取 nonce
    const nonce = await paymasterService.getNonce(sender);
    res.json({ ok: true, nonce: nonce.toString() });
  } catch (err) {
    next(err);
  }
}

// 导出 Paymaster 控制器函数
module.exports = { 
  validatePaymaster,    // 验证 Paymaster
  deposit,              // 充值
  createAccount,        // 创建账户
  getAccountAddress,    // 获取账户地址
  buildInitCode,        // 构建 InitCode
  getNonce              // 获取 Nonce
};
