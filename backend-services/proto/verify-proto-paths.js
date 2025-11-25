#!/usr/bin/env node

/**
 * Proto 文件路径验证脚本
 * 验证所有服务的 proto 文件引用是否正确
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

// 定义需要验证的文件和预期的 proto 路径
const filesToVerify = [
  // Servers
  {
    file: 'user-service/src/rpc/server.js',
    expectedProto: 'user_auth.proto',
    type: 'server'
  },
  {
    file: 'relationship-service/src/rpc/server.js',
    expectedProto: 'relationship.proto',
    type: 'server'
  },
  
  // Clients
  {
    file: 'user-service/src/rpc/clients/relationship.client.js',
    expectedProto: 'relationship.proto',
    type: 'client'
  },
  {
    file: 'user-service/src/rpc/clients/user.client.js',
    expectedProto: 'user.proto',
    type: 'client'
  },
  {
    file: 'notification-service/src/rpc/clients/user.client.js',
    expectedProto: 'user.proto',
    type: 'client'
  },
  {
    file: 'migration-service/src/rpc/clients/user.client.js',
    expectedProto: 'user.proto',
    type: 'client'
  },
  {
    file: 'erc4337-service/src/rpc/clients/user.client.js',
    expectedProto: 'user.proto',
    type: 'client'
  },
  {
    file: 'secure-exchange-service/src/rpc/clients/user.client.js',
    expectedProto: 'user.proto',
    type: 'client'
  },
  {
    file: 'relationship-service/src/rpc/clients/user.client.js',
    expectedProto: 'user.proto',
    type: 'client'
  },
  {
    file: 'example/src/rpc/clients/user.client.js',
    expectedProto: 'user.proto',
    type: 'client'
  }
];

// 颜色输出辅助函数
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
}

function success(message) {
  log('green', '✓', message);
}

function error(message) {
  log('red', '✗', message);
}

function info(message) {
  log('cyan', 'ℹ', message);
}

function warning(message) {
  log('yellow', '⚠', message);
}

// 验证 proto 文件是否存在
function verifyProtoFilesExist() {
  console.log('\n' + '='.repeat(70));
  console.log('📁 验证根目录 proto 文件是否存在');
  console.log('='.repeat(70));
  
  const protoFiles = ['user_auth.proto', 'relationship.proto', 'user.proto'];
  let allExist = true;
  
  protoFiles.forEach(file => {
    const filePath = path.join(projectRoot, 'proto', file);
    if (fs.existsSync(filePath)) {
      success(`${file} 存在`);
    } else {
      error(`${file} 不存在！路径: ${filePath}`);
      allExist = false;
    }
  });
  
  return allExist;
}

// 验证服务文件中的 proto 引用路径
function verifyServiceFiles() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 验证服务文件中的 proto 引用路径');
  console.log('='.repeat(70));
  
  let totalFiles = 0;
  let passedFiles = 0;
  let failedFiles = 0;
  
  filesToVerify.forEach(({ file, expectedProto, type }) => {
    totalFiles++;
    const filePath = path.join(projectRoot, file);
    
    if (!fs.existsSync(filePath)) {
      warning(`文件不存在: ${file}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 检查是否引用了根目录的 proto
    const serverPattern = /path\.join\(__dirname,\s*['"`]\.\.\/\.\.\/\.\.\/proto\/(\w+\.proto)['"`]\)/;
    const clientPattern = /path\.join\(__dirname,\s*['"`]\.\.\/\.\.\/\.\.\/\.\.\/proto\/(\w+\.proto)['"`]\)/;
    
    const pattern = type === 'server' ? serverPattern : clientPattern;
    const match = content.match(pattern);
    
    if (match && match[1] === expectedProto) {
      passedFiles++;
      success(`${file}`);
      console.log(colors.gray + `  └─ 引用: ${match[1]}` + colors.reset);
    } else if (content.includes('../proto/') || content.includes('./proto/')) {
      failedFiles++;
      error(`${file}`);
      console.log(colors.gray + `  └─ ⚠️  仍在使用旧的相对路径` + colors.reset);
    } else {
      failedFiles++;
      error(`${file}`);
      console.log(colors.gray + `  └─ ⚠️  未找到预期的 proto 引用` + colors.reset);
    }
  });
  
  return { totalFiles, passedFiles, failedFiles };
}

// 验证是否有残留的旧 proto 文件
function checkOldProtoFiles() {
  console.log('\n' + '='.repeat(70));
  console.log('🗑️  检查旧 proto 文件（可选清理）');
  console.log('='.repeat(70));
  
  const oldProtoDirs = [
    'user-service/src/rpc/proto',
    'relationship-service/src/rpc/proto',
    'notification-service/src/rpc/proto',
    'migration-service/src/rpc/proto',
    'erc4337-service/src/rpc/proto',
    'secure-exchange-service/src/rpc/proto',
    'example/src/rpc/proto'
  ];
  
  let foundOldFiles = false;
  
  oldProtoDirs.forEach(dir => {
    const dirPath = path.join(projectRoot, dir);
    if (fs.existsSync(dirPath)) {
      foundOldFiles = true;
      warning(`发现旧 proto 目录: ${dir}`);
    }
  });
  
  if (!foundOldFiles) {
    success('未发现旧 proto 目录（已清理或从未存在）');
  } else {
    info('提示: 验证新配置正常工作后，可删除这些旧目录');
  }
}

// 主函数
function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('🚀 Proto 文件路径验证工具');
  console.log('═'.repeat(70));
  
  // 步骤 1: 验证 proto 文件存在
  const protoFilesExist = verifyProtoFilesExist();
  
  if (!protoFilesExist) {
    error('\n根目录的 proto 文件不完整，请检查！');
    process.exit(1);
  }
  
  // 步骤 2: 验证服务文件引用
  const { totalFiles, passedFiles, failedFiles } = verifyServiceFiles();
  
  // 步骤 3: 检查旧文件
  checkOldProtoFiles();
  
  // 总结
  console.log('\n' + '═'.repeat(70));
  console.log('📊 验证总结');
  console.log('═'.repeat(70));
  console.log(`总文件数: ${totalFiles}`);
  success(`通过: ${passedFiles}`);
  if (failedFiles > 0) {
    error(`失败: ${failedFiles}`);
  } else {
    console.log(`${colors.gray}失败: 0${colors.reset}`);
  }
  
  if (failedFiles === 0) {
    console.log('\n' + colors.green + '✅ 所有验证通过！Proto 文件路径配置正确。' + colors.reset);
    console.log(colors.cyan + 'ℹ️  现在可以重启服务进行功能测试。' + colors.reset);
    process.exit(0);
  } else {
    console.log('\n' + colors.red + '❌ 验证失败！请检查上述错误。' + colors.reset);
    console.log(colors.cyan + 'ℹ️  参考 proto/MIGRATION_GUIDE.md 进行修复。' + colors.reset);
    process.exit(1);
  }
}

// 运行脚本
main();

