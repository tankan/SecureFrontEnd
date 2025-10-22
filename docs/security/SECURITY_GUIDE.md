# 🛡️ 安全最佳实践指南

本指南详细介绍了 SecureFrontEnd 应用程序的安全特性、配置和最佳实践，帮助您构建和维护一个安全的应用环境。

## 📋 安全概述

SecureFrontEnd 采用多层安全架构，包括：

- **身份认证和授权** - JWT 令牌和基于角色的访问控制
- **数据加密** - 传输和存储加密
- **输入验证** - 严格的数据验证和清理
- **安全监控** - 实时威胁检测和日志记录
- **合规性** - 符合 GDPR、HIPAA 等标准

## 🔐 身份认证和授权

### JWT 令牌配置

#### 生成安全的 JWT 密钥

```bash
# 生成 256 位随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 或使用 OpenSSL
openssl rand -hex 32
```

#### JWT 配置最佳实践

```javascript
// config/jwt.js
const jwtConfig = {
  secret: process.env.JWT_SECRET, // 至少 32 字符
  expiresIn: '15m',              // 短期访问令牌
  refreshExpiresIn: '7d',        // 刷新令牌
  algorithm: 'HS256',            // 推荐算法
  issuer: 'SecureFrontEnd',      // 令牌发行者
  audience: 'api.securefrontend.com' // 目标受众
};
```

#### 令牌刷新机制

```javascript
// 自动刷新令牌
class TokenManager {
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new Error('Invalid user');
      }
      
      // 生成新的访问令牌
      const accessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);
      
      // 撤销旧的刷新令牌
      await this.revokeRefreshToken(refreshToken);
      
      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new Error('Token refresh failed');
    }
  }
}
```

### 基于角色的访问控制 (RBAC)

#### 角色定义

```javascript
// models/Role.js
const roles = {
  SUPER_ADMIN: {
    name: 'super_admin',
    permissions: ['*'] // 所有权限
  },
  ADMIN: {
    name: 'admin',
    permissions: [
      'users:read', 'users:write', 'users:delete',
      'modules:read', 'modules:write',
      'security:read', 'security:write'
    ]
  },
  USER: {
    name: 'user',
    permissions: [
      'profile:read', 'profile:write',
      'data:read'
    ]
  },
  GUEST: {
    name: 'guest',
    permissions: ['public:read']
  }
};
```

#### 权限中间件

```javascript
// middleware/auth.js
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).populate('role');
      
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid user' });
      }
      
      // 检查权限
      if (!hasPermission(user.role.permissions, permission)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};
```

## 🔒 数据加密

### 传输加密 (TLS/SSL)

#### SSL 证书配置

```javascript
// server/https.js
const https = require('https');
const fs = require('fs');

const sslOptions = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem'),
  ca: fs.readFileSync('/path/to/ca-bundle.pem'), // 可选
  
  // 安全配置
  secureProtocol: 'TLSv1_2_method',
  ciphers: [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES128-SHA256'
  ].join(':'),
  honorCipherOrder: true
};

const server = https.createServer(sslOptions, app);
```

#### HTTP 安全头

```javascript
// middleware/security.js
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 存储加密

#### 数据库字段加密

```javascript
// utils/encryption.js
const crypto = require('crypto');

class FieldEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }
  
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(encryptedData) {
    const decipher = crypto.createDecipher(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

#### 敏感数据处理

```javascript
// models/User.js
const bcrypt = require('bcrypt');

class User {
  // 密码哈希
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }
  
  // 密码验证
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.passwordHash);
  }
  
  // 敏感字段加密
  encryptSensitiveData() {
    const encryption = new FieldEncryption();
    
    if (this.ssn) {
      this.encryptedSSN = encryption.encrypt(this.ssn);
      delete this.ssn;
    }
    
    if (this.creditCard) {
      this.encryptedCreditCard = encryption.encrypt(this.creditCard);
      delete this.creditCard;
    }
  }
}
```

## 🛡️ 输入验证和清理

### 数据验证

```javascript
// validators/userValidator.js
const Joi = require('joi');
const validator = require('validator');

const userSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required(),
    
  email: Joi.string()
    .email()
    .required()
    .custom((value, helpers) => {
      if (!validator.isEmail(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }),
    
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    }),
    
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
});

const validateUser = (req, res, next) => {
  const { error } = userSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(d => d.message)
    });
  }
  next();
};
```

### SQL 注入防护

```javascript
// 使用参数化查询
const getUserById = async (userId) => {
  // 正确的方式
  const query = 'SELECT * FROM users WHERE id = $1';
  const result = await db.query(query, [userId]);
  return result.rows[0];
};

// 使用 ORM
const User = require('./models/User');
const user = await User.findOne({
  where: { id: userId },
  attributes: { exclude: ['passwordHash'] }
});
```

### XSS 防护

```javascript
// utils/sanitizer.js
const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');

class InputSanitizer {
  static sanitizeHTML(input) {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: []
    });
  }
  
  static escapeHTML(input) {
    return validator.escape(input);
  }
  
  static sanitizeJSON(obj) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.escapeHTML(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeJSON(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
```

## 🔍 安全监控

### 安全事件日志

```javascript
// services/SecurityLogger.js
class SecurityLogger {
  constructor() {
    this.winston = require('winston');
    this.logger = this.winston.createLogger({
      level: 'info',
      format: this.winston.format.combine(
        this.winston.format.timestamp(),
        this.winston.format.json()
      ),
      transports: [
        new this.winston.transports.File({ 
          filename: 'logs/security.log',
          level: 'warn'
        }),
        new this.winston.transports.File({ 
          filename: 'logs/security-error.log',
          level: 'error'
        })
      ]
    });
  }
  
  logSecurityEvent(event, details) {
    this.logger.warn('Security Event', {
      event,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip,
      userAgent: details.userAgent,
      userId: details.userId
    });
  }
  
  logFailedLogin(username, ip, userAgent) {
    this.logSecurityEvent('FAILED_LOGIN', {
      username,
      ip,
      userAgent,
      severity: 'medium'
    });
  }
  
  logSuspiciousActivity(activity, details) {
    this.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
      activity,
      ...details,
      severity: 'high'
    });
  }
}
```

### 入侵检测

```javascript
// services/IntrusionDetection.js
class IntrusionDetection {
  constructor() {
    this.failedAttempts = new Map();
    this.suspiciousIPs = new Set();
    this.rateLimiter = new Map();
  }
  
  checkFailedLogins(ip, username) {
    const key = `${ip}:${username}`;
    const attempts = this.failedAttempts.get(key) || 0;
    
    if (attempts >= 5) {
      this.suspiciousIPs.add(ip);
      this.securityLogger.logSuspiciousActivity('BRUTE_FORCE_ATTEMPT', {
        ip,
        username,
        attempts
      });
      return false;
    }
    
    this.failedAttempts.set(key, attempts + 1);
    
    // 清理过期记录
    setTimeout(() => {
      this.failedAttempts.delete(key);
    }, 15 * 60 * 1000); // 15分钟
    
    return true;
  }
  
  checkRateLimit(ip, endpoint) {
    const key = `${ip}:${endpoint}`;
    const requests = this.rateLimiter.get(key) || [];
    const now = Date.now();
    
    // 清理过期请求
    const validRequests = requests.filter(time => now - time < 60000); // 1分钟
    
    if (validRequests.length >= 100) { // 每分钟最多100请求
      this.securityLogger.logSuspiciousActivity('RATE_LIMIT_EXCEEDED', {
        ip,
        endpoint,
        requests: validRequests.length
      });
      return false;
    }
    
    validRequests.push(now);
    this.rateLimiter.set(key, validRequests);
    
    return true;
  }
}
```

## 🔐 会话管理

### 安全会话配置

```javascript
// config/session.js
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

const sessionConfig = {
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  name: 'sessionId', // 不使用默认名称
  resave: false,
  saveUninitialized: false,
  rolling: true, // 每次请求重置过期时间
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    httpOnly: true, // 防止 XSS
    maxAge: 30 * 60 * 1000, // 30分钟
    sameSite: 'strict' // CSRF 保护
  }
};

app.use(session(sessionConfig));
```

### 会话安全中间件

```javascript
// middleware/sessionSecurity.js
const sessionSecurity = (req, res, next) => {
  // 检查会话劫持
  if (req.session.userAgent && req.session.userAgent !== req.get('User-Agent')) {
    req.session.destroy();
    return res.status(401).json({ error: 'Session security violation' });
  }
  
  // 检查 IP 变化
  if (req.session.ipAddress && req.session.ipAddress !== req.ip) {
    req.session.destroy();
    return res.status(401).json({ error: 'Session security violation' });
  }
  
  // 设置会话指纹
  if (!req.session.userAgent) {
    req.session.userAgent = req.get('User-Agent');
    req.session.ipAddress = req.ip;
  }
  
  next();
};
```

## 🛡️ CSRF 保护

```javascript
// middleware/csrf.js
const csrf = require('csurf');

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// 为 API 提供 CSRF 令牌
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// 保护所有 POST/PUT/DELETE 请求
app.use('/api', csrfProtection);
```

## 📊 合规性

### GDPR 合规

```javascript
// services/GDPRCompliance.js
class GDPRCompliance {
  // 数据导出
  async exportUserData(userId) {
    const user = await User.findById(userId);
    const activities = await UserActivity.find({ userId });
    const preferences = await UserPreferences.find({ userId });
    
    return {
      personalData: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      },
      activities: activities.map(a => ({
        action: a.action,
        timestamp: a.timestamp,
        ip: a.ip
      })),
      preferences: preferences
    };
  }
  
  // 数据删除
  async deleteUserData(userId) {
    await User.findByIdAndDelete(userId);
    await UserActivity.deleteMany({ userId });
    await UserPreferences.deleteMany({ userId });
    await UserSessions.deleteMany({ userId });
    
    // 记录删除操作
    await AuditLog.create({
      action: 'USER_DATA_DELETED',
      userId,
      timestamp: new Date(),
      reason: 'GDPR_REQUEST'
    });
  }
  
  // 同意管理
  async recordConsent(userId, consentType, granted) {
    await ConsentRecord.create({
      userId,
      consentType,
      granted,
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
}
```

### 审计日志

```javascript
// services/AuditLogger.js
class AuditLogger {
  async logDataAccess(userId, dataType, action, details) {
    await AuditLog.create({
      userId,
      action: `DATA_${action.toUpperCase()}`,
      dataType,
      details,
      timestamp: new Date(),
      ip: details.ip,
      userAgent: details.userAgent
    });
  }
  
  async logAdminAction(adminId, action, target, details) {
    await AuditLog.create({
      userId: adminId,
      action: `ADMIN_${action.toUpperCase()}`,
      target,
      details,
      timestamp: new Date(),
      severity: 'high'
    });
  }
  
  async generateComplianceReport(startDate, endDate) {
    const logs = await AuditLog.find({
      timestamp: { $gte: startDate, $lte: endDate }
    });
    
    return {
      period: { startDate, endDate },
      totalEvents: logs.length,
      dataAccess: logs.filter(l => l.action.startsWith('DATA_')).length,
      adminActions: logs.filter(l => l.action.startsWith('ADMIN_')).length,
      securityEvents: logs.filter(l => l.severity === 'high').length
    };
  }
}
```

## 🔧 安全配置检查清单

### 应用配置
- [ ] JWT 密钥长度至少 32 字符
- [ ] 密码哈希使用 bcrypt，轮数至少 12
- [ ] 会话配置安全（httpOnly, secure, sameSite）
- [ ] CSRF 保护已启用
- [ ] 输入验证和清理已实施
- [ ] SQL 注入防护已实施
- [ ] XSS 防护已实施

### 服务器配置
- [ ] HTTPS 已启用
- [ ] 安全头已配置
- [ ] 防火墙规则已设置
- [ ] 不必要的服务已禁用
- [ ] 系统更新已安装
- [ ] 日志记录已配置

### 数据库安全
- [ ] 数据库用户权限最小化
- [ ] 敏感数据已加密
- [ ] 数据库连接已加密
- [ ] 备份已加密
- [ ] 访问日志已启用

### 监控和响应
- [ ] 安全事件监控已启用
- [ ] 入侵检测系统已配置
- [ ] 日志分析已设置
- [ ] 事件响应计划已制定
- [ ] 定期安全审计已安排

## 🚨 事件响应

### 安全事件分类

```javascript
const SecurityEventTypes = {
  LOW: {
    level: 'low',
    response: 'log',
    examples: ['failed_login', 'invalid_input']
  },
  MEDIUM: {
    level: 'medium',
    response: 'alert',
    examples: ['multiple_failed_logins', 'suspicious_activity']
  },
  HIGH: {
    level: 'high',
    response: 'block',
    examples: ['brute_force', 'sql_injection_attempt']
  },
  CRITICAL: {
    level: 'critical',
    response: 'immediate',
    examples: ['data_breach', 'system_compromise']
  }
};
```

### 自动响应系统

```javascript
// services/SecurityResponse.js
class SecurityResponse {
  async handleSecurityEvent(event) {
    const eventType = this.classifyEvent(event);
    
    switch (eventType.level) {
      case 'low':
        await this.logEvent(event);
        break;
        
      case 'medium':
        await this.logEvent(event);
        await this.sendAlert(event);
        break;
        
      case 'high':
        await this.logEvent(event);
        await this.sendAlert(event);
        await this.blockSource(event.ip);
        break;
        
      case 'critical':
        await this.logEvent(event);
        await this.sendImmediateAlert(event);
        await this.blockSource(event.ip);
        await this.notifySecurityTeam(event);
        break;
    }
  }
  
  async blockSource(ip) {
    // 添加到黑名单
    await BlacklistedIP.create({
      ip,
      reason: 'Security violation',
      blockedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时
    });
    
    // 更新防火墙规则
    await this.updateFirewallRules(ip);
  }
}
```

## 📚 安全培训和意识

### 开发团队安全培训

1. **安全编码实践**
   - OWASP Top 10 漏洞
   - 安全代码审查
   - 威胁建模

2. **定期安全评估**
   - 代码安全扫描
   - 渗透测试
   - 漏洞评估

3. **事件响应培训**
   - 安全事件识别
   - 响应流程
   - 沟通协议

### 用户安全教育

1. **密码安全**
   - 强密码要求
   - 多因素认证
   - 密码管理器使用

2. **钓鱼防护**
   - 识别可疑邮件
   - 验证链接真实性
   - 报告可疑活动

---

**重要提醒**: 安全是一个持续的过程，需要定期审查和更新安全措施。请确保团队了解最新的安全威胁和防护措施。