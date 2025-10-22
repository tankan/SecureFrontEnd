import { EncryptionCore } from '../src/core/encryption.js';
import fs from 'fs/promises';

/**
 * ECC加密功能演示
 */
async function eccDemo() {
  console.log('🔐 椭圆曲线加密(ECC)功能演示\n');

  // 初始化加密核心
  const encryption = new EncryptionCore();

  try {
    // 1. 生成密钥对
    console.log('1️⃣ 生成ECC密钥对...');
    const aliceKeyPair = encryption.generateECCKeyPair();
    const bobKeyPair = encryption.generateECCKeyPair();
    
    console.log(`Alice公钥: ${aliceKeyPair.publicKey.substring(0, 32)}...`);
    console.log(`Bob公钥: ${bobKeyPair.publicKey.substring(0, 32)}...`);
    console.log();

    // 2. 数字签名演示
    console.log('2️⃣ ECC数字签名演示...');
    const message = 'Hello, this is a secure message!';
    const signature = encryption.signECC(message, aliceKeyPair.privateKey);
    const isValid = encryption.verifyECC(message, signature, aliceKeyPair.publicKey);
    
    console.log(`消息: ${message}`);
    console.log(`签名验证: ${isValid ? '✅ 有效' : '❌ 无效'}`);
    console.log();

    // 3. ECDH密钥交换演示
    console.log('3️⃣ ECDH密钥交换演示...');
    const sharedSecretAlice = encryption.deriveECCSharedSecret(
      aliceKeyPair.privateKey, 
      bobKeyPair.publicKey
    );
    const sharedSecretBob = encryption.deriveECCSharedSecret(
      bobKeyPair.privateKey, 
      aliceKeyPair.publicKey
    );
    
    const secretsMatch = Buffer.compare(sharedSecretAlice, sharedSecretBob) === 0;
    console.log(`共享密钥匹配: ${secretsMatch ? '✅ 成功' : '❌ 失败'}`);
    console.log(`共享密钥: ${sharedSecretAlice.toString('hex').substring(0, 32)}...`);
    console.log();

    // 4. ECIES加密演示
    console.log('4️⃣ ECIES加密演示...');
    const plaintext = 'This is a confidential document that needs ECC encryption.';
    console.log(`原文: ${plaintext}`);
    
    const encryptedData = await encryption.encryptECC(plaintext, bobKeyPair.publicKey);
    console.log(`加密数据大小: ${JSON.stringify(encryptedData).length} 字节`);
    
    const decryptedData = await encryption.decryptECC(encryptedData, bobKeyPair.privateKey);
    const decryptedText = decryptedData.toString();
    
    console.log(`解密结果: ${decryptedText}`);
    console.log(`加密解密成功: ${plaintext === decryptedText ? '✅ 成功' : '❌ 失败'}`);
    console.log();

    // 5. 公钥压缩演示
    console.log('5️⃣ 公钥压缩演示...');
    const originalKey = aliceKeyPair.publicKey;
    const compressedKey = encryption.compressECCPublicKey(originalKey);
    const decompressedKey = encryption.ecc.decompressPublicKey(compressedKey);
    
    console.log(`原始公钥长度: ${originalKey.length} 字符`);
    console.log(`压缩公钥长度: ${compressedKey.length} 字符`);
    console.log(`压缩率: ${((1 - compressedKey.length / originalKey.length) * 100).toFixed(1)}%`);
    console.log(`解压缩匹配: ${originalKey === decompressedKey ? '✅ 成功' : '❌ 失败'}`);
    console.log();

    // 6. 文件加密演示
    console.log('6️⃣ ECC文件加密演示...');
    
    // 创建测试文件
    const testContent = `
# ECC加密测试文件

这是一个用于测试ECC加密功能的示例文件。
包含中文字符和特殊符号：!@#$%^&*()

时间戳: ${new Date().toISOString()}
随机数: ${Math.random()}
    `.trim();
    
    const testFilePath = './test-file.txt';
    await fs.writeFile(testFilePath, testContent);
    
    // 加密文件
    const encryptResult = await encryption.encryptFileECC(
      testFilePath, 
      bobKeyPair.publicKey
    );
    
    console.log(`原文件大小: ${encryptResult.size} 字节`);
    console.log(`加密文件大小: ${encryptResult.encryptedSize} 字节`);
    console.log(`加密文件: ${encryptResult.outputFile}`);
    
    // 解密文件
    const decryptResult = await encryption.decryptFileECC(
      encryptResult.outputFile,
      bobKeyPair.privateKey,
      './decrypted-file.txt'
    );
    
    // 验证文件内容
    const originalContent = await fs.readFile(testFilePath, 'utf8');
    const decryptedContent = await fs.readFile(decryptResult.outputFile, 'utf8');
    
    console.log(`文件解密成功: ${originalContent === decryptedContent ? '✅ 成功' : '❌ 失败'}`);
    console.log();

    // 7. 性能测试
    console.log('7️⃣ ECC性能测试...');
    
    const iterations = 100;
    const testData = Buffer.from('Performance test data for ECC encryption');
    
    // 签名性能测试
    console.time('ECC签名性能');
    for (let i = 0; i < iterations; i++) {
      encryption.signECC(testData, aliceKeyPair.privateKey);
    }
    console.timeEnd('ECC签名性能');
    
    // 验证性能测试
    const testSignature = encryption.signECC(testData, aliceKeyPair.privateKey);
    console.time('ECC验证性能');
    for (let i = 0; i < iterations; i++) {
      encryption.verifyECC(testData, testSignature, aliceKeyPair.publicKey);
    }
    console.timeEnd('ECC验证性能');
    
    // 加密性能测试
    console.time('ECC加密性能');
    for (let i = 0; i < 10; i++) { // 减少迭代次数，因为ECIES较慢
      await encryption.encryptECC(testData, bobKeyPair.publicKey);
    }
    console.timeEnd('ECC加密性能');
    
    console.log();

    // 8. 密钥验证演示
    console.log('8️⃣ 密钥验证演示...');
    
    console.log(`Alice公钥有效: ${encryption.isValidECCPublicKey(aliceKeyPair.publicKey) ? '✅' : '❌'}`);
    console.log(`Alice私钥有效: ${encryption.isValidECCPrivateKey(aliceKeyPair.privateKey) ? '✅' : '❌'}`);
    console.log(`无效公钥测试: ${encryption.isValidECCPublicKey('invalid_key') ? '❌' : '✅'}`);
    console.log(`无效私钥测试: ${encryption.isValidECCPrivateKey('invalid_key') ? '❌' : '✅'}`);
    
    // 清理测试文件
    await fs.unlink(testFilePath).catch(() => {});
    await fs.unlink(encryptResult.outputFile).catch(() => {});
    await fs.unlink(decryptResult.outputFile).catch(() => {});
    
    console.log('\n🎉 ECC加密功能演示完成！');
    
  } catch (error) {
    console.error('❌ 演示过程中发生错误:', error.message);
    console.error(error.stack);
  }
}

// 运行演示
if (import.meta.url === `file://${process.argv[1]}`) {
  eccDemo();
}

export { eccDemo };