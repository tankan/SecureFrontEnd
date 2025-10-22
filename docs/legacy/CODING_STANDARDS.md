# 编码规范文档

## 📋 概述

本文档定义了 SecureFrontEnd 项目的编码规范和最佳实践，旨在确保代码的一致性、可读性和可维护性。

## 🏗️ 项目结构规范

### 目录命名规范
- 使用 **kebab-case** 命名方式
- 目录名应该简洁且具有描述性
- 避免使用缩写，除非是广泛认知的缩写

```
✅ 正确示例:
src/modules/security/
src/utils/crypto-utils/
config/environments/

❌ 错误示例:
src/mods/sec/
src/utils/cryptoUtils/
config/env/
```

### 文件命名规范

#### JavaScript/CommonJS 文件
- 使用 **kebab-case** 命名
- 文件扩展名规范：
  - `.js` - ES6 模块
  - `.cjs` - CommonJS 模块
  - `.mjs` - ES6 模块（明确指定）

```
✅ 正确示例:
access-control-system.cjs
security-monitoring.js
crypto-utils.mjs

❌ 错误示例:
AccessControlSystem.cjs
securityMonitoring.js
cryptoUtils.js
```

#### 特殊文件命名
- 测试文件：`module-name.test.js`
- 配置文件：`config-name.config.js`
- 服务文件：`service-name.service.js`
- 工具文件：`util-name.util.js`

## 💻 代码风格规范

### 1. 缩进和空格
```javascript
// 使用 4 个空格缩进
function example() {
    const data = {
        name: 'SecureFrontEnd',
        version: '1.0.0'
    };
    
    if (data.name) {
        console.log(data.name);
    }
}
```

### 2. 引号使用
```javascript
// 统一使用单引号
const message = 'Hello World';
const template = `Welcome to ${projectName}`;

// 对象属性不需要引号（除非必要）
const config = {
    apiUrl: 'https://api.example.com',
    'api-key': 'secret-key' // 包含特殊字符时使用引号
};
```

### 3. 分号使用
```javascript
// 始终使用分号
const data = getData();
const result = processData(data);
```

### 4. 变量命名
```javascript
// 使用 camelCase
const userName = 'admin';
const apiResponse = await fetchData();

// 常量使用 UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// 私有变量使用下划线前缀
class SecurityManager {
    constructor() {
        this._privateKey = generateKey();
        this.publicData = {};
    }
}
```

### 5. 函数命名
```javascript
// 函数使用动词开头的 camelCase
function validatePassword(password) {
    return password.length >= 8;
}

// 布尔值返回函数使用 is/has/can 前缀
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hasPermission(user, resource) {
    return user.permissions.includes(resource);
}

function canAccess(user, resource) {
    return user.role === 'admin' || hasPermission(user, resource);
}
```

### 6. 类命名
```javascript
// 类使用 PascalCase
class SecurityAuditManager {
    constructor() {
        this.auditLog = [];
    }
    
    performAudit() {
        // 实现审计逻辑
    }
}

// 接口/类型定义也使用 PascalCase
class ISecurityProvider {
    encrypt(data) {
        throw new Error('Method must be implemented');
    }
}
```

## 📝 注释规范

### 1. JSDoc 注释
```javascript
/**
 * 加密敏感数据
 * @param {string} data - 需要加密的数据
 * @param {string} key - 加密密钥
 * @param {Object} options - 加密选项
 * @param {string} options.algorithm - 加密算法，默认为 'aes-256-gcm'
 * @param {boolean} options.compress - 是否压缩数据，默认为 false
 * @returns {Promise<Object>} 加密结果对象
 * @throws {Error} 当加密失败时抛出错误
 * @example
 * const result = await encryptData('sensitive info', 'secret-key');
 * console.log(result.encrypted); // 加密后的数据
 */
async function encryptData(data, key, options = {}) {
    // 实现加密逻辑
}
```

### 2. 行内注释
```javascript
// 单行注释使用双斜杠，注释前后保留空格
const maxRetries = 3; // 最大重试次数

/*
 * 多行注释使用这种格式
 * 每行开头使用星号对齐
 */
function complexFunction() {
    // TODO: 实现复杂逻辑
    // FIXME: 修复已知问题
    // NOTE: 重要说明信息
}
```

### 3. 模块注释
```javascript
/**
 * 安全访问控制系统
 * 
 * 提供用户认证、授权、会话管理等安全功能
 * 支持多因素认证、角色基础访问控制等高级特性
 * 
 * @module AccessControlSystem
 * @version 1.0.0
 * @author Security Team
 * @since 2024-01-01
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
```

## 🔧 错误处理规范

### 1. 错误处理模式
```javascript
// 使用 try-catch 处理异步错误
async function processData(data) {
    try {
        const result = await validateAndProcess(data);
        return { success: true, data: result };
    } catch (error) {
        console.error('数据处理失败:', error.message);
        return { success: false, error: error.message };
    }
}

// 使用自定义错误类
class SecurityError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'SecurityError';
        this.code = code;
    }
}

// 抛出具体的错误
function validateAccess(user, resource) {
    if (!user) {
        throw new SecurityError('用户未认证', 'AUTH_REQUIRED');
    }
    
    if (!hasPermission(user, resource)) {
        throw new SecurityError('权限不足', 'INSUFFICIENT_PERMISSIONS');
    }
}
```

### 2. 日志记录规范
```javascript
const { logManager } = require('../core');

// 使用统一的日志管理器
function performSecurityAudit() {
    logManager.info('开始执行安全审计');
    
    try {
        const results = runAuditChecks();
        logManager.info('安全审计完成', { 
            checksRun: results.length,
            passed: results.filter(r => r.passed).length 
        });
        return results;
    } catch (error) {
        logManager.error('安全审计失败', { 
            error: error.message,
            stack: error.stack 
        });
        throw error;
    }
}
```

## 🏛️ 架构设计规范

### 1. 模块设计原则
```javascript
// 单一职责原则 - 每个模块只负责一个功能
class PasswordValidator {
    validate(password) {
        return this.checkLength(password) && 
               this.checkComplexity(password);
    }
    
    checkLength(password) {
        return password.length >= 8;
    }
    
    checkComplexity(password) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
    }
}

// 依赖注入 - 通过构造函数注入依赖
class SecurityAuditService {
    constructor(logger, configManager) {
        this.logger = logger;
        this.config = configManager;
    }
    
    async performAudit() {
        this.logger.info('开始安全审计');
        // 审计逻辑
    }
}
```

### 2. 接口设计规范
```javascript
// 定义清晰的接口
class IEncryptionProvider {
    /**
     * 加密数据
     * @param {string} data 原始数据
     * @param {string} key 加密密钥
     * @returns {Promise<string>} 加密后的数据
     */
    async encrypt(data, key) {
        throw new Error('Method must be implemented');
    }
    
    /**
     * 解密数据
     * @param {string} encryptedData 加密的数据
     * @param {string} key 解密密钥
     * @returns {Promise<string>} 解密后的数据
     */
    async decrypt(encryptedData, key) {
        throw new Error('Method must be implemented');
    }
}

// 实现接口
class AESEncryptionProvider extends IEncryptionProvider {
    async encrypt(data, key) {
        // AES 加密实现
    }
    
    async decrypt(encryptedData, key) {
        // AES 解密实现
    }
}
```

## 🧪 测试规范

### 1. 测试文件结构
```javascript
// tests/unit/security/access-control-system.test.js
const { AccessControlSystem } = require('../../../src/modules/security/access-control-system.cjs');

describe('AccessControlSystem', () => {
    let accessControl;
    
    beforeEach(() => {
        accessControl = new AccessControlSystem();
    });
    
    describe('用户认证', () => {
        test('应该成功认证有效用户', async () => {
            const user = { username: 'admin', password: 'password123' };
            const result = await accessControl.authenticate(user);
            
            expect(result.success).toBe(true);
            expect(result.token).toBeDefined();
        });
        
        test('应该拒绝无效用户', async () => {
            const user = { username: 'invalid', password: 'wrong' };
            const result = await accessControl.authenticate(user);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('认证失败');
        });
    });
});
```

### 2. 测试命名规范
- 测试套件：使用被测试的类名或功能名
- 测试用例：使用 "应该..." 的描述性语句
- 测试数据：使用有意义的变量名

## 📦 模块导出规范

### 1. CommonJS 模块
```javascript
// 单个类导出
class SecurityManager {
    // 类实现
}

module.exports = SecurityManager;

// 多个导出
class UserManager { }
class RoleManager { }

module.exports = {
    UserManager,
    RoleManager
};
```

### 2. ES6 模块
```javascript
// 命名导出
export class SecurityManager {
    // 类实现
}

export const CONFIG = {
    // 配置对象
};

// 默认导出
export default class DefaultSecurityManager {
    // 类实现
}
```

## 🔒 安全编码规范

### 1. 输入验证
```javascript
// 始终验证输入参数
function processUserInput(input) {
    if (!input || typeof input !== 'string') {
        throw new Error('无效输入参数');
    }
    
    // 清理和验证输入
    const sanitized = input.trim().replace(/[<>]/g, '');
    
    if (sanitized.length === 0) {
        throw new Error('输入不能为空');
    }
    
    return sanitized;
}
```

### 2. 敏感信息处理
```javascript
// 不要在日志中记录敏感信息
function authenticateUser(username, password) {
    logManager.info('用户认证请求', { username }); // 不记录密码
    
    // 认证逻辑
    const isValid = validateCredentials(username, password);
    
    if (isValid) {
        logManager.info('用户认证成功', { username });
    } else {
        logManager.warn('用户认证失败', { username });
    }
    
    return isValid;
}
```

## 📊 性能优化规范

### 1. 异步操作
```javascript
// 使用 async/await 而不是回调
async function fetchUserData(userId) {
    try {
        const user = await database.findUser(userId);
        const permissions = await database.getUserPermissions(userId);
        
        return { user, permissions };
    } catch (error) {
        throw new Error(`获取用户数据失败: ${error.message}`);
    }
}

// 并行处理独立操作
async function initializeSystem() {
    const [config, database, cache] = await Promise.all([
        loadConfiguration(),
        connectDatabase(),
        initializeCache()
    ]);
    
    return { config, database, cache };
}
```

### 2. 内存管理
```javascript
// 及时清理资源
class ResourceManager {
    constructor() {
        this.resources = new Map();
    }
    
    allocateResource(id, resource) {
        this.resources.set(id, resource);
    }
    
    releaseResource(id) {
        const resource = this.resources.get(id);
        if (resource && typeof resource.cleanup === 'function') {
            resource.cleanup();
        }
        this.resources.delete(id);
    }
    
    cleanup() {
        for (const [id] of this.resources) {
            this.releaseResource(id);
        }
    }
}
```

## 🔍 代码审查清单

### 提交前检查
- [ ] 代码符合命名规范
- [ ] 添加了适当的注释和文档
- [ ] 包含必要的错误处理
- [ ] 通过了所有测试
- [ ] 没有硬编码的敏感信息
- [ ] 性能影响已评估
- [ ] 安全风险已考虑

### 代码审查要点
- [ ] 逻辑正确性
- [ ] 边界条件处理
- [ ] 错误处理完整性
- [ ] 代码可读性
- [ ] 性能影响
- [ ] 安全性考虑
- [ ] 测试覆盖率

## 🛠️ 工具配置

### ESLint 配置
项目已配置 ESLint 规则，运行以下命令检查代码：
```bash
npm run lint
npm run lint:fix  # 自动修复可修复的问题
```

### Prettier 配置
项目已配置 Prettier 格式化规则，运行以下命令格式化代码：
```bash
npm run format
npm run format:check  # 检查格式化状态
```

## 📚 参考资源

- [JavaScript 最佳实践](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [Node.js 最佳实践](https://nodejs.org/en/docs/guides/)
- [安全编码指南](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [JSDoc 文档规范](https://jsdoc.app/)

---

**注意**: 本规范是活文档，会根据项目发展和团队反馈持续更新。所有团队成员都应该遵循这些规范，以确保代码质量和项目的长期可维护性。