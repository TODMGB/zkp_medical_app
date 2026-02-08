const axios = require('axios');
const crypto = require('crypto');
const userinfoService = require('./userinfo.service');
const userEntity = require('../entity/user.entity');
const recoveryEntity = require('../entity/recovery.entity');
const mqProducer = require('../mq/producer');
const redisClient = require('../redis/client');

function normalizeEmail(email) {
  if (!email) return null;
  return String(email).trim().toLowerCase();
}

function normalizePhone(phone) {
  if (!phone) return null;
  return String(phone).trim();
}

function normalizeIdCard(idCard) {
  if (!idCard) return null;
  return String(idCard).trim();
}

function sha256Hex(input) {
  if (!input) return null;
  return crypto.createHash('sha256').update(String(input), 'utf8').digest('hex');
}

function isEthAddress(value) {
  if (!value) return false;
  return /^0x[0-9a-fA-F]{40}$/.test(String(value));
}

function normalizeSessionRow(row) {
  if (!row) return null;
  const guardians = Array.isArray(row.guardians)
    ? row.guardians
    : (() => {
        try {
          return JSON.parse(String(row.guardians || '[]'));
        } catch (e) {
          return [];
        }
      })();

  return {
    ...row,
    old_smart_account: String(row.old_smart_account || '').toLowerCase(),
    new_owner_address: String(row.new_owner_address || '').toLowerCase(),
    guardians: Array.isArray(guardians) ? guardians.map(a => String(a).toLowerCase()) : [],
    threshold: parseInt(String(row.threshold || '0'), 10),
  };
}

function formatDateKey(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function secondsUntilEndOfDay(d) {
  const end = new Date(d);
  end.setHours(24, 0, 0, 0);
  const diffMs = end.getTime() - d.getTime();
  const diffSec = Math.ceil(diffMs / 1000);
  return diffSec > 0 ? diffSec : 1;
}

async function getRemindLimits(sessionId) {
  const now = new Date();
  const dateKey = formatDateKey(now);
  const dailyKey = `recovery:remind:daily:${sessionId}:${dateKey}`;
  const cooldownKey = `recovery:remind:cooldown:${sessionId}`;

  const cooldownTtl = await redisClient.ttl(cooldownKey);
  const cooldownRemainingSeconds = cooldownTtl > 0 ? cooldownTtl : 0;

  const dailyUsedRaw = await redisClient.get(dailyKey);
  const dailyUsed = parseInt(String(dailyUsedRaw || '0'), 10);
  const dailyLimit = 3;
  const dailyRemaining = Math.max(0, dailyLimit - (Number.isFinite(dailyUsed) ? dailyUsed : 0));

  return {
    cooldown_seconds: 300,
    cooldown_remaining_seconds: cooldownRemainingSeconds,
    daily_limit: dailyLimit,
    daily_used: Number.isFinite(dailyUsed) ? dailyUsed : 0,
    daily_remaining: dailyRemaining,
  };
}

async function fetchGuardiansFromChain(accountAddress) {
  const CHAIN_SERVICE_URL = process.env.CHAIN_SERVICE_URL || 'http://localhost:4337';
  const url = `${CHAIN_SERVICE_URL}/guardian/${accountAddress}`;
  const response = await axios.get(url, { timeout: 30000, validateStatus: () => true });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(response.data?.message || '查询守护者失败');
  }

  if (!response.data?.success || !response.data?.data?.guardians) {
    throw new Error(response.data?.message || '查询守护者失败');
  }

  return response.data.data;
}

async function resolveOldSmartAccount({ phone_number, id_card_number, email }) {
  if (!phone_number && !id_card_number && !email) {
    const error = new Error('至少需要提供一个身份标识（phone_number、id_card_number 或 email）');
    error.code = 'MISSING_IDENTITY_FIELDS';
    throw error;
  }

  const personInfo = await userinfoService.lookupPersonInfo({
    id_card_number,
    phone_number,
    email,
  });

  if (!personInfo) {
    const error = new Error('未找到人员记录');
    error.code = 'PERSON_NOT_FOUND';
    throw error;
  }

  await userEntity.ensureIdentityBindingsTable();

  const phoneHash = sha256Hex(normalizePhone(personInfo.phone_number || phone_number));
  const emailHash = sha256Hex(normalizeEmail(email || personInfo.email));
  const idCardHash = sha256Hex(normalizeIdCard(id_card_number));

  const binding = await userEntity.findSmartAccountByIdentity({
    phoneHash,
    emailHash,
    idCardHash,
  });

  if (!binding?.smart_account) {
    const error = new Error('未找到对应账号');
    error.code = 'SMART_ACCOUNT_NOT_FOUND';
    throw error;
  }

  return {
    oldSmartAccount: String(binding.smart_account).toLowerCase(),
    personInfo,
    identityHashes: { phoneHash, emailHash, idCardHash },
  };
}

async function startRecoveryRequest({ phone_number, id_card_number, email, new_owner_address }) {
  if (!isEthAddress(new_owner_address)) {
    const error = new Error('new_owner_address 无效');
    error.code = 'INVALID_NEW_OWNER';
    throw error;
  }

  const { oldSmartAccount, personInfo, identityHashes } = await resolveOldSmartAccount({
    phone_number,
    id_card_number,
    email,
  });

  const guardianInfo = await fetchGuardiansFromChain(oldSmartAccount);

  const guardians = Array.isArray(guardianInfo.guardians)
    ? guardianInfo.guardians.map(a => String(a).toLowerCase())
    : [];
  const threshold = parseInt(String(guardianInfo.threshold || '0'), 10);

  if (guardians.length === 0 || !threshold || Number.isNaN(threshold)) {
    const error = new Error('该账号未设置守护人或阈值');
    error.code = 'RECOVERY_NOT_CONFIGURED';
    throw error;
  }

  await recoveryEntity.ensureRecoverySessionsTable();

  const existing = await recoveryEntity.findActiveSessionByOldSmartAccount(oldSmartAccount);
  if (existing) {
    if (String(existing.new_owner_address).toLowerCase() !== String(new_owner_address).toLowerCase()) {
      const error = new Error('该账号已有进行中的恢复请求');
      error.code = 'RECOVERY_ALREADY_IN_PROGRESS';
      throw error;
    }
    return {
      session_id: existing.session_id,
      old_smart_account: existing.old_smart_account,
      new_owner_address: existing.new_owner_address,
      guardians: existing.guardians,
      threshold: existing.threshold,
      status: existing.status,
      expires_at: existing.expires_at,
    };
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const session = await recoveryEntity.createRecoverySession({
    oldSmartAccount,
    newOwnerAddress: String(new_owner_address).toLowerCase(),
    guardians,
    threshold,
    status: 'REQUESTED',
    expiresAt,
    phoneHash: identityHashes.phoneHash,
    emailHash: identityHashes.emailHash,
    idCardHash: identityHashes.idCardHash,
  });

  const title = '账号恢复请求';
  const body = `${personInfo.full_name || personInfo.name || '用户'} 发起了账号恢复请求`;

  // 🔧 关键修复：将智能账户地址转换为EOA地址
  console.log('🔍 [Recovery] 开始转换守护者智能账户地址为EOA地址...');
  console.log('🔍 [Recovery] 守护者列表(智能账户):', guardians);

  for (const guardianSmartAccount of guardians) {
    try {
      // 查询守护者的EOA地址
      const guardianUser = await userEntity.findUserBySmartAccount(guardianSmartAccount);
      const guardianEOA = guardianUser ? guardianUser.eoa_address : null;

      if (!guardianEOA) {
        console.warn(`⚠️ [Recovery] 未找到守护者 ${guardianSmartAccount} 的EOA地址，将直接使用智能账户地址发送通知`);
      } else {
        console.log(`✅ [Recovery] 守护者 ${guardianSmartAccount} -> EOA ${guardianEOA}`);
      }

      await mqProducer.publishNotification({
        recipient_address: guardianSmartAccount, // ✅ 使用智能账户地址（与通知/WS系统的用户标识一致）
        title,
        body,
        type: 'recovery_requested',
        data: {
          session_id: session.session_id,
          old_smart_account: oldSmartAccount,
          new_owner_address: String(new_owner_address).toLowerCase(),
          guardians,
          threshold,
          expires_at: expiresAt.toISOString(),
          created_at: session.created_at ? new Date(session.created_at).toISOString() : new Date().toISOString(),
        },
        priority: 'high',
        channels: ['push', 'websocket'],
      });

      console.log(`✅ [Recovery] 已向守护者 ${guardianSmartAccount} 发送通知`);
    } catch (error) {
      console.error(`❌ [Recovery] 向守护者 ${guardianSmartAccount} 发送通知失败:`, error);
    }
  }

  return {
    session_id: session.session_id,
    old_smart_account: oldSmartAccount,
    new_owner_address: String(new_owner_address).toLowerCase(),
    guardians,
    threshold,
    status: session.status,
    expires_at: expiresAt.toISOString(),
  };
}

async function remindRecoveryRequest({ session_id, dry_run = false }) {
  if (!session_id) {
    const error = new Error('缺少 session_id');
    error.code = 'MISSING_SESSION_ID';
    throw error;
  }

  await recoveryEntity.ensureRecoverySessionsTable();

  const rawSession = await recoveryEntity.findSessionById(String(session_id));
  const session = normalizeSessionRow(rawSession);
  if (!session?.session_id) {
    const error = new Error('恢复会话不存在');
    error.code = 'SESSION_NOT_FOUND';
    throw error;
  }

  if (!session.expires_at || new Date(session.expires_at).getTime() <= Date.now()) {
    const error = new Error('恢复会话已过期');
    error.code = 'SESSION_EXPIRED';
    throw error;
  }

  if (!Array.isArray(session.guardians) || session.guardians.length === 0) {
    const error = new Error('该恢复会话未配置守护者');
    error.code = 'SESSION_NO_GUARDIANS';
    throw error;
  }

  const limitsBefore = await getRemindLimits(String(session.session_id));
  if (dry_run) {
    return {
      sent: false,
      session_id: session.session_id,
      ...limitsBefore,
    };
  }

  if (limitsBefore.cooldown_remaining_seconds > 0) {
    const error = new Error(`请在 ${limitsBefore.cooldown_remaining_seconds} 秒后再提醒`);
    error.code = 'REMIND_COOLDOWN';
    error.cooldown_remaining_seconds = limitsBefore.cooldown_remaining_seconds;
    throw error;
  }

  if (limitsBefore.daily_remaining <= 0) {
    const error = new Error('今日提醒次数已用完');
    error.code = 'REMIND_DAILY_LIMIT';
    throw error;
  }

  const now = new Date();
  const dateKey = formatDateKey(now);
  const dailyKey = `recovery:remind:daily:${session.session_id}:${dateKey}`;
  const cooldownKey = `recovery:remind:cooldown:${session.session_id}`;

  const usedRaw = await redisClient.get(dailyKey);
  const used = parseInt(String(usedRaw || '0'), 10);
  if (Number.isFinite(used) && used >= 3) {
    const error = new Error('今日提醒次数已用完');
    error.code = 'REMIND_DAILY_LIMIT';
    throw error;
  }

  const tx = redisClient.multi();
  tx.incr(dailyKey);
  if (!usedRaw) {
    tx.expire(dailyKey, secondsUntilEndOfDay(now));
  }
  tx.setEx(cooldownKey, 300, '1');
  await tx.exec();

  const title = '恢复请求提醒';
  const body = '您有一条待处理的账号恢复请求，请尽快确认';
  const expiresAtIso = session.expires_at ? new Date(session.expires_at).toISOString() : undefined;

  // 🔧 关键修复：将智能账户地址转换为EOA地址
  console.log('🔍 [Recovery Remind] 开始转换守护者智能账户地址为EOA地址...');
  console.log('🔍 [Recovery Remind] 守护者列表(智能账户):', session.guardians);

  for (const guardianSmartAccount of session.guardians) {
    try {
      // 查询守护者的EOA地址
      const guardianUser = await userEntity.findUserBySmartAccount(guardianSmartAccount);
      const guardianEOA = guardianUser ? guardianUser.eoa_address : null;

      if (!guardianEOA) {
        console.warn(`⚠️ [Recovery Remind] 未找到守护者 ${guardianSmartAccount} 的EOA地址，将直接使用智能账户地址发送通知`);
      } else {
        console.log(`✅ [Recovery Remind] 守护者 ${guardianSmartAccount} -> EOA ${guardianEOA}`);
      }

      await mqProducer.publishNotification({
        recipient_address: guardianSmartAccount, // ✅ 使用智能账户地址（与通知/WS系统的用户标识一致）
        title,
        body,
        type: 'recovery_requested',
        data: {
          session_id: session.session_id,
          old_smart_account: session.old_smart_account,
          new_owner_address: session.new_owner_address,
          guardians: session.guardians,
          threshold: session.threshold,
          expires_at: expiresAtIso,
          remind_at: new Date().toISOString(),
        },
        priority: 'high',
        channels: ['push', 'websocket'],
      });

      console.log(`✅ [Recovery Remind] 已向守护者 ${guardianSmartAccount} 发送提醒`);
    } catch (error) {
      console.error(`❌ [Recovery Remind] 向守护者 ${guardianSmartAccount} 发送提醒失败:`, error);
    }
  }

  const limitsAfter = await getRemindLimits(String(session.session_id));
  return {
    sent: true,
    session_id: session.session_id,
    ...limitsAfter,
  };
}

/**
 * 查询守护者相关的恢复请求
 * @param {string} guardianAddress - 守护者的智能账户地址
 * @returns {Promise<Array>} 返回恢复请求列表
 */
async function getGuardianRecoveryRequests(guardianAddress) {
  if (!guardianAddress) {
    const error = new Error('缺少 guardianAddress');
    error.code = 'MISSING_GUARDIAN_ADDRESS';
    throw error;
  }

  await recoveryEntity.ensureRecoverySessionsTable();

  console.log(`[Recovery] 查询守护者 ${guardianAddress} 的恢复请求...`);

  // 查询包含该守护者的所有恢复会话
  const sessions = await recoveryEntity.findSessionsByGuardian(guardianAddress.toLowerCase());

  console.log(`[Recovery] 找到 ${sessions.length} 个恢复请求`);

  // 格式化返回数据
  const requests = sessions.map(session => normalizeSessionRow(session));

  return {
    guardian_address: guardianAddress.toLowerCase(),
    requests,
    total: requests.length,
  };
}

module.exports = {
  startRecoveryRequest,
  remindRecoveryRequest,
  getGuardianRecoveryRequests,
};
