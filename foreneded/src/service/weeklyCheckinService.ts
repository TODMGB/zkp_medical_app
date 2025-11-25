import { Preferences } from '@capacitor/preferences';
import { CHECKIN_KEYS, generateKey } from '@/config/storage.config';
import { checkinStorageService, type CheckInRecord } from './checkinStorage';
import { zkpService } from './zkp';

/**
 * 周度打卡数据接口
 */
export interface WeeklyCheckinData {
  weekKey: string;                    // ISO周格式，如 2024-W01
  startDate: string;                  // YYYY-MM-DD
  endDate: string;                    // YYYY-MM-DD
  records: CheckInRecord[];           // 该周的所有打卡记录
  leaves: string[];                   // checkin_commitment 排序后的数组
  merkleRoot?: string;                // 计算得到的 Merkle 根
  stats: {
    totalCount: number;               // 打卡总数
    daysCovered: number;              // 覆盖的天数
    completionRate: number;           // 完成率 (%)
  };
}

/**
 * 周度证明结果接口
 */
export interface WeeklyProofResult {
  weekKey: string;
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
  proof?: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals?: string[];
  calldata?: string;
  error?: string;
}

/**
 * 周度证明状态映射
 */
export interface WeeklyProofStatusMap {
  [weekKey: string]: WeeklyProofResult;
}

// ==================== 周度打卡服务类 ====================

class WeeklyCheckinService {
  /**
   * 获取 ISO 周号（格式：YYYY-Www）
   */
  public getISOWeekKey(date: Date = new Date()): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  /**
   * 获取周的开始和结束日期
   */
  public getWeekDateRange(weekKey: string): { startDate: string; endDate: string } {
    const [year, week] = weekKey.split('-W').map(Number);
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const monday = new Date(simple);
    monday.setDate(monday.getDate() - simple.getDay() + 1);
    
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    
    const startDate = monday.toISOString().split('T')[0];
    const endDate = sunday.toISOString().split('T')[0];
    
    return { startDate, endDate };
  }

  /**
   * 按周分组打卡记录
   */
  public async groupRecordsByWeek(): Promise<Map<string, WeeklyCheckinData>> {
    const allRecords = await checkinStorageService.getAllRecords();
    const grouped = new Map<string, WeeklyCheckinData>();

    // 按周分组
    allRecords.forEach(record => {
      const date = new Date(record.timestamp);
      const weekKey = this.getISOWeekKey(date);
      
      if (!grouped.has(weekKey)) {
        const { startDate, endDate } = this.getWeekDateRange(weekKey);
        grouped.set(weekKey, {
          weekKey,
          startDate,
          endDate,
          records: [],
          leaves: [],
          stats: {
            totalCount: 0,
            daysCovered: 0,
            completionRate: 0,
          },
        });
      }
      
      grouped.get(weekKey)!.records.push(record);
    });

    // 计算每周的统计数据和 leaves
    for (const weekData of grouped.values()) {
      // 收集 checkin_commitment 并排序
      const commitments = weekData.records
        .map(r => r.checkin_commitment)
        .sort((a, b) => a.localeCompare(b));
      
      // 填充到 128 个（2^7）
      const leaves = [...commitments];
      while (leaves.length < 128) {
        leaves.push('0');
      }
      
      weekData.leaves = leaves;
      weekData.stats.totalCount = weekData.records.length;
      
      // 计算覆盖的天数
      const daySet = new Set<string>();
      weekData.records.forEach(r => {
        const day = new Date(r.timestamp).toISOString().split('T')[0];
        daySet.add(day);
      });
      weekData.stats.daysCovered = daySet.size;
      weekData.stats.completionRate = Math.round((daySet.size / 7) * 100);
    }

    // 缓存到本地存储
    await this.cacheWeeklyGrouped(grouped);

    return grouped;
  }

  /**
   * 缓存周度分组数据
   */
  private async cacheWeeklyGrouped(grouped: Map<string, WeeklyCheckinData>): Promise<void> {
    try {
      const data = Array.from(grouped.entries()).map(([weekKey, weekData]) => ({
        weekKey,
        startDate: weekData.startDate,
        endDate: weekData.endDate,
        leaves: weekData.leaves,
        stats: weekData.stats,
        recordCount: weekData.records.length,
      }));

      await Preferences.set({
        key: CHECKIN_KEYS.WEEKLY_GROUPED,
        value: JSON.stringify(data),
      });

      console.log('✅ 周度分组数据已缓存');
    } catch (error) {
      console.error('缓存周度分组数据失败:', error);
    }
  }

  /**
   * 获取缓存的周度分组数据
   */
  public async getCachedWeeklyGrouped(): Promise<Array<Omit<WeeklyCheckinData, 'records'>>> {
    try {
      const { value } = await Preferences.get({ key: CHECKIN_KEYS.WEEKLY_GROUPED });
      if (!value) return [];
      return JSON.parse(value);
    } catch (error) {
      console.error('获取缓存的周度分组数据失败:', error);
      return [];
    }
  }

  /**
   * 获取本周数据
   */
  public async getThisWeekData(): Promise<WeeklyCheckinData | null> {
    const grouped = await this.groupRecordsByWeek();
    const thisWeekKey = this.getISOWeekKey();
    return grouped.get(thisWeekKey) || null;
  }

  /**
   * 获取前 N 周的数据（用于补打卡）
   */
  public async getPreviousWeeksData(count: number = 4): Promise<WeeklyCheckinData[]> {
    const grouped = await this.groupRecordsByWeek();
    const weeks = Array.from(grouped.values()).sort((a, b) => 
      b.weekKey.localeCompare(a.weekKey)
    );
    return weeks.slice(0, count);
  }

  /**
   * 保存周度证明结果
   */
  public async saveWeeklyProofResult(result: WeeklyProofResult): Promise<void> {
    try {
      const key = generateKey(CHECKIN_KEYS.WEEKLY_PROOF_PREFIX, result.weekKey);
      await Preferences.set({
        key,
        value: JSON.stringify(result),
      });

      // 同时更新状态映射
      await this.updateProofStatusMap(result);

      console.log(`✅ 周度证明结果已保存: ${result.weekKey}`);
    } catch (error) {
      console.error('保存周度证明结果失败:', error);
      throw error;
    }
  }

  /**
   * 获取周度证明结果
   */
  public async getWeeklyProofResult(weekKey: string): Promise<WeeklyProofResult | null> {
    try {
      const key = generateKey(CHECKIN_KEYS.WEEKLY_PROOF_PREFIX, weekKey);
      const { value } = await Preferences.get({ key });
      if (!value) return null;
      return JSON.parse(value);
    } catch (error) {
      console.error(`获取周度证明结果失败 (${weekKey}):`, error);
      return null;
    }
  }

  /**
   * 更新证明状态映射
   */
  private async updateProofStatusMap(result: WeeklyProofResult): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: CHECKIN_KEYS.WEEKLY_PROOF_STATUS });
      const statusMap: WeeklyProofStatusMap = value ? JSON.parse(value) : {};

      statusMap[result.weekKey] = {
        weekKey: result.weekKey,
        jobId: result.jobId,
        status: result.status,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        error: result.error,
      };

      await Preferences.set({
        key: CHECKIN_KEYS.WEEKLY_PROOF_STATUS,
        value: JSON.stringify(statusMap),
      });
    } catch (error) {
      console.error('更新证明状态映射失败:', error);
    }
  }

  /**
   * 获取所有证明状态
   */
  public async getAllProofStatus(): Promise<WeeklyProofStatusMap> {
    try {
      const { value } = await Preferences.get({ key: CHECKIN_KEYS.WEEKLY_PROOF_STATUS });
      if (!value) return {};
      return JSON.parse(value);
    } catch (error) {
      console.error('获取证明状态失败:', error);
      return {};
    }
  }

  /**
   * 获取某周的证明状态
   */
  public async getProofStatus(weekKey: string): Promise<WeeklyProofResult | null> {
    const statusMap = await this.getAllProofStatus();
    return statusMap[weekKey] || null;
  }

  /**
   * 计算 Merkle 根（前端计算，用于验证）
   * 128 个叶子的 Merkle 树计算（2^7）
   */
  public async calculateMerkleRoot(leaves: string[]): Promise<string> {
    try {
      // 确保有 128 个叶子
      const paddedLeaves = [...leaves]
      while (paddedLeaves.length < 128) {
        paddedLeaves.push('0')
      }

      const leavesBI = paddedLeaves.map(v => BigInt(v))
      const intermediateHashes: BigInt[] = []

      // 第一层：配对计算（128 个叶子 -> 64 个中间节点）
      for (let i = 0; i < 64; i++) {
        const hashStr = await zkpService.poseidonHash([
          leavesBI[2 * i].toString(),
          leavesBI[2 * i + 1].toString()
        ])
        intermediateHashes.push(BigInt(hashStr))
      }

      // 后续层（64 -> 32 -> 16 -> 8 -> 4 -> 2 -> 1）
      let levelOffset = 0
      for (let d = 1; d < 7; d++) {
        const nNodesInLevel = 128 >> d
        for (let i = 0; i < nNodesInLevel / 2; i++) {
          const left = intermediateHashes[levelOffset + 2 * i]
          const right = intermediateHashes[levelOffset + 2 * i + 1]
          const hashStr = await zkpService.poseidonHash([
            left.toString(),
            right.toString()
          ])
          intermediateHashes.push(BigInt(hashStr))
        }
        levelOffset += nNodesInLevel / 2
      }

      const merkleRoot = intermediateHashes[intermediateHashes.length - 1].toString()
      return merkleRoot
    } catch (error) {
      console.error('计算 Merkle 根失败:', error)
      throw error
    }
  }

  /**
   * 清空所有周度数据
   */
  public async clearAllWeeklyData(): Promise<void> {
    try {
      await Preferences.remove({ key: CHECKIN_KEYS.WEEKLY_GROUPED });
      await Preferences.remove({ key: CHECKIN_KEYS.WEEKLY_PROOF_STATUS });
      console.log('🗑️ 所有周度数据已清空');
    } catch (error) {
      console.error('清空周度数据失败:', error);
    }
  }
}

export const weeklyCheckinService = new WeeklyCheckinService();
