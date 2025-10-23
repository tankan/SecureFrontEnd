#!/bin/bash

# SecureFrontEnd Docker容器启动脚本
# 确保在Linux环境下正确初始化应用

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 错误处理
handle_error() {
    local exit_code=$?
    log_error "启动脚本执行失败，退出码: $exit_code"
    exit $exit_code
}

trap handle_error ERR

# 信号处理
handle_signal() {
    log_info "接收到终止信号，正在优雅关闭..."
    
    # 如果应用进程存在，发送SIGTERM信号
    if [ ! -z "${APP_PID:-}" ]; then
        kill -TERM "$APP_PID" 2>/dev/null || true
        
        # 等待应用优雅关闭
        local count=0
        while kill -0 "$APP_PID" 2>/dev/null && [ $count -lt 30 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # 如果仍未关闭，强制终止
        if kill -0 "$APP_PID" 2>/dev/null; then
            log_warn "应用未在30秒内关闭，强制终止"
            kill -KILL "$APP_PID" 2>/dev/null || true
        fi
    fi
    
    log_success "应用已优雅关闭"
    exit 0
}

trap handle_signal SIGTERM SIGINT

# 环境变量验证
validate_environment() {
    log_info "验证环境变量..."
    
    # 必需的环境变量
    local required_vars=(
        "NODE_ENV"
        "PORT"
        "HOST"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "缺少必需的环境变量: ${missing_vars[*]}"
        exit 1
    fi
    
    # 设置默认值
    export LOG_LEVEL="${LOG_LEVEL:-info}"
    export HEALTHCHECK_TIMEOUT="${HEALTHCHECK_TIMEOUT:-30s}"
    export MAX_MEMORY="${MAX_MEMORY:-512m}"
    
    log_success "环境变量验证完成"
}

# 文件权限检查
check_permissions() {
    log_info "检查文件权限..."
    
    local directories=(
        "/app/logs"
        "/app/temp"
        "/app/uploads"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            log_warn "目录不存在，正在创建: $dir"
            mkdir -p "$dir"
        fi
        
        if [ ! -w "$dir" ]; then
            log_error "目录不可写: $dir"
            exit 1
        fi
    done
    
    log_success "文件权限检查完成"
}

# 依赖检查
check_dependencies() {
    log_info "检查应用依赖..."
    
    # 检查Node.js版本
    local node_version=$(node --version)
    log_info "Node.js版本: $node_version"
    
    # 检查关键文件
    local required_files=(
        "/app/package.json"
        "/app/dist/index.js"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "关键文件不存在: $file"
            exit 1
        fi
    done
    
    log_success "依赖检查完成"
}

# 数据库初始化
initialize_database() {
    log_info "初始化数据库..."
    
    # 检查数据库连接
    if [ ! -z "${DATABASE_URL:-}" ]; then
        log_info "检查数据库连接..."
        
        # 等待数据库就绪
        local max_attempts=30
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if node -e "
                const { createConnection } = require('./dist/database');
                createConnection().then(() => {
                    console.log('数据库连接成功');
                    process.exit(0);
                }).catch(() => {
                    process.exit(1);
                });
            " 2>/dev/null; then
                log_success "数据库连接成功"
                break
            else
                log_warn "数据库连接失败，重试 $attempt/$max_attempts"
                sleep 2
                attempt=$((attempt + 1))
            fi
        done
        
        if [ $attempt -gt $max_attempts ]; then
            log_error "数据库连接超时"
            exit 1
        fi
    fi
    
    # 运行数据库迁移
    if [ -f "/app/dist/migrate.js" ]; then
        log_info "运行数据库迁移..."
        node /app/dist/migrate.js || {
            log_error "数据库迁移失败"
            exit 1
        }
        log_success "数据库迁移完成"
    fi
}

# 缓存预热
warm_up_cache() {
    log_info "预热应用缓存..."
    
    # 预加载配置文件
    if [ -d "/app/config" ]; then
        log_info "预加载配置文件..."
        find /app/config -name "*.json" -exec cat {} \; > /dev/null 2>&1 || true
    fi
    
    # 预热静态资源
    if [ -d "/app/dist/public" ]; then
        log_info "预热静态资源..."
        find /app/dist/public -type f -exec cat {} \; > /dev/null 2>&1 || true
    fi
    
    log_success "缓存预热完成"
}

# 健康检查端点
start_health_check() {
    log_info "启动健康检查..."
    
    # 创建健康检查脚本
    cat > /tmp/health-check.sh << 'EOF'
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/health 2>/dev/null || echo "000")
if [ "$response" = "200" ]; then
    exit 0
else
    exit 1
fi
EOF
    
    chmod +x /tmp/health-check.sh
    log_success "健康检查配置完成"
}

# 启动应用
start_application() {
    log_info "启动SecureFrontEnd应用..."
    
    # 设置Node.js选项
    export NODE_OPTIONS="--max-old-space-size=${MAX_MEMORY%m} --enable-source-maps"
    
    # 启动应用
    log_info "执行命令: node /app/dist/index.js"
    log_info "监听地址: ${HOST}:${PORT}"
    log_info "运行环境: ${NODE_ENV}"
    log_info "日志级别: ${LOG_LEVEL}"
    
    # 在后台启动应用并获取PID
    node /app/dist/index.js &
    APP_PID=$!
    
    log_success "应用已启动，PID: $APP_PID"
    
    # 等待应用启动
    local startup_timeout=60
    local count=0
    
    while [ $count -lt $startup_timeout ]; do
        if /tmp/health-check.sh 2>/dev/null; then
            log_success "应用启动成功，健康检查通过"
            break
        fi
        
        # 检查进程是否还在运行
        if ! kill -0 "$APP_PID" 2>/dev/null; then
            log_error "应用进程意外退出"
            exit 1
        fi
        
        sleep 1
        count=$((count + 1))
    done
    
    if [ $count -ge $startup_timeout ]; then
        log_error "应用启动超时"
        exit 1
    fi
    
    # 等待应用进程
    wait "$APP_PID"
}

# 主函数
main() {
    log_info "=== SecureFrontEnd 容器启动 ==="
    log_info "容器ID: $(hostname)"
    log_info "启动时间: $(date)"
    log_info "用户: $(whoami)"
    log_info "工作目录: $(pwd)"
    
    # 执行启动步骤
    validate_environment
    check_permissions
    check_dependencies
    initialize_database
    warm_up_cache
    start_health_check
    start_application
}

# 执行主函数
main "$@"