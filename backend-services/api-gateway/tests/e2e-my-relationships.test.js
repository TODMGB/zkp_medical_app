/**
 * E2E 测试: 获取我作为访问者的所有关系
 * 测试场景：医生/家属查看自己可以访问的所有患者/老人
 */

const axios = require('axios');
const { setupTestUsers, cleanupTestData } = require('./setup-test-users');

const API_GATEWAY_URL = 'http://localhost:3000';

// 测试数据
let testData = {
  // 老人1
  elder1: {
    phone: '+8613800001001',
    password: 'password123',
    smartAccount: null,
    token: null,
    accessGroupId: null
  },
  // 老人2
  elder2: {
    phone: '+8613800001002',
    password: 'password123',
    smartAccount: null,
    token: null,
    accessGroupId: null
  },
  // 医生
  doctor: {
    phone: '+8613900002001',
    password: 'password123',
    smartAccount: null,
    token: null
  },
  // 家属
  family: {
    phone: '+8613900003001',
    password: 'password123',
    smartAccount: null,
    token: null
  }
};

/**
 * 步骤 1: 注册并登录所有测试用户
 */
async function step1_setupUsers() {
  console.log('\n========================================');
  console.log('步骤 1: 注册并登录所有测试用户');
  console.log('========================================\n');

  for (const [role, user] of Object.entries(testData)) {
    try {
      console.log(`\n📝 注册 ${role}: ${user.phone}`);
      
      // 注册
      const registerResponse = await axios.post(`${API_GATEWAY_URL}/api/auth/register`, {
        phone: user.phone,
        password: user.password
      });

      console.log(`✅ ${role} 注册成功`);

      // 登录
      const loginResponse = await axios.post(`${API_GATEWAY_URL}/api/auth/login`, {
        phone: user.phone,
        password: user.password
      });

      user.token = loginResponse.data.token;
      user.smartAccount = loginResponse.data.user.smart_account;

      console.log(`✅ ${role} 登录成功`);
      console.log(`   Token: ${user.token?.substring(0, 20)}...`);
      console.log(`   Smart Account: ${user.smartAccount}`);

    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`⚠️ ${role} 已存在，直接登录`);
        
        // 直接登录
        const loginResponse = await axios.post(`${API_GATEWAY_URL}/api/auth/login`, {
          phone: user.phone,
          password: user.password
        });

        user.token = loginResponse.data.token;
        user.smartAccount = loginResponse.data.user.smart_account;
        
        console.log(`✅ ${role} 登录成功`);
        console.log(`   Smart Account: ${user.smartAccount}`);
      } else {
        throw error;
      }
    }
  }

  console.log('\n✅ 所有用户设置完成\n');
}

/**
 * 步骤 2: 老人创建访问组
 */
async function step2_createAccessGroups() {
  console.log('\n========================================');
  console.log('步骤 2: 老人创建访问组');
  console.log('========================================\n');

  // 老人1创建"家人"访问组
  console.log('📝 老人1创建"家人"访问组...');
  const elder1GroupResponse = await axios.post(
    `${API_GATEWAY_URL}/api/relation/access-groups`,
    {
      groupName: '家人',
      description: '家庭成员可以查看我的基本健康信息'
    },
    {
      headers: { Authorization: `Bearer ${testData.elder1.token}` }
    }
  );

  testData.elder1.accessGroupId = elder1GroupResponse.data.data.id;
  console.log(`✅ 老人1访问组创建成功，ID: ${testData.elder1.accessGroupId}`);

  // 老人2创建"主治医生"访问组
  console.log('\n📝 老人2创建"主治医生"访问组...');
  const elder2GroupResponse = await axios.post(
    `${API_GATEWAY_URL}/api/relation/access-groups`,
    {
      groupName: '主治医生',
      description: '主治医生可以查看我的详细医疗信息'
    },
    {
      headers: { Authorization: `Bearer ${testData.elder2.token}` }
    }
  );

  testData.elder2.accessGroupId = elder2GroupResponse.data.data.id;
  console.log(`✅ 老人2访问组创建成功，ID: ${testData.elder2.accessGroupId}`);
}

/**
 * 步骤 3: 老人发送邀请
 */
async function step3_sendInvitations() {
  console.log('\n========================================');
  console.log('步骤 3: 老人发送邀请');
  console.log('========================================\n');

  // 老人1邀请家属
  console.log('📝 老人1邀请家属...');
  const invitation1Response = await axios.post(
    `${API_GATEWAY_URL}/api/relation/invitations`,
    {
      accessGroupId: testData.elder1.accessGroupId
    },
    {
      headers: { Authorization: `Bearer ${testData.elder1.token}` }
    }
  );

  testData.elder1.invitationToken = invitation1Response.data.token;
  console.log(`✅ 邀请创建成功，Token: ${testData.elder1.invitationToken.substring(0, 16)}...`);

  // 老人2邀请医生
  console.log('\n📝 老人2邀请医生...');
  const invitation2Response = await axios.post(
    `${API_GATEWAY_URL}/api/relation/invitations`,
    {
      accessGroupId: testData.elder2.accessGroupId
    },
    {
      headers: { Authorization: `Bearer ${testData.elder2.token}` }
    }
  );

  testData.elder2.invitationToken = invitation2Response.data.token;
  console.log(`✅ 邀请创建成功，Token: ${testData.elder2.invitationToken.substring(0, 16)}...`);

  // 老人1也邀请医生
  console.log('\n📝 老人1邀请医生...');
  const invitation3Response = await axios.post(
    `${API_GATEWAY_URL}/api/relation/invitations`,
    {
      accessGroupId: testData.elder1.accessGroupId
    },
    {
      headers: { Authorization: `Bearer ${testData.elder1.token}` }
    }
  );

  testData.elder1.doctorInvitationToken = invitation3Response.data.token;
  console.log(`✅ 邀请创建成功，Token: ${testData.elder1.doctorInvitationToken.substring(0, 16)}...`);
}

/**
 * 步骤 4: 医生/家属接受邀请
 */
async function step4_acceptInvitations() {
  console.log('\n========================================');
  console.log('步骤 4: 医生/家属接受邀请');
  console.log('========================================\n');

  // 家属接受老人1的邀请
  console.log('📝 家属接受老人1的邀请...');
  await axios.post(
    `${API_GATEWAY_URL}/api/relation/relationships/accept`,
    {
      token: testData.elder1.invitationToken
    },
    {
      headers: { Authorization: `Bearer ${testData.family.token}` }
    }
  );
  console.log('✅ 家属成功加入老人1的"家人"访问组');

  // 医生接受老人2的邀请
  console.log('\n📝 医生接受老人2的邀请...');
  await axios.post(
    `${API_GATEWAY_URL}/api/relation/relationships/accept`,
    {
      token: testData.elder2.invitationToken
    },
    {
      headers: { Authorization: `Bearer ${testData.doctor.token}` }
    }
  );
  console.log('✅ 医生成功加入老人2的"主治医生"访问组');

  // 医生接受老人1的邀请
  console.log('\n📝 医生接受老人1的邀请...');
  await axios.post(
    `${API_GATEWAY_URL}/api/relation/relationships/accept`,
    {
      token: testData.elder1.doctorInvitationToken
    },
    {
      headers: { Authorization: `Bearer ${testData.doctor.token}` }
    }
  );
  console.log('✅ 医生成功加入老人1的"家人"访问组');
}

/**
 * 步骤 5: 测试新接口 - 医生查看自己可以访问的所有患者
 */
async function step5_doctorGetMyRelationships() {
  console.log('\n========================================');
  console.log('步骤 5: 医生查看自己可以访问的所有患者');
  console.log('========================================\n');

  console.log('📝 医生调用 GET /api/relation/relationships/my ...');
  
  const response = await axios.get(
    `${API_GATEWAY_URL}/api/relation/relationships/my`,
    {
      headers: { Authorization: `Bearer ${testData.doctor.token}` }
    }
  );

  console.log('\n✅ 请求成功！');
  console.log(`\n📊 医生可以访问 ${response.data.count} 个患者的数据：\n`);

  response.data.data.forEach((relationship, index) => {
    console.log(`${index + 1}. 患者: ${relationship.owner_address}`);
    console.log(`   访问组: ${relationship.access_group_name} (${relationship.group_type})`);
    console.log(`   状态: ${relationship.status}`);
    console.log(`   权限级别: ${relationship.permission_level}`);
    console.log(`   加入时间: ${relationship.joined_at}`);
    console.log(`   权限配置: ${JSON.stringify(relationship.permissions, null, 2)}`);
    console.log('');
  });

  // 验证医生应该能看到2个患者（老人1和老人2）
  if (response.data.count !== 2) {
    throw new Error(`❌ 医生应该能访问2个患者，但实际返回 ${response.data.count} 个`);
  }

  console.log('✅ 验证通过：医生可以访问2个患者的数据');
}

/**
 * 步骤 6: 测试新接口 - 家属查看自己可以照护的所有老人
 */
async function step6_familyGetMyRelationships() {
  console.log('\n========================================');
  console.log('步骤 6: 家属查看自己可以照护的所有老人');
  console.log('========================================\n');

  console.log('📝 家属调用 GET /api/relation/relationships/my ...');
  
  const response = await axios.get(
    `${API_GATEWAY_URL}/api/relation/relationships/my`,
    {
      headers: { Authorization: `Bearer ${testData.family.token}` }
    }
  );

  console.log('\n✅ 请求成功！');
  console.log(`\n📊 家属可以照护 ${response.data.count} 个老人：\n`);

  response.data.data.forEach((relationship, index) => {
    console.log(`${index + 1}. 老人: ${relationship.owner_address}`);
    console.log(`   访问组: ${relationship.access_group_name} (${relationship.group_type})`);
    console.log(`   状态: ${relationship.status}`);
    console.log(`   权限级别: ${relationship.permission_level}`);
    console.log(`   加入时间: ${relationship.joined_at}`);
    console.log(`   权限配置: ${JSON.stringify(relationship.permissions, null, 2)}`);
    console.log('');
  });

  // 验证家属应该能看到1个老人（老人1）
  if (response.data.count !== 1) {
    throw new Error(`❌ 家属应该能访问1个老人，但实际返回 ${response.data.count} 个`);
  }

  console.log('✅ 验证通过：家属可以照护1个老人');
}

/**
 * 步骤 7: 测试新接口 - 老人调用应返回空列表
 */
async function step7_elderGetMyRelationships() {
  console.log('\n========================================');
  console.log('步骤 7: 老人调用接口应返回空列表');
  console.log('========================================\n');

  console.log('📝 老人1调用 GET /api/relation/relationships/my ...');
  
  const response = await axios.get(
    `${API_GATEWAY_URL}/api/relation/relationships/my`,
    {
      headers: { Authorization: `Bearer ${testData.elder1.token}` }
    }
  );

  console.log('\n✅ 请求成功！');
  console.log(`📊 老人1作为访问者的关系数量: ${response.data.count}`);

  // 验证老人应该返回空列表（因为老人是owner，不是viewer）
  if (response.data.count !== 0) {
    throw new Error(`❌ 老人作为owner不应该有作为viewer的关系，但实际返回 ${response.data.count} 个`);
  }

  console.log('✅ 验证通过：老人作为owner不应该有作为viewer的关系');
}

/**
 * 主测试流程
 */
async function runTest() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  E2E 测试: 获取我作为访问者的所有关系                      ║');
  console.log('║  GET /api/relation/relationships/my                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    await step1_setupUsers();
    await step2_createAccessGroups();
    await step3_sendInvitations();
    await step4_acceptInvitations();
    await step5_doctorGetMyRelationships();
    await step6_familyGetMyRelationships();
    await step7_elderGetMyRelationships();

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ 所有测试通过！                                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

  } catch (error) {
    console.error('\n');
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ 测试失败                                               ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error('\n');
    console.error('错误详情:', error.response?.data || error.message);
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTest();
}

module.exports = { runTest };

