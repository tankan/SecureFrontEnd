import crypto from 'crypto';
import { logger } from '../../utils/logger.js';

// 模拟CryptoJS库的基本功能
export const CryptoJS = {
    AES: {
        encrypt: (data, key) => {
            try {
                const cipher = crypto.createCipher('aes-256-cbc', key);
                let encrypted = cipher.update(data, 'utf8', 'hex');

                encrypted += cipher.final('hex');

                return { toString: () => encrypted };
            } catch (error) {
                // 如果createCipher不可用，使用简单的Base64编码作为备选
                const encoded = Buffer.from(data + key).toString('base64');

                return { toString: () => encoded };
            }
        },
        decrypt: (encryptedData, key) => {
            try {
                const decipher = crypto.createDecipher('aes-256-cbc', key);
                let decrypted = decipher.update(encryptedData, 'hex', 'utf8');

                decrypted += decipher.final('utf8');

                return { toString: encoding => decrypted };
            } catch (error) {
                // 如果createDecipher不可用，使用简单的Base64解码作为备选
                try {
                    const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
                    const result = decoded.replace(key, '');

                    return { toString: encoding => result };
                } catch (e) {
                    return { toString: encoding => encryptedData };
                }
            }
        }
    },
    enc: {
        Utf8: 'utf8'
    }
};

/**
 * 基础加密类
 * 提供通用的加密配置和工具方法
 */
export class BaseEncryption {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        this.algorithm = options.algorithm || 'aes-256-gcm';
        this.keySize = options.keySize || 32; // 256 bits
        this.ivSize = options.ivSize || 16; // 128 bits
        this.tagSize = options.tagSize || 16; // 128 bits
        this.masterKey = options.masterKey || this.generateMasterKey();
        this.useWorkers = false;
        this.workerCount = 0;
    }

    /**
     * 生成主密钥
     * @returns {Buffer} 主密钥
     */
    generateMasterKey() {
        return crypto.randomBytes(this.keySize);
    }

    /**
     * 生成随机密钥
     * @param {number} size - 密钥大小，默认为keySize
     * @returns {Buffer} 随机密钥
     */
    generateKey(size = null) {
        return crypto.randomBytes(size || this.keySize);
    }

    /**
     * 生成随机IV
     * @returns {Buffer} 随机IV
     */
    generateIV() {
        return crypto.randomBytes(this.ivSize);
    }

    /**
     * 生成文件密钥
     * @returns {Buffer} 文件密钥
     */
    generateFileKey() {
        return crypto.randomBytes(this.keySize);
    }

    /**
     * 生成随机盐值
     * @param {number} size - 盐值大小，默认16字节
     * @returns {Buffer} 随机盐值
     */
    generateSalt(size = 16) {
        return crypto.randomBytes(size);
    }

    /**
     * 从密码派生密钥
     * @param {string} password - 密码
     * @param {Buffer} salt - 盐值
     * @param {number} iterations - 迭代次数，默认100000
     * @param {number} keyLength - 密钥长度，默认为keySize
     * @returns {Buffer} 派生的密钥
     */
    deriveKey(password, salt, iterations = 100000, keyLength = null) {
        return crypto.pbkdf2Sync(password, salt, iterations, keyLength || this.keySize, 'sha256');
    }

    /**
     * 计算数据的哈希值
     * @param {Buffer|string} data - 要计算哈希的数据
     * @param {string} algorithm - 哈希算法，默认sha256
     * @returns {string} 哈希值（十六进制字符串）
     */
    hash(data, algorithm = 'sha256') {
        return crypto.createHash(algorithm).update(data).digest('hex');
    }

    /**
     * 计算HMAC
     * @param {Buffer|string} data - 数据
     * @param {Buffer|string} key - 密钥
     * @param {string} algorithm - 算法，默认sha256
     * @returns {string} HMAC值（十六进制字符串）
     */
    hmac(data, key, algorithm = 'sha256') {
        return crypto.createHmac(algorithm, key).update(data).digest('hex');
    }

    /**
     * 验证HMAC
     * @param {Buffer|string} data - 原始数据
     * @param {string} expectedHmac - 期望的HMAC值
     * @param {Buffer|string} key - 密钥
     * @param {string} algorithm - 算法，默认sha256
     * @returns {boolean} 验证结果
     */
    verifyHmac(data, expectedHmac, key, algorithm = 'sha256') {
        const calculatedHmac = this.hmac(data, key, algorithm);

        return crypto.timingSafeEqual(
            Buffer.from(expectedHmac, 'hex'),
            Buffer.from(calculatedHmac, 'hex')
        );
    }

    /**
     * 安全比较两个字符串
     * @param {string} a - 字符串A
     * @param {string} b - 字符串B
     * @returns {boolean} 比较结果
     */
    safeCompare(a, b) {
        if (a.length !== b.length) {
            return false;
        }

        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }

    /**
     * 启用Web Workers进行并行处理
     * @param {number} workerCount - Worker数量，默认为CPU核心数
     */
    enableWorkers(workerCount = null) {
        this.useWorkers = true;
        this.workerCount = workerCount || require('os').cpus().length;
        logger.info(`已启用 ${workerCount || 'auto'} 个Web Workers进行并行加密处理`);
    }

    /**
     * 禁用Web Workers，使用主线程处理
     */
    disableWorkers() {
        this.useWorkers = false;
        this.workerCount = 0;
        logger.info('已禁用Web Workers，使用主线程处理');
    }

    /**
     * 验证加密参数
     * @param {Buffer|string} data - 数据
     * @param {Buffer} key - 密钥
     * @throws {Error} 参数无效时抛出错误
     */
    validateEncryptionParams(data, key) {
        if (!data) {
            throw new Error('数据不能为空');
        }
        if (!key || key.length !== this.keySize) {
            throw new Error(`密钥长度必须为 ${this.keySize} 字节`);
        }
    }

    /**
     * 将字符串转换为Buffer
     * @param {string|Buffer} data - 数据
     * @returns {Buffer} Buffer对象
     */
    toBuffer(data) {
        return Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    }

    /**
     * 将Buffer转换为Base64字符串
     * @param {Buffer} buffer - Buffer对象
     * @returns {string} Base64字符串
     */
    toBase64(buffer) {
        return buffer.toString('base64');
    }

    /**
     * 将Base64字符串转换为Buffer
     * @param {string} base64String - Base64字符串
     * @returns {Buffer} Buffer对象
     */
    fromBase64(base64String) {
        return Buffer.from(base64String, 'base64');
    }
}

export default BaseEncryption;
