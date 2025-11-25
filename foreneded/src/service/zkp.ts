/**
 * ZKP服务
 * 处理零知识证明相关功能：
 * 1. 生成commitment（Poseidon哈希）
 * 2. 生成单次打卡证明（medical电路）
 * 3. 生成周总结证明（weeklySummary电路）
 */

import { buildPoseidon } from 'circomlibjs';
// @ts-ignore
import { groth16 } from 'snarkjs';
import { keccak256, toUtf8Bytes } from 'ethers';

// ==================== 类型定义 ====================

/**
 * 单次打卡ZKP输入
 */
export interface MedicalProofInput {
  userId: string;           // 用户地址（如以太坊地址）
  medicationCode: string;   // 药物代码
  userIdSalt: string;       // 用户ID盐值
  medicationSalt: string;   // 药物盐值
}

/**
 * 单次打卡ZKP输出
 */
export interface MedicalProofOutput {
  proof: any;                       // ZKP证明
  publicSignals: string[];          // 公开信号
  userIdCommitment: string;         // 用户ID承诺
  medicationCommitment: string;     // 药物承诺
  checkinCommitment: string;        // 打卡承诺
}

/**
 * 周总结ZKP输入
 */
export interface WeeklyProofInput {
  merkleRoot: string;         // Merkle根
  leaves: string[];           // 叶子节点（checkinCommitments）
}

/**
 * 周总结ZKP输出
 */
export interface WeeklyProofOutput {
  proof: any;                 // ZKP证明
  publicSignals: string[];    // 公开信号
  merkleRoot: string;         // Merkle根
}

// ==================== ZKP服务类 ====================

class ZKPService {
  private poseidon: any = null;
  private medicalWasmPath = '/medical.wasm';
  private medicalZkeyPath = '/medical.zkey';
  
  // BN254 曲线的字段大小（Circom 使用）
  private readonly SNARK_FIELD_SIZE = BigInt(
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'
  );

  /**
   * 初始化Poseidon哈希
   */
  private async initPoseidon() {
    if (!this.poseidon) {
      this.poseidon = await buildPoseidon();
    }
    return this.poseidon;
  }

  /**
   * 生成随机盐值（32字节）
   */
  public generateSalt(): string {
    // 使用 Web Crypto API（浏览器兼容）
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    
    // 转换为十六进制字符串
    const hexString = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // 转换为BigInt
    const saltBI = BigInt('0x' + hexString);
    
    // 🔑 关键：对字段大小取模，确保在 BN254 字段范围内
    const modded = saltBI % this.SNARK_FIELD_SIZE;
    
    return modded.toString();
  }

  /**
   * 计算Poseidon哈希
   * @param inputs - 输入数组（字符串格式的BigInt）
   * @returns Poseidon哈希值（字符串格式）
   */
  public async poseidonHash(inputs: string[]): Promise<string> {
    const poseidon = await this.initPoseidon();
    const inputsBI = inputs.map(x => BigInt(x));
    const hash = poseidon(inputsBI);
    return poseidon.F.toString(hash);
  }

  /**
   * 将以太坊地址转换为BigInt字符串
   */
  public addressToBigInt(address: string): string {
    // 移除0x前缀
    const hex = address.startsWith('0x') ? address.slice(2) : address;
    const addressBI = BigInt('0x' + hex);
    
    // 对字段大小取模（虽然以太坊地址 160 位应该在范围内，但为了保险）
    const modded = addressBI % this.SNARK_FIELD_SIZE;
    
    return modded.toString();
  }

  /**
   * 将药物代码转换为BigInt字符串
   * 如果medication_code已经是数字字符串，直接返回
   * 如果是其他格式，使用keccak256哈希后取模
   */
  public medicationCodeToBigInt(medicationCode: string): string {
    // 如果已经是纯数字字符串，直接返回
    if (/^\d+$/.test(medicationCode)) {
      return medicationCode;
    }
    
    // 使用 keccak256 哈希，然后对字段大小取模
    const hash = keccak256(toUtf8Bytes(medicationCode));
    const hashBI = BigInt(hash);
    
    // 取模以确保在字段范围内
    const modded = hashBI % this.SNARK_FIELD_SIZE;
    
    return modded.toString();
  }

  /**
   * 生成打卡commitments
   * @param userId - 用户地址
   * @param medicationCode - 药物代码
   * @param userIdSalt - 用户ID盐值
   * @param medicationSalt - 药物盐值
   * @returns commitments对象
   */
  public async generateCommitments(
    userId: string,
    medicationCode: string,
    userIdSalt: string,
    medicationSalt: string
  ): Promise<{
    userIdCommitment: string;
    medicationCommitment: string;
    checkinCommitment: string;
  }> {
    console.log('🔐 生成Commitments...');
    
    // 1. 转换输入为BigInt
    const userIdBI = this.addressToBigInt(userId);
    const medicationCodeBI = this.medicationCodeToBigInt(medicationCode);
    
    console.log('  用户地址 (BigInt):', userIdBI);
    console.log('  药物代码 (BigInt):', medicationCodeBI);
    console.log('  用户盐值:', userIdSalt);
    console.log('  药物盐值:', medicationSalt);
    
    // 2. 计算 userIdCommitment = Poseidon(userId, userIdSalt)
    const userIdCommitment = await this.poseidonHash([userIdBI, userIdSalt]);
    console.log('  userIdCommitment:', userIdCommitment);
    
    // 3. 计算 medicationCommitment = Poseidon(medicationCode, medicationSalt)
    const medicationCommitment = await this.poseidonHash([medicationCodeBI, medicationSalt]);
    console.log('  medicationCommitment:', medicationCommitment);
    
    // 4. 计算 checkinCommitment = Poseidon(userIdCommitment, medicationCommitment)
    const checkinCommitment = await this.poseidonHash([userIdCommitment, medicationCommitment]);
    console.log('  checkinCommitment:', checkinCommitment);
    
    return {
      userIdCommitment,
      medicationCommitment,
      checkinCommitment,
    };
  }

  /**
   * 生成单次打卡ZKP证明（含calldata）
   * @param input - 打卡输入数据
   * @returns ZKP证明、commitments和calldata
   */
  public async generateMedicalProof(input: MedicalProofInput): Promise<MedicalProofOutput & { calldata: string }> {
    try {
      console.log('🔐 生成单次打卡ZKP证明...');
      
      // 准备电路的原始输入值
      const privateUserSecret = this.addressToBigInt(input.userId);
      const medicationId = this.medicationCodeToBigInt(input.medicationCode);
      
      // 1. 根据电路定义生成commitments
      // 电路使用 Poseidon(1) - 单个输入，不使用盐值！
      // Line 30-32: userHasher.inputs[0] <== privateUserSecret; userHasher.out === userIdCommitment
      // Line 36-38: medHasher.inputs[0] <== medicationId; medHasher.out === medicationCommitment
      const userIdCommitment = await this.poseidonHash([privateUserSecret]);
      const medicationCommitment = await this.poseidonHash([medicationId]);
      
      console.log('🔐 生成Commitments（按电路定义）...');
      console.log('  privateUserSecret:', privateUserSecret);
      console.log('  medicationId:', medicationId);
      console.log('  userIdCommitment = Poseidon(privateUserSecret):', userIdCommitment);
      console.log('  medicationCommitment = Poseidon(medicationId):', medicationCommitment);
      
      // 2. 准备电路输入（匹配实际电路定义）
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const proofNonce = this.generateSalt();
      
      // 电路输入格式（与 medical.wasm 匹配）
      const weekStartDate = this.getWeekStartDate();
      const dayOfWeek = this.getDayOfWeek();
      
      const circuitInput = {
        privateUserSecret: privateUserSecret,
        medicationId: medicationId,
        timestamp: timestamp,
        proofNonce: proofNonce,
        userIdCommitment: userIdCommitment,
        medicationCommitment: medicationCommitment,
        weekStartDate: weekStartDate.toString(),
        dayOfWeek: dayOfWeek.toString(),
        challenge: this.generateChallenge(),
      };
      
      console.log('  电路输入详情:');
      console.log('    privateUserSecret:', privateUserSecret);
      console.log('    medicationId:', medicationId);
      console.log('    timestamp:', timestamp, '(当前Unix时间戳)');
      console.log('    proofNonce:', proofNonce);
      console.log('    userIdCommitment:', userIdCommitment);
      console.log('    medicationCommitment:', medicationCommitment);
      console.log('    weekStartDate:', weekStartDate, '(本周一00:00:00)');
      console.log('    dayOfWeek:', dayOfWeek, '(0=周一, 1=周二, ..., 6=周日)');
      
      // 验证时间范围
      const dayStartTimestamp = weekStartDate + dayOfWeek * 86400;
      const dayEndTimestamp = dayStartTimestamp + 86400;
      const timestampNum = parseInt(timestamp);
      console.log('    预期时间范围: [', dayStartTimestamp, ',', dayEndTimestamp, ')');
      console.log('    当前时间戳:', timestampNum, '在范围内:', timestampNum >= dayStartTimestamp && timestampNum < dayEndTimestamp);
      
      console.log('  完整电路输入:', JSON.stringify(circuitInput));
      
      // 3. 生成证明
      console.log('  正在生成ZKP证明...');
      const { proof, publicSignals } = await groth16.fullProve(
        circuitInput,
        this.medicalWasmPath,
        this.medicalZkeyPath
      );
      
      console.log('✅ ZKP证明生成成功');
      console.log('  公开信号:', publicSignals);
      
      // checkinCommitment 是电路的输出（第一个 publicSignal）
      // 根据电路定义，publicSignals[0] 是 checkinCommitment
      const checkinCommitment = publicSignals[0];
      console.log('  checkinCommitment (电路输出):', checkinCommitment);
      
      // 4. 生成 calldata（用于智能合约验证）
      const calldata = await this.generateCalldata(proof, publicSignals);
      console.log('  Calldata:', calldata);
      
      return {
        proof,
        publicSignals,
        userIdCommitment: userIdCommitment,
        medicationCommitment: medicationCommitment,
        checkinCommitment: checkinCommitment,
        calldata,
      };
    } catch (error: any) {
      console.error('❌ 生成ZKP证明失败:', error);
      throw new Error('生成ZKP证明失败: ' + error.message);
    }
  }

  /**
   * 生成验证智能合约所需的 calldata
   * @param proof - ZKP证明
   * @param publicSignals - 公开信号
   * @returns calldata字符串
   */
  private async generateCalldata(proof: any, publicSignals: string[]): Promise<string> {
    try {
      // 使用 snarkjs 生成 calldata
      const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
      return calldata;
    } catch (error: any) {
      console.error('❌ 生成calldata失败:', error);
      throw new Error('生成calldata失败: ' + error.message);
    }
  }

  /**
   * 获取本周开始日期的时间戳（周一 00:00:00）
   */
  private getWeekStartDate(): number {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek; // 调整到周一
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return Math.floor(monday.getTime() / 1000);
  }

  /**
   * 获取今天是本周的第几天（0=周一, 1=周二, ..., 6=周日）
   * 与电路定义的 dayOfWeek 格式匹配
   */
  private getDayOfWeek(): number {
    const now = new Date();
    const jsDay = now.getDay(); // JavaScript: 0=周日, 1=周一, ..., 6=周六
    // 转换为电路格式: 0=周一, 1=周二, ..., 6=周日
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  /**
   * 生成随机挑战值
   */
  private generateChallenge(): string {
    // 生成一个较小的随机数作为挑战（13位）
    const challenge = Math.floor(Math.random() * 1000000000000).toString();
    return challenge;
  }

  // ==================== 周总结证明由后端生成 ====================
  // 周总结证明的生成在后端通过 API 完成：POST /api/zkp/prove/weekly-summary
  // 前端只需要调用 API 并查询结果：GET /api/zkp/proof-status/:jobId
}

export const zkpService = new ZKPService();

