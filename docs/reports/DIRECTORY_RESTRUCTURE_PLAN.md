# 目录重构计划

## 📋 重构目标

将根目录下散乱的文件按照类型进行分类，存储到对应的专用目录结构中，提高项目的可维护性和可读性。

## 🗂️ 当前问题分析

### 根目录文件过多
根目录下有 **50+** 个文件和目录，包括：
- 配置文件混杂在根目录
- 脚本文件分散在根目录和scripts目录
- 报告文件散布在根目录和reports目录
- 文档文件没有统一管理

## 🎯 新目录结构设计

```
SecureFrontEnd/
├── config/                     # 配置文件目录
│   ├── app/                   # 应用配置
│   │   ├── .env.example
│   │   ├── eslint.config.js
│   │   └── .prettierrc.js
│   ├── docker/                # Docker配置
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   ├── security/              # 安全配置
│   │   ├── security-headers-config.cjs
│   │   └── security-fixes.json
│   └── ci/                    # CI/CD配置
│       └── .github/
├── scripts/                    # 脚本文件目录
│   ├── core/                  # 核心功能脚本
│   │   ├── monitoring-system.js
│   │   ├── security-audit.js
│   │   ├── code-quality-analyzer.js
│   │   ├── feature-modules.js
│   │   ├── advanced-monitoring.js
│   │   ├── performance-benchmark.js
│   │   └── vulnerability-scanner.cjs
│   ├── runners/               # 运行器脚本
│   │   ├── run-advanced-monitoring.js
│   │   ├── run-code-quality.js
│   │   ├── run-feature-demo.js
│   │   ├── run-integration-test.js
│   │   ├── run-monitoring.js
│   │   ├── run-performance-test.js
│   │   ├── run-security-audit.js
│   │   └── run-security-test.js
│   ├── security/              # 安全相关脚本
│   │   ├── security-monitoring-alerting.cjs
│   │   ├── security-testing-automation.cjs
│   │   └── test-security-simple.js
│   ├── testing/               # 测试脚本
│   │   └── performance-integration-test.js
│   └── maintenance/           # 维护脚本 (已存在)
├── reports/                    # 报告文件目录
│   ├── system/                # 系统报告
│   │   ├── COMPREHENSIVE_SYSTEM_REPORT.md
│   │   ├── PROJECT_ARCHITECTURE_ANALYSIS.md
│   │   └── FILE_CLASSIFICATION_REPORT.md
│   ├── security/              # 安全报告 (已存在部分)
│   │   ├── SECURITY_HARDENING_REPORT.md
│   │   └── ACCESS_CONTROL_REPORT.json
│   ├── performance/           # 性能报告 (已存在)
│   │   └── PERFORMANCE_OPTIMIZATION_REPORT.md
│   ├── monitoring/            # 监控报告
│   │   ├── MONITORING_REPORT.json
│   │   └── ADVANCED_MONITORING_REPORT.json
│   ├── quality/               # 代码质量报告
│   │   ├── CODE_QUALITY_REPORT.json
│   │   └── FINAL_TEST_REPORT.md
│   ├── features/              # 功能报告
│   │   ├── FEATURE_MODULES_REPORT.json
│   │   └── DATA_PROTECTION_REPORT.json
│   └── compliance/            # 合规报告 (已存在)
├── docs/                       # 文档目录 (已存在，需补充)
│   ├── migration/             # 迁移文档
│   │   ├── JWT_MIGRATION_NOTES.md
│   │   └── UPGRADE_NOTES.md
│   ├── standards/             # 标准文档
│   │   └── CODING_STANDARDS.md
│   └── guides/                # 指南文档 (已存在)
├── src/                        # 源代码 (保持不变)
├── server/                     # 服务器代码 (保持不变)
├── client/                     # 客户端代码 (保持不变)
├── tests/                      # 测试代码 (保持不变)
├── examples/                   # 示例代码 (保持不变)
├── tools/                      # 工具目录 (保持不变)
├── uploads/                    # 上传目录 (保持不变)
├── package.json               # 保留在根目录
├── package-lock.json          # 保留在根目录
├── .gitignore                 # 保留在根目录
├── LICENSE                    # 保留在根目录
└── README.md                  # 保留在根目录
```

## 📝 文件移动计划

### 第一阶段：配置文件重组
1. **应用配置**
   - `.env.example` → `config/app/.env.example`
   - `eslint.config.js` → `config/app/eslint.config.js`
   - `.prettierrc.js` → `config/app/.prettierrc.js`

2. **Docker配置**
   - `Dockerfile` → `config/docker/Dockerfile`
   - `docker-compose.yml` → `config/docker/docker-compose.yml`

3. **安全配置**
   - `security-headers-config.cjs` → `config/security/security-headers-config.cjs`
   - `security-fixes.json` → `config/security/security-fixes.json`

4. **CI/CD配置**
   - `.github/` → `config/ci/.github/`

### 第二阶段：脚本文件重组
1. **核心功能脚本**
   - `monitoring-system.js` → `scripts/core/monitoring-system.js`
   - `security-audit.js` → `scripts/core/security-audit.js`
   - `code-quality-analyzer.js` → `scripts/core/code-quality-analyzer.js`
   - `feature-modules.js` → `scripts/core/feature-modules.js`
   - `advanced-monitoring.js` → `scripts/core/advanced-monitoring.js`
   - `performance-benchmark.js` → `scripts/core/performance-benchmark.js`
   - `vulnerability-scanner.cjs` → `scripts/core/vulnerability-scanner.cjs`

2. **运行器脚本**
   - `run-*.js` → `scripts/runners/`

3. **安全脚本**
   - `security-monitoring-alerting.cjs` → `scripts/security/`
   - `security-testing-automation.cjs` → `scripts/security/`
   - `test-security-simple.js` → `scripts/security/`

4. **测试脚本**
   - `performance-integration-test.js` → `scripts/testing/`

### 第三阶段：报告文件重组
1. **系统报告**
   - `COMPREHENSIVE_SYSTEM_REPORT.md` → `reports/system/`
   - `PROJECT_ARCHITECTURE_ANALYSIS.md` → `reports/system/`
   - `FILE_CLASSIFICATION_REPORT.md` → `reports/system/`

2. **安全报告**
   - `SECURITY_HARDENING_REPORT.md` → `reports/security/`
   - `ACCESS_CONTROL_REPORT.json` → `reports/security/`

3. **性能报告**
   - `PERFORMANCE_OPTIMIZATION_REPORT.md` → `reports/performance/`

4. **监控报告**
   - `MONITORING_REPORT.json` → `reports/monitoring/`
   - `ADVANCED_MONITORING_REPORT.json` → `reports/monitoring/`

5. **质量报告**
   - `CODE_QUALITY_REPORT.json` → `reports/quality/`
   - `FINAL_TEST_REPORT.md` → `reports/quality/`

6. **功能报告**
   - `FEATURE_MODULES_REPORT.json` → `reports/features/`
   - `DATA_PROTECTION_REPORT.json` → `reports/features/`

### 第四阶段：文档文件重组
1. **迁移文档**
   - `JWT_MIGRATION_NOTES.md` → `docs/migration/`
   - `UPGRADE_NOTES.md` → `docs/migration/`

2. **标准文档**
   - `CODING_STANDARDS.md` → `docs/standards/`

## 🔄 路径引用更新计划

### 需要更新的文件类型
1. **package.json** - 脚本路径更新
2. **CI/CD配置文件** - 构建和测试路径更新
3. **Docker文件** - 复制路径更新
4. **脚本文件** - 相互引用路径更新
5. **文档文件** - 内部链接更新

### 关键引用路径
- `package.json` 中的 scripts 字段
- `.github/workflows/` 中的脚本路径
- `docker-compose.yml` 中的 Dockerfile 路径
- 各种运行器脚本中的核心脚本引用
- 文档中的相对路径链接

## ✅ 验证检查清单

### 功能验证
- [ ] npm scripts 正常运行
- [ ] Docker 构建和运行正常
- [ ] CI/CD 流水线正常
- [ ] 所有脚本可以正常执行
- [ ] 文档链接正确

### 路径验证
- [ ] 所有 import/require 路径正确
- [ ] 所有文件引用路径正确
- [ ] 所有配置文件路径正确
- [ ] 所有文档链接正确

## 🎯 预期收益

1. **提高可维护性** - 文件分类清晰，易于查找和管理
2. **提升开发效率** - 减少文件查找时间
3. **增强可读性** - 项目结构更加清晰
4. **便于扩展** - 新文件有明确的存放位置
5. **符合最佳实践** - 遵循现代项目组织规范

## ⚠️ 注意事项

1. **备份重要** - 重构前创建完整备份
2. **分阶段执行** - 避免一次性大量修改
3. **测试验证** - 每个阶段完成后进行功能测试
4. **文档同步** - 及时更新相关文档
5. **团队沟通** - 确保团队成员了解新结构