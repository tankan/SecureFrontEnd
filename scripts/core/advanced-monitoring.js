/**
 * 高级监控系统 - APM和安全事件实时监控
 * 提供应用性能监控、安全事件检测、异常分析等功能
 */

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import os from 'os';
import crypto from 'crypto';

/**
 * 应用性能监控 (APM) 系统
 */
class APMMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      sampleRate: options.sampleRate || 1.0, // 采样率
      slowThreshold: options.slowThreshold || 1000, // 慢查询阈值(ms)
      errorThreshold: options.errorThreshold || 5, // 错误率阈值(%)
      memoryThreshold: options.memoryThreshold || 85, // 内存使用阈值(%)
      cpuThreshold: options.cpuThreshold || 80, // CPU使用阈值(%)
      ...options
    };
    
    this.metrics = {
      requests: new Map(),
      errors: new Map(),
      performance: new Map(),
      resources: new Map(),
      dependencies: new Map()
    };
    
    this.traces = [];
    this.spans = new Map();
    this.alerts = [];
    
    this.startTime = Date.now();
    this.isRunning = false;
  }

  /**
   * 启动APM监控
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 启动APM监控系统...');
    
    // 定期收集系统指标
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000);
    
    // 定期分析性能数据
    this.analysisInterval = setInterval(() => {
      this.analyzePerformance();
    }, 30000);
    
    // 定期清理过期数据
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 300000); // 5分钟
    
    this.emit('apmStarted');
  }

  /**
   * 停止APM监控
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.analysisInterval) clearInterval(this.analysisInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    
    console.log('🛑 APM监控系统已停止');
    this.emit('apmStopped');
  }

  /**
   * 开始追踪请求
   */
  startTrace(traceId, operationName, metadata = {}) {
    const trace = {
      traceId,
      operationName,
      startTime: performance.now(),
      timestamp: Date.now(),
      metadata,
      spans: [],
      status: 'active'
    };
    
    this.traces.push(trace);
    
    // 保持最近1000个追踪
    if (this.traces.length > 1000) {
      this.traces = this.traces.slice(-1000);
    }
    
    return trace;
  }

  /**
   * 结束追踪
   */
  finishTrace(traceId, status = 'success', error = null) {
    const trace = this.traces.find(t => t.traceId === traceId);
    if (!trace) return;
    
    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.status = status;
    trace.error = error;
    
    // 记录性能指标
    this.recordPerformanceMetric(trace.operationName, trace.duration);
    
    // 检查是否为慢操作
    if (trace.duration > this.config.slowThreshold) {
      this.createAlert('slow_operation', `慢操作检测: ${trace.operationName} 耗时 ${trace.duration.toFixed(2)}ms`, {
        traceId,
        duration: trace.duration,
        operationName: trace.operationName
      });
    }
    
    // 记录错误
    if (status === 'error' && error) {
      this.recordError(trace.operationName, error);
    }
    
    this.emit('traceFinished', trace);
    return trace;
  }

  /**
   * 创建Span
   */
  createSpan(traceId, spanName, parentSpanId = null) {
    const spanId = crypto.randomUUID();
    const span = {
      spanId,
      traceId,
      parentSpanId,
      spanName,
      startTime: performance.now(),
      timestamp: Date.now(),
      tags: {},
      logs: []
    };
    
    this.spans.set(spanId, span);
    
    // 添加到对应的trace
    const trace = this.traces.find(t => t.traceId === traceId);
    if (trace) {
      trace.spans.push(span);
    }
    
    return spanId;
  }

  /**
   * 完成Span
   */
  finishSpan(spanId, tags = {}, logs = []) {
    const span = this.spans.get(spanId);
    if (!span) return;
    
    span.endTime = performance.now();
    span.duration = span.endTime - span.startTime;
    span.tags = { ...span.tags, ...tags };
    span.logs = [...span.logs, ...logs];
    
    this.emit('spanFinished', span);
    return span;
  }

  /**
   * 记录性能指标
   */
  recordPerformanceMetric(operation, duration) {
    if (!this.metrics.performance.has(operation)) {
      this.metrics.performance.set(operation, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        durations: []
      });
    }
    
    const metric = this.metrics.performance.get(operation);
    metric.count++;
    metric.totalDuration += duration;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.durations.push({
      duration,
      timestamp: Date.now()
    });
    
    // 保持最近100个记录
    if (metric.durations.length > 100) {
      metric.durations = metric.durations.slice(-100);
    }
  }

  /**
   * 记录错误
   */
  recordError(operation, error) {
    if (!this.metrics.errors.has(operation)) {
      this.metrics.errors.set(operation, {
        count: 0,
        errors: []
      });
    }
    
    const errorMetric = this.metrics.errors.get(operation);
    errorMetric.count++;
    errorMetric.errors.push({
      error: error.message || error,
      stack: error.stack,
      timestamp: Date.now()
    });
    
    // 保持最近50个错误
    if (errorMetric.errors.length > 50) {
      errorMetric.errors = errorMetric.errors.slice(-50);
    }
  }

  /**
   * 收集系统指标
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();
    
    const systemMetrics = {
      timestamp: Date.now(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        usagePercent: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        usagePercent: ((cpuUsage.user + cpuUsage.system) / 1000000) * 100
      },
      process: {
        uptime,
        pid: process.pid,
        version: process.version
      },
      system: {
        loadavg: os.loadavg(),
        freemem: os.freemem(),
        totalmem: os.totalmem(),
        cpus: os.cpus().length
      }
    };
    
    this.metrics.resources.set(Date.now(), systemMetrics);
    
    // 检查阈值
    if (systemMetrics.memory.usagePercent > this.config.memoryThreshold) {
      this.createAlert('high_memory', `内存使用率过高: ${systemMetrics.memory.usagePercent.toFixed(2)}%`, systemMetrics.memory);
    }
    
    if (systemMetrics.cpu.usagePercent > this.config.cpuThreshold) {
      this.createAlert('high_cpu', `CPU使用率过高: ${systemMetrics.cpu.usagePercent.toFixed(2)}%`, systemMetrics.cpu);
    }
    
    this.emit('systemMetrics', systemMetrics);
  }

  /**
   * 分析性能数据
   */
  analyzePerformance() {
    const analysis = {
      timestamp: Date.now(),
      operations: {},
      summary: {
        totalOperations: 0,
        totalErrors: 0,
        avgResponseTime: 0,
        errorRate: 0
      }
    };
    
    // 分析每个操作的性能
    for (const [operation, metric] of this.metrics.performance) {
      const avgDuration = metric.totalDuration / metric.count;
      const errorCount = this.metrics.errors.get(operation)?.count || 0;
      const errorRate = (errorCount / metric.count) * 100;
      
      analysis.operations[operation] = {
        count: metric.count,
        avgDuration: avgDuration.toFixed(2),
        minDuration: metric.minDuration.toFixed(2),
        maxDuration: metric.maxDuration.toFixed(2),
        errorCount,
        errorRate: errorRate.toFixed(2),
        status: this.getOperationStatus(avgDuration, errorRate)
      };
      
      analysis.summary.totalOperations += metric.count;
      analysis.summary.totalErrors += errorCount;
    }
    
    if (analysis.summary.totalOperations > 0) {
      analysis.summary.errorRate = (analysis.summary.totalErrors / analysis.summary.totalOperations) * 100;
    }
    
    // 检查整体错误率
    if (analysis.summary.errorRate > this.config.errorThreshold) {
      this.createAlert('high_error_rate', `整体错误率过高: ${analysis.summary.errorRate.toFixed(2)}%`, analysis.summary);
    }
    
    this.emit('performanceAnalysis', analysis);
    return analysis;
  }

  /**
   * 获取操作状态
   */
  getOperationStatus(avgDuration, errorRate) {
    if (errorRate > 10) return 'critical';
    if (errorRate > 5 || avgDuration > this.config.slowThreshold) return 'warning';
    return 'healthy';
  }

  /**
   * 创建告警
   */
  createAlert(type, message, metadata = {}) {
    const alert = {
      id: crypto.randomUUID(),
      type,
      message,
      metadata,
      timestamp: Date.now(),
      severity: this.getAlertSeverity(type),
      status: 'active'
    };
    
    this.alerts.push(alert);
    
    // 保持最近100个告警
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    this.emit('alert', alert);
    return alert;
  }

  /**
   * 获取告警严重程度
   */
  getAlertSeverity(type) {
    const severityMap = {
      'slow_operation': 'medium',
      'high_memory': 'high',
      'high_cpu': 'high',
      'high_error_rate': 'critical',
      'dependency_failure': 'high'
    };
    
    return severityMap[type] || 'medium';
  }

  /**
   * 清理过期数据
   */
  cleanupOldData() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24小时前
    
    // 清理过期的资源指标
    for (const [timestamp] of this.metrics.resources) {
      if (timestamp < cutoffTime) {
        this.metrics.resources.delete(timestamp);
      }
    }
    
    // 清理过期的追踪
    this.traces = this.traces.filter(trace => trace.timestamp > cutoffTime);
    
    // 清理过期的Span
    for (const [spanId, span] of this.spans) {
      if (span.timestamp < cutoffTime) {
        this.spans.delete(spanId);
      }
    }
  }

  /**
   * 生成APM报告
   */
  generateAPMReport() {
    const analysis = this.analyzePerformance();
    const activeAlerts = this.alerts.filter(a => a.status === 'active');
    
    const report = {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      summary: analysis.summary,
      operations: analysis.operations,
      alerts: {
        total: this.alerts.length,
        active: activeAlerts.length,
        byType: this.groupAlertsByType(activeAlerts),
        bySeverity: this.groupAlertsBySeverity(activeAlerts)
      },
      system: this.getLatestSystemMetrics(),
      traces: {
        total: this.traces.length,
        active: this.traces.filter(t => t.status === 'active').length,
        avgDuration: this.calculateAvgTraceDuration()
      }
    };
    
    return report;
  }

  /**
   * 按类型分组告警
   */
  groupAlertsByType(alerts) {
    const grouped = {};
    alerts.forEach(alert => {
      grouped[alert.type] = (grouped[alert.type] || 0) + 1;
    });
    return grouped;
  }

  /**
   * 按严重程度分组告警
   */
  groupAlertsBySeverity(alerts) {
    const grouped = {};
    alerts.forEach(alert => {
      grouped[alert.severity] = (grouped[alert.severity] || 0) + 1;
    });
    return grouped;
  }

  /**
   * 获取最新系统指标
   */
  getLatestSystemMetrics() {
    const timestamps = Array.from(this.metrics.resources.keys()).sort((a, b) => b - a);
    if (timestamps.length === 0) return null;
    
    return this.metrics.resources.get(timestamps[0]);
  }

  /**
   * 计算平均追踪时长
   */
  calculateAvgTraceDuration() {
    const completedTraces = this.traces.filter(t => t.duration !== undefined);
    if (completedTraces.length === 0) return 0;
    
    const totalDuration = completedTraces.reduce((sum, trace) => sum + trace.duration, 0);
    return totalDuration / completedTraces.length;
  }
}

/**
 * 安全事件实时监控系统
 */
class SecurityEventMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      alertThresholds: {
        failedLogins: 5, // 5分钟内失败登录次数
        suspiciousIPs: 3, // 可疑IP活动次数
        rateLimitViolations: 10, // 速率限制违规次数
        ...options.alertThresholds
      },
      timeWindow: options.timeWindow || 300000, // 5分钟时间窗口
      ...options
    };
    
    this.events = [];
    this.ipActivity = new Map();
    this.userActivity = new Map();
    this.patterns = new Map();
    this.alerts = [];
    
    this.isMonitoring = false;
  }

  /**
   * 启动安全监控
   */
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🛡️ 启动安全事件监控...');
    
    // 定期分析安全模式
    this.analysisInterval = setInterval(() => {
      this.analyzeSecurityPatterns();
    }, 60000); // 每分钟分析一次
    
    // 定期清理过期数据
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredData();
    }, 300000); // 5分钟清理一次
    
    this.emit('securityMonitorStarted');
  }

  /**
   * 停止安全监控
   */
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.analysisInterval) clearInterval(this.analysisInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    
    console.log('🛡️ 安全事件监控已停止');
    this.emit('securityMonitorStopped');
  }

  /**
   * 记录安全事件
   */
  recordSecurityEvent(eventType, details = {}) {
    const event = {
      id: crypto.randomUUID(),
      type: eventType,
      timestamp: Date.now(),
      ip: details.ip || 'unknown',
      userId: details.userId,
      userAgent: details.userAgent,
      details,
      severity: this.calculateSeverity(eventType, details),
      riskScore: this.calculateRiskScore(eventType, details)
    };
    
    this.events.push(event);
    
    // 更新IP活动
    this.updateIPActivity(event.ip, event);
    
    // 更新用户活动
    if (event.userId) {
      this.updateUserActivity(event.userId, event);
    }
    
    // 实时检查威胁
    this.checkRealTimeThreats(event);
    
    // 保持最近1000个事件
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
    
    this.emit('securityEvent', event);
    return event;
  }

  /**
   * 更新IP活动
   */
  updateIPActivity(ip, event) {
    if (!this.ipActivity.has(ip)) {
      this.ipActivity.set(ip, {
        events: [],
        riskScore: 0,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp
      });
    }
    
    const activity = this.ipActivity.get(ip);
    activity.events.push(event);
    activity.lastSeen = event.timestamp;
    activity.riskScore += event.riskScore;
    
    // 保持最近50个事件
    if (activity.events.length > 50) {
      activity.events = activity.events.slice(-50);
    }
  }

  /**
   * 更新用户活动
   */
  updateUserActivity(userId, event) {
    if (!this.userActivity.has(userId)) {
      this.userActivity.set(userId, {
        events: [],
        riskScore: 0,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp
      });
    }
    
    const activity = this.userActivity.get(userId);
    activity.events.push(event);
    activity.lastSeen = event.timestamp;
    activity.riskScore += event.riskScore;
    
    // 保持最近50个事件
    if (activity.events.length > 50) {
      activity.events = activity.events.slice(-50);
    }
  }

  /**
   * 计算事件严重程度
   */
  calculateSeverity(eventType, details) {
    const severityMap = {
      'failed_login': 'low',
      'brute_force_attempt': 'high',
      'sql_injection': 'critical',
      'xss_attempt': 'high',
      'unauthorized_access': 'high',
      'suspicious_activity': 'medium',
      'rate_limit_exceeded': 'medium',
      'malware_detected': 'critical',
      'data_exfiltration': 'critical'
    };
    
    return severityMap[eventType] || 'medium';
  }

  /**
   * 计算风险评分
   */
  calculateRiskScore(eventType, details) {
    const baseScores = {
      'failed_login': 1,
      'brute_force_attempt': 5,
      'sql_injection': 10,
      'xss_attempt': 7,
      'unauthorized_access': 8,
      'suspicious_activity': 3,
      'rate_limit_exceeded': 2,
      'malware_detected': 10,
      'data_exfiltration': 10
    };
    
    let score = baseScores[eventType] || 3;
    
    // 根据详细信息调整评分
    if (details.repeated) score *= 2;
    if (details.fromTor) score *= 1.5;
    if (details.knownMaliciousIP) score *= 3;
    
    return Math.min(score, 10); // 最高10分
  }

  /**
   * 实时威胁检查
   */
  checkRealTimeThreats(event) {
    const now = event.timestamp;
    const timeWindow = this.config.timeWindow;
    
    // 检查失败登录
    if (event.type === 'failed_login') {
      const recentFailures = this.events.filter(e => 
        e.type === 'failed_login' && 
        e.ip === event.ip && 
        now - e.timestamp < timeWindow
      );
      
      if (recentFailures.length >= this.config.alertThresholds.failedLogins) {
        this.createSecurityAlert('brute_force_detected', `检测到暴力破解攻击: IP ${event.ip}`, {
          ip: event.ip,
          attempts: recentFailures.length,
          timeWindow: timeWindow / 1000
        });
      }
    }
    
    // 检查可疑IP活动
    const ipActivity = this.ipActivity.get(event.ip);
    if (ipActivity && ipActivity.riskScore > 20) {
      this.createSecurityAlert('suspicious_ip', `可疑IP活动: ${event.ip}`, {
        ip: event.ip,
        riskScore: ipActivity.riskScore,
        eventCount: ipActivity.events.length
      });
    }
    
    // 检查速率限制违规
    if (event.type === 'rate_limit_exceeded') {
      const recentViolations = this.events.filter(e => 
        e.type === 'rate_limit_exceeded' && 
        e.ip === event.ip && 
        now - e.timestamp < timeWindow
      );
      
      if (recentViolations.length >= this.config.alertThresholds.rateLimitViolations) {
        this.createSecurityAlert('rate_limit_abuse', `速率限制滥用: IP ${event.ip}`, {
          ip: event.ip,
          violations: recentViolations.length
        });
      }
    }
  }

  /**
   * 分析安全模式
   */
  analyzeSecurityPatterns() {
    const now = Date.now();
    const timeWindow = 24 * 60 * 60 * 1000; // 24小时
    const recentEvents = this.events.filter(e => now - e.timestamp < timeWindow);
    
    // 分析攻击模式
    const patterns = {
      timestamp: now,
      totalEvents: recentEvents.length,
      eventsByType: this.groupEventsByType(recentEvents),
      topRiskyIPs: this.getTopRiskyIPs(5),
      topRiskyUsers: this.getTopRiskyUsers(5),
      attackTrends: this.calculateAttackTrends(recentEvents),
      geographicDistribution: this.analyzeGeographicDistribution(recentEvents)
    };
    
    this.patterns.set(now, patterns);
    
    // 保持最近24个分析结果（每小时一个）
    const patternKeys = Array.from(this.patterns.keys()).sort((a, b) => b - a);
    if (patternKeys.length > 24) {
      patternKeys.slice(24).forEach(key => this.patterns.delete(key));
    }
    
    this.emit('securityPatterns', patterns);
    return patterns;
  }

  /**
   * 按类型分组事件
   */
  groupEventsByType(events) {
    const grouped = {};
    events.forEach(event => {
      grouped[event.type] = (grouped[event.type] || 0) + 1;
    });
    return grouped;
  }

  /**
   * 获取风险最高的IP
   */
  getTopRiskyIPs(limit = 5) {
    return Array.from(this.ipActivity.entries())
      .sort((a, b) => b[1].riskScore - a[1].riskScore)
      .slice(0, limit)
      .map(([ip, activity]) => ({
        ip,
        riskScore: activity.riskScore,
        eventCount: activity.events.length,
        lastSeen: activity.lastSeen
      }));
  }

  /**
   * 获取风险最高的用户
   */
  getTopRiskyUsers(limit = 5) {
    return Array.from(this.userActivity.entries())
      .sort((a, b) => b[1].riskScore - a[1].riskScore)
      .slice(0, limit)
      .map(([userId, activity]) => ({
        userId,
        riskScore: activity.riskScore,
        eventCount: activity.events.length,
        lastSeen: activity.lastSeen
      }));
  }

  /**
   * 计算攻击趋势
   */
  calculateAttackTrends(events) {
    const hourlyEvents = {};
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourlyEvents[hour] = (hourlyEvents[hour] || 0) + 1;
    });
    
    return hourlyEvents;
  }

  /**
   * 分析地理分布（模拟）
   */
  analyzeGeographicDistribution(events) {
    // 这里是模拟的地理分布分析
    // 实际实现需要IP地理位置数据库
    const countries = {};
    
    events.forEach(event => {
      // 模拟地理位置检测
      const country = this.mockGeoLocation(event.ip);
      countries[country] = (countries[country] || 0) + 1;
    });
    
    return countries;
  }

  /**
   * 模拟地理位置检测
   */
  mockGeoLocation(ip) {
    const countries = ['CN', 'US', 'RU', 'DE', 'JP', 'KR', 'IN', 'BR'];
    const hash = crypto.createHash('md5').update(ip).digest('hex');
    const index = parseInt(hash.substring(0, 2), 16) % countries.length;
    return countries[index];
  }

  /**
   * 创建安全告警
   */
  createSecurityAlert(type, message, metadata = {}) {
    const alert = {
      id: crypto.randomUUID(),
      type,
      message,
      metadata,
      timestamp: Date.now(),
      severity: this.getSecurityAlertSeverity(type),
      status: 'active'
    };
    
    this.alerts.push(alert);
    
    // 保持最近100个告警
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    this.emit('securityAlert', alert);
    return alert;
  }

  /**
   * 获取安全告警严重程度
   */
  getSecurityAlertSeverity(type) {
    const severityMap = {
      'brute_force_detected': 'high',
      'suspicious_ip': 'medium',
      'rate_limit_abuse': 'medium',
      'sql_injection_detected': 'critical',
      'malware_detected': 'critical',
      'data_breach_suspected': 'critical'
    };
    
    return severityMap[type] || 'medium';
  }

  /**
   * 清理过期数据
   */
  cleanupExpiredData() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24小时前
    
    // 清理过期事件
    this.events = this.events.filter(event => event.timestamp > cutoffTime);
    
    // 清理过期IP活动
    for (const [ip, activity] of this.ipActivity) {
      activity.events = activity.events.filter(event => event.timestamp > cutoffTime);
      if (activity.events.length === 0) {
        this.ipActivity.delete(ip);
      }
    }
    
    // 清理过期用户活动
    for (const [userId, activity] of this.userActivity) {
      activity.events = activity.events.filter(event => event.timestamp > cutoffTime);
      if (activity.events.length === 0) {
        this.userActivity.delete(userId);
      }
    }
  }

  /**
   * 生成安全报告
   */
  generateSecurityReport() {
    const patterns = this.analyzeSecurityPatterns();
    const activeAlerts = this.alerts.filter(a => a.status === 'active');
    
    const report = {
      timestamp: Date.now(),
      summary: {
        totalEvents: this.events.length,
        activeAlerts: activeAlerts.length,
        topThreats: this.getTopThreats(),
        riskLevel: this.calculateOverallRiskLevel()
      },
      patterns,
      alerts: {
        active: activeAlerts,
        byType: this.groupAlertsByType(activeAlerts),
        bySeverity: this.groupAlertsBySeverity(activeAlerts)
      },
      recommendations: this.generateSecurityRecommendations()
    };
    
    return report;
  }

  /**
   * 获取主要威胁
   */
  getTopThreats() {
    const threatCounts = {};
    
    this.events.forEach(event => {
      threatCounts[event.type] = (threatCounts[event.type] || 0) + 1;
    });
    
    return Object.entries(threatCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }

  /**
   * 计算整体风险等级
   */
  calculateOverallRiskLevel() {
    const activeAlerts = this.alerts.filter(a => a.status === 'active');
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const highAlerts = activeAlerts.filter(a => a.severity === 'high').length;
    
    if (criticalAlerts > 0) return 'critical';
    if (highAlerts > 3) return 'high';
    if (activeAlerts.length > 5) return 'medium';
    return 'low';
  }

  /**
   * 生成安全建议
   */
  generateSecurityRecommendations() {
    const recommendations = [];
    const patterns = Array.from(this.patterns.values()).pop();
    
    if (patterns) {
      // 基于攻击模式生成建议
      if (patterns.eventsByType.failed_login > 50) {
        recommendations.push('考虑实施账户锁定策略以防止暴力破解攻击');
      }
      
      if (patterns.eventsByType.rate_limit_exceeded > 100) {
        recommendations.push('建议加强API速率限制配置');
      }
      
      if (patterns.topRiskyIPs.length > 10) {
        recommendations.push('考虑实施IP黑名单机制');
      }
    }
    
    return recommendations;
  }

  /**
   * 按类型分组告警
   */
  groupAlertsByType(alerts) {
    const grouped = {};
    alerts.forEach(alert => {
      grouped[alert.type] = (grouped[alert.type] || 0) + 1;
    });
    return grouped;
  }

  /**
   * 按严重程度分组告警
   */
  groupAlertsBySeverity(alerts) {
    const grouped = {};
    alerts.forEach(alert => {
      grouped[alert.severity] = (grouped[alert.severity] || 0) + 1;
    });
    return grouped;
  }
}

/**
 * 异常检测系统
 */
class AnomalyDetector extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      sensitivityLevel: options.sensitivityLevel || 'medium', // low, medium, high
      learningPeriod: options.learningPeriod || 7 * 24 * 60 * 60 * 1000, // 7天
      detectionThreshold: options.detectionThreshold || 2.0, // 标准差倍数
      ...options
    };
    
    this.baselines = new Map();
    this.anomalies = [];
    this.isLearning = true;
    this.learningStartTime = Date.now();
  }

  /**
   * 记录指标数据点
   */
  recordMetric(metricName, value, timestamp = Date.now()) {
    if (!this.baselines.has(metricName)) {
      this.baselines.set(metricName, {
        values: [],
        mean: 0,
        stdDev: 0,
        min: Infinity,
        max: -Infinity,
        lastUpdated: timestamp
      });
    }
    
    const baseline = this.baselines.get(metricName);
    baseline.values.push({ value, timestamp });
    baseline.lastUpdated = timestamp;
    
    // 保持最近1000个数据点
    if (baseline.values.length > 1000) {
      baseline.values = baseline.values.slice(-1000);
    }
    
    // 更新统计信息
    this.updateBaseline(metricName);
    
    // 检测异常（学习期后）
    if (!this.isLearning) {
      this.detectAnomaly(metricName, value, timestamp);
    }
    
    // 检查是否完成学习期
    if (this.isLearning && (timestamp - this.learningStartTime) > this.config.learningPeriod) {
      this.isLearning = false;
      console.log('📊 异常检测学习期完成，开始实时检测');
      this.emit('learningCompleted');
    }
  }

  /**
   * 更新基线统计
   */
  updateBaseline(metricName) {
    const baseline = this.baselines.get(metricName);
    const values = baseline.values.map(v => v.value);
    
    // 计算均值
    baseline.mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    // 计算标准差
    const variance = values.reduce((sum, v) => sum + Math.pow(v - baseline.mean, 2), 0) / values.length;
    baseline.stdDev = Math.sqrt(variance);
    
    // 更新最值
    baseline.min = Math.min(...values);
    baseline.max = Math.max(...values);
  }

  /**
   * 检测异常
   */
  detectAnomaly(metricName, value, timestamp) {
    const baseline = this.baselines.get(metricName);
    if (!baseline || baseline.stdDev === 0) return;
    
    // 计算Z分数
    const zScore = Math.abs(value - baseline.mean) / baseline.stdDev;
    
    // 根据敏感度调整阈值
    const threshold = this.getThresholdBySensitivity();
    
    if (zScore > threshold) {
      const anomaly = {
        id: crypto.randomUUID(),
        metricName,
        value,
        expectedValue: baseline.mean,
        zScore: zScore.toFixed(2),
        severity: this.calculateAnomalySeverity(zScore),
        timestamp,
        baseline: {
          mean: baseline.mean.toFixed(2),
          stdDev: baseline.stdDev.toFixed(2),
          min: baseline.min.toFixed(2),
          max: baseline.max.toFixed(2)
        }
      };
      
      this.anomalies.push(anomaly);
      
      // 保持最近100个异常
      if (this.anomalies.length > 100) {
        this.anomalies = this.anomalies.slice(-100);
      }
      
      this.emit('anomalyDetected', anomaly);
      return anomaly;
    }
    
    return null;
  }

  /**
   * 根据敏感度获取阈值
   */
  getThresholdBySensitivity() {
    const thresholds = {
      'low': 3.0,
      'medium': 2.0,
      'high': 1.5
    };
    
    return thresholds[this.config.sensitivityLevel] || 2.0;
  }

  /**
   * 计算异常严重程度
   */
  calculateAnomalySeverity(zScore) {
    if (zScore > 4.0) return 'critical';
    if (zScore > 3.0) return 'high';
    if (zScore > 2.0) return 'medium';
    return 'low';
  }

  /**
   * 获取异常报告
   */
  getAnomalyReport() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const recentAnomalies = this.anomalies.filter(a => a.timestamp > last24h);
    
    const report = {
      timestamp: now,
      isLearning: this.isLearning,
      learningProgress: this.isLearning ? 
        ((now - this.learningStartTime) / this.config.learningPeriod * 100).toFixed(1) : 100,
      summary: {
        totalAnomalies: this.anomalies.length,
        recentAnomalies: recentAnomalies.length,
        criticalAnomalies: recentAnomalies.filter(a => a.severity === 'critical').length,
        monitoredMetrics: this.baselines.size
      },
      anomaliesByMetric: this.groupAnomaliesByMetric(recentAnomalies),
      anomaliesBySeverity: this.groupAnomaliesBySeverity(recentAnomalies),
      baselines: this.getBaselineSummary()
    };
    
    return report;
  }

  /**
   * 按指标分组异常
   */
  groupAnomaliesByMetric(anomalies) {
    const grouped = {};
    anomalies.forEach(anomaly => {
      if (!grouped[anomaly.metricName]) {
        grouped[anomaly.metricName] = [];
      }
      grouped[anomaly.metricName].push(anomaly);
    });
    return grouped;
  }

  /**
   * 按严重程度分组异常
   */
  groupAnomaliesBySeverity(anomalies) {
    const grouped = {};
    anomalies.forEach(anomaly => {
      grouped[anomaly.severity] = (grouped[anomaly.severity] || 0) + 1;
    });
    return grouped;
  }

  /**
   * 获取基线摘要
   */
  getBaselineSummary() {
    const summary = {};
    
    for (const [metricName, baseline] of this.baselines) {
      summary[metricName] = {
        dataPoints: baseline.values.length,
        mean: baseline.mean.toFixed(2),
        stdDev: baseline.stdDev.toFixed(2),
        range: `${baseline.min.toFixed(2)} - ${baseline.max.toFixed(2)}`,
        lastUpdated: new Date(baseline.lastUpdated).toISOString()
      };
    }
    
    return summary;
  }
}

export { APMMonitor, SecurityEventMonitor, AnomalyDetector };

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  console.log('🚀 高级监控系统模块已加载');
  console.log('   - APMMonitor: 应用性能监控');
  console.log('   - SecurityEventMonitor: 安全事件监控');
  console.log('   - AnomalyDetector: 异常检测系统');
}