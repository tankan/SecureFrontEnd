/**
 * 事件响应计划系统演示
 * 展示安全事件处理流程和应急响应预案
 */

const { 
    IncidentClassificationManager,
    ResponseWorkflowManager,
    EmergencyResponseCoordinator
} = require('./incident-response-system.cjs');

// 演示事件响应系统
async function demonstrateIncidentResponse() {
    console.log('🚨 事件响应计划系统演示');
    console.log('=' .repeat(50));

    const coordinator = new EmergencyResponseCoordinator();

    // 模拟各种安全事件
    const testIncidents = [
        {
            title: '客户数据库疑似泄露',
            description: '监控系统检测到异常的数据库查询活动，可能存在数据泄露风险',
            indicators: ['异常数据访问', '大量数据下载', '未授权登录'],
            affectedSystems: ['customer_database', 'web_application'],
            affectedUsers: 50000,
            estimatedLoss: 500000,
            systemImpact: 'high',
            reporter: 'security_monitor'
        },
        {
            title: '恶意软件感染多台工作站',
            description: '防病毒软件报告多台员工工作站感染勒索软件',
            indicators: ['系统异常', '文件被加密', '网络流量异常'],
            affectedSystems: ['workstations', 'file_server'],
            affectedUsers: 200,
            estimatedLoss: 100000,
            systemImpact: 'medium',
            reporter: 'it_admin'
        },
        {
            title: 'DDoS攻击导致服务中断',
            description: '网站遭受大规模DDoS攻击，服务完全不可用',
            indicators: ['服务不可用', '网络拥塞', '响应时间过长'],
            affectedSystems: ['web_servers', 'load_balancer'],
            affectedUsers: 100000,
            estimatedLoss: 200000,
            systemImpact: 'critical',
            reporter: 'ops_team'
        },
        {
            title: '员工账户异常活动',
            description: '检测到员工账户在非工作时间进行大量敏感数据访问',
            indicators: ['异常访问模式', '权限提升', '数据异常访问'],
            affectedSystems: ['hr_system', 'finance_system'],
            affectedUsers: 10,
            estimatedLoss: 50000,
            systemImpact: 'medium',
            reporter: 'security_analyst'
        },
        {
            title: '钓鱼邮件攻击活动',
            description: '多名员工收到伪装成银行的钓鱼邮件，部分员工可能已点击',
            indicators: ['可疑邮件', '异常登录', '凭据泄露'],
            affectedSystems: ['email_system', 'user_accounts'],
            affectedUsers: 500,
            estimatedLoss: 25000,
            systemImpact: 'low',
            reporter: 'email_security'
        }
    ];

    console.log('\n📋 事件报告与分类');
    console.log('-'.repeat(30));

    const reportedIncidents = [];

    // 报告所有事件
    for (const incidentData of testIncidents) {
        console.log(`\n🚨 报告事件: ${incidentData.title}`);
        
        try {
            const result = await coordinator.reportIncident(incidentData);
            reportedIncidents.push(result);
            
            console.log(`   📊 分类结果:`);
            console.log(`      - 事件类型: ${result.classification.type || '未知'}`);
            console.log(`      - 严重程度: ${result.classification.severity}`);
            console.log(`      - 置信度: ${(result.classification.confidence * 100).toFixed(1)}%`);
            console.log(`      - 响应团队: ${result.responseInstance.assignedTeams.join(', ')}`);
            
            console.log(`   📝 下一步行动:`);
            result.nextSteps.forEach((step, index) => {
                console.log(`      ${index + 1}. ${step}`);
            });

            // 模拟响应进展
            await simulateResponseProgress(coordinator, result.incident.id);
            
        } catch (error) {
            console.error(`❌ 事件报告失败: ${error.message}`);
        }
    }

    console.log('\n📈 响应流程监控');
    console.log('-'.repeat(30));

    // 显示所有活跃事件的状态
    const activeIncidents = coordinator.getActiveIncidents();
    console.log(`当前活跃事件数量: ${activeIncidents.length}`);

    for (const incident of activeIncidents.slice(0, 3)) { // 显示前3个事件的详细信息
        console.log(`\n🔍 事件详情: ${incident.title}`);
        const details = coordinator.getIncidentDetails(incident.id);
        
        if (details.responseStatus) {
            console.log(`   状态: ${details.responseStatus.status}`);
            console.log(`   当前阶段: ${details.responseStatus.currentPhase}`);
            console.log(`   进度: ${details.responseStatus.phaseProgress}`);
            console.log(`   已完成动作: ${details.responseStatus.completedActions}`);
            
            if (details.responseStatus.timeline.length > 0) {
                console.log(`   最新事件: ${details.responseStatus.timeline[details.responseStatus.timeline.length - 1].description}`);
            }
        }
    }

    console.log('\n📊 响应效果分析');
    console.log('-'.repeat(30));

    // 生成响应报告
    const report = await coordinator.generateResponseReport();
    
    console.log(`📋 报告ID: ${report.reportId}`);
    console.log(`📅 报告时间: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`⏱️ 报告周期: ${report.reportPeriod}`);
    
    console.log(`\n📈 响应指标:`);
    console.log(`   总事件数: ${report.metrics.totalIncidents}`);
    console.log(`   已解决事件: ${report.metrics.resolvedIncidents}`);
    console.log(`   关键事件数: ${report.metrics.criticalIncidents}`);
    console.log(`   平均响应时间: ${(report.metrics.averageResponseTime / (1000 * 60 * 60)).toFixed(2)} 小时`);

    console.log(`\n📊 事件分布:`);
    console.log(`   按状态分布:`, JSON.stringify(report.incidentSummary.byStatus, null, 2));
    console.log(`   按严重程度分布:`, JSON.stringify(report.incidentSummary.bySeverity, null, 2));
    console.log(`   按类型分布:`, JSON.stringify(report.incidentSummary.byType, null, 2));

    console.log(`\n🎯 响应效果评估:`);
    console.log(`   解决率: ${report.responseEffectiveness.resolutionRate}`);
    console.log(`   平均响应时间: ${report.responseEffectiveness.averageResponseTime}`);
    console.log(`   效果评级: ${report.responseEffectiveness.effectiveness}`);
    console.log(`   综合评分: ${report.responseEffectiveness.score}/100`);

    console.log(`\n💡 改进建议:`);
    report.recommendations.forEach((recommendation, index) => {
        console.log(`   ${index + 1}. ${recommendation}`);
    });

    console.log('\n🔧 应急响应预案');
    console.log('-'.repeat(30));

    // 演示应急响应预案
    await demonstrateEmergencyPlans();

    console.log('\n🔗 集成示例');
    console.log('-'.repeat(30));

    // CI/CD集成示例
    console.log('\n📦 CI/CD集成 (Jenkins Pipeline):');
    console.log(`pipeline {
    agent any
    stages {
        stage('Security Incident Check') {
            steps {
                script {
                    def coordinator = new EmergencyResponseCoordinator()
                    def activeIncidents = coordinator.getActiveIncidents()
                    
                    if (activeIncidents.any { it.classification.severity in ['critical', 'high'] }) {
                        error('部署暂停: 存在高危安全事件')
                    }
                }
            }
        }
        stage('Deploy') {
            steps {
                echo '部署应用...'
            }
        }
    }
    post {
        failure {
            script {
                // 自动报告部署失败事件
                def coordinator = new EmergencyResponseCoordinator()
                coordinator.reportIncident([
                    title: 'CI/CD部署失败',
                    description: '自动化部署过程中发生错误',
                    systemImpact: 'medium'
                ])
            }
        }
    }
}`);

    // GitHub Actions集成示例
    console.log('\n🐙 GitHub Actions集成:');
    console.log(`name: Security Incident Response
on:
  schedule:
    - cron: '0 */6 * * *'  # 每6小时检查一次
  workflow_dispatch:

jobs:
  incident-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check Active Incidents
        run: |
          node -e "
            const coordinator = require('./incident-response-system.cjs').EmergencyResponseCoordinator;
            const coord = new coordinator();
            const incidents = coord.getActiveIncidents();
            console.log('Active incidents:', incidents.length);
          "
      - name: Generate Report
        run: |
          node run-incident-response.cjs
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: incident-response-report
          path: INCIDENT_RESPONSE_REPORT.json`);

    console.log('\n🏢 企业级集成');
    console.log('-'.repeat(30));

    // SIEM集成示例
    console.log('\n🔍 SIEM集成示例:');
    console.log(`class SIEMIntegration {
    constructor(coordinator) {
        this.coordinator = coordinator;
        this.siemEndpoint = 'https://siem.company.com/api/incidents';
    }
    
    async forwardIncident(incident) {
        const siemEvent = {
            timestamp: incident.reportTime,
            severity: incident.classification.severity,
            category: incident.classification.category,
            source: 'incident-response-system',
            description: incident.description,
            indicators: incident.indicators,
            affectedSystems: incident.affectedSystems
        };
        
        // 发送到SIEM系统
        await fetch(this.siemEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(siemEvent)
        });
    }
}`);

    // SOC集成示例
    console.log('\n🛡️ SOC团队集成示例:');
    console.log(`class SOCIntegration {
    constructor(coordinator) {
        this.coordinator = coordinator;
        this.socTicketSystem = 'https://soc.company.com/api/tickets';
    }
    
    async createSOCTicket(incident) {
        const ticket = {
            title: incident.title,
            priority: this.mapSeverityToPriority(incident.classification.severity),
            category: 'security_incident',
            description: incident.description,
            assignee: 'soc-team',
            tags: ['incident-response', incident.classification.type]
        };
        
        const response = await fetch(this.socTicketSystem, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ticket)
        });
        
        return response.json();
    }
    
    mapSeverityToPriority(severity) {
        const mapping = {
            'critical': 'P1',
            'high': 'P2', 
            'medium': 'P3',
            'low': 'P4'
        };
        return mapping[severity] || 'P4';
    }
}`);

    console.log('\n✅ 事件响应计划系统演示完成!');
    console.log('\n🎯 系统主要功能:');
    console.log('   • 智能事件分类与严重程度评估');
    console.log('   • 自动化响应流程管理');
    console.log('   • 多团队协调与任务分配');
    console.log('   • 实时响应进度跟踪');
    console.log('   • 应急响应预案执行');
    console.log('   • 响应效果分析与报告');
    console.log('   • CI/CD 集成支持');
    console.log('   • 企业级 SIEM/SOC 集成');
    console.log('   • 持续改进与优化建议');
}

// 模拟响应进展
async function simulateResponseProgress(coordinator, incidentId) {
    // 模拟一些响应活动
    const updates = [
        { status: 'investigating', notes: '安全团队正在调查事件' },
        { status: 'containing', notes: '正在执行遏制措施' },
        { status: 'recovering', notes: '系统恢复中' }
    ];

    for (const update of updates) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 短暂延迟
        await coordinator.updateIncidentStatus(incidentId, update);
    }

    // 随机决定是否解决事件
    if (Math.random() > 0.3) {
        await coordinator.updateIncidentStatus(incidentId, { 
            status: 'resolved', 
            notes: '事件已成功解决' 
        });
    }
}

// 演示应急响应预案
async function demonstrateEmergencyPlans() {
    console.log('🚨 应急响应预案演示');
    
    const emergencyPlans = [
        {
            name: '数据泄露应急预案',
            trigger: '确认发生数据泄露',
            immediateActions: [
                '立即隔离受影响系统',
                '通知法务和合规团队',
                '启动数据泄露通知流程',
                '联系执法部门（如需要）'
            ],
            timeline: {
                '0-15分钟': '事件确认和初步遏制',
                '15-60分钟': '影响评估和团队通知',
                '1-4小时': '详细调查和证据收集',
                '4-24小时': '系统恢复和安全加固',
                '24-72小时': '监管报告和客户通知'
            }
        },
        {
            name: '系统入侵应急预案',
            trigger: '检测到未授权系统访问',
            immediateActions: [
                '断开受影响系统网络连接',
                '保全数字证据',
                '启动备用系统',
                '通知相关利益相关者'
            ],
            timeline: {
                '0-10分钟': '系统隔离和威胁遏制',
                '10-30分钟': '证据保全和团队集结',
                '30分钟-2小时': '威胁分析和清除',
                '2-8小时': '系统重建和安全验证',
                '8-24小时': '监控强化和流程改进'
            }
        },
        {
            name: '勒索软件应急预案',
            trigger: '发现勒索软件感染',
            immediateActions: [
                '立即断开网络连接',
                '不要支付赎金',
                '启动备份恢复流程',
                '联系执法部门'
            ],
            timeline: {
                '0-5分钟': '网络隔离和传播阻止',
                '5-30分钟': '感染范围评估',
                '30分钟-2小时': '恶意软件清除',
                '2-12小时': '系统恢复和数据还原',
                '12-48小时': '安全加固和监控部署'
            }
        }
    ];

    emergencyPlans.forEach((plan, index) => {
        console.log(`\n📋 ${index + 1}. ${plan.name}`);
        console.log(`   触发条件: ${plan.trigger}`);
        console.log(`   立即行动:`);
        plan.immediateActions.forEach((action, i) => {
            console.log(`      ${i + 1}. ${action}`);
        });
        console.log(`   响应时间线:`);
        Object.entries(plan.timeline).forEach(([time, action]) => {
            console.log(`      ${time}: ${action}`);
        });
    });

    console.log('\n📞 应急联系信息');
    console.log('   事件指挥官: +86-138-0000-0001');
    console.log('   安全团队: +86-138-0000-0002');
    console.log('   IT运维: +86-138-0000-0003');
    console.log('   法务团队: +86-138-0000-0004');
    console.log('   公关团队: +86-138-0000-0005');

    console.log('\n🔧 应急工具包');
    console.log('   • 网络隔离工具');
    console.log('   • 数字取证工具');
    console.log('   • 恶意软件分析工具');
    console.log('   • 备份恢复系统');
    console.log('   • 通信加密工具');
    console.log('   • 事件记录模板');
}

// 运行演示
if (require.main === module) {
    demonstrateIncidentResponse().catch(console.error);
}

module.exports = { demonstrateIncidentResponse };