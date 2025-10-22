param(
  [ValidateSet('up','down','pull','build','restart')]
  [string]$Action = 'up'
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot\..\.." | Select-Object -ExpandProperty Path
$envFile = Join-Path $root '.env.staging'
$composeFile = Join-Path $root 'config/docker/docker-compose.staging.yml'

if (-not (Test-Path $envFile)) { throw ".env.staging not found: $envFile" }
if (-not (Test-Path $composeFile)) { throw "compose file not found: $composeFile" }

switch ($Action) {
  'up'      { docker compose --env-file $envFile -f $composeFile up -d --remove-orphans }
  'down'    { docker compose --env-file $envFile -f $composeFile down }
  'pull'    { docker compose --env-file $envFile -f $composeFile pull }
  'build'   { docker compose --env-file $envFile -f $composeFile build }
  'restart' { docker compose --env-file $envFile -f $composeFile restart }
}