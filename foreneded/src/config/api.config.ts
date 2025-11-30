/**
 * API配置文件
 * 集中管理所有后端服务地址
 */

// 后端服务器配置
const BACKEND_IP = '192.168.20.192'; // 可以修改为实际后端IP
const API_GATEWAY_PORT = 3000;

// API Gateway 基础地址
export const API_GATEWAY_URL = `http://${BACKEND_IP}:${API_GATEWAY_PORT}/api`;

// RPC节点配置
export const RPC_CONFIG = {
  url: `http://${BACKEND_IP}:8545`,
  chainId: 887766, // 本地开发链ID
};

// 用户信息服务配置（通过API Gateway）
export const USER_INFO_CONFIG = {
  baseUrl: API_GATEWAY_URL,
  endpoints: {
    lookup: '/userinfo/api/persons/lookup',
  },
};

// 认证服务配置（通过API Gateway）
export const AUTH_CONFIG = {
  baseUrl: API_GATEWAY_URL,
  endpoints: {
    register: '/auth/register',
    login: '/auth/login',
  },
};

// Chain服务配置（通过API Gateway）
export const ERC4337_CONFIG = {
  baseUrl: API_GATEWAY_URL,
  endpoints: {
    // 健康检查
    health: '/chain/health',


    // 账户管理
    createAccount: '/chain/account',
    calculateAccountAddress: '/chain/account/address',
    buildInitCode: '/chain/account/initcode',
    getAccountInfo: '/chain/account/:accountAddress',
    getNonce: '/chain/account/:accountAddress/nonce',

    // 守护者管理
    buildAddGuardian: '/chain/guardian/build',
    addGuardian: '/chain/guardian',
    getGuardians: '/chain/guardian/:accountAddress',
    buildSetThreshold: '/chain/guardian/threshold/build',
    setThreshold: '/chain/guardian/threshold',
    submitUserOp: '/chain/guardian/submit',

    // 社交恢复
    buildInitiateRecovery: '/chain/recovery/initiate/build',
    initiateRecovery: '/chain/recovery/initiate',
    buildSupportRecovery: '/chain/recovery/support/build',
    supportRecovery: '/chain/recovery/support',
    buildCancelRecovery: '/chain/recovery/cancel/build',
    cancelRecovery: '/chain/recovery/cancel',
    submitRecoveryUserOp: '/chain/recovery/submit',
    getRecoveryStatus: '/chain/recovery/status/:accountAddress',
  },
};

// 关系管理服务配置（通过API Gateway）
export const RELATION_CONFIG = {
  baseUrl: API_GATEWAY_URL,
  endpoints: {
    // 访问组管理
    createGroup: '/relation/access-groups',
    listGroups: '/relation/access-groups',
    groupsStats: '/relation/access-groups/stats',
    getGroupMembers: '/relation/access-groups/:accessGroupId/members',

    // 邀请管理
    createInvitation: '/relation/invitations',
    createHospitalInvitation: '/relation/invitations/hospital',
    getMyInvitations: '/relation/invitations/my',
    cancelInvitation: '/relation/invitations/cancel',

    // 关系管理
    acceptInvitation: '/relation/relationships/accept',
    getMyRelationships: '/relation/relationships/my',  // 获取我作为访问者的关系列表
    suspendRelationship: '/relation/relationships/:relationshipId/suspend',
    resumeRelationship: '/relation/relationships/:relationshipId/resume',
    revokeRelationship: '/relation/relationships/:relationshipId',
  },
};

// 账户迁移服务配置（通过API Gateway）
export const MIGRATION_CONFIG = {
  baseUrl: API_GATEWAY_URL,
  endpoints: {
    health: '/migration/health',
    createSession: '/migration/create',
    getSession: '/migration/session/:migrationId',
    verifyCode: '/migration/verify',
    confirmMigration: '/migration/confirm',
    getStatus: '/migration/status/:migrationId',
    cleanupSessions: '/migration/cleanup',
    getAllSessions: '/migration/sessions',
    // 新增：数据上传下载接口 🆕
    uploadData: '/migration/upload',
    downloadData: '/migration/download/:migrationId',
  },
};

// 通知服务配置（通过API Gateway）
export const NOTIFICATION_CONFIG = {
  baseUrl: API_GATEWAY_URL,
  wsUrl: `ws://${BACKEND_IP}:${API_GATEWAY_PORT}/ws/notification`,
  endpoints: {
    getNotifications: '/notification/notifications',
    getUnreadCount: '/notification/notifications/unread/count',
    markAsRead: '/notification/notifications/:notificationId/read',
    markAllRead: '/notification/notifications/read-all',
    deleteNotification: '/notification/notifications/:notificationId',
  },
};

// 医药服务配置（通过API Gateway）
export const MEDICATION_CONFIG = {
  baseUrl: API_GATEWAY_URL,
  endpoints: {
    searchMedications: '/medication/medications/search',
    getMedicationDetail: '/medication/medications/:medicationId',
    createPlan: '/medication/plans',
    getPlan: '/medication/plans/:planId',
    getDoctorPlans: '/medication/plans/doctor/:doctorAddress',
    updatePlan: '/medication/plans/:planId',
    deletePlan: '/medication/plans/:planId',
  },
};

// 安全交换服务配置（通过API Gateway）
export const SECURE_EXCHANGE_CONFIG = {
  baseUrl: API_GATEWAY_URL,
  wsUrl: `ws://${BACKEND_IP}:${API_GATEWAY_PORT}/ws/secure-exchange`,
  endpoints: {
    getRecipientPublicKey: '/secure-exchange/recipient-pubkey/:recipientAddress',
    sendEncryptedData: '/secure-exchange/send',
    getPendingMessages: '/secure-exchange/pending',
    acknowledgeMessage: '/secure-exchange/acknowledge',
  },
};

// API服务配置（兼容旧代码）
export const API_CONFIG = {
  baseUrl: API_GATEWAY_URL,
  endpoints: {
    // 健康检查
    health: '/health',

    // Chain相关（兼容旧代码）
    getAccountAddress: '/chain/account/address',
    buildInitCode: '/chain/account/initcode',
    getNonce: '/chain/account/:accountAddress/nonce',
    submit: '/chain/guardian/submit',
  },
};

/**
 * 通用URL构建辅助函数
 */
function buildUrlFromConfig(
  baseUrl: string,
  endpoint: string,
  params?: Record<string, string | number>
): string {
  let url = `${baseUrl}${endpoint}`;

  if (params) {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    url += `?${queryString}`;
  }

  return url;
}

/**
 * ERC4337服务URL构建函数
 */
export function buildERC4337Url(
  endpoint: keyof typeof ERC4337_CONFIG.endpoints,
  params?: Record<string, string | number>
): string {
  return buildUrlFromConfig(
    ERC4337_CONFIG.baseUrl,
    ERC4337_CONFIG.endpoints[endpoint],
    params
  );
}

/**
 * 认证服务URL构建函数
 */
export function buildAuthUrl(
  endpoint: keyof typeof AUTH_CONFIG.endpoints,
  params?: Record<string, string | number>
): string {
  return buildUrlFromConfig(
    AUTH_CONFIG.baseUrl,
    AUTH_CONFIG.endpoints[endpoint],
    params
  );
}

/**
 * 用户信息服务URL构建函数
 */
export function buildUserInfoUrl(
  endpoint: keyof typeof USER_INFO_CONFIG.endpoints,
  params?: Record<string, string | number>
): string {
  return buildUrlFromConfig(
    USER_INFO_CONFIG.baseUrl,
    USER_INFO_CONFIG.endpoints[endpoint],
    params
  );
}

/**
 * 关系管理服务URL构建函数
 */
export function buildRelationUrl(
  endpoint: keyof typeof RELATION_CONFIG.endpoints,
  params?: Record<string, string | number>
): string {
  return buildUrlFromConfig(
    RELATION_CONFIG.baseUrl,
    RELATION_CONFIG.endpoints[endpoint],
    params
  );
}

/**
 * 账户迁移服务URL构建函数
 */
export function buildMigrationUrl(
  endpoint: keyof typeof MIGRATION_CONFIG.endpoints,
  params?: Record<string, string | number>
): string {
  return buildUrlFromConfig(
    MIGRATION_CONFIG.baseUrl,
    MIGRATION_CONFIG.endpoints[endpoint],
    params
  );
}

/**
 * 通知服务URL构建函数
 */
export function buildNotificationUrl(
  endpoint: keyof typeof NOTIFICATION_CONFIG.endpoints,
  params?: Record<string, string | number>
): string {
  return buildUrlFromConfig(
    NOTIFICATION_CONFIG.baseUrl,
    NOTIFICATION_CONFIG.endpoints[endpoint],
    params
  );
}

/**
 * 医药服务URL构建函数
 */
export function buildMedicationUrl(
  endpoint: keyof typeof MEDICATION_CONFIG.endpoints,
  params?: Record<string, string | number>
): string {
  let url = `${MEDICATION_CONFIG.baseUrl}${MEDICATION_CONFIG.endpoints[endpoint]}`;

  // 处理路径参数
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }

  return url;
}

/**
 * 安全交换服务URL构建函数
 */
export function buildSecureExchangeUrl(
  endpoint: keyof typeof SECURE_EXCHANGE_CONFIG.endpoints,
  params?: Record<string, string | number>
): string {
  let url = `${SECURE_EXCHANGE_CONFIG.baseUrl}${SECURE_EXCHANGE_CONFIG.endpoints[endpoint]}`;

  // 处理路径参数
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }

  return url;
}

/**
 * API服务URL构建函数（兼容旧代码）
 * @deprecated 建议使用具体的构建函数如 buildERC4337Url
 */
export function getApiUrl(endpoint: keyof typeof API_CONFIG.endpoints): string {
  return `${API_CONFIG.baseUrl}${API_CONFIG.endpoints[endpoint]}`;
}

/**
 * 构建带查询参数的URL（兼容旧代码）
 * @deprecated 建议使用具体的构建函数如 buildERC4337Url
 */
export function buildUrl(endpoint: keyof typeof API_CONFIG.endpoints, params?: Record<string, string | number>): string {
  let url = getApiUrl(endpoint);

  if (params) {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    url += `?${queryString}`;
  }

  return url;
}

// 导出常用配置
export const BACKEND_CONFIG = {
  ip: BACKEND_IP,
  rpc: RPC_CONFIG,
  api: API_CONFIG,
};

export default BACKEND_CONFIG;

