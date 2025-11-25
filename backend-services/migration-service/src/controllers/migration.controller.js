/**
 * 账户迁移控制器
 * 处理账户迁移相关的HTTP请求
 */

const migrationService = require('../services/migration.service');
const mqProducer = require('../mq/producer');

class MigrationController {
  /**
   * 创建迁移会话
   */
  async createSession(req, res) {
    console.log('🔄 [Migration Controller] 收到创建迁移会话请求');
    console.log('📤 [Request Body]', JSON.stringify(req.body, null, 2));
    console.log('📤 [Request Headers]', JSON.stringify(req.headers, null, 2));
    
    try {
      const { id, status, createdAt, expiresAt, oldDeviceId, confirmCode } = req.body;
      
      // 获取用户地址（优先从请求头获取，确保与其他服务一致）
      const user_address = req.headers['x-user-smart-account'] || req.body.userAddress;
      
      console.log('🔍 [User Address] 用户地址:', user_address);
      console.log('🔍 [Validation] 验证必要字段...');
      // 验证必要字段
      if (!id || !oldDeviceId) {
        console.log('❌ [Validation] 缺少必要参数');
        return res.status(400).json({
          success: false,
          error: '缺少必要参数',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      console.log('✅ [Validation] 字段验证通过');
      console.log('🔄 [Service] 调用迁移服务...');
      
      const result = await migrationService.createSession({
        id,
        status: status || 'pending',
        createdAt: createdAt || Date.now(),
        expiresAt: expiresAt || (Date.now() + 5 * 60 * 1000), // 5分钟后过期
        oldDeviceId,
        confirmCode
      });

      console.log('✅ [Service] 迁移服务调用成功');
      console.log('📥 [Result]', JSON.stringify(result, null, 2));

      // 📨 发送MQ通知：迁移会话已创建
      if (user_address) {
        console.log('📨 [MQ] 准备发送通知到:', user_address);
        try {
          await mqProducer.publishMigrationSessionCreated(user_address, {
            id: result.migrationId,
            confirmCode: result.confirmCode,
            expiresAt: result.expiresAt
          });
          console.log('✅ [MQ] 已发送"迁移会话创建"通知到:', user_address);
        } catch (mqError) {
          console.error('❌ [MQ] 发送通知失败（不影响主流程）:', mqError);
        }
      } else {
        console.warn('⚠️ [MQ] 未发送通知：缺少用户地址');
      }

      res.json({
        success: true,
        message: '迁移会话创建成功',
        data: result
      });
      
      console.log('✅ [Response] 响应已发送');
    } catch (error) {
      console.error('❌ [Error] 创建迁移会话失败:', error);
      res.status(500).json({
        success: false,
        error: '创建迁移会话失败',
        code: 'MIGRATION_CREATE_FAILED'
      });
    }
  }

  /**
   * 获取迁移会话
   */
  async getSession(req, res) {
    try {
      const { migrationId } = req.params;
      
      const session = await migrationService.getSession(migrationId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: '迁移会话不存在',
          code: 'MIGRATION_SESSION_NOT_FOUND'
        });
      }

      if (migrationService.isExpired(session.expires_at)) {
        return res.status(410).json({
          success: false,
          error: '迁移会话已过期',
          code: 'MIGRATION_SESSION_EXPIRED'
        });
      }

      res.json({
        success: true,
        data: {
          id: session.id,
          status: session.status,
          createdAt: session.created_at,
          expiresAt: session.expires_at,
          oldDeviceId: session.old_device_id,
          newDeviceId: session.new_device_id,
          confirmCode: session.confirm_code
        }
      });
    } catch (error) {
      console.error('获取迁移会话失败:', error);
      res.status(500).json({
        success: false,
        error: '查询失败',
        code: 'DATABASE_ERROR'
      });
    }
  }

  /**
   * 确认迁移完成
   */
  async confirmMigration(req, res) {
    console.log('🔄 [Migration Controller] 收到确认迁移请求');
    console.log('📤 [Request Body]', JSON.stringify(req.body, null, 2));
    console.log('📤 [Request Headers]', JSON.stringify(req.headers, null, 2));
    
    try {
      const { migrationId, newDeviceId, status, timestamp } = req.body;
      
      // 获取用户地址（优先从请求头获取，确保与其他服务一致）
      const user_address = req.headers['x-user-smart-account'] || req.body.userAddress;

      console.log('🔍 [User Address] 用户地址:', user_address);
      console.log('🔍 [Validation] 验证必要字段...');
      if (!migrationId || !newDeviceId) {
        console.log('❌ [Validation] 缺少必要参数');
        return res.status(400).json({
          success: false,
          error: '缺少必要参数',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      console.log('🔄 [Service] 获取迁移会话...');
      const session = await migrationService.getSession(migrationId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: '迁移会话不存在',
          code: 'MIGRATION_SESSION_NOT_FOUND'
        });
      }

      if (migrationService.isExpired(session.expires_at)) {
        return res.status(410).json({
          success: false,
          error: '迁移会话已过期',
          code: 'MIGRATION_SESSION_EXPIRED'
        });
      }

      if (session.status === 'completed') {
        return res.status(409).json({
          success: false,
          error: '迁移已确认，不能重复操作',
          code: 'MIGRATION_ALREADY_CONFIRMED'
        });
      }

      console.log('🔄 [Service] 执行确认迁移...');
      const confirmedAt = timestamp || Date.now();
      await migrationService.confirmMigration(migrationId, newDeviceId, confirmedAt);

      console.log('✅ [Service] 迁移确认成功');
      
      // 📨 发送MQ通知：迁移完成
      if (user_address) {
        console.log('📨 [MQ] 准备发送通知到:', user_address);
        try {
          await mqProducer.publishMigrationCompleted(user_address, {
            migrationId: migrationId,
            oldDeviceId: session.old_device_id,
            newDeviceId: newDeviceId
          });
          console.log('✅ [MQ] 已发送"迁移完成"通知到:', user_address);
        } catch (mqError) {
          console.error('❌ [MQ] 发送通知失败（不影响主流程）:', mqError);
        }
      } else {
        console.warn('⚠️ [MQ] 未发送通知：缺少用户地址');
      }
      
      res.json({
        success: true,
        message: '迁移确认成功',
        data: {
          migrationId: migrationId,
          confirmedAt: confirmedAt
        }
      });
      console.log('✅ [Response] 响应已发送');
    } catch (error) {
      console.error('❌ [Error] 确认迁移失败:', error);
      console.error('❌ [Error Stack]', error.stack);
      res.status(500).json({
        success: false,
        error: '确认失败',
        code: 'MIGRATION_CONFIRM_FAILED'
      });
    }
  }

  /**
   * 查询迁移状态
   */
  async getStatus(req, res) {
    try {
      const { migrationId } = req.params;
      
      const session = await migrationService.getSession(migrationId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: '迁移会话不存在',
          code: 'MIGRATION_SESSION_NOT_FOUND'
        });
      }

      // 检查是否过期
      let status = session.status;
      if (status === 'pending' && migrationService.isExpired(session.expires_at)) {
        status = 'expired';
        // 更新数据库中的状态
        await migrationService.updateSessionStatus(migrationId, 'expired');
      }

      res.json({
        success: true,
        data: {
          id: session.id,
          status: status,
          createdAt: session.created_at,
          expiresAt: session.expires_at,
          oldDeviceId: session.old_device_id,
          newDeviceId: session.new_device_id,
          confirmedAt: session.confirmed_at
        }
      });
    } catch (error) {
      console.error('查询迁移状态失败:', error);
      res.status(500).json({
        success: false,
        error: '查询失败',
        code: 'DATABASE_ERROR'
      });
    }
  }

  /**
   * 验证确认码
   */
  async verifyCode(req, res) {
    try {
      const { migrationId, confirmCode } = req.body;

      if (!migrationId || !confirmCode) {
        return res.status(400).json({
          success: false,
          data: {
            valid: false,
            error: '缺少必要参数'
          }
        });
      }

      const session = await migrationService.getSession(migrationId);
      
      if (!session) {
        return res.json({
          success: true,
          data: {
            valid: false,
            error: '迁移会话不存在'
          }
        });
      }

      if (migrationService.isExpired(session.expires_at)) {
        return res.json({
          success: true,
          data: {
            valid: false,
            error: '迁移会话已过期'
          }
        });
      }

      if (session.confirm_code !== confirmCode) {
        return res.json({
          success: true,
          data: {
            valid: false,
            error: '确认码错误'
          }
        });
      }

      res.json({
        success: true,
        data: {
          valid: true,
          migrationId: migrationId
        }
      });
    } catch (error) {
      console.error('验证确认码失败:', error);
      res.status(500).json({
        success: false,
        data: {
          valid: false,
          error: '查询失败'
        }
      });
    }
  }

  /**
   * 清理过期会话
   */
  async cleanup(req, res) {
    try {
      const cleanedCount = await migrationService.cleanupExpiredSessions();
      
      res.json({
        success: true,
        message: '清理完成',
        data: {
          cleanedCount: cleanedCount
        }
      });
    } catch (error) {
      console.error('清理过期会话失败:', error);
      res.status(500).json({
        success: false,
        error: '清理失败',
        code: 'CLEANUP_FAILED'
      });
    }
  }

  /**
   * 获取所有迁移会话（调试用）
   */
  async getAllSessions(req, res) {
    try {
      const sessions = await migrationService.getAllSessions();
      
      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      console.error('查询所有会话失败:', error);
      res.status(500).json({
        success: false,
        error: '查询失败'
      });
    }
  }

  /**
   * 上传加密迁移数据
   * POST /api/migration/upload
   */
  async uploadEncryptedData(req, res) {
    console.log('🔄 [Migration Controller] 收到上传加密数据请求');
    console.log('📤 [Request Body Size]', JSON.stringify(req.body).length, 'bytes');
    
    try {
      const { migrationId, encryptedData, expiresAt } = req.body;
      
      // 从 JWT 获取用户地址
      const createdBy = req.headers['x-user-smart-account'] || req.body.userAddress;

      console.log('🔍 [Validation] 验证必要字段...');
      
      // 验证必要字段
      if (!migrationId || !encryptedData || !expiresAt) {
        console.log('❌ [Validation] 缺少必要参数');
        return res.status(400).json({
          success: false,
          message: '缺少必要参数',
          code: 'MISSING_REQUIRED_FIELDS',
          details: {
            migrationId: !!migrationId,
            encryptedData: !!encryptedData,
            expiresAt: !!expiresAt
          }
        });
      }

      console.log('✅ [Validation] 字段验证通过');
      console.log('📊 [Info] 迁移ID:', migrationId);
      console.log('📊 [Info] 数据大小:', encryptedData.length, '字符');
      console.log('📊 [Info] 过期时间:', new Date(expiresAt).toISOString());

      // 调用 service 上传数据
      const result = await migrationService.uploadEncryptedData({
        migrationId,
        encryptedData,
        expiresAt,
        createdBy
      });

      console.log('✅ [Service] 上传成功');

      res.json({
        success: true,
        message: '迁移数据上传成功',
        migrationId: result.migrationId,
        expiresAt: expiresAt
      });

      console.log('✅ [Response] 响应已发送');
    } catch (error) {
      console.error('❌ [Error] 上传加密数据失败:', error);
      
      // 根据错误类型返回不同状态码
      if (error.message.includes('已存在')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: 'DATA_ALREADY_EXISTS'
        });
      }
      
      if (error.message.includes('不存在')) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: 'MIGRATION_SESSION_NOT_FOUND'
        });
      }

      if (error.message.includes('超过限制')) {
        return res.status(413).json({
          success: false,
          message: error.message,
          code: 'PAYLOAD_TOO_LARGE'
        });
      }

      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        code: 'UPLOAD_FAILED'
      });
    }
  }

  /**
   * 下载加密迁移数据
   * GET /api/migration/download/:migrationId
   */
  async downloadEncryptedData(req, res) {
    console.log('🔄 [Migration Controller] 收到下载加密数据请求');
    
    try {
      const { migrationId } = req.params;

      console.log('📊 [Info] 迁移ID:', migrationId);

      if (!migrationId) {
        console.log('❌ [Validation] 缺少迁移ID');
        return res.status(400).json({
          success: false,
          message: '缺少迁移ID',
          code: 'MISSING_MIGRATION_ID'
        });
      }

      // 调用 service 下载数据
      const result = await migrationService.downloadEncryptedData(migrationId);

      console.log('✅ [Service] 下载成功');
      console.log('📊 [Info] 数据大小:', result.dataSize, '字节');

      res.json({
        success: true,
        encryptedData: result.encryptedData,
        expiresAt: result.expiresAt
      });

      console.log('✅ [Response] 响应已发送');
    } catch (error) {
      console.error('❌ [Error] 下载加密数据失败:', error);
      
      // 根据错误类型返回不同状态码
      if (error.message.includes('不存在')) {
        return res.status(404).json({
          success: false,
          message: '迁移数据不存在或已过期',
          code: 'DATA_NOT_FOUND'
        });
      }

      if (error.message.includes('过期')) {
        return res.status(404).json({
          success: false,
          message: '迁移数据已过期',
          code: 'DATA_EXPIRED'
        });
      }

      if (error.message.includes('尚未上传')) {
        return res.status(404).json({
          success: false,
          message: '迁移数据尚未上传',
          code: 'DATA_NOT_UPLOADED'
        });
      }

      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        code: 'DOWNLOAD_FAILED'
      });
    }
  }

  /**
   * 健康检查
   */
  async health(req, res) {
    res.json({
      success: true,
      message: '迁移服务正常',
      timestamp: Date.now()
    });
  }
}

module.exports = new MigrationController();
