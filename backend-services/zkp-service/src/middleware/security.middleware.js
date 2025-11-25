// src/middleware/security.js
const helmet = require('helmet');

// helmet() 会自动添加11个安全相关的中间件
// 例如：
// - X-Content-Type-Options: nosniff
// - X-DNS-Prefetch-Control: off
// - X-Frame-Options: SAMEORIGIN
// - Strict-Transport-Security
// ...等等
module.exports = helmet();