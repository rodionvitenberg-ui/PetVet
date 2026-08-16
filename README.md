# 🐾 CareYour.Pet — Платформа управления здоровьем питомцев

> **CareYour.Pet** — это единая экосистема для владельцев животных, ветеринарных врачей и клиник: цифровая медкарта питомца, планирование ухода, AI-консультации и онлайн-оплата — в одном месте.

[![Status](https://img.shields.io/badge/status-production%20ready-22c55e?style=flat-square)](https://careyour.pet) [![Frontend](https://img.shields.io/badge/frontend-Next.js%2016-0ea5e9?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org) [![Backend](https://img.shields.io/badge/backend-Django%206-092e20?style=flat-square&logo=django)](https://www.djangoproject.com) [![Database](https://img.shields.io/badge/db-PostgreSQL%2015-4169e1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org) [![Docs](https://img.shields.io/badge/docs-Swagger%20UI-6d28d9?style=flat-square)](https://careyour.pet/api/docs/)

---

## 📖 Оглавление

1. [О проекте](#-о-проекте)
2. [Кому и зачем](#-кому-и-зачем)
3. [Возможности](#-возможности)
4. [Архитектура](#-архитектура)
5. [Структура репозитория](#-структура-репозитория)
6. [Быстрый старт](#-быстрый-старт)
7. [Переменные окружения](#-переменные-окружения)
8. [API](#-api)
9. [Карта функциональности](#-карта-функциональности)
10. [Тестирование и CI](#-тестирование-и-ci)
11. [Развёртывание и эксплуатация](#-развёртывание-и-эксплуатация)
12. [Документация](#-документация)

---

## 🎯 О проекте

**CareYour.Pet** решает главную проблему заботы о животном: разрозненные бумажные карты, забытые прививки и потерянные контакты врачей. Платформа собирает всю медицинскую и уходовую историю питомца в одну цифровую карту и соединяет владельца с ветеринарными специалистами.

Три ключевые роли работают в одном продукте:

| Роль | Что получает |
|------|--------------|
| 🧑 Владелец | Цифровую медкарту питомца, планирование ухода, AI-консультации, чат с врачом, онлайн-оплату |
| 👨‍⚕️ Врач | «Теневые» карты до регистрации владельца, каталог услуг, шаблоны осмотров, чаты и счета |
| 🏥 Клиника | Единый кабинет: пациенты, команда, шаблоны процедур, биллинг |

---

## 🏁 Кому и зачем

| Пользователь | Сценарий |
|--------------|----------|
| **Владелец кошки/собаки** | Хранит прививки, вес, обработки и визиты в одной карте; получает напоминания; задаёт вопросы AI-консультанту; делится картой с врачом по QR |
| **Ветеринарный врач** | Быстро заводит «теневую» карту пациента до регистрации владельца; ведёт протоколы осмотров по шаблонам; выставляет счета; общается в чате |
| **Клиника** | Управляет пациентами, врачами, шаблонами процедур и каталогом услуг; формирует счета со снимком цен |

---

## ✨ Возможности

### Для владельца
- 🐕 **Цифровая медкарта питомца** — EAV-модель характеристик, фото, родословная (`/pets/[id]`)
- 📅 **План-доска ухода** — drag-n-drop рутинные уходы и лечения (`/planboard`)
- 🗓️ **Календарь событий** — прививки, визиты, обработки (`/calendar`)
- 🤖 **AI-консультант** — чат на DeepSeek с потоковым выводом ответов (SSE) (`/dashboard/ai-chat`)
- 💬 **Чат с врачом** — реальное время через WebSocket (`/dashboard/messages`)
- 🔗 **QR-доступ** — временная ссылка на карту (read/write, TTL 1 час) (`/share`)
- 🧾 **Счета и оплата** — каталог услуг и онлайн-оплата (`/billing/invoices`)
- 🔔 **Напоминания** — гибкие in-app + email (Celery)
- 📱 **Ветеринары рядом** — карта клиник на Leaflet (`/find-vet`)

### Для врача и клиники
- 🩺 **«Теневые» карты** — врач создаёт карту до регистрации владельца
- 🧰 **Каталог услуг** — свой прайс с налогами, скидками и остатками (`/dashboard/catalog`)
- 📋 **Шаблоны осмотров** — переиспользуемые протоколы процедур
- 🗂️ **Кабинет клиники** — пациенты, команда, приглашения (`/dashboard/clinic/[id]`)
- 👥 **Многопользовательский доступ** — врач ↔ владелец ↔ клиника

---

## 🏗 Архитектура

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
               │    Postgres    Redis   ← только внутренняя сеть Docker
               │                 │
               │      Celery worker + beat
               └─────────────────┘
```

| Компонент | Стек |
|-----------|------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, next-intl (i18n en/ru) |
| **Backend** | Django 6.0, DRF 3.16, Channels 4.3 (Daphne/ASGI), Celery 5.3, SimpleJWT |
| **Данные** | PostgreSQL 15, Redis 7 |
| **Инфраструктура** | nginx (TLS, защищённые медиа), docker compose, GitHub Actions CI |

---

## 📁 Структура репозитория

```
PetVet/
├── frontend/          # Next.js веб-портал (SPA/SSR, i18n en/ru)
├── backend/           # Django REST + WebSocket API
├── nginx/             # Прокси, SSL, защищённые медиа
├── petvet-mobile/     # Мобильное приложение (Expo/React Native, не в фокусе)
├── docs/              # Архитектурная и операционная документация
├── scripts/           # Служебные скрипты (backup.sh)
├── .github/workflows/ # CI: check, migrations, tests, tsc, build
└── docker-compose.yml # Полный продакшн-стек
```

### Backend — приложения

| App | Модели | Назначение |
|-----|--------|------------|
| `users` | User, UserContact, VetVerificationRequest | Регистрация, активация, Google OAuth, верификация врачей |
| `pets` | Category, Tag, Attribute, Pet, PetImage, PetAttribute, EventType, PetEvent, PetEventAttachment, PetAccess | Ядро: EAV-карты питомцев, события, доступ по QR |
| `vetclinics` | VetClinic, ClinicMember, ExamTemplate, ClinicInvite | Клиники, приглашения, шаблоны осмотров |
| `billing` | CatalogItem, EventTemplate, TemplateItem, Invoice, InvoiceItem | Каталог услуг, счета (snapshot цен), шаблоны |
| `chat` | ChatRoom, ChatMessage | Чаты врач↔владелец (REST + WebSocket) |
| `notifications` | Notification, Reminder, NotificationSettings | Уведомления (in-app + email), напоминания, Celery |
| `ai` | SystemPrompt, AIChatSession, AIChatMessage | AI-консультации (DeepSeek), SSE-стриминг |
| `breeding` | HeatCycle, Mating, Litter | Разведение |
| `common` | — | Словари, защищённые медиа, healthcheck |

### Frontend — ключевые страницы

| Роут | Что это | Как пользоваться |
|------|---------|------------------|
| `/` | Лендинг | Обзор продукта, вход/регистрация |
| `/login`, `/register`, `/verify` | Аутентификация | Email + пароль или Google OAuth |
| `/dashboard` | Личный кабинет | Список питомцев, фильтры, быстрые действия, создание карты |
| `/dashboard/ai-chat` | AI-консультант | Выберите питомца и задайте вопрос — ответ стримится в реальном времени |
| `/pets/[id]` | Карточка питомца | Медицинская история, фото, родословная, события |
| `/pets/create` | Создание карты | Мастер из 3 шагов: базово → детали → фото |
| `/planboard` | План-доска | Ежедневные уходы и лечения; перенос событий перетаскиванием |
| `/calendar` | Календарь | Все события по датам (react-big-calendar) |
| `/dashboard/messages` | Чаты | Переписка с врачом/владельцем (WebSocket) |
| `/dashboard/catalog` | Каталог услуг | Прайс врача: налоги, скидки, остатки |
| `/dashboard/clinic/[id]` | Кабинет клиники | Пациенты, команда, шаблоны, счета |
| `/billing/invoices` | Счета | Просмотр и оплата счетов |
| `/find-vet` | Карта ветеринаров | Поиск клиник на Leaflet-карте |
| `/share` | QR-доступ | Принятие временной ссылки на карту питомца |

---

## 🚀 Быстрый старт

### Локальная разработка — Backend

> ⚠️ Все команды из `backend/` с активированным venv. `--noinput` — для неинтерактивных окружений (CI/агенты).

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# БД настроена в backend/.env; применяем миграции
python manage.py migrate --noinput

# Опционально: демо-данные питомцев
python manage.py seed_demo_pets --noinput

# Запуск (REST + WebSocket)
python manage.py runserver
```

Полезные команды:

| Команда | Описание |
|---------|----------|
| `python manage.py check` | Статическая проверка конфигурации |
| `python manage.py test --noinput` | Тесты (23 шт., green) |
| `python manage.py makemigrations --check --dry-run` | Проверка незакоммиченных миграций |
| `python manage.py seed_demo_pets` | Демо-данные питомцев |
| `python manage.py seed_production_data` | Продакшн-данные (категории, шаблоны) |
| `python manage.py createsuperuser --noinput` | Создать админа (задать пароль через `DJANGO_SUPERUSER_PASSWORD`) |

### Локальная разработка — Frontend

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

### Полный стек — Docker Compose

```bash
docker compose up -d --build
```

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

---

## 🔐 Переменные окружения

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

> ⚠️ `.env` содержит секреты и **не должен** попадать в git. Эталонная конфигурация — `.env.example` в корне.

### Frontend — `frontend/.env.local`

| Переменная | Описание |
|------------|----------|
| `NEXT_PUBLIC_API_URL` | Базовый URL API (в docker — `https://careyour.pet`) |
| `GOOGLE_CLIENT_ID` | OAuth-клиент Google |

---

## 📡 API

Интерактивная документация: **https://careyour.pet/api/docs/** (Swagger UI, drf-spectacular).

| Prefix | Функции |
|--------|---------|
| `/api/pets/` | Карты питомцев, категории, атрибуты, теги, события, вложения |
| `/api/auth/` | Регистрация, активация, Google, me, demo-login, верификация врача |
| `/api/token/` | SimpleJWT login / refresh (access 60m, refresh 30d + rotation) |
| `/api/chat/` | Комнаты, сообщения, загрузка вложений |
| `/api/billing/` | Каталог, счета, шаблоны |
| `/api/common/` | Словари, защищённые медиа, `health/` |
| `/api/ai/` | Промпты, сессии AI (SSE-streaming) |
| `/api/clinics/` | CRUD клиник, участники, приглашения, шаблоны |
| `/api/breeding/` | Циклы, вязки, пометы |
| `/api/notifications/` | Уведомления, настройки |
| `/api/schema/` | OpenAPI-схема |
| WS | `/ws/chat/{room_id}/`, `/ws/notifications/` (JWT в query_string) |

---

## 🗺 Карта функциональности

Ниже — сводная карта «функция → где живёт в коде».

### Аутентификация и профиль

| Функция | Backend | Frontend |
|---------|---------|----------|
| Регистрация + активация по email | `users/views.py` → `RegisterView`, `ActivateView` | `/register`, `/verify` |
| Google OAuth | `users/views.py` → `GoogleAuthView` | `GoogleAuthWrapper`, `@react-oauth/google` |
| JWT (access 60m / refresh 30d + rotation + blacklist) | `config/settings.py` (SimpleJWT + tokens) | `lib/apiClient.ts` (авто-refresh) |
| Демо-вход | `users/views.py` → `DemoLoginView` | `/demo` |
| Профиль и контакты | `users/serializers.py` | `components/profile/` |
| Верификация врача | `users/models.py` → `VetVerificationRequest` + signals | `components/auth/AuthLayout.tsx` |
| Удаление аккаунта | `users/views.py` | `components/DeleteAccountModal.tsx` |

### Питомцы и медицинская карта

| Функция | Backend | Frontend |
|---------|---------|----------|
| EAV-карта питомца (атрибуты всех типов) | `pets/models.py` → `PetAttribute` (attr_type) | `components/pet-form/PetFormSteps.tsx` |
| Создание/редактирование (мастер 3 шага) | `pets/serializers.py` → `PetSerializer` | `/pets/create`, `usePetForm.ts` |
| Медкарта, фото, родословная | `pets/models.py` → `PetImage`, mother/father | `/pets/[id]` → `components/pet-page/` |
| События здоровья (planned/completed/missed) | `pets/models.py` → `PetEvent` | `components/dashboard/CreateEventModal.tsx`, `components/events/` |
| Вложения к событиям (защищённые) | `pets/views.py` → attachments | `ProtectedMediaView` |
| «Теневые» карты (врач → владелец) | `pets/models.py` → `temp_owner_*` | `/pets/create-client` |
| QR-доступ (read/write, TTL 1h) | `pets/services.py` → `TimestampSigner` | `/share`, `PetShareWidget.tsx` |
| Единый доступ (проверка прав) | `pets/access.py` → `user_can_access_pet()` | — |

### Планирование и уход

| Функция | Backend | Frontend |
|---------|---------|----------|
| План-доска дней питомца | `pets/events` (repeating) | `/planboard` + `@dnd-kit` |
| Календарь событий | `pets/events` | `/calendar` + `react-big-calendar` |
| Дублирование события | `POST /api/events/{id}/duplicate/` | `CreateEventModal` |

### AI-консультант

| Функция | Backend | Frontend |
|---------|---------|----------|
| Сессии и сообщения | `ai/models.py` (AIChatSession, AIChatMessage) | `types/ai-chat.ts` |
| Потоковый ответ (SSE) | `ai/views.py` + `ai/services.py` (DeepSeek) | `components/dashboard/AIChatWindow.tsx`, `services/aiChatService.ts` |
| Системные промпты | `ai/models.py` → `SystemPrompt` | `AIChatSidebar.tsx` |

### Клиники, врачи, биллинг

| Функция | Backend | Frontend |
|---------|---------|----------|
| Кабинет клиники | `vetclinics/models.py` (VetClinic, ClinicMember) | `/dashboard/clinic/[id]` |
| Приглашения в клинику | `vetclinics/models.py` → `ClinicInvite` | `CreateClinicModal.tsx` |
| Каталог услуг (налоги/скидки/остатки) | `billing/models.py` → `CatalogItem` | `components/billing/CatalogTab.tsx` |
| Счета со снимком цен | `billing/models.py` → `Invoice`/`InvoiceItem` | `/billing/invoices`, `PaymentModal.tsx` |
| Шаблоны осмотров/событий | `vetclinics`/`billing` (ExamTemplate, EventTemplate) | `ClinicTemplates.tsx`, `TemplatesTab.tsx` |
| Карта ветеринаров | `vetclinics` viewset | `/find-vet` + `react-leaflet` |

### Коммуникации и уведомления

| Функция | Backend | Frontend |
|---------|---------|----------|
| Чат врач↔владелец (REST + WS) | `chat/` → `ChatRoom`, `ChatMessage`, consumers | `/dashboard/messages`, `useChatWebSocket.ts` |
| In-app уведомления (WS) | `notifications/` → consumers | `NotificationListener.tsx`, `NotificationsDropdown.tsx` |
| Email-напоминания (Celery) | `notifications/tasks.py` (hourly, flexible, repeating) | `NotificationsSettingsModal.tsx` |

---

## 🧪 Тестирование и CI

### Тесты

```bash
cd backend && source venv/bin/activate && python manage.py test pets users billing --noinput
```

**23/23 green (2026-08-15):** изоляция питомцев, событий и счетов; роль через PATCH; верификация; totals/tax/stock; attachments 403/201.

### CI — GitHub Actions (`.github/workflows/ci.yml`)

| Шаг | Что проверяет |
|-----|---------------|
| backend check | Конфигурация Django |
| backend migrations | Нет незакоммиченных изменений схемы |
| backend tests | 23 теста |
| frontend tsc | TypeScript без ошибок |
| frontend build | Продакшн-сборка Next.js |

---

## 🚢 Развёртывание и эксплуатация

Полная операционная документация — в [`docs/OPS.md`](docs/OPS.md).

```bash
./deploy.sh                # rsync на сервер
docker compose up -d --build
docker compose exec backend python manage.py migrate --noinput
docker compose exec backend python manage.py collectstatic --noinput
```

### Monitoring

- **Healthcheck:** `GET /api/common/health/` → `{"status":"ok","checks":{"db":"ok","redis":"ok"}}`
- **Бэкапы:** `scripts/backup.sh` → pg_dump(gzip) + media, ротация 7 дней (cron)
- **Логи:** `docker compose logs -f backend|celery_worker|celery_beat`

### Безопасность

- TLS 1.2/1.3, HSTS, CSP, nosniff, X-Frame-Options, Referrer-Policy
- JWT с ротацией refresh + blacklist, троттлинг (auth 10/ч, AI 20/ч)
- Защищённые медиа (`vet_docs`, `chat_attachments`, `event_docs`, `health_docs`) — только авторизованным
- Redis не публикует порты наружу; секреты только в `.env*` (не в git)

---

## 📚 Документация

| Документ | Содержание |
|----------|------------|
| [`CONTEXT.md`](CONTEXT.md) | Глоссарий домена: единый словарь терминов |
| [`docs/BACKEND-MAP.md`](docs/BACKEND-MAP.md) | Полная карта бэкенда: приложения, домены, API, потоки |
| [`docs/BACKEND-ROADMAP.md`](docs/BACKEND-ROADMAP.md) | Дорожная карта этапов 0–4 |
| [`docs/FRONTEND-AUDIT.md`](docs/FRONTEND-AUDIT.md) | Аудит UI: исправления и остатки |
| [`docs/AUDIT-2026-08-16.md`](docs/AUDIT-2026-08-16.md) | Полный аудит стека (оценка 8.5/10) |
| [`docs/OPS.md`](docs/OPS.md) | Бэкапы, деплой, мониторинг, логи, секреты |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Дизайн-токены и UI-подходы |
| [`docs/adr/0001-ai-chat-sse-streaming.md`](docs/adr/0001-ai-chat-sse-streaming.md) | ADR: SSE-стриминг AI-чата |
| [`.env.example`](.env.example) | Шаблон переменных окружения без секретов |

---

## 🏆 Статус проекта

| Направление | Оценка | Комментарий |
|-------------|--------|-------------|
| Frontend | **8.5/10** | Дизайн-токены, тёмная тема, i18n, a11y, декомпозированные формы |
| Backend | **8.5/10** | Чистые эндпоинты, N+1 закрыт, безопасность адекватная, тесты |
| DevOps | **8.5/10** | HTTPS, security-заголовки, CI, бэкапы, healthcheck |
| **Итог** | **8.5/10** | **Production ready** — готов к демонстрации и мягкому запуску |

---

## 📄 Лицензия

Приватный проект. Демо: **https://careyour.pet** · Репозиторий: `https://github.com/rodionvitenberg-ui/PetVet`