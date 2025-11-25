# 打卡数据上链存证实现指南

> 面向架构师和开发者  
> 版本: v1.0  
> 日期: 2025-11-23

---

## 📋 概述

本指南说明如何将zkp打卡数据上链存证。采用**IPFS + Merkle树 + 智能合约**的三层架构：

1. **IPFS层**：保存完整的打卡JSON数据，获取CID
2. **Merkle层**：将commitments构建为树，计算根哈希
3. **链上层**：将CID和Merkle根存储到智能合约

---

## 🎯 架构设计

```
打卡数据
  ↓
1️⃣ 本地存储 (Preferences)
  ├─ CheckInRecord[] (完整数据)
  └─ 统计信息
  ↓
2️⃣ 转换为存证包
  ├─ 提取公开数据
  ├─ 构建JSON格式
  └─ 生成哈希摘要
  ↓
3️⃣ 上传到IPFS
  └─ 获取CID (内容寻址哈希)
  ↓
4️⃣ 构建Merkle树
  ├─ 收集所有checkinCommitment
  ├─ 排序并填充至128个叶子
  └─ 计算Merkle根
  ↓
5️⃣ 上链存证
  ├─ 调用智能合约
  ├─ 记录 CID + Merkle根 + 时间戳
  ├─ 触发UserOperation (ERC-4337)
  └─ 返回交易哈希
  ↓
6️⃣ 验证流程
  ├─ 从IPFS获取数据
  ├─ 重新计算Merkle根
  └─ 与链上数据对比
```

---

## 📦 数据结构

### 打卡存证包 (CheckinAttestation)

```typescript
interface CheckinAttestation {
  // 元数据
  type: 'medical_checkin';                    // 数据类型
  version: '1.0';                             // 版本
  timestamp: number;                          // 生成时间戳
  userAddress: string;                        // 用户地址
  
  // 时间范围
  startDate: string;                          // YYYY-MM-DD
  endDate: string;                            // YYYY-MM-DD
  
  // 统计信息
  stats: {
    totalCount: number;                       // 打卡总数
    daysCovered: number;                      // 覆盖天数
    completionRate: number;                   // 完成率 (%)
  };
  
  // 打卡数据（公开）
  records: Array<{
    id: string;                               // 记录ID
    timestamp: number;
    medication_code: string;
    medication_name: string;
    dosage: string;
    checkin_commitment: string;               // 关键：打卡承诺
    synced: boolean;
  }>;
  
  // Merkle树信息
  merkleInfo: {
    leaves: string[];                         // 128个叶子（排序后的commitments + 填充）
    merkleRoot: string;                       // Merkle树根
    treeDepth: number;                        // 树深度 (7 = 2^7 = 128)
  };
  
  // 证明信息
  proofInfo: {
    zkpProof?: any;                           // ZKP证明（可选）
    publicSignals?: string[];                 // 公开信号
    calldata?: string;                        // 合约calldata
  };
  
  // 签名信息
  signature: {
    signer: string;                           // 签署者地址
    message: string;                          // 签署的消息哈希
    sig: string;                              // 签名值
  };
}
```

### 链上存证记录 (OnchainRecord)

```solidity
struct CheckinRecord {
    address user;                              // 用户地址
    string ipfsCID;                            // IPFS内容哈希
    bytes32 merkleRoot;                        // Merkle树根
    uint256 timestamp;                         // 存证时间
    uint256 recordCount;                       // 打卡记录数
    string dataHash;                           // 数据完整性校验
    bool verified;                             // 是否已验证
}
```

---

## 🔧 实现步骤

### 步骤1：创建存证数据打包服务

**文件**: `src/service/checkinAttestation.ts`

```typescript
import { Preferences } from '@capacitor/preferences';
import { checkinStorageService } from './checkinStorage';
import { zkpService } from './zkp';
import { weeklyCheckinService } from './weeklyCheckinService';

export interface CheckinAttestation {
  type: 'medical_checkin';
  version: '1.0';
  timestamp: number;
  userAddress: string;
  startDate: string;
  endDate: string;
  stats: {
    totalCount: number;
    daysCovered: number;
    completionRate: number;
  };
  records: Array<{
    id: string;
    timestamp: number;
    medication_code: string;
    medication_name: string;
    dosage: string;
    checkin_commitment: string;
    synced: boolean;
  }>;
  merkleInfo: {
    leaves: string[];
    merkleRoot: string;
    treeDepth: number;
  };
  proofInfo?: {
    zkpProof?: any;
    publicSignals?: string[];
    calldata?: string;
  };
}

class CheckinAttestationService {
  /**
   * 将日期范围内的打卡记录打包为存证数据
   */
  public async packageAttestation(
    userAddress: string,
    startDate: Date,
    endDate: Date
  ): Promise<CheckinAttestation> {
    try {
      console.log('📦 开始打包打卡存证...');
      
      // 1. 获取日期范围内的记录
      const records = await checkinStorageService.getRecordsByDateRange(startDate, endDate);
      console.log(`✅ 获取 ${records.length} 条记录`);
      
      // 2. 提取公开数据
      const publicRecords = records.map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        medication_code: r.medication_code,
        medication_name: r.medication_name,
        dosage: r.dosage,
        checkin_commitment: r.checkin_commitment,
        synced: r.synced,
      }));
      
      // 3. 计算统计数据
      const daySet = new Set<string>();
      records.forEach(r => {
        const day = new Date(r.timestamp).toISOString().split('T')[0];
        daySet.add(day);
      });
      
      // 4. 构建Merkle树
      const commits = records.map(r => r.checkin_commitment).sort((a, b) => a.localeCompare(b));
      const leaves = [...commits];
      while (leaves.length < 128) {
        leaves.push('0');
      }
      
      const merkleRoot = await weeklyCheckinService.calculateMerkleRoot(leaves);
      console.log(`✅ Merkle根: ${merkleRoot.slice(0, 40)}...`);
      
      // 5. 构建存证数据
      const attestation: CheckinAttestation = {
        type: 'medical_checkin',
        version: '1.0',
        timestamp: Date.now(),
        userAddress,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        stats: {
          totalCount: records.length,
          daysCovered: daySet.size,
          completionRate: Math.round((daySet.size / 7) * 100),
        },
        records: publicRecords,
        merkleInfo: {
          leaves,
          merkleRoot,
          treeDepth: 7,
        },
      };
      
      console.log('✅ 存证数据打包完成');
      return attestation;
    } catch (error: any) {
      console.error('❌ 打包存证数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 计算数据的完整性哈希
   */
  public calculateDataHash(attestation: CheckinAttestation): string {
    const { keccak256, toUtf8Bytes } = require('ethers');
    const dataStr = JSON.stringify(attestation);
    return keccak256(toUtf8Bytes(dataStr)).slice(2); // 移除0x前缀
  }
}

export const checkinAttestationService = new CheckinAttestationService();
```

### 步骤2：创建IPFS上传服务

**文件**: `src/service/ipfsService.ts`

```typescript
/**
 * IPFS服务
 * 支持两种模式：
 * 1. 使用Pinata等IPFS gateway服务
 * 2. 本地IPFS节点 (web3.storage等)
 */

interface IPFSUploadResult {
  cid: string;                                // IPFS内容哈希
  size: number;                               // 文件大小
  uploadTime: number;                         // 上传耗时
  gateway?: string;                           // IPFS网关URL
}

class IPFSService {
  private pinataApiUrl = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
  private pinataApiKey = process.env.VITE_PINATA_API_KEY || '';
  private pinataSecretKey = process.env.VITE_PINATA_SECRET_KEY || '';
  private web3StorageToken = process.env.VITE_WEB3_STORAGE_TOKEN || '';
  
  /**
   * 方案A：上传到Pinata (需要API密钥)
   */
  public async uploadToPinata(data: any): Promise<IPFSUploadResult> {
    try {
      const jsonStr = JSON.stringify(data);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      
      const formData = new FormData();
      formData.append('file', blob, `checkin_${Date.now()}.json`);
      
      // 添加Pinata元数据
      const metadata = {
        name: `Medical Checkin Attestation - ${Date.now()}`,
        keyvalues: {
          type: 'medical_checkin',
          timestamp: Date.now().toString(),
        },
      };
      formData.append('pinataMetadata', JSON.stringify(metadata));
      
      const startTime = Date.now();
      const response = await fetch(this.pinataApiUrl, {
        method: 'POST',
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Pinata上传失败: ${error}`);
      }
      
      const result = await response.json();
      const uploadTime = Date.now() - startTime;
      
      console.log(`✅ 数据已上传到Pinata - CID: ${result.IpfsHash}`);
      
      return {
        cid: result.IpfsHash,
        size: result.PinSize,
        uploadTime,
        gateway: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
      };
    } catch (error: any) {
      console.error('❌ Pinata上传失败:', error);
      throw error;
    }
  }
  
  /**
   * 方案B：上传到Web3.Storage (无需密钥配置，推荐用于MVP)
   */
  public async uploadToWeb3Storage(data: any): Promise<IPFSUploadResult> {
    try {
      const jsonStr = JSON.stringify(data);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      
      const formData = new FormData();
      formData.append('file', blob);
      
      const startTime = Date.now();
      const response = await fetch('https://api.web3.storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.web3StorageToken}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Web3.Storage上传失败: ${response.statusText}`);
      }
      
      const result = await response.json();
      const uploadTime = Date.now() - startTime;
      
      console.log(`✅ 数据已上传到Web3.Storage - CID: ${result.cid}`);
      
      return {
        cid: result.cid,
        size: blob.size,
        uploadTime,
        gateway: `https://${result.cid}.ipfs.dweb.link`,
      };
    } catch (error: any) {
      console.error('❌ Web3.Storage上传失败:', error);
      throw error;
    }
  }
  
  /**
   * 通用上传方法（自动选择最佳方案）
   */
  public async upload(data: any, preferredGateway: 'pinata' | 'web3storage' = 'web3storage'): Promise<IPFSUploadResult> {
    if (preferredGateway === 'pinata' && this.pinataApiKey) {
      return this.uploadToPinata(data);
    } else {
      return this.uploadToWeb3Storage(data);
    }
  }
  
  /**
   * 从IPFS网关读取数据
   */
  public async readFromIPFS(cid: string, gateway: string = 'https://gateway.pinata.cloud'): Promise<any> {
    try {
      const url = `${gateway}/ipfs/${cid}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`从IPFS读取失败: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('❌ 从IPFS读取失败:', error);
      throw error;
    }
  }
}

export const ipfsService = new IPFSService();
```

### 步骤3：创建上链存证服务

**文件**: `src/service/onchainAttestation.ts`

```typescript
import { ethers } from 'ethers';
import { aaService } from './accountAbstraction';
import { guardianService } from './guardian';
import type { UserOperation } from '@/service/accountAbstraction';

interface OnchainAttestationResult {
  txHash: string;                             // 交易哈希
  blockNumber?: number;                       // 区块号
  ipfsCID: string;                            // IPFS CID
  merkleRoot: string;                         // Merkle根
  timestamp: number;                          // 存证时间
}

class OnchainAttestationService {
  // 存证合约地址（需要部署）
  private attestationContractAddress = '0x...'; // TODO: 部署合约后填入
  
  // 简化的ABI (仅包含关键方法)
  private attestationABI = [
    {
      type: 'function',
      name: 'recordAttestation',
      inputs: [
        { name: 'ipfsCID', type: 'string' },
        { name: 'merkleRoot', type: 'bytes32' },
        { name: 'dataHash', type: 'bytes32' },
        { name: 'recordCount', type: 'uint256' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'event',
      name: 'AttestationRecorded',
      inputs: [
        { name: 'user', type: 'address', indexed: true },
        { name: 'ipfsCID', type: 'string' },
        { name: 'merkleRoot', type: 'bytes32' },
        { name: 'timestamp', type: 'uint256' },
      ],
    },
  ];
  
  /**
   * 将数据上链存证
   */
  public async attestOnchain(
    ipfsCID: string,
    merkleRoot: string,
    dataHash: string,
    recordCount: number
  ): Promise<OnchainAttestationResult> {
    try {
      console.log('⛓️ 开始上链存证...');
      console.log('📌 CID:', ipfsCID);
      console.log('🌳 Merkle根:', merkleRoot);
      
      // 1. 获取用户地址
      const userAddress = aaService.getAbstractAccountAddress();
      if (!userAddress) {
        throw new Error('未找到用户账户地址');
      }
      
      // 2. 构建合约交互数据
      const iface = new ethers.Interface(this.attestationABI);
      const callData = iface.encodeFunctionData('recordAttestation', [
        ipfsCID,
        merkleRoot,
        dataHash,
        recordCount,
      ]);
      
      console.log('✅ CallData已生成');
      
      // 3. 通过ERC-4337 Account Abstraction执行交易
      const result = await aaService.executeTransaction(
        this.attestationContractAddress,
        '0', // 不发送ETH
        callData
      );
      
      const timestamp = Date.now();
      
      console.log('✅ 上链成功！');
      console.log('📝 交易哈希:', result.txHash);
      
      return {
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        ipfsCID,
        merkleRoot,
        timestamp,
      };
    } catch (error: any) {
      console.error('❌ 上链存证失败:', error);
      throw error;
    }
  }
  
  /**
   * 验证链上数据
   */
  public async verifyOnchain(
    userAddress: string,
    attestationHash: string
  ): Promise<{
    ipfsCID: string;
    merkleRoot: string;
    verified: boolean;
  }> {
    try {
      // TODO: 从链上读取并验证数据
      // 这需要连接到区块链RPC端点
      console.log('🔍 验证链上数据...');
      
      // 示例实现
      return {
        ipfsCID: '',
        merkleRoot: '',
        verified: false,
      };
    } catch (error: any) {
      console.error('❌ 验证失败:', error);
      throw error;
    }
  }
}

export const onchainAttestationService = new OnchainAttestationService();
```

### 步骤4：完整上链工作流

**文件**: `src/service/checkinOnchainFlow.ts`

```typescript
import { checkinAttestationService } from './checkinAttestation';
import { ipfsService } from './ipfsService';
import { onchainAttestationService } from './onchainAttestation';
import { authService } from './auth';

interface OnchainFlowResult {
  success: boolean;
  ipfsCID: string;
  merkleRoot: string;
  txHash: string;
  timestamp: number;
  gateway?: string;
}

class CheckinOnchainFlowService {
  /**
   * 完整上链流程：打包 → IPFS → 链上存证
   */
  public async attestCheckinDataOnchain(
    startDate: Date,
    endDate: Date
  ): Promise<OnchainFlowResult> {
    try {
      console.log('🚀 开始完整上链流程...\n');
      
      // 步骤1: 获取用户地址
      const userInfo = await authService.getCurrentUser();
      if (!userInfo?.smart_account) {
        throw new Error('无法获取用户地址');
      }
      
      console.log('1️⃣ 用户地址:', userInfo.smart_account);
      
      // 步骤2: 打包存证数据
      console.log('\n2️⃣ 打包打卡数据...');
      const attestation = await checkinAttestationService.packageAttestation(
        userInfo.smart_account,
        startDate,
        endDate
      );
      
      // 计算数据哈希
      const dataHash = checkinAttestationService.calculateDataHash(attestation);
      console.log('   数据哈希:', dataHash);
      
      // 步骤3: 上传到IPFS
      console.log('\n3️⃣ 上传到IPFS...');
      const ipfsResult = await ipfsService.upload(attestation);
      console.log('   CID:', ipfsResult.cid);
      console.log('   大小:', ipfsResult.size, 'bytes');
      console.log('   网关:', ipfsResult.gateway);
      
      // 步骤4: 上链存证
      console.log('\n4️⃣ 上链存证...');
      const onchainResult = await onchainAttestationService.attestOnchain(
        ipfsResult.cid,
        attestation.merkleInfo.merkleRoot,
        dataHash,
        attestation.records.length
      );
      
      console.log('   交易哈希:', onchainResult.txHash);
      
      // 步骤5: 保存存证信息到本地
      console.log('\n5️⃣ 保存存证信息...');
      await this.saveAttestationRecord({
        ipfsCID: ipfsResult.cid,
        merkleRoot: attestation.merkleInfo.merkleRoot,
        txHash: onchainResult.txHash,
        timestamp: onchainResult.timestamp,
        startDate,
        endDate,
        recordCount: attestation.records.length,
      });
      
      console.log('\n✅ 上链流程完成！\n');
      
      return {
        success: true,
        ipfsCID: ipfsResult.cid,
        merkleRoot: attestation.merkleInfo.merkleRoot,
        txHash: onchainResult.txHash,
        timestamp: onchainResult.timestamp,
        gateway: ipfsResult.gateway,
      };
    } catch (error: any) {
      console.error('❌ 上链流程失败:', error);
      throw error;
    }
  }
  
  /**
   * 保存存证记录到本地
   */
  private async saveAttestationRecord(record: any): Promise<void> {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const key = `attestation_${record.txHash}`;
      await Preferences.set({
        key,
        value: JSON.stringify(record),
      });
      console.log('   ✅ 存证记录已保存');
    } catch (error) {
      console.error('保存存证记录失败:', error);
    }
  }
}

export const checkinOnchainFlowService = new CheckinOnchainFlowService();
```

---

## 🛠️ 智能合约示例

**CheckinAttestation.sol** (需要部署到链上)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * 打卡存证合约
 * 用于记录和验证打卡数据的IPFS CID和Merkle根
 */
contract CheckinAttestation {
    
    struct AttestationRecord {
        address user;
        string ipfsCID;
        bytes32 merkleRoot;
        bytes32 dataHash;
        uint256 timestamp;
        uint256 recordCount;
        bool verified;
    }
    
    // 存证记录映射
    mapping(bytes32 => AttestationRecord) public attestations;
    
    // 用户存证历史
    mapping(address => bytes32[]) public userAttestations;
    
    event AttestationRecorded(
        address indexed user,
        bytes32 indexed attHash,
        string ipfsCID,
        bytes32 merkleRoot,
        uint256 timestamp,
        uint256 recordCount
    );
    
    event AttestationVerified(
        bytes32 indexed attHash,
        bool verified,
        uint256 verifyTime
    );
    
    /**
     * 记录存证
     */
    function recordAttestation(
        string memory ipfsCID,
        bytes32 merkleRoot,
        bytes32 dataHash,
        uint256 recordCount
    ) public {
        require(bytes(ipfsCID).length > 0, "CID cannot be empty");
        require(merkleRoot != bytes32(0), "Merkle root cannot be zero");
        
        bytes32 attHash = keccak256(
            abi.encodePacked(msg.sender, ipfsCID, merkleRoot, block.timestamp)
        );
        
        AttestationRecord storage record = attestations[attHash];
        record.user = msg.sender;
        record.ipfsCID = ipfsCID;
        record.merkleRoot = merkleRoot;
        record.dataHash = dataHash;
        record.timestamp = block.timestamp;
        record.recordCount = recordCount;
        record.verified = false;
        
        userAttestations[msg.sender].push(attHash);
        
        emit AttestationRecorded(
            msg.sender,
            attHash,
            ipfsCID,
            merkleRoot,
            block.timestamp,
            recordCount
        );
    }
    
    /**
     * 获取存证记录
     */
    function getAttestation(bytes32 attHash)
        public
        view
        returns (AttestationRecord memory)
    {
        return attestations[attHash];
    }
    
    /**
     * 获取用户存证历史
     */
    function getUserAttestations(address user)
        public
        view
        returns (bytes32[] memory)
    {
        return userAttestations[user];
    }
    
    /**
     * 标记为已验证
     */
    function markVerified(bytes32 attHash) public {
        require(attestations[attHash].user != address(0), "Attestation not found");
        attestations[attHash].verified = true;
        
        emit AttestationVerified(attHash, true, block.timestamp);
    }
}
```

---

## 📝 使用示例

### 基本使用流程

```typescript
// 1. 打包、上传、上链 (一键完成)
const result = await checkinOnchainFlowService.attestCheckinDataOnchain(
  new Date('2025-11-01'),
  new Date('2025-11-30')
);

console.log('✅ 上链成功！');
console.log('CID:', result.ipfsCID);
console.log('Merkle根:', result.merkleRoot);
console.log('交易哈希:', result.txHash);
console.log('IPFS网关:', result.gateway);
```

### 分步操作

```typescript
// 步骤1: 打包数据
const attestation = await checkinAttestationService.packageAttestation(
  userAddress,
  startDate,
  endDate
);

// 步骤2: 上传到IPFS
const ipfsResult = await ipfsService.upload(attestation);

// 步骤3: 上链存证
const onchainResult = await onchainAttestationService.attestOnchain(
  ipfsResult.cid,
  attestation.merkleInfo.merkleRoot,
  dataHash,
  attestation.records.length
);
```

---

## 🔐 安全考虑

| 项目 | 说明 | 实现方式 |
|------|------|---------|
| 数据完整性 | 防止篡改 | Keccak256哈希 + 链上记录 |
| 数据隐私 | 隐藏敏感信息 | 只上链public数据 + commitments |
| 访问控制 | 只有用户能记录 | ERC-4337智能账户所有权 |
| 时间戳 | 防止时间相关攻击 | 链上区块时间戳 |
| Merkle证明 | 数据子集验证 | Merkle树 + Merkle路径 |

---

## 💾 存储成本估算

| 操作 | 成本 | 说明 |
|------|------|------|
| IPFS上传 | 免费或低成本 | Pinata/Web3.Storage |
| 合约调用 | ~50k gas | 取决于链和网络状态 |
| 数据存储 | ~20k gas | CID字符串存储 |
| **总计** | **~70k gas** | 约$2-20 (取决于网络) |

---

## 🚀 后续优化

### 短期 (MVP)
- [x] 基础上链存证
- [ ] 前端UI集成
- [ ] 合约部署和测试

### 中期
- [ ] 批量存证 (多周数据)
- [ ] 零知识证明集成 (隐私增强)
- [ ] 跨链桥接

### 长期
- [ ] 数据市场 (交换打卡数据)
- [ ] DAO治理 (验证规则投票)
- [ ] NFT证书 (可视化存证)

---

## 📚 相关文档

- [ZKP打卡实现总结](./zkp-打卡功能-实现总结.md)
- [ZKP验证API](./zkp-checkin-verification-api.md)
- [API网关完整参考](./api-gateway-complete-reference.md)


