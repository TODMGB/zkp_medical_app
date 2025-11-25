// src/routes/relationship.routes.js
// =======================================================
// 关系管理服务路由
// 将请求转发到关系服务，处理访问组、邀请和关系管理
// =======================================================
const { Router } = require('express');
const { createProxyHandler } = require('../utils/proxy.util');
const config = require('../config');

const router = Router();

// =======================================================
// 路由映射说明
// =======================================================
/**
 * 所有请求都会被代理到关系服务
 * 
 * 访问组管理：
 * - POST   /api/relation/access-groups                      - 创建访问组
 * - GET    /api/relation/access-groups                      - 获取访问组列表
 * - GET    /api/relation/access-groups/stats                - 获取访问组统计
 * - GET    /api/relation/access-groups/:accessGroupId/members - 获取访问组成员
 * 
 * 邀请管理：
 * - POST   /api/relation/invitations                        - 创建标准邀请
 * - POST   /api/relation/invitations/hospital               - 创建医院邀请
 * - GET    /api/relation/invitations/my                     - 获取我的邀请
 * - DELETE /api/relation/invitations/cancel                 - 取消邀请
 * 
 * 关系管理：
 * - POST   /api/relation/relationships/accept               - 接受邀请
 * - PUT    /api/relation/relationships/:relationshipId/suspend - 暂停关系
 * - PUT    /api/relation/relationships/:relationshipId/resume  - 恢复关系
 * - DELETE /api/relation/relationships/:relationshipId      - 撤销关系
 */

/**
 * 使用统一的代理工具转发请求到 Relationship Service
 * 目标服务：${config.services.relationship.baseUrl}
 */
router.use(createProxyHandler('Relationship', config.services.relationship.baseUrl, '/api/relation'));

module.exports = router;