/**
 * 简化的安全测试运行器
 */

import { EncryptionCore } from '../../src/core/encryption.js';

async function testSecurity() {
  console.log('🔒 开始安全测试...\n');
  
  const encryption = new EncryptionCore();
  
  try {
    // 测试1: 加密随机性
    console.log('1. 测试加密随机性...');
    const keyData = encryption.generateFileKey();
    const testData = 'Hello World';
    
    const encrypted1 = await encryption.encryptAES(testData, keyData);
    const encrypted2 = await encryption.encryptAES(testData, keyData);
    
    const randomnessTest = encrypted1 !== encrypted2;
    console.log(`   结果: ${randomnessTest ? '✅ 通过' : '❌ 失败'} - 相同明文产生不同密文`);
    
    // 测试2: 密钥篡改检测
    console.log('\n2. 测试密钥篡改检测...');
    const originalKey = keyData.key;
    let tamperedKey;
    
    if (typeof originalKey === 'string') {
      tamperedKey = originalKey.substring(0, originalKey.length - 1) + 'X';
    } else if (Buffer.isBuffer(originalKey)) {
      tamperedKey = Buffer.from(originalKey);
      tamperedKey[0] = tamperedKey[0] ^ 0xFF; // 翻转第一个字节
    } else {
      tamperedKey = 'tampered_key';
    }
    
    const tamperedKeyData = { ...keyData, key: tamperedKey };
    
    let tamperingDetected = false;
    try {
      await encryption.decryptAES(encrypted1, tamperedKeyData);
    } catch (error) {
      tamperingDetected = true;
    }
    
    console.log(`   结果: ${tamperingDetected ? '✅ 通过' : '❌ 失败'} - 检测到密钥篡改`);
    
    // 测试3: 时间攻击防护
    console.log('\n3. 测试时间攻击防护...');
    const correctTimes = [];
    const wrongTimes = [];
    
    // 测试正确密钥的解密时间
    for (let i = 0; i < 5; i++) {
      const start = process.hrtime.bigint();
      try {
        await encryption.decryptAES(encrypted1, keyData);
      } catch (e) {}
      const end = process.hrtime.bigint();
      correctTimes.push(Number(end - start) / 1000000);
    }
    
    // 测试错误密钥的解密时间
    const wrongKeyData = encryption.generateFileKey();
    for (let i = 0; i < 5; i++) {
      const start = process.hrtime.bigint();
      try {
        await encryption.decryptAES(encrypted1, wrongKeyData);
      } catch (e) {}
      const end = process.hrtime.bigint();
      wrongTimes.push(Number(end - start) / 1000000);
    }
    
    const correctAvg = correctTimes.reduce((a, b) => a + b) / correctTimes.length;
    const wrongAvg = wrongTimes.reduce((a, b) => a + b) / wrongTimes.length;
    const timeDiff = Math.abs(correctAvg - wrongAvg);
    const timingResistant = timeDiff < correctAvg * 0.2; // 允许20%差异
    
    console.log(`   结果: ${timingResistant ? '✅ 通过' : '❌ 失败'} - 时间差异: ${timeDiff.toFixed(3)}ms`);
    
    // 总结
    const passedTests = [randomnessTest, tamperingDetected, timingResistant].filter(Boolean).length;
    console.log(`\n📊 安全测试总结:`);
    console.log(`   通过测试: ${passedTests}/3`);
    console.log(`   安全等级: ${passedTests === 3 ? '🟢 优秀' : passedTests === 2 ? '🟡 良好' : '🔴 需要改进'}`);
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

testSecurity().catch(console.error);