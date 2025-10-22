/**
 * 工具函数模块
 * 提供通用的工具函数和辅助方法
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// 常量定义
const DEFAULT_STRING_LENGTH = 32;
const AES_IV_LENGTH = 16;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MIN_PASSWORD_LENGTH = 8;
const NANOSECONDS_TO_MILLISECONDS = 1000000;
const BYTES_PER_KB = 1024;

/**
 * 加密工具类
 */
class CryptoUtils {
    /**
     * 生成随机字符串
     * @param {number} length 长度
     * @returns {string} 随机字符串
     */
    static generateRandomString(length = DEFAULT_STRING_LENGTH) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * 生成哈希值
     * @param {string} data 数据
     * @param {string} algorithm 算法
     * @returns {string} 哈希值
     */
    static generateHash(data, algorithm = 'sha256') {
        return crypto.createHash(algorithm).update(data).digest('hex');
    }

    /**
     * AES加密
     * @param {string} text 明文
     * @param {string} key 密钥
     * @returns {object} 加密结果
     */
    static encrypt(text, key) {
        const algorithm = 'aes-256-gcm';
        const iv = crypto.randomBytes(AES_IV_LENGTH);
        const cipher = crypto.createCipher(algorithm, key);

        cipher.setAAD(Buffer.from('SecureFrontEnd', 'utf8'));

        let encrypted = cipher.update(text, 'utf8', 'hex');

        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    /**
     * AES解密
     * @param {object} encryptedData 加密数据
     * @param {string} key 密钥
     * @returns {string} 明文
     */
    static decrypt(encryptedData, key) {
        const algorithm = 'aes-256-gcm';
        const decipher = crypto.createDecipher(algorithm, key);

        decipher.setAAD(Buffer.from('SecureFrontEnd', 'utf8'));
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');

        decrypted += decipher.final('utf8');

        return decrypted;
    }
}

/**
 * 文件工具类
 */
class FileUtils {
    /**
     * 确保目录存在
     * @param {string} dirPath 目录路径
     */
    static ensureDir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * 读取JSON文件
     * @param {string} filePath 文件路径
     * @returns {object} JSON对象
     */
    static readJsonFile(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');

            return JSON.parse(data);
        } catch (error) {
            console.error(`读取JSON文件失败: ${filePath}`, error);

            return null;
        }
    }

    /**
     * 写入JSON文件
     * @param {string} filePath 文件路径
     * @param {object} data 数据
     */
    static writeJsonFile(filePath, data) {
        try {
            this.ensureDir(path.dirname(filePath));
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            console.error(`写入JSON文件失败: ${filePath}`, error);
        }
    }

    /**
     * 获取文件大小
     * @param {string} filePath 文件路径
     * @returns {number} 文件大小（字节）
     */
    static getFileSize(filePath) {
        try {
            const stats = fs.statSync(filePath);

            return stats.size;
        } catch (error) {
            console.error(`获取文件大小失败: ${filePath}`, error);

            return 0;
        }
    }

    /**
     * 删除文件
     * @param {string} filePath 文件路径
     */
    static deleteFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error(`删除文件失败: ${filePath}`, error);
        }
    }
}

/**
 * 时间工具类
 */
class TimeUtils {
    /**
     * 格式化时间戳
     * @param {number} timestamp 时间戳
     * @returns {string} 格式化的时间字符串
     */
    static formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    /**
     * 获取相对时间描述
     * @param {number} timestamp 时间戳
     * @returns {string} 相对时间描述
     */
    static getRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
        const hours = Math.floor(minutes / MINUTES_PER_HOUR);
        const days = Math.floor(hours / HOURS_PER_DAY);

        if (days > 0) return `${days}天前`;
        if (hours > 0) return `${hours}小时前`;
        if (minutes > 0) return `${minutes}分钟前`;

        return `${seconds}秒前`;
    }

    /**
     * 获取当前时间戳
     * @returns {number} 时间戳
     */
    static now() {
        return Date.now();
    }

    /**
     * 计算时间差
     * @param {number} startTime 开始时间
     * @param {number} endTime 结束时间
     * @returns {number} 时间差（毫秒）
     */
    static timeDiff(startTime, endTime = Date.now()) {
        return endTime - startTime;
    }

    /**
     * 格式化持续时间
     * @param {number} duration 持续时间（毫秒）
     * @returns {string} 格式化后的持续时间
     */
    static formatDuration(duration) {
        const seconds = Math.floor(duration / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}小时${minutes % 60}分钟${seconds % 60}秒`;
        } if (minutes > 0) {
            return `${minutes}分钟${seconds % 60}秒`;
        }

        return `${seconds}秒`;
    }
}

/**
 * 验证工具类
 */
class ValidationUtils {
    /**
     * 验证邮箱格式
     * @param {string} email 邮箱
     * @returns {boolean} 是否有效
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        return emailRegex.test(email);
    }

    /**
     * 验证密码强度
     * @param {string} password 密码
     * @returns {Object} 验证结果
     */
    static validatePassword(password) {
        const result = {
            isValid: false,
            strength: 'weak',
            issues: []
        };

        if (!password || typeof password !== 'string') {
            result.issues.push('密码不能为空');

            return result;
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            result.issues.push(`密码长度至少${MIN_PASSWORD_LENGTH}位`);
        } else {
            result.score += 1;
        }

        if (!/[a-z]/.test(password)) {
            result.isValid = false;
            result.issues.push('密码必须包含小写字母');
        } else {
            result.score += 1;
        }

        if (!/[A-Z]/.test(password)) {
            result.isValid = false;
            result.issues.push('密码必须包含大写字母');
        } else {
            result.score += 1;
        }

        if (!/\d/.test(password)) {
            result.isValid = false;
            result.issues.push('密码必须包含数字');
        } else {
            result.score += 1;
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            result.issues.push('建议包含特殊字符');
        } else {
            result.score += 1;
        }

        return result;
    }

    /**
     * 验证IP地址
     * @param {string} ip IP地址
     * @returns {boolean} 是否有效
     */
    static isValidIP(ip) {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

        return ipRegex.test(ip);
    }

    /**
     * 验证URL格式
     * @param {string} url URL字符串
     * @returns {boolean} 是否有效
     */
    static isValidUrl(url) {
        try {
            new URL(url);

            return true;
        } catch {
            return false;
        }
    }
}

/**
 * 性能工具类
 */
class PerformanceUtils {
    /**
     * 测量函数执行时间
     * @param {Function} fn 函数
     * @param {...any} args 参数
     * @returns {object} 执行结果和时间
     */
    static async measureTime(fn, ...args) {
        const startTime = process.hrtime.bigint();
        let result;
        let error;

        try {
            result = await fn(...args);
        } catch (err) {
            error = err;
        }

        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / NANOSECONDS_TO_MILLISECONDS; // 转换为毫秒

        return {
            result,
            error,
            duration,
            success: !error
        };
    }

    /**
     * 获取内存使用情况
     * @returns {Object} 内存使用统计
     */
    static getMemoryUsage() {
        const usage = process.memoryUsage();

        return {
            rss: Math.round(usage.rss / BYTES_PER_KB / BYTES_PER_KB), // MB
            heapTotal: Math.round(usage.heapTotal / BYTES_PER_KB / BYTES_PER_KB), // MB
            heapUsed: Math.round(usage.heapUsed / BYTES_PER_KB / BYTES_PER_KB), // MB
            external: Math.round(usage.external / BYTES_PER_KB / BYTES_PER_KB), // MB
            arrayBuffers: Math.round(usage.arrayBuffers / BYTES_PER_KB / BYTES_PER_KB) // MB
        };
    }

    /**
     * CPU使用情况
     * @returns {object} CPU使用情况
     */
    static getCPUUsage() {
        const usage = process.cpuUsage();

        return {
            user: usage.user / 1000, // 毫秒
            system: usage.system / 1000 // 毫秒
        };
    }
}

module.exports = {
    CryptoUtils,
    FileUtils,
    TimeUtils,
    ValidationUtils,
    PerformanceUtils
};
