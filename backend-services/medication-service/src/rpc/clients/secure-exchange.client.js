/**
 * secure-exchange.client.js
 * Secure Exchange Service RPC客户端
 * 用于加密转发用药计划数据
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const config = require('../../config');

let secureExchangeStub = null;

/**
 * 初始化 secure-exchange RPC 客户端
 */
async function initializeClient() {
    try {
        if (secureExchangeStub) {
            return secureExchangeStub;
        }

        // 加载 proto 文件（从项目根目录）
        const protoPath = path.join(__dirname, '../../../../proto/secure-exchange.proto');
        const packageDefinition = protoLoader.loadSync(protoPath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });

        const secureExchangeProto = grpc.loadPackageDefinition(packageDefinition);
        const secureExchangeService = secureExchangeProto.secure_exchange || secureExchangeProto.SecureExchange;

        if (!secureExchangeService) {
            throw new Error('Cannot load SecureExchange service from proto');
        }

        // 创建客户端
        const address = config.rpc.secureExchangeService;
        secureExchangeStub = new secureExchangeService.SecureExchange(
            address,
            grpc.credentials.createInsecure()
        );

        console.log(`✅ Secure Exchange RPC 客户端已初始化: ${address}`);
        return secureExchangeStub;
    } catch (error) {
        console.error('❌ 初始化 Secure Exchange RPC 客户端失败:', error.message);
        throw error;
    }
}

async function getPlanShareRecipients(planId, options = {}) {
    try {
        const stub = await initializeClient();
        const { senderAddress = '' } = options;

        return new Promise((resolve, reject) => {
            stub.GetPlanShareRecipients(
                {
                    plan_id: String(planId),
                    sender_address: senderAddress ? String(senderAddress) : ''
                },
                (error, response) => {
                    if (error) {
                        reject(new Error(`Failed to get plan share recipients: ${error.message}`));
                    } else {
                        resolve({
                            recipient_addresses: response.recipient_addresses || [],
                            total_count: response.total_count || 0
                        });
                    }
                }
            );
        });
    } catch (error) {
        console.error('获取计划分享收件人失败:', error.message);
        throw error;
    }
}

/**
 * 发送加密数据给接收者
 * @param {Object} options
 * @returns {Promise<{message_id: string, encrypted_data: Buffer}>}
 */
async function sendEncryptedData(options) {
    try {
        const {
            senderAddress,
            recipientAddress,
            encryptedData,      // 已用医生公钥加密的计划数据
            dataType = 'medication_plan',
            metadata = {}
        } = options;

        const stub = await initializeClient();

        return new Promise((resolve, reject) => {
            stub.SendEncryptedMessage(
                {
                    sender_address: senderAddress,
                    recipient_address: recipientAddress,
                    encrypted_data: encryptedData,  // Send Buffer directly (gRPC bytes type)
                    data_type: dataType,
                    metadata: JSON.stringify(metadata),
                    timestamp: new Date().toISOString()
                },
                (error, response) => {
                    if (error) {
                        reject(new Error(`Failed to send encrypted message: ${error.message}`));
                    } else {
                        resolve({
                            message_id: response.message_id,
                            encrypted_data: Buffer.from(response.encrypted_data),
                            recipient_address: response.recipient_address,
                            encrypted_at: response.encrypted_at
                        });
                    }
                }
            );
        });
    } catch (error) {
        console.error('发送加密数据失败:', error.message);
        throw error;
    }
}

/**
 * 检索接收者的加密消息
 * @param {string} recipientAddress
 * @param {Object} options
 * @returns {Promise<Array>}
 */
async function getEncryptedMessages(recipientAddress, options = {}) {
    try {
        const stub = await initializeClient();
        const { limit = 50, offset = 0 } = options;

        return new Promise((resolve, reject) => {
            stub.GetEncryptedMessages(
                {
                    recipient_address: recipientAddress,
                    limit,
                    offset
                },
                (error, response) => {
                    if (error) {
                        reject(new Error(`Failed to retrieve messages: ${error.message}`));
                    } else {
                        const messages = (response.messages || []).map(msg => ({
                            message_id: msg.message_id,
                            sender_address: msg.sender_address,
                            encrypted_data: Buffer.from(msg.encrypted_data),
                            data_type: msg.data_type,
                            metadata: msg.metadata ? JSON.parse(msg.metadata) : {},
                            encrypted_at: msg.encrypted_at,
                            read_at: msg.read_at
                        }));
                        resolve(messages);
                    }
                }
            );
        });
    } catch (error) {
        console.error('检索加密消息失败:', error.message);
        throw error;
    }
}

/**
 * 标记消息为已读
 * @param {string} messageId
 * @returns {Promise<boolean>}
 */
async function markMessageAsRead(messageId) {
    try {
        const stub = await initializeClient();

        return new Promise((resolve, reject) => {
            stub.MarkMessageAsRead(
                { message_id: messageId },
                (error, response) => {
                    if (error) {
                        reject(new Error(`Failed to mark message as read: ${error.message}`));
                    } else {
                        resolve(response.success);
                    }
                }
            );
        });
    } catch (error) {
        console.error('标记消息为已读失败:', error.message);
        throw error;
    }
}

/**
 * 撤销消息（安全删除）
 * @param {string} messageId
 * @returns {Promise<boolean>}
 */
async function revokeMessage(messageId) {
    try {
        const stub = await initializeClient();

        return new Promise((resolve, reject) => {
            stub.RevokeMessage(
                { message_id: messageId },
                (error, response) => {
                    if (error) {
                        reject(new Error(`Failed to revoke message: ${error.message}`));
                    } else {
                        resolve(response.success);
                    }
                }
            );
        });
    } catch (error) {
        console.error('撤销消息失败:', error.message);
        throw error;
    }
}

module.exports = {
    initializeClient,
    sendEncryptedData,
    getEncryptedMessages,
    markMessageAsRead,
    revokeMessage,
    getPlanShareRecipients
};
