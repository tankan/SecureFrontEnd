import { EncryptionCore } from '../src/core/encryption.js';
import fs from 'fs/promises';
import crypto from 'crypto';

/**
 * 性能测试类
 * 测量加密系统的性能表现和优化效果
 */
class PerformanceTest {
  constructor() {
    this.encryption = new EncryptionCore();
    this.testResults = [];
    console.log('⚡ 启动安全前端资源加密系统性能测试...\n');
  }

  /**
   * 记录测试结果
   */
  recordTest(testName, duration, throughput = null, details = {}) {
    const result = {
      testName,
      duration: `${duration.toFixed(3)}ms`,
      throughput: throughput ? `${throughput.toFixed(2)} ops/sec` : null,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const throughputStr = throughput ? ` (${throughput.toFixed(2)} ops/sec)` : '';
    console.log(`⚡ ${testName}: ${duration.toFixed(3)}ms${throughputStr}`);
    
    if (Object.keys(details).length > 0) {
      console.log(`   详情: ${JSON.stringify(details, null, 2)}`);
    }
  }

  /**
   * 生成测试数据
   */
  generateTestData(size) {
    return crypto.randomBytes(size).toString('hex');
  }

  /**
   * 测试AES加密性能
   */
  async testAESPerformance() {
    console.log('\n🔐 测试AES加密性能...');
    
    const testSizes = [1024, 10240, 102400, 1048576]; // 1KB, 10KB, 100KB, 1MB
    const iterations = 100;
    
    for (const size of testSizes) {
      const testData = this.generateTestData(size);
      const key = this.encryption.generateFileKey(); // 使用正确的方法名
      
      // 加密性能测试
      const encryptStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await this.encryption.encryptAES(testData, key);
      }
      const encryptDuration = performance.now() - encryptStart;
      const encryptThroughput = (iterations * 1000) / encryptDuration;
      
      this.recordTest(`AES加密 (${this.formatSize(size)})`, encryptDuration, encryptThroughput, {
        dataSize: this.formatSize(size),
        iterations,
        avgPerOperation: `${(encryptDuration / iterations).toFixed(3)}ms`
      });
      
      // 解密性能测试
      const encrypted = await this.encryption.encryptAES(testData, key);
      const decryptStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await this.encryption.decryptAES(encrypted, key);
      }
      const decryptDuration = performance.now() - decryptStart;
      const decryptThroughput = (iterations * 1000) / decryptDuration;
      
      this.recordTest(`AES解密 (${this.formatSize(size)})`, decryptDuration, decryptThroughput, {
        dataSize: this.formatSize(size),
        iterations,
        avgPerOperation: `${(decryptDuration / iterations).toFixed(3)}ms`
      });
    }
  }

  /**
   * 测试量子安全加密性能
   */
  async testQuantumSafePerformance() {
    console.log('\n🛡️ 测试量子安全加密性能...');
    
    const testSizes = [1024, 10240, 102400]; // 1KB, 10KB, 100KB (量子安全加密较慢)
    const iterations = 10; // 减少迭代次数
    
    // 生成密钥对（只生成一次）
    const keyGenStart = performance.now();
    const kyberKeyPair = this.encryption.generateKyberKeyPair();
    const keyGenDuration = performance.now() - keyGenStart;
    
    this.recordTest('Kyber密钥对生成', keyGenDuration, null, {
      publicKeySize: `${Buffer.from(kyberKeyPair.publicKey, 'hex').length} bytes`,
      privateKeySize: `${Buffer.from(kyberKeyPair.privateKey, 'hex').length} bytes`
    });
    
    for (const size of testSizes) {
      const testData = this.generateTestData(size);
      
      // 量子安全加密性能测试
      const encryptStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await this.encryption.encryptQuantumSafe(testData, kyberKeyPair.publicKey);
      }
      const encryptDuration = performance.now() - encryptStart;
      const encryptThroughput = (iterations * 1000) / encryptDuration;
      
      this.recordTest(`量子安全加密 (${this.formatSize(size)})`, encryptDuration, encryptThroughput, {
        dataSize: this.formatSize(size),
        iterations,
        avgPerOperation: `${(encryptDuration / iterations).toFixed(3)}ms`
      });
      
      // 量子安全解密性能测试
      const encrypted = await this.encryption.encryptQuantumSafe(testData, kyberKeyPair.publicKey);
      const decryptStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await this.encryption.decryptQuantumSafe(encrypted, kyberKeyPair.privateKey);
      }
      const decryptDuration = performance.now() - decryptStart;
      const decryptThroughput = (iterations * 1000) / decryptDuration;
      
      this.recordTest(`量子安全解密 (${this.formatSize(size)})`, decryptDuration, decryptThroughput, {
        dataSize: this.formatSize(size),
        iterations,
        avgPerOperation: `${(decryptDuration / iterations).toFixed(3)}ms`
      });
    }
  }

  /**
   * 测试数字签名性能
   */
  async testDigitalSignaturePerformance() {
    console.log('\n✍️ 测试数字签名性能...');
    
    const iterations = 50;
    const testMessage = 'This is a test message for digital signature performance testing.';
    
    // 生成Dilithium密钥对
    const keyGenStart = performance.now();
    const dilithiumKeyPair = this.encryption.generateDilithiumKeyPair();
    const keyGenDuration = performance.now() - keyGenStart;
    
    this.recordTest('Dilithium密钥对生成', keyGenDuration, null, {
      publicKeySize: `${Buffer.from(dilithiumKeyPair.publicKey, 'hex').length} bytes`,
      privateKeySize: `${Buffer.from(dilithiumKeyPair.privateKey, 'hex').length} bytes`
    });
    
    // 签名性能测试
    const signStart = performance.now();
    let signature;
    for (let i = 0; i < iterations; i++) {
      signature = this.encryption.signQuantumSafe(testMessage, dilithiumKeyPair.privateKey);
    }
    const signDuration = performance.now() - signStart;
    const signThroughput = (iterations * 1000) / signDuration;
    
    this.recordTest('量子安全数字签名', signDuration, signThroughput, {
      messageLength: `${testMessage.length} chars`,
      iterations,
      avgPerOperation: `${(signDuration / iterations).toFixed(3)}ms`,
      signatureSize: `${signature.length} chars`
    });
    
    // 验证性能测试
    const verifyStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      this.encryption.verifyQuantumSafeSignature(testMessage, signature, dilithiumKeyPair.publicKey);
    }
    const verifyDuration = performance.now() - verifyStart;
    const verifyThroughput = (iterations * 1000) / verifyDuration;
    
    this.recordTest('量子安全签名验证', verifyDuration, verifyThroughput, {
      messageLength: `${testMessage.length} chars`,
      iterations,
      avgPerOperation: `${(verifyDuration / iterations).toFixed(3)}ms`
    });
  }

  /**
   * 测试批量处理性能
   */
  async testBatchProcessingPerformance() {
    console.log('\n📦 测试批量处理性能...');
    
    const batchSizes = [10, 50, 100];
    const dataSize = 1024; // 1KB per item
    
    for (const batchSize of batchSizes) {
      const testData = [];
      for (let i = 0; i < batchSize; i++) {
        testData.push(this.generateTestData(dataSize));
      }
      
      // 批量AES加密
      const batchStart = performance.now();
      const batchResults = await this.encryption.batchEncrypt(testData, 'aes');
      const batchDuration = performance.now() - batchStart;
      const batchThroughput = (batchSize * 1000) / batchDuration;
      
      this.recordTest(`批量AES加密 (${batchSize}项)`, batchDuration, batchThroughput, {
        batchSize,
        itemSize: this.formatSize(dataSize),
        totalSize: this.formatSize(dataSize * batchSize),
        avgPerItem: `${(batchDuration / batchSize).toFixed(3)}ms`,
        successCount: batchResults.length
      });
      
      // 批量AES解密
      const batchDecryptStart = performance.now();
      await this.encryption.batchDecrypt(batchResults, 'aes');
      const batchDecryptDuration = performance.now() - batchDecryptStart;
      const batchDecryptThroughput = (batchResults.length * 1000) / batchDecryptDuration;
      
      this.recordTest(`批量AES解密 (${batchResults.length}项)`, batchDecryptDuration, batchDecryptThroughput, {
        batchSize: batchResults.length,
        itemSize: this.formatSize(dataSize),
        avgPerItem: `${(batchDecryptDuration / batchResults.length).toFixed(3)}ms`
      });
    }
  }

  /**
   * 测试并行处理性能
   */
  async testParallelProcessingPerformance() {
    console.log('\n🔄 测试并行处理性能...');
    
    const taskCounts = [5, 10, 20];
    const testData = this.generateTestData(1024);
    
    for (const taskCount of taskCounts) {
      const tasks = [];
      for (let i = 0; i < taskCount; i++) {
        tasks.push({
          id: `task-${i}`,
          type: 'aes-encrypt',
          data: testData
        });
      }
      
      const parallelStart = performance.now();
      const parallelResults = await this.encryption.parallelProcess(tasks);
      const parallelDuration = performance.now() - parallelStart;
      const parallelThroughput = (taskCount * 1000) / parallelDuration;
      
      // 统计成功和失败的任务数量
      const successCount = parallelResults.filter(r => r.success).length;
      const failureCount = parallelResults.filter(r => !r.success).length;
      
      this.recordTest(`并行处理 (${taskCount}任务)`, parallelDuration, parallelThroughput, {
        taskCount,
        dataSize: this.formatSize(1024),
        avgPerTask: `${(parallelDuration / taskCount).toFixed(3)}ms`,
        successCount,
        failureCount
      });
    }
  }

  /**
   * 测试内存使用性能
   */
  async testMemoryPerformance() {
    console.log('\n💾 测试内存使用性能...');
    
    const initialMemory = process.memoryUsage();
    
    // 大数据加密测试
    const largeData = this.generateTestData(1048576); // 1MB
    const key = this.encryption.generateFileKey(); // 使用正确的方法名
    
    const memoryStart = performance.now();
    
    // 执行多次加密操作
    for (let i = 0; i < 10; i++) {
      await this.encryption.encryptAES(largeData, key);
    }
    
    const memoryDuration = performance.now() - memoryStart;
    const finalMemory = process.memoryUsage();
    
    const memoryIncrease = {
      rss: finalMemory.rss - initialMemory.rss,
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
      external: finalMemory.external - initialMemory.external
    };
    
    this.recordTest('内存使用性能', memoryDuration, null, {
      operations: 10,
      dataSize: this.formatSize(1048576),
      memoryIncrease: {
        rss: this.formatSize(memoryIncrease.rss),
        heapUsed: this.formatSize(memoryIncrease.heapUsed),
        heapTotal: this.formatSize(memoryIncrease.heapTotal),
        external: this.formatSize(memoryIncrease.external)
      },
      finalMemory: {
        rss: this.formatSize(finalMemory.rss),
        heapUsed: this.formatSize(finalMemory.heapUsed),
        heapTotal: this.formatSize(finalMemory.heapTotal)
      }
    });
  }

  /**
   * 格式化文件大小
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 运行所有性能测试
   */
  async runAllPerformanceTests() {
    console.log('🚀 开始运行安全前端资源加密系统性能测试\n');
    
    const totalStartTime = performance.now();
    
    await this.testAESPerformance();
    await this.testQuantumSafePerformance();
    await this.testDigitalSignaturePerformance();
    await this.testBatchProcessingPerformance();
    await this.testParallelProcessingPerformance();
    await this.testMemoryPerformance();
    
    const totalDuration = performance.now() - totalStartTime;
    this.generatePerformanceReport(totalDuration);
  }

  /**
   * 生成性能测试报告
   */
  generatePerformanceReport(totalDuration) {
    console.log('\n⚡ 性能测试报告');
    console.log('==================================================');
    
    const totalTests = this.testResults.length;
    
    console.log(`总测试数: ${totalTests}`);
    console.log(`总耗时: ${totalDuration.toFixed(3)}ms`);
    console.log(`平均每测试: ${(totalDuration / totalTests).toFixed(3)}ms\n`);
    
    console.log('性能分类统计:');
    
    // 按测试类型分组
    const categories = {
      'AES': this.testResults.filter(r => r.testName.includes('AES')),
      '量子安全': this.testResults.filter(r => r.testName.includes('量子安全') || r.testName.includes('Kyber') || r.testName.includes('Dilithium')),
      '批量处理': this.testResults.filter(r => r.testName.includes('批量')),
      '并行处理': this.testResults.filter(r => r.testName.includes('并行')),
      '内存': this.testResults.filter(r => r.testName.includes('内存'))
    };
    
    Object.entries(categories).forEach(([category, tests]) => {
      if (tests.length > 0) {
        const avgDuration = tests.reduce((sum, test) => sum + parseFloat(test.duration), 0) / tests.length;
        console.log(`${category}: ${tests.length}项测试, 平均耗时: ${avgDuration.toFixed(3)}ms`);
      }
    });
    
    console.log('\n详细性能结果:');
    this.testResults.forEach(result => {
      const throughputStr = result.throughput ? ` | ${result.throughput}` : '';
      console.log(`⚡ ${result.testName}: ${result.duration}${throughputStr}`);
    });
    
    console.log('\n📊 性能建议:');
    
    // 分析AES vs 量子安全性能
    const aesTests = categories['AES'];
    const quantumTests = categories['量子安全'];
    
    if (aesTests.length > 0 && quantumTests.length > 0) {
      const avgAES = aesTests.reduce((sum, test) => sum + parseFloat(test.duration), 0) / aesTests.length;
      const avgQuantum = quantumTests.reduce((sum, test) => sum + parseFloat(test.duration), 0) / quantumTests.length;
      const ratio = (avgQuantum / avgAES).toFixed(1);
      
      console.log(`📈 量子安全加密比AES慢约${ratio}倍，这是正常的安全性权衡`);
    }
    
    // 批量处理建议
    const batchTests = categories['批量处理'];
    if (batchTests.length > 0) {
      console.log('📦 批量处理可以显著提高大量数据的处理效率');
    }
    
    // 并行处理建议
    const parallelTests = categories['并行处理'];
    if (parallelTests.length > 0) {
      console.log('🔄 并行处理适合处理独立的加密任务');
    }
    
    console.log('\n✅ 性能测试完成');
  }
}

/**
 * 运行性能测试
 */
export async function runPerformanceTest() {
  const performanceTest = new PerformanceTest();
  await performanceTest.runAllPerformanceTests();
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runPerformanceTest().catch(console.error);
}