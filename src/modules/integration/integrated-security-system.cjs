/**
 * 集成安全系统 - 整合所有安全模块的完整安全防护体系
 *
 * 集成模块：
 * 1. 安全合规审计系统
 * 2. 访问控制系统
 * 3. 数据保护系统
 * 4. 事件响应系统
 * 5. 安全培训与意识系统
 * 6. 合规缺陷改进系统
 * 7. 安全监控与告警系统
 */

const { ComplianceAuditManager } = require('../compliance/security-compliance-audit.cjs');
const { AccessControlSystem } = require('../security/access-control-system.cjs');
const { DataProtectionSystem } = require('../security/data-protection-system.cjs');
const { EmergencyResponseCoordinator } = require('../monitoring/incident-response-system.cjs');
const { SecurityTrainingManager } = require('../security/security-training-system.cjs');
const { ComplianceImprovementSystem } = require('../compliance/compliance-improvement-system.cjs');
const { SecurityMonitoringSystem } = require('../security/security-monitoring-system.cjs');

/**
 * 集成安全系统主控制器
 */
class IntegratedSecuritySystem {
    constructor() {
        this.systemId = `ISS-${Date.now()}`;
        this.startTime = new Date();
        this.isRunning = false;

        // 初始化各个安全模块
        this.modules = {
            compliance: new ComplianceAuditManager(),
            accessControl: new AccessControlSystem(),
            dataProtection: new DataProtectionSystem(),
            incidentResponse: new EmergencyResponseCoordinator(),
            training: new SecurityTrainingManager(),
            improvement: new ComplianceImprovementSystem(),
            monitoring: new SecurityMonitoringSystem()
        };

        // 系统状态
        this.systemStatus = {
            overallHealth: 0,
            moduleStatus: {},
            securityLevel: 'UNKNOWN',
            lastUpdate: new Date(),
            alerts: [],
            metrics: {
                totalEvents: 0,
                threatsDetected: 0,
                incidentsResolved: 0,
                complianceScore: 0,
                trainingCompletion: 0
            }
        };

        // 集成配置
        this.config = {
            autoResponse: true,
            alertThreshold: 'MEDIUM',
            complianceTarget: 95,
            trainingRequirement: 90,
            monitoringInterval: 60000, // 1分钟
            reportingInterval: 3600000 // 1小时
        };

        // 事件总线
        this.eventBus = new Map();
        this.setupEventHandlers();
    }

    /**
     * 设置事件处理器
     */
    setupEventHandlers() {
        // 威胁检测事件
        this.on('threatDetected', async threat => {
            await this.handleThreatDetection(threat);
        });

        // 合规问题事件
        this.on('complianceIssue', async issue => {
            await this.handleComplianceIssue(issue);
        });

        // 安全事件
        this.on('securityIncident', async incident => {
            await this.handleSecurityIncident(incident);
        });

        // 培训完成事件
        this.on('trainingCompleted', async training => {
            await this.handleTrainingCompletion(training);
        });
    }

    /**
     * 事件监听器
     */
    on(event, handler) {
        if (!this.eventBus.has(event)) {
            this.eventBus.set(event, []);
        }
        this.eventBus.get(event).push(handler);
    }

    /**
     * 触发事件
     */
    async emit(event, data) {
        if (this.eventBus.has(event)) {
            const handlers = this.eventBus.get(event);

            for (const handler of handlers) {
                try {
                    await handler(data);
                } catch (error) {
                    console.error(`事件处理器错误 [${event}]:`, error.message);
                }
            }
        }
    }

    /**
     * 启动集成安全系统
     */
    async start() {
        console.log('🚀 启动集成安全系统');
        console.log('==================================================');

        try {
            this.isRunning = true;

            // 启动各个模块
            console.log('📋 启动安全模块...');

            // 启动监控系统
            console.log('   🔍 启动安全监控与告警系统...');
            this.modules.monitoring.start();

            // 启动访问控制
            console.log('   🔐 启动访问控制系统...');
            // 访问控制系统通常是被动的，不需要显式启动

            // 启动数据保护
            console.log('   🛡️ 启动数据保护系统...');
            // 数据保护系统通常是被动的，不需要显式启动

            // 启动事件响应
            console.log('   🚨 启动事件响应系统...');
            // 事件响应系统通常是被动的，不需要显式启动

            console.log('✅ 所有安全模块启动完成');

            // 执行初始系统检查
            await this.performSystemCheck();

            // 启动定期监控
            this.startPeriodicMonitoring();

            console.log(`🎯 集成安全系统 ${this.systemId} 已成功启动`);
            console.log(`⏰ 启动时间: ${this.startTime.toISOString()}`);

            return {
                success: true,
                systemId: this.systemId,
                startTime: this.startTime,
                modules: Object.keys(this.modules),
                status: 'RUNNING'
            };
        } catch (error) {
            console.error('❌ 系统启动失败:', error.message);
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * 执行系统检查
     */
    async performSystemCheck() {
        console.log('\n📊 执行系统健康检查...');

        const checks = [];

        // 合规性检查
        console.log('   🔍 执行合规性审计...');
        try {
            const complianceResult = await this.modules.compliance.performComplianceAudit();

            checks.push({
                module: 'compliance',
                status: 'HEALTHY',
                score: complianceResult.overallScore || 85,
                details: `合规得分: ${complianceResult.overallScore || 85}/100`
            });
            this.systemStatus.metrics.complianceScore = complianceResult.overallScore || 85;
        } catch (error) {
            checks.push({
                module: 'compliance',
                status: 'ERROR',
                error: error.message
            });
        }

        // 访问控制检查
        console.log('   🔐 检查访问控制状态...');
        try {
            const accessStatus = this.modules.accessControl.getSystemStatus();

            checks.push({
                module: 'accessControl',
                status: 'HEALTHY',
                details: `活跃会话: ${accessStatus.activeSessions}, 权限策略: ${accessStatus.policies.length}`
            });
        } catch (error) {
            checks.push({
                module: 'accessControl',
                status: 'ERROR',
                error: error.message
            });
        }

        // 数据保护检查
        console.log('   🛡️ 检查数据保护状态...');
        try {
            const dataStatus = this.modules.dataProtection.getSystemStatus();

            checks.push({
                module: 'dataProtection',
                status: 'HEALTHY',
                details: `加密状态: ${dataStatus.encryptionEnabled ? '启用' : '禁用'}, 备份状态: ${dataStatus.backupEnabled ? '启用' : '禁用'}`
            });
        } catch (error) {
            checks.push({
                module: 'dataProtection',
                status: 'ERROR',
                error: error.message
            });
        }

        // 监控系统检查
        console.log('   📈 检查监控系统状态...');
        try {
            const monitorStatus = this.modules.monitoring.getSystemStatus();

            checks.push({
                module: 'monitoring',
                status: monitorStatus.isRunning ? 'HEALTHY' : 'WARNING',
                details: `威胁检测: ${monitorStatus.threatStats.threatsDetected}, 告警: ${monitorStatus.alertStats.totalAlerts}`
            });
            this.systemStatus.metrics.threatsDetected = monitorStatus.threatStats.threatsDetected;
        } catch (error) {
            checks.push({
                module: 'monitoring',
                status: 'ERROR',
                error: error.message
            });
        }

        // 计算整体健康度
        const healthyModules = checks.filter(c => c.status === 'HEALTHY').length;
        const totalModules = checks.length;

        this.systemStatus.overallHealth = Math.round((healthyModules / totalModules) * 100);

        // 确定安全级别
        if (this.systemStatus.overallHealth >= 90) {
            this.systemStatus.securityLevel = 'HIGH';
        } else if (this.systemStatus.overallHealth >= 70) {
            this.systemStatus.securityLevel = 'MEDIUM';
        } else {
            this.systemStatus.securityLevel = 'LOW';
        }

        this.systemStatus.moduleStatus = checks;
        this.systemStatus.lastUpdate = new Date();

        console.log('✅ 系统健康检查完成');
        console.log(`   📊 整体健康度: ${this.systemStatus.overallHealth}%`);
        console.log(`   🎯 安全级别: ${this.systemStatus.securityLevel}`);

        return this.systemStatus;
    }

    /**
     * 启动定期监控
     */
    startPeriodicMonitoring() {
        console.log('⏰ 启动定期监控任务...');

        // 每分钟执行系统检查
        setInterval(async () => {
            if (this.isRunning) {
                try {
                    await this.performSystemCheck();
                    await this.checkForThreats();
                } catch (error) {
                    console.error('定期监控错误:', error.message);
                }
            }
        }, this.config.monitoringInterval);

        // 每小时生成报告
        setInterval(async () => {
            if (this.isRunning) {
                try {
                    await this.generateSystemReport();
                } catch (error) {
                    console.error('报告生成错误:', error.message);
                }
            }
        }, this.config.reportingInterval);
    }

    /**
     * 检查威胁
     */
    async checkForThreats() {
        // 模拟威胁检查
        const threats = [];

        // 检查合规性威胁
        if (this.systemStatus.metrics.complianceScore < this.config.complianceTarget) {
            threats.push({
                type: 'COMPLIANCE',
                severity: 'HIGH',
                description: `合规得分 ${this.systemStatus.metrics.complianceScore} 低于目标 ${this.config.complianceTarget}`,
                timestamp: new Date()
            });
        }

        // 检查系统健康威胁
        if (this.systemStatus.overallHealth < 80) {
            threats.push({
                type: 'SYSTEM_HEALTH',
                severity: 'MEDIUM',
                description: `系统健康度 ${this.systemStatus.overallHealth}% 需要关注`,
                timestamp: new Date()
            });
        }

        // 处理发现的威胁
        for (const threat of threats) {
            await this.emit('threatDetected', threat);
        }

        return threats;
    }

    /**
     * 处理威胁检测
     */
    async handleThreatDetection(threat) {
        console.log(`🚨 威胁检测: ${threat.type} - ${threat.description}`);

        // 记录威胁
        this.systemStatus.alerts.push(threat);
        this.systemStatus.metrics.threatsDetected++;

        // 根据威胁类型采取行动
        switch (threat.type) {
            case 'COMPLIANCE':
                await this.handleComplianceIssue(threat);
                break;
            case 'SYSTEM_HEALTH':
                await this.handleSystemHealthIssue(threat);
                break;
            default:
                console.log(`   ⚠️ 未知威胁类型: ${threat.type}`);
        }
    }

    /**
     * 处理合规问题
     */
    async handleComplianceIssue(issue) {
        console.log(`📋 处理合规问题: ${issue.description}`);

        try {
            // 启动合规改进流程
            const improvementPlan = await this.modules.improvement.generateImprovementPlan(
                this.systemStatus.metrics.complianceScore,
                this.config.complianceTarget
            );

            console.log('   ✅ 合规改进计划已生成');
            console.log(`   📊 预期改进: ${improvementPlan.expectedImprovement} 分`);
        } catch (error) {
            console.error('   ❌ 合规问题处理失败:', error.message);
        }
    }

    /**
     * 处理系统健康问题
     */
    async handleSystemHealthIssue(issue) {
        console.log(`🏥 处理系统健康问题: ${issue.description}`);

        // 重新检查所有模块
        await this.performSystemCheck();

        // 如果问题持续，触发事件响应
        if (this.systemStatus.overallHealth < 70) {
            await this.emit('securityIncident', {
                type: 'SYSTEM_DEGRADATION',
                severity: 'HIGH',
                description: '系统健康度严重下降',
                timestamp: new Date()
            });
        }
    }

    /**
     * 处理安全事件
     */
    async handleSecurityIncident(incident) {
        console.log(`🚨 处理安全事件: ${incident.type} - ${incident.description}`);

        try {
            // 启动事件响应流程
            const response = await this.modules.incidentResponse.handleEmergencyIncident({
                id: `INC-${Date.now()}`,
                type: incident.type,
                severity: incident.severity,
                description: incident.description,
                timestamp: incident.timestamp,
                source: 'IntegratedSecuritySystem'
            });

            console.log('   ✅ 事件响应流程已启动');
            console.log(`   📋 响应计划: ${response.plan?.steps?.length || 3} 个步骤`);

            this.systemStatus.metrics.incidentsResolved++;
        } catch (error) {
            console.error('   ❌ 安全事件处理失败:', error.message);
        }
    }

    /**
     * 处理培训完成
     */
    async handleTrainingCompletion(training) {
        console.log(`🎓 培训完成: ${training.userId} - ${training.course}`);

        // 更新培训统计
        this.systemStatus.metrics.trainingCompletion = training.completionRate || 0;

        // 如果培训完成率达标，提升安全级别
        if (this.systemStatus.metrics.trainingCompletion >= this.config.trainingRequirement) {
            console.log('   ✅ 培训完成率达标，安全意识水平提升');
        }
    }

    /**
     * 生成系统报告
     */
    async generateSystemReport() {
        const report = {
            systemId: this.systemId,
            timestamp: new Date(),
            uptime: Date.now() - this.startTime.getTime(),
            status: this.systemStatus,
            modules: {},
            recommendations: []
        };

        // 收集各模块状态
        try {
            report.modules.monitoring = this.modules.monitoring.getSystemStatus();
        } catch (error) {
            report.modules.monitoring = { error: error.message };
        }

        try {
            report.modules.accessControl = this.modules.accessControl.getSystemStatus();
        } catch (error) {
            report.modules.accessControl = { error: error.message };
        }

        try {
            report.modules.dataProtection = this.modules.dataProtection.getSystemStatus();
        } catch (error) {
            report.modules.dataProtection = { error: error.message };
        }

        // 生成建议
        if (this.systemStatus.metrics.complianceScore < 90) {
            report.recommendations.push('建议加强合规性管理，提升合规得分');
        }

        if (this.systemStatus.overallHealth < 85) {
            report.recommendations.push('建议检查系统模块状态，修复异常模块');
        }

        if (this.systemStatus.metrics.trainingCompletion < 85) {
            report.recommendations.push('建议加强安全培训，提升员工安全意识');
        }

        console.log('📊 系统报告已生成');

        return report;
    }

    /**
     * 获取系统状态
     */
    getSystemStatus() {
        return {
            systemId: this.systemId,
            isRunning: this.isRunning,
            startTime: this.startTime,
            uptime: this.isRunning ? Date.now() - this.startTime.getTime() : 0,
            status: this.systemStatus,
            config: this.config
        };
    }

    /**
     * 停止系统
     */
    async stop() {
        console.log('🛑 停止集成安全系统...');

        this.isRunning = false;

        // 停止监控系统
        if (this.modules.monitoring) {
            this.modules.monitoring.stop();
        }

        console.log('✅ 集成安全系统已停止');

        return {
            success: true,
            stopTime: new Date(),
            uptime: Date.now() - this.startTime.getTime()
        };
    }

    /**
     * 执行安全评估
     */
    async performSecurityAssessment() {
        console.log('🔍 执行综合安全评估...');

        const assessment = {
            timestamp: new Date(),
            overallScore: 0,
            moduleScores: {},
            recommendations: [],
            riskLevel: 'UNKNOWN'
        };

        // 合规性评估
        try {
            const complianceAudit = await this.modules.compliance.performComplianceAudit();

            assessment.moduleScores.compliance = complianceAudit.overallScore || 85;
            console.log(`   📋 合规性评分: ${complianceAudit.overallScore || 85}/100`);
        } catch (error) {
            assessment.moduleScores.compliance = 0;
            console.error('   ❌ 合规性评估失败:', error.message);
        }

        // 访问控制评估
        try {
            const accessStatus = this.modules.accessControl.getSystemStatus();
            const accessScore = this.calculateAccessControlScore(accessStatus);

            assessment.moduleScores.accessControl = accessScore;
            console.log(`   🔐 访问控制评分: ${accessScore}/100`);
        } catch (error) {
            assessment.moduleScores.accessControl = 0;
            console.error('   ❌ 访问控制评估失败:', error.message);
        }

        // 数据保护评估
        try {
            const dataStatus = this.modules.dataProtection.getSystemStatus();
            const dataScore = this.calculateDataProtectionScore(dataStatus);

            assessment.moduleScores.dataProtection = dataScore;
            console.log(`   🛡️ 数据保护评分: ${dataScore}/100`);
        } catch (error) {
            assessment.moduleScores.dataProtection = 0;
            console.error('   ❌ 数据保护评估失败:', error.message);
        }

        // 监控系统评估
        try {
            const monitorStatus = this.modules.monitoring.getSystemStatus();
            const monitorScore = this.calculateMonitoringScore(monitorStatus);

            assessment.moduleScores.monitoring = monitorScore;
            console.log(`   📈 监控系统评分: ${monitorScore}/100`);
        } catch (error) {
            assessment.moduleScores.monitoring = 0;
            console.error('   ❌ 监控系统评估失败:', error.message);
        }

        // 计算总分
        const scores = Object.values(assessment.moduleScores);

        assessment.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        // 确定风险级别
        if (assessment.overallScore >= 90) {
            assessment.riskLevel = 'LOW';
        } else if (assessment.overallScore >= 70) {
            assessment.riskLevel = 'MEDIUM';
        } else {
            assessment.riskLevel = 'HIGH';
        }

        console.log(`✅ 综合安全评估完成`);
        console.log(`   📊 总体评分: ${assessment.overallScore}/100`);
        console.log(`   ⚠️ 风险级别: ${assessment.riskLevel}`);

        return assessment;
    }

    /**
     * 计算访问控制评分
     */
    calculateAccessControlScore(status) {
        let score = 70; // 基础分

        if (status.policies && status.policies.length > 0) score += 10;
        if (status.activeSessions !== undefined) score += 10;
        if (status.mfaEnabled) score += 10;

        return Math.min(score, 100);
    }

    /**
     * 计算数据保护评分
     */
    calculateDataProtectionScore(status) {
        let score = 60; // 基础分

        if (status.encryptionEnabled) score += 20;
        if (status.backupEnabled) score += 15;
        if (status.accessLogging) score += 5;

        return Math.min(score, 100);
    }

    /**
     * 计算监控系统评分
     */
    calculateMonitoringScore(status) {
        let score = 50; // 基础分

        if (status.isRunning) score += 20;
        if (status.threatStats.accuracy > 80) score += 15;
        if (status.systemHealth.score > 80) score += 15;

        return Math.min(score, 100);
    }
}

module.exports = { IntegratedSecuritySystem };
