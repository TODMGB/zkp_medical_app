// src/middleware/security.js
// =======================================================
// 安全中间件
// 使用 Helmet 设置各种 HTTP 头以增强 API 安全性
// =======================================================
const helmet = require('helmet');

// helmet() 会自动添加11个安全相关的 HTTP 响应头，包括：
// - X-Content-Type-Options: nosniff           // 防止 MIME 类型混淆攻击
// - X-DNS-Prefetch-Control: off               // 控制 DNS 预取
// - X-Frame-Options: SAMEORIGIN               // 防止点击劫持
// - Strict-Transport-Security                 // 强制使用 HTTPS
// - X-Download-Options: noopen                // 防止 IE 下载文件自动打开
// - X-Permitted-Cross-Domain-Policies: none   // 控制跨域策略
// 等安全配置
module.exports = helmet();