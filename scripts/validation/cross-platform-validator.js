#!/usr/bin/env node

/**
 * SecureFrontEnd 跨平台环境一致性验证器
 * 确保开发、测试、生产环境的一致性
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { createHash } from 'crypto';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// 颜色定义
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// 日志函数
const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${new Date().toISOString()} - ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${new Date().toISOString()} - ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${new Date().toISOString()} - ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${new Date().toISOString()} - ${msg}`),
    debug: (msg) => console.log(`${colors.magenta}[DEBUG]${colors.reset} ${new Date().toISOString()} - ${msg}`)
};

// 验证器类
class CrossPlatformValidator {
    constructor(options = {}) {
        this.options = {
            environment: options.environment || 'development',
            verbose: options.verbose || false,
            outputFile: options.outputFile || null,
            skipDocker: options.skipDocker || false,
            ...options
        };

        this.results = {
            timestamp: new Date().toISOString(),
            environment: this.options.environment,
            platform: {
                os: os.platform(),
                arch: os.arch(),
                release: os.release(),
                nodeVersion: process.version
            },
            checks: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
    }

    // 执行命令并返回结果
    async execCommand(command, options = {}) {
        try {
            const result = execSync(command, {
                encoding: 'utf8',
                timeout: 30000,
                ...options
            });
            return { success: true, output: result.trim() };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                output: error.stdout ? error.stdout.trim() : ''
            };
        }
    }

    // 添加检查结果
    addCheck(name, status, message, details = {}) {
        const check = {
            name,
            status, // 'pass', 'fail', 'warn'
            message,
            details,
            timestamp: new Date().toISOString()
        };

        this.results.checks.push(check);
        this.results.summary.total++;

        switch (status) {
            case 'pass':
                this.results.summary.passed++;
                if (this.options.verbose) log.success(`✓ ${name}: ${message}`);
                break;
            case 'fail':
                this.results.summary.failed++;
                log.error(`✗ ${name}: ${message}`);
                break;
            case 'warn':
                this.results.summary.warnings++;
                log.warn(`⚠ ${name}: ${message}`);
                break;
        }
    }

    // 检查Node.js版本
    async checkNodeVersion() {
        log.info('检查Node.js版本...');

        const currentVersion = process.version;
        const packageJson = JSON.parse(
            await fs.readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf8')
        );

        const requiredVersion = packageJson.engines?.node;

        if (!requiredVersion) {
            this.addCheck(
                'Node.js版本',
                'warn',
                `当前版本: ${currentVersion}，但package.json中未指定版本要求`
            );
            return;
        }

        // 简单的版本比较（实际项目中应使用semver库）
        const current = currentVersion.replace('v', '');
        const required = requiredVersion.replace(/[>=^~]/, '');

        if (current >= required) {
            this.addCheck(
                'Node.js版本',
                'pass',
                `版本符合要求: ${currentVersion} >= ${requiredVersion}`
            );
        } else {
            this.addCheck(
                'Node.js版本',
                'fail',
                `版本不符合要求: ${currentVersion} < ${requiredVersion}`
            );
        }
    }

    // 检查npm版本
    async checkNpmVersion() {
        log.info('检查npm版本...');

        const result = await this.execCommand('npm --version');

        if (!result.success) {
            this.addCheck('npm版本', 'fail', 'npm未安装或不可用');
            return;
        }

        const version = result.output;
        const majorVersion = parseInt(version.split('.')[0]);

        if (majorVersion >= 8) {
            this.addCheck('npm版本', 'pass', `版本: ${version}`);
        } else {
            this.addCheck('npm版本', 'warn', `版本较低: ${version}，建议升级到10.9.1+`);
        }
    }

    // 检查Docker
    async checkDocker() {
        if (this.options.skipDocker) {
            log.info('跳过Docker检查');
            return;
        }

        log.info('检查Docker...');

        // 检查Docker是否安装
        const dockerResult = await this.execCommand('docker --version');
        if (!dockerResult.success) {
            this.addCheck('Docker', 'fail', 'Docker未安装或不可用');
            return;
        }

        // 检查Docker Compose
        const composeResult = await this.execCommand('docker-compose --version');
        if (!composeResult.success) {
            this.addCheck('Docker Compose', 'fail', 'Docker Compose未安装或不可用');
            return;
        }

        // 检查Docker服务状态
        const statusResult = await this.execCommand('docker info');
        if (!statusResult.success) {
            this.addCheck('Docker服务', 'fail', 'Docker服务未运行');
            return;
        }

        this.addCheck('Docker', 'pass', `版本: ${dockerResult.output}`);
        this.addCheck('Docker Compose', 'pass', `版本: ${composeResult.output}`);
        this.addCheck('Docker服务', 'pass', 'Docker服务正常运行');
    }

    // 检查环境变量
    async checkEnvironmentVariables() {
        log.info('检查环境变量...');

        const envFile = path.join(PROJECT_ROOT, `.env.${this.options.environment}`);

        try {
            const envContent = await fs.readFile(envFile, 'utf8');
            const envVars = envContent
                .split('\n')
                .filter(line => line.trim() && !line.startsWith('#'))
                .map(line => line.split('=')[0]);

            const missingVars = [];
            const presentVars = [];

            for (const varName of envVars) {
                if (process.env[varName]) {
                    presentVars.push(varName);
                } else {
                    missingVars.push(varName);
                }
            }

            if (missingVars.length === 0) {
                this.addCheck(
                    '环境变量',
                    'pass',
                    `所有必需的环境变量都已设置 (${presentVars.length}个)`
                );
            } else {
                this.addCheck(
                    '环境变量',
                    'warn',
                    `缺少环境变量: ${missingVars.join(', ')}`,
                    { missing: missingVars, present: presentVars }
                );
            }
        } catch (error) {
            this.addCheck(
                '环境变量',
                'fail',
                `无法读取环境配置文件: ${envFile}`
            );
        }
    }

    // 检查依赖项
    async checkDependencies() {
        log.info('检查项目依赖...');

        try {
            const packageJson = JSON.parse(
                await fs.readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf8')
            );

            // 检查node_modules是否存在
            try {
                await fs.access(path.join(PROJECT_ROOT, 'node_modules'));
                this.addCheck('依赖安装', 'pass', 'node_modules目录存在');
            } catch {
                this.addCheck('依赖安装', 'fail', 'node_modules目录不存在，请运行npm install');
                return;
            }

            // 检查关键依赖
            const criticalDeps = ['express', 'dotenv'];
            const missingDeps = [];

            for (const dep of criticalDeps) {
                try {
                    await fs.access(path.join(PROJECT_ROOT, 'node_modules', dep));
                } catch {
                    missingDeps.push(dep);
                }
            }

            if (missingDeps.length === 0) {
                this.addCheck('关键依赖', 'pass', '所有关键依赖都已安装');
            } else {
                this.addCheck(
                    '关键依赖',
                    'fail',
                    `缺少关键依赖: ${missingDeps.join(', ')}`
                );
            }

        } catch (error) {
            this.addCheck('依赖检查', 'fail', `无法读取package.json: ${error.message}`);
        }
    }

    // 检查文件权限（Linux/macOS）
    async checkFilePermissions() {
        if (os.platform() === 'win32') {
            log.info('Windows平台，跳过文件权限检查');
            return;
        }

        log.info('检查文件权限...');

        const scriptsToCheck = [
            'scripts/dev-linux.sh',
            'scripts/deploy/deploy-linux.sh',
            'scripts/deploy/environment-verification.sh',
            'docker/entrypoint.sh'
        ];

        let executableCount = 0;
        let nonExecutableCount = 0;

        for (const script of scriptsToCheck) {
            const scriptPath = path.join(PROJECT_ROOT, script);

            try {
                const stats = await fs.stat(scriptPath);
                const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;

                if (isExecutable) {
                    executableCount++;
                } else {
                    nonExecutableCount++;
                    log.warn(`脚本不可执行: ${script}`);
                }
            } catch (error) {
                log.warn(`脚本文件不存在: ${script}`);
            }
        }

        if (nonExecutableCount === 0) {
            this.addCheck('文件权限', 'pass', `所有脚本都具有执行权限 (${executableCount}个)`);
        } else {
            this.addCheck(
                '文件权限',
                'warn',
                `${nonExecutableCount}个脚本缺少执行权限`,
                { executable: executableCount, nonExecutable: nonExecutableCount }
            );
        }
    }

    // 检查路径分隔符
    async checkPathSeparators() {
        log.info('检查路径分隔符使用...');

        const filesToCheck = [
            'src/**/*.js',
            'config/**/*.json',
            'scripts/**/*.js'
        ];

        let windowsPathCount = 0;
        let totalFiles = 0;

        // 这里简化实现，实际项目中应使用glob库
        const checkFile = async (filePath) => {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const windowsPaths = content.match(/['"]\w+\\\w+['"]/g) || [];
                windowsPathCount += windowsPaths.length;
                totalFiles++;
            } catch (error) {
                // 忽略读取错误
            }
        };

        // 检查主要文件
        const mainFiles = [
            'src/index.js',
            'src/app.js',
            'config/database.js'
        ];

        for (const file of mainFiles) {
            const filePath = path.join(PROJECT_ROOT, file);
            await checkFile(filePath);
        }

        if (windowsPathCount === 0) {
            this.addCheck('路径分隔符', 'pass', '未发现Windows风格路径分隔符');
        } else {
            this.addCheck(
                '路径分隔符',
                'warn',
                `发现${windowsPathCount}个Windows风格路径分隔符，建议使用Linux风格(/)`
            );
        }
    }

    // 检查配置文件一致性
    async checkConfigConsistency() {
        log.info('检查配置文件一致性...');

        const environments = ['development', 'staging', 'production'];
        const configHashes = {};

        for (const env of environments) {
            const configFile = path.join(PROJECT_ROOT, `.env.${env}.example`);

            try {
                const content = await fs.readFile(configFile, 'utf8');
                const keys = content
                    .split('\n')
                    .filter(line => line.trim() && !line.startsWith('#'))
                    .map(line => line.split('=')[0])
                    .sort();

                configHashes[env] = createHash('md5').update(keys.join(',')).digest('hex');
            } catch (error) {
                log.warn(`配置文件不存在: ${configFile}`);
            }
        }

        const uniqueHashes = new Set(Object.values(configHashes));

        if (uniqueHashes.size === 1) {
            this.addCheck('配置一致性', 'pass', '所有环境的配置结构一致');
        } else {
            this.addCheck(
                '配置一致性',
                'warn',
                '不同环境的配置结构存在差异',
                { hashes: configHashes }
            );
        }
    }

    // 检查Docker镜像兼容性
    async checkDockerCompatibility() {
        if (this.options.skipDocker) {
            return;
        }

        log.info('检查Docker镜像兼容性...');

        const dockerfiles = [
            'docker/Dockerfile.development',
            'docker/Dockerfile.production'
        ];

        let linuxBaseCount = 0;
        let totalDockerfiles = 0;

        for (const dockerfile of dockerfiles) {
            const dockerfilePath = path.join(PROJECT_ROOT, dockerfile);

            try {
                const content = await fs.readFile(dockerfilePath, 'utf8');
                totalDockerfiles++;

                if (content.includes('alpine') || content.includes('ubuntu') || content.includes('debian')) {
                    linuxBaseCount++;
                }
            } catch (error) {
                // Dockerfile不存在
            }
        }

        if (totalDockerfiles === 0) {
            this.addCheck('Docker兼容性', 'warn', '未找到Dockerfile');
        } else if (linuxBaseCount === totalDockerfiles) {
            this.addCheck('Docker兼容性', 'pass', '所有Dockerfile都基于Linux镜像');
        } else {
            this.addCheck(
                'Docker兼容性',
                'warn',
                `${totalDockerfiles - linuxBaseCount}个Dockerfile可能不兼容Linux`
            );
        }
    }

    // 运行所有检查
    async runAllChecks() {
        log.info('开始跨平台环境一致性验证...');
        log.info(`目标环境: ${this.options.environment}`);
        log.info(`当前平台: ${os.platform()} ${os.arch()}`);

        const checks = [
            () => this.checkNodeVersion(),
            () => this.checkNpmVersion(),
            () => this.checkDocker(),
            () => this.checkEnvironmentVariables(),
            () => this.checkDependencies(),
            () => this.checkFilePermissions(),
            () => this.checkPathSeparators(),
            () => this.checkConfigConsistency(),
            () => this.checkDockerCompatibility()
        ];

        for (const check of checks) {
            try {
                await check();
            } catch (error) {
                log.error(`检查执行失败: ${error.message}`);
            }
        }

        this.generateReport();
    }

    // 生成报告
    generateReport() {
        const { summary } = this.results;

        console.log('\n' + '='.repeat(60));
        console.log('跨平台环境一致性验证报告');
        console.log('='.repeat(60));

        console.log(`环境: ${this.results.environment}`);
        console.log(`平台: ${this.results.platform.os} ${this.results.platform.arch}`);
        console.log(`Node.js: ${this.results.platform.nodeVersion}`);
        console.log(`时间: ${this.results.timestamp}`);

        console.log('\n检查结果:');
        console.log(`${colors.green}✓ 通过: ${summary.passed}${colors.reset}`);
        console.log(`${colors.red}✗ 失败: ${summary.failed}${colors.reset}`);
        console.log(`${colors.yellow}⚠ 警告: ${summary.warnings}${colors.reset}`);
        console.log(`总计: ${summary.total}`);

        const successRate = ((summary.passed / summary.total) * 100).toFixed(1);
        console.log(`成功率: ${successRate}%`);

        if (summary.failed > 0) {
            console.log(`\n${colors.red}失败的检查:${colors.reset}`);
            this.results.checks
                .filter(check => check.status === 'fail')
                .forEach(check => {
                    console.log(`  ✗ ${check.name}: ${check.message}`);
                });
        }

        if (summary.warnings > 0) {
            console.log(`\n${colors.yellow}警告的检查:${colors.reset}`);
            this.results.checks
                .filter(check => check.status === 'warn')
                .forEach(check => {
                    console.log(`  ⚠ ${check.name}: ${check.message}`);
                });
        }

        // 保存报告到文件
        if (this.options.outputFile) {
            this.saveReport();
        }

        console.log('='.repeat(60));

        // 返回退出码
        process.exit(summary.failed > 0 ? 1 : 0);
    }

    // 保存报告到文件
    async saveReport() {
        try {
            await fs.writeFile(
                this.options.outputFile,
                JSON.stringify(this.results, null, 2),
                'utf8'
            );
            log.success(`报告已保存到: ${this.options.outputFile}`);
        } catch (error) {
            log.error(`保存报告失败: ${error.message}`);
        }
    }
}

// 命令行接口
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        environment: 'development',
        verbose: false,
        outputFile: null,
        skipDocker: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '-e':
            case '--environment':
                options.environment = args[++i];
                break;
            case '-v':
            case '--verbose':
                options.verbose = true;
                break;
            case '-o':
            case '--output':
                options.outputFile = args[++i];
                break;
            case '--skip-docker':
                options.skipDocker = true;
                break;
            case '-h':
            case '--help':
                showHelp();
                process.exit(0);
                break;
            default:
                console.error(`未知参数: ${args[i]}`);
                process.exit(1);
        }
    }

    return options;
}

function showHelp() {
    console.log(`
SecureFrontEnd 跨平台环境一致性验证器

用法: node cross-platform-validator.js [选项]

选项:
  -e, --environment ENV    目标环境 (development|staging|production)
  -v, --verbose           详细输出
  -o, --output FILE       保存报告到文件
  --skip-docker          跳过Docker检查
  -h, --help             显示帮助信息

示例:
  node cross-platform-validator.js -e production -v
  node cross-platform-validator.js -e staging -o report.json
  node cross-platform-validator.js --skip-docker
`);
}

// 主函数
async function main() {
    try {
        const options = parseArguments();
        const validator = new CrossPlatformValidator(options);
        await validator.runAllChecks();
    } catch (error) {
        log.error(`验证器执行失败: ${error.message}`);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default CrossPlatformValidator;
