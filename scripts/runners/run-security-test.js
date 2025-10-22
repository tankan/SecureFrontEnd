import { runSecurityTest } from '../../tests/security-test.js';

console.log('🔒 启动安全前端资源加密系统安全测试...\n');

try {
  await runSecurityTest();
} catch (error) {
  console.error('❌ 安全测试执行失败:', error.message);
  console.error(error.stack);
}