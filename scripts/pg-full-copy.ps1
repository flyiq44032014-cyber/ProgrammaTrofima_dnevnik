# Полная копия PostgreSQL: локальная БД -> хостинг (pg_dump custom format + pg_restore).
# Требуются клиенты PostgreSQL в PATH: pg_dump, pg_restore (установщик Postgres / отдельные tools).
#
# Подготовка:
#   1) Скопируйте scripts/migrate.env.example -> scripts/migrate.env и заполните URL (migrate.env в .gitignore).
#   2) Либо задайте переменные окружения LOCAL_DATABASE_URL и REMOTE_DATABASE_URL в этой сессии PowerShell.
#
# Опционально на время restore остановите Web Service на Render, чтобы не было конкурирующих подключений к БД.
#
# Запуск из корня репозитория:
#   npm run db:full-copy
#   или: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pg-full-copy.ps1

param(
  [string] $Source = $env:LOCAL_DATABASE_URL,
  [string] $Target = $env:REMOTE_DATABASE_URL,
  [switch] $NoClean
)

$ErrorActionPreference = "Stop"

function Read-DotEnvFile {
  param([string] $Path)
  if (-not (Test-Path $Path)) { return @{} }
  $map = @{}
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $k = $line.Substring(0, $eq).Trim()
    $v = $line.Substring($eq + 1).Trim()
    if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
    elseif ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length - 2) }
    $map[$k] = $v
 }
 $map
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$envFile = Join-Path $scriptDir "migrate.env"
$vars = Read-DotEnvFile -Path $envFile
if (-not $Source -and $vars["LOCAL_DATABASE_URL"]) { $Source = $vars["LOCAL_DATABASE_URL"] }
if (-not $Target -and $vars["REMOTE_DATABASE_URL"]) { $Target = $vars["REMOTE_DATABASE_URL"] }

if (-not $Source -or -not $Target) {
  Write-Error "Задайте LOCAL_DATABASE_URL и REMOTE_DATABASE_URL (scripts/migrate.env или параметры -Source / -Target)."
  exit 1
}

foreach ($cmd in @("pg_dump", "pg_restore")) {
  $c = Get-Command $cmd -ErrorAction SilentlyContinue
  if (-not $c) {
    Write-Error "Команда $cmd не найдена в PATH. Установите PostgreSQL client tools и повторите."
    exit 1
  }
}

$backupDir = Join-Path $repoRoot "backups"
if (-not (Test-Path $backupDir)) {
  New-Item -ItemType Directory -Path $backupDir | Out-Null
}
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpFile = Join-Path $backupDir "pg-full-copy-$stamp.dump"

Write-Host "Дамп (источник) -> $dumpFile"
& pg_dump -Fc -f $dumpFile --verbose $Source
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$restoreArgs = @("--verbose", "--no-owner", "--no-acl", "-d", $Target, $dumpFile)
if (-not $NoClean) {
  $restoreArgs = @("--verbose", "--clean", "--if-exists", "--no-owner", "--no-acl", "-d", $Target, $dumpFile)
}

Write-Host "Восстановление на хостинг (--clean удаляет существующие объекты с теми же именами)..."
& pg_restore @restoreArgs
$code = $LASTEXITCODE
if ($code -ne 0 -and $code -ne 1) {
  # pg_restore иногда возвращает 1 при несущественных предупреждениях
  exit $code
}
Write-Host "Готово. Дамп сохранён: $dumpFile"
