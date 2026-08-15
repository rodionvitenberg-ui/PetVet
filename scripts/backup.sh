#!/bin/bash
# O-3: Бэкап Postgres + media. Запускать по cron на сервере.
# Пример cron (каждый день в 03:00):
#   0 3 * * * /home/petvet/project/scripts/backup.sh >> /home/petvet/backups/backup.log 2>&1

set -euo pipefail

# --- Конфиг из .env сервера ---
BACKEND_DIR="$(cd "$(dirname "$0")/../backend" && pwd)"
set -a
source "$BACKEND_DIR/.env"
set +a

BACKUP_ROOT="${BACKUP_ROOT:-/home/petvet/backups}"
DATE="$(date +%Y%m%d_%H%M)"
DB_FILE="$BACKUP_ROOT/db/db_$DATE.sql.gz"
KEEP_DAYS="${KEEP_DAYS:-7}"

mkdir -p "$BACKUP_ROOT/db" "$BACKUP_ROOT/media"

echo "[$(date)] Dumping database..."
pg_dump \
    --dbname="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME}" \
    --no-owner \
    --no-privileges \
    | gzip > "$DB_FILE"

echo "[$(date)] Copying media..."
rsync -a --delete "$BACKEND_DIR/media/" "$BACKUP_ROOT/media/"

echo "[$(date)] Rotating old backups (> ${KEEP_DAYS} days)..."
find "$BACKUP_ROOT/db" -name 'db_*.sql.gz' -mtime "+$KEEP_DAYS" -delete

echo "[$(date)] Done: $DB_FILE"