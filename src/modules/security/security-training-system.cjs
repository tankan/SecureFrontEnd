/**
 * 安全培训与意识系统
 * 提供开发团队安全培训、钓鱼邮件模拟和安全意识评估
 */

const fs = require('fs');
const crypto = require('crypto');

// 安全培训管理器
class SecurityTrainingManager {
    constructor() {
        this.trainingModules = new Map();
        this.userProgress = new Map();
        this.assessments = new Map();
        this.certificates = new Map();
        this.initializeTrainingModules();
    }

    initializeTrainingModules() {
        // 安全编码培训模块
        this.trainingModules.set('secure_coding', {
            id: 'secure_coding',
            title: '安全编码最佳实践',
            description: '学习如何编写安全的代码，防范常见漏洞',
            duration: 120, // 分钟
            difficulty: 'intermediate',
            topics: [
                'OWASP Top 10漏洞防护',
                '输入验证与数据清理',
                'SQL注入防护',
                'XSS攻击防护',
                'CSRF防护机制',
                '安全的身份认证',
                '加密最佳实践',
                '安全配置管理'
            ],
            prerequisites: ['basic_security'],
            learningObjectives: [
                '理解常见安全漏洞的成因',
                '掌握安全编码技术',
                '能够进行代码安全审查',
                '实施有效的防护措施'
            ]
        });

        this.trainingModules.set('data_protection', {
            id: 'data_protection',
            title: '数据保护与隐私合规',
            description: '了解数据保护法规和隐私保护要求',
            duration: 90,
            difficulty: 'beginner',
            topics: [
                'GDPR合规要求',
                '个人数据处理原则',
                '数据主体权利',
                '数据泄露响应',
                '隐私设计原则',
                '同意管理',
                '数据传输安全',
                '数据保留政策'
            ],
            prerequisites: [],
            learningObjectives: [
                '理解数据保护法规',
                '掌握隐私保护技术',
                '能够设计合规系统',
                '处理数据泄露事件'
            ]
        });

        this.trainingModules.set('incident_response', {
            id: 'incident_response',
            title: '安全事件响应',
            description: '学习如何有效响应和处理安全事件',
            duration: 75,
            difficulty: 'intermediate',
            topics: [
                '事件识别与分类',
                '响应流程与程序',
                '证据收集与保全',
                '沟通与协调',
                '恢复与重建',
                '经验总结与改进',
                '法律与合规要求',
                '团队协作机制'
            ],
            prerequisites: ['basic_security'],
            learningObjectives: [
                '快速识别安全事件',
                '执行标准响应流程',
                '有效协调各方资源',
                '从事件中学习改进'
            ]
        });

        this.trainingModules.set('social_engineering', {
            id: 'social_engineering',
            title: '社会工程学防护',
            description: '识别和防范社会工程学攻击',
            duration: 60,
            difficulty: 'beginner',
            topics: [
                '社会工程学攻击类型',
                '钓鱼邮件识别',
                '电话诈骗防护',
                '物理安全意识',
                '信息泄露风险',
                '安全意识培养',
                '报告可疑活动',
                '安全文化建设'
            ],
            prerequisites: [],
            learningObjectives: [
                '识别社会工程学攻击',
                '提高安全警觉性',
                '建立安全行为习惯',
                '营造安全文化氛围'
            ]
        });
    }

    // 开始培训课程
    async startTraining(userId, moduleId) {
        if (!this.trainingModules.has(moduleId)) {
            throw new Error(`培训模块不存在: ${moduleId}`);
        }

        const module = this.trainingModules.get(moduleId);
        const progress = {
            userId,
            moduleId,
            startTime: new Date(),
            currentTopic: 0,
            completedTopics: [],
            totalTopics: module.topics.length,
            status: 'in_progress',
            score: 0
        };

        this.userProgress.set(`${userId}_${moduleId}`, progress);

        console.log(`🎓 用户 ${userId} 开始学习: ${module.title}`);
        console.log(`📚 课程时长: ${module.duration}分钟`);
        console.log(`📋 学习主题: ${module.topics.length}个`);

        return progress;
    }

    // 完成主题学习
    async completeTopicLearning(userId, moduleId, topicIndex) {
        const progressKey = `${userId}_${moduleId}`;
        const progress = this.userProgress.get(progressKey);

        if (!progress) {
            throw new Error('未找到学习进度记录');
        }

        const module = this.trainingModules.get(moduleId);
        const topic = module.topics[topicIndex];

        if (!progress.completedTopics.includes(topicIndex)) {
            progress.completedTopics.push(topicIndex);
            progress.currentTopic = Math.max(progress.currentTopic, topicIndex + 1);

            console.log(`✅ 完成主题学习: ${topic}`);
            console.log(`📊 学习进度: ${progress.completedTopics.length}/${progress.totalTopics}`);
        }

        // 检查是否完成所有主题
        if (progress.completedTopics.length === progress.totalTopics) {
            progress.status = 'ready_for_assessment';
            console.log('🎯 所有主题学习完成，可以参加评估测试');
        }

        this.userProgress.set(progressKey, progress);

        return progress;
    }

    // 生成培训评估
    generateAssessment(moduleId) {
        const module = this.trainingModules.get(moduleId);

        if (!module) {
            throw new Error(`培训模块不存在: ${moduleId}`);
        }

        const questions = [];

        // 根据不同模块生成相应的评估题目
        switch (moduleId) {
            case 'secure_coding':
                questions.push(
                    {
                        id: 1,
                        type: 'multiple_choice',
                        question: '以下哪种做法可以有效防止SQL注入攻击？',
                        options: [
                            'A. 使用字符串拼接构建SQL语句',
                            'B. 使用参数化查询或预编译语句',
                            'C. 对用户输入进行简单的字符替换',
                            'D. 仅在客户端进行输入验证'
                        ],
                        correctAnswer: 'B',
                        explanation: '参数化查询可以将SQL代码与数据分离，有效防止SQL注入攻击'
                    },
                    {
                        id: 2,
                        type: 'multiple_choice',
                        question: 'XSS攻击的主要防护措施是什么？',
                        options: [
                            'A. 输入验证和输出编码',
                            'B. 使用HTTPS协议',
                            'C. 设置强密码策略',
                            'D. 定期更新系统补丁'
                        ],
                        correctAnswer: 'A',
                        explanation: '输入验证和输出编码是防护XSS攻击的核心措施'
                    }
                );
                break;

            case 'data_protection':
                questions.push(
                    {
                        id: 1,
                        type: 'multiple_choice',
                        question: 'GDPR规定数据泄露必须在多长时间内通知监管机构？',
                        options: [
                            'A. 24小时',
                            'B. 48小时',
                            'C. 72小时',
                            'D. 7天'
                        ],
                        correctAnswer: 'C',
                        explanation: 'GDPR要求在发现数据泄露后72小时内通知相关监管机构'
                    },
                    {
                        id: 2,
                        type: 'true_false',
                        question: '个人数据的处理必须基于合法的法律依据',
                        correctAnswer: true,
                        explanation: 'GDPR要求所有个人数据处理都必须有合法的法律依据'
                    }
                );
                break;

            case 'social_engineering':
                questions.push(
                    {
                        id: 1,
                        type: 'multiple_choice',
                        question: '收到可疑邮件时，正确的做法是？',
                        options: [
                            'A. 立即点击链接查看详情',
                            'B. 转发给同事确认',
                            'C. 不点击链接，报告给安全团队',
                            'D. 回复邮件询问详情'
                        ],
                        correctAnswer: 'C',
                        explanation: '遇到可疑邮件应避免任何交互，及时报告给安全团队处理'
                    }
                );
                break;
        }

        const assessment = {
            id: crypto.randomUUID(),
            moduleId,
            questions,
            timeLimit: 30, // 分钟
            passingScore: 80,
            createdAt: new Date()
        };

        this.assessments.set(assessment.id, assessment);

        return assessment;
    }

    // 提交评估答案
    async submitAssessment(userId, assessmentId, answers) {
        const assessment = this.assessments.get(assessmentId);

        if (!assessment) {
            throw new Error('评估不存在');
        }

        let correctAnswers = 0;
        const results = [];

        assessment.questions.forEach((question, index) => {
            const userAnswer = answers[question.id];
            const isCorrect = userAnswer === question.correctAnswer;

            if (isCorrect) {
                correctAnswers++;
            }

            results.push({
                questionId: question.id,
                question: question.question,
                userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect,
                explanation: question.explanation
            });
        });

        const score = Math.round((correctAnswers / assessment.questions.length) * 100);
        const passed = score >= assessment.passingScore;

        const result = {
            userId,
            assessmentId,
            moduleId: assessment.moduleId,
            score,
            passed,
            correctAnswers,
            totalQuestions: assessment.questions.length,
            results,
            completedAt: new Date()
        };

        // 更新用户进度
        const progressKey = `${userId}_${assessment.moduleId}`;
        const progress = this.userProgress.get(progressKey);

        if (progress) {
            progress.status = passed ? 'completed' : 'failed';
            progress.score = score;
            progress.completedAt = new Date();
        }

        // 如果通过评估，生成证书
        if (passed) {
            await this.generateCertificate(userId, assessment.moduleId, score);
        }

        console.log(`📊 评估结果: ${score}/100 ${passed ? '✅ 通过' : '❌ 未通过'}`);

        return result;
    }

    // 生成培训证书
    async generateCertificate(userId, moduleId, score) {
        const module = this.trainingModules.get(moduleId);
        const certificateId = crypto.randomUUID();

        const certificate = {
            id: certificateId,
            userId,
            moduleId,
            moduleTitle: module.title,
            score,
            issuedAt: new Date(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年有效期
            status: 'active'
        };

        this.certificates.set(certificateId, certificate);

        console.log(`🏆 颁发培训证书: ${module.title}`);
        console.log(`📜 证书编号: ${certificateId}`);
        console.log(`⏰ 有效期至: ${certificate.expiresAt.toLocaleDateString()}`);

        return certificate;
    }

    // 获取用户培训报告
    generateUserTrainingReport(userId) {
        const userProgressList = Array.from(this.userProgress.values())
            .filter(progress => progress.userId === userId);

        const userCertificates = Array.from(this.certificates.values())
            .filter(cert => cert.userId === userId && cert.status === 'active');

        const completedModules = userProgressList.filter(p => p.status === 'completed').length;
        const totalModules = this.trainingModules.size;
        const averageScore = userProgressList
            .filter(p => p.score > 0)
            .reduce((sum, p) => sum + p.score, 0) /
            Math.max(userProgressList.filter(p => p.score > 0).length, 1);

        return {
            userId,
            completedModules,
            totalModules,
            completionRate: Math.round((completedModules / totalModules) * 100),
            averageScore: Math.round(averageScore),
            certificates: userCertificates.length,
            progress: userProgressList,
            activeCertificates: userCertificates,
            generatedAt: new Date()
        };
    }
}

// 钓鱼邮件模拟管理器
class PhishingSimulationManager {
    constructor() {
        this.campaigns = new Map();
        this.templates = new Map();
        this.userResponses = new Map();
        this.initializePhishingTemplates();
    }

    initializePhishingTemplates() {
        // 常见钓鱼邮件模板
        this.templates.set('urgent_security_update', {
            id: 'urgent_security_update',
            name: '紧急安全更新',
            category: 'security_alert',
            difficulty: 'easy',
            subject: '紧急：您的账户需要立即验证',
            sender: 'security@company-security.com',
            content: `
亲爱的用户，

我们检测到您的账户存在异常登录活动。为了保护您的账户安全，请立即点击以下链接验证您的身份：

[立即验证账户] (http://fake-verification-site.com)

如果您不在24小时内完成验证，您的账户将被暂时锁定。

此致
安全团队
            `,
            indicators: [
                '紧急性语言',
                '可疑的发件人域名',
                '要求点击外部链接',
                '威胁账户锁定',
                '缺乏个性化信息'
            ],
            educationalContent: '这是典型的钓鱼邮件，利用紧急性和恐惧心理诱导用户点击恶意链接。'
        });

        this.templates.set('fake_invoice', {
            id: 'fake_invoice',
            name: '虚假发票',
            category: 'financial',
            difficulty: 'medium',
            subject: '发票 #INV-2024-001 - 付款逾期',
            sender: 'billing@company-finance.org',
            content: `
您好，

您的发票 #INV-2024-001 已逾期未付，金额为 $2,450.00。

请查看附件中的详细发票信息，并尽快安排付款。

如有疑问，请联系我们的财务部门。

[下载发票] (http://fake-invoice-site.com/download)

财务部
            `,
            indicators: [
                '未知的发票编号',
                '可疑的发件人域名',
                '要求下载附件',
                '催促付款',
                '缺乏具体的业务信息'
            ],
            educationalContent: '虚假发票是常见的商业钓鱼手段，旨在诱导下载恶意软件或泄露财务信息。'
        });

        this.templates.set('ceo_fraud', {
            id: 'ceo_fraud',
            name: 'CEO欺诈',
            category: 'business_email_compromise',
            difficulty: 'hard',
            subject: '紧急：需要您的协助',
            sender: 'ceo@company.com',
            content: `
您好，

我现在正在参加一个重要的商务会议，需要您紧急处理一笔付款。

请立即向以下账户转账 $50,000：
账户：1234567890
银行：ABC Bank

这是一个机密项目，请不要与其他人讨论。

谢谢您的配合。

CEO
            `,
            indicators: [
                '冒充高级管理层',
                '要求紧急转账',
                '强调保密性',
                '缺乏正常的审批流程',
                '语言风格不符合CEO习惯'
            ],
            educationalContent: 'CEO欺诈是高级的社会工程学攻击，利用权威性和紧急性绕过正常的财务控制。'
        });

        this.templates.set('it_support_scam', {
            id: 'it_support_scam',
            name: 'IT支持诈骗',
            category: 'technical_support',
            difficulty: 'medium',
            subject: '系统维护通知',
            sender: 'it-support@company-it.net',
            content: `
尊敬的用户，

我们将在今晚进行系统维护，需要您提前备份重要数据。

请使用以下临时访问链接登录备份系统：

[访问备份系统] (http://fake-backup-system.com)

用户名：您的邮箱地址
密码：您的当前密码

维护将在凌晨2点开始，请在此之前完成备份。

IT支持团队
            `,
            indicators: [
                '要求提供登录凭据',
                '可疑的域名',
                '缺乏官方IT部门的标识',
                '紧急的时间要求',
                '非正常的备份流程'
            ],
            educationalContent: 'IT支持诈骗通过模仿内部IT部门来获取用户凭据和敏感信息。'
        });
    }

    // 创建钓鱼模拟活动
    async createPhishingCampaign(campaignName, templateIds, targetUsers, duration = 7) {
        const campaignId = crypto.randomUUID();

        const campaign = {
            id: campaignId,
            name: campaignName,
            templateIds,
            targetUsers,
            duration, // 天数
            startDate: new Date(),
            endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
            status: 'active',
            statistics: {
                emailsSent: 0,
                emailsOpened: 0,
                linksClicked: 0,
                credentialsEntered: 0,
                reported: 0
            }
        };

        this.campaigns.set(campaignId, campaign);

        console.log(`🎯 创建钓鱼模拟活动: ${campaignName}`);
        console.log(`📧 目标用户: ${targetUsers.length}人`);
        console.log(`⏰ 活动周期: ${duration}天`);

        // 模拟发送钓鱼邮件
        await this.simulatePhishingEmails(campaignId);

        return campaign;
    }

    // 模拟发送钓鱼邮件
    async simulatePhishingEmails(campaignId) {
        const campaign = this.campaigns.get(campaignId);

        if (!campaign) {
            throw new Error('活动不存在');
        }

        console.log('\n📤 模拟发送钓鱼邮件...');

        for (const userId of campaign.targetUsers) {
            for (const templateId of campaign.templateIds) {
                const template = this.templates.get(templateId);

                if (template) {
                    console.log(`   📧 发送给 ${userId}: ${template.subject}`);
                    campaign.statistics.emailsSent++;

                    // 模拟用户行为
                    await this.simulateUserBehavior(campaignId, userId, templateId);
                }
            }
        }

        this.campaigns.set(campaignId, campaign);
    }

    // 模拟用户行为
    async simulateUserBehavior(campaignId, userId, templateId) {
        const campaign = this.campaigns.get(campaignId);
        const template = this.templates.get(templateId);

        // 随机生成用户行为
        const behaviors = [];

        // 70%的用户会打开邮件
        if (Math.random() < 0.7) {
            behaviors.push('opened');
            campaign.statistics.emailsOpened++;

            // 30%的打开用户会点击链接
            if (Math.random() < 0.3) {
                behaviors.push('clicked');
                campaign.statistics.linksClicked++;

                // 10%的点击用户会输入凭据
                if (Math.random() < 0.1) {
                    behaviors.push('credentials_entered');
                    campaign.statistics.credentialsEntered++;
                }
            }

            // 15%的用户会报告可疑邮件
            if (Math.random() < 0.15) {
                behaviors.push('reported');
                campaign.statistics.reported++;
            }
        }

        // 记录用户响应
        const responseKey = `${campaignId}_${userId}_${templateId}`;

        this.userResponses.set(responseKey, {
            campaignId,
            userId,
            templateId,
            behaviors,
            timestamp: new Date(),
            riskLevel: this.calculateRiskLevel(behaviors, template.difficulty)
        });
    }

    // 计算风险等级
    calculateRiskLevel(behaviors, templateDifficulty) {
        let riskScore = 0;

        if (behaviors.includes('opened')) riskScore += 1;
        if (behaviors.includes('clicked')) riskScore += 3;
        if (behaviors.includes('credentials_entered')) riskScore += 5;
        if (behaviors.includes('reported')) riskScore -= 2;

        // 根据模板难度调整
        const difficultyMultiplier = {
            easy: 0.8,
            medium: 1.0,
            hard: 1.2
        };

        riskScore *= difficultyMultiplier[templateDifficulty] || 1.0;

        if (riskScore <= 0) return 'low';
        if (riskScore <= 2) return 'medium';
        if (riskScore <= 4) return 'high';

        return 'critical';
    }

    // 生成钓鱼模拟报告
    generatePhishingReport(campaignId) {
        const campaign = this.campaigns.get(campaignId);

        if (!campaign) {
            throw new Error('活动不存在');
        }

        const userResponses = Array.from(this.userResponses.values())
            .filter(response => response.campaignId === campaignId);

        // 统计分析
        const riskDistribution = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
        };

        const templatePerformance = new Map();

        userResponses.forEach(response => {
            riskDistribution[response.riskLevel]++;

            if (!templatePerformance.has(response.templateId)) {
                templatePerformance.set(response.templateId, {
                    templateId: response.templateId,
                    sent: 0,
                    opened: 0,
                    clicked: 0,
                    reported: 0
                });
            }

            const perf = templatePerformance.get(response.templateId);

            perf.sent++;
            if (response.behaviors.includes('opened')) perf.opened++;
            if (response.behaviors.includes('clicked')) perf.clicked++;
            if (response.behaviors.includes('reported')) perf.reported++;
        });

        const report = {
            campaignId,
            campaignName: campaign.name,
            duration: campaign.duration,
            statistics: campaign.statistics,
            riskDistribution,
            templatePerformance: Array.from(templatePerformance.values()),
            recommendations: this.generateRecommendations(campaign.statistics, riskDistribution),
            generatedAt: new Date()
        };

        return report;
    }

    // 生成改进建议
    generateRecommendations(statistics, riskDistribution) {
        const recommendations = [];

        const clickRate = (statistics.linksClicked / statistics.emailsOpened) * 100;
        const reportRate = (statistics.reported / statistics.emailsSent) * 100;

        if (clickRate > 20) {
            recommendations.push('点击率较高，需要加强钓鱼邮件识别培训');
        }

        if (reportRate < 10) {
            recommendations.push('报告率较低，需要提高员工安全意识和报告机制');
        }

        if (riskDistribution.critical > 0) {
            recommendations.push('存在高风险用户，需要进行针对性的安全培训');
        }

        if (statistics.credentialsEntered > 0) {
            recommendations.push('有用户输入了凭据，需要立即进行密码安全培训');
        }

        return recommendations;
    }
}

// 安全意识评估管理器
class SecurityAwarenessManager {
    constructor() {
        this.trainingManager = new SecurityTrainingManager();
        this.phishingManager = new PhishingSimulationManager();
        this.organizationMetrics = new Map();
    }

    // 综合安全意识评估
    async performComprehensiveAssessment(organizationId, userIds) {
        console.log('🔍 开始综合安全意识评估...');
        console.log('==================================================');

        const assessmentId = crypto.randomUUID();
        const startTime = new Date();

        try {
            // 1. 培训完成情况分析
            const trainingAnalysis = this.analyzeTrainingCompletion(userIds);

            // 2. 钓鱼模拟结果分析
            const phishingAnalysis = this.analyzePhishingSimulation(userIds);

            // 3. 安全知识水平评估
            const knowledgeAssessment = await this.assessSecurityKnowledge(userIds);

            // 4. 生成综合报告
            const comprehensiveReport = this.generateComprehensiveReport({
                assessmentId,
                organizationId,
                startTime,
                endTime: new Date(),
                trainingAnalysis,
                phishingAnalysis,
                knowledgeAssessment,
                userIds
            });

            // 保存组织指标
            this.organizationMetrics.set(organizationId, comprehensiveReport);

            return comprehensiveReport;
        } catch (error) {
            console.error('❌ 安全意识评估失败:', error.message);
            throw error;
        }
    }

    // 分析培训完成情况
    analyzeTrainingCompletion(userIds) {
        const analysis = {
            totalUsers: userIds.length,
            completedUsers: 0,
            averageCompletionRate: 0,
            averageScore: 0,
            moduleCompletion: new Map()
        };

        let totalCompletionRate = 0;
        let totalScore = 0;
        let scoredUsers = 0;

        userIds.forEach(userId => {
            const userReport = this.trainingManager.generateUserTrainingReport(userId);

            if (userReport.completedModules > 0) {
                analysis.completedUsers++;
            }

            totalCompletionRate += userReport.completionRate;

            if (userReport.averageScore > 0) {
                totalScore += userReport.averageScore;
                scoredUsers++;
            }
        });

        analysis.averageCompletionRate = Math.round(totalCompletionRate / userIds.length);
        analysis.averageScore = scoredUsers > 0 ? Math.round(totalScore / scoredUsers) : 0;

        return analysis;
    }

    // 分析钓鱼模拟结果
    analyzePhishingSimulation(userIds) {
        const analysis = {
            totalCampaigns: this.phishingManager.campaigns.size,
            overallClickRate: 0,
            overallReportRate: 0,
            riskDistribution: {
                low: 0,
                medium: 0,
                high: 0,
                critical: 0
            }
        };

        const allResponses = Array.from(this.phishingManager.userResponses.values())
            .filter(response => userIds.includes(response.userId));

        if (allResponses.length > 0) {
            const clickedCount = allResponses.filter(r => r.behaviors.includes('clicked')).length;
            const reportedCount = allResponses.filter(r => r.behaviors.includes('reported')).length;

            analysis.overallClickRate = Math.round((clickedCount / allResponses.length) * 100);
            analysis.overallReportRate = Math.round((reportedCount / allResponses.length) * 100);

            allResponses.forEach(response => {
                analysis.riskDistribution[response.riskLevel]++;
            });
        }

        return analysis;
    }

    // 评估安全知识水平
    async assessSecurityKnowledge(userIds) {
        const assessment = {
            participantCount: userIds.length,
            averageKnowledgeScore: 0,
            knowledgeGaps: [],
            strongAreas: []
        };

        // 模拟知识评估结果
        const knowledgeAreas = [
            { area: '密码安全', score: 85 },
            { area: '钓鱼识别', score: 72 },
            { area: '数据保护', score: 78 },
            { area: '社会工程学', score: 68 },
            { area: '事件响应', score: 75 }
        ];

        const totalScore = knowledgeAreas.reduce((sum, area) => sum + area.score, 0);

        assessment.averageKnowledgeScore = Math.round(totalScore / knowledgeAreas.length);

        knowledgeAreas.forEach(area => {
            if (area.score < 75) {
                assessment.knowledgeGaps.push(area.area);
            } else if (area.score >= 85) {
                assessment.strongAreas.push(area.area);
            }
        });

        return assessment;
    }

    // 生成综合报告
    generateComprehensiveReport(data) {
        const {
            assessmentId,
            organizationId,
            startTime,
            endTime,
            trainingAnalysis,
            phishingAnalysis,
            knowledgeAssessment,
            userIds
        } = data;

        // 计算综合安全意识得分
        const trainingScore = trainingAnalysis.averageScore * 0.3;
        const phishingScore = (100 - phishingAnalysis.overallClickRate) * 0.4;
        const knowledgeScore = knowledgeAssessment.averageKnowledgeScore * 0.3;

        const overallScore = Math.round(trainingScore + phishingScore + knowledgeScore);

        // 确定安全意识等级
        let awarenessLevel;

        if (overallScore >= 90) awarenessLevel = 'A (优秀)';
        else if (overallScore >= 80) awarenessLevel = 'B (良好)';
        else if (overallScore >= 70) awarenessLevel = 'C (一般)';
        else if (overallScore >= 60) awarenessLevel = 'D (较差)';
        else awarenessLevel = 'F (不合格)';

        return {
            assessmentId,
            organizationId,
            timestamp: startTime.toISOString(),
            duration: Math.round((endTime - startTime) / 1000),
            overallScore,
            awarenessLevel,
            participantCount: userIds.length,
            trainingAnalysis,
            phishingAnalysis,
            knowledgeAssessment,
            recommendations: this.generateImprovementRecommendations(
                trainingAnalysis,
                phishingAnalysis,
                knowledgeAssessment
            ),
            nextAssessmentDate: this.calculateNextAssessmentDate()
        };
    }

    // 生成改进建议
    generateImprovementRecommendations(training, phishing, knowledge) {
        const recommendations = [];

        if (training.averageCompletionRate < 80) {
            recommendations.push('提高培训完成率，建立强制性培训政策');
        }

        if (training.averageScore < 80) {
            recommendations.push('加强培训内容质量，增加实践练习');
        }

        if (phishing.overallClickRate > 15) {
            recommendations.push('增加钓鱼邮件识别培训，提高员工警觉性');
        }

        if (phishing.overallReportRate < 20) {
            recommendations.push('完善安全事件报告机制，鼓励主动报告');
        }

        if (knowledge.knowledgeGaps.length > 0) {
            recommendations.push(`针对薄弱环节加强培训：${knowledge.knowledgeGaps.join('、')}`);
        }

        if (phishing.riskDistribution.critical > 0) {
            recommendations.push('对高风险用户进行一对一安全辅导');
        }

        return recommendations;
    }

    calculateNextAssessmentDate() {
        const nextAssessment = new Date();

        nextAssessment.setMonth(nextAssessment.getMonth() + 3); // 3个月后

        return nextAssessment.toISOString().split('T')[0];
    }
}

module.exports = {
    SecurityTrainingManager,
    PhishingSimulationManager,
    SecurityAwarenessManager
};

// 如果直接运行此文件，执行演示
if (require.main === module) {
    const awarenessManager = new SecurityAwarenessManager();

    // 模拟用户数据
    const userIds = ['user001', 'user002', 'user003', 'user004', 'user005'];

    awarenessManager.performComprehensiveAssessment('org001', userIds)
        .then(() => {
            console.log('\n✅ 安全培训与意识系统演示完成!');
            console.log('\n🎯 系统主要功能:');
            console.log('   • 多模块安全培训课程');
            console.log('   • 智能评估与认证系统');
            console.log('   • 钓鱼邮件模拟训练');
            console.log('   • 用户行为风险分析');
            console.log('   • 综合安全意识评估');
            console.log('   • 个性化改进建议');
            console.log('   • 组织安全文化建设');
            console.log('   • 持续监控与改进');
        })
        .catch(error => {
            console.error('❌ 演示执行失败:', error);
        });
}
