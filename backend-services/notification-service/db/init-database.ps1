# ==========================================
# Notification Service - Database Initialization Script
# ==========================================

Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Notification Service Database Initialization    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 数据库配置
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_USER = "postgres"
$DB_PASSWORD = "123456"
$DB_NAME = "bs_notification_db"

# 设置PostgreSQL密码环境变量（避免交互式输入）
$env:PGPASSWORD = $DB_PASSWORD

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Host: $DB_HOST" -ForegroundColor Gray
Write-Host "   Port: $DB_PORT" -ForegroundColor Gray
Write-Host "   User: $DB_USER" -ForegroundColor Gray
Write-Host "   Database: $DB_NAME" -ForegroundColor Gray
Write-Host ""

try {
    # 检查PostgreSQL是否可访问
    Write-Host "🔍 Checking PostgreSQL connection..." -ForegroundColor Yellow
    $checkConnection = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT version();" 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to connect to PostgreSQL!" -ForegroundColor Red
        Write-Host "   Please ensure PostgreSQL is running and credentials are correct." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ PostgreSQL connection successful!" -ForegroundColor Green
    Write-Host ""
    
    # 检查数据库是否存在
    Write-Host "🔍 Checking if database '$DB_NAME' exists..." -ForegroundColor Yellow
    $dbExists = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" 2>&1
    
    if ($dbExists -match "1") {
        Write-Host "⚠️  Database '$DB_NAME' already exists!" -ForegroundColor Yellow
        $response = Read-Host "   Do you want to recreate it? (y/N)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Write-Host "🗑️  Dropping existing database..." -ForegroundColor Yellow
            psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE $DB_NAME;" | Out-Null
            Write-Host "✅ Database dropped successfully!" -ForegroundColor Green
        } else {
            Write-Host "⏭️  Skipping database creation, will update tables..." -ForegroundColor Yellow
        }
    }
    
    # 创建数据库
    if (-not ($dbExists -match "1") -or ($response -eq 'y' -or $response -eq 'Y')) {
        Write-Host "🔨 Creating database '$DB_NAME'..." -ForegroundColor Yellow
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database created successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to create database!" -ForegroundColor Red
            exit 1
        }
    }
    Write-Host ""
    
    # 执行SQL脚本
    Write-Host "📜 Executing SQL script..." -ForegroundColor Yellow
    $scriptPath = Join-Path $PSScriptRoot "create-notification-database.sql"
    
    if (-not (Test-Path $scriptPath)) {
        Write-Host "❌ SQL script not found: $scriptPath" -ForegroundColor Red
        exit 1
    }
    
    $result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $scriptPath 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SQL script executed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║       ✅ Database Initialized Successfully!        ║" -ForegroundColor Green
        Write-Host "╠════════════════════════════════════════════════════╣" -ForegroundColor Green
        Write-Host "║   Database: $DB_NAME                    ║" -ForegroundColor Green
        Write-Host "║   Tables: notifications, devices,                  ║" -ForegroundColor Green
        Write-Host "║           notification_settings,                   ║" -ForegroundColor Green
        Write-Host "║           websocket_connections                    ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to execute SQL script!" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ An error occurred: $_" -ForegroundColor Red
    exit 1
} finally {
    # 清除密码环境变量
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "🎉 All done! You can now start the notification service." -ForegroundColor Cyan

