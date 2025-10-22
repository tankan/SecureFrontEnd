/**
 * 应用程序主入口
 * 演示新的模块化架构和统一管理系统
 */

// 常量定义
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const HEALTH_CHECK_INTERVAL = 60000; // 60秒

const { securityModuleManager } = require('./modules');
const { logManager } = require('./core');
const MemoryManager = require('./utils/memory-manager');
const PerformanceOptimizer = require('./utils/performance-optimizer');

/**
 * 应用程序类
 */
class Application {
    constructor() {
        this.name = 'SecureFrontEnd';
        this.version = '2.0.0';
        this.startTime = null;
        this.isRunning = false;
        this.memoryManager = new MemoryManager({
            warningThreshold: 150,
            criticalThreshold: 200,
            monitorInterval: 30000,
            enableAutoGC: true,
            enableLeakDetection: true
        });
        
        // 初始化性能优化器
        this.performanceOptimizer = new PerformanceOptimizer({
            slowOperationThreshold: 1000,
            batchSize: 50,
            maxConcurrency: 5,
            enableCaching: true,
            enableProfiling: true
        });
        
        // 创建性能缓存
        this.performanceCache = this.memoryManager.createCache('performance', {
            maxSize: 500,
            ttl: 300000 // 5分钟
        });
        
        // 创建健康检查缓存
        this.healthCache = this.memoryManager.createCache('health', {
            maxSize: 100,
            ttl: 60000 // 1分钟
        });

        // 绑定优雅关闭处理
        this.setupGracefulShutdown();
    }

    /**
     * 启动应用程序
     */
    async start() {
        try {
            logManager.info(`\n🚀 启动 ${this.name} v${this.version}...`);
            this.startTime = new Date();

            // 启动内存监控
            this.memoryManager.startMonitoring();
            
            // 启动性能分析器
            this.performanceOptimizer.startProfiler();

            // 1. 初始化核心系统
            logManager.info('📋 初始化核心系统...');
            await this.initializeCore();

            // 2. 初始化安全模块系统
            logManager.info('🔒 初始化安全模块系统...');
            await securityModuleManager.initialize();

            // 3. 启动所有模块
            logManager.info('⚡ 启动所有安全模块...');
            await securityModuleManager.start();

            // 4. 启动健康监控
            this.startHealthMonitoring();

            this.isRunning = true;

            logManager.info(`\n✅ ${this.name} 启动成功!`);
            logManager.info(`📊 启动时间: ${Date.now() - this.startTime.getTime()}ms`);
            logManager.info(`🌐 运行环境: ${process.env.NODE_ENV || 'development'}`);
            logManager.info(`📍 进程ID: ${process.pid}`);

            // 显示系统状态
            this.displaySystemStatus();
        } catch (error) {
            logManager.error(`❌ ${this.name} 启动失败:`, error);
            process.exit(1);
        }
    }

    /**
     * 添加模块到应用程序（优化版本）
     */
    addModule(module) {
        const startTime = Date.now();
        
        try {
            if (!module || typeof module !== 'object') {
                throw new Error('模块必须是一个对象');
            }
            
            if (!module.name) {
                throw new Error('模块必须有名称');
            }
            
            // 检查模块是否已存在
            const existingModule = this.modules.find(m => m.name === module.name);
            if (existingModule) {
                logManager.warn(`模块 ${module.name} 已存在，将被替换`);
                this.removeModule(module.name);
            }
            
            this.modules.push(module);
            
            const duration = Date.now() - startTime;
            this.performanceOptimizer.recordPerformance('addModule', duration);
            
            logManager.info(`✅ 模块 ${module.name} 已添加，耗时: ${duration}ms`);
        } catch (error) {
            const duration = Date.now() - startTime;
            this.performanceOptimizer.recordPerformance('addModule', duration, error);
            throw error;
        }
    }

    /**
     * 停止应用程序
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }

        try {
            logManager.info(`\n🛑 停止 ${this.name}...`);

            // 停止健康监控
            this.stopHealthMonitoring();

            // 停止内存监控
            this.memoryManager.stopMonitoring();
            
            // 停止性能分析器
            this.performanceOptimizer.stopProfiler();

            // 停止所有模块
            await securityModuleManager.stop();

            this.isRunning = false;

            const uptime = Date.now() - this.startTime.getTime();

            logManager.info(`✅ ${this.name} 已停止 (运行时间: ${this.formatUptime(uptime)})`);
        } catch (error) {
            logManager.error(`❌ ${this.name} 停止过程中发生错误:`, error);
        }
    }

    /**
     * 重启应用程序
     */
    async restart() {
        logManager.info(`\n🔄 重启 ${this.name}...`);
        await this.stop();
        await this.start();
    }

    /**
     * 初始化核心系统
     */
    async initializeCore() {
        // 这里可以初始化数据库连接、缓存等核心服务
        logManager.info('  ✓ 配置管理器已就绪');
        logManager.info('  ✓ 日志管理器已就绪');
        logManager.info('  ✓ 事件管理器已就绪');
    }

    /**
     * 启动健康监控
     */
    startHealthMonitoring() {
        this.healthMonitorTimer = global.setInterval(() => {
            this.performHealthCheck();
        }, HEALTH_CHECK_INTERVAL);

        logManager.info('💓 健康监控已启动');
    }

    /**
     * 停止健康监控
     */
    stopHealthMonitoring() {
        if (this.healthMonitorTimer) {
            global.clearInterval(this.healthMonitorTimer);
            this.healthMonitorTimer = null;

            logManager.info('💓 健康监控已停止');
        }
    }

    /**
     * 执行健康检查
     */
    performHealthCheck() {
        try {
            const startTime = Date.now();
            
            // 检查缓存中是否有最近的健康检查结果
            const cacheKey = 'recent_health_check';
            const cachedResult = this.healthCache.get(cacheKey);
            
            if (cachedResult) {
                logManager.info('使用缓存的健康检查结果');
                return;
            }
            
            const healthReport = securityModuleManager.getHealthReport();
            const systemStatus = securityModuleManager.getStatus();

            // 检查是否有不健康的模块
            const unhealthyModules = healthReport.modules.filter(m => !m.isHealthy);

            if (unhealthyModules.length > 0) {
                logManager.warn(`⚠️  检测到 ${unhealthyModules.length} 个不健康的模块:`);
                unhealthyModules.forEach(module => {
                    logManager.warn(`   - ${module.name}: 健康分数 ${module.healthScore}`);
                });
            }

            // 获取内存使用情况
            const memUsage = process.memoryUsage();
            const memUsageMB = {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024)
            };

            const totalDuration = Date.now() - startTime;
            
            // 记录系统指标
            logManager.info('系统健康检查', {
                totalModules: systemStatus.totalModules,
                runningModules: systemStatus.runningModules,
                errorModules: systemStatus.errorModules,
                averageHealthScore: healthReport.overall.averageHealthScore,
                uptime: Date.now() - this.startTime.getTime(),
                memory: memUsageMB,
                checkDuration: totalDuration
            });

            // 内存监控和优化
            const memReport = this.memoryManager.getMemoryReport();
            if (memReport.current.heapUsed > 150) {
                logManager.warn(`⚠️  内存使用较高: ${memReport.current.heapUsed}MB`);
                
                // 如果内存使用超过阈值，执行垃圾回收
                if (memReport.current.heapUsed > 200) {
                    logManager.warn('内存使用过高，执行垃圾回收');
                    this.memoryManager.forceGarbageCollection();
                }
            }
            
            // 缓存健康检查结果
            const healthCheckResult = {
                timestamp: new Date().toISOString(),
                systemStatus,
                healthReport,
                memory: memUsageMB,
                duration: totalDuration
            };
            this.healthCache.set(cacheKey, healthCheckResult, 30000); // 缓存30秒
            
            logManager.info(`健康检查完成，耗时: ${totalDuration}ms，内存使用: ${memReport.current.heapUsed}MB`);
        } catch (error) {
            logManager.error('健康检查执行失败:', error);
        }
    }

    /**
     * 显示系统状态
     */
    displaySystemStatus() {
        const status = securityModuleManager.getStatus();
        const healthReport = securityModuleManager.getHealthReport();

        logManager.info('\n📊 系统状态概览:');
        logManager.info(`   📦 总模块数: ${status.totalModules}`);
        logManager.info(`   ✅ 运行中模块: ${status.runningModules}`);
        logManager.info(`   ❌ 错误模块: ${status.errorModules}`);
        logManager.info(`   💚 健康模块: ${healthReport.overall.healthyModules}`);
        logManager.info(`   ❤️  平均健康分数: ${healthReport.overall.averageHealthScore}`);

        logManager.info('\n🔧 模块启动顺序:');
        status.startupOrder.forEach((moduleName, index) => {
            logManager.info(`   ${index + 1}. ${moduleName}`);
        });

        logManager.info('\n💡 使用以下命令管理系统:');
        logManager.info('   - Ctrl+C: 优雅关闭');
        logManager.info('   - SIGUSR1: 重启系统 (kill -USR1 <pid>)');
        logManager.info('   - SIGUSR2: 显示状态 (kill -USR2 <pid>)');
    }

    /**
     * 格式化运行时间
     */
    formatUptime(ms) {
        const seconds = Math.floor(ms / MILLISECONDS_PER_SECOND);
        const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
        const hours = Math.floor(minutes / MINUTES_PER_HOUR);
        const days = Math.floor(hours / HOURS_PER_DAY);

        if (days > 0) {
            return `${days}天 ${hours % HOURS_PER_DAY}小时 ${minutes % SECONDS_PER_MINUTE}分钟`;
        } if (hours > 0) {
            return `${hours}小时 ${minutes % SECONDS_PER_MINUTE}分钟`;
        } if (minutes > 0) {
            return `${minutes}分钟 ${seconds % SECONDS_PER_MINUTE}秒`;
        }

        return `${seconds}秒`;
    }

    /**
     * 设置优雅关闭处理
     */
    setupGracefulShutdown() {
        // 处理 SIGTERM 和 SIGINT
        process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
        process.on('SIGINT', () => this.handleShutdown('SIGINT'));

        // 处理自定义信号
        process.on('SIGUSR1', () => this.handleRestart());
        process.on('SIGUSR2', () => this.handleStatusDisplay());

        // 处理未捕获的异常
        process.on('uncaughtException', error => {
            logManager.error('未捕获的异常:', error);
            this.handleShutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, _promise) => {
            logManager.error('未处理的Promise拒绝:', reason);
            this.handleShutdown('unhandledRejection');
        });
    }

    /**
     * 处理关闭信号
     */
    async handleShutdown(signal) {
        logManager.info(`\n收到 ${signal} 信号，开始优雅关闭...`);

        try {
            await this.stop();
            process.exit(0);
        } catch (error) {
            logManager.error('关闭过程中发生错误:', error);
            process.exit(1);
        }
    }

    /**
     * 处理重启信号
     */
    async handleRestart() {
        logManager.info('\n收到重启信号...');
        await this.restart();
    }

    /**
     * 处理状态显示信号
     */
    handleStatusDisplay() {
        logManager.info('\n📊 当前系统状态:');
        this.displaySystemStatus();

        const healthReport = securityModuleManager.getHealthReport();

        logManager.info('\n🏥 模块健康状态:');
        healthReport.modules.forEach(module => {
            const status = module.isHealthy ? '✅' : '❌';
            const uptime = this.formatUptime(module.uptime);

            logManager.info(`   ${status} ${module.name}: ${module.healthScore}% (运行时间: ${uptime})`);
        });
    }
}

// 创建应用程序实例
const app = new Application();

module.exports = {
    Application,
    app
};