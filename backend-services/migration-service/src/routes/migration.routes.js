/**
 * 迁移路由
 * 定义迁移相关的HTTP路由
 */

const express = require('express');
const migrationController = require('../controllers/migration.controller');

const router = express.Router();

// 创建迁移会话
router.post('/create', migrationController.createSession);

// 获取迁移会话
router.get('/session/:migrationId', migrationController.getSession);

// 确认迁移完成
router.post('/confirm', migrationController.confirmMigration);

// 查询迁移状态
router.get('/status/:migrationId', migrationController.getStatus);

// 验证确认码
router.post('/verify', migrationController.verifyCode);

// 上传加密迁移数据（需要认证）
router.post('/upload', migrationController.uploadEncryptedData);

// 下载加密迁移数据（不需要认证，使用确认码验证）
router.get('/download/:migrationId', migrationController.downloadEncryptedData);

// 清理过期会话（内部接口）
router.delete('/cleanup', migrationController.cleanup);

// 获取所有迁移会话（调试用）
router.get('/sessions', migrationController.getAllSessions);

// 健康检查
router.get('/health', migrationController.health);

module.exports = router;
