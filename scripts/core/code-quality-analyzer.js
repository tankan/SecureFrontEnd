/**
 * 代码质量分析工具
 * 用于静态分析、代码规范检查和重构建议
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CodeQualityAnalyzer {
  constructor() {
    this.results = {
      files: {},
      summary: {
        totalFiles: 0,
        totalLines: 0,
        issues: [],
        score: 0,
        level: ''
      }
    };
    
    this.rules = {
      // 代码复杂度规则
      maxFunctionLength: 50,
      maxFileLength: 500,
      maxCyclomaticComplexity: 10,
      
      // 代码风格规则
      requireJSDoc: true,
      requireErrorHandling: true,
      requireInputValidation: true,
      
      // 安全规则
      noHardcodedSecrets: true,
      noEval: true,
      noConsoleLog: true
    };
  }

  /**
   * 分析单个文件
   */
  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      const analysis = {
        path: filePath,
        lines: lines.length,
        functions: [],
        issues: [],
        metrics: {
          complexity: 0,
          maintainability: 100,
          testability: 100
        }
      };

      // 跳过空文件或非常小的文件
      if (content.trim().length < 10) {
        analysis.issues.push({
          type: 'info',
          message: '文件内容过少或为空',
          suggestion: '检查文件是否需要内容'
        });
        return analysis;
      }

      // 分析函数
      this.analyzeFunctions(content, analysis);
      
      // 检查代码风格
      this.checkCodeStyle(content, lines, analysis);
      
      // 检查安全问题
      this.checkSecurity(content, analysis);
      
      // 计算复杂度
      this.calculateComplexity(content, analysis);
      
      // 计算质量评分
      this.calculateQualityScore(analysis);
      
      return analysis;
      
    } catch (error) {
      return {
        path: filePath,
        error: error.message,
        issues: [{ type: 'error', message: `文件读取失败: ${error.message}` }],
        lines: 0,
        metrics: { complexity: 0, maintainability: 0, testability: 0 }
      };
    }
  }

  /**
   * 分析函数
   */
  analyzeFunctions(content, analysis) {
    // 匹配函数定义
    const functionRegex = /(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:async\s+)?function|(?:async\s+)?(\w+)\s*\([^)]*\)\s*=>)/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2] || match[3] || 'anonymous';
      const startIndex = match.index;
      
      // 计算函数长度
      const functionContent = this.extractFunctionBody(content, startIndex);
      const functionLines = functionContent.split('\n').length;
      
      const functionAnalysis = {
        name: functionName,
        lines: functionLines,
        complexity: this.calculateFunctionComplexity(functionContent),
        hasJSDoc: this.hasJSDoc(content, startIndex),
        hasErrorHandling: this.hasErrorHandling(functionContent)
      };
      
      // 检查函数长度
      if (functionLines > this.rules.maxFunctionLength) {
        analysis.issues.push({
          type: 'warning',
          message: `函数 ${functionName} 过长 (${functionLines} 行)`,
          suggestion: '考虑将大函数拆分为更小的函数'
        });
      }
      
      // 检查JSDoc
      if (this.rules.requireJSDoc && !functionAnalysis.hasJSDoc) {
        analysis.issues.push({
          type: 'info',
          message: `函数 ${functionName} 缺少JSDoc注释`,
          suggestion: '添加函数文档注释'
        });
      }
      
      // 检查错误处理
      if (this.rules.requireErrorHandling && !functionAnalysis.hasErrorHandling) {
        analysis.issues.push({
          type: 'warning',
          message: `函数 ${functionName} 缺少错误处理`,
          suggestion: '添加try-catch或错误检查'
        });
      }
      
      analysis.functions.push(functionAnalysis);
    }
  }

  /**
   * 检查代码风格
   */
  checkCodeStyle(content, lines, analysis) {
    // 检查文件长度
    if (lines.length > this.rules.maxFileLength) {
      analysis.issues.push({
        type: 'warning',
        message: `文件过长 (${lines.length} 行)`,
        suggestion: '考虑将文件拆分为多个模块'
      });
    }
    
    // 检查缩进一致性
    const indentPattern = /^(\s*)/;
    const indents = lines.map(line => {
      const match = line.match(indentPattern);
      return match ? match[1] : '';
    }).filter(indent => indent.length > 0);
    
    const hasSpaces = indents.some(indent => indent.includes(' '));
    const hasTabs = indents.some(indent => indent.includes('\t'));
    
    if (hasSpaces && hasTabs) {
      analysis.issues.push({
        type: 'warning',
        message: '混合使用空格和制表符缩进',
        suggestion: '统一使用空格或制表符缩进'
      });
    }
    
    // 检查行长度
    lines.forEach((line, index) => {
      if (line.length > 120) {
        analysis.issues.push({
          type: 'info',
          message: `第${index + 1}行过长 (${line.length} 字符)`,
          suggestion: '考虑换行或重构'
        });
      }
    });
    
    // 检查TODO和FIXME
    lines.forEach((line, index) => {
      if (line.includes('TODO') || line.includes('FIXME')) {
        analysis.issues.push({
          type: 'info',
          message: `第${index + 1}行包含待办事项`,
          suggestion: '完成或移除待办事项'
        });
      }
    });
  }

  /**
   * 检查安全问题
   */
  checkSecurity(content, analysis) {
    // 检查硬编码密钥
    const secretPatterns = [
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /key\s*[:=]\s*['"][^'"]+['"]/i,
      /secret\s*[:=]\s*['"][^'"]+['"]/i,
      /token\s*[:=]\s*['"][^'"]+['"]/i
    ];
    
    secretPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        analysis.issues.push({
          type: 'error',
          message: '发现可能的硬编码密钥',
          suggestion: '使用环境变量或配置文件存储敏感信息'
        });
      }
    });
    
    // 检查eval使用
    if (content.includes('eval(')) {
      analysis.issues.push({
        type: 'error',
        message: '使用了eval函数',
        suggestion: '避免使用eval，考虑更安全的替代方案'
      });
    }
    
    // 检查console.log
    if (this.rules.noConsoleLog && content.includes('console.log')) {
      analysis.issues.push({
        type: 'warning',
        message: '包含console.log语句',
        suggestion: '使用专业的日志库替代console.log'
      });
    }
    
    // 检查SQL注入风险
    if (content.includes('SELECT') && content.includes('+')) {
      analysis.issues.push({
        type: 'warning',
        message: '可能存在SQL注入风险',
        suggestion: '使用参数化查询'
      });
    }
  }

  /**
   * 计算复杂度
   */
  calculateComplexity(content, analysis) {
    // 圈复杂度计算
    const complexityKeywords = [
      'if', 'else', 'while', 'for', 'switch', 'case', 'catch', 'try', '&&', '||'
    ];
    
    let complexity = 1; // 基础复杂度
    
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });
    
    // 单独处理三元运算符
    const ternaryMatches = content.match(/\?/g);
    if (ternaryMatches) {
      complexity += ternaryMatches.length;
    }
    
    analysis.metrics.complexity = complexity;
    
    if (complexity > this.rules.maxCyclomaticComplexity) {
      analysis.issues.push({
        type: 'warning',
        message: `圈复杂度过高 (${complexity})`,
        suggestion: '简化逻辑，减少嵌套和条件分支'
      });
    }
  }

  /**
   * 计算质量评分
   */
  calculateQualityScore(analysis) {
    let score = 100;
    
    // 根据问题类型扣分
    analysis.issues.forEach(issue => {
      switch (issue.type) {
        case 'error':
          score -= 15;
          break;
        case 'warning':
          score -= 8;
          break;
        case 'info':
          score -= 3;
          break;
      }
    });
    
    // 根据复杂度扣分
    if (analysis.metrics.complexity > 20) {
      score -= 20;
    } else if (analysis.metrics.complexity > 15) {
      score -= 10;
    } else if (analysis.metrics.complexity > 10) {
      score -= 5;
    }
    
    // 根据文件大小扣分
    if (analysis.lines > 1000) {
      score -= 15;
    } else if (analysis.lines > 500) {
      score -= 8;
    }
    
    analysis.metrics.maintainability = Math.max(0, score);
    analysis.metrics.testability = Math.max(0, score - (analysis.functions.length * 2));
  }

  /**
   * 辅助方法：提取函数体
   */
  extractFunctionBody(content, startIndex) {
    let braceCount = 0;
    let inFunction = false;
    let functionBody = '';
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') {
        braceCount++;
        inFunction = true;
      } else if (char === '}') {
        braceCount--;
      }
      
      if (inFunction) {
        functionBody += char;
      }
      
      if (inFunction && braceCount === 0) {
        break;
      }
    }
    
    return functionBody;
  }

  /**
   * 辅助方法：检查是否有JSDoc
   */
  hasJSDoc(content, functionIndex) {
    const beforeFunction = content.substring(Math.max(0, functionIndex - 200), functionIndex);
    return /\/\*\*[\s\S]*?\*\/\s*$/.test(beforeFunction);
  }

  /**
   * 辅助方法：检查是否有错误处理
   */
  hasErrorHandling(functionContent) {
    return /try\s*{|catch\s*\(|throw\s+|\.catch\(/.test(functionContent);
  }

  /**
   * 辅助方法：计算函数复杂度
   */
  calculateFunctionComplexity(functionContent) {
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||'];
    let complexity = 1;
    
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = functionContent.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });
    
    // 单独处理三元运算符
    const ternaryMatches = functionContent.match(/\?/g);
    if (ternaryMatches) {
      complexity += ternaryMatches.length;
    }
    
    return complexity;
  }

  /**
   * 扫描目录中的所有JavaScript文件
   */
  scanDirectory(dirPath) {
    const files = [];
    
    const scanRecursive = (currentPath) => {
      const items = fs.readdirSync(currentPath);
      
      items.forEach(item => {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanRecursive(fullPath);
        } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.mjs'))) {
          files.push(fullPath);
        }
      });
    };
    
    scanRecursive(dirPath);
    return files;
  }

  /**
   * 运行完整的代码质量分析
   */
  async runFullAnalysis(projectPath = process.cwd()) {
    console.log('🔍 开始代码质量分析...\n');
    
    try {
      const files = this.scanDirectory(projectPath);
      console.log(`📁 发现 ${files.length} 个JavaScript文件`);
      
      let totalLines = 0;
      let totalIssues = 0;
      const issuesByType = { error: 0, warning: 0, info: 0 };
      
      files.forEach(file => {
        console.log(`🔍 分析: ${path.relative(projectPath, file)}`);
        const analysis = this.analyzeFile(file);
        
        if (!analysis.error) {
          totalLines += analysis.lines;
          totalIssues += analysis.issues.length;
          
          analysis.issues.forEach(issue => {
            issuesByType[issue.type]++;
          });
          
          this.results.files[file] = analysis;
        }
      });
      
      // 生成总结
      this.results.summary = {
        totalFiles: files.length,
        totalLines: totalLines,
        totalIssues: totalIssues,
        issuesByType: issuesByType,
        score: this.calculateOverallScore(),
        level: this.determineQualityLevel()
      };
      
      this.generateReport();
      return this.results;
      
    } catch (error) {
      console.error('❌ 代码质量分析失败:', error.message);
      throw error;
    }
  }

  /**
   * 计算总体评分
   */
  calculateOverallScore() {
    const fileAnalyses = Object.values(this.results.files);
    if (fileAnalyses.length === 0) return 0;
    
    const totalScore = fileAnalyses.reduce((sum, analysis) => {
      return sum + (analysis.metrics ? analysis.metrics.maintainability : 0);
    }, 0);
    
    return Math.round(totalScore / fileAnalyses.length);
  }

  /**
   * 确定质量等级
   */
  determineQualityLevel() {
    const score = this.results.summary.score;
    
    if (score >= 90) return '优秀';
    else if (score >= 80) return '良好';
    else if (score >= 70) return '中等';
    else if (score >= 60) return '较差';
    else return '差';
  }

  /**
   * 生成报告
   */
  generateReport() {
    const summary = this.results.summary;
    
    console.log('\n📋 代码质量分析总结:');
    console.log(`   分析文件: ${summary.totalFiles} 个`);
    console.log(`   代码行数: ${summary.totalLines} 行`);
    console.log(`   发现问题: ${summary.totalIssues} 个`);
    console.log(`   - 错误: ${summary.issuesByType.error} 个 ❌`);
    console.log(`   - 警告: ${summary.issuesByType.warning} 个 ⚠️`);
    console.log(`   - 信息: ${summary.issuesByType.info} 个 ℹ️`);
    console.log(`   质量评分: ${summary.score}/100`);
    console.log(`   质量等级: ${summary.level}`);
    
    // 生成改进建议
    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      console.log('\n💡 改进建议:');
      recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    // 保存详细报告
    const reportPath = path.join(process.cwd(), 'CODE_QUALITY_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 详细报告已保存至: ${reportPath}`);
  }

  /**
   * 生成改进建议
   */
  generateRecommendations() {
    const recommendations = [];
    const summary = this.results.summary;
    
    if (summary.issuesByType.error > 0) {
      recommendations.push('优先修复所有错误级别的问题');
    }
    
    if (summary.issuesByType.warning > 5) {
      recommendations.push('处理警告级别的问题以提高代码质量');
    }
    
    if (summary.totalLines / summary.totalFiles > 300) {
      recommendations.push('考虑将大文件拆分为更小的模块');
    }
    
    const fileAnalyses = Object.values(this.results.files);
    const avgComplexity = fileAnalyses.reduce((sum, analysis) => {
      return sum + (analysis.metrics ? analysis.metrics.complexity : 0);
    }, 0) / fileAnalyses.length;
    
    if (avgComplexity > 15) {
      recommendations.push('简化复杂的函数和逻辑');
    }
    
    if (summary.score < 80) {
      recommendations.push('添加更多的文档注释和错误处理');
      recommendations.push('统一代码风格和格式');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('代码质量良好，继续保持');
      recommendations.push('定期进行代码审查和重构');
    }
    
    return recommendations;
  }
}

export { CodeQualityAnalyzer };

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const analyzer = new CodeQualityAnalyzer();
  analyzer.runFullAnalysis().catch(console.error);
}