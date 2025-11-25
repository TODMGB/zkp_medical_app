// src/services/relationship.service.js
// =======================================================
// 关系服务层
// 处理关系管理的业务逻辑
// =======================================================
const entity = require('../entity/relationship.entity');
const mqProducer = require('../mq/producer');

/**
 * 接受邀请并创建关系（增强版，支持医院预授权）
 * @param {string} viewerAddress - 接受邀请的用户地址（查看者）
 * @param {string} token - 邀请令牌
 * @returns {Promise<Object>} 返回成功消息
 * @throws {如果邀请不存在或已过期，抛出404错误}
 */
async function acceptInvitation(viewerAddress, token) {    
    // 查找邀请令牌
    const invitation = await entity.findInvitationByToken(token);
    if (!invitation) {
        throw { status: 404, message: '邀请不存在或已过期。' };
    }
    
    // 检查是否为医院预授权邀请，需要验证接受者地址
    if (invitation.invitation_type === 'HOSPITAL_PREAUTH' && invitation.invitee_address) {
        if (invitation.invitee_address !== viewerAddress) {
            throw { status: 403, message: '该邀请仅限指定用户接受。' };
        }
    }
    
    // 检查最大使用次数
    if (invitation.used_count >= invitation.max_uses) {
        throw { status: 400, message: '该邀请已达到最大使用次数。' };
    }
    
    // 创建邀请人和查看者之间的关系
    await entity.createRelationship(invitation.inviter_address, viewerAddress, invitation.access_group_id);
    // 标记邀请为已接受
    await entity.markInvitationAsAccepted(token, viewerAddress);
    
    // 📨 发送MQ通知：接受邀请成功
    try {
        // 获取访问组信息用于通知
        const accessGroups = await entity.getAccessGroupsWithStats(invitation.inviter_address);
        const accessGroup = accessGroups.find(g => g.id === invitation.access_group_id);
        
        if (accessGroup) {
            await mqProducer.publishInvitationAccepted(
                invitation.inviter_address,  // owner地址
                viewerAddress,               // viewer地址
                {
                    id: accessGroup.id,
                    name: accessGroup.group_name,
                    type: accessGroup.group_type
                }
            );
            console.log('📨 [MQ] 已发送"接受邀请"通知');
        }
    } catch (mqError) {
        console.error('❌ [MQ] 发送通知失败（不影响主流程）:', mqError);
    }
    
    return { message: '邀请接受成功。' };
}

/**
 * 创建医院预授权邀请
 * @param {string} inviterAddress - 医护人员地址
 * @param {number} accessGroupId - 访问组ID
 * @param {object} hospitalInfo - 医院信息 {hospitalId, hospitalName, inviteeAddress}
 * @returns {Promise<Object>} 返回邀请信息和二维码
 */
async function createHospitalInvitation(inviterAddress, accessGroupId, hospitalInfo) {
    const invitation = await entity.createHospitalInvitation(inviterAddress, accessGroupId, hospitalInfo);
    return {
        token: invitation.token,
        qrCode: invitation.qr_code,
        expiresAt: invitation.expires_at,
        hospitalName: invitation.hospital_name
    };
}

/**
 * 初始化用户的默认访问组
 * @param {string} ownerAddress - 用户地址
 * @returns {Promise<Array>} 返回创建的默认群组
 */
async function initializeDefaultGroups(ownerAddress) {
    return await entity.initializeDefaultAccessGroups(ownerAddress);
}

/**
 * 获取访问组详情（含成员统计）
 * @param {string} ownerAddress - 用户地址
 * @returns {Promise<Array>} 返回访问组列表
 */
async function getAccessGroupsWithStats(ownerAddress) {
    return await entity.getAccessGroupsWithStats(ownerAddress);
}

/**
 * 获取我发出的邀请列表
 * @param {string} inviterAddress - 邀请人地址
 * @param {string} status - 状态过滤（可选：pending, accepted, expired, cancelled）
 * @returns {Promise<Array>} 返回邀请列表
 */
async function getMyInvitations(inviterAddress, status = null) {
    return await entity.getInvitationsByInviter(inviterAddress, status);
}

/**
 * 取消邀请
 * @param {string} token - 邀请令牌
 * @returns {Promise<Object>} 返回结果
 */
async function cancelInvitation(token) {
    const success = await entity.cancelInvitation(token);
    if (!success) {
        throw { status: 404, message: '邀请不存在或已被使用。' };
    }
    return { message: '邀请已取消。' };
}

/**
 * 获取访问组的成员列表
 * @param {number} accessGroupId - 访问组ID
 * @returns {Promise<Array>} 返回成员列表
 */
async function getAccessGroupMembers(accessGroupId) {
    return await entity.getAccessGroupMembers(accessGroupId);
}

/**
 * 暂停关系
 * @param {number} relationshipId - 关系ID
 * @returns {Promise<Object>} 返回结果
 */
async function suspendRelationship(relationshipId) {
    // 先获取关系详情用于发送通知
    const relationship = await entity.getRelationshipById(relationshipId);
    if (!relationship) {
        throw { status: 404, message: '关系不存在。' };
    }
    
    const success = await entity.suspendRelationship(relationshipId);
    if (!success) {
        throw { status: 404, message: '关系不存在。' };
    }
    
    // 📨 发送MQ通知：关系已暂停
    try {
        await mqProducer.publishRelationshipSuspended(
            relationship.viewer_address,
            relationship.owner_address,
            {
                id: relationship.access_group_id,
                name: relationship.access_group_name,
                type: relationship.group_type
            }
        );
        console.log('📨 [MQ] 已发送"关系暂停"通知');
    } catch (mqError) {
        console.error('❌ [MQ] 发送通知失败（不影响主流程）:', mqError);
    }
    
    return { message: '关系已暂停。' };
}

/**
 * 恢复关系
 * @param {number} relationshipId - 关系ID
 * @returns {Promise<Object>} 返回结果
 */
async function resumeRelationship(relationshipId) {
    // 先获取关系详情用于发送通知
    const relationship = await entity.getRelationshipById(relationshipId);
    if (!relationship) {
        throw { status: 404, message: '关系不存在。' };
    }
    
    const success = await entity.resumeRelationship(relationshipId);
    if (!success) {
        throw { status: 404, message: '关系不存在。' };
    }
    
    // 📨 发送MQ通知：关系已恢复
    try {
        await mqProducer.publishRelationshipResumed(
            relationship.viewer_address,
            relationship.owner_address,
            {
                id: relationship.access_group_id,
                name: relationship.access_group_name,
                type: relationship.group_type
            }
        );
        console.log('📨 [MQ] 已发送"关系恢复"通知');
    } catch (mqError) {
        console.error('❌ [MQ] 发送通知失败（不影响主流程）:', mqError);
    }
    
    return { message: '关系已恢复。' };
}

/**
 * 撤销关系
 * @param {number} relationshipId - 关系ID
 * @returns {Promise<Object>} 返回结果
 */
async function revokeRelationship(relationshipId) {
    // 先获取关系详情用于发送通知
    const relationship = await entity.getRelationshipById(relationshipId);
    if (!relationship) {
        throw { status: 404, message: '关系不存在。' };
    }
    
    const success = await entity.revokeRelationship(relationshipId);
    if (!success) {
        throw { status: 404, message: '关系不存在。' };
    }
    
    // 📨 发送MQ通知：关系已撤销
    try {
        await mqProducer.publishRelationshipRevoked(
            relationship.viewer_address,
            relationship.owner_address,
            {
                id: relationship.access_group_id,
                name: relationship.access_group_name,
                type: relationship.group_type
            }
        );
        console.log('📨 [MQ] 已发送"关系撤销"通知');
    } catch (mqError) {
        console.error('❌ [MQ] 发送通知失败（不影响主流程）:', mqError);
    }
    
    return { message: '关系已撤销。' };
}

/**
 * 获取用户的所有关系（明确区分类型）
 * @param {string} userAddress - 用户地址
 * @returns {Promise<Object>} 返回分类的关系列表
 */
async function getMyRelationships(userAddress) {
    console.log('[Service] Getting relationships for user:', userAddress);
    const relationshipData = await entity.getRelationshipsByViewer(userAddress);
    
    // 格式化"我作为访问者"的关系
    const asViewer = relationshipData.asViewer.map(rel => ({
        id: rel.id,
        relationship_type: 'as_viewer',
        data_owner_address: rel.principal_address,  // 数据拥有者
        my_address: rel.viewer_address,             // 我的地址
        access_group_id: rel.access_group_id,
        access_group_name: rel.access_group_name,
        group_type: rel.group_type,
        status: rel.status,
        permissions: rel.permissions,
        permission_level: rel.permission_level,
        joined_at: rel.joined_at,
        last_accessed_at: rel.last_accessed_at,
        description: `我可以访问 ${rel.principal_address.substring(0, 10)}... 的数据`
    }));
    
    // 格式化"我作为数据拥有者"的关系
    const asOwner = relationshipData.asOwner.map(rel => ({
        id: rel.id,
        relationship_type: 'as_owner',
        data_owner_address: rel.principal_address,  // 我的地址
        visitor_address: rel.viewer_address,        // 访问者地址
        access_group_id: rel.access_group_id,
        access_group_name: rel.access_group_name,
        group_type: rel.group_type,
        status: rel.status,
        permissions: rel.permissions,
        permission_level: rel.permission_level,
        joined_at: rel.joined_at,
        last_accessed_at: rel.last_accessed_at,
        description: `${rel.viewer_address.substring(0, 10)}... 可以访问我的数据`
    }));
    
    return {
        asViewer,
        asOwner,
        summary: {
            total: asViewer.length + asOwner.length,
            as_viewer_count: asViewer.length,
            as_owner_count: asOwner.length
        }
    };
}

// 导出服务函数，直接透传部分实体层函数
module.exports = {
    // 访问组管理
    createAccessGroup: entity.createAccessGroup,          // 创建访问组
    findAccessGroupsByOwner: entity.findAccessGroupsByOwner,  // 查找用户的访问组
    getAccessGroupsWithStats,                             // 获取访问组详情（含统计）
    getAccessGroupMembers,                                // 获取访问组成员
    initializeDefaultGroups,                              // 初始化默认访问组
    
    // 邀请管理
    createInvitation: entity.createInvitation,            // 创建标准邀请
    createHospitalInvitation,                             // 创建医院预授权邀请
    acceptInvitation,                                     // 接受邀请（包含业务逻辑）
    getMyInvitations,                                     // 获取我的邀请列表
    cancelInvitation,                                     // 取消邀请
    
    // 关系管理
    findRelationships: entity.findRelationships,          // 查找关系
    getMyRelationships,                                   // 获取我作为访问者的所有关系
    suspendRelationship,                                  // 暂停关系
    resumeRelationship,                                   // 恢复关系
    revokeRelationship,                                   // 撤销关系
};