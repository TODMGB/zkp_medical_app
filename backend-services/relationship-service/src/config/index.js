// src/config/index.js
// =======================================================
// 服务配置文件
// 从环境变量加载并导出服务配置
// =======================================================
require('dotenv').config();

// 读取CORS允许的源地址字符串，并按逗号分割成数组
// 使用可选链操作符 ?. 确保在环境变量未设置时不会崩溃
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];

module.exports = {
    // 服务端口配置
    PORT: process.env.PORT || 3000,                    // HTTP 服务端口
    GRPC_PORT: process.env.GRPC_PORT || 50051,        // gRPC 服务端口
    
    // CORS 配置
    cors: {
        allowAll: process.env.CORS_ALLOW_ALL === 'true',             // 是否允许任意跨域
        allowedOrigins: allowedOrigins.map(origin => origin.trim()), // 去除每个地址的冗余空格
    },
    
    // PostgreSQL 数据库配置
    db: {
        user: process.env.DB_USER,                    // 数据库用户名
        host: process.env.DB_HOST,                    // 数据库主机地址
        database: process.env.DB_DATABASE,            // 数据库名称
        password: process.env.DB_PASSWORD,            // 数据库密码
        port: parseInt(process.env.DB_PORT, 10),      // 数据库端口
    },
    
    // Redis 配置
    redis: {
        url: process.env.REDIS_URL,                   // Redis 连接URL
    },
    
    // 消息队列配置
    mq: {
        url: process.env.MQ_URL,                      // 消息队列URL
        exchangeName: process.env.MQ_EXCHANGE_NAME || 'exchange.notifications', // 统一使用通知服务交换机
    },
};