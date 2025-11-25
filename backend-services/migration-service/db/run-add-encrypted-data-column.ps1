# =====================================================
# 执行添加加密数据字段的数据库迁移脚本
# =====================================================

Write-Host "正在执行数据库迁移..." -ForegroundColor Cyan

# 数据库连接参数
$DB_HOST = "localhost"
$DB_PORT = "5400"
$DB_USER = "root"
$DB_NAME = "migration_db"
$SQL_FILE = "add-encrypted-data-column.sql"

# 执行SQL文件
Write-Host "连接到数据库: ${DB_NAME}..." -ForegroundColor Yellow
$env:PGPASSWORD = "123456"

try {
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $SQL_FILE
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ 数据库迁移成功!" -ForegroundColor Green
        Write-Host "已添加以下字段:" -ForegroundColor Cyan
        Write-Host "  - encrypted_data (TEXT)" -ForegroundColor White
        Write-Host "  - data_size (BIGINT)" -ForegroundColor White
        Write-Host "  - download_count (INTEGER)" -ForegroundColor White
        Write-Host "  - uploaded_at (BIGINT)" -ForegroundColor White
        Write-Host "  - created_by (VARCHAR(42))" -ForegroundColor White
    } else {
        Write-Host "`n❌ 数据库迁移失败!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ 执行失败: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD
}


