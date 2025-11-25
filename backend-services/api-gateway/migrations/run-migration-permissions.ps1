# =====================================================
# 执行迁移权限添加脚本
# 为账户迁移上传下载功能添加权限
# =====================================================

Write-Host "正在添加迁移上传下载权限..." -ForegroundColor Cyan

# 数据库连接参数（根据实际配置修改）
$DB_HOST = "localhost"
$DB_PORT = "5400"  # 或者您的 PostgreSQL 端口
$DB_USER = "root"
$DB_NAME = "bs_gateway_db"  # API Gateway 数据库名
$SQL_FILE = "add-migration-upload-download-permissions.sql"

# 设置密码环境变量
$env:PGPASSWORD = "123456"

Write-Host "连接到数据库: ${DB_NAME}..." -ForegroundColor Yellow
Write-Host "数据库地址: ${DB_HOST}:${DB_PORT}" -ForegroundColor Yellow

try {
    # 执行 SQL 文件
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $SQL_FILE
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ 权限添加成功!" -ForegroundColor Green
        Write-Host "`n添加的权限:" -ForegroundColor Cyan
        Write-Host "  1. POST /api/migration/upload" -ForegroundColor White
        Write-Host "     - 允许角色: ELDER, DOCTOR, FAMILY_MEMBER" -ForegroundColor Gray
        Write-Host "  2. GET /api/migration/download/:migrationId" -ForegroundColor White
        Write-Host "     - 允许角色: ELDER, DOCTOR, FAMILY_MEMBER, guest" -ForegroundColor Gray
        Write-Host "`n⚠️  重要提示:" -ForegroundColor Yellow
        Write-Host "  - 下载接口允许 guest 访问（新设备没有 token）" -ForegroundColor Yellow
        Write-Host "  - 需要重启 API Gateway 以清除权限缓存" -ForegroundColor Yellow
        Write-Host "`n建议操作:" -ForegroundColor Cyan
        Write-Host "  1. 重启 API Gateway 服务" -ForegroundColor White
        Write-Host "  2. 或者清除 Redis 缓存: redis-cli DEL gateway:permissions" -ForegroundColor White
    } else {
        Write-Host "`n❌ 权限添加失败!" -ForegroundColor Red
        Write-Host "请检查:" -ForegroundColor Yellow
        Write-Host "  - 数据库连接是否正常" -ForegroundColor White
        Write-Host "  - roles 和 permissions 表是否存在" -ForegroundColor White
        Write-Host "  - 数据库用户是否有足够权限" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "`n❌ 执行失败: $_" -ForegroundColor Red
    exit 1
} finally {
    # 清除密码环境变量
    Remove-Item Env:\PGPASSWORD
}

Write-Host "`n按任意键继续..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


