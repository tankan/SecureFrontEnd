/**
 * 事件响应计划系统
 * 实现安全事件处理流程、应急响应预案
 */

const crypto = require('crypto');
const fs = require('fs').promises;

// 事件分类管理器
class IncidentClassificationManager {
    constructor() {
        this.incidentTypes = new Map();
        this.severityLevels = new Map();
        this.responseTeams = new Map();
        this.initializeIncidentTypes();
        this.initializeSeverityLevels();
        this.initializeResponseTeams();
    }

    // 初始化事件类型
    initializeIncidentTypes() {
        const types = [
            {
                id: 'data_breach',
                name: '数据泄露',
                category: 'confidentiality',
                description: '敏感数据被未授权访问或泄露',
                commonCauses: ['内部威胁', '外部攻击', '配置错误', '人为失误'],
                indicators: ['异常数据访问', '大量数据下载', '未授权登录']
            },
            {
                id: 'malware_infection',
                name: '恶意软件感染',
                category: 'integrity',
                description: '系统被恶意软件感染',
                commonCauses: ['钓鱼邮件', '恶意下载', 'USB感染', '网络攻击'],
                indicators: ['系统异常', '网络流量异常', '文件被加密']
            },
            {
                id: 'ddos_attack',
                name: 'DDoS攻击',
                category: 'availability',
                description: '分布式拒绝服务攻击',
                commonCauses: ['僵尸网络', '竞争对手', '勒索攻击'],
                indicators: ['服务不可用', '网络拥塞', '响应时间过长']
            },
            {
                id: 'insider_threat',
                name: '内部威胁',
                category: 'confidentiality',
                description: '内部人员的恶意或疏忽行为',
                commonCauses: ['员工不满', '权限滥用', '社会工程'],
                indicators: ['异常访问模式', '权限提升', '数据异常访问']
            },
            {
                id: 'phishing_attack',
                name: '钓鱼攻击',
                category: 'confidentiality',
                description: '通过欺骗手段获取敏感信息',
                commonCauses: ['邮件钓鱼', '网站仿冒', '社交媒体'],
                indicators: ['可疑邮件', '异常登录', '凭据泄露']
            },
            {
                id: 'system_compromise',
                name: '系统入侵',
                category: 'integrity',
                description: '系统被未授权访问或控制',
                commonCauses: ['漏洞利用', '弱密码', '配置错误'],
                indicators: ['异常进程', '未知文件', '网络连接异常']
            }
        ];

        types.forEach(type => {
            this.incidentTypes.set(type.id, type);
        });
    }

    // 初始化严重程度级别
    initializeSeverityLevels() {
        const levels = [
            {
                level: 'critical',
                name: '关键',
                score: 4,
                description: '对业务造成严重影响，需要立即响应',
                responseTime: '15分钟',
                escalationTime: '30分钟',
                criteria: [
                    '大规模数据泄露',
                    '核心系统完全不可用',
                    '财务损失超过100万',
                    '影响超过10万用户'
                ]
            },
            {
                level: 'high',
                name: '高危',
                score: 3,
                description: '对业务造成重大影响，需要紧急响应',
                responseTime: '1小时',
                escalationTime: '2小时',
                criteria: [
                    '重要数据泄露',
                    '关键系统部分不可用',
                    '财务损失10-100万',
                    '影响1-10万用户'
                ]
            },
            {
                level: 'medium',
                name: '中危',
                score: 2,
                description: '对业务造成一定影响，需要及时响应',
                responseTime: '4小时',
                escalationTime: '8小时',
                criteria: [
                    '少量数据泄露',
                    '非关键系统不可用',
                    '财务损失1-10万',
                    '影响1000-10000用户'
                ]
            },
            {
                level: 'low',
                name: '低危',
                score: 1,
                description: '对业务影响较小，按正常流程处理',
                responseTime: '24小时',
                escalationTime: '48小时',
                criteria: [
                    '潜在安全风险',
                    '系统性能下降',
                    '财务损失小于1万',
                    '影响少于1000用户'
                ]
            }
        ];

        levels.forEach(level => {
            this.severityLevels.set(level.level, level);
        });
    }

    // 初始化响应团队
    initializeResponseTeams() {
        const teams = [
            {
                id: 'incident_commander',
                name: '事件指挥官',
                role: 'commander',
                responsibilities: ['事件协调', '决策制定', '对外沟通'],
                contacts: ['ic@company.com', '+86-138-0000-0001'],
                escalationLevel: 'executive'
            },
            {
                id: 'security_team',
                name: '安全团队',
                role: 'technical',
                responsibilities: ['威胁分析', '取证调查', '安全加固'],
                contacts: ['security@company.com', '+86-138-0000-0002'],
                escalationLevel: 'management'
            },
            {
                id: 'it_operations',
                name: 'IT运维团队',
                role: 'technical',
                responsibilities: ['系统恢复', '基础设施维护', '监控告警'],
                contacts: ['ops@company.com', '+86-138-0000-0003'],
                escalationLevel: 'technical'
            },
            {
                id: 'legal_team',
                name: '法务团队',
                role: 'advisory',
                responsibilities: ['合规要求', '法律风险', '监管报告'],
                contacts: ['legal@company.com', '+86-138-0000-0004'],
                escalationLevel: 'executive'
            },
            {
                id: 'communications',
                name: '公关团队',
                role: 'communications',
                responsibilities: ['媒体沟通', '客户通知', '声誉管理'],
                contacts: ['pr@company.com', '+86-138-0000-0005'],
                escalationLevel: 'executive'
            },
            {
                id: 'business_continuity',
                name: '业务连续性团队',
                role: 'business',
                responsibilities: ['业务恢复', '灾难恢复', '风险评估'],
                contacts: ['bcp@company.com', '+86-138-0000-0006'],
                escalationLevel: 'management'
            }
        ];

        teams.forEach(team => {
            this.responseTeams.set(team.id, team);
        });
    }

    // 事件分类
    classifyIncident(incidentData) {
        const classification = {
            incidentId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            type: this.determineIncidentType(incidentData),
            severity: this.calculateSeverity(incidentData),
            category: null,
            confidence: 0
        };

        // 确定事件类别
        if (classification.type) {
            const typeInfo = this.incidentTypes.get(classification.type);

            classification.category = typeInfo.category;
            classification.confidence = this.calculateConfidence(incidentData, typeInfo);
        }

        return classification;
    }

    // 确定事件类型
    determineIncidentType(incidentData) {
        const indicators = incidentData.indicators || [];
        const description = incidentData.description || '';

        let bestMatch = null;
        let highestScore = 0;

        for (const [typeId, typeInfo] of this.incidentTypes) {
            let score = 0;

            // 基于指标匹配
            typeInfo.indicators.forEach(indicator => {
                if (indicators.some(i => i.toLowerCase().includes(indicator.toLowerCase()))) {
                    score += 2;
                }
            });

            // 基于描述匹配
            if (description.toLowerCase().includes(typeInfo.name.toLowerCase())) {
                score += 3;
            }

            if (score > highestScore) {
                highestScore = score;
                bestMatch = typeId;
            }
        }

        return bestMatch;
    }

    // 计算严重程度
    calculateSeverity(incidentData) {
        let severityScore = 1; // 默认低危

        // 基于影响范围
        if (incidentData.affectedUsers > 100000) severityScore = 4;
        else if (incidentData.affectedUsers > 10000) severityScore = 3;
        else if (incidentData.affectedUsers > 1000) severityScore = 2;

        // 基于财务损失
        if (incidentData.estimatedLoss > 1000000) severityScore = Math.max(severityScore, 4);
        else if (incidentData.estimatedLoss > 100000) severityScore = Math.max(severityScore, 3);
        else if (incidentData.estimatedLoss > 10000) severityScore = Math.max(severityScore, 2);

        // 基于系统影响
        if (incidentData.systemImpact === 'critical') severityScore = Math.max(severityScore, 4);
        else if (incidentData.systemImpact === 'high') severityScore = Math.max(severityScore, 3);
        else if (incidentData.systemImpact === 'medium') severityScore = Math.max(severityScore, 2);

        // 转换为严重程度级别
        const severityMap = { 4: 'critical', 3: 'high', 2: 'medium', 1: 'low' };

        return severityMap[severityScore];
    }

    // 计算分类置信度
    calculateConfidence(incidentData, typeInfo) {
        let confidence = 0.5; // 基础置信度

        const indicators = incidentData.indicators || [];
        const matchedIndicators = typeInfo.indicators.filter(indicator =>
            indicators.some(i => i.toLowerCase().includes(indicator.toLowerCase()))
        );

        // 基于指标匹配度
        if (typeInfo.indicators.length > 0) {
            confidence += (matchedIndicators.length / typeInfo.indicators.length) * 0.4;
        }

        // 基于描述匹配
        if (incidentData.description &&
            incidentData.description.toLowerCase().includes(typeInfo.name.toLowerCase())) {
            confidence += 0.1;
        }

        return Math.min(confidence, 1.0);
    }
}

// 响应流程管理器
class ResponseWorkflowManager {
    constructor() {
        this.workflows = new Map();
        this.activeIncidents = new Map();
        this.responseActions = new Map();
        this.initializeWorkflows();
        this.initializeResponseActions();
    }

    // 初始化响应流程
    initializeWorkflows() {
        const workflows = [
            {
                id: 'data_breach_workflow',
                name: '数据泄露响应流程',
                incidentTypes: ['data_breach'],
                phases: [
                    {
                        phase: 'detection',
                        name: '检测确认',
                        duration: 15,
                        actions: ['confirm_incident', 'assess_scope', 'notify_team'],
                        criteria: ['事件确认', '影响范围评估', '团队通知']
                    },
                    {
                        phase: 'containment',
                        name: '遏制控制',
                        duration: 30,
                        actions: ['isolate_systems', 'preserve_evidence', 'stop_breach'],
                        criteria: ['系统隔离', '证据保全', '泄露阻止']
                    },
                    {
                        phase: 'investigation',
                        name: '调查分析',
                        duration: 120,
                        actions: ['forensic_analysis', 'root_cause_analysis', 'impact_assessment'],
                        criteria: ['取证分析', '根因分析', '影响评估']
                    },
                    {
                        phase: 'recovery',
                        name: '恢复重建',
                        duration: 240,
                        actions: ['system_restoration', 'security_hardening', 'monitoring_enhancement'],
                        criteria: ['系统恢复', '安全加固', '监控增强']
                    },
                    {
                        phase: 'lessons_learned',
                        name: '经验总结',
                        duration: 60,
                        actions: ['incident_review', 'process_improvement', 'training_update'],
                        criteria: ['事件回顾', '流程改进', '培训更新']
                    }
                ]
            },
            {
                id: 'malware_workflow',
                name: '恶意软件响应流程',
                incidentTypes: ['malware_infection'],
                phases: [
                    {
                        phase: 'detection',
                        name: '检测识别',
                        duration: 10,
                        actions: ['malware_identification', 'scope_assessment', 'team_notification'],
                        criteria: ['恶意软件识别', '感染范围评估', '团队通知']
                    },
                    {
                        phase: 'containment',
                        name: '隔离遏制',
                        duration: 20,
                        actions: ['network_isolation', 'system_quarantine', 'spread_prevention'],
                        criteria: ['网络隔离', '系统隔离', '传播阻止']
                    },
                    {
                        phase: 'eradication',
                        name: '清除根除',
                        duration: 60,
                        actions: ['malware_removal', 'system_cleaning', 'vulnerability_patching'],
                        criteria: ['恶意软件清除', '系统清理', '漏洞修补']
                    },
                    {
                        phase: 'recovery',
                        name: '恢复验证',
                        duration: 120,
                        actions: ['system_restoration', 'integrity_verification', 'monitoring_setup'],
                        criteria: ['系统恢复', '完整性验证', '监控部署']
                    }
                ]
            },
            {
                id: 'ddos_workflow',
                name: 'DDoS攻击响应流程',
                incidentTypes: ['ddos_attack'],
                phases: [
                    {
                        phase: 'detection',
                        name: '攻击检测',
                        duration: 5,
                        actions: ['traffic_analysis', 'attack_confirmation', 'impact_assessment'],
                        criteria: ['流量分析', '攻击确认', '影响评估']
                    },
                    {
                        phase: 'mitigation',
                        name: '攻击缓解',
                        duration: 15,
                        actions: ['traffic_filtering', 'rate_limiting', 'cdn_activation'],
                        criteria: ['流量过滤', '速率限制', 'CDN激活']
                    },
                    {
                        phase: 'monitoring',
                        name: '持续监控',
                        duration: 60,
                        actions: ['traffic_monitoring', 'service_verification', 'capacity_scaling'],
                        criteria: ['流量监控', '服务验证', '容量扩展']
                    }
                ]
            }
        ];

        workflows.forEach(workflow => {
            this.workflows.set(workflow.id, workflow);
        });
    }

    // 初始化响应动作
    initializeResponseActions() {
        const actions = [
            // 通用动作
            {
                id: 'confirm_incident',
                name: '确认事件',
                type: 'verification',
                description: '确认安全事件的真实性和严重程度',
                estimatedTime: 15,
                requiredRoles: ['security_team'],
                checklist: ['验证告警信息', '收集初步证据', '评估可信度']
            },
            {
                id: 'notify_team',
                name: '通知团队',
                type: 'communication',
                description: '通知相关响应团队',
                estimatedTime: 5,
                requiredRoles: ['incident_commander'],
                checklist: ['发送紧急通知', '召集响应团队', '建立沟通渠道']
            },
            {
                id: 'team_notification',
                name: '团队通知',
                type: 'communication',
                description: '通知相关响应团队',
                estimatedTime: 5,
                requiredRoles: ['incident_commander'],
                checklist: ['发送紧急通知', '召集响应团队', '建立沟通渠道']
            },
            // 数据泄露相关动作
            {
                id: 'assess_scope',
                name: '评估范围',
                type: 'assessment',
                description: '评估数据泄露的影响范围',
                estimatedTime: 20,
                requiredRoles: ['security_team'],
                checklist: ['确定泄露数据类型', '评估影响用户数量', '分析泄露途径']
            },
            {
                id: 'stop_breach',
                name: '阻止泄露',
                type: 'containment',
                description: '阻止数据进一步泄露',
                estimatedTime: 15,
                requiredRoles: ['security_team', 'it_operations'],
                checklist: ['关闭泄露通道', '修复安全漏洞', '加强访问控制']
            },
            {
                id: 'root_cause_analysis',
                name: '根因分析',
                type: 'investigation',
                description: '分析事件根本原因',
                estimatedTime: 90,
                requiredRoles: ['security_team'],
                checklist: ['分析攻击向量', '识别安全弱点', '确定改进措施']
            },
            {
                id: 'impact_assessment',
                name: '影响评估',
                type: 'assessment',
                description: '评估事件影响程度',
                estimatedTime: 30,
                requiredRoles: ['security_team', 'business_continuity'],
                checklist: ['评估业务影响', '计算财务损失', '分析声誉风险']
            },
            {
                id: 'security_hardening',
                name: '安全加固',
                type: 'recovery',
                description: '加强系统安全防护',
                estimatedTime: 120,
                requiredRoles: ['security_team', 'it_operations'],
                checklist: ['修补安全漏洞', '更新安全策略', '加强监控']
            },
            {
                id: 'monitoring_enhancement',
                name: '监控增强',
                type: 'recovery',
                description: '增强安全监控能力',
                estimatedTime: 60,
                requiredRoles: ['security_team'],
                checklist: ['部署新监控规则', '调整告警阈值', '增加日志收集']
            },
            // 恶意软件相关动作
            {
                id: 'malware_identification',
                name: '恶意软件识别',
                type: 'detection',
                description: '识别恶意软件类型和特征',
                estimatedTime: 15,
                requiredRoles: ['security_team'],
                checklist: ['分析恶意软件样本', '确定感染类型', '评估威胁等级']
            },
            {
                id: 'scope_assessment',
                name: '范围评估',
                type: 'assessment',
                description: '评估恶意软件感染范围',
                estimatedTime: 20,
                requiredRoles: ['security_team', 'it_operations'],
                checklist: ['扫描网络设备', '检查文件系统', '分析网络流量']
            },
            {
                id: 'network_isolation',
                name: '网络隔离',
                type: 'containment',
                description: '隔离受感染的网络段',
                estimatedTime: 10,
                requiredRoles: ['it_operations'],
                checklist: ['断开网络连接', '隔离受感染主机', '阻断恶意通信']
            },
            {
                id: 'system_quarantine',
                name: '系统隔离',
                type: 'containment',
                description: '隔离受感染的系统',
                estimatedTime: 15,
                requiredRoles: ['it_operations'],
                checklist: ['隔离受感染主机', '停止可疑进程', '保护关键数据']
            },
            {
                id: 'spread_prevention',
                name: '传播阻止',
                type: 'containment',
                description: '阻止恶意软件传播',
                estimatedTime: 20,
                requiredRoles: ['security_team'],
                checklist: ['更新防病毒规则', '阻断恶意域名', '加强网络过滤']
            },
            {
                id: 'malware_removal',
                name: '恶意软件清除',
                type: 'eradication',
                description: '清除恶意软件',
                estimatedTime: 45,
                requiredRoles: ['security_team', 'it_operations'],
                checklist: ['运行清除工具', '手动删除恶意文件', '清理注册表']
            },
            {
                id: 'system_cleaning',
                name: '系统清理',
                type: 'eradication',
                description: '清理受感染的系统',
                estimatedTime: 30,
                requiredRoles: ['it_operations'],
                checklist: ['清除临时文件', '重置系统配置', '更新系统补丁']
            },
            {
                id: 'vulnerability_patching',
                name: '漏洞修补',
                type: 'eradication',
                description: '修补被利用的安全漏洞',
                estimatedTime: 60,
                requiredRoles: ['it_operations'],
                checklist: ['安装安全补丁', '更新软件版本', '修复配置错误']
            },
            {
                id: 'integrity_verification',
                name: '完整性验证',
                type: 'recovery',
                description: '验证系统完整性',
                estimatedTime: 30,
                requiredRoles: ['security_team'],
                checklist: ['检查文件完整性', '验证系统配置', '测试安全控制']
            },
            {
                id: 'monitoring_setup',
                name: '监控部署',
                type: 'recovery',
                description: '部署增强监控',
                estimatedTime: 45,
                requiredRoles: ['security_team'],
                checklist: ['部署EDR工具', '配置行为监控', '设置告警规则']
            },
            // DDoS攻击相关动作
            {
                id: 'traffic_analysis',
                name: '流量分析',
                type: 'detection',
                description: '分析网络流量模式',
                estimatedTime: 10,
                requiredRoles: ['security_team', 'it_operations'],
                checklist: ['分析流量特征', '识别攻击源', '评估攻击规模']
            },
            {
                id: 'attack_confirmation',
                name: '攻击确认',
                type: 'verification',
                description: '确认DDoS攻击',
                estimatedTime: 5,
                requiredRoles: ['security_team'],
                checklist: ['验证攻击特征', '确认服务影响', '评估攻击类型']
            },
            {
                id: 'traffic_filtering',
                name: '流量过滤',
                type: 'mitigation',
                description: '过滤恶意流量',
                estimatedTime: 10,
                requiredRoles: ['it_operations'],
                checklist: ['配置防火墙规则', '启用DDoS防护', '过滤恶意IP']
            },
            {
                id: 'rate_limiting',
                name: '速率限制',
                type: 'mitigation',
                description: '限制请求速率',
                estimatedTime: 5,
                requiredRoles: ['it_operations'],
                checklist: ['配置速率限制', '调整连接数限制', '启用流量整形']
            },
            {
                id: 'cdn_activation',
                name: 'CDN激活',
                type: 'mitigation',
                description: '激活CDN防护',
                estimatedTime: 10,
                requiredRoles: ['it_operations'],
                checklist: ['启用CDN防护', '配置缓存策略', '调整DNS解析']
            },
            {
                id: 'traffic_monitoring',
                name: '流量监控',
                type: 'monitoring',
                description: '持续监控网络流量',
                estimatedTime: 30,
                requiredRoles: ['security_team'],
                checklist: ['监控流量变化', '分析攻击趋势', '调整防护策略']
            },
            {
                id: 'service_verification',
                name: '服务验证',
                type: 'verification',
                description: '验证服务可用性',
                estimatedTime: 15,
                requiredRoles: ['it_operations'],
                checklist: ['测试服务响应', '验证功能正常', '检查性能指标']
            },
            {
                id: 'capacity_scaling',
                name: '容量扩展',
                type: 'mitigation',
                description: '扩展系统容量',
                estimatedTime: 20,
                requiredRoles: ['it_operations'],
                checklist: ['增加服务器资源', '扩展带宽容量', '优化负载均衡']
            },
            // 通用恢复动作
            {
                id: 'isolate_systems',
                name: '隔离系统',
                type: 'containment',
                description: '隔离受影响的系统以防止进一步损害',
                estimatedTime: 20,
                requiredRoles: ['it_operations', 'security_team'],
                checklist: ['断开网络连接', '停止相关服务', '保护关键数据']
            },
            {
                id: 'preserve_evidence',
                name: '保全证据',
                type: 'forensics',
                description: '保全数字证据用于后续调查',
                estimatedTime: 30,
                requiredRoles: ['security_team'],
                checklist: ['创建系统镜像', '收集日志文件', '记录现场状态']
            },
            {
                id: 'forensic_analysis',
                name: '取证分析',
                type: 'investigation',
                description: '进行详细的数字取证分析',
                estimatedTime: 120,
                requiredRoles: ['security_team'],
                checklist: ['分析系统镜像', '追踪攻击路径', '识别攻击者']
            },
            {
                id: 'system_restoration',
                name: '系统恢复',
                type: 'recovery',
                description: '恢复系统正常运行',
                estimatedTime: 60,
                requiredRoles: ['it_operations'],
                checklist: ['恢复系统服务', '验证系统完整性', '测试业务功能']
            },
            // 经验总结相关动作
            {
                id: 'incident_review',
                name: '事件回顾',
                type: 'review',
                description: '回顾事件处理过程',
                estimatedTime: 30,
                requiredRoles: ['incident_commander', 'security_team'],
                checklist: ['总结处理过程', '分析响应效果', '识别改进点']
            },
            {
                id: 'process_improvement',
                name: '流程改进',
                type: 'improvement',
                description: '改进响应流程',
                estimatedTime: 45,
                requiredRoles: ['security_team'],
                checklist: ['更新响应流程', '修订操作手册', '优化工具配置']
            },
            {
                id: 'training_update',
                name: '培训更新',
                type: 'training',
                description: '更新安全培训内容',
                estimatedTime: 30,
                requiredRoles: ['security_team'],
                checklist: ['更新培训材料', '组织经验分享', '开展专项培训']
            }
        ];

        actions.forEach(action => {
            this.responseActions.set(action.id, action);
        });
    }

    // 启动响应流程
    async initiateResponse(incident, classification) {
        const workflowId = this.selectWorkflow(classification.type);
        const workflow = this.workflows.get(workflowId);

        if (!workflow) {
            throw new Error(`未找到适用的响应流程: ${classification.type}`);
        }

        const responseInstance = {
            id: crypto.randomUUID(),
            incidentId: incident.id,
            workflowId,
            classification,
            startTime: new Date().toISOString(),
            currentPhase: workflow.phases[0].phase,
            phaseIndex: 0,
            status: 'active',
            completedActions: [],
            timeline: [],
            assignedTeams: []
        };

        // 记录响应启动
        responseInstance.timeline.push({
            timestamp: new Date().toISOString(),
            event: 'response_initiated',
            description: `启动${workflow.name}`,
            phase: 'initiation'
        });

        // 分配响应团队
        const assignedTeams = this.assignResponseTeams(classification.severity);

        responseInstance.assignedTeams = assignedTeams;

        // 启动第一阶段
        await this.executePhase(responseInstance, workflow.phases[0]);

        this.activeIncidents.set(incident.id, responseInstance);

        return responseInstance;
    }

    // 选择响应流程
    selectWorkflow(incidentType) {
        for (const [workflowId, workflow] of this.workflows) {
            if (workflow.incidentTypes.includes(incidentType)) {
                return workflowId;
            }
        }

        // 为未匹配的事件类型创建通用流程
        if (!this.workflows.has('generic_workflow')) {
            this.workflows.set('generic_workflow', {
                id: 'generic_workflow',
                name: '通用安全事件响应流程',
                incidentTypes: ['insider_threat', 'phishing_attack', 'system_compromise'],
                phases: [
                    {
                        phase: 'detection',
                        name: '检测确认',
                        duration: 15,
                        actions: ['confirm_incident', 'assess_scope', 'team_notification'],
                        criteria: ['事件确认', '影响范围评估', '团队通知']
                    },
                    {
                        phase: 'containment',
                        name: '遏制控制',
                        duration: 30,
                        actions: ['isolate_systems', 'preserve_evidence', 'stop_breach'],
                        criteria: ['系统隔离', '证据保全', '威胁遏制']
                    },
                    {
                        phase: 'investigation',
                        name: '调查分析',
                        duration: 120,
                        actions: ['forensic_analysis', 'root_cause_analysis', 'impact_assessment'],
                        criteria: ['取证分析', '根因分析', '影响评估']
                    },
                    {
                        phase: 'recovery',
                        name: '恢复重建',
                        duration: 240,
                        actions: ['system_restoration', 'security_hardening', 'monitoring_enhancement'],
                        criteria: ['系统恢复', '安全加固', '监控增强']
                    },
                    {
                        phase: 'lessons_learned',
                        name: '经验总结',
                        duration: 60,
                        actions: ['incident_review', 'process_improvement', 'training_update'],
                        criteria: ['事件回顾', '流程改进', '培训更新']
                    }
                ]
            });
        }

        return 'generic_workflow';
    }

    // 分配响应团队
    assignResponseTeams(severity) {
        const teams = ['incident_commander', 'security_team', 'it_operations'];

        if (severity === 'critical' || severity === 'high') {
            teams.push('legal_team', 'communications', 'business_continuity');
        }

        return teams;
    }

    // 执行响应阶段
    async executePhase(responseInstance, phase) {
        console.log(`🚀 执行响应阶段: ${phase.name}`);

        // 记录阶段开始
        responseInstance.timeline.push({
            timestamp: new Date().toISOString(),
            event: 'phase_started',
            description: `开始执行${phase.name}阶段`,
            phase: phase.phase,
            estimatedDuration: phase.duration
        });

        // 执行阶段动作
        for (const actionId of phase.actions) {
            const actionResult = await this.executeAction(actionId, responseInstance);

            responseInstance.completedActions.push(actionResult);
        }

        // 记录阶段完成
        responseInstance.timeline.push({
            timestamp: new Date().toISOString(),
            event: 'phase_completed',
            description: `完成${phase.name}阶段`,
            phase: phase.phase,
            completedActions: phase.actions.length
        });

        return {
            phase: phase.phase,
            status: 'completed',
            duration: phase.duration,
            completedActions: phase.actions.length
        };
    }

    // 执行响应动作
    async executeAction(actionId, responseInstance) {
        const action = this.responseActions.get(actionId);

        if (!action) {
            throw new Error(`未找到响应动作: ${actionId}`);
        }

        const startTime = new Date().toISOString();

        // 模拟动作执行
        const result = {
            actionId,
            name: action.name,
            type: action.type,
            startTime,
            endTime: new Date(Date.now() + action.estimatedTime * 60000).toISOString(),
            status: 'completed',
            assignedTeams: action.requiredRoles,
            checklist: action.checklist,
            notes: `${action.name}已成功执行`
        };

        console.log(`  ✅ 完成动作: ${action.name}`);

        return result;
    }

    // 推进到下一阶段
    async advanceToNextPhase(incidentId) {
        const responseInstance = this.activeIncidents.get(incidentId);

        if (!responseInstance) {
            throw new Error(`未找到活跃的响应实例: ${incidentId}`);
        }

        const workflow = this.workflows.get(responseInstance.workflowId);
        const nextPhaseIndex = responseInstance.phaseIndex + 1;

        if (nextPhaseIndex >= workflow.phases.length) {
            // 响应流程完成
            responseInstance.status = 'completed';
            responseInstance.endTime = new Date().toISOString();

            responseInstance.timeline.push({
                timestamp: new Date().toISOString(),
                event: 'response_completed',
                description: '响应流程已完成',
                phase: 'completion'
            });

            return { status: 'completed', message: '响应流程已完成' };
        }

        // 推进到下一阶段
        const nextPhase = workflow.phases[nextPhaseIndex];

        responseInstance.currentPhase = nextPhase.phase;
        responseInstance.phaseIndex = nextPhaseIndex;

        await this.executePhase(responseInstance, nextPhase);

        return {
            status: 'advanced',
            currentPhase: nextPhase.phase,
            message: `已推进到${nextPhase.name}阶段`
        };
    }

    // 获取响应状态
    getResponseStatus(incidentId) {
        const responseInstance = this.activeIncidents.get(incidentId);

        if (!responseInstance) {
            return null;
        }

        const workflow = this.workflows.get(responseInstance.workflowId);
        const currentPhase = workflow.phases[responseInstance.phaseIndex];

        return {
            incidentId,
            status: responseInstance.status,
            currentPhase: responseInstance.currentPhase,
            phaseProgress: `${responseInstance.phaseIndex + 1}/${workflow.phases.length}`,
            completedActions: responseInstance.completedActions.length,
            assignedTeams: responseInstance.assignedTeams,
            timeline: responseInstance.timeline,
            estimatedCompletion: this.calculateEstimatedCompletion(responseInstance, workflow)
        };
    }

    // 计算预计完成时间
    calculateEstimatedCompletion(responseInstance, workflow) {
        const remainingPhases = workflow.phases.slice(responseInstance.phaseIndex + 1);
        const remainingTime = remainingPhases.reduce((total, phase) => total + phase.duration, 0);

        return new Date(Date.now() + remainingTime * 60000).toISOString();
    }
}

// 应急响应协调器
class EmergencyResponseCoordinator {
    constructor() {
        this.classificationManager = new IncidentClassificationManager();
        this.workflowManager = new ResponseWorkflowManager();
        this.activeIncidents = new Map();
        this.responseMetrics = {
            totalIncidents: 0,
            resolvedIncidents: 0,
            averageResponseTime: 0,
            criticalIncidents: 0
        };
    }

    // 报告安全事件
    async reportIncident(incidentData) {
        const incident = {
            id: crypto.randomUUID(),
            reportTime: new Date().toISOString(),
            reporter: incidentData.reporter || 'system',
            title: incidentData.title,
            description: incidentData.description,
            indicators: incidentData.indicators || [],
            affectedSystems: incidentData.affectedSystems || [],
            affectedUsers: incidentData.affectedUsers || 0,
            estimatedLoss: incidentData.estimatedLoss || 0,
            systemImpact: incidentData.systemImpact || 'low',
            status: 'reported'
        };

        // 事件分类
        const classification = this.classificationManager.classifyIncident(incident);

        incident.classification = classification;

        // 更新统计
        this.responseMetrics.totalIncidents++;
        if (classification.severity === 'critical') {
            this.responseMetrics.criticalIncidents++;
        }

        // 启动响应流程
        const responseInstance = await this.workflowManager.initiateResponse(incident, classification);

        incident.responseId = responseInstance.id;
        incident.status = 'responding';

        this.activeIncidents.set(incident.id, incident);

        console.log(`🚨 安全事件已报告: ${incident.title}`);
        console.log(`📋 事件ID: ${incident.id}`);
        console.log(`⚠️ 严重程度: ${classification.severity}`);
        console.log(`🎯 事件类型: ${classification.type}`);

        return {
            incident,
            classification,
            responseInstance,
            nextSteps: this.getNextSteps(classification.severity)
        };
    }

    // 获取下一步行动
    getNextSteps(severity) {
        const steps = {
            critical: [
                '立即通知高级管理层',
                '激活危机管理团队',
                '准备对外沟通',
                '考虑启动业务连续性计划'
            ],
            high: [
                '通知相关管理层',
                '召集核心响应团队',
                '评估业务影响',
                '准备状态更新'
            ],
            medium: [
                '通知团队负责人',
                '分配响应资源',
                '监控事件发展',
                '准备定期报告'
            ],
            low: [
                '分配给相关团队',
                '按标准流程处理',
                '定期检查进展',
                '记录处理过程'
            ]
        };

        return steps[severity] || steps.low;
    }

    // 更新事件状态
    async updateIncidentStatus(incidentId, statusUpdate) {
        const incident = this.activeIncidents.get(incidentId);

        if (!incident) {
            throw new Error(`未找到事件: ${incidentId}`);
        }

        // 更新事件信息
        Object.assign(incident, statusUpdate);
        incident.lastUpdated = new Date().toISOString();

        // 如果事件已解决，更新统计
        if (statusUpdate.status === 'resolved') {
            this.responseMetrics.resolvedIncidents++;

            // 计算响应时间
            const responseTime = new Date(incident.lastUpdated) - new Date(incident.reportTime);

            this.updateAverageResponseTime(responseTime);
        }

        return incident;
    }

    // 更新平均响应时间
    updateAverageResponseTime(newResponseTime) {
        const currentAvg = this.responseMetrics.averageResponseTime;
        const resolvedCount = this.responseMetrics.resolvedIncidents;

        this.responseMetrics.averageResponseTime =
            ((currentAvg * (resolvedCount - 1)) + newResponseTime) / resolvedCount;
    }

    // 生成响应报告
    async generateResponseReport() {
        const report = {
            reportId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            reportPeriod: '24小时',
            metrics: this.responseMetrics,
            activeIncidents: Array.from(this.activeIncidents.values()),
            incidentSummary: this.generateIncidentSummary(),
            responseEffectiveness: this.calculateResponseEffectiveness(),
            recommendations: this.generateRecommendations()
        };

        // 保存报告
        await fs.writeFile(
            'INCIDENT_RESPONSE_REPORT.json',
            JSON.stringify(report, null, 2)
        );

        return report;
    }

    // 生成事件摘要
    generateIncidentSummary() {
        const incidents = Array.from(this.activeIncidents.values());

        const summary = {
            total: incidents.length,
            byStatus: {},
            bySeverity: {},
            byType: {}
        };

        incidents.forEach(incident => {
            // 按状态统计
            summary.byStatus[incident.status] = (summary.byStatus[incident.status] || 0) + 1;

            // 按严重程度统计
            const { severity } = incident.classification;

            summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;

            // 按类型统计
            const { type } = incident.classification;

            summary.byType[type] = (summary.byType[type] || 0) + 1;
        });

        return summary;
    }

    // 计算响应效果
    calculateResponseEffectiveness() {
        const { totalIncidents, resolvedIncidents, averageResponseTime } = this.responseMetrics;

        const resolutionRate = totalIncidents > 0 ? (resolvedIncidents / totalIncidents) * 100 : 0;
        const avgResponseHours = averageResponseTime / (1000 * 60 * 60); // 转换为小时

        let effectiveness = 'excellent';

        if (resolutionRate < 80 || avgResponseHours > 24) effectiveness = 'good';
        if (resolutionRate < 60 || avgResponseHours > 48) effectiveness = 'fair';
        if (resolutionRate < 40 || avgResponseHours > 72) effectiveness = 'poor';

        return {
            resolutionRate: resolutionRate.toFixed(2) + '%',
            averageResponseTime: avgResponseHours.toFixed(2) + '小时',
            effectiveness,
            score: Math.min(100, (resolutionRate + (100 - Math.min(avgResponseHours, 100)))).toFixed(1)
        };
    }

    // 生成建议
    generateRecommendations() {
        const recommendations = [];
        const { totalIncidents, criticalIncidents, averageResponseTime } = this.responseMetrics;

        if (criticalIncidents > totalIncidents * 0.2) {
            recommendations.push('关键事件比例过高，建议加强预防措施');
        }

        if (averageResponseTime > 24 * 60 * 60 * 1000) { // 24小时
            recommendations.push('平均响应时间过长，建议优化响应流程');
        }

        if (totalIncidents > 50) {
            recommendations.push('事件数量较多，建议分析根本原因');
        }

        return recommendations.length > 0 ? recommendations : ['响应效果良好，继续保持'];
    }

    // 获取所有活跃事件
    getActiveIncidents() {
        return Array.from(this.activeIncidents.values());
    }

    // 获取事件详情
    getIncidentDetails(incidentId) {
        const incident = this.activeIncidents.get(incidentId);

        if (!incident) {
            return null;
        }

        const responseStatus = this.workflowManager.getResponseStatus(incidentId);

        return {
            incident,
            responseStatus,
            timeline: responseStatus?.timeline || [],
            nextActions: this.getNextActions(incident)
        };
    }

    // 获取下一步行动
    getNextActions(incident) {
        const { severity } = incident.classification;
        const { status } = incident;

        if (status === 'reported') {
            return ['确认事件', '评估影响', '分配资源'];
        } if (status === 'responding') {
            return ['执行响应计划', '监控进展', '更新状态'];
        } if (status === 'resolved') {
            return ['事后分析', '经验总结', '流程改进'];
        }

        return ['继续监控', '定期更新'];
    }
}

module.exports = {
    IncidentClassificationManager,
    ResponseWorkflowManager,
    EmergencyResponseCoordinator
};
