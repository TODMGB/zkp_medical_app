// src/services/ai.service.js
// =======================================================
// AI 服务 - 集成硅基流动 API
// 支持多模态对话（文本、图片、视频、音频）
// =======================================================

const axios = require('axios');
const config = require('../config');

/**
 * 初始化硅基流动 API 客户端
 */
function createSiliconFlowClient() {
  return axios.create({
    baseURL: config.siliconflow.baseUrl,
    headers: {
      'Authorization': `Bearer ${config.siliconflow.apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 120000, // 120秒超时
  });
}

/**
 * 对话接口
 * 支持多模态输入（文本、图片、视频、音频）
 * @param {Array} messages - 消息数组
 * @param {Object} options - 可选参数
 * @returns {Promise<Object>}
 */
async function chat(messages, options = {}) {
  try {
    console.log('[AI Service] 准备发送对话请求...');
    console.log(`[AI Service] 模型: ${config.siliconflow.model}`);
    console.log(`[AI Service] 消息数: ${messages.length}`);

    const client = createSiliconFlowClient();

    // 构建请求体
    const requestBody = {
      model: config.siliconflow.model,
      messages: messages,
      temperature: options.temperature || 0.7,
      top_p: options.top_p || 0.9,
      max_tokens: options.max_tokens || 4096,
      stream: options.stream || false,
    };

    // 如果是推理模型，添加思考预算
    if (options.thinking_budget) {
      requestBody.thinking = {
        type: 'enabled',
        budget_tokens: options.thinking_budget,
      };
    }

    console.log('[AI Service] 发送请求到硅基流动 API...');

    const response = await client.post('/chat/completions', requestBody);

    console.log('[AI Service] 收到响应');

    // 提取响应内容
    const result = {
      id: response.data.id,
      model: response.data.model,
      created: response.data.created,
      usage: response.data.usage,
      choices: response.data.choices.map(choice => ({
        index: choice.index,
        message: choice.message,
        finish_reason: choice.finish_reason,
      })),
    };

    console.log(`[AI Service] 对话完成，使用 token: ${result.usage.total_tokens}`);

    return result;
  } catch (error) {
    console.error('[AI Service] 对话请求失败:', error.message);

    // 处理硅基流动 API 错误
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      console.error(`[AI Service] API 错误 (${status}):`, data);

      throw {
        status,
        message: data.error?.message || error.message,
        code: data.error?.code || 'API_ERROR',
      };
    }

    throw {
      status: 500,
      message: error.message,
      code: 'REQUEST_ERROR',
    };
  }
}

/**
 * 简单对话（仅文本）
 * @param {string} userMessage - 用户消息
 * @param {Array} history - 对话历史（可选）
 * @param {Object} options - 可选参数
 * @returns {Promise<string>}
 */
async function simpleChat(userMessage, history = [], options = {}) {
  try {
    // 构建消息数组
    const messages = [
      ...history,
      {
        role: 'user',
        content: userMessage,
      },
    ];

    const result = await chat(messages, options);

    // 提取助手的回复
    const assistantMessage = result.choices[0]?.message?.content;

    if (!assistantMessage) {
      throw {
        status: 500,
        message: '无法获取 AI 回复',
        code: 'NO_RESPONSE',
      };
    }

    return assistantMessage;
  } catch (error) {
    console.error('[AI Service] 简单对话失败:', error);
    throw error;
  }
}

/**
 * 多模态对话（支持图片、视频、音频）
 * @param {Array} content - 内容数组（包含文本和媒体）
 * @param {Array} history - 对话历史（可选）
 * @param {Object} options - 可选参数
 * @returns {Promise<Object>}
 */
async function multimodalChat(content, history = [], options = {}) {
  try {
    console.log('[AI Service] 准备多模态对话...');

    // 验证内容格式
    if (!Array.isArray(content)) {
      throw {
        status: 400,
        message: 'content 必须是数组',
        code: 'INVALID_FORMAT',
      };
    }

    // 构建消息数组
    const messages = [
      ...history,
      {
        role: 'user',
        content: content,
      },
    ];

    const result = await chat(messages, options);

    return result;
  } catch (error) {
    console.error('[AI Service] 多模态对话失败:', error);
    throw error;
  }
}

/**
 * 图片分析
 * @param {string} imageUrl - 图片 URL 或 base64 数据
 * @param {string} question - 问题
 * @param {Object} options - 可选参数
 * @returns {Promise<string>}
 */
async function analyzeImage(imageUrl, question, options = {}) {
  try {
    console.log('[AI Service] 准备图片分析...');

    const content = [
      {
        type: 'image_url',
        image_url: {
          url: imageUrl,
          detail: options.detail || 'high',
        },
      },
      {
        type: 'text',
        text: question,
      },
    ];

    const result = await multimodalChat(content, [], options);
    const response = result.choices[0]?.message?.content;

    console.log('[AI Service] 图片分析完成');

    return response;
  } catch (error) {
    console.error('[AI Service] 图片分析失败:', error);
    throw error;
  }
}

/**
 * 视频分析
 * @param {string} videoUrl - 视频 URL 或 base64 数据
 * @param {string} question - 问题
 * @param {Object} options - 可选参数
 * @returns {Promise<string>}
 */
async function analyzeVideo(videoUrl, question, options = {}) {
  try {
    console.log('[AI Service] 准备视频分析...');

    const content = [
      {
        type: 'video_url',
        video_url: {
          url: videoUrl,
          detail: options.detail || 'high',
          max_frames: options.max_frames || 16,
          fps: options.fps || 1,
        },
      },
      {
        type: 'text',
        text: question,
      },
    ];

    const result = await multimodalChat(content, [], options);
    const response = result.choices[0]?.message?.content;

    console.log('[AI Service] 视频分析完成');

    return response;
  } catch (error) {
    console.error('[AI Service] 视频分析失败:', error);
    throw error;
  }
}

/**
 * 音频分析
 * @param {string} audioUrl - 音频 URL 或 base64 数据
 * @param {string} question - 问题
 * @param {Object} options - 可选参数
 * @returns {Promise<string>}
 */
async function analyzeAudio(audioUrl, question, options = {}) {
  try {
    console.log('[AI Service] 准备音频分析...');

    const content = [
      {
        type: 'audio_url',
        audio_url: {
          url: audioUrl,
        },
      },
      {
        type: 'text',
        text: question,
      },
    ];

    const result = await multimodalChat(content, [], options);
    const response = result.choices[0]?.message?.content;

    console.log('[AI Service] 音频分析完成');

    return response;
  } catch (error) {
    console.error('[AI Service] 音频分析失败:', error);
    throw error;
  }
}

module.exports = {
  chat,
  simpleChat,
  multimodalChat,
  analyzeImage,
  analyzeVideo,
  analyzeAudio,
};
