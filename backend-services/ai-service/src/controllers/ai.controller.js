// src/controllers/ai.controller.js
// =======================================================
// AI 控制器
// 处理 AI 相关的 HTTP 请求
// =======================================================

const aiService = require('../services/ai.service');

/**
 * 简单对话
 * POST /ai/chat
 * Body: { message: string, history?: Array }
 */
async function simpleChat(req, res, next) {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message 为必填项',
      });
    }

    console.log('[Controller] 处理简单对话请求');

    const response = await aiService.simpleChat(message, history);

    res.status(200).json({
      success: true,
      data: {
        message: response,
      },
    });
  } catch (error) {
    console.error('[Controller] 简单对话失败:', error);
    next(error);
  }
}

/**
 * 多模态对话
 * POST /ai/multimodal
 * Body: { content: Array, history?: Array, options?: Object }
 */
async function multimodalChat(req, res, next) {
  try {
    const { content, history = [], options = {} } = req.body;

    if (!content || !Array.isArray(content)) {
      return res.status(400).json({
        success: false,
        error: 'content 必须是数组',
      });
    }

    console.log('[Controller] 处理多模态对话请求');

    const result = await aiService.multimodalChat(content, history, options);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Controller] 多模态对话失败:', error);
    next(error);
  }
}

/**
 * 图片分析
 * POST /ai/image
 * Body: { imageUrl: string, question: string, options?: Object }
 */
async function analyzeImage(req, res, next) {
  try {
    const { imageUrl, question, options = {} } = req.body;

    if (!imageUrl || !question) {
      return res.status(400).json({
        success: false,
        error: 'imageUrl 和 question 为必填项',
      });
    }

    console.log('[Controller] 处理图片分析请求');

    const response = await aiService.analyzeImage(imageUrl, question, options);

    res.status(200).json({
      success: true,
      data: {
        analysis: response,
      },
    });
  } catch (error) {
    console.error('[Controller] 图片分析失败:', error);
    next(error);
  }
}

/**
 * 视频分析
 * POST /ai/video
 * Body: { videoUrl: string, question: string, options?: Object }
 */
async function analyzeVideo(req, res, next) {
  try {
    const { videoUrl, question, options = {} } = req.body;

    if (!videoUrl || !question) {
      return res.status(400).json({
        success: false,
        error: 'videoUrl 和 question 为必填项',
      });
    }

    console.log('[Controller] 处理视频分析请求');

    const response = await aiService.analyzeVideo(videoUrl, question, options);

    res.status(200).json({
      success: true,
      data: {
        analysis: response,
      },
    });
  } catch (error) {
    console.error('[Controller] 视频分析失败:', error);
    next(error);
  }
}

/**
 * 音频分析
 * POST /ai/audio
 * Body: { audioUrl: string, question: string, options?: Object }
 */
async function analyzeAudio(req, res, next) {
  try {
    const { audioUrl, question, options = {} } = req.body;

    if (!audioUrl || !question) {
      return res.status(400).json({
        success: false,
        error: 'audioUrl 和 question 为必填项',
      });
    }

    console.log('[Controller] 处理音频分析请求');

    const response = await aiService.analyzeAudio(audioUrl, question, options);

    res.status(200).json({
      success: true,
      data: {
        analysis: response,
      },
    });
  } catch (error) {
    console.error('[Controller] 音频分析失败:', error);
    next(error);
  }
}

module.exports = {
  simpleChat,
  multimodalChat,
  analyzeImage,
  analyzeVideo,
  analyzeAudio,
};
