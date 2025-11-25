// src/config/index.js
require('dotenv').config();
// 读取CORS源地址字符串，并按逗号分割成数组
// ?.split(',') an ?.trim() ensures that if the env var is not set, the app doesn't crash.
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
module.exports = {
    // 服务端口（HTTP和WebSocket共用）
    PORT: process.env.PORT || 3006,
    GRPC_PORT: process.env.GRPC_PORT || 50052,
    
    // JWT配置
    JWT_SECRET: process.env.JWT_SECRET || 'elder_medical_zkp_secret_key_2024',
    
    // 外部服务 gRPC 地址
    grpc: {
        userService: process.env.USER_SERVICE_GRPC_URL || 'localhost:50051',
    },
    
    // CORS跨域配置
    cors: {
        allowAll: process.env.CORS_ALLOW_ALL === 'true', // 是否允许任意跨域
        allowedOrigins: allowedOrigins.map(origin => origin.trim()), // 去除每个地址可能存在的多余空格
    },
    db: {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_DATABASE || 'bs_secure_exchange_db',
        password: process.env.DB_PASSWORD || 'postgres',
        port: parseInt(process.env.DB_PORT, 10) || 5400,
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    mq: {
        url: process.env.MQ_URL || 'amqp://localhost',
        exchangeName: process.env.MQ_EXCHANGE_NAME || 'exchange.notifications',
    },
    
    // WebSocket配置
    websocket: {
        path: process.env.WS_PATH || '/ws',
        heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL, 10) || 30000,
    },
    
    // 会话配置
    session: {
        defaultExpiresIn: parseInt(process.env.SESSION_EXPIRES_IN, 10) || 600, // 默认10分钟
    },
    
    // 消息配置
    message: {
        defaultExpiresIn: parseInt(process.env.MESSAGE_EXPIRES_IN, 10) || 86400, // 默认24小时
    },
};