/**
 * 本地存储键配置
 * 统一管理所有 Capacitor Preferences 使用的存储键
 * 
 * 命名规范：
 * - 使用小写字母和下划线
 * - 前缀表示功能模块
 * - 避免键名冲突
 */

/**
 * 认证相关键
 */
export const AUTH_KEYS = {
  /** JWT Token */
  JWT_TOKEN: 'jwt_token',
  /** 用户信息 */
  USER_INFO: 'user_info',
} as const;

/**
 * 账户和钱包相关键
 */
export const WALLET_KEYS = {
  /** EOA 私钥 */
  EOA_PRIVATE_KEY: 'eoa_private_key',
  /** 抽象账户地址 */
  ACCOUNT_ADDRESS: 'abstract_account_address',
  /** 钱包存储（旧版，兼容性保留） */
  WALLET_STORAGE: 'my_secure_eth_wallet',
} as const;

/**
 * 生物识别相关键
 */
export const BIOMETRIC_KEYS = {
  /** 加密的密码 */
  ENCRYPTED_PASSWORD: 'biometric_encrypted_password',
  /** 生物识别是否启用 */
  ENABLED: 'biometric_enabled',
} as const;

/**
 * 用药计划相关键
 */
export const MEDICATION_PLAN_KEYS = {
  /** 计划列表索引 */
  PLAN_LIST: 'medication_plan_list',
  /** 上次同步时间 */
  LAST_SYNC: 'medication_plan_last_sync',
  /** 计划详情前缀（需要拼接 plan_id） */
  PLAN_PREFIX: 'medication_plans_',
} as const;

/**
 * 打卡记录相关键
 */
export const CHECKIN_KEYS = {
  /** 打卡记录列表 */
  RECORDS: 'checkin_records',
  /** 打卡统计数据 */
  STATS: 'checkin_stats',
  /** 每周分组后的打卡记录缓存 */
  WEEKLY_GROUPED: 'checkin_weekly_grouped',
  /** 周度证明结果前缀（需要拼接 weekKey，如 2024-W01） */
  WEEKLY_PROOF_PREFIX: 'checkin_weekly_proof_',
  /** 周度证明生成状态（存储所有周的jobId和status） */
  WEEKLY_PROOF_STATUS: 'checkin_weekly_proof_status',
} as const;

/**
 * 成员信息相关键
 */
export const MEMBER_KEYS = {
  /** 成员信息前缀（需要拼接 address） */
  INFO_PREFIX: 'member_info_',
  /** 成员备注 */
  REMARKS: 'member_remarks',
} as const;

/**
 * 公钥缓存相关键
 */
export const PUBLIC_KEY_KEYS = {
  /** 公钥缓存前缀（需要拼接 address） */
  CACHE_PREFIX: 'public_key_cache_',
} as const;

/**
 * 所有存储键集合（用于批量操作或调试）
 */
export const ALL_STORAGE_KEYS = {
  ...AUTH_KEYS,
  ...WALLET_KEYS,
  ...BIOMETRIC_KEYS,
  ...MEDICATION_PLAN_KEYS,
  ...CHECKIN_KEYS,
  ...MEMBER_KEYS,
  ...PUBLIC_KEY_KEYS,
} as const;

/**
 * 生成带前缀的键
 * @param prefix 前缀
 * @param id 标识符
 * @returns 完整的存储键
 */
export function generateKey(prefix: string, id: string): string {
  return `${prefix}${id.toLowerCase()}`;
}

/**
 * 清除所有缓存数据（用于登出或重置）
 * 注意：此函数需要谨慎使用
 */
export const CLEAR_GROUPS = {
  /** 清除认证数据 */
  AUTH: [AUTH_KEYS.JWT_TOKEN, AUTH_KEYS.USER_INFO],
  
  /** 清除钱包数据 */
  WALLET: [
    WALLET_KEYS.EOA_PRIVATE_KEY,
    WALLET_KEYS.ACCOUNT_ADDRESS,
    WALLET_KEYS.WALLET_STORAGE,
  ],
  
  /** 清除生物识别数据 */
  BIOMETRIC: [
    BIOMETRIC_KEYS.ENCRYPTED_PASSWORD,
    BIOMETRIC_KEYS.ENABLED,
  ],
  
  /** 清除用药数据（需要额外处理前缀键） */
  MEDICATION: [
    MEDICATION_PLAN_KEYS.PLAN_LIST,
    MEDICATION_PLAN_KEYS.LAST_SYNC,
    // 注意：PLAN_PREFIX 的键需要通过列表遍历删除
  ],
  
  /** 清除打卡数据 */
  CHECKIN: [
    CHECKIN_KEYS.RECORDS,
    CHECKIN_KEYS.STATS,
    CHECKIN_KEYS.WEEKLY_GROUPED,
    CHECKIN_KEYS.WEEKLY_PROOF_STATUS,
    // 注意：WEEKLY_PROOF_PREFIX 的键需要通过列表遍历删除
  ],
  
  /** 清除成员数据（需要额外处理前缀键） */
  MEMBER: [
    MEMBER_KEYS.REMARKS,
    // 注意：INFO_PREFIX 的键需要通过列表遍历删除
  ],
  
  /** 清除公钥缓存（需要额外处理前缀键） */
  PUBLIC_KEY: [
    // 注意：CACHE_PREFIX 的键需要通过列表遍历删除
  ],
} as const;

/**
 * 键名验证
 * 检查键名是否符合命名规范
 */
export function validateKey(key: string): boolean {
  // 键名应该只包含小写字母、数字和下划线
  const pattern = /^[a-z0-9_]+$/;
  return pattern.test(key);
}

/**
 * 获取所有已定义的键（用于调试）
 */
export function getAllDefinedKeys(): string[] {
  const keys: string[] = [];
  
  // 收集所有非前缀的键
  Object.values(ALL_STORAGE_KEYS).forEach(value => {
    if (typeof value === 'string' && !value.endsWith('_')) {
      keys.push(value);
    }
  });
  
  return keys;
}

/**
 * 键分类说明
 */
export const KEY_CATEGORIES = {
  AUTH: '认证相关（登录状态、用户信息）',
  WALLET: '钱包相关（私钥、账户地址）',
  BIOMETRIC: '生物识别相关（指纹、面容）',
  MEDICATION_PLAN: '用药计划相关（计划列表、同步状态）',
  CHECKIN: '打卡记录相关（记录列表、统计数据）',
  MEMBER: '成员信息相关（成员详情、备注）',
  PUBLIC_KEY: '公钥缓存相关（加密通信公钥）',
} as const;

// 类型导出
export type AuthKey = typeof AUTH_KEYS[keyof typeof AUTH_KEYS];
export type WalletKey = typeof WALLET_KEYS[keyof typeof WALLET_KEYS];
export type BiometricKey = typeof BIOMETRIC_KEYS[keyof typeof BIOMETRIC_KEYS];
export type MedicationPlanKey = typeof MEDICATION_PLAN_KEYS[keyof typeof MEDICATION_PLAN_KEYS];
export type CheckinKey = typeof CHECKIN_KEYS[keyof typeof CHECKIN_KEYS];
export type MemberKey = typeof MEMBER_KEYS[keyof typeof MEMBER_KEYS];
export type PublicKeyKey = typeof PUBLIC_KEY_KEYS[keyof typeof PUBLIC_KEY_KEYS];
export type StorageKey = typeof ALL_STORAGE_KEYS[keyof typeof ALL_STORAGE_KEYS];

