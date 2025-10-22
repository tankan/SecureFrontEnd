/**
 * 安全审计运行器
 */

import { SecurityAuditor } from '../core/security-audit.js';

async function main() {
  console.log('🔒 启动安全审计...\n');
  
  try {
    const auditor = new SecurityAuditor();
    const report = await auditor.runFullSecurityAudit();
    
    console.log('\n✅ 安全审计完成');
    console.log(`📊 安全评分: ${report.summary.securityScore}/100`);
    console.log(`🏆 安全等级: ${report.summary.securityLevel}`);
    
  } catch (error) {
    console.error('❌ 安全审计失败:', error.message);
    console.error(error.stack);
  }
}

main();