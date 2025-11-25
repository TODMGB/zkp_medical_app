// src/routes/index.js
// =======================================================
// 主路由配置
// =======================================================

const { Router } = require('express');
const aiRouter = require('./ai.routes');

const router = Router();

/**
 * 健康检查
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'ai-service',
    routes: {
      chat: 'POST /api/ai/chat - 简单对话',
      multimodal: 'POST /api/ai/multimodal - 多模态对话',
      image: 'POST /api/ai/image - 图片分析',
      video: 'POST /api/ai/video - 视频分析',
      audio: 'POST /api/ai/audio - 音频分析',
    },
  });
});

/**
 * AI 路由
 */
router.use('/ai', aiRouter);

module.exports = router;
