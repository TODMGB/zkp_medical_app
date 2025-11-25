/**
 * exchange.handler.js
 * Secure Exchange Service RPC处理器
 * 处理来自其他微服务的gRPC调用
 */

const exchangeService = require('../../services/exchange.service');
const messageService = require('../../services/message.service');

/**
 * 发送加密消息（RPC专用 - 简化版，不需要签名）
 * @param {Object} call - gRPC调用对象
 * @param {Function} callback - 回调函数
 */
async function sendEncryptedMessage(call, callback) {
    try {
        const {
            sender_address,
            recipient_address,
            encrypted_data,
            data_type,
            metadata,
            timestamp
        } = call.request;

        console.log(`📥 RPC: 收到发送加密消息请求`);
        console.log(`   发送者: ${sender_address}`);
        console.log(`   接收者: ${recipient_address}`);
        console.log(`   数据类型: ${data_type}`);

        // ⭐ RPC 调用直接创建消息（跳过签名验证，因为是服务间调用）
        const crypto = require('crypto');
        const messageEntity = require('../../entity/message.entity');
        const config = require('../../config');
        
        // 数据库 timestamp 字段是 BIGINT 类型，需要毫秒时间戳
        const currentTimestamp = timestamp ? parseInt(timestamp) : Date.now();
        const expiresAt = new Date(Date.now() + config.message.defaultExpiresIn * 1000);
        
        // 数据库 encrypted_data 字段是 TEXT 类型，需要 hex 字符串
        // gRPC bytes 类型传递的是 Buffer，需要转换为 hex
        const encryptedHex = Buffer.from(encrypted_data).toString('hex');
        console.log(`   加密数据长度: ${encryptedHex.length} 字符 (hex)`);
        
        const result = await messageEntity.create({
            sessionId: null,
            senderAddress: sender_address,
            recipientAddress: recipient_address,
            encryptedData: encryptedHex,  // 存储 hex 字符串
            signature: 'RPC_INTERNAL',  // 内部标记
            dataType: data_type || 'medication_plan',
            metadata: metadata ? JSON.parse(metadata) : {},
            nonce: crypto.randomBytes(16).toString('hex'),
            timestamp: currentTimestamp,
            expiresAt: expiresAt
        });

        console.log(`✅ RPC: 消息已创建，ID: ${result.message_id}`);

        // 发送 MQ 通知（通知患者）
        const { publishEncryptedMessageNotification } = require('../../mq/producer');
        await publishEncryptedMessageNotification(recipient_address.toLowerCase(), {
            messageId: result.message_id,
            senderAddress: result.sender_address,
            encryptedData: result.encrypted_data,
            dataType: result.data_type,
            metadata: result.metadata,
            timestamp: result.timestamp
        }).catch(err => {
            console.warn('⚠️ RPC: 发送MQ通知失败:', err.message);
        });

        // 返回响应（将 hex 字符串转回 Buffer 供 gRPC bytes 类型使用）
        callback(null, {
            message_id: result.message_id,
            encrypted_data: Buffer.from(result.encrypted_data, 'hex'),
            recipient_address: recipient_address,
            encrypted_at: result.created_at || new Date().toISOString(),
            success: true,
            error_message: ''
        });
    } catch (error) {
        console.error('❌ RPC: 发送加密消息失败:', error.message);
        callback(null, {
            message_id: '',
            encrypted_data: Buffer.from([]),
            recipient_address: '',
            encrypted_at: '',
            success: false,
            error_message: error.message
        });
    }
}

/**
 * 获取用户的加密消息列表
 * @param {Object} call - gRPC调用对象
 * @param {Function} callback - 回调函数
 */
async function getEncryptedMessages(call, callback) {
    try {
        const {
            recipient_address,
            limit = 50,
            offset = 0,
            data_type,
            unread_only = false
        } = call.request;

        console.log(`📥 RPC: 获取消息列表请求`);
        console.log(`   接收者: ${recipient_address}`);
        console.log(`   限制: ${limit}, 偏移: ${offset}`);

        // 调用 message.service 获取消息
        const result = await messageService.getMessages({
            recipientAddress: recipient_address,
            limit,
            offset,
            dataType: data_type || null,
            unreadOnly: unread_only
        });

        console.log(`✅ RPC: 返回 ${result.messages.length} 条消息`);

        // 转换为 proto 格式
        const messages = result.messages.map(msg => ({
            message_id: msg.message_id,
            sender_address: msg.sender_address,
            data_type: msg.data_type,
            metadata: typeof msg.metadata === 'string' ? msg.metadata : JSON.stringify(msg.metadata || {}),
            encrypted_at: msg.created_at || msg.encrypted_at || '',
            read_at: msg.read_at || '',
            is_read: !!msg.read_at
        }));

        callback(null, {
            messages,
            total_count: result.total_count,
            unread_count: result.unread_count,
            has_more: (offset + limit) < result.total_count
        });
    } catch (error) {
        console.error('❌ RPC: 获取消息列表失败:', error.message);
        const grpc = require('@grpc/grpc-js');
        callback({
            code: grpc.status.INTERNAL,
            message: error.message
        });
    }
}

/**
 * 获取单个消息详情
 * @param {Object} call - gRPC调用对象
 * @param {Function} callback - 回调函数
 */
async function getMessageById(call, callback) {
    try {
        const { message_id } = call.request;

        console.log(`📥 RPC: 获取消息详情请求`);
        console.log(`   消息ID: ${message_id}`);

        const message = await messageService.getMessageById(message_id);

        if (!message) {
            throw new Error('Message not found');
        }

        callback(null, {
            message_id: message.message_id,
            sender_address: message.sender_address,
            recipient_address: message.recipient_address,
            encrypted_data: Buffer.from(message.encrypted_data, 'hex'),  // hex 转 Buffer
            data_type: message.data_type,
            metadata: typeof message.metadata === 'string' ? message.metadata : JSON.stringify(message.metadata || {}),
            encrypted_at: message.created_at || message.encrypted_at || '',
            read_at: message.read_at || '',
            is_read: !!message.read_at
        });
    } catch (error) {
        console.error('❌ RPC: 获取消息详情失败:', error.message);
        const grpc = require('@grpc/grpc-js');
        callback({
            code: grpc.status.NOT_FOUND,
            message: error.message
        });
    }
}

/**
 * 标记消息为已读
 * @param {Object} call - gRPC调用对象
 * @param {Function} callback - 回调函数
 */
async function markMessageAsRead(call, callback) {
    try {
        const { message_id, user_address } = call.request;

        console.log(`📥 RPC: 标记消息已读请求`);
        console.log(`   消息ID: ${message_id}`);
        console.log(`   用户地址: ${user_address || 'N/A'}`);

        // 如果没有提供 user_address，可能需要从消息中获取
        if (!user_address) {
            throw new Error('user_address is required');
        }

        const result = await messageService.markAsRead(message_id, user_address);

        callback(null, {
            success: true,
            message: 'Message marked as read',
            affected_count: result ? 1 : 0
        });
    } catch (error) {
        console.error('❌ RPC: 标记已读失败:', error.message);
        callback(null, {
            success: false,
            message: error.message,
            affected_count: 0
        });
    }
}

/**
 * 撤销/删除消息
 * @param {Object} call - gRPC调用对象
 * @param {Function} callback - 回调函数
 */
async function revokeMessage(call, callback) {
    try {
        const { message_id } = call.request;

        console.log(`📥 RPC: 撤销消息请求`);
        console.log(`   消息ID: ${message_id}`);

        await messageService.deleteMessage(message_id);

        callback(null, {
            success: true,
            message: 'Message revoked successfully',
            affected_count: 1
        });
    } catch (error) {
        console.error('❌ RPC: 撤销消息失败:', error.message);
        callback(null, {
            success: false,
            message: error.message,
            affected_count: 0
        });
    }
}

/**
 * 批量标记已读
 * @param {Object} call - gRPC调用对象
 * @param {Function} callback - 回调函数
 */
async function markMultipleAsRead(call, callback) {
    try {
        const { message_ids, user_address } = call.request;

        console.log(`📥 RPC: 批量标记已读请求`);
        console.log(`   消息数量: ${message_ids.length}`);

        let affectedCount = 0;
        for (const messageId of message_ids) {
            try {
                await messageService.markAsRead(messageId, user_address);
                affectedCount++;
            } catch (error) {
                console.warn(`   跳过消息 ${messageId}:`, error.message);
            }
        }

        callback(null, {
            success: true,
            message: `Marked ${affectedCount} messages as read`,
            affected_count: affectedCount
        });
    } catch (error) {
        console.error('❌ RPC: 批量标记失败:', error.message);
        callback(null, {
            success: false,
            message: error.message,
            affected_count: 0
        });
    }
}

module.exports = {
    sendEncryptedMessage,
    getEncryptedMessages,
    getMessageById,
    markMessageAsRead,
    revokeMessage,
    markMultipleAsRead
};

