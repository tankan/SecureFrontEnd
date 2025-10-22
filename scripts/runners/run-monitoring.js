/**
 * 监控系统运行器
 */

import { MonitoringSystem } from '../core/monitoring-system.js';

async function runMonitoringDemo() {
  console.log('🚀 启动监控系统演示...\n');
  
  const monitor = new MonitoringSystem({
    logLevel: 'info',
    logFile: 'logs/application.log',
    metricsFile: 'logs/metrics.json',
    alertThresholds: {
      cpuUsage: 70,
      memoryUsage: 80,
      responseTime: 800,
      errorRate: 3
    }
  });
  
  // 监听事件
  monitor.on('alert', (alert) => {
    console.log(`🚨 新告警: ${alert.type} - ${alert.message}`);
  });
  
  monitor.on('securityEvent', (event) => {
    console.log(`🔒 安全事件: ${event.type} - ${event.description}`);
  });
  
  // 模拟应用活动
  console.log('📊 模拟应用活动...');
  
  // 模拟正常请求
  for (let i = 0; i < 50; i++) {
    const responseTime = Math.random() * 500 + 100; // 100-600ms
    monitor.recordRequest(responseTime, Math.random() > 0.05); // 95% 成功率
    
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // 模拟一些慢请求
  for (let i = 0; i < 5; i++) {
    const responseTime = Math.random() * 1000 + 800; // 800-1800ms
    monitor.recordRequest(responseTime, Math.random() > 0.2); // 80% 成功率
  }
  
  // 模拟安全事件
  monitor.recordSecurityEvent('authentication_failure', '多次登录失败', { 
    ip: '192.168.1.100', 
    attempts: 5 
  });
  
  monitor.recordSecurityEvent('injection_attempt', '检测到SQL注入尝试', { 
    ip: '10.0.0.50', 
    payload: "'; DROP TABLE users; --" 
  });
  
  monitor.recordSecurityEvent('brute_force', '暴力破解攻击', { 
    ip: '203.0.113.10', 
    attempts: 100 
  });
  
  // 等待指标收集
  console.log('\n⏳ 等待指标收集...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 生成报告
  console.log('\n📋 生成监控报告...');
  const report = monitor.generateReport();
  
  // 显示一些实时指标
  console.log('\n📈 实时指标:');
  const currentMetrics = monitor.metrics;
  console.log(`   当前请求总数: ${currentMetrics.requests}`);
  console.log(`   当前错误总数: ${currentMetrics.errors}`);
  console.log(`   安全事件数量: ${currentMetrics.securityEvents.length}`);
  
  if (currentMetrics.responseTime.length > 0) {
    const avgResponseTime = currentMetrics.responseTime.reduce((sum, rt) => sum + rt, 0) / currentMetrics.responseTime.length;
    console.log(`   平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
  }
  
  // 显示最近的安全事件
  console.log('\n🔒 最近的安全事件:');
  currentMetrics.securityEvents.slice(-3).forEach(event => {
    console.log(`   • ${event.timestamp}: ${event.type} - ${event.description} (${event.severity})`);
  });
  
  // 停止监控
  setTimeout(() => {
    console.log('\n🛑 停止监控系统...');
    monitor.stopMonitoring();
    console.log('✅ 监控系统演示完成!');
  }, 2000);
}

// 运行演示
runMonitoringDemo().catch(console.error);