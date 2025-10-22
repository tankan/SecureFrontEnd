#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class DeployManager {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../..');
        this.configDir = path.join(this.projectRoot, 'config');
        this.buildDir = path.join(this.projectRoot, 'dist');
        this.environments = ['development', 'staging', 'production'];
    }

    // 验证部署前置条件
    validatePrerequisites() {
        console.log('🔍 验证部署前置条件...');
        
        const checks = [
            { name: '构建目录存在', check: () => fs.existsSync(this.buildDir) },
            { name: '配置文件存在', check: () => fs.existsSync(this.configDir) },
            { name: 'package.json存在', check: () => fs.existsSync(path.join(this.projectRoot, 'package.json')) },
            { name: 'Node.js版本', check: () => this.checkNodeVersion() },
            { name: 'npm可用', check: () => this.checkNpmAvailable() }
        ];

        const results = checks.map(check => ({
            name: check.name,
            passed: check.check()
        }));

        results.forEach(result => {
            console.log(`  ${result.passed ? '✅' : '❌'} ${result.name}`);
        });

        const allPassed = results.every(result => result.passed);
        if (!allPassed) {
            throw new Error('部署前置条件检查失败');
        }

        console.log('✅ 所有前置条件检查通过');
    }

    // 检查Node.js版本
    checkNodeVersion() {
        try {
            const version = process.version;
            const majorVersion = parseInt(version.slice(1).split('.')[0]);
            return majorVersion >= 14;
        } catch {
            return false;
        }
    }

    // 检查npm是否可用
    checkNpmAvailable() {
        try {
            execSync('npm --version', { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    // 加载环境配置
    loadEnvironmentConfig(environment) {
        console.log(`📋 加载 ${environment} 环境配置...`);
        
        const configFile = path.join(this.configDir, 'app', `.env.${environment}`);
        const defaultConfigFile = path.join(this.configDir, 'app', '.env.example');
        
        let config = {};
        
        // 加载默认配置
        if (fs.existsSync(defaultConfigFile)) {
            config = { ...config, ...this.parseEnvFile(defaultConfigFile) };
        }
        
        // 加载环境特定配置
        if (fs.existsSync(configFile)) {
            config = { ...config, ...this.parseEnvFile(configFile) };
        }
        
        // 设置环境变量
        Object.keys(config).forEach(key => {
            if (!process.env[key]) {
                process.env[key] = config[key];
            }
        });
        
        console.log(`✅ 环境配置加载完成 (${Object.keys(config).length} 个配置项)`);
        return config;
    }

    // 解析环境文件
    parseEnvFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const config = {};
        
        content.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    config[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                }
            }
        });
        
        return config;
    }

    // 安装生产依赖
    installDependencies() {
        console.log('📦 安装生产依赖...');
        
        try {
            execSync('npm ci --only=production', {
                cwd: this.buildDir,
                stdio: 'inherit'
            });
            console.log('✅ 依赖安装完成');
        } catch (error) {
            console.error('❌ 依赖安装失败:', error.message);
            throw error;
        }
    }

    // 运行部署前测试
    runPreDeployTests() {
        console.log('🧪 运行部署前测试...');
        
        try {
            // 运行安全测试
            execSync('node scripts/runners/run-security-test.js', {
                cwd: this.projectRoot,
                stdio: 'inherit'
            });
            
            // 运行集成测试
            execSync('node scripts/runners/run-integration-test.js', {
                cwd: this.projectRoot,
                stdio: 'inherit'
            });
            
            console.log('✅ 部署前测试通过');
        } catch (error) {
            console.error('❌ 部署前测试失败:', error.message);
            throw error;
        }
    }

    // Docker部署
    deployWithDocker(environment) {
        console.log('🐳 使用Docker部署...');
        
        const dockerFile = path.join(this.configDir, 'docker', 'Dockerfile');
        const composeFile = path.join(this.configDir, 'docker', `docker-compose.${environment}.yml`);
        
        if (!fs.existsSync(dockerFile)) {
            throw new Error('Dockerfile不存在');
        }
        
        try {
            // 构建Docker镜像
            const imageName = `secure-frontend:${environment}-${Date.now()}`;
            console.log(`🏗️  构建Docker镜像: ${imageName}`);
            execSync(`docker build -f ${dockerFile} -t ${imageName} .`, {
                cwd: this.projectRoot,
                stdio: 'inherit'
            });
            
            // 使用docker-compose部署
            if (fs.existsSync(composeFile)) {
                console.log('🚀 使用docker-compose部署...');
                execSync(`docker-compose -f ${composeFile} up -d`, {
                    cwd: this.projectRoot,
                    stdio: 'inherit',
                    env: { ...process.env, IMAGE_NAME: imageName }
                });
            } else {
                // 直接运行容器
                console.log('🚀 直接运行Docker容器...');
                const port = process.env.PORT || 3000;
                execSync(`docker run -d -p ${port}:${port} --name secure-frontend-${environment} ${imageName}`, {
                    stdio: 'inherit'
                });
            }
            
            console.log('✅ Docker部署完成');
        } catch (error) {
            console.error('❌ Docker部署失败:', error.message);
            throw error;
        }
    }

    // 传统部署
    deployTraditional(environment) {
        console.log('📁 使用传统方式部署...');
        
        const deployDir = process.env.DEPLOY_PATH || `/var/www/secure-frontend-${environment}`;
        
        try {
            // 创建部署目录
            if (!fs.existsSync(deployDir)) {
                fs.mkdirSync(deployDir, { recursive: true });
            }
            
            // 复制构建文件
            console.log(`📋 复制文件到: ${deployDir}`);
            this.copyDirectory(this.buildDir, deployDir);
            
            // 安装依赖
            console.log('📦 安装生产依赖...');
            execSync('npm ci --only=production', {
                cwd: deployDir,
                stdio: 'inherit'
            });
            
            // 启动应用
            this.startApplication(deployDir, environment);
            
            console.log('✅ 传统部署完成');
        } catch (error) {
            console.error('❌ 传统部署失败:', error.message);
            throw error;
        }
    }

    // 启动应用
    startApplication(deployDir, environment) {
        console.log('🚀 启动应用...');
        
        const startScript = path.join(deployDir, 'scripts', 'start.js');
        const packageJson = path.join(deployDir, 'package.json');
        
        if (fs.existsSync(startScript)) {
            // 使用自定义启动脚本
            spawn('node', [startScript], {
                cwd: deployDir,
                detached: true,
                stdio: 'ignore',
                env: { ...process.env, NODE_ENV: environment }
            });
        } else if (fs.existsSync(packageJson)) {
            // 使用package.json中的start脚本
            spawn('npm', ['start'], {
                cwd: deployDir,
                detached: true,
                stdio: 'ignore',
                env: { ...process.env, NODE_ENV: environment }
            });
        } else {
            console.warn('⚠️  未找到启动脚本，请手动启动应用');
        }
    }

    // 复制目录
    copyDirectory(src, dest) {
        if (!fs.existsSync(src)) return;
        
        fs.mkdirSync(dest, { recursive: true });
        const items = fs.readdirSync(src);
        
        items.forEach(item => {
            const srcPath = path.join(src, item);
            const destPath = path.join(dest, item);
            const stat = fs.statSync(srcPath);
            
            if (stat.isDirectory()) {
                this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        });
    }

    // 健康检查
    async healthCheck(environment) {
        console.log('🏥 执行健康检查...');
        
        const port = process.env.PORT || 3000;
        const host = process.env.HOST || 'localhost';
        const url = `http://${host}:${port}/health`;
        
        try {
            // 简单的HTTP检查
            const response = await this.makeHttpRequest(url);
            if (response.status === 200) {
                console.log('✅ 健康检查通过');
                return true;
            } else {
                console.warn(`⚠️  健康检查警告: HTTP ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error('❌ 健康检查失败:', error.message);
            return false;
        }
    }

    // 简单的HTTP请求
    makeHttpRequest(url) {
        return new Promise((resolve, reject) => {
            const http = require('http');
            const request = http.get(url, (response) => {
                resolve({ status: response.statusCode });
            });
            
            request.on('error', reject);
            request.setTimeout(5000, () => {
                request.destroy();
                reject(new Error('请求超时'));
            });
        });
    }

    // 回滚部署
    rollback(environment) {
        console.log('🔄 执行回滚...');
        
        const backupDir = process.env.BACKUP_PATH || `/var/backups/secure-frontend-${environment}`;
        const deployDir = process.env.DEPLOY_PATH || `/var/www/secure-frontend-${environment}`;
        
        if (!fs.existsSync(backupDir)) {
            throw new Error('备份目录不存在，无法回滚');
        }
        
        try {
            // 停止当前应用
            console.log('⏹️  停止当前应用...');
            this.stopApplication(environment);
            
            // 恢复备份
            console.log('📋 恢复备份...');
            if (fs.existsSync(deployDir)) {
                fs.rmSync(deployDir, { recursive: true, force: true });
            }
            this.copyDirectory(backupDir, deployDir);
            
            // 重启应用
            this.startApplication(deployDir, environment);
            
            console.log('✅ 回滚完成');
        } catch (error) {
            console.error('❌ 回滚失败:', error.message);
            throw error;
        }
    }

    // 停止应用
    stopApplication(environment) {
        try {
            // 尝试停止Docker容器
            execSync(`docker stop secure-frontend-${environment}`, { stdio: 'ignore' });
            execSync(`docker rm secure-frontend-${environment}`, { stdio: 'ignore' });
        } catch {
            // Docker停止失败，尝试其他方式
            console.log('Docker容器停止失败，尝试其他方式...');
        }
        
        try {
            // 尝试停止PM2进程
            execSync(`pm2 stop secure-frontend-${environment}`, { stdio: 'ignore' });
        } catch {
            // PM2停止失败
            console.log('PM2进程停止失败');
        }
    }

    // 执行完整部署
    async deploy(environment, options = {}) {
        const startTime = Date.now();
        console.log(`🚀 开始部署到 ${environment} 环境...\n`);
        
        if (!this.environments.includes(environment)) {
            throw new Error(`不支持的环境: ${environment}`);
        }
        
        try {
            // 验证前置条件
            this.validatePrerequisites();
            
            // 加载环境配置
            this.loadEnvironmentConfig(environment);
            
            // 运行部署前测试
            if (!options.skipTests) {
                this.runPreDeployTests();
            }
            
            // 选择部署方式
            if (options.docker || process.env.USE_DOCKER === 'true') {
                await this.deployWithDocker(environment);
            } else {
                await this.deployTraditional(environment);
            }
            
            // 等待应用启动
            console.log('⏳ 等待应用启动...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            // 健康检查
            const healthy = await this.healthCheck(environment);
            if (!healthy && !options.skipHealthCheck) {
                throw new Error('健康检查失败');
            }
            
            const duration = Date.now() - startTime;
            console.log(`\n✅ 部署完成! 耗时: ${duration}ms`);
            console.log(`🌐 环境: ${environment}`);
            console.log(`🔗 访问地址: http://${process.env.HOST || 'localhost'}:${process.env.PORT || 3000}`);
            
        } catch (error) {
            console.error('❌ 部署失败:', error.message);
            
            // 自动回滚
            if (options.autoRollback && environment !== 'development') {
                console.log('🔄 自动回滚...');
                try {
                    await this.rollback(environment);
                } catch (rollbackError) {
                    console.error('❌ 回滚也失败了:', rollbackError.message);
                }
            }
            
            process.exit(1);
        }
    }
}

// 命令行接口
if (require.main === module) {
    const args = process.argv.slice(2);
    const environment = args[0] || 'development';
    
    const options = {
        docker: args.includes('--docker'),
        skipTests: args.includes('--skip-tests'),
        skipHealthCheck: args.includes('--skip-health-check'),
        autoRollback: args.includes('--auto-rollback')
    };
    
    if (args.includes('--rollback')) {
        const deployer = new DeployManager();
        deployer.rollback(environment);
    } else {
        const deployer = new DeployManager();
        deployer.deploy(environment, options);
    }
}

module.exports = DeployManager;