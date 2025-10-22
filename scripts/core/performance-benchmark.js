/**
 * 性能基准测试工具
 * 用于测试加密解密性能、内存使用情况和系统资源利用率
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import os from 'os';

class PerformanceBenchmark {
  constructor() {
    this.results = {
      encryption: {},
      memory: {},
      cpu: {},
      io: {},
      summary: {}
    };
  }

  /**
   * 测试加密性能
   */
  async testEncryptionPerformance() {
    console.log('🔐 测试加密性能...');
    
    const testSizes = [1024, 10240, 102400, 1048576]; // 1KB, 10KB, 100KB, 1MB
    const iterations = 100;
    
    for (const size of testSizes) {
      const data = crypto.randomBytes(size);
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      
      // 测试加密性能
      const encryptStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);
        cipher.setAAD(Buffer.from('additional'));
        let encrypted = cipher.update(data);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const tag = cipher.getAuthTag();
      }
      const encryptEnd = performance.now();
      
      // 测试解密性能
      const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from('additional'));
      let encrypted = cipher.update(data);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const tag = cipher.getAuthTag();
      
      const decryptStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const decipher = crypto.createDecipherGCM('aes-256-gcm', key, iv);
        decipher.setAAD(Buffer.from('additional'));
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
      }
      const decryptEnd = performance.now();
      
      const encryptTime = encryptEnd - encryptStart;
      const decryptTime = decryptEnd - decryptStart;
      
      this.results.encryption[`${size}bytes`] = {
        encryptTime: encryptTime.toFixed(2),
        decryptTime: decryptTime.toFixed(2),
        encryptThroughput: ((size * iterations) / (encryptTime / 1000) / 1024 / 1024).toFixed(2),
        decryptThroughput: ((size * iterations) / (decryptTime / 1000) / 1024 / 1024).toFixed(2)
      };
      
      console.log(`  📊 ${size} bytes: 加密 ${encryptTime.toFixed(2)}ms, 解密 ${decryptTime.toFixed(2)}ms`);
    }
  }

  /**
   * 测试内存使用情况
   */
  async testMemoryUsage() {
    console.log('💾 测试内存使用情况...');
    
    const initialMemory = process.memoryUsage();
    
    // 创建大量数据进行测试
    const testData = [];
    const iterations = 1000;
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const data = crypto.randomBytes(1024);
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from('additional'));
      let encrypted = cipher.update(data);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      testData.push({ encrypted, key });
      
      // 每100次迭代检查一次内存
      if (i % 100 === 0) {
        const currentMemory = process.memoryUsage();
        console.log(`  📈 迭代 ${i}: RSS ${(currentMemory.rss / 1024 / 1024).toFixed(2)}MB, Heap ${(currentMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      }
    }
    
    const endTime = performance.now();
    const finalMemory = process.memoryUsage();
    
    this.results.memory = {
      initialRSS: (initialMemory.rss / 1024 / 1024).toFixed(2),
      finalRSS: (finalMemory.rss / 1024 / 1024).toFixed(2),
      initialHeap: (initialMemory.heapUsed / 1024 / 1024).toFixed(2),
      finalHeap: (finalMemory.heapUsed / 1024 / 1024).toFixed(2),
      memoryGrowth: ((finalMemory.rss - initialMemory.rss) / 1024 / 1024).toFixed(2),
      testDuration: (endTime - startTime).toFixed(2)
    };
    
    // 清理内存
    testData.length = 0;
    global.gc && global.gc();
  }

  /**
   * 测试CPU使用情况
   */
  async testCPUUsage() {
    console.log('⚡ 测试CPU使用情况...');
    
    const cpuInfo = os.cpus();
    const startUsage = process.cpuUsage();
    const startTime = performance.now();
    
    // CPU密集型任务
    const iterations = 10000;
    for (let i = 0; i < iterations; i++) {
      const data = crypto.randomBytes(1024);
      const hash = crypto.createHash('sha256');
      hash.update(data);
      hash.digest('hex');
    }
    
    const endTime = performance.now();
    const endUsage = process.cpuUsage(startUsage);
    
    this.results.cpu = {
      cores: cpuInfo.length,
      model: cpuInfo[0].model,
      userTime: (endUsage.user / 1000).toFixed(2),
      systemTime: (endUsage.system / 1000).toFixed(2),
      totalTime: ((endUsage.user + endUsage.system) / 1000).toFixed(2),
      duration: (endTime - startTime).toFixed(2),
      cpuEfficiency: (((endUsage.user + endUsage.system) / 1000) / (endTime - startTime) * 100).toFixed(2)
    };
  }

  /**
   * 测试I/O性能
   */
  async testIOPerformance() {
    console.log('💿 测试I/O性能...');
    
    const testDir = path.join(process.cwd(), 'temp-io-test');
    const testFile = path.join(testDir, 'test-file.dat');
    
    try {
      // 创建测试目录
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir);
      }
      
      const testData = crypto.randomBytes(1024 * 1024); // 1MB
      const iterations = 100;
      
      // 测试写入性能
      const writeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        fs.writeFileSync(`${testFile}-${i}`, testData);
      }
      const writeEnd = performance.now();
      
      // 测试读取性能
      const readStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        fs.readFileSync(`${testFile}-${i}`);
      }
      const readEnd = performance.now();
      
      // 清理测试文件
      for (let i = 0; i < iterations; i++) {
        fs.unlinkSync(`${testFile}-${i}`);
      }
      fs.rmdirSync(testDir);
      
      const writeTime = writeEnd - writeStart;
      const readTime = readEnd - readStart;
      
      this.results.io = {
        writeTime: writeTime.toFixed(2),
        readTime: readTime.toFixed(2),
        writeThroughput: ((testData.length * iterations) / (writeTime / 1000) / 1024 / 1024).toFixed(2),
        readThroughput: ((testData.length * iterations) / (readTime / 1000) / 1024 / 1024).toFixed(2)
      };
      
    } catch (error) {
      console.error('❌ I/O测试失败:', error.message);
      this.results.io = { error: error.message };
    }
  }

  /**
   * 生成性能报告
   */
  generateReport() {
    console.log('\n📊 生成性能报告...');
    
    // 计算总体性能评分
    let score = 100;
    let issues = [];
    
    // 加密性能评估
    const encryptionResults = this.results.encryption;
    if (encryptionResults['1048576bytes']) {
      const throughput = parseFloat(encryptionResults['1048576bytes'].encryptThroughput);
      if (throughput < 10) {
        score -= 20;
        issues.push('加密吞吐量较低');
      } else if (throughput < 50) {
        score -= 10;
        issues.push('加密吞吐量中等');
      }
    }
    
    // 内存使用评估
    const memoryGrowth = parseFloat(this.results.memory.memoryGrowth);
    if (memoryGrowth > 100) {
      score -= 15;
      issues.push('内存增长过多');
    } else if (memoryGrowth > 50) {
      score -= 8;
      issues.push('内存增长较多');
    }
    
    // CPU效率评估
    const cpuEfficiency = parseFloat(this.results.cpu.cpuEfficiency);
    if (cpuEfficiency < 50) {
      score -= 10;
      issues.push('CPU利用率较低');
    }
    
    // I/O性能评估
    if (this.results.io.error) {
      score -= 20;
      issues.push('I/O测试失败');
    } else {
      const writeThroughput = parseFloat(this.results.io.writeThroughput);
      if (writeThroughput < 10) {
        score -= 15;
        issues.push('I/O写入性能较低');
      }
    }
    
    // 确定性能等级
    let performanceLevel;
    if (score >= 90) performanceLevel = '优秀';
    else if (score >= 80) performanceLevel = '良好';
    else if (score >= 70) performanceLevel = '中等';
    else if (score >= 60) performanceLevel = '较差';
    else performanceLevel = '差';
    
    this.results.summary = {
      score: Math.max(0, score),
      level: performanceLevel,
      issues: issues,
      recommendations: this.generateRecommendations(issues)
    };
    
    return this.results;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(issues) {
    const recommendations = [];
    
    if (issues.includes('加密吞吐量较低') || issues.includes('加密吞吐量中等')) {
      recommendations.push('考虑使用硬件加速或优化加密算法实现');
      recommendations.push('实现加密操作的批处理和缓存机制');
    }
    
    if (issues.includes('内存增长过多') || issues.includes('内存增长较多')) {
      recommendations.push('实现内存池和对象复用机制');
      recommendations.push('优化数据结构，减少内存分配');
      recommendations.push('定期执行垃圾回收');
    }
    
    if (issues.includes('CPU利用率较低')) {
      recommendations.push('优化算法复杂度');
      recommendations.push('使用多线程或Worker线程');
      recommendations.push('实现任务队列和负载均衡');
    }
    
    if (issues.includes('I/O写入性能较低')) {
      recommendations.push('使用异步I/O操作');
      recommendations.push('实现文件缓存和批量写入');
      recommendations.push('考虑使用SSD存储');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('性能表现良好，继续保持');
      recommendations.push('定期进行性能监控和基准测试');
    }
    
    return recommendations;
  }

  /**
   * 运行完整的性能基准测试
   */
  async runFullBenchmark() {
    console.log('🚀 开始性能基准测试...\n');
    
    try {
      await this.testEncryptionPerformance();
      await this.testMemoryUsage();
      await this.testCPUUsage();
      await this.testIOPerformance();
      
      const report = this.generateReport();
      
      console.log('\n📋 性能测试总结:');
      console.log(`   性能评分: ${report.summary.score}/100`);
      console.log(`   性能等级: ${report.summary.level}`);
      
      if (report.summary.issues.length > 0) {
        console.log('\n⚠️ 发现的问题:');
        report.summary.issues.forEach(issue => {
          console.log(`   • ${issue}`);
        });
      }
      
      console.log('\n💡 优化建议:');
      report.summary.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
      
      // 保存详细报告
      const reportPath = path.join(process.cwd(), 'PERFORMANCE_REPORT.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 详细报告已保存至: ${reportPath}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ 性能测试失败:', error.message);
      throw error;
    }
  }
}

export { PerformanceBenchmark };

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runFullBenchmark().catch(console.error);
}