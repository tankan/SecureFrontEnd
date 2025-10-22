/**
 * 核心模块统一导出
 * 提供系统核心功能的统一入口
 */

const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

/**
 * 系统配置管理器
 */
class ConfigManager {
    constructor() {
        this.config = {};
        this.loadConfig();
    }

    loadConfig() {
        try {
            const configPath = path.join(__dirname, '../../config');

            // 加载环境配置
            this.loadEnvironmentConfig(configPath);
            // 加载安全配置
            this.loadSecurityConfig(configPath);
            // 加载数据库配置
            this.loadDatabaseConfig(configPath);
        } catch (error) {
            console.warn('配置加载失败，使用默认配置:', error.message);
            this.setDefaultConfig();
        }
    }

    loadEnvironmentConfig(configPath) {
        const envPath = path.join(configPath, 'environments');

        this.config.environment = {
            NODE_ENV: process.env.NODE_ENV || 'development',
            PORT: process.env.PORT || 3000,
            LOG_LEVEL: process.env.LOG_LEVEL || 'info'
        };
    }

    loadSecurityConfig(configPath) {
        this.config.security = {
            encryption: {
                algorithm: 'aes-256-gcm',
                keyLength: 32,
                ivLength: 16
            },
            jwt: {
                secret: process.env.JWT_SECRET || 'default-secret',
                expiresIn: '24h'
            },
            rateLimit: {
                windowMs: 15 * 60 * 1000, // 15分钟
                max: 100 // 限制每个IP 100次请求
            }
        };
    }

    loadDatabaseConfig(configPath) {
        this.config.database = {
            type: process.env.DB_TYPE || 'sqlite',
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'security_system',
            username: process.env.DB_USER || 'admin',
            password: process.env.DB_PASS || 'password'
        };
    }

    setDefaultConfig() {
        this.config = {
            environment: {
                NODE_ENV: 'development',
                PORT: 3000,
                LOG_LEVEL: 'info'
            },
            security: {
                encryption: {
                    algorithm: 'aes-256-gcm',
                    keyLength: 32,
                    ivLength: 16
                },
                jwt: {
                    secret: 'default-secret',
                    expiresIn: '24h'
                },
                rateLimit: {
                    windowMs: 15 * 60 * 1000,
                    max: 100
                }
            },
            database: {
                type: 'sqlite',
                host: 'localhost',
                port: 5432,
                database: 'security_system',
                username: 'admin',
                password: 'password'
            }
        };
    }

    get(key) {
        return key.split('.').reduce((obj, k) => obj && obj[k], this.config);
    }

    set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, k) => {
            if (!obj[k]) obj[k] = {};

            return obj[k];
        }, this.config);

        target[lastKey] = value;
    }
}

/**
 * 日志管理器
 */
class LogManager {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logLevels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }

    /**
     * 记录日志
     * @param {string} level - 日志级别
     * @param {string} message - 日志消息
     * @param {...any} args - 额外参数
     */
    log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const meta = args.length > 0 ? { args } : {};
        
        switch (level.toLowerCase()) {
            case 'debug':
                logger.debug(message, meta);
                break;
            case 'info':
                logger.info(message, meta);
                break;
            case 'warn':
                logger.warn(message, meta);
                break;
            case 'error':
                logger.error(message, meta);
                break;
            default:
                logger.info(message, meta);
        }
    }

    error(message, ...args) {
        this.log('error', message, ...args);
    }

    warn(message, ...args) {
        this.log('warn', message, ...args);
    }

    info(message, ...args) {
        this.log('info', message, ...args);
    }

    debug(message, ...args) {
        this.log('debug', message, ...args);
    }
}

/**
 * 事件管理器
 */
class EventManager {
    constructor() {
        this.events = {};
    }

    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    off(event, listener) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(l => l !== listener);
    }

    emit(event, ...args) {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => {
            try {
                listener(...args);
            } catch (error) {
                console.error(`事件处理器错误 [${event}]:`, error);
            }
        });
    }

    once(event, listener) {
        const onceListener = (...args) => {
            listener(...args);
            this.off(event, onceListener);
        };

        this.on(event, onceListener);
    }
}

// 创建全局实例
const configManager = new ConfigManager();
const logManager = new LogManager();
const eventManager = new EventManager();

module.exports = {
    ConfigManager,
    LogManager,
    EventManager,
    configManager,
    logManager,
    eventManager
};
