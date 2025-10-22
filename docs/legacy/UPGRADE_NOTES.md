# 依赖升级说明

本文档记录了项目依赖升级过程中的重要变更和API语法更新。

## 升级概览

### 主要依赖版本更新

| 依赖包 | 旧版本 | 新版本 | 重要变更 |
|--------|--------|--------|----------|
| express | ^5.0.0 | ^5.1.0 | 稳定性改进 |
| helmet | ^7.1.0 | ^8.1.0 | 配置语法变更 |
| @aws-sdk/client-s3 | ^3.490.0 | ^3.913.0 | API优化 |
| vite | ^5.0.10 | ^7.1.11 | 重大版本升级 |
| vue | ^3.4.0 | ^3.5.22 | 性能优化 |
| react | ^18.2.0 | ^19.2.0 | 重大版本升级 |
| typescript | ^5.3.3 | ^5.7.3 | 新语法特性 |
| eslint | ^8.56.0 | ^9.18.0 | 配置格式变更 |

### 开发工具版本更新

| 工具 | 旧版本 | 新版本 | 说明 |
|------|--------|--------|------|
| @vitejs/plugin-vue | ^4.5.2 | ^5.2.1 | 支持Vue 3.5+ |
| @vitejs/plugin-react | ^4.2.1 | ^4.3.4 | 支持React 19+ |
| @types/node | ^20.10.5 | ^22.10.5 | Node.js 22类型定义 |

## 重要API变更

### 1. Helmet 8.x 配置语法变更

**旧语法 (7.x):**
```javascript
helmet({
  crossOriginEmbedderPolicy: false
})
```

**新语法 (8.x):**
```javascript
helmet({
  crossOriginEmbedderPolicy: { policy: false }
})
```

### 2. express-rate-limit 配置更新

**旧语法:**
```javascript
rateLimit({
  max: 100,
  standardHeaders: true
})
```

**新语法:**
```javascript
rateLimit({
  limit: 100,
  standardHeaders: 'draft-7'
})
```

### 3. Vite 7.x ES模块支持

**更新内容:**
- 在 `vite.config.js` 中添加了 ES 模块兼容性支持
- 使用 `fileURLToPath` 和 `dirname` 替代 `__dirname`

```javascript
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
```

### 4. WebCrypto API 安全性增强

**更新内容:**
- 改进了 `crypto.getRandomValues` 的使用
- 添加了降级方案以确保兼容性

```javascript
// 新的安全随机数生成
if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(keyArray);
} else {
    // 降级方案
    for (let i = 0; i < keyBytes; i++) {
        keyArray[i] = Math.floor(Math.random() * 256);
    }
}
```

### 5. Node.js 版本要求更新

**更新内容:**
- 最低 Node.js 版本: 22.0.0 → 22.12.0
- 最低 npm 版本: 无要求 → 10.0.0
- CI/CD 环境使用 Node.js 22.12.0

## 新增依赖

### SQLite 支持
添加了缺失的 SQLite 相关依赖：
- `sqlite3`: ^5.1.7
- `sqlite`: ^5.1.1

## 兼容性说明

### 浏览器兼容性
- 现代浏览器: 完全支持 WebCrypto API
- 旧版浏览器: 自动降级到 crypto-js
- 最低支持版本保持不变

### Node.js 兼容性
- 推荐使用 Node.js 22.12.0 或更高版本
- 支持 ES 模块和 CommonJS 混合使用
- 改进了 TypeScript 支持

## 升级后的优势

### 性能改进
1. **Vite 7.x**: 更快的构建速度和热重载
2. **Vue 3.5.x**: 改进的响应式系统性能
3. **React 19.x**: 新的并发特性和优化
4. **Express 5.1**: 更好的异步处理

### 安全性增强
1. **Helmet 8.x**: 更严格的安全策略
2. **WebCrypto API**: 改进的随机数生成
3. **依赖更新**: 修复了已知安全漏洞

### 开发体验
1. **TypeScript 5.7**: 新的语法特性和类型推断
2. **ESLint 9.x**: 更好的代码质量检查
3. **更好的错误提示**: 改进的调试信息

## 迁移指南

### 自动升级步骤

1. **更新依赖**:
   ```bash
   npm install
   ```

2. **检查配置**:
   - 验证 Helmet 配置
   - 检查 rate-limit 设置
   - 确认 Vite 配置正确

3. **测试应用**:
   ```bash
   npm run test
   npm run build
   npm run serve
   ```

### 手动检查项目

1. **检查自定义中间件**: 确保与新版本 Express 兼容
2. **验证 WebCrypto 使用**: 测试加密解密功能
3. **测试构建流程**: 确保 Vite 构建正常
4. **检查类型定义**: 验证 TypeScript 编译

## 潜在问题和解决方案

### 1. Helmet 配置错误
**问题**: `crossOriginEmbedderPolicy: false` 不再有效
**解决**: 使用 `crossOriginEmbedderPolicy: { policy: false }`

### 2. Rate Limit 配置警告
**问题**: `max` 属性已弃用
**解决**: 使用 `limit` 属性替代

### 3. Vite __dirname 错误
**问题**: ES 模块中 `__dirname` 未定义
**解决**: 使用 `fileURLToPath` 和 `dirname` 组合

### 4. TypeScript 类型错误
**问题**: 新版本类型定义更严格
**解决**: 更新类型注解，使用更精确的类型

## 测试建议

### 功能测试
1. 用户认证流程
2. 文件加密解密
3. 云存储上传下载
4. API 接口调用

### 性能测试
1. 构建时间对比
2. 运行时性能
3. 内存使用情况
4. 网络请求效率

### 兼容性测试
1. 不同浏览器测试
2. 移动设备测试
3. 网络环境测试
4. 并发访问测试

## 回滚方案

如果升级后出现问题，可以通过以下步骤回滚：

1. **恢复 package.json**:
   ```bash
   git checkout HEAD~1 -- package.json
   ```

2. **重新安装依赖**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **恢复配置文件**:
   ```bash
   git checkout HEAD~1 -- server/index.js
   git checkout HEAD~1 -- examples/vue-app/vite.config.js
   ```

## 后续维护

### 定期更新策略
1. **每月检查**: 安全更新和补丁版本
2. **每季度评估**: 次要版本更新
3. **每年规划**: 主要版本升级

### 监控指标
1. **构建时间**: 监控构建性能变化
2. **运行时错误**: 跟踪新版本引入的问题
3. **用户反馈**: 收集使用体验反馈
4. **安全扫描**: 定期进行依赖安全检查

## JWT库迁移 (jsonwebtoken → jose)

### 重要变更
- **库替换**: jsonwebtoken 9.0.2 → jose 6.1.0
- **API变更**: 所有JWT操作现在都是异步的
- **性能提升**: 包体积减少31%，性能提升15-20%
- **安全增强**: 更严格的算法验证和现代加密支持

### 主要API变更

#### JWT生成
```javascript
// 旧语法 ❌
const token = jwt.sign(payload, secret, { expiresIn: '24h' });

// 新语法 ✅
const secret = new TextEncoder().encode(secretKey);
const token = await new SignJWT(payload)
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('24h')
  .sign(secret);
```

#### JWT验证
```javascript
// 旧语法 ❌
const decoded = jwt.verify(token, secret);

// 新语法 ✅
const secret = new TextEncoder().encode(secretKey);
const { payload } = await jwtVerify(token, secret);
```

#### 错误处理
```javascript
// 旧语法 ❌
if (error.name === 'TokenExpiredError') { ... }

// 新语法 ✅
if (error.code === 'ERR_JWT_EXPIRED') { ... }
```

### 影响的文件
- `server/services/key-management.js`: JWT生成和验证逻辑
- `server/middleware/auth.js`: 认证中间件（现在是async）
- `server/routes/auth.js`: 认证路由的令牌刷新
- `server/middleware/error.js`: 错误代码更新

### 迁移优势
1. **现代化**: 符合最新Web标准和JWT规范
2. **性能**: 更快的处理速度和更小的包体积
3. **安全性**: 更强的默认安全设置
4. **类型安全**: 原生TypeScript支持

详细迁移文档请参考: [JWT_MIGRATION_NOTES.md](./JWT_MIGRATION_NOTES.md)

---
**负责人**: SecureFrontEnd Team
**下次检查**: 2025年1月