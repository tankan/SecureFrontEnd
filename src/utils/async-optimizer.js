/**
 * 异步操作优化工具
 * 提供并发控制、任务队列管理和异步操作优化功能
 */

// 异步优化器常量定义
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_TIMEOUT = 30000; // 30秒
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_QUEUE_SIZE = 1000;
const MAX_METRICS_HISTORY = 100;
const METRICS_CLEANUP_INTERVAL = 60000; // 1分钟
const { logger } = require('./logger');

class AsyncOptimizer {
    constructor(options = {}) {
        this.config = {
            // 并发控制
            maxConcurrency: options.maxConcurrency || DEFAULT_CONCURRENCY,
            queueTimeout: options.queueTimeout || DEFAULT_TIMEOUT,
            retryAttempts: options.retryAttempts || DEFAULT_MAX_RETRIES,
            retryDelay: options.retryDelay || DEFAULT_RETRY_DELAY,

            // 批处理配置
            batchSize: options.batchSize || DEFAULT_BATCH_SIZE,
            batchTimeout: options.batchTimeout || 5000,

            // 监控配置
            enableMetrics: options.enableMetrics !== false,
            metricsInterval: options.metricsInterval || 10000,

            ...options
        };

        this.taskQueues = new Map();
        this.runningTasks = new Map();
        this.metrics = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            averageExecutionTime: 0,
            concurrentTasks: 0
        };

        this.isMonitoring = false;
        this.metricsTimer = null;
    }

    /**
     * 启动监控
     * 开始收集异步操作的性能指标
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.monitoringStartTime = Date.now();
        
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, this.config.monitoringInterval);
        
        logger.info('🔍 异步优化器监控已启动');
    }

    /**
     * 停止监控
     * 停止收集性能指标
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        logger.info('⏹️ 异步优化器监控已停止');
    }

    /**
     * 收集性能指标
     */
    collectMetrics() {
        const currentTime = Date.now();
        let totalExecutionTime = 0;
        let taskCount = 0;

        for (const [taskId, task] of this.runningTasks) {
            if (task.startTime) {
                totalExecutionTime += currentTime - task.startTime;
                taskCount++;
            }
        }

        this.metrics.concurrentTasks = this.runningTasks.size;
        this.metrics.averageExecutionTime = taskCount > 0 ? totalExecutionTime / taskCount : 0;

        console.log(`📈 当前并发任务: ${this.metrics.concurrentTasks}, 平均执行时间: ${this.metrics.averageExecutionTime.toFixed(2)}ms`);
    }

    /**
     * 创建任务队列
     * @param {string} queueName - 队列名称
     * @param {Object} options - 队列配置选项
     * @returns {Object} 队列对象
     */
    createQueue(queueName, options = {}) {
        const queueConfig = {
            concurrency: options.concurrency || this.config.maxConcurrency,
            timeout: options.timeout || this.config.queueTimeout,
            retryAttempts: options.retryAttempts || this.config.retryAttempts,
            retryDelay: options.retryDelay || this.config.retryDelay
        };

        const queue = {
            name: queueName,
            config: queueConfig,
            tasks: [],
            running: 0,
            paused: false,
            stats: {
                processed: 0,
                failed: 0,
                retries: 0
            }
        };

        this.taskQueues.set(queueName, queue);

        return {
            add: (task, priority = 0) => this.addTask(queueName, task, priority),
            pause: () => this.pauseQueue(queueName),
            resume: () => this.resumeQueue(queueName),
            clear: () => this.clearQueue(queueName),
            getStats: () => this.getQueueStats(queueName)
        };
    }

    /**
     * 添加任务到队列
     * @param {string} queueName - 队列名称
     * @param {Function} task - 任务函数
     * @param {number} priority - 任务优先级
     * @returns {Promise} 任务执行结果
     */
    async addTask(queueName, task, priority = 0) {
        const queue = this.taskQueues.get(queueName);
        if (!queue) {
            throw new Error(`队列 ${queueName} 不存在`);
        }

        return new Promise((resolve, reject) => {
            const taskWrapper = {
                id: this.generateTaskId(),
                task,
                priority,
                resolve,
                reject,
                attempts: 0,
                createdAt: Date.now()
            };

            // 按优先级插入任务
            const insertIndex = queue.tasks.findIndex(t => t.priority < priority);
            if (insertIndex === -1) {
                queue.tasks.push(taskWrapper);
            } else {
                queue.tasks.splice(insertIndex, 0, taskWrapper);
            }

            this.processQueue(queueName);
        });
    }

    /**
     * 处理队列中的任务
     * @param {string} queueName - 队列名称
     */
    async processQueue(queueName) {
        const queue = this.taskQueues.get(queueName);
        if (!queue || queue.paused) return;

        while (queue.tasks.length > 0 && queue.running < queue.config.concurrency) {
            const taskWrapper = queue.tasks.shift();
            queue.running++;

            this.executeTask(queueName, taskWrapper);
        }
    }

    /**
     * 执行单个任务
     * @param {string} queueName - 队列名称
     * @param {Object} taskWrapper - 任务包装对象
     */
    async executeTask(queueName, taskWrapper) {
        const queue = this.taskQueues.get(queueName);
        const startTime = Date.now();

        this.runningTasks.set(taskWrapper.id, {
            queueName,
            startTime,
            task: taskWrapper
        });

        try {
            // 设置超时
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('任务执行超时')), queue.config.timeout);
            });

            const result = await Promise.race([
                taskWrapper.task(),
                timeoutPromise
            ]);

            taskWrapper.resolve(result);
            queue.stats.processed++;
            this.metrics.completedTasks++;

        } catch (error) {
            taskWrapper.attempts++;

            if (taskWrapper.attempts < queue.config.retryAttempts) {
                // 重试任务
                setTimeout(() => {
                    queue.tasks.unshift(taskWrapper);
                    this.processQueue(queueName);
                }, queue.config.retryDelay);

                queue.stats.retries++;
            } else {
                taskWrapper.reject(error);
                queue.stats.failed++;
                this.metrics.failedTasks++;
            }
        } finally {
            this.runningTasks.delete(taskWrapper.id);
            queue.running--;

            // 更新平均执行时间
            const executionTime = Date.now() - startTime;
            this.updateAverageExecutionTime(executionTime);

            // 继续处理队列
            this.processQueue(queueName);
        }
    }

    /**
     * 批量处理任务
     * @param {Array} tasks - 任务数组
     * @param {Object} options - 批处理选项
     * @returns {Promise<Array>} 批处理结果
     */
    async batchProcess(tasks, options = {}) {
        const batchSize = options.batchSize || this.config.batchSize;
        const concurrency = options.concurrency || this.config.maxConcurrency;
        const timeout = options.timeout || this.config.batchTimeout;

        const results = [];
        const batches = [];

        // 分批
        for (let i = 0; i < tasks.length; i += batchSize) {
            batches.push(tasks.slice(i, i + batchSize));
        }

        // 并发处理批次
        const semaphore = new Semaphore(concurrency);

        const batchPromises = batches.map(async (batch, batchIndex) => {
            await semaphore.acquire();

            try {
                const batchResults = await Promise.all(
                    batch.map(async (task, taskIndex) => {
                        const taskId = `batch_${batchIndex}_task_${taskIndex}`;
                        
                        try {
                            const timeoutPromise = new Promise((_, reject) => {
                                setTimeout(() => reject(new Error('批处理任务超时')), timeout);
                            });

                            return await Promise.race([
                                typeof task === 'function' ? task() : task,
                                timeoutPromise
                            ]);
                        } catch (error) {
                            return { error: error.message, taskId };
                        }
                    })
                );

                return batchResults;
            } finally {
                semaphore.release();
            }
        });

        const batchResults = await Promise.all(batchPromises);

        // 展平结果
        for (const batchResult of batchResults) {
            results.push(...batchResult);
        }

        return results;
    }

    /**
     * 并发控制执行
     * @param {Array} tasks - 任务数组
     * @param {number} concurrency - 并发数
     * @returns {Promise<Array>} 执行结果
     */
    async concurrent(tasks, concurrency = this.config.maxConcurrency) {
        const results = [];
        const executing = [];

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const promise = Promise.resolve(typeof task === 'function' ? task() : task)
                .then(result => ({ index: i, result }))
                .catch(error => ({ index: i, error }));

            executing.push(promise);

            if (executing.length >= concurrency) {
                const completed = await Promise.race(executing);
                const completedIndex = executing.findIndex(p => p === promise);
                executing.splice(completedIndex, 1);
                results[completed.index] = completed.result || completed.error;
            }
        }

        // 等待剩余任务完成
        const remaining = await Promise.all(executing);
        for (const completed of remaining) {
            results[completed.index] = completed.result || completed.error;
        }

        return results;
    }

    /**
     * 重试机制包装器
     * @param {Function} fn - 要重试的函数
     * @param {Object} options - 重试选项
     * @returns {Promise} 执行结果
     */
    async retry(fn, options = {}) {
        const maxAttempts = options.maxAttempts || this.config.retryAttempts;
        const delay = options.delay || this.config.retryDelay;
        const backoff = options.backoff || 1;

        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (attempt === maxAttempts) {
                    throw error;
                }

                // 计算延迟时间（支持指数退避）
                const currentDelay = delay * Math.pow(backoff, attempt - 1);
                await this.sleep(currentDelay);

                console.warn(`重试第 ${attempt} 次失败，${currentDelay}ms 后重试: ${error.message}`);
            }
        }

        throw lastError;
    }

    /**
     * 超时控制包装器
     * @param {Function} fn - 要执行的函数
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise} 执行结果
     */
    async timeout(fn, timeout = this.config.queueTimeout) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`操作超时 (${timeout}ms)`)), timeout);
        });

        return Promise.race([
            typeof fn === 'function' ? fn() : fn,
            timeoutPromise
        ]);
    }

    /**
     * 防抖异步函数
     * @param {Function} fn - 要防抖的函数
     * @param {number} delay - 延迟时间
     * @returns {Function} 防抖后的函数
     */
    debounce(fn, delay = 300) {
        let timeoutId;
        let latestResolve;
        let latestReject;

        return (...args) => {
            return new Promise((resolve, reject) => {
                latestResolve = resolve;
                latestReject = reject;

                clearTimeout(timeoutId);
                timeoutId = setTimeout(async () => {
                    try {
                        const result = await fn(...args);
                        latestResolve(result);
                    } catch (error) {
                        latestReject(error);
                    }
                }, delay);
            });
        };
    }

    /**
     * 节流异步函数
     * @param {Function} fn - 要节流的函数
     * @param {number} delay - 节流间隔
     * @returns {Function} 节流后的函数
     */
    throttle(fn, delay = 1000) {
        let lastCall = 0;
        let lastPromise = Promise.resolve();

        return (...args) => {
            const now = Date.now();

            if (now - lastCall >= delay) {
                lastCall = now;
                lastPromise = fn(...args);
            }

            return lastPromise;
        };
    }

    /**
     * 暂停队列
     * @param {string} queueName - 队列名称
     */
    pauseQueue(queueName) {
        const queue = this.taskQueues.get(queueName);
        if (queue) {
            queue.paused = true;
            console.log(`⏸️ 队列 ${queueName} 已暂停`);
        }
    }

    /**
     * 恢复队列
     * @param {string} queueName - 队列名称
     */
    resumeQueue(queueName) {
        const queue = this.taskQueues.get(queueName);
        if (queue) {
            queue.paused = false;
            this.processQueue(queueName);
            console.log(`▶️ 队列 ${queueName} 已恢复`);
        }
    }

    /**
     * 清空队列
     * @param {string} queueName - 队列名称
     */
    clearQueue(queueName) {
        const queue = this.taskQueues.get(queueName);
        if (queue) {
            // 拒绝所有待处理的任务
            for (const task of queue.tasks) {
                task.reject(new Error('队列已清空'));
            }
            queue.tasks = [];
            console.log(`🧹 队列 ${queueName} 已清空`);
        }
    }

    /**
     * 获取队列统计信息
     * @param {string} queueName - 队列名称
     * @returns {Object} 队列统计数据
     */
    getQueueStats(queueName) {
        const queue = this.taskQueues.get(queueName);
        if (!queue) return null;

        return {
            name: queueName,
            pending: queue.tasks.length,
            running: queue.running,
            paused: queue.paused,
            stats: { ...queue.stats },
            config: { ...queue.config }
        };
    }

    /**
     * 获取所有队列统计信息
     * @returns {Object} 所有队列的统计数据
     */
    getAllStats() {
        const stats = {
            queues: {},
            global: { ...this.metrics },
            runningTasks: this.runningTasks.size
        };

        for (const [queueName] of this.taskQueues) {
            stats.queues[queueName] = this.getQueueStats(queueName);
        }

        return stats;
    }

    /**
     * 生成任务ID
     * @returns {string} 唯一任务ID
     */
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 更新平均执行时间
     * @param {number} executionTime - 执行时间
     */
    updateAverageExecutionTime(executionTime) {
        const totalTasks = this.metrics.completedTasks + this.metrics.failedTasks;
        if (totalTasks === 0) {
            this.metrics.averageExecutionTime = executionTime;
        } else {
            this.metrics.averageExecutionTime = 
                (this.metrics.averageExecutionTime * (totalTasks - 1) + executionTime) / totalTasks;
        }
    }

    /**
     * 睡眠函数
     * @param {number} ms - 睡眠时间（毫秒）
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 销毁优化器
     */
    destroy() {
        this.stopMonitoring();

        // 清空所有队列
        for (const [queueName] of this.taskQueues) {
            this.clearQueue(queueName);
        }

        this.taskQueues.clear();
        this.runningTasks.clear();

        console.log('🗑️ 异步优化器已销毁');
    }
}

/**
 * 信号量类，用于控制并发访问
 */
class Semaphore {
    /**
     * 构造函数
     * @param {number} permits - 许可证数量
     */
    constructor(permits) {
        this.permits = permits;
        this.waiting = [];
    }

    /**
     * 获取许可证
     * @returns {Promise<void>}
     */
    async acquire() {
        if (this.permits > 0) {
            this.permits--;
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.waiting.push(resolve);
        });
    }

    /**
     * 释放许可证
     */
    release() {
        this.permits++;

        if (this.waiting.length > 0) {
            const resolve = this.waiting.shift();
            this.permits--;
            resolve();
        }
    }
}

module.exports = AsyncOptimizer;
