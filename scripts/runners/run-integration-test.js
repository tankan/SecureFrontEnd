#!/usr/bin/env node

/**
 * 集成测试运行器
 * 直接运行集成测试并显示结果
 */

import { runIntegrationTest } from '../../tests/integration-test.js';

console.log('🚀 启动安全前端资源加密系统集成测试...\n');

try {
  await runIntegrationTest();
  console.log('\n✅ 集成测试完成');
} catch (error) {
  console.error('\n❌ 集成测试失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}