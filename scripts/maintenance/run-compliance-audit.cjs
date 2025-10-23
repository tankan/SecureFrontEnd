/**
 * 安全合规审计系统演示运行器
 * 展示GDPR、PCI DSS、SOX合规检查和报告功能
 */

const { ComplianceAuditManager } = require('./security-compliance-audit.cjs');

async function runComplianceAuditDemo() {
    console.log('🛡️ 安全合规审计系统演示');
    console.log('==================================================');

    try {
        // 创建合规审计管理器
        const auditManager = new ComplianceAuditManager();

        // 执行综合合规审计
        console.log('🚀 启动综合安全合规审计...\n');
        const auditReport = await auditManager.performComprehensiveAudit();

        // 演示趋势分析功能
        console.log('\n📈 趋势分析演示');
        console.log('------------------------------');
        
        // 模拟第二次审计以展示趋势分析
        console.log('🔄 执行第二次审计以演示趋势分析...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // 短暂延迟
        
        const secondAudit = await auditManager.performComprehensiveAudit();
        const trendAnalysis = auditManager.generateTrendAnalysis();
        
        if (trendAnalysis.message) {
            console.log(`📊 ${trendAnalysis.message}`);
        } else {
            console.log('📊 合规趋势分析:');
            console.log(`   📈 总体得分变化: ${trendAnalysis.scoreChange > 0 ? '+' : ''}${trendAnalysis.scoreChange}`);
            console.log(`   🇪🇺 GDPR趋势: ${trendAnalysis.gdprTrend > 0 ? '+' : ''}${trendAnalysis.gdprTrend}`);
            console.log(`   💳 PCI DSS趋势: ${trendAnalysis.pciDssTrend > 0 ? '+' : ''}${trendAnalysis.pciDssTrend}`);
            console.log(`   📊 SOX趋势: ${trendAnalysis.soxTrend > 0 ? '+' : ''}${trendAnalysis.soxTrend}`);
            console.log(`   ✅ 整体改善: ${trendAnalysis.improvement ? '是' : '否'}`);
        }

        // 演示审计历史功能
        console.log('\n📚 审计历史记录');
        console.log('------------------------------');
        const auditHistory = auditManager.getAuditHistory();
        console.log(`📋 历史审计记录数: ${auditHistory.length}`);
        
        auditHistory.forEach((audit, index) => {
            console.log(`   ${index + 1}. ${audit.auditId} - 得分: ${audit.overallScore}/100 - ${new Date(audit.timestamp).toLocaleString()}`);
        });

        // 演示企业级集成示例
        await demonstrateEnterpriseIntegration();

        // 演示CI/CD集成示例
        await demonstrateCICDIntegration();

        console.log('\n✅ 安全合规审计系统演示完成!');
        console.log('\n🎯 系统主要功能:');
        console.log('   • GDPR数据保护合规检查');
        console.log('   • PCI DSS支付卡行业标准验证');
        console.log('   • SOX财务报告内控审计');
        console.log('   • 综合合规风险评估');
        console.log('   • 自动化审计报告生成');
        console.log('   • 合规趋势分析');
        console.log('   • 审计历史跟踪');
        console.log('   • 企业级系统集成');
        console.log('   • CI/CD流水线集成');

        return auditReport;

    } catch (error) {
        console.error('❌ 合规审计演示失败:', error.message);
        throw error;
    }
}

// 演示企业级集成
async function demonstrateEnterpriseIntegration() {
    console.log('\n🏢 企业级系统集成演示');
    console.log('------------------------------');

    // GRC平台集成示例
    console.log('🔗 GRC平台集成示例:');
    const grcIntegration = {
        platform: 'ServiceNow GRC',
        endpoint: 'https://company.service-now.com/api/now/table/sn_grc_policy',
        authentication: 'OAuth 2.0',
        features: [
            '合规政策同步',
            '风险评估集成',
            '审计发现跟踪',
            '纠正措施管理',
            '合规仪表板'
        ]
    };

    console.log(`   平台: ${grcIntegration.platform}`);
    console.log(`   认证方式: ${grcIntegration.authentication}`);
    console.log('   集成功能:');
    grcIntegration.features.forEach(feature => {
        console.log(`     - ${feature}`);
    });

    // 合规管理系统集成示例
    console.log('\n📊 合规管理系统集成示例:');
    const complianceSystem = {
        system: 'MetricStream',
        capabilities: [
            '实时合规监控',
            '自动化控制测试',
            '合规报告生成',
            '监管变更跟踪',
            '第三方风险管理'
        ]
    };

    console.log(`   系统: ${complianceSystem.system}`);
    console.log('   集成能力:');
    complianceSystem.capabilities.forEach(capability => {
        console.log(`     - ${capability}`);
    });

    // 审计管理平台集成
    console.log('\n🔍 审计管理平台集成示例:');
    const auditPlatform = {
        platform: 'AuditBoard',
        integrations: [
            '审计计划同步',
            '工作底稿管理',
            '发现问题跟踪',
            '管理层响应',
            '持续监控'
        ]
    };

    console.log(`   平台: ${auditPlatform.platform}`);
    console.log('   集成功能:');
    auditPlatform.integrations.forEach(integration => {
        console.log(`     - ${integration}`);
    });
}

// 演示CI/CD集成
async function demonstrateCICDIntegration() {
    console.log('\n🔄 CI/CD集成演示');
    console.log('------------------------------');

    // Jenkins Pipeline集成
    console.log('🔧 Jenkins Pipeline集成示例:');
    const jenkinsConfig = `
pipeline {
    agent any
    
    stages {
        stage('Compliance Audit') {
            steps {
                script {
                    // 执行合规审计
                    sh 'node security-compliance-audit.cjs'
                    
                    // 解析审计结果
                    def auditResult = readJSON file: 'COMPLIANCE_AUDIT_REPORT_*.json'
                    
                    // 检查合规得分
                    if (auditResult.overallScore < 80) {
                        error "合规得分过低: \${auditResult.overallScore}/100"
                    }
                    
                    // 发布审计报告
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: '.',
                        reportFiles: 'COMPLIANCE_AUDIT_REPORT_*.json',
                        reportName: 'Compliance Audit Report'
                    ])
                }
            }
        }
        
        stage('Compliance Gates') {
            steps {
                script {
                    // GDPR合规门禁
                    if (auditResult.standards.gdpr.overallScore < 75) {
                        currentBuild.result = 'UNSTABLE'
                        echo "警告: GDPR合规得分较低"
                    }
                    
                    // PCI DSS合规门禁
                    if (auditResult.standards.pciDss.overallScore < 80) {
                        error "PCI DSS合规检查失败"
                    }
                }
            }
        }
    }
    
    post {
        always {
            // 发送合规报告
            emailext (
                subject: "合规审计报告 - Build \${BUILD_NUMBER}",
                body: "合规审计完成，总体得分: \${auditResult.overallScore}/100",
                to: "compliance-team@company.com"
            )
        }
    }
}`;

    console.log('   Jenkins Pipeline配置已生成');
    console.log('   主要功能:');
    console.log('     - 自动化合规审计执行');
    console.log('     - 合规得分门禁检查');
    console.log('     - 审计报告发布');
    console.log('     - 邮件通知');

    // GitHub Actions集成
    console.log('\n🐙 GitHub Actions集成示例:');
    const githubActions = `
name: Security Compliance Audit

on:
  schedule:
    - cron: '0 2 * * 1'  # 每周一凌晨2点
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  compliance-audit:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '22'
    
    - name: Run Compliance Audit
      run: |
        node security-compliance-audit.cjs
        
    - name: Check Compliance Score
      run: |
        SCORE=$(jq '.overallScore' COMPLIANCE_AUDIT_REPORT_*.json)
        if [ $SCORE -lt 80 ]; then
          echo "::error::合规得分过低: $SCORE/100"
          exit 1
        fi
        echo "::notice::合规得分: $SCORE/100"
    
    - name: Upload Audit Report
      uses: actions/upload-artifact@v3
      with:
        name: compliance-audit-report
        path: COMPLIANCE_AUDIT_REPORT_*.json
    
    - name: Create Issue for Low Score
      if: failure()
      uses: actions/github-script@v6
      with:
        script: |
          github.rest.issues.create({
            owner: context.repo.owner,
            repo: context.repo.repo,
            title: '合规审计得分过低',
            body: '最新的合规审计显示得分过低，请及时处理相关问题。',
            labels: ['compliance', 'security']
          })`;

    console.log('   GitHub Actions工作流已配置');
    console.log('   主要功能:');
    console.log('     - 定时合规审计');
    console.log('     - PR/Push触发审计');
    console.log('     - 合规得分检查');
    console.log('     - 审计报告上传');
    console.log('     - 自动创建Issue');

    // Azure DevOps集成
    console.log('\n🔷 Azure DevOps集成示例:');
    const azureDevOps = {
        pipeline: 'azure-pipelines.yml',
        features: [
            '合规审计任务',
            '质量门禁',
            '报告发布',
            '通知集成',
            '仪表板展示'
        ]
    };

    console.log(`   Pipeline文件: ${azureDevOps.pipeline}`);
    console.log('   集成功能:');
    azureDevOps.features.forEach(feature => {
        console.log(`     - ${feature}`);
    });
}

// 运行演示
if (require.main === module) {
    runComplianceAuditDemo()
        .then(() => {
            console.log('\n🎉 演示完成!');
        })
        .catch(error => {
            console.error('❌ 演示失败:', error);
            process.exit(1);
        });
}

module.exports = { runComplianceAuditDemo };