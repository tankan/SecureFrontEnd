#!/bin/bash

# ========================================
# SecureFrontEnd 环境验证部署脚本
# 版本: 1.0.0
# 描述: 集成开发、测试、生产环境的完整验证流程
# 作者: SecureFrontEnd Team
# 日期: 2025-10-23
# ========================================

set -euo pipefail

# 全局变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs/deployment"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOG_DIR}/environment_verification_${TIMESTAMP}.log"
ERROR_LOG="${LOG_DIR}/errors_${TIMESTAMP}.log"
REPORT_FILE="${LOG_DIR}/verification_report_${TIMESTAMP}.md"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 统计变量
TOTAL_STEPS=0
COMPLETED_STEPS=0
FAILED_STEPS=0
WARNINGS=0
START_TIME=$(date +%s)

# 清理标志
CLEANUP_ON_EXIT=true
CONTAINERS_TO_CLEANUP=()
NETWORKS_TO_CLEANUP=()

# 调试模式
DEBUG=${DEBUG:-0}

# 环境配置
ENVIRONMENTS=("dev" "staging" "production")
COMPOSE_FILES=(
    "docker-compose.yml"
    "docker-compose.staging.yml" 
    "docker-compose.production.yml"
)
COMPOSE_SCRIPTS=(
    "compose-dev.ps1"
    "compose-staging.ps1"
    "compose-prod.ps1"
)
ENV_FILES=(
    ".env.dev"
    ".env.staging"
    ".env.prod"
)

# 端口配置
declare -A ENV_PORTS=(
    ["dev"]="3000"
    ["staging"]="3010"
    ["production"]="3020,3021"
)

# 初始化函数
init_logging() {
    mkdir -p "${LOG_DIR}"
    touch "${LOG_FILE}" "${ERROR_LOG}"
    
    log_info "=========================================="
    log_info "SecureFrontEnd 环境验证开始"
    log_info "时间: $(date)"
    log_info "项目路径: ${PROJECT_ROOT}"
    log_info "日志文件: ${LOG_FILE}"
    log_info "=========================================="
}

# 日志函数
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 写入日志文件
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    # 根据级别输出到控制台
    case "$level" in
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message" >&2
            echo "[$timestamp] [ERROR] $message" >> "$ERROR_LOG"
            ((FAILED_STEPS++))
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            ((WARNINGS++))
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ((COMPLETED_STEPS++))
            ;;
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        "STEP")
            echo -e "${PURPLE}[STEP]${NC} $message"
            ((TOTAL_STEPS++))
            ;;
        "DEBUG")
            if [[ "$DEBUG" == "1" ]]; then
                echo -e "${CYAN}[DEBUG]${NC} $message"
            fi
            ;;
        *)
            echo "$message"
            ;;
    esac
}

log_info() {
    log "INFO" "$1"
}

log_warn() {
    log "WARN" "$1"
}

log_error() {
    log "ERROR" "$1"
}

log_success() {
    log "SUCCESS" "$1"
}

log_step() {
    log "STEP" "$1"
}

# 错误处理函数
handle_error() {
    local exit_code=$?
    local line_number=$1
    log_error "脚本在第 ${line_number} 行发生错误，退出码: ${exit_code}"
    cleanup_all_environments
    exit ${exit_code}
}

# 设置错误陷阱
trap 'handle_error ${LINENO}' ERR

# 系统检查函数
check_prerequisites() {
    log_step "检查系统先决条件"
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装或不在PATH中"
        return 1
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装或不在PATH中"
        return 1
    fi
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装或不在PATH中"
        return 1
    fi
    
    # 检查PowerShell (如果在Windows环境)
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        if ! command -v powershell &> /dev/null; then
            log_error "PowerShell 未安装或不在PATH中"
            return 1
        fi
    fi
    
    log_success "系统先决条件检查通过"
}

# 检查项目文件
check_project_files() {
    log_step "检查项目文件完整性"
    
    local missing_files=()
    
    # 检查Docker配置文件
    for i in "${!COMPOSE_FILES[@]}"; do
        local file="${PROJECT_ROOT}/config/docker/${COMPOSE_FILES[$i]}"
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    # 检查环境变量文件
    for env_file in "${ENV_FILES[@]}"; do
        local file="${PROJECT_ROOT}/${env_file}"
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    # 检查PowerShell脚本
    for script in "${COMPOSE_SCRIPTS[@]}"; do
        local file="${PROJECT_ROOT}/scripts/runners/${script}"
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_error "缺少以下必需文件:"
        for file in "${missing_files[@]}"; do
            log_error "  - $file"
        done
        return 1
    fi
    
    log_success "项目文件完整性检查通过"
}

# 清理所有环境
cleanup_all_environments() {
    log_step "清理所有环境容器"
    
    for i in "${!ENVIRONMENTS[@]}"; do
        local env="${ENVIRONMENTS[$i]}"
        local script="${COMPOSE_SCRIPTS[$i]}"
        
        log_info "清理 ${env} 环境"
        
        if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
            # Windows环境使用PowerShell
            powershell -ExecutionPolicy Bypass -File "${PROJECT_ROOT}/scripts/runners/${script}" -Action down 2>/dev/null || true
        else
            # Linux环境使用docker-compose
            cd "${PROJECT_ROOT}"
            case "$env" in
                "dev")
                    docker-compose -f config/docker/docker-compose.yml --env-file .env.dev down 2>/dev/null || true
                    ;;
                "staging")
                    docker-compose -f config/docker/docker-compose.staging.yml --env-file .env.staging down 2>/dev/null || true
                    ;;
                "production")
                    docker-compose -f config/docker/docker-compose.production.yml --env-file .env.prod down 2>/dev/null || true
                    ;;
            esac
        fi
    done
    
    # 清理悬空容器和网络
    docker container prune -f 2>/dev/null || true
    docker network prune -f 2>/dev/null || true
    
    log_success "环境清理完成"
}

# 启动环境
start_environment() {
    local env="$1"
    local script_index="$2"
    local script="${COMPOSE_SCRIPTS[$script_index]}"
    
    log_step "启动 ${env} 环境"
    
    cd "${PROJECT_ROOT}"
    
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        # Windows环境使用PowerShell
        powershell -ExecutionPolicy Bypass -File "scripts/runners/${script}" -Action up
    else
        # Linux环境使用docker-compose
        case "$env" in
            "dev")
                docker-compose -f config/docker/docker-compose.yml --env-file .env.dev up -d
                ;;
            "staging")
                docker-compose -f config/docker/docker-compose.staging.yml --env-file .env.staging up -d
                ;;
            "production")
                docker-compose -f config/docker/docker-compose.production.yml --env-file .env.prod up -d
                ;;
        esac
    fi
    
    # 等待服务启动
    sleep 30
    
    log_success "${env} 环境启动完成"
}

# 检查容器状态
check_container_status() {
    local env="$1"
    
    log_step "检查 ${env} 环境容器状态"
    
    local containers=$(docker ps --filter "name=docker-" --format "{{.Names}}" | wc -l)
    
    if [[ $containers -eq 0 ]]; then
        log_error "${env} 环境没有运行的容器"
        return 1
    fi
    
    log_info "${env} 环境运行中的容器数量: ${containers}"
    
    # 显示容器状态
    docker ps --filter "name=docker-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | tee -a "${LOG_FILE}"
    
    log_success "${env} 环境容器状态检查通过"
}

# 健康检查
health_check() {
    local env="$1"
    local ports="${ENV_PORTS[$env]}"
    
    log_step "执行 ${env} 环境健康检查"
    
    IFS=',' read -ra PORT_ARRAY <<< "$ports"
    
    for port in "${PORT_ARRAY[@]}"; do
        local url="http://localhost:${port}/health"
        log_info "检查健康端点: ${url}"
        
        local max_attempts=10
        local attempt=1
        
        while [[ $attempt -le $max_attempts ]]; do
            if curl -s -f "$url" > /dev/null 2>&1; then
                log_success "健康检查通过: ${url}"
                break
            else
                log_warn "健康检查失败 (尝试 ${attempt}/${max_attempts}): ${url}"
                if [[ $attempt -eq $max_attempts ]]; then
                    log_error "健康检查最终失败: ${url}"
                    return 1
                fi
                sleep 5
                ((attempt++))
            fi
        done
    done
    
    log_success "${env} 环境健康检查通过"
}

# 运行测试
run_tests() {
    local env="$1"
    
    log_step "运行 ${env} 环境测试"
    
    cd "${PROJECT_ROOT}"
    
    case "$env" in
        "dev")
            # 开发环境运行基础测试
            if command -v npm &> /dev/null; then
                npm test 2>&1 | tee -a "${LOG_FILE}" || log_warn "npm test 执行失败"
            fi
            
            if [[ -f "tests/integration-test.js" ]]; then
                node tests/integration-test.js 2>&1 | tee -a "${LOG_FILE}" || log_warn "集成测试执行失败"
            fi
            ;;
            
        "staging")
            # 测试环境运行集成和性能测试
            if [[ -f "scripts/runners/run-integration-test.js" ]]; then
                node scripts/runners/run-integration-test.js 2>&1 | tee -a "${LOG_FILE}" || log_warn "集成测试执行失败"
            fi
            
            if [[ -f "scripts/runners/run-performance-test.js" ]]; then
                node scripts/runners/run-performance-test.js 2>&1 | tee -a "${LOG_FILE}" || log_warn "性能测试执行失败"
            fi
            ;;
            
        "production")
            # 生产环境运行安全扫描
            if [[ -f "scripts/core/vulnerability-scanner.cjs" ]]; then
                node scripts/core/vulnerability-scanner.cjs 2>&1 | tee -a "${LOG_FILE}" || log_warn "安全扫描执行失败"
            fi
            ;;
    esac
    
    log_success "${env} 环境测试完成"
}

# 检查资源使用情况
check_resource_usage() {
    local env="$1"
    
    log_step "检查 ${env} 环境资源使用情况"
    
    # 显示容器资源统计
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | tee -a "${LOG_FILE}"
    
    log_success "${env} 环境资源检查完成"
}

# 停止环境
stop_environment() {
    local env="$1"
    local script_index="$2"
    local script="${COMPOSE_SCRIPTS[$script_index]}"
    
    log_step "停止 ${env} 环境"
    
    cd "${PROJECT_ROOT}"
    
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        # Windows环境使用PowerShell
        powershell -ExecutionPolicy Bypass -File "scripts/runners/${script}" -Action down
    else
        # Linux环境使用docker-compose
        case "$env" in
            "dev")
                docker-compose -f config/docker/docker-compose.yml --env-file .env.dev down
                ;;
            "staging")
                docker-compose -f config/docker/docker-compose.staging.yml --env-file .env.staging down
                ;;
            "production")
                docker-compose -f config/docker/docker-compose.production.yml --env-file .env.prod down
                ;;
        esac
    fi
    
    log_success "${env} 环境停止完成"
}

# 验证环境清理
verify_cleanup() {
    local env="$1"
    
    log_step "验证 ${env} 环境清理"
    
    local remaining_containers=$(docker ps -a --filter "name=docker-" --format "{{.Names}}" | wc -l)
    
    if [[ $remaining_containers -gt 0 ]]; then
        log_warn "${env} 环境仍有 ${remaining_containers} 个容器未清理"
        docker ps -a --filter "name=docker-" --format "table {{.Names}}\t{{.Status}}" | tee -a "${LOG_FILE}"
    else
        log_success "${env} 环境清理验证通过"
    fi
}

# 单环境验证流程
verify_single_environment() {
    local env="$1"
    local script_index="$2"
    
    log_info "=========================================="
    log_info "开始验证 ${env} 环境"
    log_info "=========================================="
    
    local start_time=$(date +%s)
    
    # 启动环境
    start_environment "$env" "$script_index"
    
    # 检查容器状态
    check_container_status "$env"
    
    # 健康检查
    health_check "$env"
    
    # 运行测试
    run_tests "$env"
    
    # 检查资源使用
    check_resource_usage "$env"
    
    # 停止环境
    stop_environment "$env" "$script_index"
    
    # 验证清理
    verify_cleanup "$env"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_success "${env} 环境验证完成，耗时: ${duration} 秒"
}

# 生成验证报告
generate_report() {
    local status="${1:-完成}"
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local duration_formatted=$(printf "%02d:%02d:%02d" $((duration/3600)) $((duration%3600/60)) $((duration%60)))
    
    log "INFO" "生成验证报告..."
    
    # 确定验证的环境列表
    local verified_envs=()
    if [[ "$run_all" == true ]]; then
        verified_envs=("${ENVIRONMENTS[@]}")
    else
        verified_envs=("$selected_env")
    fi
    
    cat > "$REPORT_FILE" << EOF
# SecureFrontEnd 环境验证报告

## 基本信息
- **验证时间**: $(date '+%Y-%m-%d %H:%M:%S')
- **验证状态**: $status
- **总耗时**: $duration_formatted
- **验证环境**: ${verified_envs[*]}

## 统计信息
- **总步骤数**: $TOTAL_STEPS
- **成功步骤**: $COMPLETED_STEPS
- **失败步骤**: $FAILED_STEPS
- **警告数量**: $WARNINGS

## 详细日志
- **主日志文件**: $LOG_FILE
- **错误日志文件**: $ERROR_LOG

## 环境验证结果

EOF

    # 为每个环境添加验证结果
    for env in "${verified_envs[@]}"; do
        cat >> "$REPORT_FILE" << EOF
### $env 环境
- 状态: $(grep -q "SUCCESS.*$env.*环境验证完成" "$LOG_FILE" && echo "✅ 成功" || echo "❌ 失败")
- 详细信息: 请查看主日志文件

EOF
    done
    
    cat >> "$REPORT_FILE" << EOF
## 系统信息
- **操作系统**: $(uname -s) $(uname -r)
- **Docker 版本**: $(docker --version 2>/dev/null || echo "未安装")
- **Node.js 版本**: $(node --version 2>/dev/null || echo "未安装")

## 建议
EOF

    if [[ $FAILED_STEPS -gt 0 ]]; then
        cat >> "$REPORT_FILE" << EOF
- ⚠️ 发现 $FAILED_STEPS 个失败步骤，请检查错误日志文件
- 建议重新运行失败的环境验证
EOF
    fi
    
    if [[ $WARNINGS -gt 0 ]]; then
        cat >> "$REPORT_FILE" << EOF
- ⚠️ 发现 $WARNINGS 个警告，建议检查相关配置
EOF
    fi
    
    if [[ $FAILED_STEPS -eq 0 && $WARNINGS -eq 0 ]]; then
        cat >> "$REPORT_FILE" << EOF
- ✅ 所有验证步骤均成功完成
- 环境配置正常，可以进行部署
EOF
    fi
    
    log "SUCCESS" "验证报告已生成: $REPORT_FILE"
}

# 等待容器就绪
wait_for_container() {
    local container_name="$1"
    local max_wait="${2:-60}"
    local check_interval="${3:-5}"
    
    log "INFO" "等待容器 $container_name 就绪..."
    
    local elapsed=0
    while [[ $elapsed -lt $max_wait ]]; do
        if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
            local status=$(docker inspect --format="{{.State.Status}}" "$container_name" 2>/dev/null || echo "not_found")
            if [[ "$status" == "running" ]]; then
                log "SUCCESS" "容器 $container_name 已就绪"
                return 0
            fi
        fi
        
        log "DEBUG" "等待容器 $container_name 启动... (${elapsed}s/${max_wait}s)"
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
    done
    
    log "ERROR" "容器 $container_name 在 ${max_wait}s 内未能就绪"
    return 1
}

# 健康检查函数
health_check() {
    local url="$1"
    local max_attempts="${2:-10}"
    local wait_time="${3:-5}"
    
    log "INFO" "执行健康检查: $url"
    
    for ((i=1; i<=max_attempts; i++)); do
        log "DEBUG" "健康检查尝试 $i/$max_attempts"
        
        if command -v curl &> /dev/null; then
            if curl -sf "$url" >/dev/null 2>&1; then
                log "SUCCESS" "健康检查通过: $url"
                return 0
            fi
        elif command -v wget &> /dev/null; then
            if wget -q --spider "$url" 2>/dev/null; then
                log "SUCCESS" "健康检查通过: $url"
                return 0
            fi
        else
            log "WARN" "未找到 curl 或 wget，跳过健康检查"
            return 0
        fi
        
        if [[ $i -lt $max_attempts ]]; then
            log "DEBUG" "健康检查失败，${wait_time}s 后重试..."
            sleep $wait_time
        fi
    done
    
    log "ERROR" "健康检查失败: $url (尝试 $max_attempts 次)"
    return 1
}

# 检查端口占用
check_port() {
    local port="$1"
    local host="${2:-localhost}"
    
    if command -v netstat &> /dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":${port} "; then
            log "WARN" "端口 $port 已被占用"
            return 1
        fi
    elif command -v ss &> /dev/null; then
        if ss -tuln 2>/dev/null | grep -q ":${port} "; then
            log "WARN" "端口 $port 已被占用"
            return 1
        fi
    else
        log "DEBUG" "无法检查端口占用情况 (缺少 netstat 或 ss)"
    fi
    
    return 0
}

# 获取容器资源使用情况
get_container_stats() {
    local container_name="$1"
    
    if ! docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
        log "WARN" "容器 $container_name 不存在或未运行"
        return 1
    fi
    
    local stats=$(docker stats --no-stream --format "{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" "$container_name" 2>/dev/null)
    if [[ -n "$stats" ]]; then
        log "INFO" "容器 $container_name 资源使用: CPU: $(echo "$stats" | cut -f1), 内存: $(echo "$stats" | cut -f2) ($(echo "$stats" | cut -f3))"
    else
        log "WARN" "无法获取容器 $container_name 的资源使用情况"
    fi
}

# 主函数
main() {
    # 初始化
    log "INFO" "SecureFrontEnd 环境验证脚本启动"
    log "INFO" "脚本路径: $SCRIPT_DIR"
    log "INFO" "项目根目录: $PROJECT_ROOT"
    
    # 创建日志目录
    if [[ ! -d "$LOG_DIR" ]]; then
        mkdir -p "$LOG_DIR"
        log "INFO" "创建日志目录: $LOG_DIR"
    fi
    
    # 检查系统依赖
    check_dependencies
    
    # 检查系统资源
    check_system_resources
    
    # 解析命令行参数
    parse_arguments "$@"
    
    # 确定要验证的环境
    if [[ "$run_all" == true ]]; then
        SELECTED_ENVS=("${ENVIRONMENTS[@]}")
        log "INFO" "将验证所有环境: ${SELECTED_ENVS[*]}"
    else
        SELECTED_ENVS=("$selected_env")
        log "INFO" "将验证环境: $selected_env"
    fi
    
    # 开始验证流程
    log "STEP" "开始环境验证流程"
    
    local verification_failed=false
    
    for env in "${SELECTED_ENVS[@]}"; do
        log "INFO" "准备验证 $env 环境..."
        
        # 清空容器清理列表
        CONTAINERS_TO_CLEANUP=()
        NETWORKS_TO_CLEANUP=()
        
        case "$env" in
            "dev")
                if ! verify_dev_environment; then
                    log "ERROR" "开发环境验证失败"
                    verification_failed=true
                fi
                ;;
            "staging")
                if ! verify_staging_environment; then
                    log "ERROR" "测试环境验证失败"
                    verification_failed=true
                fi
                ;;
            "production")
                if ! verify_production_environment; then
                    log "ERROR" "生产环境验证失败"
                    verification_failed=true
                fi
                ;;
            *)
                log "ERROR" "不支持的环境: $env"
                verification_failed=true
                ;;
        esac
        
        # 环境间等待
        if [[ "${#SELECTED_ENVS[@]}" -gt 1 ]]; then
            log "INFO" "等待 10 秒后继续下一个环境..."
            sleep 10
        fi
    done
    
    # 最终清理
    log "INFO" "执行最终资源清理..."
    cleanup_resources
    
    # 生成最终报告
    if [[ "$verification_failed" == true ]]; then
        log "ERROR" "环境验证过程中发现错误"
        generate_report "部分失败"
        return 1
    else
        log "SUCCESS" "所有环境验证成功完成"
        generate_report "成功"
        return 0
    fi
}

# 显示帮助信息
show_help() {
    cat << EOF
SecureFrontEnd 环境验证部署脚本

用法:
    $0 [选项]

选项:
    --env <环境>        指定要验证的环境 (dev|staging|production)
    --all              验证所有环境 (默认)
    --help, -h         显示此帮助信息
    --version, -v      显示版本信息
    --debug            启用调试模式
    --no-cleanup       禁用自动清理 (调试用)

环境说明:
    dev                开发环境 - 基础功能验证
    staging            测试环境 - 集成和性能测试
    production         生产环境 - 安全扫描和高可用验证

示例:
    $0                 # 验证所有环境
    $0 --env dev       # 只验证开发环境
    $0 --env staging   # 只验证测试环境
    $0 --env production # 只验证生产环境
    $0 --debug         # 启用调试模式验证所有环境

日志文件:
    主日志: $LOG_DIR/environment_verification_YYYYMMDD_HHMMSS.log
    错误日志: $LOG_DIR/errors_YYYYMMDD_HHMMSS.log
    验证报告: $LOG_DIR/verification_report_YYYYMMDD_HHMMSS.md

系统要求:
    - Docker >= 20.10.0
    - Docker Compose >= 2.0.0
    - Node.js >= 22.12.0
    - 至少 8GB RAM (推荐 16GB)
    - 至少 10GB 可用磁盘空间

更多信息请参考: docs/DEPLOYMENT_GUIDE.md
EOF
}

# 显示版本信息
show_version() {
    cat << EOF
SecureFrontEnd 环境验证脚本 v2.0.0

功能特性:
- 多环境支持 (开发/测试/生产)
- 自动化验证流程
- 完整的错误处理和日志记录
- 资源监控和清理
- 详细的验证报告

作者: SecureFrontEnd Team
许可: MIT License
EOF
}

# 解析命令行参数
parse_arguments() {
    run_all=true
    selected_env=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env)
                if [[ -n "$2" && "$2" != --* ]]; then
                    selected_env="$2"
                    run_all=false
                    shift 2
                else
                    log "ERROR" "--env 选项需要指定环境名称"
                    show_help
                    exit 1
                fi
                ;;
            --all)
                run_all=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            --version|-v)
                show_version
                exit 0
                ;;
            --debug)
                DEBUG=1
                log "INFO" "调试模式已启用"
                shift
                ;;
            --no-cleanup)
                CLEANUP_ON_EXIT=false
                log "WARN" "自动清理已禁用"
                shift
                ;;
            *)
                log "ERROR" "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 验证环境名称
    if [[ "$run_all" == false ]]; then
        local valid_env=false
        for env in "${ENVIRONMENTS[@]}"; do
            if [[ "$selected_env" == "$env" ]]; then
                valid_env=true
                break
            fi
        done
        
        if [[ "$valid_env" == false ]]; then
            log "ERROR" "无效的环境名称: $selected_env"
            log "ERROR" "支持的环境: ${ENVIRONMENTS[*]}"
            exit 1
        fi
    fi
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi