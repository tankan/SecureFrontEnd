# 加密模块迁移指南

## 概述

本指南帮助您从旧的单体加密模块迁移到新的模块化加密系统。新的设计提供了更好的代码组织、更强的可维护性和更灵活的使用方式。

## 主要变化

### 1. 模块化结构

**旧版本（单体模块）:**
```javascript
import { EncryptionCore } from './src/core/encryption.js';
```

**新版本（模块化）:**
```javascript
// 方式1: 使用统一入口（推荐）
import { EncryptionCore } from './src/core/encryption.js';

// 方式2: 使用独立模块
import { AESEncryption, RSAEncryption } from './src/core/encryption/index.js';

// 方式3: 直接导入特定模块
import { AESEncryption } from './src/core/encryption/aes-encryption.js';
```

### 2. 类继承结构

所有加密模块现在都继承自 `BaseEncryption` 类：

```javascript
BaseEncryption
├── AESEncryption
├── RSAEncryption  
├── FileEncryption
├── QuantumEncryption
└── EncryptionCore (整合所有模块)
```

## 迁移步骤

### 步骤1: 更新导入语句

**旧版本:**
```javascript
import { EncryptionCore } from './encryption.js';
```

**新版本:**
```javascript
import { EncryptionCore } from './src/core/encryption.js';
```

### 步骤2: API兼容性

大部分API保持向后兼容，无需修改现有代码：

```javascript
// 这些代码在新版本中仍然有效
const encryption = new EncryptionCore();
const key = await encryption.generateAESKey();
const encrypted = await encryption.encryptAES(data, key);
```

### 步骤3: 利用新的模块化特性

**场景1: 只需要AES加密**
```javascript
// 旧版本 - 导入整个模块
import { EncryptionCore } from './encryption.js';
const encryption = new EncryptionCore();

// 新版本 - 只导入需要的模块
import { AESEncryption } from './src/core/encryption/aes-encryption.js';
const aes = new AESEncryption();
```

**场景2: 需要多种加密算法**
```javascript
// 新版本 - 从统一入口导入
import { AESEncryption, RSAEncryption } from './src/core/encryption/index.js';

const aes = new AESEncryption();
const rsa = new RSAEncryption();
```

## 具体迁移示例

### 示例1: 基本AES加密

**旧版本:**
```javascript
import { EncryptionCore } from './encryption.js';

async function encryptData() {
    const encryption = new EncryptionCore();
    const key = await encryption.generateAESKey();
    const encrypted = await encryption.encryptAES('Hello World', key);
    return encrypted;
}
```

**新版本（兼容方式）:**
```javascript
import { EncryptionCore } from './src/core/encryption.js';

async function encryptData() {
    const encryption = new EncryptionCore();
    const key = await encryption.generateAESKey();
    const encrypted = await encryption.encryptAES('Hello World', key);
    return encrypted;
}
```

**新版本（模块化方式）:**
```javascript
import { AESEncryption } from './src/core/encryption/aes-encryption.js';

async function encryptData() {
    const aes = new AESEncryption();
    const key = await aes.generateKey();
    const encrypted = await aes.encrypt('Hello World', key);
    return encrypted;
}
```

### 示例2: 文件加密

**旧版本:**
```javascript
import { EncryptionCore } from './encryption.js';

async function encryptFile() {
    const encryption = new EncryptionCore();
    await encryption.encryptFile('input.txt', 'output.enc', {
        algorithm: 'aes',
        keySize: 256
    });
}
```

**新版本（专用模块）:**
```javascript
import { FileEncryption } from './src/core/encryption/file-encryption.js';

async function encryptFile() {
    const fileEncryption = new FileEncryption();
    await fileEncryption.encryptFile('input.txt', 'output.enc', {
        algorithm: 'aes',
        keySize: 256
    });
}
```

### 示例3: 混合使用多个模块

**新版本:**
```javascript
import { 
    AESEncryption, 
    RSAEncryption, 
    FileEncryption 
} from './src/core/encryption/index.js';

class SecureDataProcessor {
    constructor() {
        this.aes = new AESEncryption();
        this.rsa = new RSAEncryption();
        this.file = new FileEncryption();
    }

    async processData(data) {
        // 使用AES加密数据
        const aesKey = await this.aes.generateKey();
        const encryptedData = await this.aes.encrypt(data, aesKey);

        // 使用RSA加密AES密钥
        const rsaKeyPair = await this.rsa.generateKeyPair();
        const encryptedKey = await this.rsa.encrypt(aesKey, rsaKeyPair.publicKey);

        return { encryptedData, encryptedKey, publicKey: rsaKeyPair.publicKey };
    }
}
```

## 性能优化建议

### 1. 按需导入

只导入需要的模块，减少内存占用：

```javascript
// 好的做法
import { AESEncryption } from './src/core/encryption/aes-encryption.js';

// 避免不必要的导入
import { EncryptionCore } from './src/core/encryption.js'; // 如果只需要AES
```

### 2. 模块复用

在应用中复用模块实例：

```javascript
// 创建单例模式
class EncryptionService {
    constructor() {
        this.aes = new AESEncryption();
        this.rsa = new RSAEncryption();
    }

    static getInstance() {
        if (!this.instance) {
            this.instance = new EncryptionService();
        }
        return this.instance;
    }
}
```

## 常见问题

### Q: 旧代码是否需要立即迁移？

A: 不需要。新版本保持向后兼容，现有代码可以继续使用。建议在新功能开发时采用模块化方式。

### Q: 如何选择使用哪种导入方式？

A: 
- 如果需要多种加密功能，使用 `EncryptionCore`
- 如果只需要特定功能，使用对应的专用模块
- 如果需要最小化打包体积，直接导入特定模块文件

### Q: 性能是否有影响？

A: 模块化设计实际上可能提升性能，因为：
- 减少了不必要的代码加载
- 更好的代码分割和懒加载支持
- 更精确的内存管理

### Q: 如何处理依赖关系？

A: 新的模块系统自动处理依赖关系。例如，`FileEncryption` 会自动导入 `AESEncryption` 和 `RSAEncryption`。

## 迁移检查清单

- [ ] 更新所有导入路径
- [ ] 测试现有功能是否正常工作
- [ ] 考虑使用专用模块优化性能
- [ ] 更新文档和注释
- [ ] 运行完整的测试套件
- [ ] 检查打包体积变化

## 获取帮助

如果在迁移过程中遇到问题：

1. 查看 [API文档](../api.md)
2. 运行测试用例了解用法
3. 查看 `examples/` 目录中的示例代码
4. 提交Issue获取技术支持

## 总结

新的模块化设计提供了：
- ✅ 更好的代码组织
- ✅ 更强的可维护性  
- ✅ 更灵活的使用方式
- ✅ 更好的性能优化潜力
- ✅ 完全的向后兼容性

建议在新项目中采用模块化方式，现有项目可以逐步迁移。