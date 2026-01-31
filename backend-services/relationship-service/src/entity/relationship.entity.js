// src/entity/relationship.entity.js
// =======================================================
// 关系实体数据访问层
// 负责处理访问组、邀请和关系的数据库操作
// =======================================================
const pool = require('./db');
const crypto = require('crypto');

// --- 访问组操作 ---

/**
 * 创建访问组（支持自定义和预设）
 * @param {object} params - 参数对象
 * @param {string} params.ownerAddress - 所有者的智能账户地址
 * @param {string} params.groupName - 访问组名称
 * @param {string} params.description - 访问组描述
 * @param {string} params.groupType - 群组类型（可选）
 * @param {boolean} params.isSystemDefault - 是否系统预设（可选）
 * @param {string} params.icon - 图标（可选）
 * @param {number} params.sortOrder - 排序（可选）
 * @param {number} params.maxMembers - 最大成员数（可选）
 * @param {object} params.permissions - 权限配置（可选）
 * @returns {Promise<Object>} 返回创建的访问组对象
 */
async function createAccessGroup(params) {
    const {
        ownerAddress,
        groupName,
        description,
        groupType = 'CUSTOM',
        isSystemDefault = false,
        icon = '📁',
        sortOrder = 999,
        maxMembers = null,
        permissions = { canView: true }
    } = params;
    
    console.log('[Entity] Creating access group:', { ownerAddress, groupName, description });
    
    // 统一转换为小写以避免大小写不匹配问题
    const normalizedOwnerAddress = ownerAddress?.toLowerCase();
    
    const { rows } = await pool.query(
        `INSERT INTO access_groups 
         (owner_address, group_name, description, group_type, is_system_default, icon, sort_order, max_members, permissions) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING *`,
        [normalizedOwnerAddress, groupName, description, groupType, isSystemDefault, icon, sortOrder, maxMembers, JSON.stringify(permissions)]
    );
    return rows[0];
}

/**
 * 根据访问组ID获取访问组
 * @param {number} accessGroupId - 访问组ID
 * @returns {Promise<Object|null>} 返回访问组对象
 */
async function getAccessGroupById(accessGroupId) {
    const { rows } = await pool.query('SELECT * FROM access_groups WHERE id = $1', [accessGroupId]);
    return rows[0] || null;
}

/**
 * 获取或创建好友默认访问组（用于好友关系显示，不用于数据授权）
 * @param {string} ownerAddress - 用户智能账户地址
 * @returns {Promise<Object>} 返回访问组
 */
async function getOrCreateFriendGroup(ownerAddress) {
    const normalizedOwnerAddress = ownerAddress?.toLowerCase();
    const { rows } = await pool.query(
        `SELECT * FROM access_groups WHERE owner_address = $1 AND group_type = 'CUSTOM' AND group_name = '好友' ORDER BY created_at ASC LIMIT 1`,
        [normalizedOwnerAddress]
    );
    if (rows[0]) return rows[0];

    return await createAccessGroup({
        ownerAddress: normalizedOwnerAddress,
        groupName: '好友',
        description: '好友列表',
        groupType: 'CUSTOM',
        isSystemDefault: true,
        icon: '👥',
        sortOrder: 50,
        maxMembers: null,
        permissions: { canView: false }
    });
}

/**
 * 查找用户拥有的所有访问组
 * @param {string} ownerAddress - 所有者的智能账户地址
 * @returns {Promise<Array>} 返回访问组列表
 */
async function findAccessGroupsByOwner(ownerAddress) {
    // 统一转换为小写
    const normalizedOwnerAddress = ownerAddress?.toLowerCase();
    
    const { rows } = await pool.query(
        'SELECT * FROM access_groups WHERE owner_address = $1 ORDER BY sort_order ASC, created_at ASC', 
        [normalizedOwnerAddress]
    );
    return rows;
}

/**
 * 获取访问组详情（含成员统计）
 * @param {string} ownerAddress - 所有者的智能账户地址
 * @returns {Promise<Array>} 返回访问组列表，包含成员统计
 */
async function getAccessGroupsWithStats(ownerAddress) {
    // 统一转换为小写
    const normalizedOwnerAddress = ownerAddress?.toLowerCase();
    console.log('[Entity] 查询访问组统计，标准化地址:', normalizedOwnerAddress);
    
    const { rows } = await pool.query(
        `SELECT 
            ag.*,
            COUNT(r.id) FILTER (WHERE r.status = 'active') as active_member_count,
            COUNT(r.id) as total_member_count
         FROM access_groups ag
         LEFT JOIN relationships r ON ag.id = r.access_group_id
         WHERE ag.owner_address = $1
         GROUP BY ag.id
         ORDER BY ag.sort_order ASC, ag.created_at ASC`,
        [normalizedOwnerAddress]
    );
    console.log('[Entity] 查询结果数量:', rows.length);
    return rows;
}

/**
 * 为新用户初始化预设访问组
 * @param {string} ownerAddress - 用户的智能账户地址
 * @returns {Promise<Array>} 返回创建的预设群组列表
 */
async function initializeDefaultAccessGroups(ownerAddress) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 统一转换为小写
        const normalizedOwnerAddress = ownerAddress?.toLowerCase();
        
        // 从模板表获取所有预设群组
        const templateQuery = 'SELECT * FROM access_group_templates WHERE is_active = true ORDER BY sort_order ASC';
        const templates = await client.query(templateQuery);
        
        const createdGroups = [];
        
        // 为每个模板创建实际的访问组
        for (const template of templates.rows) {
            const insertQuery = `
                INSERT INTO access_groups (
                    owner_address, group_name, description, group_type, 
                    is_system_default, max_members, 
                    icon, sort_order, permissions
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;
            
            const result = await client.query(insertQuery, [
                normalizedOwnerAddress,
                template.name,
                template.description,
                template.group_type,
                true,
                template.max_members,
                template.icon,
                template.sort_order,
                template.default_permissions
            ]);
            
            createdGroups.push(result.rows[0]);
        }
        
        await client.query('COMMIT');
        console.log(`✅ 为用户 ${normalizedOwnerAddress} 创建了 ${createdGroups.length} 个默认群组`);
        return createdGroups;
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('创建默认访问组失败:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * 获取访问组的成员列表
 * @param {number} accessGroupId - 访问组ID
 * @returns {Promise<Array>} 返回成员列表
 */
async function getAccessGroupMembers(accessGroupId) {
    console.log('[Entity] Getting access group members for accessGroupId:', accessGroupId);
    
    const { rows } = await pool.query(
        `SELECT 
            r.id,
            r.viewer_address,
            r.status,
            r.permission_level,
            r.created_at,
            r.last_accessed_at
         FROM relationships r
         WHERE r.access_group_id = $1
         ORDER BY r.permission_level DESC, r.created_at ASC`,
        [accessGroupId]
    );
    
    console.log(`[Entity] Found ${rows.length} members for access group ${accessGroupId}`);
    if (rows.length > 0) {
        console.log('[Entity] Members:', rows);
    }
    
    return rows;
}

// --- 邀请操作 ---

/**
 * 创建邀请令牌（标准邀请，10分钟有效期）
 * @param {string} inviterAddress - 邀请人的智能账户地址
 * @param {number} accessGroupId - 访问组ID
 * @param {object} options - 可选参数 {maxUses, customExpireMinutes}
 * @returns {Promise<Object>} 返回包含邀请令牌的对象
 */
async function createInvitation(inviterAddress, accessGroupId, options = {}) {
    const { maxUses = 1, customExpireMinutes = 10 } = options;
    
    // 统一转换为小写
    const normalizedInviterAddress = inviterAddress?.toLowerCase();
    
    // 生成32字节的随机令牌
    const token = crypto.randomBytes(32).toString('hex');
    // 设置过期时间为10分钟后（可自定义）
    const expiresAt = new Date(Date.now() + customExpireMinutes * 60 * 1000);
    
    const { rows } = await pool.query(
        `INSERT INTO invitations 
         (inviter_address, access_group_id, token, expires_at, invitation_type, max_uses) 
         VALUES ($1, $2, $3, $4, 'STANDARD', $5) 
         RETURNING *`,
        [normalizedInviterAddress, accessGroupId, token, expiresAt, maxUses]
    );
    return rows[0];
}

/**
 * 创建医院预授权邀请
 * @param {string} inviterAddress - 邀请人（医护）的智能账户地址
 * @param {number} accessGroupId - 访问组ID
 * @param {object} hospitalInfo - 医院信息 {hospitalId, hospitalName, inviteeAddress}
 * @returns {Promise<Object>} 返回包含邀请信息和二维码的对象
 */
async function createHospitalInvitation(inviterAddress, accessGroupId, hospitalInfo) {
    const { hospitalId, hospitalName, inviteeAddress } = hospitalInfo;
    
    // 统一转换为小写
    const normalizedInviterAddress = inviterAddress?.toLowerCase();
    const normalizedInviteeAddress = inviteeAddress?.toLowerCase();
    
    // 生成令牌
    const token = crypto.randomBytes(32).toString('hex');
    // 医院邀请有效期10分钟
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // 生成二维码数据（JSON格式）
    const qrData = JSON.stringify({
        type: 'HOSPITAL_PREAUTH',
        token,
        hospitalId,
        hospitalName,
        inviterAddress: normalizedInviterAddress,
        expiresAt: expiresAt.toISOString()
    });
    
    const { rows } = await pool.query(
        `INSERT INTO invitations 
         (inviter_address, access_group_id, token, expires_at, invitation_type, 
          hospital_id, hospital_name, invitee_address, qr_code, max_uses) 
         VALUES ($1, $2, $3, $4, 'HOSPITAL_PREAUTH', $5, $6, $7, $8, 1) 
         RETURNING *`,
        [normalizedInviterAddress, accessGroupId, token, expiresAt, hospitalId, hospitalName, normalizedInviteeAddress, qrData]
    );
    return rows[0];
}

/**
 * 获取用户发出的邀请列表
 * @param {string} inviterAddress - 邀请人地址
 * @param {string} status - 邀请状态（可选）
 * @returns {Promise<Array>} 返回邀请列表
 */
async function getInvitationsByInviter(inviterAddress, status = null) {
    // 统一转换为小写
    const normalizedInviterAddress = inviterAddress?.toLowerCase();
    
    let query = `
        SELECT i.*, ag.group_name 
        FROM invitations i
        JOIN access_groups ag ON i.access_group_id = ag.id
        WHERE i.inviter_address = $1
    `;
    const params = [normalizedInviterAddress];
    
    if (status) {
        query += ' AND i.status = $2';
        params.push(status);
    }
    
    query += ' ORDER BY i.created_at DESC';
    
    const { rows} = await pool.query(query, params);
    return rows;
}

/**
 * 取消邀请
 * @param {string} token - 邀请令牌
 * @returns {Promise<boolean>} 返回是否成功取消
 */
async function cancelInvitation(token) {
    const { rowCount } = await pool.query(
        `UPDATE invitations SET status = 'cancelled' WHERE token = $1 AND status = 'pending'`,
        [token]
    );
    return rowCount > 0;
}

/**
 * 根据令牌查找有效的邀请
 * @param {string} token - 邀请令牌
 * @returns {Promise<Object|undefined>} 返回邀请对象，如果未找到或已过期则返回undefined
 */
async function findInvitationByToken(token) {
    const { rows } = await pool.query('SELECT * FROM invitations WHERE token = $1 AND expires_at > NOW() AND status = \'pending\'', [token]);
    return rows[0];
}

/**
 * 标记邀请为已接受状态
 * @param {string} token - 邀请令牌
 * @param {string} acceptedBy - 接受者地址
 * @returns {Promise<void>}
 */
async function markInvitationAsAccepted(token, acceptedBy) {
    // 统一转换为小写
    const normalizedAcceptedBy = acceptedBy?.toLowerCase();
    
    await pool.query(
        `UPDATE invitations 
         SET status = 'accepted', accepted_by = $2, accepted_at = NOW(), used_count = used_count + 1 
         WHERE token = $1`,
        [token, normalizedAcceptedBy]
    );
}

/**
 * 自动过期处理（定时任务调用）
 * @returns {Promise<number>} 返回过期的邀请数量
 */
async function expireOldInvitations() {
    const { rowCount } = await pool.query(
        `UPDATE invitations 
         SET status = 'expired' 
         WHERE status = 'pending' AND expires_at < NOW()`
    );
    if (rowCount > 0) {
        console.log(`⏰ 已过期 ${rowCount} 个邀请`);
    }
    return rowCount;
}

// --- 关系操作 ---

/**
 * 创建关系记录
 * @param {string} principalAddress - 主体用户的智能账户地址（数据所有者）
 * @param {string} viewerAddress - 查看者的智能账户地址（被授权访问的用户）
 * @param {number} accessGroupId - 访问组ID
 * @param {number} permissionLevel - 权限级别（1-5）
 * @returns {Promise<Object|undefined>} 返回创建的关系对象，如果关系已存在则返回undefined
 */
async function createRelationship(principalAddress, viewerAddress, accessGroupId, permissionLevel = 1) {
    // 统一转换为小写
    const normalizedPrincipalAddress = principalAddress?.toLowerCase();
    const normalizedViewerAddress = viewerAddress?.toLowerCase();
    
    console.log('[Entity] Creating relationship:', {
        principalAddress: normalizedPrincipalAddress,
        viewerAddress: normalizedViewerAddress,
        accessGroupId,
        permissionLevel
    });
    
    const { rows } = await pool.query(
        `INSERT INTO relationships 
         (principal_address, viewer_address, access_group_id, permission_level) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT DO NOTHING 
         RETURNING *`,
        [normalizedPrincipalAddress, normalizedViewerAddress, accessGroupId, permissionLevel]
    );
    
    if (rows[0]) {
        console.log('✅ [Entity] Relationship created successfully:', rows[0]);
    } else {
        console.log('⚠️ [Entity] Relationship already exists or conflict occurred');
    }
    
    return rows[0];
}

/**
 * 根据关系ID获取关系详情（包含访问组信息）
 * @param {number} relationshipId - 关系ID
 * @returns {Promise<Object|null>} 返回关系详情
 */
async function getRelationshipById(relationshipId) {
    const { rows } = await pool.query(
        `SELECT 
            r.id,
            r.principal_address as owner_address,
            r.viewer_address,
            r.access_group_id,
            r.status,
            r.permission_level,
            ag.group_name as access_group_name,
            ag.group_type,
            ag.permissions
         FROM relationships r
         JOIN access_groups ag ON r.access_group_id = ag.id
         WHERE r.id = $1`,
        [relationshipId]
    );
    return rows[0] || null;
}

/**
 * 暂停关系
 * @param {number} relationshipId - 关系ID
 * @returns {Promise<boolean>} 返回是否成功
 */
async function suspendRelationship(relationshipId) {
    const { rowCount } = await pool.query(
        `UPDATE relationships SET status = 'suspended' WHERE id = $1`,
        [relationshipId]
    );
    return rowCount > 0;
}

/**
 * 恢复关系
 * @param {number} relationshipId - 关系ID
 * @returns {Promise<boolean>} 返回是否成功
 */
async function resumeRelationship(relationshipId) {
    const { rowCount } = await pool.query(
        `UPDATE relationships SET status = 'active' WHERE id = $1`,
        [relationshipId]
    );
    return rowCount > 0;
}

/**
 * 撤销关系
 * @param {number} relationshipId - 关系ID
 * @returns {Promise<boolean>} 返回是否成功
 */
async function revokeRelationship(relationshipId) {
    const { rowCount } = await pool.query(
        `UPDATE relationships SET status = 'revoked' WHERE id = $1`,
        [relationshipId]
    );
    return rowCount > 0;
}

/**
 * 更新关系的最后访问时间
 * @param {string} principalAddress - 主体地址
 * @param {string} viewerAddress - 查看者地址
 * @returns {Promise<void>}
 */
async function updateLastAccessed(principalAddress, viewerAddress) {
    // 统一转换为小写
    const normalizedPrincipalAddress = principalAddress?.toLowerCase();
    const normalizedViewerAddress = viewerAddress?.toLowerCase();
    
    await pool.query(
        `UPDATE relationships 
         SET last_accessed_at = NOW() 
         WHERE principal_address = $1 AND viewer_address = $2 AND status = 'active'`,
        [normalizedPrincipalAddress, normalizedViewerAddress]
    );
}

/**
 * 查找两个用户之间的关系
 * @param {string} principalAddress - 主体用户的智能账户地址
 * @param {string} viewerAddress - 查看者的智能账户地址
 * @returns {Promise<Array>} 返回关系列表，包含访问组信息
 */
async function findRelationships(principalAddress, viewerAddress) {
    // 统一转换为小写
    const normalizedPrincipalAddress = principalAddress?.toLowerCase();
    const normalizedViewerAddress = viewerAddress?.toLowerCase();
    
    const { rows } = await pool.query(
        `SELECT r.principal_address, r.viewer_address, ag.id as group_id, ag.group_name
         FROM relationships r
         JOIN access_groups ag ON r.access_group_id = ag.id
         WHERE r.principal_address = $1 AND r.viewer_address = $2 AND r.status = 'active'`,
        [normalizedPrincipalAddress, normalizedViewerAddress]
    );
    return rows;
}

/**
 * 获取当前用户的所有关系（明确区分关系类型）
 * @param {string} userAddress - 用户的智能账户地址
 * @returns {Promise<Object>} 返回分类的关系列表
 */
async function getRelationshipsByViewer(userAddress) {
    // 统一转换为小写
    const normalizedUserAddress = userAddress?.toLowerCase();
    
    console.log('[Entity] Getting relationships for user:', normalizedUserAddress);
    
    // 查询：我作为访问者，能访问哪些人的数据
    const asViewerQuery = `
        SELECT 
            r.id,
            r.principal_address,
            r.viewer_address,
            r.access_group_id,
            ag.group_name as access_group_name,
            ag.group_type,
            ag.permissions,
            r.status,
            r.permission_level,
            r.created_at as joined_at,
            r.last_accessed_at,
            'viewer' as relationship_role
         FROM relationships r
         JOIN access_groups ag ON r.access_group_id = ag.id
         WHERE r.viewer_address = $1
         ORDER BY r.created_at DESC
    `;
    
    // 查询：我作为数据拥有者，哪些人能访问我的数据
    const asOwnerQuery = `
        SELECT 
            r.id,
            r.principal_address,
            r.viewer_address,
            r.access_group_id,
            ag.group_name as access_group_name,
            ag.group_type,
            ag.permissions,
            r.status,
            r.permission_level,
            r.created_at as joined_at,
            r.last_accessed_at,
            'owner' as relationship_role
         FROM relationships r
         JOIN access_groups ag ON r.access_group_id = ag.id
         WHERE r.principal_address = $1
         ORDER BY r.created_at DESC
    `;
    
    const [asViewerResult, asOwnerResult] = await Promise.all([
        pool.query(asViewerQuery, [normalizedUserAddress]),
        pool.query(asOwnerQuery, [normalizedUserAddress])
    ]);
    
    console.log(`[Entity] Found ${asViewerResult.rows.length} relationships as viewer, ${asOwnerResult.rows.length} as owner`);
    
    return {
        asViewer: asViewerResult.rows,
        asOwner: asOwnerResult.rows
    };
}

async function ensureFriendRequestsTable() {
    await pool.query(
        `CREATE TABLE IF NOT EXISTS friend_requests (
            id SERIAL PRIMARY KEY,
            requester_address TEXT NOT NULL,
            recipient_address TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            message TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            responded_at TIMESTAMP WITHOUT TIME ZONE
        )`
    );

    await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient_status ON friend_requests (recipient_address, status)`
    );
    await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_friend_requests_requester_status ON friend_requests (requester_address, status)`
    );
}

async function createFriendRequest(requesterAddress, recipientAddress, message = null) {
    const requester = requesterAddress?.toLowerCase();
    const recipient = recipientAddress?.toLowerCase();

    const { rows: existingRows } = await pool.query(
        `SELECT * FROM friend_requests WHERE requester_address = $1 AND recipient_address = $2 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
        [requester, recipient]
    );
    if (existingRows[0]) {
        return { existing: true, request: existingRows[0] };
    }

    const { rows } = await pool.query(
        `INSERT INTO friend_requests (requester_address, recipient_address, status, message)
         VALUES ($1, $2, 'pending', $3)
         RETURNING *`,
        [requester, recipient, message]
    );
    return { existing: false, request: rows[0] };
}

async function getFriendRequestById(id) {
    const { rows } = await pool.query('SELECT * FROM friend_requests WHERE id = $1', [id]);
    return rows[0] || null;
}

async function getIncomingFriendRequests(recipientAddress, status = 'pending') {
    const recipient = recipientAddress?.toLowerCase();
    const params = [recipient];
    let query = `SELECT * FROM friend_requests WHERE recipient_address = $1`;
    if (status) {
        params.push(status);
        query += ` AND status = $2`;
    }
    query += ` ORDER BY created_at DESC`;
    const { rows } = await pool.query(query, params);
    return rows;
}

async function getOutgoingFriendRequests(requesterAddress, status = 'pending') {
    const requester = requesterAddress?.toLowerCase();
    const params = [requester];
    let query = `SELECT * FROM friend_requests WHERE requester_address = $1`;
    if (status) {
        params.push(status);
        query += ` AND status = $2`;
    }
    query += ` ORDER BY created_at DESC`;
    const { rows } = await pool.query(query, params);
    return rows;
}

async function updateFriendRequestStatus(id, status) {
    const { rows } = await pool.query(
        `UPDATE friend_requests
         SET status = $2,
             responded_at = CASE WHEN $2 IN ('accepted', 'rejected', 'cancelled') THEN NOW() ELSE responded_at END
         WHERE id = $1
         RETURNING *`,
        [id, status]
    );
    return rows[0] || null;
}

// 导出所有关系实体操作函数
module.exports = { 
    // 访问组操作
    createAccessGroup, 
    findAccessGroupsByOwner,
    getAccessGroupById,
    getAccessGroupsWithStats,
    initializeDefaultAccessGroups,
    getAccessGroupMembers,
    getOrCreateFriendGroup,
    
    // 邀请操作
    createInvitation,
    createHospitalInvitation,
    findInvitationByToken,
    getInvitationsByInviter,
    markInvitationAsAccepted,
    cancelInvitation,
    expireOldInvitations,
    
    // 关系操作
    createRelationship, 
    findRelationships,
    getRelationshipsByViewer,
    getRelationshipById,
    suspendRelationship,
    resumeRelationship,
    revokeRelationship,
    updateLastAccessed
    ,
    // 好友申请操作
    ensureFriendRequestsTable,
    createFriendRequest,
    getFriendRequestById,
    getIncomingFriendRequests,
    getOutgoingFriendRequests,
    updateFriendRequestStatus
};