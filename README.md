# SecureFrontEnd

一个安全的前端应用程序，具有高级加密功能和安全存储，支持跨平台开发和Linux生产环境部署。

## 功能特性

- 🔐 高级加密算法支持 (AES, RSA, ECC)
- 🛡️ 量子安全加密
- 💾 安全的本地存储
- 🔑 密钥管理系统
- 🌐 Web Worker 支持
- 📊 性能监控和健康检查
- 🔒 安全审计和合规性检查
- 🐳 Docker容器化部署
- 🚀 CI/CD自动化流水线
- 🔄 跨平台开发支持

## 环境要求

### 开发环境
- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **Node.js**: 22.12.0+ (推荐 22.12.0+)
- **npm**: 10.9.1+ (推荐 10.9.1+)
- **Git**: 2.0+
- **VS Code**: 推荐使用（已配置调试环境）

### 生产环境 (Linux)
- **操作系统**: Ubuntu 20.04+, CentOS 8+, RHEL 8+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **内存**: 最小 2GB，推荐 4GB+
- **磁盘**: 最小 10GB 可用空间

## 快速开始

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

### 2. 环境配置

```bash
# 复制环境配置模板
cp .env.template .env.development
cp .env.template .env.staging
cp .env.template .env.production

# 编辑环境变量（根据目标环境）
# 开发环境
nano .env.development

# 测试环境
nano .env.staging

# 生产环境
nano .env.production
```

### 3. 本地开发启动

#### Windows 开发环境
```powershell
# 启动开发服务器
npm run dev

# 或使用 PowerShell 脚本
.\scripts\runners\compose-dev.ps1 -Action up
```

#### 统一部署脚本 (推荐)

##### Shell 脚本部署 (Linux/macOS/WSL)

```bash
# 设置执行权限
chmod +x scripts/runners/compose-universal.sh

# 开发环境
bash scripts/runners/compose-universal.sh dev up      # 启动开发环境
bash scripts/runners/compose-universal.sh dev down    # 停止开发环境
bash scripts/runners/compose-universal.sh dev logs    # 查看开发环境日志
bash scripts/runners/compose-universal.sh dev status  # 查看开发环境状态

# 测试环境
bash scripts/runners/compose-universal.sh staging up       # 启动测试环境
bash scripts/runners/compose-universal.sh staging down     # 停止测试环境
bash scripts/runners/compose-universal.sh staging backup   # 备份测试环境数据
bash scripts/runners/compose-universal.sh staging restore  # 恢复测试环境数据

# 生产环境
bash scripts/runners/compose-universal.sh prod up        # 启动生产环境
bash scripts/runners/compose-universal.sh prod down      # 停止生产环境
bash scripts/runners/compose-universal.sh prod health    # 健康检查
bash scripts/runners/compose-universal.sh prod scale     # 扩缩容
bash scripts/runners/compose-universal.sh prod rollback  # 回滚
```

##### PowerShell 脚本部署 (Windows)

```powershell
# 开发环境
.\scripts\runners\compose-universal.ps1 -Environment dev -Action up      # 启动开发环境
.\scripts\runners\compose-universal.ps1 -Environment dev -Action down    # 停止开发环境
.\scripts\runners\compose-universal.ps1 -Environment dev -Action restart # 重启开发环境

# 测试环境
.\scripts\runners\compose-universal.ps1 -Environment staging -Action up      # 启动测试环境
.\scripts\runners\compose-universal.ps1 -Environment staging -Action down    # 停止测试环境
.\scripts\runners\compose-universal.ps1 -Environment staging -Action build   # 构建测试环境

# 生产环境
.\scripts\runners\compose-universal.ps1 -Environment prod -Action up      # 启动生产环境
.\scripts\runners\compose-universal.ps1 -Environment prod -Action down    # 停止生产环境
.\scripts\runners\compose-universal.ps1 -Environment prod -Action pull    # 拉取最新镜像
```

#### Linux/macOS 开发环境
```bash
# 使用 Linux 开发脚本
chmod +x scripts/dev-linux.sh
./scripts/dev-linux.sh --start

# 或直接使用 npm 脚本
npm run dev:linux
```

### 4. Docker 开发环境

```bash
# 启动完整 Docker 开发环境
npm run docker:up

# 仅启动应用容器
npm run dev:docker

# 查看容器状态
npm run docker:status
```

## 跨平台开发指南

### 路径处理规范

项目使用统一的路径处理工具，确保跨平台兼容性：

```javascript
import { normalizePath, joinPath, getProjectRoot } from './src/utils/path-helper.js';

// ✅ 正确：使用路径工具
const configPath = joinPath(getProjectRoot(), 'config', 'app.json');

// ❌ 错误：硬编码路径分隔符
const configPath = PROJECT_ROOT + '\\config\\app.json';
```

### 环境变量管理

```bash
# 开发环境
NODE_ENV=development
PORT=3000
HOST=localhost

# 测试环境
NODE_ENV=staging
PORT=3001
HOST=0.0.0.0

# 生产环境
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

### VS Code 调试配置

项目已配置完整的 VS Code 调试环境：

- **启动开发服务器**: F5 或 Ctrl+F5
- **调试测试**: 选择 "Debug Tests" 配置
- **附加到 Docker**: 选择 "Attach to Docker" 配置
- **调试部署脚本**: 选择 "Debug Deploy Script" 配置

## 部署指南

### Linux 环境部署

#### 1. 自动化部署（推荐）

```bash
# 部署到测试环境
./scripts/deploy/deploy-linux.sh -e staging -a deploy

# 部署到生产环境
./scripts/deploy/deploy-linux.sh -e production -a deploy -b true -c true

# 查看部署状态
./scripts/deploy/deploy-linux.sh -e production -a status
```

#### 2. 手动部署步骤

```bash
# 1. 环境验证
./scripts/deploy/environment-verification.sh -e production -v

# 2. 构建 Docker 镜像
docker build -f docker/Dockerfile.production -t securefrontend:latest .

# 3. 启动服务
docker-compose -f docker-compose.production.yml up -d

# 4. 健康检查
curl -f http://localhost:3000/health
```

### CI/CD 流水线

项目使用 GitHub Actions 实现自动化 CI/CD：

```yaml
# 触发条件
- push: main, develop, staging 分支
- pull_request: main, develop 分支
- workflow_dispatch: 手动触发

# 流水线阶段
1. 代码质量检查 (ESLint, Prettier, 安全审计)
2. 构建和测试 (多环境并行)
3. Docker 镜像构建和推送
4. 安全漏洞扫描
5. 自动部署 (staging/production)
6. 部署后监控和验证
```

### 环境验证和监控

#### 跨平台环境验证

```bash
# 运行完整环境验证
node scripts/validation/cross-platform-validator.js -e production -v

# 生成验证报告
node scripts/validation/cross-platform-validator.js -e production -o validation-report.json

# 跳过 Docker 检查（仅验证 Node.js 环境）
node scripts/validation/cross-platform-validator.js --skip-docker
```

#### 健康检查和监控

```bash
# 应用健康检查
curl http://localhost:3000/health

# 详细系统状态
curl http://localhost:3000/health/detailed

# 性能监控
npm run monitor:performance

# 安全监控
npm run monitor:security
```

## 🌐 服务访问地址

部署完成后的服务访问地址：

### 快速参考

| 环境 | 主应用 | API | 监控面板 |
|------|--------|-----|----------|
| 开发 (dev) | http://localhost:3000 | http://localhost:3000/api/v1 | http://localhost:3001 |
| 测试 (staging) | http://localhost:3010 | http://localhost:3010/api/v1 | - |
| 生产 (prod) | http://localhost:3020 | http://localhost:3020/api/v1 | - |

### 开发环境完整服务列表

- **主应用**: http://localhost:3000
- **Grafana 监控**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Nginx**: http://localhost:8080
- **Elasticsearch**: http://localhost:9200
- **Kibana**: http://localhost:5601

> 📖 **详细信息**: 查看 [部署指南](docs/DEPLOYMENT_GUIDE.md#服务访问地址) 获取完整的服务访问地址列表

## 项目结构

```
SecureFrontEnd/
├── .github/workflows/          # GitHub Actions CI/CD
├── .vscode/                    # VS Code 配置
├── config/                     # 配置文件
│   ├── app/                   # 应用配置
│   ├── database/              # 数据库配置
│   ├── docker/                # Docker 配置
│   ├── environments/          # 环境特定配置
│   ├── logging/               # 日志配置
│   ├── monitoring/            # 监控配置
│   └── security/              # 安全配置
├── docker/                     # Docker 相关文件
│   ├── Dockerfile.production  # 生产环境 Dockerfile
│   └── entrypoint.sh          # 容器启动脚本
├── docs/                       # 项目文档
├── scripts/                    # 脚本工具
│   ├── deploy/                # 部署脚本
│   ├── dev-linux.sh           # Linux 开发脚本
│   ├── runners/               # 运行器脚本
│   ├── testing/               # 测试脚本
│   └── validation/            # 验证脚本
├── src/                        # 源代码
│   ├── core/                  # 核心功能
│   ├── services/              # 服务层
│   ├── utils/                 # 工具函数
│   │   └── path-helper.js     # 跨平台路径工具
│   └── workers/               # Web Workers
├── tests/                      # 测试文件
├── .env.development           # 开发环境变量
├── .env.staging               # 测试环境变量
├── .env.production            # 生产环境变量
├── docker-compose.yml         # Docker Compose 配置
├── docker-compose.staging.yml # 测试环境 Docker 配置
├── docker-compose.production.yml # 生产环境 Docker 配置
└── package.json               # 项目依赖和脚本
```

## 可用脚本

### 开发脚本
```bash
npm run dev                    # 启动开发服务器
npm run dev:linux             # Linux 环境开发
npm run dev:docker            # Docker 开发环境
npm run dev:app               # 仅启动应用
```

### 构建脚本
```bash
npm run build                 # 构建应用
npm run build:development     # 开发环境构建
npm run build:staging         # 测试环境构建
npm run build:production      # 生产环境构建
```

### 测试脚本
```bash
npm run test                  # 运行所有测试
npm run test:unit             # 单元测试
npm run test:integration      # 集成测试
npm run test:e2e              # 端到端测试
npm run test:security         # 安全测试
npm run test:performance      # 性能测试
```

### 部署脚本
```bash
npm run deploy:staging        # 部署到测试环境
npm run deploy:production     # 部署到生产环境
npm run rollback:staging      # 测试环境回滚
npm run rollback:production   # 生产环境回滚
```

### 监控脚本
```bash
npm run monitor:health        # 健康监控
npm run monitor:performance   # 性能监控
npm run monitor:security      # 安全监控
npm run logs:app              # 查看应用日志
npm run logs:system           # 查看系统日志
```

### 维护脚本
```bash
npm run cleanup               # 清理临时文件
npm run security:audit        # 安全审计
npm run validate:environment  # 环境验证
npm run backup:create         # 创建备份
npm run backup:restore        # 恢复备份
```

## 安全特性

### 加密算法支持
- **AES-256-GCM**: 对称加密，用于大量数据加密
- **RSA-OAEP**: 非对称加密，用于密钥交换
- **ECDSA**: 椭圆曲线数字签名
- **Post-Quantum**: 量子安全算法支持

### 安全存储
- 加密的本地存储
- 安全的密钥管理
- 自动密钥轮换
- 安全删除功能

### 安全审计
- 依赖漏洞扫描
- 代码安全检查
- 运行时安全监控
- 合规性验证

## 性能优化

- Web Worker 并行处理
- 内存优化算法
- 智能缓存策略
- 懒加载和代码分割
- Docker 多阶段构建
- 生产环境优化

## 故障排除

### 常见问题

#### 1. Node.js 版本不兼容
```bash
# 检查版本
node --version
npm --version

# 升级 Node.js (使用 nvm)
nvm install 18.17.0
nvm use 18.17.0
```

#### 2. Docker 权限问题 (Linux)
```bash
# 添加用户到 docker 组
sudo usermod -aG docker $USER
newgrp docker
```

#### 3. 端口占用
```bash
# 查找占用端口的进程
lsof -i :3000  # Linux/macOS
netstat -ano | findstr :3000  # Windows

# 终止进程
kill -9 <PID>  # Linux/macOS
taskkill /PID <PID> /F  # Windows
```

#### 4. 环境变量未加载
```bash
# 验证环境变量
npm run validate:environment

# 手动加载环境变量
source .env.development  # Linux/macOS
```

### 日志查看

```bash
# 应用日志
npm run logs:app

# Docker 容器日志
docker-compose logs -f app

# 系统日志 (Linux)
journalctl -u securefrontend -f
```

## 贡献指南

### 开发流程

1. **Fork 项目**
2. **创建功能分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **遵循代码规范**
   ```bash
   npm run lint
   npm run format
   ```
4. **编写测试**
   ```bash
   npm run test
   ```
5. **提交更改**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
6. **推送分支**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **创建 Pull Request**

### 代码规范

- 使用 ESLint 和 Prettier
- 遵循 Conventional Commits 规范
- 编写单元测试和集成测试
- 更新相关文档

### 测试要求

- 单元测试覆盖率 > 80%
- 所有集成测试通过
- 安全测试无高危漏洞
- 性能测试满足基准要求

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持和联系

- **问题报告**: [GitHub Issues](../../issues)
- **功能请求**: [GitHub Discussions](../../discussions)
- **安全问题**: security@example.com
- **技术支持**: support@example.com

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新历史。

---

**注意**: 本项目专为 Linux 生产环境设计，确保在部署前完成跨平台兼容性验证。

## 📋 最新更新

### 🔄 版本更新记录 (2024-12-23)

#### 🔧 配置更新
- 更新了所有 Dockerfile 和 docker-compose 配置文件
- 优化了多阶段构建流程，提升构建效率
- 更新了系统要求文档，明确容器化环境配置

---

## 🌟 项目概述

SecureFrontEnd 是一个企业级的安全前端资源加密存储解决方案，专为需要高度安全性的 Web 应用程序设计。该项目提供了完整的前端资源加密、安全存储、动态解密和浏览器端安全加载的解决方案，采用现代化的模块化架构，支持热插拔、智能依赖管理和全面的安全防护体系。

### 🎯 核心价值
- **企业级安全**: 提供银行级别的数据加密和安全防护
- **模块化架构**: 支持热插拔的模块化设计，易于扩展和维护
- **合规支持**: 满足 GDPR、SOX、PCI-DSS 等主要法规要求
- **智能监控**: 实时安全监控和威胁检测，AI 驱动的智能告警
- **多云支持**: 支持阿里云、AWS、Azure 等主流云平台

## 🚀 核心特性

### 🏗️ 模块化架构系统
- **统一模块管理**: 基于 ModuleRegistry 的中央化模块注册和生命周期管理
- **模块基础设施**: 统一的 ModuleBase 基类，标准化模块接口和行为
- **智能依赖管理**: 自动依赖关系解析和启动顺序控制
- **热插拔支持**: 支持模块的动态加载、卸载和运行时注册
- **健康监控**: 完整的模块健康状态监控和自动恢复机制

### 🔐 企业级安全模块
- **访问控制系统**: 基于角色的访问控制（RBAC）、多因素认证（MFA）和会话管理
- **数据保护系统**: 端到端数据加密、敏感数据脱敏和备份加密
- **安全监控系统**: 实时威胁检测、异常行为分析和安全事件监控
- **安全测试自动化**: 自动化安全测试、漏洞扫描和渗透测试
- **安全培训系统**: 员工安全意识培训、钓鱼邮件模拟和安全知识管理

### 📊 合规监控系统
- **合规审计系统**: 自动化合规检查、审计报告生成和合规框架管理
- **合规改进系统**: 合规缺陷分析、改进计划管理和持续合规跟踪
- **法规遵循**: 支持 GDPR、SOX、PCI-DSS、ISO 27001 等主要法规
- **审计追踪**: 完整的操作审计日志和合规证据收集

### 🔍 智能监控告警系统
- **高级监控系统**: APM 性能监控、系统指标收集和实时分析
- **威胁检测引擎**: AI 驱动的威胁检测、行为分析和异常识别
- **智能告警系统**: 多级告警机制、智能降噪和自动化响应
- **事件响应系统**: 安全事件分类、响应工作流和应急协调

### 🔗 集成安全系统
- **统一安全入口**: 集成所有安全模块的统一管理界面和控制台
- **系统验证**: 全面的功能验证、集成测试和性能验证
- **API 安全**: 完整的 API 安全防护、认证授权和速率限制
- **第三方集成**: 支持与主流安全工具和 SIEM 系统的集成

### 🔐 高级加密技术
- **多重加密算法**: AES-256-GCM、RSA-2048、ECC 椭圆曲线加密
- **量子安全加密**: Kyber 密钥封装、Dilithium 数字签名等后量子密码学
- **密钥管理**: 自动密钥轮换、安全密钥存储和分发
- **完整性验证**: SHA-256 校验和、数字签名和防篡改保护

### ☁️ 多云存储集成
- **多云平台支持**: 阿里云 OSS、AWS S3、Azure Blob Storage、OneDrive
- **智能上传**: 批量上传、断点续传和并行传输优化
- **存储安全**: 云端加密存储、访问控制和数据备份
- **成本优化**: 智能存储分层、生命周期管理和成本监控

### 🌐 浏览器端安全加载
- **安全入口页面**: 美观的用户认证界面和资源加载进度显示
- **多种加载方式**: Blob 对象注入、iframe 沙箱加载、ES 模块动态导入
- **渐进式加载**: 支持大型应用的分块下载和渐进式解密
- **兼容性保障**: WebCrypto API 优先，crypto-js 降级支持

### 🛠️ 开发运维支持
- **CI/CD 集成**: 完整的 GitHub Actions 和 GitLab CI 流水线配置
- **容器化部署**: Docker 多环境部署、Kubernetes 支持
- **监控运维**: Prometheus 指标收集、Grafana 可视化、日志聚合
- **调试工具**: 性能分析、内存监控、安全审计工具

## 📋 系统要求

- **Node.js**: >= 22.12.0
- **npm**: >= 10.0.0
- **操作系统**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)
- **浏览器**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **内存**: 最低 4GB RAM，推荐 8GB+
- **存储**: 最低 2GB 可用空间

### 🐳 容器化环境
- **基础镜像**: node:22-alpine
- **编排工具**: Docker Compose 2.0+ 或 Kubernetes 1.20+

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone https://github.com/your-org/SecureFrontEnd.git
cd SecureFrontEnd

# 安装依赖
npm install
```

### 2. 环境配置

```bash
# 复制环境变量模板
cp config/app/.env.example .env

# 编辑环境变量文件
# 配置以下关键参数：
# - JWT_SECRET: JWT 密钥
# - 云存储凭据 (阿里云/AWS/Azure)
# - 数据库连接信息
# - 监控和日志配置
```

### 3. 启动服务

```bash
# 启动后端服务
npm run serve

# 启动开发服务器
npm run dev

# 启动 Vue3 示例应用
cd examples/vue-app && npm run dev

# 启动监控系统
npm run monitoring:setup
```

### 4. 构建和部署

```bash
# 构建生产版本
npm run build:prod

# 加密构建产物
npm run encrypt

# 上传到云存储
npm run upload

# 部署到生产环境
npm run deploy:prod
```

### 5. 验证安装

```bash
# 运行健康检查
npm run health:check

# 运行安全测试
npm run test:security

# 运行完整测试套件
npm test
```

## 📁 项目结构

```
SecureFrontEnd/
├── 📁 src/                          # 核心源代码
│   ├── 📁 modules/                  # 模块化系统 ⭐
│   │   ├── 📁 base/                # 模块基础架构
│   │   │   ├── module-base.js      # 统一模块基类
│   │   │   ├── module-registry.js  # 模块注册中心
│   │   │   └── index.js           # 基础设施导出
│   │   ├── 📁 security/           # 安全模块集群
│   │   │   ├── access-control-system.cjs      # 访问控制系统
│   │   │   ├── data-protection-system.cjs     # 数据保护系统
│   │   │   ├── security-monitoring-system.cjs # 安全监控系统
│   │   │   ├── security-testing-automation.cjs # 安全测试自动化
│   │   │   └── security-training-system.cjs   # 安全培训系统
│   │   ├── 📁 compliance/         # 合规模块集群
│   │   │   ├── security-compliance-audit.cjs     # 合规审计系统
│   │   │   └── compliance-improvement-system.cjs # 合规改进系统
│   │   ├── 📁 monitoring/         # 监控模块集群
│   │   │   ├── advanced-monitoring-system.cjs    # 高级监控系统
│   │   │   ├── security-monitoring-alerting.cjs  # 安全监控告警
│   │   │   └── incident-response-system.cjs      # 事件响应系统
│   │   ├── 📁 integration/        # 集成模块集群
│   │   │   ├── integrated-security-system.cjs    # 集成安全系统
│   │   │   └── system-verification.cjs           # 系统验证
│   │   └── index.js               # 统一模块管理器
│   ├── 📁 core/                   # 核心功能模块
│   │   ├── 📁 encryption/         # 加密子系统
│   │   │   ├── aes-encryption.js      # AES 加密实现
│   │   │   ├── rsa-encryption.js      # RSA 加密实现
│   │   │   ├── quantum-encryption.js  # 量子安全加密
│   │   │   └── index.js              # 加密模块导出
│   │   ├── encryption.js          # 主加密类
│   │   ├── compression.js         # 压缩处理类
│   │   ├── ecc-encryption.js      # ECC 椭圆曲线加密
│   │   ├── quantum-safe.js        # 量子安全算法
│   │   └── worker-manager.js      # Web Worker 管理器
│   ├── 📁 services/               # 业务服务层
│   ├── 📁 storage/                # 云存储模块
│   │   └── cloud-storage.js       # 多云存储管理器
│   ├── 📁 utils/                  # 工具函数库
│   ├── 📁 types/                  # TypeScript 类型定义
│   ├── 📁 workers/                # Web Workers
│   │   └── encryption-worker.js   # 加密工作线程
│   └── app.js                     # 应用程序主入口 ⭐
├── 📁 server/                     # 后端服务
│   ├── index.js                   # 服务器入口
│   ├── 📁 routes/                 # API 路由
│   │   ├── auth.js               # 认证路由
│   │   ├── keys.js               # 密钥管理路由
│   │   ├── resources.js          # 资源管理路由
│   │   └── admin.js              # 管理员路由
│   ├── 📁 services/               # 后端服务
│   │   ├── database.js           # 数据库服务
│   │   └── key-management.js     # 密钥管理服务
│   └── 📁 middleware/             # 中间件
│       ├── auth.js               # 认证中间件
│       ├── error.js              # 错误处理中间件
│       └── logger.js             # 日志中间件
├── 📁 client/                     # 浏览器端代码
│   └── 📁 secure/                 # 安全加载器
│       ├── index.html            # 安全入口页面
│       └── crypto-loader.js      # 加密解密库
├── 📁 config/                     # 配置文件系统
│   ├── 📁 app/                   # 应用配置
│   │   ├── .env.example          # 环境变量模板
│   │   ├── eslint.config.js      # ESLint 配置
│   │   └── .prettierrc.cjs       # Prettier 配置
│   ├── 📁 ci/                    # CI/CD 配置
│   │   ├── 📁 .github/workflows/ # GitHub Actions
│   │   ├── gitlab-ci.yml         # GitLab CI 配置
│   │   └── github-actions.yml    # GitHub Actions 配置
│   ├── 📁 docker/                # Docker 配置
│   │   ├── Dockerfile            # Docker 镜像定义
│   │   ├── docker-compose.yml    # 开发环境
│   │   ├── docker-compose.staging.yml  # 测试环境
│   │   └── docker-compose.production.yml # 生产环境
│   ├── 📁 monitoring/            # 监控配置
│   │   ├── prometheus.yml        # Prometheus 配置
│   │   ├── grafana-dashboards.json # Grafana 仪表板
│   │   └── alert_rules.yml       # 告警规则
│   ├── 📁 logging/               # 日志配置
│   │   ├── fluentd.conf          # Fluentd 配置
│   │   └── logrotate.conf        # 日志轮转配置
│   ├── 📁 security/              # 安全配置
│   │   ├── security-headers-config.cjs # 安全头配置
│   │   └── security-fixes.json   # 安全修复记录
│   ├── 📁 database/              # 数据库配置
│   └── 📁 environments/          # 环境特定配置
├── 📁 scripts/                   # 构建和维护脚本
│   ├── 📁 build/                 # 构建脚本
│   │   └── build.js              # 主构建脚本
│   ├── 📁 core/                  # 核心功能脚本
│   │   ├── advanced-monitoring.js      # 高级监控脚本
│   │   ├── security-audit.js           # 安全审计脚本
│   │   ├── performance-benchmark.js    # 性能基准测试
│   │   └── code-quality-analyzer.js    # 代码质量分析
│   ├── 📁 maintenance/           # 维护脚本集合
│   │   ├── run-security-audit.cjs      # 安全审计运行器
│   │   ├── run-compliance-audit.cjs    # 合规审计运行器
│   │   ├── run-system-verification.cjs # 系统验证运行器
│   │   └── run-integrated-system.cjs   # 集成系统运行器
│   ├── 📁 runners/               # 功能运行器
│   │   ├── run-security-test.js        # 安全测试运行器
│   │   ├── run-performance-test.js     # 性能测试运行器
│   │   └── run-monitoring.js           # 监控系统运行器
│   ├── 📁 deploy/                # 部署脚本
│   │   └── deploy.js             # 部署管理脚本
│   ├── 📁 monitoring/            # 监控脚本
│   │   ├── setup-monitoring.js   # 监控系统设置
│   │   └── health-check.js       # 健康检查脚本
│   ├── 📁 debug/                 # 调试工具
│   │   └── debug-tools.js        # 调试工具集
│   ├── 📁 testing/               # 测试脚本
│   │   ├── test-runner.js        # 测试运行器
│   │   └── performance-integration-test.js # 性能集成测试
│   ├── dev.js                    # 开发服务器
│   ├── start.js                  # 应用启动脚本
│   └── encrypt.js                # 加密工具脚本
├── 📁 examples/                  # 示例应用
│   ├── 📁 vue-app/              # Vue3 示例应用
│   │   ├── package.json         # Vue 应用配置
│   │   ├── vite.config.js       # Vite 配置
│   │   └── 📁 src/              # Vue 源代码
│   ├── quantum-safe-demo.js     # 量子安全演示
│   ├── ecc-demo.js              # ECC 加密演示
│   └── worker-demo.js           # Worker 使用演示
├── 📁 tests/                    # 测试文件
│   ├── 📁 unit/                 # 单元测试
│   ├── 📁 integration/          # 集成测试
│   └── 📁 e2e/                  # 端到端测试
├── 📁 docs/                     # 项目文档
│   ├── api.md                   # API 文档
│   ├── 📁 architecture/         # 架构文档
│   │   └── MODULE_ARCHITECTURE.md # 模块架构文档
│   ├── 📁 guides/               # 使用指南
│   │   └── QUICK_START.md       # 快速开始指南
│   ├── 📁 deployment/           # 部署文档
│   │   ├── DEPLOYMENT_GUIDE.md  # 部署指南
│   │   └── monitoring-guide.md  # 监控指南
│   ├── 📁 security/             # 安全文档
│   │   └── SECURITY_GUIDE.md    # 安全指南
│   ├── 📁 troubleshooting/      # 故障排除
│   │   └── TROUBLESHOOTING.md   # 故障排除指南
│   ├── 📁 reports/              # 分析报告
│   │   ├── PROJECT_ARCHITECTURE_ANALYSIS.md # 项目架构分析
│   │   └── COMPREHENSIVE_SYSTEM_REPORT.md   # 综合系统报告
│   └── 📁 legacy/               # 历史文档
├── 📁 reports/                  # 系统报告
│   ├── 📁 security/             # 安全报告
│   ├── 📁 compliance/           # 合规报告
│   ├── 📁 performance/          # 性能报告
│   └── 📁 system/               # 系统报告
├── 📁 data/                     # 数据文件
├── 📁 logs/                     # 日志文件
├── 📁 uploads/                  # 上传文件
├── 📁 tools/                    # 开发工具
├── package.json                 # 项目配置
├── README.md                    # 项目说明文档
└── LICENSE                      # 开源许可证
```

### 🔍 关键目录说明

- **⭐ src/modules/**: 核心模块化架构，包含所有功能模块
- **⭐ src/app.js**: 应用程序主入口，统一管理所有模块
- **config/**: 完整的配置管理系统，支持多环境部署
- **scripts/**: 丰富的脚本工具集，覆盖开发、测试、部署全流程
- **reports/**: 自动生成的系统报告和分析结果

## 🔧 使用指南

### 📋 命令行工具

#### 🚀 开发环境
```bash
# 启动开发服务器（支持热重载）
npm run dev

# 启动开发服务器并开启监控
npm run dev:monitor

# 启动调试模式
npm run debug
```

#### 🏗️ 构建和部署
```bash
# 构建生产版本
npm run build

# 部署到生产环境
npm run deploy

# 部署到测试环境
npm run deploy:staging

# 部署到开发环境
npm run deploy:dev
```

#### 🔐 安全和加密
```bash
# 加密资源文件
npm run encrypt

# 运行安全审计
npm run security

# 运行安全测试
npm run security:test

# 运行合规审计
npm run security:compliance

# 启动安全培训系统
npm run security:training
```

#### 📊 监控和健康检查
```bash
# 启动监控系统
npm run monitor

# 运行健康检查
npm run health

# 启动高级监控
npm run monitor:advanced

# 查看系统状态
npm run status
```

#### 🧪 测试
```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行端到端测试
npm run test:e2e

# 运行性能测试
npm run test:performance

# 运行安全测试
npm run test:security
```

#### 🔧 维护和工具
```bash
# 上传文件到云存储
npm run upload

# 启动文件服务器
npm run serve

# 运行代码质量检查
npm run lint

# 格式化代码
npm run format

# 清理缓存和临时文件
npm run clean
```

#### 加密文件

```bash
# 加密单个文件
node scripts/encrypt.js encrypt ./dist/index.html ./encrypted/

# 加密整个目录
node scripts/encrypt.js encrypt ./dist ./encrypted --compression

# 使用密码保护
node scripts/encrypt.js encrypt ./dist ./encrypted --password mypassword
```

#### 上传到云存储

```bash
# 上传到阿里云OSS
node scripts/upload.js ./encrypted --provider aliyun

# 上传到AWS S3
node scripts/upload.js ./encrypted --provider aws
```

### 🌐 API 使用

#### 🔑 认证 API
```javascript
// 用户登录
POST /api/auth/login
{
  "username": "your_username",
  "password": "your_password"
}

// 获取访问令牌
POST /api/auth/token
{
  "refresh_token": "your_refresh_token"
}

// 用户注销
POST /api/auth/logout
```

#### 🗝️ 密钥管理 API
```javascript
// 生成新密钥
POST /api/keys/generate
{
  "algorithm": "AES-256-GCM",
  "purpose": "file_encryption"
}

// 获取密钥信息
GET /api/keys/{keyId}

// 轮换密钥
POST /api/keys/{keyId}/rotate

// 删除密钥
DELETE /api/keys/{keyId}
```

#### 📁 资源管理 API
```javascript
// 上传加密文件
POST /api/resources/upload
Content-Type: multipart/form-data

// 下载解密文件
GET /api/resources/{resourceId}/download

// 获取资源列表
GET /api/resources?page=1&limit=10

// 删除资源
DELETE /api/resources/{resourceId}
```

#### 🛡️ 安全监控 API
```javascript
// 获取安全事件
GET /api/security/events?severity=high&limit=50

// 创建安全告警
POST /api/security/alerts
{
  "type": "unauthorized_access",
  "severity": "high",
  "description": "Multiple failed login attempts"
}

// 获取合规报告
GET /api/compliance/reports/{reportId}
```

#### 模块管理

```javascript
// 导入安全模块管理器
import { securityModuleManager } from './src/modules/index.js';

// 启动所有安全模块
await securityModuleManager.start();

// 获取模块状态
const status = securityModuleManager.getStatus();
console.log('模块状态:', status);

// 获取健康报告
const health = securityModuleManager.getHealthReport();
console.log('健康报告:', health);
```

#### 应用程序集成

```javascript
// 导入应用程序类
import { Application } from './src/app.js';

// 创建应用实例
const app = new Application();

// 启动应用
await app.start();

// 显示系统状态
app.displaySystemStatus();
```

#### 用户认证

```javascript
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'your-username',
    password: 'your-password'
  })
});

const { token, user } = await response.json();
```

#### 密钥管理

```javascript
const keyResponse = await fetch('/api/v1/keys/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    purpose: 'resource_encryption',
    algorithm: 'aes-256-gcm'
  })
});
```

### 🖥️ 浏览器端集成

#### 基础集成
```html
<!DOCTYPE html>
<html>
<head>
    <title>SecureFrontEnd 示例</title>
</head>
<body>
    <!-- 引入安全加载器 -->
    <script src="/client/secure/crypto-loader.js"></script>

    <script>
        // 初始化安全系统
        const secureLoader = new SecureCryptoLoader({
            apiEndpoint: 'https://your-api-endpoint.com',
            encryptionKey: 'your-encryption-key'
        });

        // 加载加密资源
        secureLoader.loadEncryptedResource('path/to/encrypted/file.enc')
            .then(decryptedContent => {
                console.log('资源加载成功:', decryptedContent);
            })
            .catch(error => {
                console.error('资源加载失败:', error);
            });
    </script>
</body>
</html>
```

#### Vue.js 集成
```javascript
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import SecureFrontEnd from 'secure-frontend'

const app = createApp(App)

// 配置安全前端
app.use(SecureFrontEnd, {
  apiEndpoint: process.env.VUE_APP_API_ENDPOINT,
  encryptionConfig: {
    algorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2'
  },
  monitoring: {
    enabled: true,
    endpoint: process.env.VUE_APP_MONITOR_ENDPOINT
  }
})

app.mount('#app')
```

#### React 集成
```javascript
// App.js
import React, { useEffect } from 'react';
import { SecureFrontEndProvider, useSecureLoader } from 'secure-frontend-react';

function App() {
  return (
    <SecureFrontEndProvider
      config={{
        apiEndpoint: process.env.REACT_APP_API_ENDPOINT,
        encryptionConfig: {
          algorithm: 'AES-256-GCM',
          keyDerivation: 'PBKDF2'
        }
      }}
    >
      <SecureComponent />
    </SecureFrontEndProvider>
  );
}

function SecureComponent() {
  const { loadResource, isLoading, error } = useSecureLoader();

  useEffect(() => {
    loadResource('/encrypted/data.enc');
  }, []);

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>加载失败: {error.message}</div>;

  return <div>安全资源已加载</div>;
}
```

### 🔧 高级配置

#### 环境变量配置
```bash
# .env 文件示例
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.example.com

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secure_frontend
DB_USER=your_username
DB_PASSWORD=your_password

# 加密配置
ENCRYPTION_KEY=your-256-bit-encryption-key
KEY_DERIVATION_SALT=your-salt-value
ENCRYPTION_ALGORITHM=AES-256-GCM

# 云存储配置
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-west-2
AWS_S3_BUCKET=your-s3-bucket

# 监控配置
MONITOR_ENABLED=true
MONITOR_ENDPOINT=https://monitor.example.com
ALERT_EMAIL=admin@example.com

# 安全配置
SECURITY_HEADERS_ENABLED=true
CORS_ORIGIN=https://your-frontend.com
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
```

#### Docker 配置
```yaml
# docker-compose.yml
version: '3.8'
services:
  secure-frontend:
    build:
      context: .
      dockerfile: config/docker/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
    depends_on:
      - postgres
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: secure_frontend
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### Dockerfile 配置
```dockerfile
# 多阶段构建 - 构建阶段
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# 生产阶段
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```html
<script src="/secure/crypto-loader.js"></script>
<script>
const loader = new CryptoLoader();

loader.loadEncryptedResource({
  url: 'https://your-cdn.com/encrypted-app.zip.encrypted',
  keyId: 'your-key-id',
  mode: 'blob'
}).then(() => {
  console.log('应用加载完成');
});
</script>
```

## 🔒 安全特性

- **AES-256-GCM**: 认证加密，确保数据完整性和机密性
- **RSA-2048**: 密钥交换和数字签名
- **密钥轮换**: 自动定期轮换加密密钥
- **访问控制**: 基于JWT的用户认证和授权
- **审计日志**: 详细记录所有安全相关操作

## 🧪 测试

```bash
npm test              # 运行所有测试
npm run test:unit     # 单元测试
npm run test:e2e      # 端到端测试
npm run test:coverage # 测试覆盖率
```

## 🚀 部署

### Docker部署

```bash
# 构建镜像（基于 node:22-alpine）
docker build -t secure-frontend .

# 运行容器
docker run -d -p 3000:3000 secure-frontend

# 使用 Docker Compose 部署
docker-compose up -d
```

### 环境变量配置

```bash
# 服务器配置
PORT=3000
NODE_ENV=production
JWT_SECRET=your-jwt-secret

# 云存储配置
ALIYUN_OSS_ACCESS_KEY_ID=your-key
ALIYUN_OSS_ACCESS_KEY_SECRET=your-secret
AWS_ACCESS_KEY_ID=your-aws-key
```

## 📚 文档链接

### 📖 核心文档
- [📋 API 文档](./docs/api.md) - 完整的 REST API 接口说明
- [🏗️ 架构文档](./docs/architecture/MODULE_ARCHITECTURE.md) - 模块化架构设计详解
- [🚀 快速开始](./docs/guides/QUICK_START.md) - 5分钟快速上手指南

### 🚀 部署指南
- [📦 部署指南](./docs/DEPLOYMENT_GUIDE.md) - 生产环境部署完整指南
- [📊 监控指南](./docs/deployment/monitoring-guide.md) - 系统监控和告警配置

### 🔒 安全文档
- [🛡️ 安全指南](./docs/security/SECURITY_GUIDE.md) - 安全最佳实践和配置
- [🔍 故障排除](./docs/troubleshooting/TROUBLESHOOTING.md) - 常见问题解决方案

### 📊 分析报告
- [🏛️ 项目架构分析](./docs/reports/PROJECT_ARCHITECTURE_ANALYSIS.md) - 深度架构分析报告
- [📈 综合系统报告](./docs/reports/COMPREHENSIVE_SYSTEM_REPORT.md) - 系统性能和安全评估

### 🔗 外部资源
- [Node.js 官方文档](https://nodejs.org/docs/) - Node.js 运行时环境
- [Vue.js 官方指南](https://vuejs.org/guide/) - Vue.js 框架文档
- [React 官方文档](https://react.dev/) - React 框架文档
- [Docker 官方文档](https://docs.docker.com/) - 容器化部署指南

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](CONTRIBUTING.md)。

## 📄 许可证

GNU Affero General Public License v3.0 - 查看 [LICENSE](LICENSE) 文件

本项目采用 AGPL-3.0 许可证，这是一个开源的 copyleft 许可证，特别适用于网络服务软件。该许可证确保了软件的自由使用、修改和分发，同时要求任何基于本软件的网络服务也必须开源其源代码。
