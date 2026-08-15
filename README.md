# PetVet (CareYourPet) — Платформа управления здоровьем питомцев

Монорепозиторий ветеринарной платформы: карточки питомцев, план-доска событий, календарь, AI-консультации, ветеринарные клиники и онлайн-оплата. Владелец ведёт здоровье питомца, ветеринар работает с «теневыми» картами до подтверждения владельца, а клиника получает единый кабинет для пациентов, биллинга и шаблонов.

**Статус (2026-08-15):** Backend — ✅ здоровый, ошибки исправлены (P0-безопасность + integrity + рефакторинг по ponytail, 23/23 тестов green). Frontend — ⏳ работает, но требует доработки (7 незакрытых пунктов аудита).

---

## Оглавление

1. [Архитектура](#архитектура)
2. [Быстрый старт (локальная разработка)](#быстрый-старт-локальная-разработка)
3. [Docker Compose](#docker-compose)
4. [Backend](#backend)
5. [Frontend](#frontend)
6. [Переменные окружения](#переменные-окружения)
7. [Развёртывание](#развёртывание)
8. [Статус проекта](#статус-проекта)
9. [Роадмап](#роадмап)
10. [Документация](#документация)

---

## Архитектура

```
                         Internet
                             │
                        nginx :80/443
               ┌─────────────┼──────────────┐
               │             │              │
          Next.js        Daphne         static/media
          :3000          :8000         (Docker volumes)
               │             │
               │        ┌────┴────┐
               │        │         │
               │    Postgres    Redis   <-- только внутренняя сеть Docker
               │                 │
               │      Celery worker + beat
               └─────────────────┘
```

| Каталог | Назначение | Стек |
|---------|------------|------|
| `frontend/` | Веб-портал (SPA/SSR) | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, next-intl |
| `backend/` | REST + WebSocket API | Django 6.0, DRF 3.16, Channels 4.3 (Daphne), Celery 5.3, PostgreSQL, Redis |
| `nginx/` | Прокси, SSL, protected media | nginx + certbot |
| `petvet-mobile/` | Мобильное приложение (не в фокусе) | Expo / React Native |

---

## Быстрый старт (локальная разработка)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# БД настроена в .env; применяем миграции
python manage.py migrate --noinput

# Опционально: наполнение демо-данными
python manage.py seed_demo_pets --noinput

# Запуск (REST + WebSocket)
python manage.py runserver
```

Ключевые команды:

| Команда | Описание |
|---------|----------|
| `python manage.py check` | Статическая проверка конфигурации |
| `python manage.py test --noinput` | Тесты (23 шт., green) |
| `python manage.py makemigrations --check --dry-run` | Проверка незакоммиченных миграций |
| `python manage.py seed_demo_pets` | Демо-данные питомцев |
| `python manage.py seed_production_data` | Продакшн-данные (категории, шаблоны) |

> ⚠️ Все команды запускать из `backend/` с активированным venv. `--noinput` — для неинтерактивных окружений (CI/агенты).

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev-сервер |
| `npm run build` | Продакшн-сборка (standalone) |
| `npm run start` | Запуск собранного приложения |
| `npm run lint` | ESLint |

---

## Docker Compose

| Сервис | Образ / команда | Порт |
|--------|-----------------|------|
| `db` | postgres:15-alpine | внутренний |
| `redis` | redis:7-alpine | **не публикуется** (только внутренняя сеть) |
| `backend` | `./backend` → daphne :8000 | expose 8000 |
| `frontend` | `./frontend` → Next.js standalone | expose 3000 |
| `nginx` | nginx:1.27-alpine | **80:80, 443:443** |
| `certbot` | certbot/certbot | — |
| `celery_worker` | `./backend` → `celery -A config worker` | — |
| `celery_beat` | `./backend` → `celery -A config beat` | — |

```bash
docker compose up -d --build
```

Проксируется через nginx: `https://careyour.pet` → frontend (веб) и backend (`/api/`, protected `/media/vet_docs|chat_attachments|event_docs|health_docs/`).

---

## Backend

### Стек

Django 6.0 • DRF 3.16.1 • Channels 4.3.2 (Daphne) • Celery 5.3.6 • SimpleJWT 5.5.1 • modeltranslation 0.19 • django-filter 25.2 • PostgreSQL 15 • Redis 7

### Приложения

| App | Модели | Назначение |
|-----|--------|------------|
| `users` | User, UserContact, VetVerificationRequest | Регистрация, активация, Google OAuth, верификация врачей |
| `pets` | Category, Tag, Attribute, Pet, PetImage, PetAttribute, EventType, PetEvent, PetEventAttachment, PetAccess | Ядро: карточки питомцев (EAV), события, доступ по QR |
| `vetclinics` | VetClinic, ClinicMember, ExamTemplate, ClinicInvite | Клиники, приглашения, шаблоны осмотров |
| `billing` | CatalogItem, EventTemplate, TemplateItem, Invoice, InvoiceItem | Каталог услуг, счета (snapshot цен), шаблоны событий |
| `chat` | ChatRoom, ChatMessage | Чаты врач↔владелец (REST + WebSocket) |
| `notifications` | Notification, Reminder, NotificationSettings | Уведомления (in-app + email), напоминания, Celery-задачи |
| `ai` | SystemPrompt, AIChatSession, AIChatMessage | AI-консультации (DeepSeek), сессии, SSE-стриминг |
| `breeding` | HeatCycle, Mating, Litter | Разведение (смонтировано, минимальное использование) |
| `common` | — | Словари (`/api/common/dictionaries/`), protected media |

### Доменная модель (ядро)

```
User (owner | veterinarian | is_verified)
 ├── pets (owner)             → Pet
 ├── created_pets             → shadow-карты (врач до регистрации владельца)
 ├── granted_accesses         → PetAccess (read | write)
 ├── verification_requests    → VetVerificationRequest
 └── contacts                 → UserContact

Pet
 ├── categories / tags / attributes (PetAttribute — EAV, attr_type: text|number|select|checkbox|date)
 ├── mother/father (самородословная)
 ├── images (PetImage)
 ├── events (PetEvent → PetEventAttachment; status: planned|completed|missed)
 ├── temp_owner_name/phone    → shadow-пациент
 └── clinic (FK → VetClinic)

PetEvent       → notifications (owner + access grants) + Reminder (Celery)
PetAccess      → QR-доступ через TimestampSigner (TTL 1h) → ChatRoom (сигнал)
ChatRoom       → ChatMessage (text | attachment)
CatalogItem    → Invoice → InvoiceItem (снимок name/price/tax_at_moment)
EventTemplate  → TemplateItem
```

### API surface

| Prefix | Функции |
|--------|---------|
| `/api/pets/` | pets, categories, attributes, tags, events, event-types, event-attachments, pet_images |
| `/api/auth/` | register, activate, google, me, demo-login, contacts, verification |
| `/api/token/` | SimpleJWT login / refresh (access 60m, refresh 30d, rotation) |
| `/api/chat/` | rooms, messages, attachments/upload |
| `/api/billing/` | catalog, invoices, templates |
| `/api/common/` | dictionaries, protected-media |
| `/api/ai/` | prompts, sessions (SSE-streaming) |
| `/api/clinics/` | clinic CRUD, members, invites, join, templates |
| `/api/breeding/` | heat-cycles, matings, litters, generate_offspring |
| `/api/notifications/` | notifications, notification-settings |
| WS | `/ws/chat/{room_id}/`, `/ws/notifications/` (JWT в query_string) |

### Ключевые паттерны

1. **EAV + server-driven UI** — Attribute.attr_type, EventType.default_schema (JSON).
2. **Shadow pets** — врач создаёт карту до регистрации владельца (`temp_owner_*`).
3. **QR share** — `TimestampSigner` с уровнем доступа `?access_level=read|write` (default **read**).
4. **Invoice snapshot** — `name/price/tax_at_moment` фиксируются при формировании счёта.
5. **Единый доступ** — `pets/access.py`: `pet_access_q()` / `user_can_access_pet()` — единый источник правды для pets/events/attachments/AI/billing.
6. **Celery-напоминания** — hourly email, flexible in-app (1 мин), daily repeating events (09:00).
7. **Protected media** — `vet_docs`, `chat_attachments`, `event_docs`, `health_docs` отдаются только авторизованным (Django; nginx проксирует эти пути).

### Тесты

```bash
cd backend && source venv/bin/activate && python manage.py test pets users billing
```

**23/23 green (2026-08-15):** pets/users/billing — изоляция питомцев, событий и счетов; роль через PATCH; верификация; totals/tax/stock; attachments 403/201.

---

## Frontend

### Стек

Next.js 16 (App Router) • React 19 • TypeScript • Tailwind CSS 4 • next-intl 4 (i18n) • motion • HeroUI (@heroui/react) • react-big-calendar • leaflet • @react-pdf/renderer • @dnd-kit

### Структура

```
frontend/
├── app/
│   ├── [locale]/           # i18n-сегмент (en/ru)
│   │   ├── page.tsx        # Landing
│   │   ├── login|register|verify|demo/   # Auth
│   │   ├── planboard/      # Дни питомца (drag-n-drop)
│   │   ├── calendar/       # Календарь событий
│   │   ├── find-vet/       # Карта ветеринаров (leaflet)
│   │   ├── pets/           # Карточка питомца, создание, события
│   │   ├── dashboard/      # Личный кабинет: pets, catalog, ai-chat, clinic, messages
│   │   ├── billing/invoices/  # Счета
│   │   ├── become-vet|for-clinics|about|privacy|terms|share/  # Маркетинговые/статические
│   ├── globals.css         # Tailwind 4 + CSS-переменные
│   └── middleware.ts       # next-intl middleware (localePrefix: 'never')
├── components/
│   ├── home/ auth/ dashboard/ pet-form/ planboard/ billing/
│   ├── calendar/ map/ pdf/ notifications/ providers/ ui/
├── hooks/                  # usePetForm, useChatWebSocket
├── i18n/                   # routing.ts (locales: en, ru)
├── lib/                    # apiClient.ts (JWT, refresh, fetch)
├── messages/               # en.json, ru.json
├── services/               # aiChatService, chat, clinicService
└── types/                  # ai-chat.ts, clinic.ts + типы API
```

### Ключевые страницы

| Роут | Назначение |
|------|------------|
| `/` | Landing (Hero, AboutProject, PetsGrid, ForVeterinarians) |
| `/login`, `/register`, `/verify`, `/demo` | Auth (Google OAuth, демо-вход) |
| `/planboard` + `/planboard/pets/[id]` | План-доска: рутинные уходы и лечения питомца (drag-n-drop) |
| `/calendar` | Календарь событий (react-big-calendar) |
| `/pets/[id]`, `/pets/create`, `/pets/[id]/events/create` | Карточка/фото/медицина/родословная, создание событий |
| `/dashboard` | Личный кабинет: питомцы, фильтры, действия |
| `/dashboard/catalog` | Каталог услуг ветеринара |
| `/dashboard/ai-chat` | AI-консультация (SSE-стриминг) |
| `/dashboard/clinic/[id]` | Кабинет клиники: пациенты, шаблоны, счета |
| `/dashboard/messages` | Чаты врач↔владелец |
| `/billing/invoices` | Счета и оплата |
| `/find-vet` | Карта ветеринаров (leaflet) |
| `/share` | Принятие QR-доступа к питомцу |

### Контексты и провайдеры

`AuthProvider` (JWT + Google OAuth), `ChatProvider` (WebSocket), `AppModeProvider` (режим владелец/врач/клиника), `NotificationListener` (WS уведомления), `NotificationSettingsModal` (настройки напоминаний).

---

## Переменные окружения

### Backend — `backend/.env`

| Переменная | Описание |
|------------|----------|
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL |
| `REDIS_HOST`, `REDIS_PORT` | Redis (брокер Celery + Channels; в docker — `redis`) |
| `SECRET_KEY` | Django secret |
| `DEBUG` | `False` в проде |
| `ALLOWED_HOSTS` | localhost, backend, IP, careyour.pet |
| `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` | careyour.pet + localhost:3000 |
| `DEEPSEEK_API_KEY` | AI-провайдер (DeepSeek) |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | SMTP (gmail) |

> ⚠️ `.env` содержит секреты и **не должен** попадать в git. Для эталонной конфигурации нужен `.env.example` (см. роадмап, P-4).

### Frontend — `frontend/.env.local`

| Переменная | Описание |
|------------|----------|
| `NEXT_PUBLIC_API_URL` | Базовый URL API (в docker — `https://careyour.pet`) |
| `GOOGLE_CLIENT_ID` | OAuth-клиент Google |

---

## Развёртывание

Продакшн запускается через `docker compose up -d --build`:

1. **nginx** терминирует SSL (certbot), проксирует `:3000` (web) и `:8000` (`/api/`, protected media).
2. **backend** — Daphne (ASGI) для REST + WebSocket; статика/медиа в Docker volumes.
3. **celery_worker / celery_beat** — задача `send_reminder_emails`, `send_flexible_reminders`, `process_repeating_events`.
4. **Redis** — только внутренняя сеть (< 6379 не публикуется — security fix P0-5).
5. **Protected media**: nginx regex `^/media/(vet_docs|chat_attachments|event_docs|health_docs)/` → Django `ProtectedMediaView` (401 без auth, проверка доступа).

Деплой-скрипт: `./deploy.sh`.

---

## Статус проекта

### Backend — ✅ ЗДОРОВ (2026-08-15)

Недавние исправления ошибок (этапы 0–2 дорожной карты):

| Область | Было | Стало |
|---------|------|-------|
| **IDOR invoices** | `Invoice.objects.all()` — любой видит счета | изоляция по `created_by/client/pet owner/access` + `IsInvoiceEditor`, 8 тестов |
| **Protected media** | документы ветеринаров открыты через `/media/` | `ProtectedMediaView` + nginx regex; DictionaryView починен (200) |
| **JWT** | access 30d / refresh 60d, без rotation | access 60m / refresh 30d + rotation + blacklist |
| **PermissionDenied** | attachment к чужому событию → **500 NameError** | 403 (импорт фикс + `user_can_access_pet`) |
| **Redis** | порт 6379 открыт наружу; celery не получал `REDIS_HOST` | порт убран; celery получает `REDIS_HOST=redis` |
| **Self-service role** | любой становился врачом через PATCH | role игнорируется; только admin + верификация |
| **QR access** | всегда `write` | `?access_level=read\|write`, default **read** |
| **RegisterView** | дубль класса (первый мёртвый) | единственная реализация |
| **users.signals** | верификация врача не срабатывала | `import users.signals` → approve/reject работает |
| **breeding** | мёртвый API (не в urls) | смонтирован `/api/breeding/` |
| **Totals/stock** | tax не считался; цены конкатенировались как строки | Decimal-снапшоты, tax + discount, списание stock при paid |
| **Duplicate endpoint** | Celery ссылался на несуществующий `/duplicate/` | `POST /api/events/{id}/duplicate/` реализован |

**Тесты: 23/23 green** — `python manage.py test --noinput`.

### Frontend — ⏳ РАБОТАЕТ, ТРЕБУЕТ ДОРАБОТКИ

Из аудита исправлено 11 из 18 пунктов (единая анимация `motion`, удалены лишние иконки, CSS-переменные, декомпозиция `PetDetailsModal` → 4 компонента, удалены неиспользуемые библиотеки (sonner, tw-animate-css), починены токены и Rules-of-Hooks).

**Осталось (7):**

| # | Проблема | Severity |
|---|----------|----------|
| P4 | `AboutProject` — 3-card AI slop | 🟡 Major (~30 мин) |
| P5 | Dark mode отсутствует | 🟡 Major (~1 час) |
| P7 | border-radius не консистентен | 🟡 Major (~30 мин) |
| P8 | focus-visible доступность | 🟡 Major (~30 мин) |
| P9 | Header `h-20` не адаптивен | 🟡 Major (~1 час) |
| P10 | LoginPage требует редизайна | 🟡 Major (~1.5 часа) |
| P14/P15 | Русские комментарии; костыль `isClient` | 🟢 Minor |

---

## Роадмап

### Backend — Этап 3 (Product Integrity)

- [x] Единый резолвер **Client** (`resolve_client` в `pets/services.py`; guest/temp_owner/Invoice client унифицирован). Полноценная модель Client — отдельный ADR при необходимости
- [x] Спорное поле `Pet.user` (OneToOne) — удалено (миграция `pets.0009`)
- [x] `EventType.CATEGORY_CHOICES`: `surgery`, `parasite` присутствуют
- [x] `simple-history` — убрано из INSTALLED_APPS и requirements
- [x] `CatalogItem.code`: unique по `(owner, code)` (констрайнты в billing/models.py)

### Backend — Этап 4 (Ops)

- [x] CI (GitHub Actions) — `.github/workflows/ci.yml` (check, migrations-check, tests, tsc, build)
- [x] Healthcheck — `GET /api/common/health/` (db + redis; runtime 200)
- [x] Бэкапы — `scripts/backup.sh` (`pg_dump` + media, ротация) + `docs/OPS.md`
- [x] Nginx: HSTS/CSP/nosniff/X-Frame/Referrer; rate limit на auth (10/h)
- [x] Логирование — `LOGGING` конфиг + `print()` → logger
- [ ] Sentry (backend + frontend) — требует `SENTRY_DSN`
- [ ] DB collation refresh (`ALTER DATABASE ... REFRESH COLLATION VERSION`)

### Frontend

- [ ] Скорейшие победы: P14 + P15 + P8 (~30 мин)
- [ ] P4 AboutProject (~30 мин)
- [ ] P7 border-radius, P9 Header, P10 LoginPage
- [ ] P5 Dark mode

---

## Документация

| Документ | Содержание |
|----------|------------|
| `docs/BACKEND-MAP.md` | Полная карта бэкенда: приложения, домены, API, потоки, найденные проблемы |
| `docs/BACKEND-ROADMAP.md` | Дорожная карта этапов 0–4; зафиксированные DoD |
| `docs/FRONTEND-AUDIT.md` | Аудит UI: 11 исправлено / 7 осталось |
| `docs/ANALYSIS.md` | Первичный анализ проекта |
| `docs/TODO.md`, `docs/SECURITY-TODO.md` | Задачи и security-бэклог (⚠️ местами расходятся с кодом — сверяйте с BACKEND-MAP) |
| `docs/OPS.md` | Операционная документация: бэкап/восстановление, деплой, мониторинг healthcheck, логи, секреты |
| `docs/REFACTORING-2026-08-15.md` | Сводка работ по ponytail-аудиту и ROADMAP (этапы A–D, P-2/P-3/P-4, O-1…O-5) |
| `.env.example` | Шаблон переменных окружения без секретов |
| `scripts/backup.sh` | Бэкап Postgres + media (cron) |
| `.github/workflows/ci.yml` | CI: backend (check/tests/migrations) + frontend (tsc/build) |
| `docs/adr/0001-ai-chat-sse-streaming.md` | ADR: SSE-стриминг AI-чата |

---

## Лицензия

Приватный проект. Репозиторий: `https://github.com/rodionvitenberg-ui/PetVet`.