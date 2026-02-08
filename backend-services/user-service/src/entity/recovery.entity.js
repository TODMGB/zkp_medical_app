const pool = require('./db');
const { v4: uuidv4 } = require('uuid');

async function ensureRecoverySessionsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS account_recovery_sessions (
      session_id UUID PRIMARY KEY,
      old_smart_account VARCHAR(42) NOT NULL,
      new_owner_address VARCHAR(42) NOT NULL,
      guardians JSONB NOT NULL,
      threshold INT NOT NULL,
      status VARCHAR(32) NOT NULL,
      phone_hash VARCHAR(64),
      email_hash VARCHAR(64),
      id_card_hash VARCHAR(64),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL
    );
  `);

  await pool.query(`ALTER TABLE account_recovery_sessions ADD COLUMN IF NOT EXISTS old_smart_account VARCHAR(42);`);
  await pool.query(`ALTER TABLE account_recovery_sessions ADD COLUMN IF NOT EXISTS new_owner_address VARCHAR(42);`);
  await pool.query(`ALTER TABLE account_recovery_sessions ADD COLUMN IF NOT EXISTS guardians JSONB;`);
  await pool.query(`ALTER TABLE account_recovery_sessions ADD COLUMN IF NOT EXISTS threshold INT;`);
  await pool.query(`ALTER TABLE account_recovery_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(32);`);
  await pool.query(`ALTER TABLE account_recovery_sessions ADD COLUMN IF NOT EXISTS phone_hash VARCHAR(64);`);
  await pool.query(`ALTER TABLE account_recovery_sessions ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64);`);
  await pool.query(`ALTER TABLE account_recovery_sessions ADD COLUMN IF NOT EXISTS id_card_hash VARCHAR(64);`);
  await pool.query(`ALTER TABLE account_recovery_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
  await pool.query(`ALTER TABLE account_recovery_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);
  await pool.query(`ALTER TABLE account_recovery_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;`);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS account_recovery_sessions_old_idx ON account_recovery_sessions(old_smart_account);`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS account_recovery_sessions_status_idx ON account_recovery_sessions(status);`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS account_recovery_sessions_expires_idx ON account_recovery_sessions(expires_at);`
  );
}

async function findActiveSessionByOldSmartAccount(oldSmartAccount) {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM account_recovery_sessions
      WHERE old_smart_account = $1
        AND status IN ('PENDING', 'REQUESTED')
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1;
    `,
    [oldSmartAccount]
  );

  return rows[0] || null;
}

async function findSessionById(sessionId) {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM account_recovery_sessions
      WHERE session_id = $1
      LIMIT 1;
    `,
    [sessionId]
  );

  return rows[0] || null;
}

async function createRecoverySession({
  oldSmartAccount,
  newOwnerAddress,
  guardians,
  threshold,
  status,
  expiresAt,
  phoneHash,
  emailHash,
  idCardHash,
}) {
  const sessionId = uuidv4();

  const { rows } = await pool.query(
    `
      INSERT INTO account_recovery_sessions (
        session_id,
        old_smart_account,
        new_owner_address,
        guardians,
        threshold,
        status,
        phone_hash,
        email_hash,
        id_card_hash,
        expires_at,
        updated_at
      ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,NOW())
      RETURNING *;
    `,
    [
      sessionId,
      oldSmartAccount,
      newOwnerAddress,
      JSON.stringify(guardians),
      threshold,
      status,
      phoneHash || null,
      emailHash || null,
      idCardHash || null,
      expiresAt,
    ]
  );

  return rows[0];
}

/**
 * 查询包含指定守护者的恢复会话
 * @param {string} guardianAddress - 守护者的智能账户地址
 * @returns {Promise<Array>} 返回恢复会话列表
 */
async function findSessionsByGuardian(guardianAddress) {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM account_recovery_sessions
      WHERE guardians @> $1::jsonb
      ORDER BY created_at DESC
      LIMIT 50;
    `,
    [JSON.stringify([guardianAddress])]
  );

  return rows;
}

module.exports = {
  ensureRecoverySessionsTable,
  findActiveSessionByOldSmartAccount,
  findSessionById,
  createRecoverySession,
  findSessionsByGuardian,
};
