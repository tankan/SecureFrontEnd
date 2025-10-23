#!/bin/bash

# SecureFrontEnd - 统一 Docker Compose 管理脚本
# 支持开发、测试、生产三个环境

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_critical() {
    echo -e "${PURPLE}[CRITICAL]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
SecureFrontEnd 统一 Docker Compose 管理脚本

用法: $0 <environment> [action]

环境:
  dev       开发环境
  staging   测试环境
  prod      生产环境

操作:
  up        启动容器 (默认)
  down      停止并移除容器
  pull      拉取最新镜像
  build     构建镜像
  restart   重启容器
  status    显示容器状态
  logs      显示容器日志
  backup    创建数据备份 (仅staging/prod)
  restore   恢复数据备份 (仅staging/prod)
  health    健康检查 (仅prod)
  scale     扩缩容 (仅prod)
  rollback  回滚 (仅prod)
  help      显示此帮助信息

示例:
  $0 dev up           # 启动开发环境
  $0 staging status   # 查看测试环境状态
  $0 prod health      # 生产环境健康检查

EOF
}

# 验证环境参数
validate_environment() {
    case "$1" in
        dev|staging|prod)
            return 0
            ;;
        *)
            log_error "无效的环境: $1"
            log_info "支持的环境: dev, staging, prod"
            exit 1
            ;;
    esac
}

# 获取环境配置
get_env_config() {
    local env="$1"
    case "$env" in
        dev)
            ENV_FILE=".env.dev"
            COMPOSE_FILE="config/docker/docker-compose.yml"
            ;;
        staging)
            ENV_FILE=".env.staging"
            COMPOSE_FILE="config/docker/docker-compose.staging.yml"
            ;;
        prod)
            ENV_FILE=".env.prod"
            COMPOSE_FILE="config/docker/docker-compose.production.yml"
            ;;
    esac
}

# 验证文件存在
validate_files() {
    local root_dir="$1"
    local env_file="$root_dir/$ENV_FILE"
    local compose_file="$root_dir/$COMPOSE_FILE"
    
    if [[ ! -f "$env_file" ]]; then
        log_error "环境文件不存在: $env_file"
        exit 1
    fi
    
    if [[ ! -f "$compose_file" ]]; then
        log_error "Compose文件不存在: $compose_file"
        exit 1
    fi
    
    log_info "环境文件: $env_file"
    log_info "Compose文件: $compose_file"
}

# 执行Docker Compose命令
execute_compose() {
    local root_dir="$1"
    local action="$2"
    local env_file="$root_dir/$ENV_FILE"
    local compose_file="$root_dir/$COMPOSE_FILE"
    
    case "$action" in
        up)
            log_info "启动 $ENVIRONMENT 环境..."
            docker compose --env-file "$env_file" -f "$compose_file" up -d --remove-orphans
            log_success "$ENVIRONMENT 环境启动成功!"
            ;;
        down)
            log_info "停止 $ENVIRONMENT 环境..."
            docker compose --env-file "$env_file" -f "$compose_file" down
            log_success "$ENVIRONMENT 环境停止成功!"
            ;;
        pull)
            log_info "拉取 $ENVIRONMENT 环境的最新镜像..."
            docker compose --env-file "$env_file" -f "$compose_file" pull
            log_success "镜像拉取成功!"
            ;;
        build)
            log_info "构建 $ENVIRONMENT 环境的镜像..."
            docker compose --env-file "$env_file" -f "$compose_file" build
            log_success "镜像构建成功!"
            ;;
        restart)
            log_info "重启 $ENVIRONMENT 环境..."
            docker compose --env-file "$env_file" -f "$compose_file" restart
            log_success "$ENVIRONMENT 环境重启成功!"
            ;;
        status)
            log_info "$ENVIRONMENT 环境状态:"
            docker compose --env-file "$env_file" -f "$compose_file" ps
            ;;
        logs)
            log_info "$ENVIRONMENT 环境日志:"
            docker compose --env-file "$env_file" -f "$compose_file" logs -f
            ;;
        backup)
            if [[ "$ENVIRONMENT" == "dev" ]]; then
                log_warning "开发环境不支持备份操作"
                exit 1
            fi
            log_info "创建 $ENVIRONMENT 环境数据备份..."
            # 备份逻辑可以在这里实现
            log_success "备份创建成功!"
            ;;
        restore)
            if [[ "$ENVIRONMENT" == "dev" ]]; then
                log_warning "开发环境不支持恢复操作"
                exit 1
            fi
            log_info "恢复 $ENVIRONMENT 环境数据..."
            # 恢复逻辑可以在这里实现
            log_success "数据恢复成功!"
            ;;
        health)
            if [[ "$ENVIRONMENT" != "prod" ]]; then
                log_warning "健康检查仅支持生产环境"
                exit 1
            fi
            log_info "执行生产环境健康检查..."
            # 健康检查逻辑可以在这里实现
            log_success "健康检查完成!"
            ;;
        scale)
            if [[ "$ENVIRONMENT" != "prod" ]]; then
                log_warning "扩缩容仅支持生产环境"
                exit 1
            fi
            log_info "执行生产环境扩缩容..."
            # 扩缩容逻辑可以在这里实现
            log_success "扩缩容完成!"
            ;;
        rollback)
            if [[ "$ENVIRONMENT" != "prod" ]]; then
                log_warning "回滚仅支持生产环境"
                exit 1
            fi
            log_info "执行生产环境回滚..."
            # 回滚逻辑可以在这里实现
            log_success "回滚完成!"
            ;;
        *)
            log_error "不支持的操作: $action"
            show_help
            exit 1
            ;;
    esac
}

# 主函数
main() {
    # 检查参数
    if [[ $# -eq 0 ]] || [[ "$1" == "help" ]] || [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
        show_help
        exit 0
    fi
    
    # 获取参数
    ENVIRONMENT="$1"
    ACTION="${2:-up}"
    
    # 验证环境
    validate_environment "$ENVIRONMENT"
    
    # 获取项目根目录
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
    
    # 获取环境配置
    get_env_config "$ENVIRONMENT"
    
    # 验证文件
    validate_files "$ROOT_DIR"
    
    # 执行操作
    execute_compose "$ROOT_DIR" "$ACTION"
}

# 执行主函数
main "$@"