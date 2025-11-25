// src/routes/ai.routes.js
// =======================================================
// AI 路由
// =======================================================

const { Router } = require('express');
const aiController = require('../controllers/ai.controller');

const router = Router();

/**
 * POST /ai/chat
 * 简单对话（仅文本）
 * 
 * 请求体:
 * {
 *   "message": "你好，请介绍一下自己",
 *   "history": [
 *     { "role": "user", "content": "你是谁？" },
 *     { "role": "assistant", "content": "我是一个 AI 助手..." }
 *   ]
 * }
 * 
 * 响应:
 * {
 *   "success": true,
 *   "data": {
 *     "message": "我是一个由硅基流动提供的 AI 助手..."
 *   }
 * }
 */
router.post('/chat', aiController.simpleChat);

/**
 * POST /ai/multimodal
 * 多模态对话（支持文本、图片、视频、音频）
 * 
 * 请求体:
 * {
 *   "content": [
 *     {
 *       "type": "image_url",
 *       "image_url": {
 *         "url": "https://example.com/image.jpg",
 *         "detail": "high"
 *       }
 *     },
 *     {
 *       "type": "text",
 *       "text": "这张图片中有什么？"
 *     }
 *   ],
 *   "history": [],
 *   "options": {
 *     "temperature": 0.7,
 *     "max_tokens": 4096
 *   }
 * }
 * 
 * 响应:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "...",
 *     "model": "Qwen/Qwen3-VL-235B-A22B-Thinking",
 *     "created": 1234567890,
 *     "usage": {
 *       "prompt_tokens": 100,
 *       "completion_tokens": 50,
 *       "total_tokens": 150
 *     },
 *     "choices": [
 *       {
 *         "index": 0,
 *         "message": {
 *           "role": "assistant",
 *           "content": "这张图片显示..."
 *         },
 *         "finish_reason": "stop"
 *       }
 *     ]
 *   }
 * }
 */
router.post('/multimodal', aiController.multimodalChat);

/**
 * POST /ai/image
 * 图片分析
 * 
 * 请求体:
 * {
 *   "imageUrl": "https://example.com/image.jpg 或 data:image/jpeg;base64,...",
 *   "question": "请分析这张图片的内容",
 *   "options": {
 *     "detail": "high"
 *   }
 * }
 * 
 * 响应:
 * {
 *   "success": true,
 *   "data": {
 *     "analysis": "这张图片显示了..."
 *   }
 * }
 */
router.post('/image', aiController.analyzeImage);

/**
 * POST /ai/video
 * 视频分析
 * 
 * 请求体:
 * {
 *   "videoUrl": "https://example.com/video.mp4 或 data:video/mp4;base64,...",
 *   "question": "请总结这个视频的主要内容",
 *   "options": {
 *     "detail": "high",
 *     "max_frames": 16,
 *     "fps": 1
 *   }
 * }
 * 
 * 响应:
 * {
 *   "success": true,
 *   "data": {
 *     "analysis": "这个视频主要讲述了..."
 *   }
 * }
 */
router.post('/video', aiController.analyzeVideo);

/**
 * POST /ai/audio
 * 音频分析
 * 
 * 请求体:
 * {
 *   "audioUrl": "https://example.com/audio.mp3 或 data:audio/mp3;base64,...",
 *   "question": "请转录这个音频的内容",
 *   "options": {}
 * }
 * 
 * 响应:
 * {
 *   "success": true,
 *   "data": {
 *     "analysis": "音频内容转录为..."
 *   }
 * }
 */
router.post('/audio', aiController.analyzeAudio);

module.exports = router;
