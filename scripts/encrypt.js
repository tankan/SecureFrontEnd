#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve, basename, join } from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { EncryptionCore } from '../src/core/encryption.js';
import { CompressionCore } from '../src/core/compression.js';
import winston from 'winston';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 独立加密工具
 * 提供灵活的文件和目录加密功能
 */
class EncryptionTool {
  constructor(options = {}) {
    this.config = {
      algorithm: options.algorithm || process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
      outputMode: options.outputMode || 'single', // 'single' | 'archive'
      compressionEnabled: options.compressionEnabled ?? false,
      compressionFormat: options.compressionFormat || 'zip',
      keyDerivation: options.keyDerivation || 'pbkdf2',
      iterations: options.iterations || 100000,
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
      defaultMeta: { service: 'encryption-tool' },
      transports: [
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
    this.encryptionCore = new EncryptionCore({
      algorithm: this.config.algorithm
    });

    this.compressionCore = new CompressionCore({
      format: this.config.compressionFormat
    });
  }

  /**
   * 加密单个文件
   */
  async encryptFile(inputPath, outputPath = null, options = {}) {
    try {
      const resolvedInput = resolve(inputPath);
      
      if (!existsSync(resolvedInput)) {
        throw new Error(`输入文件不存在: ${resolvedInput}`);
      }

      const stats = await fs.stat(resolvedInput);
      if (!stats.isFile()) {
        throw new Error(`输入路径不是文件: ${resolvedInput}`);
      }

      // 生成输出路径
      const resolvedOutput = outputPath 
        ? resolve(outputPath)
        : `${resolvedInput}.encrypted`;

      this.logger.info('开始加密文件', {
        input: resolvedInput,
        output: resolvedOutput,
        algorithm: this.config.algorithm
      });

      // 生成或使用提供的密钥
      const encryptionKey = options.key || this.generateEncryptionKey(options.password);
      
      // 执行加密
      const result = await this.encryptionCore.encryptFile(
        resolvedInput,
        resolvedOutput,
        {
          key: encryptionKey,
          useRSA: options.useRSA,
          publicKey: options.publicKey
        }
      );

      // 保存密钥信息（如果需要）
      if (options.saveKeyInfo) {
        await this.saveKeyInfo(resolvedOutput, encryptionKey, options);
      }

      this.logger.info('文件加密完成', {
        input: resolvedInput,
        output: result.outputPath,
        algorithm: result.metadata.encryptionAlgorithm
      });

      return result;

    } catch (error) {
      this.logger.error('文件加密失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 加密目录
   */
  async encryptDirectory(inputDir, outputDir = null, options = {}) {
    try {
      const resolvedInput = resolve(inputDir);
      
      if (!existsSync(resolvedInput)) {
        throw new Error(`输入目录不存在: ${resolvedInput}`);
      }

      const stats = await fs.stat(resolvedInput);
      if (!stats.isDirectory()) {
        throw new Error(`输入路径不是目录: ${resolvedInput}`);
      }

      // 生成输出路径
      const resolvedOutput = outputDir 
        ? resolve(outputDir)
        : `${resolvedInput}_encrypted`;

      this.logger.info('开始加密目录', {
        input: resolvedInput,
        output: resolvedOutput,
        mode: this.config.outputMode
      });

      let result;

      if (this.config.outputMode === 'archive' || this.config.compressionEnabled) {
        // 压缩后加密模式
        result = await this.encryptDirectoryAsArchive(resolvedInput, resolvedOutput, options);
      } else {
        // 逐个文件加密模式
        result = await this.encryptDirectoryFiles(resolvedInput, resolvedOutput, options);
      }

      this.logger.info('目录加密完成', {
        input: resolvedInput,
        output: resolvedOutput,
        totalFiles: result.totalFiles || result.files?.length || 0
      });

      return result;

    } catch (error) {
      this.logger.error('目录加密失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 将目录压缩后加密
   */
  async encryptDirectoryAsArchive(inputDir, outputDir, options = {}) {
    await fs.mkdir(outputDir, { recursive: true });

    const archiveName = `${basename(inputDir)}.${this.config.compressionFormat}`;
    const archivePath = join(outputDir, archiveName);
    const encryptedArchivePath = `${archivePath}.encrypted`;

    // 压缩目录
    this.logger.info('压缩目录');
    const compressionResult = await this.compressionCore.compressDirectory(
      inputDir,
      archivePath,
      {
        fileFilter: options.fileFilter
      }
    );

    // 加密压缩包
    this.logger.info('加密压缩包');
    const encryptionKey = options.key || this.generateEncryptionKey(options.password);
    const encryptionResult = await this.encryptionCore.encryptFile(
      archivePath,
      encryptedArchivePath,
      {
        key: encryptionKey,
        useRSA: options.useRSA,
        publicKey: options.publicKey
      }
    );

    // 删除未加密的压缩包
    await fs.unlink(archivePath);

    // 保存密钥信息
    if (options.saveKeyInfo) {
      await this.saveKeyInfo(encryptedArchivePath, encryptionKey, options);
    }

    // 生成清单
    const manifest = {
      type: 'encrypted-archive',
      timestamp: new Date().toISOString(),
      originalDirectory: inputDir,
      encryptedArchive: encryptedArchivePath,
      compressionResult,
      encryptionResult,
      algorithm: this.config.algorithm
    };

    const manifestPath = join(outputDir, 'encryption-manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    return manifest;
  }

  /**
   * 逐个文件加密目录
   */
  async encryptDirectoryFiles(inputDir, outputDir, options = {}) {
    const encryptionKey = options.key || this.generateEncryptionKey(options.password);
    
    const result = await this.encryptionCore.encryptDirectory(
      inputDir,
      outputDir,
      {
        key: encryptionKey,
        useRSA: options.useRSA,
        publicKey: options.publicKey,
        fileTypes: options.fileTypes
      }
    );

    // 保存密钥信息
    if (options.saveKeyInfo) {
      await this.saveKeyInfo(outputDir, encryptionKey, options);
    }

    return result;
  }

  /**
   * 解密文件
   */
  async decryptFile(inputPath, outputPath = null, options = {}) {
    try {
      const resolvedInput = resolve(inputPath);
      
      if (!existsSync(resolvedInput)) {
        throw new Error(`输入文件不存在: ${resolvedInput}`);
      }

      // 生成输出路径
      const resolvedOutput = outputPath 
        ? resolve(outputPath)
        : resolvedInput.replace(/\.encrypted$/, '');

      this.logger.info('开始解密文件', {
        input: resolvedInput,
        output: resolvedOutput
      });

      // 获取解密密钥
      const decryptionKey = options.key || this.loadDecryptionKey(resolvedInput, options);

      // 执行解密
      const result = await this.encryptionCore.decryptFile(
        resolvedInput,
        resolvedOutput,
        {
          key: decryptionKey,
          encryptedKey: options.encryptedKey,
          privateKey: options.privateKey
        }
      );

      this.logger.info('文件解密完成', {
        input: resolvedInput,
        output: result.outputPath
      });

      return result;

    } catch (error) {
      this.logger.error('文件解密失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 解密目录或压缩包
   */
  async decryptDirectory(inputPath, outputDir = null, options = {}) {
    try {
      const resolvedInput = resolve(inputPath);
      
      if (!existsSync(resolvedInput)) {
        throw new Error(`输入路径不存在: ${resolvedInput}`);
      }

      const stats = await fs.stat(resolvedInput);
      
      if (stats.isFile()) {
        // 假设是加密的压缩包
        return await this.decryptArchive(resolvedInput, outputDir, options);
      } else if (stats.isDirectory()) {
        // 假设是包含加密文件的目录
        return await this.decryptDirectoryFiles(resolvedInput, outputDir, options);
      } else {
        throw new Error(`不支持的输入类型: ${resolvedInput}`);
      }

    } catch (error) {
      this.logger.error('目录解密失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 解密压缩包
   */
  async decryptArchive(encryptedArchivePath, outputDir, options = {}) {
    const resolvedOutput = outputDir 
      ? resolve(outputDir)
      : resolve(dirname(encryptedArchivePath), 'decrypted');

    await fs.mkdir(resolvedOutput, { recursive: true });

    this.logger.info('解密压缩包', {
      input: encryptedArchivePath,
      output: resolvedOutput
    });

    // 获取解密密钥
    const decryptionKey = options.key || this.loadDecryptionKey(encryptedArchivePath, options);

    // 解密并解压缩
    const result = await this.compressionCore.extractEncryptedArchive(
      encryptedArchivePath,
      resolvedOutput,
      this.encryptionCore,
      {
        decryptionOptions: {
          key: decryptionKey,
          encryptedKey: options.encryptedKey,
          privateKey: options.privateKey
        }
      }
    );

    return result;
  }

  /**
   * 解密目录中的文件
   */
  async decryptDirectoryFiles(inputDir, outputDir, options = {}) {
    const resolvedOutput = outputDir 
      ? resolve(outputDir)
      : `${inputDir}_decrypted`;

    await fs.mkdir(resolvedOutput, { recursive: true });

    this.logger.info('解密目录文件', {
      input: inputDir,
      output: resolvedOutput
    });

    // 扫描加密文件
    const encryptedFiles = await this.scanEncryptedFiles(inputDir);
    const decryptedFiles = [];

    // 获取解密密钥
    const decryptionKey = options.key || this.loadDecryptionKey(inputDir, options);

    for (const encryptedFile of encryptedFiles) {
      const relativePath = path.relative(inputDir, encryptedFile);
      const outputPath = join(resolvedOutput, relativePath.replace(/\.encrypted$/, ''));

      // 确保输出目录存在
      await fs.mkdir(dirname(outputPath), { recursive: true });

      const result = await this.encryptionCore.decryptFile(
        encryptedFile,
        outputPath,
        {
          key: decryptionKey,
          encryptedKey: options.encryptedKey,
          privateKey: options.privateKey
        }
      );

      decryptedFiles.push(result);
    }

    return {
      inputDirectory: inputDir,
      outputDirectory: resolvedOutput,
      decryptedFiles,
      totalFiles: decryptedFiles.length
    };
  }

  /**
   * 生成加密密钥
   */
  generateEncryptionKey(password = null) {
    if (password) {
      // 基于密码派生密钥
      return this.deriveKeyFromPassword(password);
    } else {
      // 生成随机密钥
      return this.encryptionCore.generateFileKey();
    }
  }

  /**
   * 从密码派生密钥
   */
  deriveKeyFromPassword(password, salt = null) {
    const crypto = require('crypto');
    const actualSalt = salt || crypto.randomBytes(16);
    
    const key = crypto.pbkdf2Sync(
      password,
      actualSalt,
      this.config.iterations,
      32, // 256 bits
      'sha256'
    );

    return {
      key,
      salt: actualSalt,
      iterations: this.config.iterations
    };
  }

  /**
   * 保存密钥信息
   */
  async saveKeyInfo(encryptedFilePath, keyInfo, options = {}) {
    const keyInfoPath = `${encryptedFilePath}.keyinfo`;
    
    const keyData = {
      algorithm: this.config.algorithm,
      keyDerivation: this.config.keyDerivation,
      timestamp: new Date().toISOString(),
      ...(keyInfo.salt && { salt: keyInfo.salt.toString('hex') }),
      ...(keyInfo.iterations && { iterations: keyInfo.iterations })
    };

    // 不保存实际密钥，只保存派生参数
    if (!options.saveActualKey) {
      delete keyData.key;
    }

    await fs.writeFile(keyInfoPath, JSON.stringify(keyData, null, 2));
  }

  /**
   * 加载解密密钥
   */
  loadDecryptionKey(encryptedFilePath, options = {}) {
    if (options.password) {
      // 从密码派生密钥
      const keyInfoPath = `${encryptedFilePath}.keyinfo`;
      
      if (existsSync(keyInfoPath)) {
        const keyInfo = JSON.parse(fs.readFileSync(keyInfoPath, 'utf8'));
        return this.deriveKeyFromPassword(
          options.password,
          Buffer.from(keyInfo.salt, 'hex')
        ).key;
      } else {
        return this.deriveKeyFromPassword(options.password).key;
      }
    } else if (options.keyFile) {
      // 从文件加载密钥
      return fs.readFileSync(options.keyFile);
    } else {
      throw new Error('需要提供密码或密钥文件');
    }
  }

  /**
   * 扫描加密文件
   */
  async scanEncryptedFiles(directory) {
    const files = [];
    
    async function scan(currentDir) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.encrypted')) {
          files.push(fullPath);
        }
      }
    }
    
    await scan(directory);
    return files;
  }

  /**
   * 生成RSA密钥对
   */
  generateRSAKeyPair() {
    return this.encryptionCore.generateRSAKeyPair();
  }
}

/**
 * 命令行接口
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log(`
使用方法:
  node encrypt.js encrypt <input> [output] [options]
  node encrypt.js decrypt <input> [output] [options]
  node encrypt.js keygen [options]

选项:
  --password <password>     使用密码派生密钥
  --key-file <file>        从文件加载密钥
  --algorithm <algorithm>   加密算法 (默认: aes-256-gcm)
  --mode <mode>            输出模式: single|archive (默认: single)
  --compression            启用压缩
  --rsa                    使用RSA混合加密
  --save-key-info          保存密钥信息
      `);
      return;
    }

    const command = args[0];
    const input = args[1];
    const output = args[2];
    
    // 解析选项
    const options = {};
    for (let i = 3; i < args.length; i += 2) {
      const key = args[i].replace(/^--/, '');
      const value = args[i + 1];
      
      switch (key) {
        case 'password':
          options.password = value;
          break;
        case 'key-file':
          options.keyFile = value;
          break;
        case 'algorithm':
          options.algorithm = value;
          break;
        case 'mode':
          options.outputMode = value;
          break;
        case 'compression':
          options.compressionEnabled = true;
          i--; // 这个选项没有值
          break;
        case 'rsa':
          options.useRSA = true;
          i--; // 这个选项没有值
          break;
        case 'save-key-info':
          options.saveKeyInfo = true;
          i--; // 这个选项没有值
          break;
      }
    }

    const tool = new EncryptionTool(options);

    switch (command) {
      case 'encrypt':
        if (!input) {
          throw new Error('需要指定输入文件或目录');
        }
        
        const stats = await fs.stat(input);
        if (stats.isFile()) {
          await tool.encryptFile(input, output, options);
        } else if (stats.isDirectory()) {
          await tool.encryptDirectory(input, output, options);
        }
        break;

      case 'decrypt':
        if (!input) {
          throw new Error('需要指定输入文件或目录');
        }
        
        const decryptStats = await fs.stat(input);
        if (decryptStats.isFile()) {
          await tool.decryptFile(input, output, options);
        } else if (decryptStats.isDirectory()) {
          await tool.decryptDirectory(input, output, options);
        }
        break;

      case 'keygen':
        const keyPair = tool.generateRSAKeyPair();
        console.log('RSA密钥对已生成:');
        console.log('公钥:');
        console.log(keyPair.publicKey);
        console.log('\n私钥:');
        console.log(keyPair.privateKey);
        break;

      default:
        throw new Error(`未知命令: ${command}`);
    }

    console.log('操作完成！');

  } catch (error) {
    console.error('操作失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { EncryptionTool };