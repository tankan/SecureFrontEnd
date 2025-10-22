/**
 * 功能模块演示运行器
 */

import { FeatureModuleManager } from '../core/feature-modules.js';

async function runFeatureDemo() {
  console.log('🚀 启动功能模块演示...\n');
  
  const manager = new FeatureModuleManager();
  manager.initialize();
  
  // 获取各个模块
  const userModule = manager.getModule('user');
  const analyticsModule = manager.getModule('analytics');
  const notificationModule = manager.getModule('notification');
  const fileModule = manager.getModule('file');
  
  console.log('👥 用户管理模块演示:');
  
  // 创建测试用户
  const user1 = userModule.createUser({
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    profile: { name: '管理员', department: 'IT' }
  });
  console.log(`   ✅ 创建用户: ${user1.username} (${user1.email})`);
  
  const user2 = userModule.createUser({
    username: 'user1',
    email: 'user1@example.com',
    password: 'user123',
    role: 'user',
    profile: { name: '普通用户', department: '业务部' }
  });
  console.log(`   ✅ 创建用户: ${user2.username} (${user2.email})`);
  
  // 用户认证
  const authResult = userModule.authenticateUser('admin', 'admin123');
  if (authResult) {
    console.log(`   🔐 用户认证成功: ${authResult.user.username} (会话ID: ${authResult.sessionId.substring(0, 8)}...)`);
    
    // 权限检查
    const hasAdminPermission = userModule.hasPermission(authResult.sessionId, 'admin');
    console.log(`   🛡️ 管理员权限检查: ${hasAdminPermission ? '通过' : '拒绝'}`);
  }
  
  // 测试错误认证
  const failedAuth = userModule.authenticateUser('admin', 'wrongpassword');
  console.log(`   ❌ 错误密码认证: ${failedAuth ? '成功' : '失败'}`);
  
  console.log('\n📊 数据分析模块演示:');
  
  // 记录一些数据点
  for (let i = 0; i < 20; i++) {
    analyticsModule.recordDataPoint('page_views', Math.floor(Math.random() * 100) + 1, {
      page: i % 3 === 0 ? 'home' : i % 3 === 1 ? 'dashboard' : 'profile',
      user_id: i % 2 === 0 ? user1.userId : user2.userId
    });
  }
  
  for (let i = 0; i < 10; i++) {
    analyticsModule.recordDataPoint('api_calls', Math.floor(Math.random() * 50) + 10, {
      endpoint: i % 2 === 0 ? '/api/users' : '/api/data',
      method: 'GET'
    });
  }
  
  console.log('   📈 记录了30个数据点');
  
  // 生成分析报告
  const pageViewsReport = analyticsModule.generateAnalyticsReport('page_views', '24h');
  console.log(`   📋 页面访问报告: ${pageViewsReport.dataPoints} 个数据点`);
  console.log(`      - 总访问量: ${pageViewsReport.summary.total}`);
  console.log(`      - 平均访问量: ${pageViewsReport.summary.average.toFixed(2)}`);
  console.log(`      - 趋势: ${pageViewsReport.trends.trend} (${pageViewsReport.trends.changePercent}%)`);
  
  const apiCallsReport = analyticsModule.generateAnalyticsReport('api_calls', '24h');
  console.log(`   📋 API调用报告: ${apiCallsReport.dataPoints} 个数据点`);
  console.log(`      - 总调用量: ${apiCallsReport.summary.total}`);
  console.log(`      - 平均调用量: ${apiCallsReport.summary.average.toFixed(2)}`);
  
  console.log('\n🔔 通知系统模块演示:');
  
  // 用户订阅通知
  notificationModule.subscribe(user1.userId, ['security_alert', 'system_alert']);
  notificationModule.subscribe(user2.userId, ['user_action']);
  console.log('   📝 用户订阅通知类型');
  
  // 发送各种通知
  notificationModule.sendNotification('security_alert', {
    event_type: 'suspicious_login',
    description: '检测到可疑登录活动'
  });
  
  notificationModule.sendNotification('system_alert', {
    alert_type: 'maintenance',
    message: '系统将于今晚进行维护'
  });
  
  notificationModule.sendNotification('user_action', {
    username: 'admin',
    action: '更新了系统配置'
  });
  
  console.log('   📤 发送了3条通知');
  
  // 获取用户通知
  const user1Notifications = notificationModule.getUserNotifications(user1.userId);
  console.log(`   📬 用户 ${user1.username} 收到 ${user1Notifications.length} 条通知:`);
  user1Notifications.forEach(notification => {
    console.log(`      - ${notification.title}: ${notification.message}`);
  });
  
  console.log('\n📁 文件管理模块演示:');
  
  // 模拟文件上传
  const testFileContent = Buffer.from('这是一个测试文件的内容\nTest file content for demonstration');
  
  try {
    const uploadedFile = fileModule.uploadFile(testFileContent, {
      originalName: 'test-document.txt',
      uploadedBy: user1.userId
    });
    
    console.log(`   📤 文件上传成功:`);
    console.log(`      - 文件ID: ${uploadedFile.id}`);
    console.log(`      - 原始名称: ${uploadedFile.originalName}`);
    console.log(`      - 文件大小: ${uploadedFile.size} 字节`);
    console.log(`      - MIME类型: ${uploadedFile.mimeType}`);
    
    // 获取文件信息
    const fileInfo = fileModule.getFileInfo(uploadedFile.id);
    console.log(`   📋 文件信息查询成功: ${fileInfo.originalName}`);
    
  } catch (error) {
    console.log(`   ❌ 文件操作失败: ${error.message}`);
  }
  
  // 测试不允许的文件类型
  try {
    const badFile = Buffer.from('malicious content');
    fileModule.uploadFile(badFile, {
      originalName: 'malware.exe',
      uploadedBy: user1.userId
    });
  } catch (error) {
    console.log(`   🛡️ 安全检查: ${error.message}`);
  }
  
  console.log('\n📊 生成综合功能报告...');
  
  // 等待一下让事件处理完成
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const featureReport = manager.generateFeatureReport();
  
  console.log('\n📋 功能模块综合报告:');
  console.log(`   报告时间: ${featureReport.timestamp}`);
  console.log(`   总模块数: ${featureReport.summary.totalModules}`);
  console.log(`   活跃模块: ${featureReport.summary.activeModules.join(', ')}`);
  
  console.log('\n📈 各模块统计:');
  Object.entries(featureReport.modules).forEach(([moduleName, stats]) => {
    console.log(`   ${moduleName.toUpperCase()} 模块:`);
    Object.entries(stats).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        console.log(`      ${key}: [${value.join(', ')}]`);
      } else {
        console.log(`      ${key}: ${value}`);
      }
    });
  });
  
  // 保存详细报告
  const reportPath = 'FEATURE_MODULES_REPORT.json';
  const fs = await import('fs');
  fs.writeFileSync(reportPath, JSON.stringify(featureReport, null, 2));
  console.log(`\n📄 详细报告已保存至: ${reportPath}`);
  
  console.log('\n✅ 功能模块演示完成!');
  
  return featureReport;
}

// 运行演示
runFeatureDemo().catch(console.error);