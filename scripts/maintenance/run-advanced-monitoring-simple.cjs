/**
 * 简化版高级监控系统演示
 * 演示APM、安全事件监控和异常检测功能
 */

const fs = require('fs');
const { performance } = require('perf_hooks');
const { EventEmitter } = require('events');
const os = require('os');
const crypto = require('crypto');

/**
 * 简化的APM监控器
 */
class SimpleAPMMonitor {
  constructor() {
    this.metrics = {
      requests: [],
      errors: [],
      performance: new Map()
    };
    this.alerts = [];
    this.startTime = Date.now();
  }

  recordRequest(operation, duration, status = 'success', error = null) {
    const request = {
      id: crypto.randomUUID(),
      operation,
      duration,
      status,
      error,
      timestamp: Date.now()
    };

    this.metrics.requests.push(request);

    // 记录性能指标
    if (!this.metrics.performance.has(operation)) {
      this.metrics.performance.set(operation, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        errors: 0
      });
    }

    const metric = this.metrics.performance.get(operation);
    metric.count++;
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.count;

    if (status === 'error') {
      metric.errors++;
      this.metrics.errors.push(request);
    }

    // 检查慢操作
    if (duration > 1000) {
      this.createAlert('slow_operation', `慢操作检测: ${operation} 耗时 ${duration}ms`);
    }

    // 检查错误率
    const errorRate = (metric.errors / metric.count) * 100;
    if (errorRate > 10 && metric.count > 5) {
      this.createAlert('high_error_rate', `高错误率: ${operation} 错误率 ${errorRate.toFixed(1)}%`);
    }

    return request;
  }

  createAlert(type, message) {
    const alert = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: Date.now(),
      severity: type === 'slow_operation' ? 'medium' : 'high'
    };

    this.alerts.push(alert);
    console.log(`🚨 APM告警: ${message}`);
    return alert;
  }

  getReport() {
    const totalRequests = this.metrics.requests.length;
    const totalErrors = this.metrics.errors.length;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    return {
      summary: {
        totalRequests,
        totalErrors,
        errorRate: errorRate.toFixed(2),
        uptime: Date.now() - this.startTime,
        activeAlerts: this.alerts.length
      },
      operations: Object.fromEntries(
        Array.from(this.metrics.performance.entries()).map(([op, metric]) => [
          op,
          {
            count: metric.count,
            avgDuration: metric.avgDuration.toFixed(2),
            errorCount: metric.errors,
            errorRate: ((metric.errors / metric.count) * 100).toFixed(2)
          }
        ])
      ),
      alerts: this.alerts
    };
  }
}

/**
 * 简化的安全事件监控器
 */
class SimpleSecurityMonitor {
  constructor() {
    this.events = [];
    this.alerts = [];
    this.ipActivity = new Map();
  }

  recordSecurityEvent(type, details = {}) {
    const event = {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      ip: details.ip || 'unknown',
      userId: details.userId,
      details,
      severity: this.getSeverity(type),
      riskScore: this.getRiskScore(type)
    };

    this.events.push(event);

    // 更新IP活动
    if (!this.ipActivity.has(event.ip)) {
      this.ipActivity.set(event.ip, { events: [], riskScore: 0 });
    }
    
    const ipActivity = this.ipActivity.get(event.ip);
    ipActivity.events.push(event);
    ipActivity.riskScore += event.riskScore;

    // 检查威胁
    this.checkThreats(event);

    console.log(`🛡️ 安全事件: ${type} (IP: ${event.ip}, 风险: ${event.riskScore})`);
    return event;
  }

  getSeverity(type) {
    const severityMap = {
      'failed_login': 'low',
      'brute_force_attempt': 'high',
      'sql_injection': 'critical',
      'xss_attempt': 'high',
      'rate_limit_exceeded': 'medium'
    };
    return severityMap[type] || 'medium';
  }

  getRiskScore(type) {
    const scoreMap = {
      'failed_login': 1,
      'brute_force_attempt': 5,
      'sql_injection': 10,
      'xss_attempt': 7,
      'rate_limit_exceeded': 2
    };
    return scoreMap[type] || 3;
  }

  checkThreats(event) {
    const now = event.timestamp;
    const timeWindow = 5 * 60 * 1000; // 5分钟

    // 检查失败登录
    if (event.type === 'failed_login') {
      const recentFailures = this.events.filter(e => 
        e.type === 'failed_login' && 
        e.ip === event.ip && 
        now - e.timestamp < timeWindow
      );

      if (recentFailures.length >= 3) {
        this.createAlert('brute_force_detected', `检测到暴力破解: IP ${event.ip} (${recentFailures.length}次尝试)`);
      }
    }

    // 检查IP风险评分
    const ipActivity = this.ipActivity.get(event.ip);
    if (ipActivity && ipActivity.riskScore > 15) {
      this.createAlert('suspicious_ip', `可疑IP活动: ${event.ip} (风险评分: ${ipActivity.riskScore})`);
    }
  }

  createAlert(type, message) {
    const alert = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: Date.now(),
      severity: type === 'brute_force_detected' ? 'high' : 'medium'
    };

    this.alerts.push(alert);
    console.log(`🚨 安全告警: ${message}`);
    return alert;
  }

  getReport() {
    const eventsByType = {};
    this.events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    });

    const topRiskyIPs = Array.from(this.ipActivity.entries())
      .sort((a, b) => b[1].riskScore - a[1].riskScore)
      .slice(0, 5)
      .map(([ip, activity]) => ({
        ip,
        riskScore: activity.riskScore,
        eventCount: activity.events.length
      }));

    return {
      summary: {
        totalEvents: this.events.length,
        activeAlerts: this.alerts.length,
        monitoredIPs: this.ipActivity.size
      },
      eventsByType,
      topRiskyIPs,
      alerts: this.alerts
    };
  }
}

/**
 * 简化的异常检测器
 */
class SimpleAnomalyDetector {
  constructor() {
    this.baselines = new Map();
    this.anomalies = [];
    this.isLearning = true;
    this.learningCount = 0;
    this.learningThreshold = 30; // 需要30个数据点建立基线
  }

  recordMetric(metricName, value) {
    if (!this.baselines.has(metricName)) {
      this.baselines.set(metricName, {
        values: [],
        mean: 0,
        stdDev: 0
      });
    }

    const baseline = this.baselines.get(metricName);
    baseline.values.push(value);

    // 保持最近100个值
    if (baseline.values.length > 100) {
      baseline.values = baseline.values.slice(-100);
    }

    // 更新统计信息
    this.updateBaseline(metricName);

    // 检查学习状态
    if (this.isLearning) {
      this.learningCount++;
      if (this.learningCount >= this.learningThreshold) {
        this.isLearning = false;
        console.log('📊 异常检测学习完成，开始实时监控');
      }
    } else {
      // 检测异常
      this.detectAnomaly(metricName, value);
    }
  }

  updateBaseline(metricName) {
    const baseline = this.baselines.get(metricName);
    const values = baseline.values;

    // 计算均值
    baseline.mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    // 计算标准差
    const variance = values.reduce((sum, v) => sum + Math.pow(v - baseline.mean, 2), 0) / values.length;
    baseline.stdDev = Math.sqrt(variance);
  }

  detectAnomaly(metricName, value) {
    const baseline = this.baselines.get(metricName);
    if (!baseline || baseline.stdDev === 0) return;

    // 计算Z分数
    const zScore = Math.abs(value - baseline.mean) / baseline.stdDev;

    if (zScore > 2.0) { // 2个标准差
      const anomaly = {
        id: crypto.randomUUID(),
        metricName,
        value,
        expectedValue: baseline.mean.toFixed(2),
        zScore: zScore.toFixed(2),
        severity: zScore > 3.0 ? 'high' : 'medium',
        timestamp: Date.now()
      };

      this.anomalies.push(anomaly);
      console.log(`📊 异常检测: ${metricName} = ${value} (期望: ${anomaly.expectedValue}, Z分数: ${anomaly.zScore})`);
      return anomaly;
    }

    return null;
  }

  getReport() {
    const anomaliesByMetric = {};
    this.anomalies.forEach(anomaly => {
      if (!anomaliesByMetric[anomaly.metricName]) {
        anomaliesByMetric[anomaly.metricName] = [];
      }
      anomaliesByMetric[anomaly.metricName].push(anomaly);
    });

    return {
      summary: {
        isLearning: this.isLearning,
        learningProgress: this.isLearning ? 
          Math.min(100, (this.learningCount / this.learningThreshold) * 100).toFixed(1) : 100,
        totalAnomalies: this.anomalies.length,
        monitoredMetrics: this.baselines.size
      },
      anomaliesByMetric,
      baselines: Object.fromEntries(
        Array.from(this.baselines.entries()).map(([metric, baseline]) => [
          metric,
          {
            dataPoints: baseline.values.length,
            mean: baseline.mean.toFixed(2),
            stdDev: baseline.stdDev.toFixed(2)
          }
        ])
      )
    };
  }
}

/**
 * 高级监控系统演示
 */
class AdvancedMonitoringDemo {
  constructor() {
    this.apmMonitor = new SimpleAPMMonitor();
    this.securityMonitor = new SimpleSecurityMonitor();
    this.anomalyDetector = new SimpleAnomalyDetector();
  }

  async start() {
    console.log('🚀 启动高级监控系统演示...\n');

    // 运行演示场景
    await this.runDemoScenarios();

    // 生成综合报告
    await this.generateReport();

    console.log('✅ 演示完成');
  }

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

  async demonstrateAPM() {
    console.log('🔍 演示APM性能监控功能...');

    const operations = [
      { name: 'user_login', duration: 150 },
      { name: 'database_query', duration: 300 },
      { name: 'api_request', duration: 80 },
      { name: 'file_upload', duration: 1200 }, // 慢操作
      { name: 'cache_lookup', duration: 25 }
    ];

    for (let i = 0; i < 15; i++) {
      const operation = operations[Math.floor(Math.random() * operations.length)];
      const duration = operation.duration + Math.random() * 100;
      
      // 模拟错误（10%概率）
      const hasError = Math.random() < 0.1;
      const status = hasError ? 'error' : 'success';
      const error = hasError ? new Error(`${operation.name} failed`) : null;

      this.apmMonitor.recordRequest(operation.name, duration, status, error);

      // 记录异常检测指标
      this.anomalyDetector.recordMetric('response_time', duration);
      this.anomalyDetector.recordMetric('request_count', 1);

      await this.sleep(50);
    }

    console.log('   ✅ APM演示完成\n');
  }

  async demonstrateSecurity() {
    console.log('🛡️ 演示安全事件监控功能...');

    const ips = ['192.168.1.100', '10.0.0.50', '203.0.113.1', '198.51.100.1'];
    const userIds = ['user1', 'user2', 'user3', 'admin'];

    // 模拟正常活动
    for (let i = 0; i < 8; i++) {
      this.securityMonitor.recordSecurityEvent('successful_login', {
        ip: ips[Math.floor(Math.random() * ips.length)],
        userId: userIds[Math.floor(Math.random() * userIds.length)]
      });
      await this.sleep(30);
    }

    // 模拟攻击活动
    const attackerIP = '203.0.113.1';
    
    // 失败登录（触发暴力破解检测）
    for (let i = 0; i < 4; i++) {
      this.securityMonitor.recordSecurityEvent('failed_login', {
        ip: attackerIP,
        userId: 'admin'
      });
      await this.sleep(20);
    }

    // SQL注入尝试
    this.securityMonitor.recordSecurityEvent('sql_injection', {
      ip: attackerIP,
      payload: "' OR '1'='1"
    });

    // XSS尝试
    this.securityMonitor.recordSecurityEvent('xss_attempt', {
      ip: '198.51.100.1',
      payload: '<script>alert("xss")</script>'
    });

    // 速率限制违规
    for (let i = 0; i < 3; i++) {
      this.securityMonitor.recordSecurityEvent('rate_limit_exceeded', {
        ip: '10.0.0.50'
      });
      await this.sleep(10);
    }

    console.log('   ✅ 安全监控演示完成\n');
  }

  async demonstrateAnomalyDetection() {
    console.log('📊 演示异常检测功能...');

    // 建立正常基线
    console.log('   📚 建立性能基线...');
    for (let i = 0; i < 35; i++) {
      const normalResponseTime = 200 + Math.random() * 100; // 200-300ms
      const normalMemoryUsage = 60 + Math.random() * 20; // 60-80%
      const normalCpuUsage = 30 + Math.random() * 20; // 30-50%

      this.anomalyDetector.recordMetric('api_response_time', normalResponseTime);
      this.anomalyDetector.recordMetric('memory_usage', normalMemoryUsage);
      this.anomalyDetector.recordMetric('cpu_usage', normalCpuUsage);

      await this.sleep(10);
    }

    // 注入异常数据
    console.log('   ⚠️ 注入异常数据...');
    
    this.anomalyDetector.recordMetric('api_response_time', 1500); // 异常高
    this.anomalyDetector.recordMetric('api_response_time', 50);   // 异常低
    this.anomalyDetector.recordMetric('memory_usage', 95);       // 异常高
    this.anomalyDetector.recordMetric('cpu_usage', 85);          // 异常高

    console.log('   ✅ 异常检测演示完成\n');
  }

  async generateReport() {
    console.log('📊 生成综合监控报告...\n');

    const apmReport = this.apmMonitor.getReport();
    const securityReport = this.securityMonitor.getReport();
    const anomalyReport = this.anomalyDetector.getReport();

    const comprehensiveReport = {
      timestamp: Date.now(),
      reportType: 'advanced_monitoring_demo',
      summary: {
        monitoringDuration: apmReport.summary.uptime,
        totalRequests: apmReport.summary.totalRequests,
        totalSecurityEvents: securityReport.summary.totalEvents,
        totalAnomalies: anomalyReport.summary.totalAnomalies,
        overallHealthStatus: this.calculateOverallHealth(apmReport, securityReport, anomalyReport)
      },
      apm: apmReport,
      security: securityReport,
      anomalies: anomalyReport,
      insights: this.generateInsights(apmReport, securityReport, anomalyReport),
      recommendations: this.generateRecommendations()
    };

    // 保存报告
    const reportPath = 'ADVANCED_MONITORING_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(comprehensiveReport, null, 2));

    // 显示报告摘要
    this.displayReportSummary(comprehensiveReport);

    console.log(`📄 详细报告已保存至: ${reportPath}\n`);
  }

  calculateOverallHealth(apmReport, securityReport, anomalyReport) {
    let healthScore = 100;

    // APM健康评分
    if (apmReport.summary.activeAlerts > 3) healthScore -= 20;
    else if (apmReport.summary.activeAlerts > 1) healthScore -= 10;

    if (parseFloat(apmReport.summary.errorRate) > 10) healthScore -= 15;

    // 安全健康评分
    if (securityReport.summary.activeAlerts > 2) healthScore -= 25;
    else if (securityReport.summary.activeAlerts > 0) healthScore -= 10;

    // 异常检测健康评分
    if (anomalyReport.summary.totalAnomalies > 3) healthScore -= 15;
    else if (anomalyReport.summary.totalAnomalies > 1) healthScore -= 5;

    healthScore = Math.max(0, healthScore);

    if (healthScore >= 90) return 'excellent';
    if (healthScore >= 75) return 'good';
    if (healthScore >= 60) return 'fair';
    if (healthScore >= 40) return 'poor';
    return 'critical';
  }

  generateInsights(apmReport, securityReport, anomalyReport) {
    const insights = [];

    // 性能洞察
    if (parseFloat(apmReport.summary.errorRate) > 5) {
      insights.push({
        type: 'performance',
        severity: 'medium',
        message: '错误率较高，建议检查应用程序逻辑和错误处理'
      });
    }

    // 安全洞察
    if (securityReport.summary.activeAlerts > 0) {
      insights.push({
        type: 'security',
        severity: 'high',
        message: '检测到安全威胁，建议立即审查安全策略'
      });
    }

    // 异常洞察
    if (anomalyReport.summary.totalAnomalies > 2) {
      insights.push({
        type: 'anomaly',
        severity: 'medium',
        message: '检测到多个异常，可能存在系统性能问题'
      });
    }

    return insights;
  }

  generateRecommendations() {
    return [
      '实施更细粒度的性能监控和告警策略',
      '加强API安全防护，包括速率限制和输入验证',
      '建立自动化的安全事件响应流程',
      '定期审查和更新异常检测阈值',
      '实施分布式追踪以更好地识别性能瓶颈'
    ];
  }

  displayReportSummary(report) {
    console.log('📋 高级监控系统综合报告');
    console.log('=' .repeat(50));
    console.log(`📊 整体健康状态: ${report.summary.overallHealthStatus.toUpperCase()}`);
    console.log(`⏱️  监控时长: ${Math.round(report.summary.monitoringDuration / 1000)}秒`);
    console.log();

    console.log('🔍 APM性能监控:');
    console.log(`   📈 总请求数: ${report.summary.totalRequests}`);
    console.log(`   ❌ 错误率: ${report.apm.summary.errorRate}%`);
    console.log(`   ⚠️  活跃告警: ${report.apm.summary.activeAlerts}`);
    console.log();

    console.log('🛡️ 安全事件监控:');
    console.log(`   🚨 安全事件: ${report.summary.totalSecurityEvents}`);
    console.log(`   ⚠️  活跃告警: ${report.security.summary.activeAlerts}`);
    console.log(`   🌐 监控IP: ${report.security.summary.monitoredIPs}个`);
    console.log();

    console.log('📊 异常检测:');
    console.log(`   🔍 检测异常: ${report.summary.totalAnomalies}`);
    console.log(`   📈 监控指标: ${report.anomalies.summary.monitoredMetrics}个`);
    console.log(`   🎓 学习状态: ${report.anomalies.summary.isLearning ? '学习中' : '已完成'}`);
    console.log();

    if (report.insights.length > 0) {
      console.log('💡 关键洞察:');
      report.insights.forEach((insight, index) => {
        console.log(`   ${index + 1}. [${insight.severity.toUpperCase()}] ${insight.message}`);
      });
      console.log();
    }

    console.log('🎯 改进建议:');
    report.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log();
  }

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
if (require.main === module) {
  runDemo();
}

module.exports = { AdvancedMonitoringDemo };