/**
 * 模块注册中心 - 管理所有模块的注册、发现和生命周期
 * 
 * 功能：
 * 1. 模块注册与发现
 * 2. 依赖关系管理
 * 3. 模块生命周期协调
 * 4. 模块间通信代理
 * 5. 模块健康监控
 * 6. 动态模块加载/卸载
 */

const { EventEmitter } = require('events');
const { MODULE_STATUS } = require('./module-base');
const { logger } = require('../../utils/logger');

/**
 * 模块注册中心
 */
class ModuleRegistry extends EventEmitter {
    constructor() {
        super();
        
        this.modules = new Map(); // 已注册的模块
        this.dependencies = new Map(); // 模块依赖关系
        this.startupOrder = []; // 启动顺序
        this.shutdownOrder = []; // 关闭顺序
        this.isShuttingDown = false;
        
        // 注册中心状态
        this.status = {
            totalModules: 0,
            runningModules: 0,
            errorModules: 0,
            lastUpdate: new Date()
        };
        
        // 设置进程退出处理
        this.setupProcessHandlers();
    }
    
    /**
     * 注册模块
     */
    register(module, dependencies = []) {
        if (!module || !module.moduleName) {
            throw new Error('模块必须有有效的moduleName属性');
        }
        
        const moduleName = module.moduleName;
        
        if (this.modules.has(moduleName)) {
            logger.warn(`⚠️ 模块 ${moduleName} 已存在，将被覆盖`);
        }
        
        // 注册模块
        this.modules.set(moduleName, module);
        this.dependencies.set(moduleName, dependencies);
        
        // 更新状态
        this.status.totalModules = this.modules.size;
        this.status.lastUpdate = new Date();
        
        logger.info(`📦 模块 ${moduleName} 已注册，依赖: [${dependencies.join(', ')}]`);
        
        // 发出注册事件
        this.emit('moduleRegistered', { moduleName, dependencies });
        
        return this;
    }
    
    /**
     * 注销模块
     */
    unregister(moduleName) {
        if (!this.modules.has(moduleName)) {
            throw new Error(`模块 ${moduleName} 未注册`);
        }
        
        const module = this.modules.get(moduleName);
        
        // 检查是否有其他模块依赖此模块
        const dependents = this.findDependents(moduleName);
        if (dependents.length > 0) {
            throw new Error(`无法注销模块 ${moduleName}，以下模块依赖它: ${dependents.join(', ')}`);
        }
        
        // 停止模块
        if (module.status === MODULE_STATUS.RUNNING) {
            module.stop();
        }
        
        // 移除模块
        this.modules.delete(moduleName);
        this.dependencies.delete(moduleName);
        
        // 更新启动顺序
        this.updateStartupOrder();
        
        this.status.totalModules = this.modules.size;
        this.status.lastUpdate = new Date();
        
        this.emit('moduleUnregistered', moduleName);
        
        console.log(`❌ 模块已注销: ${moduleName}`);
        
        return this;
    }
    
    /**
     * 获取模块
     */
    get(moduleName) {
        return this.modules.get(moduleName);
    }
    
    /**
     * 检查模块是否存在
     */
    has(moduleName) {
        return this.modules.has(moduleName);
    }
    
    /**
     * 获取所有模块名称
     */
    getModuleNames() {
        return Array.from(this.modules.keys());
    }
    
    /**
     * 获取所有模块
     */
    getAllModules() {
        return Array.from(this.modules.values());
    }
    
    /**
     * 验证依赖关系
     */
    validateDependencies(moduleName, dependencies) {
        for (const dep of dependencies) {
            if (!this.modules.has(dep)) {
                throw new Error(`模块 ${moduleName} 的依赖 ${dep} 未注册`);
            }
        }
        
        // 检查循环依赖
        if (this.hasCircularDependency(moduleName, dependencies)) {
            throw new Error(`检测到循环依赖: ${moduleName}`);
        }
    }
    
    /**
     * 检查循环依赖
     */
    hasCircularDependency(moduleName, dependencies, visited = new Set()) {
        if (visited.has(moduleName)) {
            return true;
        }
        
        visited.add(moduleName);
        
        for (const dep of dependencies) {
            const depDependencies = this.dependencies.get(dep) || [];
            if (this.hasCircularDependency(dep, depDependencies, new Set(visited))) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 查找依赖某个模块的模块
     */
    findDependents(moduleName) {
        const dependents = [];
        
        for (const [name, deps] of this.dependencies) {
            if (deps.includes(moduleName)) {
                dependents.push(name);
            }
        }
        
        return dependents;
    }
    
    /**
     * 更新启动顺序
     */
    updateStartupOrder() {
        this.startupOrder = this.topologicalSort();
        this.shutdownOrder = [...this.startupOrder].reverse();
    }
    
    /**
     * 拓扑排序 - 确定模块启动顺序
     */
    topologicalSort() {
        const visited = new Set();
        const temp = new Set();
        const result = [];
        
        const visit = (moduleName) => {
            if (temp.has(moduleName)) {
                throw new Error(`检测到循环依赖: ${moduleName}`);
            }
            
            if (!visited.has(moduleName)) {
                temp.add(moduleName);
                
                const deps = this.dependencies.get(moduleName) || [];
                for (const dep of deps) {
                    visit(dep);
                }
                
                temp.delete(moduleName);
                visited.add(moduleName);
                result.push(moduleName);
            }
        };
        
        for (const moduleName of this.modules.keys()) {
            if (!visited.has(moduleName)) {
                visit(moduleName);
            }
        }
        
        return result;
    }
    
    /**
     * 启动所有模块
     */
    async startAll() {
        if (this.isShuttingDown) {
            throw new Error('注册中心正在关闭，无法启动模块');
        }
        
        logger.info('🚀 开始启动所有模块...');
        
        try {
            // 计算启动顺序
            this.calculateStartupOrder();
            
            // 按顺序启动模块
            for (const moduleName of this.startupOrder) {
                await this.startModule(moduleName);
            }
            
            logger.info(`✅ 所有模块启动完成，共 ${this.startupOrder.length} 个模块`);
            this.emit('allModulesStarted');
            
        } catch (error) {
            logger.error('❌ 模块启动失败:', error);
            throw error;
        }
    }
    
    /**
     * 停止所有模块
     */
    async stopAll() {
        this.isShuttingDown = true;
        logger.info('🛑 开始停止所有模块...');
        
        try {
            // 计算关闭顺序（启动顺序的逆序）
            this.shutdownOrder = [...this.startupOrder].reverse();
            
            // 按顺序停止模块
            for (const moduleName of this.shutdownOrder) {
                await this.stopModule(moduleName);
            }
            
            logger.info(`✅ 所有模块已停止，共 ${this.shutdownOrder.length} 个模块`);
            this.emit('allModulesStopped');
            
        } catch (error) {
            logger.error('❌ 模块停止失败:', error);
            throw error;
        } finally {
            this.isShuttingDown = false;
        }
    }
    
    /**
     * 重启所有模块
     */
    async restartAll() {
        await this.stopAll();
        await this.startAll();
    }
    
    /**
     * 启动特定模块及其依赖
     */
    async startModule(moduleName) {
        if (!this.modules.has(moduleName)) {
            throw new Error(`模块 ${moduleName} 未注册`);
        }
        
        // 获取依赖链
        const dependencyChain = this.getDependencyChain(moduleName);
        
        // 按顺序启动
        for (const depName of dependencyChain) {
            const module = this.modules.get(depName);
            
            if (module.status !== MODULE_STATUS.RUNNING) {
                await module.start();
            }
        }
        
        this.updateStatus();
    }
    
    /**
     * 停止特定模块及其依赖者
     */
    async stopModule(moduleName) {
        if (!this.modules.has(moduleName)) {
            throw new Error(`模块 ${moduleName} 未注册`);
        }
        
        // 获取依赖者链
        const dependentChain = this.getDependentChain(moduleName);
        
        // 按逆序停止
        for (const depName of dependentChain.reverse()) {
            const module = this.modules.get(depName);
            
            if (module.status === MODULE_STATUS.RUNNING) {
                await module.stop();
            }
        }
        
        this.updateStatus();
    }
    
    /**
     * 获取依赖链
     */
    getDependencyChain(moduleName, chain = [], visited = new Set()) {
        if (visited.has(moduleName)) {
            return chain;
        }
        
        visited.add(moduleName);
        
        const deps = this.dependencies.get(moduleName) || [];
        for (const dep of deps) {
            this.getDependencyChain(dep, chain, visited);
        }
        
        if (!chain.includes(moduleName)) {
            chain.push(moduleName);
        }
        
        return chain;
    }
    
    /**
     * 获取依赖者链
     */
    getDependentChain(moduleName, chain = [], visited = new Set()) {
        if (visited.has(moduleName)) {
            return chain;
        }
        
        visited.add(moduleName);
        
        if (!chain.includes(moduleName)) {
            chain.push(moduleName);
        }
        
        const dependents = this.findDependents(moduleName);
        for (const dependent of dependents) {
            this.getDependentChain(dependent, chain, visited);
        }
        
        return chain;
    }
    
    /**
     * 设置模块事件监听器
     */
    setupModuleEventListeners(module) {
        module.on('statusChange', (oldStatus, newStatus) => {
            this.updateStatus();
            this.emit('moduleStatusChange', module.moduleName, oldStatus, newStatus);
        });
        
        module.on('error', (error) => {
            this.emit('moduleError', module.moduleName, error);
        });
        
        module.on('log', (logEntry) => {
            this.emit('moduleLog', logEntry);
        });
    }
    
    /**
     * 更新注册中心状态
     */
    updateStatus() {
        let runningCount = 0;
        let errorCount = 0;
        
        for (const module of this.modules.values()) {
            if (module.status === MODULE_STATUS.RUNNING) {
                runningCount++;
            } else if (module.status === MODULE_STATUS.ERROR) {
                errorCount++;
            }
        }
        
        this.status = {
            totalModules: this.modules.size,
            runningModules: runningCount,
            errorModules: errorCount,
            lastUpdate: new Date()
        };
        
        this.emit('statusUpdate', this.status);
    }
    
    /**
     * 获取注册中心状态
     */
    getStatus() {
        return {
            ...this.status,
            modules: Array.from(this.modules.values()).map(module => module.getInfo()),
            startupOrder: this.startupOrder,
            shutdownOrder: this.shutdownOrder
        };
    }
    
    /**
     * 获取模块健康报告
     */
    getHealthReport() {
        const report = {
            timestamp: new Date(),
            overall: {
                totalModules: this.modules.size,
                healthyModules: 0,
                unhealthyModules: 0,
                averageHealthScore: 0
            },
            modules: []
        };
        
        let totalHealthScore = 0;
        
        for (const module of this.modules.values()) {
            const moduleInfo = module.getInfo();
            const isHealthy = moduleInfo.healthScore >= 70;
            
            if (isHealthy) {
                report.overall.healthyModules++;
            } else {
                report.overall.unhealthyModules++;
            }
            
            totalHealthScore += moduleInfo.healthScore;
            
            report.modules.push({
                name: moduleInfo.name,
                status: moduleInfo.status,
                healthScore: moduleInfo.healthScore,
                uptime: moduleInfo.uptime,
                isHealthy
            });
        }
        
        report.overall.averageHealthScore = this.modules.size > 0 
            ? Math.round(totalHealthScore / this.modules.size) 
            : 0;
        
        return report;
    }
    
    /**
     * 设置进程处理器
     */
    setupProcessHandlers() {
        // 优雅关闭处理
        const gracefulShutdown = async (signal) => {
            logger.info(`📡 收到 ${signal} 信号，开始优雅关闭...`);
            
            try {
                await this.stopAll();
                logger.info('👋 所有模块已安全关闭');
                process.exit(0);
            } catch (error) {
                logger.error('❌ 优雅关闭失败:', error);
                process.exit(1);
            }
        };
        
        // 注册信号处理器
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
        // 未捕获异常处理
        process.on('uncaughtException', (error) => {
            logger.error('💥 未捕获异常:', error);
            gracefulShutdown('uncaughtException');
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('💥 未处理的Promise拒绝:', reason);
            gracefulShutdown('unhandledRejection');
        });
    }
}

// 创建全局注册中心实例
const globalRegistry = new ModuleRegistry();

module.exports = {
    ModuleRegistry,
    globalRegistry
};