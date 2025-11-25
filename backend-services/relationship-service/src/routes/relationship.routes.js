// src/routes/relationship.routes.js
// =======================================================
// 关系管理路由 - 提供HTTP接口给API Gateway调用
// =======================================================
const { Router } = require('express');
const relationshipController = require('../controllers/relationship.controller');

const router = Router();

// =======================================================
// Access Groups Routes
// =======================================================

// 创建访问组
router.post('/access-groups', relationshipController.createAccessGroup);

// 获取访问组列表
router.get('/access-groups', relationshipController.listAccessGroups);

// 获取访问组统计
router.get('/access-groups/stats', relationshipController.getAccessGroupsWithStats);

// 获取访问组成员
router.get('/access-groups/:accessGroupId/members', relationshipController.getAccessGroupMembers);

// =======================================================
// Invitations Routes
// =======================================================

// 发送标准邀请
router.post('/invitations', relationshipController.createInvitation);

// 发送医院预授权邀请
router.post('/invitations/hospital', relationshipController.createHospitalInvitation);

// 获取我的邀请
router.get('/invitations/my', relationshipController.getMyInvitations);

// 取消邀请
router.delete('/invitations/cancel', relationshipController.cancelInvitation);

// =======================================================
// Relationships Routes
// =======================================================

// 获取我作为访问者的所有关系
router.get('/relationships/my', relationshipController.getMyRelationships);

// 接受邀请
router.post('/relationships/accept', relationshipController.acceptInvitation);

// 暂停关系
router.put('/relationships/:relationshipId/suspend', relationshipController.suspendRelationship);

// 恢复关系
router.put('/relationships/:relationshipId/resume', relationshipController.resumeRelationship);

// 撤销关系
router.delete('/relationships/:relationshipId', relationshipController.revokeRelationship);

module.exports = router;
