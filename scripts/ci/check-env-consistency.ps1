<#
Checks Docker Compose env consistency across dev, staging, prod.
- Verifies images are pinned (no 'latest') and tags match policy.
- Ensures staging mirrors production for core services.
- Emits a markdown report and non-zero exit code on violations.
#>

param(
  [string]$Root = (Resolve-Path "..\..").Path,
  [string]$ReportPath = "$PSScriptRoot\..\..\reports\env-consistency.md"
)

$ErrorActionPreference = 'Stop'

$files = @(
  Join-Path $Root 'config/docker/docker-compose.yml',
  Join-Path $Root 'config/docker/docker-compose.staging.yml',
  Join-Path $Root 'config/docker/docker-compose.production.yml'
)

function Get-Services($composePath) {
  $yaml = Get-Content $composePath -Raw
  # Naive parse: extract image lines under services
  $services = @()
  foreach ($line in $yaml.Split("`n")) {
    if ($line -match '^\s*image:\s*(.+)$') {
      $img = $Matches[1].Trim()
      $services += $img
    }
  }
  return $services
}

function Contains-LatestTag($image) {
  return ($image -match ":latest($|\s)" -or $image -notmatch ":")
}

$devImgs = Get-Services $files[0]
$stgImgs = Get-Services $files[1]
$prdImgs = Get-Services $files[2]

$report = @()
$violations = 0

$report += "# Environment Consistency Report"
$report += "\nGenerated: $(Get-Date -Format o)\n"

# 1) No 'latest' tags
foreach ($f in $files) {
  $imgs = Get-Services $f
  foreach ($img in $imgs) {
    if (Contains-LatestTag $img) {
      $violations++
      $report += "- [x] Latest tag found: `$img in `$f"
    }
  }
}

# 2) Staging mirrors Production for core services
$coreRepos = @(
  'redis', 'postgres', 'nginx', 'prom/prometheus', 'grafana/grafana', 'prom/alertmanager'
)

function Get-RepoTag($image) {
  # returns repo and tag (repo:tag)
  if ($image -match '^(?<repo>[^\s:]+):(?<tag>[^\s]+)$') {
    return @($Matches.repo, $Matches.tag)
  }
  return @($image, '')
}

foreach ($repo in $coreRepos) {
  $stg = ($stgImgs | Where-Object { $_ -like "$repo:*" }) | Select-Object -First 1
  $prd = ($prdImgs | Where-Object { $_ -like "$repo:*" }) | Select-Object -First 1
  if ($stg -and $prd) {
    $stgTag = (Get-RepoTag $stg)[1]
    $prdTag = (Get-RepoTag $prd)[1]
    if ($stgTag -ne $prdTag) {
      $violations++
      $report += "- [x] Staging/Production tag mismatch for $repo: stg=$stgTag, prod=$prdTag"
    } else {
      $report += "- [ ] $repo aligned: $prdTag"
    }
  } else {
    $report += "- [ ] $repo not present in one of envs"
  }
}

# Emit report
New-Item -ItemType Directory -Force -Path (Split-Path $ReportPath) | Out-Null
$report -join "`n" | Set-Content -Path $ReportPath -Encoding UTF8

if ($violations -gt 0) {
  Write-Host "Violations: $violations" -ForegroundColor Red
  exit 1
} else {
  Write-Host "Environments consistent." -ForegroundColor Green
}