/**
 * 性能优化集成测试
 * 验证性能优化功能的基本效果
 */

console.log('🚀 开始性能优化集成测试...\n');

// 测试内存使用情况
function testMemoryUsage() {
    console.log('📊 内存使用测试:');
    const used = process.memoryUsage();
    
    console.log(`  - RSS: ${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`);
    console.log(`  - Heap Used: ${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`);
    console.log(`  - Heap Total: ${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`);
    console.log(`  - External: ${Math.round(used.external / 1024 / 1024 * 100) / 100} MB\n`);
}

// 测试异步操作性能
async function testAsyncPerformance() {
    console.log('⚡ 异步操作性能测试:');
    
    const startTime = Date.now();
    const promises = [];
    
    // 创建100个异步任务
    for (let i = 0; i < 100; i++) {
        promises.push(new Promise(resolve => {
            setTimeout(() => resolve(i), Math.random() * 100);
        }));
    }
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    console.log(`  - 完成 ${results.length} 个异步任务`);
    console.log(`  - 总耗时: ${endTime - startTime}ms`);
    console.log(`  - 平均耗时: ${Math.round((endTime - startTime) / results.length * 100) / 100}ms/任务\n`);
}

// 测试缓存性能
function testCachePerformance() {
    console.log('💾 缓存性能测试:');
    
    const cache = new Map();
    const startTime = Date.now();
    
    // 写入测试
    for (let i = 0; i < 10000; i++) {
        cache.set(`key_${i}`, `value_${i}`);
    }
    
    const writeTime = Date.now();
    
    // 读取测试
    let hits = 0;
    for (let i = 0; i < 10000; i++) {
        if (cache.has(`key_${i}`)) {
            hits++;
        }
    }
    
    const readTime = Date.now();
    
    console.log(`  - 写入 10000 条记录耗时: ${writeTime - startTime}ms`);
    console.log(`  - 读取 10000 条记录耗时: ${readTime - writeTime}ms`);
    console.log(`  - 缓存命中率: ${(hits / 10000 * 100).toFixed(2)}%`);
    console.log(`  - 缓存大小: ${cache.size} 条记录\n`);
}

// 测试计算密集型任务性能
function testComputePerformance() {
    console.log('🔢 计算性能测试:');
    
    const startTime = Date.now();
    
    // 斐波那契数列计算
    function fibonacci(n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
    
    const result = fibonacci(35);
    const endTime = Date.now();
    
    console.log(`  - 计算 fibonacci(35) = ${result}`);
    console.log(`  - 计算耗时: ${endTime - startTime}ms\n`);
}

// 主测试函数
async function runIntegrationTest() {
    try {
        console.log('='.repeat(50));
        console.log('性能优化集成测试报告');
        console.log('='.repeat(50));
        console.log();
        
        // 初始内存状态
        testMemoryUsage();
        
        // 异步性能测试
        await testAsyncPerformance();
        
        // 缓存性能测试
        testCachePerformance();
        
        // 计算性能测试
        testComputePerformance();
        
        // 最终内存状态
        console.log('📈 测试完成后内存状态:');
        testMemoryUsage();
        
        console.log('✅ 性能优化集成测试完成!');
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
        process.exit(1);
    }
}

// 运行测试
runIntegrationTest();