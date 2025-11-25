// server.js
// =======================================================
// 用户信息源服务
// 提供权威人员信息查询服务，用于验证身份信息
// =======================================================

// 步骤 1: 引入依赖
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

// 步骤 2: 配置
const PORT = process.env.PORT || 3002;  // 服务端口
const dbConfig = {
  user: process.env.DB_USER,              // 数据库用户名
  host: process.env.DB_HOST,              // 数据库主机
  database: process.env.DB_DATABASE,      // 数据库名称
  password: process.env.DB_PASSWORD,      // 数据库密码
  port: parseInt(process.env.DB_PORT, 10), // 数据库端口
};

// 步骤 3: 初始化
const app = express();           // 创建 Express 应用
const pool = new Pool(dbConfig); // 创建数据库连接池

// ANSI 颜色码（用于美化控制台输出）
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

/**
 * 简单日志中间件
 * 记录每个请求的方法、状态码、URL 和响应时间
 */
function simpleLogger(req, res, next) {
  const startTime = Date.now();
  const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  
  // 跳过健康检查日志（避免输出过多）
  if (req.path === '/health') {
    return next();
  }
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const method = req.method.padEnd(6);
    const status = res.statusCode;
    const url = req.originalUrl || req.url;
    
    // 根据状态码选择颜色
    let statusColor;
    if (status >= 500) statusColor = colors.red;
    else if (status >= 400) statusColor = colors.yellow;
    else if (status >= 300) statusColor = colors.cyan;
    else statusColor = colors.green;
    
    // 根据响应时间选择颜色
    let timeColor;
    if (duration < 100) timeColor = colors.green;
    else if (duration < 500) timeColor = colors.yellow;
    else timeColor = colors.red;
    
    console.log(
      `${colors.gray}[${timestamp}]${colors.reset} ` +
      `${colors.blue}${method}${colors.reset} ` +
      `${statusColor}${status}${colors.reset} ` +
      `${colors.cyan}${url}${colors.reset} ` +
      `${timeColor}${duration}ms${colors.reset}`
    );
  });
  
  next();
}

// 步骤 4: 应用中间件
app.use(cors());           // 启用跨域资源共享
app.use(express.json());   // 解析 JSON 请求体
app.use(simpleLogger);     // 应用请求日志中间件

// 步骤 5: 定义 API 路由和处理逻辑
/**
 * GET /api/persons/lookup
 * 通过查询参数查找个人档案（用于身份验证）
 * 支持的查询参数: id_card_number, phone_number, email
 * @returns {object} 返回脱敏后的人员记录
 */
app.get('/api/persons/lookup', async (req, res) => {
  const { id_card_number, phone_number, email } = req.query;

  // 验证：必须至少提供一个查询参数
  if (!id_card_number && !phone_number && !email) {
    return res.status(400).json({ 
      message: '请求错误：至少需要提供一个查询参数（id_card_number, phone_number 或 email）。' 
    });
  }
  
  try {
    // 动态构建 SQL 查询（使用参数化查询防止 SQL 注入）
    const conditions = [];
    const values = [];
    let queryIndex = 1;

    if (id_card_number) {
      conditions.push(`id_card_number = $${queryIndex++}`);
      values.push(id_card_number);
    }
    if (phone_number) {
      conditions.push(`phone_number = $${queryIndex++}`);
      values.push(phone_number);
    }
    if (email) {
      conditions.push(`email = $${queryIndex++}`);
      values.push(email);
    }

    const queryText = `SELECT * FROM person_records WHERE ${conditions.join(' OR ')}`;
    
    // 执行数据库查询
    const result = await pool.query(queryText, values);
    const person = result.rows[0];

    // 处理查询结果
    if (!person) {
      return res.status(404).json({ message: '未找到人员记录。' });
    }
    
    // 返回脱敏后的数据（隐藏身份证号中间部分）
    const sanitizedPerson = {
      ...person,
      id_card_number: person.id_card_number.replace(/^(.{4}).*(.{4})$/, '$1**********$2'),
    };
    res.status(200).json(sanitizedPerson);

  } catch (error) {
    console.error('数据库查询错误:', error);
    res.status(500).json({ message: '内部服务器错误' });
  }
});

// 健康检查路由
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'user-info-service' });
});

// 步骤 6: 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 用户信息源服务运行在 http://localhost:${PORT}`);
});