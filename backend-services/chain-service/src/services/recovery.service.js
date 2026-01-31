// src/services/recovery.service.js
// =======================================================
// 社交恢复服务
// 处理社交恢复账户的守护者管理和恢复流程
// =======================================================
const { getWallet } = require('../chain/client');
const { ethers } = require('ethers');
const addresses = require('../../smart_contract/addresses.json');

// 获取钱包实例
const wallet = getWallet();

// 合约地址和ABI
const ENTRYPOINT_ADDRESS = addresses.EntryPoint.address;
const FACTORY_ADDRESS = addresses.SocialRecoveryAccountFactory.address;
const PAYMASTER_ADDRESS = addresses.SimplePaymaster.address;

const entryPointAbi = addresses.EntryPoint.abi;
const factoryAbi = addresses.SocialRecoveryAccountFactory.abi;
const accountAbi = addresses.SocialRecoveryAccount.abi;

// 创建合约实例
const entryPointContract = new ethers.Contract(ENTRYPOINT_ADDRESS, entryPointAbi, wallet);
const factoryContract = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, wallet);

/**
 * 创建社交恢复账户
 * @param {string} ownerAddress - EOA地址（用于签名）
 * @param {Array<string>} guardians - 守护者地址数组（可以为空）
 * @param {number} threshold - 恢复所需的守护者数量（guardians为空时应为0）
 * @param {number} salt - 盐值（用于生成不同的账户地址）
 * @returns {Promise<object>} 返回账户地址和交易信息
 */
async function createAccount(ownerAddress, guardians = [], threshold = 0, salt = 0) {
  console.log('[Recovery] 创建社交恢复账户');
  console.log('  Owner:', ownerAddress);
  console.log('  Guardians:', guardians.length);
  console.log('  Threshold:', threshold);
  console.log('  Salt:', salt);

  // 预计算账户地址
  const accountAddress = await factoryContract.getAccountAddress(
    ownerAddress,
    guardians,
    threshold,
    salt
  );
  
  console.log('  预计算账户地址:', accountAddress);

  // 创建账户
  const tx = await factoryContract.createAccount(
    ownerAddress,
    guardians,
    threshold,
    salt
  );
  
  console.log('  交易已提交:', tx.hash);
  const receipt = await tx.wait();
  console.log('  交易已确认:', receipt.status === 1 ? '成功' : '失败');

  return {
    accountAddress,
    ownerAddress,
    guardians,
    threshold,
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    status: receipt.status
  };
}

/**
 * 构建添加守护者的未签名 UserOperation（安全：不需要私钥）
 * @param {string} accountAddress - 账户地址
 * @param {string} guardianAddress - 要添加的守护者地址
 * @returns {Promise<object>} 返回未签名的 UserOp 和 UserOpHash
 */
async function buildAddGuardianUserOp(accountAddress, guardianAddress) {
  console.log('[Recovery] 构建添加守护者UserOp');
  console.log('  Account:', accountAddress);
  console.log('  Guardian:', guardianAddress);

  const accountInterface = new ethers.Interface(accountAbi);
  
  // 编码 addGuardian 调用
  const addGuardianCallData = accountInterface.encodeFunctionData('addGuardian', [guardianAddress]);
  
  // 编码 execute 调用（账户调用自己）
  const executeCallData = accountInterface.encodeFunctionData('execute', [
    accountAddress,  // 调用自己
    0,               // 不发送ETH
    addGuardianCallData
  ]);

  // 获取 nonce
  const nonce = await entryPointContract.getNonce(accountAddress);

  // 构建未签名 UserOperation
  const userOp = {
    sender: accountAddress,
    nonce: nonce.toString(),
    initCode: '0x',
    callData: executeCallData,
    callGasLimit: '300000',
    verificationGasLimit: '500000',
    preVerificationGas: '100000',
    maxFeePerGas: ethers.parseUnits('10', 'gwei').toString(),
    maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei').toString(),
    paymasterAndData: PAYMASTER_ADDRESS,
    signature: '0x'
  };

  // 计算 UserOpHash（用于客户端签名）
  const userOpHash = await entryPointContract.getUserOpHash(userOp);

  return {
    userOp,
    userOpHash,
    guardianAddress
  };
}

/**
 * 构建移除守护者的未签名 UserOperation（安全：不需要私钥）
 * @param {string} accountAddress - 账户地址
 * @param {string} guardianAddress - 要移除的守护者地址
 * @returns {Promise<object>} 返回未签名的 UserOp 和 UserOpHash
 */
async function buildRemoveGuardianUserOp(accountAddress, guardianAddress) {
  console.log('[Recovery] 构建移除守护者UserOp');
  console.log('  Account:', accountAddress);
  console.log('  Guardian:', guardianAddress);

  const accountInterface = new ethers.Interface(accountAbi);

  // 编码 removeGuardian 调用
  const removeGuardianCallData = accountInterface.encodeFunctionData('removeGuardian', [guardianAddress]);

  // 编码 execute 调用（账户调用自己）
  const executeCallData = accountInterface.encodeFunctionData('execute', [
    accountAddress, // 调用自己
    0,
    removeGuardianCallData
  ]);

  const nonce = await entryPointContract.getNonce(accountAddress);

  const userOp = {
    sender: accountAddress,
    nonce: nonce.toString(),
    initCode: '0x',
    callData: executeCallData,
    callGasLimit: '300000',
    verificationGasLimit: '500000',
    preVerificationGas: '100000',
    maxFeePerGas: ethers.parseUnits('10', 'gwei').toString(),
    maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei').toString(),
    paymasterAndData: PAYMASTER_ADDRESS,
    signature: '0x'
  };

  const userOpHash = await entryPointContract.getUserOpHash(userOp);

  return {
    userOp,
    userOpHash,
    guardianAddress
  };
}

/**
 * 通过 UserOperation 添加守护者（已弃用：不安全，需要私钥）
 * @deprecated 请使用 buildAddGuardianUserOp + bundler.handleSubmit
 * @param {string} accountAddress - 账户地址
 * @param {string} ownerPrivateKey - Owner的私钥（用于签名UserOp）
 * @param {string} guardianAddress - 要添加的守护者地址
 * @returns {Promise<object>} 返回交易信息
 */
async function addGuardianViaUserOp(accountAddress, ownerPrivateKey, guardianAddress) {
  console.log('[Recovery] 通过UserOp添加守护者');
  console.log('  Account:', accountAddress);
  console.log('  Guardian:', guardianAddress);

  const accountInterface = new ethers.Interface(accountAbi);
  
  // 编码 addGuardian 调用
  const addGuardianCallData = accountInterface.encodeFunctionData('addGuardian', [guardianAddress]);
  
  // 编码 execute 调用（账户调用自己）
  const executeCallData = accountInterface.encodeFunctionData('execute', [
    accountAddress,  // 调用自己
    0,               // 不发送ETH
    addGuardianCallData
  ]);

  // 创建签名者
  const signer = new ethers.Wallet(ownerPrivateKey, wallet.provider);
  
  // 获取 nonce
  const nonce = await entryPointContract.getNonce(accountAddress);

  // 构建 UserOperation
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

  // 签名 UserOperation
  const userOpHash = await entryPointContract.getUserOpHash(userOp);
  const signature = await signer.signMessage(ethers.getBytes(userOpHash));
  userOp.signature = signature;

  // 提交 UserOperation
  const beneficiary = await wallet.getAddress();
  const tx = await entryPointContract.handleOps([userOp], beneficiary);
  
  console.log('  交易已提交:', tx.hash);
  const receipt = await tx.wait();
  
  return {
    success: receipt.status === 1,
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    guardianAddress
  };
}

/**
 * 构建修改阈值的未签名 UserOperation（安全：不需要私钥）
 * @param {string} accountAddress - 账户地址
 * @param {number} newThreshold - 新阈值
 * @returns {Promise<object>} 返回未签名的 UserOp 和 UserOpHash
 */
async function buildChangeThresholdUserOp(accountAddress, newThreshold) {
  console.log('[Recovery] 构建修改阈值UserOp');
  console.log('  Account:', accountAddress);
  console.log('  New Threshold:', newThreshold);

  const accountInterface = new ethers.Interface(accountAbi);
  
  // 编码 changeThreshold 调用
  const changeThresholdCallData = accountInterface.encodeFunctionData('changeThreshold', [newThreshold]);
  
  // 编码 execute 调用
  const executeCallData = accountInterface.encodeFunctionData('execute', [
    accountAddress,
    0,
    changeThresholdCallData
  ]);

  const nonce = await entryPointContract.getNonce(accountAddress);

  const userOp = {
    sender: accountAddress,
    nonce: nonce.toString(),
    initCode: '0x',
    callData: executeCallData,
    callGasLimit: '300000',
    verificationGasLimit: '500000',
    preVerificationGas: '100000',
    maxFeePerGas: ethers.parseUnits('10', 'gwei').toString(),
    maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei').toString(),
    paymasterAndData: PAYMASTER_ADDRESS,
    signature: '0x'
  };

  const userOpHash = await entryPointContract.getUserOpHash(userOp);

  return {
    userOp,
    userOpHash,
    newThreshold
  };
}

/**
 * 通过 UserOperation 修改阈值（已弃用：不安全，需要私钥）
 * @deprecated 请使用 buildChangeThresholdUserOp + bundler.handleSubmit
 * @param {string} accountAddress - 账户地址
 * @param {string} ownerPrivateKey - Owner的私钥
 * @param {number} newThreshold - 新阈值
 * @returns {Promise<object>} 返回交易信息
 */
async function changeThresholdViaUserOp(accountAddress, ownerPrivateKey, newThreshold) {
  console.log('[Recovery] 通过UserOp修改阈值');
  console.log('  Account:', accountAddress);
  console.log('  New Threshold:', newThreshold);

  const accountInterface = new ethers.Interface(accountAbi);
  
  // 编码 changeThreshold 调用
  const changeThresholdCallData = accountInterface.encodeFunctionData('changeThreshold', [newThreshold]);
  
  // 编码 execute 调用
  const executeCallData = accountInterface.encodeFunctionData('execute', [
    accountAddress,
    0,
    changeThresholdCallData
  ]);

  const signer = new ethers.Wallet(ownerPrivateKey, wallet.provider);
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
    newThreshold
  };
}

/**
 * 构建守护者发起恢复的未签名 UserOperation（安全：不需要私钥）
 * @param {string} accountAddress - 用户账户地址
 * @param {string} guardianAccountAddress - 守护者账户地址
 * @param {string} newOwnerAddress - 新Owner地址
 * @returns {Promise<object>} 返回未签名的 UserOp 和 UserOpHash
 */
async function buildInitiateRecoveryUserOp(accountAddress, guardianAccountAddress, newOwnerAddress) {
  console.log('[Recovery] 构建发起恢复UserOp');
  console.log('  User Account:', accountAddress);
  console.log('  Guardian Account:', guardianAccountAddress);
  console.log('  New Owner:', newOwnerAddress);

  const accountInterface = new ethers.Interface(accountAbi);
  
  // 编码 initiateRecovery 调用
  const initiateCallData = accountInterface.encodeFunctionData('initiateRecovery', [newOwnerAddress]);
  
  // 守护者账户调用用户账户的 initiateRecovery
  const executeCallData = accountInterface.encodeFunctionData('execute', [
    accountAddress,      // 目标：用户账户
    0,
    initiateCallData
  ]);

  const nonce = await entryPointContract.getNonce(guardianAccountAddress);

  const userOp = {
    sender: guardianAccountAddress,
    nonce: nonce.toString(),
    initCode: '0x',
    callData: executeCallData,
    callGasLimit: '300000',
    verificationGasLimit: '500000',
    preVerificationGas: '100000',
    maxFeePerGas: ethers.parseUnits('10', 'gwei').toString(),
    maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei').toString(),
    paymasterAndData: PAYMASTER_ADDRESS,
    signature: '0x'
  };

  const userOpHash = await entryPointContract.getUserOpHash(userOp);

  return {
    userOp,
    userOpHash,
    newOwnerAddress
  };
}

/**
 * 守护者发起恢复（已弃用：不安全，需要私钥）
 * @deprecated 请使用 buildInitiateRecoveryUserOp + bundler.handleSubmit
 * @param {string} accountAddress - 用户账户地址
 * @param {string} guardianAccountAddress - 守护者账户地址
 * @param {string} guardianOwnerPrivateKey - 守护者账户Owner的私钥
 * @param {string} newOwnerAddress - 新Owner地址
 * @returns {Promise<object>} 返回交易信息
 */
async function initiateRecoveryViaUserOp(accountAddress, guardianAccountAddress, guardianOwnerPrivateKey, newOwnerAddress) {
  console.log('[Recovery] 守护者发起恢复');
  console.log('  User Account:', accountAddress);
  console.log('  Guardian Account:', guardianAccountAddress);
  console.log('  New Owner:', newOwnerAddress);

  const accountInterface = new ethers.Interface(accountAbi);
  
  // 编码 initiateRecovery 调用
  const initiateCallData = accountInterface.encodeFunctionData('initiateRecovery', [newOwnerAddress]);
  
  // 守护者账户调用用户账户的 initiateRecovery
  const executeCallData = accountInterface.encodeFunctionData('execute', [
    accountAddress,      // 目标：用户账户
    0,
    initiateCallData
  ]);

  const signer = new ethers.Wallet(guardianOwnerPrivateKey, wallet.provider);
  const nonce = await entryPointContract.getNonce(guardianAccountAddress);

  const userOp = {
    sender: guardianAccountAddress,
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
    newOwnerAddress
  };
}

/**
 * 构建守护者支持恢复的未签名 UserOperation（安全：不需要私钥）
 * @param {string} accountAddress - 用户账户地址
 * @param {string} guardianAccountAddress - 守护者账户地址
 * @param {string} newOwnerAddress - 新Owner地址
 * @returns {Promise<object>} 返回未签名的 UserOp 和 UserOpHash
 */
async function buildSupportRecoveryUserOp(accountAddress, guardianAccountAddress, newOwnerAddress) {
  console.log('[Recovery] 构建支持恢复UserOp');
  console.log('  User Account:', accountAddress);
  console.log('  Guardian Account:', guardianAccountAddress);
  console.log('  New Owner:', newOwnerAddress);

  const accountInterface = new ethers.Interface(accountAbi);
  
  // 编码 supportRecovery 调用
  const supportCallData = accountInterface.encodeFunctionData('supportRecovery', [newOwnerAddress]);
  
  // 守护者账户调用用户账户的 supportRecovery
  const executeCallData = accountInterface.encodeFunctionData('execute', [
    accountAddress,
    0,
    supportCallData
  ]);

  const nonce = await entryPointContract.getNonce(guardianAccountAddress);

  const userOp = {
    sender: guardianAccountAddress,
    nonce: nonce.toString(),
    initCode: '0x',
    callData: executeCallData,
    callGasLimit: '300000',
    verificationGasLimit: '500000',
    preVerificationGas: '100000',
    maxFeePerGas: ethers.parseUnits('10', 'gwei').toString(),
    maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei').toString(),
    paymasterAndData: PAYMASTER_ADDRESS,
    signature: '0x'
  };

  const userOpHash = await entryPointContract.getUserOpHash(userOp);

  return {
    userOp,
    userOpHash,
    newOwnerAddress
  };
}

/**
 * 守护者支持恢复（已弃用：不安全，需要私钥）
 * @deprecated 请使用 buildSupportRecoveryUserOp + bundler.handleSubmit
 * @param {string} accountAddress - 用户账户地址
 * @param {string} guardianAccountAddress - 守护者账户地址
 * @param {string} guardianOwnerPrivateKey - 守护者账户Owner的私钥
 * @param {string} newOwnerAddress - 新Owner地址
 * @returns {Promise<object>} 返回交易信息
 */
async function supportRecoveryViaUserOp(accountAddress, guardianAccountAddress, guardianOwnerPrivateKey, newOwnerAddress) {
  console.log('[Recovery] 守护者支持恢复');
  console.log('  User Account:', accountAddress);
  console.log('  Guardian Account:', guardianAccountAddress);
  console.log('  New Owner:', newOwnerAddress);

  const accountInterface = new ethers.Interface(accountAbi);
  
  // 编码 supportRecovery 调用
  const supportCallData = accountInterface.encodeFunctionData('supportRecovery', [newOwnerAddress]);
  
  // 守护者账户调用用户账户的 supportRecovery
  const executeCallData = accountInterface.encodeFunctionData('execute', [
    accountAddress,
    0,
    supportCallData
  ]);

  const signer = new ethers.Wallet(guardianOwnerPrivateKey, wallet.provider);
  const nonce = await entryPointContract.getNonce(guardianAccountAddress);

  const userOp = {
    sender: guardianAccountAddress,
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
    newOwnerAddress
  };
}

/**
 * 构建Owner取消恢复的未签名 UserOperation（安全：不需要私钥）
 * @param {string} accountAddress - 账户地址
 * @returns {Promise<object>} 返回未签名的 UserOp 和 UserOpHash
 */
async function buildCancelRecoveryUserOp(accountAddress) {
  console.log('[Recovery] 构建取消恢复UserOp');
  console.log('  Account:', accountAddress);

  const accountInterface = new ethers.Interface(accountAbi);
  
  // 编码 cancelRecovery 调用
  const cancelCallData = accountInterface.encodeFunctionData('cancelRecovery', []);
  
  // 编码 execute 调用
  const executeCallData = accountInterface.encodeFunctionData('execute', [
    accountAddress,
    0,
    cancelCallData
  ]);

  const nonce = await entryPointContract.getNonce(accountAddress);

  const userOp = {
    sender: accountAddress,
    nonce: nonce.toString(),
    initCode: '0x',
    callData: executeCallData,
    callGasLimit: '300000',
    verificationGasLimit: '500000',
    preVerificationGas: '100000',
    maxFeePerGas: ethers.parseUnits('10', 'gwei').toString(),
    maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei').toString(),
    paymasterAndData: PAYMASTER_ADDRESS,
    signature: '0x'
  };

  const userOpHash = await entryPointContract.getUserOpHash(userOp);

  return {
    userOp,
    userOpHash
  };
}

/**
 * Owner取消恢复（已弃用：不安全，需要私钥）
 * @deprecated 请使用 buildCancelRecoveryUserOp + bundler.handleSubmit
 * @param {string} accountAddress - 账户地址
 * @param {string} ownerPrivateKey - Owner的私钥
 * @returns {Promise<object>} 返回交易信息
 */
async function cancelRecoveryViaUserOp(accountAddress, ownerPrivateKey) {
  console.log('[Recovery] Owner取消恢复');
  console.log('  Account:', accountAddress);

  const accountInterface = new ethers.Interface(accountAbi);
  
  // 编码 cancelRecovery 调用
  const cancelCallData = accountInterface.encodeFunctionData('cancelRecovery', []);
  
  // 编码 execute 调用
  const executeCallData = accountInterface.encodeFunctionData('execute', [
    accountAddress,
    0,
    cancelCallData
  ]);

  const signer = new ethers.Wallet(ownerPrivateKey, wallet.provider);
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
    blockNumber: receipt.blockNumber
  };
}

/**
 * 查询账户的守护者列表
 * @param {string} accountAddress - 账户地址
 * @returns {Promise<object>} 返回守护者列表和阈值
 */
async function getGuardians(accountAddress) {
  console.log('[Recovery] 查询守护者列表:', accountAddress);
  
  const accountContract = new ethers.Contract(accountAddress, accountAbi, wallet.provider);
  
  const guardians = await accountContract.getGuardians();
  const threshold = await accountContract.threshold();
  
  return {
    accountAddress,
    guardians,
    threshold: threshold.toString(),
    count: guardians.length
  };
}

/**
 * 查询恢复请求状态
 * @param {string} accountAddress - 账户地址
 * @returns {Promise<object>} 返回恢复请求详情
 */
async function getRecoveryStatus(accountAddress) {
  console.log('[Recovery] 查询恢复状态:', accountAddress);
  
  const accountContract = new ethers.Contract(accountAddress, accountAbi, wallet.provider);
  
  const recoveryInfo = await accountContract.getActiveRecovery();
  
  return {
    accountAddress,
    newOwner: recoveryInfo.newOwner,
    approvalCount: recoveryInfo.approvalCount.toString(),
    createdAt: recoveryInfo.createdAt.toString(),
    executed: recoveryInfo.executed,
    remainingTime: recoveryInfo.remainingTime.toString()
  };
}

/**
 * 查询账户信息（Owner和守护者）
 * @param {string} accountAddress - 账户地址
 * @returns {Promise<object>} 返回账户完整信息
 */
async function getAccountInfo(accountAddress) {
  console.log('[Recovery] 查询账户信息:', accountAddress);
  
  const accountContract = new ethers.Contract(accountAddress, accountAbi, wallet.provider);
  
  const owner = await accountContract.owner();
  const guardians = await accountContract.getGuardians();
  const threshold = await accountContract.threshold();
  
  let recoveryInfo = null;
  try {
    const recovery = await accountContract.getActiveRecovery();
    if (recovery.newOwner !== ethers.ZeroAddress) {
      recoveryInfo = {
        newOwner: recovery.newOwner,
        approvalCount: recovery.approvalCount.toString(),
        createdAt: recovery.createdAt.toString(),
        executed: recovery.executed,
        remainingTime: recovery.remainingTime.toString()
      };
    }
  } catch (e) {
    // 如果没有活跃的恢复请求，忽略错误
  }
  
  return {
    accountAddress,
    owner,
    guardians,
    threshold: threshold.toString(),
    guardiansCount: guardians.length,
    activeRecovery: recoveryInfo
  };
}

/**
 * 预计算账户地址（不创建账户）
 * @param {string} ownerAddress - EOA地址
 * @param {Array<string>} guardians - 守护者地址数组
 * @param {number} threshold - 阈值
 * @param {number} salt - 盐值
 * @returns {Promise<object>} 返回预计算的账户地址
 */
async function getAccountAddress(ownerAddress, guardians = [], threshold = 0, salt = 0) {
  console.log('[Recovery] 预计算账户地址');
  
  const accountAddress = await factoryContract.getAccountAddress(
    ownerAddress,
    guardians,
    threshold,
    salt
  );
  
  return {
    accountAddress,
    ownerAddress,
    guardians,
    threshold,
    salt
  };
}

// 导出服务函数
module.exports = {
  createAccount,
  // 新的安全方法（不需要私钥）
  buildAddGuardianUserOp,
  buildRemoveGuardianUserOp,
  buildChangeThresholdUserOp,
  buildInitiateRecoveryUserOp,
  buildSupportRecoveryUserOp,
  buildCancelRecoveryUserOp,
  // 旧的不安全方法（已弃用但保留向后兼容）
  addGuardianViaUserOp,
  changeThresholdViaUserOp,
  initiateRecoveryViaUserOp,
  supportRecoveryViaUserOp,
  cancelRecoveryViaUserOp,
  // 查询方法
  getGuardians,
  getRecoveryStatus,
  getAccountInfo,
  getAccountAddress
};
