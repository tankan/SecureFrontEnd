/**
 * 增强访问控制系统
 * 包含多因素认证、API限流、会话管理优化等功能
 */

const crypto = require('crypto');
const fs = require('fs');

/**
 * 多因素认证管理器
 */
class MFAManager {
    constructor() {
        this.totpSecrets = new Map();
        this.backupCodes = new Map();
        this.trustedDevices = new Map();
    }

    /**
     * 生成TOTP密钥
     */
    generateTOTPSecret(userId) {
        const secret = crypto.randomBytes(20).toString('hex');

        this.totpSecrets.set(userId, secret);

        // 生成备用代码
        const backupCodes = Array.from({ length: 10 }, () =>
            crypto.randomBytes(4).toString('hex').toUpperCase()
        );

        this.backupCodes.set(userId, backupCodes);

        return {
            secret,
            qrCodeUrl: `otpauth://totp/SecureApp:${userId}?secret=${secret}&issuer=SecureApp`,
            backupCodes
        };
    }

    /**
     * 验证TOTP代码
     */
    verifyTOTP(userId, token) {
        const secret = this.totpSecrets.get(userId);

        if (!secret) return false;

        // 模拟TOTP验证（实际应用中使用专门的TOTP库）
        const timeWindow = Math.floor(Date.now() / 30000);
        const expectedToken = this.generateTOTPToken(secret, timeWindow);

        return token === expectedToken ||
               token === this.generateTOTPToken(secret, timeWindow - 1) ||
               token === this.generateTOTPToken(secret, timeWindow + 1);
    }

    /**
     * 生成TOTP令牌（简化版）
     */
    generateTOTPToken(secret, timeWindow) {
        const hash = crypto.createHmac('sha1', secret)
            .update(timeWindow.toString())
            .digest('hex');

        return hash.substring(0, 6).toUpperCase();
    }

    /**
     * 验证备用代码
     */
    verifyBackupCode(userId, code) {
        const codes = this.backupCodes.get(userId);

        if (!codes || !codes.includes(code)) return false;

        // 使用后移除备用代码
        const index = codes.indexOf(code);

        codes.splice(index, 1);
        this.backupCodes.set(userId, codes);

        return true;
    }

    /**
     * 添加可信设备
     */
    addTrustedDevice(userId, deviceFingerprint) {
        if (!this.trustedDevices.has(userId)) {
            this.trustedDevices.set(userId, new Set());
        }
        this.trustedDevices.get(userId).add(deviceFingerprint);
    }

    /**
     * 检查设备是否可信
     */
    isTrustedDevice(userId, deviceFingerprint) {
        const devices = this.trustedDevices.get(userId);

        return devices && devices.has(deviceFingerprint);
    }
}

/**
 * API限流管理器
 */
class RateLimitManager {
    constructor() {
        this.requests = new Map();
        this.rules = new Map();
        this.blacklist = new Set();
        this.whitelist = new Set();
    }

    /**
     * 设置限流规则
     */
    setRule(endpoint, options = {}) {
        const rule = {
            windowMs: options.windowMs || 60000, // 1分钟
            maxRequests: options.maxRequests || 100,
            skipSuccessfulRequests: options.skipSuccessfulRequests || false,
            skipFailedRequests: options.skipFailedRequests || false,
            keyGenerator: options.keyGenerator || (req => req.ip),
            onLimitReached: options.onLimitReached || (() => {}),
            ...options
        };

        this.rules.set(endpoint, rule);
    }

    /**
     * 检查请求是否被限流
     */
    checkLimit(endpoint, request) {
        const rule = this.rules.get(endpoint) || this.rules.get('*');

        if (!rule) return { allowed: true };

        const key = rule.keyGenerator(request);

        // 检查黑白名单
        if (this.blacklist.has(key)) {
            return { allowed: false, reason: 'IP blacklisted' };
        }
        if (this.whitelist.has(key)) {
            return { allowed: true, reason: 'IP whitelisted' };
        }

        const now = Date.now();
        const windowStart = now - rule.windowMs;

        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }

        const userRequests = this.requests.get(key);

        // 清理过期请求
        const validRequests = userRequests.filter(req => req.timestamp > windowStart);

        this.requests.set(key, validRequests);

        if (validRequests.length >= rule.maxRequests) {
            rule.onLimitReached(request);

            return {
                allowed: false,
                reason: 'Rate limit exceeded',
                retryAfter: Math.ceil((validRequests[0].timestamp + rule.windowMs - now) / 1000)
            };
        }

        // 记录请求
        validRequests.push({
            timestamp: now,
            endpoint,
            success: true
        });

        return {
            allowed: true,
            remaining: rule.maxRequests - validRequests.length,
            resetTime: windowStart + rule.windowMs
        };
    }

    /**
     * 添加到黑名单
     */
    addToBlacklist(ip) {
        this.blacklist.add(ip);
    }

    /**
     * 添加到白名单
     */
    addToWhitelist(ip) {
        this.whitelist.add(ip);
    }

    /**
     * 获取限流统计
     */
    getStats() {
        const stats = {
            totalRequests: 0,
            blockedRequests: 0,
            uniqueIPs: this.requests.size,
            blacklistedIPs: this.blacklist.size,
            whitelistedIPs: this.whitelist.size,
            topEndpoints: new Map(),
            topIPs: new Map()
        };

        for (const [ip, requests] of this.requests) {
            stats.totalRequests += requests.length;
            stats.topIPs.set(ip, requests.length);

            for (const req of requests) {
                const count = stats.topEndpoints.get(req.endpoint) || 0;

                stats.topEndpoints.set(req.endpoint, count + 1);
            }
        }

        return stats;
    }
}

/**
 * 会话管理器
 */
class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.config = {
            maxAge: 24 * 60 * 60 * 1000, // 24小时
            renewThreshold: 30 * 60 * 1000, // 30分钟
            maxConcurrentSessions: 5,
            secureOnly: true,
            httpOnly: true,
            sameSite: 'strict'
        };
    }

    /**
     * 创建会话
     */
    createSession(userId, deviceInfo = {}) {
        const sessionId = crypto.randomBytes(32).toString('hex');
        const now = Date.now();

        const session = {
            id: sessionId,
            userId,
            createdAt: now,
            lastAccessedAt: now,
            expiresAt: now + this.config.maxAge,
            deviceInfo: {
                userAgent: deviceInfo.userAgent || '',
                ip: deviceInfo.ip || '',
                fingerprint: deviceInfo.fingerprint || '',
                ...deviceInfo
            },
            isActive: true,
            permissions: new Set(),
            metadata: {}
        };

        // 检查并清理过期会话
        this.cleanupExpiredSessions(userId);

        // 检查并发会话限制
        this.enforceConcurrentSessionLimit(userId);

        this.sessions.set(sessionId, session);

        return session;
    }

    /**
     * 验证会话
     */
    validateSession(sessionId) {
        const session = this.sessions.get(sessionId);

        if (!session) return null;

        const now = Date.now();

        // 检查会话是否过期
        if (now > session.expiresAt || !session.isActive) {
            this.destroySession(sessionId);

            return null;
        }

        // 更新最后访问时间
        session.lastAccessedAt = now;

        // 检查是否需要续期
        if (session.expiresAt - now < this.config.renewThreshold) {
            session.expiresAt = now + this.config.maxAge;
        }

        return session;
    }

    /**
     * 销毁会话
     */
    destroySession(sessionId) {
        return this.sessions.delete(sessionId);
    }

    /**
     * 销毁用户所有会话
     */
    destroyAllUserSessions(userId) {
        let count = 0;

        for (const [sessionId, session] of this.sessions) {
            if (session.userId === userId) {
                this.sessions.delete(sessionId);
                count++;
            }
        }

        return count;
    }

    /**
     * 清理过期会话
     */
    cleanupExpiredSessions(userId = null) {
        const now = Date.now();
        let cleaned = 0;

        for (const [sessionId, session] of this.sessions) {
            if (userId && session.userId !== userId) continue;

            if (now > session.expiresAt || !session.isActive) {
                this.sessions.delete(sessionId);
                cleaned++;
            }
        }

        return cleaned;
    }

    /**
     * 强制执行并发会话限制
     */
    enforceConcurrentSessionLimit(userId) {
        const userSessions = Array.from(this.sessions.values())
            .filter(s => s.userId === userId && s.isActive)
            .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);

        if (userSessions.length >= this.config.maxConcurrentSessions) {
            // 移除最旧的会话
            const sessionsToRemove = userSessions.slice(this.config.maxConcurrentSessions - 1);

            for (const session of sessionsToRemove) {
                this.destroySession(session.id);
            }
        }
    }

    /**
     * 获取用户活跃会话
     */
    getUserActiveSessions(userId) {
        return Array.from(this.sessions.values())
            .filter(s => s.userId === userId && s.isActive);
    }

    /**
     * 获取会话统计
     */
    getSessionStats() {
        const now = Date.now();
        const stats = {
            totalSessions: this.sessions.size,
            activeSessions: 0,
            expiredSessions: 0,
            userSessions: new Map(),
            deviceTypes: new Map(),
            averageSessionDuration: 0
        };

        let totalDuration = 0;

        for (const session of this.sessions.values()) {
            if (session.isActive && now <= session.expiresAt) {
                stats.activeSessions++;
                totalDuration += now - session.createdAt;
            } else {
                stats.expiredSessions++;
            }

            // 用户会话统计
            const userCount = stats.userSessions.get(session.userId) || 0;

            stats.userSessions.set(session.userId, userCount + 1);

            // 设备类型统计
            const deviceType = this.getDeviceType(session.deviceInfo.userAgent);
            const deviceCount = stats.deviceTypes.get(deviceType) || 0;

            stats.deviceTypes.set(deviceType, deviceCount + 1);
        }

        if (stats.activeSessions > 0) {
            stats.averageSessionDuration = Math.round(totalDuration / stats.activeSessions);
        }

        return stats;
    }

    /**
     * 获取设备类型
     */
    getDeviceType(userAgent) {
        if (!userAgent) return 'unknown';

        const ua = userAgent.toLowerCase();

        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return 'mobile';
        } if (ua.includes('tablet') || ua.includes('ipad')) {
            return 'tablet';
        }

        return 'desktop';
    }
}

/**
 * 访问控制系统主类
 */
class AccessControlSystem {
    constructor() {
        this.mfaManager = new MFAManager();
        this.rateLimitManager = new RateLimitManager();
        this.sessionManager = new SessionManager();
        this.auditLog = [];
    }

    /**
     * 初始化系统
     */
    initialize() {
        // 设置默认限流规则
        this.rateLimitManager.setRule('/api/login', {
            windowMs: 15 * 60 * 1000, // 15分钟
            maxRequests: 5, // 最多5次登录尝试
            onLimitReached: req => {
                this.logAuditEvent('RATE_LIMIT_EXCEEDED', {
                    endpoint: '/api/login',
                    ip: req.ip,
                    timestamp: Date.now()
                });
            }
        });

        this.rateLimitManager.setRule('/api/*', {
            windowMs: 60 * 1000, // 1分钟
            maxRequests: 100 // 通用API限制
        });

        console.log('✅ 访问控制系统初始化完成');
    }

    /**
     * 用户登录流程
     */
    async login(credentials, deviceInfo) {
        const { username, password, mfaToken, deviceFingerprint } = credentials;

        // 检查登录限流
        const rateLimitResult = this.rateLimitManager.checkLimit('/api/login', {
            ip: deviceInfo.ip
        });

        if (!rateLimitResult.allowed) {
            this.logAuditEvent('LOGIN_RATE_LIMITED', {
                username,
                ip: deviceInfo.ip,
                reason: rateLimitResult.reason
            });
            throw new Error(`登录被限流: ${rateLimitResult.reason}`);
        }

        // 模拟用户验证
        const user = this.authenticateUser(username, password);

        if (!user) {
            this.logAuditEvent('LOGIN_FAILED', { username, ip: deviceInfo.ip });
            throw new Error('用户名或密码错误');
        }

        // MFA验证
        if (user.mfaEnabled) {
            const isTrusted = this.mfaManager.isTrustedDevice(user.id, deviceFingerprint);

            if (!isTrusted && !mfaToken) {
                throw new Error('需要多因素认证');
            }

            if (!isTrusted && !this.mfaManager.verifyTOTP(user.id, mfaToken)) {
                this.logAuditEvent('MFA_FAILED', { userId: user.id, ip: deviceInfo.ip });
                throw new Error('多因素认证失败');
            }
        }

        // 创建会话
        const session = this.sessionManager.createSession(user.id, deviceInfo);

        this.logAuditEvent('LOGIN_SUCCESS', {
            userId: user.id,
            sessionId: session.id,
            ip: deviceInfo.ip
        });

        return {
            user,
            session,
            token: session.id
        };
    }

    /**
     * 模拟用户认证
     */
    authenticateUser(username, password) {
        // 模拟用户数据
        const users = {
            admin: { id: 'user_1', username: 'admin', mfaEnabled: true },
            user: { id: 'user_2', username: 'user', mfaEnabled: false }
        };

        return users[username] || null;
    }

    /**
     * 记录审计日志
     */
    logAuditEvent(event, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            data,
            id: crypto.randomUUID()
        };

        this.auditLog.push(logEntry);
        console.log(`🔍 审计日志: ${event}`, data);
    }

    /**
     * 生成访问控制报告
     */
    generateReport() {
        const sessionStats = this.sessionManager.getSessionStats();
        const rateLimitStats = this.rateLimitManager.getStats();

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalUsers: sessionStats.userSessions.size,
                activeSessions: sessionStats.activeSessions,
                totalRequests: rateLimitStats.totalRequests,
                blockedRequests: rateLimitStats.blockedRequests,
                auditEvents: this.auditLog.length
            },
            sessionManagement: {
                ...sessionStats,
                averageSessionDurationMinutes: Math.round(sessionStats.averageSessionDuration / 60000)
            },
            rateLimiting: rateLimitStats,
            mfaStatus: {
                usersWithMFA: this.mfaManager.totpSecrets.size,
                trustedDevices: Array.from(this.mfaManager.trustedDevices.values())
                    .reduce((sum, devices) => sum + devices.size, 0)
            },
            recentAuditEvents: this.auditLog.slice(-10),
            securityScore: this.calculateSecurityScore(),
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    /**
     * 计算安全评分
     */
    calculateSecurityScore() {
        let score = 0;
        const maxScore = 100;

        // MFA启用率 (30分)
        const mfaScore = Math.min(30, (this.mfaManager.totpSecrets.size / Math.max(1, this.sessionManager.getSessionStats().userSessions.size)) * 30);

        score += mfaScore;

        // 会话管理 (25分)
        const sessionScore = this.sessionManager.sessions.size > 0 ? 25 : 0;

        score += sessionScore;

        // 限流配置 (25分)
        const rateLimitScore = this.rateLimitManager.rules.size > 0 ? 25 : 0;

        score += rateLimitScore;

        // 审计日志 (20分)
        const auditScore = this.auditLog.length > 0 ? 20 : 0;

        score += auditScore;

        return Math.round(score);
    }

    /**
     * 生成安全建议
     */
    generateRecommendations() {
        const recommendations = [];
        const sessionStats = this.sessionManager.getSessionStats();

        if (this.mfaManager.totpSecrets.size === 0) {
            recommendations.push({
                priority: 'high',
                category: 'MFA',
                message: '建议为所有用户启用多因素认证'
            });
        }

        if (sessionStats.activeSessions > sessionStats.userSessions.size * 3) {
            recommendations.push({
                priority: 'medium',
                category: 'Session',
                message: '检测到异常多的活跃会话，建议审查会话管理策略'
            });
        }

        if (this.rateLimitManager.blacklist.size === 0) {
            recommendations.push({
                priority: 'low',
                category: 'RateLimit',
                message: '考虑实施IP黑名单机制以阻止恶意请求'
            });
        }

        return recommendations;
    }
}

module.exports = {
    AccessControlSystem,
    MFAManager,
    RateLimitManager,
    SessionManager
};
