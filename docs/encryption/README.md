# 加密模块文档

## 概述

本项目的加密模块采用模块化设计，将不同的加密功能拆分为独立的模块，提供了完整的加密解决方案。

## 模块结构

```
src/core/encryption/
├── index.js              # 统一入口文件
├── base-encryption.js    # 基础加密类
├── aes-encryption.js     # AES对称加密
├── rsa-encryption.js     # RSA非对称加密
├── file-encryption.js    # 文件加密功能
└── quantum-encryption.js # 量子安全加密
```

## 快速开始

### 基本使用

```javascript
import { EncryptionCore } from './src/core/encryption.js';

const encryption = new EncryptionCore();

// AES加密
const aesKey = await encryption.generateAESKey();
const encrypted = await encryption.encryptAES('Hello World', aesKey);
const decrypted = await encryption.decryptAES(encrypted, aesKey);

// RSA加密
const rsaKeyPair = await encryption.generateRSAKeyPair();
const rsaEncrypted = await encryption.encryptRSA('Hello World', rsaKeyPair.publicKey);
const rsaDecrypted = await encryption.decryptRSA(rsaEncrypted, rsaKeyPair.privateKey);
```

### 模块化使用

```javascript
import { AESEncryption, RSAEncryption } from './src/core/encryption/index.js';

// 单独使用AES加密
const aes = new AESEncryption();
const key = await aes.generateKey();
const encrypted = await aes.encrypt('data', key);

// 单独使用RSA加密
const rsa = new RSAEncryption();
const keyPair = await rsa.generateKeyPair();
const encrypted = await rsa.encrypt('data', keyPair.publicKey);
```

## API 参考

### BaseEncryption

基础加密类，提供通用的加密功能和工具方法。

#### 方法

- `generateRandomBytes(length)` - 生成随机字节
- `hashData(data, algorithm)` - 数据哈希
- `deriveKey(password, salt, iterations, keyLength)` - 密钥派生
- `validateInput(data, type)` - 输入验证

### AESEncryption

AES对称加密模块，支持多种AES模式。

#### 方法

- `generateKey(keySize = 256)` - 生成AES密钥
- `encrypt(data, key, options = {})` - AES加密
- `decrypt(encryptedData, key, options = {})` - AES解密
- `encryptWithPassword(data, password, options = {})` - 基于密码的加密
- `decryptWithPassword(encryptedData, password, options = {})` - 基于密码的解密

#### 选项参数

```javascript
const options = {
    mode: 'GCM',        // 加密模式: GCM, CBC, CTR
    keySize: 256,       // 密钥长度: 128, 192, 256
    iterations: 100000, // PBKDF2迭代次数
    tagLength: 16       // GCM标签长度
};
```

### RSAEncryption

RSA非对称加密模块，支持加密、解密、签名和验证。

#### 方法

- `generateKeyPair(keySize = 2048)` - 生成RSA密钥对
- `encrypt(data, publicKey, options = {})` - RSA加密
- `decrypt(encryptedData, privateKey, options = {})` - RSA解密
- `sign(data, privateKey, options = {})` - 数字签名
- `verify(data, signature, publicKey, options = {})` - 签名验证
- `hybridEncrypt(data, publicKey, options = {})` - 混合加密
- `hybridDecrypt(encryptedData, privateKey, options = {})` - 混合解密

### FileEncryption

文件加密模块，支持单文件和批量文件加密。

#### 方法

- `encryptFile(filePath, outputPath, options = {})` - 加密文件
- `decryptFile(filePath, outputPath, options = {})` - 解密文件
- `encryptDirectory(dirPath, outputPath, options = {})` - 加密目录
- `decryptDirectory(dirPath, outputPath, options = {})` - 解密目录
- `getFileInfo(filePath)` - 获取文件信息
- `verifyFileIntegrity(filePath, expectedHash)` - 验证文件完整性

#### 文件加密选项

```javascript
const options = {
    algorithm: 'hybrid',    // 加密算法: aes, hybrid
    keySize: 256,          // 密钥长度
    compression: true,      // 是否压缩
    includeMetadata: true, // 是否包含元数据
    fileTypes: ['*'],      // 文件类型过滤
    recursive: true        // 是否递归处理子目录
};
```

### QuantumEncryption

量子安全加密模块，提供抗量子攻击的加密算法。

#### 方法

- `generateKyberKeyPair()` - 生成Kyber密钥对
- `generateDilithiumKeyPair()` - 生成Dilithium密钥对
- `encryptQuantumSafe(data, publicKey, options = {})` - 量子安全加密
- `decryptQuantumSafe(encryptedData, privateKey, options = {})` - 量子安全解密
- `signQuantumSafe(data, privateKey, options = {})` - 量子安全签名
- `verifyQuantumSafeSignature(data, signature, publicKey, options = {})` - 量子安全验证

## 高级功能

### 批量处理

```javascript
const encryption = new EncryptionCore();

// 启用Web Workers进行并行处理
encryption.enableWorkers(4);

// 批量加密
const items = ['data1', 'data2', 'data3'];
const results = await encryption.batchEncrypt(items, key, {
    algorithm: 'aes',
    useWorkers: true
});

// 批量解密
const decrypted = await encryption.batchDecrypt(results, key, {
    algorithm: 'aes',
    useWorkers: true
});
```

### 性能监控

```javascript
const encryption = new EncryptionCore();

// 启用性能监控
encryption.enablePerformanceMonitoring();

// 执行加密操作
const result = await encryption.encryptAES(data, key);

// 获取性能统计
const stats = encryption.getPerformanceStats();
console.log('加密耗时:', stats.lastOperation.duration);
```

## 安全最佳实践

1. **密钥管理**
   - 使用强随机数生成器生成密钥
   - 定期轮换密钥
   - 安全存储私钥

2. **算法选择**
   - 对于对称加密，推荐使用AES-256-GCM
   - 对于非对称加密，推荐使用RSA-2048或更高
   - 考虑使用量子安全算法应对未来威胁

3. **数据处理**
   - 验证输入数据
   - 使用安全的随机数
   - 及时清理敏感数据

## 错误处理

所有加密方法都会抛出详细的错误信息：

```javascript
try {
    const result = await encryption.encryptAES(data, key);
} catch (error) {
    console.error('加密失败:', error.message);
    // 根据错误类型进行相应处理
}
```

## 兼容性

- Node.js 16+
- 现代浏览器（支持Web Crypto API）
- Web Workers支持

## 许可证

本项目采用MIT许可证。