// src/config/index.js
require('dotenv').config();
// 读取CORS源地址字符串，并按逗号分割成数组
// ?.split(',') an ?.trim() ensures that if the env var is not set, the app doesn't crash.
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
module.exports = {
    PORT: process.env.PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET,
    cors: {
        allowAll: process.env.CORS_ALLOW_ALL === 'true', // 是否允许任意跨域
        allowedOrigins: allowedOrigins.map(origin => origin.trim()), // 去除每个地址可能存在的多余空格
    },
    db: {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT, 10),
    },
    redis: {
        url: process.env.REDIS_URL,
    },
    services: {
        user: {
            baseUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
        },
        relationship: {
            baseUrl: process.env.RELATIONSHIP_SERVICE_URL || 'http://localhost:3002',
        },
        userinfo: {
            baseUrl: process.env.USERINFO_SERVICE_URL || 'http://localhost:5000',
        },
        chain: {
            baseUrl: process.env.CHAIN_SERVICE_URL || 'http://localhost:4337',
        },
        migration: {
            baseUrl: process.env.MIGRATION_SERVICE_URL || 'http://localhost:3003',
        },
        notification: {
            baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
            wsUrl: process.env.NOTIFICATION_WS_URL || 'ws://localhost:3004',
        },
        zkp: {
            baseUrl: process.env.ZKP_SERVICE_URL || 'http://localhost:3005',
        },
        secureExchange: {
            baseUrl: process.env.SECURE_EXCHANGE_SERVICE_URL || 'http://localhost:3006',
            wsUrl: process.env.SECURE_EXCHANGE_WS_URL || 'ws://localhost:3006',
        },
        medication: {
            baseUrl: process.env.MEDICATION_SERVICE_URL || 'http://localhost:3007',
        },
    },
    // WebSocket代理配置
    websocket: {
        proxies: [
            {
                name: 'Notification',
                path: '/ws/notification',
                targetUrl: process.env.NOTIFICATION_WS_URL || 'ws://localhost:3004',
                requireAuth: true,  // 需要JWT认证
            },
            {
                name: 'SecureExchange',
                path: '/ws/secure-exchange',
                targetUrl: process.env.SECURE_EXCHANGE_WS_URL || 'ws://localhost:3006',
                requireAuth: true,  // 需要JWT认证
            },
            // 未来可以添加更多WebSocket代理
        ]
    },
};