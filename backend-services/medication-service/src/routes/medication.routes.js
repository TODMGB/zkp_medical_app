// src/routes/medication.routes.js
// ==========================================
// 医药服务路由
// ==========================================

const { Router } = require('express');
const medicationController = require('../controllers/medication.controller');

const router = Router();

// ==========================================
// 用药计划管理
// ==========================================

// 创建用药计划（医生）
router.post('/plans', medicationController.createMedicationPlan);

// 查询患者的所有用药计划
router.get('/plans/patient/:patientAddress', medicationController.getPatientPlans);

// 查询医生创建的用药计划
router.get('/plans/doctor/:doctorAddress', medicationController.getDoctorPlans);

// 查询用药计划详情
router.get('/plans/:planId', medicationController.getMedicationPlanById);

// 更新用药计划
router.put('/plans/:planId', medicationController.updateMedicationPlan);

// 删除用药计划
router.delete('/plans/:planId', medicationController.deleteMedicationPlan);

// ==========================================
// 常用药物库
// ==========================================

// 搜索常用药物（新路径，符合RESTful规范）
router.get('/medications/search', medicationController.searchCommonMedications);

// 获取药物详情（新增）
router.get('/medications/:id', medicationController.searchCommonMedications);

// 搜索常用药物（旧路径，保持向后兼容）
router.get('/common', medicationController.searchCommonMedications);

// 获取药物分类列表
router.get('/categories', medicationController.getMedicationCategories);

module.exports = router;


