// src/routes/medication.routes.js
// =======================================================
// 医药服务路由
// 将请求转发到医药服务，处理用药计划管理和隐私控制
// =======================================================
const { Router } = require('express');
const { createProxyHandler } = require('../utils/proxy.util');
const config = require('../config');

const router = Router();

// =======================================================
// 路由映射说明
// =======================================================
/**
 * 所有请求都会被代理到医药服务
 * 
 * 用药计划管理：
 * - POST   /api/medication/plans                     - 创建用药计划（医生）
 * - GET    /api/medication/plans/:planId             - 查询计划详情
 * - GET    /api/medication/plans/patient/:address    - 查询患者的所有计划
 * - GET    /api/medication/plans/doctor/:address     - 查询医生创建的计划
 * - PUT    /api/medication/plans/:planId             - 更新计划（医生）
 * - DELETE /api/medication/plans/:planId             - 删除计划
 * 
 * 用药计划分享（隐私控制）：
 * - POST   /api/medication/plans/:planId/share                    - 分享计划到群组（患者）
 * - DELETE /api/medication/plans/:planId/share/:recipientAddress  - 撤销分享（患者）
 * - GET    /api/medication/plans/:planId/share-status             - 查询分享状态
 * 
 * 常用药物库：
 * - GET    /api/medication/common                    - 搜索常用药物
 * - GET    /api/medication/categories                - 获取药物分类列表
 * 
 * 特点：
 * - 隐私优先：患者完全控制计划分享
 * - 权限分级：医生、患者、家属有不同权限
 * - 药物丰富：150种常用药物
 * - 实时更新：通过 MQ 发送实时通知
 */

/**
 * 使用统一的代理工具转发请求到医药服务
 * 目标服务：${config.services.medication.baseUrl}
 */
router.use(createProxyHandler('Medication', config.services.medication.baseUrl, '/api/medication'));

module.exports = router;
