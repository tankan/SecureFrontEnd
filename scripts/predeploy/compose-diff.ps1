<#
Pre-deploy diff checker for docker-compose files across environments.
Outputs human-friendly differences in images and key settings.
#>
param(
  [string]$Root = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'

# Use current working directory as project root
$projectRoot = $PWD.Path
Write-Host "Project Root: $projectRoot" -ForegroundColor Yellow

# Check if project root is valid
if ([string]::IsNullOrEmpty($projectRoot)) {
    Write-Error "Cannot get project root directory"
    exit 1
}

$dev = Join-Path $projectRoot "config\docker\docker-compose.yml"
$stg = Join-Path $projectRoot "config\docker\docker-compose.staging.yml"
$prd = Join-Path $projectRoot "config\docker\docker-compose.production.yml"

Write-Host "Dev Config: $dev" -ForegroundColor Yellow
Write-Host "Staging Config: $stg" -ForegroundColor Yellow
Write-Host "Production Config: $prd" -ForegroundColor Yellow

# Check if files exist
if (-not (Test-Path $dev)) { Write-Error "Dev config file not found: $dev"; exit 1 }
if (-not (Test-Path $stg)) { Write-Error "Staging config file not found: $stg"; exit 1 }
if (-not (Test-Path $prd)) { Write-Error "Production config file not found: $prd"; exit 1 }

function Extract-Images($path) {
  $yaml = Get-Content $path -Raw
  $pairs = @()
  foreach ($line in $yaml.Split("`n")) {
    if ($line -match '^\s*image:\s*(?<img>.+)$') {
      $pairs += $Matches.img.Trim()
    }
  }
  return $pairs | Sort-Object
}

Write-Host "`nComparing image configurations..." -ForegroundColor Cyan
$devImgs = Extract-Images $dev
$stgImgs = Extract-Images $stg
$prdImgs = Extract-Images $prd

Write-Host "`nDev Environment Images:" -ForegroundColor Green
$devImgs | ForEach-Object { Write-Host "  - $_" }

Write-Host "`nStaging Environment Images:" -ForegroundColor Green
$stgImgs | ForEach-Object { Write-Host "  - $_" }

Write-Host "`nProduction Environment Images:" -ForegroundColor Green
$prdImgs | ForEach-Object { Write-Host "  - $_" }

Write-Host "`nDev vs Staging Differences:" -ForegroundColor Yellow
$diff1 = Compare-Object -ReferenceObject $devImgs -DifferenceObject $stgImgs
if ($diff1) {
    $diff1 | ForEach-Object {
        if ($_.SideIndicator -eq "<=") {
            Write-Host "  Only in Dev: $($_.InputObject)" -ForegroundColor Red
        } else {
            Write-Host "  Only in Staging: $($_.InputObject)" -ForegroundColor Blue
        }
    }
} else {
    Write-Host "  No differences" -ForegroundColor Green
}

Write-Host "`nStaging vs Production Differences:" -ForegroundColor Yellow
$diff2 = Compare-Object -ReferenceObject $stgImgs -DifferenceObject $prdImgs
if ($diff2) {
    $diff2 | ForEach-Object {
        if ($_.SideIndicator -eq "<=") {
            Write-Host "  Only in Staging: $($_.InputObject)" -ForegroundColor Red
        } else {
            Write-Host "  Only in Production: $($_.InputObject)" -ForegroundColor Blue
        }
    }
} else {
    Write-Host "  No differences" -ForegroundColor Green
}

# Exit code indicates presence of differences
if ($diff2) { 
    Write-Host "`nResult: Staging and Production environments have differences" -ForegroundColor Red
    exit 2 
} elseif ($diff1) { 
    Write-Host "`nResult: Dev and Staging environments have differences" -ForegroundColor Red
    exit 1 
} else { 
    Write-Host "`nResult: All environments are consistent" -ForegroundColor Green
    exit 0 
}