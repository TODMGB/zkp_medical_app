# 关系展示接口修复说明

**修复日期**: 2025-11-02  
**修复目标**: 解决关系展示混乱问题，明确区分关系类型

---

## 🔍 问题分析

### 原有问题

1. **查询逻辑混乱**
   - `getRelationshipsByViewer` 同时返回两类关系：
     - 我作为访问者访问别人的数据
     - 别人作为访问者访问我的数据
   - 查询条件：`WHERE r.viewer_address = $1 OR r.principal_address = $1`

2. **字段映射不清晰**
   - 数据库字段 `principal_address`(数据拥有者) 被统一映射为 `owner_address`
   - 无法区分在不同关系中的角色

3. **前端展示困难**
   - 返回的数据没有关系类型标识
   - 难以区分"我能访问谁"和"谁能访问我"

---

## ✅ 修复方案

### 1. Entity 层修复 (`relationship.entity.js`)

**修改位置**: 第 483-547 行

**修改内容**:
```javascript
// 修改前：单一查询，混合返回
async function getRelationshipsByViewer(viewerAddress) {
  const { rows } = await pool.query(
    `SELECT ... FROM relationships r
     WHERE r.viewer_address = $1 OR r.principal_address = $1`,
    [normalizedViewerAddress]
  );
  return rows;
}

// 修改后：分离查询，明确区分
async function getRelationshipsByViewer(userAddress) {
  // 查询1: 我作为访问者
  const asViewerQuery = `...WHERE r.viewer_address = $1`;
  
  // 查询2: 我作为数据拥有者
  const asOwnerQuery = `...WHERE r.principal_address = $1`;
  
  const [asViewerResult, asOwnerResult] = await Promise.all([
    pool.query(asViewerQuery, [normalizedUserAddress]),
    pool.query(asOwnerQuery, [normalizedUserAddress])
  ]);
  
  return {
    asViewer: asViewerResult.rows,
    asOwner: asOwnerResult.rows
  };
}
```

**关键改进**:
- ✅ 分离两类关系的查询
- ✅ 并行执行提高性能
- ✅ 添加 `relationship_role` 字段标识类型
- ✅ 返回结构化数据

---

### 2. Service 层修复 (`relationship.service.js`)

**修改位置**: 第 240-292 行

**修改内容**:
```javascript
// 修改前：直接映射返回
async function getMyRelationships(viewerAddress) {
  const relationships = await entity.getRelationshipsByViewer(viewerAddress);
  return relationships.map(rel => ({
    owner_address: rel.owner_address,  // 混淆不清
    viewer_address: rel.viewer_address,
    ...
  }));
}

// 修改后：分类格式化
async function getMyRelationships(userAddress) {
  const relationshipData = await entity.getRelationshipsByViewer(userAddress);
  
  // 格式化"我作为访问者"的关系
  const asViewer = relationshipData.asViewer.map(rel => ({
    relationship_type: 'as_viewer',
    data_owner_address: rel.principal_address,  // 明确：数据拥有者
    my_address: rel.viewer_address,             // 明确：我的地址
    description: `我可以访问 ${rel.principal_address.substring(0, 10)}... 的数据`,
    ...
  }));
  
  // 格式化"我作为数据拥有者"的关系
  const asOwner = relationshipData.asOwner.map(rel => ({
    relationship_type: 'as_owner',
    data_owner_address: rel.principal_address,  // 明确：我的地址
    visitor_address: rel.viewer_address,        // 明确：访问者
    description: `${rel.viewer_address.substring(0, 10)}... 可以访问我的数据`,
    ...
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
```

**关键改进**:
- ✅ 明确的字段命名：`data_owner_address`, `visitor_address`
- ✅ 添加 `relationship_type` 标识
- ✅ 添加 `description` 描述
- ✅ 添加 `summary` 统计信息

---

### 3. Controller 层修复 (`relationship.controller.js`)

**修改位置**: 第 500-538 行

**修改内容**:
```javascript
// 修改前：简单返回数组
res.status(200).json({
  success: true,
  data: relationships,
  count: relationships.length
});

// 修改后：返回结构化数据
res.status(200).json({
  success: true,
  data: relationshipData,  // 包含 asViewer, asOwner, summary
  message: '关系列表获取成功'
});
```

**关键改进**:
- ✅ 返回结构化数据
- ✅ 更清晰的日志输出
- ✅ 添加成功消息

---

### 4. README 文档更新

**新增章节**: 8.1. 获取我的关系列表

**API 响应格式**:
```json
{
  "success": true,
  "message": "关系列表获取成功",
  "data": {
    "asViewer": [
      {
        "id": "uuid",
        "relationship_type": "as_viewer",
        "data_owner_address": "0xeD00df221...",
        "my_address": "0x0eda7118f...",
        "access_group_name": "主治医生组",
        "description": "我可以访问 0xeD00df2... 的数据"
      }
    ],
    "asOwner": [
      {
        "id": "uuid",
        "relationship_type": "as_owner",
        "data_owner_address": "0x0eda7118f...",
        "visitor_address": "0xAnotherUser...",
        "access_group_name": "家人",
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

---

## 📊 数据结构对比

### 修改前（混乱）

```javascript
[
  {
    owner_address: "0xABC...",  // 不清楚是谁
    viewer_address: "0xDEF...", // 不清楚是谁
    // 无法判断我是 owner 还是 viewer
  }
]
```

### 修改后（清晰）

```javascript
{
  asViewer: [  // 我作为访问者
    {
      relationship_type: "as_viewer",
      data_owner_address: "0xABC...",  // 明确：数据拥有者
      my_address: "0xDEF...",          // 明确：我的地址
      description: "我可以访问..."
    }
  ],
  asOwner: [  // 我作为数据拥有者
    {
      relationship_type: "as_owner",
      data_owner_address: "0xDEF...",  // 明确：我的地址
      visitor_address: "0xABC...",     // 明确：访问者
      description: "...可以访问我的数据"
    }
  ]
}
```

---

## 🎯 使用场景

### 1. 医生视角

**调用接口**: `GET /api/relation/relationships/my`

**响应数据**:
```json
{
  "asViewer": [
    {
      "data_owner_address": "0xPatient1...",
      "description": "我可以访问 0xPatient1... 的数据"
    },
    {
      "data_owner_address": "0xPatient2...",
      "description": "我可以访问 0xPatient2... 的数据"
    }
  ],
  "asOwner": [],
  "summary": {
    "as_viewer_count": 2,
    "as_owner_count": 0
  }
}
```

**前端展示**:
```
我的患者列表：
- 张三 (0xPatient1...) - 主治医生组
- 李四 (0xPatient2...) - 医护团队
```

---

### 2. 患者视角

**调用接口**: `GET /api/relation/relationships/my`

**响应数据**:
```json
{
  "asViewer": [],
  "asOwner": [
    {
      "visitor_address": "0xDoctor1...",
      "access_group_name": "主治医生组",
      "description": "0xDoctor1... 可以访问我的数据"
    },
    {
      "visitor_address": "0xFamily1...",
      "access_group_name": "家人",
      "description": "0xFamily1... 可以访问我的数据"
    }
  ],
  "summary": {
    "as_viewer_count": 0,
    "as_owner_count": 2
  }
}
```

**前端展示**:
```
授权访问我数据的人：
- 王医生 (0xDoctor1...) - 主治医生组
- 我的家人 (0xFamily1...) - 家人
```

---

## 🔧 前端适配建议

### Vue/React 组件示例

```javascript
// 获取关系列表
const { data } = await axios.get('/api/relation/relationships/my');

// 患者视图：显示谁能访问我的数据
if (userRole === 'ELDER') {
  return (
    <div>
      <h2>授权管理</h2>
      {data.asOwner.map(rel => (
        <RelationshipCard
          key={rel.id}
          name={getUserName(rel.visitor_address)}
          address={rel.visitor_address}
          groupName={rel.access_group_name}
          status={rel.status}
          onSuspend={() => handleSuspend(rel.id)}
          onRevoke={() => handleRevoke(rel.id)}
        />
      ))}
    </div>
  );
}

// 医生视图：显示我能访问谁的数据
if (userRole === 'DOCTOR') {
  return (
    <div>
      <h2>我的患者</h2>
      {data.asViewer.map(rel => (
        <PatientCard
          key={rel.id}
          name={getUserName(rel.data_owner_address)}
          address={rel.data_owner_address}
          groupName={rel.access_group_name}
          lastAccessed={rel.last_accessed_at}
          onClick={() => viewPatientData(rel.data_owner_address)}
        />
      ))}
    </div>
  );
}
```

---

## ✅ 修复效果

### Before (问题)
- ❌ 关系类型混乱
- ❌ 字段含义不清
- ❌ 前端展示困难
- ❌ 用户体验差

### After (修复后)
- ✅ 关系类型明确
- ✅ 字段命名清晰
- ✅ 前端易于处理
- ✅ 用户体验优秀

---

## 🧪 测试建议

### 1. 单元测试

```javascript
describe('getMyRelationships', () => {
  it('should return separated relationships for doctor', async () => {
    const result = await relationshipService.getMyRelationships(doctorAddress);
    
    expect(result.asViewer).toHaveLength(2);  // 2个患者
    expect(result.asOwner).toHaveLength(0);   // 没有人访问医生数据
    expect(result.summary.as_viewer_count).toBe(2);
  });
  
  it('should return separated relationships for patient', async () => {
    const result = await relationshipService.getMyRelationships(patientAddress);
    
    expect(result.asViewer).toHaveLength(0);  // 患者不访问别人
    expect(result.asOwner).toHaveLength(2);   // 2人可访问（医生+家人）
    expect(result.summary.as_owner_count).toBe(2);
  });
});
```

### 2. 集成测试

```bash
# 测试医生获取关系列表
curl -X GET http://localhost:50054/api/relation/relationships/my \
  -H "Authorization: Bearer <DOCTOR_TOKEN>" \
  -H "x-user-smart-account: 0xDoctorAddress"

# 预期结果：asViewer 有数据，asOwner 为空

# 测试患者获取关系列表
curl -X GET http://localhost:50054/api/relation/relationships/my \
  -H "Authorization: Bearer <PATIENT_TOKEN>" \
  -H "x-user-smart-account: 0xPatientAddress"

# 预期结果：asViewer 为空，asOwner 有数据
```

---

## 📝 注意事项

1. **向后兼容性**
   - ⚠️ API 响应格式已改变
   - 需要更新前端代码以适配新格式
   - 建议使用版本控制：`/api/v2/relation/relationships/my`

2. **性能优化**
   - ✅ 使用 `Promise.all` 并行查询
   - ✅ 数据库索引已优化（`viewer_address`, `principal_address`）

3. **安全性**
   - ✅ 地址统一转为小写，避免大小写不匹配
   - ✅ 权限验证保持不变

---

## 🚀 部署步骤

1. 备份当前代码
2. 拉取最新代码
3. 重启 relationship-service
4. 更新前端代码（必须）
5. 测试关系展示功能
6. 监控日志输出

---

**修复完成** ✅  
**修复人员**: AI Assistant  
**审核状态**: 待人工审核

