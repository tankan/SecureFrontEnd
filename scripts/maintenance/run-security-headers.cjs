/**
 * 安全头配置系统演示运行器
 * 演示强化的安全头配置功能
 */

const fs = require('fs');
const { SecurityHeadersManager, SecurityHeadersTester } = require('../../config/security/security-headers-config.cjs');

/**
 * 安全头配置演示
 */
class SecurityHeadersDemo {
  constructor() {
    this.headerManager = null;
    this.tester = null;
  }

  /**
   * 运行完整演示
   */
  async runDemo() {
    console.log('🔒 安全头配置系统演示');
    console.log('=' .repeat(50));
    console.log();

    try {
      // 1. 初始化安全头管理器
      await this.initializeHeaderManager();
      
      // 2. 演示基础安全头生成
      await this.demonstrateBasicHeaders();
      
      // 3. 演示高级安全头配置
      await this.demonstrateAdvancedHeaders();
      
      // 4. 演示CSP违规处理
      await this.demonstrateCSPViolations();
      
      // 5. 运行安全头测试
      await this.runSecurityTests();
      
      // 6. 生成配置报告
      await this.generateConfigurationReport();
      
      console.log('\n✅ 安全头配置系统演示完成!');
      
    } catch (error) {
      console.error('❌ 演示过程中发生错误:', error.message);
      throw error;
    }
  }

  /**
   * 初始化安全头管理器
   */
  async initializeHeaderManager() {
    console.log('📋 1. 初始化安全头管理器...');
    
    // 生产环境配置
    const productionConfig = {
      environment: 'production',
      enableCSP: true,
      enableHSTS: true,
      enableFrameOptions: true,
      enableContentTypeOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: true,
      customHeaders: {
        'X-Powered-By': 'SecureFrontEnd/1.0',
        'Server': 'nginx/1.20.1'
      }
    };

    this.headerManager = new SecurityHeadersManager(productionConfig);
    this.tester = new SecurityHeadersTester(this.headerManager);
    
    console.log('✅ 安全头管理器初始化完成');
    console.log(`   - 环境: ${this.headerManager.config.environment}`);
    console.log(`   - 启用的安全头: ${Object.keys(this.headerManager.config).filter(k => k.startsWith('enable') && this.headerManager.config[k]).length}个`);
    console.log();
  }

  /**
   * 演示基础安全头生成
   */
  async demonstrateBasicHeaders() {
    console.log('🛡️ 2. 演示基础安全头生成...');
    
    // 生成CSP
    const cspResult = this.headerManager.generateCSP();
    console.log('📝 内容安全策略 (CSP):');
    console.log(`   Header: ${cspResult.header.substring(0, 100)}...`);
    console.log(`   Nonce: ${cspResult.nonce}`);
    
    // 生成HSTS
    const hsts = this.headerManager.generateHSTS({
      maxAge: 31536000, // 1年
      includeSubDomains: true,
      preload: true
    });
    console.log(`📝 HTTP严格传输安全 (HSTS): ${hsts}`);
    
    // 生成Frame Options
    const frameOptions = this.headerManager.generateFrameOptions({ policy: 'DENY' });
    console.log(`📝 X-Frame-Options: ${frameOptions}`);
    
    // 生成其他基础头
    const contentType = this.headerManager.generateContentTypeOptions();
    const referrer = this.headerManager.generateReferrerPolicy();
    
    console.log(`📝 X-Content-Type-Options: ${contentType}`);
    console.log(`📝 Referrer-Policy: ${referrer}`);
    console.log();
  }

  /**
   * 演示高级安全头配置
   */
  async demonstrateAdvancedHeaders() {
    console.log('🔧 3. 演示高级安全头配置...');
    
    // 生成权限策略
    const permissionsPolicy = this.headerManager.generatePermissionsPolicy({
      policies: {
        camera: [],
        microphone: [],
        geolocation: ['self'],
        payment: ['self'],
        autoplay: ['self']
      }
    });
    console.log('📝 权限策略 (Permissions-Policy):');
    console.log(`   ${permissionsPolicy.substring(0, 80)}...`);
    
    // 生成跨域策略
    const coep = this.headerManager.generateCOEP();
    const coop = this.headerManager.generateCOOP();
    const corp = this.headerManager.generateCORP();
    
    console.log(`📝 Cross-Origin-Embedder-Policy: ${coep}`);
    console.log(`📝 Cross-Origin-Opener-Policy: ${coop}`);
    console.log(`📝 Cross-Origin-Resource-Policy: ${corp}`);
    
    // 生成完整安全头集合
    const securityHeaders = this.headerManager.generateSecurityHeaders();
    console.log(`📊 生成的安全头总数: ${Object.keys(securityHeaders.headers).length}个`);
    console.log(`📊 当前nonce: ${securityHeaders.nonce}`);
    console.log();
  }

  /**
   * 演示CSP违规处理
   */
  async demonstrateCSPViolations() {
    console.log('⚠️ 4. 演示CSP违规处理...');
    
    // 模拟CSP违规报告
    const violations = [
      {
        'document-uri': 'https://example.com/page1',
        'violated-directive': 'script-src',
        'blocked-uri': 'https://malicious-site.com/script.js',
        'source-file': 'https://example.com/page1',
        'line-number': 42,
        'column-number': 15,
        'original-policy': 'script-src \'self\''
      },
      {
        'document-uri': 'https://example.com/page2',
        'violated-directive': 'img-src',
        'blocked-uri': 'http://insecure-cdn.com/image.jpg',
        'source-file': 'https://example.com/page2',
        'line-number': 28,
        'column-number': 8,
        'original-policy': 'img-src \'self\' https:'
      },
      {
        'document-uri': 'https://example.com/page3',
        'violated-directive': 'style-src',
        'blocked-uri': 'inline',
        'source-file': 'https://example.com/page3',
        'line-number': 15,
        'column-number': 1,
        'original-policy': 'style-src \'self\''
      }
    ];

    violations.forEach((violation, index) => {
      const record = this.headerManager.recordCSPViolation(violation);
      console.log(`📋 违规记录 ${index + 1}: ${record.id.substring(0, 8)}...`);
    });

    // 分析违规模式
    const analysis = this.headerManager.analyzeCSPViolations();
    console.log(`📊 违规分析:`);
    console.log(`   - 总违规数: ${analysis.totalViolations}`);
    console.log(`   - 主要违规指令: ${analysis.topViolatedDirectives.map(d => d.directive).join(', ')}`);
    console.log(`   - 建议数量: ${analysis.recommendations.length}`);
    console.log();
  }

  /**
   * 运行安全头测试
   */
  async runSecurityTests() {
    console.log('🧪 5. 运行安全头测试...');
    
    const testResults = this.tester.testSecurityHeaders();
    
    console.log(`\n📊 测试摘要:`);
    console.log(`   - 总测试数: ${testResults.summary.total}`);
    console.log(`   - 通过: ${testResults.summary.passed}`);
    console.log(`   - 失败: ${testResults.summary.failed}`);
    console.log(`   - 警告: ${testResults.summary.warnings}`);
    
    const successRate = (testResults.summary.passed / testResults.summary.total * 100).toFixed(1);
    console.log(`   - 成功率: ${successRate}%`);
    console.log();
  }

  /**
   * 生成配置报告
   */
  async generateConfigurationReport() {
    console.log('📄 6. 生成安全头配置报告...');
    
    const report = this.headerManager.generateSecurityReport();
    
    console.log(`📊 安全评分: ${report.securityScore}/100`);
    console.log(`📊 启用的安全头: ${report.configuration.enabledHeaders.length}个`);
    console.log(`📊 头部使用统计: ${Object.keys(report.usage.headerStats).length}个头部被使用`);
    console.log(`📊 生成的nonce数: ${report.usage.nonceGenerated}`);
    console.log(`📊 活跃nonce数: ${report.usage.activeNonces}`);
    
    if (report.recommendations.length > 0) {
      console.log(`💡 安全建议:`);
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    // 保存详细报告
    const reportPath = 'SECURITY_HEADERS_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📁 详细报告已保存至: ${reportPath}`);
    console.log();
  }

  /**
   * 演示Express中间件集成
   */
  demonstrateExpressIntegration() {
    console.log('🔗 Express.js 集成示例:');
    console.log(`
const express = require('express');
const { SecurityHeadersManager } = require('./security-headers-config');

const app = express();
const headerManager = new SecurityHeadersManager({
  environment: 'production'
});

// 应用安全头中间件
app.use(headerManager.expressMiddleware());

// CSP违规报告处理
app.use(headerManager.cspReportMiddleware());

// 在模板中使用nonce
app.get('/', (req, res) => {
  res.render('index', { 
    nonce: res.locals.nonce 
  });
});
    `);
  }
}

/**
 * 运行演示
 */
async function runSecurityHeadersDemo() {
  const demo = new SecurityHeadersDemo();
  
  try {
    await demo.runDemo();
    demo.demonstrateExpressIntegration();
    
    console.log('🎉 安全头配置系统演示成功完成!');
    console.log('📋 主要功能:');
    console.log('   ✅ CSP (内容安全策略) 配置和nonce生成');
    console.log('   ✅ HSTS (HTTP严格传输安全) 配置');
    console.log('   ✅ X-Frame-Options 防点击劫持');
    console.log('   ✅ 权限策略和跨域策略配置');
    console.log('   ✅ CSP违规监控和分析');
    console.log('   ✅ 安全头测试和评分');
    console.log('   ✅ Express.js 中间件集成');
    
  } catch (error) {
    console.error('❌ 演示失败:', error);
    process.exit(1);
  }
}

// 运行演示
if (require.main === module) {
  runSecurityHeadersDemo();
}

module.exports = { SecurityHeadersDemo };