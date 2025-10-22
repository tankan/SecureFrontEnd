/**
 * 强化安全头配置系统
 * 提供CSP、HSTS、X-Frame-Options等高级安全头配置
 */

const fs = require('fs');
const crypto = require('crypto');

/**
 * 安全头配置管理器
 */
class SecurityHeadersManager {
  constructor(options = {}) {
    this.config = {
      environment: options.environment || 'production', // development, staging, production
      enableCSP: options.enableCSP !== false,
      enableHSTS: options.enableHSTS !== false,
      enableFrameOptions: options.enableFrameOptions !== false,
      enableContentTypeOptions: options.enableContentTypeOptions !== false,
      enableReferrerPolicy: options.enableReferrerPolicy !== false,
      enablePermissionsPolicy: options.enablePermissionsPolicy !== false,
      customHeaders: options.customHeaders || {},
      ...options
    };
    
    this.nonces = new Map(); // 存储CSP nonce
    this.violations = []; // CSP违规记录
    this.headerStats = new Map(); // 头部统计
  }

  /**
   * 生成CSP nonce
   */
  generateNonce() {
    const nonce = crypto.randomBytes(16).toString('base64');
    const timestamp = Date.now();
    
    this.nonces.set(nonce, {
      timestamp,
      used: false
    });
    
    // 清理过期的nonce（1小时）
    this.cleanupExpiredNonces();
    
    return nonce;
  }

  /**
   * 清理过期的nonce
   */
  cleanupExpiredNonces() {
    const now = Date.now();
    const expireTime = 60 * 60 * 1000; // 1小时
    
    for (const [nonce, data] of this.nonces) {
      if (now - data.timestamp > expireTime) {
        this.nonces.delete(nonce);
      }
    }
  }

  /**
   * 验证nonce
   */
  validateNonce(nonce) {
    const nonceData = this.nonces.get(nonce);
    if (!nonceData) return false;
    
    if (nonceData.used) return false;
    
    // 标记为已使用
    nonceData.used = true;
    return true;
  }

  /**
   * 生成内容安全策略 (CSP)
   */
  generateCSP(options = {}) {
    const nonce = this.generateNonce();
    
    const cspConfig = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        ...(this.config.environment === 'development' ? ["'unsafe-eval'"] : [])
      ],
      'style-src': [
        "'self'",
        `'nonce-${nonce}'`,
        "'unsafe-inline'" // 某些CSS框架需要
      ],
      'img-src': [
        "'self'",
        'data:',
        'https:'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'https://fonts.googleapis.com'
      ],
      'connect-src': [
        "'self'",
        ...(this.config.environment === 'development' ? ['ws:', 'wss:'] : [])
      ],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': [],
      'block-all-mixed-content': [],
      ...options.customDirectives
    };

    // 构建CSP字符串
    const cspParts = [];
    for (const [directive, sources] of Object.entries(cspConfig)) {
      if (sources.length === 0) {
        cspParts.push(directive);
      } else {
        cspParts.push(`${directive} ${sources.join(' ')}`);
      }
    }

    const cspHeader = cspParts.join('; ');
    
    // 记录统计
    this.recordHeaderUsage('Content-Security-Policy');
    
    return {
      header: cspHeader,
      nonce: nonce
    };
  }

  /**
   * 生成HTTP严格传输安全 (HSTS)
   */
  generateHSTS(options = {}) {
    const config = {
      maxAge: options.maxAge || 31536000, // 1年
      includeSubDomains: options.includeSubDomains !== false,
      preload: options.preload !== false,
      ...options
    };

    let hstsHeader = `max-age=${config.maxAge}`;
    
    if (config.includeSubDomains) {
      hstsHeader += '; includeSubDomains';
    }
    
    if (config.preload) {
      hstsHeader += '; preload';
    }

    this.recordHeaderUsage('Strict-Transport-Security');
    return hstsHeader;
  }

  /**
   * 生成X-Frame-Options
   */
  generateFrameOptions(options = {}) {
    const policy = options.policy || 'DENY'; // DENY, SAMEORIGIN, ALLOW-FROM
    
    let header = policy;
    if (policy === 'ALLOW-FROM' && options.uri) {
      header += ` ${options.uri}`;
    }

    this.recordHeaderUsage('X-Frame-Options');
    return header;
  }

  /**
   * 生成X-Content-Type-Options
   */
  generateContentTypeOptions() {
    this.recordHeaderUsage('X-Content-Type-Options');
    return 'nosniff';
  }

  /**
   * 生成Referrer-Policy
   */
  generateReferrerPolicy(options = {}) {
    const policy = options.policy || 'strict-origin-when-cross-origin';
    
    // 可选策略: no-referrer, no-referrer-when-downgrade, origin, 
    // origin-when-cross-origin, same-origin, strict-origin, 
    // strict-origin-when-cross-origin, unsafe-url
    
    this.recordHeaderUsage('Referrer-Policy');
    return policy;
  }

  /**
   * 生成Permissions-Policy (Feature-Policy的继任者)
   */
  generatePermissionsPolicy(options = {}) {
    const defaultPolicies = {
      camera: ['self'],
      microphone: ['self'],
      geolocation: ['self'],
      payment: ['self'],
      usb: [],
      magnetometer: [],
      gyroscope: [],
      accelerometer: [],
      'ambient-light-sensor': [],
      autoplay: ['self'],
      'encrypted-media': ['self'],
      fullscreen: ['self'],
      'picture-in-picture': ['self'],
      ...options.policies
    };

    const policyParts = [];
    for (const [feature, allowlist] of Object.entries(defaultPolicies)) {
      if (allowlist.length === 0) {
        policyParts.push(`${feature}=()`);
      } else {
        const origins = allowlist.map(origin => 
          origin === 'self' ? '"self"' : origin
        ).join(' ');
        policyParts.push(`${feature}=(${origins})`);
      }
    }

    this.recordHeaderUsage('Permissions-Policy');
    return policyParts.join(', ');
  }

  /**
   * 生成X-XSS-Protection (已弃用，但某些旧浏览器仍需要)
   */
  generateXSSProtection() {
    this.recordHeaderUsage('X-XSS-Protection');
    return '1; mode=block';
  }

  /**
   * 生成Cross-Origin-Embedder-Policy
   */
  generateCOEP(options = {}) {
    const policy = options.policy || 'require-corp';
    this.recordHeaderUsage('Cross-Origin-Embedder-Policy');
    return policy;
  }

  /**
   * 生成Cross-Origin-Opener-Policy
   */
  generateCOOP(options = {}) {
    const policy = options.policy || 'same-origin';
    this.recordHeaderUsage('Cross-Origin-Opener-Policy');
    return policy;
  }

  /**
   * 生成Cross-Origin-Resource-Policy
   */
  generateCORP(options = {}) {
    const policy = options.policy || 'same-origin';
    this.recordHeaderUsage('Cross-Origin-Resource-Policy');
    return policy;
  }

  /**
   * 生成完整的安全头集合
   */
  generateSecurityHeaders(options = {}) {
    const headers = {};
    const cspResult = this.generateCSP(options.csp);

    // 基础安全头
    if (this.config.enableCSP) {
      headers['Content-Security-Policy'] = cspResult.header;
    }

    if (this.config.enableHSTS) {
      headers['Strict-Transport-Security'] = this.generateHSTS(options.hsts);
    }

    if (this.config.enableFrameOptions) {
      headers['X-Frame-Options'] = this.generateFrameOptions(options.frameOptions);
    }

    if (this.config.enableContentTypeOptions) {
      headers['X-Content-Type-Options'] = this.generateContentTypeOptions();
    }

    if (this.config.enableReferrerPolicy) {
      headers['Referrer-Policy'] = this.generateReferrerPolicy(options.referrerPolicy);
    }

    if (this.config.enablePermissionsPolicy) {
      headers['Permissions-Policy'] = this.generatePermissionsPolicy(options.permissionsPolicy);
    }

    // 高级安全头
    headers['X-XSS-Protection'] = this.generateXSSProtection();
    headers['Cross-Origin-Embedder-Policy'] = this.generateCOEP(options.coep);
    headers['Cross-Origin-Opener-Policy'] = this.generateCOOP(options.coop);
    headers['Cross-Origin-Resource-Policy'] = this.generateCORP(options.corp);

    // 自定义头
    Object.assign(headers, this.config.customHeaders);

    return {
      headers,
      nonce: cspResult.nonce
    };
  }

  /**
   * 记录CSP违规
   */
  recordCSPViolation(violation) {
    const violationRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      documentUri: violation['document-uri'],
      violatedDirective: violation['violated-directive'],
      blockedUri: violation['blocked-uri'],
      sourceFile: violation['source-file'],
      lineNumber: violation['line-number'],
      columnNumber: violation['column-number'],
      originalPolicy: violation['original-policy']
    };

    this.violations.push(violationRecord);

    // 保持最近1000个违规记录
    if (this.violations.length > 1000) {
      this.violations = this.violations.slice(-1000);
    }

    console.log(`🚨 CSP违规: ${violation['violated-directive']} - ${violation['blocked-uri']}`);
    return violationRecord;
  }

  /**
   * 记录头部使用统计
   */
  recordHeaderUsage(headerName) {
    if (!this.headerStats.has(headerName)) {
      this.headerStats.set(headerName, {
        count: 0,
        firstUsed: Date.now(),
        lastUsed: Date.now()
      });
    }

    const stats = this.headerStats.get(headerName);
    stats.count++;
    stats.lastUsed = Date.now();
  }

  /**
   * 分析CSP违规模式
   */
  analyzeCSPViolations() {
    const analysis = {
      timestamp: Date.now(),
      totalViolations: this.violations.length,
      violationsByDirective: {},
      violationsBySource: {},
      topViolatedDirectives: [],
      topBlockedUris: [],
      recommendations: []
    };

    // 按指令分组
    this.violations.forEach(violation => {
      const directive = violation.violatedDirective;
      analysis.violationsByDirective[directive] = 
        (analysis.violationsByDirective[directive] || 0) + 1;
    });

    // 按来源分组
    this.violations.forEach(violation => {
      const source = violation.blockedUri || 'unknown';
      analysis.violationsBySource[source] = 
        (analysis.violationsBySource[source] || 0) + 1;
    });

    // 排序获取Top违规
    analysis.topViolatedDirectives = Object.entries(analysis.violationsByDirective)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([directive, count]) => ({ directive, count }));

    analysis.topBlockedUris = Object.entries(analysis.violationsBySource)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([uri, count]) => ({ uri, count }));

    // 生成建议
    analysis.recommendations = this.generateCSPRecommendations(analysis);

    return analysis;
  }

  /**
   * 生成CSP优化建议
   */
  generateCSPRecommendations(analysis) {
    const recommendations = [];

    // 检查常见违规
    if (analysis.violationsByDirective['script-src']) {
      recommendations.push('考虑使用nonce或hash来允许内联脚本，而不是unsafe-inline');
    }

    if (analysis.violationsByDirective['style-src']) {
      recommendations.push('考虑将内联样式移到外部文件或使用nonce');
    }

    if (analysis.violationsByDirective['img-src']) {
      recommendations.push('检查图片来源，考虑添加可信的CDN域名');
    }

    // 检查外部资源
    const externalSources = analysis.topBlockedUris.filter(item => 
      item.uri.startsWith('http') && !item.uri.includes(this.config.domain)
    );

    if (externalSources.length > 0) {
      recommendations.push('审查外部资源依赖，考虑将其添加到CSP白名单或寻找替代方案');
    }

    return recommendations;
  }

  /**
   * 生成安全头配置报告
   */
  generateSecurityReport() {
    const cspAnalysis = this.analyzeCSPViolations();
    
    const report = {
      timestamp: Date.now(),
      configuration: {
        environment: this.config.environment,
        enabledHeaders: Object.keys(this.config).filter(key => 
          key.startsWith('enable') && this.config[key]
        )
      },
      usage: {
        headerStats: Object.fromEntries(
          Array.from(this.headerStats.entries()).map(([header, stats]) => [
            header,
            {
              usageCount: stats.count,
              firstUsed: new Date(stats.firstUsed).toISOString(),
              lastUsed: new Date(stats.lastUsed).toISOString()
            }
          ])
        ),
        nonceGenerated: this.nonces.size,
        activeNonces: Array.from(this.nonces.values()).filter(n => !n.used).length
      },
      cspAnalysis,
      securityScore: this.calculateSecurityScore(),
      recommendations: this.generateSecurityRecommendations()
    };

    return report;
  }

  /**
   * 计算安全评分
   */
  calculateSecurityScore() {
    let score = 0;
    const maxScore = 100;

    // 基础安全头 (60分)
    if (this.config.enableCSP) score += 20;
    if (this.config.enableHSTS) score += 15;
    if (this.config.enableFrameOptions) score += 10;
    if (this.config.enableContentTypeOptions) score += 8;
    if (this.config.enableReferrerPolicy) score += 7;

    // 高级安全头 (30分)
    if (this.config.enablePermissionsPolicy) score += 10;
    if (this.headerStats.has('Cross-Origin-Embedder-Policy')) score += 7;
    if (this.headerStats.has('Cross-Origin-Opener-Policy')) score += 7;
    if (this.headerStats.has('Cross-Origin-Resource-Policy')) score += 6;

    // CSP质量评估 (10分)
    const cspViolationRate = this.violations.length / Math.max(1, this.headerStats.get('Content-Security-Policy')?.count || 1);
    if (cspViolationRate < 0.01) score += 10;
    else if (cspViolationRate < 0.05) score += 7;
    else if (cspViolationRate < 0.1) score += 5;
    else if (cspViolationRate < 0.2) score += 3;

    return Math.min(score, maxScore);
  }

  /**
   * 生成安全建议
   */
  generateSecurityRecommendations() {
    const recommendations = [];
    const score = this.calculateSecurityScore();

    if (score < 80) {
      if (!this.config.enableCSP) {
        recommendations.push('启用内容安全策略(CSP)以防止XSS攻击');
      }
      
      if (!this.config.enableHSTS) {
        recommendations.push('启用HTTP严格传输安全(HSTS)以强制HTTPS连接');
      }
      
      if (!this.config.enablePermissionsPolicy) {
        recommendations.push('配置权限策略以控制浏览器功能访问');
      }
    }

    if (this.violations.length > 10) {
      recommendations.push('优化CSP策略以减少违规报告');
    }

    if (this.config.environment === 'production' && this.config.enableCSP) {
      const hasUnsafeEval = this.headerStats.has('Content-Security-Policy');
      if (hasUnsafeEval) {
        recommendations.push('生产环境中移除unsafe-eval指令');
      }
    }

    return recommendations;
  }

  /**
   * Express.js中间件
   */
  expressMiddleware(options = {}) {
    return (req, res, next) => {
      const result = this.generateSecurityHeaders(options);
      
      // 设置安全头
      Object.entries(result.headers).forEach(([name, value]) => {
        res.setHeader(name, value);
      });

      // 将nonce添加到res.locals供模板使用
      if (res.locals) {
        res.locals.nonce = result.nonce;
      }

      next();
    };
  }

  /**
   * CSP违规报告处理中间件
   */
  cspReportMiddleware() {
    return (req, res, next) => {
      if (req.path === '/csp-report' && req.method === 'POST') {
        try {
          const violation = req.body;
          this.recordCSPViolation(violation);
          res.status(204).send();
        } catch (error) {
          console.error('CSP报告处理错误:', error);
          res.status(400).send('Invalid CSP report');
        }
      } else {
        next();
      }
    };
  }
}

/**
 * 安全头测试器
 */
class SecurityHeadersTester {
  constructor(headerManager) {
    this.headerManager = headerManager;
  }

  /**
   * 测试安全头配置
   */
  testSecurityHeaders() {
    console.log('🧪 开始测试安全头配置...\n');

    const testResults = {
      timestamp: Date.now(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    // 测试CSP
    this.testCSP(testResults);
    
    // 测试HSTS
    this.testHSTS(testResults);
    
    // 测试Frame Options
    this.testFrameOptions(testResults);
    
    // 测试其他安全头
    this.testOtherHeaders(testResults);

    // 计算摘要
    testResults.summary.total = testResults.tests.length;
    testResults.summary.passed = testResults.tests.filter(t => t.status === 'passed').length;
    testResults.summary.failed = testResults.tests.filter(t => t.status === 'failed').length;
    testResults.summary.warnings = testResults.tests.filter(t => t.status === 'warning').length;

    return testResults;
  }

  testCSP(testResults) {
    const csp = this.headerManager.generateCSP();
    
    // 测试CSP是否包含基本指令
    this.addTest(testResults, 'CSP包含default-src', 
      csp.header.includes('default-src'), 
      'CSP应该包含default-src指令');

    this.addTest(testResults, 'CSP包含script-src', 
      csp.header.includes('script-src'), 
      'CSP应该包含script-src指令');

    this.addTest(testResults, 'CSP使用nonce', 
      csp.header.includes('nonce-'), 
      'CSP应该使用nonce来允许内联脚本');

    this.addTest(testResults, 'CSP禁用unsafe-eval (生产环境)', 
      this.headerManager.config.environment !== 'production' || !csp.header.includes('unsafe-eval'), 
      '生产环境不应使用unsafe-eval');
  }

  testHSTS(testResults) {
    const hsts = this.headerManager.generateHSTS();
    
    this.addTest(testResults, 'HSTS包含max-age', 
      hsts.includes('max-age='), 
      'HSTS应该包含max-age指令');

    this.addTest(testResults, 'HSTS包含includeSubDomains', 
      hsts.includes('includeSubDomains'), 
      'HSTS应该包含includeSubDomains以保护子域名');

    this.addTest(testResults, 'HSTS max-age足够长', 
      /max-age=(\d+)/.test(hsts) && parseInt(hsts.match(/max-age=(\d+)/)[1]) >= 31536000, 
      'HSTS max-age应该至少为1年(31536000秒)');
  }

  testFrameOptions(testResults) {
    const frameOptions = this.headerManager.generateFrameOptions();
    
    this.addTest(testResults, 'Frame Options设置正确', 
      ['DENY', 'SAMEORIGIN'].includes(frameOptions) || frameOptions.startsWith('ALLOW-FROM'), 
      'X-Frame-Options应该设置为DENY、SAMEORIGIN或ALLOW-FROM');
  }

  testOtherHeaders(testResults) {
    const contentTypeOptions = this.headerManager.generateContentTypeOptions();
    const referrerPolicy = this.headerManager.generateReferrerPolicy();
    
    this.addTest(testResults, 'Content-Type-Options设置为nosniff', 
      contentTypeOptions === 'nosniff', 
      'X-Content-Type-Options应该设置为nosniff');

    this.addTest(testResults, 'Referrer-Policy配置正确', 
      ['strict-origin-when-cross-origin', 'strict-origin', 'same-origin'].includes(referrerPolicy), 
      'Referrer-Policy应该使用安全的策略');
  }

  addTest(testResults, name, condition, message) {
    const test = {
      name,
      status: condition ? 'passed' : 'failed',
      message,
      timestamp: Date.now()
    };
    
    testResults.tests.push(test);
    
    const icon = condition ? '✅' : '❌';
    console.log(`${icon} ${name}: ${message}`);
  }
}

module.exports = {
  SecurityHeadersManager,
  SecurityHeadersTester
};