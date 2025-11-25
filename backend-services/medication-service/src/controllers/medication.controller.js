// src/controllers/medication.controller.js
// ==========================================
// 医药服务控制器层
// ==========================================

const medicationService = require('../services/medication.service');

/**
 * 创建用药计划（前端加密模式 - 隐私保护）
 * 
 * 🔒 隐私保护说明：
 * - 所有敏感信息（计划名称、诊断、药物、提醒）由前端加密后传输
 * - 后端只存储加密数据，无法读取敏感内容
 * - 只有患者本人可以用私钥解密查看完整信息
 * 
 * 请求体示例：
 * {
 *   "patient_address": "0x1234...5678",
 *   "start_date": "2025-11-01",
 *   "end_date": "2026-01-28",
 *   "encrypted_plan_data": "a1b2c3d4..."  // hex格式的加密数据
 * }
 * 
 * encrypted_plan_data 解密后的内容（仅前端可见）：
 * {
 *   "plan_name": "高血压综合治疗方案",
 *   "diagnosis": "原发性高血压（II级）",
 *   "medications": [
 *     {
 *       "medication_name": "氨氯地平片",
 *       "dosage": "5mg",
 *       "frequency": "每日1次",
 *       "timing": "早餐后",
 *       "duration": "3个月",
 *       "special_instructions": "可与食物同服"
 *     }
 *   ],
 *   "reminders": [
 *     {
 *       "reminder_time": "08:00:00",
 *       "reminder_days": "everyday",
 *       "medication_name": "氨氯地平片",
 *       "reminder_message": "早餐后服用降压药"
 *     }
 *   ],
 *   "notes": "请定期监测血压，如有不适立即就医。"
 * }
 */
async function createMedicationPlan(req, res, next) {
    try {
        const {
            patient_address,
            start_date,
            end_date,
            encrypted_plan_data  // ⭐ 前端已用患者公钥加密的完整计划数据（hex格式）
        } = req.body;

        // 获取医生地址（从JWT token或请求中）
        const doctorAddress = req.user?.smart_account || req.user?.address || req.body.doctor_address;
        if (!doctorAddress) {
            return res.status(401).json({
                success: false,
                message: 'Doctor authentication required'
            });
        }

        // 参数验证
        if (!patient_address) {
            return res.status(400).json({
                success: false,
                message: 'patient_address is required'
            });
        }

        if (!encrypted_plan_data) {
            return res.status(400).json({
                success: false,
                message: 'encrypted_plan_data is required (hex format encrypted JSON)'
            });
        }

        if (!start_date) {
            return res.status(400).json({
                success: false,
                message: 'start_date is required'
            });
        }

        console.log(`👨‍⚕️ 医生 ${doctorAddress} 正在为患者 ${patient_address} 创建加密用药计划`);
        console.log(`🔒 所有敏感信息已加密，后端不可读取`);

        const plan = await medicationService.createEncryptedPlanFromFrontend(doctorAddress, {
            patient_address,
            start_date,
            end_date,
            encrypted_plan_data  // hex格式的加密数据
        });

        res.status(201).json({
            success: true,
            message: 'Encrypted medication plan created successfully',
            ...plan
        });
    } catch (error) {
        console.error('❌ 创建用药计划失败:', error);
        next(error);
    }
}

/**
 * 查询用药计划详情
 */
async function getMedicationPlanById(req, res, next) {
    try {
        const { planId } = req.params;
        const userAddress = req.user?.smart_account || req.user?.address || req.query.user_address;

        if (!userAddress) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        const plan = await medicationService.getMedicationPlanById(planId, userAddress);

        res.status(200).json({
            success: true,
            data: plan
        });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        if (error.message.includes('Access denied')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
}

/**
 * 查询患者的所有用药计划
 */
async function getPatientPlans(req, res, next) {
    try {
        const { patientAddress } = req.params;
        const { status, page = 1, limit = 10 } = req.query;
        const userAddress = req.user?.smart_account || req.user?.address || req.query.user_address;

        if (!userAddress) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        const plans = await medicationService.getPatientPlans(patientAddress, userAddress, status);

        res.status(200).json({
            success: true,
            total: plans.length,
            plans: plans,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        if (error.message.includes('Access denied')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
}

/**
 * 查询医生创建的用药计划
 */
async function getDoctorPlans(req, res, next) {
    try {
        const { doctorAddress } = req.params;
        const { status, page = 1, limit = 10 } = req.query;
        const userAddress = req.user?.smart_account || req.user?.address || req.query.user_address;

        if (!userAddress) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        const plans = await medicationService.getDoctorPlans(doctorAddress, userAddress, status);

        res.status(200).json({
            success: true,
            total: plans.length,
            plans: plans,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        if (error.message.includes('Access denied')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
}

/**
 * 更新用药计划
 */
async function updateMedicationPlan(req, res, next) {
    try {
        const { planId } = req.params;
        const updateData = req.body;
        const userAddress = req.user?.smart_account || req.user?.address || req.body.user_address;

        if (!userAddress) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        const updatedPlan = await medicationService.updateMedicationPlan(planId, updateData, userAddress);

        res.status(200).json({
            success: true,
            message: 'Medication plan updated successfully',
            data: updatedPlan
        });
    } catch (error) {
        console.error('❌ 更新用药计划失败:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        if (error.message.includes('Access denied')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
}

/**
 * 删除用药计划
 */
async function deleteMedicationPlan(req, res, next) {
    try {
        const { planId } = req.params;
        const userAddress = req.user?.smart_account || req.user?.address || req.query.user_address;

        if (!userAddress) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        await medicationService.deleteMedicationPlan(planId, userAddress);

        res.status(200).json({
            success: true,
            message: 'Medication plan deleted successfully'
        });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        if (error.message.includes('Access denied')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
}

/**
 * 分享用药计划到群组
 */
async function sharePlanToGroups(req, res, next) {
    try {
        const { planId } = req.params;
        const { access_group_ids, message } = req.body;
        const patientAddress = req.user?.smart_account || req.user?.address || req.body.patient_address;

        if (!patientAddress) {
            return res.status(401).json({
                success: false,
                message: 'Patient authentication required'
            });
        }

        if (!access_group_ids || !Array.isArray(access_group_ids) || access_group_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'access_group_ids is required and must be a non-empty array'
            });
        }

        const result = await medicationService.sharePlanToGroups(planId, patientAddress, {
            access_group_ids,
            message
        });

        res.status(200).json({
            success: true,
            message: `Plan shared to ${result.shared_count} recipient(s)`,
            data: result
        });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        if (error.message.includes('Access denied')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
}

/**
 * 撤销计划分享
 */
async function revokePlanShare(req, res, next) {
    try {
        const { planId, recipientAddress } = req.params;
        const patientAddress = req.user?.smart_account || req.user?.address || req.query.patient_address;

        if (!patientAddress) {
            return res.status(401).json({
                success: false,
                message: 'Patient authentication required'
            });
        }

        await medicationService.revokePlanShare(planId, recipientAddress, patientAddress);

        res.status(200).json({
            success: true,
            message: 'Plan sharing revoked successfully'
        });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        if (error.message.includes('Access denied')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
}

/**
 * 查询计划分享状态
 */
async function getPlanShareStatus(req, res, next) {
    try {
        const { planId } = req.params;
        const userAddress = req.user?.smart_account || req.user?.address || req.query.user_address;

        if (!userAddress) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        const shareStatus = await medicationService.getPlanShareStatus(planId, userAddress);

        res.status(200).json({
            success: true,
            data: shareStatus
        });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        if (error.message.includes('Access denied')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
}

/**
 * 搜索常用药物
 */
async function searchCommonMedications(req, res, next) {
    try {
        const { search, category, limit } = req.query;

        const medications = await medicationService.searchCommonMedications(
            search,
            category,
            parseInt(limit) || 20
        );

        res.status(200).json({
            success: true,
            count: medications.length,
            data: medications
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 获取药物分类列表
 */
async function getMedicationCategories(req, res, next) {
    try {
        const categories = await medicationService.getMedicationCategories();

        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createMedicationPlan,
    getMedicationPlanById,
    getPatientPlans,
    getDoctorPlans,
    updateMedicationPlan,
    deleteMedicationPlan,
    sharePlanToGroups,
    revokePlanShare,
    getPlanShareStatus,
    searchCommonMedications,
    getMedicationCategories
};


