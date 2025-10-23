# 🔧 故障排除指南

本指南提供了 SecureFrontEnd 应用程序常见问题的诊断和解决方案，帮助您快速识别和解决各种技术问题。

## 📋 快速诊断

### 系统健康检查

首先运行基本的健康检查来确定问题范围：

```bash
# 检查应用状态 (根据环境调整端口)
# 开发环境
curl http://localhost:3000/health
# 测试环境
curl http://localhost:3010/health
# 生产环境
curl http://localhost:3020/health

# 检查详细健康报告
curl http://localhost:3000/api/v1/health/detailed

# 检查模块状态
curl http://localhost:3000/api/v1/modules/status
```

> **注意**: 上述示例使用开发环境端口 (3000)。请根据实际部署环境调整端口号：
> - 开发环境: 3000
> - 测试环境: 3010  
> - 生产环境: 3020

### 日志文件位置

```bash
# 应用日志
tail -f logs/app.log

# 错误日志
tail -f logs/error.log

# 安全日志
tail -f logs/security.log

# 数据库日志
tail -f logs/database.log

# 模块日志
tail -f logs/modules.log
```

## 🚀 启动问题

### 问题：应用无法启动

#### 症状
- 运行 `npm start` 或 `node server/index.js` 后应用立即退出
- 没有错误信息或错误信息不明确

#### 诊断步骤

1. **检查 Node.js 版本**
```bash
node --version  # 应该是 22.12.0 或更高
npm --version   # 应该是 8.0 或更高
```

2. **检查环境变量**
```bash
# 验证必需的环境变量
echo $NODE_ENV
echo $PORT
echo $DB_HOST
```

3. **检查端口占用**
```bash
# Windows
netstat -ano | findstr :3000

# Linux/macOS
lsof -i :3000
```

4. **启用调试模式**
```bash
DEBUG=* node server/index.js
```

#### 解决方案

1. **ES 模块问题**
```bash
# 确保 package.json 中有 "type": "module"
# 或者检查文件扩展名是否正确
```

2. **权限问题**
```bash
# Linux/macOS
chmod +x server/index.js
sudo chown -R $USER:$USER .
```

3. **依赖问题**
```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

### 问题：模块启动失败

#### 症状
- 应用启动但某些模块显示为 "error" 状态
- 功能不完整或部分功能无法使用

#### 诊断步骤

1. **检查模块状态**
```bash
curl http://localhost:3000/api/v1/modules/status | jq
```

2. **查看模块日志**
```bash
grep "MODULE_ERROR" logs/app.log
grep "DEPENDENCY_ERROR" logs/app.log
```

3. **检查依赖关系**
```bash
# 查看模块依赖图
npm run analyze-modules
```

#### 解决方案

1. **重启特定模块**
```bash
curl -X POST http://localhost:3000/api/v1/modules/restart/module-name
```

2. **检查模块配置**
```javascript
// 验证模块配置文件
const config = require('./config/modules.json');
console.log(JSON.stringify(config, null, 2));
```

3. **清理模块缓存**
```bash
rm -rf data/modules/cache/*
```

## 🗄️ 数据库问题

### 问题：数据库连接失败

#### 症状
- "Database connection failed" 错误
- 应用启动时卡在数据库初始化阶段

#### 诊断步骤

1. **检查数据库服务状态**
```bash
# PostgreSQL
sudo systemctl status postgresql

# MySQL
sudo systemctl status mysql

# Docker
docker ps | grep postgres
```

2. **测试数据库连接**
```bash
# PostgreSQL
psql -h localhost -U username -d database_name

# MySQL
mysql -h localhost -u username -p database_name
```

3. **检查连接参数**
```bash
# 验证环境变量
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
```

#### 解决方案

1. **重启数据库服务**
```bash
# PostgreSQL
sudo systemctl restart postgresql

# MySQL
sudo systemctl restart mysql

# Docker
docker restart postgres-container
```

2. **检查防火墙设置**
```bash
# 允许数据库端口
sudo ufw allow 5432  # PostgreSQL
sudo ufw allow 3306  # MySQL
```

3. **验证用户权限**
```sql
-- PostgreSQL
GRANT ALL PRIVILEGES ON DATABASE database_name TO username;

-- MySQL
GRANT ALL PRIVILEGES ON database_name.* TO 'username'@'localhost';
FLUSH PRIVILEGES;
```

### 问题：数据库迁移失败

#### 症状
- "Migration failed" 错误
- 数据库表结构不正确

#### 诊断步骤

1. **检查迁移状态**
```bash
npm run migrate:status
```

2. **查看迁移日志**
```bash
grep "MIGRATION" logs/database.log
```

#### 解决方案

1. **回滚并重新运行迁移**
```bash
npm run migrate:rollback
npm run migrate
```

2. **手动修复数据库**
```sql
-- 检查表结构
\d table_name  -- PostgreSQL
DESCRIBE table_name;  -- MySQL
```

## 🔐 认证和授权问题

### 问题：JWT 令牌无效

#### 症状
- "Invalid token" 或 "Token expired" 错误
- 用户无法访问受保护的资源

#### 诊断步骤

1. **检查令牌格式**
```javascript
// 在浏览器控制台中
const token = localStorage.getItem('token');
console.log('Token:', token);
console.log('Payload:', JSON.parse(atob(token.split('.')[1])));
```

2. **验证令牌密钥**
```bash
echo $JWT_SECRET | wc -c  # 应该至少 32 字符
```

3. **检查系统时间**
```bash
date  # 确保服务器时间正确
```

#### 解决方案

1. **刷新令牌**
```javascript
// 前端代码
const refreshToken = async () => {
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${refreshToken}`
    }
  });
  const data = await response.json();
  localStorage.setItem('token', data.accessToken);
};
```

2. **重新登录**
```bash
# 清除本地存储的令牌
localStorage.removeItem('token');
localStorage.removeItem('refreshToken');
```

### 问题：权限不足

#### 症状
- "Insufficient permissions" 错误
- 用户无法执行特定操作

#### 诊断步骤

1. **检查用户角色**
```bash
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/v1/users/profile
```

2. **验证权限配置**
```javascript
// 检查角色权限
const roles = require('./config/roles.json');
console.log(roles);
```

#### 解决方案

1. **更新用户角色**
```sql
UPDATE users SET role = 'admin' WHERE id = user_id;
```

2. **重新加载权限**
```bash
curl -X POST http://localhost:3000/api/v1/auth/reload-permissions
```

## 🌐 网络和连接问题

### 问题：API 请求失败

#### 症状
- 前端无法连接到后端 API
- CORS 错误
- 网络超时

#### 诊断步骤

1. **检查服务器状态**
```bash
curl -I http://localhost:3000/api/v1/health
```

2. **检查 CORS 配置**
```javascript
// 查看 CORS 设置
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
};
```

3. **检查防火墙**
```bash
sudo ufw status
```

#### 解决方案

1. **更新 CORS 配置**
```javascript
// server/middleware/cors.js
app.use(cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true
}));
```

2. **检查代理设置**
```javascript
// package.json (开发环境)
{
  "proxy": "http://localhost:3000"
}
```

### 问题：SSL/TLS 证书错误

#### 症状
- "Certificate error" 或 "SSL handshake failed"
- 浏览器显示不安全连接警告

#### 诊断步骤

1. **检查证书有效性**
```bash
openssl x509 -in certificate.crt -text -noout
```

2. **验证证书链**
```bash
openssl verify -CAfile ca-bundle.crt certificate.crt
```

#### 解决方案

1. **更新证书**
```bash
# Let's Encrypt
sudo certbot renew

# 手动更新
sudo cp new-certificate.crt /path/to/ssl/
sudo systemctl reload nginx
```

2. **检查证书配置**
```nginx
ssl_certificate /path/to/certificate.crt;
ssl_certificate_key /path/to/private.key;
```

## 📊 性能问题

### 问题：应用响应缓慢

#### 症状
- API 响应时间超过 5 秒
- 页面加载缓慢
- 数据库查询超时

#### 诊断步骤

1. **检查系统资源**
```bash
# CPU 使用率
top

# 内存使用
free -h

# 磁盘 I/O
iostat -x 1
```

2. **分析数据库性能**
```sql
-- PostgreSQL
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- MySQL
SHOW PROCESSLIST;
```

3. **检查应用指标**
```bash
curl http://localhost:3000/api/v1/metrics
```

#### 解决方案

1. **优化数据库查询**
```sql
-- 添加索引
CREATE INDEX idx_user_email ON users(email);

-- 分析查询计划
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';
```

2. **启用缓存**
```javascript
// Redis 缓存
const redis = require('redis');
const client = redis.createClient();

const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    const key = req.originalUrl;
    const cached = await client.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      client.setex(key, duration, JSON.stringify(body));
      res.sendResponse(body);
    };
    
    next();
  };
};
```

3. **优化静态资源**
```nginx
# Gzip 压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# 缓存静态文件
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 问题：内存泄漏

#### 症状
- 内存使用持续增长
- 应用最终崩溃或变得无响应

#### 诊断步骤

1. **监控内存使用**
```bash
# 实时监控
watch -n 1 'ps aux | grep node'

# 详细内存分析
node --inspect server/index.js
```

2. **生成堆转储**
```javascript
// 在代码中添加
const v8 = require('v8');
const fs = require('fs');

const generateHeapDump = () => {
  const heapSnapshot = v8.writeHeapSnapshot();
  console.log('Heap snapshot written to', heapSnapshot);
};

// 定期生成堆转储
setInterval(generateHeapDump, 60000);
```

#### 解决方案

1. **修复事件监听器泄漏**
```javascript
// 正确移除监听器
const cleanup = () => {
  eventEmitter.removeAllListeners();
  clearInterval(intervalId);
  clearTimeout(timeoutId);
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
```

2. **优化缓存策略**
```javascript
// 使用 LRU 缓存
const LRU = require('lru-cache');
const cache = new LRU({
  max: 1000,
  ttl: 1000 * 60 * 10 // 10 分钟
});
```

## 🔒 安全问题

### 问题：安全警告或攻击检测

#### 症状
- 安全日志中出现可疑活动
- 多次登录失败
- 异常的 API 请求模式

#### 诊断步骤

1. **检查安全日志**
```bash
grep "SECURITY_ALERT" logs/security.log
grep "FAILED_LOGIN" logs/security.log
grep "SUSPICIOUS_ACTIVITY" logs/security.log
```

2. **分析访问模式**
```bash
# 分析访问日志
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10
```

#### 解决方案

1. **阻止可疑 IP**
```bash
# 临时阻止
sudo ufw deny from suspicious.ip.address

# 永久阻止
echo "suspicious.ip.address" >> /etc/hosts.deny
```

2. **重置受影响的账户**
```sql
-- 强制密码重置
UPDATE users SET password_reset_required = true WHERE id IN (affected_user_ids);

-- 撤销所有会话
DELETE FROM user_sessions WHERE user_id IN (affected_user_ids);
```

## 🛠️ 开发环境问题

### 问题：热重载不工作

#### 症状
- 代码更改后需要手动重启服务器
- 前端更改不自动刷新

#### 解决方案

1. **检查 nodemon 配置**
```json
// nodemon.json
{
  "watch": ["server", "src"],
  "ext": "js,json",
  "ignore": ["node_modules", "logs"],
  "exec": "node server/index.js"
}
```

2. **前端热重载**
```javascript
// webpack.config.js
module.exports = {
  devServer: {
    hot: true,
    port: 3001,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
};
```

### 问题：测试失败

#### 症状
- 单元测试或集成测试失败
- 测试环境配置问题

#### 解决方案

1. **检查测试环境**
```bash
NODE_ENV=test npm test
```

2. **清理测试数据**
```javascript
// test/setup.js
beforeEach(async () => {
  await TestDatabase.clear();
  await TestDatabase.seed();
});
```

## 📞 获取帮助

### 收集诊断信息

在寻求帮助时，请收集以下信息：

```bash
# 系统信息
uname -a
node --version
npm --version

# 应用信息
npm list --depth=0
cat package.json | grep version

# 错误日志
tail -n 100 logs/error.log

# 配置信息（隐藏敏感数据）
env | grep -E '^(NODE_ENV|PORT|DB_HOST)' | sed 's/=.*/=***/'
```

### 创建最小复现示例

1. 创建一个最小的代码示例来重现问题
2. 包含相关的配置文件
3. 提供详细的步骤说明
4. 包含预期结果和实际结果

### 联系支持

- **GitHub Issues**: 在项目仓库创建 Issue
- **文档**: 查看在线文档和 FAQ
- **社区**: 加入开发者社区讨论
- **邮件支持**: support@securefrontend.com

## 📚 预防措施

### 定期维护

1. **更新依赖**
```bash
npm audit
npm update
```

2. **清理日志**
```bash
# 设置日志轮转
sudo logrotate -f /etc/logrotate.d/securefrontend
```

3. **备份数据**
```bash
# 数据库备份
pg_dump database_name > backup_$(date +%Y%m%d).sql
```

### 监控设置

1. **健康检查**
```bash
# 设置定期健康检查
*/5 * * * * curl -f http://localhost:3000/health || echo "Health check failed" | mail -s "Alert" admin@example.com
```

2. **资源监控**
```bash
# 监控磁盘空间
df -h | awk '$5 > 80 {print $0}' | mail -s "Disk Space Alert" admin@example.com
```

---

**记住**: 遇到问题时，首先查看日志文件，它们通常包含解决问题所需的关键信息。如果问题持续存在，请不要犹豫寻求帮助。