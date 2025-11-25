// src/middleware/requestLogger.js
const morgan = require('morgan');

// 定义一个自定义的JSON日志格式
morgan.token('body', (req) => JSON.stringify(req.body));
morgan.token('timestamp', () => new Date().toISOString());

const jsonFormat =
  '{ "timestamp": ":timestamp", "method": ":method", "url": ":url", "status": :status, "content-length": ":res[content-length]", "response-time": ":response-time ms", "remote-addr": ":remote-addr", "body": :body }';

const logger = morgan(jsonFormat, {
  // 可以根据环境选择性地跳过某些日志
  // 例如，在生产环境中不记录成功的健康检查请求
  skip: (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return req.path === '/api/health' && res.statusCode < 400;
    }
    return false;
  }
});

module.exports = logger;