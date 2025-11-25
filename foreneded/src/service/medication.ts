/**
 * 医药服务
 * 处理用药计划的创建、查询、更新等功能
 * 支持端到端加密（ECDH + AES-256-GCM）
 */

import { ethers } from 'ethers';
import { authService } from './auth';
import { buildMedicationUrl } from '@/config/api.config';

// ==================== 类型定义 ====================

/**
 * 药物信息
 */
export interface Medication {
  medication_id: number;
  medication_name: string;
  generic_name: string;
  medication_code: string; // ZKP打卡用的药物代码
  category: string;
  dosage_form: string;
  common_dosage: string;
  side_effects?: string;
  precautions?: string;
}

/**
 * 药物详情（用于用药计划）
 */
export interface MedicationDetail {
  medication_id: number;
  medication_code: string; // 药物代码（ZKP用）
  medication_name: string;
  generic_name: string;
  dosage: string; // 如 "100mg"
  frequency: string; // 如 "每日一次"
  duration: string; // 如 "90天"
  instructions: string; // 如 "早餐后服用"
  side_effects?: string;
  precautions?: string;
}

/**
 * 服药提醒
 */
export interface MedicationReminder {
  medication_code: string; // 关联药物代码（ZKP用）
  medication_name: string;
  reminder_time: string; // 如 "08:00:00"
  reminder_days: string; // 如 "everyday", "weekdays"
  reminder_message: string;
}

/**
 * 用药计划数据（加密前的明文）
 */
export interface MedicationPlanData {
  plan_name: string; // 计划名称（敏感信息）
  diagnosis: string; // 诊断（敏感信息）
  start_date: string;
  end_date: string;
  medications: MedicationDetail[]; // 药物明细（敏感信息）
  reminders: MedicationReminder[]; // 提醒设置（敏感信息）
  notes?: string; // 医嘱备注（敏感信息）
}

/**
 * 用药计划（后端存储格式）
 */
export interface MedicationPlan {
  plan_id: string;
  doctor_address: string;
  patient_address: string;
  start_date: string;
  end_date: string;
  encrypted_plan_data: string; // 加密的计划数据
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at?: string;
  plan_hash?: string;
  encryption_key_hash?: string;
}

/**
 * 创建用药计划请求
 */
export interface CreatePlanRequest {
  patient_address: string;
  start_date: string;
  end_date: string;
  encrypted_plan_data: string;
}

/**
 * 更新用药计划请求
 */
export interface UpdatePlanRequest {
  encrypted_plan_data: string;
}

// ==================== 服务类 ====================

class MedicationService {
  /**
   * 搜索常用药物
   */
  public async searchMedications(
    keyword: string,
    category?: string
  ): Promise<Medication[]> {
    try {
      const headers = await authService.getAuthHeader();
      
      // 构建查询参数
      const params = new URLSearchParams();
      if (keyword) params.append('search', keyword);
      if (category) params.append('category', category);
      
      const url = `${buildMedicationUrl('searchMedications')}?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '搜索药物失败');
      }

      const result = await response.json();
      return result.data || [];
    } catch (error: any) {
      console.error('搜索药物失败:', error);
      throw error;
    }
  }

  /**
   * 获取药物详情
   */
  public async getMedicationDetail(medicationId: number): Promise<Medication> {
    try {
      const headers = await authService.getAuthHeader();
      const url = buildMedicationUrl('getMedicationDetail', { medicationId });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '获取药物详情失败');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('获取药物详情失败:', error);
      throw error;
    }
  }

  /**
   * 创建加密的用药计划
   * @param planData - 计划明文数据
   * @param patientAddress - 患者地址
   * @param patientPublicKey - 患者公钥（用于加密）
   * @param doctorPrivateKey - 医生私钥（用于ECDH）
   */
  public async createEncryptedPlan(
    planData: MedicationPlanData,
    patientAddress: string,
    patientPublicKey: string,
    doctorPrivateKey: string
  ): Promise<MedicationPlan> {
    try {
      console.log('📝 创建用药计划...');
      console.log('  患者地址:', patientAddress);
      console.log('  计划名称:', planData.plan_name);
      console.log('  药物数量:', planData.medications.length);
      
      // 1. 使用ECDH加密计划数据
      const encryptedData = await this.encryptPlanData(
        planData,
        doctorPrivateKey,
        patientPublicKey
      );
      
      console.log('  加密数据长度:', encryptedData.length);

      // 2. 构建请求
      const requestData: CreatePlanRequest = {
        patient_address: patientAddress,
        start_date: planData.start_date,
        end_date: planData.end_date,
        encrypted_plan_data: encryptedData,
      };

      // 3. 发送到后端
      const headers = await authService.getAuthHeader();
      const url = buildMedicationUrl('createPlan');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || '创建用药计划失败');
      }

      const result = await response.json();
      console.log('后端响应:', JSON.stringify(result, null, 2));
      
      // 兼容两种响应格式：
      // 1. { data: { plan_id, ... } }  (标准格式)
      // 2. { plan_id, ... }  (直接返回)
      const plan = result.data || result;
      
      if (!plan.plan_id) {
        console.error('❌ 后端响应格式错误:', result);
        throw new Error('后端返回的数据格式不正确，缺少 plan_id');
      }
      
      console.log('✅ 用药计划创建成功:', plan.plan_id);
      return plan;
    } catch (error: any) {
      console.error('❌ 创建用药计划失败:', error);
      throw error;
    }
  }

  /**
   * 查询用药计划（返回加密数据）
   */
  public async getPlan(planId: string): Promise<MedicationPlan> {
    try {
      const headers = await authService.getAuthHeader();
      const url = buildMedicationUrl('getPlan', { planId });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || '获取用药计划失败');
      }

      const result = await response.json();
      // 兼容两种响应格式
      return result.data || result;
    } catch (error: any) {
      console.error('获取用药计划失败:', error);
      throw error;
    }
  }

  /**
   * 查询医生创建的所有计划
   */
  public async getDoctorPlans(
    doctorAddress: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ plans: MedicationPlan[]; total: number; page: number; limit: number }> {
    try {
      const headers = await authService.getAuthHeader();
      const url = `${buildMedicationUrl('getDoctorPlans', { doctorAddress })}?page=${page}&limit=${limit}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || '获取医生计划列表失败');
      }

      const result = await response.json();
      // 兼容两种响应格式
      return result.data || result;
    } catch (error: any) {
      console.error('获取医生计划列表失败:', error);
      throw error;
    }
  }

  /**
   * 更新用药计划
   */
  public async updatePlan(
    planId: string,
    planData: MedicationPlanData,
    patientPublicKey: string,
    doctorPrivateKey: string
  ): Promise<MedicationPlan> {
    try {
      console.log('📝 更新用药计划:', planId);
      
      // 1. 重新加密计划数据
      const encryptedData = await this.encryptPlanData(
        planData,
        doctorPrivateKey,
        patientPublicKey
      );

      // 2. 发送更新请求
      const headers = await authService.getAuthHeader();
      const url = buildMedicationUrl('updatePlan', { planId });
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ encrypted_plan_data: encryptedData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || '更新用药计划失败');
      }

      const result = await response.json();
      console.log('✅ 用药计划更新成功');
      
      // 兼容两种响应格式
      return result.data || result;
    } catch (error: any) {
      console.error('❌ 更新用药计划失败:', error);
      throw error;
    }
  }

  /**
   * 删除用药计划
   */
  public async deletePlan(planId: string): Promise<void> {
    try {
      const headers = await authService.getAuthHeader();
      const url = buildMedicationUrl('deletePlan', { planId });
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || '删除用药计划失败');
      }

      console.log('✅ 用药计划已删除');
    } catch (error: any) {
      console.error('❌ 删除用药计划失败:', error);
      throw error;
    }
  }

  // ==================== 加密/解密辅助方法 ====================

  /**
   * 使用ECDH派生共享密钥
   */
  private async deriveSharedSecret(privateKey: string, peerPublicKey: string): Promise<Uint8Array> {
    try {
      const wallet = new ethers.Wallet(privateKey);
      const sharedPoint = wallet.signingKey.computeSharedSecret(peerPublicKey);
      
      // 使用SHA256哈希共享点作为对称密钥
      const sharedPointBuffer = ethers.getBytes(sharedPoint);
      
      // 使用 ethers.js 的 sha256 替代 Node.js crypto
      const hash = ethers.sha256(sharedPointBuffer);
      return ethers.getBytes(hash);
    } catch (error: any) {
      console.error('派生共享密钥失败:', error);
      throw error;
    }
  }

  /**
   * 使用AES-256-GCM加密数据（Web Crypto API）
   * @returns 返回格式：iv(24字符hex) + encrypted + authTag
   */
  private async encrypt(plaintext: string, sharedSecret: Uint8Array): Promise<string> {
    try {
      // 生成随机 IV (12 bytes for GCM)
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // 导入密钥（确保类型兼容）
      const key = await crypto.subtle.importKey(
        'raw',
        sharedSecret.buffer as ArrayBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      // 加密数据
      const encodedText = new TextEncoder().encode(plaintext);
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128 // 128 bits = 16 bytes
        },
        key,
        encodedText
      );
      
      // 格式：iv(24字符hex) + encrypted+authTag
      const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
      const encryptedHex = Array.from(new Uint8Array(encryptedBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      return ivHex + encryptedHex;
    } catch (error: any) {
      console.error('加密失败:', error);
      throw error;
    }
  }

  /**
   * 使用AES-256-GCM解密数据（Web Crypto API）
   * @param encryptedData - 格式：iv(24字符hex) + encrypted + authTag
   */
  private async decrypt(encryptedData: string, sharedSecret: Uint8Array): Promise<string> {
    try {
      // 解析加密数据
      const iv = new Uint8Array(
        encryptedData.slice(0, 24).match(/.{2}/g)!.map(byte => parseInt(byte, 16))
      );
      const encryptedWithTag = new Uint8Array(
        encryptedData.slice(24).match(/.{2}/g)!.map(byte => parseInt(byte, 16))
      );
      
      // 导入密钥（确保类型兼容）
      const key = await crypto.subtle.importKey(
        'raw',
        sharedSecret.buffer as ArrayBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      // 解密数据
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128
        },
        key,
        encryptedWithTag
      );
      
      return new TextDecoder().decode(decryptedBuffer);
    } catch (error: any) {
      console.error('解密失败:', error);
      throw error;
    }
  }

  /**
   * 加密用药计划数据
   */
  public async encryptPlanData(
    planData: MedicationPlanData,
    senderPrivateKey: string,
    recipientPublicKey: string
  ): Promise<string> {
    const sharedSecret = await this.deriveSharedSecret(senderPrivateKey, recipientPublicKey);
    return await this.encrypt(JSON.stringify(planData), sharedSecret);
  }

  /**
   * 解密用药计划数据
   */
  public async decryptPlanData(
    encryptedData: string,
    receiverPrivateKey: string,
    senderPublicKey: string
  ): Promise<MedicationPlanData> {
    const sharedSecret = await this.deriveSharedSecret(receiverPrivateKey, senderPublicKey);
    const decryptedJson = await this.decrypt(encryptedData, sharedSecret);
    return JSON.parse(decryptedJson);
  }
}

export const medicationService = new MedicationService();

