// src/services/medication-checkin.service.js
// =======================================================
// 用药打卡上链服务
// 处理 UserOp 构建、签名和提交
// =======================================================

const { ethers } = require('ethers');
const { handleSubmit } = require('./bundler.service');
const addresses = require('../../smart_contract/addresses.json');
const { getWallet } = require('../chain/client');
const config = require('../config');
const { publishMedicationCheckInNotification } = require('../mq/producer');

// 获取合约地址和 ABI
const SIMPLE_ACCOUNT_ABI = addresses.SimpleAccount.abi;
const ENTRYPOINT_ADDRESS = addresses.EntryPoint.address;
const PAYMASTER_ADDRESS = addresses.SimplePaymaster?.address;

// 获取钱包
const wallet = getWallet();

/**
 * 构建 recordMedicationCheckIn 的 callData
 * @param {string} ipfsCid - IPFS CID
 * @returns {string} 编码的 callData
 */
function buildRecordMedicationCheckInCallData(ipfsCid) {
  const iface = new ethers.Interface(SIMPLE_ACCOUNT_ABI);
  return iface.encodeFunctionData('recordMedicationCheckIn', [ipfsCid]);
}

/**
 * 构建 UserOp
 * @param {string} senderAddress - 发送者地址（Smart Account）
 * @param {string} callData - 调用数据
 * @returns {Promise<object>} UserOp 对象
 */
async function buildUserOp(senderAddress, callData) {
  try {
    if (!senderAddress || !callData) {
      throw new Error(`缺少必要参数: senderAddress=${senderAddress}, callData=${callData}`);
    }

    console.log(`[MedicationCheckIn] 构建 UserOp，sender: ${senderAddress}`);

    // 获取当前 nonce
    const provider = wallet.provider;
    const entryPointContract = new ethers.Contract(
      ENTRYPOINT_ADDRESS,
      addresses.EntryPoint.abi,
      provider
    );

    console.log(`[MedicationCheckIn] 获取 nonce...`);
    let nonce;
    try {
      // 部分 EntryPoint 版本需要一个 key 参数（如 v0.6），部分只接受地址（如 v0.7）
      nonce = await entryPointContract.getNonce(senderAddress, 0);
    } catch (error) {
      if (error.code === 'UNSUPPORTED_OPERATION' || error.shortMessage?.includes('no matching fragment')) {
        nonce = await entryPointContract.getNonce(senderAddress);
      } else {
        throw error;
      }
    }
    console.log(`[MedicationCheckIn] nonce: ${nonce}`);

    // 估算 gas
    const callGasLimit = ethers.toBeHex(100000); // 根据实际情况调整
    const verificationGasLimit = ethers.toBeHex(100000);
    const preVerificationGas = ethers.toBeHex(50000);

    // 获取 gas 价格
    console.log(`[MedicationCheckIn] 获取 gas 价格...`);
    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas || ethers.toBeHex(1000000000);
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.toBeHex(1000000000);
    console.log(`[MedicationCheckIn] maxFeePerGas: ${maxFeePerGas}, maxPriorityFeePerGas: ${maxPriorityFeePerGas}`);

    // 构建 UserOp
    const userOp = {
      sender: senderAddress,
      nonce: nonce.toString(),
      initCode: '0x',
      callData,
      callGasLimit: callGasLimit.toString(),
      verificationGasLimit: verificationGasLimit.toString(),
      preVerificationGas: preVerificationGas.toString(),
      maxFeePerGas: maxFeePerGas.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
      paymasterAndData: PAYMASTER_ADDRESS || '0x',
      signature: '0x'
    };

    console.log('[MedicationCheckIn] UserOp 构建成功:', JSON.stringify(userOp, null, 2));
    return userOp;
  } catch (error) {
    console.error('[MedicationCheckIn] UserOp 构建失败:', error);
    throw error;
  }
}

/**
 * 签名 UserOp
 * @param {object} userOp - UserOp 对象（不包含 signature 字段）
 * @returns {Promise<string>} 签名
 */
async function signUserOp(userOp) {
  try {
    // 计算 UserOp 哈希
    const provider = wallet.provider;
    const entryPointContract = new ethers.Contract(
      ENTRYPOINT_ADDRESS,
      addresses.EntryPoint.abi,
      provider
    );

    // 创建不包含 signature 的 UserOp 副本用于哈希计算
    const userOpForHash = {
      sender: userOp.sender,
      nonce: userOp.nonce,
      initCode: userOp.initCode,
      callData: userOp.callData,
      callGasLimit: userOp.callGasLimit,
      verificationGasLimit: userOp.verificationGasLimit,
      preVerificationGas: userOp.preVerificationGas,
      maxFeePerGas: userOp.maxFeePerGas,
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
      paymasterAndData: userOp.paymasterAndData,
      signature: '0x'  // 签名前必须为 0x
    };

    const userOpHash = await entryPointContract.getUserOpHash(userOpForHash);

    // 使用钱包签名
    const signature = await wallet.signMessage(ethers.getBytes(userOpHash));

    console.log('[MedicationCheckIn] UserOp 签名成功');
    return signature;
  } catch (error) {
    console.error('[MedicationCheckIn] UserOp 签名失败:', error);
    throw error;
  }
}

/**
 * 提交用药打卡到链上
 * @param {string} weekKey - 周标识
 * @param {string} userId - 用户 ID
 * @param {string} senderAddress - 用户的 Smart Account 地址
 * @param {string} ipfsCid - IPFS CID
 * @param {string} calldata - 证明 calldata
 * @param {array} publicSignals - 公开信号
 * @param {object} proof - 证明对象
 * @returns {Promise<object>} 交易结果
 */
async function submitMedicationCheckIn(weekKey, userId, senderAddress, ipfsCid, calldata, publicSignals, proof) {
  try {
    console.log(`[MedicationCheckIn] 开始上链流程，weekKey: ${weekKey}, userId: ${userId}, CID: ${ipfsCid}`);

    if (!senderAddress) {
      throw new Error(`缺少用户 ${userId} 的 Smart Account 地址`);
    }

    console.log(`[MedicationCheckIn] 用户 Smart Account: ${senderAddress}`);

    // 构建 callData
    const recordCallData = buildRecordMedicationCheckInCallData(ipfsCid);

    // 构建 UserOp
    const userOp = await buildUserOp(senderAddress, recordCallData);

    // 签名 UserOp
    const signature = await signUserOp(userOp);
    userOp.signature = signature;

    // 提交到 Bundler
    console.log('[MedicationCheckIn] 提交 UserOp 到 Bundler...');
    const txResult = await handleSubmit(userOp);

    console.log('[MedicationCheckIn] 交易已提交:', txResult.txHash);

    // 通过 MQ 发送成功通知
    await publishMedicationCheckInNotification(senderAddress, weekKey, ipfsCid, txResult.txHash, 'success');

    return {
      success: true,
      txHash: txResult.txHash,
      ipfsCid,
      weekKey,
      blockNumber: txResult.blockNumber
    };
  } catch (error) {
    console.error('[MedicationCheckIn] 上链失败:', error);

    // 通过 MQ 发送失败通知
    await publishMedicationCheckInNotification(senderAddress, weekKey, ipfsCid, null, 'failed', error.message);

    throw error;
  }
}


/**
 * 查询打卡记录总数
 * @param {string} smartAccountAddress - 用户的 Smart Account 地址
 * @returns {Promise<number>} 打卡总数
 */
async function getMedicationCheckInCount(smartAccountAddress) {
  try {
    const provider = wallet.provider;

    const contract = new ethers.Contract(
      smartAccountAddress,
      SIMPLE_ACCOUNT_ABI,
      provider
    );

    const count = await contract.getMedicationCheckInCount();
    console.log(`[MedicationCheckIn] 打卡总数: ${count}`);

    return count.toString();
  } catch (error) {
    console.error('[MedicationCheckIn] 查询打卡总数失败:', error);
    throw error;
  }
}

/**
 * 获取所有打卡的 CID 列表
 * @param {string} smartAccountAddress - 用户的 Smart Account 地址
 * @returns {Promise<array>} CID 列表
 */
async function getAllCheckInCids(smartAccountAddress) {
  try {
    const provider = wallet.provider;

    const contract = new ethers.Contract(
      smartAccountAddress,
      SIMPLE_ACCOUNT_ABI,
      provider
    );

    // 获取打卡总数
    const count = await contract.getMedicationCheckInCount();
    const cids = [];

    // 逐个获取 CID
    for (let i = 0; i < count; i++) {
      const cid = await contract.checkInCids(i);
      cids.push(cid);
    }

    console.log(`[MedicationCheckIn] 获取 CID 列表，共 ${cids.length} 条`);

    return cids;
  } catch (error) {
    console.error('[MedicationCheckIn] 查询 CID 列表失败:', error);
    throw error;
  }
}

/**
 * 查询指定 CID 的打卡时间戳
 * @param {string} smartAccountAddress - 用户的 Smart Account 地址
 * @param {string} ipfsCid - IPFS CID
 * @returns {Promise<number>} 时间戳
 */
async function getCheckInTimestamp(smartAccountAddress, ipfsCid) {
  try {
    const provider = wallet.provider;

    const contract = new ethers.Contract(
      smartAccountAddress,
      SIMPLE_ACCOUNT_ABI,
      provider
    );

    const timestamp = await contract.medicationCheckIns(ipfsCid);
    console.log(`[MedicationCheckIn] CID ${ipfsCid} 的时间戳: ${timestamp}`);

    return timestamp.toString();
  } catch (error) {
    console.error('[MedicationCheckIn] 查询时间戳失败:', error);
    throw error;
  }
}

module.exports = {
  submitMedicationCheckIn,
  buildUserOp,
  signUserOp,
  getMedicationCheckInCount,
  getAllCheckInCids,
  getCheckInTimestamp
};
