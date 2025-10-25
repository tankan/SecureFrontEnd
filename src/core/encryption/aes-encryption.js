import crypto from 'crypto';
import { BaseEncryption } from './base-encryption.js';
import { logger } from '../../utils/logger.js';

/**
 * AES加密模块
 * 提供AES-256-GCM和AES-256-CBC加密解密功能
 */
export class AESEncryption extends BaseEncryption {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        super(options);
        this.workerManager = null; // 延迟初始化
    }

    /**
     * 验证密钥完整性
     * @param {Object} keyData - 密钥数据对象
     * @returns {boolean} 验证结果
     */
    verifyKeyIntegrity(keyData) {
        if (!keyData || typeof keyData !== 'object') {
            return false;
        }

        if (!keyData.key || !keyData.hash) {
            return false;
        }

        try {
            const keyBuffer = Buffer.isBuffer(keyData.key)
                ? keyData.key
                : (keyData.key && (keyData.key.buffer instanceof ArrayBuffer || ArrayBuffer.isView(keyData.key))
                    ? Buffer.from(keyData.key)
                    : Buffer.from(keyData.key, 'base64'));
            const computedHash = crypto.createHash('sha256').update(keyBuffer).digest('hex');

            // 使用常数时间比较防止时间攻击
            return this.constantTimeCompare(computedHash, keyData.hash);
        } catch (error) {
            return false;
        }
    }

    /**
     * 常数时间字符串比较
     * @param {string} a - 字符串A
     * @param {string} b - 字符串B
     * @returns {boolean} 比较结果
     */
    constantTimeCompare(a, b) {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;

        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }

        return result === 0;
    }

    /**
     * AES-256-GCM加密（安全版本）
     * @param {string|Buffer} data - 要加密的数据
     * @param {Buffer|Object} key - 加密密钥
     * @param {Buffer} iv - 初始化向量
     * @returns {Object} 加密结果
     */
    async encryptAES(data, key = null, iv = null) {
        // 如果启用了Workers，使用Worker处理
        if (this.useWorkers && this.workerManager) {
            return await this.workerManager.encryptAES(data, key, iv);
        }

        // 主线程处理 - 使用安全的AES-256-GCM
        try {
            const encryptionKey = key || this.masterKey;

            // 处理新的密钥格式
            let keyBuffer, keyHash;

            if (typeof encryptionKey === 'object' && encryptionKey.key) {
                // 验证密钥完整性
                if (!this.verifyKeyIntegrity(encryptionKey)) {
                    throw new Error('密钥完整性验证失败，可能已被篡改');
                }
                keyBuffer = Buffer.isBuffer(encryptionKey.key)
                    ? encryptionKey.key
                    : Buffer.from(encryptionKey.key, 'base64');
                keyHash = encryptionKey.hash;
            } else {
                // 兼容旧格式
                keyBuffer = Buffer.isBuffer(encryptionKey)
                    ? encryptionKey
                    : Buffer.from(encryptionKey, 'base64');
            }

            // 确保密钥长度为32字节（256位）
            const finalKey =
                keyBuffer.length === 32
                    ? keyBuffer
                    : crypto.scryptSync(keyBuffer.toString('hex'), 'salt', 32);

            // 生成随机IV（每次加密都不同）
            let ivBuffer;
            if (!iv) {
                ivBuffer = crypto.randomBytes(this.ivSize);
            } else if (Buffer.isBuffer(iv)) {
                ivBuffer = iv;
            } else if (typeof iv === 'string') {
                ivBuffer = Buffer.from(iv, 'hex');
            } else if (ArrayBuffer.isView(iv)) {
                ivBuffer = Buffer.from(iv.buffer || iv);
            } else if (typeof iv === 'object' && iv.iv) {
                ivBuffer = Buffer.isBuffer(iv.iv) ? iv.iv : Buffer.from(iv.iv, 'hex');
            } else {
                ivBuffer = crypto.randomBytes(this.ivSize);
            }

            // 使用AES-256-GCM进行加密（使用 createCipheriv 并显式传入 IV）
            const cipher = crypto.createCipheriv('aes-256-gcm', finalKey, ivBuffer);

            cipher.setAAD(Buffer.from('SecureFrontEnd', 'utf8'));

            let encrypted = cipher.update(data, 'utf8', 'hex');

            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag();

            return {
                encryptedData: encrypted,
                iv: ivBuffer.toString('hex'),
                authTag: authTag.toString('hex'),
                algorithm: 'aes-256-gcm',
                keyHash
            };
        } catch (error) {
            // 如果GCM不可用，使用CBC模式作为备选
            try {
                const encryptionKey = key || this.masterKey;

                let keyBuffer, keyHash;

                if (typeof encryptionKey === 'object' && encryptionKey.key) {
                    if (!this.verifyKeyIntegrity(encryptionKey)) {
                        throw new Error('密钥完整性验证失败，可能已被篡改');
                    }
                    keyBuffer = Buffer.isBuffer(encryptionKey.key)
                        ? encryptionKey.key
                        : Buffer.from(encryptionKey.key, 'base64');
                    keyHash = encryptionKey.hash;
                } else {
                    keyBuffer = Buffer.isBuffer(encryptionKey)
                        ? encryptionKey
                        : Buffer.from(encryptionKey, 'base64');
                }

                const finalKey =
                    keyBuffer.length === 32
                        ? keyBuffer
                        : crypto.scryptSync(keyBuffer.toString('hex'), 'salt', 32);

                // 生成随机IV
                const ivBuffer = iv || crypto.randomBytes(this.ivSize);

                const cipher = crypto.createCipheriv('aes-256-cbc', finalKey, ivBuffer);
                let encrypted = cipher.update(data, 'utf8', 'hex');

                encrypted += cipher.final('hex');

                return {
                    encryptedData: encrypted,
                    iv: ivBuffer.toString('hex'),
                    algorithm: 'aes-256-cbc',
                    keyHash
                };
            } catch (fallbackError) {
                throw new Error(`AES加密失败: ${fallbackError.message}`);
            }
        }
    }

    /**
     * AES解密（安全版本）
     * @param {string|Object} encryptedData - 加密的数据
     * @param {Buffer|Object} key - 解密密钥
     * @returns {string} 解密后的数据
     */
    async decryptAES(encryptedData, key = null) {
        // 如果启用了Workers，使用Worker处理
        if (this.useWorkers && this.workerManager) {
            return await this.workerManager.decryptAES(encryptedData, key);
        }

        // 主线程处理 - 支持GCM和CBC模式
        const startTime = process.hrtime.bigint();
        const minTimeNs = BigInt(5_000_000); // 5ms 固定最小延迟，降低时间差异
        try {
            const decryptionKey = key || this.masterKey;

            if (!decryptionKey) {
                throw new Error('解密密钥不能为空');
            }

            // 处理新的密钥格式并验证完整性
            let keyBuffer;

            if (typeof decryptionKey === 'object' && decryptionKey.key) {
                if (!this.verifyKeyIntegrity(decryptionKey)) {
                    throw new Error('密钥完整性验证失败，可能已被篡改');
                }
                keyBuffer = Buffer.isBuffer(decryptionKey.key)
                    ? decryptionKey.key
                    : (decryptionKey.key && (decryptionKey.key.buffer instanceof ArrayBuffer || ArrayBuffer.isView(decryptionKey.key))
                        ? Buffer.from(decryptionKey.key)
                        : Buffer.from(decryptionKey.key, 'base64'));
            } else {
                keyBuffer = Buffer.isBuffer(decryptionKey)
                    ? decryptionKey
                    : Buffer.from(decryptionKey, 'base64');
            }

            const finalKey =
                keyBuffer.length === 32
                    ? keyBuffer
                    : crypto.scryptSync(keyBuffer.toString('hex'), 'salt', 32);

            // 处理加密数据格式
            let dataToDecrypt, ivHex, authTagHex, algorithm;

            if (typeof encryptedData === 'object') {
                dataToDecrypt = encryptedData.encryptedData;
                ivHex = encryptedData.iv;
                authTagHex = encryptedData.authTag;
                algorithm = encryptedData.algorithm || 'aes-256-gcm';

                // 验证密钥哈希匹配（如果存在）
                if (
                    encryptedData.keyHash &&
                    typeof decryptionKey === 'object' &&
                    decryptionKey.hash
                ) {
                    if (!this.constantTimeCompare(encryptedData.keyHash, decryptionKey.hash)) {
                        throw new Error('密钥不匹配，无法解密');
                    }
                }
            } else {
                // 兼容旧格式
                dataToDecrypt = encryptedData;
                algorithm = 'legacy';
            }

            let decrypted;

            if (algorithm === 'aes-256-gcm' && ivHex && authTagHex) {
                // GCM模式解密（使用 createDecipheriv 并显式传入 IV）
                const decipher = crypto.createDecipheriv(
                    'aes-256-gcm',
                    finalKey,
                    Buffer.from(ivHex, 'hex')
                );
                decipher.setAAD(Buffer.from('SecureFrontEnd', 'utf8'));
                decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

                decrypted = decipher.update(dataToDecrypt, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
            } else if (algorithm === 'aes-256-cbc' && ivHex) {
                // CBC模式解密
                const ivBuffer = Buffer.from(ivHex, 'hex');
                const decipher = crypto.createDecipheriv('aes-256-cbc', finalKey, ivBuffer);

                decrypted = decipher.update(dataToDecrypt, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
            } else {
                // 兼容旧版本的CryptoJS格式
                const keyString = decryptionKey.toString('base64');

                decrypted = CryptoJS.AES.decrypt(dataToDecrypt, keyString).toString(
                    CryptoJS.enc.Utf8
                );
            }

            // 确保解密操作至少花费固定时间（防止时间攻击）
            const elapsedTime = process.hrtime.bigint() - startTime;
            if (elapsedTime < minTimeNs) {
                const delayNs = minTimeNs - elapsedTime;
                await new Promise(resolve => setTimeout(resolve, Number(delayNs / BigInt(1_000_000))));
            }

            return decrypted;
        } catch (error) {
            // 即使出错也要保持固定的时间延迟
            const elapsedTime = process.hrtime.bigint() - startTime;
            if (elapsedTime < minTimeNs) {
                const delayNs = minTimeNs - elapsedTime;
                await new Promise(resolve => setTimeout(resolve, Number(delayNs / BigInt(1_000_000))));
            }
            throw new Error(`AES解密失败: ${error.message}`);
        }
    }

    /**
     * 批量AES加密
     * @param {Array} dataArray - 要加密的数据数组
     * @param {Buffer|Object} key - 加密密钥
     * @returns {Array} 加密结果数组
     */
    async batchEncryptAES(dataArray, key = null) {
        const results = [];

        for (const data of dataArray) {
            try {
                const encrypted = await this.encryptAES(data, key);

                results.push({ success: true, data: encrypted });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * 批量AES解密
     * @param {Array} encryptedDataArray - 加密数据数组
     * @param {Buffer|Object} key - 解密密钥
     * @returns {Array} 解密结果数组
     */
    async batchDecryptAES(encryptedDataArray, key = null) {
        const results = [];

        for (const encryptedData of encryptedDataArray) {
            try {
                const decrypted = await this.decryptAES(encryptedData, key);

                results.push({ success: true, data: decrypted });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * 设置Worker管理器
     * @param {Object} workerManager - Worker管理器实例
     */
    setWorkerManager(workerManager) {
        this.workerManager = workerManager;
    }
}

export default AESEncryption;
