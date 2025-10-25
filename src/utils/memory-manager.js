/**
 * 内存管理工具类
 * 提供内存监控、垃圾回收和内存泄漏检测功能
 */

const MEMORY_WARNING_THRESHOLD = 150;
const MEMORY_CRITICAL_THRESHOLD = 200;
const MEMORY_GC_THRESHOLD = 100;
const DEFAULT_MONITOR_INTERVAL = 30000;
const DEFAULT_CACHE_SIZE = 1000;
const DEFAULT_CACHE_CLEANUP_INTERVAL = 300000;
const MAX_MEMORY_HISTORY = 100;
const MEMORY_TREND_SAMPLES = 20;
const MEMORY_TREND_MIN_SAMPLES = 10;
const MEMORY_LEAK_ALERT_INTERVAL = 300000;
const MEMORY_GROWTH_THRESHOLD = 5;
const DEFAULT_CACHE_TTL = 3600000;
const MILLISECONDS_PER_MINUTE = 60000;
const BYTES_TO_MB = 1024 * 1024;

let logger;
try {
    ({ logger } = require('./logger'));
} catch (e) {
    // 在 Jest/CommonJS 环境下，logger.js 为 ESM，require 可能失败
    // 使用轻量级的空实现作为回退，避免测试因日志依赖失败
    logger = {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {}
    };
}

class MemoryManager {
    constructor(options = {}) {
        this.config = {
            // 内存阈值配置（MB）
            warningThreshold: options.warningThreshold || MEMORY_WARNING_THRESHOLD,
            criticalThreshold: options.criticalThreshold || MEMORY_CRITICAL_THRESHOLD,
            gcThreshold: options.gcThreshold || MEMORY_GC_THRESHOLD,

            // 监控配置
            monitorInterval: options.monitorInterval || DEFAULT_MONITOR_INTERVAL,
            enableAutoGC: options.enableAutoGC !== false,
            enableLeakDetection: options.enableLeakDetection !== false,

            // 缓存配置
            maxCacheSize: options.maxCacheSize || DEFAULT_CACHE_SIZE,
            cacheCleanupInterval: options.cacheCleanupInterval || DEFAULT_CACHE_CLEANUP_INTERVAL,

            ...options
        };

        this.memoryHistory = [];
        this.leakDetectionData = new Map();
        this.caches = new Map();
        this.isMonitoring = false;
        this.monitorTimer = null;
        this.cleanupTimer = null;
    }

    /**
     * 启动内存监控
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, this.config.monitoring.interval);
        
        logger.info('🧠 内存监控已启动');
    }

    /**
     * 停止内存监控
     */
    stopMonitoring() {
        this.isMonitoring = false;

        if (this.monitorTimer) {
            global.clearInterval(this.monitorTimer);
            this.monitorTimer = null;
        }

        if (this.cleanupTimer) {
            global.clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        // 清理缓存
        this.clearAllCaches();
    }

    /**
     * 检查内存使用情况
     * 监控内存使用量，触发相应的处理机制
     */
    checkMemoryUsage() {
        const memUsage = process.memoryUsage();
        const memUsageMB = {
            rss: Math.round(memUsage.rss / BYTES_TO_MB),
            heapUsed: Math.round(memUsage.heapUsed / BYTES_TO_MB),
            heapTotal: Math.round(memUsage.heapTotal / BYTES_TO_MB),
            external: Math.round(memUsage.external / BYTES_TO_MB)
        };

        this.memoryHistory.push({
            timestamp: Date.now(),
            ...memUsageMB
        });

        if (this.memoryHistory.length > MAX_MEMORY_HISTORY) {
            this.memoryHistory.shift();
        }

        if (memUsageMB.heapUsed >= this.config.criticalThreshold) {
            console.warn(`Critical memory usage: ${memUsageMB.heapUsed}MB`);
            this.performEmergencyCleanup();
        } else if (memUsageMB.heapUsed >= this.config.warningThreshold) {
            if (this.config.enableAutoGC) {
                this.forceGarbageCollection();
            }
        }

        if (this.config.enableLeakDetection) {
            this.detectMemoryLeaks(memUsageMB);
        }
    }

    /**
     * 强制垃圾回收
     * @returns {number} 释放的内存量（MB）
     */
    forceGarbageCollection() {
        const beforeMemory = process.memoryUsage();
        
        if (global.gc) {
            global.gc();
            const afterMemory = process.memoryUsage();
            const freed = (beforeMemory.heapUsed - afterMemory.heapUsed) / 1024 / 1024;
            
            logger.info(`Garbage collection freed ${freed}MB of memory`);
            return freed;
        } else {
            logger.warn('Garbage collection is not available. Run with --expose-gc flag.');
            return 0;
        }
    }

    /**
     * 执行紧急清理
     */
    performEmergencyCleanup() {
        // 清理所有缓存
        this.clearAllCaches();
        
        // 强制垃圾回收
        this.forceGarbageCollection();
        
        // 清理大对象
        if (this.largeObjects) {
            this.largeObjects.clear();
        }
        
        logger.info('Emergency cleanup completed');
    }

    /**
     * 检测内存泄漏
     * @param {Object} currentMemory - 当前内存使用情况
     */
    detectMemoryLeaks(currentMemory) {
        const now = Date.now();
        const key = 'heap_usage';

        if (!this.leakDetectionData.has(key)) {
            this.leakDetectionData.set(key, {
                samples: [],
                lastAlert: 0
            });
        }

        const data = this.leakDetectionData.get(key);
        data.samples.push({
            timestamp: now,
            value: currentMemory.heapUsed
        });

        // 保持样本数量在合理范围内
        if (data.samples.length > 20) {
            data.samples.shift();
        }

        // 分析内存趋势
        if (data.samples.length >= 10) {
            const trend = this.calculateMemoryTrend(data.samples);

            if (trend.isIncreasing && trend.growthRate > 5 && now - data.lastAlert > 300000) {
                console.warn(`Potential memory leak detected. Growth rate: ${trend.growthRate}MB/min`);
                data.lastAlert = now;
            }
        }
    }

    /**
     * 计算内存趋势
     * @param {Array} samples - 内存使用样本数据
     * @returns {Object} 趋势分析结果
     */
    calculateMemoryTrend(samples) {
        if (samples.length < 2) {
            return { isIncreasing: false, growthRate: 0 };
        }

        const firstSample = samples[0];
        const lastSample = samples[samples.length - 1];
        const timeDiff = (lastSample.timestamp - firstSample.timestamp) / MILLISECONDS_PER_MINUTE;
        const memoryDiff = lastSample.value - firstSample.value;
        const growthRate = timeDiff > 0 ? memoryDiff / timeDiff : 0;

        return {
            isIncreasing: memoryDiff > 0,
            growthRate: Math.round(growthRate * 100) / 100
        };
    }

    /**
     * 创建缓存
     * @param {string} name - 缓存名称
     * @param {Object} options - 缓存配置选项
     * @returns {Object} 缓存接口对象
     */
    createCache(name, options = {}) {
        const cacheConfig = {
            maxSize: options.maxSize || this.config.maxCacheSize,
            ttl: options.ttl || DEFAULT_CACHE_TTL,
            onEvict: options.onEvict || null
        };

        const cacheData = {
            cache: new Map(),
            config: cacheConfig,
            stats: {
                hits: 0,
                misses: 0,
                evictions: 0
            }
        };

        this.caches.set(name, cacheData);

        return {
            get: (key) => this.getCacheValue(name, key),
            set: (key, value, ttl) => this.setCacheValue(name, key, value, ttl),
            delete: (key) => this.deleteCacheValue(name, key),
            clear: () => this.clearCache(name),
            stats: () => this.getCacheStats(name),
            size: () => {
                const data = this.caches.get(name);
                return data ? data.cache.size : 0;
            }
        };
    }

    /**
     * 获取缓存值
     * @param {string} cacheName - 缓存名称
     * @param {string} key - 缓存键
     * @returns {*} 缓存值或undefined
     */
    getCacheValue(cacheName, key) {
        const cacheData = this.caches.get(cacheName);
        if (!cacheData) return undefined;

        const item = cacheData.cache.get(key);
        if (!item) {
            cacheData.stats.misses++;
            return undefined;
        }

        // 检查是否过期
        if (item.expires && Date.now() > item.expires) {
            cacheData.cache.delete(key);
            cacheData.stats.misses++;
            return undefined;
        }

        cacheData.stats.hits++;
        item.accessed = Date.now();
        return item.value;
    }

    /**
     * 设置缓存值
     * @param {string} cacheName - 缓存名称
     * @param {string} key - 缓存键
     * @param {*} value - 缓存值
     * @param {number} ttl - 生存时间（毫秒）
     */
    setCacheValue(cacheName, key, value, ttl) {
        const cacheData = this.caches.get(cacheName);
        if (!cacheData) return;

        // 检查缓存大小限制
        if (cacheData.cache.size >= cacheData.config.maxSize && !cacheData.cache.has(key)) {
            this.evictOldestCacheItem(cacheName);
        }

        const now = Date.now();
        const item = {
            value,
            created: now,
            accessed: now,
            expires: ttl ? now + ttl : (cacheData.config.ttl ? now + cacheData.config.ttl : null)
        };

        cacheData.cache.set(key, item);
    }

    /**
     * 删除缓存值
     * @param {string} cacheName - 缓存名称
     * @param {string} key - 缓存键
     * @returns {boolean} 是否成功删除
     */
    deleteCacheValue(cacheName, key) {
        const cacheData = this.caches.get(cacheName);
        if (!cacheData) return false;

        return cacheData.cache.delete(key);
    }

    /**
     * 清空指定缓存
     * @param {string} cacheName - 缓存名称
     */
    clearCache(cacheName) {
        const cacheData = this.caches.get(cacheName);
        if (cacheData) {
            cacheData.cache.clear();
            cacheData.stats = { hits: 0, misses: 0, evictions: 0 };
        }
    }

    /**
     * 清空所有缓存
     */
    clearAllCaches() {
        for (const [name] of this.caches) {
            this.clearCache(name);
        }
    }

    /**
     * 清理过期的缓存项
     */
    cleanupCaches() {
        let totalCleaned = 0;
        
        for (const [name, cache] of this.caches) {
            const cleaned = this._cleanExpiredItems(cache, name);
            totalCleaned += cleaned;
        }
        
        if (totalCleaned > 0) {
            logger.info(`Total cleaned items: ${totalCleaned}`);
        }
    }

    /**
     * 清理指定缓存的过期项
     * @param {Map} cache - 缓存对象
     * @param {string} name - 缓存名称
     * @returns {number} 清理的项目数
     * @private
     */
    _cleanExpiredItems(cache, name) {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, item] of cache.entries()) {
            if (item.expiry && now > item.expiry) {
                cache.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            logger.info(`Cleaned ${cleaned} expired items from cache: ${name}`);
        }
        
        return cleaned;
    }

    /**
     * 驱逐最旧的缓存项
     * @param {string} cacheName - 缓存名称
     */
    evictOldestCacheItem(cacheName) {
        const cacheData = this.caches.get(cacheName);
        if (!cacheData) return;

        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, item] of cacheData.cache) {
            if (item.created < oldestTime) {
                oldestTime = item.created;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            cacheData.cache.delete(oldestKey);
            cacheData.stats.evictions++;

            if (cacheData.config.onEvict) {
                cacheData.config.onEvict(oldestKey);
            }
        }
    }

    /**
     * 获取缓存统计信息
     * @param {string} cacheName - 缓存名称
     * @returns {Object} 缓存统计信息
     */
    getCacheStats(cacheName) {
        const cacheData = this.caches.get(cacheName);
        if (!cacheData) return null;

        const { hits, misses, evictions } = cacheData.stats;
        const total = hits + misses;
        const hitRate = total > 0 ? (hits / total * 100).toFixed(2) : 0;

        return {
            size: cacheData.cache.size,
            maxSize: cacheData.config.maxSize,
            hits,
            misses,
            evictions,
            hitRate: `${hitRate}%`
        };
    }

    /**
     * 获取内存使用报告
     * @returns {Object} 内存使用报告
     */
    getMemoryReport() {
        const currentMemory = process.memoryUsage();
        const cacheStats = {};

        for (const [name] of this.caches) {
            cacheStats[name] = this.getCacheStats(name);
        }

        return {
            current: {
                rss: Math.round(currentMemory.rss / BYTES_TO_MB),
                heapUsed: Math.round(currentMemory.heapUsed / BYTES_TO_MB),
                heapTotal: Math.round(currentMemory.heapTotal / BYTES_TO_MB),
                external: Math.round(currentMemory.external / BYTES_TO_MB)
            },
            history: this.memoryHistory.slice(-10),
            caches: cacheStats,
            config: this.config
        };
    }
}

module.exports = MemoryManager;
