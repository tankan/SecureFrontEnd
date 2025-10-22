/**
 * 性能优化工具类
 * 提供代码执行优化、性能分析和瓶颈检测功能
 */

// 性能优化器常量定义
const DEFAULT_SLOW_THRESHOLD = 100;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_MAX_CONCURRENT = 5;
const DEFAULT_CACHE_SIZE = 1000;
const DEFAULT_CACHE_TTL = 300000; // 5分钟
const DEFAULT_DEBOUNCE_DELAY = 300;
const DEFAULT_THROTTLE_DELAY = 1000;
const DEFAULT_QUEUE_SIZE = 100;
const DEFAULT_POOL_SIZE = 10;
const BYTES_TO_MB = 1024 * 1024;
const MAX_PERFORMANCE_HISTORY = 1000;
const PERFORMANCE_REPORT_INTERVAL = 60000; // 1分钟
const { logger } = require('./logger');

class PerformanceOptimizer {
    constructor(options = {}) {
        this.config = {
            // 性能阈值配置
            slowOperationThreshold: options.slowOperationThreshold || DEFAULT_SLOW_THRESHOLD,
            batchSize: options.batchSize || DEFAULT_BATCH_SIZE,
            maxConcurrency: options.maxConcurrency || DEFAULT_MAX_CONCURRENT,

            // 缓存配置
            enableCaching: options.enableCaching !== false,
            cacheSize: options.cacheSize || DEFAULT_CACHE_SIZE,

            // 监控配置
            enableProfiling: options.enableProfiling !== false,
            profilingInterval: options.profilingInterval || 5000,

            ...options
        };

        this.performanceMetrics = new Map();
        this.operationCache = new Map();
        this.profilingData = [];
        this.isProfilerRunning = false;
        this.profilerTimer = null;
    }

    /**
     * 启动性能分析器
     */
    startProfiler() {
        if (this.isProfilerActive) return;
        
        this.isProfilerActive = true;
        this.profilerStartTime = Date.now();
        
        // 启动性能监控
        this.monitoringInterval = setInterval(() => {
            this.collectPerformanceMetrics();
        }, this.config.monitoringInterval);
        
        logger.info('📊 性能分析器已启动');
    }

    /**
     * 停止性能分析器
     */
    stopProfiler() {
        if (!this.isProfilerActive) return;
        
        this.isProfilerActive = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        logger.info('🔍 性能分析器已停止');
    }

    /**
     * 收集性能指标
     * 收集当前系统的性能数据
     */
    collectPerformanceMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        const metrics = {
            timestamp: Date.now(),
            memory: {
                rss: Math.round(memUsage.rss / BYTES_TO_MB),
                heapUsed: Math.round(memUsage.heapUsed / BYTES_TO_MB),
                heapTotal: Math.round(memUsage.heapTotal / BYTES_TO_MB),
                external: Math.round(memUsage.external / BYTES_TO_MB)
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            eventLoopLag: this.getEventLoopLag()
        };

        this.profilingData.push(metrics);

        // 保持历史数据在合理范围内
        if (this.profilingData.length > MAX_PERFORMANCE_HISTORY) {
            this.profilingData.shift();
        }
    }

    /**
     * 获取事件循环延迟
     * @returns {number} 事件循环延迟时间（毫秒）
     */
    getEventLoopLag() {
        const start = process.hrtime.bigint();
        setImmediate(() => {
            const lag = Number(process.hrtime.bigint() - start) / 1000000;
            return lag;
        });
        return 0; // 简化实现
    }

    /**
     * 获取操作统计信息
     * @returns {Object} 操作统计数据
     */
    getOperationStats() {
        const stats = {};

        for (const [operation, metrics] of this.performanceMetrics) {
            const totalTime = metrics.totalTime || 0;
            const count = metrics.count || 0;
            const avgTime = count > 0 ? totalTime / count : 0;

            stats[operation] = {
                count,
                totalTime,
                avgTime: Math.round(avgTime * 100) / 100,
                minTime: metrics.minTime || 0,
                maxTime: metrics.maxTime || 0,
                errors: metrics.errors || 0
            };
        }

        return stats;
    }

    /**
     * 监控函数执行性能
     * @param {string} operationName - 操作名称
     * @returns {Function} 性能监控装饰器
     */
    monitor(operationName) {
        return (target, propertyKey, descriptor) => {
            const originalMethod = descriptor.value;

            descriptor.value = async function (...args) {
                const startTime = process.hrtime.bigint();
                let error = null;

                try {
                    const result = await originalMethod.apply(this, args);
                    return result;
                } catch (err) {
                    error = err;
                    throw err;
                } finally {
                    const endTime = process.hrtime.bigint();
                    const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒

                    this.recordPerformance(operationName, duration, error);
                }
            };

            return descriptor;
        };
    }

    /**
     * 记录性能数据
     * @param {string} operationName - 操作名称
     * @param {number} duration - 执行时间（毫秒）
     * @param {Error} error - 错误对象（可选）
     */
    recordPerformance(operationName, duration, error = null) {
        if (!this.performanceMetrics.has(operationName)) {
            this.performanceMetrics.set(operationName, {
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                errors: 0
            });
        }

        const metrics = this.performanceMetrics.get(operationName);
        metrics.count++;
        metrics.totalTime += duration;
        metrics.minTime = Math.min(metrics.minTime, duration);
        metrics.maxTime = Math.max(metrics.maxTime, duration);

        if (error) {
            metrics.errors++;
        }

        // 检查是否为慢操作
        if (duration > this.config.slowOperationThreshold) {
            console.warn(`🐌 慢操作检测: ${operationName} 耗时 ${duration.toFixed(2)}ms`);
        }
    }

    /**
     * 批量处理数据
     * @param {Array} items - 待处理的数据项
     * @param {Function} processor - 处理函数
     * @param {Object} options - 配置选项
     * @returns {Promise<Array>} 处理结果
     */
    async processBatch(items, processor, options = {}) {
        const batchSize = options.batchSize || this.config.batchSize;
        const maxConcurrent = options.maxConcurrent || this.config.maxConcurrency;
        const results = [];

        // 分批处理
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchPromises = [];

            // 控制并发数量
            for (let j = 0; j < batch.length; j += maxConcurrent) {
                const concurrentBatch = batch.slice(j, j + maxConcurrent);
                const concurrentPromises = concurrentBatch.map(item => {
                    return this.monitor(`batch_process_${processor.name || 'anonymous'}`)(
                        async () => await processor(item)
                    )();
                });

                batchPromises.push(Promise.all(concurrentPromises));
            }

            const batchResults = await Promise.all(batchPromises);

            // 展平结果
            for (const batchResult of batchResults) {
                results.push(...batchResult);
            }
        }

        return results;
    }

    /**
     * 缓存函数结果
     * @param {Function} fn - 要缓存的函数
     * @param {Object} options - 缓存配置
     * @returns {Function} 带缓存的函数
     */
    cached(fn, options = {}) {
        const ttl = options.ttl || DEFAULT_CACHE_TTL;
        const keyGenerator = options.keyGenerator || ((...args) => JSON.stringify(args));

        return (...args) => {
            if (!this.config.enableCaching) {
                return fn(...args);
            }

            const key = keyGenerator(...args);
            const cached = this.operationCache.get(key);

            if (cached && Date.now() - cached.timestamp < ttl) {
                return cached.value;
            }

            const result = fn(...args);

            // 异步结果处理
            if (result && typeof result.then === 'function') {
                return result.then(value => {
                    this.operationCache.set(key, {
                        value,
                        timestamp: Date.now()
                    });

                    // 清理过期缓存
                    if (this.operationCache.size > this.config.cacheSize) {
                        this.clearExpiredCache();
                    }

                    return value;
                });
            }

            // 同步结果处理
            this.operationCache.set(key, {
                value: result,
                timestamp: Date.now()
            });

            return result;
        };
    }

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} delay - 延迟时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    debounce(func, delay = DEFAULT_DEBOUNCE_DELAY) {
        let timeoutId;

        return function debounced(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * 节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} delay - 节流间隔（毫秒）
     * @returns {Function} 节流后的函数
     */
    throttle(func, delay = DEFAULT_THROTTLE_DELAY) {
        let lastCall = 0;

        return function throttled(...args) {
            const now = Date.now();

            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }

    /**
     * 处理任务队列
     * @param {Array} tasks - 任务数组
     * @param {number} maxConcurrent - 最大并发数
     * @returns {Promise<Array>} 任务结果
     */
    async processQueue(tasks, maxConcurrent = DEFAULT_MAX_CONCURRENT) {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const promise = Promise.resolve(task()).then(result => {
                executing.splice(executing.indexOf(promise), 1);
                return result;
            });

            results.push(promise);
            executing.push(promise);

            if (executing.length >= maxConcurrent) {
                await Promise.race(executing);
            }
        }

        return Promise.all(results);
    }

    /**
     * 创建异步队列
     * @param {number} concurrency - 并发数
     * @returns {Object} 队列对象
     */
    createAsyncQueue(concurrency = 1) {
        const queue = [];
        let running = 0;

        const processNext = () => {
            if (queue.length === 0 || running >= concurrency) {
                return;
            }

            running++;
            const { task, resolve, reject } = queue.shift();

            task()
                .then(resolve)
                .catch(reject)
                .finally(() => {
                    running--;
                    processNext();
                });
        };

        return {
            add: (task) => {
                return new Promise((resolve, reject) => {
                    queue.push({ task, resolve, reject });
                    processNext();
                });
            },
            size: () => queue.length,
            running: () => running
        };
    }

    /**
     * 创建对象池
     * @param {Function} createFn - 创建对象的函数
     * @param {Function} resetFn - 重置对象的函数
     * @param {number} initialSize - 初始大小
     * @returns {Object} 对象池
     */
    createObjectPool(createFn, resetFn, initialSize = DEFAULT_POOL_SIZE) {
        const pool = [];

        // 初始化对象池
        for (let i = 0; i < initialSize; i++) {
            pool.push(createFn());
        }

        return {
            acquire() {
                return pool.length > 0 ? pool.pop() : createFn();
            },
            release(obj) {
                if (resetFn) {
                    resetFn(obj);
                }
                pool.push(obj);
            },
            size() {
                return pool.length;
            }
        };
    }

    /**
     * 获取性能报告
     * @returns {Object} 性能报告
     */
    getPerformanceReport() {
        const operationStats = this.getOperationStats();
        const cacheHitRate = this.calculateCacheHitRate();

        return {
            timestamp: Date.now(),
            operations: operationStats,
            cache: {
                size: this.operationCache.size,
                maxSize: this.config.cacheSize,
                hitRate: cacheHitRate
            },
            profiling: {
                isRunning: this.isProfilerRunning,
                dataPoints: this.profilingData.length,
                latestMetrics: this.profilingData[this.profilingData.length - 1]
            },
            config: this.config
        };
    }

    /**
     * 计算缓存命中率
     * @returns {number} 缓存命中率（百分比）
     */
    calculateCacheHitRate() {
        let totalHits = 0;
        let totalRequests = 0;

        for (const [operation, metrics] of this.performanceMetrics) {
            if (operation.includes('cache_hit')) {
                totalHits += metrics.count;
            }
            if (operation.includes('cache_')) {
                totalRequests += metrics.count;
            }
        }

        return totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) : 0;
    }

    /**
     * 清理过期缓存
     */
    clearCache() {
        this.operationCache.clear();
        this.metrics.cacheHits = 0;
        this.metrics.cacheMisses = 0;
        logger.info('🧹 性能缓存已清理');
    }

    /**
     * 重置性能指标
     */
    resetMetrics() {
        this.metrics = {
            operationCount: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0,
            slowOperations: 0,
            cacheHits: 0,
            cacheMisses: 0,
            eventLoopLag: 0,
            memoryUsage: 0,
            cpuUsage: 0
        };
        
        this.operationStats.clear();
        logger.info('📊 性能指标已重置');
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

module.exports = PerformanceOptimizer;
