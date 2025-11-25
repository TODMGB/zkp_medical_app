// src/entity/user.entity.js
// =======================================================
// 用户实体数据访问层
// 负责处理用户相关的数据库操作
// 注：使用 smart_account 作为用户主键，eoa_address 用于签名验证
// =======================================================
const pool = require('./db');
const { v4: uuidv4 } = require('uuid');

/**
 * 通过 EOA 地址查找用户及其角色
 * 用于用户登录时验证，因为 EOA 地址可以签名
 * @param {string} eoaAddress - EOA（Externally Owned Account）地址
 * @returns {Promise<object|null>} 返回用户对象或 null
 */
async function findUserByEoaAddress(eoaAddress) {
  // 查询用户信息并聚合其所有角色（包含加密公钥）
  const query = `
    SELECT u.eoa_address, u.smart_account, u.u_id, u.username, u.is_active, 
           u.encryption_public_key, u.encryption_key_updated_at,
           array_agg(ur.role_name) as roles
    FROM users u
    LEFT JOIN user_roles ur ON u.smart_account = ur.user_address
    WHERE u.eoa_address = $1
    GROUP BY u.eoa_address, u.smart_account, u.u_id, u.username, u.is_active, 
             u.encryption_public_key, u.encryption_key_updated_at;
  `;
  const { rows } = await pool.query(query, [eoaAddress]);
  return rows[0] || null;
}

/**
 * 通过 Smart Account 地址查找用户及其角色
 * 用于注册时检查用户是否已存在，Smart Account 是用户的主键
 * @param {string} smartAccount - 智能账户地址（合约地址）
 * @returns {Promise<object|null>} 返回用户对象或 null
 */
async function findUserBySmartAccount(smartAccount) {
  // 通过 Smart Account 查询用户并聚合其角色（包含加密公钥）
  const query = `
    SELECT u.eoa_address, u.smart_account, u.u_id, u.username, u.is_active,
           u.encryption_public_key, u.encryption_key_updated_at,
           array_agg(ur.role_name) as roles
    FROM users u
    LEFT JOIN user_roles ur ON u.smart_account = ur.user_address
    WHERE u.smart_account = $1
    GROUP BY u.eoa_address, u.smart_account, u.u_id, u.username, u.is_active,
             u.encryption_public_key, u.encryption_key_updated_at;
  `;
  const { rows } = await pool.query(query, [smartAccount]);
  return rows[0] || null;
}

/**
 * 创建新用户
 * @param {object} userData - 用户数据对象
 * @param {string} userData.eoaAddress - EOA 地址（用于签名）
 * @param {string} userData.smartAccount - Smart Account 地址（主键）
 * @param {string} userData.uId - 用户唯一 ID
 * @param {string} userData.username - 用户名
 * @param {string} [userData.encryptionPublicKey] - ECIES 加密公钥（可选）
 * @returns {Promise<object>} 返回创建的用户对象
 */
async function createUser({ eoaAddress, smartAccount, uId, username, encryptionPublicKey }) {
  const query = `
    INSERT INTO users (eoa_address, smart_account, u_id, username, encryption_public_key, encryption_key_updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const timestamp = encryptionPublicKey ? new Date() : null;
  const { rows } = await pool.query(query, [
    eoaAddress, 
    smartAccount, 
    uId, 
    username, 
    encryptionPublicKey || null,
    timestamp
  ]);
  return rows[0];
}

/**
 * 为用户添加角色
 * @param {string} smartAccount - 智能账户地址（用户主键）
 * @param {string} roleName - 角色名称（如：elderly、doctor、guardian）
 * @returns {Promise<void>}
 */
async function addUserRole(smartAccount, roleName) {
  // 插入角色，如果已存在则忽略
  const query = `
    INSERT INTO user_roles (user_address, role_name)
    VALUES ($1, $2)
    ON CONFLICT (user_address, role_name) DO NOTHING;
  `;
  await pool.query(query, [smartAccount, roleName]);
}

/**
 * 更新用户的加密公钥
 * @param {string} smartAccount - 智能账户地址
 * @param {string} encryptionPublicKey - ECIES 加密公钥
 * @returns {Promise<object>} 返回更新后的用户对象
 */
async function updateEncryptionPublicKey(smartAccount, encryptionPublicKey) {
  const query = `
    UPDATE users 
    SET encryption_public_key = $1, encryption_key_updated_at = NOW()
    WHERE smart_account = $2
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [encryptionPublicKey, smartAccount]);
  return rows[0];
}

/**
 * 生成唯一的用户 ID (UUID)
 * @returns {string} 返回 UUID 字符串
 * @note 如果数据库中 u_id 是 int4 类型，需要修改表结构以支持 UUID
 */
function generateUId() {
  return uuidv4();
}

// 导出所有用户实体操作函数
module.exports = {
  findUserByEoaAddress,           // 通过 EOA 地址查找用户
  findUserBySmartAccount,         // 通过 Smart Account 查找用户
  createUser,                     // 创建新用户
  addUserRole,                    // 添加用户角色
  updateEncryptionPublicKey,      // 更新加密公钥
  generateUId,                    // 生成用户 ID
};