# 后端服务汇总文档

> 基于 ERC-4337 与零知识证明的隐私保护用药依从性平台（2025-10-31 状态）

## 1. 总体架构

- **目标**：为老人及其信任的照护者提供可验证但隐私友好的用药记录平台，核心追求「可信度、隐私、易用性、零 Gas 费用」。
- **分层**：客户端（Vue + Capacitor） → API Gateway → 微服务集群 → 区块链与存储层。API Gateway 对外提供 REST，服务间维持 HTTP + gRPC 双栈通信，保障一致接口与高性能内部调用。@doc/汇总.md#8-147 @doc/architecture-update.md#5-148
- **基础设施**：PostgreSQL 保存主数据，Redis 做缓存/会话，RabbitMQ 负责事件与通知；通过 docker-compose 统一编排。@doc/汇总.md#125-200 @docker-compose.yml#380-399

## 2. 核心网关（API Gateway）

- **职责**：统一认证、路由、日志、CORS、安全头、请求代理（含 WebSocket 透传），将前端请求映射到各微服务 HTTP 层。@api-gateway/README.md#65-305
- **安全机制**：JWT 校验、自动注入 `x-user-smart-account`、两步式 UserOp 构建/提交、防重放日志。@api-gateway/README.md#140-213
- **服务发现**：通过 `.env` 或 docker-compose 注入各服务 URL，支持 HTTP 与 WebSocket 代理列表。@api-gateway/src/config/index.js#1-72

## 3. 微服务概览

| 服务 | 职责 | 接口/端口 | 关键集成 |
| --- | --- | --- | --- |
| **User Service** | 无密码注册/登录、JWT 签发、角色与公钥管理 | HTTP 3001 / gRPC 50051 | 提供身份、公钥给其他服务 | @user-service/README.md#5-352 |
| **Relationship Service** | 访问组、邀请、关系与权限管理（系统默认组） | HTTP 3004 / gRPC 50053 | 依赖 User Service 校验 | @relationship-service/README.md#5-325 |
| **ERC4337 Chain Service** | 抽象账户、守护者、社交恢复、Paymaster、ZKP 验证 | HTTP 4337 | 连接合约 EntryPoint/Paymaster | @chain-service/README.md#1-400 |
| **Secure Exchange Service** | 端到端加密会话、消息中转、WebSocket 推送 | HTTP 3006 / WS / gRPC 50056 | 取用户公钥、调用通知队列 | @secure-exchange-service/README.md#1-400 |
| **Medication Service** | 加密用药计划 CRUD、常用药物库、医生-患者协作 | HTTP 3007 / gRPC 50057 | 与 Secure Exchange 共享数据、访问计划库 | @medication-service/README.md#1-400 |
| **Migration Service** | 旧/新设备间迁移会话、确认码、加密数据上下行 | HTTP 3004 | 提供无 Token 下载通道 | @migration-service/README.md#1-253 |
| **Notification Service** | WebSocket/FCM 推送、多级队列、通知持久化 | HTTP 3006 / WS / gRPC | 订阅 RabbitMQ，追踪在线状态 | @notification-service/README.md#1-400 |
| **ZKP Service** | 周度汇总 Groth16 证明生成、任务查询、MQ 通知 | HTTP 3007 / gRPC 50057 | 输出 proof + calldata 给上链流程 | @zkp-service/README.md#1-337 |
| **AI Service** | 对接硅基流动多模态 API，提供聊天/图像/音视频分析 | HTTP 3002 | 支撑智能辅助场景 | @ai-service/README.md#1-367 |
| **Userinfo Service** | 精简 HTTP 服务，向 Gateway 提供档案查询（代码集中在 `server.js`） | HTTP 5000 | 注册校验、身份补充 | `userinfo-service/server.js`

## 4. 关键业务流

1. **注册与身份管理**：用户以 EOA 地址注册，系统生成 Smart Account 与默认访问组；JWT 中嵌入角色供 Gateway 与下游鉴权。@user-service/README.md#105-228 @relationship-service/README.md#60-84
2. **访问控制**：老人通过访问组邀请医生/家属，Relationship Service 维护状态并驱动通知。@relationship-service/README.md#127-383
3. **用药计划流转**：医生在 Medication Service 创建加密计划 → Secure Exchange 协调密钥与消息 → Notification Service 推送更新。@medication-service/README.md#85-399 @secure-exchange-service/README.md#108-302
4. **零知识打卡**：客户端生成 Merkle 叶子并调用 ZKP Service 生成周度汇总 proof → Chain Service 验证或上链 EntryPoint/ZKP 验证合约。@doc/汇总.md#67-147 @zkp-service/README.md#80-320 @chain-service/README.md#270-340
5. **社交恢复与账户抽象**：Chain Service 通过 `/build` → 客户端签名 → `/submit` 模式保障私钥安全，Paymaster 代付 gas，Role-based Guardian 管理。@chain-service/README.md#71-340

## 5. 数据与消息

- **数据库**：主要实体（users、access_groups、medication_plans 等）见架构文档，均存于 PostgreSQL，不存明文敏感数据（药物计划加密后存储）。@doc/汇总.md#149-200 @medication-service/README.md#22-56
- **缓存/会话**：Redis 用于 JWT 会话、迁移 nonce、Secure Exchange 防重放、通知在线状态。@secure-exchange-service/README.md#308-339
- **消息队列**：RabbitMQ Exchange `exchange.notifications`，由 Notification Service 消费；ZKP、Secure Exchange、其他服务均可发布事件。@notification-service/README.md#136-349 @zkp-service/README.md#200-223

## 6. 运维与部署

- **本地开发**：`start-all-services.ps1` 批量拉起；亦可逐个 `npm start`。@README.md#22-44
- **容器化**：`docker-compose.yml` 配置所有服务 URL、数据库、Redis、WS 代理，Gateway 暴露 3000 端口。@docker-compose.yml#380-399
- **健康检查**：各服务提供 `/health`，Gateway 亦有 `/api/health`；架构文档列出推荐检测顺序。@api-gateway/README.md#240-274 @architecture-update.md#150-165
- **安全注意**：JWT/私钥必须配置强密钥；正式环境需 HTTPS、速率限制及日志集中化；所有链上操作遵循 build+submit 模式。@api-gateway/README.md#325-389 @chain-service/README.md#324-400

## 7. 后续路线图

- 零知识打卡前端轻量化、提醒推送、统计看板、周度 proof 上链、AI 隐私分析、服务发现/限流/监控完善。@doc/汇总.md#38-44 @architecture-update.md#178-184

---
本汇总覆盖截至 2025-10-31 的主要后端代码与服务职责，更多细节可参考 `doc/` 目录中的完整接口与流程文档。
