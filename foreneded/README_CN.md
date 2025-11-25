# 健康守护 - 智能服药管理系统

<div align="center">

**基于区块链账户抽象技术的智能健康管理应用**

[![Vue 3](https://img.shields.io/badge/Vue-3.5+-4FC08D?style=flat&logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0+-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-7.4+-119EFF?style=flat&logo=capacitor)](https://capacitorjs.com/)

[快速开始](#快速开始) • [功能特性](#功能特性) • [技术架构](#技术架构) • [文档](#文档)

</div>

---

## 📖 项目简介

**健康守护**是一款专为老年人设计的智能服药管理应用，融合了前沿的区块链技术、生物识别和人性化UI设计，为老年用户提供安全、便捷、智能的健康管理体验。

### 核心亮点

- 🔐 **账户抽象（ERC-4337）**：基于智能合约的账户系统，支持社交恢复，永不丢失
- 🔑 **生物识别快速登录**：指纹/面容ID一触即达，安全便捷
- 💊 **智能用药管理**：个性化用药计划，智能提醒，一键打卡
- 👨‍👩‍👧‍👦 **家庭圈守护**：家人远程关注，及时了解服药情况
- 🏥 **医院系统对接**：实名验证，数据可信
- 🎨 **苹果风格UI**：灵动优雅，适老化设计

---

## ✨ 功能特性

### 用户体验流程

```
首次使用
  └─ 欢迎页（灵动动画）
      └─ 注册（验证身份）
          └─ 设置密码
              └─ 启用指纹
                  └─ 进入主页

再次使用
  └─ 自动跳转登录
      └─ 指纹验证（自动弹出）
          └─ 验证成功 → 主页
          └─ 验证失败 → 密码登录
```

### 主要功能模块

#### 📱 首页 - 今日任务
- 清晰展示当天用药计划
- 实时状态（待办/已完成/已漏服）
- 一键打卡，操作简便

#### 📊 用药记录
- 日历视图，直观呈现
- 用颜色标记完成情况
- 按周/按月统计分析

#### 👪 家庭圈
- 生成邀请二维码
- 家人扫码关联
- 查看服药记录
- 发送关怀消息

#### ⚙️ 账户安全
- 修改登录密码
- 管理生物识别
- 社交恢复设置
- 账户迁移功能

---

## 🛠️ 技术架构

### 技术栈

```
前端框架         Vue 3.5+ (Composition API)
构建工具         Vite 7.0+
编程语言         TypeScript 5.8+
移动端框架       Capacitor 7.4+
区块链交互       ethers.js 6.15+
账户抽象         ERC-4337
零知识证明       snarkjs 0.7+
生物识别         capacitor-native-biometric
```

### 系统架构

```
┌─────────────────────────────────────┐
│          移动端应用 (Vue 3)          │
│  ┌──────────┐      ┌──────────┐    │
│  │  UI层    │ ───→ │ 业务逻辑 │    │
│  └──────────┘      └──────────┘    │
│         │                │           │
│    Capacitor        ethers.js       │
│    (原生能力)      (区块链)         │
└─────────────────────────────────────┘
         │                  │
         ↓                  ↓
┌─────────────┐   ┌─────────────────┐
│ 用户信息服务 │   │  区块链基础设施  │
│ Port: 5000  │   │  ┌────────────┐ │
│ - 身份验证  │   │  │ RPC: 8545  │ │
│ - 用户档案  │   │  │ AA:  4337  │ │
└─────────────┘   └─────────────────┘
```

### 目录结构

```
zk-app-mvp/
├── src/
│   ├── views/              # 页面组件
│   │   ├── onboarding/    # 登录注册流程
│   │   ├── core/          # 核心功能（首页、记录）
│   │   └── management/    # 管理设置
│   ├── service/           # 业务服务层
│   │   ├── accountAbstraction.ts  # 账户抽象
│   │   ├── biometric.ts           # 生物识别
│   │   ├── userInfo.ts            # 用户信息
│   │   └── wallet.ts              # 钱包管理
│   ├── config/            # 配置文件
│   └── router/            # 路由配置
├── android/               # Android原生项目
├── doc/                   # 项目文档
└── package.json
```

---

## 🚀 快速开始

### 环境要求

- **Node.js**: 20.19+ 或 22.12+
- **包管理器**: npm/pnpm/yarn
- **Android Studio**: 用于Android开发（可选）

### 安装步骤

#### 1️⃣ 克隆项目

```bash
git clone <repository-url>
cd zk-app-mvp
```

#### 2️⃣ 安装依赖

```bash
npm install
```

#### 3️⃣ 配置后端服务

编辑 `src/config/api.config.ts`，修改后端IP地址：

```typescript
const BACKEND_IP = '192.168.0.186'; // 改成你的后端服务器IP
```

**确保以下服务正在运行：**

| 服务 | 端口 | 说明 |
|------|------|------|
| 用户信息服务 | 5000 | 身份验证、用户档案查询 |
| 区块链RPC节点 | 8545 | 以太坊本地节点 |
| 账户抽象服务 | 4337 | Bundler + Paymaster |

#### 4️⃣ 启动开发服务器

```bash
npm run dev
```

在浏览器中访问：`http://localhost:5173`

#### 5️⃣ 构建Android应用（可选）

```bash
# 构建Web资源
npm run build

# 同步到Android
npx cap sync android

# 在Android Studio中打开
npx cap open android
```

### 测试账号

**老人用户**
```
姓名：张三
身份证：110101199001011234
手机：13800138000
邮箱：zhangsan@example.com
```

**医生用户**
```
姓名：李医生
身份证：110101199001015678
手机：13900139000
邮箱：dr.li@hospital.com
```

---

## 📚 文档

### 核心文档

| 文档 | 说明 |
|------|------|
| [QUICK_START.md](./doc/QUICK_START.md) | 快速开始指南 |
| [login-signup-flow.md](./doc/login-signup-flow.md) | 登录注册流程详解 |
| [database-schema.md](./doc/database-schema.md) | 数据库结构说明 |
| [api.md](./doc/api.md) | API接口文档 |
| [biometric-auto-login.md](./doc/biometric-auto-login.md) | 生物识别登录指南 |
| [pages.md](./doc/pages.md) | 页面功能清单 |
| [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) | 完整项目文档 |

### 技术文档

| 文档 | 说明 |
|------|------|
| [mode-a-responsibilities.md](./doc/mode-a-responsibilities.md) | 模块职责划分 |
| [userInfo_api_doc.md](./doc/userInfo_api_doc.md) | 用户信息API |
| [debugging-transaction-error.md](./doc/debugging-transaction-error.md) | 交易错误调试 |
| [test-account-address-guide.md](./doc/test-account-address-guide.md) | 账户地址测试 |

---

## 🔐 安全特性

### 多层次安全保障

#### 1. 密码安全
- ❌ 从不明文存储
- ✅ ethers.js加密钱包
- ✅ 本地设备存储
- ✅ 加密算法业界标准

#### 2. 生物识别安全
- ✅ 硬件级加密（Android Keystore）
- ✅ 密码加密存储，只能通过生物识别解密
- ✅ 本地验证，数据不上传
- ✅ 自动降级到密码登录

#### 3. 区块链安全
- ✅ 智能合约账户（ERC-4337标准）
- ✅ 社交恢复机制
- ✅ 私钥本地生成，永不离开设备
- ✅ 所有操作需签名确认

#### 4. 数据隐私
- ✅ 身份证号自动脱敏
- ✅ 参数化查询，防SQL注入
- ✅ HTTPS加密传输（生产环境）
- ✅ 最小化数据收集

---

## 🎨 设计规范

### UI特性

**设计风格**: 苹果风格灵动UI

**核心原则**
- 优雅简洁
- 流畅动画
- 适老化设计
- 响应式布局

### 颜色方案

```css
主色调：紫色渐变 (#667eea → #764ba2)
背景：毛玻璃效果
文字：白色系列
按钮：白色/渐变
状态：绿/黄/红
```

### 动画效果

- **渐变背景**：呼吸动画
- **Logo浮动**：上下浮动
- **文字淡入**：从下往上
- **按钮脉冲**：波纹扩散
- **卡片滑入**：从底部滑入

---

## 🔧 开发命令

```bash
# 开发模式
npm run dev

# 类型检查
npm run type-check

# 生产构建
npm run build

# 预览构建结果
npm run preview
```

---

## 📊 项目状态

### 当前版本: v0.0.0

#### ✅ 已完成功能

- [x] 登录注册系统（苹果风格UI）
- [x] 账户抽象集成（ERC-4337）
- [x] 生物识别登录
- [x] 用户信息验证
- [x] 首页/今日任务
- [x] 用药记录管理
- [x] 家庭圈功能
- [x] 账户安全管理
- [x] 应用设置

#### 🚧 进行中

- [ ] 用药提醒推送
- [ ] 数据统计分析
- [ ] 导出健康报告

#### 📋 计划中

- [ ] AI用药建议
- [ ] 语音交互
- [ ] 医生端应用
- [ ] 多语言支持

---

## 🐛 故障排查

### 常见问题

#### Q1: 用户信息查询失败

**解决方案：**
```bash
# 检查服务状态
curl http://192.168.0.186:5000/health

# 检查IP配置
cat src/config/api.config.ts
```

#### Q2: 指纹验证不弹出

**解决方案：**
1. 检查设备设置中是否启用指纹
2. 使用密码登录
3. 在账户安全中重新启用

#### Q3: 账户创建失败

**解决方案：**
```bash
# 检查RPC节点
curl http://192.168.0.186:8545

# 检查Bundler服务
curl http://192.168.0.186:4337/api/health
```

更多问题请查看[完整文档](./PROJECT_DOCUMENTATION.md#常见问题解答)。

---

## 🤝 贡献指南

### 代码规范

- **TypeScript**: 严格模式，避免any
- **Vue**: Composition API，使用`<script setup>`
- **命名**: 组件PascalCase，文件kebab-case

### 提交规范

```
feat: 添加新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/依赖
```

---

## 📄 许可证

本项目仅供学习和研究使用。

---

## 📮 联系方式

- 提交Issue: [GitHub Issues]
- 查看文档: [doc/](./doc/)
- 完整文档: [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)

---

<div align="center">

**让科技守护健康，让家人更安心** ❤️

Made with ❤️ by ZK-App Team

</div>
