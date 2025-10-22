#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { EncryptionCore } from '../src/core/encryption.js';
import { CompressionCore } from '../src/core/compression.js';
import { CloudStorageManager } from '../src/storage/cloud-storage.js';
import winston from 'winston';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 构建和加密处理脚本
 * 自动扫描构建输出目录，进行文件加密和云存储上传
 */
class BuildProcessor {
  constructor(options = {}) {
    this.config = {
      buildDir: options.buildDir || process.env.BUILD_OUTPUT_DIR || './dist',
      encryptedDir: options.encryptedDir || process.env.ENCRYPTED_OUTPUT_DIR || './encrypted',
      compressionEnabled: options.compressionEnabled ?? (process.env.COMPRESSION_ENABLED === 'true'),
      compressionFormat: options.compressionFormat || process.env.COMPRESSION_FORMAT || 'zip',
      fileTypes: options.fileTypes || ['.js', '.css', '.html', '.png', '.webp', '.gif', '.jpeg', '.jpg'],
      encryptionAlgorithm: options.encryptionAlgorithm || process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
      uploadToCloud: options.uploadToCloud ?? true,
      cloudProvider: options.cloudProvider || 'aliyun',
      ...options
    };

    this.setupLogger();
    this.initializeComponents();
  }

  /**
   * 设置日志记录器
   */
  setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'build-processor' },
      transports: [
        new winston.transports.File({ 
          filename: process.env.LOG_FILE || './logs/build.log' 
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  /**
   * 初始化核心组件
   */
  initializeComponents() {
    // 初始化加密核心
    this.encryptionCore = new EncryptionCore({
      algorithm: this.config.encryptionAlgorithm,
      masterKey: process.env.MASTER_KEY ? Buffer.from(process.env.MASTER_KEY, 'hex') : undefined
    });

    // 初始化压缩核心
    this.compressionCore = new CompressionCore({
      format: this.config.compressionFormat
    });

    // 初始化云存储管理器
    this.cloudStorage = new CloudStorageManager({
      aliyun: {
        region: process.env.ALIYUN_OSS_REGION,
        accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
        bucket: process.env.ALIYUN_OSS_BUCKET
      },
      aws: {
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        bucket: process.env.AWS_S3_BUCKET
      },
      azure: {
        accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
        accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
        containerName: process.env.AZURE_STORAGE_CONTAINER_NAME
      }
    });
  }

  /**
   * 执行完整的构建处理流程
   */
  async process() {
    try {
      this.logger.info('开始构建处理流程');
      
      // 1. 验证构建目录
      await this.validateBuildDirectory();
      
      // 2. 扫描文件
      const files = await this.scanFiles();
      this.logger.info(`发现 ${files.length} 个文件需要处理`);
      
      // 3. 创建输出目录
      await this.createOutputDirectory();
      
      // 4. 处理文件
      const processedFiles = await this.processFiles(files);
      
      // 5. 生成处理报告
      const report = await this.generateReport(processedFiles);
      
      // 6. 上传到云存储（可选）
      if (this.config.uploadToCloud) {
        await this.uploadToCloud(processedFiles);
      }
      
      this.logger.info('构建处理流程完成');
      return report;
      
    } catch (error) {
      this.logger.error('构建处理失败', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * 验证构建目录
   */
  async validateBuildDirectory() {
    const buildPath = resolve(this.config.buildDir);
    
    if (!existsSync(buildPath)) {
      throw new Error(`构建目录不存在: ${buildPath}`);
    }
    
    const stats = await fs.stat(buildPath);
    if (!stats.isDirectory()) {
      throw new Error(`构建路径不是目录: ${buildPath}`);
    }
    
    this.logger.info(`验证构建目录: ${buildPath}`);
  }

  /**
   * 扫描需要处理的文件
   */
  async scanFiles() {
    const buildPath = resolve(this.config.buildDir);
    const files = await this.encryptionCore.scanDirectory(buildPath, this.config.fileTypes);
    
    this.logger.info(`扫描到 ${files.length} 个文件`, {
      directory: buildPath,
      fileTypes: this.config.fileTypes
    });
    
    return files;
  }

  /**
   * 创建输出目录
   */
  async createOutputDirectory() {
    const encryptedPath = resolve(this.config.encryptedDir);
    await fs.mkdir(encryptedPath, { recursive: true });
    
    // 创建子目录
    await fs.mkdir(join(encryptedPath, 'files'), { recursive: true });
    await fs.mkdir(join(encryptedPath, 'archives'), { recursive: true });
    await fs.mkdir(join(encryptedPath, 'manifests'), { recursive: true });
    
    this.logger.info(`创建输出目录: ${encryptedPath}`);
  }

  /**
   * 处理文件
   */
  async processFiles(files) {
    const processedFiles = [];
    const encryptedPath = resolve(this.config.encryptedDir);
    
    if (this.config.compressionEnabled) {
      // 压缩模式：将所有文件打包后加密
      const archivePath = join(encryptedPath, 'archives', `build-${Date.now()}.${this.config.compressionFormat}`);
      const encryptedArchivePath = `${archivePath}.encrypted`;
      
      this.logger.info('开始压缩文件');
      
      // 创建文件列表用于压缩
      const fileList = files.map(file => ({
        path: file,
        name: this.getRelativePath(file, resolve(this.config.buildDir))
      }));
      
      // 压缩文件
      const compressionResult = await this.compressionCore.compressFiles(
        fileList,
        archivePath
      );
      
      // 加密压缩包
      const encryptionResult = await this.encryptionCore.encryptFile(
        archivePath,
        encryptedArchivePath
      );
      
      // 删除未加密的压缩包
      await fs.unlink(archivePath);
      
      processedFiles.push({
        type: 'archive',
        originalFiles: files,
        compressedPath: archivePath,
        encryptedPath: encryptedArchivePath,
        compressionResult,
        encryptionResult,
        fileCount: files.length
      });
      
      this.logger.info('压缩和加密完成', {
        archivePath: encryptedArchivePath,
        fileCount: files.length,
        compressionRatio: compressionResult.compressionRatio
      });
      
    } else {
      // 单文件模式：逐个加密文件
      this.logger.info('开始逐个加密文件');
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = this.getRelativePath(file, resolve(this.config.buildDir));
        const encryptedFilePath = join(encryptedPath, 'files', `${relativePath}.encrypted`);
        
        // 确保输出目录存在
        await fs.mkdir(dirname(encryptedFilePath), { recursive: true });
        
        // 加密文件
        const encryptionResult = await this.encryptionCore.encryptFile(
          file,
          encryptedFilePath
        );
        
        processedFiles.push({
          type: 'file',
          originalPath: file,
          encryptedPath: encryptedFilePath,
          encryptionResult
        });
        
        this.logger.info(`文件加密完成 (${i + 1}/${files.length})`, {
          originalPath: file,
          encryptedPath: encryptedFilePath
        });
      }
    }
    
    return processedFiles;
  }

  /**
   * 生成处理报告
   */
  async generateReport(processedFiles) {
    const report = {
      timestamp: new Date().toISOString(),
      buildDirectory: resolve(this.config.buildDir),
      encryptedDirectory: resolve(this.config.encryptedDir),
      configuration: {
        compressionEnabled: this.config.compressionEnabled,
        compressionFormat: this.config.compressionFormat,
        encryptionAlgorithm: this.config.encryptionAlgorithm,
        fileTypes: this.config.fileTypes
      },
      statistics: {
        totalFiles: 0,
        totalOriginalSize: 0,
        totalEncryptedSize: 0,
        compressionRatio: null,
        processingTime: null
      },
      files: processedFiles,
      errors: []
    };
    
    // 计算统计信息
    if (this.config.compressionEnabled && processedFiles.length > 0) {
      const archiveInfo = processedFiles[0];
      report.statistics.totalFiles = archiveInfo.fileCount;
      report.statistics.compressionRatio = archiveInfo.compressionResult.compressionRatio;
    } else {
      report.statistics.totalFiles = processedFiles.length;
    }
    
    // 保存报告
    const reportPath = join(resolve(this.config.encryptedDir), 'manifests', `build-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    this.logger.info('生成处理报告', { reportPath });
    
    return report;
  }

  /**
   * 上传到云存储
   */
  async uploadToCloud(processedFiles) {
    try {
      this.logger.info('开始上传到云存储');
      
      const uploadResults = [];
      
      for (const processedFile of processedFiles) {
        const filePath = processedFile.encryptedPath;
        const fileName = basename(filePath);
        const remotePath = `encrypted-builds/${new Date().toISOString().split('T')[0]}/${fileName}`;
        
        const uploadResult = await this.cloudStorage.uploadFile(
          filePath,
          remotePath,
          this.config.cloudProvider
        );
        
        uploadResults.push(uploadResult);
        
        this.logger.info('文件上传完成', {
          localPath: filePath,
          remotePath: remotePath,
          provider: this.config.cloudProvider
        });
      }
      
      // 保存上传清单
      const uploadManifest = {
        timestamp: new Date().toISOString(),
        provider: this.config.cloudProvider,
        uploads: uploadResults
      };
      
      const manifestPath = join(resolve(this.config.encryptedDir), 'manifests', `upload-manifest-${Date.now()}.json`);
      await fs.writeFile(manifestPath, JSON.stringify(uploadManifest, null, 2));
      
      this.logger.info('云存储上传完成', {
        totalFiles: uploadResults.length,
        provider: this.config.cloudProvider
      });
      
      return uploadResults;
      
    } catch (error) {
      this.logger.error('云存储上传失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取相对路径
   */
  getRelativePath(filePath, basePath) {
    return path.relative(basePath, filePath).replace(/\\/g, '/');
  }
}

/**
 * 命令行接口
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const options = {};
    
    // 解析命令行参数
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace(/^--/, '');
      const value = args[i + 1];
      
      switch (key) {
        case 'build-dir':
          options.buildDir = value;
          break;
        case 'encrypted-dir':
          options.encryptedDir = value;
          break;
        case 'compression':
          options.compressionEnabled = value === 'true';
          break;
        case 'format':
          options.compressionFormat = value;
          break;
        case 'cloud-provider':
          options.cloudProvider = value;
          break;
        case 'no-upload':
          options.uploadToCloud = false;
          break;
      }
    }
    
    const processor = new BuildProcessor(options);
    const report = await processor.process();
    
    console.log('\n构建处理完成！');
    console.log(`处理文件数: ${report.statistics.totalFiles}`);
    console.log(`输出目录: ${report.encryptedDirectory}`);
    
    if (report.statistics.compressionRatio) {
      console.log(`压缩比: ${report.statistics.compressionRatio.ratio}`);
    }
    
  } catch (error) {
    console.error('构建处理失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { BuildProcessor };