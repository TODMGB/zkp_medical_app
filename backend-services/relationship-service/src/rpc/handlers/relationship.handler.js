// src/rpc/handlers/relationship.handler.js
// =======================================================
// 关系服务 gRPC 请求处理器
// 处理访问组、邀请和关系的 gRPC 请求
// =======================================================
const service = require('../../services/relationship.service');
const grpc = require('@grpc/grpc-js');

/**
 * 创建访问组
 * 实现了 proto 文件中定义的 CreateAccessGroup RPC 方法
 * @param {object} call - gRPC 调用对象，包含请求参数
 * @param {function} callback - 回调函数，用于返回结果或错误
 */
async function createAccessGroup(call, callback) {
    try {
        // 解构请求参数（使用 snake_case 匹配 proto 定义）
        const { owner_address, group_name, description } = call.request;
        // 调用服务层创建访问组
        const group = await service.createAccessGroup(owner_address, group_name, description);
        // group 对象返回的字段（id, owner_address, group_name）与 proto 中 AccessGroup 消息匹配
        callback(null, group);
    } catch (error) {
        // 处理数据库唯一约束冲突错误
        if (error.code === '23505') { // PostgreSQL 唯一性约束冲突
            return callback({
                code: grpc.status.ALREADY_EXISTS,
                details: `访问组名称 '${call.request.group_name}' 已经存在。`
            });
        }
        console.error('createAccessGroup gRPC 处理器错误:', error);
        callback({ code: grpc.status.INTERNAL, details: error.message });
    }
}

/**
 * 查询用户拥有的访问组列表
 * 实现了 proto 文件中定义的 ListAccessGroups RPC 方法
 * @param {object} call - gRPC 调用对象
 * @param {function} callback - 回调函数
 */
async function listAccessGroups(call, callback) {
    try {
        const { owner_address } = call.request;
        // 查询访问组列表
        const groups = await service.findAccessGroupsByOwner(owner_address);
        // 返回包含 AccessGroup 数组的对象，与 ListAccessGroupsResponse 消息匹配
        callback(null, { groups });
    } catch (error) {
        console.error('listAccessGroups gRPC 处理器错误:', error);
        callback({ code: grpc.status.INTERNAL, details: error.message });
    }
}

/**
 * 创建邀请令牌
 * 实现了 proto 文件中定义的 CreateInvitation RPC 方法
 * @param {object} call - gRPC 调用对象
 * @param {function} callback - 回调函数
 */
async function createInvitation(call, callback) {
    try {
        const { inviter_address, access_group_id } = call.request;
        // 创建邀请并生成令牌
        const invitation = await service.createInvitation(inviter_address, access_group_id );
        // 返回包含 token 的对象，与 CreateInvitationResponse 消息匹配
        callback(null, { token: invitation.token });
    } catch (error) {
        console.error('createInvitation gRPC 处理器错误:', error);
        callback({ code: grpc.status.INTERNAL, details: error.message });
    }
}

/**
 * 接受邀请
 * 实现了 proto 文件中定义的 AcceptInvitation RPC 方法
 * @param {object} call - gRPC 调用对象
 * @param {function} callback - 回调函数
 */
async function acceptInvitation(call, callback) {
    try {
        const { viewer_address, token } = call.request;
        // 调用服务层接受邀请
        const result = await service.acceptInvitation(viewer_address, token);
        // 返回包含 message 的对象，与 AcceptInvitationResponse 消息匹配
        callback(null, result);
    } catch (error) {
        // 根据服务层抛出的错误设置 gRPC 状态码
        let code = grpc.status.INTERNAL;
        if (error.status === 404) {
            code = grpc.status.NOT_FOUND;
        }
        console.error('acceptInvitation gRPC 处理器错误:', error);
        callback({ code, details: error.message });
    }
}

/**
 * [核心] 获取授权信息
 * 实现了 proto 文件中定义的 GetAuthorizations RPC 方法
 * 查询主体用户授权给查看者的访问组列表
 * @param {object} call - gRPC 调用对象
 * @param {function} callback - 回调函数
 */
async function getAuthorizations(call, callback) {
    try {
        const { principal_address, viewer_address } = call.request;
        // 查询两个用户之间的关系
        const relationships = await service.findRelationships(principal_address, viewer_address);
        
        // 将数据库查询结果映射为 proto 中定义的 AccessGroup 消息格式
        const groups = relationships.map(r => ({ 
            id: r.group_id, 
            owner_address: r.principal_address, // owner_address 即为 principal_address
            group_name: r.group_name 
        }));
        
        // 返回完整的 GetAuthorizationsResponse 消息
        callback(null, { principal_address, viewer_address, groups });
    } catch (error) {
        console.error('getAuthorizations gRPC 处理器错误:', error);
        callback({ code: grpc.status.INTERNAL, details: error.message });
    }
}

/**
 * 初始化用户的默认访问组
 * @param {object} call - gRPC 调用对象
 * @param {function} callback - 回调函数
 */
async function initializeDefaultGroups(call, callback) {
    try {
        const { owner_address } = call.request;
        const groups = await service.initializeDefaultGroups(owner_address);
        callback(null, { success: true, groups, count: groups.length });
    } catch (error) {
        console.error('initializeDefaultGroups gRPC 处理器错误:', error);
        callback({ code: grpc.status.INTERNAL, details: error.message });
    }
}

/**
 * 获取访问组详情（含成员统计）
 * @param {object} call - gRPC 调用对象
 * @param {function} callback - 回调函数
 */
async function getAccessGroupsWithStats(call, callback) {
    try {
        const { owner_address } = call.request;
        const groups = await service.getAccessGroupsWithStats(owner_address);
        
        // 转换数据类型以匹配 proto 定义
        const formattedGroups = groups.map(group => ({
            id: group.id,
            owner_address: group.owner_address,
            group_name: group.group_name,
            description: group.description,
            group_type: group.group_type,
            is_system_default: group.is_system_default,
            icon: group.icon,
            active_member_count: parseInt(group.active_member_count) || 0,
            total_member_count: parseInt(group.total_member_count) || 0,
            max_members: group.max_members || 0
        }));
        
        callback(null, { groups: formattedGroups });
    } catch (error) {
        console.error('getAccessGroupsWithStats gRPC 处理器错误:', error);
        callback({ code: grpc.status.INTERNAL, details: error.message });
    }
}

/**
 * 创建医院预授权邀请
 * @param {object} call - gRPC 调用对象
 * @param {function} callback - 回调函数
 */
async function createHospitalInvitation(call, callback) {
    try {
        const { inviter_address, access_group_id, hospital_id, hospital_name, invitee_address } = call.request;
        const invitation = await service.createHospitalInvitation(inviter_address, access_group_id, {
            hospitalId: hospital_id,
            hospitalName: hospital_name,
            inviteeAddress: invitee_address
        });
        callback(null, invitation);
    } catch (error) {
        console.error('createHospitalInvitation gRPC 处理器错误:', error);
        callback({ code: grpc.status.INTERNAL, details: error.message });
    }
}

/**
 * 获取我发出的邀请列表
 * @param {object} call - gRPC 调用对象
 * @param {function} callback - 回调函数
 */
async function getMyInvitations(call, callback) {
    try {
        const { inviter_address, status } = call.request;
        const invitations = await service.getMyInvitations(inviter_address, status || null);
        callback(null, { invitations });
    } catch (error) {
        console.error('getMyInvitations gRPC 处理器错误:', error);
        callback({ code: grpc.status.INTERNAL, details: error.message });
    }
}

/**
 * 取消邀请
 * @param {object} call - gRPC 调用对象
 * @param {function} callback - 回调函数
 */
async function cancelInvitation(call, callback) {
    try {
        const { token } = call.request;
        const result = await service.cancelInvitation(token);
        callback(null, result);
    } catch (error) {
        let code = grpc.status.INTERNAL;
        if (error.status === 404) code = grpc.status.NOT_FOUND;
        console.error('cancelInvitation gRPC 处理器错误:', error);
        callback({ code, details: error.message });
    }
}

/**
 * 获取访问组成员列表
 * @param {object} call - gRPC 调用对象
 * @param {function} callback - 回调函数
 */
async function getAccessGroupMembers(call, callback) {
    try {
        const { access_group_id } = call.request;
        const members = await service.getAccessGroupMembers(access_group_id);
        callback(null, { members });
    } catch (error) {
        console.error('getAccessGroupMembers gRPC 处理器错误:', error);
        callback({ code: grpc.status.INTERNAL, details: error.message });
    }
}

/**
 * 暂停关系
 * @param {object} call - gRPC 调用对象
 * @param {function} callback - 回调函数
 */
async function suspendRelationship(call, callback) {
    try {
        const { relationship_id } = call.request;
        const result = await service.suspendRelationship(relationship_id);
        callback(null, result);
    } catch (error) {
        let code = grpc.status.INTERNAL;
        if (error.status === 404) code = grpc.status.NOT_FOUND;
        console.error('suspendRelationship gRPC 处理器错误:', error);
        callback({ code, details: error.message });
    }
}

/**
 * 恢复关系
 * @param {object} call - gRPC 调用对象
 * @param {function} callback - 回调函数
 */
async function resumeRelationship(call, callback) {
    try {
        const { relationship_id } = call.request;
        const result = await service.resumeRelationship(relationship_id);
        callback(null, result);
    } catch (error) {
        let code = grpc.status.INTERNAL;
        if (error.status === 404) code = grpc.status.NOT_FOUND;
        console.error('resumeRelationship gRPC 处理器错误:', error);
        callback({ code, details: error.message });
    }
}

/**
 * 撤销关系
 * @param {object} call - gRPC 调用对象
 * @param {function} callback - 回调函数
 */
async function revokeRelationship(call, callback) {
    try {
        const { relationship_id } = call.request;
        const result = await service.revokeRelationship(relationship_id);
        callback(null, result);
    } catch (error) {
        let code = grpc.status.INTERNAL;
        if (error.status === 404) code = grpc.status.NOT_FOUND;
        console.error('revokeRelationship gRPC 处理器错误:', error);
        callback({ code, details: error.message });
    }
}

// 导出所有 gRPC 处理器，供 rpc/server.js 中注册服务使用
module.exports = {
    // 访问组管理
    createAccessGroup,              // 创建访问组
    listAccessGroups,               // 查询访问组列表
    getAccessGroupsWithStats,       // 获取访问组详情（含统计）
    getAccessGroupMembers,          // 获取访问组成员
    initializeDefaultGroups,        // 初始化默认访问组
    
    // 邀请管理
    createInvitation,               // 创建标准邀请
    createHospitalInvitation,       // 创建医院预授权邀请
    acceptInvitation,               // 接受邀请
    getMyInvitations,               // 获取我的邀请列表
    cancelInvitation,               // 取消邀请
    
    // 关系管理
    getAuthorizations,              // 获取授权信息
    suspendRelationship,            // 暂停关系
    resumeRelationship,             // 恢复关系
    revokeRelationship,             // 撤销关系
};