// src/services/ipfs.service.js
// =======================================================
// IPFS 服务 - 使用 Pinata SDK
// 负责文件上传到 IPFS 并返回 CID
// =======================================================

const { PinataSDK } = require('pinata');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// 初始化 Pinata SDK
let pinata = null;

/**
 * 初始化 Pinata SDK
 * @returns {PinataSDK}
 */
function initPinata() {
  if (pinata) {
    return pinata;
  }

  try {
    if (!config.ipfs.jwt || !config.ipfs.gateway) {
      throw new Error('Missing IPFS configuration: jwt or gateway');
    }

    pinata = new PinataSDK({
      pinataJwt: config.ipfs.jwt,
      pinataGateway: config.ipfs.gateway
    });

    console.log('[IPFS] Pinata SDK 初始化成功');
    console.log(`[IPFS] Gateway: ${config.ipfs.gateway}`);

    return pinata;
  } catch (error) {
    console.error('[IPFS] Pinata SDK 初始化失败:', error.message);
    throw error;
  }
}

/**
 * 上传文件到 IPFS
 * @param {Buffer|string} fileContent - 文件内容（Buffer 或文件路径）
 * @param {string} fileName - 文件名
 * @param {Object} metadata - 元数据（可选）
 * @returns {Promise<{cid: string, url: string, id: string, size: number}>}
 */
async function uploadFileToIPFS(fileContent, fileName, metadata = {}) {
  try {
    console.log(`[IPFS] 准备上传文件: ${fileName}`);

    const sdk = initPinata();

    // 处理文件内容
    let fileBuffer;
    if (typeof fileContent === 'string') {
      // 如果是文件路径，读取文件
      if (fs.existsSync(fileContent)) {
        fileBuffer = fs.readFileSync(fileContent);
      } else {
        // 否则作为文本内容
        fileBuffer = Buffer.from(fileContent);
      }
    } else if (Buffer.isBuffer(fileContent)) {
      fileBuffer = fileContent;
    } else {
      throw new Error('Invalid file content type: must be Buffer or file path string');
    }

    // 创建 File 对象（Pinata SDK 需要）
    const file = new File([fileBuffer], fileName, {
      type: 'application/octet-stream'
    });

    console.log(`[IPFS] 发送上传请求...`);

    // 上传文件
    const upload = await sdk.upload.public.file(file);

    // 构建 URL（gateway 可能已包含 https://）
    let gatewayUrl = config.ipfs.gateway;
    if (!gatewayUrl.startsWith('http')) {
      gatewayUrl = `https://${gatewayUrl}`;
    }

    const result = {
      cid: upload.cid,
      url: `${gatewayUrl}/ipfs/${upload.cid}`,
      id: upload.id,
      size: upload.size,
      name: upload.name,
      mimeType: upload.mime_type,
      timestamp: upload.created_at
    };

    console.log(`[IPFS] 文件上传成功`);
    console.log(`[IPFS] CID: ${result.cid}`);
    console.log(`[IPFS] URL: ${result.url}`);
    console.log(`[IPFS] 大小: ${result.size} bytes`);

    return result;
  } catch (error) {
    console.error('[IPFS] 上传失败:', error.message);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}

/**
 * 上传 JSON 数据到 IPFS
 * @param {Object} jsonData - JSON 数据
 * @param {string} fileName - 文件名（不包含扩展名）
 * @param {Object} metadata - 元数据（可选）
 * @returns {Promise<{cid: string, url: string, id: string}>}
 */
async function uploadJSONToIPFS(jsonData, fileName, metadata = {}) {
  try {
    console.log(`[IPFS] 准备上传 JSON: ${fileName}`);

    const jsonContent = JSON.stringify(jsonData, null, 2);
    const fileNameWithExt = `${fileName}.json`;

    const result = await uploadFileToIPFS(
      Buffer.from(jsonContent),
      fileNameWithExt,
      { ...metadata, type: 'json' }
    );

    console.log(`[IPFS] JSON 上传成功`);
    return result;
  } catch (error) {
    console.error('[IPFS] JSON 上传失败:', error.message);
    throw error;
  }
}

/**
 * 上传文本内容到 IPFS
 * @param {string} textContent - 文本内容
 * @param {string} fileName - 文件名
 * @param {Object} metadata - 元数据（可选）
 * @returns {Promise<{cid: string, url: string, id: string}>}
 */
async function uploadTextToIPFS(textContent, fileName, metadata = {}) {
  try {
    console.log(`[IPFS] 准备上传文本: ${fileName}`);

    const result = await uploadFileToIPFS(
      Buffer.from(textContent),
      fileName,
      { ...metadata, type: 'text' }
    );

    console.log(`[IPFS] 文本上传成功`);
    return result;
  } catch (error) {
    console.error('[IPFS] 文本上传失败:', error.message);
    throw error;
  }
}

/**
 * 从 IPFS 检索文件内容
 * @param {string} cid - IPFS CID
 * @returns {Promise<Buffer>}
 */
async function retrieveFileFromIPFS(cid) {
  try {
    console.log(`[IPFS] 准备检索文件: ${cid}`);

    const sdk = initPinata();

    // 使用网关检索文件
    const data = await sdk.gateways.public.get(cid);

    console.log(`[IPFS] 文件检索成功`);
    return data;
  } catch (error) {
    console.error('[IPFS] 检索失败:', error.message);
    throw new Error(`IPFS retrieval failed: ${error.message}`);
  }
}

/**
 * 获取 IPFS 文件的网关 URL
 * @param {string} cid - IPFS CID
 * @returns {Promise<string>}
 */
async function getIPFSUrl(cid) {
  try {
    console.log(`[IPFS] 生成网关 URL: ${cid}`);

    const sdk = initPinata();

    // 转换为网关 URL
    const url = await sdk.gateways.convert(cid);

    console.log(`[IPFS] URL: ${url}`);
    return url;
  } catch (error) {
    console.error('[IPFS] URL 生成失败:', error.message);
    throw new Error(`IPFS URL generation failed: ${error.message}`);
  }
}

/**
 * 验证 IPFS 配置
 * @returns {Promise<boolean>}
 */
async function validateIPFSConfig() {
  try {
    console.log('[IPFS] 验证配置...');

    if (!config.ipfs.jwt || !config.ipfs.gateway) {
      throw new Error('Missing IPFS credentials in config');
    }

    // 尝试初始化 SDK
    const sdk = initPinata();

    console.log('[IPFS] 配置验证成功');
    return true;
  } catch (error) {
    console.error('[IPFS] 配置验证失败:', error.message);
    return false;
  }
}

module.exports = {
  uploadFileToIPFS,
  uploadJSONToIPFS,
  uploadTextToIPFS,
  retrieveFileFromIPFS,
  getIPFSUrl,
  validateIPFSConfig,
  initPinata
};
