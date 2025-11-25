/**
 * 打卡记录本地存储服务
 * 使用Capacitor Preferences存储打卡记录
 * 支持ZKP证明数据管理
 */

import { Preferences } from '@capacitor/preferences';
import { zkpService } from './zkp';

// ==================== 类型定义 ====================

/**
 * 打卡记录（完整数据，包含私密信息）
 */
export interface CheckInRecord {
  // 基本信息
  id: string;                     // 本地唯一ID
  timestamp: number;              // 打卡时间戳（毫秒）
  medication_code: string;        // 药物代码
  medication_name: string;        // 药物名称（显示用）
  dosage: string;                 // 剂量
  user_address: string;           // 用户地址
  plan_id?: string;               // 关联的用药计划ID
  
  // ZKP相关（私密数据）
  user_id_salt: string;           // 用户ID盐值
  medication_salt: string;        // 药物盐值
  user_id_commitment: string;     // 用户ID承诺
  medication_commitment: string;  // 药物承诺
  checkin_commitment: string;     // 打卡承诺
  
  // ZKP证明（可选）
  zkp_proof?: any;                // ZKP证明对象
  zkp_public_signals?: string[];  // 公开信号
  
  // 同步状态
  synced: boolean;                // 是否已同步到后端
  verified?: boolean;             // 是否已验证（后端验证）
  backend_id?: string;            // 后端记录ID
}

/**
 * 打卡记录（公开数据，用于显示）
 */
export interface CheckInRecordPublic {
  id: string;
  timestamp: number;
  medication_code: string;
  medication_name: string;
  dosage: string;
  checkin_commitment: string;
  synced: boolean;
}

/**
 * 统计数据
 */
export interface CheckInStats {
  total: number;              // 总打卡次数
  consecutiveDays: number;    // 连续打卡天数
  complianceRate: number;     // 依从率（百分比）
  thisWeekCount: number;      // 本周打卡次数
  thisMonthCount: number;     // 本月打卡次数
}

// ==================== 导入存储配置 ====================

import { CHECKIN_KEYS } from '@/config/storage.config';

// ==================== 服务类 ====================

class CheckInStorageService {
  /**
   * 保存打卡记录
   */
  public async saveCheckInRecord(record: CheckInRecord): Promise<void> {
    try {
      // 1. 获取现有记录
      const records = await this.getAllRecords();
      
      // 2. 添加新记录
      records.push(record);
      
      // 3. 保存
      await Preferences.set({
        key: CHECKIN_KEYS.RECORDS,
        value: JSON.stringify(records),
      });
      
      // 4. 更新统计
      await this.updateStats();
      
      console.log('✅ 打卡记录已保存:', record.id);
    } catch (error) {
      console.error('保存打卡记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有打卡记录
   */
  public async getAllRecords(): Promise<CheckInRecord[]> {
    try {
      const { value } = await Preferences.get({ key: CHECKIN_KEYS.RECORDS });
      if (!value) return [];
      
      const records: CheckInRecord[] = JSON.parse(value);
      return records;
    } catch (error) {
      console.error('获取打卡记录失败:', error);
      return [];
    }
  }

  /**
   * 获取公开记录（用于显示）
   */
  public async getPublicRecords(): Promise<CheckInRecordPublic[]> {
    const records = await this.getAllRecords();
    return records.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      medication_code: r.medication_code,
      medication_name: r.medication_name,
      dosage: r.dosage,
      checkin_commitment: r.checkin_commitment,
      synced: r.synced,
    }));
  }

  /**
   * 根据ID获取记录
   */
  public async getRecordById(id: string): Promise<CheckInRecord | null> {
    const records = await this.getAllRecords();
    return records.find(r => r.id === id) || null;
  }

  /**
   * 根据日期范围获取记录
   */
  public async getRecordsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<CheckInRecord[]> {
    const records = await this.getAllRecords();
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    return records.filter(r => 
      r.timestamp >= startTime && r.timestamp <= endTime
    );
  }

  /**
   * 获取今天的记录
   */
  public async getTodayRecords(): Promise<CheckInRecord[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.getRecordsByDateRange(today, tomorrow);
  }

  /**
   * 获取本周的记录
   */
  public async getThisWeekRecords(): Promise<CheckInRecord[]> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // 周日为一周开始
    startOfWeek.setHours(0, 0, 0, 0);
    
    return this.getRecordsByDateRange(startOfWeek, now);
  }

  /**
   * 获取本月的记录
   */
  public async getThisMonthRecords(): Promise<CheckInRecord[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return this.getRecordsByDateRange(startOfMonth, now);
  }

  /**
   * 创建新的打卡记录（自动生成ZKP数据）
   */
  public async createCheckInRecord(
    userAddress: string,
    medicationCode: string,
    medicationName: string,
    dosage: string
  ): Promise<CheckInRecord> {
    try {
      console.log('📝 创建打卡记录...');
      
      // 1. 生成唯一ID
      const id = `checkin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      
      // 2. 生成盐值
      const userIdSalt = zkpService.generateSalt();
      const medicationSalt = zkpService.generateSalt();
      
      console.log('  生成的盐值:', { userIdSalt, medicationSalt });
      
      // 3. 生成commitments
      const commitments = await zkpService.generateCommitments(
        userAddress,
        medicationCode,
        userIdSalt,
        medicationSalt
      );
      
      // 4. 构建记录
      const record: CheckInRecord = {
        id,
        timestamp: Date.now(),
        medication_code: medicationCode,
        medication_name: medicationName,
        dosage,
        user_address: userAddress,
        user_id_salt: userIdSalt,
        medication_salt: medicationSalt,
        user_id_commitment: commitments.userIdCommitment,
        medication_commitment: commitments.medicationCommitment,
        checkin_commitment: commitments.checkinCommitment,
        synced: false,
      };
      
      console.log('✅ 打卡记录创建成功');
      
      return record;
    } catch (error: any) {
      console.error('创建打卡记录失败:', error);
      throw new Error('创建打卡记录失败: ' + error.message);
    }
  }

  /**
   * 为记录生成ZKP证明
   */
  public async generateProofForRecord(recordId: string): Promise<void> {
    try {
      const record = await this.getRecordById(recordId);
      if (!record) {
        throw new Error('记录不存在');
      }
      
      console.log('🔐 为记录生成ZKP证明:', recordId);
      
      // 生成证明
      const proofOutput = await zkpService.generateMedicalProof({
        userId: record.user_address,
        medicationCode: record.medication_code,
        userIdSalt: record.user_id_salt,
        medicationSalt: record.medication_salt,
      });
      
      // 更新记录
      record.zkp_proof = proofOutput.proof;
      record.zkp_public_signals = proofOutput.publicSignals;
      
      // 保存
      await this.updateRecord(record);
      
      console.log('✅ ZKP证明已生成并保存');
    } catch (error: any) {
      console.error('生成ZKP证明失败:', error);
      throw error;
    }
  }

  /**
   * 更新记录
   */
  public async updateRecord(updatedRecord: CheckInRecord): Promise<void> {
    try {
      const records = await this.getAllRecords();
      const index = records.findIndex(r => r.id === updatedRecord.id);
      
      if (index === -1) {
        throw new Error('记录不存在');
      }
      
      records[index] = updatedRecord;
      
      await Preferences.set({
        key: CHECKIN_KEYS.RECORDS,
        value: JSON.stringify(records),
      });
      
      console.log('✅ 记录已更新:', updatedRecord.id);
    } catch (error) {
      console.error('更新记录失败:', error);
      throw error;
    }
  }

  /**
   * 标记记录为已同步
   */
  public async markAsSynced(recordId: string, backendId: string): Promise<void> {
    const record = await this.getRecordById(recordId);
    if (!record) return;
    
    record.synced = true;
    record.backend_id = backendId;
    
    await this.updateRecord(record);
  }

  /**
   * 获取未同步的记录
   */
  public async getUnsyncedRecords(): Promise<CheckInRecord[]> {
    const records = await this.getAllRecords();
    return records.filter(r => !r.synced);
  }

  /**
   * 获取所有checkinCommitments（用于生成周总结证明）
   */
  public async getAllCheckinCommitments(): Promise<string[]> {
    const records = await this.getAllRecords();
    return records.map(r => r.checkin_commitment);
  }

  /**
   * 获取指定日期范围的checkinCommitments
   */
  public async getCheckinCommitmentsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<string[]> {
    const records = await this.getRecordsByDateRange(startDate, endDate);
    return records.map(r => r.checkin_commitment);
  }

  /**
   * 计算连续打卡天数
   */
  public async calculateConsecutiveDays(): Promise<number> {
    const records = await this.getAllRecords();
    if (records.length === 0) return 0;
    
    // 按日期分组
    const dateMap = new Map<string, boolean>();
    records.forEach(r => {
      const date = new Date(r.timestamp);
      const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      dateMap.set(dateKey, true);
    });
    
    // 从今天开始倒推
    let consecutiveDays = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateKey = `${checkDate.getFullYear()}-${checkDate.getMonth() + 1}-${checkDate.getDate()}`;
      
      if (dateMap.has(dateKey)) {
        consecutiveDays++;
      } else if (i > 0) {
        // 如果不是今天且没有记录，则中断
        break;
      }
    }
    
    return consecutiveDays;
  }

  /**
   * 更新统计数据
   */
  public async updateStats(): Promise<void> {
    try {
      const records = await this.getAllRecords();
      const thisWeekRecords = await this.getThisWeekRecords();
      const thisMonthRecords = await this.getThisMonthRecords();
      const consecutiveDays = await this.calculateConsecutiveDays();
      
      // 计算依从率（简化版：本周打卡次数 / 本周应打卡次数 * 100）
      // TODO: 从用药计划中获取实际应打卡次数
      const expectedCheckinsPerWeek = 21; // 假设一周需要打卡21次（每天3次）
      const complianceRate = Math.round((thisWeekRecords.length / expectedCheckinsPerWeek) * 100);
      
      const stats: CheckInStats = {
        total: records.length,
        consecutiveDays,
        complianceRate: Math.min(100, complianceRate),
        thisWeekCount: thisWeekRecords.length,
        thisMonthCount: thisMonthRecords.length,
      };
      
      await Preferences.set({
        key: CHECKIN_KEYS.STATS,
        value: JSON.stringify(stats),
      });
      
      console.log('📊 统计数据已更新:', stats);
    } catch (error) {
      console.error('更新统计数据失败:', error);
    }
  }

  /**
   * 获取统计数据
   */
  public async getStats(): Promise<CheckInStats> {
    try {
      const { value } = await Preferences.get({ key: CHECKIN_KEYS.STATS });
      if (!value) {
        // 如果没有统计数据，先更新
        await this.updateStats();
        const { value: newValue } = await Preferences.get({ key: CHECKIN_KEYS.STATS });
        return newValue ? JSON.parse(newValue) : this.getDefaultStats();
      }
      
      return JSON.parse(value);
    } catch (error) {
      console.error('获取统计数据失败:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * 获取默认统计数据
   */
  private getDefaultStats(): CheckInStats {
    return {
      total: 0,
      consecutiveDays: 0,
      complianceRate: 0,
      thisWeekCount: 0,
      thisMonthCount: 0,
    };
  }

  /**
   * 清空所有记录（谨慎使用）
   */
  public async clearAllRecords(): Promise<void> {
    await Preferences.remove({ key: CHECKIN_KEYS.RECORDS });
    await Preferences.remove({ key: CHECKIN_KEYS.STATS });
    console.log('🗑️ 所有打卡记录已清空');
  }

  /**
   * 调试：打印所有记录
   */
  public async debugPrintAll(): Promise<void> {
    const records = await this.getAllRecords();
    const stats = await this.getStats();
    
    console.log('=== 📋 打卡记录列表 ===');
    console.log(`总记录数: ${records.length}`);
    console.log('\n统计数据:', stats);
    
    records.forEach((record, index) => {
      console.log(`\n[${index + 1}] ${record.medication_name}`);
      console.log(`  ID: ${record.id}`);
      console.log(`  时间: ${new Date(record.timestamp).toLocaleString()}`);
      console.log(`  药物代码: ${record.medication_code}`);
      console.log(`  剂量: ${record.dosage}`);
      console.log(`  Checkin Commitment: ${record.checkin_commitment.slice(0, 20)}...`);
      console.log(`  已同步: ${record.synced ? '是' : '否'}`);
      console.log(`  有ZKP证明: ${record.zkp_proof ? '是' : '否'}`);
    });
    
    console.log('\n===========================\n');
  }
}

export const checkinStorageService = new CheckInStorageService();

