# 缺失的API接口分析

## 问题场景

**用户角色**：医生或家属（作为访问者 viewer）

**需求**：加入群组后，需要能够查看：
1. 我可以访问哪些老人/患者的数据（owner列表）
2. 对于每个老人，我在哪个访问组中
3. 我有什么权限（查看哪些数据）
4. 关系的状态（active、suspended等）

---

## 当前API文档中存在的接口

### 从 Owner（老人）角度的接口

1. **查看自己的访问组**
   ```
   GET /api/relation/access-groups/stats?user_smart_account=<owner_address>
   ```
   - 返回：该 owner 创建的所有访问组及成员统计
   - 用途：老人查看自己创建了哪些访问组

2. **查看某个访问组的成员**
   ```
   GET /api/relation/access-groups/:accessGroupId/members
   ```
   - 返回：该访问组中的所有成员（viewer列表）
   - 用途：老人查看某个访问组有哪些医生/家属

3. **接受邀请**
   ```
   POST /api/relation/relationships/accept
   ```
   - 用途：医生/家属接受老人的邀请，加入访问组

4. **关系管理操作**
   ```
   PUT /api/relation/relationships/:relationshipId/suspend
   PUT /api/relation/relationships/:relationshipId/resume
   DELETE /api/relation/relationships/:relationshipId
   ```
   - 用途：暂停、恢复、撤销关系

---

## ❌ 缺失的核心接口

### 1. **获取我作为访问者的所有关系** ⭐⭐⭐（最重要）

**建议接口**：
```
GET /api/relation/relationships/my
```

**请求头**：`Authorization: Bearer <JWT_TOKEN>`

**功能**：返回当前用户作为 `viewer_address` 的所有关系记录

**建议响应格式**：
```json
{
  "success": true,
  "data": [
    {
      "id": "relationship_uuid",
      "owner_address": "0x123...",
      "viewer_address": "0x456...",  // 当前用户的地址
      "access_group_id": 123,
      "access_group_name": "家人",
      "group_type": "FAMILY_PRIMARY",
      "status": "active",
      "permissions": {
        "canView": true,
        "canViewMedication": true,
        "canViewAppointments": true
      },
      "joined_at": "2025-10-31T08:30:00.000Z",
      "last_accessed_at": "2025-10-31T10:00:00.000Z"
    },
    {
      "id": "relationship_uuid_2",
      "owner_address": "0x789...",
      "viewer_address": "0x456...",
      "access_group_id": 456,
      "access_group_name": "主治医生组",
      "group_type": "PRIMARY_DOCTOR",
      "status": "active",
      "permissions": {
        "canView": true,
        "emergency": true,
        "canViewDiagnosis": true,
        "canViewPrescription": true,
        "canViewMedicalHistory": true
      },
      "joined_at": "2025-10-31T09:00:00.000Z",
      "last_accessed_at": null
    }
  ]
}
```

**用途**：
- 医生查看自己可以访问哪些患者
- 家属查看自己可以照护哪些老人
- 显示访问权限和状态
- 作为"我的患者列表"或"我的家人列表"的数据源

---

### 2. **获取某个 owner 的个人信息**（可选，增强用户体验）

**建议接口**：
```
GET /api/userinfo/persons/:ownerAddress
```

**请求头**：`Authorization: Bearer <JWT_TOKEN>`

**功能**：获取指定地址用户的基本信息（头像、姓名等）

**建议响应格式**：
```json
{
  "user_id": "uuid",
  "smart_account": "0x123...",
  "username": "张三",
  "role": "elderly",
  "created_at": "2025-10-31T08:00:00.000Z"
}
```

**注意**：
- 只能查询与当前用户有关系的 owner
- 或者可以复用现有的 `GET /api/userinfo/persons/lookup?smart_account=xxx`

---

### 3. **批量获取用户信息**（可选，性能优化）

**建议接口**：
```
POST /api/userinfo/persons/batch-lookup
```

**请求体**：
```json
{
  "addresses": ["0x123...", "0x456...", "0x789..."]
}
```

**响应**：
```json
{
  "data": [
    {
      "smart_account": "0x123...",
      "username": "张三",
      "role": "elderly"
    },
    {
      "smart_account": "0x456...",
      "username": "李医生",
      "role": "doctor"
    }
  ]
}
```

**用途**：一次查询多个用户信息，减少网络请求

---

## 前端实现方案（基于现有接口的临时方案）

### 方案A：使用现有接口组合（不推荐，效率低）

1. 假设医生已知 owner 的地址（通过某种方式记录）
2. 遍历所有已知的 owner 地址
3. 对每个 owner 调用 `GET /api/relation/access-groups/stats?user_smart_account=<owner>`
4. 检查每个访问组的成员列表，看是否包含当前用户

**缺点**：
- 需要预先知道 owner 地址（无法发现新的关系）
- 需要多次API调用
- 性能差

### 方案B：本地缓存关系（临时方案）

1. 当用户接受邀请时，本地记录 `owner_address` 和 `access_group_id`
2. 从本地缓存读取关系列表
3. 需要时调用现有接口获取详细信息

**缺点**：
- 无法同步服务器端的关系变化（暂停、撤销等）
- 换设备后数据丢失

---

## 推荐实现优先级

### P0（必须实现）
✅ **`GET /api/relation/relationships/my`** - 获取我作为访问者的所有关系

### P1（强烈建议）
- 在关系记录中包含 `access_group_name`、`group_type`、`permissions` 等信息
- 减少前端的额外查询

### P2（可选）
- 批量查询用户信息接口
- 支持分页和筛选（按状态、按群组类型等）

---

## 数据库设计建议

### relationships 表应包含的字段

```sql
CREATE TABLE relationships (
    id UUID PRIMARY KEY,
    owner_address VARCHAR(42) NOT NULL,      -- 老人地址
    viewer_address VARCHAR(42) NOT NULL,     -- 访问者地址（医生/家属）
    access_group_id UUID NOT NULL,           -- 所属访问组
    status VARCHAR(20) DEFAULT 'active',     -- active/suspended/revoked
    permission_level INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_accessed_at TIMESTAMP,              -- 最后访问时间
    
    INDEX idx_viewer (viewer_address),       -- 👈 关键索引
    INDEX idx_owner (owner_address),
    INDEX idx_group (access_group_id)
);
```

**关键点**：
- 需要在 `viewer_address` 上建索引，支持快速查询"我作为访问者的所有关系"
- 记录 `last_accessed_at`，用于统计和审计

---

## 前端使用示例

```typescript
// 医生/家属查看自己可以访问的患者列表
async function getMyPatients() {
  const response = await fetch('/api/relation/relationships/my', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const { data } = await response.json();
  
  // data 是关系列表，每个关系包含 owner_address
  // 可以进一步查询每个 owner 的详细信息
  for (const relationship of data) {
    const ownerInfo = await getUserInfo(relationship.owner_address);
    console.log(`可以访问 ${ownerInfo.username} 的数据`);
    console.log(`权限：`, relationship.permissions);
  }
}
```

---

## 后端实现参考

```javascript
// Express.js 示例
router.get('/api/relation/relationships/my', authenticateJWT, async (req, res) => {
  try {
    const viewerAddress = req.user.smart_account;
    
    // 查询当前用户作为 viewer 的所有关系
    const relationships = await db.query(`
      SELECT 
        r.id,
        r.owner_address,
        r.viewer_address,
        r.access_group_id,
        ag.group_name as access_group_name,
        ag.group_type,
        ag.permissions,
        r.status,
        r.permission_level,
        r.created_at as joined_at,
        r.last_accessed_at
      FROM relationships r
      JOIN access_groups ag ON r.access_group_id = ag.id
      WHERE r.viewer_address = $1
        AND r.status != 'revoked'
      ORDER BY r.created_at DESC
    `, [viewerAddress]);
    
    res.json({
      success: true,
      data: relationships.rows
    });
  } catch (error) {
    console.error('获取关系列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取关系列表失败'
    });
  }
});
```

---

## 总结

**核心问题**：当前API设计主要从 Owner（老人）的角度管理访问关系，缺少从 Viewer（医生/家属）角度查询的接口。

**解决方案**：新增 `GET /api/relation/relationships/my` 接口，返回当前用户作为访问者的所有关系记录。

**影响范围**：
- 后端：需要实现新接口（约1-2小时开发时间）
- 前端：可以快速实现"我的患者"/"我的家人"功能
- 数据库：确保 `viewer_address` 字段有索引

