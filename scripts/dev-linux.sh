#!/bin/bash

# SecureFrontEnd Linux Development Environment Setup Script
# 适用于Linux/macOS的开发环境启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 检查系统要求
check_requirements() {
    log_info "检查系统要求..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装。请安装 Node.js >= 22.12.0"
        exit 1
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local required_version="18.0.0"
    
    if ! printf '%s\n%s\n' "$required_version" "$node_version" | sort -V -C; then
        log_error "Node.js 版本过低。当前版本: $node_version，要求版本: >= $required_version"
        exit 1
    fi
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装。请安装 Docker >= 20.10.0"
        exit 1
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装。请安装 Docker Compose >= 2.0.0"
        exit 1
    fi
    
    log_success "系统要求检查通过"
}

# 设置环境变量
setup_environment() {
    log_info "设置开发环境变量..."
    
    # 确保使用Linux路径分隔符
    export PATH_SEPARATOR="/"
    export NODE_ENV="development"
    export PLATFORM="linux"
    
    # 检查并创建必要的目录
    local dirs=("logs" "logs/development" "data" "uploads" "temp")
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_info "创建目录: $dir"
        fi
    done
    
    # 设置文件权限（Linux特有）
    chmod 755 scripts/dev-linux.sh 2>/dev/null || true
    chmod 755 scripts/deploy/environment-verification.sh 2>/dev/null || true
    
    log_success "环境变量设置完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        npm ci --production=false
        log_success "依赖安装完成"
    else
        log_info "依赖已是最新，跳过安装"
    fi
}

# 启动开发服务
start_development() {
    local mode=${1:-"full"}
    
    case $mode in
        "app")
            log_info "启动应用程序（仅应用）..."
            node scripts/dev.js
            ;;
        "docker")
            log_info "启动Docker开发环境..."
            if command -v docker-compose &> /dev/null; then
                docker-compose --env-file .env.dev -f config/docker/docker-compose.yml up -d
            else
                docker compose --env-file .env.dev -f config/docker/docker-compose.yml up -d
            fi
            log_success "Docker环境启动完成"
            ;;
        "full")
            log_info "启动完整开发环境..."
            
            # 启动Docker服务
            if command -v docker-compose &> /dev/null; then
                docker-compose --env-file .env.dev -f config/docker/docker-compose.yml up -d
            else
                docker compose --env-file .env.dev -f config/docker/docker-compose.yml up -d
            fi
            
            # 等待服务启动
            sleep 5
            
            # 启动应用程序
            node scripts/dev.js &
            
            log_success "完整开发环境启动完成"
            ;;
        *)
            log_error "未知的启动模式: $mode"
            show_help
            exit 1
            ;;
    esac
}

# 停止开发服务
stop_development() {
    log_info "停止开发环境..."
    
    # 停止Docker服务
    if command -v docker-compose &> /dev/null; then
        docker-compose --env-file .env.dev -f config/docker/docker-compose.yml down
    else
        docker compose --env-file .env.dev -f config/docker/docker-compose.yml down
    fi
    
    # 停止Node.js进程
    pkill -f "node scripts/dev.js" 2>/dev/null || true
    
    log_success "开发环境已停止"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 检查Docker服务状态
    if command -v docker-compose &> /dev/null; then
        docker-compose --env-file .env.dev -f config/docker/docker-compose.yml ps
    else
        docker compose --env-file .env.dev -f config/docker/docker-compose.yml ps
    fi
    
    # 检查应用程序端口
    local ports=("3000" "5432" "6379" "9090" "3001")
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            log_success "端口 $port 正在监听"
        else
            log_warning "端口 $port 未在监听"
        fi
    done
}

# 显示帮助信息
show_help() {
    echo "SecureFrontEnd Linux 开发环境脚本"
    echo ""
    echo "用法: $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  start [mode]    启动开发环境"
    echo "    - app         仅启动应用程序"
    echo "    - docker      仅启动Docker服务"
    echo "    - full        启动完整环境（默认）"
    echo "  stop            停止开发环境"
    echo "  restart [mode]  重启开发环境"
    echo "  status          检查服务状态"
    echo "  logs            查看服务日志"
    echo "  clean           清理临时文件和容器"
    echo "  help            显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start        # 启动完整开发环境"
    echo "  $0 start app    # 仅启动应用程序"
    echo "  $0 stop         # 停止所有服务"
    echo "  $0 status       # 检查服务状态"
}

# 查看日志
show_logs() {
    local service=${1:-"all"}
    
    case $service in
        "app")
            tail -f logs/development/*.log 2>/dev/null || log_warning "应用程序日志文件不存在"
            ;;
        "docker")
            if command -v docker-compose &> /dev/null; then
                docker-compose --env-file .env.dev -f config/docker/docker-compose.yml logs -f
            else
                docker compose --env-file .env.dev -f config/docker/docker-compose.yml logs -f
            fi
            ;;
        "all"|*)
            log_info "显示所有服务日志..."
            if command -v docker-compose &> /dev/null; then
                docker-compose --env-file .env.dev -f config/docker/docker-compose.yml logs -f &
            else
                docker compose --env-file .env.dev -f config/docker/docker-compose.yml logs -f &
            fi
            tail -f logs/development/*.log 2>/dev/null || true
            ;;
    esac
}

# 清理环境
clean_environment() {
    log_info "清理开发环境..."
    
    # 停止服务
    stop_development
    
    # 清理Docker资源
    docker system prune -f 2>/dev/null || true
    
    # 清理临时文件
    rm -rf temp/* 2>/dev/null || true
    rm -rf logs/development/*.log 2>/dev/null || true
    
    log_success "环境清理完成"
}

# 主函数
main() {
    local command=${1:-"start"}
    local option=${2:-"full"}
    
    # 检查是否在项目根目录
    if [ ! -f "package.json" ]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi
    
    case $command in
        "start")
            check_requirements
            setup_environment
            install_dependencies
            start_development "$option"
            ;;
        "stop")
            stop_development
            ;;
        "restart")
            stop_development
            sleep 2
            check_requirements
            setup_environment
            start_development "$option"
            ;;
        "status")
            health_check
            ;;
        "logs")
            show_logs "$option"
            ;;
        "clean")
            clean_environment
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 捕获中断信号
trap 'log_info "收到中断信号，正在清理..."; stop_development; exit 0' INT TERM

# 执行主函数
main "$@"