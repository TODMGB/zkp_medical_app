// src/chain/client.js
// =======================================================
// 区块链客户端
// 提供以太坊 RPC 提供者和钱包实例
// 用于 Bundler 和 Paymaster 服务
// =======================================================
const { ethers } = require('ethers');
const config = require('../config');

/**
 * 创建以太坊 RPC 提供者
 * @returns {ethers.JsonRpcProvider} 返回 RPC 提供者实例
 */
function createProvider() {
  const rpc = config.ethconfig.ethNodeUrl || 'http://localhost:8545';
  return new ethers.JsonRpcProvider(rpc);
}

/**
 * 从私钥创建钱包
 * @param {string} pk - 私钥字符串
 * @returns {ethers.Wallet} 返回钱包实例
 */
function createWalletFromPrivateKey(pk) {
  const provider = createProvider();
  if (!pk) throw new Error('服务器钱包需要 PRIVATE_KEY');
  return new ethers.Wallet(pk, provider);
}

/**
 * 获取配置的钱包实例
 * 从配置文件中读取私钥并创建钱包
 * @returns {ethers.Wallet} 返回钱包实例
 */
function getWallet(){
  return createWalletFromPrivateKey(config.ethconfig.privateKey);
}

// 导出区块链客户端函数
module.exports = { 
  createProvider,  // 创建 RPC 提供者
  getWallet        // 获取钱包实例
};
