// src/config/index.js
require('dotenv').config();
// 读取CORS源地址字符串，并按逗号分割成数组
// ?.split(',') an ?.trim() ensures that if the env var is not set, the app doesn't crash.
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
module.exports = {
    PORT: process.env.PORT || 3000,
    GRPC_PORT: process.env.GRPC_PORT || 50051,
    JWT_SECRET: process.env.JWT_SECRET,
    cors: {
        allowAll: process.env.CORS_ALLOW_ALL === 'true',             // 是否允许任意跨域
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
    mq: {
        url: process.env.MQ_URL,
        exchangeName: process.env.MQ_EXCHANGE_NAME || 'exchange.notifications',
    },
    services: {
        USER_INFO_SERVICE_URL: process.env.USER_INFO_SERVICE_URL,
    },
    RELATIONSHIP_RPC_SERVER: process.env.RELATIONSHIP_RPC_SERVER || 'localhost:50053',
};