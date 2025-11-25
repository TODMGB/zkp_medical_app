/**
 * user.client.js
 * User Service RPC 客户端
 * 用于获取用户的加密公钥
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const config = require('../../config');

let userServiceStub = null;

/**
 * 初始化 user-service RPC 客户端
 */
async function initializeClient() {
    try {
        if (userServiceStub) {
            return userServiceStub;
        }

        // 加载 proto 文件（从项目根目录）
        const protoPath = path.join(__dirname, '../../../../proto/user_auth.proto');
        const packageDefinition = protoLoader.loadSync(protoPath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });

        const userAuthProto = grpc.loadPackageDefinition(packageDefinition);
        const UserAuthService = userAuthProto.user_auth?.UserAuthService;

        if (!UserAuthService) {
            throw new Error('Cannot load UserAuthService from proto');
        }

        // 创建客户端
        const address = config.rpc.userService || 'localhost:50051';
        userServiceStub = new UserAuthService(
            address,
            grpc.credentials.createInsecure()
        );

        console.log(`✅ User Service RPC 客户端已初始化: ${address}`);
        return userServiceStub;
    } catch (error) {
        console.error('❌ 初始化 User Service RPC 客户端失败:', error.message);
        throw error;
    }
}

/**
 * 获取用户的加密公钥
 * @param {string} smartAccount - 用户的智能合约地址
 * @returns {Promise<{smart_account: string, encryption_public_key: string, encryption_key_updated_at: string}>}
 */
async function getUserPublicKey(smartAccount) {
    try {
        const stub = await initializeClient();

        return new Promise((resolve, reject) => {
            stub.GetUserPublicKey(
                { smart_account: smartAccount },
                (error, response) => {
                    if (error) {
                        if (error.code === grpc.status.NOT_FOUND) {
                            reject(new Error(`用户 ${smartAccount} 未注册或未设置加密公钥`));
                        } else {
                            reject(new Error(`获取用户公钥失败: ${error.details || error.message}`));
                        }
                    } else {
                        console.log(`✅ 成功获取用户 ${smartAccount} 的加密公钥`);
                        resolve({
                            smart_account: response.smart_account,
                            encryption_public_key: response.encryption_public_key,
                            encryption_key_updated_at: response.encryption_key_updated_at
                        });
                    }
                }
            );
        });
    } catch (error) {
        console.error('获取用户公钥失败:', error.message);
        throw error;
    }
}

/**
 * 批量获取用户公钥（用于分享计划时）
 * @param {string[]} smartAccounts - 用户智能合约地址数组
 * @returns {Promise<Map<string, string>>} 地址到公钥的映射
 */
async function batchGetUserPublicKeys(smartAccounts) {
    const publicKeys = new Map();
    
    for (const address of smartAccounts) {
        try {
            const result = await getUserPublicKey(address);
            publicKeys.set(address, result.encryption_public_key);
        } catch (error) {
            console.warn(`⚠️ 无法获取用户 ${address} 的公钥: ${error.message}`);
            // 继续处理其他用户，不中断整个流程
        }
    }
    
    return publicKeys;
}

/**
 * 关闭 RPC 连接
 */
function closeClient() {
    if (userServiceStub) {
        grpc.closeClient(userServiceStub);
        userServiceStub = null;
        console.log('✅ User Service RPC 客户端已关闭');
    }
}

module.exports = {
    getUserPublicKey,
    batchGetUserPublicKeys,
    initializeClient,
    closeClient
};

