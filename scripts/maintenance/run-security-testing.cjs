const fs = require('fs');
const path = require('path');
const {
    PenetrationTestManager,
    FuzzTestManager,
    SecurityRegressionTestManager,
    SecurityTestingAutomationSystem
} = require('./security-testing-automation.cjs');

/**
 * 安全测试自动化系统演示
 */
async function runSecurityTestingDemo() {
    console.log('🔒 启动安全测试自动化系统演示...\n');

    try {
        // 初始化安全测试系统
        const securityTester = new SecurityTestingAutomationSystem();

        // 配置测试参数
        const testConfig = {
            targetUrl: 'https://example-app.com',
            endpoints: ['login', 'register', 'search', 'upload', 'api/users', 'api/data'],
            testDepth: 'comprehensive',
            reportFormat: 'detailed'
        };

        console.log('⚙️ 测试配置:');
        console.log(`   🎯 目标URL: ${testConfig.targetUrl}`);
        console.log(`   📡 测试端点: ${testConfig.endpoints.join(', ')}`);
        console.log(`   🔍 测试深度: ${testConfig.testDepth}`);
        console.log(`   📋 报告格式: ${testConfig.reportFormat}\n`);

        // 执行综合安全测试
        console.log('🚀 开始执行综合安全测试套件...\n');
        const testSession = await securityTester.runComprehensiveSecurityTests(testConfig);

        // 显示测试结果摘要
        console.log('\n' + '='.repeat(60));
        console.log('📊 综合安全测试报告摘要');
        console.log('='.repeat(60));

        if (testSession.summary) {
            const summary = testSession.summary;
            
            console.log(`\n🏆 总体安全评分: ${summary.overallSecurityScore}/100`);
            console.log(`📈 安全等级: ${summary.securityRating}`);
            console.log(`🧪 总测试数量: ${summary.totalTests}`);
            console.log(`✅ 通过测试数量: ${summary.passedTests}`);
            
            console.log('\n🚨 发现的安全问题:');
            console.log(`   🔴 关键问题: ${summary.criticalIssues}`);
            console.log(`   🟠 高危问题: ${summary.highIssues}`);
            console.log(`   🟡 中危问题: ${summary.mediumIssues}`);
            console.log(`   🟢 低危问题: ${summary.lowIssues}`);

            // 风险评估
            console.log('\n⚠️ 风险评估:');
            console.log(`   📊 风险等级: ${summary.riskAssessment.riskLevel}`);
            console.log(`   💼 业务影响: ${summary.riskAssessment.businessImpact}`);
            console.log(`   ⏰ 修复紧急程度: ${summary.riskAssessment.urgency}`);

            // 详细测试结果
            console.log('\n' + '='.repeat(60));
            console.log('📋 详细测试结果');
            console.log('='.repeat(60));

            // 渗透测试结果
            if (testSession.results.penetrationTest) {
                const penTest = testSession.results.penetrationTest;
                console.log('\n🎯 渗透测试结果:');
                console.log(`   🔍 总测试数: ${penTest.totalTests}`);
                console.log(`   🚨 发现漏洞: ${penTest.vulnerabilitiesFound}`);
                console.log(`   📊 安全评级: ${penTest.summary.securityRating}`);
                
                if (penTest.vulnerabilitiesFound > 0) {
                    console.log('\n   🔍 发现的漏洞类型:');
                    penTest.testResults.forEach(suite => {
                        if (suite.vulnerabilitiesFound > 0) {
                            console.log(`     • ${suite.testName}: ${suite.vulnerabilitiesFound} 个漏洞`);
                            suite.findings.slice(0, 2).forEach(finding => {
                                console.log(`       - ${finding.vulnerability}`);
                            });
                        }
                    });
                }
            }

            // 模糊测试结果
            if (testSession.results.fuzzTest) {
                const fuzzTest = testSession.results.fuzzTest;
                console.log('\n🔀 模糊测试结果:');
                console.log(`   🧪 总测试数: ${fuzzTest.totalTests}`);
                console.log(`   💥 发现崩溃: ${fuzzTest.crashesFound}`);
                console.log(`   📊 稳定性评级: ${fuzzTest.summary.stabilityRating}`);
                console.log(`   💪 稳定性分数: ${fuzzTest.summary.stabilityScore}/100`);
                
                if (fuzzTest.crashesFound > 0) {
                    console.log('\n   💥 崩溃类型分布:');
                    Object.entries(fuzzTest.summary.crashTypeBreakdown).forEach(([type, count]) => {
                        console.log(`     • ${type}: ${count} 次`);
                    });
                }
            }

            // 回归测试结果
            if (testSession.results.regressionTest) {
                const regTest = testSession.results.regressionTest;
                console.log('\n🔄 安全回归测试结果:');
                console.log(`   🧪 总测试数: ${regTest.totalTests}`);
                console.log(`   ✅ 通过测试: ${regTest.passedTests}`);
                console.log(`   ❌ 失败测试: ${regTest.failedTests}`);
                console.log(`   🔙 回归问题: ${regTest.regressions}`);
                console.log(`   📈 通过率: ${regTest.summary.passRate}`);
                console.log(`   📊 质量分数: ${regTest.summary.qualityScore}/100`);
                console.log(`   📈 安全趋势: ${regTest.summary.securityTrend}`);
            }

            // 修复建议
            console.log('\n' + '='.repeat(60));
            console.log('💡 修复建议和后续步骤');
            console.log('='.repeat(60));
            
            console.log('\n🔧 优先修复建议:');
            summary.recommendations.slice(0, 5).forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec}`);
            });

            // 生成详细报告
            const report = securityTester.generateTestReport(testSession);
            const reportPath = path.join(__dirname, 'SECURITY_TESTING_REPORT.json');
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            
            console.log('\n📄 详细报告已保存至: SECURITY_TESTING_REPORT.json');
            console.log(`📊 报告ID: ${report.reportId}`);
            console.log(`⏱️ 测试执行时间: ${report.executionTime}`);

        } else {
            console.log('❌ 测试执行失败，无法生成摘要报告');
            if (testSession.error) {
                console.log(`错误信息: ${testSession.error}`);
            }
        }

        // CI/CD 集成示例
        console.log('\n' + '='.repeat(60));
        console.log('🔄 CI/CD 集成示例');
        console.log('='.repeat(60));
        
        console.log('\n📋 GitHub Actions 工作流示例:');
        console.log(`
name: Security Testing Pipeline
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Run Security Tests
        run: node run-security-testing.cjs
        env:
          TARGET_URL: \${{ secrets.STAGING_URL }}
          
      - name: Upload Security Report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: SECURITY_TESTING_REPORT.json
          
      - name: Security Gate Check
        run: |
          CRITICAL_ISSUES=\$(cat SECURITY_TESTING_REPORT.json | jq '.summary.criticalIssues')
          if [ "\$CRITICAL_ISSUES" -gt "0" ]; then
            echo "❌ 发现关键安全问题，阻止部署"
            exit 1
          fi
        `);

        // 安全测试最佳实践
        console.log('\n📚 安全测试最佳实践:');
        console.log(`
🔒 安全测试策略建议:
   1. 左移安全测试 - 在开发早期集成安全测试
   2. 自动化优先 - 将安全测试集成到CI/CD流程
   3. 分层测试 - 结合静态、动态和交互式测试
   4. 持续监控 - 建立生产环境安全监控
   5. 威胁建模 - 基于威胁模型设计测试用例

🛡️ 安全测试工具链:
   • SAST: SonarQube, Checkmarx, Veracode
   • DAST: OWASP ZAP, Burp Suite, Nessus
   • IAST: Contrast Security, Seeker
   • 依赖扫描: Snyk, OWASP Dependency Check
   • 容器安全: Twistlock, Aqua Security

📊 安全指标监控:
   • 漏洞发现率和修复时间
   • 安全测试覆盖率
   • 误报率和漏报率
   • 安全债务趋势
   • 合规性达成率
        `);

        // 企业级集成示例
        console.log('\n🏢 企业级安全测试集成示例:');
        console.log(`
// 企业安全测试管理器
class EnterpriseSecurityTestManager {
    constructor(config) {
        this.securityTester = new SecurityTestingAutomationSystem();
        this.config = config;
        this.reportingService = new SecurityReportingService();
        this.notificationService = new SecurityNotificationService();
    }

    // 定期安全测试
    async scheduleSecurityTests() {
        const schedule = cron.schedule('0 2 * * *', async () => {
            console.log('🕐 执行定期安全测试...');
            const results = await this.securityTester.runComprehensiveSecurityTests();
            
            // 发送报告
            await this.reportingService.generateReport(results);
            
            // 安全告警
            if (results.summary.criticalIssues > 0) {
                await this.notificationService.sendCriticalAlert(results);
            }
        });
        
        return schedule;
    }

    // 发布前安全检查
    async preReleaseSecurityCheck(releaseCandidate) {
        const testConfig = {
            targetUrl: releaseCandidate.stagingUrl,
            testDepth: 'comprehensive',
            complianceChecks: ['OWASP_TOP10', 'PCI_DSS', 'GDPR']
        };
        
        const results = await this.securityTester.runComprehensiveSecurityTests(testConfig);
        
        // 安全门禁检查
        const securityGate = {
            criticalIssues: results.summary.criticalIssues === 0,
            highIssues: results.summary.highIssues <= 2,
            overallScore: results.summary.overallSecurityScore >= 80
        };
        
        const canRelease = Object.values(securityGate).every(check => check);
        
        return {
            canRelease,
            securityGate,
            testResults: results,
            recommendations: results.summary.recommendations
        };
    }
}
        `);

    } catch (error) {
        console.error('❌ 安全测试演示执行失败:', error);
        console.error('错误详情:', error.stack);
    }
}

// 执行演示
if (require.main === module) {
    runSecurityTestingDemo().then(() => {
        console.log('\n✅ 安全测试自动化系统演示完成!');
        console.log('📋 主要功能:');
        console.log('   ✅ 自动化渗透测试');
        console.log('   ✅ 智能模糊测试');
        console.log('   ✅ 安全回归测试');
        console.log('   ✅ 综合风险评估');
        console.log('   ✅ 自动化报告生成');
        console.log('   ✅ CI/CD 集成支持');
        console.log('   ✅ 企业级安全管理');
        console.log('   ✅ 持续安全监控');
    }).catch(error => {
        console.error('演示执行失败:', error);
        process.exit(1);
    });
}

module.exports = { runSecurityTestingDemo };