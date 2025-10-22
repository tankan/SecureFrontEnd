#!/usr/bin/env node

/**
 * 健康检查脚本
 * 监控系统各组件的运行状态，生成健康报告
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HealthChecker {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../..');
        this.reportsDir = path.join(this.projectRoot, 'reports', 'health');
        
        this.services = {
            application: {
                name: '主应用',
                url: 'http://localhost:3000/health',
                critical: true
            },
            prometheus: {
                name: 'Prometheus 监控',
                url: 'http://localhost:9090/-/healthy',
                critical: false
            },
            grafana: {
                name: 'Grafana 仪表盘',
                url: 'http://localhost:3001/api/health',
                critical: false
            },
            elasticsearch: {
                name: 'Elasticsearch 日志存储',
                url: 'http://localhost:9200/_cluster/health',
                critical: false
            },
            kibana: {
                name: 'Kibana 日志可视化',
                url: 'http://localhost:5601/api/status',
                critical: false
            },
            redis: {
                name: 'Redis 缓存',
                url: 'http://localhost:6379',
                critical: true,
                customCheck: this.checkRedis.bind(this)
            },
            postgres: {
                name: 'PostgreSQL 数据库',
                url: 'postgresql://localhost:5432',
                critical: true,
                customCheck: this.checkPostgreSQL.bind(this)
            }
        };
        
        this.systemChecks = [
            { name: 'CPU 使用率', check: this.checkCPUUsage.bind(this) },
            { name: '内存使用率', check: this.checkMemoryUsage.bind(this) },
            { name: '磁盘空间', check: this.checkDiskSpace.bind(this) },
            { name: '网络连接', check: this.checkNetworkConnectivity.bind(this) },
            { name: 'Docker 服务', check: this.checkDockerServices.bind(this) }
        ];
    }

    async runHealthCheck(options = {}) {
        const {
            verbose = false,
            saveReport = true,
            alertOnFailure = false
        } = options;
        
        console.log('🏥 开始系统健康检查...');
        console.log(`📅 检查时间: ${new Date().toISOString()}`);
        
        const results = {
            timestamp: new Date().toISOString(),
            overall: 'unknown',
            services: {},
            system: {},
            summary: {
                total: 0,
                healthy: 0,
                unhealthy: 0,
                critical_failures: 0
            }
        };
        
        try {
            // 检查服务状态
            await this.checkServices(results, verbose);
            
            // 检查系统状态
            await this.checkSystemHealth(results, verbose);
            
            // 计算总体状态
            this.calculateOverallHealth(results);
            
            // 显示结果
            this.displayResults(results, verbose);
            
            // 保存报告
            if (saveReport) {
                await this.saveHealthReport(results);
            }
            
            // 发送告警
            if (alertOnFailure && results.overall !== 'healthy') {
                await this.sendAlert(results);
            }
            
            return results;
            
        } catch (error) {
            console.error('❌ 健康检查失败:', error.message);
            results.overall = 'error';
            results.error = error.message;
            return results;
        }
    }

    async checkServices(results, verbose) {
        console.log('\n🔍 检查服务状态...');
        
        for (const [serviceId, service] of Object.entries(this.services)) {
            if (verbose) {
                console.log(`  检查 ${service.name}...`);
            }
            
            const serviceResult = {
                name: service.name,
                critical: service.critical,
                status: 'unknown',
                response_time: 0,
                details: {},
                error: null
            };
            
            try {
                const startTime = Date.now();
                
                if (service.customCheck) {
                    const customResult = await service.customCheck();
                    serviceResult.status = customResult.status;
                    serviceResult.details = customResult.details;
                } else {
                    const response = await this.httpHealthCheck(service.url);
                    serviceResult.status = response.ok ? 'healthy' : 'unhealthy';
                    serviceResult.details = {
                        status_code: response.status,
                        response_data: response.data
                    };
                }
                
                serviceResult.response_time = Date.now() - startTime;
                
            } catch (error) {
                serviceResult.status = 'unhealthy';
                serviceResult.error = error.message;
            }
            
            results.services[serviceId] = serviceResult;
            results.summary.total++;
            
            if (serviceResult.status === 'healthy') {
                results.summary.healthy++;
                if (verbose) {
                    console.log(`    ✅ ${service.name}: 正常 (${serviceResult.response_time}ms)`);
                }
            } else {
                results.summary.unhealthy++;
                if (service.critical) {
                    results.summary.critical_failures++;
                }
                if (verbose) {
                    console.log(`    ❌ ${service.name}: 异常 - ${serviceResult.error || '服务不可用'}`);
                }
            }
        }
    }

    async checkSystemHealth(results, verbose) {
        console.log('\n🖥️  检查系统状态...');
        
        for (const systemCheck of this.systemChecks) {
            if (verbose) {
                console.log(`  检查 ${systemCheck.name}...`);
            }
            
            try {
                const checkResult = await systemCheck.check();
                results.system[systemCheck.name] = checkResult;
                
                if (verbose) {
                    const status = checkResult.status === 'healthy' ? '✅' : '⚠️';
                    console.log(`    ${status} ${systemCheck.name}: ${checkResult.message}`);
                }
                
            } catch (error) {
                results.system[systemCheck.name] = {
                    status: 'error',
                    message: error.message,
                    error: true
                };
                
                if (verbose) {
                    console.log(`    ❌ ${systemCheck.name}: 检查失败 - ${error.message}`);
                }
            }
        }
    }

    async httpHealthCheck(url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                timeout: 5000
            });
            
            let data = null;
            try {
                data = await response.json();
            } catch (e) {
                data = await response.text();
            }
            
            return {
                ok: response.ok,
                status: response.status,
                data: data
            };
        } catch (error) {
            throw new Error(`HTTP 请求失败: ${error.message}`);
        }
    }

    async checkRedis() {
        try {
            // 使用 redis-cli 检查 Redis
            const result = execSync('redis-cli ping', { 
                encoding: 'utf8',
                timeout: 5000 
            }).trim();
            
            return {
                status: result === 'PONG' ? 'healthy' : 'unhealthy',
                details: { response: result }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                details: { error: error.message }
            };
        }
    }

    async checkPostgreSQL() {
        try {
            // 使用 pg_isready 检查 PostgreSQL
            execSync('pg_isready -h localhost -p 5432', { 
                encoding: 'utf8',
                timeout: 5000 
            });
            
            return {
                status: 'healthy',
                details: { connection: 'accepting connections' }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                details: { error: error.message }
            };
        }
    }

    async checkCPUUsage() {
        try {
            const cpuInfo = execSync('wmic cpu get loadpercentage /value', { 
                encoding: 'utf8' 
            });
            
            const match = cpuInfo.match(/LoadPercentage=(\d+)/);
            const cpuUsage = match ? parseInt(match[1]) : 0;
            
            return {
                status: cpuUsage < 80 ? 'healthy' : 'warning',
                message: `CPU 使用率: ${cpuUsage}%`,
                value: cpuUsage,
                threshold: 80
            };
        } catch (error) {
            throw new Error(`CPU 检查失败: ${error.message}`);
        }
    }

    async checkMemoryUsage() {
        try {
            const memInfo = execSync('wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value', { 
                encoding: 'utf8' 
            });
            
            const totalMatch = memInfo.match(/TotalVisibleMemorySize=(\d+)/);
            const freeMatch = memInfo.match(/FreePhysicalMemory=(\d+)/);
            
            if (!totalMatch || !freeMatch) {
                throw new Error('无法获取内存信息');
            }
            
            const total = parseInt(totalMatch[1]) * 1024; // 转换为字节
            const free = parseInt(freeMatch[1]) * 1024;
            const used = total - free;
            const usagePercent = Math.round((used / total) * 100);
            
            return {
                status: usagePercent < 85 ? 'healthy' : 'warning',
                message: `内存使用率: ${usagePercent}% (${Math.round(used / 1024 / 1024 / 1024)}GB / ${Math.round(total / 1024 / 1024 / 1024)}GB)`,
                value: usagePercent,
                threshold: 85
            };
        } catch (error) {
            throw new Error(`内存检查失败: ${error.message}`);
        }
    }

    async checkDiskSpace() {
        try {
            const diskInfo = execSync('wmic logicaldisk get size,freespace,caption', { 
                encoding: 'utf8' 
            });
            
            const lines = diskInfo.split('\n').filter(line => line.trim());
            const disks = [];
            
            for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].trim().split(/\s+/);
                if (parts.length >= 3) {
                    const caption = parts[0];
                    const freeSpace = parseInt(parts[1]);
                    const size = parseInt(parts[2]);
                    
                    if (size > 0) {
                        const usagePercent = Math.round(((size - freeSpace) / size) * 100);
                        disks.push({
                            drive: caption,
                            usage: usagePercent,
                            free: Math.round(freeSpace / 1024 / 1024 / 1024),
                            total: Math.round(size / 1024 / 1024 / 1024)
                        });
                    }
                }
            }
            
            const criticalDisks = disks.filter(disk => disk.usage > 90);
            const warningDisks = disks.filter(disk => disk.usage > 80 && disk.usage <= 90);
            
            let status = 'healthy';
            if (criticalDisks.length > 0) status = 'critical';
            else if (warningDisks.length > 0) status = 'warning';
            
            return {
                status,
                message: `磁盘空间检查完成，${disks.length} 个磁盘`,
                disks,
                critical_disks: criticalDisks.length,
                warning_disks: warningDisks.length
            };
        } catch (error) {
            throw new Error(`磁盘检查失败: ${error.message}`);
        }
    }

    async checkNetworkConnectivity() {
        const testHosts = ['8.8.8.8', 'google.com'];
        const results = [];
        
        for (const host of testHosts) {
            try {
                execSync(`ping -n 1 ${host}`, { 
                    encoding: 'utf8',
                    timeout: 5000 
                });
                results.push({ host, status: 'reachable' });
            } catch (error) {
                results.push({ host, status: 'unreachable' });
            }
        }
        
        const reachableCount = results.filter(r => r.status === 'reachable').length;
        
        return {
            status: reachableCount > 0 ? 'healthy' : 'critical',
            message: `网络连接: ${reachableCount}/${testHosts.length} 个主机可达`,
            results
        };
    }

    async checkDockerServices() {
        try {
            const dockerInfo = execSync('docker ps --format "table {{.Names}}\\t{{.Status}}"', { 
                encoding: 'utf8' 
            });
            
            const lines = dockerInfo.split('\n').filter(line => line.trim() && !line.includes('NAMES'));
            const services = lines.map(line => {
                const parts = line.split('\t');
                return {
                    name: parts[0],
                    status: parts[1]
                };
            });
            
            const runningServices = services.filter(s => s.status.includes('Up'));
            
            return {
                status: services.length > 0 ? 'healthy' : 'warning',
                message: `Docker 服务: ${runningServices.length}/${services.length} 个服务运行中`,
                services,
                running_count: runningServices.length,
                total_count: services.length
            };
        } catch (error) {
            return {
                status: 'warning',
                message: 'Docker 服务检查失败，可能未安装或未运行',
                error: error.message
            };
        }
    }

    calculateOverallHealth(results) {
        if (results.summary.critical_failures > 0) {
            results.overall = 'critical';
        } else if (results.summary.unhealthy > 0) {
            results.overall = 'warning';
        } else if (results.summary.healthy === results.summary.total) {
            results.overall = 'healthy';
        } else {
            results.overall = 'unknown';
        }
    }

    displayResults(results, verbose) {
        console.log('\n📊 健康检查结果:');
        console.log('=' .repeat(50));
        
        const statusEmoji = {
            healthy: '✅',
            warning: '⚠️',
            critical: '❌',
            unknown: '❓',
            error: '💥'
        };
        
        console.log(`总体状态: ${statusEmoji[results.overall]} ${results.overall.toUpperCase()}`);
        console.log(`服务状态: ${results.summary.healthy}/${results.summary.total} 正常`);
        
        if (results.summary.critical_failures > 0) {
            console.log(`关键服务故障: ${results.summary.critical_failures} 个`);
        }
        
        if (verbose) {
            console.log('\n📋 详细信息:');
            
            // 显示服务状态
            console.log('\n🔧 服务状态:');
            for (const [serviceId, service] of Object.entries(results.services)) {
                const emoji = statusEmoji[service.status] || '❓';
                const critical = service.critical ? ' [关键]' : '';
                console.log(`  ${emoji} ${service.name}${critical}: ${service.status} (${service.response_time}ms)`);
                
                if (service.error) {
                    console.log(`    错误: ${service.error}`);
                }
            }
            
            // 显示系统状态
            console.log('\n🖥️  系统状态:');
            for (const [checkName, result] of Object.entries(results.system)) {
                const emoji = statusEmoji[result.status] || '❓';
                console.log(`  ${emoji} ${checkName}: ${result.message}`);
            }
        }
        
        console.log('=' .repeat(50));
    }

    async saveHealthReport(results) {
        try {
            if (!fs.existsSync(this.reportsDir)) {
                fs.mkdirSync(this.reportsDir, { recursive: true });
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const reportPath = path.join(this.reportsDir, `health-report-${timestamp}.json`);
            
            fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
            console.log(`📄 健康报告已保存: ${reportPath}`);
            
            // 保留最新的报告
            const latestPath = path.join(this.reportsDir, 'latest-health-report.json');
            fs.writeFileSync(latestPath, JSON.stringify(results, null, 2));
            
        } catch (error) {
            console.warn('⚠️  保存健康报告失败:', error.message);
        }
    }

    async sendAlert(results) {
        // 这里可以集成邮件、Slack、钉钉等告警通知
        console.log('🚨 发送告警通知...');
        
        const alertMessage = `
系统健康检查告警
时间: ${results.timestamp}
状态: ${results.overall}
关键服务故障: ${results.summary.critical_failures}
总体服务状态: ${results.summary.healthy}/${results.summary.total}
        `;
        
        console.log(alertMessage);
        // TODO: 实现具体的告警发送逻辑
    }
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    const options = {
        verbose: args.includes('--verbose') || args.includes('-v'),
        saveReport: !args.includes('--no-save'),
        alertOnFailure: args.includes('--alert')
    };
    
    const checker = new HealthChecker();
    const results = await checker.runHealthCheck(options);
    
    // 根据结果设置退出码
    if (results.overall === 'critical') {
        process.exit(2);
    } else if (results.overall === 'warning') {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default HealthChecker;