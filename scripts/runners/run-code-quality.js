/**
 * 代码质量分析运行器
 */

import { CodeQualityAnalyzer } from '../core/code-quality-analyzer.js';

async function main() {
  console.log('🔍 启动代码质量分析...\n');
  
  try {
    const analyzer = new CodeQualityAnalyzer();
    const report = await analyzer.runFullAnalysis();
    
    console.log('\n✅ 代码质量分析完成');
    console.log(`📊 质量评分: ${report.summary.score}/100`);
    console.log(`🏆 质量等级: ${report.summary.level}`);
    
  } catch (error) {
    console.error('❌ 代码质量分析失败:', error.message);
    console.error(error.stack);
  }
}

main();