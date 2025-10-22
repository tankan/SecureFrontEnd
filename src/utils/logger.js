/**
 * 专业的日志记录工具
 * 提供结构化日志记录、日志级别管理、文件输出等功能
 */

import fs from 'fs';
import path from 'path';

/**
 * 日志级别枚举
 */
const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4
};

/**
 * 日志级别名称映射
 */
const LogLevelNames = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.FATAL]: 'FATAL'
};

/**
 * 日志级别颜色映射（用于控制台输出）
 */
const LogLevelColors = {
    [LogLevel.DEBUG]: '\x1b[36m', // 青色
    [LogLevel.INFO]: '\x1b[32m',  // 绿色
    [LogLevel.WARN]: '\x1b[33m',  // 黄色
    [LogLevel.ERROR]: '\x1b[31m', // 红色
    [LogLevel.FATAL]: '\x1b[35m'  // 紫色
};

/**
 * 专业日志记录器类
 */
class Logger {
    /**
     * 构造函数
     * @param {Object} options - 日志配置选项
     * @param {string} options.name - 日志器名称
     * @param {number} options.level - 最小日志级别
     * @param {boolean} options.enableConsole - 是否启用控制台输出
     * @param {boolean} options.enableFile - 是否启用文件输出
     * @param {string} options.logDir - 日志文件目录
     * @param {number} options.maxFileSize - 最大文件大小（字节）
     * @param {number} options.maxFiles - 最大文件数量
     */
    constructor(options = {}) {
        this.name = options.name || 'SecureFrontEnd';
        this.level = options.level !== undefined ? options.level : LogLevel.INFO;
        this.enableConsole = options.enableConsole !== false;
        this.enableFile = options.enableFile !== false;
        this.logDir = options.logDir || path.join(process.cwd(), 'logs');
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.maxFiles = options.maxFiles || 5;
        
        // 确保日志目录存在
        if (this.enableFile) {
            this._ensureLogDir();
        }
        
        // 当前日志文件路径
        this.currentLogFile = null;
        this._updateLogFile();
    }

    /**
     * 确保日志目录存在
     * @private
     */
    _ensureLogDir() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }

    /**
     * 更新当前日志文件
     * @private
     */
    _updateLogFile() {
        if (!this.enableFile) return;
        
        const date = new Date().toISOString().split('T')[0];
        this.currentLogFile = path.join(this.logDir, `${this.name}-${date}.log`);
        
        // 检查文件大小，如果超过限制则轮转
        this._rotateLogIfNeeded();
    }

    /**
     * 日志文件轮转
     * @private
     */
    _rotateLogIfNeeded() {
        try {
            if (fs.existsSync(this.currentLogFile)) {
                const stats = fs.statSync(this.currentLogFile);
                if (stats.size > this.maxFileSize) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const rotatedFile = this.currentLogFile.replace('.log', `-${timestamp}.log`);
                    fs.renameSync(this.currentLogFile, rotatedFile);
                    
                    // 清理旧文件
                    this._cleanupOldLogs();
                }
            }
        } catch (error) {
            console.error('Failed to rotate log file:', error);
        }
    }

    /**
     * 清理旧日志文件
     * @private
     */
    _cleanupOldLogs() {
        try {
            const files = fs.readdirSync(this.logDir)
                .filter(file => file.startsWith(this.name) && file.endsWith('.log'))
                .map(file => ({
                    name: file,
                    path: path.join(this.logDir, file),
                    mtime: fs.statSync(path.join(this.logDir, file)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);

            // 保留最新的文件，删除多余的
            if (files.length > this.maxFiles) {
                const filesToDelete = files.slice(this.maxFiles);
                filesToDelete.forEach(file => {
                    fs.unlinkSync(file.path);
                });
            }
        } catch (error) {
            console.error('Failed to cleanup old logs:', error);
        }
    }

    /**
     * 格式化日志消息
     * @param {number} level - 日志级别
     * @param {string} message - 日志消息
     * @param {Object} meta - 元数据
     * @returns {string} 格式化后的日志消息
     * @private
     */
    _formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const levelName = LogLevelNames[level];
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        
        return `[${timestamp}] [${levelName}] [${this.name}] ${message}${metaStr}`;
    }

    /**
     * 输出日志到控制台
     * @param {number} level - 日志级别
     * @param {string} formattedMessage - 格式化后的消息
     * @private
     */
    _writeToConsole(level, formattedMessage) {
        if (!this.enableConsole) return;
        
        const color = LogLevelColors[level];
        const resetColor = '\x1b[0m';
        
        if (level >= LogLevel.ERROR) {
            console.error(`${color}${formattedMessage}${resetColor}`);
        } else {
            console.log(`${color}${formattedMessage}${resetColor}`);
        }
    }

    /**
     * 输出日志到文件
     * @param {string} formattedMessage - 格式化后的消息
     * @private
     */
    _writeToFile(formattedMessage) {
        if (!this.enableFile || !this.currentLogFile) return;
        
        try {
            fs.appendFileSync(this.currentLogFile, formattedMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    /**
     * 记录日志
     * @param {number} level - 日志级别
     * @param {string} message - 日志消息
     * @param {Object} meta - 元数据
     */
    log(level, message, meta = {}) {
        if (level < this.level) return;
        
        const formattedMessage = this._formatMessage(level, message, meta);
        
        this._writeToConsole(level, formattedMessage);
        this._writeToFile(formattedMessage);
    }

    /**
     * 记录调试日志
     * @param {string} message - 日志消息
     * @param {Object} meta - 元数据
     */
    debug(message, meta = {}) {
        this.log(LogLevel.DEBUG, message, meta);
    }

    /**
     * 记录信息日志
     * @param {string} message - 日志消息
     * @param {Object} meta - 元数据
     */
    info(message, meta = {}) {
        this.log(LogLevel.INFO, message, meta);
    }

    /**
     * 记录警告日志
     * @param {string} message - 日志消息
     * @param {Object} meta - 元数据
     */
    warn(message, meta = {}) {
        this.log(LogLevel.WARN, message, meta);
    }

    /**
     * 记录错误日志
     * @param {string} message - 日志消息
     * @param {Object} meta - 元数据
     */
    error(message, meta = {}) {
        this.log(LogLevel.ERROR, message, meta);
    }

    /**
     * 记录致命错误日志
     * @param {string} message - 日志消息
     * @param {Object} meta - 元数据
     */
    fatal(message, meta = {}) {
        this.log(LogLevel.FATAL, message, meta);
    }

    /**
     * 创建子日志器
     * @param {string} name - 子日志器名称
     * @returns {Logger} 子日志器实例
     */
    child(name) {
        return new Logger({
            name: `${this.name}:${name}`,
            level: this.level,
            enableConsole: this.enableConsole,
            enableFile: this.enableFile,
            logDir: this.logDir,
            maxFileSize: this.maxFileSize,
            maxFiles: this.maxFiles
        });
    }

    /**
     * 设置日志级别
     * @param {number} level - 新的日志级别
     */
    setLevel(level) {
        this.level = level;
    }

    /**
     * 获取当前日志级别
     * @returns {number} 当前日志级别
     */
    getLevel() {
        return this.level;
    }

    /**
     * 刷新日志缓冲区（同步写入）
     */
    flush() {
        // 对于同步写入，这里不需要特殊处理
        // 如果将来改为异步写入，可以在这里实现缓冲区刷新
    }
}

// 创建默认日志器实例
const defaultLogger = new Logger({
    name: 'SecureFrontEnd',
    level: LogLevel.INFO
});

// 导出日志级别和默认日志器
export {
    Logger,
    LogLevel,
    LogLevelNames,
    defaultLogger as logger
};