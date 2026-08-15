# Рефакторинг PetVet — сводка изменений (2026-08-15)

Полный отчёт работы по ponytail-аудиту и ROADMAP (этапы A–D, P-*, O-*).

---

## Этап A — Runtime-баги (исправлено)

| Файл | Изменение |
|------|-----------|
| `backend/pets/views.py` | Удалён падавший блок Reminder-логики из `EventTypeViewSet.perform_create` (читал поля PetEvent из EventType → AttributeError/500). Рабочая логика перенесена в `PetEventViewSet.perform_create`. |
| `backend/users/views.py` | `DemoLoginView` теперь уважает `ENABLE_DEMO_LOGIN` (404 при выключенном). |
| `backend/pets/tests.py` | Починен assert, обращавшийся к несуществующим полям Pet в `test_recent_events_limited_to_five`. |

## Этап B — Синхронизация типов фронт ↔ бэк

| Файл | Изменение |
|------|-----------|
| `frontend/types/event.ts` | `EventCategory` дополнена `surgery`, `parasite`; удалён ложный `created_by` из `PetEvent` (оставлен `created_by_info`). |
| `frontend/types/invoice.ts` | Создан общий тип по `InvoiceSerializer`. |
| `frontend/app/[locale]/billing/invoices/page.tsx` | Переведён на общий тип `Invoice`. |
| `backend/vetclinics/urls.py` | Шаблоны клиник → единый nested REST: `/api/clinics/{clinic_id}/templates/{pk}/`. |
| `frontend/services/clinicService.ts`, `frontend/components/dashboard/ClinicTemplates.tsx` | update/delete теперь по nested URL. |

## Этап C — Дедупликация (ponytail)

| Файл | Изменение |
|------|-----------|
| `frontend/services/clinicService.ts`, `frontend/services/aiChatService.ts` | Переведены на общий `apiClient` (токен/refresh/ошибки). SSE-stream остался на raw fetch (apiClient парсит JSON и не годится для event-stream). |
| `backend/pets/serializers.py`, `backend/pets/models.py` | Слаги единым способом — `python-slugify` (убран самописный `custom_slugify`, `pytils`). |
| `backend/ai/serializers.py`, `backend/ai/views.py` | Удалены `AIConsultResponseSerializer`, `noqa: F821` (vetclinics), избыточный `except (RuntimeError, Exception)`. |
| `backend/requirements.txt` | Убраны `django-admin-interface`, `django-celery-results`, `django-simple-history`, `pytils`; добавлен `drf-spectacular`. |
| `frontend/package.json` | Убраны `framer-motion`, `@radix-ui/react-toast` (0 импортов в исходниках). |

## Этап D — Product Integrity

| Файл | Изменение |
|------|-----------|
| `frontend/app/[locale]/dashboard/page.tsx` | Вкладка «Сегодня» теперь через `/api/events/?start_date&end_date&status=planned` вместо `recent_events` (лимит 5). |
| `backend/config/settings.py` | DRF rate limiting: anon 100/h, user 1000/h, ai 20/h, auth 10/h. |
| `docs/BACKEND-MAP.md` | Исправлено устаревшее утверждение «P0 не в коде» — зафиксировано фактическое состояние. |

## P-2 — Domain unify

| Файл | Изменение |
|------|-----------|
| `backend/pets/models.py` | Удалено неиспользуемое поле `Pet.user` (OneToOne) + миграция `pets.0009`. |
| `backend/pets/services.py` | Создан единый резолвер клиента `resolve_client()` (Pet owner/temp_owner · PetEvent guest · Invoice client/guest). Удалены мёртвые `build_pet_profile_prompt`, `calculate_age`. |
| `backend/pets/serializers.py` | `PetSerializer.get_owner_info`, `PetEventSerializer.pet_info` → `resolve_client`. Попутно починен баг: `owner_name` в событиях всегда был None. |
| `backend/billing/serializers.py` | `InvoiceSerializer.get_client_info` → `resolve_client` (контракт `{id, name, is_shadow}` сохранён). |
| — | `EventType.CATEGORY_CHOICES` уже содержал surgery/parasite; `CatalogItem.code` unique per-owner (проверено — уже было). |

## P-3 — AI hardening

| Файл | Изменение |
|------|-----------|
| `backend/ai/views.py`, `backend/ai/urls.py`, `backend/ai/serializers.py`, `backend/ai/services.py` | Legacy `/api/ai/consult/` удалён полностью (view, url, `AIConsultRequestSerializer`, `call_deepseek`, `build_images_list`, `_extract_json_from_text`, `encode_image_base64`). Фронт его не использовал. |

## P-4 — OpenAPI / документация

| Файл | Изменение |
|------|-----------|
| `backend/requirements.txt` | `drf-spectacular==0.30.0`. |
| `backend/config/settings.py` | `DEFAULT_SCHEMA_CLASS = drf_spectacular.openapi.AutoSchema`. |
| `backend/config/urls.py` | `/api/schema/` + `/api/docs/` (Swagger UI). |
| `.env.example` | Создан шаблон без секретов. |

## O-1 — CI

| Файл | Изменение |
|------|-----------|
| `.github/workflows/ci.yml` | backend (Postgres+Redis services, check, `makemigrations --check`, tests) + frontend (`tsc --noEmit`, `build`). |

## O-2 — Observability

| Файл | Изменение |
|------|-----------|
| `backend/common/views.py`, `backend/common/urls.py` | `GET /api/common/health/` — проверка БД (`connection.ensure_connection`) и Redis (`redis.ping`); 200 `{"status":"ok","checks":{"db":"ok","redis":"ok"}}`, 500 при сбое. Runtime-подтверждено. |
| `docs/OPS.md` | Раздел мониторинга (healthcheck + cron), логи. |

## O-3 — Backups

| Файл | Изменение |
|------|-----------|
| `scripts/backup.sh` | `pg_dump | gzip` в `$BACKUP_ROOT/db/`, rsync media, ротация `$KEEP_DAYS=7`. Пример cron в шапке. |
| `docs/OPS.md` | Инструкции: бэкап, восстановление, drill, деплой, логи, секреты. |

## O-4 — Security headers + rate limit auth

| Файл | Изменение |
|------|-----------|
| `nginx/nginx.conf` | HSTS (`max-age=31536000; includeSubDomains`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, CSP. |
| (корень) `nginx.conf` | Удалён дубль (два файла были идентичны; compose монтирует `nginx/nginx.conf`). |
| `backend/config/settings.py` + `backend/users/views.py` | Скоуп `auth: 10/hour` + `ScopedRateThrottle` на Register / Activate / Google / Demo. |

## O-5 — Logging

| Файл | Изменение |
|------|-----------|
| `backend/config/settings.py` | `LOGGING` конфиг (console handler, verbose-формат; логгеры django / django.db.backends / celery). |
| `backend/users/views.py`, `backend/config/settings.py` | `print(...)` → `logger.warning(...)`. |

---

## Проверки (итого)

- `python manage.py check` → **0 issues**
- `python manage.py test --noinput` → **23/23 OK**
- `python manage.py makemigrations --check --dry-run` → **No changes detected**
- `npx tsc --noEmit` → **exit 0**
- `GET /api/common/health/` → **200 `{"status":"ok","checks":{"db":"ok","redis":"ok"}}`**

## Открытые задачи (не входили в сессию)

1. Sentry (backend + frontend) — требует `SENTRY_DSN`.
2. CSP проверить на проде (Next.js инлайн-стили).
3. Применить миграцию `notifications.0005` и `migrate` на сервере при деплое.
4. Rate-limit на токен-эндпоинты SimpleJWT (`/api/token/`, `/api/token/refresh/`) — при необходимости.
5. ADR на единый `Client` (P-2 остаток — если вводить полноценную модель, а не резолвер).