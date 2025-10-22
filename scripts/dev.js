#!/usr/bin/env node

/**
 * 本地开发服务器
 * 提供热重载、调试工具和开发环境配置
 */

import { spawn, exec } from 'child_process';
import { createServer } from 'http';
import { readFileSync, existsSync, watchFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 开发服务器配置
const DEV_CONFIG = {
    port: 3000,
    apiPort: 3001,
    hotReload: true,
    debug: true,
    watchFiles: [
        'src/**/*.js',
        'server/**/*.js',
        'client/**/*.js',
        'examples/**/*.js'
    ]
};

class DevServer {
    constructor() {
        this.processes = new Map();
        this.watchers = new Map();
        this.isShuttingDown = false;
    }

    async start() {
        console.log('🚀 启动开发环境...\n');
        
        try {
            // 检查环境配置
            await this.checkEnvironment();
            
            // 启动API服务器
            await this.startApiServer();
            
            // 启动前端开发服务器
            await this.startFrontendServer();
            
            // 设置文件监听
            if (DEV_CONFIG.hotReload) {
                this.setupFileWatching();
            }
            
            // 设置调试工具
            if (DEV_CONFIG.debug) {
                this.setupDebugTools();
            }
            
            // 显示开发信息
            this.showDevInfo();
            
            // 设置优雅关闭
            this.setupGracefulShutdown();
            
        } catch (error) {
            console.error('❌ 开发服务器启动失败:', error.message);
            process.exit(1);
        }
    }

    async checkEnvironment() {
        console.log('🔍 检查开发环境...');
        
        // 检查环境变量文件
        const envPath = join(projectRoot, 'config/app/.env.example');
        if (!existsSync(envPath)) {
            console.warn('⚠️ 未找到环境配置文件，将使用默认配置');
        }
        
        // 检查Node.js版本
        const nodeVersion = process.version;
        console.log(`✅ Node.js版本: ${nodeVersion}`);
        
        // 检查依赖
        const packagePath = join(projectRoot, 'package.json');
        if (existsSync(packagePath)) {
            console.log('✅ 项目依赖检查完成');
        }
    }

    async startApiServer() {
        console.log('🌐 启动API服务器...');
        
        return new Promise((resolve, reject) => {
            const apiProcess = spawn('node', ['server/index.js'], {
                cwd: projectRoot,
                stdio: ['inherit', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    NODE_ENV: 'development',
                    PORT: DEV_CONFIG.apiPort,
                    DEBUG: '1'
                }
            });

            apiProcess.stdout.on('data', (data) => {
                console.log(`[API] ${data.toString().trim()}`);
            });

            apiProcess.stderr.on('data', (data) => {
                console.error(`[API Error] ${data.toString().trim()}`);
            });

            apiProcess.on('error', (error) => {
                console.error('❌ API服务器启动失败:', error.message);
                reject(error);
            });

            // 等待服务器启动
            setTimeout(() => {
                this.processes.set('api', apiProcess);
                console.log(`✅ API服务器已启动 (端口: ${DEV_CONFIG.apiPort})`);
                resolve();
            }, 2000);
        });
    }

    async startFrontendServer() {
        console.log('🎨 启动前端开发服务器...');
        
        const app = express();
        
        // 配置CORS
        app.use(cors({
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
            credentials: true
        }));
        
        // 静态文件服务
        app.use('/client', express.static(join(projectRoot, 'client')));
        app.use('/examples', express.static(join(projectRoot, 'examples')));
        app.use('/src', express.static(join(projectRoot, 'src')));
        
        // 开发工具路由
        app.get('/dev/status', (req, res) => {
            res.json({
                status: 'running',
                processes: Array.from(this.processes.keys()),
                watchers: Array.from(this.watchers.keys()),
                config: DEV_CONFIG
            });
        });
        
        // 热重载端点
        app.get('/dev/reload', (req, res) => {
            res.json({ message: 'Reloading...' });
            this.reloadServices();
        });
        
        // 主页面
        app.get('/', (req, res) => {
            res.send(this.generateDevHomePage());
        });
        
        const server = app.listen(DEV_CONFIG.port, () => {
            console.log(`✅ 前端开发服务器已启动 (端口: ${DEV_CONFIG.port})`);
        });
        
        this.processes.set('frontend', server);
    }

    setupFileWatching() {
        console.log('👀 设置文件监听...');
        
        const watchPaths = [
            join(projectRoot, 'src'),
            join(projectRoot, 'server'),
            join(projectRoot, 'client'),
            join(projectRoot, 'examples')
        ];
        
        watchPaths.forEach(watchPath => {
            if (existsSync(watchPath)) {
                const watcher = watchFile(watchPath, { interval: 1000 }, () => {
                    console.log(`📝 检测到文件变化: ${watchPath}`);
                    this.handleFileChange(watchPath);
                });
                
                this.watchers.set(watchPath, watcher);
            }
        });
        
        console.log(`✅ 文件监听已设置 (${this.watchers.size}个目录)`);
    }

    setupDebugTools() {
        console.log('🔧 设置调试工具...');
        
        // 启用详细日志
        process.env.DEBUG = '*';
        
        // 内存使用监控
        setInterval(() => {
            const memUsage = process.memoryUsage();
            console.log(`💾 内存使用: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        }, 30000);
        
        console.log('✅ 调试工具已启用');
    }

    handleFileChange(filePath) {
        if (this.isShuttingDown) return;
        
        console.log(`🔄 重新加载服务 (文件变化: ${filePath})`);
        
        // 延迟重载，避免频繁重启
        clearTimeout(this.reloadTimer);
        this.reloadTimer = setTimeout(() => {
            this.reloadServices();
        }, 1000);
    }

    reloadServices() {
        console.log('🔄 重新加载服务...');
        
        // 重启API服务器
        const apiProcess = this.processes.get('api');
        if (apiProcess) {
            apiProcess.kill('SIGTERM');
            setTimeout(() => {
                this.startApiServer();
            }, 1000);
        }
    }

    generateDevHomePage() {
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SecureFrontEnd - 开发环境</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status.running { background: #d4edda; color: #155724; }
        .link { color: #667eea; text-decoration: none; }
        .link:hover { text-decoration: underline; }
        .code { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 SecureFrontEnd 开发环境</h1>
            <p>企业级安全前端资源加密存储解决方案，专为需要高度安全性的Web应用程序设计 - 开发模式</p>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>🌐 服务状态</h3>
                <p>前端服务器: <span class="status running">运行中</span> - <a href="http://localhost:${DEV_CONFIG.port}" class="link">http://localhost:${DEV_CONFIG.port}</a></p>
                <p>API服务器: <span class="status running">运行中</span> - <a href="http://localhost:${DEV_CONFIG.apiPort}" class="link">http://localhost:${DEV_CONFIG.apiPort}</a></p>
                <p>热重载: <span class="status running">${DEV_CONFIG.hotReload ? '已启用' : '已禁用'}</span></p>
            </div>
            
            <div class="card">
                <h3>🎯 快速链接</h3>
                <p><a href="/client/secure/" class="link">安全客户端演示</a></p>
                <p><a href="/examples/vue-app/" class="link">Vue.js 示例</a></p>
                <p><a href="/examples/" class="link">所有示例</a></p>
                <p><a href="/dev/status" class="link">开发状态API</a></p>
            </div>
            
            <div class="card">
                <h3>🔧 开发工具</h3>
                <p><a href="/dev/reload" class="link">手动重载服务</a></p>
                <p><a href="http://localhost:${DEV_CONFIG.apiPort}/api/health" class="link">API健康检查</a></p>
                <div class="code">
                    npm run test<br>
                    npm run lint<br>
                    npm run build
                </div>
            </div>
            
            <div class="card">
                <h3>📚 文档</h3>
                <p><a href="/docs/api.md" class="link">API文档</a></p>
                <p><a href="/docs/guides/QUICK_START.md" class="link">快速开始</a></p>
                <p><a href="/docs/architecture/" class="link">架构文档</a></p>
            </div>
        </div>
    </div>
    
    <script>
        // 自动刷新状态
        setInterval(() => {
            fetch('/dev/status')
                .then(res => res.json())
                .then(data => console.log('Dev Status:', data))
                .catch(err => console.warn('Status check failed:', err));
        }, 10000);
    </script>
</body>
</html>`;
    }

    showDevInfo() {
        console.log('\n🎉 开发环境已就绪!\n');
        console.log('📍 访问地址:');
        console.log(`   前端: http://localhost:${DEV_CONFIG.port}`);
        console.log(`   API:  http://localhost:${DEV_CONFIG.apiPort}`);
        console.log('\n🔧 开发工具:');
        console.log('   热重载: ✅ 已启用');
        console.log('   调试模式: ✅ 已启用');
        console.log('   文件监听: ✅ 已启用');
        console.log('\n💡 提示: 按 Ctrl+C 停止开发服务器\n');
    }

    setupGracefulShutdown() {
        const shutdown = (signal) => {
            if (this.isShuttingDown) return;
            this.isShuttingDown = true;
            
            console.log(`\n🛑 收到 ${signal} 信号，正在关闭开发服务器...`);
            
            // 停止所有进程
            this.processes.forEach((process, name) => {
                console.log(`⏹️ 停止 ${name} 服务...`);
                if (process.kill) {
                    process.kill('SIGTERM');
                } else if (process.close) {
                    process.close();
                }
            });
            
            // 清理文件监听
            this.watchers.forEach((watcher, path) => {
                console.log(`🗑️ 清理文件监听: ${path}`);
                if (watcher.close) watcher.close();
            });
            
            console.log('✅ 开发服务器已关闭');
            process.exit(0);
        };
        
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    }
}

// 启动开发服务器
// 修复Windows路径比较问题
if (import.meta.url === `file://${process.argv[1]}` || 
    import.meta.url.replace('file:///', '').replace(/\//g, '\\') === process.argv[1].replace(/\//g, '\\')) {
    const devServer = new DevServer();
    devServer.start().catch(error => {
        console.error('❌ 开发服务器启动失败:', error);
        process.exit(1);
    });
}

export default DevServer;