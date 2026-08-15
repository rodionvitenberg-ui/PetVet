# OPS — эксплуатация PetVet (CareYourPet)

## Структура
- `backend/` — Django 6 / DRF / Channels / Celery (контейнер `backend`)
- `frontend/` — Next.js 16 (контейнер `frontend`)
- `nginx/nginx.conf` — единственный nginx-конфиг (монтируется в docker-compose)
- `scripts/backup.sh` — бэкап Postgres + media

---

## 1. Бэкапы (O-3)

### Скрипт
`scripts/backup.sh`:
- читает подключение к БД из `backend/.env` (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`);
- делает `pg_dump | gzip` в `$BACKUP_ROOT/db/db_<timestamp>.sql.gz`;
- копирует `backend/media/` в `$BACKUP_ROOT/media/`;
- удаляет дампы старше `$KEEP_DAYS` (по умолчанию 7).

### Настройка cron (на сервере)
```cron
0 3 * * * /home/petvet/project/scripts/backup.sh >> /home/petvet/backups/backup.log 2>&1
```

### Восстановление
```bash
# 1. Поднять БД
gunzip -c /home/petvet/backups/db/db_20260815_0300.sql.gz | psql \
  "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# 2. Восстановить media
rsync -a /home/petvet/backups/media/ /home/petvet/project/backend/media/
```

> ⚠️ Перед полным восстановлением обязательно остановите backend (`docker compose stop backend`) — иначе будут конфликты записи в БД, а media может перезаписаться.

### Тест восстановления (drill)
```bash
# Создать пустую БД и прогнать дамп
createdb "pet_db_vet_restore_test"
gunzip -c /home/petvet/backups/db/db_$(date +%Y%m%d)_*.sql.gz | psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/pet_db_vet_restore_test"
psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/pet_db_vet_restore_test" -c "select count(*) from django_migrations;"
dropdb pet_db_vet_restore_test
```

---

## 2. Деплой

### rsync (как сейчас)
```bash
./deploy.sh   # rsync на petvet@193.180.213.143:/home/petvet/project
```

### Docker compose
```bash
cd /home/petvet/project
docker compose up -d --build
docker compose exec backend python manage.py migrate --noinput
docker compose exec backend python manage.py collectstatic --noinput
```

---

## 3. Мониторинг (O-2)

### Healthcheck
`GET /api/common/health/` — отвечает 200 `{"status":"ok","checks":{"db":"ok","redis":"ok"}}`, если БД и Redis живы; 500 при сбое.

Проверить извне:
```bash
curl -s https://careyour.pet/api/common/health/
```

Мониторинг по cron (например, каждые 5 минут):
```cron
*/5 * * * * curl -fsS https://careyour.pet/api/common/health/ >/dev/null || echo "[$(date)] HEALTHCHECK FAIL" >> /home/petvet/backups/health.log
```

---

## 4. Логи (O-5)

Логи Django/Celery идут в stdout контейнеров:
```bash
docker compose logs -f backend
docker compose logs -f celery_worker
docker compose logs -f celery_beat
```

---

## 5. Секреты

- Все секреты хранятся в `backend/.env` и `frontend/.env.local` (не в git).
- Шаблон без секретов: `.env.example` в корне.
- `SECRET_KEY`, пароли SMTP/БД, `DEEPSEEK_API_KEY`, `GOOGLE_CLIENT_ID` — НЕ логировать.
