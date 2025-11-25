// src/middleware/requestLogger.middleware.js
// 彩色、美观的请求日志中间件

// ANSI 颜色码
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    gray: '\x1b[90m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};

// 颜色工具函数
const color = {
    gray: (text) => `${colors.gray}${text}${colors.reset}`,
    red: (text) => `${colors.red}${text}${colors.reset}`,
    redBold: (text) => `${colors.bold}${colors.red}${text}${colors.reset}`,
    green: (text) => `${colors.green}${text}${colors.reset}`,
    greenBold: (text) => `${colors.bold}${colors.green}${text}${colors.reset}`,
    yellow: (text) => `${colors.yellow}${text}${colors.reset}`,
    yellowBold: (text) => `${colors.bold}${colors.yellow}${text}${colors.reset}`,
    blue: (text) => `${colors.blue}${text}${colors.reset}`,
    magenta: (text) => `${colors.magenta}${text}${colors.reset}`,
    cyan: (text) => `${colors.cyan}${text}${colors.reset}`,
    white: (text) => `${colors.white}${text}${colors.reset}`,
};

/**
 * 根据 HTTP 方法返回对应的颜色
 */
function getMethodColor(method) {
    const methodColors = {
        GET: color.green,
        POST: color.blue,
        PUT: color.yellow,
        DELETE: color.red,
        PATCH: color.magenta,
        OPTIONS: color.gray,
        HEAD: color.gray,
    };
    return methodColors[method] || color.white;
}

/**
 * 根据状态码返回对应的颜色和符号
 */
function getStatusDisplay(status) {
    if (status >= 500) {
        return color.redBold(`✗ ${status}`);
    } else if (status >= 400) {
        return color.yellowBold(`⚠ ${status}`);
    } else if (status >= 300) {
        return color.cyan(`↗ ${status}`);
    } else if (status >= 200) {
        return color.greenBold(`✓ ${status}`);
    }
    return color.gray(status);
}

/**
 * 格式化响应时间
 */
function formatDuration(ms) {
    if (ms < 100) {
        return color.green(`${ms}ms`);
    } else if (ms < 500) {
        return color.yellow(`${ms}ms`);
    } else if (ms < 1000) {
        return color.red(`${ms}ms`);
    } else {
        return color.redBold(`${(ms / 1000).toFixed(2)}s`);
    }
}

/**
 * 格式化 URL，高亮路径参数
 */
function formatUrl(url) {
    // 如果 URL 太长，截断
    if (url.length > 80) {
        return color.cyan(url.substring(0, 77) + '...');
    }
    return color.cyan(url);
}

/**
 * 获取时间戳
 */
function getTimestamp() {
    const now = new Date();
    const time = now.toLocaleTimeString('zh-CN', { hour12: false });
    return color.gray(`[${time}]`);
}

/**
 * 美化的请求日志中间件
 */
function requestLogger(req, res, next) {
    const startTime = Date.now();
    
    // 在生产环境跳过健康检查日志
    if (process.env.NODE_ENV === 'production' && req.path === '/health') {
        return next();
    }
    
    // 拦截 res.send 和 res.json 来获取响应信息
    const originalSend = res.send;
    const originalJson = res.json;
    
    const logResponse = () => {
        const duration = Date.now() - startTime;
        const method = getMethodColor(req.method)(req.method.padEnd(7));
        const status = getStatusDisplay(res.statusCode);
        const time = formatDuration(duration);
        const url = formatUrl(req.originalUrl || req.url);
        const timestamp = getTimestamp();
        
        // 基础日志
        console.log(`${timestamp} ${method} ${status} ${url} ${time}`);
        
        // 如果有请求体且不是 GET 请求，显示请求体（开发环境）
        if (process.env.NODE_ENV !== 'production' && req.body && Object.keys(req.body).length > 0 && req.method !== 'GET') {
            const bodyStr = JSON.stringify(req.body);
            if (bodyStr.length > 200) {
                console.log(color.gray(`  └─ Body: ${bodyStr.substring(0, 197)}...`));
            } else {
                console.log(color.gray(`  └─ Body: ${bodyStr}`));
            }
        }
        
        // 如果是错误响应，显示额外信息
        if (res.statusCode >= 400) {
            console.log(color.red(`  └─ Error: ${req.method} ${req.originalUrl || req.url}`));
        }
    };
    
    // 重写响应方法
    res.send = function(data) {
        logResponse();
        res.send = originalSend;
        return originalSend.call(this, data);
    };
    
    res.json = function(data) {
        logResponse();
        res.json = originalJson;
        return originalJson.call(this, data);
    };
    
    // 监听响应完成事件（防止某些情况下日志丢失）
    res.on('finish', () => {
        if (res.send === originalSend && res.json === originalJson) {
            // 如果没有被重写的方法调用，直接记录日志
            logResponse();
        }
    });
    
    next();
}

module.exports = requestLogger;