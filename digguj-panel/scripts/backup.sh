#!/usr/bin/env sh
# Kopia zapasowa: baza danych + przesłane zdjęcia → ./backups/RRRR-MM-DD_HHMM/
# Uruchamiaj na serwerze w katalogu projektu. Do crona (codziennie o 3:15):
#   15 3 * * * cd /opt/digguj-panel && ./scripts/backup.sh >> backups/backup.log 2>&1
# Kopie starsze niż KEEP_DAYS dni są usuwane.
set -eu
KEEP_DAYS="${KEEP_DAYS:-14}"
. ./.env
STAMP="$(date +%Y-%m-%d_%H%M)"
DIR="backups/$STAMP"
mkdir -p "$DIR"

docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom > "$DIR/db.dump"
docker compose exec -T app tar -czf - -C /app uploads > "$DIR/uploads.tar.gz"

find backups -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +
echo "[$STAMP] Kopia zapisana w $DIR ($(du -sh "$DIR" | cut -f1))"
