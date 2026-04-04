#!/usr/bin/env bash
# Полная копия PostgreSQL: локальная БД -> хостинг.
# Использование: из корня репозитория — bash scripts/pg-full-copy.sh
# Переменные: LOCAL_DATABASE_URL, REMOTE_DATABASE_URL или файл scripts/migrate.env

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT/backups"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP="$BACKUP_DIR/pg-full-copy-$STAMP.dump"

if [[ -f "$ROOT/scripts/migrate.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT/scripts/migrate.env"
  set +a
fi

SOURCE="${LOCAL_DATABASE_URL:-}"
TARGET="${REMOTE_DATABASE_URL:-}"
if [[ -z "$SOURCE" || -z "$TARGET" ]]; then
  echo "Задайте LOCAL_DATABASE_URL и REMOTE_DATABASE_URL или заполните scripts/migrate.env" >&2
  exit 1
fi

command -v pg_dump >/dev/null 2>&1 || { echo "Нужен pg_dump в PATH" >&2; exit 1; }
command -v pg_restore >/dev/null 2>&1 || { echo "Нужен pg_restore в PATH" >&2; exit 1; }

echo "Дамп -> $DUMP"
pg_dump -Fc -f "$DUMP" --verbose "$SOURCE"

echo "Восстановление ( --clean --if-exists )..."
set +e
pg_restore --verbose --clean --if-exists --no-owner --no-acl -d "$TARGET" "$DUMP"
CODE=$?
set -e
# 1 = предупреждения, часто допустимо
if [[ "$CODE" -ne 0 && "$CODE" -ne 1 ]]; then
  exit "$CODE"
fi
echo "Готово: $DUMP"
