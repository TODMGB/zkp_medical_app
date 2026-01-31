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

module.exports = {
  startRecovery,
};
