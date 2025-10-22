#!/usr/bin/env node

/**
 * 监控系统设置脚本
 * 自动化部署和配置 Prometheus、Grafana、AlertManager 等监控组件
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MonitoringSetup {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../..');
        this.configDir = path.join(this.projectRoot, 'config');
        this.monitoringDir = path.join(this.configDir, 'monitoring');
        this.dockerDir = path.join(this.configDir, 'docker');
        
        this.services = {
            prometheus: { port: 9090, healthPath: '/-/healthy' },
            grafana: { port: 3001, healthPath: '/api/health' },
            alertmanager: { port: 9093, healthPath: '/-/healthy' },
            elasticsearch: { port: 9200, healthPath: '/_cluster/health' },
            kibana: { port: 5601, healthPath: '/api/status' }
        };
    }

    async setup(environment = 'staging') {
        console.log('🚀 开始设置监控系统...');
        console.log(`📋 环境: ${environment}`);
        
        try {
            await this.validatePrerequisites();
            await this.createDirectories();
            await this.generateConfigurations(environment);
            await this.deployServices(environment);
            await this.waitForServices();
            await this.configureGrafana();
            await this.setupAlerts();
            await this.validateSetup();
            
            console.log('✅ 监控系统设置完成!');
            this.displayAccessInfo();
            
        } catch (error) {
            console.error('❌ 监控系统设置失败:', error.message);
            await this.cleanup();
            process.exit(1);
        }
    }

    async validatePrerequisites() {
        console.log('🔍 检查前置条件...');
        
        const requirements = ['docker', 'docker-compose'];
        
        for (const cmd of requirements) {
            try {
                execSync(`${cmd} --version`, { stdio: 'ignore' });
                console.log(`✅ ${cmd} 已安装`);
            } catch (error) {
                throw new Error(`${cmd} 未安装或不可用`);
            }
        }
        
        // 检查端口占用
        for (const [service, config] of Object.entries(this.services)) {
            if (await this.isPortInUse(config.port)) {
                console.warn(`⚠️  端口 ${config.port} (${service}) 已被占用`);
            }
        }
    }

    async createDirectories() {
        console.log('📁 创建必要目录...');
        
        const dirs = [
            path.join(this.monitoringDir, 'data', 'prometheus'),
            path.join(this.monitoringDir, 'data', 'grafana'),
            path.join(this.monitoringDir, 'data', 'elasticsearch'),
            path.join(this.monitoringDir, 'logs'),
            path.join(this.configDir, 'logging', 'data')
        ];
        
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`✅ 创建目录: ${dir}`);
            }
        }
    }

    async generateConfigurations(environment) {
        console.log('⚙️  生成配置文件...');
        
        // 生成 AlertManager 配置
        const alertManagerConfig = {
            global: {
                smtp_smarthost: process.env.SMTP_HOST || 'localhost:587',
                smtp_from: process.env.ALERT_FROM_EMAIL || 'alerts@secure-frontend.com'
            },
            route: {
                group_by: ['alertname'],
                group_wait: '10s',
                group_interval: '10s',
                repeat_interval: '1h',
                receiver: 'web.hook'
            },
            receivers: [{
                name: 'web.hook',
                email_configs: [{
                    to: process.env.ALERT_TO_EMAIL || 'admin@secure-frontend.com',
                    subject: '[{{ .Status }}] {{ .GroupLabels.alertname }}',
                    body: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
                }]
            }]
        };
        
        const alertManagerPath = path.join(this.monitoringDir, 'alertmanager.yml');
        fs.writeFileSync(alertManagerPath, yaml.dump(alertManagerConfig));
        console.log('✅ AlertManager 配置已生成');
        
        // 生成 Grafana 数据源配置
        const grafanaDataSources = {
            apiVersion: 1,
            datasources: [{
                name: 'Prometheus',
                type: 'prometheus',
                access: 'proxy',
                url: 'http://prometheus:9090',
                isDefault: true
            }, {
                name: 'Elasticsearch',
                type: 'elasticsearch',
                access: 'proxy',
                url: 'http://elasticsearch:9200',
                database: 'app-logs-*',
                interval: 'Daily',
                timeField: '@timestamp'
            }]
        };
        
        const grafanaDataSourcePath = path.join(this.monitoringDir, 'grafana-datasources.yml');
        fs.writeFileSync(grafanaDataSourcePath, yaml.dump(grafanaDataSources));
        console.log('✅ Grafana 数据源配置已生成');
    }

    async deployServices(environment) {
        console.log('🐳 部署监控服务...');
        
        const composeFile = environment === 'production' 
            ? 'docker-compose.production.yml' 
            : 'docker-compose.staging.yml';
        
        const composePath = path.join(this.dockerDir, composeFile);
        
        if (!fs.existsSync(composePath)) {
            throw new Error(`Docker Compose 文件不存在: ${composePath}`);
        }
        
        // 启动监控相关服务
        const monitoringServices = [
            'prometheus', 'grafana', 'alertmanager',
            'elasticsearch', 'kibana', 'fluentd'
        ];
        
        for (const service of monitoringServices) {
            console.log(`🚀 启动服务: ${service}`);
            try {
                execSync(`docker-compose -f ${composePath} up -d ${service}`, {
                    cwd: this.dockerDir,
                    stdio: 'inherit'
                });
            } catch (error) {
                console.warn(`⚠️  服务 ${service} 启动失败，可能不存在于配置中`);
            }
        }
    }

    async waitForServices() {
        console.log('⏳ 等待服务启动...');
        
        const maxWaitTime = 300000; // 5分钟
        const checkInterval = 5000; // 5秒
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            let allHealthy = true;
            
            for (const [service, config] of Object.entries(this.services)) {
                const isHealthy = await this.checkServiceHealth(service, config);
                if (!isHealthy) {
                    allHealthy = false;
                    console.log(`⏳ 等待 ${service} 启动...`);
                }
            }
            
            if (allHealthy) {
                console.log('✅ 所有服务已启动');
                return;
            }
            
            await this.sleep(checkInterval);
        }
        
        throw new Error('服务启动超时');
    }

    async checkServiceHealth(service, config) {
        try {
            const response = await fetch(`http://localhost:${config.port}${config.healthPath}`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async configureGrafana() {
        console.log('📊 配置 Grafana...');
        
        const grafanaUrl = 'http://localhost:3001';
        const adminCredentials = {
            user: process.env.GRAFANA_ADMIN_USER || 'admin',
            password: process.env.GRAFANA_ADMIN_PASSWORD || 'admin'
        };
        
        try {
            // 导入仪表盘
            const dashboardPath = path.join(this.monitoringDir, 'grafana-dashboards.json');
            if (fs.existsSync(dashboardPath)) {
                const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
                
                const response = await fetch(`${grafanaUrl}/api/dashboards/db`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${Buffer.from(`${adminCredentials.user}:${adminCredentials.password}`).toString('base64')}`
                    },
                    body: JSON.stringify(dashboard)
                });
                
                if (response.ok) {
                    console.log('✅ Grafana 仪表盘已导入');
                } else {
                    console.warn('⚠️  Grafana 仪表盘导入失败');
                }
            }
        } catch (error) {
            console.warn('⚠️  Grafana 配置失败:', error.message);
        }
    }

    async setupAlerts() {
        console.log('🚨 设置告警规则...');
        
        try {
            // 重新加载 Prometheus 配置
            const response = await fetch('http://localhost:9090/-/reload', {
                method: 'POST'
            });
            
            if (response.ok) {
                console.log('✅ Prometheus 配置已重新加载');
            } else {
                console.warn('⚠️  Prometheus 配置重新加载失败');
            }
        } catch (error) {
            console.warn('⚠️  告警设置失败:', error.message);
        }
    }

    async validateSetup() {
        console.log('🔍 验证监控系统...');
        
        const validationResults = [];
        
        for (const [service, config] of Object.entries(this.services)) {
            const isHealthy = await this.checkServiceHealth(service, config);
            validationResults.push({
                service,
                status: isHealthy ? '✅ 正常' : '❌ 异常',
                url: `http://localhost:${config.port}`
            });
        }
        
        console.log('\n📋 服务状态:');
        validationResults.forEach(result => {
            console.log(`  ${result.service}: ${result.status} (${result.url})`);
        });
        
        const failedServices = validationResults.filter(r => r.status.includes('❌'));
        if (failedServices.length > 0) {
            console.warn(`\n⚠️  ${failedServices.length} 个服务异常`);
        }
    }

    displayAccessInfo() {
        console.log('\n🌐 访问信息:');
        console.log('  Prometheus: http://localhost:9090');
        console.log('  Grafana: http://localhost:3001 (admin/admin)');
        console.log('  AlertManager: http://localhost:9093');
        console.log('  Elasticsearch: http://localhost:9200');
        console.log('  Kibana: http://localhost:5601');
        
        console.log('\n📚 使用说明:');
        console.log('  1. 访问 Grafana 查看监控仪表盘');
        console.log('  2. 在 Prometheus 中查看指标和告警规则');
        console.log('  3. 在 Kibana 中查看和分析日志');
        console.log('  4. AlertManager 会发送告警通知');
    }

    async cleanup() {
        console.log('🧹 清理资源...');
        
        try {
            execSync('docker-compose down', {
                cwd: this.dockerDir,
                stdio: 'ignore'
            });
        } catch (error) {
            // 忽略清理错误
        }
    }

    async isPortInUse(port) {
        return new Promise(async (resolve) => {
            const { createServer } = await import('net');
            const server = createServer();
            server.listen(port, () => {
                server.close(() => resolve(false));
            });
            server.on('error', () => resolve(true));
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    const environment = args[0] || 'staging';
    
    if (!['staging', 'production'].includes(environment)) {
        console.error('❌ 无效的环境参数。使用: staging 或 production');
        process.exit(1);
    }
    
    const setup = new MonitoringSetup();
    await setup.setup(environment);
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的 Promise 拒绝:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    process.exit(1);
});

// 移除调试输出，恢复正常的模块检查
if (import.meta.url === `file://${process.argv[1]}` || 
    import.meta.url.replace('file:///', '').replace(/\//g, '\\') === process.argv[1].replace(/\//g, '\\')) {
    main().catch(error => {
        console.error('脚本执行失败:', error);
        process.exit(1);
    });
}

export default MonitoringSetup;