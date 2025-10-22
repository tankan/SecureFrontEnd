/**
 * 高级监控系统演示运行器
 * 演示APM、安全事件监控和异常检测功能
 */

const fs = require('fs');
const { performance } = require('perf_hooks');
const { EventEmitter } = require('events');
const os = require('os');
const crypto = require('crypto');

/**
 * 高级监控系统演示
 */
class AdvancedMonitoringDemo {
  constructor() {
    this.apmMonitor = new APMMonitor({
      slowThreshold: 500,
      errorThreshold: 3,
      memoryThreshold: 80,
      cpuThreshold: 75
    });
    
    this.securityMonitor = new SecurityEventMonitor({
      alertThresholds: {
        failedLogins: 3,
        suspiciousIPs: 2,
        rateLimitViolations: 5
      },
      timeWindow: 300000 // 5分钟
    });
    
    this.anomalyDetector = new AnomalyDetector({
      sensitivityLevel: 'medium',
      detectionThreshold: 2.0
    });
    
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // APM事件监听
    this.apmMonitor.on('alert', (alert) => {
      console.log(`🚨 APM告警: ${alert.message}`);
    });
    
    this.apmMonitor.on('traceFinished', (trace) => {
      if (trace.status === 'error') {
        console.log(`❌ 追踪失败: ${trace.operationName} (${trace.duration.toFixed(2)}ms)`);
      }
    });
    
    // 安全监控事件监听
    this.securityMonitor.on('securityAlert', (alert) => {
      console.log(`🛡️ 安全告警: ${alert.message}`);
    });
    
    this.securityMonitor.on('securityEvent', (event) => {
      if (event.severity === 'critical' || event.severity === 'high') {
        console.log(`⚠️ 高风险安全事件: ${event.type} (风险评分: ${event.riskScore})`);
      }
    });
    
    // 异常检测事件监听
    this.anomalyDetector.on('anomalyDetected', (anomaly) => {
      console.log(`📊 检测到异常: ${anomaly.metricName} = ${anomaly.value} (Z分数: ${anomaly.zScore})`);
    });
    
    this.anomalyDetector.on('learningCompleted', () => {
      console.log('🎓 异常检测学习期完成，开始实时监控');
    });
  }

  /**
   * 启动监控系统
   */
  async start() {
    console.log('🚀 启动高级监控系统演示...\n');
    
    // 启动各个监控组件
    this.apmMonitor.start();
    this.securityMonitor.start();
    
    console.log('✅ 所有监控组件已启动\n');
    
    // 运行演示场景
    await this.runDemoScenarios();
    
    // 生成综合报告
    await this.generateComprehensiveReport();
    
    // 停止监控系统
    this.stop();
  }

  /**
   * 运行演示场景
   */
  async runDemoScenarios() {
    console.log('📋 开始运行监控演示场景...\n');
    
    // 场景1: APM性能监控演示
    await this.demonstrateAPM();
    
    // 场景2: 安全事件监控演示
    await this.demonstrateSecurity();
    
    // 场景3: 异常检测演示
    await this.demonstrateAnomalyDetection();
    
    console.log('✅ 所有演示场景完成\n');
  }

  /**
   * 演示APM功能
   */
  async demonstrateAPM() {
    console.log('🔍 演示APM性能监控功能...');
    
    // 模拟各种操作
    const operations = [
      { name: 'user_login', duration: 150 },
      { name: 'database_query', duration: 300 },
      { name: 'api_request', duration: 80 },
      { name: 'file_upload', duration: 1200 }, // 慢操作
      { name: 'cache_lookup', duration: 25 },
      { name: 'email_send', duration: 500 }
    ];
    
    for (let i = 0; i < 20; i++) {
      const operation = operations[Math.floor(Math.random() * operations.length)];
      const traceId = `trace_${Date.now()}_${i}`;
      
      // 开始追踪
      const trace = this.apmMonitor.startTrace(traceId, operation.name, {
        userId: `user_${Math.floor(Math.random() * 100)}`,
        sessionId: `session_${Math.floor(Math.random() * 50)}`
      });
      
      // 创建Span
      const spanId = this.apmMonitor.createSpan(traceId, `${operation.name}_span`);
      
      // 模拟操作执行时间
      await this.sleep(operation.duration + Math.random() * 100);
      
      // 完成Span
      this.apmMonitor.finishSpan(spanId, {
        component: 'demo',
        operation: operation.name
      });
      
      // 模拟错误（10%概率）
      const hasError = Math.random() < 0.1;
      if (hasError) {
        this.apmMonitor.finishTrace(traceId, 'error', new Error(`${operation.name} failed`));
      } else {
        this.apmMonitor.finishTrace(traceId, 'success');
      }
      
      // 记录异常检测指标
      this.anomalyDetector.recordMetric('response_time', operation.duration);
      this.anomalyDetector.recordMetric('request_count', 1);
    }
    
    console.log('   ✅ APM演示完成\n');
  }

  /**
   * 演示安全监控功能
   */
  async demonstrateSecurity() {
    console.log('🛡️ 演示安全事件监控功能...');
    
    const ips = ['192.168.1.100', '10.0.0.50', '203.0.113.1', '198.51.100.1'];
    const userIds = ['user1', 'user2', 'user3', 'admin'];
    
    // 模拟正常登录
    for (let i = 0; i < 10; i++) {
      this.securityMonitor.recordSecurityEvent('successful_login', {
        ip: ips[Math.floor(Math.random() * ips.length)],
        userId: userIds[Math.floor(Math.random() * userIds.length)],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
      
      await this.sleep(100);
    }
    
    // 模拟失败登录（触发暴力破解检测）
    const attackerIP = '203.0.113.1';
    for (let i = 0; i < 5; i++) {
      this.securityMonitor.recordSecurityEvent('failed_login', {
        ip: attackerIP,
        userId: 'admin',
        userAgent: 'curl/7.68.0'
      });
      
      await this.sleep(50);
    }
    
    // 模拟SQL注入尝试
    this.securityMonitor.recordSecurityEvent('sql_injection', {
      ip: attackerIP,
      payload: "' OR '1'='1",
      endpoint: '/api/users',
      userAgent: 'sqlmap/1.4.7'
    });
    
    // 模拟XSS尝试
    this.securityMonitor.recordSecurityEvent('xss_attempt', {
      ip: '198.51.100.1',
      payload: '<script>alert("xss")</script>',
      endpoint: '/search',
      userAgent: 'Mozilla/5.0 (compatible; MSIE 9.0)'
    });
    
    // 模拟速率限制违规
    for (let i = 0; i < 8; i++) {
      this.securityMonitor.recordSecurityEvent('rate_limit_exceeded', {
        ip: '10.0.0.50',
        endpoint: '/api/data',
        limit: 100,
        current: 150 + i * 10
      });
      
      await this.sleep(30);
    }
    
    console.log('   ✅ 安全监控演示完成\n');
  }

  /**
   * 演示异常检测功能
   */
  async demonstrateAnomalyDetection() {
    console.log('📊 演示异常检测功能...');
    
    // 建立正常基线（模拟学习期）
    console.log('   📚 建立性能基线...');
    
    // 模拟正常的响应时间数据
    for (let i = 0; i < 50; i++) {
      const normalResponseTime = 200 + Math.random() * 100; // 200-300ms
      this.anomalyDetector.recordMetric('api_response_time', normalResponseTime);
      
      const normalMemoryUsage = 60 + Math.random() * 20; // 60-80%
      this.anomalyDetector.recordMetric('memory_usage', normalMemoryUsage);
      
      const normalCpuUsage = 30 + Math.random() * 20; // 30-50%
      this.anomalyDetector.recordMetric('cpu_usage', normalCpuUsage);
      
      await this.sleep(10);
    }
    
    // 强制完成学习期
    this.anomalyDetector.isLearning = false;
    console.log('   🎓 基线建立完成，开始异常检测...');
    
    // 注入异常数据
    console.log('   ⚠️ 注入异常数据...');
    
    // 异常响应时间
    this.anomalyDetector.recordMetric('api_response_time', 1500); // 异常高
    this.anomalyDetector.recordMetric('api_response_time', 50);   // 异常低
    
    // 异常内存使用
    this.anomalyDetector.recordMetric('memory_usage', 95); // 异常高
    
    // 异常CPU使用
    this.anomalyDetector.recordMetric('cpu_usage', 85); // 异常高
    
    await this.sleep(100);
    
    console.log('   ✅ 异常检测演示完成\n');
  }

  /**
   * 生成综合报告
   */
  async generateComprehensiveReport() {
    console.log('📊 生成综合监控报告...\n');
    
    // 获取各组件报告
    const apmReport = this.apmMonitor.generateAPMReport();
    const securityReport = this.securityMonitor.generateSecurityReport();
    const anomalyReport = this.anomalyDetector.getAnomalyReport();
    
    const comprehensiveReport = {
      timestamp: Date.now(),
      reportType: 'comprehensive_monitoring',
      summary: {
        monitoringDuration: Date.now() - this.apmMonitor.startTime,
        totalTraces: apmReport.traces.total,
        totalSecurityEvents: securityReport.summary.totalEvents,
        totalAnomalies: anomalyReport.summary.totalAnomalies,
        overallHealthStatus: this.calculateOverallHealth(apmReport, securityReport, anomalyReport)
      },
      apm: {
        performance: apmReport.summary,
        operations: apmReport.operations,
        alerts: apmReport.alerts,
        systemMetrics: apmReport.system
      },
      security: {
        events: securityReport.summary,
        patterns: securityReport.patterns,
        alerts: securityReport.alerts,
        recommendations: securityReport.recommendations
      },
      anomalies: {
        detection: anomalyReport.summary,
        baselines: anomalyReport.baselines,
        recentAnomalies: anomalyReport.anomaliesByMetric
      },
      insights: this.generateInsights(apmReport, securityReport, anomalyReport),
      recommendations: this.generateRecommendations(apmReport, securityReport, anomalyReport)
    };
    
    // 保存报告
    const reportPath = 'ADVANCED_MONITORING_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(comprehensiveReport, null, 2));
    
    // 显示报告摘要
    this.displayReportSummary(comprehensiveReport);
    
    console.log(`📄 详细报告已保存至: ${reportPath}\n`);
  }

  /**
   * 计算整体健康状态
   */
  calculateOverallHealth(apmReport, securityReport, anomalyReport) {
    let healthScore = 100;
    
    // APM健康评分
    if (apmReport.alerts.active > 5) healthScore -= 20;
    else if (apmReport.alerts.active > 2) healthScore -= 10;
    
    // 安全健康评分
    const criticalSecurityAlerts = securityReport.alerts.bySeverity.critical || 0;
    const highSecurityAlerts = securityReport.alerts.bySeverity.high || 0;
    
    healthScore -= criticalSecurityAlerts * 15;
    healthScore -= highSecurityAlerts * 10;
    
    // 异常检测健康评分
    const criticalAnomalies = anomalyReport.anomaliesBySeverity.critical || 0;
    healthScore -= criticalAnomalies * 10;
    
    healthScore = Math.max(0, healthScore);
    
    if (healthScore >= 90) return 'excellent';
    if (healthScore >= 75) return 'good';
    if (healthScore >= 60) return 'fair';
    if (healthScore >= 40) return 'poor';
    return 'critical';
  }

  /**
   * 生成洞察分析
   */
  generateInsights(apmReport, securityReport, anomalyReport) {
    const insights = [];
    
    // 性能洞察
    if (apmReport.traces.avgDuration > 1000) {
      insights.push({
        type: 'performance',
        severity: 'medium',
        message: '平均响应时间较高，建议优化慢查询和数据库连接'
      });
    }
    
    // 安全洞察
    if (securityReport.summary.riskLevel === 'high' || securityReport.summary.riskLevel === 'critical') {
      insights.push({
        type: 'security',
        severity: 'high',
        message: '检测到高风险安全活动，建议立即审查安全策略'
      });
    }
    
    // 异常洞察
    if (anomalyReport.summary.criticalAnomalies > 0) {
      insights.push({
        type: 'anomaly',
        severity: 'high',
        message: '检测到关键异常，可能存在系统性能问题或攻击'
      });
    }
    
    return insights;
  }

  /**
   * 生成建议
   */
  generateRecommendations(apmReport, securityReport, anomalyReport) {
    const recommendations = [];
    
    // APM建议
    if (apmReport.alerts.active > 0) {
      recommendations.push('实施更细粒度的性能监控和告警策略');
      recommendations.push('考虑使用分布式追踪来识别性能瓶颈');
    }
    
    // 安全建议
    recommendations.push(...securityReport.recommendations);
    
    // 异常检测建议
    if (!anomalyReport.isLearning && anomalyReport.summary.monitoredMetrics < 10) {
      recommendations.push('增加更多关键业务指标的异常检测');
    }
    
    return recommendations;
  }

  /**
   * 显示报告摘要
   */
  displayReportSummary(report) {
    console.log('📋 高级监控系统综合报告');
    console.log('=' .repeat(50));
    console.log(`📊 整体健康状态: ${report.summary.overallHealthStatus.toUpperCase()}`);
    console.log(`⏱️  监控时长: ${Math.round(report.summary.monitoringDuration / 1000)}秒`);
    console.log();
    
    console.log('🔍 APM性能监控:');
    console.log(`   📈 总追踪数: ${report.summary.totalTraces}`);
    console.log(`   ⚠️  活跃告警: ${report.apm.alerts.active}`);
    console.log(`   📊 监控操作: ${Object.keys(report.apm.operations).length}个`);
    console.log();
    
    console.log('🛡️ 安全事件监控:');
    console.log(`   🚨 安全事件: ${report.summary.totalSecurityEvents}`);
    console.log(`   ⚠️  活跃告警: ${report.security.alerts.active.length}`);
    console.log(`   🎯 风险等级: ${report.security.events.riskLevel.toUpperCase()}`);
    console.log();
    
    console.log('📊 异常检测:');
    console.log(`   🔍 检测异常: ${report.summary.totalAnomalies}`);
    console.log(`   📈 监控指标: ${report.anomalies.detection.monitoredMetrics}个`);
    console.log(`   🎓 学习状态: ${report.anomalies.detection.isLearning ? '学习中' : '已完成'}`);
    console.log();
    
    if (report.insights.length > 0) {
      console.log('💡 关键洞察:');
      report.insights.forEach((insight, index) => {
        console.log(`   ${index + 1}. [${insight.severity.toUpperCase()}] ${insight.message}`);
      });
      console.log();
    }
    
    if (report.recommendations.length > 0) {
      console.log('🎯 改进建议:');
      report.recommendations.slice(0, 5).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
      console.log();
    }
  }

  /**
   * 停止监控系统
   */
  stop() {
    console.log('🛑 停止高级监控系统...');
    
    this.apmMonitor.stop();
    this.securityMonitor.stop();
    
    console.log('✅ 高级监控系统已停止');
  }

  /**
   * 辅助方法：延时
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 运行演示
async function runDemo() {
  const demo = new AdvancedMonitoringDemo();
  
  try {
    await demo.start();
  } catch (error) {
    console.error('❌ 演示运行失败:', error);
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  runDemo();
}

export { AdvancedMonitoringDemo };