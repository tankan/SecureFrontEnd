# 容器镜像版本兼容性矩阵

此矩阵用于记录与追踪三套环境（Dev/Staging/Prod）中核心依赖的镜像版本与兼容性状态，确保跨环境行为一致。

## 核心服务

- Redis: `7.4.6-alpine` — 兼容性: ✅ 与 Postgres、Nginx 无直接冲突；注意 Alpine libc 差异。
- PostgreSQL: `15.13-alpine` — 兼容性: ✅ 与 App ORM/迁移脚本兼容；注意 Alpine 排序规则与 Debian 差异。
- Nginx: `1.28.0-alpine` — 兼容性: ✅ 反向代理规则与现有配置兼容。
- Prometheus: `v3.7.1` — 兼容性: ✅ 与 Grafana/Alertmanager 仪表兼容；注意 TSDB 参数。
- Grafana: `12.2.1` — 兼容性: ✅ 仪表板与数据源配置兼容；推荐 enterprise 镜像可选。
- Alertmanager: `v0.28.1` — 兼容性: ✅ 与 Prometheus v3.x 路由兼容。
- ELK: `8.19.5`（Elasticsearch/Kibana/Filebeat/Logstash） — 兼容性: ✅ 内部版本对齐。
- Curl (healthcheck): `8.16.0` — 兼容性: ✅ 基本探活。

## 环境策略

- 生产（Prod）必须使用固定版本标签，与模板 `.env` 中的 `_PROD` 变量一致。
- 测试（Staging）与生产版本同步；发生变更时同时更新。
- 开发（Dev）可使用较新版本进行试验，但必须更新矩阵并标注兼容性状态（如 ⚠️ 实验）。

## 变更记录

- 2025-10-22：初始化矩阵，锁定 Redis 7.4.6、Postgres 15.13、Nginx 1.28.0、Prometheus v3.7.1、Grafana 12.2.1、Alertmanager v0.28.1、ELK 8.19.5、curl 8.16.0。

## 验证建议

- 在 CI 中运行 `scripts/ci/check-env-consistency.ps1`，报告环境间镜像标签一致性与是否包含 `latest`。
- 在发布前运行 `scripts/predeploy/compose-diff.ps1`，审阅 Dev/Staging/Prod 差异。
- 针对 Postgres 使用 Alpine 的排序规则差异，建议在迁移脚本中固定 `collation` 并验证索引行为。