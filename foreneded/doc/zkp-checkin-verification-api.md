# ZKP 打卡验证 API 接口文档

> **面向后端开发者**  
> 版本: v1.0  
> 日期: 2025-11-04

---

## 概述

前端在老人打卡时会在本地生成 ZKP（零知识证明），包含 calldata、proof 和 public signals。需要后端提供验证接口来验证证明的有效性。

---

## 接口定义

### 验证单次打卡证明

**端点**: `POST /api/zkp/verify/medical`

**请求头**:
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**请求体**:
```json
{
  "calldata": "...",
  "proof": {
    "pi_a": ["...", "..."],
    "pi_b": [["...", "..."], ["...", "..."]],
    "pi_c": ["...", "..."]
  },
  "publicSignals": ["...", "...", "..."],
  "userIdCommitment": "7423237065226347324353380772367382631490014989348495481811164164159255474657",
  "medicationCommitment": "1117348568668600",
  "checkinCommitment": "197788718819616"
}
```

**参数说明**:

| 参数 | 类型 | 说明 |
|-----|------|------|
| calldata | string | 智能合约验证所需的 calldata（由 snarkjs 生成） |
| proof | object | ZKP 证明对象（包含 pi_a, pi_b, pi_c） |
| publicSignals | array | 公开信号数组 |
| userIdCommitment | string | 用户ID承诺（Poseidon哈希） |
| medicationCommitment | string | 药物承诺（Poseidon哈希） |
| checkinCommitment | string | 打卡承诺（Poseidon哈希） |

**响应 - 成功**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "message": "证明验证成功",
    "checkinCommitment": "197788718819616",
    "timestamp": "2025-11-04T08:30:00.000Z"
  }
}
```

**响应 - 失败**:
```json
{
  "success": false,
  "error": "证明验证失败",
  "code": "INVALID_PROOF"
}
```

---

## 验证流程

### 1. 后端验证步骤

```
接收请求
    ↓
验证 JWT Token
    ↓
解析 calldata 和 proof
    ↓
调用智能合约验证器（或本地 snarkjs 验证）
    ↓
验证 publicSignals 的正确性
    ↓
返回验证结果
```

### 2. 智能合约验证（推荐）

如果有部署 Verifier 合约：

```solidity
// 伪代码
function verifyProof(
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[3] memory input
) public view returns (bool)
```

使用 `calldata` 直接调用合约的 `verifyProof` 方法。

### 3. 本地验证（备选）

如果没有合约，使用 snarkjs 在后端验证：

```javascript
const snarkjs = require('snarkjs');

// 加载验证密钥
const vKey = await snarkjs.zKey.exportVerificationKey('medical.zkey');

// 验证证明
const isValid = await snarkjs.groth16.verify(
  vKey,
  publicSignals,
  proof
);

if (!isValid) {
  throw new Error('证明验证失败');
}
```

---

## 前端调用示例

```javascript
import { authService } from '@/service/auth';
import { zkpService } from '@/service/zkp';
import { API_GATEWAY_URL } from '@/config/api.config';

async function performCheckIn(task) {
  // 1. 获取用户信息
  const user = await authService.getUserInfo();
  
  // 2. 生成 ZKP 证明
  const userIdSalt = zkpService.generateSalt();
  const medicationSalt = zkpService.generateSalt();
  
  const zkpResult = await zkpService.generateMedicalProof({
    userId: user.smart_account,
    medicationCode: task.medicationCode,
    userIdSalt,
    medicationSalt,
  });
  
  // 3. 调用验证接口
  const headers = await authService.getAuthHeader();
  const response = await fetch(`${API_GATEWAY_URL}/zkp/verify/medical`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      calldata: zkpResult.calldata,
      proof: zkpResult.proof,
      publicSignals: zkpResult.publicSignals,
      userIdCommitment: zkpResult.userIdCommitment,
      medicationCommitment: zkpResult.medicationCommitment,
      checkinCommitment: zkpResult.checkinCommitment,
    }),
  });
  
  if (!response.ok) {
    throw new Error('证明验证失败');
  }
  
  const result = await response.json();
  console.log('验证成功:', result);
  
  // 4. 保存打卡记录到本地
  // ...
}
```

---

## 数据流程图

```
前端                                  后端                        区块链/验证器
  │                                    │                              │
  │  1. 生成 ZKP 证明                  │                              │
  │  (本地 snarkjs)                    │                              │
  │                                    │                              │
  │  2. POST /zkp/verify/medical       │                              │
  │────────────────────────────────>   │                              │
  │                                    │                              │
  │                                    │  3. 解析 calldata            │
  │                                    │                              │
  │                                    │  4. 调用验证器               │
  │                                    │─────────────────────────>    │
  │                                    │                              │
  │                                    │  5. 返回验证结果             │
  │                                    │<─────────────────────────    │
  │                                    │                              │
  │  6. 验证成功响应                   │                              │
  │<────────────────────────────────   │                              │
  │                                    │                              │
  │  7. 保存打卡记录到本地             │                              │
  │                                    │                              │
```

---

## 安全考虑

1. **防重放攻击**: 
   - 建议在后端维护已验证的 `checkinCommitment` 列表
   - 拒绝重复提交相同的 commitment

2. **时间戳验证**:
   - 验证 publicSignals 中的时间戳是否在合理范围内（如当前时间 ±1小时）

3. **用户身份验证**:
   - 验证 JWT Token 中的用户地址与 `userIdCommitment` 匹配（通过重新计算 commitment）

4. **速率限制**:
   - 对同一用户的验证请求进行速率限制（如每分钟最多 10 次）

---

## 错误码说明

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| INVALID_PROOF | 400 | 证明格式错误或验证失败 |
| INVALID_CALLDATA | 400 | Calldata 格式错误 |
| REPLAY_ATTACK | 409 | 检测到重放攻击（commitment 已存在） |
| INVALID_TIMESTAMP | 400 | 时间戳不在有效范围内 |
| UNAUTHORIZED | 401 | JWT Token 无效或已过期 |
| RATE_LIMIT_EXCEEDED | 429 | 请求过于频繁 |

---

## ZKP 电路说明

### medical.circom（单次打卡电路）

**输入**:
- `userId`: 用户地址（BigInt）
- `medicationCode`: 药物代码（BigInt）
- `userIdSalt`: 用户ID盐值（BigInt）
- `medicationSalt`: 药物盐值（BigInt）

**输出（公开信号）**:
1. `userIdCommitment = Poseidon(userId, userIdSalt)`
2. `medicationCommitment = Poseidon(medicationCode, medicationSalt)`
3. `checkinCommitment = Poseidon(userIdCommitment, medicationCommitment)`

**验证目标**:
- 证明者知道 `userId` 和 `medicationCode`，但不暴露原始值
- 只公开三个 commitment，保护隐私

---

## 周总结证明说明

周总结证明由后端生成，前端只需调用现有接口：

- **生成证明**: `POST /api/zkp/prove/weekly-summary`
- **查询状态**: `GET /api/zkp/proof-status/:jobId`

详见 [API Gateway 完整接口文档](./api-gateway-complete-reference.md) 第10节。

---

## 测试用例

### 测试用例 1: 有效证明

**请求**:
```bash
curl -X POST http://localhost:3000/api/zkp/verify/medical \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "calldata": "...",
    "proof": {...},
    "publicSignals": ["123", "456", "789"],
    "userIdCommitment": "123",
    "medicationCommitment": "456",
    "checkinCommitment": "789"
  }'
```

**预期响应**: 200 OK

### 测试用例 2: 无效证明

**请求**: 同上，但 proof 被篡改

**预期响应**: 400 Bad Request, `INVALID_PROOF`

### 测试用例 3: 重放攻击

**请求**: 提交相同的 checkinCommitment 两次

**预期响应**: 409 Conflict, `REPLAY_ATTACK`

---

## 常见问题

**Q: 验证证明需要多长时间？**  
A: 使用智能合约验证约 200-500ms，使用 snarkjs 本地验证约 50-100ms。

**Q: 需要保存 proof 数据到数据库吗？**  
A: 建议只保存 `checkinCommitment` 用于防重放，proof 本身可以不保存（前端已保存到本地）。

**Q: publicSignals 的顺序是什么？**  
A: `[userIdCommitment, medicationCommitment, checkinCommitment]`

**Q: 如何获取 verification key？**  
A: 从电路编译产物中导出：`snarkjs zkey export verificationkey medical.zkey vkey.json`

---

## 版本历史

- **v1.0** (2025-11-04): 初始版本，定义单次打卡验证接口

---

**文档维护**: 前端团队  
**技术支持**: 后端团队  
**相关文档**: [API Gateway 完整接口文档](./api-gateway-complete-reference.md)

