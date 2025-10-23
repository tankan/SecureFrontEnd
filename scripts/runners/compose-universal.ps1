param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev','staging','prod')]
    [string]$Environment,
    
    [ValidateSet('up','down','pull','build','restart','status','logs','help')]
    [string]$Action = 'up'
)

$ErrorActionPreference = 'Stop'

# 显示帮助信息
function Show-Help {
    Write-Host @"
SecureFrontEnd 统一 Docker Compose 管理脚本

用法: .\compose-universal.ps1 -Environment <env> [-Action <action>]

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
  help      显示此帮助信息

示例:
  .\compose-universal.ps1 -Environment dev -Action up
  .\compose-universal.ps1 -Environment prod -Action status
"@
}

if ($Action -eq 'help') {
    Show-Help
    exit 0
}

# 获取项目根目录
$root = Resolve-Path "$PSScriptRoot\..\.." | Select-Object -ExpandProperty Path

# 环境配置映射
$envConfig = @{
    'dev' = @{
        envFile = '.env.dev'
        composeFile = 'config/docker/docker-compose.yml'
    }
    'staging' = @{
        envFile = '.env.staging'
        composeFile = 'config/docker/docker-compose.staging.yml'
    }
    'prod' = @{
        envFile = '.env.prod'
        composeFile = 'config/docker/docker-compose.production.yml'
    }
}

$config = $envConfig[$Environment]
$envFile = Join-Path $root $config.envFile
$composeFile = Join-Path $root $config.composeFile

# 验证文件存在
if (-not (Test-Path $envFile)) {
    throw "Environment file not found: $envFile"
}
if (-not (Test-Path $composeFile)) {
    throw "Compose file not found: $composeFile"
}

Write-Host "Environment: $Environment" -ForegroundColor Green
Write-Host "Action: $Action" -ForegroundColor Green
Write-Host "Env File: $envFile" -ForegroundColor Yellow
Write-Host "Compose File: $composeFile" -ForegroundColor Yellow

# 执行操作
try {
    switch ($Action) {
        'up' {
            Write-Host "Starting $Environment environment..." -ForegroundColor Blue
            docker compose --env-file $envFile -f $composeFile up -d --remove-orphans
            Write-Host "$Environment environment started successfully!" -ForegroundColor Green
        }
        'down' {
            Write-Host "Stopping $Environment environment..." -ForegroundColor Blue
            docker compose --env-file $envFile -f $composeFile down
            Write-Host "$Environment environment stopped successfully!" -ForegroundColor Green
        }
        'pull' {
            Write-Host "Pulling latest images for $Environment environment..." -ForegroundColor Blue
            docker compose --env-file $envFile -f $composeFile pull
            Write-Host "Images pulled successfully!" -ForegroundColor Green
        }
        'build' {
            Write-Host "Building images for $Environment environment..." -ForegroundColor Blue
            docker compose --env-file $envFile -f $composeFile build
            Write-Host "Images built successfully!" -ForegroundColor Green
        }
        'restart' {
            Write-Host "Restarting $Environment environment..." -ForegroundColor Blue
            docker compose --env-file $envFile -f $composeFile restart
            Write-Host "$Environment environment restarted successfully!" -ForegroundColor Green
        }
        'status' {
            Write-Host "Status of $Environment environment:" -ForegroundColor Blue
            docker compose --env-file $envFile -f $composeFile ps
        }
        'logs' {
            Write-Host "Logs for $Environment environment:" -ForegroundColor Blue
            docker compose --env-file $envFile -f $composeFile logs -f
        }
    }
} catch {
    Write-Error "Failed to execute $Action for $Environment environment: $_"
    exit 1
}