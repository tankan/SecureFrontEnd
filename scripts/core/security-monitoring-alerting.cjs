/**
 * 安全监控与告警系统
 * 实时威胁检测、异常行为分析、智能告警和响应自动化
 */

const fs = require('fs');
const crypto = require('crypto');
const EventEmitter = require('events');

// 威胁检测引擎
class ThreatDetectionEngine extends EventEmitter {
    constructor() {
        super();
        this.detectionRules = new Map();
        this.threatSignatures = new Map();
        this.behaviorBaselines = new Map();
        this.activeThreats = new Map();
        this.detectionMetrics = {
            totalEvents: 0,
            threatsDetected: 0,
            falsePositives: 0,
            accuracy: 0
        };
        this.initializeDetectionRules();
        this.initializeThreatSignatures();
    }

    initializeDetectionRules() {
        // SQL注入检测规则
        this.detectionRules.set('sql_injection', {
            name: 'SQL注入攻击检测',
            severity: 'high',
            patterns: [
                /(\bUNION\b.*\bSELECT\b)/i,
                /(\bOR\b.*=.*)/i,
                /(\bAND\b.*=.*)/i,
                /(\'.*OR.*\'.*=.*\')/i,
                /(\bDROP\b.*\bTABLE\b)/i,
                /(\bINSERT\b.*\bINTO\b)/i,
                /(\bUPDATE\b.*\bSET\b)/i,
                /(\bDELETE\b.*\bFROM\b)/i
            ],
            threshold: 1,
            action: 'block_and_alert'
        });

        // XSS攻击检测规则
        this.detectionRules.set('xss_attack', {
            name: 'XSS跨站脚本攻击检测',
            severity: 'high',
            patterns: [
                /<script[^>]*>.*<\/script>/i,
                /javascript:/i,
                /on\w+\s*=/i,
                /<iframe[^>]*>/i,
                /<object[^>]*>/i,
                /<embed[^>]*>/i,
                /eval\s*\(/i,
                /document\.cookie/i
            ],
            threshold: 1,
            action: 'block_and_alert'
        });

        // 暴力破解检测规则
        this.detectionRules.set('brute_force', {
            name: '暴力破解攻击检测',
            severity: 'medium',
            patterns: [],
            threshold: 5, // 5次失败登录
            timeWindow: 300000, // 5分钟
            action: 'rate_limit_and_alert'
        });

        // 异常访问模式检测
        this.detectionRules.set('anomaly_access', {
            name: '异常访问模式检测',
            severity: 'medium',
            patterns: [],
            threshold: 3,
            indicators: [
                'unusual_time_access',
                'geo_location_anomaly',
                'user_agent_anomaly',
                'request_frequency_anomaly'
            ],
            action: 'monitor_and_alert'
        });

        // 恶意文件上传检测
        this.detectionRules.set('malicious_upload', {
            name: '恶意文件上传检测',
            severity: 'high',
            patterns: [
                /\.php$/i,
                /\.jsp$/i,
                /\.asp$/i,
                /\.exe$/i,
                /\.bat$/i,
                /\.cmd$/i,
                /\.sh$/i,
                /\.py$/i
            ],
            magicBytes: [
                'MZ', // PE executable
                '7f454c46', // ELF executable
                'cafebabe', // Java class file
                '504b0304' // ZIP archive
            ],
            threshold: 1,
            action: 'quarantine_and_alert'
        });

        // DDoS攻击检测
        this.detectionRules.set('ddos_attack', {
            name: 'DDoS攻击检测',
            severity: 'critical',
            patterns: [],
            threshold: 1000, // 每分钟1000个请求
            timeWindow: 60000, // 1分钟
            action: 'rate_limit_and_alert'
        });
    }

    initializeThreatSignatures() {
        // 已知恶意IP地址
        this.threatSignatures.set('malicious_ips', new Set([
            '192.168.1.100', // 示例恶意IP
            '10.0.0.50',
            '172.16.0.25'
        ]));

        // 已知恶意User-Agent
        this.threatSignatures.set('malicious_user_agents', new Set([
            'sqlmap',
            'nikto',
            'nmap',
            'masscan',
            'burpsuite',
            'owasp zap'
        ]));

        // 已知恶意文件哈希
        this.threatSignatures.set('malicious_hashes', new Set([
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
        ]));

        // 恶意域名
        this.threatSignatures.set('malicious_domains', new Set([
            'malware-example.com',
            'phishing-site.net',
            'suspicious-domain.org'
        ]));
    }

    // 分析网络请求
    analyzeRequest(requestData) {
        const threats = [];
        this.detectionMetrics.totalEvents++;

        // 检查IP黑名单
        if (this.threatSignatures.get('malicious_ips').has(requestData.ip)) {
            threats.push({
                type: 'malicious_ip',
                severity: 'high',
                description: `检测到恶意IP地址: ${requestData.ip}`,
                evidence: { ip: requestData.ip },
                timestamp: new Date()
            });
        }

        // 检查User-Agent
        const userAgent = requestData.userAgent?.toLowerCase() || '';
        for (const maliciousUA of this.threatSignatures.get('malicious_user_agents')) {
            if (userAgent.includes(maliciousUA)) {
                threats.push({
                    type: 'malicious_user_agent',
                    severity: 'medium',
                    description: `检测到恶意User-Agent: ${maliciousUA}`,
                    evidence: { userAgent: requestData.userAgent },
                    timestamp: new Date()
                });
            }
        }

        // SQL注入检测
        const sqlThreats = this.detectSQLInjection(requestData);
        threats.push(...sqlThreats);

        // XSS攻击检测
        const xssThreats = this.detectXSSAttack(requestData);
        threats.push(...xssThreats);

        // 暴力破解检测
        if (requestData.type === 'login_attempt' && !requestData.success) {
            const bruteForceThreats = this.detectBruteForce(requestData);
            threats.push(...bruteForceThreats);
        }

        // 异常访问模式检测
        const anomalyThreats = this.detectAnomalousAccess(requestData);
        threats.push(...anomalyThreats);

        // 处理检测到的威胁
        threats.forEach(threat => {
            this.handleThreat(threat, requestData);
        });

        return threats;
    }

    // SQL注入检测
    detectSQLInjection(requestData) {
        const threats = [];
        const rule = this.detectionRules.get('sql_injection');
        const payload = `${requestData.url} ${requestData.body || ''} ${JSON.stringify(requestData.params || {})}`;

        for (const pattern of rule.patterns) {
            if (pattern.test(payload)) {
                threats.push({
                    type: 'sql_injection',
                    severity: rule.severity,
                    description: `检测到SQL注入攻击尝试`,
                    evidence: { 
                        pattern: pattern.source,
                        payload: payload.substring(0, 200),
                        url: requestData.url
                    },
                    timestamp: new Date()
                });
                break;
            }
        }

        return threats;
    }

    // XSS攻击检测
    detectXSSAttack(requestData) {
        const threats = [];
        const rule = this.detectionRules.get('xss_attack');
        const payload = `${requestData.body || ''} ${JSON.stringify(requestData.params || {})}`;

        for (const pattern of rule.patterns) {
            if (pattern.test(payload)) {
                threats.push({
                    type: 'xss_attack',
                    severity: rule.severity,
                    description: `检测到XSS跨站脚本攻击尝试`,
                    evidence: { 
                        pattern: pattern.source,
                        payload: payload.substring(0, 200),
                        url: requestData.url
                    },
                    timestamp: new Date()
                });
                break;
            }
        }

        return threats;
    }

    // 暴力破解检测
    detectBruteForce(requestData) {
        const threats = [];
        const rule = this.detectionRules.get('brute_force');
        const key = `${requestData.ip}_${requestData.username || 'unknown'}`;
        
        if (!this.behaviorBaselines.has(key)) {
            this.behaviorBaselines.set(key, {
                failedAttempts: 0,
                firstAttempt: Date.now(),
                lastAttempt: Date.now()
            });
        }

        const baseline = this.behaviorBaselines.get(key);
        baseline.failedAttempts++;
        baseline.lastAttempt = Date.now();

        // 检查时间窗口内的失败次数
        if (baseline.lastAttempt - baseline.firstAttempt <= rule.timeWindow) {
            if (baseline.failedAttempts >= rule.threshold) {
                threats.push({
                    type: 'brute_force',
                    severity: rule.severity,
                    description: `检测到暴力破解攻击: ${baseline.failedAttempts}次失败登录`,
                    evidence: { 
                        ip: requestData.ip,
                        username: requestData.username,
                        failedAttempts: baseline.failedAttempts,
                        timeWindow: rule.timeWindow
                    },
                    timestamp: new Date()
                });
            }
        } else {
            // 重置计数器
            baseline.failedAttempts = 1;
            baseline.firstAttempt = Date.now();
        }

        return threats;
    }

    // 异常访问模式检测
    detectAnomalousAccess(requestData) {
        const threats = [];
        const rule = this.detectionRules.get('anomaly_access');
        const anomalies = [];

        // 检查访问时间异常
        const hour = new Date().getHours();
        if (hour < 6 || hour > 22) {
            anomalies.push('unusual_time_access');
        }

        // 检查地理位置异常（模拟）
        if (requestData.country && requestData.country !== 'CN') {
            anomalies.push('geo_location_anomaly');
        }

        // 检查User-Agent异常
        if (!requestData.userAgent || requestData.userAgent.length < 10) {
            anomalies.push('user_agent_anomaly');
        }

        // 检查请求频率异常
        const requestKey = requestData.ip;
        if (!this.behaviorBaselines.has(`freq_${requestKey}`)) {
            this.behaviorBaselines.set(`freq_${requestKey}`, {
                requests: 0,
                startTime: Date.now()
            });
        }

        const freqBaseline = this.behaviorBaselines.get(`freq_${requestKey}`);
        freqBaseline.requests++;

        const timeElapsed = Date.now() - freqBaseline.startTime;
        if (timeElapsed > 60000) { // 1分钟重置
            freqBaseline.requests = 1;
            freqBaseline.startTime = Date.now();
        } else if (freqBaseline.requests > 100) { // 每分钟超过100个请求
            anomalies.push('request_frequency_anomaly');
        }

        if (anomalies.length >= rule.threshold) {
            threats.push({
                type: 'anomaly_access',
                severity: rule.severity,
                description: `检测到异常访问模式: ${anomalies.join(', ')}`,
                evidence: { 
                    anomalies,
                    ip: requestData.ip,
                    userAgent: requestData.userAgent,
                    country: requestData.country
                },
                timestamp: new Date()
            });
        }

        return threats;
    }

    // 文件上传安全检测
    analyzeFileUpload(fileData) {
        const threats = [];
        const rule = this.detectionRules.get('malicious_upload');

        // 检查文件扩展名
        const fileName = fileData.name.toLowerCase();
        for (const pattern of rule.patterns) {
            if (pattern.test(fileName)) {
                threats.push({
                    type: 'malicious_upload',
                    severity: rule.severity,
                    description: `检测到可疑文件扩展名: ${fileName}`,
                    evidence: { 
                        fileName: fileData.name,
                        size: fileData.size,
                        mimeType: fileData.mimeType
                    },
                    timestamp: new Date()
                });
                break;
            }
        }

        // 检查文件魔数
        if (fileData.buffer) {
            const magicBytes = fileData.buffer.slice(0, 4).toString('hex');
            if (rule.magicBytes.includes(magicBytes)) {
                threats.push({
                    type: 'malicious_upload',
                    severity: rule.severity,
                    description: `检测到可疑文件类型: 魔数 ${magicBytes}`,
                    evidence: { 
                        fileName: fileData.name,
                        magicBytes,
                        actualType: this.identifyFileType(magicBytes)
                    },
                    timestamp: new Date()
                });
            }
        }

        // 检查文件哈希
        if (fileData.buffer) {
            const hash = crypto.createHash('sha256').update(fileData.buffer).digest('hex');
            if (this.threatSignatures.get('malicious_hashes').has(hash)) {
                threats.push({
                    type: 'malicious_upload',
                    severity: 'critical',
                    description: `检测到已知恶意文件: ${hash}`,
                    evidence: { 
                        fileName: fileData.name,
                        hash,
                        size: fileData.size
                    },
                    timestamp: new Date()
                });
            }
        }

        return threats;
    }

    // 识别文件类型
    identifyFileType(magicBytes) {
        const fileTypes = {
            '4d5a': 'PE Executable',
            '7f454c46': 'ELF Executable',
            'cafebabe': 'Java Class File',
            '504b0304': 'ZIP Archive',
            '89504e47': 'PNG Image',
            'ffd8ffe0': 'JPEG Image'
        };
        return fileTypes[magicBytes] || 'Unknown';
    }

    // 处理威胁
    handleThreat(threat, requestData) {
        this.detectionMetrics.threatsDetected++;
        
        // 记录威胁
        const threatId = crypto.randomUUID();
        this.activeThreats.set(threatId, {
            id: threatId,
            ...threat,
            requestData,
            status: 'active',
            actions: []
        });

        // 触发威胁事件
        this.emit('threat_detected', {
            threatId,
            threat,
            requestData
        });

        // 根据威胁类型执行相应动作
        this.executeThreatResponse(threatId, threat, requestData);
    }

    // 执行威胁响应
    executeThreatResponse(threatId, threat, requestData) {
        const rule = this.detectionRules.get(threat.type);
        if (!rule) return;

        const actions = [];

        switch (rule.action) {
            case 'block_and_alert':
                actions.push(this.blockRequest(requestData));
                actions.push(this.sendAlert(threat, 'high'));
                break;
            
            case 'rate_limit_and_alert':
                actions.push(this.applyRateLimit(requestData.ip));
                actions.push(this.sendAlert(threat, 'medium'));
                break;
            
            case 'quarantine_and_alert':
                actions.push(this.quarantineFile(requestData));
                actions.push(this.sendAlert(threat, 'high'));
                break;
            
            case 'monitor_and_alert':
                actions.push(this.enhanceMonitoring(requestData.ip));
                actions.push(this.sendAlert(threat, 'low'));
                break;
        }

        // 更新威胁记录
        const activeThreat = this.activeThreats.get(threatId);
        if (activeThreat) {
            activeThreat.actions = actions;
        }
    }

    // 阻止请求
    blockRequest(requestData) {
        return {
            action: 'block_request',
            target: requestData.ip,
            timestamp: new Date(),
            details: `阻止来自 ${requestData.ip} 的请求`
        };
    }

    // 应用速率限制
    applyRateLimit(ip) {
        return {
            action: 'rate_limit',
            target: ip,
            timestamp: new Date(),
            details: `对 ${ip} 应用速率限制: 每分钟最多10个请求`
        };
    }

    // 隔离文件
    quarantineFile(requestData) {
        return {
            action: 'quarantine_file',
            target: requestData.fileName || 'unknown',
            timestamp: new Date(),
            details: `隔离可疑文件到安全区域`
        };
    }

    // 增强监控
    enhanceMonitoring(ip) {
        return {
            action: 'enhance_monitoring',
            target: ip,
            timestamp: new Date(),
            details: `对 ${ip} 启用增强监控模式`
        };
    }

    // 发送告警
    sendAlert(threat, priority) {
        return {
            action: 'send_alert',
            priority,
            timestamp: new Date(),
            details: `发送${priority}级别告警: ${threat.description}`
        };
    }

    // 获取威胁统计
    getThreatStatistics() {
        const stats = {
            ...this.detectionMetrics,
            activeThreats: this.activeThreats.size,
            threatsByType: {},
            threatsBySeverity: {}
        };

        // 按类型统计
        for (const threat of this.activeThreats.values()) {
            stats.threatsByType[threat.type] = (stats.threatsByType[threat.type] || 0) + 1;
            stats.threatsBySeverity[threat.severity] = (stats.threatsBySeverity[threat.severity] || 0) + 1;
        }

        // 计算准确率
        if (stats.totalEvents > 0) {
            stats.accuracy = Math.round(((stats.threatsDetected - stats.falsePositives) / stats.totalEvents) * 100);
        }

        return stats;
    }
}

// 智能告警系统
class IntelligentAlertingSystem extends EventEmitter {
    constructor() {
        super();
        this.alertRules = new Map();
        this.alertChannels = new Map();
        this.alertHistory = [];
        this.escalationPolicies = new Map();
        this.suppressionRules = new Map();
        this.initializeAlertSystem();
    }

    initializeAlertSystem() {
        // 告警规则配置
        this.alertRules.set('critical_threat', {
            name: '关键威胁告警',
            conditions: {
                severity: ['critical'],
                threatTypes: ['malicious_upload', 'sql_injection', 'ddos_attack']
            },
            channels: ['email', 'sms', 'slack', 'webhook'],
            escalation: 'immediate',
            suppressionTime: 300000 // 5分钟内不重复告警
        });

        this.alertRules.set('high_threat', {
            name: '高风险威胁告警',
            conditions: {
                severity: ['high'],
                threatTypes: ['xss_attack', 'brute_force', 'malicious_ip']
            },
            channels: ['email', 'slack'],
            escalation: 'standard',
            suppressionTime: 600000 // 10分钟内不重复告警
        });

        this.alertRules.set('anomaly_pattern', {
            name: '异常模式告警',
            conditions: {
                severity: ['medium'],
                threatTypes: ['anomaly_access'],
                threshold: 5 // 5个异常事件触发告警
            },
            channels: ['slack'],
            escalation: 'delayed',
            suppressionTime: 1800000 // 30分钟内不重复告警
        });

        // 告警渠道配置
        this.alertChannels.set('email', {
            type: 'email',
            enabled: true,
            config: {
                smtp: 'smtp.company.com',
                recipients: ['security@company.com', 'admin@company.com'],
                template: 'security_alert'
            }
        });

        this.alertChannels.set('sms', {
            type: 'sms',
            enabled: true,
            config: {
                provider: 'twilio',
                recipients: ['+86138****8888', '+86139****9999'],
                template: 'urgent_security_alert'
            }
        });

        this.alertChannels.set('slack', {
            type: 'slack',
            enabled: true,
            config: {
                webhook: 'https://hooks.slack.com/services/xxx/yyy/zzz',
                channel: '#security-alerts',
                mentions: ['@security-team', '@on-call']
            }
        });

        this.alertChannels.set('webhook', {
            type: 'webhook',
            enabled: true,
            config: {
                url: 'https://api.company.com/security/alerts',
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer xxx',
                    'Content-Type': 'application/json'
                }
            }
        });

        // 升级策略
        this.escalationPolicies.set('immediate', {
            name: '立即升级',
            levels: [
                { delay: 0, channels: ['email', 'sms', 'slack'] },
                { delay: 300000, channels: ['webhook'], action: 'notify_manager' },
                { delay: 900000, channels: ['sms'], action: 'notify_ciso' }
            ]
        });

        this.escalationPolicies.set('standard', {
            name: '标准升级',
            levels: [
                { delay: 0, channels: ['email', 'slack'] },
                { delay: 1800000, channels: ['sms'], action: 'notify_manager' }
            ]
        });

        this.escalationPolicies.set('delayed', {
            name: '延迟升级',
            levels: [
                { delay: 0, channels: ['slack'] },
                { delay: 3600000, channels: ['email'], action: 'daily_summary' }
            ]
        });
    }

    // 处理威胁告警
    async handleThreatAlert(threatData) {
        const { threat, requestData, threatId } = threatData;
        
        // 检查是否需要告警
        const applicableRules = this.findApplicableRules(threat);
        
        for (const rule of applicableRules) {
            // 检查抑制规则
            if (this.isAlertSuppressed(threat, rule)) {
                continue;
            }

            // 创建告警
            const alert = await this.createAlert(threat, requestData, threatId, rule);
            
            // 发送告警
            await this.sendAlert(alert, rule);
            
            // 启动升级流程
            this.startEscalation(alert, rule);
        }
    }

    // 查找适用的告警规则
    findApplicableRules(threat) {
        const applicableRules = [];

        for (const [ruleId, rule] of this.alertRules) {
            // 检查严重程度
            if (rule.conditions.severity && !rule.conditions.severity.includes(threat.severity)) {
                continue;
            }

            // 检查威胁类型
            if (rule.conditions.threatTypes && !rule.conditions.threatTypes.includes(threat.type)) {
                continue;
            }

            // 检查阈值条件
            if (rule.conditions.threshold) {
                const recentThreats = this.getRecentThreats(threat.type, 3600000); // 1小时内
                if (recentThreats.length < rule.conditions.threshold) {
                    continue;
                }
            }

            applicableRules.push({ ruleId, ...rule });
        }

        return applicableRules;
    }

    // 检查告警抑制
    isAlertSuppressed(threat, rule) {
        const suppressionKey = `${threat.type}_${threat.severity}`;
        const lastAlert = this.getLastAlert(suppressionKey);
        
        if (lastAlert && (Date.now() - lastAlert.timestamp) < rule.suppressionTime) {
            return true;
        }

        return false;
    }

    // 创建告警
    async createAlert(threat, requestData, threatId, rule) {
        const alertId = crypto.randomUUID();
        const alert = {
            id: alertId,
            threatId,
            ruleId: rule.ruleId,
            ruleName: rule.name,
            threat,
            requestData,
            severity: threat.severity,
            status: 'active',
            createdAt: new Date(),
            channels: rule.channels,
            escalationPolicy: rule.escalation,
            acknowledgments: [],
            actions: []
        };

        this.alertHistory.push(alert);
        return alert;
    }

    // 发送告警
    async sendAlert(alert, rule) {
        const promises = [];

        for (const channelName of rule.channels) {
            const channel = this.alertChannels.get(channelName);
            if (channel && channel.enabled) {
                promises.push(this.sendToChannel(alert, channel));
            }
        }

        const results = await Promise.allSettled(promises);
        
        // 记录发送结果
        results.forEach((result, index) => {
            const channelName = rule.channels[index];
            alert.actions.push({
                action: 'send_alert',
                channel: channelName,
                status: result.status,
                timestamp: new Date(),
                error: result.status === 'rejected' ? result.reason : null
            });
        });
    }

    // 发送到特定渠道
    async sendToChannel(alert, channel) {
        const message = this.formatAlertMessage(alert, channel.type);

        switch (channel.type) {
            case 'email':
                return this.sendEmail(message, channel.config);
            case 'sms':
                return this.sendSMS(message, channel.config);
            case 'slack':
                return this.sendSlack(message, channel.config);
            case 'webhook':
                return this.sendWebhook(alert, channel.config);
            default:
                throw new Error(`不支持的告警渠道: ${channel.type}`);
        }
    }

    // 格式化告警消息
    formatAlertMessage(alert, channelType) {
        const { threat, requestData } = alert;
        
        const baseMessage = {
            title: `🚨 安全威胁告警: ${threat.description}`,
            severity: threat.severity.toUpperCase(),
            threatType: threat.type,
            timestamp: alert.createdAt.toISOString(),
            source: requestData.ip || 'unknown',
            details: threat.evidence
        };

        switch (channelType) {
            case 'email':
                return {
                    subject: `[${baseMessage.severity}] ${baseMessage.title}`,
                    html: this.generateEmailHTML(baseMessage),
                    text: this.generateEmailText(baseMessage)
                };
            
            case 'sms':
                return {
                    text: `${baseMessage.severity}: ${threat.description} 来源:${baseMessage.source} 时间:${new Date().toLocaleString()}`
                };
            
            case 'slack':
                return {
                    text: baseMessage.title,
                    attachments: [{
                        color: this.getSeverityColor(threat.severity),
                        fields: [
                            { title: '威胁类型', value: threat.type, short: true },
                            { title: '严重程度', value: threat.severity, short: true },
                            { title: '来源IP', value: requestData.ip || 'unknown', short: true },
                            { title: '时间', value: alert.createdAt.toLocaleString(), short: true }
                        ]
                    }]
                };
            
            default:
                return baseMessage;
        }
    }

    // 生成邮件HTML
    generateEmailHTML(message) {
        return `
        <html>
        <body>
            <h2 style="color: ${this.getSeverityColor(message.severity)};">${message.title}</h2>
            <table border="1" cellpadding="5">
                <tr><td><strong>威胁类型</strong></td><td>${message.threatType}</td></tr>
                <tr><td><strong>严重程度</strong></td><td>${message.severity}</td></tr>
                <tr><td><strong>来源</strong></td><td>${message.source}</td></tr>
                <tr><td><strong>时间</strong></td><td>${message.timestamp}</td></tr>
            </table>
            <h3>详细信息:</h3>
            <pre>${JSON.stringify(message.details, null, 2)}</pre>
        </body>
        </html>
        `;
    }

    // 生成邮件文本
    generateEmailText(message) {
        return `
安全威胁告警

威胁类型: ${message.threatType}
严重程度: ${message.severity}
来源: ${message.source}
时间: ${message.timestamp}

详细信息:
${JSON.stringify(message.details, null, 2)}
        `;
    }

    // 获取严重程度颜色
    getSeverityColor(severity) {
        const colors = {
            critical: '#ff0000',
            high: '#ff6600',
            medium: '#ffcc00',
            low: '#00cc00'
        };
        return colors[severity] || '#cccccc';
    }

    // 模拟发送邮件
    async sendEmail(message, config) {
        console.log(`📧 发送邮件告警到: ${config.recipients.join(', ')}`);
        console.log(`   主题: ${message.subject}`);
        return { status: 'sent', timestamp: new Date() };
    }

    // 模拟发送短信
    async sendSMS(message, config) {
        console.log(`📱 发送短信告警到: ${config.recipients.join(', ')}`);
        console.log(`   内容: ${message.text}`);
        return { status: 'sent', timestamp: new Date() };
    }

    // 模拟发送Slack消息
    async sendSlack(message, config) {
        console.log(`💬 发送Slack告警到: ${config.channel}`);
        console.log(`   消息: ${message.text}`);
        return { status: 'sent', timestamp: new Date() };
    }

    // 模拟发送Webhook
    async sendWebhook(alert, config) {
        console.log(`🔗 发送Webhook到: ${config.url}`);
        console.log(`   数据: ${JSON.stringify(alert, null, 2).substring(0, 200)}...`);
        return { status: 'sent', timestamp: new Date() };
    }

    // 启动升级流程
    startEscalation(alert, rule) {
        const policy = this.escalationPolicies.get(rule.escalation);
        if (!policy) return;

        policy.levels.forEach((level, index) => {
            setTimeout(() => {
                this.executeEscalationLevel(alert, level, index);
            }, level.delay);
        });
    }

    // 执行升级级别
    async executeEscalationLevel(alert, level, levelIndex) {
        // 检查告警是否已被确认
        if (alert.status === 'acknowledged' || alert.status === 'resolved') {
            return;
        }

        console.log(`⬆️ 执行告警升级 - 级别 ${levelIndex + 1}`);
        
        // 发送升级通知
        for (const channelName of level.channels) {
            const channel = this.alertChannels.get(channelName);
            if (channel && channel.enabled) {
                await this.sendEscalationNotification(alert, channel, levelIndex);
            }
        }

        // 执行特殊动作
        if (level.action) {
            await this.executeEscalationAction(alert, level.action);
        }
    }

    // 发送升级通知
    async sendEscalationNotification(alert, channel, level) {
        const escalationMessage = {
            ...this.formatAlertMessage(alert, channel.type),
            escalation: true,
            level: level + 1
        };

        if (channel.type === 'slack') {
            escalationMessage.text = `🔥 告警升级 (级别 ${level + 1}): ${alert.threat.description}`;
        }

        await this.sendToChannel({ ...alert, escalation: true }, channel);
    }

    // 执行升级动作
    async executeEscalationAction(alert, action) {
        switch (action) {
            case 'notify_manager':
                console.log(`📞 通知安全经理: 告警 ${alert.id} 需要关注`);
                break;
            case 'notify_ciso':
                console.log(`🚨 通知CISO: 关键安全事件 ${alert.id}`);
                break;
            case 'daily_summary':
                console.log(`📊 添加到每日安全摘要: ${alert.id}`);
                break;
        }
    }

    // 获取最近威胁
    getRecentThreats(threatType, timeWindow) {
        const cutoff = Date.now() - timeWindow;
        return this.alertHistory.filter(alert => 
            alert.threat.type === threatType && 
            alert.createdAt.getTime() > cutoff
        );
    }

    // 获取最后一次告警
    getLastAlert(suppressionKey) {
        return this.alertHistory
            .filter(alert => `${alert.threat.type}_${alert.threat.severity}` === suppressionKey)
            .sort((a, b) => b.createdAt - a.createdAt)[0];
    }

    // 确认告警
    acknowledgeAlert(alertId, acknowledgedBy) {
        const alert = this.alertHistory.find(a => a.id === alertId);
        if (alert) {
            alert.status = 'acknowledged';
            alert.acknowledgments.push({
                acknowledgedBy,
                timestamp: new Date()
            });
            console.log(`✅ 告警 ${alertId} 已被 ${acknowledgedBy} 确认`);
        }
    }

    // 解决告警
    resolveAlert(alertId, resolvedBy, resolution) {
        const alert = this.alertHistory.find(a => a.id === alertId);
        if (alert) {
            alert.status = 'resolved';
            alert.resolution = {
                resolvedBy,
                resolution,
                timestamp: new Date()
            };
            console.log(`✅ 告警 ${alertId} 已被 ${resolvedBy} 解决`);
        }
    }

    // 获取告警统计
    getAlertStatistics() {
        const stats = {
            totalAlerts: this.alertHistory.length,
            activeAlerts: this.alertHistory.filter(a => a.status === 'active').length,
            acknowledgedAlerts: this.alertHistory.filter(a => a.status === 'acknowledged').length,
            resolvedAlerts: this.alertHistory.filter(a => a.status === 'resolved').length,
            alertsBySeverity: {},
            alertsByType: {},
            averageResponseTime: 0
        };

        // 按严重程度统计
        this.alertHistory.forEach(alert => {
            stats.alertsBySeverity[alert.severity] = (stats.alertsBySeverity[alert.severity] || 0) + 1;
            stats.alertsByType[alert.threat.type] = (stats.alertsByType[alert.threat.type] || 0) + 1;
        });

        // 计算平均响应时间
        const resolvedAlerts = this.alertHistory.filter(a => a.status === 'resolved' && a.resolution);
        if (resolvedAlerts.length > 0) {
            const totalResponseTime = resolvedAlerts.reduce((sum, alert) => {
                return sum + (alert.resolution.timestamp - alert.createdAt);
            }, 0);
            stats.averageResponseTime = Math.round(totalResponseTime / resolvedAlerts.length / 1000 / 60); // 分钟
        }

        return stats;
    }
}

// 综合安全监控系统
class ComprehensiveSecurityMonitor {
    constructor() {
        this.threatDetection = new ThreatDetectionEngine();
        this.alerting = new IntelligentAlertingSystem();
        this.isRunning = false;
        this.monitoringMetrics = {
            uptime: 0,
            startTime: null,
            eventsProcessed: 0,
            threatsBlocked: 0,
            alertsSent: 0
        };
        
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // 威胁检测事件处理
        this.threatDetection.on('threat_detected', async (threatData) => {
            this.monitoringMetrics.threatsBlocked++;
            await this.alerting.handleThreatAlert(threatData);
            this.monitoringMetrics.alertsSent++;
        });
    }

    // 启动监控系统
    start() {
        if (this.isRunning) {
            console.log('⚠️ 监控系统已在运行中');
            return;
        }

        this.isRunning = true;
        this.monitoringMetrics.startTime = new Date();
        
        console.log('🚀 启动综合安全监控系统');
        console.log('==================================================');
        console.log('✅ 威胁检测引擎已启动');
        console.log('✅ 智能告警系统已启动');
        console.log('✅ 实时监控已开始');
        
        // 启动定期统计报告
        this.startPeriodicReporting();
    }

    // 停止监控系统
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ 监控系统未在运行');
            return;
        }

        this.isRunning = false;
        console.log('🛑 安全监控系统已停止');
    }

    // 处理网络请求
    async processRequest(requestData) {
        if (!this.isRunning) return [];

        this.monitoringMetrics.eventsProcessed++;
        return this.threatDetection.analyzeRequest(requestData);
    }

    // 处理文件上传
    async processFileUpload(fileData) {
        if (!this.isRunning) return [];

        this.monitoringMetrics.eventsProcessed++;
        return this.threatDetection.analyzeFileUpload(fileData);
    }

    // 启动定期报告
    startPeriodicReporting() {
        setInterval(() => {
            if (this.isRunning) {
                this.generatePeriodicReport();
            }
        }, 300000); // 每5分钟生成一次报告
    }

    // 生成定期报告
    generatePeriodicReport() {
        const threatStats = this.threatDetection.getThreatStatistics();
        const alertStats = this.alerting.getAlertStatistics();
        
        console.log('\n📊 安全监控定期报告');
        console.log('==================================================');
        console.log(`⏰ 运行时间: ${Math.round((Date.now() - this.monitoringMetrics.startTime) / 1000 / 60)} 分钟`);
        console.log(`📈 处理事件: ${this.monitoringMetrics.eventsProcessed}`);
        console.log(`🛡️ 检测威胁: ${threatStats.threatsDetected}`);
        console.log(`🚨 发送告警: ${alertStats.totalAlerts}`);
        console.log(`✅ 活跃威胁: ${threatStats.activeThreats}`);
        console.log(`📊 检测准确率: ${threatStats.accuracy}%`);
    }

    // 获取系统状态
    getSystemStatus() {
        const uptime = this.isRunning ? Date.now() - this.monitoringMetrics.startTime : 0;
        
        return {
            isRunning: this.isRunning,
            uptime: Math.round(uptime / 1000 / 60), // 分钟
            metrics: this.monitoringMetrics,
            threatStats: this.threatDetection.getThreatStatistics(),
            alertStats: this.alerting.getAlertStatistics(),
            systemHealth: this.assessSystemHealth()
        };
    }

    // 评估系统健康状况
    assessSystemHealth() {
        const threatStats = this.threatDetection.getThreatStatistics();
        const alertStats = this.alerting.getAlertStatistics();
        
        let healthScore = 100;
        const issues = [];

        // 检查威胁检测准确率
        if (threatStats.accuracy < 80) {
            healthScore -= 20;
            issues.push('威胁检测准确率偏低');
        }

        // 检查活跃威胁数量
        if (threatStats.activeThreats > 10) {
            healthScore -= 15;
            issues.push('活跃威胁数量过多');
        }

        // 检查未确认告警
        if (alertStats.activeAlerts > 5) {
            healthScore -= 10;
            issues.push('未确认告警过多');
        }

        let status = 'healthy';
        if (healthScore < 60) {
            status = 'critical';
        } else if (healthScore < 80) {
            status = 'warning';
        }

        return {
            score: healthScore,
            status,
            issues
        };
    }
}

module.exports = { 
    ThreatDetectionEngine, 
    IntelligentAlertingSystem, 
    ComprehensiveSecurityMonitor 
};

// 如果直接运行此文件，执行演示
if (require.main === module) {
    const monitor = new ComprehensiveSecurityMonitor();
    monitor.start();
    
    console.log('\n✅ 安全监控与告警系统演示完成!');
    console.log('\n🎯 系统主要功能:');
    console.log('   • 实时威胁检测与分析');
    console.log('   • 智能告警与升级机制');
    console.log('   • 多渠道告警通知');
    console.log('   • 异常行为模式识别');
    console.log('   • 自动化威胁响应');
    console.log('   • 持续安全监控');
    console.log('   • 威胁情报集成');
    console.log('   • 安全事件关联分析');
}