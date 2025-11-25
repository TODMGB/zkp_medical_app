// src/routes/migration.routes.js
// =======================================================
// 账户迁移服务路由
// 将请求转发到迁移微服务，处理设备间的账户迁移
// =======================================================
const { Router } = require('express');
const { createProxyHandler } = require('../utils/proxy.util');
const config = require('../config');

const router = Router();

// =======================================================
// 路由映射说明
// =======================================================
/**
 * 所有请求都会被代理到迁移服务
 * 
 * 迁移管理：
 * - POST   /api/migration/create              - 创建迁移会话
 * - GET    /api/migration/session/:id         - 获取迁移会话信息
 * - POST   /api/migration/confirm             - 确认迁移完成
 * - GET    /api/migration/status/:id          - 查询迁移状态
 * - POST   /api/migration/verify              - 验证确认码
 * - POST   /api/migration/upload              - 上传加密迁移数据 🆕（需认证）
 * - GET    /api/migration/download/:id        - 下载加密迁移数据 🆕（无需认证）
 * - DELETE /api/migration/cleanup             - 清理过期会话
 * - GET    /api/migration/sessions            - 获取所有迁移会话（调试用）
 * - GET    /api/migration/health              - 健康检查
 */

// 添加迁移服务配置到config中
if (!config.services.migration) {
  config.services.migration = {
    baseUrl: process.env.MIGRATION_SERVICE_URL || 'http://localhost:3004'
  };
}

/**
 * 使用统一的代理工具转发请求到迁移服务
 * 目标服务：${config.services.migration.baseUrl}
 * 路径前缀：/api/migration
 */
router.use(createProxyHandler('Migration', config.services.migration.baseUrl, '/api/migration'));

module.exports = router;
