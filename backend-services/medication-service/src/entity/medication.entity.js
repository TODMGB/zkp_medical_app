// src/entity/medication.entity.js
// ==========================================
// 医药计划相关数据库操作（完全加密版本）
// ==========================================

const pool = require('./db');
// 定义 query 函数
const query = (sql, params) => pool.query(sql, params);

/**
 * 创建用药计划（含加密数据）
 */
async function createMedicationPlan(planData) {
    const {
        plan_id,                // ⭐ 添加 plan_id
        patient_address,
        doctor_address,
        start_date,
        end_date,
        encrypted_plan_data,    // ⭐ 加密的计划JSON (Buffer/hex)
        plan_hash,              // ⭐ 计划哈希
        encryption_key_hash,    // ⭐ 密钥哈希
        created_by
    } = planData;

    const sql = `
        INSERT INTO medication_plans (
            plan_id, patient_address, doctor_address, doctor_public_key, doctor_eoa,
            start_date, end_date, encrypted_plan_data, plan_hash,
            encryption_key_hash, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, decode($8, 'hex'), $9, $10, $11, $12)
        RETURNING *
    `;

    const values = [
        plan_id, patient_address, doctor_address, planData.doctor_public_key, planData.doctor_eoa,
        start_date, end_date, encrypted_plan_data, plan_hash,
        encryption_key_hash, created_by, created_by  // ⭐ updated_by 初始值与 created_by 相同
    ];

    const result = await query(sql, values);
    return result.rows[0];
}

/**
 * 查询用药计划（加密版本，不包含解密数据）
 */
async function getMedicationPlanById(planId) {
    const sql = 'SELECT * FROM medication_plans WHERE plan_id = $1';
    const result = await query(sql, [planId]);

    if (result.rows.length === 0) {
        return null;
    }

    const plan = result.rows[0];
    // ⭐ 将 Buffer 类型的 encrypted_plan_data 转换为 hex 字符串
    if (Buffer.isBuffer(plan.encrypted_plan_data)) {
        plan.encrypted_plan_data = plan.encrypted_plan_data.toString('hex');
    }
    
    return plan;
}

/**
 * 查询医生创建的用药计划（前端加密模式）
 */
async function getMedicationPlansByDoctor(doctorAddress, status = null) {
    let sql = `
        SELECT * FROM medication_plans
        WHERE doctor_address = $1
    `;
    const values = [doctorAddress.toLowerCase()];  // 确保地址小写

    if (status) {
        sql += ' AND status = $2';
        values.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, values);
    
    // ⭐ 将 Buffer 类型的 encrypted_plan_data 转换为 hex 字符串
    const plans = result.rows.map(plan => {
        if (Buffer.isBuffer(plan.encrypted_plan_data)) {
            return {
                ...plan,
                encrypted_plan_data: plan.encrypted_plan_data.toString('hex')
            };
        }
        return plan;
    });
    
    return plans;
}

/**
 * 更新用药计划
 */
async function updateMedicationPlan(planId, updateData) {
    const {
        status, start_date, end_date, encrypted_plan_data, updated_by
    } = updateData;

    // 动态构建更新字段
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
    }
    if (start_date !== undefined) {
        updates.push(`start_date = $${paramIndex++}`);
        values.push(start_date);
    }
    if (end_date !== undefined) {
        updates.push(`end_date = $${paramIndex++}`);
        values.push(end_date);
    }
    if (encrypted_plan_data !== undefined) {
        updates.push(`encrypted_plan_data = decode($${paramIndex++}, 'hex')`);
        values.push(encrypted_plan_data);
    }

    // updated_by 和 updated_at 总是更新
    updates.push(`updated_by = $${paramIndex++}`);
    values.push(updated_by);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // plan_id 参数
    values.push(planId);

    const sql = `
        UPDATE medication_plans
        SET ${updates.join(', ')}
        WHERE plan_id = $${paramIndex}
        RETURNING *
    `;

    const result = await query(sql, values);
    
    // 转换 encrypted_plan_data 从 Buffer 到 hex string
    if (result.rows[0] && result.rows[0].encrypted_plan_data) {
        result.rows[0].encrypted_plan_data = result.rows[0].encrypted_plan_data.toString('hex');
    }
    
    return result.rows[0];
}

/**
 * 删除用药计划（软删除，更改状态）
 */
async function deleteMedicationPlan(planId) {
    const sql = `
        UPDATE medication_plans
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE plan_id = $1
        RETURNING *
    `;

    const result = await query(sql, [planId]);
    return result.rows[0];
}

/**
 * 查询常用药物库
 */
async function searchCommonMedications(searchTerm, category = null, limit = 20) {
    let sql = `
        SELECT * FROM common_medications
        WHERE is_active = true
    `;
    const values = [];
    let paramIndex = 1;

    if (searchTerm) {
        sql += ` AND medication_name ILIKE $${paramIndex}`;
        values.push(`%${searchTerm}%`);
        paramIndex++;
    }

    if (category) {
        sql += ` AND category = $${paramIndex}`;
        values.push(category);
        paramIndex++;
    }

    sql += ` ORDER BY medication_name LIMIT $${paramIndex}`;
    values.push(limit);

    const result = await query(sql, values);
    return result.rows;
}

/**
 * 获取药物分类列表
 */
async function getMedicationCategories() {
    const sql = `
        SELECT DISTINCT category, COUNT(*) as count
        FROM common_medications
        WHERE is_active = true
        GROUP BY category
        ORDER BY category
    `;

    const result = await query(sql);
    return result.rows;
}

module.exports = {
    createMedicationPlan,
    getMedicationPlanById,
    getMedicationPlansByDoctor,
    updateMedicationPlan,
    deleteMedicationPlan,
    searchCommonMedications,
    getMedicationCategories
};

