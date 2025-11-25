# ZKP 打卡功能 - 实现总结

> **日期**: 2025-11-04  
> **功能**: 老人端单日打卡 ZKP 证明生成与验证

---

## 📋 需求概述

实现老人端的药物打卡功能，满足以下要求：

1. ✅ **直接打卡**: 点击打卡按钮即可，无需扫码
2. ✅ **本地生成证明**: 单日打卡的 ZKP 证明在前端本地生成
3. ✅ **后端验证**: 通过 API 验证证明有效性
4. ✅ **本地存储**: 验证成功后保存到本地
5. ✅ **删除周总结本地生成**: 周总结证明由后端 API 生成

---

## 🎯 实现功能

### 1. ZKP 服务优化 (`src/service/zkp.ts`)

#### 修改内容

**新增功能**:
- ✅ `generateCalldata()`: 生成智能合约验证所需的 calldata
- ✅ `generateMedicalProof()` 返回值增加 `calldata` 字段

**删除功能**:
- ❌ 删除 `generateWeeklyProof()`: 周总结证明由后端生成
- ❌ 删除 `calculateMerkleRoot()`: 不再需要本地计算 Merkle 树
- ❌ 删除 `verifyProof()`: 验证由后端完成

**保留功能**:
- ✅ `generateCommitments()`: 生成用户、药物、打卡三个 commitment
- ✅ `poseidonHash()`: Poseidon 哈希计算
- ✅ `generateSalt()`: 生成随机盐值
- ✅ `addressToBigInt()`: 地址转 BigInt
- ✅ `medicationCodeToBigInt()`: 药物代码转 BigInt

#### 关键代码

```typescript
/**
 * 生成单次打卡ZKP证明（含calldata）
 */
public async generateMedicalProof(input: MedicalProofInput): Promise<MedicalProofOutput & { calldata: string }> {
  // 1. 生成 commitments
  const commitments = await this.generateCommitments(...);
  
  // 2. 生成证明
  const { proof, publicSignals } = await groth16.fullProve(
    circuitInput,
    this.medicalWasmPath,
    this.medicalZkeyPath
  );
  
  // 3. 生成 calldata
  const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
  
  return {
    proof,
    publicSignals,
    userIdCommitment,
    medicationCommitment,
    checkinCommitment,
    calldata, // 新增
  };
}
```

---

### 2. 首页打卡功能 (`src/views/core/Home.vue`)

#### 功能实现

**UI 改进**:
- ✅ 任务卡片显示打卡按钮（待打卡状态）
- ✅ 显示"已完成"状态（已打卡）
- ✅ 显示"需在线"提示（解密失败）
- ✅ 打卡中显示 loading 状态

**打卡流程**:

```typescript
const handleCheckIn = async (task: any) => {
  // 1. 获取用户信息
  const user = await authService.getUserInfo();
  const wallet = await aaService.getEOAWallet();
  
  // 2. 生成 ZKP 证明
  const userIdSalt = zkpService.generateSalt();
  const medicationSalt = zkpService.generateSalt();
  
  const zkpResult = await zkpService.generateMedicalProof({
    userId: user.smart_account,
    medicationCode: task.medicationCode,
    userIdSalt,
    medicationSalt,
  });
  
  // 3. 调用后端验证接口
  const verifyResp = await fetch(`${API_GATEWAY_URL}/zkp/verify/medical`, {
    method: 'POST',
    headers: { ...headers },
    body: JSON.stringify({
      calldata: zkpResult.calldata,
      proof: zkpResult.proof,
      publicSignals: zkpResult.publicSignals,
      userIdCommitment: zkpResult.userIdCommitment,
      medicationCommitment: zkpResult.medicationCommitment,
      checkinCommitment: zkpResult.checkinCommitment,
    }),
  });
  
  // 4. 验证成功后保存到本地
  const checkinRecord = {
    id: `checkin_${Date.now()}_...`,
    user_address: user.smart_account,
    medication_code: task.medicationCode,
    medication_name: task.medication,
    // ZKP 数据
    user_id_salt: userIdSalt,
    medication_salt: medicationSalt,
    user_id_commitment: zkpResult.userIdCommitment,
    medication_commitment: zkpResult.medicationCommitment,
    checkin_commitment: zkpResult.checkinCommitment,
    proof: zkpResult.proof,
    public_signals: zkpResult.publicSignals,
    calldata: zkpResult.calldata,
    // 验证状态
    verified: true,
    verified_at: new Date().toISOString(),
  };
  
  await checkinStorageService.saveCheckInRecord(checkinRecord);
  
  // 5. 更新 UI
  task.status = 'completed';
  completedTasks.value++;
};
```

#### UI 效果

**任务卡片（待打卡）**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
08:00
阿司匹林肠溶片
100mg，每日一次
📋 早餐后30分钟服用，整片吞服
                         [打卡]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**任务卡片（已打卡）**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
08:00
阿司匹林肠溶片
100mg，每日一次
📋 早餐后30分钟服用，整片吞服
                    [✓ 已完成]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📊 数据流程

### 完整打卡流程

```
用户点击打卡
    ↓
获取用户信息和钱包
    ↓
生成随机盐值（userIdSalt, medicationSalt）
    ↓
调用 zkpService.generateMedicalProof()
    ├─ 计算 userIdCommitment
    ├─ 计算 medicationCommitment
    ├─ 计算 checkinCommitment
    ├─ 生成 ZKP 证明（snarkjs）
    └─ 生成 calldata
    ↓
调用后端验证接口
POST /api/zkp/verify/medical
    ├─ 验证 calldata
    ├─ 验证 proof
    └─ 返回验证结果
    ↓
验证成功
    ↓
保存打卡记录到本地
    ├─ 基本信息
    ├─ ZKP 证明数据
    └─ 验证状态
    ↓
更新 UI（显示已完成）
    ↓
完成 ✅
```

### ZKP 证明生成流程

```
输入:
- userId (用户地址)
- medicationCode (药物代码)
- userIdSalt (随机)
- medicationSalt (随机)

步骤1: 计算 Commitments
  userIdCommitment = Poseidon(userId, userIdSalt)
  medicationCommitment = Poseidon(medicationCode, medicationSalt)
  checkinCommitment = Poseidon(userIdCommitment, medicationCommitment)

步骤2: 生成 ZKP 证明
  使用 snarkjs groth16.fullProve()
  输入: medical.wasm, medical.zkey
  输出: { proof, publicSignals }

步骤3: 生成 Calldata
  使用 snarkjs groth16.exportSolidityCallData()
  输出: calldata 字符串

输出:
{
  proof: { pi_a, pi_b, pi_c },
  publicSignals: [userIdCommitment, medicationCommitment, checkinCommitment],
  userIdCommitment: "123...",
  medicationCommitment: "456...",
  checkinCommitment: "789...",
  calldata: "0x..."
}
```

---

## 🔒 隐私保护

### 证明内容

**隐藏（私密输入）**:
- ❌ 用户地址（userId）
- ❌ 药物代码（medicationCode）
- ❌ 用户盐值（userIdSalt）
- ❌ 药物盐值（medicationSalt）

**公开（公开信号）**:
- ✅ 用户ID承诺（userIdCommitment）
- ✅ 药物承诺（medicationCommitment）
- ✅ 打卡承诺（checkinCommitment）

### 零知识特性

> **核心原理**: 证明者（老人）可以向验证者（后端）证明：
> 
> "我知道某个用户ID和药物代码，它们的 Poseidon 哈希组合结果是这个 checkinCommitment"
> 
> **但不暴露**原始的用户ID和药物代码。

---

## 🛠️ 技术栈

| 组件 | 技术 | 说明 |
|-----|------|------|
| ZKP 库 | snarkjs | 证明生成和 calldata 导出 |
| 哈希函数 | Poseidon (circomlibjs) | 计算 commitment |
| 电路 | Circom (medical.circom) | ZKP 电路定义 |
| 前端框架 | Vue 3 + TypeScript | UI 和逻辑 |
| 存储 | @capacitor/preferences | 本地持久化 |
| 加密 | ethers.js | 地址和盐值处理 |

---

## 📁 文件清单

### 修改的文件

1. **`src/service/zkp.ts`**
   - 新增 `generateCalldata()` 方法
   - 修改 `generateMedicalProof()` 返回类型
   - 删除周总结相关逻辑

2. **`src/views/core/Home.vue`**
   - 新增 `handleCheckIn()` 打卡函数
   - 修改任务卡片 UI（添加打卡按钮）
   - 新增打卡按钮样式

3. **`doc/zkp-checkin-verification-api.md`** (新建)
   - 后端验证接口文档

4. **`doc/zkp-打卡功能-实现总结.md`** (本文档)
   - 功能实现总结

---

## 🔗 API 接口

### 需要后端实现

**验证单次打卡证明**:

```
POST /api/zkp/verify/medical

请求体:
{
  "calldata": "0x...",
  "proof": { ... },
  "publicSignals": ["...", "...", "..."],
  "userIdCommitment": "...",
  "medicationCommitment": "...",
  "checkinCommitment": "..."
}

响应:
{
  "success": true,
  "data": {
    "valid": true,
    "message": "证明验证成功"
  }
}
```

详细文档见: [`doc/zkp-checkin-verification-api.md`](./zkp-checkin-verification-api.md)

---

## ✅ 测试清单

### 前端测试

- [ ] 点击打卡按钮生成 ZKP 证明
- [ ] 验证 calldata 格式正确
- [ ] 验证 commitments 计算正确
- [ ] 打卡成功后本地保存记录
- [ ] 打卡后 UI 状态更新
- [ ] 错误处理和提示
- [ ] 打卡中 loading 状态

### 后端测试（待实现）

- [ ] 验证接口返回正确结果
- [ ] 拒绝无效证明
- [ ] 防重放攻击（相同 commitment）
- [ ] JWT Token 验证
- [ ] 速率限制

### 集成测试

- [ ] 端到端打卡流程
- [ ] 离线查看已打卡记录
- [ ] 多个药物打卡
- [ ] 跨日期打卡记录

---

## 🚀 下一步计划

1. **后端实现验证接口**
   - 实现 `POST /api/zkp/verify/medical`
   - 部署 Verifier 智能合约（可选）
   - 添加防重放机制

2. **周总结功能**
   - 前端调用后端周总结 API
   - 展示周总结证明结果

3. **优化用户体验**
   - 添加打卡动画效果
   - 优化证明生成性能
   - 添加打卡提醒

4. **数据同步**
   - 将本地打卡记录同步到后端
   - 云端备份和恢复

---

## 📚 相关文档

- [API Gateway 完整接口文档](./api-gateway-complete-reference.md)
- [ZKP 打卡验证 API 接口文档](./zkp-checkin-verification-api.md)
- [离线打卡完整实现-技术总结](./离线打卡完整实现-技术总结.md)

---

## 🎉 总结

本次实现完成了老人端的 ZKP 打卡功能，核心要点：

1. ✅ **零知识证明**: 保护用户隐私，不暴露原始数据
2. ✅ **本地生成**: 证明在前端本地生成，性能优化
3. ✅ **后端验证**: 通过 API 验证证明有效性，确保数据真实
4. ✅ **本地存储**: 支持离线查看打卡记录
5. ✅ **简化架构**: 删除周总结本地生成，统一由后端处理

**技术亮点**:
- 使用 Poseidon 哈希（ZK-friendly）
- snarkjs 生成 Groth16 证明
- 完全离线可用（查看历史记录）
- 美观的 UI 和流畅的交互

---

**实现者**: AI Assistant  
**审核者**: 待定  
**版本**: v1.0  
**日期**: 2025-11-04

