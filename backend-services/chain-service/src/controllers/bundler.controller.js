// src/controllers/bundler.controller.js
// =======================================================
// Bundler 控制器
// 处理 UserOperation 提交请求
// =======================================================
const bundlerService = require('../services/bundler.service');

/**
 * 提交 UserOperation
 * 接收客户端的 UserOperation 并提交到区块链
 * @param {object} req - Express 请求对象
 * @param {object} res - Express 响应对象
 * @param {function} next - Express next 函数
 */
async function submitUserOp(req, res, next) {
  try {
    // 从请求体获取 UserOperation
    const userOp = req.body;
    // 调用 Bundler 服务处理并提交
    const result = await bundlerService.handleSubmit(userOp);
    // 返回 202 Accepted，表示已接受但处理中
    res.status(202).json({ ok: true, result });
  } catch (err) {
    // 将错误传递给错误处理中间件
    next(err);
  }
}

// 导出 Bundler 控制器函数
module.exports = { submitUserOp };
