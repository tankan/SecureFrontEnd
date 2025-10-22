/**
 * 数据保护增强系统
 * 包含敏感数据加密、数据脱敏、备份加密等功能
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * 敏感数据加密管理器
 */
class SensitiveDataEncryption {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyDerivationAlgorithm = 'pbkdf2';
        this.keyLength = 32;
        this.ivLength = 16;
        this.saltLength = 32;
        this.tagLength = 16;
        this.iterations = 100000;
        this.masterKeys = new Map();
        this.encryptedFields = new Set([
            'password', 'ssn', 'creditCard', 'bankAccount',
            'email', 'phone', 'address', 'personalId'
        ]);
    }

    /**
     * 生成主密钥
     */
    generateMasterKey(keyId, passphrase) {
        const salt = crypto.randomBytes(this.saltLength);
        const key = crypto.pbkdf2Sync(passphrase, salt, this.iterations, this.keyLength, 'sha256');

        this.masterKeys.set(keyId, {
            key,
            salt,
            createdAt: Date.now(),
            algorithm: this.algorithm
        });

        return keyId;
    }

    /**
     * 加密敏感数据
     */
    encryptSensitiveData(data, keyId) {
        const masterKey = this.masterKeys.get(keyId);

        if (!masterKey) {
            throw new Error(`主密钥 ${keyId} 不存在`);
        }

        const result = {};

        for (const [field, value] of Object.entries(data)) {
            if (this.encryptedFields.has(field) && value) {
                result[field] = this.encryptField(value, masterKey.key);
                result[`${field}_encrypted`] = true;
            } else {
                result[field] = value;
            }
        }

        return result;
    }

    /**
     * 解密敏感数据
     */
    decryptSensitiveData(encryptedData, keyId) {
        const masterKey = this.masterKeys.get(keyId);

        if (!masterKey) {
            throw new Error(`主密钥 ${keyId} 不存在`);
        }

        const result = {};

        for (const [field, value] of Object.entries(encryptedData)) {
            if (field.endsWith('_encrypted')) {
                continue; // 跳过加密标记字段
            }

            if (encryptedData[`${field}_encrypted`] && value) {
                result[field] = this.decryptField(value, masterKey.key);
            } else {
                result[field] = value;
            }
        }

        return result;
    }

    /**
     * 加密单个字段
     */
    encryptField(plaintext, key) {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');

        encrypted += cipher.final('hex');

        const tag = cipher.getAuthTag();

        return {
            encrypted,
            iv: iv.toString('hex'),
            tag: tag.toString('hex'),
            algorithm: this.algorithm
        };
    }

    /**
     * 解密单个字段
     */
    decryptField(encryptedField, key) {
        const { encrypted, iv, tag, algorithm } = encryptedField;

        const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));

        decipher.setAuthTag(Buffer.from(tag, 'hex'));

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');

        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * 轮换加密密钥
     */
    rotateKey(oldKeyId, newKeyId, newPassphrase) {
        const oldKey = this.masterKeys.get(oldKeyId);

        if (!oldKey) {
            throw new Error(`旧密钥 ${oldKeyId} 不存在`);
        }

        // 生成新密钥
        this.generateMasterKey(newKeyId, newPassphrase);

        return {
            oldKeyId,
            newKeyId,
            rotatedAt: Date.now(),
            status: 'success'
        };
    }

    /**
     * 获取加密统计
     */
    getEncryptionStats() {
        return {
            totalKeys: this.masterKeys.size,
            encryptedFields: Array.from(this.encryptedFields),
            algorithm: this.algorithm,
            keyDerivationAlgorithm: this.keyDerivationAlgorithm,
            iterations: this.iterations
        };
    }
}

/**
 * 数据脱敏管理器
 */
class DataMaskingManager {
    constructor() {
        this.maskingRules = new Map();
        this.initializeDefaultRules();
    }

    /**
     * 初始化默认脱敏规则
     */
    initializeDefaultRules() {
        // 邮箱脱敏
        this.maskingRules.set('email', {
            pattern: /^(.{1,3}).*@(.*)$/,
            replacement: (match, prefix, domain) => `${prefix}***@${domain}`,
            description: '邮箱地址脱敏'
        });

        // 手机号脱敏
        this.maskingRules.set('phone', {
            pattern: /^(\d{3})\d{4}(\d{4})$/,
            replacement: '$1****$2',
            description: '手机号码脱敏'
        });

        // 身份证号脱敏
        this.maskingRules.set('idCard', {
            pattern: /^(\d{6})\d{8}(\d{4})$/,
            replacement: '$1********$2',
            description: '身份证号脱敏'
        });

        // 银行卡号脱敏
        this.maskingRules.set('bankCard', {
            pattern: /^(\d{4})\d+(\d{4})$/,
            replacement: '$1****$2',
            description: '银行卡号脱敏'
        });

        // 姓名脱敏
        this.maskingRules.set('name', {
            pattern: /^(.)(.*)$/,
            replacement: (match, first, rest) => first + '*'.repeat(rest.length),
            description: '姓名脱敏'
        });

        // 地址脱敏
        this.maskingRules.set('address', {
            pattern: /^(.{6})(.*)$/,
            replacement: (match, prefix, suffix) => prefix + '*'.repeat(Math.min(suffix.length, 10)),
            description: '地址脱敏'
        });
    }

    /**
     * 添加自定义脱敏规则
     */
    addMaskingRule(fieldType, pattern, replacement, description) {
        this.maskingRules.set(fieldType, {
            pattern,
            replacement,
            description
        });
    }

    /**
     * 脱敏单个字段
     */
    maskField(value, fieldType) {
        if (!value) return value;

        // 确保值是字符串类型
        const stringValue = String(value);

        const rule = this.maskingRules.get(fieldType);

        if (!rule) return stringValue;

        if (typeof rule.replacement === 'function') {
            return stringValue.replace(rule.pattern, rule.replacement);
        }

        return stringValue.replace(rule.pattern, rule.replacement);
    }

    /**
     * 脱敏数据对象
     */
    maskData(data, fieldMappings = {}) {
        const maskedData = { ...data };

        for (const [field, value] of Object.entries(data)) {
            const fieldType = fieldMappings[field] || field;

            if (this.maskingRules.has(fieldType)) {
                maskedData[field] = this.maskField(value, fieldType);
                maskedData[`${field}_masked`] = true;
            }
        }

        return maskedData;
    }

    /**
     * 批量脱敏
     */
    maskBatch(dataArray, fieldMappings = {}) {
        return dataArray.map(data => this.maskData(data, fieldMappings));
    }

    /**
     * 生成脱敏报告
     */
    generateMaskingReport(originalData, maskedData) {
        const report = {
            timestamp: new Date().toISOString(),
            originalFields: Object.keys(originalData).length,
            maskedFields: 0,
            fieldDetails: []
        };

        for (const [field, value] of Object.entries(maskedData)) {
            if (field.endsWith('_masked')) {
                report.maskedFields++;
                const originalField = field.replace('_masked', '');

                report.fieldDetails.push({
                    field: originalField,
                    originalLength: originalData[originalField]?.length || 0,
                    maskedLength: maskedData[originalField]?.length || 0,
                    maskingRule: this.getMaskingRuleForField(originalField)
                });
            }
        }

        return report;
    }

    /**
     * 获取字段的脱敏规则
     */
    getMaskingRuleForField(field) {
        const rule = this.maskingRules.get(field);

        return rule ? rule.description : '未知规则';
    }
}

/**
 * 备份加密管理器
 */
class BackupEncryptionManager {
    constructor() {
        this.algorithm = 'aes-256-cbc';
        this.keyLength = 32;
        this.ivLength = 16;
        this.backupKeys = new Map();
        this.backupHistory = [];
    }

    /**
     * 生成备份密钥
     */
    generateBackupKey(backupId, passphrase) {
        const salt = crypto.randomBytes(32);
        const key = crypto.pbkdf2Sync(passphrase, salt, 100000, this.keyLength, 'sha256');

        this.backupKeys.set(backupId, {
            key,
            salt,
            createdAt: Date.now(),
            algorithm: this.algorithm
        });

        return backupId;
    }

    /**
     * 加密备份文件
     */
    encryptBackup(data, backupId, metadata = {}) {
        const backupKey = this.backupKeys.get(backupId);

        if (!backupKey) {
            throw new Error(`备份密钥 ${backupId} 不存在`);
        }

        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, backupKey.key, iv);

        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        let encrypted = cipher.update(dataString, 'utf8', 'hex');

        encrypted += cipher.final('hex');

        const encryptedBackup = {
            id: crypto.randomUUID(),
            backupId,
            encrypted,
            iv: iv.toString('hex'),
            algorithm: this.algorithm,
            metadata: {
                ...metadata,
                originalSize: dataString.length,
                encryptedAt: Date.now(),
                checksum: crypto.createHash('sha256').update(dataString).digest('hex')
            }
        };

        this.backupHistory.push({
            id: encryptedBackup.id,
            backupId,
            timestamp: Date.now(),
            size: encrypted.length,
            status: 'encrypted'
        });

        return encryptedBackup;
    }

    /**
     * 解密备份文件
     */
    decryptBackup(encryptedBackup) {
        const { backupId, encrypted, iv, algorithm, metadata } = encryptedBackup;

        const backupKey = this.backupKeys.get(backupId);

        if (!backupKey) {
            throw new Error(`备份密钥 ${backupId} 不存在`);
        }

        const decipher = crypto.createDecipheriv(algorithm, backupKey.key, Buffer.from(iv, 'hex'));

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');

        decrypted += decipher.final('utf8');

        // 验证校验和
        const checksum = crypto.createHash('sha256').update(decrypted).digest('hex');

        if (checksum !== metadata.checksum) {
            throw new Error('备份文件校验和验证失败');
        }

        return {
            data: decrypted,
            metadata,
            decryptedAt: Date.now()
        };
    }

    /**
     * 创建增量备份
     */
    createIncrementalBackup(currentData, previousBackupId, newBackupId, passphrase) {
        const previousData = {};

        if (previousBackupId && this.backupHistory.find(b => b.backupId === previousBackupId)) {
            // 在实际应用中，这里应该从存储中加载之前的备份
            console.log(`基于之前的备份 ${previousBackupId} 创建增量备份`);
        }

        // 计算差异（简化版）
        const changes = this.calculateDataDifferences(previousData, currentData);

        this.generateBackupKey(newBackupId, passphrase);

        return this.encryptBackup(changes, newBackupId, {
            type: 'incremental',
            previousBackupId,
            changesCount: Object.keys(changes).length
        });
    }

    /**
     * 计算数据差异
     */
    calculateDataDifferences(oldData, newData) {
        const changes = {};

        // 新增和修改的数据
        for (const [key, value] of Object.entries(newData)) {
            if (!oldData.hasOwnProperty(key) || oldData[key] !== value) {
                changes[key] = {
                    action: oldData.hasOwnProperty(key) ? 'modified' : 'added',
                    value,
                    oldValue: oldData[key] || null
                };
            }
        }

        // 删除的数据
        for (const key of Object.keys(oldData)) {
            if (!newData.hasOwnProperty(key)) {
                changes[key] = {
                    action: 'deleted',
                    oldValue: oldData[key]
                };
            }
        }

        return changes;
    }

    /**
     * 获取备份统计
     */
    getBackupStats() {
        const stats = {
            totalBackups: this.backupHistory.length,
            totalKeys: this.backupKeys.size,
            backupsByType: {},
            totalSize: 0,
            oldestBackup: null,
            newestBackup: null
        };

        for (const backup of this.backupHistory) {
            stats.totalSize += backup.size;

            if (!stats.oldestBackup || backup.timestamp < stats.oldestBackup.timestamp) {
                stats.oldestBackup = backup;
            }

            if (!stats.newestBackup || backup.timestamp > stats.newestBackup.timestamp) {
                stats.newestBackup = backup;
            }
        }

        return stats;
    }

    /**
     * 清理过期备份
     */
    cleanupExpiredBackups(retentionDays = 30) {
        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        const expiredBackups = this.backupHistory.filter(backup => backup.timestamp < cutoffTime);

        for (const backup of expiredBackups) {
            const index = this.backupHistory.indexOf(backup);

            if (index > -1) {
                this.backupHistory.splice(index, 1);
            }
        }

        return {
            cleanedCount: expiredBackups.length,
            remainingCount: this.backupHistory.length
        };
    }
}

/**
 * 数据保护系统主类
 */
class DataProtectionSystem {
    constructor() {
        this.sensitiveDataEncryption = new SensitiveDataEncryption();
        this.dataMaskingManager = new DataMaskingManager();
        this.backupEncryptionManager = new BackupEncryptionManager();
        this.auditLog = [];
        this.complianceRules = new Map();
        this.initializeComplianceRules();
    }

    /**
     * 初始化合规规则
     */
    initializeComplianceRules() {
        // GDPR 合规规则
        this.complianceRules.set('GDPR', {
            name: 'General Data Protection Regulation',
            requiredEncryption: ['personalId', 'email', 'phone', 'address'],
            requiredMasking: ['name', 'email', 'phone'],
            dataRetention: 365, // 天
            rightToErasure: true
        });

        // PCI DSS 合规规则
        this.complianceRules.set('PCI_DSS', {
            name: 'Payment Card Industry Data Security Standard',
            requiredEncryption: ['creditCard', 'bankAccount'],
            requiredMasking: ['creditCard'],
            dataRetention: 90,
            rightToErasure: false
        });

        // HIPAA 合规规则
        this.complianceRules.set('HIPAA', {
            name: 'Health Insurance Portability and Accountability Act',
            requiredEncryption: ['medicalRecord', 'ssn', 'personalId'],
            requiredMasking: ['name', 'ssn'],
            dataRetention: 2555, // 7年
            rightToErasure: false
        });
    }

    /**
     * 处理敏感数据
     */
    processSensitiveData(data, keyId, options = {}) {
        const {
            encrypt = true,
            mask = false,
            compliance = null,
            backup = false,
            backupId = null
        } = options;

        let processedData = { ...data };
        const processingLog = {
            timestamp: Date.now(),
            operations: [],
            compliance
        };

        // 应用合规规则
        if (compliance && this.complianceRules.has(compliance)) {
            const rules = this.complianceRules.get(compliance);

            processingLog.complianceRules = rules.name;
        }

        // 加密敏感数据
        if (encrypt) {
            processedData = this.sensitiveDataEncryption.encryptSensitiveData(processedData, keyId);
            processingLog.operations.push('encryption');
        }

        // 数据脱敏
        if (mask) {
            const fieldMappings = this.getFieldMappingsForCompliance(compliance);

            processedData = this.dataMaskingManager.maskData(processedData, fieldMappings);
            processingLog.operations.push('masking');
        }

        // 创建备份
        if (backup && backupId) {
            // 确保备份密钥存在
            if (!this.backupEncryptionManager.backupKeys.has(backupId)) {
                this.backupEncryptionManager.generateBackupKey(backupId, 'default-passphrase');
            }

            const backupResult = this.backupEncryptionManager.encryptBackup(
                processedData,
                backupId,
                { compliance, operations: processingLog.operations }
            );

            processingLog.operations.push('backup');
            processingLog.backupId = backupResult.id;
        }

        this.auditLog.push(processingLog);

        return {
            data: processedData,
            processingLog
        };
    }

    /**
     * 获取合规字段映射
     */
    getFieldMappingsForCompliance(compliance) {
        if (!compliance || !this.complianceRules.has(compliance)) {
            return {};
        }

        const rules = this.complianceRules.get(compliance);
        const mappings = {};

        // 根据合规要求映射字段类型
        for (const field of rules.requiredMasking) {
            mappings[field] = field;
        }

        return mappings;
    }

    /**
     * 数据恢复
     */
    recoverData(encryptedData, keyId, backupId = null) {
        let recoveredData = encryptedData;

        // 从备份恢复
        if (backupId) {
            const backup = this.backupEncryptionManager.backupHistory.find(b => b.id === backupId);

            if (backup) {
                console.log(`从备份 ${backupId} 恢复数据`);
                // 在实际应用中，这里应该从存储中加载备份数据
            }
        }

        // 解密数据
        if (keyId) {
            recoveredData = this.sensitiveDataEncryption.decryptSensitiveData(recoveredData, keyId);
        }

        this.auditLog.push({
            timestamp: Date.now(),
            operation: 'data_recovery',
            keyId,
            backupId
        });

        return recoveredData;
    }

    /**
     * 合规性检查
     */
    checkCompliance(data, complianceType) {
        const rules = this.complianceRules.get(complianceType);

        if (!rules) {
            return { compliant: false, reason: '未知的合规类型' };
        }

        const issues = [];

        // 检查必需加密的字段
        for (const field of rules.requiredEncryption) {
            if (data[field] && !data[`${field}_encrypted`]) {
                issues.push(`字段 ${field} 需要加密`);
            }
        }

        // 检查必需脱敏的字段
        for (const field of rules.requiredMasking) {
            if (data[field] && !data[`${field}_masked`]) {
                issues.push(`字段 ${field} 需要脱敏`);
            }
        }

        return {
            compliant: issues.length === 0,
            issues,
            complianceType: rules.name
        };
    }

    /**
     * 生成数据保护报告
     */
    generateProtectionReport() {
        const encryptionStats = this.sensitiveDataEncryption.getEncryptionStats();
        const backupStats = this.backupEncryptionManager.getBackupStats();

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalAuditEvents: this.auditLog.length,
                encryptionKeys: encryptionStats.totalKeys,
                totalBackups: backupStats.totalBackups,
                complianceRules: this.complianceRules.size,
                maskingRules: this.dataMaskingManager.maskingRules.size
            },
            encryption: encryptionStats,
            backup: backupStats,
            masking: {
                availableRules: Array.from(this.dataMaskingManager.maskingRules.keys()),
                ruleDescriptions: Array.from(this.dataMaskingManager.maskingRules.entries())
                    .map(([type, rule]) => ({ type, description: rule.description }))
            },
            compliance: {
                supportedStandards: Array.from(this.complianceRules.keys()),
                ruleDetails: Array.from(this.complianceRules.entries())
                    .map(([type, rule]) => ({
                        type,
                        name: rule.name,
                        requiredEncryption: rule.requiredEncryption,
                        requiredMasking: rule.requiredMasking,
                        dataRetention: rule.dataRetention
                    }))
            },
            recentAuditEvents: this.auditLog.slice(-10),
            securityScore: this.calculateDataProtectionScore(),
            recommendations: this.generateDataProtectionRecommendations()
        };

        return report;
    }

    /**
     * 计算数据保护评分
     */
    calculateDataProtectionScore() {
        let score = 0;
        const maxScore = 100;

        // 加密配置 (30分)
        if (this.sensitiveDataEncryption.masterKeys.size > 0) {
            score += 30;
        }

        // 脱敏规则 (25分)
        if (this.dataMaskingManager.maskingRules.size >= 5) {
            score += 25;
        }

        // 备份加密 (25分)
        if (this.backupEncryptionManager.backupKeys.size > 0) {
            score += 25;
        }

        // 合规性支持 (20分)
        if (this.complianceRules.size >= 3) {
            score += 20;
        }

        return Math.min(score, maxScore);
    }

    /**
     * 生成数据保护建议
     */
    generateDataProtectionRecommendations() {
        const recommendations = [];

        if (this.sensitiveDataEncryption.masterKeys.size === 0) {
            recommendations.push({
                priority: 'high',
                category: 'Encryption',
                message: '建议配置主加密密钥以保护敏感数据'
            });
        }

        if (this.backupEncryptionManager.backupKeys.size === 0) {
            recommendations.push({
                priority: 'high',
                category: 'Backup',
                message: '建议启用备份加密以保护数据备份'
            });
        }

        if (this.auditLog.length === 0) {
            recommendations.push({
                priority: 'medium',
                category: 'Audit',
                message: '建议启用审计日志以跟踪数据处理活动'
            });
        }

        return recommendations;
    }
}

module.exports = {
    DataProtectionSystem,
    SensitiveDataEncryption,
    DataMaskingManager,
    BackupEncryptionManager
};
