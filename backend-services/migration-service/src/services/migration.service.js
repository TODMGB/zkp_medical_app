/**
 * 迁移服务层
 * 处理迁移相关的业务逻辑和数据库操作
 */

const db = require('../entity/db');

class MigrationService {
  /**
   * 生成6位确认码
   */
  generateConfirmCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 检查会话是否过期
   */
  isExpired(expiresAt) {
    return Date.now() > expiresAt;
  }

  /**
   * 创建迁移会话
   */
  async createSession(sessionData) {
    const {
      id,
      status = 'pending',
      createdAt,
      expiresAt,
      oldDeviceId,
      confirmCode
    } = sessionData;

    const finalConfirmCode = confirmCode || this.generateConfirmCode();

    const query = `
      INSERT INTO migration_sessions 
      (id, status, created_at, expires_at, old_device_id, confirm_code)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, expires_at, confirm_code
    `;

    const values = [id, status, createdAt, expiresAt, oldDeviceId, finalConfirmCode];
    
    try {
      const result = await db.query(query, values);
      return {
        migrationId: result.rows[0].id,
        expiresAt: result.rows[0].expires_at,
        confirmCode: result.rows[0].confirm_code
      };
    } catch (error) {
      console.error('创建迁移会话数据库错误:', error);
      throw error;
    }
  }

  /**
   * 获取迁移会话
   */
  async getSession(migrationId) {
    const query = 'SELECT * FROM migration_sessions WHERE id = $1';
    
    try {
      const result = await db.query(query, [migrationId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('查询迁移会话数据库错误:', error);
      throw error;
    }
  }

  /**
   * 确认迁移完成
   */
  async confirmMigration(migrationId, newDeviceId, confirmedAt) {
    const query = `
      UPDATE migration_sessions 
      SET status = 'completed', new_device_id = $1, confirmed_at = $2
      WHERE id = $3
    `;

    try {
      await db.query(query, [newDeviceId, confirmedAt, migrationId]);
    } catch (error) {
      console.error('确认迁移数据库错误:', error);
      throw error;
    }
  }

  /**
   * 更新会话状态
   */
  async updateSessionStatus(migrationId, status) {
    const query = 'UPDATE migration_sessions SET status = $1 WHERE id = $2';
    
    try {
      await db.query(query, [status, migrationId]);
    } catch (error) {
      console.error('更新会话状态数据库错误:', error);
      throw error;
    }
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions() {
    const now = Date.now();
    const query = 'DELETE FROM migration_sessions WHERE expires_at < $1 OR status = $2';
    
    try {
      const result = await db.query(query, [now, 'expired']);
      return result.rowCount;
    } catch (error) {
      console.error('清理过期会话数据库错误:', error);
      throw error;
    }
  }

  /**
   * 获取所有迁移会话（调试用）
   */
  async getAllSessions() {
    const query = 'SELECT * FROM migration_sessions ORDER BY created_at DESC';
    
    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('查询所有会话数据库错误:', error);
      throw error;
    }
  }

  /**
   * 初始化数据库表
   */
  async initializeDatabase() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS migration_sessions (
        id VARCHAR(50) PRIMARY KEY,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        old_device_id VARCHAR(100) NOT NULL,
        new_device_id VARCHAR(100),
        confirm_code VARCHAR(6) NOT NULL,
        confirmed_at BIGINT,
        created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT migration_sessions_status_check 
        CHECK (status IN ('pending', 'completed', 'expired'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_migration_expires_at ON migration_sessions (expires_at);
      CREATE INDEX IF NOT EXISTS idx_migration_old_device_id ON migration_sessions (old_device_id);
      CREATE INDEX IF NOT EXISTS idx_migration_status ON migration_sessions (status);
    `;

    try {
      await db.query(createTableQuery);
      console.log('迁移数据库表初始化成功');
    } catch (error) {
      console.error('初始化迁移数据库表失败:', error);
      throw error;
    }
  }

  /**
   * 上传加密的迁移数据
   */
  async uploadEncryptedData({ migrationId, encryptedData, expiresAt, createdBy }) {
    console.log('[MigrationService] 上传加密数据:', { 
      migrationId, 
      dataSize: encryptedData.length,
      expiresAt,
      createdBy 
    });

    // 1. 检查是否已存在
    const existing = await this.getSession(migrationId);
    if (existing && existing.encrypted_data) {
      throw new Error('迁移数据已存在，不能重复上传');
    }

    // 2. 计算数据大小
    const dataSize = Buffer.byteLength(encryptedData, 'utf8');
    
    // 3. 检查大小限制（5MB）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (dataSize > maxSize) {
      throw new Error(`数据大小超过限制（最大 ${maxSize} 字节）`);
    }

    const uploadedAt = Date.now();

    const query = `
      UPDATE migration_sessions 
      SET encrypted_data = $1, 
          data_size = $2, 
          uploaded_at = $3,
          created_by = $4
      WHERE id = $5
      RETURNING id, data_size, uploaded_at
    `;

    try {
      const result = await db.query(query, [
        encryptedData, 
        dataSize, 
        uploadedAt,
        createdBy,
        migrationId
      ]);

      if (result.rowCount === 0) {
        throw new Error('迁移会话不存在');
      }

      console.log('[MigrationService] 加密数据上传成功:', result.rows[0]);

      return {
        migrationId: result.rows[0].id,
        dataSize: result.rows[0].data_size,
        uploadedAt: result.rows[0].uploaded_at
      };
    } catch (error) {
      console.error('上传加密数据数据库错误:', error);
      throw error;
    }
  }

  /**
   * 下载加密的迁移数据
   */
  async downloadEncryptedData(migrationId) {
    console.log('[MigrationService] 下载加密数据:', { migrationId });

    // 1. 获取会话
    const session = await this.getSession(migrationId);
    
    if (!session) {
      throw new Error('迁移会话不存在');
    }

    // 2. 检查是否过期
    if (this.isExpired(session.expires_at)) {
      throw new Error('迁移会话已过期');
    }

    // 3. 检查是否有数据
    if (!session.encrypted_data) {
      throw new Error('迁移数据尚未上传');
    }

    // 4. 增加下载计数
    const updateQuery = `
      UPDATE migration_sessions 
      SET download_count = download_count + 1 
      WHERE id = $1
    `;
    await db.query(updateQuery, [migrationId]);

    console.log('[MigrationService] 加密数据下载成功');

    return {
      encryptedData: session.encrypted_data,
      expiresAt: session.expires_at,
      dataSize: session.data_size
    };
  }

  /**
   * 检查迁移数据是否存在
   */
  async checkDataExists(migrationId) {
    const query = 'SELECT encrypted_data IS NOT NULL as has_data FROM migration_sessions WHERE id = $1';
    
    try {
      const result = await db.query(query, [migrationId]);
      return result.rows[0]?.has_data || false;
    } catch (error) {
      console.error('检查数据存在性错误:', error);
      throw error;
    }
  }

  /**
   * 启动定时清理任务
   */
  startCleanupTask() {
    const cleanupInterval = process.env.MIGRATION_CLEANUP_INTERVAL || 3600000; // 默认1小时
    
    setInterval(async () => {
      try {
        const cleanedCount = await this.cleanupExpiredSessions();
        if (cleanedCount > 0) {
          console.log(`定时清理了 ${cleanedCount} 个过期迁移会话`);
        }
      } catch (error) {
        console.error('定时清理失败:', error);
      }
    }, parseInt(cleanupInterval));

    console.log(`迁移会话定时清理任务已启动，间隔: ${cleanupInterval}ms`);
  }
}

module.exports = new MigrationService();
