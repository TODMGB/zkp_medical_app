const pool = require('./db');

async function findAllPermissions() {
  const query = `
    SELECT r.role_name, p.http_method, p.path_pattern
    FROM roles r
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id;
  `;
  const { rows } = await pool.query(query);
  return rows;
}

module.exports = { findAllPermissions };