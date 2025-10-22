/**
 * 安全培训与意识系统演示运行器
 * 展示培训管理、钓鱼模拟和安全意识评估的完整功能
 */

const {
    SecurityTrainingManager,
    PhishingSimulationManager,
    SecurityAwarenessManager
} = require('./security-training-system.cjs');

async function demonstrateSecurityTraining() {
    console.log('🎓 安全培训与意识系统演示');
    console.log('==================================================');
    
    try {
        // 初始化管理器
        const trainingManager = new SecurityTrainingManager();
        const phishingManager = new PhishingSimulationManager();
        const awarenessManager = new SecurityAwarenessManager();

        // 模拟用户数据
        const users = [
            { id: 'dev001', name: '张开发', role: 'developer', department: '技术部' },
            { id: 'dev002', name: '李前端', role: 'frontend', department: '技术部' },
            { id: 'dev003', name: '王后端', role: 'backend', department: '技术部' },
            { id: 'ops001', name: '赵运维', role: 'devops', department: '运维部' },
            { id: 'sec001', name: '钱安全', role: 'security', department: '安全部' },
            { id: 'pm001', name: '孙产品', role: 'product', department: '产品部' },
            { id: 'qa001', name: '周测试', role: 'qa', department: '质量部' },
            { id: 'hr001', name: '吴人事', role: 'hr', department: '人力资源部' }
        ];

        console.log(`👥 模拟用户: ${users.length}人`);
        console.log('');

        // 1. 安全培训演示
        console.log('📚 1. 安全培训管理演示');
        console.log('--------------------------------------------------');
        
        // 为不同用户开始不同的培训课程
        const trainingAssignments = [
            { userId: 'dev001', moduleId: 'secure_coding' },
            { userId: 'dev002', moduleId: 'secure_coding' },
            { userId: 'dev003', moduleId: 'data_protection' },
            { userId: 'ops001', moduleId: 'incident_response' },
            { userId: 'sec001', moduleId: 'incident_response' },
            { userId: 'pm001', moduleId: 'social_engineering' },
            { userId: 'qa001', moduleId: 'secure_coding' },
            { userId: 'hr001', moduleId: 'data_protection' }
        ];

        // 开始培训课程
        for (const assignment of trainingAssignments) {
            await trainingManager.startTraining(assignment.userId, assignment.moduleId);
            
            // 模拟完成主题学习
            const module = trainingManager.trainingModules.get(assignment.moduleId);
            for (let i = 0; i < module.topics.length; i++) {
                await trainingManager.completeTopicLearning(assignment.userId, assignment.moduleId, i);
            }
        }

        console.log('');

        // 2. 培训评估演示
        console.log('📊 2. 培训评估演示');
        console.log('--------------------------------------------------');
        
        // 为部分用户进行评估
        const assessmentUsers = ['dev001', 'dev002', 'ops001', 'sec001'];
        
        for (const userId of assessmentUsers) {
            const assignment = trainingAssignments.find(a => a.userId === userId);
            if (assignment) {
                const assessment = trainingManager.generateAssessment(assignment.moduleId);
                
                // 模拟用户答题
                const answers = {};
                assessment.questions.forEach(question => {
                    // 模拟80%的正确率
                    if (Math.random() < 0.8) {
                        answers[question.id] = question.correctAnswer;
                    } else {
                        // 随机选择错误答案
                        if (question.type === 'multiple_choice') {
                            const options = ['A', 'B', 'C', 'D'];
                            const wrongOptions = options.filter(opt => opt !== question.correctAnswer);
                            answers[question.id] = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
                        } else {
                            answers[question.id] = !question.correctAnswer;
                        }
                    }
                });

                await trainingManager.submitAssessment(userId, assessment.id, answers);
            }
        }

        console.log('');

        // 3. 钓鱼邮件模拟演示
        console.log('🎣 3. 钓鱼邮件模拟演示');
        console.log('--------------------------------------------------');
        
        // 创建钓鱼模拟活动
        const campaign1 = await phishingManager.createPhishingCampaign(
            '2024年第一季度安全意识测试',
            ['urgent_security_update', 'fake_invoice'],
            users.map(u => u.id),
            7
        );

        const campaign2 = await phishingManager.createPhishingCampaign(
            '高级威胁模拟测试',
            ['ceo_fraud', 'it_support_scam'],
            users.slice(0, 4).map(u => u.id),
            5
        );

        console.log('');

        // 4. 钓鱼模拟报告
        console.log('📈 4. 钓鱼模拟报告');
        console.log('--------------------------------------------------');
        
        const phishingReport1 = phishingManager.generatePhishingReport(campaign1.id);
        console.log(`活动: ${phishingReport1.campaignName}`);
        console.log(`邮件发送: ${phishingReport1.statistics.emailsSent}封`);
        console.log(`打开率: ${Math.round((phishingReport1.statistics.emailsOpened / phishingReport1.statistics.emailsSent) * 100)}%`);
        console.log(`点击率: ${Math.round((phishingReport1.statistics.linksClicked / phishingReport1.statistics.emailsSent) * 100)}%`);
        console.log(`报告率: ${Math.round((phishingReport1.statistics.reported / phishingReport1.statistics.emailsSent) * 100)}%`);
        console.log(`风险分布: 低风险${phishingReport1.riskDistribution.low}人, 中风险${phishingReport1.riskDistribution.medium}人, 高风险${phishingReport1.riskDistribution.high}人, 极高风险${phishingReport1.riskDistribution.critical}人`);
        
        if (phishingReport1.recommendations.length > 0) {
            console.log('改进建议:');
            phishingReport1.recommendations.forEach(rec => console.log(`   • ${rec}`));
        }

        console.log('');

        // 5. 用户培训报告
        console.log('👤 5. 个人培训报告示例');
        console.log('--------------------------------------------------');
        
        const userReport = trainingManager.generateUserTrainingReport('dev001');
        console.log(`用户: dev001`);
        console.log(`完成模块: ${userReport.completedModules}/${userReport.totalModules}`);
        console.log(`完成率: ${userReport.completionRate}%`);
        console.log(`平均分数: ${userReport.averageScore}分`);
        console.log(`获得证书: ${userReport.certificates}个`);

        console.log('');

        // 6. 综合安全意识评估
        console.log('🔍 6. 综合安全意识评估');
        console.log('--------------------------------------------------');
        
        const comprehensiveReport = await awarenessManager.performComprehensiveAssessment(
            'company001',
            users.map(u => u.id)
        );

        console.log(`评估ID: ${comprehensiveReport.assessmentId}`);
        console.log(`组织ID: ${comprehensiveReport.organizationId}`);
        console.log(`参与人数: ${comprehensiveReport.participantCount}人`);
        console.log(`综合得分: ${comprehensiveReport.overallScore}/100`);
        console.log(`安全意识等级: ${comprehensiveReport.awarenessLevel}`);
        console.log('');

        console.log('培训分析:');
        console.log(`   完成培训用户: ${comprehensiveReport.trainingAnalysis.completedUsers}人`);
        console.log(`   平均完成率: ${comprehensiveReport.trainingAnalysis.averageCompletionRate}%`);
        console.log(`   平均分数: ${comprehensiveReport.trainingAnalysis.averageScore}分`);
        console.log('');

        console.log('钓鱼模拟分析:');
        console.log(`   总活动数: ${comprehensiveReport.phishingAnalysis.totalCampaigns}个`);
        console.log(`   整体点击率: ${comprehensiveReport.phishingAnalysis.overallClickRate}%`);
        console.log(`   整体报告率: ${comprehensiveReport.phishingAnalysis.overallReportRate}%`);
        console.log('');

        console.log('知识评估:');
        console.log(`   平均知识得分: ${comprehensiveReport.knowledgeAssessment.averageKnowledgeScore}分`);
        console.log(`   知识薄弱点: ${comprehensiveReport.knowledgeAssessment.knowledgeGaps.join('、') || '无'}`);
        console.log(`   优势领域: ${comprehensiveReport.knowledgeAssessment.strongAreas.join('、') || '无'}`);
        console.log('');

        if (comprehensiveReport.recommendations.length > 0) {
            console.log('改进建议:');
            comprehensiveReport.recommendations.forEach(rec => console.log(`   • ${rec}`));
        }

        console.log(`下次评估日期: ${comprehensiveReport.nextAssessmentDate}`);
        console.log('');

        // 7. 企业级集成示例
        console.log('🏢 7. 企业级系统集成示例');
        console.log('--------------------------------------------------');
        
        console.log('学习管理系统(LMS)集成:');
        console.log('   • 与Moodle/Canvas等LMS平台集成');
        console.log('   • 自动同步培训进度和成绩');
        console.log('   • 支持SCORM标准课程包');
        console.log('   • 移动端学习支持');
        console.log('');

        console.log('人力资源系统(HRMS)集成:');
        console.log('   • 员工入职自动分配培训');
        console.log('   • 培训记录纳入绩效考核');
        console.log('   • 证书管理与职业发展');
        console.log('   • 培训成本统计分析');
        console.log('');

        console.log('安全信息与事件管理(SIEM)集成:');
        console.log('   • 实时安全事件关联培训');
        console.log('   • 基于威胁情报的培训内容');
        console.log('   • 安全事件后的针对性培训');
        console.log('   • 培训效果与安全指标关联');
        console.log('');

        // 8. CI/CD集成示例
        console.log('⚙️ 8. CI/CD流水线集成示例');
        console.log('--------------------------------------------------');
        
        console.log('Jenkins Pipeline集成:');
        console.log(`pipeline {
    agent any
    stages {
        stage('Security Training Check') {
            steps {
                script {
                    def trainingStatus = sh(
                        script: 'node security-training-system.cjs check-training \${DEVELOPER_ID}',
                        returnStdout: true
                    ).trim()
                    
                    if (trainingStatus != 'completed') {
                        error('开发者需要完成安全培训才能部署代码')
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
}`);
        console.log('');

        console.log('GitHub Actions集成:');
        console.log(`name: Security Training Validation
on: [push, pull_request]
jobs:
  security-training-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Check Security Training
        run: |
          node security-training-system.cjs validate-training \${{ github.actor }}
          if [ \$? -ne 0 ]; then
            echo "请完成必要的安全培训后再提交代码"
            exit 1
          fi`);
        console.log('');

        console.log('GitLab CI集成:');
        console.log(`security_training_check:
  stage: validate
  script:
    - node security-training-system.cjs check-user-training \$GITLAB_USER_LOGIN
  rules:
    - if: '\$CI_PIPELINE_SOURCE == "merge_request_event"'
  allow_failure: false`);
        console.log('');

        // 9. 移动端和现代化功能
        console.log('📱 9. 移动端和现代化功能');
        console.log('--------------------------------------------------');
        
        console.log('移动学习支持:');
        console.log('   • 响应式Web设计');
        console.log('   • 离线学习功能');
        console.log('   • 推送通知提醒');
        console.log('   • 碎片化学习模式');
        console.log('');

        console.log('游戏化学习:');
        console.log('   • 积分和徽章系统');
        console.log('   • 学习排行榜');
        console.log('   • 挑战任务模式');
        console.log('   • 团队竞赛功能');
        console.log('');

        console.log('AI智能化功能:');
        console.log('   • 个性化学习路径推荐');
        console.log('   • 智能内容生成');
        console.log('   • 学习行为分析');
        console.log('   • 自适应难度调整');
        console.log('');

        // 10. 合规性和报告
        console.log('📋 10. 合规性和报告功能');
        console.log('--------------------------------------------------');
        
        console.log('合规性支持:');
        console.log('   • ISO 27001培训要求');
        console.log('   • SOC 2安全意识要求');
        console.log('   • GDPR数据保护培训');
        console.log('   • 行业特定合规培训');
        console.log('');

        console.log('高级报告功能:');
        console.log('   • 实时仪表板');
        console.log('   • 自定义报告模板');
        console.log('   • 数据导出功能');
        console.log('   • 趋势分析图表');
        console.log('   • 自动化报告分发');
        console.log('');

        console.log('✅ 安全培训与意识系统演示完成!');
        console.log('');
        console.log('🎯 系统核心价值:');
        console.log('   • 提升组织整体安全意识水平');
        console.log('   • 降低人为安全风险');
        console.log('   • 建立持续的安全文化');
        console.log('   • 满足合规性要求');
        console.log('   • 量化安全培训效果');
        console.log('   • 支持个性化学习路径');
        console.log('   • 实现安全培训自动化');
        console.log('   • 提供数据驱动的改进建议');

    } catch (error) {
        console.error('❌ 演示执行失败:', error.message);
        throw error;
    }
}

// 执行演示
if (require.main === module) {
    demonstrateSecurityTraining()
        .then(() => {
            console.log('\n🎉 演示执行成功完成!');
        })
        .catch(error => {
            console.error('\n💥 演示执行失败:', error);
            process.exit(1);
        });
}

module.exports = { demonstrateSecurityTraining };