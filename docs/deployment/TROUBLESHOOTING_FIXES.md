# 🔧 故障排除和修复记录

本文档记录了在部署和运行过程中遇到的问题及其解决方案。

## 📅 2025-10-23 修复记录

### 1. 应用启动问题修复

#### 问题描述
- Docker 容器启动后应用立即退出
- 直接运行 `node server/index.js` 时程序不执行 main 函数
- 容器日志显示服务初始化成功但随即退出

#### 根本原因
`server/index.js` 中的启动检查逻辑存在问题：
```javascript
// 原有问题代码
if (import.meta.url === `file:///${(process.argv[1] || '').replace(/\\/g, '/')}`) {
    main().catch(console.error);
}
```

在 Docker 环境中，文件路径格式不匹配导致条件判断失败。

#### 解决方案
修改启动检查逻辑，使其能正确识别直接运行的情况：
```javascript
// 修复后的代码
const isMainModule = import.meta.url === `file:///${(process.argv[1] || '').replace(/\\/g, '/')}` || 
                    process.argv[1]?.endsWith('server/index.js');

if (isMainModule) {
    main().catch(console.error);
}
```

#### 验证结果
- ✅ 应用能在 Docker 容器中正常启动
- ✅ 服务器监听端口 3000
- ✅ 健康检查端点正常响应
- ✅ 数据库和密钥管理服务正常初始化

### 2. 生产环境配置优化

#### 问题描述
- `docker-compose.production.yml` 中 PostgreSQL 和 Redis 配置不完整
- 缺少主从复制配置
- 没有数据持久化设置
- 环境变量配置不一致

#### 修复内容

##### PostgreSQL 主从配置
```yaml
postgres-master:
  image: postgres:15.13-alpine
  environment:
    - POSTGRES_DB=${POSTGRES_DB:-secure_frontend}
    - POSTGRES_USER=${POSTGRES_USER:-postgres}
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    - POSTGRES_REPLICATION_USER=${POSTGRES_REPLICATION_USER:-replicator}
    - POSTGRES_REPLICATION_PASSWORD=${POSTGRES_REPLICATION_PASSWORD}
  volumes:
    - postgres_master_data:/var/lib/postgresql/data
  ports:
    - "5440:5432"

postgres-slave:
  image: postgres:15.13-alpine
  environment:
    - POSTGRES_DB=${POSTGRES_DB:-secure_frontend}
    - POSTGRES_USER=${POSTGRES_USER:-postgres}
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    - POSTGRES_MASTER_HOST=postgres-master
    - POSTGRES_REPLICATION_USER=${POSTGRES_REPLICATION_USER:-replicator}
    - POSTGRES_REPLICATION_PASSWORD=${POSTGRES_REPLICATION_PASSWORD}
  volumes:
    - postgres_slave_data:/var/lib/postgresql/data
  depends_on:
    - postgres-master
  ports:
    - "5441:5432"
```

##### Redis 主从配置
```yaml
redis-master:
  image: redis:7.4.6-alpine
  environment:
    - REDIS_PASSWORD=${REDIS_PASSWORD}
  volumes:
    - redis_master_data:/data
  ports:
    - "6390:6379"
  command: redis-server --requirepass ${REDIS_PASSWORD:-}

redis-slave:
  image: redis:7.4.6-alpine
  environment:
    - REDIS_PASSWORD=${REDIS_PASSWORD}
    - REDIS_MASTER_HOST=redis-master
  volumes:
    - redis_slave_data:/data
  depends_on:
    - redis-master
  ports:
    - "6391:6379"
  command: redis-server --requirepass ${REDIS_PASSWORD:-} --slaveof redis-master 6379
```

##### 数据卷配置
```yaml
volumes:
  postgres_master_data:
    driver: local
  postgres_slave_data:
    driver: local
  redis_master_data:
    driver: local
  redis_slave_data:
    driver: local
```

#### 验证结果
- ✅ 配置文件语法验证通过
- ✅ 服务依赖关系正确
- ✅ 数据持久化配置完整
- ✅ 主从复制配置正确

## 🚀 部署验证清单

### 开发环境验证
- [ ] Docker 容器正常启动
- [ ] 应用服务器响应 (http://localhost:3000)
- [ ] 健康检查通过 (http://localhost:3000/health)
- [ ] 数据库连接正常
- [ ] Redis 缓存可用

### 生产环境验证
- [ ] 所有服务容器正常运行
- [ ] 应用实例负载均衡工作
- [ ] 数据库主从复制正常
- [ ] Redis 主从同步正常
- [ ] 监控系统正常工作
- [ ] 日志收集正常
- [ ] SSL 证书配置正确

## 🔍 常见问题排查

### 应用启动失败
1. 检查 Docker 容器日志
2. 验证环境变量配置
3. 确认端口是否被占用
4. 检查文件权限设置

### 数据库连接问题
1. 验证数据库服务状态
2. 检查连接字符串配置
3. 确认网络连通性
4. 验证认证信息

### 性能问题
1. 监控资源使用情况
2. 检查数据库查询性能
3. 分析应用日志
4. 优化缓存策略

## 📞 技术支持

如遇到其他问题，请参考：
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [监控指南](./monitoring-guide.md)
- [安全指南](../security/SECURITY_GUIDE.md)