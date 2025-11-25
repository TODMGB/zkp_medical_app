# =====================================================
# Migration Service Database Initialization Script
# Elder Medical ZKP Project - Migration Service DB Init
# =====================================================

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Migration Service Database Init" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Database Configuration
$DB_HOST = "localhost"
$DB_PORT = "5400"
$DB_USER = "root"
$DB_PASSWORD = "123456"
$DB_NAME = "migration_db"

# Check PostgreSQL Service
Write-Host "Checking PostgreSQL service..." -ForegroundColor Yellow
try {
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if (-not $pgService -or $pgService.Status -ne "Running") {
        Write-Host "ERROR: PostgreSQL service is not running" -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: PostgreSQL service is running" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Cannot check PostgreSQL service status" -ForegroundColor Yellow
}

# Check psql command
Write-Host "Checking psql command..." -ForegroundColor Yellow
try {
    $psqlVersion = psql --version
    Write-Host "OK: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: psql command not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Database Configuration:" -ForegroundColor Cyan
Write-Host "  Host: $DB_HOST" -ForegroundColor White
Write-Host "  Port: $DB_PORT" -ForegroundColor White
Write-Host "  User: $DB_USER" -ForegroundColor White
Write-Host "  Database: $DB_NAME" -ForegroundColor White
Write-Host ""

# Set environment variable
$env:PGPASSWORD = $DB_PASSWORD

Write-Host "Starting migration database creation..." -ForegroundColor Green
Write-Host ""

# 1. Check if database exists
Write-Host "[1/3] Checking if database exists..." -ForegroundColor Yellow
$checkDbQuery = "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';"
$dbExists = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -t -c $checkDbQuery 2>$null

if ($dbExists -match "1") {
    Write-Host "WARNING: Database '$DB_NAME' already exists" -ForegroundColor Yellow
    $response = Read-Host "Do you want to recreate the database? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "Dropping existing database..." -ForegroundColor Yellow
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK: Existing database dropped" -ForegroundColor Green
        } else {
            Write-Host "ERROR: Failed to drop database" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Skipping database creation, creating tables only..." -ForegroundColor Yellow
        # Execute table creation script directly
        Write-Host "[3/3] Creating table structure..." -ForegroundColor Yellow
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$PSScriptRoot\migration-tables.sql"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK: Table structure created successfully" -ForegroundColor Green
        } else {
            Write-Host "ERROR: Failed to create table structure" -ForegroundColor Red
            exit 1
        }
        Write-Host ""
        Write-Host "Migration Service Database Initialization Complete!" -ForegroundColor Green
        exit 0
    }
}

# 2. Create database
Write-Host "[2/3] Creating database '$DB_NAME'..." -ForegroundColor Yellow
$createDbQuery = "CREATE DATABASE $DB_NAME WITH OWNER = $DB_USER ENCODING = 'UTF8';"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c $createDbQuery

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: Database created successfully" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to create database" -ForegroundColor Red
    exit 1
}

# 3. Create table structure
Write-Host "[3/3] Creating table structure..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$PSScriptRoot\migration-tables.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: Table structure created successfully" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to create table structure" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  Migration Database Init Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Connection Info:" -ForegroundColor Cyan
Write-Host "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME" -ForegroundColor Gray
Write-Host ""
Write-Host "Verify Table:" -ForegroundColor Cyan
Write-Host "  SELECT * FROM migration_sessions LIMIT 5;" -ForegroundColor Gray
Write-Host ""

# Clean up environment variable
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
