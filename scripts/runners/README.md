# 部署运行脚本说明

本目录包含用于不同环境的 Docker Compose 部署脚本，支持 Shell 和 PowerShell 两种格式。

## 脚本概览

### Shell 脚本 (Linux/macOS/WSL)
- `compose-dev.sh` - 开发环境部署脚本
- `compose-staging.sh` - 测试环境部署脚本  
- `compose-prod.sh` - 生产环境部署脚本

### PowerShell 脚本 (Windows)
- `compose-dev.ps1` - 开发环境部署脚本
- `compose-staging.ps1` - 测试环境部署脚本
- `compose-prod.ps1` - 生产环境部署脚本

## 使用方法

### 开发环境

#### Shell 版本
```bash
# 启动服务
bash scripts/runners/compose-dev.sh up

# 停止服务
bash scripts/runners/compose-dev.sh down

# 查看状态
bash scripts/runners/compose-dev.sh status

# 查看日志
bash scripts/runners/compose-dev.sh logs

# 重启服务
bash scripts/runners/compose-dev.sh restart

# 拉取最新镜像
bash scripts/runners/compose-dev.sh pull

# 构建镜像
bash scripts/runners/compose-dev.sh build
```

#### PowerShell 版本
```powershell
# 启动服务
.\scripts\runners\compose-dev.ps1 up

# 停止服务
.\scripts\runners\compose-dev.ps1 down

# 查看状态
.\scripts\runners\compose-dev.ps1 status

# 查看日志
.\scripts\runners\compose-dev.ps1 logs

# 重启服务
.\scripts\runners\compose-dev.ps1 restart

# 拉取最新镜像
.\scripts\runners\compose-dev.ps1 pull

# 构建镜像
.\scripts\runners\compose-dev.ps1 build
```

### 测试环境

#### Shell 版本
```bash
# 启动服务
bash scripts/runners/compose-staging.sh up

# 停止服务
bash scripts/runners/compose-staging.sh down

# 备份数据
bash scripts/runners/compose-staging.sh backup

# 恢复数据
bash scripts/runners/compose-staging.sh restore

# 查看状态
bash scripts/runners/compose-staging.sh status

# 查看日志
bash scripts/runners/compose-staging.sh logs
```

#### PowerShell 版本
```powershell
# 启动服务
.\scripts\runners\compose-staging.ps1 up

# 停止服务
.\scripts\runners\compose-staging.ps1 down

# 备份数据
.\scripts\runners\compose-staging.ps1 backup

# 恢复数据
.\scripts\runners\compose-staging.ps1 restore

# 查看状态
.\scripts\runners\compose-staging.ps1 status

# 查看日志
.\scripts\runners\compose-staging.ps1 logs
```

### 生产环境

#### Shell 版本
```bash
# 启动服务
bash scripts/runners/compose-prod.sh up

# 停止服务
bash scripts/runners/compose-prod.sh down

# 健康检查
bash scripts/runners/compose-prod.sh health

# 扩缩容
bash scripts/runners/compose-prod.sh scale

# 回滚
bash scripts/runners/compose-prod.sh rollback

# 备份数据
bash scripts/runners/compose-prod.sh backup

# 恢复数据
bash scripts/runners/compose-prod.sh restore

# 查看状态
bash scripts/runners/compose-prod.sh status

# 查看日志
bash scripts/runners/compose-prod.sh logs
```

#### PowerShell 版本
```powershell
# 启动服务
.\scripts\runners\compose-prod.ps1 up

# 停止服务
.\scripts\runners\compose-prod.ps1 down

# 健康检查
.\scripts\runners\compose-prod.ps1 health

# 扩缩容
.\scripts\runners\compose-prod.ps1 scale

# 回滚
.\scripts\runners\compose-prod.ps1 rollback

# 备份数据
.\scripts\runners\compose-prod.ps1 backup

# 恢复数据
.\scripts\runners\compose-prod.ps1 restore

# 查看状态
.\scripts\runners\compose-prod.ps1 status

# 查看日志
.\scripts\runners\compose-prod.ps1 logs
```

## 环境要求

- **Node.js**: >= 22.12.0
- **Docker**: >= 20.10.0
- **Docker Compose**: >= 2.0.0
- **Shell**: Bash >= 4.0 (Linux/macOS) 或 PowerShell >= 5.1 (Windows)

## 注意事项

1. **权限设置**: 在 Linux/macOS 系统上，需要为 Shell 脚本设置执行权限：
   ```bash
   chmod +x scripts/runners/*.sh
   ```

2. **环境变量**: 确保相应的环境变量文件存在：
   - 开发环境: `.env.dev`
   - 测试环境: `.env.staging`
   - 生产环境: `.env.prod`

3. **Docker Compose 文件**: 确保相应的 Docker Compose 配置文件存在：
   - 开发环境: `config/docker/docker-compose.yml`
   - 测试环境: `config/docker/docker-compose.staging.yml`
   - 生产环境: `config/docker/docker-compose.production.yml`

4. **生产环境安全**: 生产环境脚本包含额外的安全检查和确认步骤，请仔细阅读提示信息。

## 故障排除

如果遇到问题，请检查：

1. Docker 服务是否正在运行
2. 环境变量文件是否正确配置
3. Docker Compose 文件是否存在
4. 网络端口是否被占用
5. 磁盘空间是否充足

更多详细信息请参考 [部署指南](../deploy/DEPLOYMENT_GUIDE.md)。