/**
 * 测试脚本：验证不同EOA账户生成不同的抽象账户地址
 * 使用方法：node test-account-address.js
 */

const { ethers } = require('ethers');

// 后端API配置
const BACKEND_IP = '192.168.0.186';
const API_BASE_URL = `http://${BACKEND_IP}:4337/api`;

/**
 * 调用getAccountAddress接口
 */
async function getAccountAddress(owner, salt) {
  const url = `${API_BASE_URL}/paymaster/get-account-address?owner=${owner}&salt=${salt}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error('API调用失败: ' + JSON.stringify(data));
    }
    
    return data.address;
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return null;
  }
}

/**
 * 生成基于EOA地址的唯一salt
 */
function generateSaltFromAddress(address) {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(address));
  const salt = BigInt(hash) % BigInt(1000000);
  return Number(salt);
}

/**
 * 主测试函数
 */
async function main() {
  console.log('🧪 开始测试抽象账户地址生成...\n');
  console.log('后端API:', API_BASE_URL);
  console.log('=' .repeat(80));
  
  // 测试1: 生成3个不同的EOA账户，使用相同的salt=0
  console.log('\n📋 测试1: 不同EOA + 相同Salt(0)');
  console.log('-'.repeat(80));
  
  const accountsTest1 = [];
  for (let i = 0; i < 3; i++) {
    const wallet = ethers.Wallet.createRandom();
    const owner = wallet.address;
    const salt = 0;
    const abstractAddress = await getAccountAddress(owner, salt);
    
    accountsTest1.push({ owner, salt, abstractAddress });
    
    console.log(`账户${i + 1}:`);
    console.log(`  EOA地址:    ${owner}`);
    console.log(`  Salt值:     ${salt}`);
    console.log(`  抽象账户:   ${abstractAddress}`);
    console.log();
  }
  
  // 检查是否所有地址都不同
  const uniqueAddresses1 = new Set(accountsTest1.map(a => a.abstractAddress));
  console.log(`结果: 生成了 ${uniqueAddresses1.size} 个不同的地址 (期望: 3)`);
  if (uniqueAddresses1.size === 3) {
    console.log('✅ 测试通过！不同EOA生成了不同的抽象账户');
  } else {
    console.log('❌ 测试失败！不同EOA生成了相同的抽象账户');
    console.log('   这说明后端API可能只用了salt，没有用owner参数');
  }
  
  // 测试2: 使用同一个EOA，不同的salt值
  console.log('\n' + '='.repeat(80));
  console.log('📋 测试2: 相同EOA + 不同Salt');
  console.log('-'.repeat(80));
  
  const wallet2 = ethers.Wallet.createRandom();
  const owner2 = wallet2.address;
  console.log(`测试EOA: ${owner2}\n`);
  
  const accountsTest2 = [];
  for (let i = 0; i < 3; i++) {
    const salt = i;
    const abstractAddress = await getAccountAddress(owner2, salt);
    
    accountsTest2.push({ owner: owner2, salt, abstractAddress });
    
    console.log(`Salt=${i}:`);
    console.log(`  抽象账户: ${abstractAddress}`);
    console.log();
  }
  
  const uniqueAddresses2 = new Set(accountsTest2.map(a => a.abstractAddress));
  console.log(`结果: 生成了 ${uniqueAddresses2.size} 个不同的地址 (期望: 3)`);
  if (uniqueAddresses2.size === 3) {
    console.log('✅ 测试通过！不同salt生成了不同的抽象账户');
  } else {
    console.log('❌ 测试失败！不同salt生成了相同的抽象账户');
  }
  
  // 测试3: 使用基于地址的动态salt
  console.log('\n' + '='.repeat(80));
  console.log('📋 测试3: 不同EOA + 基于地址生成的动态Salt');
  console.log('-'.repeat(80));
  
  const accountsTest3 = [];
  for (let i = 0; i < 3; i++) {
    const wallet = ethers.Wallet.createRandom();
    const owner = wallet.address;
    const salt = generateSaltFromAddress(owner);
    const abstractAddress = await getAccountAddress(owner, salt);
    
    accountsTest3.push({ owner, salt, abstractAddress });
    
    console.log(`账户${i + 1}:`);
    console.log(`  EOA地址:    ${owner}`);
    console.log(`  动态Salt:   ${salt} (基于EOA地址哈希生成)`);
    console.log(`  抽象账户:   ${abstractAddress}`);
    console.log();
  }
  
  const uniqueAddresses3 = new Set(accountsTest3.map(a => a.abstractAddress));
  console.log(`结果: 生成了 ${uniqueAddresses3.size} 个不同的地址 (期望: 3)`);
  if (uniqueAddresses3.size === 3) {
    console.log('✅ 测试通过！使用动态salt确保了唯一性');
  } else {
    console.log('❌ 测试失败！');
  }
  
  // 测试4: 验证相同的 owner + salt 组合是否产生相同的地址（幂等性）
  console.log('\n' + '='.repeat(80));
  console.log('📋 测试4: 幂等性测试 (相同Owner+Salt应该产生相同地址)');
  console.log('-'.repeat(80));
  
  const wallet4 = ethers.Wallet.createRandom();
  const owner4 = wallet4.address;
  const salt4 = 12345;
  
  console.log(`EOA地址: ${owner4}`);
  console.log(`Salt值:  ${salt4}\n`);
  
  const address1 = await getAccountAddress(owner4, salt4);
  const address2 = await getAccountAddress(owner4, salt4);
  const address3 = await getAccountAddress(owner4, salt4);
  
  console.log(`第1次调用: ${address1}`);
  console.log(`第2次调用: ${address2}`);
  console.log(`第3次调用: ${address3}`);
  
  if (address1 === address2 && address2 === address3) {
    console.log('\n✅ 测试通过！相同参数产生相同地址（幂等性正常）');
  } else {
    console.log('\n❌ 测试失败！相同参数产生了不同地址');
  }
  
  // 总结
  console.log('\n' + '='.repeat(80));
  console.log('📊 测试总结');
  console.log('='.repeat(80));
  console.log(`测试1 (不同EOA+相同Salt):   ${uniqueAddresses1.size === 3 ? '✅ 通过' : '❌ 失败'}`);
  console.log(`测试2 (相同EOA+不同Salt):   ${uniqueAddresses2.size === 3 ? '✅ 通过' : '❌ 失败'}`);
  console.log(`测试3 (动态Salt):           ${uniqueAddresses3.size === 3 ? '✅ 通过' : '❌ 失败'}`);
  console.log(`测试4 (幂等性):             ${address1 === address2 && address2 === address3 ? '✅ 通过' : '❌ 失败'}`);
  
  console.log('\n💡 建议：');
  if (uniqueAddresses1.size !== 3) {
    console.log('⚠️  后端API似乎没有正确使用owner参数来计算地址');
    console.log('   请检查SimpleAccountFactory合约的getAddress函数实现');
    console.log('   地址应该基于: keccak256(abi.encodePacked(owner, salt))');
  } else {
    console.log('✅ 后端API工作正常！');
    console.log('   建议在前端使用动态salt（基于EOA地址）来确保每个EOA都有唯一的抽象账户');
  }
}

// 运行测试
main().catch(console.error);

