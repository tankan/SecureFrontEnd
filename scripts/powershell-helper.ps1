# PowerShell 辅助脚本
# 解决 PowerShell 5.1 中 && 操作符不支持的问题

param(
    [string]$Command1,
    [string]$Command2
)

Write-Host "执行命令: $Command1" -ForegroundColor Green
try {
    Invoke-Expression $Command1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "第一个命令执行成功，继续执行: $Command2" -ForegroundColor Green
        Invoke-Expression $Command2
    } else {
        Write-Host "第一个命令执行失败，退出码: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "命令执行出错: $_" -ForegroundColor Red
    exit 1
}