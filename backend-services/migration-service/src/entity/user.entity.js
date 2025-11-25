// src/entity/user.entity.js
const pool = require('./db');
/**
通过ID在数据库中查找单个用户
@param {number} id - 用户的ID
@returns {Promise<object|null>} 返回用户对象或null
*/
async function findById(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
}
/**
在数据库中创建一个新用户
@param {object} userData - 包含 username 和 email
@returns {Promise<object>} 返回新创建的用户对象
*/
async function create({ username, email }) {
    const { rows } = await pool.query(
        'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
        [username, email]
    );
    return rows[0];
}

/**
(可选) 清理测试数据的辅助函数
@param {number} id
*/
async function deleteById(id) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
}

module.exports = {
    findById,
    create,
    deleteById, // 导出用于测试清理
};