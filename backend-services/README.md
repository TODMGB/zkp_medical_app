# Elder Medical ZKP Project

> 基于区块链的智能服药管理系统 - 老年医疗零知识证明平台

## 📖 项目简介

专为老年人设计的智能服药管理应用，结合 ERC-4337 账户抽象、零知识证明和生物识别技术。

## 🏗️ 项目结构

```
Elder_Medical_ZKP_project/
├── api-gateway/           # API 网关 (Port 3000) - 统一入口
├── userinfo-service/      # 用户信息服务 (Port 5000)
├── erc4337-service/       # ERC4337 服务 (Port 4337)
├── user-service/          # 用户认证 (gRPC 50052)
├── relationship-service/  # 关系管理 (gRPC 50053)
├── doc/                   # 文档目录
└── start-all-services.ps1 # 一键启动脚本
```

## 🚀 快速开始

### 一键启动所有服务（Windows）

```powershell
.\start-all-services.ps1
```

### 手动启动

```bash
cd api-gateway && npm install && npm start
cd userinfo-service && npm install && npm start
cd erc4337-service && npm install && npm start
cd user-service && npm install && npm start
cd relationship-service && npm install && npm start
```

### 验证服务

```bash
curl http://localhost:3000/health
```

## 🌐 统一 API 入口

**所有请求通过 API Gateway**: `http://localhost:3000/api`

| 路径 | 说明 |
|------|------|
| `/api/userinfo/*` | 用户信息查询 |
| `/api/erc4337/*` | ERC4337 账户抽象 |
| `/api/auth/*` | 用户认证 |
| `/api/relation/*` | 关系管理 |

## 📚 完整文档

### 项目报告
- [📊 项目进度报告](./PROGRESS_REPORT.md) - **最新** (2025-10-17)
- [🔐 关系服务完成度报告](./RELATIONSHIP_SERVICE_STATUS.md) - 权限管理核心 (95% 完成)

### 技术文档
- [统一 API 文档](./doc/UNIFIED_API_DOCUMENTATION.md) - **必读**
- [项目文档](./doc/PROJECT_DOCUMENTATION.md)
- [后端架构](./doc/backend-architecture.md)
- [服务启动指南](./doc/QUICK_START_SERVICES.md)

## 🔧 技术栈

Node.js + Express + gRPC + PostgreSQL + Redis + RabbitMQ + Ethers.js + ERC-4337

---

**详细文档请查看 `doc/` 目录**
