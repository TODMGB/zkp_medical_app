# 关系管理服务 (Relationship Service)

## 📋 服务概述

关系管理服务负责管理老人与医生、家属、护理人员之间的访问权限关系。采用基于访问组的权限管理模型，老人可以精细控制谁能访问哪些医疗数据。

## 🎯 核心功能

- ✅ **访问组管理**：创建和管理不同权限级别的访问组
- ✅ **邀请管理**：生成唯一邀请令牌，邀请他人加入访问组
- ✅ **关系管理**：接受、暂停、恢复、撤销关系
- ✅ **权限控制**：基于访问组的细粒度权限管理
- ✅ **系统默认组**：自动创建主治医生、家人、紧急联系人等默认组

## 📊 数据库

### 数据库信息
- **数据库名称**：`bs_relationship_db`
- **端口**：`5400`
- **用户**：`root`
- **密码**：`123456`

### 数据表结构

#### access_groups - 访问组表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 访问组ID |
| owner_address | VARCHAR(42) | 老人地址 |
| group_name | VARCHAR(200) | 组名称 |
| description | TEXT | 组描述 |
| group_type | VARCHAR(50) | 组类型 |
| permissions | JSONB | 权限配置 |
| is_system_default | BOOLEAN | 是否系统默认组 |
| max_members | INTEGER | 最大成员数 |
| created_at | TIMESTAMP | 创建时间 |

#### invitations - 邀请表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 邀请ID |
| token | VARCHAR(64) | 邀请令牌（唯一） |
| inviter_address | VARCHAR(42) | 邀请人地址 |
| access_group_id | UUID | 访问组ID |
| status | VARCHAR(20) | 状态 |
| expires_at | TIMESTAMP | 过期时间 |
| created_at | TIMESTAMP | 创建时间 |

#### relationships - 关系表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 关系ID |
| owner_address | VARCHAR(42) | 老人地址 |
| viewer_address | VARCHAR(42) | 访问者地址 |
| access_group_id | UUID | 访问组ID |
| status | VARCHAR(20) | 状态 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 系统默认访问组

用户注册时自动创建5个默认访问组：

1. **主治医生组** (`PRIMARY_DOCTOR`)
   - 全面医疗数据访问权限
   - 最多3人

2. **医护团队** (`HEALTHCARE_TEAM`)
   - 日常护理数据访问
   - 最多10人

3. **家人** (`FAMILY_PRIMARY`)
   - 主要照护家属
   - 最多5人

4. **紧急联系人** (`EMERGENCY_CONTACT`)
   - 紧急情况访问关键信息
   - 最多3人

5. **康复师/理疗师** (`THERAPIST`)
   - 康复训练相关数据
   - 最多5人

## 🚀 启动服务

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
PORT=50054
GRPC_PORT=50053

# 数据库配置
DB_HOST=localhost
DB_PORT=5400
DB_USER=root
DB_PASSWORD=123456
DB_NAME=bs_relationship_db

# Redis配置
REDIS_URL=redis://localhost:6379

# RabbitMQ配置
MQ_URL=amqp://localhost:5672

# User Service配置
USER_SERVICE_GRPC_URL=localhost:50051
```

### 3. 启动服务

```bash
npm start
```

服务将在以下端口启动：
- **HTTP API**: `http://localhost:50054`
- **gRPC**: `localhost:50053`

## 🔌 API 端点

### 基础URL
- 直接访问: `http://localhost:50054/api/relation`
- 通过API Gateway: `http://localhost:3000/api/relation`

### 访问组管理

#### 1. 创建访问组

**端点**: `POST /api/relation/access-groups`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**请求体**:
```json
{
  "groupName": "我的护理团队",
  "description": "负责日常护理的专业团队",
  "ownerAddress": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "group_name": "我的护理团队",
    "description": "负责日常护理的专业团队",
    "owner_address": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
    "group_type": "CUSTOM",
    "is_system_default": false,
    "permissions": {},
    "max_members": null,
    "created_at": "2025-10-30T14:02:03.437Z"
  }
}
```

#### 2. 获取访问组列表

**端点**: `GET /api/relation/access-groups`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**查询参数**:
- `owner_address` - 老人地址（必填）

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "group_name": "主治医生组",
      "description": "有全面医疗数据访问权限的主治医生",
      "group_type": "PRIMARY_DOCTOR",
      "is_system_default": true,
      "icon": "👨‍⚕️",
      "sort_order": 1,
      "max_members": 3,
      "permissions": {
        "canView": true,
        "emergency": true,
        "canViewDiagnosis": true,
        "canViewTestResults": true
      }
    }
  ]
}
```

#### 3. 获取访问组统计

**端点**: `GET /api/relation/access-groups/stats`

**查询参数**:
- `user_smart_account` - 用户智能账户地址

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "group_name": "主治医生组",
      "description": "有全面医疗数据访问权限的主治医生",
      "active_member_count": "2",
      "total_member_count": "2"
    }
  ]
}
```

#### 4. 获取访问组成员

**端点**: `GET /api/relation/access-groups/:accessGroupId/members`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "uuid",
        "viewer_address": "0x0eda7118fC8Bdb08935892116Bcfa640E80926F1",
        "status": "active",
        "created_at": "2025-10-30T14:02:03.437Z"
      }
    ]
  }
}
```

### 邀请管理

#### 5. 创建邀请

**端点**: `POST /api/relation/invitations`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**请求体**:
```json
{
  "accessGroupId": "uuid"
}
```

**响应**:
```json
{
  "success": true,
  "token": "abc123def456...",
  "data": {
    "invitationId": "uuid",
    "token": "abc123def456...",
    "accessGroupId": "uuid",
    "accessGroupName": "主治医生组",
    "inviterAddress": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
    "expiresAt": "2025-10-31T14:02:03.437Z"
  }
}
```

**说明**:
- 邀请令牌64位随机字符串
- 默认有效期24小时
- 令牌仅可使用一次

#### 6. 获取我的邀请

**端点**: `GET /api/relation/invitations/my`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**查询参数**:
- `user_address` - 用户地址

**响应**:
```json
{
  "success": true,
  "data": {
    "sent": [
      {
        "id": "uuid",
        "token": "abc123...",
        "access_group_name": "主治医生组",
        "status": "pending",
        "expires_at": "2025-10-31T14:02:03.437Z"
      }
    ],
    "received": []
  }
}
```

#### 7. 取消邀请

**端点**: `DELETE /api/relation/invitations/cancel`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**请求体**:
```json
{
  "invitationId": "uuid"
}
```

**响应**:
```json
{
  "success": true,
  "message": "邀请已取消"
}
```

### 关系管理

#### 8. 接受邀请

**端点**: `POST /api/relation/relationships/accept`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**请求体**:
```json
{
  "token": "abc123def456..."
}
```

**响应**:
```json
{
  "success": true,
  "message": "邀请已接受",
  "data": {
    "relationshipId": "uuid",
    "accessGroupId": "uuid",
    "accessGroupName": "主治医生组",
    "ownerAddress": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
    "viewerAddress": "0x0eda7118fC8Bdb08935892116Bcfa640E80926F1",
    "status": "active"
  }
}
```

#### 8.1. 获取我的关系列表（新增 - 已优化）

**端点**: `GET /api/relation/relationships/my`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "success": true,
  "message": "关系列表获取成功",
  "data": {
    "asViewer": [
      {
        "id": "uuid",
        "relationship_type": "as_viewer",
        "data_owner_address": "0xeD00df221BfF8C1339F70AE3FFcaB7F3C1dfa1c1",
        "my_address": "0x0eda7118fC8Bdb08935892116Bcfa640E80926F1",
        "access_group_id": "uuid",
        "access_group_name": "主治医生组",
        "group_type": "PRIMARY_DOCTOR",
        "status": "active",
        "permissions": {},
        "permission_level": 1,
        "joined_at": "2025-10-30T14:02:03.437Z",
        "last_accessed_at": null,
        "description": "我可以访问 0xeD00df2... 的数据"
      }
    ],
    "asOwner": [
      {
        "id": "uuid",
        "relationship_type": "as_owner",
        "data_owner_address": "0x0eda7118fC8Bdb08935892116Bcfa640E80926F1",
        "visitor_address": "0xAnotherUser...",
        "access_group_id": "uuid",
        "access_group_name": "家人",
        "group_type": "FAMILY_PRIMARY",
        "status": "active",
        "permissions": {},
        "permission_level": 1,
        "joined_at": "2025-10-30T14:02:03.437Z",
        "last_accessed_at": null,
        "description": "0xAnotherU... 可以访问我的数据"
      }
    ],
    "summary": {
      "total": 2,
      "as_viewer_count": 1,
      "as_owner_count": 1
    }
  }
}
```

**说明**:
- `asViewer`: 我作为访问者，能访问哪些人的数据（医生查看患者）
- `asOwner`: 我作为数据拥有者，哪些人能访问我的数据（患者管理访问权限）
- `summary`: 统计信息
- `relationship_type`: 关系类型标识，便于前端区分展示

#### 9. 暂停关系

**端点**: `PUT /api/relation/relationships/:relationshipId/suspend`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "success": true,
  "message": "关系已暂停",
  "data": {
    "id": "uuid",
    "status": "suspended",
    "updated_at": "2025-10-30T14:02:03.437Z"
  }
}
```

#### 10. 恢复关系

**端点**: `PUT /api/relation/relationships/:relationshipId/resume`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "success": true,
  "message": "关系已恢复",
  "data": {
    "id": "uuid",
    "status": "active",
    "updated_at": "2025-10-30T14:02:03.437Z"
  }
}
```

#### 11. 撤销关系

**端点**: `DELETE /api/relation/relationships/:relationshipId`

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "success": true,
  "message": "关系已撤销"
}
```

## 🔐 gRPC 接口

### Proto 定义

文件位置: `../proto/relationship.proto`

### 主要接口

#### 1. GetRelationship
查询两个用户之间的关系

#### 2. CheckPermission
检查用户是否有权限访问特定数据

#### 3. GetAccessGroupMembers
获取访问组的所有成员

#### 4. GetUserRelationships
获取用户的所有关系

## 📝 开发说明

### 技术栈

- **Node.js** + **Express** (HTTP服务)
- **gRPC** (微服务间通信)
- **PostgreSQL** 17.6 (数据库)
- **Redis** (缓存)
- **RabbitMQ** (消息队列)

### 项目结构

```
relationship-service/
├── src/
│   ├── config/                 # 配置
│   ├── controllers/            # 控制器
│   │   └── relationship.controller.js
│   ├── entity/                 # 数据库操作
│   │   ├── db.js
│   │   └── relationship.entity.js
│   ├── services/               # 业务逻辑
│   │   └── relationship.service.js
│   ├── routes/                 # 路由
│   │   ├── index.js
│   │   └── relationship.routes.js
│   ├── middleware/             # 中间件
│   ├── rpc/                    # gRPC
│   │   ├── server.js
│   │   └── handlers/
│   ├── mq/                     # 消息队列
│   └── redis/                  # Redis客户端
├── migrations/                 # 数据库迁移脚本
├── server.js                   # 服务入口
└── package.json
```

## 🔄 与其他服务的集成

### 1. User Service
- 通过gRPC验证用户存在性
- 查询用户角色信息

### 2. Notification Service
- 发送邀请通知
- 发送关系状态变更通知

### 3. Medication Service
- 提供权限验证接口
- 用于检查是否有权查看用药计划

## 📚 使用示例

### 完整邀请流程

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/relation';
const ELDER_TOKEN = 'elder_jwt_token';
const DOCTOR_TOKEN = 'doctor_jwt_token';

async function inviteAndAccept() {
  // 1. 老人获取访问组列表
  const groupsResp = await axios.get(`${API_BASE}/access-groups/stats`, {
    params: { user_smart_account: '0xElderAddress' },
    headers: { Authorization: `Bearer ${ELDER_TOKEN}` }
  });
  
  const doctorGroup = groupsResp.data.data.find(
    g => g.group_type === 'PRIMARY_DOCTOR'
  );
  
  // 2. 老人创建邀请
  const inviteResp = await axios.post(
    `${API_BASE}/invitations`,
    { accessGroupId: doctorGroup.id },
    { headers: { Authorization: `Bearer ${ELDER_TOKEN}` } }
  );
  
  const invitationToken = inviteResp.data.token;
  console.log('邀请令牌:', invitationToken);
  
  // 3. 老人将令牌发送给医生（通过其他渠道）
  // ... 
  
  // 4. 医生接受邀请
  const acceptResp = await axios.post(
    `${API_BASE}/relationships/accept`,
    { token: invitationToken },
    { headers: { Authorization: `Bearer ${DOCTOR_TOKEN}` } }
  );
  
  console.log('关系已建立:', acceptResp.data);
  
  // 5. 老人查看访问组成员
  const membersResp = await axios.get(
    `${API_BASE}/access-groups/${doctorGroup.id}/members`,
    { headers: { Authorization: `Bearer ${ELDER_TOKEN}` } }
  );
  
  console.log('访问组成员:', membersResp.data.data.members);
}
```

### 关系管理示例

```javascript
async function manageRelationship(relationshipId) {
  const API_BASE = 'http://localhost:3000/api/relation';
  const TOKEN = 'elder_jwt_token';
  
  // 暂停关系
  await axios.put(
    `${API_BASE}/relationships/${relationshipId}/suspend`,
    {},
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  
  console.log('关系已暂停');
  
  // 等待一段时间...
  
  // 恢复关系
  await axios.put(
    `${API_BASE}/relationships/${relationshipId}/resume`,
    {},
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  
  console.log('关系已恢复');
  
  // 或者永久撤销关系
  await axios.delete(
    `${API_BASE}/relationships/${relationshipId}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  
  console.log('关系已撤销');
}
```

## ⚠️ 注意事项

1. **权限验证**：所有接口都需要JWT Token验证
2. **邀请有效期**：邀请令牌默认24小时过期
3. **关系状态**：关系有`active`、`suspended`、`revoked`三种状态
4. **访问组限制**：系统默认组有最大成员数限制
5. **唯一性约束**：同一用户不能重复加入同一访问组

## 🏥 健康检查

访问 `http://localhost:50054/health` 查看服务状态

**响应**:
```json
{
  "status": "UP",
  "service": "relationship-service"
}
```

---

**文档版本**: 1.0.0  
**最后更新**: 2025-10-31

