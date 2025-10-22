/**
 * 功能扩展模块系统
 * 根据业务需求实现新功能模块
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * 用户管理模块
 */
class UserManagementModule extends EventEmitter {
  constructor() {
    super();
    this.users = new Map();
    this.sessions = new Map();
    this.roles = new Map();
    this.permissions = new Map();
    
    this.initializeDefaultRoles();
  }

  /**
   * 初始化默认角色
   */
  initializeDefaultRoles() {
    this.roles.set('admin', {
      name: 'Administrator',
      permissions: ['*']
    });
    
    this.roles.set('user', {
      name: 'Regular User',
      permissions: ['read', 'write_own']
    });
    
    this.roles.set('guest', {
      name: 'Guest',
      permissions: ['read']
    });
  }

  /**
   * 创建用户
   */
  createUser(userData) {
    const userId = crypto.randomUUID();
    const hashedPassword = this.hashPassword(userData.password);
    
    const user = {
      id: userId,
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || 'user',
      createdAt: new Date().toISOString(),
      isActive: true,
      profile: userData.profile || {}
    };
    
    this.users.set(userId, user);
    this.emit('userCreated', { userId, username: user.username });
    
    return { userId, username: user.username, email: user.email };
  }

  /**
   * 用户认证
   */
  authenticateUser(username, password) {
    const user = Array.from(this.users.values()).find(u => u.username === username);
    
    if (!user || !user.isActive) {
      this.emit('authenticationFailed', { username, reason: 'user_not_found' });
      return null;
    }
    
    if (!this.verifyPassword(password, user.password)) {
      this.emit('authenticationFailed', { username, reason: 'invalid_password' });
      return null;
    }
    
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      userId: user.id,
      username: user.username,
      role: user.role,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时
    };
    
    this.sessions.set(sessionId, session);
    this.emit('userAuthenticated', { userId: user.id, username, sessionId });
    
    return { sessionId, user: { id: user.id, username, email: user.email, role: user.role } };
  }

  /**
   * 验证会话
   */
  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    if (new Date() > new Date(session.expiresAt)) {
      this.sessions.delete(sessionId);
      this.emit('sessionExpired', { sessionId, userId: session.userId });
      return null;
    }
    
    return session;
  }

  /**
   * 检查权限
   */
  hasPermission(sessionId, permission) {
    const session = this.validateSession(sessionId);
    if (!session) return false;
    
    const role = this.roles.get(session.role);
    if (!role) return false;
    
    return role.permissions.includes('*') || role.permissions.includes(permission);
  }

  /**
   * 密码哈希
   */
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * 验证密码
   */
  verifyPassword(password, hashedPassword) {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }
}

/**
 * 数据分析模块
 */
class DataAnalyticsModule extends EventEmitter {
  constructor() {
    super();
    this.dataPoints = [];
    this.reports = new Map();
  }

  /**
   * 记录数据点
   */
  recordDataPoint(category, value, metadata = {}) {
    const dataPoint = {
      id: crypto.randomUUID(),
      category,
      value,
      metadata,
      timestamp: new Date().toISOString()
    };
    
    this.dataPoints.push(dataPoint);
    this.emit('dataPointRecorded', dataPoint);
    
    // 保持最近10000个数据点
    if (this.dataPoints.length > 10000) {
      this.dataPoints = this.dataPoints.slice(-10000);
    }
    
    return dataPoint.id;
  }

  /**
   * 生成分析报告
   */
  generateAnalyticsReport(category, timeRange = '24h') {
    const now = new Date();
    const timeRangeMs = this.parseTimeRange(timeRange);
    const startTime = new Date(now.getTime() - timeRangeMs);
    
    const filteredData = this.dataPoints.filter(dp => 
      dp.category === category && 
      new Date(dp.timestamp) >= startTime
    );
    
    if (filteredData.length === 0) {
      return {
        category,
        timeRange,
        dataPoints: 0,
        summary: 'No data available'
      };
    }
    
    const values = filteredData.map(dp => dp.value);
    const report = {
      category,
      timeRange,
      dataPoints: filteredData.length,
      summary: {
        total: values.reduce((sum, v) => sum + v, 0),
        average: values.reduce((sum, v) => sum + v, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        median: this.calculateMedian(values)
      },
      trends: this.calculateTrends(filteredData),
      generatedAt: new Date().toISOString()
    };
    
    const reportId = crypto.randomUUID();
    this.reports.set(reportId, report);
    this.emit('reportGenerated', { reportId, category });
    
    return report;
  }

  /**
   * 解析时间范围
   */
  parseTimeRange(timeRange) {
    const units = {
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    };
    
    const match = timeRange.match(/^(\d+)([hdw])$/);
    if (!match) return 24 * 60 * 60 * 1000; // 默认24小时
    
    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  }

  /**
   * 计算中位数
   */
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  /**
   * 计算趋势
   */
  calculateTrends(dataPoints) {
    if (dataPoints.length < 2) return { trend: 'insufficient_data' };
    
    const sortedData = dataPoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const firstHalf = sortedData.slice(0, Math.floor(sortedData.length / 2));
    const secondHalf = sortedData.slice(Math.floor(sortedData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, dp) => sum + dp.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, dp) => sum + dp.value, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    return {
      trend: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      changePercent: change.toFixed(2)
    };
  }
}

/**
 * 通知系统模块
 */
class NotificationModule extends EventEmitter {
  constructor() {
    super();
    this.notifications = [];
    this.subscriptions = new Map();
    this.templates = new Map();
    
    this.initializeDefaultTemplates();
  }

  /**
   * 初始化默认模板
   */
  initializeDefaultTemplates() {
    this.templates.set('security_alert', {
      title: '安全警报',
      template: '检测到安全事件: {{event_type}} - {{description}}'
    });
    
    this.templates.set('system_alert', {
      title: '系统警报',
      template: '系统警报: {{alert_type}} - {{message}}'
    });
    
    this.templates.set('user_action', {
      title: '用户操作',
      template: '用户 {{username}} 执行了操作: {{action}}'
    });
  }

  /**
   * 订阅通知
   */
  subscribe(userId, eventTypes) {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Set());
    }
    
    eventTypes.forEach(type => {
      this.subscriptions.get(userId).add(type);
    });
    
    this.emit('subscriptionUpdated', { userId, eventTypes });
  }

  /**
   * 发送通知
   */
  sendNotification(eventType, data, targetUsers = null) {
    const notification = {
      id: crypto.randomUUID(),
      eventType,
      data,
      timestamp: new Date().toISOString(),
      recipients: []
    };
    
    // 确定接收者
    if (targetUsers) {
      notification.recipients = targetUsers;
    } else {
      // 找到订阅此事件类型的用户
      for (const [userId, subscriptions] of this.subscriptions) {
        if (subscriptions.has(eventType)) {
          notification.recipients.push(userId);
        }
      }
    }
    
    // 生成通知内容
    const template = this.templates.get(eventType);
    if (template) {
      notification.title = template.title;
      notification.message = this.renderTemplate(template.template, data);
    } else {
      notification.title = '系统通知';
      notification.message = JSON.stringify(data);
    }
    
    this.notifications.push(notification);
    this.emit('notificationSent', notification);
    
    // 保持最近1000个通知
    if (this.notifications.length > 1000) {
      this.notifications = this.notifications.slice(-1000);
    }
    
    return notification.id;
  }

  /**
   * 渲染模板
   */
  renderTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * 获取用户通知
   */
  getUserNotifications(userId, limit = 50) {
    return this.notifications
      .filter(n => n.recipients.includes(userId))
      .slice(-limit)
      .reverse();
  }
}

/**
 * 文件管理模块
 */
class FileManagementModule extends EventEmitter {
  constructor(options = {}) {
    super();
    this.uploadDir = options.uploadDir || 'uploads';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.allowedTypes = options.allowedTypes || ['.jpg', '.jpeg', '.png', '.pdf', '.txt', '.doc', '.docx'];
    this.files = new Map();
    
    this.ensureUploadDir();
  }

  /**
   * 确保上传目录存在
   */
  ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 上传文件
   */
  uploadFile(fileData, metadata = {}) {
    const fileId = crypto.randomUUID();
    const fileName = metadata.originalName || `file_${fileId}`;
    const fileExt = path.extname(fileName).toLowerCase();
    
    // 验证文件类型
    if (!this.allowedTypes.includes(fileExt)) {
      throw new Error(`File type ${fileExt} not allowed`);
    }
    
    // 验证文件大小
    if (fileData.length > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
    }
    
    const filePath = path.join(this.uploadDir, `${fileId}${fileExt}`);
    
    // 保存文件
    fs.writeFileSync(filePath, fileData);
    
    const fileInfo = {
      id: fileId,
      originalName: fileName,
      fileName: `${fileId}${fileExt}`,
      filePath,
      size: fileData.length,
      mimeType: this.getMimeType(fileExt),
      uploadedAt: new Date().toISOString(),
      uploadedBy: metadata.uploadedBy,
      metadata
    };
    
    this.files.set(fileId, fileInfo);
    this.emit('fileUploaded', fileInfo);
    
    return fileInfo;
  }

  /**
   * 获取文件信息
   */
  getFileInfo(fileId) {
    return this.files.get(fileId);
  }

  /**
   * 删除文件
   */
  deleteFile(fileId) {
    const fileInfo = this.files.get(fileId);
    if (!fileInfo) {
      throw new Error('File not found');
    }
    
    // 删除物理文件
    if (fs.existsSync(fileInfo.filePath)) {
      fs.unlinkSync(fileInfo.filePath);
    }
    
    this.files.delete(fileId);
    this.emit('fileDeleted', { fileId, fileName: fileInfo.originalName });
    
    return true;
  }

  /**
   * 获取MIME类型
   */
  getMimeType(ext) {
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

/**
 * 主功能模块管理器
 */
class FeatureModuleManager extends EventEmitter {
  constructor() {
    super();
    this.modules = new Map();
    this.isInitialized = false;
  }

  /**
   * 初始化所有模块
   */
  initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 初始化功能模块...');
    
    // 初始化用户管理模块
    const userModule = new UserManagementModule();
    this.modules.set('user', userModule);
    
    // 初始化数据分析模块
    const analyticsModule = new DataAnalyticsModule();
    this.modules.set('analytics', analyticsModule);
    
    // 初始化通知系统模块
    const notificationModule = new NotificationModule();
    this.modules.set('notification', notificationModule);
    
    // 初始化文件管理模块
    const fileModule = new FileManagementModule();
    this.modules.set('file', fileModule);
    
    // 设置模块间的事件监听
    this.setupModuleInteractions();
    
    this.isInitialized = true;
    console.log('✅ 功能模块初始化完成');
    
    this.emit('modulesInitialized');
  }

  /**
   * 设置模块间的交互
   */
  setupModuleInteractions() {
    const userModule = this.modules.get('user');
    const analyticsModule = this.modules.get('analytics');
    const notificationModule = this.modules.get('notification');
    
    // 用户认证事件 -> 数据分析
    userModule.on('userAuthenticated', (data) => {
      analyticsModule.recordDataPoint('user_login', 1, data);
    });
    
    userModule.on('authenticationFailed', (data) => {
      analyticsModule.recordDataPoint('failed_login', 1, data);
      notificationModule.sendNotification('security_alert', {
        event_type: 'authentication_failure',
        description: `用户 ${data.username} 登录失败: ${data.reason}`
      });
    });
    
    // 用户创建事件 -> 通知
    userModule.on('userCreated', (data) => {
      notificationModule.sendNotification('user_action', {
        username: 'system',
        action: `创建新用户: ${data.username}`
      });
    });
  }

  /**
   * 获取模块
   */
  getModule(moduleName) {
    return this.modules.get(moduleName);
  }

  /**
   * 生成功能演示报告
   */
  generateFeatureReport() {
    const report = {
      timestamp: new Date().toISOString(),
      modules: {},
      summary: {
        totalModules: this.modules.size,
        activeModules: Array.from(this.modules.keys())
      }
    };
    
    // 用户模块统计
    const userModule = this.modules.get('user');
    if (userModule) {
      report.modules.user = {
        totalUsers: userModule.users.size,
        activeSessions: userModule.sessions.size,
        availableRoles: Array.from(userModule.roles.keys())
      };
    }
    
    // 分析模块统计
    const analyticsModule = this.modules.get('analytics');
    if (analyticsModule) {
      report.modules.analytics = {
        totalDataPoints: analyticsModule.dataPoints.length,
        totalReports: analyticsModule.reports.size
      };
    }
    
    // 通知模块统计
    const notificationModule = this.modules.get('notification');
    if (notificationModule) {
      report.modules.notification = {
        totalNotifications: notificationModule.notifications.length,
        totalSubscriptions: notificationModule.subscriptions.size,
        availableTemplates: Array.from(notificationModule.templates.keys())
      };
    }
    
    // 文件模块统计
    const fileModule = this.modules.get('file');
    if (fileModule) {
      report.modules.file = {
        totalFiles: fileModule.files.size,
        uploadDirectory: fileModule.uploadDir,
        allowedTypes: fileModule.allowedTypes
      };
    }
    
    return report;
  }
}

export { 
  FeatureModuleManager,
  UserManagementModule,
  DataAnalyticsModule,
  NotificationModule,
  FileManagementModule
};

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const manager = new FeatureModuleManager();
  manager.initialize();
  
  // 演示功能
  setTimeout(() => {
    const report = manager.generateFeatureReport();
    console.log('\n📊 功能模块报告:');
    console.log(JSON.stringify(report, null, 2));
  }, 1000);
}