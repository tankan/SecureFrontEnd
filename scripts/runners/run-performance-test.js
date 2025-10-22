import { runPerformanceTest } from '../../tests/performance-test.js';

console.log('⚡ 启动安全前端资源加密系统性能测试...\n');

try {
  await runPerformanceTest();
} catch (error) {
  console.error('❌ 性能测试执行失败:', error.message);
  console.error(error.stack);
}