# Elder Medical ZKP Project - 服务启动脚本
# 作者: Elder Medical Team
# 日期: 2025-10-17
# 说明: 一键启动所有后端微服务

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Elder Medical ZKP Project" -ForegroundColor Cyan
Write-Host "  服务启动脚本 (新架构 v2.0)" -ForegroundColor Cyan
Write-Host "  HTTP代理 + gRPC内部通信" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host ""
Write-Host "🚀 启动所有服务..." -ForegroundColor Green

# 启动 userinfo-service
Write-Host "[1] 启动 userinfo-service (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\userinfo-service'; Write-Host 'userinfo-service 启动中...' -ForegroundColor Cyan; npm start"
Start-Sleep -Seconds 3

# 启动 chain-service
Write-Host "[2] 启动 chain-service (Port 4337)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\chain-service'; Write-Host 'chain-service 启动中...' -ForegroundColor Cyan; npm start"
Start-Sleep -Seconds 3

# 启动 migration-service
Write-Host "[3] 启动 migration-service (Port 3004)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\migration-service'; Write-Host 'migration-service 启动中...' -ForegroundColor Cyan; npm start"
Start-Sleep -Seconds 3

# 启动 user-service
Write-Host "[4] 启动 user-service (gRPC 50052)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\user-service'; Write-Host 'user-service 启动中...' -ForegroundColor Cyan; npm start"
Start-Sleep -Seconds 3

# 启动 relationship-service
Write-Host "[5] 启动 relationship-service (gRPC 50053)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\relationship-service'; Write-Host 'relationship-service 启动中...' -ForegroundColor Cyan; npm start"
Start-Sleep -Seconds 3

# 启动 zkp-service
Write-Host "[6] 启动 zkp-service (gRPC 50057)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\zkp-service'; Write-Host 'zkp-service 启动中...' -ForegroundColor Cyan; npm start"
Start-Sleep -Seconds 3

# 启动 notification-service
Write-Host "[7] 启动 notification-service (gRPC 50058)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\notification-service'; Write-Host 'notification-service 启动中...' -ForegroundColor Cyan; npm start"
Start-Sleep -Seconds 3

# 启动 api-gateway (最后启动)
Write-Host "[8] 启动 secure-exchange-service(Port 3007)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\secure-exchange-service'; Write-Host 'api-gateway 启动中...' -ForegroundColor Cyan; npm start"
Start-Sleep -Seconds 2

# 启动 api-gateway (最后启动)
Write-Host "[9] 启动 medication-service(Port 3006)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\medication-service'; Write-Host 'medication-service 启动中...' -ForegroundColor Cyan; npm start"
Start-Sleep -Seconds 2

# 启动 api-gateway (最后启动)
Write-Host "[10] 启动 api-gateway (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\api-gateway'; Write-Host 'api-gateway 启动中...' -ForegroundColor Cyan; npm start"
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  所有服务启动完成!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "服务地址:" -ForegroundColor Cyan
Write-Host "  ➜ API Gateway:           http://localhost:3000" -ForegroundColor White
Write-Host "  ➜ Userinfo Service:      http://localhost:5000" -ForegroundColor White
Write-Host "  ➜ Chain Service:         http://localhost:4337" -ForegroundColor White
Write-Host "  ➜ Migration Service:     http://localhost:3004" -ForegroundColor White
Write-Host "  ➜ User Service (gRPC):   localhost:50052" -ForegroundColor White
Write-Host "  ➜ Relation Service (gRPC): localhost:50053" -ForegroundColor White
Write-Host ""
Write-Host "健康检查:" -ForegroundColor Cyan
Write-Host "  curl http://localhost:3000/health" -ForegroundColor Gray
Write-Host "  curl http://localhost:3000/api/migration/health" -ForegroundColor Gray
Write-Host ""
Write-Host "迁移API测试:" -ForegroundColor Cyan
Write-Host "  cd migration-service && node test-migration-api.js" -ForegroundColor Gray
Write-Host ""
Write-Host "数据库初始化:" -ForegroundColor Cyan
Write-Host "  cd db && .\init-migration-db.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
