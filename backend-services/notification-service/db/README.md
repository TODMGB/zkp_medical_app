# Notification Service Database

## 数据库初始化

### 方式一：使用 PowerShell 脚本（推荐）

```powershell
cd notification-service/db
.\init-database.ps1
```

### 方式二：手动执行SQL

```bash
# 连接到PostgreSQL
psql -U postgres

# 执行SQL脚本
\i create-notification-database.sql
```

## 数据库表结构

### 1. notifications - 通知表

| 字段 | 类型 | 说明 |
|------|------|------|
| notification_id | VARCHAR(66) | 通知ID（主键） |
| recipient_address | VARCHAR(42) | 接收者地址 |
| type | VARCHAR(50) | 通知类型 |
| priority | VARCHAR(10) | 优先级：HIGH/NORMAL/LOW |
| title | VARCHAR(255) | 通知标题 |
| body | TEXT | 通知内容 |
| data | JSONB | 附加数据 |
| channels | TEXT[] | 推送渠道 |
| status | VARCHAR(20) | 状态：pending/sent/delivered |
| created_at | TIMESTAMP | 创建时间 |
| sent_at | TIMESTAMP | 发送时间 |
| delivered_at | TIMESTAMP | 送达时间 |
| read_at | TIMESTAMP | 已读时间 |
| expires_at | TIMESTAMP | 过期时间 |

### 2. devices - 设备表

| 字段 | 类型 | 说明 |
|------|------|------|
| device_id | VARCHAR(100) | 设备ID（主键） |
| user_address | VARCHAR(42) | 用户地址 |
| platform | VARCHAR(20) | 平台：android/ios/web |
| push_token | TEXT | FCM推送令牌 |
| device_name | VARCHAR(100) | 设备名称 |
| is_active | BOOLEAN | 是否活跃 |
| last_active_at | TIMESTAMP | 最后活跃时间 |
| created_at | TIMESTAMP | 创建时间 |

### 3. notification_settings - 通知设置表

| 字段 | 类型 | 说明 |
|------|------|------|
| user_address | VARCHAR(42) | 用户地址（主键） |
| push_enabled | BOOLEAN | 是否启用推送 |
| websocket_enabled | BOOLEAN | 是否启用WebSocket |
| medication_reminder_enabled | BOOLEAN | 是否启用用药提醒 |
| new_message_enabled | BOOLEAN | 是否启用新消息通知 |
| system_notification_enabled | BOOLEAN | 是否启用系统通知 |
| quiet_hours_start | TIME | 免打扰开始时间 |
| quiet_hours_end | TIME | 免打扰结束时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 4. websocket_connections - WebSocket连接表

| 字段 | 类型 | 说明 |
|------|------|------|
| connection_id | VARCHAR(100) | 连接ID（主键） |
| user_address | VARCHAR(42) | 用户地址 |
| socket_id | VARCHAR(100) | Socket ID |
| connected_at | TIMESTAMP | 连接时间 |
| last_ping_at | TIMESTAMP | 最后心跳时间 |

## 清理过期通知

可以设置定时任务来清理过期通知：

```sql
DELETE FROM notifications WHERE expires_at < CURRENT_TIMESTAMP;
```

