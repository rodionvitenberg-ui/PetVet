# Масштабный анализ CareYourPet (PetVet)

**Продукт:** careyour.pet / CareYourPet  
**Репозиторий:** `/home/rodion/Project/PetVet`  
**Дата анализа:** 2026-07-24  
**Статус продукта:** post-alpha / early production (живой домен, Docker, SSL, admin Jazzmin)

---

## 1. Executive summary

CareYourPet — **B2C + B2B2C платформа ухода за питомцами** с двумя ролями:

| Роль | Ценность |
|------|----------|
| **Владелец** | Электронный паспорт питомца, события/календарь, AI-консультации, чат с врачом, доступ по QR |
| **Ветеринар / клиника** | «Теневые» карты пациентов, каталог услуг, счета, шаблоны приёма, planboard, поиск/верификация |

Стек зрелый для стартапа (Django 6 + Next.js 16 + Expo + Postgres + Redis + Celery + Channels). Доменная модель **богатая и продуманная** (EAV-атрибуты, server-driven UI, sharing, pedigree, billing с snapshot цен).

**Зрелость по слоям (оценка 1–10):**

| Слой | Оценка | Комментарий |
|------|--------|-------------|
| Доменная модель backend | 7.5 | Хорошая глубина, есть «висящие» поля и недопроводка |
| REST API / бизнес-логика | 6.5 | Основной CRUD живой; gaps: security, breeding URL |
| Web frontend | 7 | Много экранов, i18n, PDF, карта, биллинг UI |
| Mobile | 3 | Скелет offline-first, мало экранов, не parity с web |
| Инфра / деплой | 6 | Docker Compose + nginx + certbot; rsync, single host |
| Тесты / качество | 2 | Пустые `tests.py`, нет CI |
| Безопасность | 4 | Критичные дыры (invoices, media, JWT lifetime) |
| Документация | 2 | README дефолтный Next.js; нет product/arch docs |

**Главный вывод:** это не MVP-заготовка, а **рабочий продукт средней сложности (~23.6k LOC app-кода)** с ядром «паспорт + события + vet workflow». Дальнейший рост упирается не в «нехватку фич-идей», а в **hardening** (security, tests, wiring dead code, mobile parity, ops).

---

## 2. Что такое продукт (продуктовый срез)

### 2.1 Позиционирование

- Бренд в admin: **CareYourPet** / careyour.pet  
- Хост: `careyour.pet`, IP в ALLOWED_HOSTS: `193.180.213.143`  
- Рынок: владельцы + ветклиники; billing с намёком на **Германию/GOT** (`code` / tax / € в verbose)

### 2.2 User journeys (по коду)

1. **Owner:** register/email verify → onboarding → create pet → events/calendar → AI consult → share QR → chat  
2. **Vet:** register → become-vet / verification docs → create patient (shadow pet по телефону) → catalog + invoice → planboard → messages  
3. **Clinic marketing:** pages `for-clinics`, `find-vet` (карта Leaflet)

### 2.3 Feature matrix

| Фича | Backend | Web | Mobile | Статус |
|------|---------|-----|--------|--------|
| Auth JWT + Google | ✅ | ✅ | ✅ login | OK |
| Email activation | ✅ | ✅ verify | ❌ | OK web |
| Pets CRUD + EAV + tags | ✅ | ✅ | partial offline | OK |
| Shadow patients (vet) | ✅ | ✅ | ❌ | OK web |
| PetAccess / QR share | ✅ | ✅ share | ❌ | OK web |
| Public feed | ✅ | ? | ❌ | API есть |
| Events + attachments | ✅ | ✅ | ❌ | OK web |
| Calendar | ✅ filters | ✅ | ❌ | OK |
| Pedigree tree | ✅ | types | ❌ | API |
| Breeding (heat/mating/litter) | models+views | types only | types | **API не в urls** |
| Chat REST + WS | ✅ | ✅ messages | types | OK web |
| Notifications + Celery | ✅ | settings UI | ❌ | OK core |
| AI consult (Gemini) | ✅ | ✅ modal | ❌ | OK |
| Billing catalog/invoices | ✅ | ✅ | ❌ | **IDOR risk** |
| Event templates (macros) | ✅ | catalog UI | ❌ | OK |
| PDF passport | — | ✅ react-pdf | ❌ | client-side |
| Vet verification | ✅ | become-vet | ❌ | OK |
| Dictionaries offline API | ✅ common | — | intended | partial bugs |
| i18n ru/en | modeltranslation | next-intl | ❌ | thin messages |
| Tauri hooks | — | dep present | — | experimental? |

---

## 3. Архитектура системы

```
                    Internet
                        │
                   nginx :80/443
              ┌─────────┼─────────┐
              │         │         │
           Next.js   Daphne    static/media
           :3000     :8000     volumes
              │         │
              │    ┌────┴────┐
              │    │         │
              │  Postgres  Redis
              │            │
              │     Celery worker + beat
              └────────────┘
```

**Компоненты `docker-compose.yml`:**
- `db` — Postgres 15  
- `redis` — брокер Celery + channel layer (**порт 6379 проброшен наружу**)  
- `backend` — Daphne ASGI  
- `frontend` — Next.js  
- `celery_worker` / `celery_beat`  
- `nginx` + `certbot`  
- **mobile не в compose** (отдельный Expo-клиент)

**Деплой:** `deploy.sh` → `rsync` по SSH на `petvet@193.180.213.143` (без blue/green, без миграционного пайплайна в скрипте).

### 3.1 Backend apps

| App | Назначение | LOC (ориентир) |
|-----|------------|----------------|
| `pets` | Ядро: питомцы, категории, атрибуты, события, AI, share | ~views 531 + models 454 + serializers 411 |
| `users` | User, contacts, vet verification, Google auth | models 84, views 237 |
| `billing` | Catalog, Invoice, templates | models 186 |
| `chat` | Rooms, messages, WS consumer | models 63 |
| `notifications` | In-app + settings + Celery tasks | models 67, tasks |
| `breeding` | Heat/Mating/Litter | models 111 — **не подключён к root urls** |
| `common` | Dictionary endpoint для offline | thin |
| `config` | settings, urls, asgi, celery | — |

### 3.2 Frontend structure

- **Next.js App Router** + `[locale]` (next-intl)  
- UI: HeroUI, Tailwind 4, Framer Motion, Leaflet, react-big-calendar, dnd-kit (planboard)  
- ~59 components; страницы: dashboard, pets, calendar, planboard, billing, messages, profile, marketing  
- API: `fetch` + `apiClient.ts` + token в `localStorage`  
- PDF: `@react-pdf/renderer`  
- Зависимость **@tauri-apps** — возможный desktop-эксперимент

### 3.3 Mobile

- Expo 54 + expo-router + NativeWind + expo-sqlite + secure-store  
- Экраны: login, tabs dashboard, pets/create  
- Offline-first задумка (`PetRepository`, local DB) — **далеко от web parity** (~1.5k LOC vs ~16k frontend)

---

## 4. Доменная модель (ubiquitous language)

### 4.1 Ядро

```
User (owner | veterinarian + is_verified)
  ├── pets (owner)
  ├── created_pets (vet shadow cards)
  ├── granted_accesses → PetAccess(read|write)
  ├── verification_requests → VetVerificationRequest
  └── contacts → UserContact

Category (tree parent/children)
  ↔ Tag, Attribute (M2M; server-driven attr_type: text|number|select|checkbox|date)

Pet
  ├── categories, tags, attributes (PetAttribute EAV)
  ├── mother/father self-FK → pedigree
  ├── images, events → PetEvent → attachments
  ├── temp_owner_* (shadow patient)
  ├── is_public (feed)
  └── user OneToOne (спорное поле «pet_profile»)

EventType (category medical|reproduction|show|care|other + JSON schema)
PetEvent (status planned|completed|missed, data JSON, guest_*, is_verified)

ChatRoom(pet, vet, owner) → ChatMessage
Notification + NotificationSettings (GFK)
CatalogItem → Invoice → InvoiceItem (price snapshot)
EventTemplate → TemplateItem
HeatCycle / Mating / Litter (breeding)
```

### 4.2 Сильные решения

1. **EAV + server-driven UI** (`Attribute.attr_type`, `EventType.default_schema`) — масштабируется на виды животных без миграций.  
2. **Shadow pets** — клиника работает с walk-in до регистрации владельца.  
3. **PetAccess + TimestampSigner QR** — понятный share-flow (TTL 1h).  
4. **InvoiceItem snapshot** (`name_at_moment`, `price_at_moment`) — правильный accounting pattern.  
5. **Pedigree recursive serializer** + mother/father validation.  
6. **AI context builder** (`build_pet_profile_prompt`) с репро-статусом из тегов.  
7. **Celery flexible reminders** по `NotificationSettings.reminder_time_minutes`.

### 4.3 Слабые / спорные места модели

| Проблема | Детали |
|----------|--------|
| `Pet.user` OneToOne `pet_profile` | Неочевидный смысл; риск путаницы с `owner` |
| `HistoricalRecords` | Импорт + app в settings, **на моделях не используется** |
| Breeding не в root `urls` | Мёртвый API при живых models/views |
| `Invoice.calculate_totals` | Не пересчитывает `tax_amount` (поле есть, логика нет) |
| `CatalogItem.code` unique global | Конфликт между клиниками при одном коде |
| Двойственность guest vs client | Повторяется в PetEvent, Invoice, Pet — нужна единая «Client» entity |
| `EventType.category` vs filters AI | AI фильтрует `surgery`, `parasite` — **нет в CATEGORY_CHOICES** |

---

## 5. API surface (кратко)

**Mounted:**
- `/api/` → pets (pets, categories, attributes, tags, events, event-types, attachments, images, `ai/consult/`)
- `/api/auth/` → users
- `/api/token/`, `/api/token/refresh/`
- `/api/chat/`
- `/api/billing/`
- `/api/common/`
- `/api/` notifications
- WebSocket `/ws/` chat + notifications

**NOT mounted:**
- `breeding.urls` (cycles/matings/litters) — views существуют, root include отсутствует

**Lookup pets:** по коду ViewSet — slug/id (проверить `lookup_field` в serializers/viewset при детальном аудите).

---

## 6. Безопасность (приоритетный блок)

### 🔴 Critical

1. **IDOR на счетах** — `InvoiceViewSet.get_queryset` возвращает `Invoice.objects.all()` любому authenticated пользователю.  
2. **Публичные media** — nginx `location /media/` отдаёт всё, включая `vet_docs/` (сканы документов верификации) и chat attachments. В коде users есть комментарий об этом риске.  
3. **JWT ACCESS_TOKEN_LIFETIME = 30 days** — чрезмерно; `BLACKLIST_AFTER_ROTATION=True` при `ROTATE_REFRESH_TOKENS=False` почти бессмыслен.  
4. **`.env` в workspace** — ключи присутствуют локально (SECRET_KEY, DB, GEMINI, email); gitignore есть, но operational risk.

### 🟠 High

5. **Redis 6379 published** в docker-compose на хост.  
6. **PermissionDenied** в `PetEventAttachmentViewSet` **без import** — runtime NameError вместо 403 (fail-open/fail-crash).  
7. **Attachment queryset** только `event__pet__owner` — vets с write access не видят/не грузят файлы; и наоборот, логика несогласована с PetAccess.  
8. **Self-service `is_veterinarian`** через PATCH role=vet — верификация отдельная, но роль можно взять до проверки.  
9. **Accept access** всегда выдаёт `write` — нет выбора уровня.  
10. **CSRF_COOKIE_SAMESITE=None** + Secure cookies — ок для cross-site, но требует дисциплины origin.

### 🟡 Medium

11. Дублирующий `location /ws/` в nginx.  
12. AI prompt injection / PII в Gemini (история питомца уходит во внешний API) — нет audit log, rate limit.  
13. Нет rate limiting / throttling DRF.  
14. Нет security headers в nginx (HSTS, CSP) явно.  
15. Console `print` для email errors вместо logging.

---

## 7. Надёжность и корректность

| Issue | Impact |
|-------|--------|
| Нет автотестов (все `tests.py` — stubs ~3 строки) | Регрессии при любом рефакторинге |
| Нет CI | Деплой = rsync надежды |
| `common.DictionaryView` | `prefetch_related('available_attributes')` — **related name не совпадает** с `Category.attributes` → потенциальный 500 |
| Celery beat | Два присваивания `beat_schedule`; второе корректное (dead first block — мёртвый код) |
| `process_repeating_events` | Ссылается на `/api/events/{id}/duplicate/` — **endpoint, возможно, не реализован** |
| Tax/stock | `is_stock_tracked` есть, списание остатков при invoice — не видно |
| i18n messages | HomePage title/subtitle = «Тест» — незавершённый контент |
| Media в git? | `backend/media/` содержит пользовательский контент в дереве проекта — риск и шум |

---

## 8. Качество кода и DX

**Плюсы:**
- Русские verbose_name / комментарии — команда RU  
- Prefetch/select_related в hot paths  
- Postgres full-text search (SearchVector/Rank)  
- Recursive CTE для category tree  
- Jazzmin admin branding  
- modeltranslation ru/en  

**Минусы:**
- God-module `pets/views.py` (~530 LOC)  
- Дубли логики доступа (повторяющийся Q-filter owner|access|created_by) — нужен permission service  
- Смешение EN/RU в UI strings backend+frontend  
- Коммиты `2`, `v1`, `beta02` — нет conventional commits / changelog  
- Frontend README — boilerplate  
- Нет OpenAPI/Swagger  
- Нет `.env.example` в корне (gitignore исключает, но example полезен)

**Авторы git:** Rodion (34), sonoroom (8) — small team.

---

## 9. Инфраструктура и ops

| Тема | Состояние |
|------|-----------|
| Orchestration | Single-node Docker Compose |
| TLS | Let's Encrypt via certbot volumes |
| Deploy | manual rsync |
| Backups | **не видно** в репо |
| Monitoring/APM | **нет** |
| Secrets | env vars; no vault |
| Scaling | vertical only; Daphne single process implied |
| Static | collectstatic → volume; path `/django_static/` |
| Mobile release | не в pipeline |

---

## 10. AI-подсистема

- Provider: **Google Gemini** (`gemini-2.0-flash`, JSON mode)  
- Endpoint: `POST /api/ai/consult/`  
- Контекст: профиль + теги neuter + last 5 medical-ish events  
- UI: `AIConsultModal`  
- Риски: cost control, medical disclaimer, hallucination, privacy (GDPR если EU), no caching, no conversation history model

---

## 11. Mobile strategy

Задумка: **offline-first** (SQLite + sync).  
Факт: dashboard list pets local, create pet, login.  
Нет: events, chat, billing, AI, share, calendar, i18n parity.

**Вывод:** mobile — spike/prototype; product surface = web.

---

## 12. Соответствие заявленным «большим» возможностям

| Заявка (по коду/маркетинговым страницам) | Реальность |
|------------------------------------------|------------|
| Паспорт питомца + PDF | Web solid |
| Клиника / счета / GOT-ready | Models yes; multi-tenant isolation weak |
| AI vet mentor | Working path |
| Realtime chat | Channels OK |
| Breeding program | **Backend orphan** |
| Multi-platform | Web > Mobile gap |
| Map find-vet | Leaflet present |

---

## 13. Рекомендуемый roadmap (после анализа)

### P0 — Security hotfix (1–3 дня)
1. Filter invoices by creator/clinic ownership  
2. Закрыть `vet_docs/` (и ideally chat) от публичного nginx; auth-protected media  
3. Укоротить JWT (access 15–60m, refresh 7–30d + rotation)  
4. Fix `PermissionDenied` import; unify attachment permissions with PetAccess  
5. Убрать publish Redis port; review firewall  

### P1 — Integrity (1–2 недели)
6. Подключить или удалить `breeding` из API  
7. Починить `common.DictionaryView` related names  
8. Unit/API tests на authz (pets, events, invoices, chat)  
9. `duplicate` event endpoint или убрать action metadata  
10. Tax calculation + stock decrement policy  

### P2 — Product completeness (2–6 недель)
11. Client entity unification (guest merge by phone)  
12. Breeding UI или freeze feature  
13. OpenAPI + thin README architecture  
14. Mobile: sync pets+events only (thin client)  
15. Rate limit AI + audit log  

### P3 — Scale / ops
16. CI (lint, test, build images)  
17. DB backups + restore drill  
18. Observability (Sentry, healthchecks)  
19. Multi-tenant clinic org model if B2B  

---

## 14. Сопутствующие документы

- **[TODO.md](./TODO.md)** — полный backlog (P0–P3) с чекбоксами и DoD  
- **[SECURITY-TODO.md](./SECURITY-TODO.md)** — только P0 security  

Правки кода — по TODO, не часть этого анализа.

---

## 15. Метрики кодовой базы (snapshot)

| Метрика | Значение |
|---------|----------|
| App LOC (py+ts/tsx, без node_modules/venv) | ~23 620 |
| Backend Python | ~5 888 |
| Frontend TS/TSX | ~16 673 |
| Mobile TS/TSX | ~1 563 |
| Backend Django apps | 7 domain + config |
| Frontend routes (locale pages) | ~20+ |
| Automated tests | ~0 meaningful |
| Git commits sample | alpha → beta → v1 → numeric «2» |

---

## 16. Итоговая оценка

CareYourPet — **амбициозный full-stack pet-health product** с правильным dual-audience дизайном (owner ↔ vet) и несколькими «взрослыми» паттернами (EAV, snapshots, QR share, Celery reminders, AI context).  

Сейчас это **production-adjacent monorepo**: web и backend несут продукт; mobile и breeding — незавершённые ветки; **безопасность billing/media и отсутствие тестов — главный долг**, который важнее новых фич.

**Рекомендация:** зафиксировать анализ в `docs/`, затем спринт P0 security, затем test harness на authorization — и только после этого расширять breeding/mobile.
