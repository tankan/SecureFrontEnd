/**
 * 模块基类 - 为所有安全模块提供统一的接口和基础功能
 * 
 * 提供功能：
 * 1. 统一的模块生命周期管理
 * 2. 标准化的事件处理机制
 * 3. 通用的配置管理
 * 4. 统一的日志记录
 * 5. 模块健康状态监控
 * 6. 标准化的错误处理
 */

const { EventEmitter } = require('events');

/**
 * 模块状态枚举
 */
const MODULE_STATUS = {
    INITIALIZING: 'initializing',
    READY: 'ready',
    RUNNING: 'running',
    STOPPING: 'stopping',
    STOPPED: 'stopped',
    ERROR: 'error'
};

/**
 * 模块基类
 */
class ModuleBase extends EventEmitter {
    constructor(moduleName, options = {}) {
        super();
        
        this.moduleName = moduleName;
        this.moduleId = `${moduleName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.status = MODULE_STATUS.INITIALIZING;
        this.startTime = null;
        this.lastActivity = new Date();
        
        // 模块配置
        this.config = {
            enabled: true,
            logLevel: 'info',
            healthCheckInterval: 30000, // 30秒
            maxRetries: 3,
            retryDelay: 1000,
            ...options
        };
        
        // 模块指标
        this.metrics = {
            startCount: 0,
            errorCount: 0,
            lastError: null,
            operationCount: 0,
            averageResponseTime: 0,
            healthScore: 100
        };
        
        // 健康检查定时器
        this.healthCheckTimer = null;
        
        // 绑定事件处理器
        this.setupEventHandlers();
        
        // 初始化模块
        this.initialize();
    }
    
    /**
     * 设置事件处理器
     */
    setupEventHandlers() {
        this.on('error', (error) => {
            this.handleError(error);
        });
        
        this.on('statusChange', (oldStatus, newStatus) => {
            this.log('info', `模块状态变更: ${oldStatus} -> ${newStatus}`);
        });
    }
    
    /**
     * 初始化模块
     */
    async initialize() {
        try {
            this.log('info', `初始化模块: ${this.moduleName}`);
            
            // 子类可重写此方法
            await this.onInitialize();
            
            this.setStatus(MODULE_STATUS.READY);
            this.log('info', `模块初始化完成: ${this.moduleName}`);
            
        } catch (error) {
            this.setStatus(MODULE_STATUS.ERROR);
            this.emit('error', error);
        }
    }
    
    /**
     * 启动模块
     */
    async start() {
        if (this.status === MODULE_STATUS.RUNNING) {
            this.log('warn', '模块已在运行中');
            return;
        }
        
        try {
            this.log('info', `启动模块: ${this.moduleName}`);
            this.setStatus(MODULE_STATUS.RUNNING);
            this.startTime = new Date();
            this.metrics.startCount++;
            
            // 子类可重写此方法
            await this.onStart();
            
            // 启动健康检查
            this.startHealthCheck();
            
            this.log('info', `模块启动成功: ${this.moduleName}`);
            
        } catch (error) {
            this.setStatus(MODULE_STATUS.ERROR);
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * 停止模块
     */
    async stop() {
        if (this.status === MODULE_STATUS.STOPPED) {
            this.log('warn', '模块已停止');
            return;
        }
        
        try {
            this.log('info', `停止模块: ${this.moduleName}`);
            this.setStatus(MODULE_STATUS.STOPPING);
            
            // 停止健康检查
            this.stopHealthCheck();
            
            // 子类可重写此方法
            await this.onStop();
            
            this.setStatus(MODULE_STATUS.STOPPED);
            this.log('info', `模块停止成功: ${this.moduleName}`);
            
        } catch (error) {
            this.setStatus(MODULE_STATUS.ERROR);
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * 重启模块
     */
    async restart() {
        this.log('info', `重启模块: ${this.moduleName}`);
        await this.stop();
        await this.start();
    }
    
    /**
     * 设置模块状态
     */
    setStatus(newStatus) {
        const oldStatus = this.status;
        this.status = newStatus;
        this.lastActivity = new Date();
        this.emit('statusChange', oldStatus, newStatus);
    }
    
    /**
     * 启动健康检查
     */
    startHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);
    }
    
    /**
     * 停止健康检查
     */
    stopHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }
    
    /**
     * 执行健康检查
     */
    async performHealthCheck() {
        try {
            const healthData = await this.onHealthCheck();
            this.updateHealthScore(healthData);
            this.emit('healthCheck', healthData);
        } catch (error) {
            this.log('error', `健康检查失败: ${error.message}`);
            this.metrics.healthScore = Math.max(0, this.metrics.healthScore - 10);
        }
    }
    
    /**
     * 更新健康分数
     */
    updateHealthScore(healthData) {
        if (healthData && typeof healthData.score === 'number') {
            this.metrics.healthScore = Math.max(0, Math.min(100, healthData.score));
        }
    }
    
    /**
     * 处理错误
     */
    handleError(error) {
        this.metrics.errorCount++;
        this.metrics.lastError = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date()
        };
        
        this.log('error', `模块错误: ${error.message}`);
        
        // 降低健康分数
        this.metrics.healthScore = Math.max(0, this.metrics.healthScore - 20);
    }
    
    /**
     * 记录操作
     */
    recordOperation(responseTime) {
        this.metrics.operationCount++;
        
        // 计算平均响应时间
        if (this.metrics.averageResponseTime === 0) {
            this.metrics.averageResponseTime = responseTime;
        } else {
            this.metrics.averageResponseTime = 
                (this.metrics.averageResponseTime + responseTime) / 2;
        }
        
        this.lastActivity = new Date();
    }
    
    /**
     * 获取模块状态
     */
    getStatus() {
        return {
            moduleId: this.moduleId,
            moduleName: this.moduleName,
            status: this.status,
            startTime: this.startTime,
            lastActivity: this.lastActivity,
            uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
            config: { ...this.config },
            metrics: { ...this.metrics }
        };
    }
    
    /**
     * 获取模块信息
     */
    getInfo() {
        return {
            name: this.moduleName,
            id: this.moduleId,
            status: this.status,
            healthScore: this.metrics.healthScore,
            uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0
        };
    }
    
    /**
     * 日志记录
     */
    log(level, message, data = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            module: this.moduleName,
            moduleId: this.moduleId,
            message,
            data
        };
        
        // 发出日志事件
        this.emit('log', logEntry);
        
        // 控制台输出（可配置）
        if (this.shouldLog(level)) {
            const prefix = `[${logEntry.timestamp}] [${level.toUpperCase()}] [${this.moduleName}]`;
            console.log(`${prefix} ${message}`, data ? data : '');
        }
    }
    
    /**
     * 判断是否应该记录日志
     */
    shouldLog(level) {
        const levels = ['error', 'warn', 'info', 'debug'];
        const configLevel = levels.indexOf(this.config.logLevel);
        const messageLevel = levels.indexOf(level);
        
        return messageLevel <= configLevel;
    }
    
    // ==================== 子类可重写的方法 ====================
    
    /**
     * 模块初始化钩子 - 子类可重写
     */
    async onInitialize() {
        // 子类实现具体的初始化逻辑
    }
    
    /**
     * 模块启动钩子 - 子类可重写
     */
    async onStart() {
        // 子类实现具体的启动逻辑
    }
    
    /**
     * 模块停止钩子 - 子类可重写
     */
    async onStop() {
        // 子类实现具体的停止逻辑
    }
    
    /**
     * 健康检查钩子 - 子类可重写
     */
    async onHealthCheck() {
        // 子类实现具体的健康检查逻辑
        return {
            score: this.metrics.healthScore,
            status: this.status,
            lastActivity: this.lastActivity
        };
    }
}

/**
 * 模块工厂类
 */
class ModuleFactory {
    static create(moduleName, moduleClass, options = {}) {
        if (!moduleClass || typeof moduleClass !== 'function') {
            throw new Error('模块类必须是一个构造函数');
        }
        
        return new moduleClass(moduleName, options);
    }
}

module.exports = {
    ModuleBase,
    ModuleFactory,
    MODULE_STATUS
};