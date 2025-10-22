/**
 * 监控和日志系统
 * 用于性能监控、安全事件监控和日志分析
 */

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import os from 'os';

class MonitoringSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      logLevel: options.logLevel || 'info',
      logFile: options.logFile || 'application.log',
      metricsFile: options.metricsFile || 'metrics.json',
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 85,
        responseTime: 1000,
        errorRate: 5
      },
      ...options
    };
    
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      cpuUsage: [],
      memoryUsage: [],
      securityEvents: []
    };
    
    this.alerts = [];
    this.isMonitoring = false;
    
    // 初始化日志目录
    this.initializeLogDirectory();
    
    // 启动监控
    this.startMonitoring();
  }

  /**
   * 初始化日志目录
   */
  initializeLogDirectory() {
    const logDir = path.dirname(this.config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 启动监控
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('📊 启动监控系统...');
    
    // 每5秒收集系统指标
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000);
    
    // 每分钟检查告警
    this.alertInterval = setInterval(() => {
      this.checkAlerts();
    }, 60000);
    
    // 每小时保存指标
    this.saveInterval = setInterval(() => {
      this.saveMetrics();
    }, 3600000);
    
    this.log('info', 'Monitoring system started');
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.alertInterval) clearInterval(this.alertInterval);
    if (this.saveInterval) clearInterval(this.saveInterval);
    
    this.saveMetrics();
    this.log('info', 'Monitoring system stopped');
    console.log('📊 监控系统已停止');
  }

  /**
   * 记录日志
   */
  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      metadata,
      pid: process.pid,
      hostname: os.hostname()
    };
    
    // 控制台输出
    const levelEmojis = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      debug: '🐛'
    };
    
    console.log(`${levelEmojis[level] || 'ℹ️'} [${timestamp}] ${level.toUpperCase()}: ${message}`);
    
    // 写入日志文件
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(this.config.logFile, logLine);
    
    // 触发日志事件
    this.emit('log', logEntry);
    
    // 检查是否需要告警
    if (level === 'error') {
      this.recordSecurityEvent('error', message, metadata);
    }
  }

  /**
   * 记录请求指标
   */
  recordRequest(duration, success = true) {
    this.metrics.requests++;
    this.metrics.responseTime.push(duration);
    
    if (!success) {
      this.metrics.errors++;
    }
    
    // 保持最近1000个响应时间记录
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
    }
    
    this.log('debug', `Request completed in ${duration}ms`, { success });
  }

  /**
   * 记录安全事件
   */
  recordSecurityEvent(type, description, metadata = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      description,
      metadata,
      severity: this.getSecuritySeverity(type)
    };
    
    this.metrics.securityEvents.push(event);
    
    // 保持最近500个安全事件
    if (this.metrics.securityEvents.length > 500) {
      this.metrics.securityEvents = this.metrics.securityEvents.slice(-500);
    }
    
    this.log('warn', `Security event: ${type} - ${description}`, metadata);
    this.emit('securityEvent', event);
    
    // 高危事件立即告警
    if (event.severity === 'high' || event.severity === 'critical') {
      this.createAlert('security', `High severity security event: ${description}`, event);
    }
  }

  /**
   * 获取安全事件严重程度
   */
  getSecuritySeverity(type) {
    const severityMap = {
      'authentication_failure': 'medium',
      'authorization_failure': 'high',
      'injection_attempt': 'high',
      'brute_force': 'high',
      'data_breach': 'critical',
      'malware_detected': 'critical',
      'error': 'low',
      'warning': 'low'
    };
    
    return severityMap[type] || 'medium';
  }

  /**
   * 收集系统指标
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // 内存使用率
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      percentage: memoryUsagePercent,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss
    });
    
    // CPU使用率（简化计算）
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) * 100;
    this.metrics.cpuUsage.push({
      timestamp: Date.now(),
      percentage: cpuPercent,
      user: cpuUsage.user,
      system: cpuUsage.system
    });
    
    // 保持最近100个指标记录，防止内存泄漏
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
    }
    if (this.metrics.cpuUsage.length > 100) {
      this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-100);
    }
    
    // 限制响应时间记录数量
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-500);
    }
    
    // 限制安全事件记录数量
    if (this.metrics.securityEvents.length > 500) {
      this.metrics.securityEvents = this.metrics.securityEvents.slice(-250);
    }
    
    // 限制告警记录数量
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-50);
    }
    
    this.emit('metrics', {
      memory: memoryUsagePercent,
      cpu: cpuPercent
    });
  }

  /**
   * 检查告警条件
   */
  checkAlerts() {
    const now = Date.now();
    const recentMetrics = {
      memory: this.metrics.memoryUsage.filter(m => now - m.timestamp < 300000), // 5分钟内
      cpu: this.metrics.cpuUsage.filter(c => now - c.timestamp < 300000),
      responseTime: this.metrics.responseTime.slice(-100) // 最近100个请求
    };
    
    // 检查内存使用率
    if (recentMetrics.memory.length > 0) {
      const avgMemory = recentMetrics.memory.reduce((sum, m) => sum + m.percentage, 0) / recentMetrics.memory.length;
      if (avgMemory > this.config.alertThresholds.memoryUsage) {
        this.createAlert('memory', `High memory usage: ${avgMemory.toFixed(2)}%`, { avgMemory });
      }
    }
    
    // 检查CPU使用率
    if (recentMetrics.cpu.length > 0) {
      const avgCpu = recentMetrics.cpu.reduce((sum, c) => sum + c.percentage, 0) / recentMetrics.cpu.length;
      if (avgCpu > this.config.alertThresholds.cpuUsage) {
        this.createAlert('cpu', `High CPU usage: ${avgCpu.toFixed(2)}%`, { avgCpu });
      }
    }
    
    // 检查响应时间
    if (recentMetrics.responseTime.length > 0) {
      const avgResponseTime = recentMetrics.responseTime.reduce((sum, rt) => sum + rt, 0) / recentMetrics.responseTime.length;
      if (avgResponseTime > this.config.alertThresholds.responseTime) {
        this.createAlert('performance', `High response time: ${avgResponseTime.toFixed(2)}ms`, { avgResponseTime });
      }
    }
    
    // 检查错误率
    if (this.metrics.requests > 0) {
      const errorRate = (this.metrics.errors / this.metrics.requests) * 100;
      if (errorRate > this.config.alertThresholds.errorRate) {
        this.createAlert('error', `High error rate: ${errorRate.toFixed(2)}%`, { errorRate });
      }
    }
  }

  /**
   * 创建告警
   */
  createAlert(type, message, metadata = {}) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      metadata,
      status: 'active'
    };
    
    this.alerts.push(alert);
    this.log('warn', `ALERT: ${message}`, metadata);
    this.emit('alert', alert);
    
    // 保持最近100个告警
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    return alert;
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
      this.log('info', `Alert resolved: ${alert.message}`);
      this.emit('alertResolved', alert);
    }
  }

  /**
   * 保存指标到文件
   */
  saveMetrics() {
    const metricsData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests: this.metrics.requests,
        totalErrors: this.metrics.errors,
        errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0,
        avgResponseTime: this.metrics.responseTime.length > 0 
          ? this.metrics.responseTime.reduce((sum, rt) => sum + rt, 0) / this.metrics.responseTime.length 
          : 0
      },
      metrics: this.metrics,
      alerts: this.alerts.filter(a => a.status === 'active')
    };
    
    fs.writeFileSync(this.config.metricsFile, JSON.stringify(metricsData, null, 2));
    this.log('debug', 'Metrics saved to file');
  }

  /**
   * 获取监控报告
   */
  getMonitoringReport() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    const recentMetrics = {
      memory: this.metrics.memoryUsage.filter(m => m.timestamp > last24h),
      cpu: this.metrics.cpuUsage.filter(c => c.timestamp > last24h),
      securityEvents: this.metrics.securityEvents.filter(e => new Date(e.timestamp).getTime() > last24h)
    };
    
    const report = {
      timestamp: new Date().toISOString(),
      period: '24 hours',
      summary: {
        totalRequests: this.metrics.requests,
        totalErrors: this.metrics.errors,
        errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0,
        avgResponseTime: this.metrics.responseTime.length > 0 
          ? this.metrics.responseTime.reduce((sum, rt) => sum + rt, 0) / this.metrics.responseTime.length 
          : 0,
        activeAlerts: this.alerts.filter(a => a.status === 'active').length,
        securityEvents: recentMetrics.securityEvents.length
      },
      performance: {
        avgMemoryUsage: recentMetrics.memory.length > 0 
          ? recentMetrics.memory.reduce((sum, m) => sum + m.percentage, 0) / recentMetrics.memory.length 
          : 0,
        avgCpuUsage: recentMetrics.cpu.length > 0 
          ? recentMetrics.cpu.reduce((sum, c) => sum + c.percentage, 0) / recentMetrics.cpu.length 
          : 0
      },
      security: {
        events: recentMetrics.securityEvents,
        eventsByType: this.groupSecurityEventsByType(recentMetrics.securityEvents)
      },
      alerts: this.alerts.filter(a => a.status === 'active')
    };
    
    return report;
  }

  /**
   * 按类型分组安全事件
   */
  groupSecurityEventsByType(events) {
    const grouped = {};
    events.forEach(event => {
      if (!grouped[event.type]) {
        grouped[event.type] = 0;
      }
      grouped[event.type]++;
    });
    return grouped;
  }

  /**
   * 生成监控报告
   */
  generateReport() {
    const report = this.getMonitoringReport();
    
    console.log('\n📊 监控系统报告:');
    console.log(`   报告时间: ${report.timestamp}`);
    console.log(`   统计周期: ${report.period}`);
    console.log('\n📈 性能指标:');
    console.log(`   总请求数: ${report.summary.totalRequests}`);
    console.log(`   错误数量: ${report.summary.totalErrors}`);
    console.log(`   错误率: ${report.summary.errorRate.toFixed(2)}%`);
    console.log(`   平均响应时间: ${report.summary.avgResponseTime.toFixed(2)}ms`);
    console.log(`   平均内存使用: ${report.performance.avgMemoryUsage.toFixed(2)}%`);
    console.log(`   平均CPU使用: ${report.performance.avgCpuUsage.toFixed(2)}%`);
    
    console.log('\n🔒 安全事件:');
    console.log(`   安全事件总数: ${report.summary.securityEvents}`);
    Object.entries(report.security.eventsByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} 次`);
    });
    
    console.log('\n🚨 活跃告警:');
    console.log(`   活跃告警数: ${report.summary.activeAlerts}`);
    report.alerts.forEach(alert => {
      console.log(`   • ${alert.type}: ${alert.message}`);
    });
    
    // 保存报告
    const reportPath = path.join(process.cwd(), 'MONITORING_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 详细报告已保存至: ${reportPath}`);
    
    return report;
  }
}

export { MonitoringSystem };

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const monitor = new MonitoringSystem({
    logLevel: 'info',
    logFile: 'logs/application.log',
    metricsFile: 'logs/metrics.json'
  });
  
  // 模拟一些活动
  setTimeout(() => {
    monitor.recordRequest(150, true);
    monitor.recordRequest(200, true);
    monitor.recordRequest(1200, false);
    monitor.recordSecurityEvent('authentication_failure', 'Failed login attempt', { ip: '192.168.1.100' });
  }, 1000);
  
  // 5秒后生成报告并停止
  setTimeout(() => {
    monitor.generateReport();
    monitor.stopMonitoring();
  }, 5000);
}