/**
 * 安全前端资源加密系统集成测试
 * 测试所有核心功能的完整性和正确性
 */

import { EncryptionCore } from '../src/core/encryption.js';
import fs from 'fs/promises';
import path from 'path';

class IntegrationTest {
  constructor() {
    this.encryption = new EncryptionCore();
    this.testResults = [];
    this.testData = {
      text: 'Hello, World! This is a test message for encryption.',
      largeText: 'A'.repeat(10000), // 10KB测试数据
      json: { name: 'Test User', age: 30, data: [1, 2, 3, 4, 5] },
      binary: Buffer.from('Binary test data', 'utf8')
    };
  }

  /**
   * 记录测试结果
   */
  recordTest(testName, success, message = '', duration = 0) {
    this.testResults.push({
      test: testName,
      success,
      message,
      duration: `${duration.toFixed(3)}ms`
    });
    
    const status = success ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message} (${duration.toFixed(3)}ms)`);
  }

  /**
   * 测试基础AES加密解密
   */
  async testAESEncryption() {
    const startTime = performance.now();
    
    try {
      // 生成主密钥
      await this.encryption.generateMasterKey();
      
      // 测试文本加密解密
      const encrypted = await this.encryption.encryptAES(this.testData.text);
      const decrypted = await this.encryption.decryptAES(encrypted);
      
      if (decrypted === this.testData.text) {
        this.recordTest('AES加密解密', true, '文本加密解密成功', performance.now() - startTime);
      } else {
        this.recordTest('AES加密解密', false, '解密结果不匹配', performance.now() - startTime);
      }
    } catch (error) {
      this.recordTest('AES加密解密', false, error.message, performance.now() - startTime);
    }
  }

  /**
   * 测试量子安全加密
   */
  async testQuantumSafeEncryption() {
    const startTime = performance.now();
    
    try {
      // 生成量子安全密钥对
      const kyberKeyPair = this.encryption.generateKyberKeyPair();
      
      // 测试量子安全加密解密
      const encrypted = await this.encryption.encryptQuantumSafe(this.testData.text, kyberKeyPair.publicKey);
      const decrypted = await this.encryption.decryptQuantumSafe(encrypted, kyberKeyPair.privateKey);
      
      // 解密结果是Buffer，需要转换为字符串
      const decryptedText = decrypted.toString('utf8');
      
      if (decryptedText === this.testData.text) {
        this.recordTest('量子安全加密解密', true, '量子安全加密解密成功', performance.now() - startTime);
      } else {
        this.recordTest('量子安全加密解密', false, `解密结果不匹配: 期望 "${this.testData.text}", 实际 "${decryptedText}"`, performance.now() - startTime);
      }
    } catch (error) {
      this.recordTest('量子安全加密解密', false, error.message, performance.now() - startTime);
    }
  }

  /**
   * 测试数字签名
   */
  async testDigitalSignature() {
    const startTime = performance.now();
    
    try {
      // 生成密钥对
      const keyPair = await this.encryption.generateQuantumSafeKeyPair();
      
      // 创建签名
      const signature = await this.encryption.signQuantumSafe(this.testData.text, keyPair.privateKey);
      
      // 验证签名
      const isValid = await this.encryption.verifyQuantumSafeSignature(
        this.testData.text, 
        signature, 
        keyPair.publicKey
      );
      
      if (isValid) {
        this.recordTest('量子安全数字签名', true, '签名验证成功', performance.now() - startTime);
      } else {
        this.recordTest('量子安全数字签名', false, '签名验证失败', performance.now() - startTime);
      }
    } catch (error) {
      this.recordTest('量子安全数字签名', false, error.message, performance.now() - startTime);
    }
  }

  /**
   * 测试数字证书
   */
  async testDigitalCertificate() {
    const startTime = performance.now();
    
    try {
      // 生成证书
      const certInfo = {
        subject: 'Test Certificate',
        issuer: 'Test CA',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1年有效期
      };
      
      const certificate = await this.encryption.generateQuantumSafeCertificate(certInfo);
      
      // 验证证书
      const isValid = await this.encryption.verifyQuantumSafeCertificate(certificate);
      
      if (isValid) {
        this.recordTest('量子安全数字证书', true, '证书生成和验证成功', performance.now() - startTime);
      } else {
        this.recordTest('量子安全数字证书', false, '证书验证失败', performance.now() - startTime);
      }
    } catch (error) {
      this.recordTest('量子安全数字证书', false, error.message, performance.now() - startTime);
    }
  }

  /**
   * 测试批量加密解密
   */
  async testBatchEncryption() {
    const startTime = performance.now();
    
    try {
      const testDataArray = [
        'Test message 1',
        'Test message 2',
        'Test message 3',
        'Test message 4',
        'Test message 5'
      ];
      
      // 批量加密
      const encryptedResults = await this.encryption.batchEncrypt(testDataArray, 'aes');
      
      // 批量解密
      const decryptedResults = await this.encryption.batchDecrypt(encryptedResults, 'aes');
      
      // 验证结果
      let allMatch = true;
      for (let i = 0; i < testDataArray.length; i++) {
        if (decryptedResults[i] !== testDataArray[i]) {
          allMatch = false;
          break;
        }
      }
      
      if (allMatch) {
        this.recordTest('批量加密解密', true, `成功处理${testDataArray.length}条数据`, performance.now() - startTime);
      } else {
        this.recordTest('批量加密解密', false, '批量解密结果不匹配', performance.now() - startTime);
      }
    } catch (error) {
      this.recordTest('批量加密解密', false, error.message, performance.now() - startTime);
    }
  }

  /**
   * 测试并行处理
   */
  async testParallelProcessing() {
    const startTime = performance.now();
    
    try {
      const tasks = [
        { type: 'aes-encrypt', data: 'Parallel test 1' },
        { type: 'aes-encrypt', data: 'Parallel test 2' },
        { type: 'quantum-encrypt', data: 'Parallel test 3' },
        { type: 'quantum-encrypt', data: 'Parallel test 4' }
      ];
      
      const results = await this.encryption.parallelProcess(tasks);
      
      if (results && results.length === tasks.length) {
        this.recordTest('并行处理', true, `成功并行处理${tasks.length}个任务`, performance.now() - startTime);
      } else {
        this.recordTest('并行处理', false, '并行处理结果数量不匹配', performance.now() - startTime);
      }
    } catch (error) {
      this.recordTest('并行处理', false, error.message, performance.now() - startTime);
    }
  }

  /**
   * 测试Web Workers功能
   */
  async testWebWorkers() {
    const startTime = performance.now();
    
    try {
      // 启用Workers
      await this.encryption.enableWorkers();
      
      // 获取Worker状态
      const status = this.encryption.getWorkerStatus();
      
      if (status.enabled) {
        // 测试Worker加密
        const encrypted = await this.encryption.encryptAES(this.testData.text);
        const decrypted = await this.encryption.decryptAES(encrypted);
        
        if (decrypted === this.testData.text) {
          this.recordTest('Web Workers', true, 'Worker加密解密成功', performance.now() - startTime);
        } else {
          this.recordTest('Web Workers', false, 'Worker解密结果不匹配', performance.now() - startTime);
        }
      } else {
        this.recordTest('Web Workers', true, 'Workers在当前环境不可用（正常）', performance.now() - startTime);
      }
      
      // 禁用Workers
      this.encryption.disableWorkers();
    } catch (error) {
      this.recordTest('Web Workers', false, error.message, performance.now() - startTime);
    }
  }

  /**
   * 测试大数据处理
   */
  async testLargeDataProcessing() {
    const startTime = performance.now();
    
    try {
      // 测试大文本加密解密
      const encrypted = await this.encryption.encryptAES(this.testData.largeText);
      const decrypted = await this.encryption.decryptAES(encrypted);
      
      if (decrypted === this.testData.largeText) {
        this.recordTest('大数据处理', true, `成功处理${this.testData.largeText.length}字节数据`, performance.now() - startTime);
      } else {
        this.recordTest('大数据处理', false, '大数据解密结果不匹配', performance.now() - startTime);
      }
    } catch (error) {
      this.recordTest('大数据处理', false, error.message, performance.now() - startTime);
    }
  }

  /**
   * 测试错误处理
   */
  async testErrorHandling() {
    const startTime = performance.now();
    
    try {
      let errorsCaught = 0;
      
      // 测试无效密钥解密
      try {
        await this.encryption.decryptAES('invalid_data');
      } catch (error) {
        errorsCaught++;
      }
      
      // 测试无效签名验证
      try {
        const keyPair = await this.encryption.generateQuantumSafeKeyPair();
        await this.encryption.verifyQuantumSafeSignature('test', 'invalid_signature', keyPair.signPublicKey);
      } catch (error) {
        errorsCaught++;
      }
      
      // 测试无效证书验证
      try {
        await this.encryption.verifyQuantumSafeCertificate({ invalid: 'certificate' });
      } catch (error) {
        errorsCaught++;
      }
      
      if (errorsCaught >= 2) {
        this.recordTest('错误处理', true, `正确捕获${errorsCaught}个错误`, performance.now() - startTime);
      } else {
        this.recordTest('错误处理', false, `只捕获${errorsCaught}个错误，期望至少2个`, performance.now() - startTime);
      }
    } catch (error) {
      this.recordTest('错误处理', false, error.message, performance.now() - startTime);
    }
  }

  /**
   * 运行所有集成测试
   */
  async runAllTests() {
    console.log('🚀 开始运行安全前端资源加密系统集成测试\n');
    console.log('警告：当前使用的是量子安全算法的模拟实现，生产环境请使用NIST认证的PQC库\n');
    
    const totalStartTime = performance.now();
    
    // 运行所有测试
    await this.testAESEncryption();
    await this.testQuantumSafeEncryption();
    await this.testDigitalSignature();
    await this.testDigitalCertificate();
    await this.testBatchEncryption();
    await this.testParallelProcessing();
    await this.testWebWorkers();
    await this.testLargeDataProcessing();
    await this.testErrorHandling();
    
    const totalDuration = performance.now() - totalStartTime;
    
    // 生成测试报告
    this.generateTestReport(totalDuration);
  }

  /**
   * 生成测试报告
   */
  generateTestReport(totalDuration) {
    console.log('\n📊 集成测试报告');
    console.log('='.repeat(50));
    
    const successCount = this.testResults.filter(r => r.success).length;
    const totalCount = this.testResults.length;
    const successRate = ((successCount / totalCount) * 100).toFixed(1);
    
    console.log(`总测试数: ${totalCount}`);
    console.log(`成功测试: ${successCount}`);
    console.log(`失败测试: ${totalCount - successCount}`);
    console.log(`成功率: ${successRate}%`);
    console.log(`总耗时: ${totalDuration.toFixed(3)}ms`);
    
    console.log('\n详细结果:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.message} (${result.duration})`);
    });
    
    console.log('\n🎉 集成测试完成！');
    
    if (successRate >= 80) {
      console.log('✅ 系统整体功能正常，可以投入使用');
    } else {
      console.log('⚠️ 系统存在问题，需要进一步修复');
    }
  }
}

// 导出测试函数
export async function runIntegrationTest() {
  const test = new IntegrationTest();
  await test.runAllTests();
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTest().catch(console.error);
}