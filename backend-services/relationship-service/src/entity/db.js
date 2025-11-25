// src/entity/db.js
// =======================================================
// PostgreSQL 数据库连接池配置
// 提供全局数据库连接池实例
// =======================================================
const { Pool } = require('pg');
const config = require('../config');

// 创建 PostgreSQL 连接池
const pool = new Pool(config.db);

// 监听连接池错误事件
// 当空闲的数据库客户端发生意外错误时，终止应用程序
pool.on('error', (err) => {
  console.error('PostgreSQL 客户端发生意外错误:', err);
  process.exit(-1);
});

// 导出连接池实例供其他模块使用
module.exports = pool;