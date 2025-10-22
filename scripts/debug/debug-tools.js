#!/usr/bin/env node

/**
 * 调试工具集
 * 提供断点调试、性能分析、错误追踪和内存监控功能
 */

import { spawn, exec } from 'child_process';
import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// 调试配置
const DEBUG_CONFIG = {
    port: 9229,
    inspectorPort: 9230,
    profilerPort: 9231,
    enableSourceMaps: true,
    enableProfiling: true,
    enableMemoryMonitoring: true,
    logLevel: 'debug'
};

class DebugTools {
    constructor() {
        this.sessions = new Map();
        this.profilers = new Map();
        this.monitors = new Map();
    }

    async start(mode = 'inspect') {
        console.log('🔧 启动调试工具...\n');
        
        try {
            switch (mode) {
                case 'inspect':
                    await this.startInspector();
                    break;
                case 'profile':
                    await this.startProfiler();
                    break;
                case 'monitor':
                    await this.startMonitor();
                    break;
                case 'trace':
                    await this.startTracer();
                    break;
                case 'all':
                    await this.startAll();
                    break;
                default:
                    throw new Error(`未知的调试模式: ${mode}`);
            }
            
            this.showDebugInfo();
            this.setupGracefulShutdown();
            
        } catch (error) {
            console.error('❌ 调试工具启动失败:', error.message);
            process.exit(1);
        }
    }

    async startInspector() {
        console.log('🔍 启动Node.js调试器...');
        
        return new Promise((resolve, reject) => {
            const inspectorProcess = spawn('node', [
                `--inspect=0.0.0.0:${DEBUG_CONFIG.port}`,
                '--inspect-brk',
                'src/app.js'
            ], {
                cwd: projectRoot,
                stdio: ['inherit', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    NODE_ENV: 'development',
                    DEBUG: '*'
                }
            });

            inspectorProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`[Inspector] ${output.trim()}`);
                
                // 检测调试器就绪
                if (output.includes('Debugger listening')) {
                    console.log('✅ 调试器已启动');
                    resolve();
                }
            });

            inspectorProcess.stderr.on('data', (data) => {
                console.error(`[Inspector Error] ${data.toString().trim()}`);
            });

            inspectorProcess.on('error', (error) => {
                console.error('❌ 调试器启动失败:', error.message);
                reject(error);
            });

            this.sessions.set('inspector', inspectorProcess);
        });
    }

    async startProfiler() {
        console.log('📊 启动性能分析器...');
        
        const profilerServer = createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');
            
            if (req.url === '/profile/start') {
                this.startProfiling();
                res.end(JSON.stringify({ status: 'started' }));
            } else if (req.url === '/profile/stop') {
                const profile = this.stopProfiling();
                res.end(JSON.stringify(profile));
            } else if (req.url === '/profile/memory') {
                const memoryUsage = this.getMemoryUsage();
                res.end(JSON.stringify(memoryUsage));
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        });
        
        profilerServer.listen(DEBUG_CONFIG.profilerPort, () => {
            console.log(`✅ 性能分析器已启动 (端口: ${DEBUG_CONFIG.profilerPort})`);
        });
        
        this.sessions.set('profiler', profilerServer);
    }

    async startMonitor() {
        console.log('📈 启动系统监控...');
        
        const monitor = {
            startTime: Date.now(),
            metrics: {
                memory: [],
                cpu: [],
                events: []
            }
        };
        
        // 内存监控
        const memoryInterval = setInterval(() => {
            const memUsage = process.memoryUsage();
            monitor.metrics.memory.push({
                timestamp: Date.now(),
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss
            });
            
            // 保留最近1000个数据点
            if (monitor.metrics.memory.length > 1000) {
                monitor.metrics.memory.shift();
            }
        }, 1000);
        
        // CPU监控
        const cpuInterval = setInterval(() => {
            const cpuUsage = process.cpuUsage();
            monitor.metrics.cpu.push({
                timestamp: Date.now(),
                user: cpuUsage.user,
                system: cpuUsage.system
            });
            
            if (monitor.metrics.cpu.length > 1000) {
                monitor.metrics.cpu.shift();
            }
        }, 1000);
        
        // 事件监控
        const originalEmit = process.emit;
        process.emit = function(event, ...args) {
            monitor.metrics.events.push({
                timestamp: Date.now(),
                event: event,
                args: args.length
            });
            
            if (monitor.metrics.events.length > 1000) {
                monitor.metrics.events.shift();
            }
            
            return originalEmit.apply(this, arguments);
        };
        
        // 监控服务器
        const monitorServer = createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');
            
            if (req.url === '/monitor/metrics') {
                res.end(JSON.stringify(monitor.metrics));
            } else if (req.url === '/monitor/summary') {
                const summary = this.generateMonitorSummary(monitor);
                res.end(JSON.stringify(summary));
            } else if (req.url === '/monitor/dashboard') {
                const dashboard = this.generateMonitorDashboard(monitor);
                res.setHeader('Content-Type', 'text/html');
                res.end(dashboard);
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        });
        
        monitorServer.listen(DEBUG_CONFIG.inspectorPort, () => {
            console.log(`✅ 系统监控已启动 (端口: ${DEBUG_CONFIG.inspectorPort})`);
        });
        
        this.monitors.set('memory', memoryInterval);
        this.monitors.set('cpu', cpuInterval);
        this.sessions.set('monitor', monitorServer);
    }

    async startTracer() {
        console.log('🔍 启动错误追踪器...');
        
        // 全局错误处理
        process.on('uncaughtException', (error) => {
            this.logError('uncaughtException', error);
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            this.logError('unhandledRejection', reason, { promise });
        });
        
        // 性能追踪
        const performanceObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                this.logPerformance(entry);
            });
        });
        
        performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
        
        console.log('✅ 错误追踪器已启动');
    }

    async startAll() {
        console.log('🚀 启动所有调试工具...');
        
        await Promise.all([
            this.startProfiler(),
            this.startMonitor(),
            this.startTracer()
        ]);
        
        // 延迟启动调试器（避免端口冲突）
        setTimeout(() => {
            this.startInspector();
        }, 2000);
    }

    startProfiling() {
        console.log('📊 开始性能分析...');
        
        const profiler = {
            startTime: performance.now(),
            startCpuUsage: process.cpuUsage(),
            startMemoryUsage: process.memoryUsage()
        };
        
        this.profilers.set('current', profiler);
    }

    stopProfiling() {
        console.log('⏹️ 停止性能分析...');
        
        const profiler = this.profilers.get('current');
        if (!profiler) {
            return { error: 'No active profiling session' };
        }
        
        const endTime = performance.now();
        const endCpuUsage = process.cpuUsage(profiler.startCpuUsage);
        const endMemoryUsage = process.memoryUsage();
        
        const profile = {
            duration: endTime - profiler.startTime,
            cpu: {
                user: endCpuUsage.user / 1000, // 转换为毫秒
                system: endCpuUsage.system / 1000
            },
            memory: {
                start: profiler.startMemoryUsage,
                end: endMemoryUsage,
                delta: {
                    heapUsed: endMemoryUsage.heapUsed - profiler.startMemoryUsage.heapUsed,
                    heapTotal: endMemoryUsage.heapTotal - profiler.startMemoryUsage.heapTotal,
                    external: endMemoryUsage.external - profiler.startMemoryUsage.external,
                    rss: endMemoryUsage.rss - profiler.startMemoryUsage.rss
                }
            }
        };
        
        // 保存分析结果
        const reportPath = join(projectRoot, 'reports/system/PROFILE_REPORT.json');
        writeFileSync(reportPath, JSON.stringify(profile, null, 2));
        
        this.profilers.delete('current');
        return profile;
    }

    getMemoryUsage() {
        const memUsage = process.memoryUsage();
        return {
            timestamp: Date.now(),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024),
            rss: Math.round(memUsage.rss / 1024 / 1024)
        };
    }

    logError(type, error, context = {}) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            type: type,
            message: error.message || error,
            stack: error.stack,
            context: context,
            process: {
                pid: process.pid,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            }
        };
        
        console.error(`🚨 [${type}] ${error.message || error}`);
        
        // 保存错误日志
        const logPath = join(projectRoot, 'logs/debug-errors.log');
        const logEntry = JSON.stringify(errorLog) + '\n';
        
        try {
            writeFileSync(logPath, logEntry, { flag: 'a' });
        } catch (writeError) {
            console.error('❌ 无法写入错误日志:', writeError.message);
        }
    }

    logPerformance(entry) {
        const perfLog = {
            timestamp: Date.now(),
            name: entry.name,
            type: entry.entryType,
            duration: entry.duration,
            startTime: entry.startTime
        };
        
        if (entry.duration > 100) { // 只记录耗时超过100ms的操作
            console.log(`⏱️ 性能警告: ${entry.name} 耗时 ${Math.round(entry.duration)}ms`);
        }
        
        // 保存性能日志
        const logPath = join(projectRoot, 'logs/debug-performance.log');
        const logEntry = JSON.stringify(perfLog) + '\n';
        
        try {
            writeFileSync(logPath, logEntry, { flag: 'a' });
        } catch (writeError) {
            console.error('❌ 无法写入性能日志:', writeError.message);
        }
    }

    generateMonitorSummary(monitor) {
        const now = Date.now();
        const uptime = now - monitor.startTime;
        
        const latestMemory = monitor.metrics.memory[monitor.metrics.memory.length - 1];
        const latestCpu = monitor.metrics.cpu[monitor.metrics.cpu.length - 1];
        
        return {
            uptime: uptime,
            memory: latestMemory,
            cpu: latestCpu,
            events: monitor.metrics.events.length,
            summary: {
                avgMemoryUsage: monitor.metrics.memory.reduce((sum, m) => sum + m.heapUsed, 0) / monitor.metrics.memory.length,
                peakMemoryUsage: Math.max(...monitor.metrics.memory.map(m => m.heapUsed)),
                totalEvents: monitor.metrics.events.length
            }
        };
    }

    generateMonitorDashboard(monitor) {
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>调试监控面板 - SecureFrontEnd</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #1a1a1a; color: #fff; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: #2d2d2d; padding: 20px; border-radius: 10px; border: 1px solid #444; }
        .metric { text-align: center; margin-bottom: 20px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #4ecdc4; }
        .metric-label { color: #999; margin-top: 5px; }
        .chart { height: 200px; background: #1a1a1a; border-radius: 5px; margin: 10px 0; position: relative; overflow: hidden; }
        .refresh-btn { background: #4ecdc4; color: #1a1a1a; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        .refresh-btn:hover { background: #45b7aa; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 调试监控面板</h1>
            <p>实时系统性能监控</p>
            <button class="refresh-btn" onclick="location.reload()">刷新数据</button>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>💾 内存使用</h3>
                <div class="metric">
                    <div class="metric-value">${Math.round(monitor.metrics.memory[monitor.metrics.memory.length - 1]?.heapUsed / 1024 / 1024 || 0)}MB</div>
                    <div class="metric-label">当前堆内存</div>
                </div>
                <canvas id="memoryChart" class="chart"></canvas>
            </div>
            
            <div class="card">
                <h3>⚡ CPU使用</h3>
                <div class="metric">
                    <div class="metric-value">${monitor.metrics.cpu.length}</div>
                    <div class="metric-label">CPU采样点</div>
                </div>
                <canvas id="cpuChart" class="chart"></canvas>
            </div>
            
            <div class="card">
                <h3>📊 事件统计</h3>
                <div class="metric">
                    <div class="metric-value">${monitor.metrics.events.length}</div>
                    <div class="metric-label">总事件数</div>
                </div>
                <div>最近事件: ${monitor.metrics.events.slice(-5).map(e => e.event).join(', ')}</div>
            </div>
            
            <div class="card">
                <h3>⏱️ 运行时间</h3>
                <div class="metric">
                    <div class="metric-value">${Math.round((Date.now() - monitor.startTime) / 1000)}s</div>
                    <div class="metric-label">总运行时间</div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // 内存图表
        const memoryCtx = document.getElementById('memoryChart').getContext('2d');
        const memoryData = ${JSON.stringify(monitor.metrics.memory.slice(-50))};
        
        new Chart(memoryCtx, {
            type: 'line',
            data: {
                labels: memoryData.map(m => new Date(m.timestamp).toLocaleTimeString()),
                datasets: [{
                    label: '堆内存 (MB)',
                    data: memoryData.map(m => Math.round(m.heapUsed / 1024 / 1024)),
                    borderColor: '#4ecdc4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#fff' } } },
                scales: {
                    x: { ticks: { color: '#999' } },
                    y: { ticks: { color: '#999' } }
                }
            }
        });
        
        // 自动刷新
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;
    }

    showDebugInfo() {
        console.log('\n🔧 调试工具已就绪!\n');
        console.log('📍 调试端点:');
        
        if (this.sessions.has('inspector')) {
            console.log(`   调试器: chrome://inspect (端口: ${DEBUG_CONFIG.port})`);
        }
        
        if (this.sessions.has('profiler')) {
            console.log(`   性能分析: http://localhost:${DEBUG_CONFIG.profilerPort}`);
        }
        
        if (this.sessions.has('monitor')) {
            console.log(`   系统监控: http://localhost:${DEBUG_CONFIG.inspectorPort}/monitor/dashboard`);
        }
        
        console.log('\n🔧 可用命令:');
        console.log('   POST /profile/start - 开始性能分析');
        console.log('   POST /profile/stop - 停止性能分析');
        console.log('   GET /profile/memory - 获取内存使用');
        console.log('   GET /monitor/metrics - 获取监控指标');
        console.log('   GET /monitor/summary - 获取监控摘要');
        console.log('\n💡 提示: 按 Ctrl+C 停止调试工具\n');
    }

    setupGracefulShutdown() {
        const shutdown = (signal) => {
            console.log(`\n🛑 收到 ${signal} 信号，正在关闭调试工具...`);
            
            // 停止所有会话
            this.sessions.forEach((session, name) => {
                console.log(`⏹️ 停止 ${name}...`);
                if (session.kill) {
                    session.kill('SIGTERM');
                } else if (session.close) {
                    session.close();
                }
            });
            
            // 清理监控器
            this.monitors.forEach((monitor, name) => {
                console.log(`🗑️ 清理 ${name} 监控...`);
                clearInterval(monitor);
            });
            
            console.log('✅ 调试工具已关闭');
            process.exit(0);
        };
        
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    }
}

// 命令行接口
if (import.meta.url === `file://${process.argv[1]}`) {
    const mode = process.argv[2] || 'all';
    
    const debugTools = new DebugTools();
    debugTools.start(mode).catch(error => {
        console.error('❌ 调试工具启动失败:', error);
        process.exit(1);
    });
}

export default DebugTools;