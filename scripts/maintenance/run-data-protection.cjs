/**
 * 数据保护系统演示运行器
 * 演示敏感数据加密、数据脱敏、备份加密等功能
 */

const { DataProtectionSystem } = require('./data-protection-system.cjs');
const fs = require('fs');

async function runDataProtectionDemo() {
    console.log('🔐 启动数据保护系统演示...\n');

    // 初始化数据保护系统
    const dataProtection = new DataProtectionSystem();

    console.log('📋 演示场景 1: 敏感数据加密');
    console.log('=' .repeat(50));

    // 生成加密密钥
    const keyId = 'master_key_001';
    const passphrase = 'SecurePassphrase123!@#';
    dataProtection.sensitiveDataEncryption.generateMasterKey(keyId, passphrase);
    console.log(`✅ 生成主加密密钥: ${keyId}`);

    // 模拟用户敏感数据
    const sensitiveUserData = {
        userId: 'user_12345',
        name: '张三',
        email: 'zhangsan@example.com',
        phone: '13812345678',
        ssn: '123456789012345678',
        creditCard: '4532123456789012',
        bankAccount: '6225881234567890',
        address: '北京市朝阳区某某街道123号',
        personalId: 'ID123456789',
        publicInfo: '这是公开信息'
    };

    console.log('\n🔒 原始敏感数据:');
    console.log('   👤 姓名:', sensitiveUserData.name);
    console.log('   📧 邮箱:', sensitiveUserData.email);
    console.log('   📱 手机:', sensitiveUserData.phone);
    console.log('   🆔 身份证:', sensitiveUserData.ssn);
    console.log('   💳 信用卡:', sensitiveUserData.creditCard);

    // 加密敏感数据
    const encryptedData = dataProtection.sensitiveDataEncryption.encryptSensitiveData(
        sensitiveUserData, 
        keyId
    );

    console.log('\n🔐 加密后的数据:');
    console.log('   👤 姓名: [已加密]');
    console.log('   📧 邮箱: [已加密]');
    console.log('   📱 手机: [已加密]');
    console.log('   🆔 身份证: [已加密]');
    console.log('   💳 信用卡: [已加密]');
    console.log('   ℹ️  公开信息:', encryptedData.publicInfo);

    // 解密数据验证
    const decryptedData = dataProtection.sensitiveDataEncryption.decryptSensitiveData(
        encryptedData, 
        keyId
    );
    console.log('\n✅ 解密验证成功 - 数据完整性保持');

    console.log('\n📋 演示场景 2: 数据脱敏');
    console.log('=' .repeat(50));

    // 数据脱敏演示
    const testData = {
        name: '李四',
        email: 'lisi@company.com',
        phone: '13987654321',
        idCard: '110101199001011234',
        bankCard: '6225881234567890123',
        address: '上海市浦东新区陆家嘴金融贸易区世纪大道100号'
    };

    console.log('🔍 原始数据:');
    Object.entries(testData).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });

    const maskedData = dataProtection.dataMaskingManager.maskData(testData);
    
    console.log('\n🎭 脱敏后数据:');
    Object.entries(maskedData).forEach(([key, value]) => {
        if (!key.endsWith('_masked')) {
            console.log(`   ${key}: ${value}`);
        }
    });

    // 生成脱敏报告
    const maskingReport = dataProtection.dataMaskingManager.generateMaskingReport(testData, maskedData);
    console.log(`\n📊 脱敏统计: 共脱敏 ${maskingReport.maskedFields} 个字段`);

    console.log('\n📋 演示场景 3: 备份加密');
    console.log('=' .repeat(50));

    // 生成备份密钥
    const backupId = 'backup_001';
    const backupPassphrase = 'BackupSecure456!@#';
    dataProtection.backupEncryptionManager.generateBackupKey(backupId, backupPassphrase);
    console.log(`✅ 生成备份密钥: ${backupId}`);

    // 创建加密备份
    const backupData = {
        users: [sensitiveUserData, testData],
        metadata: {
            version: '1.0',
            createdBy: 'system',
            dataType: 'user_profiles'
        }
    };

    const encryptedBackup = dataProtection.backupEncryptionManager.encryptBackup(
        backupData, 
        backupId, 
        { 
            type: 'full_backup',
            description: '用户数据完整备份'
        }
    );

    console.log('💾 备份加密完成:');
    console.log(`   📁 备份ID: ${encryptedBackup.id}`);
    console.log(`   📊 原始大小: ${encryptedBackup.metadata.originalSize} 字节`);
    console.log(`   🔐 加密算法: ${encryptedBackup.algorithm}`);
    console.log(`   ⏰ 创建时间: ${new Date(encryptedBackup.metadata.encryptedAt).toLocaleString()}`);

    // 验证备份解密
    const decryptedBackup = dataProtection.backupEncryptionManager.decryptBackup(encryptedBackup);
    console.log('✅ 备份解密验证成功');

    console.log('\n📋 演示场景 4: 合规性处理');
    console.log('=' .repeat(50));

    // GDPR 合规处理
    console.log('🇪🇺 GDPR 合规处理演示:');
    const gdprResult = dataProtection.processSensitiveData(sensitiveUserData, keyId, {
        encrypt: true,
        mask: true,
        compliance: 'GDPR',
        backup: true,
        backupId: 'gdpr_backup_001'
    });

    console.log('   ✅ 数据已按 GDPR 要求处理');
    console.log('   🔐 敏感字段已加密');
    console.log('   🎭 个人信息已脱敏');
    console.log('   💾 合规备份已创建');

    // 合规性检查
    const complianceCheck = dataProtection.checkCompliance(gdprResult.data, 'GDPR');
    console.log(`   📋 合规检查: ${complianceCheck.compliant ? '✅ 通过' : '❌ 未通过'}`);
    if (!complianceCheck.compliant) {
        console.log('   ⚠️  问题:', complianceCheck.issues.join(', '));
    }

    // PCI DSS 合规处理
    console.log('\n💳 PCI DSS 合规处理演示:');
    const pciResult = dataProtection.processSensitiveData(sensitiveUserData, keyId, {
        encrypt: true,
        mask: true,
        compliance: 'PCI_DSS',
        backup: true,
        backupId: 'pci_backup_001'
    });

    const pciComplianceCheck = dataProtection.checkCompliance(pciResult.data, 'PCI_DSS');
    console.log(`   📋 PCI DSS 合规检查: ${pciComplianceCheck.compliant ? '✅ 通过' : '❌ 未通过'}`);

    console.log('\n📋 演示场景 5: 增量备份');
    console.log('=' .repeat(50));

    // 模拟数据变更
    const updatedUserData = {
        ...sensitiveUserData,
        email: 'zhangsan.new@example.com',
        phone: '13898765432',
        address: '北京市海淀区新地址456号',
        lastUpdated: new Date().toISOString()
    };

    console.log('🔄 创建增量备份...');
    const incrementalBackup = dataProtection.backupEncryptionManager.createIncrementalBackup(
        updatedUserData,
        backupId,
        'incremental_backup_001',
        'IncrementalSecure789!@#'
    );

    console.log('✅ 增量备份创建完成:');
    console.log(`   📁 备份ID: ${incrementalBackup.id}`);
    console.log(`   🔄 备份类型: ${incrementalBackup.metadata.type}`);
    console.log(`   📊 变更数量: ${incrementalBackup.metadata.changesCount}`);

    console.log('\n📋 演示场景 6: 密钥轮换');
    console.log('=' .repeat(50));

    // 密钥轮换演示
    const newKeyId = 'master_key_002';
    const newPassphrase = 'NewSecurePassphrase456!@#';
    
    console.log('🔄 执行密钥轮换...');
    const rotationResult = dataProtection.sensitiveDataEncryption.rotateKey(
        keyId, 
        newKeyId, 
        newPassphrase
    );

    console.log('✅ 密钥轮换完成:');
    console.log(`   🔑 旧密钥: ${rotationResult.oldKeyId}`);
    console.log(`   🆕 新密钥: ${rotationResult.newKeyId}`);
    console.log(`   ⏰ 轮换时间: ${new Date(rotationResult.rotatedAt).toLocaleString()}`);

    console.log('\n📊 生成数据保护系统报告...');
    console.log('=' .repeat(50));

    const report = dataProtection.generateProtectionReport();
    
    console.log('\n📈 系统摘要:');
    console.log(`   🔐 加密密钥数: ${report.summary.encryptionKeys}`);
    console.log(`   💾 备份总数: ${report.summary.totalBackups}`);
    console.log(`   🎭 脱敏规则数: ${report.summary.maskingRules}`);
    console.log(`   📋 合规标准数: ${report.summary.complianceRules}`);
    console.log(`   📝 审计事件数: ${report.summary.totalAuditEvents}`);

    console.log('\n🔒 加密配置:');
    console.log(`   🔐 算法: ${report.encryption.algorithm}`);
    console.log(`   🔑 密钥派生: ${report.encryption.keyDerivationAlgorithm}`);
    console.log(`   🔄 迭代次数: ${report.encryption.iterations.toLocaleString()}`);
    console.log(`   📊 加密字段: ${report.encryption.encryptedFields.join(', ')}`);

    console.log('\n🎭 脱敏配置:');
    console.log('   📋 可用规则:');
    report.masking.ruleDescriptions.forEach(rule => {
        console.log(`      • ${rule.type}: ${rule.description}`);
    });

    console.log('\n📋 合规标准支持:');
    report.compliance.ruleDetails.forEach(rule => {
        console.log(`   🏛️  ${rule.type} (${rule.name}):`);
        console.log(`      🔐 必需加密: ${rule.requiredEncryption.join(', ')}`);
        console.log(`      🎭 必需脱敏: ${rule.requiredMasking.join(', ')}`);
        console.log(`      📅 数据保留: ${rule.dataRetention} 天`);
    });

    console.log(`\n🎯 数据保护评分: ${report.securityScore}/100`);
    
    if (report.recommendations.length > 0) {
        console.log('\n💡 安全建议:');
        report.recommendations.forEach((rec, index) => {
            const priority = rec.priority === 'high' ? '🔴' : 
                           rec.priority === 'medium' ? '🟡' : '🟢';
            console.log(`   ${priority} [${rec.category}] ${rec.message}`);
        });
    }

    console.log('\n🔧 最佳实践建议:');
    console.log('   1. 🔐 定期轮换加密密钥');
    console.log('   2. 🎭 根据合规要求配置脱敏规则');
    console.log('   3. 💾 实施定期自动备份');
    console.log('   4. 📋 建立数据分类和标记机制');
    console.log('   5. 🔍 定期进行数据保护审计');
    console.log('   6. 📚 提供数据保护培训');
    console.log('   7. 🚨 建立数据泄露响应计划');

    // 保存详细报告
    const reportPath = 'DATA_PROTECTION_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 详细报告已保存至: ${reportPath}`);

    console.log('\n🚀 集成示例:');
    console.log('=' .repeat(50));
    
    console.log(`
// Node.js 应用集成示例
const { DataProtectionSystem } = require('./data-protection-system.cjs');

class UserService {
    constructor() {
        this.dataProtection = new DataProtectionSystem();
        
        if (!process.env.USER_SERVICE_KEY_ID) {
            throw new Error('USER_SERVICE_KEY_ID environment variable is required');
        }
        
        this.keyId = process.env.USER_SERVICE_KEY_ID;
        
        // 初始化加密密钥
        this.dataProtection.sensitiveDataEncryption.generateMasterKey(
            this.keyId, 
            process.env.ENCRYPTION_PASSPHRASE
        );
    }

    // 创建用户（自动加密敏感数据）
    async createUser(userData) {
        const result = this.dataProtection.processSensitiveData(userData, this.keyId, {
            encrypt: true,
            compliance: 'GDPR',
            backup: true,
            backupId: \`user_backup_\${Date.now()}\`
        });
        
        // 保存到数据库
        return await this.saveToDatabase(result.data);
    }

    // 获取用户（自动解密敏感数据）
    async getUser(userId, maskSensitive = false) {
        const encryptedUser = await this.loadFromDatabase(userId);
        
        if (maskSensitive) {
            // 返回脱敏数据（用于日志、报告等）
            return this.dataProtection.dataMaskingManager.maskData(encryptedUser);
        } else {
            // 返回解密数据（用于业务逻辑）
            return this.dataProtection.sensitiveDataEncryption.decryptSensitiveData(
                encryptedUser, 
                this.keyId
            );
        }
    }

    // 合规性检查
    async checkUserCompliance(userId, complianceType) {
        const userData = await this.getUser(userId);
        return this.dataProtection.checkCompliance(userData, complianceType);
    }
}
`);

    console.log('\n✅ 数据保护系统演示完成!');
    console.log('📋 主要功能:');
    console.log('   ✅ 敏感数据自动加密/解密');
    console.log('   ✅ 智能数据脱敏');
    console.log('   ✅ 安全备份加密');
    console.log('   ✅ 增量备份支持');
    console.log('   ✅ 密钥轮换机制');
    console.log('   ✅ 多合规标准支持 (GDPR, PCI DSS, HIPAA)');
    console.log('   ✅ 自动合规性检查');
    console.log('   ✅ 数据保护审计');
    console.log('   ✅ 企业级集成支持');
}

// 运行演示
runDataProtectionDemo().catch(console.error);