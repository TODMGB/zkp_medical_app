// src/services/medication.service.js
// ==========================================
// 医药服务业务逻辑层
// ==========================================

const medicationEntity = require('../entity/medication.entity');
const secureExchangeClient = require('../rpc/clients/secure-exchange.client');
const redisClient = require('../redis/client');
const mqProducer = require('../mq/producer');

const PLAN_CACHE_KEY_PREFIX = 'medication:plan:';
const MEDICATION_CACHE_KEY_PREFIX = 'medication:common:';
const CACHE_TTL = 3600; // 1 hour

/**
 * 查询用药计划详情（带权限检查）
 */
async function getMedicationPlanById(planId, userAddress) {
    // 1. 尝试从缓存获取
    const cacheKey = `${PLAN_CACHE_KEY_PREFIX}${planId}`;
    if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            const plan = JSON.parse(cached);
            // 验证权限
            await validatePlanAccess(plan, userAddress);
            return plan;
        }
    }

    // 2. 从数据库获取
    const plan = await medicationEntity.getMedicationPlanById(planId);
    if (!plan) {
        throw new Error('Medication plan not found');
    }

    // 3. 验证权限
    await validatePlanAccess(plan, userAddress);

    // 4. 写入缓存
    if (redisClient.isOpen) {
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(plan));
    }

    return plan;
}

/**
 * 验证用户对计划的访问权限
 */
async function validatePlanAccess(plan, userAddress) {
    // 患者本人
    if (plan.patient_address === userAddress) {
        return true;
    }

    // 创建计划的医生
    if (plan.doctor_address === userAddress) {
        return true;
    }

    // 检查分享记录
    const accessInfo = await medicationEntity.checkPlanAccess(plan.plan_id, userAddress);
    if (!accessInfo || !accessInfo.access_type) {
        throw new Error('Access denied: You do not have permission to view this plan');
    }

    return true;
}

/**
 * 查询医生创建的用药计划
 */
async function getDoctorPlans(doctorAddress, requestUserAddress, status = null) {
    // 权限检查：只有医生本人可以查看（地址统一转小写比较）
    if (doctorAddress.toLowerCase() !== requestUserAddress.toLowerCase()) {
        throw new Error('Access denied: You can only view your own created plans');
    }

    const plans = await medicationEntity.getMedicationPlansByDoctor(doctorAddress, status);
    return plans;
}

/**
 * 更新用药计划（医生专用）
 */
async function updateMedicationPlan(planId, updateData, userAddress) {
    // 1. 获取计划
    const plan = await medicationEntity.getMedicationPlanById(planId);
    if (!plan) {
        throw new Error('Medication plan not found');
    }

    // 2. 权限检查：只有创建的医生可以更新（地址统一转小写比较）
    if (plan.doctor_address.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Access denied: Only the creator doctor can update this plan');
    }

    // 3. 更新计划
    const updatedPlan = await medicationEntity.updateMedicationPlan(planId, {
        ...updateData,
        updated_by: userAddress
    });

    // 4. 清除缓存
    if (redisClient.isOpen) {
        const cacheKey = `${PLAN_CACHE_KEY_PREFIX}${planId}`;
        await redisClient.del(cacheKey);
    }

    // 5. 发送更新通知
    await mqProducer.publishNotification({
        type: 'medication_plan_updated',
        recipient: plan.patient_address,
        data: {
            plan_id: planId,
            plan_name: updatedPlan.plan_name
        }
    });

    return updatedPlan;
}

/**
 * 删除用药计划
 */
async function deleteMedicationPlan(planId, userAddress) {
    // 1. 获取计划
    const plan = await medicationEntity.getMedicationPlanById(planId);
    if (!plan) {
        throw new Error('Medication plan not found');
    }

    // 2. 权限检查：医生或患者可以删除（地址统一转小写比较）
    if (plan.doctor_address.toLowerCase() !== userAddress.toLowerCase() && 
        plan.patient_address.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Access denied: Only the doctor or patient can delete this plan');
    }

    // 3. 软删除
    const deletedPlan = await medicationEntity.deleteMedicationPlan(planId);

    // 4. 清除缓存
    if (redisClient.isOpen) {
        const cacheKey = `${PLAN_CACHE_KEY_PREFIX}${planId}`;
        await redisClient.del(cacheKey);
    }

    return deletedPlan;
}

/**
 * 搜索常用药物
 */
async function searchCommonMedications(searchTerm, category = null, limit = 20) {
    // 尝试从缓存获取
    const cacheKey = `${MEDICATION_CACHE_KEY_PREFIX}search:${searchTerm || 'all'}:${category || 'all'}:${limit}`;
    if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
    }

    // 从数据库查询
    const medications = await medicationEntity.searchCommonMedications(searchTerm, category, limit);

    // 写入缓存
    if (redisClient.isOpen) {
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(medications));
    }

    return medications;
}

/**
 * 获取药物分类列表
 */
async function getMedicationCategories() {
    const cacheKey = `${MEDICATION_CACHE_KEY_PREFIX}categories`;
    
    // 尝试从缓存获取
    if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
    }

    // 从数据库查询
    const categories = await medicationEntity.getMedicationCategories();

    // 写入缓存（分类变化不频繁，可以缓存更久）
    if (redisClient.isOpen) {
        await redisClient.setEx(cacheKey, CACHE_TTL * 24, JSON.stringify(categories));
    }

    return categories;
}

/**
 * 创建用药计划（前端加密模式 - 完全隐私保护）
 * 
 * 🔒 隐私保护架构：
 * 1. 前端用患者公钥加密完整计划数据（plan_name, diagnosis, medications, reminders, notes）
 * 2. 后端存储加密数据，无法读取明文内容
 * 3. 只有患者本人可以用私钥解密查看
 * 4. 医生只能看到自己创建的计划列表（但内容已加密）
 * 
 * @param {string} doctorAddress - 医生地址
 * @param {object} planData - 包含加密数据的对象
 * @param {string} planData.patient_address - 患者地址
 * @param {string} planData.start_date - 开始日期（明文，非敏感）
 * @param {string} planData.end_date - 结束日期（明文，非敏感）
 * @param {string} planData.encrypted_plan_data - hex格式的加密JSON数据
 */
async function createEncryptedPlanFromFrontend(doctorAddress, planData) {
    const {
        patient_address,
        start_date,
        end_date,
        encrypted_plan_data    // ⭐ 前端已用患者公钥加密的完整计划数据（hex格式）
    } = planData;

    try {
        const { v4: uuidv4 } = require('uuid');
        const crypto = require('crypto');
        const planId = uuidv4();

        console.log(`\n${'='.repeat(60)}`);
        console.log(`📝 创建加密用药计划（隐私保护模式）`);
        console.log(`${'='.repeat(60)}`);
        console.log(`👨‍⚕️ 医生地址: ${doctorAddress}`);
        console.log(`👴 患者地址: ${patient_address}`);
        console.log(`📅 计划时间: ${start_date} ~ ${end_date || '长期'}`);
        console.log(`🔒 数据状态: 已加密（后端不可读取）`);
        console.log(`${'='.repeat(60)}\n`);

        // 计算哈希值（用于完整性验证）
        const plan_hash = crypto.createHash('sha256').update(encrypted_plan_data).digest('hex');
        const encryption_key_hash = crypto.createHash('sha256')
            .update(`${doctorAddress}:${patient_address}:${planId}`)
            .digest('hex');

        // 存储到数据库（只存加密数据）
        const plan = {
            plan_id: planId,
            patient_address: patient_address.toLowerCase(),
            doctor_address: doctorAddress.toLowerCase(),
            start_date,
            end_date: end_date || null,
            encrypted_plan_data: encrypted_plan_data,   // ⭐ 患者公钥加密的数据（hex格式）
            plan_hash: plan_hash,                       // 数据完整性哈希
            encryption_key_hash: encryption_key_hash,   // 加密密钥哈希
            status: 'active',
            created_by: doctorAddress.toLowerCase()
        };

        await medicationEntity.createMedicationPlan(plan);
        console.log(`✅ 加密计划已存储到数据库: ${planId}`);

        // 发送通知（不包含敏感信息）
        try {
            await mqProducer.publishMedicationPlanCreated({
                plan_id: planId,
                plan_name: "【新用药计划】",  // ⭐ 通用标识，不暴露具体内容
                doctor_address: doctorAddress,
                patient_address: patient_address.toLowerCase(),
                start_date
            });
            console.log(`📬 通知已发送给患者`);
        } catch (mqError) {
            console.warn('⚠️ 发送MQ通知失败:', mqError.message);
        }

        console.log(`\n🎉 用药计划创建成功！\n`);

        return {
            success: true,
            plan_id: planId,
            patient_address: patient_address.toLowerCase(),
            doctor_address: doctorAddress.toLowerCase(),
            start_date,
            end_date: end_date || null,
            plan_hash: plan_hash,
            encryption_key_hash: encryption_key_hash,
            status: 'active',
            created_at: new Date().toISOString(),
            // 注意：encrypted_plan_data 不返回（前端已有）
            message: '用药计划已创建并加密存储，患者可在App中查看详情'
        };

    } catch (error) {
        console.error('❌ 创建用药计划失败:', error);
        throw error;
    }
}

module.exports = {
    createEncryptedPlanFromFrontend,  // 前端加密模式（生产模式）
    getMedicationPlanById,
    getDoctorPlans,
    updateMedicationPlan,
    deleteMedicationPlan,
    searchCommonMedications,
    getMedicationCategories
};


