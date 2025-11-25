# init-simple.ps1
$env:PGPASSWORD = "postgres"

Write-Host "Creating database..."
psql -h localhost -p 5400 -U postgres -d postgres -c "DROP DATABASE IF EXISTS bs_secure_exchange_db;"
psql -h localhost -p 5400 -U postgres -d postgres -c "CREATE DATABASE bs_secure_exchange_db;"

Write-Host "Creating tables..."
psql -h localhost -p 5400 -U postgres -d bs_secure_exchange_db -f "$PSScriptRoot/create-tables.sql"

Remove-Item Env:\PGPASSWORD

Write-Host "Database initialized successfully!"

