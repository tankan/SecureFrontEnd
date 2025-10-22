/**
 * 安全审计脚本
 * 执行全面的安全检查，包括代码审查、配置检查、依赖项分析等
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SecurityAuditor {
  constructor() {
    this.auditResults = [];
    this.securityIssues = [];
    this.recommendations = [];
  }

  /**
   * 记录审计结果
   */
  recordAudit(category, item, status, severity, description, recommendation = '') {
    const result = {
      category,
      item,
      status, // 'pass', 'fail', 'warning'
      severity, // 'critical', 'high', 'medium', 'low'
      description,
      recommendation,
      timestamp: new Date().toISOString()
    };
    
    this.auditResults.push(result);
    
    if (status === 'fail') {
      this.securityIssues.push(result);
    }
    
    if (recommendation) {
      this.recommendations.push(result);
    }
    
    const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    const severityIcon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
    
    console.log(`${statusIcon} ${severityIcon} [${category}] ${item}: ${description}`);
    if (recommendation) {
      console.log(`   💡 建议: ${recommendation}`);
    }
  }

  /**
   * 检查文件权限和敏感文件
   */
  async auditFilePermissions() {
    console.log('\n🔍 检查文件权限和敏感文件...');
    
    const sensitiveFiles = [
      '.env',
      '.env.local',
      '.env.production',
      'config/database.js',
      'config/secrets.js',
      'private.key',
      'server.key'
    ];
    
    for (const file of sensitiveFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        this.recordAudit(
          '文件安全',
          file,
          'warning',
          'medium',
          '发现敏感文件',
          '确保敏感文件不被提交到版本控制系统'
        );
      }
    }
    
    // 检查.gitignore
    const gitignorePath = path.join(__dirname, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      const requiredIgnores = ['.env', 'node_modules', '*.log', '*.key'];
      
      for (const ignore of requiredIgnores) {
        if (!gitignoreContent.includes(ignore)) {
          this.recordAudit(
            '版本控制',
            '.gitignore',
            'fail',
            'medium',
            `缺少必要的忽略规则: ${ignore}`,
            `在.gitignore中添加 ${ignore}`
          );
        }
      }
    }
  }

  /**
   * 检查加密配置
   */
  async auditCryptoConfiguration() {
    console.log('\n🔐 检查加密配置...');
    
    try {
      const encryptionPath = path.join(__dirname, 'src/core/encryption.js');
      if (fs.existsSync(encryptionPath)) {
        const encryptionCode = fs.readFileSync(encryptionPath, 'utf8');
        
        // 检查是否使用了强加密算法
        if (encryptionCode.includes('aes-256-gcm')) {
          this.recordAudit(
            '加密算法',
            'AES-256-GCM',
            'pass',
            'low',
            '使用了安全的AES-256-GCM加密算法'
          );
        }
        
        // 检查是否有硬编码的密钥
        const hardcodedKeyPatterns = [
          /key\s*=\s*['"][^'"]{16,}['"]/gi,
          /password\s*=\s*['"][^'"]+['"]/gi,
          /secret\s*=\s*['"][^'"]+['"]/gi
        ];
        
        for (const pattern of hardcodedKeyPatterns) {
          if (pattern.test(encryptionCode)) {
            this.recordAudit(
              '密钥管理',
              '硬编码密钥',
              'fail',
              'critical',
              '发现可能的硬编码密钥',
              '使用环境变量或密钥管理服务存储敏感信息'
            );
          }
        }
        
        // 检查随机数生成
        if (encryptionCode.includes('crypto.randomBytes')) {
          this.recordAudit(
            '随机数生成',
            'crypto.randomBytes',
            'pass',
            'low',
            '使用了安全的随机数生成器'
          );
        }
      }
    } catch (error) {
      this.recordAudit(
        '加密配置',
        '文件检查',
        'fail',
        'medium',
        `无法检查加密配置: ${error.message}`
      );
    }
  }

  /**
   * 检查网络安全配置
   */
  async auditNetworkSecurity() {
    console.log('\n🌐 检查网络安全配置...');
    
    try {
      const serverPath = path.join(__dirname, 'server/index.js');
      if (fs.existsSync(serverPath)) {
        const serverCode = fs.readFileSync(serverPath, 'utf8');
        
        // 检查HTTPS配置
        if (serverCode.includes('https') || serverCode.includes('ssl')) {
          this.recordAudit(
            '网络安全',
            'HTTPS',
            'pass',
            'low',
            '配置了HTTPS支持'
          );
        } else {
          this.recordAudit(
            '网络安全',
            'HTTPS',
            'fail',
            'high',
            '未配置HTTPS',
            '在生产环境中启用HTTPS'
          );
        }
        
        // 检查CORS配置
        if (serverCode.includes('cors')) {
          this.recordAudit(
            '网络安全',
            'CORS',
            'pass',
            'low',
            '配置了CORS'
          );
        }
        
        // 检查安全头
        if (serverCode.includes('helmet')) {
          this.recordAudit(
            '网络安全',
            '安全头',
            'pass',
            'low',
            '使用了Helmet安全中间件'
          );
        } else {
          this.recordAudit(
            '网络安全',
            '安全头',
            'warning',
            'medium',
            '未使用安全头中间件',
            '添加Helmet中间件以设置安全HTTP头'
          );
        }
      }
    } catch (error) {
      this.recordAudit(
        '网络安全',
        '配置检查',
        'fail',
        'medium',
        `无法检查网络安全配置: ${error.message}`
      );
    }
  }

  /**
   * 检查输入验证
   */
  async auditInputValidation() {
    console.log('\n🛡️ 检查输入验证...');
    
    try {
      const routesDir = path.join(__dirname, 'server/routes');
      if (fs.existsSync(routesDir)) {
        const routeFiles = fs.readdirSync(routesDir);
        
        for (const file of routeFiles) {
          const filePath = path.join(routesDir, file);
          const routeCode = fs.readFileSync(filePath, 'utf8');
          
          // 检查是否使用了验证库
          if (routeCode.includes('joi') || routeCode.includes('validator')) {
            this.recordAudit(
              '输入验证',
              file,
              'pass',
              'low',
              '使用了输入验证库'
            );
          } else {
            this.recordAudit(
              '输入验证',
              file,
              'warning',
              'medium',
              '可能缺少输入验证',
              '添加输入验证以防止注入攻击'
            );
          }
        }
      }
    } catch (error) {
      this.recordAudit(
        '输入验证',
        '检查失败',
        'fail',
        'medium',
        `无法检查输入验证: ${error.message}`
      );
    }
  }

  /**
   * 检查认证和授权
   */
  async auditAuthenticationAuthorization() {
    console.log('\n🔑 检查认证和授权...');
    
    try {
      const authPath = path.join(__dirname, 'server/middleware/auth.js');
      if (fs.existsSync(authPath)) {
        const authCode = fs.readFileSync(authPath, 'utf8');
        
        // 检查JWT配置
        if (authCode.includes('jwt') || authCode.includes('jsonwebtoken')) {
          this.recordAudit(
            '认证',
            'JWT',
            'pass',
            'low',
            '使用了JWT认证'
          );
        }
        
        // 检查密码哈希
        if (authCode.includes('bcrypt') || authCode.includes('scrypt')) {
          this.recordAudit(
            '认证',
            '密码哈希',
            'pass',
            'low',
            '使用了安全的密码哈希算法'
          );
        }
        
        // 检查会话管理
        if (authCode.includes('session')) {
          this.recordAudit(
            '认证',
            '会话管理',
            'pass',
            'low',
            '实现了会话管理'
          );
        }
      } else {
        this.recordAudit(
          '认证',
          '认证中间件',
          'warning',
          'high',
          '未找到认证中间件',
          '实现适当的认证和授权机制'
        );
      }
    } catch (error) {
      this.recordAudit(
        '认证授权',
        '检查失败',
        'fail',
        'medium',
        `无法检查认证授权: ${error.message}`
      );
    }
  }

  /**
   * 检查日志和监控
   */
  async auditLoggingMonitoring() {
    console.log('\n📊 检查日志和监控...');
    
    try {
      const packagePath = path.join(__dirname, 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const dependencies = { ...packageContent.dependencies, ...packageContent.devDependencies };
        
        // 检查日志库
        if (dependencies.winston || dependencies.morgan) {
          this.recordAudit(
            '日志记录',
            '日志库',
            'pass',
            'low',
            '使用了专业的日志库'
          );
        } else {
          this.recordAudit(
            '日志记录',
            '日志库',
            'warning',
            'medium',
            '未使用专业日志库',
            '添加Winston或Morgan等日志库'
          );
        }
        
        // 检查监控工具
        const monitoringTools = ['prometheus', 'newrelic', 'datadog'];
        const hasMonitoring = monitoringTools.some(tool => dependencies[tool]);
        
        if (hasMonitoring) {
          this.recordAudit(
            '监控',
            '监控工具',
            'pass',
            'low',
            '配置了监控工具'
          );
        } else {
          this.recordAudit(
            '监控',
            '监控工具',
            'warning',
            'low',
            '未配置监控工具',
            '考虑添加应用性能监控'
          );
        }
      }
    } catch (error) {
      this.recordAudit(
        '日志监控',
        '检查失败',
        'fail',
        'medium',
        `无法检查日志监控配置: ${error.message}`
      );
    }
  }

  /**
   * 检查Docker安全配置
   */
  async auditDockerSecurity() {
    console.log('\n🐳 检查Docker安全配置...');
    
    try {
      const dockerfilePath = path.join(__dirname, 'config/docker/Dockerfile');
    if (fs.existsSync(dockerfilePath)) {
        const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
        
        // 检查基础镜像
        if (dockerfileContent.includes('FROM node:') && !dockerfileContent.includes('alpine')) {
          this.recordAudit(
            'Docker安全',
            '基础镜像',
            'warning',
            'medium',
            '使用了较大的基础镜像',
            '考虑使用Alpine Linux基础镜像减少攻击面'
          );
        }
        
        // 检查用户权限
        if (dockerfileContent.includes('USER ') && !dockerfileContent.includes('USER root')) {
          this.recordAudit(
            'Docker安全',
            '用户权限',
            'pass',
            'low',
            '使用了非root用户运行容器'
          );
        } else {
          this.recordAudit(
            'Docker安全',
            '用户权限',
            'fail',
            'high',
            '容器可能以root用户运行',
            '创建并使用非特权用户运行应用'
          );
        }
        
        // 检查健康检查
        if (dockerfileContent.includes('HEALTHCHECK')) {
          this.recordAudit(
            'Docker安全',
            '健康检查',
            'pass',
            'low',
            '配置了健康检查'
          );
        } else {
          this.recordAudit(
            'Docker安全',
            '健康检查',
            'warning',
            'low',
            '未配置健康检查',
            '添加HEALTHCHECK指令监控容器状态'
          );
        }
      }
    } catch (error) {
      this.recordAudit(
        'Docker安全',
        '检查失败',
        'fail',
        'medium',
        `无法检查Docker配置: ${error.message}`
      );
    }
  }

  /**
   * 生成安全审计报告
   */
  generateSecurityReport() {
    console.log('\n📋 生成安全审计报告...');
    
    const totalChecks = this.auditResults.length;
    const passedChecks = this.auditResults.filter(r => r.status === 'pass').length;
    const failedChecks = this.auditResults.filter(r => r.status === 'fail').length;
    const warningChecks = this.auditResults.filter(r => r.status === 'warning').length;
    
    const criticalIssues = this.securityIssues.filter(i => i.severity === 'critical').length;
    const highIssues = this.securityIssues.filter(i => i.severity === 'high').length;
    const mediumIssues = this.securityIssues.filter(i => i.severity === 'medium').length;
    const lowIssues = this.securityIssues.filter(i => i.severity === 'low').length;
    
    const securityScore = Math.round((passedChecks / totalChecks) * 100);
    
    const report = {
      summary: {
        totalChecks,
        passedChecks,
        failedChecks,
        warningChecks,
        securityScore,
        securityLevel: securityScore >= 90 ? '优秀' : securityScore >= 80 ? '良好' : securityScore >= 70 ? '一般' : '需要改进'
      },
      issues: {
        critical: criticalIssues,
        high: highIssues,
        medium: mediumIssues,
        low: lowIssues
      },
      details: this.auditResults,
      recommendations: this.recommendations
    };
    
    console.log('\n📊 安全审计总结:');
    console.log(`   总检查项: ${totalChecks}`);
    console.log(`   通过: ${passedChecks} ✅`);
    console.log(`   失败: ${failedChecks} ❌`);
    console.log(`   警告: ${warningChecks} ⚠️`);
    console.log(`   安全评分: ${securityScore}/100`);
    console.log(`   安全等级: ${report.summary.securityLevel}`);
    
    if (criticalIssues > 0) {
      console.log(`\n🔴 关键问题: ${criticalIssues} 个 - 需要立即处理`);
    }
    if (highIssues > 0) {
      console.log(`🟠 高危问题: ${highIssues} 个 - 需要优先处理`);
    }
    if (mediumIssues > 0) {
      console.log(`🟡 中等问题: ${mediumIssues} 个 - 建议处理`);
    }
    
    return report;
  }

  /**
   * 执行完整的安全审计
   */
  async runFullSecurityAudit() {
    console.log('🔒 开始全面安全审计...\n');
    
    await this.auditFilePermissions();
    await this.auditCryptoConfiguration();
    await this.auditNetworkSecurity();
    await this.auditInputValidation();
    await this.auditAuthenticationAuthorization();
    await this.auditLoggingMonitoring();
    await this.auditDockerSecurity();
    
    return this.generateSecurityReport();
  }
}

// 执行安全审计
async function runSecurityAudit() {
  const auditor = new SecurityAuditor();
  const report = await auditor.runFullSecurityAudit();
  
  // 保存报告到文件
  const reportPath = path.join(__dirname, 'SECURITY_AUDIT_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 详细报告已保存到: ${reportPath}`);
  
  return report;
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  runSecurityAudit().catch(console.error);
}

export { SecurityAuditor, runSecurityAudit };