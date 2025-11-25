// src/config/index.js
// ==========================================
// 微服务统一配置管理
// ==========================================
require('dotenv').config();

// 读取CORS源地址字符串，并按逗号分割成数组
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];

module.exports = {
    // 服务端口（HTTP 和 WebSocket 共用同一端口）
    PORT: process.env.PORT || 3000,
    GRPC_PORT: process.env.GRPC_PORT || 50051,
    
    // JWT配置
    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    
    // CORS跨域配置
    cors: {
        allowAll: process.env.CORS_ALLOW_ALL === 'true',  // 是否允许所有源
        allowedOrigins: allowedOrigins.map(origin => origin.trim()), // 白名单
    },
    
    // 数据库配置
    db: {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_DATABASE || 'service_db',
        password: process.env.DB_PASSWORD || '123456',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
    },
    
    // Redis配置
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    
    // RabbitMQ配置
    mq: {
        url: process.env.MQ_URL || 'amqp://localhost',
        exchangeName: process.env.MQ_EXCHANGE_NAME || 'exchange.notifications',
    },
    
    // WebSocket配置
    websocket: {
        path: process.env.WS_PATH || '/ws',
        heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL, 10) || 30000,
    },
};
