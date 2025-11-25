# 打卡上链快速参考卡

## 📋 核心概念

### 三层架构

```
Layer 1: 本地存储 (Preferences)
  └─ CheckInRecord[] (包含所有敏感数据)

Layer 2: IPFS存储 (分布式)  
  └─ CheckinAttestation JSON (公开数据 + commitments)
     └─ CID: QmXxxx... (内容哈希)

Layer 3: 链上存证 (不可篡改)
  └─ SmartContract
     ├─ ipfsCID
     ├─ merkleRoot
     ├─ dataHash
     └─ timestamp
```

---

## 🔑 关键数据

### CheckinAttestation (IPFS中)

```json
{
  "records": [
    {
      "id": "checkin_123",
      "timestamp": 1700000000,
      "medication_code": "ASPIRIN",
      "medication_name": "阿司匹林",
      "dosage": "100mg",
      "checkin_commitment": "123456789...",
      "synced": true
    }
  ],
  "merkleInfo": {
    "leaves": ["123456789...", "234567890...", ...],
    "merkleRoot": "abcdef123456...",
    "treeDepth": 7
  }
}
```

### 链上记录 (SmartContract)

```solidity
{
  user: 0xAbc123...,
  ipfsCID: "QmXxxx...",           // ← 指向IPFS的JSON
  merkleRoot: 0x98765...432,      // ← 用于验证
  dataHash: 0xabcd...,            // ← 完整性校验
  timestamp: 1700000000,          // ← 存证时间
  recordCount: 90                 // ← 数据量
}
```

---

## 🔄 工作流程

### 完整流程 (一键上链)

```bash
1. checkinOnchainFlowService.attestCheckinDataOnchain(startDate, endDate)

   ├─ checkinAttestationService.packageAttestation()
   │  └─ 打包: 提取公开数据 + 构建Merkle树
   │
   ├─ ipfsService.upload()
   │  └─ 上传IPFS, 获取CID
   │
   ├─ onchainAttestationService.attestOnchain()
   │  └─ 调用合约, 返回交易哈希
   │
   └─ saveAttestationRecord()
      └─ 保存到本地

返回: { ipfsCID, merkleRoot, txHash, gateway }
```

### 分步流程

```typescript
// 步骤1: 打包
const att = await checkinAttestationService.packageAttestation(
  userAddr, startDate, endDate
);

// 步骤2: 上传
const ipfs = await ipfsService.upload(att);
// { cid: "QmXxxx...", gateway: "https://..." }

// 步骤3: 上链
const tx = await onchainAttestationService.attestOnchain(
  ipfs.cid,
  att.merkleInfo.merkleRoot,
  dataHash,
  att.records.length
);
// { txHash: "0x...", blockNumber: 123456 }
```

---

## 📊 成本对比

| 方案 | Gas消耗 | 费用(USD) | 隐私 | 可扩展性 |
|-----|--------|---------|------|---------|
| IPFS + Merkle | 70k | $2-10 | ⭐⭐⭐⭐⭐ | ✅ |
| 全量上链 | 2M+ | $50-200 | ❌ | ❌ |
| 仅Hash | 20k | $1-2 | ⭐⭐ | ⚠️ |

---

## 🛠️ 核心方法

### CheckinAttestationService

```typescript
// 打包存证数据
packageAttestation(
  userAddress: string,
  startDate: Date,
  endDate: Date
): Promise<CheckinAttestation>

// 计算数据哈希
calculateDataHash(
  attestation: CheckinAttestation
): string
```

### IPFSService

```typescript
// 上传到IPFS (自动选择网关)
upload(
  data: any,
  preferredGateway?: 'pinata' | 'web3storage'
): Promise<IPFSUploadResult>

// 读取IPFS数据
readFromIPFS(
  cid: string,
  gateway?: string
): Promise<any>
```

### OnchainAttestationService

```typescript
// 上链存证
attestOnchain(
  ipfsCID: string,
  merkleRoot: string,
  dataHash: string,
  recordCount: number
): Promise<OnchainAttestationResult>

// 验证链上数据
verifyOnchain(
  userAddress: string,
  attestationHash: string
): Promise<VerificationResult>
```

### CheckinOnchainFlowService

```typescript
// 完整流程 (推荐)
attestCheckinDataOnchain(
  startDate: Date,
  endDate: Date
): Promise<OnchainFlowResult>
```

---

## ✅ 验证流程

### 完整性验证

```typescript
// 1. 下载数据
const data = await ipfsService.readFromIPFS(cid);

// 2. 验证完整性
const calculatedHash = calculateDataHash(data);
const chainHash = await getOnchainDataHash(cid);
assert(calculatedHash === chainHash); // ✅

// 3. 验证Merkle根
const calculatedRoot = await calculateMerkleRoot(data.leaves);
const chainRoot = await getOnchainMerkleRoot(cid);
assert(calculatedRoot === chainRoot); // ✅
```

### 子记录验证 (Merkle证明)

```typescript
// 验证某条打卡记录是否在Merkle树中
const record = data.records[0];
const proof = generateMerkleProof(data.merkleInfo.leaves, 0);
const verified = verifyMerkleProof(
  record.checkin_commitment,
  proof,
  data.merkleInfo.merkleRoot
);
assert(verified); // ✅
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install ethers circomlibjs snarkjs
```

### 2. 配置环境变量

```bash
# .env
VITE_WEB3_STORAGE_TOKEN=your_token
VITE_ATTESTATION_CONTRACT=0x...
```

### 3. 基本使用

```typescript
import { checkinOnchainFlowService } from '@/service/checkinOnchainFlow';

// 上链打卡数据
const result = await checkinOnchainFlowService.attestCheckinDataOnchain(
  new Date('2025-11-01'),
  new Date('2025-11-30')
);

console.log('✅ 上链成功！');
console.log('CID:', result.ipfsCID);
console.log('Tx:', result.txHash);
console.log('网关:', result.gateway);
```

---

## 📱 UI组件需求

### CheckinAttestationList

```vue
<template>
  <div>
    <!-- 存证历史列表 -->
    <div v-for="att in attestations" :key="att.cid">
      <h3>{{ att.startDate }} - {{ att.endDate }}</h3>
      <p>📦 CID: {{ att.cid }}</p>
      <p>🌳 Merkle根: {{ att.merkleRoot }}</p>
      <p>⛓️ 交易: {{ att.txHash }}</p>
      <a :href="att.gateway" target="_blank">📖 IPFS网关</a>
      <button @click="verify(att)">✅ 验证</button>
    </div>
  </div>
</template>
```

### AttestationButton

```vue
<template>
  <button 
    @click="attestData"
    :disabled="isLoading"
  >
    {{ isLoading ? '⏳ 上链中...' : '⛓️ 上链存证' }}
  </button>
</template>

<script>
async function attestData() {
  try {
    const result = await checkinOnchainFlowService.attestCheckinDataOnchain(
      startDate,
      endDate
    );
    showSuccess(`上链成功! CID: ${result.ipfsCID}`);
  } catch (error) {
    showError(`上链失败: ${error.message}`);
  }
}
</script>
```

---

## 🔐 安全检查清单

- [ ] 数据打包只包含公开信息
- [ ] 盐值和私钥保留在本地
- [ ] IPFS上传使用加密传输
- [ ] 合约调用使用ERC-4337
- [ ] Gas赞助通过Paymaster
- [ ] 数据哈希链上验证
- [ ] Merkle根链上验证
- [ ] 审计日志完整

---

## 🐛 常见问题

**Q: IPFS节点挂了怎么办？**  
A: 使用多网关备份 (Pinata + Web3.Storage)，或运行自己的节点。

**Q: CID会重复吗？**  
A: 不会，相同数据的CID永远相同，这就是内容寻址。

**Q: 验证需要什么？**  
A: 只需要公开的IPFS网关和Merkle算法，任何人都可以验证。

**Q: 费用谁支付？**  
A: ERC-4337 Paymaster支付，用户无需支付Gas。

**Q: 能修改数据吗？**  
A: 不能，修改任何数据CID都会改变，链上记录的CID会失配。

---

## 📞 联系方式

- 文档: `doc/checkin-onchain-storage-guide.md`
- 路线图: `doc/IMPLEMENTATION_ROADMAP.md`
- 代码示例: 见各service文件

---

**最后更新**: 2025-11-23  
**状态**: ✅ 建议阅读顺序: 本文 → 路线图 → 完整指南

