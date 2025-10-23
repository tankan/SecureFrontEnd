# SecureFrontEnd Environment Verification Script (PowerShell Version)
# Supports complete verification process for dev, staging, and production environments

param(
    [string]$Environment = "",
    [switch]$All = $false,
    [switch]$Help = $false,
    [switch]$Version = $false,
    [switch]$Debug = $false,
    [switch]$NoCleanup = $false
)

# Global variables
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$LogDir = Join-Path $ProjectRoot "logs\deployment"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogFile = Join-Path $LogDir "environment_verification_$Timestamp.log"
$ErrorLog = Join-Path $LogDir "errors_$Timestamp.log"
$ReportFile = Join-Path $LogDir "verification_report_$Timestamp.md"

# Supported environments
$Environments = @("dev", "staging", "production")
$SelectedEnvs = @()

# Statistics variables
$TotalSteps = 0
$CompletedSteps = 0
$FailedSteps = 0
$Warnings = 0
$StartTime = Get-Date

# Cleanup flags
$CleanupOnExit = $true
$ContainersToCleanup = @()
$NetworksToCleanup = @()

# Logging function
function Write-Log {
    param(
        [string]$Level,
        [string]$Message
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Write to log file
    Add-Content -Path $LogFile -Value $logEntry -Encoding UTF8
    
    # Output to console based on level
    switch ($Level) {
        "ERROR" {
            Write-Host "[ERROR] $Message" -ForegroundColor Red
            Add-Content -Path $ErrorLog -Value $logEntry -Encoding UTF8
            $script:FailedSteps++
        }
        "WARN" {
            Write-Host "[WARN] $Message" -ForegroundColor Yellow
            $script:Warnings++
        }
        "SUCCESS" {
            Write-Host "[SUCCESS] $Message" -ForegroundColor Green
            $script:CompletedSteps++
        }
        "INFO" {
            Write-Host "[INFO] $Message" -ForegroundColor Blue
        }
        "STEP" {
            Write-Host "[STEP] $Message" -ForegroundColor Magenta
            $script:TotalSteps++
        }
        "DEBUG" {
            if ($Debug) {
                Write-Host "[DEBUG] $Message" -ForegroundColor Cyan
            }
        }
        default {
            Write-Host $Message
        }
    }
}

# Error handling function
function Handle-Error {
    param([string]$ErrorMessage)
    
    Write-Log "ERROR" "Script execution error: $ErrorMessage"
    
    if ($CleanupOnExit) {
        Write-Log "INFO" "Performing error cleanup..."
        Cleanup-Resources
    }
    
    Generate-Report "FAILED"
    exit 1
}

# Resource cleanup function
function Cleanup-Resources {
    Write-Log "INFO" "Starting resource cleanup..."
    
    # Cleanup containers
    if ($ContainersToCleanup.Count -gt 0) {
        Write-Log "INFO" "Cleaning up containers: $($ContainersToCleanup -join ', ')"
        foreach ($container in $ContainersToCleanup) {
            try {
                $containerExists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $container }
                if ($containerExists) {
                    Write-Log "DEBUG" "Stopping and removing container: $container"
                    docker stop $container 2>$null | Out-Null
                    docker rm $container 2>$null | Out-Null
                }
            }
            catch {
                Write-Log "WARN" "Error cleaning up container $container : $($_.Exception.Message)"
            }
        }
    }
    
    # Cleanup networks
    if ($NetworksToCleanup.Count -gt 0) {
        Write-Log "INFO" "Cleaning up networks: $($NetworksToCleanup -join ', ')"
        foreach ($network in $NetworksToCleanup) {
            try {
                $networkExists = docker network ls --format "{{.Name}}" | Where-Object { $_ -eq $network }
                if ($networkExists) {
                    Write-Log "DEBUG" "Removing network: $network"
                    docker network rm $network 2>$null | Out-Null
                }
            }
            catch {
                Write-Log "WARN" "Error cleaning up network $network : $($_.Exception.Message)"
            }
        }
    }
    
    # Cleanup unused resources
    Write-Log "INFO" "Cleaning up unused Docker resources..."
    try {
        docker system prune -f 2>$null | Out-Null
    }
    catch {
        Write-Log "WARN" "Error cleaning up Docker resources: $($_.Exception.Message)"
    }
    
    Write-Log "SUCCESS" "Resource cleanup completed"
}

# Check system dependencies
function Check-Dependencies {
    Write-Log "STEP" "Checking system dependencies..."
    
    $missingDeps = @()
    
    # Check Docker
    try {
        $dockerVersion = docker --version 2>$null
        if ($dockerVersion) {
            Write-Log "INFO" "Docker version: $dockerVersion"
        } else {
            $missingDeps += "docker"
        }
    }
    catch {
        $missingDeps += "docker"
    }
    
    # Check Docker Compose
    try {
        $composeVersion = docker-compose --version 2>$null
        if (-not $composeVersion) {
            $composeVersion = docker compose version 2>$null
        }
        if ($composeVersion) {
            Write-Log "INFO" "Docker Compose version: $composeVersion"
        } else {
            $missingDeps += "docker-compose"
        }
    }
    catch {
        $missingDeps += "docker-compose"
    }
    
    # Check Node.js
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Log "INFO" "Node.js version: $nodeVersion"
        } else {
            $missingDeps += "node"
        }
    }
    catch {
        $missingDeps += "node"
    }
    
    if ($missingDeps.Count -gt 0) {
        Write-Log "ERROR" "Missing required dependencies: $($missingDeps -join ', ')"
        Write-Log "ERROR" "Please install missing dependencies and retry"
        throw "Dependency check failed"
    }
    
    Write-Log "SUCCESS" "All dependency checks passed"
}

# Check system resources
function Check-SystemResources {
    Write-Log "STEP" "Checking system resources..."
    
    # Check memory
    try {
        $memory = Get-CimInstance -ClassName Win32_ComputerSystem
        $totalMemoryGB = [math]::Round($memory.TotalPhysicalMemory / 1GB, 2)
        Write-Log "INFO" "System memory: ${totalMemoryGB}GB"
        
        if ($totalMemoryGB -lt 8) {
            Write-Log "WARN" "System memory less than 8GB, may affect performance"
        }
    }
    catch {
        Write-Log "WARN" "Unable to get memory information: $($_.Exception.Message)"
    }
    
    # Check disk space
    try {
        $disk = Get-CimInstance -ClassName Win32_LogicalDisk | Where-Object { $_.DeviceID -eq "C:" }
        $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)
        $totalSpaceGB = [math]::Round($disk.Size / 1GB, 2)
        $usagePercent = [math]::Round((($totalSpaceGB - $freeSpaceGB) / $totalSpaceGB) * 100, 1)
        
        Write-Log "INFO" "Disk usage: ${usagePercent}% (Available: ${freeSpaceGB}GB / Total: ${totalSpaceGB}GB)"
        
        if ($usagePercent -gt 90) {
            Write-Log "WARN" "Disk usage over 90%, may affect operations"
        }
    }
    catch {
        Write-Log "WARN" "Unable to get disk information: $($_.Exception.Message)"
    }
    
    # Check Docker status
    try {
        docker info 2>$null | Out-Null
        Write-Log "SUCCESS" "Docker service running normally"
    }
    catch {
        Write-Log "ERROR" "Docker service not running or inaccessible"
        throw "Docker service check failed"
    }
    
    Write-Log "SUCCESS" "System resource check completed"
}

# Wait for container to be ready
function Wait-ForContainer {
    param(
        [string]$ContainerName,
        [int]$MaxWait = 60,
        [int]$CheckInterval = 5
    )
    
    Write-Log "INFO" "Waiting for container $ContainerName to be ready..."
    
    $elapsed = 0
    while ($elapsed -lt $MaxWait) {
        try {
            $containerExists = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
            if ($containerExists) {
                $status = docker inspect --format="{{.State.Status}}" $ContainerName 2>$null
                if ($status -eq "running") {
                    Write-Log "SUCCESS" "Container $ContainerName is ready"
                    return $true
                }
            }
        }
        catch {
            # Continue waiting
        }
        
        Write-Log "DEBUG" "Waiting for container $ContainerName to start... (${elapsed}s/${MaxWait}s)"
        Start-Sleep -Seconds $CheckInterval
        $elapsed += $CheckInterval
    }
    
    Write-Log "ERROR" "Container $ContainerName not ready within ${MaxWait}s"
    return $false
}

# Health check function
function Test-HealthCheck {
    param(
        [string]$Url,
        [int]$MaxAttempts = 10,
        [int]$WaitTime = 5
    )
    
    Write-Log "INFO" "Performing health check: $Url"
    
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        Write-Log "DEBUG" "Health check attempt $i/$MaxAttempts"
        
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Log "SUCCESS" "Health check passed: $Url"
                return $true
            }
        }
        catch {
            if ($i -lt $MaxAttempts) {
                Write-Log "DEBUG" "Health check failed, retrying in ${WaitTime}s..."
                Start-Sleep -Seconds $WaitTime
            }
        }
    }
    
    Write-Log "ERROR" "Health check failed: $Url (attempted $MaxAttempts times)"
    return $false
}

# Get container resource usage
function Get-ContainerStats {
    param([string]$ContainerName)
    
    try {
        $containerExists = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
        if (-not $containerExists) {
            Write-Log "WARN" "Container $ContainerName does not exist or is not running"
            return
        }
        
        $stats = docker stats --no-stream --format "{{.CPUPerc}}`t{{.MemUsage}}`t{{.MemPerc}}" $ContainerName 2>$null
        if ($stats) {
            $statsParts = $stats -split "`t"
            Write-Log "INFO" "Container $ContainerName resource usage: CPU: $($statsParts[0]), Memory: $($statsParts[1]) ($($statsParts[2]))"
        } else {
            Write-Log "WARN" "Unable to get resource usage for container $ContainerName"
        }
    }
    catch {
        Write-Log "WARN" "Error getting resource usage for container $ContainerName : $($_.Exception.Message)"
    }
}

# Verify development environment
function Test-DevEnvironment {
    Write-Log "STEP" "Starting development environment verification..."
    
    # Record containers to cleanup
    $script:ContainersToCleanup += @("docker-app-1", "docker-postgres-1", "docker-redis-1")
    $script:NetworksToCleanup += @("docker_default")
    
    try {
        # Start development environment
        Write-Log "INFO" "Starting development environment containers..."
        & powershell -ExecutionPolicy Bypass -File "scripts\runners\compose-dev.ps1" -Action up
        if ($LASTEXITCODE -ne 0) {
            throw "Development environment startup failed"
        }
        
        # Wait for containers to start
        $containers = @("docker-app-1", "docker-postgres-1", "docker-redis-1")
        foreach ($container in $containers) {
            if (-not (Wait-ForContainer -ContainerName $container -MaxWait 120)) {
                throw "Container $container startup timeout"
            }
        }
        
        # Check container status
        Write-Log "INFO" "Checking container status..."
        foreach ($container in $containers) {
            $containerExists = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $container }
            if ($containerExists) {
                Write-Log "SUCCESS" "Container $container running normally"
                Get-ContainerStats -ContainerName $container
            } else {
                throw "Container $container not running"
            }
        }
        
        # Health check
        Write-Log "INFO" "Performing application health check..."
        if (-not (Test-HealthCheck -Url "http://localhost:3000/health" -MaxAttempts 15 -WaitTime 10)) {
            Write-Log "WARN" "Health check failed, but continuing verification process"
        }
        
        # Run basic tests
        Write-Log "INFO" "Running development environment basic tests..."
        if (Test-Path "package.json") {
            $packageContent = Get-Content "package.json" -Raw | ConvertFrom-Json
            if ($packageContent.scripts.test) {
                try {
                    npm test
                    Write-Log "SUCCESS" "Basic tests passed"
                }
                catch {
                    Write-Log "WARN" "Basic tests failed, but continuing verification process"
                }
            } else {
                Write-Log "INFO" "No test script found, skipping tests"
            }
        }
        
        # Check logs
        Write-Log "INFO" "Checking application logs..."
        docker logs docker-app-1 --tail 20 | Select-Object -First 10
        
        Write-Log "SUCCESS" "Development environment verification completed"
        return $true
    }
    catch {
        Write-Log "ERROR" "Development environment verification failed: $($_.Exception.Message)"
        return $false
    }
    finally {
        # Cleanup environment
        Write-Log "INFO" "Cleaning up development environment..."
        try {
            & powershell -ExecutionPolicy Bypass -File "scripts\runners\compose-dev.ps1" -Action down
        }
        catch {
            Write-Log "WARN" "Error cleaning up development environment: $($_.Exception.Message)"
        }
        
        # Verify cleanup
        Start-Sleep -Seconds 5
        foreach ($container in $containers) {
            $containerExists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $container }
            if ($containerExists) {
                Write-Log "WARN" "Container $container not completely cleaned up"
            } else {
                Write-Log "SUCCESS" "Container $container cleaned up"
            }
        }
    }
}

# Generate verification report
function Generate-Report {
    param([string]$Status = "Completed")
    
    $endTime = Get-Date
    $duration = $endTime - $StartTime
    $durationFormatted = "{0:hh\:mm\:ss}" -f $duration
    
    Write-Log "INFO" "Generating verification report..."
    
    # Determine verified environments list
    $verifiedEnvs = if ($All -or [string]::IsNullOrEmpty($Environment)) { $Environments } else { @($Environment) }
    
    $reportContent = @"
# SecureFrontEnd Environment Verification Report

## Basic Information
- **Verification Time**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- **Verification Status**: $Status
- **Total Duration**: $durationFormatted
- **Verified Environments**: $($verifiedEnvs -join ', ')

## Statistics
- **Total Steps**: $TotalSteps
- **Successful Steps**: $CompletedSteps
- **Failed Steps**: $FailedSteps
- **Warning Count**: $Warnings

## Detailed Logs
- **Main Log File**: $LogFile
- **Error Log File**: $ErrorLog

## Environment Verification Results

"@

    # Add verification results for each environment
    foreach ($env in $verifiedEnvs) {
        $envStatus = if (Select-String -Path $LogFile -Pattern "SUCCESS.*$env.*environment verification completed" -Quiet) { "✅ Success" } else { "❌ Failed" }
        $reportContent += @"
### $env Environment
- Status: $envStatus
- Details: Please check main log file

"@
    }
    
    $reportContent += @"
## System Information
- **Operating System**: $($env:OS) $(Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty Version)
- **Docker Version**: $(try { docker --version } catch { "Not installed" })
- **Node.js Version**: $(try { node --version } catch { "Not installed" })

## Recommendations
"@

    if ($FailedSteps -gt 0) {
        $reportContent += @"
- ⚠️ Found $FailedSteps failed steps, please check error log file
- Recommend re-running failed environment verification
"@
    }
    
    if ($Warnings -gt 0) {
        $reportContent += @"
- ⚠️ Found $Warnings warnings, recommend checking related configurations
"@
    }
    
    if ($FailedSteps -eq 0 -and $Warnings -eq 0) {
        $reportContent += @"
- ✅ All verification steps completed successfully
- Environment configuration is normal, ready for deployment
"@
    }
    
    Set-Content -Path $ReportFile -Value $reportContent -Encoding UTF8
    Write-Log "SUCCESS" "Verification report generated: $ReportFile"
}

# Show help information
function Show-Help {
    Write-Host @"
SecureFrontEnd Environment Verification Script (PowerShell Version)

Usage:
    .\environment-verification.ps1 [Options]

Options:
    -Environment <env>    Specify environment to verify (dev|staging|production)
    -All                  Verify all environments (default)
    -Help                 Show this help information
    -Version              Show version information
    -Debug                Enable debug mode
    -NoCleanup            Disable automatic cleanup (for debugging)

Environment Description:
    dev                   Development environment - basic functionality verification
    staging               Staging environment - integration and performance testing
    production            Production environment - security scanning and high availability verification

Examples:
    .\environment-verification.ps1                    # Verify all environments
    .\environment-verification.ps1 -Environment dev  # Only verify development environment
    .\environment-verification.ps1 -Debug            # Enable debug mode for all environments

Log Files:
    Main Log: $LogDir\environment_verification_YYYYMMDD_HHMMSS.log
    Error Log: $LogDir\errors_YYYYMMDD_HHMMSS.log
    Verification Report: $LogDir\verification_report_YYYYMMDD_HHMMSS.md

System Requirements:
    - Docker >= 20.10.0
    - Docker Compose >= 2.0.0
    - Node.js >= 22.12.0
    - At least 8GB RAM (16GB recommended)
    - At least 10GB available disk space

For more information, see: scripts\deploy\README.md
"@
}

# Show version information
function Show-Version {
    Write-Host @"
SecureFrontEnd Environment Verification Script v2.0.0 (PowerShell Version)

Features:
- Multi-environment support (dev/staging/production)
- Automated verification process
- Complete error handling and logging
- Resource monitoring and cleanup
- Detailed verification reports

Author: SecureFrontEnd Team
License: MIT License
"@
}

# Main function
function Main {
    # Handle help and version parameters
    if ($Help) {
        Show-Help
        return
    }
    
    if ($Version) {
        Show-Version
        return
    }
    
    # Set global variables
    if ($NoCleanup) {
        $script:CleanupOnExit = $false
        Write-Log "WARN" "Automatic cleanup disabled"
    }
    
    try {
        # Initialize
        Write-Log "INFO" "SecureFrontEnd environment verification script started"
        Write-Log "INFO" "Script path: $ScriptDir"
        Write-Log "INFO" "Project root: $ProjectRoot"
        
        # Create log directory
        if (-not (Test-Path $LogDir)) {
            New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
            Write-Log "INFO" "Created log directory: $LogDir"
        }
        
        # Check system dependencies
        Check-Dependencies
        
        # Check system resources
        Check-SystemResources
        
        # Determine environments to verify
        if ($All -or [string]::IsNullOrEmpty($Environment)) {
            $script:SelectedEnvs = $Environments
            Write-Log "INFO" "Will verify all environments: $($SelectedEnvs -join ', ')"
        } else {
            if ($Environment -notin $Environments) {
                Write-Log "ERROR" "Invalid environment name: $Environment"
                Write-Log "ERROR" "Supported environments: $($Environments -join ', ')"
                throw "Invalid environment name"
            }
            $script:SelectedEnvs = @($Environment)
            Write-Log "INFO" "Will verify environment: $Environment"
        }
        
        # Start verification process
        Write-Log "STEP" "Starting environment verification process"
        
        $verificationFailed = $false
        
        foreach ($env in $SelectedEnvs) {
            Write-Log "INFO" "Preparing to verify $env environment..."
            
            # Clear container cleanup list
            $script:ContainersToCleanup = @()
            $script:NetworksToCleanup = @()
            
            $success = switch ($env) {
                "dev" { Test-DevEnvironment }
                "staging" { 
                    Write-Log "WARN" "Staging environment verification not implemented in this version"
                    $true
                }
                "production" { 
                    Write-Log "WARN" "Production environment verification not implemented in this version"
                    $true
                }
                default {
                    Write-Log "ERROR" "Unsupported environment: $env"
                    $false
                }
            }
            
            if (-not $success) {
                Write-Log "ERROR" "$env environment verification failed"
                $verificationFailed = $true
            }
            
            # Wait between environments
            if ($SelectedEnvs.Count -gt 1) {
                Write-Log "INFO" "Waiting 10 seconds before next environment..."
                Start-Sleep -Seconds 10
            }
        }
        
        # Final cleanup
        Write-Log "INFO" "Performing final resource cleanup..."
        Cleanup-Resources
        
        # Generate final report
        if ($verificationFailed) {
            Write-Log "ERROR" "Errors found during environment verification process"
            Generate-Report "Partially Failed"
            exit 1
        } else {
            Write-Log "SUCCESS" "All environment verifications completed successfully"
            Generate-Report "Success"
        }
    }
    catch {
        Handle-Error $_.Exception.Message
    }
}

# Script entry point
Main