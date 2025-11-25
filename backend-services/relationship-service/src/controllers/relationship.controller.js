// src/controllers/relationship.controller.js
// =======================================================
// 关系管理控制器 - 处理HTTP请求，调用内部服务逻辑
// =======================================================
const relationshipService = require('../services/relationship.service');

// =======================================================
// Access Groups Controllers
// =======================================================

/**
 * 创建访问组
 */
async function createAccessGroup(req, res) {
  try {
    console.log('🔄 [Relationship Controller] 收到创建访问组请求');
    console.log('📤 [Request Body]', JSON.stringify(req.body, null, 2));
    console.log('📤 [Request Headers]', JSON.stringify(req.headers, null, 2));

    // 支持驼峰命名和下划线命名
    const groupName = req.body.groupName || req.body.group_name;
    const description = req.body.description;
    const ownerAddress = req.body.ownerAddress || req.body.owner_address;
    if (!groupName || !ownerAddress) {
      console.log(`❌ [Validation] groupName: ${groupName}, userSmartAccount: ${ownerAddress}`);
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
        code: 'MISSING_REQUIRED_FIELDS',
        details: {
          groupName: !!groupName,
          userSmartAccount: !!ownerAddress
        }
      });
    }

    console.log(`✅ [Relationship Controller] 用户标识: ${ownerAddress}`);
    console.log(`✅ [Relationship Controller] 访问组名称: ${groupName}`);
    console.log(`✅ [Relationship Controller] 访问组描述: ${description}`);

    const result = await relationshipService.createAccessGroup({
      ownerAddress,
      groupName,
      description,
    });

    res.status(201).json({
      success: true,
      message: '访问组创建成功',
      data: result
    });

  } catch (error) {
    console.error('❌ [Error] 创建访问组失败:', error);
    res.status(500).json({
      success: false,
      message: '创建访问组失败',
      code: 'CREATE_ACCESS_GROUP_FAILED'
    });
  }
}

/**
 * 获取访问组列表
 */
async function listAccessGroups(req, res) {
  try {
    console.log('🔄 [Relationship Controller] 收到获取访问组列表请求');
    
    const { user_smart_account } = req.query;

    if (!user_smart_account) {
      return res.status(400).json({
        success: false,
        message: '缺少用户标识',
        code: 'MISSING_USER_IDENTIFIER'
      });
    }

    const result = await relationshipService.listAccessGroups(user_smart_account);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ [Error] 获取访问组列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取访问组列表失败',
      code: 'LIST_ACCESS_GROUPS_FAILED'
    });
  }
}

/**
 * 获取访问组统计
 */
async function getAccessGroupsWithStats(req, res) {
  try {
    console.log('🔄 [Relationship Controller] 收到获取访问组统计请求');
    
    // 从查询参数或JWT Token中获取用户标识
    const user_smart_account = req.query.user_smart_account || req.headers['x-user-smart-account'];

    if (!user_smart_account) {
      return res.status(400).json({
        success: false,
        message: '缺少用户标识',
        code: 'MISSING_USER_IDENTIFIER'
      });
    }

    console.log(`✅ [Relationship Controller] 用户标识: ${user_smart_account}`);
    const result = await relationshipService.getAccessGroupsWithStats(user_smart_account);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ [Error] 获取访问组统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取访问组统计失败',
      code: 'GET_ACCESS_GROUPS_STATS_FAILED'
    });
  }
}

/**
 * 获取访问组成员
 */
async function getAccessGroupMembers(req, res) {
  try {
    console.log('🔄 [Relationship Controller] 收到获取访问组成员请求');
    
    const { accessGroupId } = req.params;

    if (!accessGroupId) {
      return res.status(400).json({
        success: false,
        message: '缺少访问组ID',
        code: 'MISSING_ACCESS_GROUP_ID'
      });
    }

    const members = await relationshipService.getAccessGroupMembers(accessGroupId);

    res.status(200).json({
      success: true,
      data: {
        members: members,
        count: members.length
      }
    });

  } catch (error) {
    console.error('❌ [Error] 获取访问组成员失败:', error);
    res.status(500).json({
      success: false,
      message: '获取访问组成员失败',
      code: 'GET_ACCESS_GROUP_MEMBERS_FAILED'
    });
  }
}

// =======================================================
// Invitations Controllers
// =======================================================

/**
 * 创建标准邀请
 */
async function createInvitation(req, res) {
  try {
    console.log('🔄 [Relationship Controller] 收到创建邀请请求');
    console.log('📤 [Request Body]', JSON.stringify(req.body, null, 2));
    console.log('📤 [Request Headers]', JSON.stringify(req.headers, null, 2));

    // 从请求体获取accessGroupId（支持驼峰和下划线命名）
    const accessGroupId = req.body.accessGroupId || req.body.access_group_id;
    
    // 从请求头获取用户标识（API Gateway自动注入）
    const inviterAddress = req.headers['x-user-smart-account'];

    if (!accessGroupId || !inviterAddress) {
      console.log('❌ [Validation] 缺少参数:', { accessGroupId, inviterAddress });
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
        code: 'MISSING_REQUIRED_FIELDS',
        details: {
          accessGroupId: !!accessGroupId,
          inviterAddress: !!inviterAddress
        }
      });
    }

    console.log('✅ [Validation] 参数验证通过:', { accessGroupId, inviterAddress });

    // 调用service层创建邀请（返回token）
    const result = await relationshipService.createInvitation(inviterAddress, accessGroupId);

    console.log('✅ [Service] 邀请创建成功，token:', result.token);

    res.status(201).json({
      success: true,
      message: '邀请创建成功',
      token: result.token
    });

  } catch (error) {
    console.error('❌ [Error] 创建邀请失败:', error);
    res.status(500).json({
      success: false,
      message: '创建邀请失败',
      code: 'CREATE_INVITATION_FAILED'
    });
  }
}

/**
 * 创建医院预授权邀请
 */
async function createHospitalInvitation(req, res) {
  try {
    console.log('🔄 [Relationship Controller] 收到创建医院邀请请求');
    console.log('📤 [Request Body]', JSON.stringify(req.body, null, 2));

    const { invitee_phone, access_group_id, hospital_name, message, inviter_smart_account } = req.body;

    if (!invitee_phone || !access_group_id || !hospital_name || !inviter_smart_account) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const result = await relationshipService.createHospitalInvitation({
      invitee_phone,
      access_group_id,
      hospital_name,
      message,
      inviter_smart_account
    });

    res.status(201).json({
      success: true,
      message: '医院邀请创建成功',
      data: result
    });

  } catch (error) {
    console.error('❌ [Error] 创建医院邀请失败:', error);
    res.status(500).json({
      success: false,
      message: '创建医院邀请失败',
      code: 'CREATE_HOSPITAL_INVITATION_FAILED'
    });
  }
}

/**
 * 获取我的邀请
 */
async function getMyInvitations(req, res) {
  try {
    console.log('🔄 [Relationship Controller] 收到获取我的邀请请求');
    
    const { status } = req.query;
    // 从请求头获取用户标识
    const userSmartAccount = req.headers['x-user-smart-account'];

    if (!userSmartAccount) {
      return res.status(400).json({
        success: false,
        message: '缺少用户标识',
        code: 'MISSING_USER_IDENTIFIER'
      });
    }

    console.log('✅ [Validation] 用户标识:', userSmartAccount);

    const result = await relationshipService.getMyInvitations(userSmartAccount, status);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ [Error] 获取我的邀请失败:', error);
    res.status(500).json({
      success: false,
      message: '获取我的邀请失败',
      code: 'GET_MY_INVITATIONS_FAILED'
    });
  }
}

/**
 * 取消邀请
 */
async function cancelInvitation(req, res) {
  try {
    console.log('🔄 [Relationship Controller] 收到取消邀请请求');
    console.log('📤 [Request Body]', JSON.stringify(req.body, null, 2));

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: '缺少邀请令牌',
        code: 'MISSING_TOKEN'
      });
    }

    const result = await relationshipService.cancelInvitation(token);

    res.status(200).json({
      success: true,
      message: '邀请已取消'
    });

  } catch (error) {
    console.error('❌ [Error] 取消邀请失败:', error);
    res.status(500).json({
      success: false,
      message: '取消邀请失败',
      code: 'CANCEL_INVITATION_FAILED'
    });
  }
}

// =======================================================
// Relationships Controllers
// =======================================================

/**
 * 接受邀请
 */
async function acceptInvitation(req, res) {
  try {
    console.log('🔄 [Relationship Controller] 收到接受邀请请求');
    console.log('📤 [Request Body]', JSON.stringify(req.body, null, 2));
    console.log('📤 [Request Headers]', JSON.stringify(req.headers, null, 2));

    const { token } = req.body;
    const viewerAddress = req.headers['x-user-smart-account'];

    if (!token || !viewerAddress) {
      console.log('❌ [Validation] 缺少参数:', { token, viewerAddress });
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
        code: 'MISSING_REQUIRED_FIELDS',
        details: {
          token: !!token,
          viewerAddress: !!viewerAddress
        }
      });
    }

    console.log('✅ [Validation] 参数验证通过:', { token, viewerAddress });

    const result = await relationshipService.acceptInvitation(viewerAddress, token);

    console.log('✅ [Service] 邀请接受成功');

    res.status(200).json({
      success: true,
      message: '邀请接受成功',
      data: result
    });

  } catch (error) {
    console.error('❌ [Error] 接受邀请失败:', error);
    res.status(500).json({
      success: false,
      message: '接受邀请失败',
      code: 'ACCEPT_INVITATION_FAILED',
      error: error.message
    });
  }
}

/**
 * 暂停关系
 */
async function suspendRelationship(req, res) {
  try {
    console.log('🔄 [Relationship Controller] 收到暂停关系请求');
    
    const { relationshipId } = req.params;
    const userSmartAccount = req.headers['x-user-smart-account'];

    if (!relationshipId || !userSmartAccount) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const result = await relationshipService.suspendRelationship(relationshipId, userSmartAccount);

    res.status(200).json({
      success: true,
      message: '关系暂停成功',
      data: result
    });

  } catch (error) {
    console.error('❌ [Error] 暂停关系失败:', error);
    res.status(500).json({
      success: false,
      message: '暂停关系失败',
      code: 'SUSPEND_RELATIONSHIP_FAILED'
    });
  }
}

/**
 * 恢复关系
 */
async function resumeRelationship(req, res) {
  try {
    console.log('🔄 [Relationship Controller] 收到恢复关系请求');
    
    const { relationshipId } = req.params;
    const userSmartAccount = req.headers['x-user-smart-account'];

    if (!relationshipId || !userSmartAccount) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const result = await relationshipService.resumeRelationship(relationshipId, userSmartAccount);

    res.status(200).json({
      success: true,
      message: '关系恢复成功',
      data: result
    });

  } catch (error) {
    console.error('❌ [Error] 恢复关系失败:', error);
    res.status(500).json({
      success: false,
      message: '恢复关系失败',
      code: 'RESUME_RELATIONSHIP_FAILED'
    });
  }
}

/**
 * 撤销关系
 */
async function revokeRelationship(req, res) {
  try {
    console.log('🔄 [Relationship Controller] 收到撤销关系请求');
    
    const { relationshipId } = req.params;
    const userSmartAccount = req.headers['x-user-smart-account'];

    if (!relationshipId || !userSmartAccount) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const result = await relationshipService.revokeRelationship(relationshipId, userSmartAccount);

    res.status(200).json({
      success: true,
      message: '关系撤销成功',
      data: result
    });

  } catch (error) {
    console.error('❌ [Error] 撤销关系失败:', error);
    res.status(500).json({
      success: false,
      message: '撤销关系失败',
      code: 'REVOKE_RELATIONSHIP_FAILED'
    });
  }
}

/**
 * 获取我的所有关系（明确区分类型）
 */
async function getMyRelationships(req, res) {
  try {
    console.log('🔄 [Relationship Controller] 收到获取我的关系列表请求');
    
    // 从请求头获取用户标识（由API Gateway注入）
    const userAddress = req.headers['x-user-smart-account'];

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        message: '缺少用户标识',
        code: 'MISSING_USER_IDENTIFIER'
      });
    }

    console.log('✅ [Validation] 用户地址:', userAddress);

    const relationshipData = await relationshipService.getMyRelationships(userAddress);

    console.log(`✅ [Service] 找到关系记录 - 作为访问者: ${relationshipData.summary.as_viewer_count}, 作为数据拥有者: ${relationshipData.summary.as_owner_count}`);

    res.status(200).json({
      success: true,
      data: relationshipData,
      message: '关系列表获取成功'
    });

  } catch (error) {
    console.error('❌ [Error] 获取我的关系列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取我的关系列表失败',
      code: 'GET_MY_RELATIONSHIPS_FAILED'
    });
  }
}

module.exports = {
  // Access Groups
  createAccessGroup,
  listAccessGroups,
  getAccessGroupsWithStats,
  getAccessGroupMembers,
  
  // Invitations
  createInvitation,
  createHospitalInvitation,
  getMyInvitations,
  cancelInvitation,
  
  // Relationships
  acceptInvitation,
  getMyRelationships,
  suspendRelationship,
  resumeRelationship,
  revokeRelationship
};
