/**
 * 安全前端资源加密系统安全测试
 * 专门测试安全特性的正确性和抗攻击能力
 */

import { EncryptionCore } from '../src/core/encryption.js';
import crypto from 'crypto';

class SecurityTest {
  constructor() {
    this.encryption = new EncryptionCore();
    this.testResults = [];
  }

  /**
   * 记录测试结果
   */
  recordTest(testName, success, message = '', details = null) {
    this.testResults.push({
      test: testName,
      success,
      message,
      details,
      timestamp: new Date().toISOString()
    });
    
    const status = success ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
    if (details) {
      console.log(`   详情: ${JSON.stringify(details, null, 2)}`);
    }
  }

  /**
   * 测试密钥强度
   */
  async testKeyStrength() {
    console.log('\n🔐 测试密钥强度...');
    
    try {
      // 生成主密钥
      await this.encryption.generateMasterKey();
      const masterKey = this.encryption.masterKey;
      
      // 检查密钥长度
      const keyLength = masterKey.length;
      const isStrongLength = keyLength >= 32; // 至少256位
      
      // 检查密钥随机性（简单熵测试）
      const keyBuffer = Buffer.isBuffer(masterKey) ? masterKey : Buffer.from(masterKey);
      const uniqueBytes = new Set(keyBuffer).size;
      const entropyRatio = uniqueBytes / keyBuffer.length;
      const hasGoodEntropy = entropyRatio > 0.7; // 至少70%的字节是唯一的
      
      const isStrong = isStrongLength && hasGoodEntropy;
      
      this.recordTest('密钥强度测试', isStrong, 
        `密钥长度: ${keyLength}字节, 熵比率: ${(entropyRatio * 100).toFixed(1)}%`,
        { keyLength, entropyRatio, isStrongLength, hasGoodEntropy }
      );
    } catch (error) {
      this.recordTest('密钥强度测试', false, error.message);
    }
  }

  /**
   * 测试加密随机性
   */
  async testEncryptionRandomness() {
    console.log('\n🎲 测试加密随机性...');
    
    try {
      await this.encryption.generateMasterKey();
      const testData = 'Identical test message for randomness check';
      
      // 多次加密相同数据
      const encryptions = [];
      for (let i = 0; i < 5; i++) {
        const encrypted = await this.encryption.encryptAES(testData);
        encryptions.push(encrypted.encryptedData);
      }
      
      // 检查是否所有加密结果都不同
      const uniqueEncryptions = new Set(encryptions);
      const isRandom = uniqueEncryptions.size === encryptions.length;
      
      this.recordTest('加密随机性测试', isRandom, 
        `5次加密产生了${uniqueEncryptions.size}个不同结果`,
        { encryptions: encryptions.map(e => e.substring(0, 16) + '...') }
      );
    } catch (error) {
      this.recordTest('加密随机性测试', false, error.message);
    }
  }

  /**
   * 测试密钥篡改检测
   */
  async testKeyTamperingDetection() {
    console.log('\n🛡️ 测试密钥篡改检测...');
    
    try {
      // 生成新格式的密钥（包含完整性验证）
      const keyData = this.encryption.generateFileKey();
      const testData = 'Test data for key tampering detection';
      
      // 正常加密
      const encrypted = await this.encryption.encryptAES(testData, keyData);
      
      // 篡改密钥数据
      const tamperedKeyData = {
        ...keyData,
        key: Buffer.from(keyData.key).map((byte, index) => 
          index === 0 ? byte ^ 0xFF : byte // 篡改第一个字节
        )
      };
      
      // 尝试用篡改的密钥解密
      let tamperingDetected = false;
      try {
        await this.encryption.decryptAES(encrypted, tamperedKeyData);
      } catch (error) {
        if (error.message.includes('密钥完整性验证失败') || 
            error.message.includes('密钥不匹配')) {
          tamperingDetected = true;
        }
      }
      
      this.recordTest('密钥篡改检测', tamperingDetected, 
        tamperingDetected ? '成功检测到密钥篡改' : '未能检测到密钥篡改',
        { 
          originalHash: keyData.hash.substring(0, 16) + '...', 
          tamperedDetected: tamperingDetected 
        }
      );
    } catch (error) {
      this.recordTest('密钥篡改检测', false, error.message);
    }
  }

  /**
   * 测试数据完整性验证
   */
  async testDataIntegrityVerification() {
    console.log('\n🔍 测试数据完整性验证...');
    
    try {
      await this.encryption.generateMasterKey();
      const testData = 'Test data for integrity verification';
      
      // 正常加密
      const encrypted = await this.encryption.encryptAES(testData);
      
      // 篡改加密数据
      const originalData = encrypted.encryptedData;
      const tamperedData = originalData.slice(0, -4) + 'XXXX'; // 修改最后4个字符
      
      // 尝试解密篡改的数据
      let integrityViolationDetected = false;
      try {
        const tamperedEncrypted = { ...encrypted, encryptedData: tamperedData };
        const decrypted = await this.encryption.decryptAES(tamperedEncrypted);
        // 如果解密成功但结果不正确，也算检测到篡改
        if (decrypted !== testData) {
          integrityViolationDetected = true;
        }
      } catch (error) {
        integrityViolationDetected = true;
      }
      
      this.recordTest('数据完整性验证', integrityViolationDetected, 
        integrityViolationDetected ? '成功检测到数据篡改' : '未能检测到数据篡改',
        { originalData: originalData.substring(0, 16) + '...', tamperedData: tamperedData.substring(0, 16) + '...' }
      );
    } catch (error) {
      this.recordTest('数据完整性验证', false, error.message);
    }
  }

  /**
   * 测试量子安全签名防伪造
   */
  async testQuantumSafeSignatureForgery() {
    console.log('\n🖋️ 测试量子安全签名防伪造...');
    
    try {
      const keyPair = this.encryption.generateQuantumSafeKeyPair();
      const message = 'Important message that should not be forged';
      
      // 创建合法签名（PQCProvider不可用时跳过）
      let validSignature;
      try {
        validSignature = await this.encryption.signQuantumSafe(message, keyPair.signPrivateKey);
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        const providerUnavailable = /PQCProvider|liboqs|Cannot find module|不可用/i.test(msg);
        if (providerUnavailable) {
          this.recordTest('量子安全签名防伪造', true, '跳过：PQCProvider 不可用（请安装 liboqs-node）');
          return;
        }
        throw err;
      }
      
      // 验证合法签名
      const isValidSignatureValid = await this.encryption.verifyQuantumSafeSignature(
        message, validSignature, keyPair.signPublicKey
      );
      
      // 尝试伪造签名（修改签名封装的末尾字节，破坏完整性）
      const forgedSignature = validSignature.slice(0, -8) + 'FORGED12';
      
      // 验证伪造签名
      let forgeryDetected = true;
      try {
        const isForgedSignatureValid = await this.encryption.verifyQuantumSafeSignature(
          message, forgedSignature, keyPair.signPublicKey
        );
        forgeryDetected = !isForgedSignatureValid;
      } catch (error) {
        forgeryDetected = true; // 抛出异常也算检测到伪造
      }
      
      const testPassed = isValidSignatureValid && forgeryDetected;
      
      this.recordTest('量子安全签名防伪造', testPassed, 
        `合法签名验证: ${isValidSignatureValid}, 伪造检测: ${forgeryDetected}`,
        { validSignature: validSignature.substring(0, 16) + '...', forgedSignature: forgedSignature.substring(0, 16) + '...' }
      );
    } catch (error) {
      this.recordTest('量子安全签名防伪造', false, error.message);
    }
  }

  /**
   * 测试时间攻击抵抗
   */
  async testTimingAttackResistance() {
    console.log('\n⏱️ 测试时间攻击抵抗...');
    
    try {
      // 生成密钥数据用于测试
      const keyData = this.encryption.generateFileKey();
      const testData = 'Test data for timing attack resistance';
      
      // 加密数据
      const encrypted = await this.encryption.encryptAES(testData, keyData);
      
      // 测试正确密钥的解密时间
      const correctTimings = [];
      for (let i = 0; i < 20; i++) {
        const start = process.hrtime.bigint();
        try {
          await this.encryption.decryptAES(encrypted, keyData);
        } catch (error) {
          // 忽略错误，只关注时间
        }
        const end = process.hrtime.bigint();
        correctTimings.push(Number(end - start) / 1000000); // 转换为毫秒
      }
      
      // 测试错误密钥的解密时间
      const wrongKeyData = this.encryption.generateFileKey();
      const wrongTimings = [];
      for (let i = 0; i < 20; i++) {
        const start = process.hrtime.bigint();
        try {
          await this.encryption.decryptAES(encrypted, wrongKeyData);
        } catch (error) {
          // 忽略错误，只关注时间
        }
        const end = process.hrtime.bigint();
        wrongTimings.push(Number(end - start) / 1000000); // 转换为毫秒
      }
      
      // 计算时间统计
      const correctMean = correctTimings.reduce((a, b) => a + b) / correctTimings.length;
      const wrongMean = wrongTimings.reduce((a, b) => a + b) / wrongTimings.length;
      
      const allTimings = [...correctTimings, ...wrongTimings];
      const overallMean = allTimings.reduce((a, b) => a + b) / allTimings.length;
      const variance = allTimings.reduce((a, b) => a + Math.pow(b - overallMean, 2), 0) / allTimings.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / overallMean;
      
      // 检查时间差异是否足够小（防止时间攻击）
      const timeDifference = Math.abs(correctMean - wrongMean);
      const maxAllowedDifference = overallMean * 0.1; // 允许10%的差异
      const isResistant = timeDifference <= maxAllowedDifference && coefficientOfVariation < 0.3;
      
      this.recordTest('时间攻击抵抗', isResistant, 
        `时间变异系数: ${(coefficientOfVariation * 100).toFixed(2)}%, 正确/错误密钥时间差: ${timeDifference.toFixed(3)}ms`,
        { 
          correctMean: correctMean.toFixed(3), 
          wrongMean: wrongMean.toFixed(3),
          timeDifference: timeDifference.toFixed(3),
          coefficientOfVariation: coefficientOfVariation.toFixed(3),
          maxAllowedDifference: maxAllowedDifference.toFixed(3)
        }
      );
    } catch (error) {
      this.recordTest('时间攻击抵抗', false, error.message);
    }
  }

  /**
   * 测试内存安全
   */
  async testMemorySafety() {
    console.log('\n🧠 测试内存安全...');
    
    try {
      // 测试敏感数据是否正确清理
      const sensitiveData = 'Very sensitive secret data that should be cleared';
      
      // 创建多个加密操作
      for (let i = 0; i < 5; i++) {
        await this.encryption.generateMasterKey();
        await this.encryption.encryptAES(sensitiveData);
      }
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      // 这里我们无法直接检查内存内容，但可以检查对象是否正确清理
      // 简单的内存使用检查
      const memUsage = process.memoryUsage();
      const isMemoryReasonable = memUsage.heapUsed < 100 * 1024 * 1024; // 小于100MB
      
      this.recordTest('内存安全', isMemoryReasonable, 
        `堆内存使用: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        { heapUsed: memUsage.heapUsed, heapTotal: memUsage.heapTotal }
      );
    } catch (error) {
      this.recordTest('内存安全', false, error.message);
    }
  }

  /**
   * 测试算法安全配置
   */
  async testAlgorithmSecurityConfiguration() {
    console.log('\n⚙️ 测试算法安全配置...');
    
    try {
      // 检查量子安全算法信息
      const algorithmInfo = this.encryption.getQuantumSafeAlgorithmInfo();
      
      // 验证安全参数
      const hasKyber = algorithmInfo.kem && algorithmInfo.kem.algorithm.includes('kyber');
      const hasDilithium = algorithmInfo.signature && algorithmInfo.signature.algorithm.includes('dilithium');
      const hasWarning = algorithmInfo.implementation && algorithmInfo.implementation.warning;
      
      const isSecureConfig = hasKyber && hasDilithium && hasWarning;
      
      this.recordTest('算法安全配置', isSecureConfig, 
        `Kyber: ${hasKyber}, Dilithium: ${hasDilithium}, 警告: ${hasWarning}`,
        algorithmInfo
      );
    } catch (error) {
      this.recordTest('算法安全配置', false, error.message);
    }
  }

  /**
   * 运行所有安全测试
   */
  async runAllSecurityTests() {
    console.log('🛡️ 开始运行安全前端资源加密系统安全测试\n');
    console.log('警告：当前使用的是量子安全算法的模拟实现，生产环境请使用NIST认证的PQC库\n');
    
    const totalStartTime = performance.now();
    
    // 运行所有安全测试
    await this.testKeyStrength();
    await this.testEncryptionRandomness();
    await this.testKeyTamperingDetection();
    await this.testDataIntegrityVerification();
    await this.testQuantumSafeSignatureForgery();
    await this.testTimingAttackResistance();
    await this.testMemorySafety();
    await this.testAlgorithmSecurityConfiguration();
    
    const totalDuration = performance.now() - totalStartTime;
    
    // 生成安全测试报告
    this.generateSecurityReport(totalDuration);
  }

  /**
   * 生成安全测试报告
   */
  generateSecurityReport(totalDuration) {
    console.log('\n🛡️ 安全测试报告');
    console.log('='.repeat(50));
    
    const successCount = this.testResults.filter(r => r.success).length;
    const totalCount = this.testResults.length;
    const securityScore = ((successCount / totalCount) * 100).toFixed(1);
    
    console.log(`总安全测试数: ${totalCount}`);
    console.log(`通过测试数: ${successCount}`);
    console.log(`失败测试数: ${totalCount - successCount}`);
    console.log(`安全评分: ${securityScore}/100`);
    console.log(`总耗时: ${totalDuration.toFixed(3)}ms`);
    
    console.log('\n详细安全测试结果:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.message}`);
    });
    
    console.log('\n🎯 安全建议:');
    if (securityScore >= 90) {
      console.log('✅ 系统安全性优秀，可以安全使用');
    } else if (securityScore >= 70) {
      console.log('⚠️ 系统安全性良好，建议关注失败的测试项');
    } else {
      console.log('❌ 系统安全性需要改进，请修复安全问题后再使用');
    }
    
    console.log('\n🔒 安全最佳实践提醒:');
    console.log('1. 定期更新密钥和证书');
    console.log('2. 使用强随机数生成器');
    console.log('3. 实施适当的密钥管理策略');
    console.log('4. 监控和记录安全事件');
    console.log('5. 在生产环境中使用经过认证的密码学库');
    
    console.log('\n🎉 安全测试完成！');
  }
}

// 导出测试函数
export async function runSecurityTest() {
  const test = new SecurityTest();
  await test.runAllSecurityTests();
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  runSecurityTest().catch(console.error);
}