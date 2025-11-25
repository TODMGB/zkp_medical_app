// src/services/zkp.service.js
// =======================================================
// ZKP验证服务
// 提供日常医药打卡验证和每周打卡汇总验证功能
// =======================================================
const { getWallet } = require('../chain/client');
const { ethers } = require('ethers');
const addresses = require('../../smart_contract/addresses.json');

// 获取钱包实例
const wallet = getWallet();

// 验证器合约地址和ABI
const MEDICAL_ZKP_VERIFIER_ADDRESS = addresses.MedicalZKPVerifier.address;
const WEEKLY_SUMMARY_VERIFIER_ADDRESS = addresses.WeeklySummaryVerifier.address;
const medicalZKPVerifierAbi = addresses.MedicalZKPVerifier.abi;
const weeklySummaryVerifierAbi = addresses.WeeklySummaryVerifier.abi;

// 创建验证器合约实例
const medicalZKPVerifierContract = new ethers.Contract(
  MEDICAL_ZKP_VERIFIER_ADDRESS,
  medicalZKPVerifierAbi,
  wallet
);

const weeklySummaryVerifierContract = new ethers.Contract(
  WEEKLY_SUMMARY_VERIFIER_ADDRESS,
  weeklySummaryVerifierAbi,
  wallet
);

/**
 * 验证日常医药打卡ZKP证明
 * @param {Array<string|number>} pA - 证明的 A 部分 [2]
 * @param {Array<Array<string|number>>} pB - 证明的 B 部分 [2][2]
 * @param {Array<string|number>} pC - 证明的 C 部分 [2]
 * @param {Array<string|number>} pubSignals - 公开信号 [6]
 *   [0] userIdCommitment - 用户ID承诺
 *   [1] medicationCommitment - 药物代码承诺
 *   [2] weekStartDate - 周开始日期（Unix时间戳）
 *   [3] dayOfWeek - 星期几（0-6）
 *   [4] timestamp - 打卡时间戳
 *   [5] challenge - 挑战值（防重放攻击）
 * @returns {Promise<object>} 验证结果
 */
async function verifyMedicalCheckin(pA, pB, pC, pubSignals) {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('📋 验证日常医药打卡ZKP证明');
    console.log('='.repeat(70));
    console.log('验证器合约地址:', MEDICAL_ZKP_VERIFIER_ADDRESS);
    console.log('公开信号:');
    console.log('  - userIdCommitment:', pubSignals[0]);
    console.log('  - medicationCommitment:', pubSignals[1]);
    console.log('  - weekStartDate:', pubSignals[2]);
    console.log('  - dayOfWeek:', pubSignals[3]);
    console.log('  - timestamp:', pubSignals[4]);
    console.log('  - challenge:', pubSignals[5]);
    console.log('='.repeat(70));

    // 调用链上验证合约
    console.log('🔍 正在调用链上验证合约...');
    const isValid = await medicalZKPVerifierContract.verifyProof(
      pA,
      pB,
      pC,
      pubSignals
    );

    console.log(`✅ 验证结果: ${isValid ? '通过' : '失败'}`);
    console.log('='.repeat(70) + '\n');

    return {
      success: true,
      valid: isValid,
      proofType: 'medical_checkin',
      verifierAddress: MEDICAL_ZKP_VERIFIER_ADDRESS,
      publicSignals: {
        userIdCommitment: pubSignals[0].toString(),
        medicationCommitment: pubSignals[1].toString(),
        weekStartDate: pubSignals[2].toString(),
        dayOfWeek: pubSignals[3].toString(),
        timestamp: pubSignals[4].toString(),
        challenge: pubSignals[5].toString()
      },
      verifiedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ 日常医药打卡ZKP验证失败:', error.message);
    throw error;
  }
}

/**
 * 验证每周打卡汇总ZKP证明
 * @param {Array<string|number>} pA - 证明的 A 部分 [2]
 * @param {Array<Array<string|number>>} pB - 证明的 B 部分 [2][2]
 * @param {Array<string|number>} pC - 证明的 C 部分 [2]
 * @param {Array<string|number>} pubSignals - 公开信号 [1]
 *   [0] weeklyMerkleRoot - 本周打卡记录的默克尔根
 * @returns {Promise<object>} 验证结果
 */
async function verifyWeeklySummary(pA, pB, pC, pubSignals) {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('📊 验证每周打卡汇总ZKP证明');
    console.log('='.repeat(70));
    console.log('验证器合约地址:', WEEKLY_SUMMARY_VERIFIER_ADDRESS);
    console.log('公开信号:');
    console.log('  - weeklyMerkleRoot:', pubSignals[0]);
    console.log('='.repeat(70));

    // 调用链上验证合约
    console.log('🔍 正在调用链上验证合约...');
    const isValid = await weeklySummaryVerifierContract.verifyProof(
      pA,
      pB,
      pC,
      pubSignals
    );

    console.log(`✅ 验证结果: ${isValid ? '通过' : '失败'}`);
    console.log('='.repeat(70) + '\n');

    return {
      success: true,
      valid: isValid,
      proofType: 'weekly_summary',
      verifierAddress: WEEKLY_SUMMARY_VERIFIER_ADDRESS,
      publicSignals: {
        weeklyMerkleRoot: pubSignals[0].toString()
      },
      verifiedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ 每周打卡汇总ZKP验证失败:', error.message);
    throw error;
  }
}

/**
 * 批量验证多个日常打卡证明
 * @param {Array<object>} proofs - 证明数组，每个元素包含 {pA, pB, pC, pubSignals}
 * @returns {Promise<object>} 批量验证结果
 */
async function batchVerifyMedicalCheckins(proofs) {
  try {
    console.log(`\n🔄 批量验证 ${proofs.length} 个日常医药打卡证明...`);
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < proofs.length; i++) {
      const { pA, pB, pC, pubSignals } = proofs[i];
      console.log(`\n[${i + 1}/${proofs.length}] 验证第 ${i + 1} 个证明...`);
      
      try {
        const result = await verifyMedicalCheckin(pA, pB, pC, pubSignals);
        results.push(result);
        
        if (result.valid) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`证明 ${i + 1} 验证失败:`, error.message);
        results.push({
          success: false,
          valid: false,
          error: error.message,
          proofIndex: i
        });
        failureCount++;
      }
    }

    console.log(`\n📊 批量验证完成:`);
    console.log(`  - 总数: ${proofs.length}`);
    console.log(`  - 成功: ${successCount}`);
    console.log(`  - 失败: ${failureCount}`);

    return {
      success: true,
      totalProofs: proofs.length,
      successCount,
      failureCount,
      results
    };

  } catch (error) {
    console.error('❌ 批量验证失败:', error.message);
    throw error;
  }
}

module.exports = {
  verifyMedicalCheckin,
  verifyWeeklySummary,
  batchVerifyMedicalCheckins
};

