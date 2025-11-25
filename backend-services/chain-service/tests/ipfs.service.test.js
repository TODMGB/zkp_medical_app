// tests/ipfs.service.test.js
// =======================================================
// IPFS 服务单元测试 - 使用 Pinata SDK
// 测试文件上传、JSON 上传、文本上传等功能
// =======================================================

const assert = require('assert');
const ipfsService = require('../src/services/ipfs.service');

// 测试配置
const TEST_TIMEOUT = 30000; // 30秒超时

/**
 * 测试套件：IPFS 服务
 */
describe('IPFS Service (Pinata SDK)', function() {
  this.timeout(TEST_TIMEOUT);

  /**
   * 测试 1: 验证 IPFS 配置
   */
  describe('Configuration', () => {
    it('should validate IPFS configuration', async function() {
      const isValid = await ipfsService.validateIPFSConfig();
      assert.strictEqual(typeof isValid, 'boolean', 'validateIPFSConfig should return boolean');
      
      if (isValid) {
        console.log('✅ IPFS 配置验证成功');
      } else {
        console.log('⚠️  IPFS 配置验证失败 - 请检查环境变量');
      }
    });
  });

  /**
   * 测试 2: 上传文本到 IPFS
   */
  describe('Text Upload', () => {
    it('should upload text content to IPFS', async function() {
      const textContent = 'Hello, IPFS! This is a test message from Pinata SDK.';
      const fileName = 'test-text.txt';
      const metadata = { type: 'test', version: '1.0' };

      try {
        const result = await ipfsService.uploadTextToIPFS(
          textContent,
          fileName,
          metadata
        );

        // 验证返回结果
        assert(result.cid, 'Result should have cid');
        assert(result.url, 'Result should have url');
        assert(result.id, 'Result should have id');
        assert(result.size, 'Result should have size');

        // 验证 CID 格式（IPFS v0 或 v1）
        // v1 格式: bafk... 或 bafy...
        // v0 格式: Qm...
        const isValidCID = /^(bafy[a-zA-Z0-9]+|bafk[a-zA-Z0-9]+|Qm[a-zA-Z0-9]{44})$/.test(result.cid);
        assert(isValidCID, `CID should be valid IPFS hash, got: ${result.cid}`);

        // 验证 URL 格式
        assert(result.url.includes('/ipfs/'), 'URL should contain /ipfs/');
        assert(result.url.includes(result.cid), 'URL should contain CID');

        console.log('✅ 文本上传成功');
        console.log(`   CID: ${result.cid}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   大小: ${result.size} bytes`);

        return result;
      } catch (error) {
        console.error('❌ 文本上传失败:', error.message);
        throw error;
      }
    });

    it('should upload text with different metadata', async function() {
      const textContent = 'Another test message with metadata';
      const fileName = 'test-metadata.txt';
      const metadata = {
        author: 'test-user',
        category: 'medical',
        timestamp: new Date().toISOString()
      };

      const result = await ipfsService.uploadTextToIPFS(
        textContent,
        fileName,
        metadata
      );

      assert(result.cid, 'Should return CID');
      console.log('✅ 带元数据的文本上传成功');
    });
  });

  /**
   * 测试 3: 上传 JSON 到 IPFS
   */
  describe('JSON Upload', () => {
    it('should upload JSON data to IPFS', async function() {
      const jsonData = {
        patientId: '12345',
        name: '张三',
        age: 65,
        medicalHistory: ['高血压', '糖尿病'],
        lastCheckup: new Date().toISOString()
      };
      const fileName = 'patient-record';
      const metadata = { type: 'medical-record', version: '1.0' };

      try {
        const result = await ipfsService.uploadJSONToIPFS(
          jsonData,
          fileName,
          metadata
        );

        // 验证返回结果
        assert(result.cid, 'Result should have cid');
        assert(result.url, 'Result should have url');
        assert(result.id, 'Result should have id');

        console.log('✅ JSON 上传成功');
        console.log(`   CID: ${result.cid}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   数据: ${JSON.stringify(jsonData)}`);

        return result;
      } catch (error) {
        console.error('❌ JSON 上传失败:', error.message);
        throw error;
      }
    });

    it('should upload complex JSON structure', async function() {
      const complexData = {
        smartAccount: '0x1234567890123456789012345678901234567890',
        guardians: [
          { address: '0xaaaa...', name: 'Guardian 1' },
          { address: '0xbbbb...', name: 'Guardian 2' }
        ],
        recoveryConfig: {
          threshold: 2,
          delay: 3600,
          enabled: true
        },
        metadata: {
          created: new Date().toISOString(),
          version: '1.0'
        }
      };

      const result = await ipfsService.uploadJSONToIPFS(
        complexData,
        'account-config'
      );

      assert(result.cid, 'Should return CID');
      console.log('✅ 复杂 JSON 上传成功');
    });
  });

  /**
   * 测试 4: 上传 Buffer 到 IPFS
   */
  describe('Buffer Upload', () => {
    it('should upload buffer content to IPFS', async function() {
      const bufferContent = Buffer.from('Binary content test data from Pinata SDK');
      const fileName = 'test-binary.bin';

      try {
        const result = await ipfsService.uploadFileToIPFS(
          bufferContent,
          fileName
        );

        assert(result.cid, 'Result should have cid');
        assert(result.url, 'Result should have url');
        assert(result.size !== undefined, 'Result should have size');

        console.log('✅ Buffer 上传成功');
        console.log(`   CID: ${result.cid}`);
        console.log(`   大小: ${result.size} bytes`);

        return result;
      } catch (error) {
        console.error('❌ Buffer 上传失败:', error.message);
        throw error;
      }
    });
  });

  /**
   * 测试 5: 错误处理
   */
  describe('Error Handling', () => {
    it('should handle invalid file content', async function() {
      try {
        // 传递无效的内容类型
        await ipfsService.uploadFileToIPFS(
          { invalid: 'object' },
          'test.txt'
        );
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert(error.message.includes('Invalid file content type'), 'Should throw correct error');
        console.log('✅ 正确处理了无效内容类型');
      }
    });

    it('should handle missing credentials gracefully', async function() {
      // 这个测试验证配置验证逻辑
      const isValid = await ipfsService.validateIPFSConfig();
      // 如果配置完整，应该返回 true；否则返回 false
      assert(typeof isValid === 'boolean', 'Should return boolean');
      console.log(`✅ 配置验证: ${isValid ? '有效' : '无效'}`);
    });
  });

  /**
   * 测试 6: 集成测试 - 完整流程
   */
  describe('Integration Tests', () => {
    it('should complete full upload workflow', async function() {
      console.log('\n📋 开始完整工作流测试...\n');

      // 步骤 1: 上传医疗记录 JSON
      console.log('步骤 1: 上传医疗记录...');
      const medicalRecord = {
        patientId: 'P001',
        name: '李四',
        age: 70,
        conditions: ['心脏病', '高血压'],
        medications: ['阿司匹林', '硝酸甘油'],
        lastVisit: new Date().toISOString()
      };

      const recordResult = await ipfsService.uploadJSONToIPFS(
        medicalRecord,
        'medical-record-001',
        { type: 'medical', priority: 'high' }
      );
      console.log(`✅ 医疗记录上传成功: ${recordResult.cid}\n`);

      // 步骤 2: 上传访问权限配置
      console.log('步骤 2: 上传访问权限配置...');
      const accessConfig = {
        smartAccount: '0x1234567890123456789012345678901234567890',
        guardians: [
          { address: '0xaaaa...', role: 'primary' },
          { address: '0xbbbb...', role: 'secondary' }
        ],
        permissions: {
          canViewMedical: true,
          canModifyGuardians: false,
          canInitiateRecovery: true
        }
      };

      const configResult = await ipfsService.uploadJSONToIPFS(
        accessConfig,
        'access-config-001'
      );
      console.log(`✅ 访问配置上传成功: ${configResult.cid}\n`);

      // 步骤 3: 上传文本备注
      console.log('步骤 3: 上传文本备注...');
      const notes = '患者状态良好，建议继续当前治疗方案。下次复查时间：2025年1月15日';
      const notesResult = await ipfsService.uploadTextToIPFS(
        notes,
        'clinical-notes-001.txt',
        { type: 'notes', doctor: 'Dr. Wang' }
      );
      console.log(`✅ 文本备注上传成功: ${notesResult.cid}\n`);

      // 验证所有上传都成功
      assert(recordResult.cid, 'Medical record should have CID');
      assert(configResult.cid, 'Config should have CID');
      assert(notesResult.cid, 'Notes should have CID');

      console.log('📊 工作流完成总结:');
      console.log(`   医疗记录 CID: ${recordResult.cid}`);
      console.log(`   访问配置 CID: ${configResult.cid}`);
      console.log(`   临床备注 CID: ${notesResult.cid}`);
      console.log('\n✅ 完整工作流测试通过！\n');
    });
  });
});

module.exports = {
  TEST_TIMEOUT
};
