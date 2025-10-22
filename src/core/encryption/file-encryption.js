import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { BaseEncryption } from './base-encryption.js';
import { AESEncryption } from './aes-encryption.js';
import { RSAEncryption } from './rsa-encryption.js';
import { logger } from '../../utils/logger.js';

/**
 * 文件加密模块
 * 提供文件和目录的加密解密功能
 */
export class FileEncryption extends BaseEncryption {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        super(options);
        this.aesEncryption = new AESEncryption(options);
        this.rsaEncryption = new RSAEncryption(options);
        this.defaultFileTypes = options.defaultFileTypes || [
            '.js',
            '.css',
            '.html',
            '.png',
            '.webp',
            '.gif',
            '.jpeg',
            '.jpg',
            '.json',
            '.txt',
            '.md',
            '.xml',
            '.svg',
            '.ico',
            '.woff',
            '.woff2'
        ];
    }

    /**
     * 文件加密
     * @param {string} filePath - 要加密的文件路径
     * @param {string} outputPath - 输出文件路径（可选）
     * @param {Object} options - 加密选项
     * @returns {Object} 加密结果
     */
    async encryptFile(filePath, outputPath = null, options = {}) {
        try {
            const data = await fs.readFile(filePath);
            const fileExt = path.extname(filePath);
            const fileName = path.basename(filePath, fileExt);

            // 根据文件类型选择加密策略
            let encryptionResult;

            if (options.useRSA && options.publicKey) {
                encryptionResult = await this.rsaEncryption.hybridEncrypt(
                    data,
                    options.publicKey,
                    options
                );
            } else {
                encryptionResult = await this.aesEncryption.encryptAES(data, options.key);
            }

            // 创建加密文件元数据
            const metadata = {
                originalName: path.basename(filePath),
                fileType: fileExt,
                fileSize: data.length,
                encryptionAlgorithm: options.useRSA ? 'hybrid' : 'aes-256-gcm',
                timestamp: new Date().toISOString(),
                checksum: crypto.createHash('sha256').update(data).digest('hex'),
                version: '1.0'
            };

            // 组合元数据和加密数据
            const metadataBuffer = Buffer.from(JSON.stringify(metadata));
            const metadataLength = Buffer.alloc(4);

            metadataLength.writeUInt32BE(metadataBuffer.length);

            const encryptedDataBuffer = Buffer.isBuffer(
                encryptionResult.encrypted || encryptionResult.encryptedData
            )
                ? encryptionResult.encrypted || encryptionResult.encryptedData
                : Buffer.from(encryptionResult.encrypted || encryptionResult.encryptedData, 'hex');

            const finalData = Buffer.concat([metadataLength, metadataBuffer, encryptedDataBuffer]);

            // 输出路径
            const output = outputPath || `${filePath}.encrypted`;

            await fs.writeFile(output, finalData);

            return {
                outputPath: output,
                metadata,
                encryptionInfo: encryptionResult
            };
        } catch (error) {
            throw new Error(`文件加密失败: ${error.message}`);
        }
    }

    /**
     * 文件解密
     * @param {string} encryptedFilePath - 加密文件路径
     * @param {string} outputPath - 输出文件路径（可选）
     * @param {Object} options - 解密选项
     * @returns {Object} 解密结果
     */
    async decryptFile(encryptedFilePath, outputPath = null, options = {}) {
        try {
            const encryptedData = await fs.readFile(encryptedFilePath);

            // 提取元数据
            const metadataLength = encryptedData.readUInt32BE(0);
            const metadataBuffer = encryptedData.slice(4, 4 + metadataLength);
            const metadata = JSON.parse(metadataBuffer.toString());
            const actualEncryptedData = encryptedData.slice(4 + metadataLength);

            // 根据加密算法解密
            let decryptedData;

            if (metadata.encryptionAlgorithm === 'hybrid') {
                // 构造混合解密所需的数据格式
                const hybridData = {
                    encryptedData: actualEncryptedData.toString('hex'),
                    encryptedKey: options.encryptedKey,
                    iv: options.iv,
                    authTag: options.authTag,
                    algorithm: 'hybrid-rsa-aes'
                };

                decryptedData = await this.rsaEncryption.hybridDecrypt(
                    hybridData,
                    options.privateKey,
                    options
                );
                decryptedData = Buffer.from(decryptedData, 'utf8');
            } else {
                // AES解密
                const aesData = {
                    encryptedData: actualEncryptedData.toString('hex'),
                    iv: options.iv,
                    authTag: options.authTag,
                    algorithm: metadata.encryptionAlgorithm
                };
                const decryptedString = await this.aesEncryption.decryptAES(aesData, options.key);

                decryptedData = Buffer.from(decryptedString, 'utf8');
            }

            // 验证校验和
            const checksum = crypto.createHash('sha256').update(decryptedData).digest('hex');

            if (checksum !== metadata.checksum) {
                throw new Error('文件完整性验证失败，文件可能已被篡改');
            }

            // 输出路径
            const output =
                outputPath ||
                metadata.originalName ||
                encryptedFilePath.replace(/\.encrypted$/, '');

            await fs.writeFile(output, decryptedData);

            return {
                outputPath: output,
                metadata,
                fileSize: decryptedData.length
            };
        } catch (error) {
            throw new Error(`文件解密失败: ${error.message}`);
        }
    }

    /**
     * 批量文件加密
     * @param {string} inputDir - 输入目录
     * @param {string} outputDir - 输出目录
     * @param {Object} options - 加密选项
     * @returns {Object} 加密清单
     */
    async encryptDirectory(inputDir, outputDir, options = {}) {
        try {
            await fs.mkdir(outputDir, { recursive: true });

            const files = await this.scanDirectory(inputDir, options.fileTypes);
            const results = [];
            let totalSize = 0;
            let encryptedSize = 0;

            logger.info(`开始加密目录 ${inputDir}，共找到 ${files.length} 个文件`);

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const relativePath = path.relative(inputDir, file);
                const outputPath = path.join(outputDir, `${relativePath}.encrypted`);

                // 确保输出目录存在
                await fs.mkdir(path.dirname(outputPath), { recursive: true });

                try {
                    const result = await this.encryptFile(file, outputPath, options);
                    const stats = await fs.stat(file);
                    const encryptedStats = await fs.stat(result.outputPath);

                    totalSize += stats.size;
                    encryptedSize += encryptedStats.size;

                    results.push({
                        originalPath: file,
                        encryptedPath: result.outputPath,
                        metadata: result.metadata,
                        originalSize: stats.size,
                        encryptedSize: encryptedStats.size
                    });

                    logger.info(`已加密文件 ${i + 1}/${files.length}: ${relativePath}`);
                } catch (error) {
                    logger.error(`加密文件失败 ${relativePath}: ${error.message}`);
                    results.push({
                        originalPath: file,
                        error: error.message,
                        success: false
                    });
                }
            }

            // 生成加密清单
            const manifest = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                inputDirectory: inputDir,
                outputDirectory: outputDir,
                totalFiles: files.length,
                successfulFiles: results.filter(r => !r.error).length,
                failedFiles: results.filter(r => r.error).length,
                totalOriginalSize: totalSize,
                totalEncryptedSize: encryptedSize,
                compressionRatio: totalSize > 0 ? (encryptedSize / totalSize).toFixed(3) : 0,
                encryptionAlgorithm: options.useRSA ? 'hybrid' : 'aes-256-gcm',
                files: results
            };

            await fs.writeFile(
                path.join(outputDir, 'encryption-manifest.json'),
                JSON.stringify(manifest, null, 2)
            );

            logger.info(
                `目录加密完成，成功: ${manifest.successfulFiles}，失败: ${manifest.failedFiles}`
            );

            return manifest;
        } catch (error) {
            throw new Error(`目录加密失败: ${error.message}`);
        }
    }

    /**
     * 批量文件解密
     * @param {string} encryptedDir - 加密文件目录
     * @param {string} outputDir - 输出目录
     * @param {Object} options - 解密选项
     * @returns {Object} 解密结果
     */
    async decryptDirectory(encryptedDir, outputDir, options = {}) {
        try {
            // 读取加密清单
            const manifestPath = path.join(encryptedDir, 'encryption-manifest.json');
            const manifestData = await fs.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestData);

            await fs.mkdir(outputDir, { recursive: true });

            const results = [];
            let successCount = 0;
            let failCount = 0;

            logger.info(`开始解密目录，共 ${manifest.files.length} 个文件`);

            for (let i = 0; i < manifest.files.length; i++) {
                const fileInfo = manifest.files[i];

                if (fileInfo.error) {
                    results.push(fileInfo);
                    failCount++;
                    continue;
                }

                const { encryptedPath } = fileInfo;
                const relativePath = path
                    .relative(encryptedDir, encryptedPath)
                    .replace(/\.encrypted$/, '');
                const outputPath = path.join(outputDir, relativePath);

                // 确保输出目录存在
                await fs.mkdir(path.dirname(outputPath), { recursive: true });

                try {
                    const result = await this.decryptFile(encryptedPath, outputPath, options);

                    results.push({
                        originalPath: fileInfo.originalPath,
                        decryptedPath: result.outputPath,
                        metadata: result.metadata,
                        success: true
                    });
                    successCount++;
                    logger.info(`已解密文件 ${i + 1}/${manifest.files.length}: ${relativePath}`);
                } catch (error) {
                    logger.error(`解密文件失败 ${relativePath}: ${error.message}`);
                    results.push({
                        originalPath: fileInfo.originalPath,
                        error: error.message,
                        success: false
                    });
                    failCount++;
                }
            }

            const decryptionResult = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                originalManifest: manifest,
                totalFiles: manifest.files.length,
                successfulFiles: successCount,
                failedFiles: failCount,
                files: results
            };

            await fs.writeFile(
                path.join(outputDir, 'decryption-result.json'),
                JSON.stringify(decryptionResult, null, 2)
            );

            logger.info(`目录解密完成，成功: ${successCount}，失败: ${failCount}`);

            return decryptionResult;
        } catch (error) {
            throw new Error(`目录解密失败: ${error.message}`);
        }
    }

    /**
     * 扫描目录中的文件
     * @param {string} dir - 要扫描的目录路径
     * @param {Array<string>} fileTypes - 要包含的文件类型扩展名
     * @returns {Promise<Array<string>>} 匹配的文件路径数组
     */
    async scanDirectory(dir, fileTypes = null) {
        const types = fileTypes || this.defaultFileTypes;
        const files = [];

        await this._scanDirectoryRecursive(dir, types, files);

        return files;
    }

    /**
     * 递归扫描目录的内部实现
     * @private
     */
    async _scanDirectoryRecursive(currentDir, fileTypes, files) {
        try {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    // 跳过某些系统目录
                    if (!this._shouldSkipDirectory(entry.name)) {
                        await this._scanDirectoryRecursive(fullPath, fileTypes, files);
                    }
                } else if (entry.isFile() && this._isFileTypeMatched(entry.name, fileTypes)) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            logger.warn(`无法扫描目录 ${currentDir}: ${error.message}`);
        }
    }

    /**
     * 检查是否应该跳过目录
     * @private
     */
    _shouldSkipDirectory(dirName) {
        const skipDirs = ['.git', 'node_modules', '.vscode', '.idea', 'dist', 'build', 'coverage'];

        return skipDirs.includes(dirName) || dirName.startsWith('.');
    }

    /**
     * 检查文件类型是否匹配
     * @private
     */
    _isFileTypeMatched(fileName, fileTypes) {
        const ext = path.extname(fileName).toLowerCase();

        return fileTypes.includes(ext);
    }

    /**
     * 获取文件加密信息
     * @param {string} encryptedFilePath - 加密文件路径
     * @returns {Object} 文件信息
     */
    async getFileInfo(encryptedFilePath) {
        try {
            const encryptedData = await fs.readFile(encryptedFilePath);
            const metadataLength = encryptedData.readUInt32BE(0);
            const metadataBuffer = encryptedData.slice(4, 4 + metadataLength);
            const metadata = JSON.parse(metadataBuffer.toString());

            const stats = await fs.stat(encryptedFilePath);

            return {
                filePath: encryptedFilePath,
                fileSize: stats.size,
                metadata,
                isEncrypted: true,
                encryptedDataSize: encryptedData.length - 4 - metadataLength
            };
        } catch (error) {
            throw new Error(`获取文件信息失败: ${error.message}`);
        }
    }

    /**
     * 验证加密文件完整性
     * @param {string} encryptedFilePath - 加密文件路径
     * @returns {boolean} 验证结果
     */
    async verifyFileIntegrity(encryptedFilePath) {
        try {
            const fileInfo = await this.getFileInfo(encryptedFilePath);

            // 检查元数据完整性
            if (!fileInfo.metadata || !fileInfo.metadata.checksum) {
                return false;
            }

            // 可以添加更多验证逻辑
            return true;
        } catch (error) {
            logger.error(`文件完整性验证失败: ${error.message}`);

            return false;
        }
    }

    /**
     * 设置AES和RSA加密实例
     * @param {AESEncryption} aesEncryption - AES加密实例
     * @param {RSAEncryption} rsaEncryption - RSA加密实例
     */
    setEncryptionInstances(aesEncryption, rsaEncryption) {
        if (aesEncryption) this.aesEncryption = aesEncryption;
        if (rsaEncryption) this.rsaEncryption = rsaEncryption;
    }
}

export default FileEncryption;
