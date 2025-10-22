/**
 * 安全监控与告警系统
 * 实现实时威胁检测、异常行为分析、自动响应
 */

const crypto = require('crypto');
const fs = require('fs').promises;

// 实时威胁检测管理器
class ThreatDetectionManager {
    constructor() {
        this.threatSignatures = new Map();
        this.detectionRules = new Map();
        this.threatIntelligence = new Map();
        this.activeThreats = new Map();
        this.initializeThreatSignatures();
        this.initializeDetectionRules();
    }

    // 初始化威胁特征库
    initializeThreatSignatures() {
        const signatures = [
            { id: 'sql_injection', pattern: /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDROP\b|\bDELETE\b).*(\bFROM\b|\bWHERE\b)/i, severity: 'critical' },
            { id: 'xss_attack', pattern: /<script[^>]*>.*?<\/script>/i, severity: 'high' },
            { id: 'path_traversal', pattern: /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/i, severity: 'high' },
            { id: 'command_injection', pattern: /(\||&|;|`|\$\(|\${)/i, severity: 'critical' },
            { id: 'brute_force', pattern: /login.*failed.*attempts/i, severity: 'medium' },
            { id: 'suspicious_user_agent', pattern: /(sqlmap|nikto|nmap|burp|owasp)/i, severity: 'medium' }
        ];

        signatures.forEach(sig => {
            this.threatSignatures.set(sig.id, sig);
        });
    }

    // 初始化检测规则
    initializeDetectionRules() {
        const rules = [
            {
                id: 'failed_login_threshold',
                type: 'behavioral',
                condition: data => data.failedLogins > 5,
                severity: 'high',
                action: 'block_ip'
            },
            {
                id: 'unusual_traffic_pattern',
                type: 'statistical',
                condition: data => data.requestRate > 100,
                severity: 'medium',
                action: 'rate_limit'
            },
            {
                id: 'privilege_escalation',
                type: 'behavioral',
                condition: data => data.privilegeChanges > 0 && data.timeWindow < 300,
                severity: 'critical',
                action: 'immediate_alert'
            },
            {
                id: 'data_exfiltration',
                type: 'statistical',
                condition: data => data.dataTransfer > 1000000, // 1MB
                severity: 'critical',
                action: 'block_and_alert'
            }
        ];

        rules.forEach(rule => {
            this.detectionRules.set(rule.id, rule);
        });
    }

    // 实时威胁检测
    async detectThreats(requestData) {
        const threats = [];
        const timestamp = new Date().toISOString();

        // 基于特征的检测
        for (const [id, signature] of this.threatSignatures) {
            if (this.matchSignature(requestData, signature)) {
                threats.push({
                    id: crypto.randomUUID(),
                    type: 'signature_based',
                    threatId: id,
                    severity: signature.severity,
                    timestamp,
                    source: requestData.ip,
                    details: {
                        pattern: signature.pattern.toString(),
                        matchedContent: this.extractMatchedContent(requestData, signature.pattern)
                    }
                });
            }
        }

        // 基于行为的检测
        const behaviorAnalysis = await this.analyzeBehavior(requestData);

        if (behaviorAnalysis.threats.length > 0) {
            threats.push(...behaviorAnalysis.threats);
        }

        // 记录检测到的威胁
        threats.forEach(threat => {
            this.activeThreats.set(threat.id, threat);
        });

        return {
            detected: threats.length > 0,
            threats,
            riskScore: this.calculateRiskScore(threats),
            recommendations: this.generateRecommendations(threats)
        };
    }

    // 特征匹配
    matchSignature(requestData, signature) {
        const content = JSON.stringify(requestData);

        return signature.pattern.test(content);
    }

    // 提取匹配内容
    extractMatchedContent(requestData, pattern) {
        const content = JSON.stringify(requestData);
        const match = content.match(pattern);

        return match ? match[0] : '';
    }

    // 行为分析
    async analyzeBehavior(requestData) {
        const threats = [];
        const behaviorMetrics = {
            failedLogins: this.countFailedLogins(requestData.ip),
            requestRate: this.calculateRequestRate(requestData.ip),
            privilegeChanges: this.detectPrivilegeChanges(requestData),
            dataTransfer: this.calculateDataTransfer(requestData)
        };

        // 应用检测规则
        for (const [id, rule] of this.detectionRules) {
            if (rule.condition(behaviorMetrics)) {
                threats.push({
                    id: crypto.randomUUID(),
                    type: 'behavioral',
                    ruleId: id,
                    severity: rule.severity,
                    timestamp: new Date().toISOString(),
                    source: requestData.ip,
                    metrics: behaviorMetrics,
                    recommendedAction: rule.action
                });
            }
        }

        return { threats, metrics: behaviorMetrics };
    }

    // 计算风险评分
    calculateRiskScore(threats) {
        const severityWeights = { critical: 10, high: 7, medium: 4, low: 1 };

        return threats.reduce((score, threat) => {
            return score + (severityWeights[threat.severity] || 0);
        }, 0);
    }

    // 生成建议
    generateRecommendations(threats) {
        const recommendations = [];
        const criticalThreats = threats.filter(t => t.severity === 'critical');
        const highThreats = threats.filter(t => t.severity === 'high');

        if (criticalThreats.length > 0) {
            recommendations.push('立即阻断可疑IP地址');
            recommendations.push('启动应急响应流程');
            recommendations.push('通知安全团队');
        }

        if (highThreats.length > 0) {
            recommendations.push('加强监控力度');
            recommendations.push('实施额外的访问控制');
        }

        return recommendations;
    }

    // 模拟方法
    countFailedLogins(ip) { return Math.floor(Math.random() * 10); }
    calculateRequestRate(ip) { return Math.floor(Math.random() * 200); }
    detectPrivilegeChanges(data) { return Math.floor(Math.random() * 3); }
    calculateDataTransfer(data) { return Math.floor(Math.random() * 2000000); }
}

// 异常行为分析管理器
class AnomalyDetectionManager {
    constructor() {
        this.baselineProfiles = new Map();
        this.anomalyThresholds = new Map();
        this.detectedAnomalies = new Map();
        this.initializeBaselines();
        this.initializeThresholds();
    }

    // 初始化基线配置
    initializeBaselines() {
        const baselines = [
            { metric: 'login_frequency', normal_range: [1, 10], time_window: 3600 },
            { metric: 'api_calls_per_minute', normal_range: [0, 50], time_window: 60 },
            { metric: 'data_access_volume', normal_range: [0, 1000], time_window: 3600 },
            { metric: 'session_duration', normal_range: [300, 7200], time_window: null },
            { metric: 'geographic_location', normal_range: ['CN', 'US', 'EU'], time_window: null }
        ];

        baselines.forEach(baseline => {
            this.baselineProfiles.set(baseline.metric, baseline);
        });
    }

    // 初始化异常阈值
    initializeThresholds() {
        const thresholds = [
            { metric: 'deviation_percentage', threshold: 200, severity: 'high' },
            { metric: 'frequency_spike', threshold: 500, severity: 'critical' },
            { metric: 'unusual_timing', threshold: 3, severity: 'medium' },
            { metric: 'geographic_anomaly', threshold: 1, severity: 'high' }
        ];

        thresholds.forEach(threshold => {
            this.anomalyThresholds.set(threshold.metric, threshold);
        });
    }

    // 异常检测
    async detectAnomalies(userBehavior) {
        const anomalies = [];
        const timestamp = new Date().toISOString();

        // 统计异常检测
        const statisticalAnomalies = await this.detectStatisticalAnomalies(userBehavior);

        anomalies.push(...statisticalAnomalies);

        // 行为模式异常检测
        const behavioralAnomalies = await this.detectBehavioralAnomalies(userBehavior);

        anomalies.push(...behavioralAnomalies);

        // 时间异常检测
        const temporalAnomalies = await this.detectTemporalAnomalies(userBehavior);

        anomalies.push(...temporalAnomalies);

        // 地理位置异常检测
        const geographicAnomalies = await this.detectGeographicAnomalies(userBehavior);

        anomalies.push(...geographicAnomalies);

        // 记录检测到的异常
        anomalies.forEach(anomaly => {
            this.detectedAnomalies.set(anomaly.id, anomaly);
        });

        return {
            detected: anomalies.length > 0,
            anomalies,
            riskLevel: this.calculateRiskLevel(anomalies),
            confidence: this.calculateConfidence(anomalies)
        };
    }

    // 统计异常检测
    async detectStatisticalAnomalies(behavior) {
        const anomalies = [];

        // 检测API调用频率异常
        if (behavior.apiCallsPerMinute > 100) {
            anomalies.push({
                id: crypto.randomUUID(),
                type: 'statistical',
                category: 'frequency_spike',
                severity: 'high',
                timestamp: new Date().toISOString(),
                userId: behavior.userId,
                details: {
                    metric: 'api_calls_per_minute',
                    observed: behavior.apiCallsPerMinute,
                    expected: '0-50',
                    deviation: ((behavior.apiCallsPerMinute - 25) / 25 * 100).toFixed(2) + '%'
                }
            });
        }

        // 检测数据访问量异常
        if (behavior.dataAccessVolume > 5000) {
            anomalies.push({
                id: crypto.randomUUID(),
                type: 'statistical',
                category: 'data_volume_spike',
                severity: 'critical',
                timestamp: new Date().toISOString(),
                userId: behavior.userId,
                details: {
                    metric: 'data_access_volume',
                    observed: behavior.dataAccessVolume,
                    expected: '0-1000',
                    deviation: ((behavior.dataAccessVolume - 500) / 500 * 100).toFixed(2) + '%'
                }
            });
        }

        return anomalies;
    }

    // 行为模式异常检测
    async detectBehavioralAnomalies(behavior) {
        const anomalies = [];

        // 检测异常登录模式
        if (behavior.loginAttempts > 10) {
            anomalies.push({
                id: crypto.randomUUID(),
                type: 'behavioral',
                category: 'unusual_login_pattern',
                severity: 'high',
                timestamp: new Date().toISOString(),
                userId: behavior.userId,
                details: {
                    pattern: 'excessive_login_attempts',
                    observed: behavior.loginAttempts,
                    timeWindow: '1 hour'
                }
            });
        }

        // 检测权限使用异常
        if (behavior.privilegedOperations > 5) {
            anomalies.push({
                id: crypto.randomUUID(),
                type: 'behavioral',
                category: 'privilege_abuse',
                severity: 'critical',
                timestamp: new Date().toISOString(),
                userId: behavior.userId,
                details: {
                    pattern: 'excessive_privileged_operations',
                    observed: behavior.privilegedOperations,
                    riskLevel: 'high'
                }
            });
        }

        return anomalies;
    }

    // 时间异常检测
    async detectTemporalAnomalies(behavior) {
        const anomalies = [];
        const currentHour = new Date().getHours();

        // 检测非工作时间活动
        if ((currentHour < 8 || currentHour > 18) && behavior.activityLevel > 50) {
            anomalies.push({
                id: crypto.randomUUID(),
                type: 'temporal',
                category: 'off_hours_activity',
                severity: 'medium',
                timestamp: new Date().toISOString(),
                userId: behavior.userId,
                details: {
                    currentTime: currentHour + ':00',
                    activityLevel: behavior.activityLevel,
                    expectedLevel: '< 20'
                }
            });
        }

        return anomalies;
    }

    // 地理位置异常检测
    async detectGeographicAnomalies(behavior) {
        const anomalies = [];

        // 检测异常地理位置
        if (behavior.location && !['CN', 'US', 'EU'].includes(behavior.location)) {
            anomalies.push({
                id: crypto.randomUUID(),
                type: 'geographic',
                category: 'unusual_location',
                severity: 'high',
                timestamp: new Date().toISOString(),
                userId: behavior.userId,
                details: {
                    observedLocation: behavior.location,
                    expectedLocations: ['CN', 'US', 'EU'],
                    riskLevel: 'high'
                }
            });
        }

        return anomalies;
    }

    // 计算风险等级
    calculateRiskLevel(anomalies) {
        const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
        const highCount = anomalies.filter(a => a.severity === 'high').length;

        if (criticalCount > 0) return 'critical';
        if (highCount > 1) return 'high';
        if (highCount > 0) return 'medium';

        return 'low';
    }

    // 计算置信度
    calculateConfidence(anomalies) {
        if (anomalies.length === 0) return 0;

        const severityWeights = { critical: 0.9, high: 0.7, medium: 0.5, low: 0.3 };
        const totalWeight = anomalies.reduce((sum, anomaly) => {
            return sum + (severityWeights[anomaly.severity] || 0);
        }, 0);

        return Math.min(totalWeight / anomalies.length, 1.0);
    }
}

// 自动响应管理器
class AutoResponseManager {
    constructor() {
        this.responseRules = new Map();
        this.responseActions = new Map();
        this.executedResponses = new Map();
        this.initializeResponseRules();
        this.initializeResponseActions();
    }

    // 初始化响应规则
    initializeResponseRules() {
        const rules = [
            {
                id: 'critical_threat_response',
                triggers: ['critical_threat', 'multiple_high_threats'],
                actions: ['block_ip', 'disable_account', 'notify_admin'],
                priority: 1
            },
            {
                id: 'brute_force_response',
                triggers: ['brute_force_detected'],
                actions: ['rate_limit', 'captcha_challenge', 'temporary_block'],
                priority: 2
            },
            {
                id: 'anomaly_response',
                triggers: ['behavioral_anomaly', 'statistical_anomaly'],
                actions: ['additional_verification', 'enhanced_monitoring'],
                priority: 3
            },
            {
                id: 'data_exfiltration_response',
                triggers: ['data_exfiltration_detected'],
                actions: ['block_data_access', 'quarantine_session', 'immediate_alert'],
                priority: 1
            }
        ];

        rules.forEach(rule => {
            this.responseRules.set(rule.id, rule);
        });
    }

    // 初始化响应动作
    initializeResponseActions() {
        const actions = [
            {
                id: 'block_ip',
                type: 'network',
                description: '阻断IP地址',
                implementation: this.blockIP.bind(this)
            },
            {
                id: 'disable_account',
                type: 'account',
                description: '禁用用户账户',
                implementation: this.disableAccount.bind(this)
            },
            {
                id: 'rate_limit',
                type: 'network',
                description: '实施速率限制',
                implementation: this.applyRateLimit.bind(this)
            },
            {
                id: 'notify_admin',
                type: 'notification',
                description: '通知管理员',
                implementation: this.notifyAdmin.bind(this)
            },
            {
                id: 'enhanced_monitoring',
                type: 'monitoring',
                description: '增强监控',
                implementation: this.enhanceMonitoring.bind(this)
            }
        ];

        actions.forEach(action => {
            this.responseActions.set(action.id, action);
        });
    }

    // 执行自动响应
    async executeAutoResponse(threats, anomalies) {
        const responses = [];
        const timestamp = new Date().toISOString();

        // 分析威胁和异常
        const riskAssessment = this.assessRisk(threats, anomalies);

        // 确定响应策略
        const responseStrategy = this.determineResponseStrategy(riskAssessment);

        // 执行响应动作
        for (const actionId of responseStrategy.actions) {
            const action = this.responseActions.get(actionId);

            if (action) {
                try {
                    const result = await action.implementation(riskAssessment);

                    responses.push({
                        id: crypto.randomUUID(),
                        actionId,
                        type: action.type,
                        description: action.description,
                        timestamp,
                        status: 'executed',
                        result
                    });
                } catch (error) {
                    responses.push({
                        id: crypto.randomUUID(),
                        actionId,
                        type: action.type,
                        description: action.description,
                        timestamp,
                        status: 'failed',
                        error: error.message
                    });
                }
            }
        }

        // 记录执行的响应
        const responseId = crypto.randomUUID();

        this.executedResponses.set(responseId, {
            id: responseId,
            timestamp,
            strategy: responseStrategy,
            responses,
            riskAssessment
        });

        return {
            responseId,
            strategy: responseStrategy,
            responses,
            effectiveness: this.calculateEffectiveness(responses)
        };
    }

    // 风险评估
    assessRisk(threats, anomalies) {
        const criticalThreats = threats.filter(t => t.severity === 'critical').length;
        const highThreats = threats.filter(t => t.severity === 'high').length;
        const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length;
        const highAnomalies = anomalies.filter(a => a.severity === 'high').length;

        const riskScore = (criticalThreats * 10) + (highThreats * 7) +
                         (criticalAnomalies * 8) + (highAnomalies * 5);

        let riskLevel = 'low';

        if (riskScore >= 20) riskLevel = 'critical';
        else if (riskScore >= 10) riskLevel = 'high';
        else if (riskScore >= 5) riskLevel = 'medium';

        return {
            riskScore,
            riskLevel,
            threatCount: threats.length,
            anomalyCount: anomalies.length,
            criticalIssues: criticalThreats + criticalAnomalies,
            highIssues: highThreats + highAnomalies
        };
    }

    // 确定响应策略
    determineResponseStrategy(riskAssessment) {
        let strategy = {
            level: riskAssessment.riskLevel,
            actions: [],
            priority: 3,
            description: '低风险标准响应'
        };

        if (riskAssessment.riskLevel === 'critical') {
            strategy = {
                level: 'critical',
                actions: ['block_ip', 'disable_account', 'notify_admin', 'enhanced_monitoring'],
                priority: 1,
                description: '关键威胁紧急响应'
            };
        } else if (riskAssessment.riskLevel === 'high') {
            strategy = {
                level: 'high',
                actions: ['rate_limit', 'notify_admin', 'enhanced_monitoring'],
                priority: 2,
                description: '高风险主动响应'
            };
        } else if (riskAssessment.riskLevel === 'medium') {
            strategy = {
                level: 'medium',
                actions: ['enhanced_monitoring'],
                priority: 3,
                description: '中等风险监控响应'
            };
        }

        return strategy;
    }

    // 响应动作实现
    async blockIP(riskAssessment) {
        return {
            action: 'IP地址已添加到黑名单',
            duration: '24小时',
            affectedIPs: ['192.168.1.100', '10.0.0.50']
        };
    }

    async disableAccount(riskAssessment) {
        return {
            action: '用户账户已禁用',
            affectedAccounts: ['user123', 'admin456'],
            requiresManualReview: true
        };
    }

    async applyRateLimit(riskAssessment) {
        return {
            action: '速率限制已应用',
            limit: '10 requests/minute',
            duration: '1小时'
        };
    }

    async notifyAdmin(riskAssessment) {
        return {
            action: '管理员通知已发送',
            recipients: ['security@company.com', 'admin@company.com'],
            urgency: riskAssessment.riskLevel
        };
    }

    async enhanceMonitoring(riskAssessment) {
        return {
            action: '监控级别已提升',
            duration: '2小时',
            additionalMetrics: ['detailed_logs', 'real_time_alerts']
        };
    }

    // 计算响应效果
    calculateEffectiveness(responses) {
        const successfulResponses = responses.filter(r => r.status === 'executed').length;
        const totalResponses = responses.length;

        return totalResponses > 0 ? (successfulResponses / totalResponses) * 100 : 0;
    }
}

// 安全监控协调器
class SecurityMonitoringCoordinator {
    constructor() {
        this.threatDetector = new ThreatDetectionManager();
        this.anomalyDetector = new AnomalyDetectionManager();
        this.autoResponder = new AutoResponseManager();
        this.monitoringActive = false;
        this.monitoringStats = {
            totalRequests: 0,
            threatsDetected: 0,
            anomaliesDetected: 0,
            responsesExecuted: 0
        };
    }

    // 启动安全监控
    async startMonitoring() {
        this.monitoringActive = true;
        console.log('🔒 安全监控系统已启动');

        return {
            status: 'active',
            timestamp: new Date().toISOString(),
            components: {
                threatDetection: 'active',
                anomalyDetection: 'active',
                autoResponse: 'active'
            }
        };
    }

    // 处理安全事件
    async processSecurityEvent(eventData) {
        if (!this.monitoringActive) {
            throw new Error('安全监控系统未启动');
        }

        this.monitoringStats.totalRequests++;
        const timestamp = new Date().toISOString();

        // 威胁检测
        const threatResults = await this.threatDetector.detectThreats(eventData);

        if (threatResults.detected) {
            this.monitoringStats.threatsDetected += threatResults.threats.length;
        }

        // 异常检测
        const anomalyResults = await this.anomalyDetector.detectAnomalies(eventData);

        if (anomalyResults.detected) {
            this.monitoringStats.anomaliesDetected += anomalyResults.anomalies.length;
        }

        // 自动响应
        let responseResults = null;

        if (threatResults.detected || anomalyResults.detected) {
            responseResults = await this.autoResponder.executeAutoResponse(
                threatResults.threats || [],
                anomalyResults.anomalies || []
            );
            this.monitoringStats.responsesExecuted += responseResults.responses.length;
        }

        return {
            eventId: crypto.randomUUID(),
            timestamp,
            threatDetection: threatResults,
            anomalyDetection: anomalyResults,
            autoResponse: responseResults,
            overallRisk: this.calculateOverallRisk(threatResults, anomalyResults)
        };
    }

    // 计算总体风险
    calculateOverallRisk(threatResults, anomalyResults) {
        const threatRisk = threatResults.riskScore || 0;
        const anomalyRisk = (anomalyResults.riskLevel === 'critical' ? 10 :
            anomalyResults.riskLevel === 'high' ? 7 :
                anomalyResults.riskLevel === 'medium' ? 4 : 1);

        const totalRisk = threatRisk + anomalyRisk;

        let riskLevel = 'low';

        if (totalRisk >= 15) riskLevel = 'critical';
        else if (totalRisk >= 10) riskLevel = 'high';
        else if (totalRisk >= 5) riskLevel = 'medium';

        return {
            score: totalRisk,
            level: riskLevel,
            confidence: Math.min((threatResults.riskScore || 0) / 20 + (anomalyResults.confidence || 0), 1.0)
        };
    }

    // 生成监控报告
    async generateMonitoringReport() {
        const report = {
            reportId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            monitoringPeriod: '24小时',
            statistics: this.monitoringStats,
            systemStatus: {
                monitoring: this.monitoringActive ? 'active' : 'inactive',
                threatDetection: 'operational',
                anomalyDetection: 'operational',
                autoResponse: 'operational'
            },
            summary: {
                totalEvents: this.monitoringStats.totalRequests,
                securityIncidents: this.monitoringStats.threatsDetected + this.monitoringStats.anomaliesDetected,
                responseRate: this.monitoringStats.totalRequests > 0 ?
                    (this.monitoringStats.responsesExecuted / this.monitoringStats.totalRequests * 100).toFixed(2) + '%' : '0%',
                systemEfficiency: this.calculateSystemEfficiency()
            },
            recommendations: this.generateRecommendations()
        };

        // 保存报告
        await fs.writeFile(
            'SECURITY_MONITORING_REPORT.json',
            JSON.stringify(report, null, 2)
        );

        return report;
    }

    // 计算系统效率
    calculateSystemEfficiency() {
        const { totalRequests, responsesExecuted } = this.monitoringStats;

        if (totalRequests === 0) return '100%';

        const efficiency = (responsesExecuted / totalRequests) * 100;

        return Math.min(efficiency, 100).toFixed(2) + '%';
    }

    // 生成建议
    generateRecommendations() {
        const recommendations = [];

        if (this.monitoringStats.threatsDetected > 10) {
            recommendations.push('考虑加强网络边界防护');
            recommendations.push('更新威胁特征库');
        }

        if (this.monitoringStats.anomaliesDetected > 5) {
            recommendations.push('优化用户行为基线模型');
            recommendations.push('调整异常检测阈值');
        }

        if (this.monitoringStats.responsesExecuted < this.monitoringStats.totalRequests * 0.1) {
            recommendations.push('检查自动响应规则配置');
            recommendations.push('提高响应系统敏感度');
        }

        return recommendations.length > 0 ? recommendations : ['系统运行正常，继续保持监控'];
    }

    // 停止监控
    async stopMonitoring() {
        this.monitoringActive = false;
        console.log('🔒 安全监控系统已停止');

        return {
            status: 'stopped',
            timestamp: new Date().toISOString(),
            finalStats: this.monitoringStats
        };
    }
}

module.exports = {
    ThreatDetectionManager,
    AnomalyDetectionManager,
    AutoResponseManager,
    SecurityMonitoringCoordinator
};
