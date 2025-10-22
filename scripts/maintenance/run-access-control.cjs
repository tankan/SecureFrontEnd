/**
 * 访问控制系统演示运行器
 * 演示多因素认证、API限流、会话管理等功能
 */

const { AccessControlSystem } = require('./access-control-system.cjs');
const fs = require('fs');

async function runAccessControlDemo() {
    console.log('🔐 启动访问控制系统演示...\n');

    // 初始化访问控制系统
    const accessControl = new AccessControlSystem();
    accessControl.initialize();

    console.log('\n📋 演示场景 1: 多因素认证设置');
    console.log('=' .repeat(50));

    // 为用户设置MFA
    const userId = 'user_1';
    const mfaSetup = accessControl.mfaManager.generateTOTPSecret(userId);
    
    console.log(`✅ 为用户 ${userId} 生成MFA配置:`);
    console.log(`   🔑 TOTP密钥: ${mfaSetup.secret}`);
    console.log(`   📱 二维码URL: ${mfaSetup.qrCodeUrl}`);
    console.log(`   🔒 备用代码: ${mfaSetup.backupCodes.slice(0, 3).join(', ')}...`);

    console.log('\n📋 演示场景 2: 用户登录流程');
    console.log('=' .repeat(50));

    // 模拟登录尝试
    const deviceInfo = {
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        fingerprint: 'device_fingerprint_123'
    };

    try {
        // 第一次登录 - 需要MFA
        console.log('🔄 尝试登录 (需要MFA)...');
        await accessControl.login({
            username: 'admin',
            password: 'password123'
        }, deviceInfo);
    } catch (error) {
        console.log(`❌ 登录失败: ${error.message}`);
    }

    // 生成TOTP令牌并重试登录
    const totpToken = accessControl.mfaManager.generateTOTPToken(
        accessControl.mfaManager.totpSecrets.get('user_1'),
        Math.floor(Date.now() / 30000)
    );

    try {
        console.log('🔄 使用MFA令牌重新登录...');
        const loginResult = await accessControl.login({
            username: 'admin',
            password: 'password123',
            mfaToken: totpToken,
            deviceFingerprint: deviceInfo.fingerprint
        }, deviceInfo);
        
        console.log(`✅ 登录成功!`);
        console.log(`   👤 用户: ${loginResult.user.username}`);
        console.log(`   🎫 会话ID: ${loginResult.session.id.substring(0, 16)}...`);
        console.log(`   ⏰ 会话过期时间: ${new Date(loginResult.session.expiresAt).toLocaleString()}`);
    } catch (error) {
        console.log(`❌ 登录失败: ${error.message}`);
    }

    console.log('\n📋 演示场景 3: API限流测试');
    console.log('=' .repeat(50));

    // 模拟多次API请求
    console.log('🔄 模拟API请求限流测试...');
    
    for (let i = 1; i <= 7; i++) {
        const request = { ip: '192.168.1.200' };
        const result = accessControl.rateLimitManager.checkLimit('/api/login', request);
        
        if (result.allowed) {
            console.log(`✅ 请求 ${i}: 允许 (剩余: ${result.remaining})`);
        } else {
            console.log(`❌ 请求 ${i}: 被限流 - ${result.reason} (重试时间: ${result.retryAfter}秒)`);
        }
    }

    console.log('\n📋 演示场景 4: 会话管理');
    console.log('=' .repeat(50));

    // 创建多个会话
    console.log('🔄 创建多个用户会话...');
    
    const sessions = [];
    for (let i = 1; i <= 3; i++) {
        const session = accessControl.sessionManager.createSession(`user_${i}`, {
            ip: `192.168.1.${100 + i}`,
            userAgent: `TestAgent${i}`,
            fingerprint: `fingerprint_${i}`
        });
        sessions.push(session);
        console.log(`✅ 创建会话 ${i}: ${session.id.substring(0, 16)}... (用户: user_${i})`);
    }

    // 验证会话
    console.log('\n🔍 验证会话状态...');
    for (const session of sessions) {
        const validSession = accessControl.sessionManager.validateSession(session.id);
        if (validSession) {
            console.log(`✅ 会话 ${session.id.substring(0, 16)}... 有效`);
        } else {
            console.log(`❌ 会话 ${session.id.substring(0, 16)}... 无效或已过期`);
        }
    }

    console.log('\n📋 演示场景 5: 安全审计');
    console.log('=' .repeat(50));

    // 模拟一些安全事件
    accessControl.logAuditEvent('SUSPICIOUS_LOGIN', {
        userId: 'user_2',
        ip: '192.168.1.999',
        reason: 'Multiple failed attempts'
    });

    accessControl.logAuditEvent('PRIVILEGE_ESCALATION', {
        userId: 'user_1',
        action: 'admin_access_attempt',
        ip: '192.168.1.100'
    });

    console.log('✅ 安全审计事件已记录');

    console.log('\n📊 生成访问控制系统报告...');
    console.log('=' .repeat(50));

    const report = accessControl.generateReport();
    
    console.log('\n📈 系统摘要:');
    console.log(`   👥 总用户数: ${report.summary.totalUsers}`);
    console.log(`   🔗 活跃会话: ${report.summary.activeSessions}`);
    console.log(`   📡 总请求数: ${report.summary.totalRequests}`);
    console.log(`   🚫 被阻止请求: ${report.summary.blockedRequests}`);
    console.log(`   📝 审计事件: ${report.summary.auditEvents}`);

    console.log('\n🔒 多因素认证状态:');
    console.log(`   👤 启用MFA的用户: ${report.mfaStatus.usersWithMFA}`);
    console.log(`   📱 可信设备数: ${report.mfaStatus.trustedDevices}`);

    console.log('\n⏱️ 会话管理统计:');
    console.log(`   📊 平均会话时长: ${report.sessionManagement.averageSessionDurationMinutes} 分钟`);
    console.log(`   📱 设备类型分布:`);
    for (const [type, count] of report.sessionManagement.deviceTypes) {
        console.log(`      ${type}: ${count}`);
    }

    console.log('\n🛡️ 限流统计:');
    console.log(`   🌐 唯一IP数: ${report.rateLimiting.uniqueIPs}`);
    console.log(`   🚫 黑名单IP: ${report.rateLimiting.blacklistedIPs}`);
    console.log(`   ✅ 白名单IP: ${report.rateLimiting.whitelistedIPs}`);

    console.log(`\n🎯 安全评分: ${report.securityScore}/100`);
    
    if (report.recommendations.length > 0) {
        console.log('\n💡 安全建议:');
        report.recommendations.forEach((rec, index) => {
            const priority = rec.priority === 'high' ? '🔴' : 
                           rec.priority === 'medium' ? '🟡' : '🟢';
            console.log(`   ${priority} [${rec.category}] ${rec.message}`);
        });
    }

    console.log('\n🔧 最佳实践建议:');
    console.log('   1. 🔐 强制所有用户启用多因素认证');
    console.log('   2. 🕐 定期轮换会话密钥和令牌');
    console.log('   3. 📊 监控异常登录模式和可疑活动');
    console.log('   4. 🚫 实施基于风险的访问控制');
    console.log('   5. 📝 定期审查访问日志和权限');
    console.log('   6. 🔄 实施自动会话超时和清理');
    console.log('   7. 🛡️ 使用设备指纹识别可疑设备');

    // 保存详细报告
    const reportPath = 'ACCESS_CONTROL_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 详细报告已保存至: ${reportPath}`);

    console.log('\n🚀 集成示例:');
    console.log('=' .repeat(50));
    
    console.log(`
// Express.js 中间件集成示例
const express = require('express');
const { AccessControlSystem } = require('./access-control-system.cjs');

const app = express();
const accessControl = new AccessControlSystem();
accessControl.initialize();

// 限流中间件
app.use('/api', (req, res, next) => {
    const result = accessControl.rateLimitManager.checkLimit(req.path, req);
    if (!result.allowed) {
        return res.status(429).json({
            error: 'Too Many Requests',
            retryAfter: result.retryAfter
        });
    }
    next();
});

// 会话验证中间件
app.use('/api/protected', (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = accessControl.sessionManager.validateSession(token);
    if (!session) {
        return res.status(401).json({ error: 'Invalid session' });
    }
    req.session = session;
    next();
});

// 登录端点
app.post('/api/login', async (req, res) => {
    try {
        const result = await accessControl.login(req.body, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});
`);

    console.log('\n✅ 访问控制系统演示完成!');
    console.log('📋 主要功能:');
    console.log('   ✅ 多因素认证 (TOTP + 备用代码)');
    console.log('   ✅ 智能API限流');
    console.log('   ✅ 高级会话管理');
    console.log('   ✅ 设备指纹识别');
    console.log('   ✅ 安全审计日志');
    console.log('   ✅ 实时安全评分');
    console.log('   ✅ 自动安全建议');
    console.log('   ✅ Express.js 集成支持');
}

// 运行演示
runAccessControlDemo().catch(console.error);