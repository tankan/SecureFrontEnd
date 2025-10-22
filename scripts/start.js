#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import fs from 'fs';
import { spawn, execSync } from 'child_process';
import http from 'http';
import url from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ApplicationStarter {
    constructor() {
        this.projectRoot = resolve(__dirname, '..');
        this.srcDir = join(this.projectRoot, 'src');
        this.serverDir = join(this.projectRoot, 'server');
        this.clientDir = join(this.projectRoot, 'client');
        this.environment = process.env.NODE_ENV || 'development';
        this.port = process.env.PORT || 3000;
        this.host = process.env.HOST || 'localhost';
    }

    // 加载环境配置
    loadEnvironmentConfig() {
        console.log(`📋 加载 ${this.environment} 环境配置...`);
        
        const configDir = join(this.projectRoot, 'config', 'app');
        const envFile = join(configDir, `.env.${this.environment}`);
        const defaultEnvFile = join(configDir, '.env.example');
        
        // 加载默认配置
        if (fs.existsSync(defaultEnvFile)) {
            this.loadEnvFile(defaultEnvFile);
        }
        
        // 加载环境特定配置
        if (fs.existsSync(envFile)) {
            this.loadEnvFile(envFile);
        }
        
        console.log('✅ 环境配置加载完成');
    }

    // 加载环境文件
    loadEnvFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        content.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                    if (!process.env[key.trim()]) {
                        process.env[key.trim()] = value;
                    }
                }
            }
        });
    }

    // 检查依赖
    checkDependencies() {
        console.log('🔍 检查依赖...');
        
        const packageJsonPath = join(this.projectRoot, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error('package.json 不存在');
        }
        
        const nodeModulesPath = join(this.projectRoot, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            console.log('📦 安装依赖...');
            execSync('npm install', { cwd: this.projectRoot, stdio: 'inherit' });
        }
        
        console.log('✅ 依赖检查完成');
    }

    // 启动API服务器
    startApiServer() {
        console.log('🔧 启动API服务器...');
        
        const serverEntry = this.findServerEntry();
        if (!serverEntry) {
            console.warn('⚠️  未找到服务器入口文件');
            return null;
        }
        
        const serverProcess = spawn('node', [serverEntry], {
            cwd: this.projectRoot,
            stdio: 'inherit',
            env: {
                ...process.env,
                NODE_ENV: this.environment,
                PORT: this.port,
                HOST: this.host
            }
        });
        
        serverProcess.on('error', (error) => {
            console.error('❌ API服务器启动失败:', error.message);
        });
        
        serverProcess.on('exit', (code) => {
            if (code !== 0) {
                console.error(`❌ API服务器异常退出，退出码: ${code}`);
            }
        });
        
        console.log(`✅ API服务器已启动 (PID: ${serverProcess.pid})`);
        return serverProcess;
    }

    // 查找服务器入口文件
    findServerEntry() {
        const possibleEntries = [
            join(this.serverDir, 'index.js'),
            join(this.serverDir, 'server.js'),
            join(this.serverDir, 'app.js'),
            join(this.srcDir, 'server.js'),
            join(this.srcDir, 'index.js'),
            join(this.projectRoot, 'server.js'),
            join(this.projectRoot, 'index.js')
        ];
        
        for (const entry of possibleEntries) {
            if (fs.existsSync(entry)) {
                return entry;
            }
        }
        
        return null;
    }

    // 启动静态文件服务器
    startStaticServer() {
        console.log('📁 启动静态文件服务器...');
        
        const staticDir = this.findStaticDirectory();
        if (!staticDir) {
            console.warn('⚠️  未找到静态文件目录');
            return null;
        }
        
        const staticPort = parseInt(this.port) + 1;
        const staticServer = this.createStaticServer(staticDir, staticPort);
        
        console.log(`✅ 静态文件服务器已启动 (端口: ${staticPort})`);
        return staticServer;
    }

    // 查找静态文件目录
    findStaticDirectory() {
        const possibleDirs = [
            this.clientDir,
            join(this.projectRoot, 'public'),
            join(this.projectRoot, 'static'),
            join(this.projectRoot, 'dist', 'client')
        ];
        
        for (const dir of possibleDirs) {
            if (fs.existsSync(dir)) {
                return dir;
            }
        }
        
        return null;
    }

    // 创建静态文件服务器
    async createStaticServer(staticDir, port) {
        let mime;
        try {
            mime = await import('mime-types');
        } catch (error) {
            console.warn('⚠️  mime-types 模块未安装，使用默认MIME类型');
            mime = { lookup: () => 'application/octet-stream' };
        }
        
        const server = http.createServer((req, res) => {
            const parsedUrl = url.parse(req.url);
            let pathname = parsedUrl.pathname;
            
            // 默认文件
            if (pathname === '/') {
                pathname = '/index.html';
            }
            
            const filePath = join(staticDir, pathname);
            
            // 安全检查
            if (!filePath.startsWith(staticDir)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }
            
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        // 尝试返回index.html (SPA支持)
                        const indexPath = join(staticDir, 'index.html');
                        fs.readFile(indexPath, (indexErr, indexData) => {
                            if (indexErr) {
                                res.writeHead(404);
                                res.end('Not Found');
                            } else {
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(indexData);
                            }
                        });
                    } else {
                        res.writeHead(500);
                        res.end('Internal Server Error');
                    }
                } else {
                    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
                    res.writeHead(200, { 'Content-Type': mimeType });
                    res.end(data);
                }
            });
        });
        
        server.listen(port, this.host, () => {
            console.log(`📁 静态文件服务器运行在 http://${this.host}:${port}`);
        });
        
        return server;
    }

    // 设置进程信号处理
    setupSignalHandlers(processes) {
        const gracefulShutdown = (signal) => {
            console.log(`\n📡 收到 ${signal} 信号，正在优雅关闭...`);
            
            processes.forEach(process => {
                if (process && process.kill) {
                    process.kill('SIGTERM');
                }
            });
            
            setTimeout(() => {
                console.log('👋 应用已关闭');
                process.exit(0);
            }, 5000);
        };
        
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        
        // 处理未捕获的异常
        process.on('uncaughtException', (error) => {
            console.error('❌ 未捕获的异常:', error);
            gracefulShutdown('uncaughtException');
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ 未处理的Promise拒绝:', reason);
            gracefulShutdown('unhandledRejection');
        });
    }

    // 显示启动信息
    displayStartupInfo() {
        console.log('\n🚀 应用启动信息:');
        console.log(`  环境: ${this.environment}`);
        console.log(`  主机: ${this.host}`);
        console.log(`  端口: ${this.port}`);
        console.log(`  进程ID: ${process.pid}`);
        console.log(`  Node.js版本: ${process.version}`);
        console.log(`  工作目录: ${this.projectRoot}`);
        console.log(`  启动时间: ${new Date().toISOString()}`);
        console.log('\n🌐 访问地址:');
        console.log(`  API服务器: http://${this.host}:${this.port}`);
        console.log(`  静态文件: http://${this.host}:${parseInt(this.port) + 1}`);
        console.log('\n按 Ctrl+C 停止应用\n');
    }

    // 健康检查端点
    setupHealthCheck() {
        const healthPort = parseInt(this.port) + 100;
        
        const healthServer = http.createServer((req, res) => {
            if (req.url === '/health') {
                const healthData = {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    environment: this.environment,
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    pid: process.pid
                };
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(healthData, null, 2));
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });
        
        healthServer.listen(healthPort, this.host, () => {
            console.log(`🏥 健康检查端点: http://${this.host}:${healthPort}/health`);
        });
        
        return healthServer;
    }

    // 启动应用
    async start() {
        console.log('🚀 启动应用...\n');
        
        try {
            // 加载配置
            this.loadEnvironmentConfig();
            
            // 检查依赖
            this.checkDependencies();
            
            const processes = [];
            
            // 启动API服务器
            const apiServer = this.startApiServer();
            if (apiServer) {
                processes.push(apiServer);
            }
            
            // 启动静态文件服务器
            const staticServer = await this.startStaticServer();
            if (staticServer) {
                processes.push(staticServer);
            }
            
            // 设置健康检查
            const healthServer = this.setupHealthCheck();
            processes.push(healthServer);
            
            // 设置信号处理
            this.setupSignalHandlers(processes);
            
            // 显示启动信息
            this.displayStartupInfo();
            
            // 保持进程运行
            process.stdin.resume();
            
        } catch (error) {
            console.error('❌ 应用启动失败:', error.message);
            process.exit(1);
        }
    }
}

// 命令行接口
if (import.meta.url === `file://${process.argv[1]}`) {
    const starter = new ApplicationStarter();
    starter.start();
}

export default ApplicationStarter;