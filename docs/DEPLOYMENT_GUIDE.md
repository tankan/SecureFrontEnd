# 🚀 SecureFrontEnd 完整部署指南

本指南提供了 SecureFrontEnd 项目的完整部署流程，包括开发、测试和生产环境的自动化验证和部署。

## 📋 目录

1. [系统要求](#系统要求)
2. [快速开始](#快速开始)
3. [环境配置](#环境配置)
4. [部署脚本使用](#部署脚本使用)
5. [环境验证](#环境验证)
6. [故障排除](#故障排除)
7. [最佳实践](#最佳实践)

## 📋 系统要求

### 基础要求
- **操作系统**: Windows 10/11, Linux, macOS
- **Docker**: >= 20.10.0
- **Docker Compose**: >= 2.0.0
- **Node.js**: >= 22.12.0
- **PowerShell**: >= 5.1 (Windows) 或 PowerShell Core >= 7.0
- **内存**: 至少 8GB RAM (推荐 16GB)
- **磁盘空间**: 至少 10GB 可用空间

### 可选工具
- **Git**: 用于版本控制
- **curl/wget**: 用于健康检查
- **jq**: 用于 JSON 处理

## 🚀 快速开始

### 1. 项目克隆和初始化

```bash
# 克隆项目
git clone <repository-url>
cd SecureFrontEnd

# 安装依赖
npm install

# 运行环境验证
npm run validate:environment
```

### 2. 统一部署脚本使用

#### Shell 脚本部署 (推荐用于 Linux/macOS/WSL)

```bash
# 设置执行权限
chmod +x scripts/runners/compose-universal.sh

# 开发环境部署
bash scripts/runners/compose-universal.sh dev up

# 测试环境部署
bash scripts/runners/compose-universal.sh staging up

# 生产环境部署
bash scripts/runners/compose-universal.sh prod up

# 查看状态
bash scripts/runners/compose-universal.sh prod status

# 查看日志
bash scripts/runners/compose-universal.sh dev logs
```

#### PowerShell 脚本部署 (推荐用于 Windows)

```powershell
# 开发环境部署
.\scripts\runners\compose-universal.ps1 -Environment dev -Action up

# 测试环境部署
.\scripts\runners\compose-universal.ps1 -Environment staging -Action up

# 生产环境部署
.\scripts\runners\compose-universal.ps1 -Environment prod -Action up

# 查看状态
.\scripts\runners\compose-universal.ps1 -Environment prod -Action status

# 查看日志
.\scripts\runners\compose-universal.ps1 -Environment dev -Action logs
```

## ⚙️ 环境配置

### 环境文件配置

每个环境都有对应的环境配置文件：

- **开发环境**: `.env.dev`
- **测试环境**: `.env.staging`
- **生产环境**: `.env.prod`

### 基础环境变量

```bash
# 应用配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_NAME=securefrontend
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT 配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# 加密配置
ENCRYPTION_KEY=your_encryption_key
```

## 🛠️ 部署脚本使用

### 统一脚本功能

新的统一脚本 `compose-universal.sh` 和 `compose-universal.ps1` 支持以下操作：

#### 基础操作 (所有环境)
- `up`: 启动容器
- `down`: 停止并移除容器
- `pull`: 拉取最新镜像
- `build`: 构建镜像
- `restart`: 重启容器
- `status`: 显示容器状态
- `logs`: 显示容器日志

#### 高级操作 (staging/prod)
- `backup`: 创建数据备份
- `restore`: 恢复数据备份

#### 生产环境专用操作
- `health`: 健康检查
- `scale`: 扩缩容
- `rollback`: 回滚

### 使用示例

```bash
# 启动开发环境
./scripts/runners/compose-universal.sh dev up

# 停止测试环境
./scripts/runners/compose-universal.sh staging down

# 生产环境健康检查
./scripts/runners/compose-universal.sh prod health

# 查看帮助
./scripts/runners/compose-universal.sh help
```

## 🔍 环境验证

### 自动化验证脚本

使用环境验证脚本确保部署环境正确：

#### Shell 版本
```bash
# 设置执行权限
chmod +x scripts/deploy/environment-verification.sh

# 验证开发环境
bash scripts/deploy/environment-verification.sh dev

# 验证生产环境
bash scripts/deploy/environment-verification.sh production
```

#### PowerShell 版本
```powershell
# 验证开发环境
.\scripts\deploy\environment-verification.ps1 -Environment dev

# 验证生产环境
.\scripts\deploy\environment-verification.ps1 -Environment production
```

### 验证内容

验证脚本会检查以下内容：

1. **系统要求**: Docker、Node.js、内存、磁盘空间
2. **网络连接**: 端口可用性、网络连通性
3. **文件权限**: 配置文件、脚本执行权限
4. **环境变量**: 必需的环境变量配置
5. **服务健康**: 容器状态、应用响应
6. **安全配置**: SSL证书、密钥配置

## 🔧 故障排除

### 常见问题

#### 1. 容器启动失败
```bash
# 检查容器状态
docker compose ps

# 查看容器日志
docker compose logs <service_name>

# 重新构建镜像
docker compose build --no-cache
```

#### 2. 端口冲突
```bash
# 检查端口占用
netstat -tulpn | grep :3000

# 停止冲突服务
sudo systemctl stop <service_name>
```

#### 3. 权限问题
```bash
# 设置脚本执行权限
chmod +x scripts/runners/*.sh
chmod +x scripts/deploy/*.sh

# 检查文件所有者
ls -la scripts/
```

#### 4. 环境变量问题
```bash
# 验证环境文件
cat .env.prod

# 检查环境变量加载
docker compose config
```

### 日志文件位置

```bash
# 应用日志
tail -f logs/app.log

# 错误日志
tail -f logs/error.log

# 部署日志
tail -f logs/deployment/verification_report_*.md
```

## 🌐 服务访问地址

部署完成后，可以通过以下地址访问各个环境的服务：

### 开发环境 (dev)

| 服务 | 地址 | 说明 |
|------|------|------|
| 主应用 | http://localhost:3000 | 应用主入口 |
| API 接口 | http://localhost:3000/api/v1 | RESTful API |
| 健康检查 | http://localhost:3000/health | 服务健康状态 |
| Nginx | http://localhost:8080 | 反向代理服务器 |
| Grafana | http://localhost:3001 | 监控仪表盘 (admin/admin) |
| Prometheus | http://localhost:9090 | 指标监控 |
| Elasticsearch | http://localhost:9200 | 日志存储 API |
| Kibana | http://localhost:5601 | 日志分析界面 |
| Redis | localhost:6379 | 缓存服务 |
| PostgreSQL | localhost:5432 | 数据库服务 |

### 测试环境 (staging)

| 服务 | 地址 | 说明 |
|------|------|------|
| 主应用 | http://localhost:3010 | 应用主入口 |
| API 接口 | http://localhost:3010/api/v1 | RESTful API |
| 健康检查 | http://localhost:3010/health | 服务健康状态 |
| Redis | localhost:6380 | 缓存服务 |
| PostgreSQL | localhost:5433 | 数据库服务 |

### 生产环境 (prod)

| 服务 | 地址 | 说明 |
|------|------|------|
| 主应用 | http://localhost:3020 | 应用主入口 |
| API 接口 | http://localhost:3020/api/v1 | RESTful API |
| 健康检查 | http://localhost:3020/health | 服务健康状态 |

### 常用操作命令

```bash
# 查看服务状态
bash scripts/runners/compose-universal.sh [env] status

# 查看服务日志
bash scripts/runners/compose-universal.sh [env] logs

# 停止服务
bash scripts/runners/compose-universal.sh [env] down

# 重启服务
bash scripts/runners/compose-universal.sh [env] restart

# 健康检查
curl http://localhost:[port]/health
```

### 重要说明

1. **端口冲突**: 确保相应端口未被其他服务占用
2. **环境变量**: 各环境使用不同的 `.env` 文件配置
3. **生产环境**: 生产环境仅暴露必要的服务端口
4. **监控系统**: 完整的监控栈仅在开发环境中启用
5. **安全配置**: 生产环境需要配置防火墙和SSL证书

## 📋 最佳实践

### 1. 部署前检查清单

- [ ] 备份现有数据
- [ ] 验证环境配置
- [ ] 检查系统资源
- [ ] 测试网络连接
- [ ] 验证SSL证书

### 2. 安全配置

- 使用强密码和密钥
- 定期更新依赖项
- 启用防火墙规则
- 配置SSL/TLS加密
- 实施访问控制

### 3. 监控和维护

- 设置健康检查
- 配置日志轮转
- 监控资源使用
- 定期备份数据
- 更新安全补丁

### 4. 性能优化

- 配置适当的资源限制
- 使用缓存策略
- 优化数据库查询
- 启用压缩
- 配置CDN

## 📞 支持和帮助

如果遇到问题，请：

1. 查看日志文件获取详细错误信息
2. 运行环境验证脚本诊断问题
3. 检查系统资源和网络连接
4. 参考故障排除部分的解决方案

---

**注意**: 本指南会根据项目更新持续改进。建议定期查看最新版本。