/**
 * 测试数据管理工具
 * 负责加载、保存和验证测试数据
 */

const fs = require('fs');
const path = require('path');

const TEST_DATA_FILE = path.join(__dirname, '../test-data.json');

/**
 * 加载测试数据
 * @returns {Object} 测试数据对象
 */
function loadTestData() {
  if (!fs.existsSync(TEST_DATA_FILE)) {
    console.log('⚠️  测试数据文件不存在，请先运行 setup-test-users.js');
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(TEST_DATA_FILE, 'utf8'));
    console.log('✅ 成功加载测试数据');
    return data;
  } catch (error) {
    console.error('❌ 加载测试数据失败:', error.message);
    return null;
  }
}

/**
 * 保存测试数据
 * @param {Object} data - 要保存的测试数据
 */
function saveTestData(data) {
  try {
    // 确保目录存在
    const dir = path.dirname(TEST_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 保存数据（格式化以便阅读）
    fs.writeFileSync(TEST_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ 测试数据已保存到:', TEST_DATA_FILE);
    return true;
  } catch (error) {
    console.error('❌ 保存测试数据失败:', error.message);
    return false;
  }
}

/**
 * 验证测试数据是否完整
 * @param {Object} data - 测试数据
 * @returns {boolean} 是否有效
 */
function validateTestData(data) {
  if (!data) return false;

  // 检查必需的字段
  const requiredFields = ['elder', 'doctor', 'family'];
  for (const field of requiredFields) {
    if (!data[field]) {
      console.error(`❌ 缺少必需字段: ${field}`);
      return false;
    }

    const user = data[field];
    if (!user.eoaAddress || !user.eoaPrivateKey || !user.smartAccount || !user.token) {
      console.error(`❌ ${field} 数据不完整`);
      return false;
    }
  }

  return true;
}

/**
 * 清除测试数据文件
 */
function clearTestData() {
  if (fs.existsSync(TEST_DATA_FILE)) {
    fs.unlinkSync(TEST_DATA_FILE);
    console.log('✅ 测试数据文件已删除');
    return true;
  }
  return false;
}

/**
 * 检查测试数据是否存在
 * @returns {boolean}
 */
function testDataExists() {
  return fs.existsSync(TEST_DATA_FILE);
}

/**
 * 获取测试数据文件路径
 * @returns {string}
 */
function getTestDataPath() {
  return TEST_DATA_FILE;
}

module.exports = {
  loadTestData,
  saveTestData,
  validateTestData,
  clearTestData,
  testDataExists,
  getTestDataPath
};

