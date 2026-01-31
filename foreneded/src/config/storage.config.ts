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
 * 账户基础信息相关键
 */
export const ACCOUNT_KEYS = {
  /** 抽象账户基础信息（调试用） */
  INFO: 'accountInfo',
  /** Account Abstraction 部署使用的 salt */
  SALT: 'account_salt',
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
 * 交易及历史相关键
 */
export const HISTORY_KEYS = {
  /** 本地记录的交易历史 */
  TRANSACTION_HISTORY: 'transaction_history',
} as const;

/**
 * 生物识别相关键
 */
export const BIOMETRIC_KEYS = {
  /** 加密的密码 */
  ENCRYPTED_PASSWORD: 'biometric_encrypted_password',
  /** 生物识别是否启用 */
  ENABLED: 'biometric_enabled',
  /** 旧版整体生物识别配置 */
  LEGACY_DATA: 'biometric',
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

export const MEDICATION_SHARE_KEYS = {
  SHARED_PLAN_LIST: 'medication_shared_plan_list',
  SHARED_PLAN_PREFIX: 'medication_shared_plan_',
  SHARED_PLAN_OUTBOX_LIST: 'medication_shared_plan_outbox_list',
  SHARED_PLAN_OUTBOX_PREFIX: 'medication_shared_plan_outbox_',
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
  /** 周度链上记录前缀（需要拼接 weekKey，存储 calldata、proof、ipfsCid 等） */
  WEEKLY_ONCHAIN_PREFIX: 'checkin_weekly_onchain_',
  /** 周度链上记录状态（存储所有周的交易哈希、CID、时间戳） */
  WEEKLY_ONCHAIN_STATUS: 'checkin_weekly_onchain_status',
  /** 周度证明链下验证状态映射 */
  WEEKLY_VERIFICATION_STATUS: 'checkin_weekly_verification_status',
} as const;

export const CHECKIN_SHARE_KEYS = {
  SHARED_STATS_LIST: 'checkin_shared_stats_list',
  SHARED_STATS_PREFIX: 'checkin_shared_stats_',
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

export const ACCESS_GROUP_KEYS = {
  GROUP_KEY_PREFIX: 'access_group_key_',
} as const;

export const RECOVERY_KEYS = {
  PENDING: 'recovery_pending',
} as const;

/**
 * 迁移相关键
 */
export const MIGRATION_KEYS = {
  /** 迁移数据本地备份 */
  BACKUP: 'migration_backup',
  /** 迁移完成后的清理标记 */
  ACCOUNT_CLEANED: 'account_migrated_and_cleaned',
  /** 标记账号是否通过迁移导入 */
  IMPORTED_FLAG: 'account_imported_via_migration',
} as const;

/**
 * 调试相关键
 */
export const DEBUG_KEYS = {
  /** 测试读写使用 */
  TEST_ITEM: 'test',
} as const;

/**
 * 所有存储键集合（用于批量操作或调试）
 */
export const ALL_STORAGE_KEYS = {
  ...AUTH_KEYS,
  ...ACCOUNT_KEYS,
  ...WALLET_KEYS,
  ...HISTORY_KEYS,
  ...BIOMETRIC_KEYS,
  ...MEDICATION_PLAN_KEYS,
  ...MEDICATION_SHARE_KEYS,
  ...CHECKIN_KEYS,
  ...CHECKIN_SHARE_KEYS,
  ...MEMBER_KEYS,
  ...PUBLIC_KEY_KEYS,
  ...ACCESS_GROUP_KEYS,
  ...RECOVERY_KEYS,
  ...MIGRATION_KEYS,
  ...DEBUG_KEYS,
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
  
  /** 清除账户数据 */
  ACCOUNT: [
    ACCOUNT_KEYS.INFO,
    ACCOUNT_KEYS.SALT,
  ],

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
    MEDICATION_SHARE_KEYS.SHARED_PLAN_LIST,
    MEDICATION_SHARE_KEYS.SHARED_PLAN_OUTBOX_LIST,
    // 注意：PLAN_PREFIX 的键需要通过列表遍历删除
  ],
  
  /** 清除打卡数据 */
  CHECKIN: [
    CHECKIN_KEYS.RECORDS,
    CHECKIN_KEYS.STATS,
    CHECKIN_KEYS.WEEKLY_GROUPED,
    CHECKIN_KEYS.WEEKLY_PROOF_STATUS,
    CHECKIN_KEYS.WEEKLY_ONCHAIN_STATUS,
    CHECKIN_KEYS.WEEKLY_VERIFICATION_STATUS,
    CHECKIN_SHARE_KEYS.SHARED_STATS_LIST,
    // 注意：WEEKLY_PROOF_PREFIX 和 WEEKLY_ONCHAIN_PREFIX 的键需要通过列表遍历删除
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

  /** 清除迁移状态（谨慎使用） */
  MIGRATION: [
    MIGRATION_KEYS.BACKUP,
    MIGRATION_KEYS.ACCOUNT_CLEANED,
    MIGRATION_KEYS.IMPORTED_FLAG,
  ],

  /** 清除调试数据 */
  DEBUG: [
    DEBUG_KEYS.TEST_ITEM,
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
  return STORAGE_KEY_METADATA
    .filter(meta => !meta.isPrefix)
    .map(meta => meta.key);
}

/**
 * 键分类说明
 */
export const KEY_CATEGORIES = {
  AUTH: '认证相关（登录状态、用户信息）',
  ACCOUNT: '账户基础数据（Account Abstraction 定制）',
  WALLET: '钱包相关（私钥、账户地址）',
  HISTORY: '交易历史或审计记录',
  BIOMETRIC: '生物识别相关（指纹、面容）',
  MEDICATION_PLAN: '用药计划相关（计划列表、同步状态）',
  CHECKIN: '打卡记录相关（记录列表、统计数据）',
  MEMBER: '成员信息相关（成员详情、备注）',
  PUBLIC_KEY: '公钥缓存相关（加密通信公钥）',
  MIGRATION: '迁移流程相关（跨设备数据迁移）',
  DEBUG: '调试 & 测试使用',
  OTHER: '未分类或临时缓存',
} as const;

/**
 * 存储键描述
 */
export interface StorageKeyMetadata {
  key: string;
  category: keyof typeof KEY_CATEGORIES;
  description: string;
  isPrefix?: boolean;
}

export const STORAGE_KEY_METADATA: StorageKeyMetadata[] = [
  { key: AUTH_KEYS.JWT_TOKEN, category: 'AUTH', description: 'API 网关交互所需的 JWT Token' },
  { key: AUTH_KEYS.USER_INFO, category: 'AUTH', description: '当前登录用户的基础信息' },
  { key: ACCOUNT_KEYS.INFO, category: 'ACCOUNT', description: '调试使用的账号基础信息' },
  { key: ACCOUNT_KEYS.SALT, category: 'ACCOUNT', description: 'Account Abstraction 部署使用的 salt 值' },
  { key: WALLET_KEYS.EOA_PRIVATE_KEY, category: 'WALLET', description: '加密保存的 EOA 私钥' },
  { key: WALLET_KEYS.ACCOUNT_ADDRESS, category: 'WALLET', description: 'AA 智能账户地址' },
  { key: WALLET_KEYS.WALLET_STORAGE, category: 'WALLET', description: '旧版钱包整体存储数据' },
  { key: HISTORY_KEYS.TRANSACTION_HISTORY, category: 'HISTORY', description: '最近的链上交易历史记录' },
  { key: BIOMETRIC_KEYS.ENCRYPTED_PASSWORD, category: 'BIOMETRIC', description: '用于指纹/面容解锁的加密密码' },
  { key: BIOMETRIC_KEYS.ENABLED, category: 'BIOMETRIC', description: '指示是否启用生物识别' },
  { key: BIOMETRIC_KEYS.LEGACY_DATA, category: 'BIOMETRIC', description: '旧版生物识别配置数据' },
  { key: MEDICATION_PLAN_KEYS.PLAN_LIST, category: 'MEDICATION_PLAN', description: '本地缓存的用药计划索引' },
  { key: MEDICATION_PLAN_KEYS.LAST_SYNC, category: 'MEDICATION_PLAN', description: '用药计划最近一次同步时间' },
  { key: MEDICATION_PLAN_KEYS.PLAN_PREFIX, category: 'MEDICATION_PLAN', description: '单个计划详情（按 planId 存储）', isPrefix: true },
  { key: MEDICATION_SHARE_KEYS.SHARED_PLAN_LIST, category: 'MEDICATION_PLAN', description: '本地缓存的按组分发用药计划索引' },
  { key: MEDICATION_SHARE_KEYS.SHARED_PLAN_PREFIX, category: 'MEDICATION_PLAN', description: '按组分发的单个用药计划详情（按 groupId + planId 存储）', isPrefix: true },
  { key: MEDICATION_SHARE_KEYS.SHARED_PLAN_OUTBOX_LIST, category: 'MEDICATION_PLAN', description: '我方已对外分发的用药计划索引（用于重同步）' },
  { key: MEDICATION_SHARE_KEYS.SHARED_PLAN_OUTBOX_PREFIX, category: 'MEDICATION_PLAN', description: '我方对外分发的单个计划分发记录（按 groupId + planId 存储）', isPrefix: true },
  { key: CHECKIN_KEYS.RECORDS, category: 'CHECKIN', description: '原始的本地打卡记录' },
  { key: CHECKIN_KEYS.STATS, category: 'CHECKIN', description: '打卡统计数据缓存' },
  { key: CHECKIN_KEYS.WEEKLY_GROUPED, category: 'CHECKIN', description: '按周聚合的打卡概要信息' },
  { key: CHECKIN_KEYS.WEEKLY_PROOF_PREFIX, category: 'CHECKIN', description: '单周的零知识证明结果详情', isPrefix: true },
  { key: CHECKIN_KEYS.WEEKLY_PROOF_STATUS, category: 'CHECKIN', description: '所有周的证明生成状态映射' },
  { key: CHECKIN_KEYS.WEEKLY_ONCHAIN_PREFIX, category: 'CHECKIN', description: '单周的上链记录详情', isPrefix: true },
  { key: CHECKIN_KEYS.WEEKLY_ONCHAIN_STATUS, category: 'CHECKIN', description: '所有周的上链记录映射' },
  { key: CHECKIN_KEYS.WEEKLY_VERIFICATION_STATUS, category: 'CHECKIN', description: '证明链下验证结果映射' },
  { key: CHECKIN_SHARE_KEYS.SHARED_STATS_LIST, category: 'CHECKIN', description: '按组共享的打卡统计索引' },
  { key: CHECKIN_SHARE_KEYS.SHARED_STATS_PREFIX, category: 'CHECKIN', description: '按组共享的单周打卡统计详情（按 groupId + weekKey 存储）', isPrefix: true },
  { key: MEMBER_KEYS.INFO_PREFIX, category: 'MEMBER', description: '单个成员的详细信息', isPrefix: true },
  { key: MEMBER_KEYS.REMARKS, category: 'MEMBER', description: '成员备注信息' },
  { key: PUBLIC_KEY_KEYS.CACHE_PREFIX, category: 'PUBLIC_KEY', description: '收/发信公钥缓存', isPrefix: true },
  { key: ACCESS_GROUP_KEYS.GROUP_KEY_PREFIX, category: 'MEMBER', description: '访问组的组密钥（按 groupId 存储）', isPrefix: true },
  { key: MIGRATION_KEYS.BACKUP, category: 'MIGRATION', description: '迁移数据本地备份' },
  { key: MIGRATION_KEYS.ACCOUNT_CLEANED, category: 'MIGRATION', description: '标记迁移完成后是否清理' },
  { key: MIGRATION_KEYS.IMPORTED_FLAG, category: 'MIGRATION', description: '标记当前设备是否为迁移导入' },
  { key: DEBUG_KEYS.TEST_ITEM, category: 'DEBUG', description: '测试 Preferences 写入用键' },
] as const;

/**
 * 根据键名获取描述
 */
export function resolveStorageKeyMetadata(key: string): StorageKeyMetadata {
  const exact = STORAGE_KEY_METADATA.find(meta => !meta.isPrefix && meta.key === key);
  if (exact) {
    return exact;
  }

  const prefixMeta = STORAGE_KEY_METADATA.find(
    meta => meta.isPrefix && key.startsWith(meta.key)
  );

  if (prefixMeta) {
    return prefixMeta;
  }

  return {
    key,
    category: 'OTHER',
    description: '未在配置中登记的缓存项',
  };
}

// 类型导出
export type AuthKey = typeof AUTH_KEYS[keyof typeof AUTH_KEYS];
export type AccountKey = typeof ACCOUNT_KEYS[keyof typeof ACCOUNT_KEYS];
export type WalletKey = typeof WALLET_KEYS[keyof typeof WALLET_KEYS];
export type HistoryKey = typeof HISTORY_KEYS[keyof typeof HISTORY_KEYS];
export type BiometricKey = typeof BIOMETRIC_KEYS[keyof typeof BIOMETRIC_KEYS];
export type MedicationPlanKey = typeof MEDICATION_PLAN_KEYS[keyof typeof MEDICATION_PLAN_KEYS];
export type MedicationShareKey = typeof MEDICATION_SHARE_KEYS[keyof typeof MEDICATION_SHARE_KEYS];
export type CheckinKey = typeof CHECKIN_KEYS[keyof typeof CHECKIN_KEYS];
export type CheckinShareKey = typeof CHECKIN_SHARE_KEYS[keyof typeof CHECKIN_SHARE_KEYS];
export type MemberKey = typeof MEMBER_KEYS[keyof typeof MEMBER_KEYS];
export type PublicKeyKey = typeof PUBLIC_KEY_KEYS[keyof typeof PUBLIC_KEY_KEYS];
export type AccessGroupKey = typeof ACCESS_GROUP_KEYS[keyof typeof ACCESS_GROUP_KEYS];
export type MigrationKey = typeof MIGRATION_KEYS[keyof typeof MIGRATION_KEYS];
export type DebugKey = typeof DEBUG_KEYS[keyof typeof DEBUG_KEYS];
export type StorageKey = typeof ALL_STORAGE_KEYS[keyof typeof ALL_STORAGE_KEYS];

