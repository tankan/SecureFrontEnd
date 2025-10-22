# 🚀 快速开始指南

欢迎使用 SecureFrontEnd！本指南将帮助您在几分钟内快速启动并运行这个安全的前端应用程序。

## 📋 前置要求

### 系统要求
- **Node.js**: 版本 18.0 或更高
- **npm**: 版本 8.0 或更高
- **操作系统**: Windows 10/11, macOS 10.15+, 或 Linux (Ubuntu 18.04+)
- **内存**: 至少 4GB RAM
- **存储**: 至少 1GB 可用空间

### 浏览器支持
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## ⚡ 快速安装

### 1. 克隆项目
```bash
git clone https://github.com/your-org/SecureFrontEnd.git
cd SecureFrontEnd
```

### 2. 安装依赖
```bash
npm install
```

### 3. 环境配置
```bash
# 复制环境变量模板
cp config/app/.env.example .env

# 编辑环境变量（可选）
# 配置JWT密钥、云存储凭据等
```

## 🏃‍♂️ 5分钟快速体验

### 启动完整系统
```bash
# 启动应用程序（包含所有安全模块）
node src/app.js
```

您将看到类似以下的输出：
```
🚀 SecureFrontEnd 应用程序启动中...
✅ 核心系统初始化完成
✅ 安全模块系统初始化完成
🔐 访问控制系统已启动
🛡️ 数据保护系统已启动
📊 安全监控系统已启动
🔍 安全测试自动化已启动
📋 合规审计系统已启动
📈 合规改进系统已启动
📊 高级监控系统已启动
🚨 安全监控告警已启动
🔗 集成安全系统已启动
✅ 所有安全模块启动完成
🌟 应用程序启动完成！
```

### 查看系统状态
应用启动后会自动显示系统状态，包括：
- 所有模块的运行状态
- 健康检查报告
- 性能指标概览

## 🔧 基础使用

### 1. 模块管理
```javascript
// 导入模块管理器
import { securityModuleManager } from './src/modules/index.js';

// 获取所有模块状态
const status = securityModuleManager.getStatus();
console.log('模块状态:', status);

// 获取健康报告
const health = securityModuleManager.getHealthReport();
console.log('健康报告:', health);

// 获取特定模块
const accessControl = securityModuleManager.getModule('access-control');
```

### 2. 应用程序控制
```javascript
// 导入应用程序类
import { Application } from './src/app.js';

// 创建应用实例
const app = new Application();

// 启动应用
await app.start();

// 重启应用
await app.restart();

// 停止应用
await app.stop();
```

### 3. 单独运行模块
```bash
# 运行访问控制系统
node scripts/maintenance/run-access-control.cjs

# 运行合规审计
node scripts/maintenance/run-compliance-audit.cjs

# 运行安全监控
node scripts/maintenance/run-security-monitoring.cjs
```

## 🛡️ 安全功能演示

### 访问控制
```bash
# 运行访问控制演示
node scripts/maintenance/run-access-control.cjs
```

### 数据保护
```bash
# 运行数据保护演示
node scripts/maintenance/run-data-protection.cjs
```

### 安全监控
```bash
# 运行安全监控演示
node scripts/maintenance/run-security-monitoring.cjs
```

### 合规审计
```bash
# 运行合规审计
node scripts/maintenance/run-compliance-audit.cjs
```

## 📊 查看报告

运行各种安全模块后，您可以在 `reports/` 目录中查看生成的报告：

```bash
# 查看安全报告
ls reports/security/

# 查看合规报告
ls reports/compliance/

# 查看性能报告
ls reports/performance/
```

## 🔍 示例应用

### Vue.js 示例
```bash
cd examples/vue-app
npm install
npm run dev
```

### 量子安全演示
```bash
node examples/quantum-safe-demo.js
```

### ECC 加密演示
```bash
node examples/ecc-demo.js
```

## 🧪 运行测试

### 完整测试套件
```bash
npm test
```

### 单元测试
```bash
npm run test:unit
```

### 集成测试
```bash
npm run test:integration
```

### 安全测试
```bash
node tests/security-test.js
```

## 🔧 开发模式

### 启动开发服务器
```bash
npm run dev
```

### 代码质量检查
```bash
# ESLint 检查
npm run lint

# 代码格式化
npm run format
```

### 性能测试
```bash
node tests/performance-test.js
```

## 📚 下一步

现在您已经成功运行了 SecureFrontEnd，建议您：

1. **阅读架构文档**: [模块化架构文档](../architecture/MODULE_ARCHITECTURE.md)
2. **查看 API 文档**: [API 使用指南](../api.md)
3. **学习部署方法**: [部署指南](../deployment/DEPLOYMENT_GUIDE.md)
4. **了解安全最佳实践**: [安全指南](../security/SECURITY_GUIDE.md)
5. **故障排除**: [故障排除指南](../troubleshooting/TROUBLESHOOTING.md)

## ❓ 常见问题

### Q: 如何添加新的安全模块？
A: 参考 [模块化架构文档](../architecture/MODULE_ARCHITECTURE.md) 中的扩展指南。

### Q: 如何配置云存储？
A: 编辑 `.env` 文件，配置相应的云存储凭据。

### Q: 如何查看详细日志？
A: 日志文件位于 `logs/` 目录，或查看控制台输出。

### Q: 遇到模块启动失败怎么办？
A: 检查依赖关系和配置文件，查看错误日志获取详细信息，或参考 [故障排除指南](../troubleshooting/TROUBLESHOOTING.md)。

## 🆘 获取帮助

- **文档**: 查看 `docs/` 目录中的详细文档
- **示例**: 参考 `examples/` 目录中的示例代码
- **问题反馈**: 提交 GitHub Issue
- **社区支持**: 加入我们的开发者社区

---

🎉 **恭喜！** 您已经成功开始使用 SecureFrontEnd。享受安全、高效的开发体验！