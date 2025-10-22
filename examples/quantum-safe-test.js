import { QuantumSafeEncryption } from '../src/core/quantum-safe.js';

// 简单测试量子安全加密
const qse = new QuantumSafeEncryption();

console.log('🔍 调试量子安全加密...');

// 1. 生成密钥对
const kyberKeys = qse.generateKyberKeyPair();
console.log('Kyber密钥对生成成功');
console.log('公钥长度:', kyberKeys.publicKey.length);
console.log('私钥长度:', kyberKeys.privateKey.length);

// 2. 测试KEM
console.log('\n测试Kyber KEM...');
const kemResult = qse.kyberEncapsulate(kyberKeys.publicKey);
console.log('封装结果:', kemResult);

const decapsulatedSecret = qse.kyberDecapsulate(kemResult.ciphertext, kyberKeys.privateKey);
console.log('解封装密钥:', decapsulatedSecret);
console.log('密钥匹配:', kemResult.sharedSecret === decapsulatedSecret);

// 3. 测试加密解密
if (kemResult.sharedSecret === decapsulatedSecret) {
  console.log('\n测试量子安全加密...');
  const testData = 'Hello Quantum World!';
  
  try {
    const encrypted = qse.quantumSafeEncrypt(testData, kyberKeys.publicKey);
    console.log('加密成功:', encrypted);
    
    const decrypted = qse.quantumSafeDecrypt(encrypted, kyberKeys.privateKey);
    console.log('解密结果:', decrypted.toString());
    console.log('数据匹配:', decrypted.toString() === testData);
  } catch (error) {
    console.error('加密解密失败:', error.message);
  }
} else {
  console.error('KEM测试失败，跳过加密测试');
}