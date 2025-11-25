# 数据库初始化脚本

## 概述

此目录包含老年医疗ZKP项目的数据库初始化脚本，主要用于创建和管理迁移服务的PostgreSQL数据库。

## 文件说明

### SQL 脚本

- **`create-migration-database.sql`** - 完整的数据库和表结构创建脚本
- **`migration-tables.sql`** - 仅表结构创建脚本（用于已存在的数据库）

### PowerShell 脚本

- **`init-migration-db.ps1`** - 自动化数据库初始化脚本

## 使用方法

### 方法一：使用PowerShell自动化脚本（推荐）

```powershell
# 进入db目录
cd db

# 运行初始化脚本
.\init-migration-db.ps1
```

### 方法二：手动执行SQL脚本

```bash
# 1. 创建数据库和表结构（完整版）
psql -h localhost -p 5400 -U root -d postgres -f create-migration-database.sql

# 2. 或者，如果数据库已存在，只创建表结构
psql -h localhost -p 5400 -U root -d migration_db -f migration-tables.sql
```

## 数据库配置

### 默认配置

```
主机: localhost
端口: 5400
用户: root
密码: 123456
数据库: migration_db
```

### 修改配置

如需修改数据库配置，请编辑以下文件：

1. **PowerShell脚本**: `init-migration-db.ps1` 中的变量
2. **Migration Service**: `migration-service/.env` 文件
3. **SQL脚本**: 直接修改SQL文件中的相关配置

## 表结构

### migration_sessions 表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | VARCHAR(50) | 迁移会话唯一标识符（主键） |
| status | VARCHAR(20) | 会话状态：pending/completed/expired |
| created_at | BIGINT | 创建时间戳（毫秒） |
| expires_at | BIGINT | 过期时间戳（毫秒） |
| old_device_id | VARCHAR(100) | 旧设备标识符 |
| new_device_id | VARCHAR(100) | 新设备标识符 |
| confirm_code | VARCHAR(6) | 6位数字确认码 |
| confirmed_at | BIGINT | 确认完成时间戳（毫秒） |
| created_timestamp | TIMESTAMP | 记录创建时间 |
| updated_timestamp | TIMESTAMP | 记录最后更新时间 |

### 索引

- `idx_migration_expires_at` - 过期时间索引
- `idx_migration_old_device_id` - 旧设备ID索引
- `idx_migration_status` - 状态索引
- `idx_migration_created_at` - 创建时间索引
- `idx_migration_new_device_id` - 新设备ID索引

## 验证安装

### 检查数据库

```sql
-- 连接到数据库
\c migration_db;

-- 查看表结构
\d migration_sessions;

-- 查看表数据
SELECT * FROM migration_sessions LIMIT 5;
```

### 测试连接

```bash
# 测试数据库连接
psql -h localhost -p 5400 -U root -d migration_db -c "SELECT 'Connection OK' as status;"
```

## 故障排除

### 常见问题

1. **PostgreSQL服务未启动**
   ```
   解决方案: 启动PostgreSQL服务
   ```

2. **psql命令未找到**
   ```
   解决方案: 安装PostgreSQL客户端工具并添加到PATH
   ```

3. **权限不足**
   ```
   解决方案: 确保用户具有创建数据库的权限
   ```

4. **端口冲突**
   ```
   解决方案: 修改配置文件中的端口号
   ```

### 重置数据库

如需完全重置数据库：

```sql
-- 删除数据库
DROP DATABASE IF EXISTS migration_db;

-- 重新运行初始化脚本
```

## 备份和恢复

### 备份

```bash
pg_dump -h localhost -p 5400 -U root migration_db > migration_db_backup.sql
```

### 恢复

```bash
psql -h localhost -p 5400 -U root -d migration_db < migration_db_backup.sql
```

## 安全注意事项

1. 修改默认密码
2. 限制数据库访问权限
3. 定期备份数据
4. 监控数据库性能

## 维护

- 定期清理过期的迁移会话
- 监控数据库大小和性能
- 更新索引统计信息
