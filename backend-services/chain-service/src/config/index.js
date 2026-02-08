// src/config/index.js
// =======================================================
// Chain 服务配置文件
// 从环境变量加载并导出服务配置
// =======================================================
require('dotenv').config();

// 读取 CORS 允许的源地址字符串，并按逗号分割成数组
// 使用可选链操作符 ?. 确保在环境变量未设置时不会崩溃
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];

const mqExchangeNameEnv = process.env.MQ_EXCHANGE_NAME;
const mqExchangeName = (mqExchangeNameEnv && mqExchangeNameEnv.trim() === 'app_events')
    ? 'exchange.notifications'
    : (mqExchangeNameEnv || 'exchange.notifications');

module.exports = {
    // 服务端口配置
    PORT: process.env.PORT || 3000,                    // HTTP 服务端口
    GRPC_PORT: process.env.GRPC_PORT || 50051,        // gRPC 服务端口
    
    // CORS 配置
    cors: {
        allowAll: process.env.CORS_ALLOW_ALL === 'true',           // 是否允许任意跨域
        allowedOrigins: allowedOrigins.map(origin => origin.trim()), // 允许的源地址列表
    },
    // PostgreSQL 数据库配置
    db: {
        user: process.env.DB_USER,                    // 数据库用户名
        host: process.env.DB_HOST,                    // 数据库主机
        database: process.env.DB_DATABASE,            // 数据库名称
        password: process.env.DB_PASSWORD,            // 数据库密码
        port: parseInt(process.env.DB_PORT, 10),      // 数据库端口
    },
    // Redis 配置
    redis: {
        url: process.env.REDIS_URL,                   // Redis 连接 URL
    },
    // 消息队列配置
    mq: {
        url: process.env.MQ_URL,                      // 消息队列 URL
        exchangeName: mqExchangeName, // 交换机名称
    },
    // 以太坊区块链配置
    ethconfig: {
        privateKey: process.env.PRIVATE_KEY,          // 服务器私钥（用于签名交易）
        ethNodeUrl: process.env.ETH_NODE_URL,         // 以太坊 RPC 节点 URL
        chainId: parseInt(process.env.CHAIN_ID, 10) || 1, // 链 ID
    },
    // IPFS/Pinata 配置
    ipfs: {
        apiKey: process.env.IPFS_API_KEY,             // Pinata API Key
        apiSecret: process.env.IPFS_API_SECRET,       // Pinata API Secret
        jwt: process.env.IPFS_JWT,                    // Pinata JWT Token
        gateway: process.env.IPFS_GATEWAY || 'https://tomato-legislative-coyote-504.mypinata.cloud', // Pinata Gateway
    },
    // JWT 配置
    JWT_SECRET: process.env.JWT_SECRET,               // 用于验证来自 Gateway/用户服务的 Token
    // User Service gRPC 配置
    userService: {
        grpcHost: process.env.USER_SERVICE_GRPC_HOST || 'localhost',
        grpcPort: parseInt(process.env.USER_SERVICE_GRPC_PORT, 10) || 50051,
    },
};