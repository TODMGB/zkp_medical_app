// src/routes/index.js
// =======================================================
// 主路由配置
// 按功能分类注册路由
// =======================================================
const { Router } = require('express');

// 导入所有子路由
const accountRouter = require('./account.routes');       // 账户管理
const guardianRouter = require('./guardian.routes');     // 守护者管理
const recoveryRouter = require('./recovery.routes');     // 社交恢复
const bundlerRouter = require('./bundler.routes');       // UserOperation 提交
const paymasterRouter = require('./paymaster.routes');   // Paymaster 管理
const zkpRouter = require('./zkp.routes');               // ZKP 证明验证

const router = Router();

// =======================================================
// 健康检查
// =======================================================
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP',
    timestamp: new Date().toISOString(),
    routes: {
      account: '/account - 抽象账户管理',
      guardian: '/guardian - 守护者管理',
      recovery: '/recovery - 社交恢复流程',
      bundler: '/bundler - UserOperation 提交',
      paymaster: '/paymaster - Paymaster 管理',
      zkp: '/zkp - ZKP证明验证',
      ipfs: '/ipfs - IPFS 文件存储'
    }
  });
});

// =======================================================
// 注册子路由
// =======================================================

// 1. 账户管理（核心功能）
router.use('/account', accountRouter);

// 2. 守护者管理
router.use('/guardian', guardianRouter);

// 3. 社交恢复流程
router.use('/recovery', recoveryRouter);

// 4. Bundler（UserOperation 提交）
router.use('/bundler', bundlerRouter);

// 5. Paymaster（Gas 代付）
router.use('/paymaster', paymasterRouter);

// 6. ZKP证明验证
router.use('/zkp', zkpRouter);

module.exports = router;