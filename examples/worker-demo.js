/**
 * Web Workers并行加密解密功能演示
 */

import { EncryptionCore } from '../src/core/encryption.js';

export async function workerDemo() {
  console.log('🚀 Web Workers并行加密解密功能演示\n');
  
  const encryption = new EncryptionCore();
  
  try {
    // 1. 启用Web Workers
    console.log('1️⃣ 启用Web Workers...');
    encryption.enableWorkers(4); // 使用4个Worker
    
    // 获取Worker状态
    const workerStatus = encryption.getWorkerStatus();
    console.log('Worker状态:', workerStatus);
    
    // 2. 单个加密解密测试
    console.log('\n2️⃣ 单个加密解密测试...');
    const testData = 'This is a test message for Web Worker encryption!';
    const key = encryption.generateKey();
    
    console.time('Worker加密');
    const encrypted = await encryption.encryptAES(testData, key);
    console.timeEnd('Worker加密');
    
    console.time('Worker解密');
    const decrypted = await encryption.decryptAES(encrypted.encryptedData, key);
    console.timeEnd('Worker解密');
    
    console.log('原文:', testData);
    console.log('解密结果:', decrypted);
    console.log('加密解密成功:', testData === decrypted ? '✅ 成功' : '❌ 失败');
    
    // 3. 批量加密测试
    console.log('\n3️⃣ 批量加密测试...');
    const batchData = [];
    for (let i = 0; i < 100; i++) {
      batchData.push({
        id: i,
        data: `Test message ${i} - ${Math.random().toString(36).substring(7)}`
      });
    }
    
    console.time('批量加密 (100条数据)');
    const batchEncrypted = await encryption.batchEncrypt(batchData, key);
    console.timeEnd('批量加密 (100条数据)');
    
    console.time('批量解密 (100条数据)');
    const batchDecrypted = await encryption.batchDecrypt(batchEncrypted, key);
    console.timeEnd('批量解密 (100条数据)');
    
    // 验证批量处理结果
    let batchSuccess = true;
    for (let i = 0; i < batchData.length; i++) {
      if (batchData[i].data !== batchDecrypted[i].decrypted) {
        batchSuccess = false;
        break;
      }
    }
    
    console.log('批量处理结果:', batchSuccess ? '✅ 成功' : '❌ 失败');
    console.log('处理数据量:', batchData.length, '条');
    
    // 4. 并行处理不同类型任务
    console.log('\n4️⃣ 并行处理不同类型任务...');
    
    // 生成量子安全密钥对
    const kyberKeys = encryption.generateKyberKeyPair();
    
    const parallelTasks = [
      {
        type: 'encrypt-aes',
        data: { plaintext: 'AES加密测试数据', key: key }
      },
      {
        type: 'encrypt-quantum-safe',
        data: { plaintext: '量子安全加密测试数据', kyberPublicKey: kyberKeys.publicKey }
      }
    ];
    
    console.time('并行处理多种任务');
    const parallelResults = await encryption.parallelProcess(parallelTasks);
    console.timeEnd('并行处理多种任务');
    
    console.log('并行任务结果:');
    console.log('- AES加密结果长度:', parallelResults[0].encryptedData.length);
    console.log('- 量子安全加密结果长度:', parallelResults[1].encryptedData.length);
    
    // 5. 性能对比测试
    console.log('\n5️⃣ 性能对比测试...');
    
    // 禁用Workers进行对比
    encryption.disableWorkers();
    
    const performanceTestData = [];
    for (let i = 0; i < 50; i++) {
      performanceTestData.push({
        id: i,
        data: `Performance test data ${i} - ${Math.random().toString(36).substring(7)}`
      });
    }
    
    // 主线程处理
    console.time('主线程批量加密 (50条数据)');
    const mainThreadEncrypted = await encryption.batchEncrypt(performanceTestData, key);
    console.timeEnd('主线程批量加密 (50条数据)');
    
    // 重新启用Workers
    encryption.enableWorkers(4);
    
    // Worker处理
    console.time('Worker批量加密 (50条数据)');
    const workerEncrypted = await encryption.batchEncrypt(performanceTestData, key);
    console.timeEnd('Worker批量加密 (50条数据)');
    
    // 6. 大数据量测试
    console.log('\n6️⃣ 大数据量测试...');
    
    const largeData = [];
    for (let i = 0; i < 1000; i++) {
      largeData.push({
        id: i,
        data: `Large dataset item ${i} - ${Math.random().toString(36).substring(7).repeat(10)}`
      });
    }
    
    console.time('大数据量加密 (1000条数据)');
    const largeEncrypted = await encryption.batchEncrypt(largeData, key);
    console.timeEnd('大数据量加密 (1000条数据)');
    
    console.time('大数据量解密 (1000条数据)');
    const largeDecrypted = await encryption.batchDecrypt(largeEncrypted, key);
    console.timeEnd('大数据量解密 (1000条数据)');
    
    // 验证大数据量处理结果
    let largeSuccess = true;
    for (let i = 0; i < largeData.length; i++) {
      if (largeData[i].data !== largeDecrypted[i].decrypted) {
        largeSuccess = false;
        break;
      }
    }
    
    console.log('大数据量处理结果:', largeSuccess ? '✅ 成功' : '❌ 失败');
    console.log('处理数据量:', largeData.length, '条');
    
    // 7. Worker状态监控
    console.log('\n7️⃣ Worker状态监控...');
    const finalWorkerStatus = encryption.getWorkerStatus();
    console.log('最终Worker状态:', finalWorkerStatus);
    
    // 8. 清理资源
    console.log('\n8️⃣ 清理资源...');
    encryption.disableWorkers();
    
    console.log('\n🎉 Web Workers并行加密解密功能演示完成！');
    
  } catch (error) {
    console.error('演示过程中发生错误:', error);
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  workerDemo();
}