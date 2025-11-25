# 打卡数据上链实现路线图

## 🎯 快速答案

**是的，使用IPFS保存JSON然后上链CID是正确的做法！**

### 推荐架构：
```
打卡JSON数据
    ↓
上传到IPFS → 获取CID (Qm...)
    ↓
合约记录CID + Merkle根 + 时间戳
    ↓
链上存证完成，实现数据不可篡改
```

---

## 📊 完整方案对比

### 方案1️⃣：IPFS + Merkle根（推荐 ✅）

```
优点:
✅ 数据存储高效（JSON在IPFS）
✅ 内容寻址（CID永远指向相同数据）
✅ 大数据量支持（链上只存CID，不需存储所有数据）
✅ 隐私保护（commitments只在链上，原始数据在IPFS）
✅ 验证高效（Merkle树证明，O(log n)复杂度）

缺点:
❌ 依赖IPFS节点可用性
❌ 需要管理IPFS Gateway
```

### 方案2️⃣：全量上链

```
优点:
✅ 完全去中心化
✅ 数据完全透明

缺点:
❌ Gas费用极高（每条记录数百~数千$）
❌ 链的存储压力大
❌ 不实用
```

### 方案3️⃣：混合方案（IPFS + 链上哈希）

```
优点:
✅ 兼顾安全性和成本
✅ 可验证数据完整性

说明:
- IPFS存储: 完整的打卡JSON
- 链上记录: CID + Merkle根 + 数据哈希
```

---

## 🔄 完整数据流程图

```
用户打卡
  ↓
[前端本地存储]
  ├─ CheckInRecord[] (Preferences)
  ├─ 包含: commitments, proof, salts等
  └─ 完全私密（不上传）
  ↓
[存证打包] ← checkinAttestation.ts
  ├─ 提取公开数据
  ├─ 构建Merkle树 (commitments as leaves)
  ├─ 计算Merkle根 (只公开一个值)
  ├─ 生成JSON包
  └─ 计算数据哈希 (完整性校验)
  ↓
[IPFS上传] ← ipfsService.ts
  ├─ 支持Pinata或Web3.Storage
  ├─ 获取CID (e.g., QmXxxx...)
  └─ 返回网关URL (可访问的HTTPS链接)
  ↓
[上链存证] ← onchainAttestation.ts
  ├─ 调用合约: recordAttestation(CID, merkleRoot, dataHash, count)
  ├─ 通过ERC-4337构建UserOperation
  ├─ Paymaster赞助gas
  └─ 返回交易哈希
  ↓
[验证流程]
  ├─ 从IPFS读取: https://gateway.ipfs.io/ipfs/CID
  ├─ 重新计算Merkle根
  └─ 与链上数据对比 ✅
```

---

## 📦 核心数据包结构

### CheckinAttestation (IPFS中的JSON)

```json
{
  "type": "medical_checkin",
  "version": "1.0",
  "timestamp": 1700000000000,
  "userAddress": "0xAbc123...",
  "startDate": "2025-11-01",
  "endDate": "2025-11-30",
  
  "stats": {
    "totalCount": 90,
    "daysCovered": 30,
    "completionRate": 100
  },
  
  "records": [
    {
      "id": "checkin_abc123",
      "timestamp": 1700000000000,
      "medication_code": "ASPIRIN_500",
      "medication_name": "阿司匹林",
      "dosage": "100mg",
      "checkin_commitment": "12345...789",  ← 核心数据！
      "synced": true
    },
    ...
  ],
  
  "merkleInfo": {
    "leaves": ["12345...789", "23456...890", ...],  ← 128个叶子
    "merkleRoot": "98765...432",                      ← 链上记录这个！
    "treeDepth": 7
  }
}
```

### 链上存证记录 (OnchainRecord)

```solidity
{
  user: 0xAbc123...,              // 用户地址
  ipfsCID: "QmXxxx...",           // IPFS内容哈希 ← 核心
  merkleRoot: 0x98765...432,      // Merkle树根 ← 验证用
  dataHash: 0xabcd...,            // 数据完整性校验
  timestamp: 1700000000,          // 区块时间戳
  recordCount: 90,                // 打卡数
  verified: false                 // 验证状态
}
```

---

## 💡 为什么选择IPFS + Merkle？

### 成本对比

| 存储方案 | Gas成本 | 费用(USD) | 可扩展性 |
|---------|--------|---------|---------|
| 全量上链 | 2M+ gas | $50-200 | ❌ 很差 |
| IPFS + Merkle | 70k gas | $2-10 | ✅ 极好 |
| 仅上链哈希 | 20k gas | $1-2 | ⚠️ 难以验证 |

### 隐私对比

| 方案 | 隐私等级 | 说明 |
|------|---------|------|
| 全量上链 | 0 | 所有数据公开，医疗隐私泄露 |
| IPFS + Merkle | ⭐⭐⭐⭐⭐ | 只链上存commitments和Merkle根，数据保密 |

### 验证能力

```
方案: IPFS + Merkle树

验证流程:
1. 从IPFS下载数据: curl https://gateway.ipfs.io/ipfs/QmXxxx...
2. 验证数据完整性: 计算hash(data) 是否等于链上dataHash
3. 验证Merkle根: 重新计算Merkle(leaves) 是否等于链上merkleRoot
4. 单条记录验证: 使用Merkle路径验证某条记录

✅ 完全可验证，完全透明！
```

---

## 🎬 实现优先级

### Phase 1️⃣: MVP (2周)

#### 后端需要
```typescript
// src/service/checkinAttestation.ts
- packageAttestation()        // ✅ 打包数据
- calculateDataHash()         // ✅ 计算哈希

// src/service/ipfsService.ts
- upload()                    // ✅ IPFS上传
- read()                      // ✅ IPFS读取

// src/service/onchainAttestation.ts
- attestOnchain()             // ✅ 上链
```

#### 前端需要
```vue
<!-- src/views/elderly/CheckinOnchain.vue (新增) -->
- 显示存证历史
- 上链按钮
- CID展示和复制
- IPFS网关链接
```

#### 智能合约
```solidity
// CheckinAttestation.sol (需要部署)
- recordAttestation()         // 记录存证
- getAttestation()            // 查询存证
- verifyAttestation()         // 验证数据
```

**预计工作量**: 2周

---

### Phase 2️⃣: 增强 (3周)

- 批量存证 (多周数据一起)
- ZKP整合 (隐私证明)
- 自动上链 (定期自动执行)
- 存证管理UI

**预计工作量**: 3周

---

### Phase 3️⃣: 生产化 (2周)

- 性能优化
- 错误处理完善
- 安全审计
- 文档完善

**预计工作量**: 2周

---

## 🔧 关键配置

### 环境变量 (.env)

```bash
# IPFS配置
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud
VITE_PINATA_API_KEY=your_api_key
VITE_PINATA_SECRET_KEY=your_secret_key

# 或使用Web3.Storage (推荐)
VITE_WEB3_STORAGE_TOKEN=your_token

# 存证合约地址
VITE_ATTESTATION_CONTRACT=0x...

# RPC端点
VITE_RPC_URL=https://rpc-url
```

### 合约部署步骤

```bash
# 1. 编译合约
npx hardhat compile

# 2. 部署到测试网
npx hardhat run scripts/deploy.js --network sepolia

# 3. 更新addresses.json
# 添加: "CheckinAttestation": { "address": "0x..." }

# 4. 验证合约
npx hardhat verify --network sepolia 0x... 
```

---

## 📈 可观测性指标

### 监控指标

```typescript
// 需要集成的指标
1. IPFS上传成功率
   - 总上传数
   - 成功数
   - 平均延迟

2. 链上交易成功率
   - 总交易数
   - 成功数
   - 平均Gas消耗

3. 验证成功率
   - 数据完整性检验
   - Merkle根验证
   - 子记录验证

4. 用户行为
   - 存证频率
   - 访问存证的用户数
   - 平均数据包大小
```

---

## ⚠️ 常见问题

### Q1: IPFS的CID会变吗？
**A**: 不会。相同数据的CID永远相同。这就是IPFS的核心特性（内容寻址）。

### Q2: 如果IPFS节点下线怎么办？
**A**: 有多个解决方案：
- 使用Filecoin (长期存储)
- 多网关备份 (Pinata, Web3.Storage等)
- 自己运行IPFS节点

### Q3: 验证数据需要什么权限？
**A**: 只需要公开的IPFS网关URL，任何人都可以验证。

### Q4: Gas费用多少？
**A**: 约70k gas，大约$2-20 (取决于链和网络拥堵情况)

### Q5: 能不能直接上链所有数据？
**A**: 技术上可以，但**不推荐**：
- 费用太高（可能数百刀）
- 医疗隐私泄露
- 链性能不足

---

## 📚 参考资源

| 资源 | 链接 | 说明 |
|------|------|------|
| IPFS文档 | https://docs.ipfs.io | 官方文档 |
| Pinata | https://pinata.cloud | IPFS网关服务 |
| Web3.Storage | https://web3.storage | 免费IPFS服务 |
| ethers.js | https://docs.ethers.org | Web3库 |
| ERC-4337 | https://eips.ethereum.org/EIPS/eip-4337 | 账户抽象标准 |

---

## 🚀 下一步

1. **阅读详细指南**: 参考 `doc/checkin-onchain-storage-guide.md`
2. **实现Phase 1**: 创建三个核心服务
3. **部署测试合约**: 部署CheckinAttestation合约
4. **集成前端UI**: 创建存证管理页面
5. **测试端到端流程**: 完整的打包→上传→上链测试

---

**最后更新**: 2025-11-23  
**维护者**: ZK App MVP团队

