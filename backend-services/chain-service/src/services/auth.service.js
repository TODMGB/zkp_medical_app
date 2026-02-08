// src/services/auth.service.js
// =======================================================
// 认证服务 - 封装 user-service 的 gRPC 调用
// 用于将智能账户地址转换为EOA地址
// =======================================================
const userAuthClient = require('../rpc/clients/user_auth.client');

/**
 * 通过智能账户地址查询对应的EOA地址
 * @param {string} smartAccountAddress - 智能账户地址
 * @returns {Promise<string|null>} 返回EOA地址，如果未找到返回null
 */
async function getEOABySmartAccount(smartAccountAddress) {
  try {
    if (!smartAccountAddress) {
      console.warn('[Auth Service] 智能账户地址为空');
      return null;
    }

    console.log(`[Auth Service] 查询智能账户 ${smartAccountAddress} 的EOA地址...`);

    const response = await userAuthClient.getEOABySmartAccount(smartAccountAddress);

    if (response.found && response.eoa_address) {
      console.log(`[Auth Service] ✅ 找到EOA地址: ${response.eoa_address}`);
      return response.eoa_address;
    }

    console.log(`[Auth Service] ⚠️ 未找到智能账户 ${smartAccountAddress} 对应的用户`);
    return null;

  } catch (error) {
    console.error(`[Auth Service] ❌ 查询EOA地址失败 (${smartAccountAddress}):`, error.message);
    // 不抛出错误，返回null，让调用方决定如何处理
    return null;
  }
}

/**
 * 批量查询智能账户地址对应的EOA地址
 * @param {string[]} smartAccountAddresses - 智能账户地址数组
 * @returns {Promise<Map<string, string>>} 返回 Map<智能账户地址, EOA地址>
 */
async function batchGetEOABySmartAccounts(smartAccountAddresses) {
  try {
    if (!Array.isArray(smartAccountAddresses) || smartAccountAddresses.length === 0) {
      console.warn('[Auth Service] 智能账户地址数组为空');
      return new Map();
    }

    // 过滤掉空值
    const validAddresses = smartAccountAddresses.filter(addr => addr && typeof addr === 'string');
    
    if (validAddresses.length === 0) {
      return new Map();
    }

    console.log(`[Auth Service] 批量查询 ${validAddresses.length} 个智能账户的EOA地址...`);

    const response = await userAuthClient.batchGetEOABySmartAccounts(validAddresses);

    const resultMap = new Map();

    if (response.mappings && Array.isArray(response.mappings)) {
      response.mappings.forEach(mapping => {
        if (mapping.found && mapping.eoa_address) {
          resultMap.set(
            mapping.smart_account.toLowerCase(),
            mapping.eoa_address.toLowerCase()
          );
        }
      });
    }

    console.log(`[Auth Service] ✅ 批量查询完成: ${resultMap.size}/${validAddresses.length} 个找到`);
    return resultMap;

  } catch (error) {
    console.error('[Auth Service] ❌ 批量查询EOA地址失败:', error.message);
    return new Map();
  }
}

/**
 * 将智能账户地址数组转换为EOA地址数组
 * @param {string[]} smartAccountAddresses - 智能账户地址数组
 * @returns {Promise<string[]>} 返回EOA地址数组（过滤掉未找到的）
 */
async function convertSmartAccountsToEOAs(smartAccountAddresses) {
  const eoaMap = await batchGetEOABySmartAccounts(smartAccountAddresses);
  
  const eoaAddresses = [];
  for (const smartAccount of smartAccountAddresses) {
    const eoaAddress = eoaMap.get(smartAccount.toLowerCase());
    if (eoaAddress) {
      eoaAddresses.push(eoaAddress);
    } else {
      console.warn(`[Auth Service] ⚠️ 智能账户 ${smartAccount} 未找到对应的EOA地址`);
    }
  }

  return eoaAddresses;
}

module.exports = {
  getEOABySmartAccount,
  batchGetEOABySmartAccounts,
  convertSmartAccountsToEOAs
};
