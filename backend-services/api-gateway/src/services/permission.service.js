// src/services/permission.service.js
const { match } = require('path-to-regexp');
const redisClient = require('../redis/client');
const permissionEntity = require('../entity/permission.entity');

const PERMISSIONS_CACHE_KEY = 'gateway:permissions';
const CACHE_TTL = 3600; // 1 hour

async function getPermissions() {
  if (redisClient.isOpen) {
    const cachedPermissions = await redisClient.get(PERMISSIONS_CACHE_KEY);
    if (cachedPermissions) return JSON.parse(cachedPermissions);
  }

  console.log('Cache MISS for permissions. Fetching from database.');
  const permissions = await permissionEntity.findAllPermissions();

  if (redisClient.isOpen) {
    await redisClient.setEx(PERMISSIONS_CACHE_KEY, CACHE_TTL, JSON.stringify(permissions));
  }
  return permissions;
}

/**
 * 检查用户角色是否有权限访问指定路由 (安全版本)
 * @param {string[]} userRoles - 用户的角色列表
 * @param {string} requestMethod - 请求方法
 * @param {string} requestPath - 请求路径
 * @returns {Promise<boolean>}
 */
async function hasPermission(userRoles, requestMethod, requestPath) {
  const allPermissions = await getPermissions();
  // 遍历所有已定义的权限规则
  for (const perm of allPermissions) {
    const isMethodMatch = perm.http_method.toUpperCase() === requestMethod.toUpperCase();
    const pathMatcher = match(perm.path_pattern, { decode: decodeURIComponent });
    const isPathMatch = pathMatcher(requestPath);

    // 如果请求的方法和路径都匹配一条规则...
    if (isMethodMatch && isPathMatch) {
      // ...就检查用户的角色是否包含该规则所要求的角色
      if (userRoles.includes(perm.role_name)) {
        // 如果包含，则明确授权，立即返回 true
        return true;
      }
    }
  }

  // 如果遍历完所有规则，都没有找到任何一条匹配用户角色的授权规则，
  // 那么就默认拒绝。
  return false;
}

module.exports = { hasPermission };