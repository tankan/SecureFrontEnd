import { EncryptionCore } from '../src/core/encryption.js';
import fs from 'fs/promises';

/**
 * 量子安全加密功能演示
 */
export async function quantumSafeDemo() {
  console.log('🔐 量子安全加密功能演示\n');

  try {
    // 初始化加密核心
    const encryption = new EncryptionCore();

    // 1. 生成量子安全密钥对
    console.log('1️⃣ 生成量子安全密钥对...');
    const kyberKeyPair = encryption.generateKyberKeyPair();
    const dilithiumKeyPair = encryption.generateDilithiumKeyPair();
    
    console.log(`Kyber公钥: ${kyberKeyPair.publicKey.substring(0, 32)}...`);
    console.log(`Dilithium公钥: ${dilithiumKeyPair.publicKey.substring(0, 32)}...`);
    console.log(`算法: ${kyberKeyPair.algorithm} + ${dilithiumKeyPair.algorithm}\n`);

    // 2. 量子安全数字签名演示
    console.log('2️⃣ 量子安全数字签名演示...');
    const message = 'This is a quantum-safe signed message!';
    const signature = encryption.signQuantumSafe(message, dilithiumKeyPair.privateKey);
    const isValid = encryption.verifyQuantumSafe(message, signature, dilithiumKeyPair.publicKey);
    
    console.log(`消息: ${message}`);
    console.log(`签名验证: ${isValid ? '✅ 有效' : '❌ 无效'}\n`);

    // 3. 量子安全混合加密演示
    console.log('3️⃣ 量子安全混合加密演示...');
    const plaintext = 'This is a confidential document protected by quantum-safe encryption.';
    const encryptedData = await encryption.encryptQuantumSafe(plaintext, kyberKeyPair.publicKey);
    const decryptedData = await encryption.decryptQuantumSafe(encryptedData, kyberKeyPair.privateKey);
    
    console.log(`原文: ${plaintext}`);
    console.log(`加密数据大小: ${JSON.stringify(encryptedData).length} 字节`);
    console.log(`解密结果: ${decryptedData.toString()}`);
    console.log(`加密解密成功: ${plaintext === decryptedData.toString() ? '✅ 成功' : '❌ 失败'}\n`);

    // 4. 量子安全数字证书演示
    console.log('4️⃣ 量子安全数字证书演示...');
    const certInfo = {
      issuer: 'Quantum-Safe Certificate Authority',
      subject: 'Test Entity for Quantum-Safe Demo'
    };
    const certResult = encryption.generateQuantumSafeCertificate(certInfo);
    const certValid = encryption.verifyQuantumSafeCertificate(certResult.certificate);
    
    console.log(`证书序列号: ${certResult.certificate.serialNumber}`);
    console.log(`证书主体: ${certResult.certificate.subject}`);
    console.log(`证书验证: ${certValid ? '✅ 有效' : '❌ 无效'}\n`);

    // 5. 量子安全文件加密演示
    console.log('5️⃣ 量子安全文件加密演示...');
    const testContent = 'This is a test file for quantum-safe encryption.\nIt contains sensitive information that needs protection against quantum attacks.';
    await fs.writeFile('./test-quantum-file.txt', testContent);
    
    const encryptedFile = await encryption.encryptFileQuantumSafe('./test-quantum-file.txt', kyberKeyPair.publicKey);
    const decryptedFile = await encryption.decryptFileQuantumSafe(encryptedFile, kyberKeyPair.privateKey, './test-quantum-decrypted.txt');
    
    const originalSize = (await fs.stat('./test-quantum-file.txt')).size;
    const encryptedSize = (await fs.stat(encryptedFile)).size;
    const decryptedContent = await fs.readFile('./test-quantum-decrypted.txt', 'utf8');
    
    console.log(`原文件大小: ${originalSize} 字节`);
    console.log(`加密文件大小: ${encryptedSize} 字节`);
    console.log(`加密文件: ${encryptedFile}`);
    console.log(`文件解密成功: ${testContent === decryptedContent ? '✅ 成功' : '❌ 失败'}\n`);

    // 6. 算法信息展示
    console.log('6️⃣ 量子安全算法信息...');
    const algorithmInfo = encryption.getQuantumSafeAlgorithmInfo();
    console.log(`KEM算法: ${algorithmInfo.kem.algorithm}`);
    console.log(`签名算法: ${algorithmInfo.signature.algorithm}`);
    console.log(`量子抗性: ${algorithmInfo.quantumResistant ? '✅ 是' : '❌ 否'}`);
    console.log(`混合模式: ${algorithmInfo.hybridMode ? '✅ 启用' : '❌ 禁用'}\n`);

    // 7. 性能测试
    console.log('7️⃣ 量子安全性能测试...');
    
    // Kyber KEM性能测试
    const kemStart = performance.now();
    for (let i = 0; i < 10; i++) {
      const testKeyPair = encryption.generateKyberKeyPair();
      await encryption.encryptQuantumSafe('test data', testKeyPair.publicKey);
    }
    const kemTime = performance.now() - kemStart;
    
    // Dilithium签名性能测试
    const signStart = performance.now();
    for (let i = 0; i < 10; i++) {
      const testKeyPair = encryption.generateDilithiumKeyPair();
      const testSig = encryption.signQuantumSafe('test message', testKeyPair.privateKey);
      encryption.verifyQuantumSafe('test message', testSig, testKeyPair.publicKey);
    }
    const signTime = performance.now() - signStart;
    
    console.log(`Kyber KEM性能 (10次): ${kemTime.toFixed(3)}ms`);
    console.log(`Dilithium签名性能 (10次): ${signTime.toFixed(3)}ms\n`);

    // 8. 安全性对比
    console.log('8️⃣ 安全性对比...');
    console.log('传统加密算法:');
    console.log('  RSA-2048: ❌ 量子计算机可破解');
    console.log('  ECC P-256: ❌ 量子计算机可破解');
    console.log('  AES-256: ⚠️ 量子计算机可将安全性降至128位');
    console.log('');
    console.log('量子安全算法:');
    console.log('  Kyber-768: ✅ 抗量子攻击 (NIST标准)');
    console.log('  Dilithium-3: ✅ 抗量子攻击 (NIST标准)');
    console.log('  混合模式: ✅ 向前兼容 + 量子安全\n');

    // 清理测试文件
    try {
      await fs.unlink('./test-quantum-file.txt');
      await fs.unlink('./test-quantum-decrypted.txt');
      await fs.unlink(encryptedFile);
    } catch (error) {
      // 忽略清理错误
    }

    console.log('🎉 量子安全加密功能演示完成！');

  } catch (error) {
    console.error('❌ 演示过程中发生错误:', error.message);
    console.error(error);
  }
}

// 如果直接运行此文件，则执行演示
if (import.meta.url === `file://${process.argv[1]}`) {
  quantumSafeDemo();
}