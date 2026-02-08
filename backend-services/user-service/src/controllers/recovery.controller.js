const recoveryService = require('../services/recovery.service');

async function startRecovery(req, res, next) {
  try {
    const { phone_number, id_card_number, email, new_owner_address } = req.body || {};

    if (!new_owner_address) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：new_owner_address',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const result = await recoveryService.startRecoveryRequest({
      phone_number,
      id_card_number,
      email,
      new_owner_address,
    });

    return res.status(200).json({
      success: true,
      message: '恢复请求已创建',
      data: result,
    });
  } catch (error) {
    const code = error?.code;
    const message = error?.message || '恢复请求创建失败';

    if (
      code === 'MISSING_IDENTITY_FIELDS' ||
      code === 'INVALID_NEW_OWNER' ||
      code === 'RECOVERY_NOT_CONFIGURED'
    ) {
      return res.status(400).json({ success: false, message, code });
    }

    if (code === 'PERSON_NOT_FOUND' || code === 'SMART_ACCOUNT_NOT_FOUND') {
      return res.status(404).json({ success: false, message, code });
    }

    if (code === 'RECOVERY_ALREADY_IN_PROGRESS') {
      return res.status(409).json({ success: false, message, code });
    }

    next(error);
  }
}

async function remindRecovery(req, res, next) {
  try {
    const { session_id, dry_run } = req.body || {};

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：session_id',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const result = await recoveryService.remindRecoveryRequest({
      session_id,
      dry_run: Boolean(dry_run),
    });

    return res.status(200).json({
      success: true,
      message: result.sent ? '已提醒守护者' : '已获取提醒限制信息',
      data: result,
    });
  } catch (error) {
    const code = error?.code;
    const message = error?.message || '提醒失败';

    if (code === 'MISSING_SESSION_ID') {
      return res.status(400).json({ success: false, message, code });
    }

    if (code === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ success: false, message, code });
    }

    if (code === 'SESSION_EXPIRED') {
      return res.status(410).json({ success: false, message, code });
    }

    if (code === 'SESSION_NO_GUARDIANS') {
      return res.status(400).json({ success: false, message, code });
    }

    if (code === 'REMIND_COOLDOWN') {
      return res.status(429).json({
        success: false,
        message,
        code,
        cooldown_remaining_seconds: error?.cooldown_remaining_seconds,
      });
    }

    if (code === 'REMIND_DAILY_LIMIT') {
      return res.status(429).json({ success: false, message, code });
    }

    next(error);
  }
}

/**
 * 查询守护者相关的恢复请求
 * GET /auth/recovery/guardian/:guardianAddress
 */
async function getGuardianRecoveryRequests(req, res, next) {
  try {
    const { guardianAddress } = req.params;

    if (!guardianAddress) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：guardianAddress',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const result = await recoveryService.getGuardianRecoveryRequests(guardianAddress);

    return res.status(200).json({
      success: true,
      message: '查询成功',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  startRecovery,
  remindRecovery,
  getGuardianRecoveryRequests,
};
