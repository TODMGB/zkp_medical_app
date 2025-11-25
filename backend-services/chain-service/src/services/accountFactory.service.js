// src/services/accountFactory.service.js
// =======================================================
// 账户工厂服务
// 提供社交恢复账户的创建和管理功能
// 集成了守护者管理和账户初始化的完整流程
// =======================================================
const { getWallet } = require('../chain/client');
const { ethers } = require('ethers');
const addresses = require('../../smart_contract/addresses.json');
const recoveryService = require('./recovery.service');

// 获取钱包实例
const wallet = getWallet();

// 合约地址和ABI
const ENTRYPOINT_ADDRESS = addresses.EntryPoint.address;
const PAYMASTER_ADDRESS = addresses.SimplePaymaster.address;
const entryPointAbi = addresses.EntryPoint.abi;
const accountAbi = addresses.SocialRecoveryAccount.abi;

// 创建 EntryPoint 合约实例
const entryPointContract = new ethers.Contract(ENTRYPOINT_ADDRESS, entryPointAbi, wallet);

/**
 * 创建完整的社交恢复账户（包含守护者设置）
 * 这个函数会：
 * 1. 创建账户（无守护者）
 * 2. 通过多个 UserOperation 添加守护者
 * 3. 设置阈值
 * @param {string} ownerAddress - EOA地址
 * @param {Array<string>} guardianAddresses - 守护者地址数组
 * @param {number} threshold - 恢复所需的守护者数量
 * @param {string} ownerPrivateKey - Owner的私钥（用于签名UserOp）
 * @param {number} salt - 盐值
 * @returns {Promise<object>} 返回账户信息
 */
async function createAccountWithGuardians(
  ownerAddress, 
  guardianAddresses, 
  threshold, 
  ownerPrivateKey,
  salt = 0
) {
  console.log('[AccountFactory] 创建带守护者的社交恢复账户');
  console.log('  Owner:', ownerAddress);
  console.log('  守护者数量:', guardianAddresses.length);
  console.log('  阈值:', threshold);

  // 步骤1: 创建账户（无守护者）
  console.log('\n[步骤1] 创建基础账户...');
  const accountResult = await recoveryService.createAccount(
    ownerAddress,
    [],  // 初始无守护者
    0,   // 初始阈值为0
    salt
  );
  
  const accountAddress = accountResult.accountAddress;
  console.log('✅ 账户创建成功:', accountAddress);

  // 步骤2: 逐个添加守护者
  console.log('\n[步骤2] 添加守护者...');
  const addedGuardians = [];
  
  for (let i = 0; i < guardianAddresses.length; i++) {
    const guardianAddress = guardianAddresses[i];
    console.log(`  添加守护者 ${i + 1}/${guardianAddresses.length}: ${guardianAddress}`);
    
    try {
      const result = await recoveryService.addGuardianViaUserOp(
        accountAddress,
        ownerPrivateKey,
        guardianAddress
      );
      
      if (result.success) {
        addedGuardians.push(guardianAddress);
        console.log(`  ✅ 守护者 ${i + 1} 添加成功`);
      } else {
        console.log(`  ❌ 守护者 ${i + 1} 添加失败`);
      }
    } catch (error) {
      console.error(`  ❌ 守护者 ${i + 1} 添加异常:`, error.message);
    }
  }

  // 步骤3: 设置阈值
  if (addedGuardians.length > 0 && threshold > 0) {
    console.log('\n[步骤3] 设置阈值...');
    try {
      const thresholdResult = await recoveryService.changeThresholdViaUserOp(
        accountAddress,
        ownerPrivateKey,
        threshold
      );
      
      if (thresholdResult.success) {
        console.log(`✅ 阈值设置成功: ${threshold}`);
      } else {
        console.log('❌ 阈值设置失败');
      }
    } catch (error) {
      console.error('❌ 阈值设置异常:', error.message);
    }
  }

  // 查询最终状态
  console.log('\n[最终状态] 查询账户信息...');
  const finalInfo = await recoveryService.getAccountInfo(accountAddress);
  
  console.log('✅ 社交恢复账户创建完成！');
  console.log('  账户地址:', accountAddress);
  console.log('  Owner:', finalInfo.owner);
  console.log('  守护者数量:', finalInfo.guardiansCount);
  console.log('  阈值:', finalInfo.threshold);

  return {
    accountAddress,
    ownerAddress: finalInfo.owner,
    guardians: finalInfo.guardians,
    threshold: finalInfo.threshold,
    guardiansCount: finalInfo.guardiansCount,
    createTxHash: accountResult.txHash
  };
}

/**
 * 批量执行社交恢复流程
 * 这个函数会自动协调多个守护者完成恢复流程
 * @param {string} accountAddress - 用户账户地址
 * @param {Array<object>} guardians - 守护者信息数组 [{ accountAddress, ownerPrivateKey }, ...]
 * @param {string} newOwnerAddress - 新Owner地址
 * @param {number} requiredCount - 需要的守护者数量（默认使用阈值）
 * @returns {Promise<object>} 返回恢复结果
 */
async function executeSocialRecovery(
  accountAddress,
  guardians,
  newOwnerAddress,
  requiredCount = null
) {
  console.log('[AccountFactory] 执行社交恢复流程');
  console.log('  账户地址:', accountAddress);
  console.log('  新Owner:', newOwnerAddress);
  console.log('  可用守护者数量:', guardians.length);

  // 获取账户信息
  const accountInfo = await recoveryService.getAccountInfo(accountAddress);
  const threshold = parseInt(accountInfo.threshold);
  const neededCount = requiredCount || threshold;

  console.log('  恢复阈值:', threshold);
  console.log('  需要守护者数:', neededCount);

  if (guardians.length < neededCount) {
    throw new Error(`守护者数量不足，需要 ${neededCount} 个，但只有 ${guardians.length} 个`);
  }

  // 步骤1: 第一个守护者发起恢复
  console.log('\n[步骤1] 守护者1发起恢复...');
  const firstGuardian = guardians[0];
  const initiateResult = await recoveryService.initiateRecoveryViaUserOp(
    accountAddress,
    firstGuardian.accountAddress,
    firstGuardian.ownerPrivateKey,
    newOwnerAddress
  );
  
  console.log(initiateResult.success ? '✅ 恢复请求已发起' : '❌ 恢复请求发起失败');

  // 步骤2: 其他守护者支持恢复
  console.log('\n[步骤2] 其他守护者支持恢复...');
  const supportResults = [];
  
  for (let i = 1; i < neededCount && i < guardians.length; i++) {
    const guardian = guardians[i];
    console.log(`  守护者 ${i + 1} 支持恢复...`);
    
    try {
      const supportResult = await recoveryService.supportRecoveryViaUserOp(
        accountAddress,
        guardian.accountAddress,
        guardian.ownerPrivateKey,
        newOwnerAddress
      );
      
      supportResults.push(supportResult);
      console.log(supportResult.success ? `  ✅ 守护者 ${i + 1} 支持成功` : `  ❌ 守护者 ${i + 1} 支持失败`);
    } catch (error) {
      console.error(`  ❌ 守护者 ${i + 1} 支持异常:`, error.message);
    }
  }

  // 步骤3: 查询恢复状态
  console.log('\n[步骤3] 查询恢复状态...');
  const recoveryStatus = await recoveryService.getRecoveryStatus(accountAddress);
  const accountInfoAfter = await recoveryService.getAccountInfo(accountAddress);

  console.log('  批准数:', recoveryStatus.approvalCount);
  console.log('  已执行:', recoveryStatus.executed);
  console.log('  当前Owner:', accountInfoAfter.owner);
  
  const isRecovered = accountInfoAfter.owner.toLowerCase() === newOwnerAddress.toLowerCase();
  console.log(isRecovered ? '✅ 社交恢复成功！' : '⚠️ 恢复未完成');

  return {
    success: isRecovered,
    accountAddress,
    oldOwner: accountInfo.owner,
    newOwner: accountInfoAfter.owner,
    recoveryStatus,
    initiateResult,
    supportResults
  };
}

/**
 * 通过 UserOperation 执行任意合约调用
 * 这是一个通用的执行函数，可以用于调用任何合约方法
 * @param {string} accountAddress - 账户地址
 * @param {string} signerPrivateKey - 签名者私钥
 * @param {string} targetAddress - 目标合约地址
 * @param {number} value - 发送的ETH数量（wei）
 * @param {string} callData - 编码后的调用数据
 * @returns {Promise<object>} 返回交易结果
 */
async function executeViaUserOp(
  accountAddress,
  signerPrivateKey,
  targetAddress,
  value,
  callData
) {
  console.log('[AccountFactory] 执行UserOperation');
  console.log('  Account:', accountAddress);
  console.log('  Target:', targetAddress);
  console.log('  Value:', value);

  const accountInterface = new ethers.Interface(accountAbi);
  
  // 编码 execute 调用
  const executeCallData = accountInterface.encodeFunctionData('execute', [
    targetAddress,
    value,
    callData
  ]);

  const signer = new ethers.Wallet(signerPrivateKey, wallet.provider);
  const nonce = await entryPointContract.getNonce(accountAddress);

  const userOp = {
    sender: accountAddress,
    nonce: nonce,
    initCode: '0x',
    callData: executeCallData,
    callGasLimit: 300000n,
    verificationGasLimit: 500000n,
    preVerificationGas: 100000n,
    maxFeePerGas: ethers.parseUnits('10', 'gwei'),
    maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
    paymasterAndData: PAYMASTER_ADDRESS,
    signature: '0x'
  };

  const userOpHash = await entryPointContract.getUserOpHash(userOp);
  const signature = await signer.signMessage(ethers.getBytes(userOpHash));
  userOp.signature = signature;

  const beneficiary = await wallet.getAddress();
  const tx = await entryPointContract.handleOps([userOp], beneficiary);
  
  console.log('  交易已提交:', tx.hash);
  const receipt = await tx.wait();
  
  return {
    success: receipt.status === 1,
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString()
  };
}

// 导出服务函数
module.exports = {
  createAccountWithGuardians,
  executeSocialRecovery,
  executeViaUserOp
};
