#!/usr/bin/env node
/**
 * clear-cache.js
 * 清除 API Gateway 的 Redis 缓存
 */

const redis = require('redis');

async function clearCache() {
    const client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    try {
        console.log('🔌 连接 Redis...');
        await client.connect();
        
        console.log('🗑️  清除权限缓存...');
        await client.del('gateway:permissions');
        
        console.log('✅ 缓存已清除');
        console.log('💡 下次请求时将重新从数据库加载权限配置');
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
        process.exit(1);
    } finally {
        await client.quit();
    }
}

clearCache();

