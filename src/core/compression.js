import archiver from 'archiver';
import yauzl from 'yauzl';
import fs from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import path from 'path';

/**
 * 压缩和解压缩模块
 * 支持zip格式的文件压缩和解压缩
 */
export class CompressionCore {
    constructor(options = {}) {
        this.compressionLevel = options.compressionLevel || 6; // 0-9
        this.format = options.format || 'zip';
    }

    /**
     * 压缩单个文件
     */
    async compressFile(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            const output = createWriteStream(outputPath);
            const archive = archiver(this.format, {
                zlib: { level: this.compressionLevel }
            });

            output.on('close', () => {
                resolve({
                    outputPath,
                    totalBytes: archive.pointer(),
                    compressionRatio: this.calculateCompressionRatio(inputPath, outputPath)
                });
            });

            archive.on('error', err => {
                reject(new Error(`压缩失败: ${err.message}`));
            });

            archive.pipe(output);
            archive.file(inputPath, { name: path.basename(inputPath) });
            archive.finalize();
        });
    }

    /**
     * 压缩目录
     */
    async compressDirectory(inputDir, outputPath, options = {}) {
        return new Promise((resolve, reject) => {
            const output = createWriteStream(outputPath);
            const archive = archiver(this.format, {
                zlib: { level: this.compressionLevel }
            });

            let fileCount = 0;

            output.on('close', () => {
                resolve({
                    outputPath,
                    totalBytes: archive.pointer(),
                    fileCount,
                    compressionRatio: this.calculateCompressionRatio(inputDir, outputPath)
                });
            });

            archive.on('error', err => {
                reject(new Error(`目录压缩失败: ${err.message}`));
            });

            archive.on('entry', () => {
                fileCount++;
            });

            archive.pipe(output);

            // 添加目录中的所有文件
            if (options.fileFilter) {
                archive.glob(options.fileFilter, { cwd: inputDir });
            } else {
                archive.directory(inputDir, false);
            }

            archive.finalize();
        });
    }

    /**
     * 压缩多个文件到一个压缩包
     */
    async compressFiles(files, outputPath, options = {}) {
        return new Promise((resolve, reject) => {
            const output = createWriteStream(outputPath);
            const archive = archiver(this.format, {
                zlib: { level: this.compressionLevel }
            });

            let processedFiles = 0;

            output.on('close', () => {
                resolve({
                    outputPath,
                    totalBytes: archive.pointer(),
                    fileCount: processedFiles,
                    files: files.map(f => ({
                        original: f.path,
                        archived: f.name || path.basename(f.path)
                    }))
                });
            });

            archive.on('error', err => {
                reject(new Error(`文件压缩失败: ${err.message}`));
            });

            archive.pipe(output);

            // 添加每个文件
            files.forEach(file => {
                if (typeof file === 'string') {
                    archive.file(file, { name: path.basename(file) });
                } else {
                    archive.file(file.path, { name: file.name || path.basename(file.path) });
                }
                processedFiles++;
            });

            archive.finalize();
        });
    }

    /**
     * 解压缩文件
     */
    async extractArchive(archivePath, outputDir, options = {}) {
        return new Promise((resolve, reject) => {
            yauzl.open(archivePath, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    reject(new Error(`打开压缩文件失败: ${err.message}`));

                    return;
                }

                const extractedFiles = [];
                let pendingEntries = 0;
                let completedEntries = 0;

                zipfile.readEntry();

                zipfile.on('entry', async entry => {
                    pendingEntries++;

                    if (/\/$/.test(entry.fileName)) {
                        // 目录条目
                        const dirPath = path.join(outputDir, entry.fileName);

                        try {
                            await fs.mkdir(dirPath, { recursive: true });
                            completedEntries++;
                            if (completedEntries === pendingEntries) {
                                resolve({ extractedFiles, outputDir });
                            } else {
                                zipfile.readEntry();
                            }
                        } catch (error) {
                            reject(new Error(`创建目录失败: ${error.message}`));
                        }
                    } else {
                        // 文件条目
                        zipfile.openReadStream(entry, async (err, readStream) => {
                            if (err) {
                                reject(new Error(`读取压缩文件条目失败: ${err.message}`));

                                return;
                            }

                            const outputPath = path.join(outputDir, entry.fileName);

                            // 确保输出目录存在
                            try {
                                await fs.mkdir(path.dirname(outputPath), { recursive: true });
                            } catch (error) {
                                reject(new Error(`创建输出目录失败: ${error.message}`));

                                return;
                            }

                            const writeStream = createWriteStream(outputPath);

                            writeStream.on('close', () => {
                                extractedFiles.push({
                                    originalName: entry.fileName,
                                    extractedPath: outputPath,
                                    size: entry.uncompressedSize
                                });

                                completedEntries++;
                                if (completedEntries === pendingEntries) {
                                    resolve({ extractedFiles, outputDir });
                                } else {
                                    zipfile.readEntry();
                                }
                            });

                            writeStream.on('error', error => {
                                reject(new Error(`写入文件失败: ${error.message}`));
                            });

                            readStream.pipe(writeStream);
                        });
                    }
                });

                zipfile.on('end', () => {
                    if (pendingEntries === 0) {
                        resolve({ extractedFiles: [], outputDir });
                    }
                });

                zipfile.on('error', error => {
                    reject(new Error(`解压缩失败: ${error.message}`));
                });
            });
        });
    }

    /**
     * 列出压缩文件内容
     */
    async listArchiveContents(archivePath) {
        return new Promise((resolve, reject) => {
            yauzl.open(archivePath, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    reject(new Error(`打开压缩文件失败: ${err.message}`));

                    return;
                }

                const contents = [];

                zipfile.readEntry();

                zipfile.on('entry', entry => {
                    contents.push({
                        name: entry.fileName,
                        size: entry.uncompressedSize,
                        compressedSize: entry.compressedSize,
                        compressionMethod: entry.compressionMethod,
                        lastModified: entry.getLastModDate(),
                        isDirectory: /\/$/.test(entry.fileName)
                    });
                    zipfile.readEntry();
                });

                zipfile.on('end', () => {
                    resolve(contents);
                });

                zipfile.on('error', error => {
                    reject(new Error(`读取压缩文件内容失败: ${error.message}`));
                });
            });
        });
    }

    /**
     * 计算压缩比
     */
    async calculateCompressionRatio(originalPath, compressedPath) {
        try {
            const originalStats = await fs.stat(originalPath);
            const compressedStats = await fs.stat(compressedPath);

            const originalSize = originalStats.isDirectory()
                ? await this.getDirectorySize(originalPath)
                : originalStats.size;

            const compressedSize = compressedStats.size;
            const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

            return {
                originalSize,
                compressedSize,
                ratio: `${ratio}%`,
                savings: originalSize - compressedSize
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * 获取目录大小
     */
    async getDirectorySize(dirPath) {
        let totalSize = 0;

        async function calculateSize(currentPath) {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);

                if (entry.isDirectory()) {
                    await calculateSize(fullPath);
                } else if (entry.isFile()) {
                    const stats = await fs.stat(fullPath);

                    totalSize += stats.size;
                }
            }
        }

        await calculateSize(dirPath);

        return totalSize;
    }

    /**
     * 验证压缩文件完整性
     */
    async validateArchive(archivePath) {
        try {
            const contents = await this.listArchiveContents(archivePath);

            return {
                isValid: true,
                fileCount: contents.length,
                totalSize: contents.reduce((sum, file) => sum + file.size, 0),
                contents
            };
        } catch (error) {
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    /**
     * 创建加密压缩包（结合加密模块）
     */
    async createEncryptedArchive(files, outputPath, encryptionCore, options = {}) {
        try {
            // 先压缩文件
            const tempArchivePath = `${outputPath}.temp`;
            const compressionResult = await this.compressFiles(files, tempArchivePath, options);

            // 然后加密压缩包
            const encryptionResult = await encryptionCore.encryptFile(
                tempArchivePath,
                outputPath,
                options.encryptionOptions || {}
            );

            // 删除临时文件
            await fs.unlink(tempArchivePath);

            return {
                ...compressionResult,
                ...encryptionResult,
                isEncrypted: true
            };
        } catch (error) {
            throw new Error(`创建加密压缩包失败: ${error.message}`);
        }
    }

    /**
     * 解密并解压缩
     */
    async extractEncryptedArchive(encryptedArchivePath, outputDir, encryptionCore, options = {}) {
        try {
            // 先解密
            const tempArchivePath = `${encryptedArchivePath}.decrypted.temp`;
            const decryptionResult = await encryptionCore.decryptFile(
                encryptedArchivePath,
                tempArchivePath,
                options.decryptionOptions || {}
            );

            // 然后解压缩
            const extractionResult = await this.extractArchive(tempArchivePath, outputDir, options);

            // 删除临时文件
            await fs.unlink(tempArchivePath);

            return {
                ...extractionResult,
                ...decryptionResult,
                wasEncrypted: true
            };
        } catch (error) {
            throw new Error(`解密并解压缩失败: ${error.message}`);
        }
    }
}

export default CompressionCore;
