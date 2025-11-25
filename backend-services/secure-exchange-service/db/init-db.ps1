# init-db.ps1
# Secure Exchange Service 数据库初始化脚本

# 数据库配置
$DB_HOST = "localhost"
$DB_PORT = "5400"
$DB_USER = "root"
$DB_NAME = "bs_secure_exchange_db"
$PGPASSWORD = "123456"

# 设置密码环境变量
$env:PGPASSWORD = $PGPASSWORD

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME WITH OWNER = root ENCODING = 'UTF8';"

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$PSScriptRoot/create-tables.sql"

# 清除密码环境变量
Remove-Item Env:\PGPASSWORD

