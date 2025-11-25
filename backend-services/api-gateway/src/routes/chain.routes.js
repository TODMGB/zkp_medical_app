// src/routes/chain.routes.js
// =======================================================
// Chain 账户抽象服务路由
// 将请求转发到 Chain 微服务，处理智能合约账户、守护者管理和社交恢复
// =======================================================
const { Router } = require('express');
const { createProxyHandler } = require('../utils/proxy.util');
const config = require('../config');

const router = Router();

// =======================================================
// 安全架构说明
// =======================================================
/**
 * Chain 服务采用两步式安全架构：
 * 
 * 1️⃣ 客户端调用 /build 接口 → 后端构建未签名 UserOperation
 * 2️⃣ 客户端本地签名 → 使用 EOA 私钥签名 UserOpHash
 * 3️⃣ 客户端调用 /submit 接口 → 提交已签名 UserOperation
 * 
 * ✅ 安全优势：
 * - 私钥永不上传到服务器
 * - 符合 ERC-4337 标准
 * - Paymaster 代付所有 gas 费用
 */

// =======================================================
// 路由映射说明
// =======================================================
/**
 * 所有请求都会被代理到 Chain 服务
 * 
 * 账户管理：
 * - POST   /api/chain/account                  - 创建社交恢复账户
 * - GET    /api/chain/account/:address        - 查询账户信息
 * 
 * 守护者管理（安全版本）：
 * - POST   /api/chain/guardian/build          - 构建添加守护者 UserOp
 * - POST   /api/chain/guardian/threshold/build - 构建修改阈值 UserOp
 * - POST   /api/chain/guardian/submit         - 提交已签名 UserOp
 * - GET    /api/chain/guardian/:address       - 查询守护者列表
 * 
 * 社交恢复（安全版本）：
 * - POST   /api/chain/recovery/initiate/build - 构建发起恢复 UserOp
 * - POST   /api/chain/recovery/support/build  - 构建支持恢复 UserOp
 * - POST   /api/chain/recovery/cancel/build   - 构建取消恢复 UserOp
 * - POST   /api/chain/recovery/submit         - 提交已签名 UserOp
 * - GET    /api/chain/recovery/status/:address - 查询恢复状态
 * 

/**
 * 使用统一的代理工具转发请求到 Chain Service
 * 目标服务：${config.services.chain.baseUrl}
 */
router.use(createProxyHandler('Chain', config.services.chain.baseUrl));

module.exports = router;
