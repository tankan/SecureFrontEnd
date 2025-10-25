#!/usr/bin/env node

/**
 * 增强测试运行器
 * 支持单元测试、集成测试、端到端测试和性能测试
 */

import { spawn, exec } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// 测试配置
const TEST_CONFIG = {
    timeout: 30000,
    coverage: true,
    watch: false,
    debug: false,
    parallel: true,
    types: {
        unit: {
            pattern: 'tests/unit/**/*.test.js',
            timeout: 5000,
            coverage: true
        },
        integration: {
            pattern: 'tests/integration/**/*.test.js',
            timeout: 15000,
            coverage: true
        },
        e2e: {
            pattern: 'tests/e2e/**/*.test.js',
            timeout: 60000,
            coverage: false
        },
        performance: {
            pattern: 'tests/.*performance-optimization\\.test\\.js',
            timeout: 30000,
            coverage: false
        },
        security: {
            pattern: 'tests/security/**/*.test.js',
            timeout: 20000,
            coverage: true
        }
    }
};

class TestRunner {
    constructor(options = {}) {
        this.options = { ...TEST_CONFIG, ...options };
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            coverage: null,
            duration: 0
        };
    }

    async run(testType = 'all') {
        console.log('🧪 启动测试运行器...\n');
        
        const startTime = Date.now();
        
        try {
            // 设置测试环境
            await this.setupTestEnvironment();
            
            // 运行指定类型的测试
            if (testType === 'all') {
                await this.runAllTests();
            } else {
                await this.runSpecificTest(testType);
            }
            
            // 生成测试报告
            this.results.duration = Date.now() - startTime;
            await this.generateReport();
            
            // 显示结果
            this.showResults();
            
            // 返回退出码
            return this.results.failed > 0 ? 1 : 0;
            
        } catch (error) {
            console.error('❌ 测试运行失败:', error.message);
            return 1;
        }
    }

    async setupTestEnvironment() {
        console.log('🔧 设置测试环境...');
        
        // 设置环境变量
        process.env.NODE_ENV = 'test';
        process.env.TEST_MODE = '1';
        
        // 检查测试依赖
        const requiredDeps = ['jest', '@types/node'];
        for (const dep of requiredDeps) {
            if (!this.checkDependency(dep)) {
                console.warn(`⚠️ 缺少测试依赖: ${dep}`);
            }
        }
        
        // 创建测试数据库
        await this.setupTestDatabase();
        
        console.log('✅ 测试环境设置完成');
    }

    checkDependency(depName) {
        try {
            const packagePath = join(projectRoot, 'package.json');
            const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
            return packageJson.dependencies?.[depName] || packageJson.devDependencies?.[depName];
        } catch {
            return false;
        }
    }

    async setupTestDatabase() {
        // 创建测试用的SQLite数据库
        const testDbPath = join(projectRoot, 'tests/fixtures/test.db');
        if (!existsSync(testDbPath)) {
            console.log('📊 创建测试数据库...');
            // 这里可以添加数据库初始化逻辑
        }
    }

    async runAllTests() {
        console.log('🚀 运行所有测试...\n');
        
        const testTypes = Object.keys(this.options.types);
        
        for (const testType of testTypes) {
            console.log(`\n📋 运行 ${testType} 测试...`);
            await this.runSpecificTest(testType);
        }
    }

    async runSpecificTest(testType) {
        const config = this.options.types[testType];
        if (!config) {
            throw new Error(`未知的测试类型: ${testType}`);
        }
        
        console.log(`🎯 执行 ${testType} 测试...`);
        
        // 构建Jest命令
        const jestArgs = this.buildJestArgs(testType, config);
        
        return new Promise((resolve, reject) => {
            const jestBin = join(projectRoot, 'node_modules', 'jest', 'bin', 'jest.js');
            const useLocalJest = existsSync(jestBin);
            const cmd = useLocalJest ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
            const args = useLocalJest ? [jestBin, ...jestArgs] : ['jest', ...jestArgs];
            
            const jestProcess = spawn(cmd, args, {
                cwd: projectRoot,
                stdio: 'pipe',
                env: {
                    ...process.env,
                    TEST_TYPE: testType
                }
            });

            let output = '';
            let errorOutput = '';

            jestProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            jestProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            jestProcess.on('close', (code) => {
                const combinedOutput = [output, errorOutput].filter(Boolean).join('\n');
                this.parseTestResults(combinedOutput, testType);
                
                if (code === 0) {
                    console.log(`✅ ${testType} 测试完成`);
                    resolve();
                } else {
                    console.error(`❌ ${testType} 测试失败 (退出码: ${code})`);
                    if (errorOutput) {
                        console.error('错误输出:', errorOutput);
                    }
                    resolve(); // 继续运行其他测试
                }
            });

            jestProcess.on('error', (error) => {
                console.error(`❌ ${testType} 测试进程错误:`, error.message);
                reject(error);
            });
        });
    }

    buildJestArgs(testType, config) {
        const args = [];
        
        // 测试模式匹配
        if (config.pattern) {
            args.push('--testPathPattern', config.pattern);
        }
        
        // 超时设置
        if (config.timeout) {
            args.push('--testTimeout', config.timeout.toString());
        }
        
        // 覆盖率设置
        if (config.coverage && this.options.coverage) {
            args.push('--coverage');
            args.push('--coverageDirectory', `coverage/${testType}`);
        }
        
        // 并行执行
        if (this.options.parallel && testType !== 'e2e') {
            args.push('--maxWorkers', '4');
        } else {
            args.push('--runInBand');
        }
        
        // 监听模式
        if (this.options.watch) {
            args.push('--watch');
        }
        
        // 详细输出
        if (this.options.debug) {
            args.push('--verbose');
        }
        
        // 静默模式（非调试时）
        if (!this.options.debug) {
            args.push('--silent');
        }

        // 无测试时通过，避免空目录导致失败
        args.push('--passWithNoTests');
        
        return args;
    }

    parseTestResults(output, testType) {
        try {
            const getLastTestsLine = () => {
                let m, last = '';
                const regex = /Tests:\s*([^\n]+)/g;
                while ((m = regex.exec(output)) !== null) {
                    last = m[1];
                }
                return last;
            };
    
            const line = getLastTestsLine();
            if (line) {
                const pick = (pat) => {
                    const m = new RegExp(pat).exec(line);
                    return m ? parseInt(m[1], 10) : 0;
                };
                const failed = pick('(\\d+)\\s+failed');
                const passed = pick('(\\d+)\\s+passed');
                const skipped = pick('(\\d+)\\s+skipped');
                const total = pick('(\\d+)\\s+total');
    
                this.results.failed += failed;
                this.results.passed += passed;
                this.results.skipped += skipped;
                this.results.total += total;
            }

            // Preserve any existing coverage parsing logic
            const lines = output.split('\n');
            
            for (const line of lines) {
                if (line.includes('Tests:')) {
                    const match = line.match(/(\d+) passed.*?(\d+) failed.*?(\d+) skipped/);
                    if (match) {
                        this.results.passed += parseInt(match[1]) || 0;
                        this.results.failed += parseInt(match[2]) || 0;
                        this.results.skipped += parseInt(match[3]) || 0;
                    }
                }
                
                if (line.includes('Test Suites:')) {
                    const match = line.match(/(\d+) total/);
                    if (match) {
                        this.results.total += parseInt(match[1]) || 0;
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ 解析测试结果失败:', error.message);
        }
    }

    async generateReport() {
        console.log('\n📊 生成测试报告...');
        
        const report = {
            timestamp: new Date().toISOString(),
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                testMode: process.env.NODE_ENV
            },
            results: this.results,
            configuration: this.options
        };
        
        // 保存JSON报告
        const reportPath = join(projectRoot, 'reports/system/TEST_REPORT.json');
        writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // 生成HTML报告
        await this.generateHtmlReport(report);
        
        console.log(`✅ 测试报告已保存: ${reportPath}`);
    }

    async generateHtmlReport(report) {
        const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试报告 - SecureFrontEnd</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .metric { text-align: center; padding: 20px; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 10px; }
        .metric-label { color: #666; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .total { color: #007bff; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745 0%, #20c997 100%); transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 测试报告</h1>
            <p>SecureFrontEnd 项目测试结果</p>
            <p>生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}</p>
        </div>
        
        <div class="grid">
            <div class="card metric">
                <div class="metric-value total">${report.results.total}</div>
                <div class="metric-label">总测试数</div>
            </div>
            <div class="card metric">
                <div class="metric-value passed">${report.results.passed}</div>
                <div class="metric-label">通过</div>
            </div>
            <div class="card metric">
                <div class="metric-value failed">${report.results.failed}</div>
                <div class="metric-label">失败</div>
            </div>
            <div class="card metric">
                <div class="metric-value skipped">${report.results.skipped}</div>
                <div class="metric-label">跳过</div>
            </div>
        </div>
        
        <div class="card">
            <h3>📈 测试通过率</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${report.results.total > 0 ? (report.results.passed / report.results.total * 100) : 0}%"></div>
            </div>
            <p>通过率: ${report.results.total > 0 ? Math.round(report.results.passed / report.results.total * 100) : 0}%</p>
        </div>
        
        <div class="card">
            <h3>⚙️ 测试环境</h3>
            <p><strong>Node.js版本:</strong> ${report.environment.nodeVersion}</p>
            <p><strong>平台:</strong> ${report.environment.platform}</p>
            <p><strong>测试模式:</strong> ${report.environment.testMode}</p>
            <p><strong>执行时间:</strong> ${Math.round(report.results.duration / 1000)}秒</p>
        </div>
        
        <div class="card">
            <h3>🔧 测试配置</h3>
            <pre>${JSON.stringify(report.configuration, null, 2)}</pre>
        </div>
    </div>
</body>
</html>`;
        
        const htmlPath = join(projectRoot, 'reports/system/TEST_REPORT.html');
        writeFileSync(htmlPath, htmlContent);
    }

    showResults() {
        console.log('\n📊 测试结果汇总:');
        console.log('==========================================');
        console.log(`总测试数: ${this.results.total}`);
        console.log(`✅ 通过: ${this.results.passed}`);
        console.log(`❌ 失败: ${this.results.failed}`);
        console.log(`⏭️ 跳过: ${this.results.skipped}`);
        console.log(`⏱️ 耗时: ${Math.round(this.results.duration / 1000)}秒`);
        
        if (this.results.total > 0) {
            const passRate = Math.round(this.results.passed / this.results.total * 100);
            console.log(`📈 通过率: ${passRate}%`);
            
            if (passRate >= 90) {
                console.log('🎉 测试通过率优秀!');
            } else if (passRate >= 70) {
                console.log('👍 测试通过率良好');
            } else {
                console.log('⚠️ 测试通过率需要改进');
            }
        }
        
        console.log('==========================================\n');
    }
}

// 命令行接口
if (__filename === process.argv[1]) {
    const args = process.argv.slice(2);
    const testType = args[0] || 'all';
    
    const options = {
        watch: args.includes('--watch'),
        debug: args.includes('--debug'),
        coverage: !args.includes('--no-coverage'),
        parallel: !args.includes('--no-parallel')
    };
    
    const runner = new TestRunner(options);
    runner.run(testType).then(exitCode => {
        process.exit(exitCode);
    }).catch(error => {
        console.error('❌ 测试运行器错误:', error);
        process.exit(1);
    });
}

export default TestRunner;