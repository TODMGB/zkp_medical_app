# Execute migration script 002 - Fix group_name field length
# Usage: .\run-002-migration.ps1

$ErrorActionPreference = "Stop"

# Database connection parameters
$DB_HOST = "localhost"
$DB_PORT = "5400"
$DB_NAME = "bs_relationship_db"
$DB_USER = "root"
$DB_PASSWORD = "123456"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Relationship Service Migration 002" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set PostgreSQL password environment variable
$env:PGPASSWORD = $DB_PASSWORD

try {
    Write-Host "Connecting to database: $DB_NAME..." -ForegroundColor Yellow
    
    # Execute migration script
    $migrationFile = Join-Path $PSScriptRoot "002_fix_group_name_length.sql"
    
    if (-not (Test-Path $migrationFile)) {
        throw "Migration file not found: $migrationFile"
    }
    
    Write-Host "Executing migration: $migrationFile" -ForegroundColor Yellow
    
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] Migration executed successfully!" -ForegroundColor Green
        Write-Host "  - group_name field extended to VARCHAR(100)" -ForegroundColor Green
    } else {
        throw "Migration failed with exit code: $LASTEXITCODE"
    }
    
} catch {
    Write-Host ""
    Write-Host "[ERROR] Migration failed: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clear password environment variable
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
