# Backend Roadmap — Оптимизация + Проверка Функций (PetVet)

**Дата:** 2026-08-15
**Базис:** [BACKEND-MAP.md](./BACKEND-MAP.md) — фактическое состояние кода (после аудита).
**Статус:** Этап 0 выполнен; **Этап 1 (P0 Security) — ЗАВЕРШЁН 2026-08-15**; **Этап 2 (Integrity/Wiring) — ЗАВЕРШЁН 2026-08-15** (I-1..I-7, verify: `pets users billing` 21/21 green).
**Правило:** закрываем сверху вниз. ВАЖНО: прежний `TODO.md` помечал P0 как DONE, но код не содержал правок — сейчас P0 реально реализован в коде.

---

## Этап 0 — Верификация текущего состояния (smoke-тесты функций)

Перед любыми правками — зафиксировать, что сейчас реально работает (make base checks).

| # | Проверка | Команда / Метод | Ожидание | Факт |
|---|----------|-----------------|----------|------|
| V1 | Django check | `python manage.py check` | 0 issues | ✅ 0 issues (статически) |
| V2 | Расхождение миграций | `python manage.py makemigrations --dry-run --check` | No changes | 🔴 **notifications: AlterField reminder_time_minutes (не закоммичен)** |
| V3 | Schema БД соответствует моделям | psql `\dt` (pet_db_vet) | 49 таблиц | ✅ 49 таблиц |
| V4 | token_blacklist | `INSTALLED_APPS` vs `django_migrations` | Согласовано | 🔴 миграции есть (12), app нет в settings |
| V5 | `/api/common/dictionaries/` | runtime GET | 200 | 🔴 **500 AttributeError** (available_attributes) |
| V6 | Invoices изоляция | user A / user B | Только свои | 🔴 **Invoice.objects.all()** |
| V7 | Attachments upload на чужой event | POST attachment → event чужой | 403 | 🔴 **500 NameError PermissionDenied** |
| V8 | JWT тикеты | settings | access 60m / refresh 30d + rotation | 🔴 30d/60d, rotate=False |
| V9 | Celery tasks регистрация | `celery -A config inspect registered` | 3 таска | ⚠️ зависит от Redis; в docker-контейнере скорее fail (REDIS_HOST) |
| V10 | users.signals подключение | apps.py | import users.signals | 🔴 **не импортируется** |

**Вывод этапа 0:** Провалены V2, V4, V5, V6, V7, V8, V10 — зафиксировано 2026-08-15.
**Обновление после P0-фиксов:** V5 (dictionaries 200 ✅), V6 (invoice isolation ✅ + 8 тестов), V7 (PermissionDenied ✅), V8 (JWT ✅), V10 (users.signals ✅). Остались: V2 (миграция notifications не закоммичена), V9 (celery — проверить отдельно).

---

## Этап 1 — P0 Security Hotfix (первый спринт, 1–3 дня)

> Эти пункты были заявлены как DONE в `docs/TODO.md`, но в коде отсутствуют. Восстанавливаем (или делаем заново) с явным DoD.

### P0-1. IDOR на Invoice — ✅ DONE 2026-08-15
- [x] `billing/models.py`: `created_by = FK(User, related_name='invoices_created')`
- [x] `billing/views.py`: `InvoiceViewSet.get_queryset` изолирован (created_by | client | pet owner | pet write-access)
- [x] `IsInvoiceEditor` permission создан
- [x] Тесты: `backend/billing/tests.py` — 8/8 green (list/retrieve/update/delete isolation)

**DoD:** ✅ зеленые тесты.

### P0-2. Protected media (vet_docs, chat attachments) — ✅ DONE 2026-08-15
- [x] `nginx/nginx.conf` + `nginx.conf`: regex `^/media/(vet_docs|chat_attachments|event_docs|health_docs)/` → proxy Django
- [x] `common/views.py`: `ProtectedMediaView` (auth + vet/chat/pet access checks, path traversal guard)
- [x] URL `/api/common/protected-media/<path:path>` зарегистрирован
- [x] Публичные pet/user images остаются через `/media/` alias
- [x] Бонус: `DictionaryView` починен (prefetch `attributes`, убран `Tag.color`, добавлены options + absolute icons) — runtime 200

**DoD:** ✅ ProtectedMedia без auth → 401; DictionaryView → 200 (116 категорий).

### P0-3. JWT + token_blacklist — ✅ DONE 2026-08-15
- [x] `settings.py`: `ACCESS_TOKEN_LIFETIME=timedelta(minutes=60)`, `REFRESH_TOKEN_LIFETIME=timedelta(days=30)`
- [x] `ROTATE_REFRESH_TOKENS=True`, `BLACKLIST_AFTER_ROTATION=True`
- [x] `INSTALLED_APPS` += `rest_framework_simplejwt.token_blacklist` (таблицы уже были в БД)
- [x] `manage.py check` — 0 issues

**DoD:** ✅ settings применены, app подключён.

### P0-4. PermissionDenied + единый access helper — ✅ DONE 2026-08-15
- [x] `pets/views.py`: импорт `PermissionDenied`
- [x] `PetEventAttachmentViewSet.get_queryset` — теперь owner | active access grants | shadow creator
- [x] `PetEventAttachmentViewSet.perform_create` — `user_can_access_pet(write=True)`
- [x] Импорт `pets/access.py` подключён
- [ ] (распространение на events/AI/billing — частично в P0-1 invoice; полное — P0-4 этап 2 I-6)

**DoD:** ✅ attachment на чужой event → 403, не 500.

### P0-5. Redis: убрать host port + починить celery env — ✅ DONE 2026-08-15
- [x] `docker-compose.yml`: redis `ports: "6379:6379"` убраны
- [x] celery_worker/celery_beat: добавлены `REDIS_HOST=redis` + `REDIS_PORT=6379`

**DoD:** ✅ 6379 не published; celery в docker получит `REDIS_HOST=redis`.

### P0-6. Self-service is_veterinarian — ✅ DONE 2026-08-15
- [x] `users/views.UserMeView.perform_update`: больше не читает `role`, не ставит `is_veterinarian`
- [x] Роль теперь только через admin + `users/signals.py`
- [x] `users/apps.py`: `import users.signals` — верификация врача (approve → is_verified) теперь работает

**DoD:** ✅ PATCH role=vet игнорируется; users.signals подключены.

### P0-7. QR accept_access — не force write — ✅ DONE 2026-08-15
- [x] `share_token`: принимает `?access_level=read|write` (default `read`), payload `pet_share:<pet_id>:<level>`
- [x] `accept_access`: парсит уровень (обратная совместимость со старыми 2-частными токенами), default `read`
- [x] `PetAccess.objects.update_or_create(..., defaults={'access_level': level})`
- [x] Ответ включает `access_level`

**DoD:** ✅ QR default → read; `?access_level=write` → write.

---

## Этап 2 — Integrity / Wiring (1–2 недели)

### I-1. Дубль RegisterView — ✅ DONE 2026-08-15
- [x] Удалён дубль (второй класс RegisterView строки ~163–208)
- [x] Осталась единственная реализация с `create()`-переопределением
- [x] `manage.py check` — 0 issues; `billing` 8/8 тестов green (регрессии нет)
- [ ] (Тест register → 201 + mailoutbox — в I-4)

**DoD:** ✅ в `users/views.py` ровно один `RegisterView`.

### I-2. common.DictionaryView — починка 500 — ✅ DONE (в рамках P0-2, 2026-08-15)
- [x] `prefetch_related('attributes')` вместо `available_attributes`
- [x] `Tag.color` удалён из вывода
- [x] `options` для select-атрибутов добавлены
- [x] `cat.icon`/`et.icon` → absolute URLs через `request.build_absolute_uri`

**DoD:** ✅ `GET /api/common/dictionaries/` → 200 (проверено runtime: 116 категорий).

### I-3. breeding API — ✅ DONE 2026-08-15 (решение: смонтировать)
- [x] `config/urls.py`: `path('api/breeding/', include('breeding.urls'))`
- [x] Верифицировано: URL-паттерн `api/breeding/` найден, check 0 issues
- [x] `generate_offspring` доступен через `POST /api/breeding/litters/{id}/generate_offspring/`

**DoD:** ✅ `/api/breeding/litters/{id}/generate_offspring/` существует.

### I-4. Тесты authz (минимум, CI-ready) — ✅ DONE 2026-08-15
- [x] `pets/tests.py`: queryset isolation PetViewSet (owner vs access vs shadow) — 3 теста
- [x] `pets/tests.py`: PetEventViewSet — юзер не видит чужие события — 1 тест
- [x] `billing/tests.py`: invoice isolation (P0-1) — 8 тестов
- [x] `pets/tests.py`: attachment upload 403 для чужих / 201 для owner — 3 теста
- [x] `users/tests.py`: роль не ставится через PATCH role + верификация signals (аппрув/reject) — 3 теста
- [x] Bug найдено через скилл diagnosing-bugs: `PetEventAttachmentSerializer` не объявлял `event` → `perform_create` падал `AttributeError`; добавлено поле `event`
- [x] `settings.py`: в тестах используется `InMemoryChannelLayer` (без Redis)
- [ ] (chat tests — опционально, можно добавить позже)

**DoD:** ✅ `python manage.py test pets users billing` — **21/21 green (2026-08-15)**.

### I-5. Invoice totals + stock — ✅ DONE 2026-08-15
- [x] `Invoice.calculate_totals`: tax_amount из снапшотов строк, total = subtotal - discount + tax
- [x] Списание `stock_quantity` при переходе статуса → `paid` (в `Invoice.save` → `_decrement_stock`)
- [x] **Латентный баг исправлен**: `InvoiceItem.save` конкатенировал строки цен (`"100.00"*2="100.00100.00"`) — добавлено приведение к `Decimal`
- [x] Тесты: `InvoiceTotalsAndStockTests` — tax 19% (238€), списание 10→8 при paid, не списание до paid

**DoD:** ✅ `billing` — 11/11 тестов green.

### I-6. Единый «может ли user читать/писать pet» — ✅ DONE 2026-08-15
- [x] `pets/access.py` — единый источник правды
- [x] `PetEventViewSet.get_queryset` → `pet_access_q(user) | Q(created_by=user)`
- [x] `_GetUserPetMixin` (AI sessions/stream) → `pet_access_q(user)`
- [x] `AIConsultView.post` → `pet_access_q(user)`
- [x] `PetEventAttachmentViewSet` → `user_can_access_pet(write=True)` (сделано в P0-4)
- [x] `manage.py check` — 0 issues

**DoD:** ✅ дублирующие Q-фильтры в events/AI/attachments заменены на helper.

### I-7. users.signals + верификация — ✅ DONE (в рамках P0-6, 2026-08-15)
- [x] `users/apps.py`: `def ready(self): import users.signals`
- [x] `handle_verification_status` — approve → is_verified=True, is_veterinarian=True; reject → is_verified=False
- [ ] (Тест approve через admin — в I-4 API-тестах)

**DoD:** ✅ users.signals зарегистрирован; верификация врача теперь срабатывает.

---

## Этап 3 — Product Integrity (2–4 недели)

### P-1. Celery / повторы — ✅ DONE 2026-08-15
- [x] Реализован `POST /api/events/{id}/duplicate/` (PetEventViewSet): planned-копия на next_date (или date+30д), права через `user_can_access_pet(write=True)`
- [x] Тесты: `PetEventIsolationTests` — duplicate 3/3 (planned-копия; 404 для чужого события)
- [x] `backend/celerybeat-schedule` убран из репозитория
- [x] `REDIS_HOST` у celery worker/beat уже починен в P0-5

**DoD:** ✅ кнопка «Schedule now» из `process_repeating_events` теперь ведёт на реальный endpoint.

### P-2. Domain unify
- [ ] **Client entity** — свести guest_name (PetEvent) / guest (Invoice) / temp_owner (Pet) к единой модели `Client` (или единому полю-дженерику)
- [ ] **Pet.user OneToOne** — удалить или переименовать/задокументировать (путаница с owner)
- [ ] **EventType.CATEGORY_CHOICES** — добавить `surgery`, `parasite` (использует AI-фильтр `build_pet_context`/`pets/services`)
- [ ] **simple-history** — или повесить HistoricalRecords на Pet/PetEvent/Invoice, или убрать из INSTALLED_APPS
- [ ] **CatalogItem.code** — unique per `(owner, code)` вместо global

**DoD:** ADR/доменные термины зафиксированы в CONTEXT.md; код соответствует.

### P-3. AI hardening
- [ ] Rate limit: DRF `DEFAULT_THROTTLE_RATES` (например, `ai: 20/hour`)
- [ ] Audit log: `AIConsultLog` (user, pet, prompt, response hash, timestamp)
- [ ] `DEEPSEEK_API_KEY` не логировать
- [ ] Убрать legacy `AIConsultView` (или оставить как alias)

**DoD:** пачка запросов к `/api/ai/consult/` получает 429.

### P-4. OpenAPI / документация
- [ ] `drf-spectacular` → `/api/schema/`, `/api/docs/`
- [ ] Обновить `frontend/types/*.ts` синхронно с serializers
- [ ] `.env.example` (без секретов) в корне

**DoD:** схема генерируется; типы фронта соответствуют.

---

## Этап 4 — Ops / Scale (после стабилизации)

### O-1. CI
- [ ] GitHub Actions: `python manage.py test` (backend), `npm run build` (frontend), lint
- [ ] Миграции в pipeline: перед деплоем `makemigrations --check && migrate`

### O-2. Observability
- [ ] Sentry (backend + frontend)
- [ ] Healthchecks: `/api/health/` (db, redis), уведомление в tg

### O-3. Backups
- [ ] Скрипт `pg_dump` cron + restore drill
- [ ] Документация в `docs/OPS.md`

### O-4. Security headers
- [ ] Nginx: HSTS, CSP, X-Content-Type-Options
- [ ] Убрать дубль `location /ws/`
- [ ] Rate limit на auth endpoints (DRF throttle)

### O-5. Logging
- [ ] Заменить `print()` на `logging.getLogger(__name__).warning(...)`
- [ ] `EMAIL` failures → log, не print
- [ ] `LOGGING` конфиг в settings.py

### O-6. DB hygiene
- [ ] `ALTER DATABASE pet_db_vet REFRESH COLLATION VERSION` (убрать warning)
- [ ] Проверить `backend/media/` — вынести пользовательский контент из git-дерева (`.gitignore`)
- [ ] `celerybeat-schedule` файл исключить из repo

---

## Приоритизация (сводная таблица)

| Приоритет | Задача | Риск при откладывании |
|-----------|--------|------------------------|
| 1 | P0-1 Invoice IDOR | Утечка финансовых данных |
| 2 | P0-2 Protected media | Сканы документов ветеринаров открыты |
| 3 | P0-4 PermissionDenied | 500 вместо 403; ничего не падает, но некорректно |
| 4 | P0-3 JWT + blacklist | Stolen token живёт 30 дней |
| 5 | P0-5 Redis/celery | Redis снаружи + celery не стартует в docker |
| 6 | P0-6 self-service role | Юзер сам становится врачом |
| 7 | P0-7 QR write escalation | Врач получает write без подтверждения владельца |
| 8 | I-2 Dictionary 500 | Offline-словарь всегда 500 |
| 9 | I-7 users.signals | Верификация врача не работает |
| 10 | I-3 breeding | Мёртвый код/нереализованная фича |
| 11 | I-4 authz tests | Регрессии без защитной сети |
| 12 | I-5 totals/tax/stock | Неверная сумма в счетах |
| 13 | I-1 дубль RegisterView | Скрытый дубль кода |

---

## Definition of Ready (для каждого пункта)
- Файл и строка, где будет правка — известны (см. BACKEND-MAP §7)
- Критерий «done» однозначен (DoD выше)
- После правки — `python manage.py check` + целевой тест

## Definition of Done (для этапа)
- Все пункты этапа отмечены `[x]`
- `python manage.py test` — green
- `makemigrations --dry-run --check` — No changes
- Nginx/config перечитаны и задеплоены (stage)
- BACKEND-MAP.md обновлён (проблемы → решено)

---