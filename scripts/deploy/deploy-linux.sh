#!/bin/bash

# SecureFrontEnd Linux环境自动化部署脚本
# 支持多环境部署：development, staging, production

set -euo pipefail

# 脚本信息
SCRIPT_NAME="SecureFrontEnd Linux部署脚本"
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 默认配置
DEFAULT_ENVIRONMENT="staging"
DEFAULT_ACTION="deploy"
DEFAULT_BACKUP="true"
DEFAULT_HEALTH_CHECK="true"
DEFAULT_ROLLBACK_ON_FAILURE="true"

# 全局变量
ENVIRONMENT=""
ACTION=""
BACKUP_ENABLED=""
HEALTH_CHECK_ENABLED=""
ROLLBACK_ON_FAILURE=""
DEPLOYMENT_ID=""
LOG_FILE=""
BACKUP_DIR=""
DEPLOYMENT_START_TIME=""

# 日志函数
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "DEBUG")
            echo -e "${PURPLE}[DEBUG]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

# 显示帮助信息
show_help() {
    cat << EOF
$SCRIPT_NAME v$SCRIPT_VERSION

用法: $0 [选项]

选项:
    -e, --environment ENV    目标环境 (development|staging|production)
                            默认: $DEFAULT_ENVIRONMENT
    
    -a, --action ACTION      执行动作 (deploy|rollback|status|logs|cleanup)
                            默认: $DEFAULT_ACTION
    
    -b, --backup BOOL        是否创建备份 (true|false)
                            默认: $DEFAULT_BACKUP
    
    -c, --health-check BOOL  是否执行健康检查 (true|false)
                            默认: $DEFAULT_HEALTH_CHECK
    
    -r, --rollback BOOL      失败时是否自动回滚 (true|false)
                            默认: $DEFAULT_ROLLBACK_ON_FAILURE
    
    -h, --help              显示此帮助信息

动作说明:
    deploy      部署应用到指定环境
    rollback    回滚到上一个版本
    status      查看部署状态
    logs        查看部署日志
    cleanup     清理旧版本和临时文件

环境说明:
    development  开发环境 (本地Docker)
    staging      测试环境 (远程服务器)
    production   生产环境 (生产服务器集群)

示例:
    $0 -e staging -a deploy
    $0 -e production -a deploy -b true -c true
    $0 -e staging -a rollback
    $0 -e production -a status

日志文件: /var/log/securefrontend/deploy-\$(date +%Y%m%d).log
备份目录: /opt/securefrontend/backups/

系统要求:
    - Linux操作系统 (Ubuntu 18.04+, CentOS 7+, RHEL 7+)
    - Docker 20.10+
    - Docker Compose 2.0+
    - Git 2.0+
    - curl, jq, rsync

EOF
}

# 解析命令行参数
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -a|--action)
                ACTION="$2"
                shift 2
                ;;
            -b|--backup)
                BACKUP_ENABLED="$2"
                shift 2
                ;;
            -c|--health-check)
                HEALTH_CHECK_ENABLED="$2"
                shift 2
                ;;
            -r|--rollback)
                ROLLBACK_ON_FAILURE="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log "ERROR" "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 设置默认值
    ENVIRONMENT="${ENVIRONMENT:-$DEFAULT_ENVIRONMENT}"
    ACTION="${ACTION:-$DEFAULT_ACTION}"
    BACKUP_ENABLED="${BACKUP_ENABLED:-$DEFAULT_BACKUP}"
    HEALTH_CHECK_ENABLED="${HEALTH_CHECK_ENABLED:-$DEFAULT_HEALTH_CHECK}"
    ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-$DEFAULT_ROLLBACK_ON_FAILURE}"
}

# 验证参数
validate_arguments() {
    # 验证环境
    case $ENVIRONMENT in
        development|staging|production)
            ;;
        *)
            log "ERROR" "无效的环境: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    # 验证动作
    case $ACTION in
        deploy|rollback|status|logs|cleanup)
            ;;
        *)
            log "ERROR" "无效的动作: $ACTION"
            exit 1
            ;;
    esac
    
    # 验证布尔值
    for var in BACKUP_ENABLED HEALTH_CHECK_ENABLED ROLLBACK_ON_FAILURE; do
        case ${!var} in
            true|false)
                ;;
            *)
                log "ERROR" "无效的布尔值 $var: ${!var}"
                exit 1
                ;;
        esac
    done
}

# 初始化环境
initialize_environment() {
    DEPLOYMENT_START_TIME=$(date '+%Y%m%d_%H%M%S')
    DEPLOYMENT_ID="${ENVIRONMENT}_${DEPLOYMENT_START_TIME}"
    
    # 创建日志目录
    local log_dir="/var/log/securefrontend"
    sudo mkdir -p "$log_dir"
    sudo chown $(whoami):$(whoami) "$log_dir" 2>/dev/null || true
    
    LOG_FILE="$log_dir/deploy-$(date +%Y%m%d).log"
    
    # 创建备份目录
    BACKUP_DIR="/opt/securefrontend/backups"
    sudo mkdir -p "$BACKUP_DIR"
    sudo chown $(whoami):$(whoami) "$BACKUP_DIR" 2>/dev/null || true
    
    log "INFO" "=== $SCRIPT_NAME 开始执行 ==="
    log "INFO" "部署ID: $DEPLOYMENT_ID"
    log "INFO" "环境: $ENVIRONMENT"
    log "INFO" "动作: $ACTION"
    log "INFO" "备份: $BACKUP_ENABLED"
    log "INFO" "健康检查: $HEALTH_CHECK_ENABLED"
    log "INFO" "自动回滚: $ROLLBACK_ON_FAILURE"
}

# 检查系统要求
check_system_requirements() {
    log "INFO" "检查系统要求..."
    
    # 检查操作系统
    if [[ ! "$OSTYPE" =~ ^linux ]]; then
        log "ERROR" "此脚本仅支持Linux操作系统"
        exit 1
    fi
    
    # 检查必需的命令
    local required_commands=("docker" "docker-compose" "git" "curl" "jq" "rsync")
    local missing_commands=()
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_commands+=("$cmd")
        fi
    done
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        log "ERROR" "缺少必需的命令: ${missing_commands[*]}"
        log "INFO" "请安装缺少的命令后重试"
        exit 1
    fi
    
    # 检查Docker版本
    local docker_version=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
    if [[ $(echo "$docker_version < 20.10" | bc -l) -eq 1 ]]; then
        log "WARN" "Docker版本过低: $docker_version，建议升级到20.10+"
    fi
    
    # 检查Docker Compose版本
    local compose_version=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
    if [[ $(echo "$compose_version < 2.0" | bc -l) -eq 1 ]]; then
        log "WARN" "Docker Compose版本过低: $compose_version，建议升级到2.0+"
    fi
    
    log "SUCCESS" "系统要求检查完成"
}

# 加载环境配置
load_environment_config() {
    log "INFO" "加载环境配置..."
    
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [ ! -f "$env_file" ]; then
        log "ERROR" "环境配置文件不存在: $env_file"
        exit 1
    fi
    
    # 导出环境变量
    set -a
    source "$env_file"
    set +a
    
    log "SUCCESS" "环境配置加载完成"
}

# 创建备份
create_backup() {
    if [ "$BACKUP_ENABLED" != "true" ]; then
        log "INFO" "跳过备份创建"
        return 0
    fi
    
    log "INFO" "创建部署备份..."
    
    local backup_name="backup_${DEPLOYMENT_ID}"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$backup_path"
    
    # 备份当前Docker镜像
    if docker images | grep -q "securefrontend"; then
        log "INFO" "备份Docker镜像..."
        docker save securefrontend:latest | gzip > "$backup_path/docker-image.tar.gz"
    fi
    
    # 备份配置文件
    log "INFO" "备份配置文件..."
    rsync -av "$PROJECT_ROOT/config/" "$backup_path/config/" 2>/dev/null || true
    rsync -av "$PROJECT_ROOT/.env.*" "$backup_path/" 2>/dev/null || true
    
    # 备份数据库
    if [ ! -z "${DATABASE_URL:-}" ]; then
        log "INFO" "备份数据库..."
        # 这里添加数据库备份逻辑
    fi
    
    # 创建备份元数据
    cat > "$backup_path/metadata.json" << EOF
{
    "deployment_id": "$DEPLOYMENT_ID",
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -Iseconds)",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
}
EOF
    
    log "SUCCESS" "备份创建完成: $backup_path"
}

# 拉取最新代码
pull_latest_code() {
    log "INFO" "拉取最新代码..."
    
    cd "$PROJECT_ROOT"
    
    # 检查Git状态
    if [ -d ".git" ]; then
        local current_branch=$(git rev-parse --abbrev-ref HEAD)
        log "INFO" "当前分支: $current_branch"
        
        # 拉取最新代码
        git fetch origin
        git pull origin "$current_branch"
        
        local latest_commit=$(git rev-parse HEAD)
        log "INFO" "最新提交: $latest_commit"
    else
        log "WARN" "不是Git仓库，跳过代码拉取"
    fi
}

# 构建Docker镜像
build_docker_image() {
    log "INFO" "构建Docker镜像..."
    
    cd "$PROJECT_ROOT"
    
    # 选择Dockerfile
    local dockerfile="docker/Dockerfile.$ENVIRONMENT"
    if [ ! -f "$dockerfile" ]; then
        dockerfile="docker/Dockerfile.production"
    fi
    
    if [ ! -f "$dockerfile" ]; then
        log "ERROR" "Dockerfile不存在: $dockerfile"
        exit 1
    fi
    
    # 构建镜像
    local image_tag="securefrontend:$ENVIRONMENT-$DEPLOYMENT_START_TIME"
    local latest_tag="securefrontend:$ENVIRONMENT-latest"
    
    docker build \
        -f "$dockerfile" \
        -t "$image_tag" \
        -t "$latest_tag" \
        --build-arg NODE_ENV="$ENVIRONMENT" \
        --build-arg BUILD_DATE="$(date -Iseconds)" \
        --build-arg VCS_REF="$(git rev-parse HEAD 2>/dev/null || echo 'unknown')" \
        .
    
    log "SUCCESS" "Docker镜像构建完成: $image_tag"
}

# 部署应用
deploy_application() {
    log "INFO" "部署应用..."
    
    cd "$PROJECT_ROOT"
    
    # 选择docker-compose文件
    local compose_file="docker-compose.$ENVIRONMENT.yml"
    if [ ! -f "$compose_file" ]; then
        compose_file="docker-compose.yml"
    fi
    
    if [ ! -f "$compose_file" ]; then
        log "ERROR" "Docker Compose文件不存在: $compose_file"
        exit 1
    fi
    
    # 停止现有服务
    log "INFO" "停止现有服务..."
    docker-compose -f "$compose_file" down --remove-orphans || true
    
    # 启动新服务
    log "INFO" "启动新服务..."
    docker-compose -f "$compose_file" up -d
    
    # 等待服务启动
    log "INFO" "等待服务启动..."
    sleep 30
    
    log "SUCCESS" "应用部署完成"
}

# 健康检查
perform_health_check() {
    if [ "$HEALTH_CHECK_ENABLED" != "true" ]; then
        log "INFO" "跳过健康检查"
        return 0
    fi
    
    log "INFO" "执行健康检查..."
    
    local health_url="http://localhost:${PORT:-3000}/health"
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log "DEBUG" "健康检查尝试 $attempt/$max_attempts"
        
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log "SUCCESS" "健康检查通过"
            return 0
        fi
        
        sleep 10
        attempt=$((attempt + 1))
    done
    
    log "ERROR" "健康检查失败"
    return 1
}

# 执行回滚
perform_rollback() {
    log "WARN" "执行回滚操作..."
    
    # 查找最新的备份
    local latest_backup=$(ls -t "$BACKUP_DIR" | head -1)
    
    if [ -z "$latest_backup" ]; then
        log "ERROR" "没有找到可用的备份"
        return 1
    fi
    
    local backup_path="$BACKUP_DIR/$latest_backup"
    log "INFO" "使用备份: $backup_path"
    
    # 恢复Docker镜像
    if [ -f "$backup_path/docker-image.tar.gz" ]; then
        log "INFO" "恢复Docker镜像..."
        gunzip -c "$backup_path/docker-image.tar.gz" | docker load
    fi
    
    # 重新部署
    deploy_application
    
    log "SUCCESS" "回滚完成"
}

# 清理旧版本
cleanup_old_versions() {
    log "INFO" "清理旧版本..."
    
    # 清理旧的Docker镜像
    log "INFO" "清理旧的Docker镜像..."
    docker image prune -f
    
    # 清理旧的备份（保留最近10个）
    log "INFO" "清理旧的备份..."
    cd "$BACKUP_DIR"
    ls -t | tail -n +11 | xargs -r rm -rf
    
    log "SUCCESS" "清理完成"
}

# 显示部署状态
show_deployment_status() {
    log "INFO" "部署状态:"
    
    # Docker容器状态
    echo -e "\n${CYAN}Docker容器状态:${NC}"
    docker-compose ps
    
    # 服务健康状态
    echo -e "\n${CYAN}服务健康状态:${NC}"
    local health_url="http://localhost:${PORT:-3000}/health"
    if curl -f -s "$health_url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 服务正常运行${NC}"
    else
        echo -e "${RED}✗ 服务异常${NC}"
    fi
    
    # 资源使用情况
    echo -e "\n${CYAN}资源使用情况:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# 显示日志
show_logs() {
    local lines="${1:-100}"
    
    log "INFO" "显示最近 $lines 行日志:"
    
    # 应用日志
    echo -e "\n${CYAN}应用日志:${NC}"
    docker-compose logs --tail="$lines" app
    
    # 部署日志
    echo -e "\n${CYAN}部署日志:${NC}"
    tail -n "$lines" "$LOG_FILE"
}

# 主执行函数
main() {
    # 解析参数
    parse_arguments "$@"
    validate_arguments
    initialize_environment
    
    # 检查系统要求
    check_system_requirements
    
    # 执行对应的动作
    case $ACTION in
        deploy)
            load_environment_config
            create_backup
            pull_latest_code
            build_docker_image
            deploy_application
            
            if perform_health_check; then
                cleanup_old_versions
                log "SUCCESS" "部署成功完成"
            else
                if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
                    perform_rollback
                else
                    log "ERROR" "部署失败，请手动检查"
                    exit 1
                fi
            fi
            ;;
        rollback)
            perform_rollback
            ;;
        status)
            show_deployment_status
            ;;
        logs)
            show_logs
            ;;
        cleanup)
            cleanup_old_versions
            ;;
    esac
    
    local end_time=$(date '+%Y-%m-%d %H:%M:%S')
    log "SUCCESS" "=== 脚本执行完成 ($end_time) ==="
}

# 错误处理
handle_error() {
    local exit_code=$?
    log "ERROR" "脚本执行失败，退出码: $exit_code"
    
    if [ "$ROLLBACK_ON_FAILURE" = "true" ] && [ "$ACTION" = "deploy" ]; then
        log "WARN" "尝试自动回滚..."
        perform_rollback || log "ERROR" "自动回滚失败"
    fi
    
    exit $exit_code
}

trap handle_error ERR

# 执行主函数
main "$@"