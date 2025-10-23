# 监控系统部署和使用指南

## 概述

本项目集成了完整的监控和日志收集系统，包括：

- **Prometheus**: 指标收集和监控
- **Grafana**: 数据可视化和仪表盘
- **AlertManager**: 告警管理
- **Elasticsearch**: 日志存储和搜索
- **Kibana**: 日志可视化和分析
- **Fluentd**: 日志收集和转发

## 快速开始

### 1. 环境准备

确保系统已安装以下依赖：

```bash
# 检查 Docker 和 Docker Compose
docker --version
docker-compose --version

# 检查 Node.js
node --version
npm --version
```

### 2. 一键部署监控系统

```bash
# Staging 环境
npm run monitoring:setup:staging

# Production 环境
npm run monitoring:setup:production
```

### 3. 验证部署

```bash
# 运行健康检查
npm run health:check:verbose
```

## 服务访问

部署完成后，可以通过以下地址访问各个服务：

### 监控服务地址

| 服务 | 地址 | 默认账号 | 说明 |
|------|------|----------|------|
| Prometheus | http://localhost:9090 | - | 指标监控和告警规则 |
| Grafana | http://localhost:3001 | admin/admin | 监控仪表盘 |
| AlertManager | http://localhost:9093 | - | 告警管理 |
| Elasticsearch | http://localhost:9200 | - | 日志存储 API |
| Kibana | http://localhost:5601 | - | 日志分析界面 |

### 应用服务地址

| 环境 | 主应用 | API 接口 | 健康检查 |
|------|--------|----------|----------|
| 开发环境 | http://localhost:3000 | http://localhost:3000/api/v1 | http://localhost:3000/health |
| 测试环境 | http://localhost:3010 | http://localhost:3010/api/v1 | http://localhost:3010/health |
| 生产环境 | http://localhost:3020 | http://localhost:3020/api/v1 | http://localhost:3020/health |

> **注意**: 完整的监控栈（Prometheus、Grafana、ELK等）仅在开发环境中启用。测试和生产环境仅运行核心应用服务。

> 📖 **详细信息**: 查看 [部署指南](../DEPLOYMENT_GUIDE.md#服务访问地址) 获取完整的服务配置信息

## 监控配置

### Prometheus 配置

主要配置文件：`config/monitoring/prometheus.yml`

```yaml
# 监控目标示例
scrape_configs:
  - job_name: 'secure-frontend-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

### 告警规则

告警规则定义在：`config/monitoring/alert_rules.yml`

主要告警包括：
- CPU 使用率过高 (>80%)
- 内存使用率过高 (>85%)
- 磁盘空间不足 (<10%)
- 应用程序宕机
- HTTP 错误率过高 (>5%)
- 响应时间过长 (>2s)

### Grafana 仪表盘

预配置的仪表盘包括：
- 系统资源监控 (CPU、内存、磁盘)
- 应用程序性能监控
- HTTP 请求统计
- 数据库连接监控
- 加密操作统计

## 日志管理

### Fluentd 配置

日志收集配置：`config/logging/fluentd.conf`

支持的日志源：
- 应用程序日志 (`/var/log/app/*.log`)
- Nginx 访问和错误日志
- PostgreSQL 数据库日志
- Redis 缓存日志
- 系统日志 (systemd)
- Docker 容器日志

### 日志轮转

日志轮转配置：`config/logging/logrotate.conf`

- 应用日志：每日轮转，保留30天
- Nginx 日志：每日轮转，保留30天
- 数据库日志：每日轮转，保留30天
- 系统日志：每日轮转，保留30天

### Kibana 使用

1. 访问 http://localhost:5601
2. 创建索引模式：
   - `app-logs-*` - 应用程序日志
   - `nginx-logs-*` - Nginx 日志
   - `postgres-logs-*` - 数据库日志
   - `system-logs-*` - 系统日志

## 健康检查

### 自动健康检查

```bash
# 基本健康检查
npm run health:check

# 详细健康检查
npm run health:check:verbose

# 带告警的健康检查
npm run health:check:alert
```

### 检查项目

- **服务状态**: 主应用、数据库、缓存等
- **系统资源**: CPU、内存、磁盘使用率
- **网络连接**: 外部网络可达性
- **Docker 服务**: 容器运行状态

### 健康报告

健康检查报告保存在：`reports/health/`

- `latest-health-report.json` - 最新报告
- `health-report-{timestamp}.json` - 历史报告

## 告警配置

### 邮件告警

在环境变量中配置邮件设置：

```bash
export SMTP_HOST="smtp.gmail.com:587"
export ALERT_FROM_EMAIL="alerts@your-domain.com"
export ALERT_TO_EMAIL="admin@your-domain.com"
```

### 自定义告警

1. 编辑 `config/monitoring/alert_rules.yml`
2. 添加新的告警规则
3. 重新加载 Prometheus 配置

```bash
# 重新加载配置
curl -X POST http://localhost:9090/-/reload
```

## 性能优化

### 监控数据保留

默认配置：
- Prometheus 数据保留 15 天
- Elasticsearch 日志保留 30 天
- Grafana 仪表盘数据实时更新

### 资源限制

在 Docker Compose 中配置资源限制：

```yaml
services:
  prometheus:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
```

## 故障排除

### 常见问题

1. **服务无法启动**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :9090
   
   # 查看容器日志
   docker-compose logs prometheus
   ```

2. **数据不显示**
   ```bash
   # 检查 Prometheus 目标状态
   curl http://localhost:9090/api/v1/targets
   
   # 检查 Grafana 数据源连接
   curl http://localhost:3001/api/datasources
   ```

3. **告警不工作**
   ```bash
   # 检查告警规则
   curl http://localhost:9090/api/v1/rules
   
   # 检查 AlertManager 配置
   curl http://localhost:9093/api/v1/status
   ```

### 日志调试

```bash
# 查看 Fluentd 日志
docker-compose logs fluentd

# 查看 Elasticsearch 状态
curl http://localhost:9200/_cluster/health

# 查看 Kibana 日志
docker-compose logs kibana
```

## 安全考虑

### 访问控制

1. **Grafana 安全**
   - 修改默认管理员密码
   - 配置 LDAP/OAuth 认证
   - 设置用户权限

2. **Prometheus 安全**
   - 配置基本认证
   - 限制网络访问
   - 使用 HTTPS

3. **Elasticsearch 安全**
   - 启用 X-Pack 安全功能
   - 配置用户认证
   - 设置索引权限

### 网络安全

```yaml
# Docker 网络隔离
networks:
  monitoring:
    driver: bridge
    internal: true
  
  public:
    driver: bridge
```

## 扩展和定制

### 添加新的监控目标

1. 在应用中暴露 `/metrics` 端点
2. 更新 `prometheus.yml` 配置
3. 创建对应的 Grafana 仪表盘

### 自定义日志格式

1. 修改应用日志输出格式
2. 更新 Fluentd 解析规则
3. 在 Kibana 中创建新的索引模式

### 集成第三方服务

支持集成：
- Slack 告警通知
- PagerDuty 事件管理
- AWS CloudWatch
- Azure Monitor

## 维护和备份

### 定期维护

```bash
# 清理旧的监控数据
docker system prune -f

# 备份 Grafana 仪表盘
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3001/api/search > dashboards-backup.json

# 备份 Prometheus 配置
cp config/monitoring/*.yml backup/
```

### 数据备份

```bash
# Elasticsearch 数据备份
curl -X PUT "localhost:9200/_snapshot/backup" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/backup/elasticsearch"
  }
}'
```

## 最佳实践

1. **监控指标选择**
   - 关注业务关键指标
   - 避免过度监控
   - 设置合理的告警阈值

2. **日志管理**
   - 结构化日志输出
   - 合理的日志级别
   - 敏感信息脱敏

3. **告警策略**
   - 分级告警机制
   - 避免告警风暴
   - 定期回顾告警规则

4. **性能优化**
   - 监控系统本身的资源使用
   - 定期清理历史数据
   - 优化查询性能

## 支持和帮助

如需帮助，请查看：
- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Grafana 官方文档](https://grafana.com/docs/)
- [Elasticsearch 官方文档](https://www.elastic.co/guide/)
- [项目 GitHub Issues](https://github.com/your-repo/issues)