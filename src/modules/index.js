/**
 * 安全模块统一导出
 * 提供所有安全相关模块的统一入口和管理
 */

// 基础模块系统
const { globalRegistry, ModuleBase, ModuleFactory } = require('./base');

// 安全模块
const { AccessControlSystem, MFAManager, RateLimitManager, SessionManager } = require('./security/access-control-system.cjs');
const { DataProtectionSystem, SensitiveDataEncryption, DataMaskingManager, BackupEncryptionManager } = require('./security/data-protection-system.cjs');
const { SecurityMonitoringSystem, ThreatDetectionEngine, SecurityAlertsManager, RealTimeMonitor } = require('./security/security-monitoring-system.cjs');
const { SecurityTrainingManager, PhishingSimulationManager, SecurityAwarenessManager } = require('./security/security-training-system.cjs');

// 合规模块
const { ComplianceAuditManager, ComplianceFrameworkManager, AuditReportGenerator } = require('./compliance/security-compliance-audit.cjs');
const { ComplianceImprovementSystem, ComplianceGapAnalyzer, RemediationPlanManager, ComplianceTracker } = require('./compliance/compliance-improvement-system.cjs');

// 监控模块
const { IncidentClassificationManager, ResponseWorkflowManager, EmergencyResponseCoordinator } = require('./monitoring/incident-response-system.cjs');

// 集成模块
const { IntegratedSecuritySystem } = require('./integration/integrated-security-system.cjs');
const { SystemVerificationManager } = require('./integration/system-verification.cjs');

/**
 * 模块管理器 - 统一管理所有安全模块
 */
class SecurityModuleManager {
    constructor() {
        this.registry = globalRegistry;
        this.initialized = false;
    }
    
    /**
     * 初始化所有模块
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        
        console.log('🔧 初始化安全模块系统...');
        
        try {
            // 注册核心安全模块
            this.registerSecurityModules();
            
            // 注册合规模块
            this.registerComplianceModules();
            
            // 注册监控模块
            this.registerMonitoringModules();
            
            // 注册集成模块
            this.registerIntegrationModules();
            
            this.initialized = true;
            console.log('✅ 安全模块系统初始化完成');
            
        } catch (error) {
            console.error('❌ 安全模块系统初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 注册安全模块
     */
    registerSecurityModules() {
        // 访问控制系统 - 基础模块，无依赖
        const accessControl = ModuleFactory.create('access-control', AccessControlSystem);
        this.registry.register(accessControl, []);
        
        // 数据保护系统 - 依赖访问控制
        const dataProtection = ModuleFactory.create('data-protection', DataProtectionSystem);
        this.registry.register(dataProtection, ['access-control']);
        
        // 安全监控系统 - 依赖访问控制和数据保护
        const securityMonitoring = ModuleFactory.create('security-monitoring', SecurityMonitoringSystem);
        this.registry.register(securityMonitoring, ['access-control', 'data-protection']);
        
        // 安全培训系统 - 依赖访问控制
        const securityTraining = ModuleFactory.create('security-training', SecurityTrainingManager);
        this.registry.register(securityTraining, ['access-control']);
    }
    
    /**
     * 注册合规模块
     */
    registerComplianceModules() {
        // 合规审计管理器 - 依赖安全监控
        const complianceAudit = ModuleFactory.create('compliance-audit', ComplianceAuditManager);
        this.registry.register(complianceAudit, ['security-monitoring']);
        
        // 合规改进系统 - 依赖合规审计
        const complianceImprovement = ModuleFactory.create('compliance-improvement', ComplianceImprovementSystem);
        this.registry.register(complianceImprovement, ['compliance-audit']);
    }
    
    /**
     * 注册监控模块
     */
    registerMonitoringModules() {
        // 事件响应协调器 - 依赖安全监控
        const incidentResponse = ModuleFactory.create('incident-response', EmergencyResponseCoordinator);
        this.registry.register(incidentResponse, ['security-monitoring']);
    }
    
    /**
     * 注册集成模块
     */
    registerIntegrationModules() {
        // 集成安全系统 - 依赖所有核心模块
        const integratedSecurity = ModuleFactory.create('integrated-security', IntegratedSecuritySystem);
        this.registry.register(integratedSecurity, [
            'access-control',
            'data-protection', 
            'security-monitoring',
            'compliance-audit',
            'incident-response'
        ]);
        
        // 系统验证管理器 - 依赖集成安全系统
        const systemVerification = ModuleFactory.create('system-verification', SystemVerificationManager);
        this.registry.register(systemVerification, ['integrated-security']);
    }
    
    /**
     * 启动所有模块
     */
    async start() {
        if (!this.initialized) {
            await this.initialize();
        }
        
        return this.registry.startAll();
    }
    
    /**
     * 停止所有模块
     */
    async stop() {
        return this.registry.stopAll();
    }
    
    /**
     * 获取模块
     */
    getModule(moduleName) {
        return this.registry.get(moduleName);
    }
    
    /**
     * 获取系统状态
     */
    getStatus() {
        return this.registry.getStatus();
    }
    
    /**
     * 获取健康报告
     */
    getHealthReport() {
        return this.registry.getHealthReport();
    }
}

// 创建全局模块管理器实例
const securityModuleManager = new SecurityModuleManager();

module.exports = {
    // 模块管理器
    SecurityModuleManager,
    securityModuleManager,
    
    // 基础模块系统
    ModuleBase,
    ModuleFactory,
    globalRegistry,
    
    // 安全模块类（用于直接实例化）
    security: {
        AccessControlSystem,
        MFAManager,
        RateLimitManager,
        SessionManager,
        DataProtectionSystem,
        SensitiveDataEncryption,
        DataMaskingManager,
        BackupEncryptionManager,
        SecurityMonitoringSystem,
        ThreatDetectionEngine,
        SecurityAlertsManager,
        RealTimeMonitor,
        SecurityTrainingManager,
        PhishingSimulationManager,
        SecurityAwarenessManager
    },

    // 合规模块类
    compliance: {
        ComplianceAuditManager,
        ComplianceFrameworkManager,
        AuditReportGenerator,
        ComplianceImprovementSystem,
        ComplianceGapAnalyzer,
        RemediationPlanManager,
        ComplianceTracker
    },

    // 监控模块类
    monitoring: {
        IncidentClassificationManager,
        ResponseWorkflowManager,
        EmergencyResponseCoordinator
    },

    // 集成模块类
    integration: {
        IntegratedSecuritySystem,
        SystemVerificationManager
    }
};
