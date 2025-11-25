// src/utils/proxy.util.js
// 统一的代理工具函数

const axios = require('axios');

/**
 * 创建一个标准的代理处理函数
 * @param {string} serviceName - 服务名称（用于日志）
 * @param {string} targetBaseUrl - 目标服务的基础 URL
 * @param {string} pathPrefix - 路径前缀（可选）
 * @returns {Function} Express 中间件函数
 */
function createProxyHandler(serviceName, targetBaseUrl, pathPrefix = '') {
    return async (req, res) => {
        const startTime = Date.now();
        const targetPath = pathPrefix + req.url;
        const targetUrl = `${targetBaseUrl}${targetPath}`;
        
        try {
            console.log(`[${serviceName} Proxy] ${req.method} ${req.originalUrl}`);
            console.log(`[${serviceName} Proxy] 转发到: ${targetUrl}`);
            
            if (req.body && Object.keys(req.body).length > 0) {
                console.log(`[${serviceName} Proxy] 请求体:`, JSON.stringify(req.body).substring(0, 200));
            }
            
            // 构建 axios 请求配置
            // 注意：targetUrl 已经包含完整路径和查询参数（来自 req.url）
            const axiosConfig = {
                method: req.method,
                url: targetUrl,
                headers: {
                    ...req.headers,
                    host: undefined, // 移除原始 host 头
                    'content-length': undefined, // 让 axios 自动计算
                },
                timeout: 60000, // 60秒超时
                validateStatus: () => true, // 接受所有状态码
            };
            
            // 不需要单独添加 params，因为 req.url 已经包含了查询字符串
            
            // 添加请求体
            if (req.body && Object.keys(req.body).length > 0) {
                axiosConfig.data = req.body;
                axiosConfig.headers['Content-Type'] = 'application/json';
            }
            
            // 转发请求
            const response = await axios(axiosConfig);
            const duration = Date.now() - startTime;
            
            console.log(`[${serviceName} Proxy] 响应状态: ${response.status} (${duration}ms)`);
            
            // 转发响应头（可选）
            if (response.headers['content-type']) {
                res.setHeader('Content-Type', response.headers['content-type']);
            }
            
            // 返回响应
            res.status(response.status).json(response.data);
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[${serviceName} Proxy] 错误 (${duration}ms):`, error.message);
            
            if (error.response) {
                // 目标服务返回了错误响应
                console.error(`[${serviceName} Proxy] 目标服务错误:`, error.response.status);
                res.status(error.response.status).json(error.response.data);
            } else if (error.code === 'ECONNREFUSED') {
                // 无法连接到目标服务
                console.error(`[${serviceName} Proxy] 无法连接到目标服务: ${targetBaseUrl}`);
                res.status(503).json({
                    message: `${serviceName} service is unavailable`,
                    error: 'Connection refused',
                    target: targetBaseUrl
                });
            } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                // 请求超时
                console.error(`[${serviceName} Proxy] 请求超时`);
                res.status(504).json({
                    message: `${serviceName} service timeout`,
                    error: 'Request timeout after 60 seconds'
                });
            } else {
                // 其他错误
                console.error(`[${serviceName} Proxy] 未知错误:`, error.code, error.message);
                res.status(500).json({
                    message: 'Proxy error',
                    error: error.message,
                    code: error.code
                });
            }
        }
    };
}

module.exports = {
    createProxyHandler
};
