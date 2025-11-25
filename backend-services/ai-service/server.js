// server.js
// =======================================================
// AI Service 主入口文件
// 集成硅基流动 API 的多模态 AI 服务
// =======================================================

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./src/config');
const mainRouter = require('./src/routes');
const corsMiddleware = require('./src/middleware/cors.middleware');
const errorHandler = require('./src/middleware/errorHandler.middleware');

const app = express();

// =======================================================
// 应用中间件
// =======================================================

// 安全中间件
app.use(helmet());

// CORS 中间件
app.use(corsMiddleware);

// JSON 请求体解析
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// HTTP 请求日志
app.use(morgan('combined'));

// =======================================================
// 业务路由
// =======================================================

app.use('/api', mainRouter);

// =======================================================
// 错误处理
// =======================================================

app.use(errorHandler);

// =======================================================
// 启动服务器
// =======================================================

async function startServer() {
  try {
    console.log('='.repeat(60));
    console.log('🚀 AI Service 启动中...');
    console.log('='.repeat(60));
    console.log('\n📌 配置信息:');
    console.log(`   端口: ${config.PORT}`);
    console.log(`   硅基流动 API: ${config.siliconflow.baseUrl}`);
    console.log(`   模型: ${config.siliconflow.model}`);
    console.log(`   CORS: ${config.cors.allowAll ? '允许所有源' : '限制源'}`);

    const server = app.listen(config.PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('✅ AI Service 启动成功！');
      console.log('='.repeat(60));
      console.log(`\n📡 API 端点:`);
      console.log(`   健康检查: http://localhost:${config.PORT}/api/health`);
      console.log(`   简单对话: POST http://localhost:${config.PORT}/api/ai/chat`);
      console.log(`   多模态对话: POST http://localhost:${config.PORT}/api/ai/multimodal`);
      console.log(`   图片分析: POST http://localhost:${config.PORT}/api/ai/image`);
      console.log(`   视频分析: POST http://localhost:${config.PORT}/api/ai/video`);
      console.log(`   音频分析: POST http://localhost:${config.PORT}/api/ai/audio`);
      console.log('\n' + '='.repeat(60) + '\n');
    });

    // 优雅关闭
    process.on('SIGTERM', () => {
      console.log('🔄 收到 SIGTERM 信号，正在优雅关闭...');
      server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n🔄 收到 SIGINT 信号，正在优雅关闭...');
      server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 执行启动
startServer();
