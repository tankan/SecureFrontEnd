<#
Pre-deploy diff checker for docker-compose files across environments.
Outputs human-friendly differences in images and key settings.
#>
param(
  [string]$Root = (Resolve-Path "..\..").Path
)

$ErrorActionPreference = 'Stop'

$dev = Join-Path $Root 'config/docker/docker-compose.yml'
$stg = Join-Path $Root 'config/docker/docker-compose.staging.yml'
$prd = Join-Path $Root 'config/docker/docker-compose.production.yml'

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

Write-Host "Comparing image sets..." -ForegroundColor Cyan
$devImgs = Extract-Images $dev
$stgImgs = Extract-Images $stg
$prdImgs = Extract-Images $prd

Write-Host "Dev vs Staging diff:" -ForegroundColor Yellow
Compare-Object -ReferenceObject $devImgs -DifferenceObject $stgImgs -IncludeEqual -PassThru | Format-Table -AutoSize

Write-Host "Staging vs Production diff:" -ForegroundColor Yellow
Compare-Object -ReferenceObject $stgImgs -DifferenceObject $prdImgs -IncludeEqual -PassThru | Format-Table -AutoSize

# Exit code indicates presence of differences excluding equals
$diff1 = Compare-Object -ReferenceObject $devImgs -DifferenceObject $stgImgs
$diff2 = Compare-Object -ReferenceObject $stgImgs -DifferenceObject $prdImgs
if ($diff2) { exit 2 } elseif ($diff1) { exit 1 } else { exit 0 }