/**
 * 性能优化功能测试
 */

const MemoryManager = require('../src/utils/memory-manager');
const PerformanceOptimizer = require('../src/utils/performance-optimizer');
const AsyncOptimizer = require('../src/utils/async-optimizer');

describe('性能优化功能测试', () => {
    describe('内存管理器测试', () => {
        let memoryManager;

        beforeEach(() => {
            memoryManager = new MemoryManager();
        });

        afterEach(() => {
            if (memoryManager) {
                memoryManager.stopMonitoring();
            }
        });

        test('应该能够创建内存管理器实例', () => {
            expect(memoryManager).toBeDefined();
            expect(memoryManager.config).toBeDefined();
        });

        test('应该能够获取内存使用情况', () => {
            const memoryReport = memoryManager.getMemoryReport();
            expect(memoryReport).toBeDefined();
            expect(memoryReport.current).toBeDefined();
            expect(memoryReport.current.rss).toBeGreaterThan(0);
            expect(memoryReport.current.heapUsed).toBeGreaterThan(0);
        });

        test('应该能够创建和使用缓存', () => {
            const cache = memoryManager.createCache('test-cache');
            
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
            expect(cache.size()).toBe(1);
        });
    });

    describe('性能优化器测试', () => {
        let optimizer;

        beforeEach(() => {
            optimizer = new PerformanceOptimizer();
        });

        afterEach(() => {
            if (optimizer) {
                optimizer.stopProfiler();
            }
        });

        test('应该能够创建性能优化器实例', () => {
            expect(optimizer).toBeDefined();
            expect(optimizer.config).toBeDefined();
        });

        test('应该能够监控操作性能', () => {
            const testOperation = 'test-operation';
            const duration = 50;
            
            optimizer.recordPerformance(testOperation, duration);
            
            expect(optimizer.performanceMetrics.has(testOperation)).toBe(true);
            const metrics = optimizer.performanceMetrics.get(testOperation);
            expect(metrics.count).toBe(1);
            expect(metrics.totalTime).toBe(duration);
        });

        test('应该能够缓存函数结果', async () => {
            const testFn = async (x) => x * 2;
            const cachedFn = optimizer.cached(testFn);
            
            const result1 = await cachedFn(5);
            const result2 = await cachedFn(5);
            
            expect(result1).toBe(10);
            expect(result2).toBe(10);
        });

        test('应该能够生成性能报告', () => {
            const report = optimizer.getPerformanceReport();
            expect(report).toBeDefined();
            expect(report.timestamp).toBeDefined();
            expect(report.operations).toBeDefined();
            expect(report.cache).toBeDefined();
        });
    });

    describe('异步优化器测试', () => {
        let asyncOptimizer;

        beforeEach(() => {
            asyncOptimizer = new AsyncOptimizer();
        });

        afterEach(() => {
            if (asyncOptimizer) {
                asyncOptimizer.stopMonitoring();
            }
        });

        test('应该能够创建异步优化器实例', () => {
            expect(asyncOptimizer).toBeDefined();
            expect(asyncOptimizer.config).toBeDefined();
        });

        test('应该能够添加和执行任务', async () => {
            // 先创建队列
            asyncOptimizer.createQueue('test-queue');
            
            const taskResult = await asyncOptimizer.addTask('test-queue', async () => {
                return 'task-completed';
            });
            
            expect(taskResult).toBe('task-completed');
        });

        test('应该能够处理批量任务', async () => {
            const tasks = [1, 2, 3, 4, 5];
            const processor = (item) => Promise.resolve(item * 2);
            
            const results = await asyncOptimizer.processBatch(tasks, processor, { batchSize: 2 });
            
            expect(results).toBeDefined();
            expect(Array.isArray(results)).toBe(true);
        });

        test('应该能够生成完整报告', () => {
            const report = asyncOptimizer.getReport();
            expect(report).toBeDefined();
            expect(report.timestamp).toBeDefined();
            expect(report.metrics).toBeDefined();
            expect(report.queues).toBeDefined();
            expect(report.config).toBeDefined();
        });
    });
});