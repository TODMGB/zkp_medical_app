const axios = require('axios');
const crypto = require('crypto');
const userinfoService = require('./userinfo.service');
const userEntity = require('../entity/user.entity');
const recoveryEntity = require('../entity/recovery.entity');
const mqProducer = require('../mq/producer');

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

  for (const guardianAddress of guardians) {
    await mqProducer.publishNotification({
      recipient_address: guardianAddress,
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

module.exports = {
  startRecoveryRequest,
};
