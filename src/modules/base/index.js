/**
 * 基础模块统一导出
 * 提供模块系统的核心基础设施
 */

const { ModuleBase, ModuleFactory, MODULE_STATUS } = require('./module-base');
const { ModuleRegistry, globalRegistry } = require('./module-registry');

module.exports = {
    // 模块基类
    ModuleBase,
    ModuleFactory,
    MODULE_STATUS,
    
    // 模块注册中心
    ModuleRegistry,
    globalRegistry
};