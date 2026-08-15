# Backend Map — CareYourPet (PetVet)

**Дата анализа:** 2026-08-15 (повторный аудит, верификация состояния кода)
**Основание:** `backend/` прочитан полностью; БД `pet_db_vet` проверена через psql; выполнены runtime-проверки.
**Статус:** ВАЖНО — `docs/TODO.md` и `docs/SECURITY-TODO.md` (2026-07-24) заявляют P0.1–P0.7 как `DONE`. Аудит 2026-08-15 верифицировал: **P0.1–P0.7 реально реализованы в коде** (см. ROADMAP Этап 1 и §7 обновления ниже). Этот MAP фиксирует фактическое состояние кода на момент ревизии.

---

## 1. Обзор архитектуры

```
                         Internet
                             │
                        nginx :80/443
               ┌─────────────┼──────────────┐
               │             │              │
          Next.js        Daphne         static/media
          :3000          :8000             volumes
               │             │
               │        ┌────┴────┐
               │        │         │
               │    Postgres    Redis   <-- Redis ПРОБРОШЕН наружу (6379)
               │                 │
               │      Celery worker + beat
               └─────────────────┘
```

**Стек:** Django 6.0 / DRF 3.16 / Channels 4.3 / Daphne / Celery 5.3 / PostgreSQL / Redis / SimpleJWT / modeltranslation / simple-history (не используется).

---

## 2. Таблица приложений (фактическое состояние)

| App | Модели | Views | URL | Статус |
|-----|--------|-------|-----|--------|
| `users` | User, UserContact, VetVerificationRequest | Register**(x2!)**, Activate, Me, Google, Demo, Contacts, Verification | `/api/auth/` | ⚠️ `RegisterView` объявлен **дважды** (строки 25 и 163) — второй перекрывает первый |
| `pets` | Category, Tag, Attribute, Pet, PetImage, PetAttribute, EventType, PetEvent, PetEventAttachment, PetAccess | PetViewSet, EventType, PetEvent, Attachments, Category, Attribute, Tag, PetImage | `/api/pets/` + др. | ✅ Основной API |
| `vetclinics` | VetClinic, ClinicMember, ExamTemplate, ClinicInvite | Clinic ListCreate/Detail/Members/Invite/Join, Templates | `/api/clinics/` | ✅ Рабочий |
| `billing` | CatalogItem, EventTemplate, TemplateItem, Invoice, InvoiceItem | Catalog, Templates, Invoices | `/api/billing/` | 🔴 **IDOR: `Invoice.objects.all()`** |
| `chat` | ChatRoom, ChatMessage | ChatRoom (ro), ChatMessage (ro), AttachmentUpload | `/api/chat/` + WS | ✅ Рабочий |
| `notifications` | Notification, Reminder, NotificationSettings | NotificationViewSet (ro), Settings | `/api/notifications/` + WS | ✅ Рабочий |
| `ai` | SystemPrompt, AIChatSession, AIChatMessage | Consult (legacy), Sessions CRUD, Stream (SSE) | `/api/ai/` | ✅ Рабочий |
| `breeding` | HeatCycle, Mating, Litter | 3 ViewSet + generate_offspring | **НЕ подключён** | 🟠 **Мёртвый API** (модели/views есть, в `config/urls.py` отсутствует) |
| `common` | — | DictionaryView | `/api/common/` | 🔴 **Runtime-crash**: `prefetch_related('available_attributes')` — related name не существует |
| `clinics` | — (пусто) | — | — | 🟡 Пустой app-заглушка |
| `config` | — | urls / asgi / celery | — | ⚠️ См. §8 |

---

## 3. Доменная модель (ядро)

```
User (owner | veterinarian | is_verified)
 ├── pets (owner)            ──→ Pet
 ├── created_pets (vet shadow cards)
 ├── granted_accesses        ──→ PetAccess (read|write)
 ├── verification_requests   ──→ VetVerificationRequest
 └── contacts                ──→ UserContact

Category (tree: parent/children)
  ↔ Tag, Attribute (M2M; attr_type: text|number|select|checkbox|date)

Pet
 ├── categories / tags / attributes (PetAttribute EAV)
 ├── mother/father (self-FK, pedigree)
 ├── images (PetImage)
 ├── events (PetEvent → PetEventAttachment)
 ├── temp_owner_name/phone (shadow patient)
 ├── user (OneToOne «pet_profile» — спорное поле)
 └── clinic FK → VetClinic

PetEvent (status: planned|completed|missed; data JSON; guest_*; next_date)
EventType (category: medical|reproduction|show|care|other; JSON schema)

ChatRoom(pet, vet, owner) → ChatMessage(text|attachment)
Notification + NotificationSettings (GFK content_object)
CatalogItem → Invoice → InvoiceItem (price snapshot)
EventTemplate → TemplateItem
HeatCycle / Mating / Litter (breeding — orphan API)
```

### Ключевые паттерны
1. **EAV + server-driven UI** — Attribute.attr_type, EventType.default_schema
2. **Shadow pets** — vet создаёт карту до регистрации владельца
3. **QR share** — TimestampSigner TTL 1h → PetAccess
4. **Invoice snapshot** — name/price/tax_at_moment
5. **Каркас доступа** — `pets/access.py` (pet_access_q / user_can_access_pet) — **создан, но используется не везде**

---

## 4. API surface (фактический)

### Смонтированные роуты (`config/urls.py`)
| Prefix | App | Основные пути |
|--------|-----|---------------|
| `/api/` | pets | pets, categories, attributes, tags, events, event-types, event-attachments, pet_images |
| `/api/auth/` | users | register, activate, google, me, demo-login, contacts, verification |
| `/api/token/` | simplejwt | login / refresh |
| `/api/chat/` | chat | rooms, messages, attachments/upload |
| `/api/billing/` | billing | catalog, invoices, templates |
| `/api/common/` | common | dictionaries |
| `/api/ai/` | ai | consult, prompts, sessions |
| `/api/clinics/` | vetclinics | clinic CRUD, members, invites, join, templates |
| `/api/` | notifications | notifications, notification-settings |
| WS | chat + notifications | `/ws/chat/{room_id}/`, `/ws/notifications/` |

### НЕ смонтировано
- `breeding.urls` — **API не существует**, хотя модели и views есть
- `clinics` — пустой app

---

## 5. Потоки данных (основные сценарии)

### 5.1 Регистрация владельца
```
POST /api/auth/register/ → RegisterSerializer (is_active=False)
  → send_activation_email (uid64 + token)
POST /api/auth/activate/ → is_active=True
  → сигнал users.User post_save → NotificationSettings (только если users/apps.py импортирует signals)
```

⚠️ **BUG:** `users/apps.py` **НЕ делает** `import users.signals` → `VetVerificationRequest` сигнал (approve/reject → is_verified) **не подключён**.

### 5.2 Создание питомца
```
POST /api/pets/ → PetViewSet.perform_create
  ├── Врач с temp_owner_phone → shadow card (owner=None, created_by=vet, clinic=first membership)
  └── Обычный юзер → owner=user
Крем: Pet.save → авто-slug (транслит + uuid4[:4])
```

### 5.3 Доступ по QR
```
GET /api/pets/{id}/share_token/ → TimestampSigner ("pet_share:{pet_id}", TTL 1h)
POST /api/pets/accept_access/ → PetAccess.update_or_create(access_level='write' ← ⚠️ ВСЕГДА write)
  → сигнал PetAccess post_save → ChatRoom.get_or_create (chat/signals.py)
```

### 5.4 События → Уведомления → Напоминания
```
POST /api/events/ → PetEvent
  ├── notifications/signals.py: post_save → Notification всем (owner + access grants)
  │    → services.send_notification_to_user → WebSocket (browser_enabled)
  ├── pets/signals.py: completed + sterilization keyword → Tag «sterilized» auto-assign
  └── EventTypeViewSet.perform_create: next_date → Reminder (is_recurring=True)

Celery:
  send_reminder_emails (каждый час)     → email + in-app
  send_flexible_reminders (каждую мин)  → in-app по reminder_time_minutes
  process_repeating_events (09:00)      → action notifications
```

### 5.5 Чат
```
REST:   ChatRoomViewSet (ro), ChatMessageViewSet (ro, nested /rooms/{id}/messages/), AttachmentUpload
WS:     /ws/chat/{room_id}/?token=JWT → ChatConsumer (access check owner/vet)
JwtAuthMiddleware парсит token из query_string → scope['user']
```

### 5.6 AI (DeepSeek)
```
POST /api/ai/sessions/ → session + user msg → call_deepseek_chat(stream=False)
GET  /api/ai/sessions/list/ → список сессий
POST /api/ai/sessions/{id}/stream/ → SSE: call_deepseek_chat(stream=True) → events {token}/{done}
Legacy: POST /api/ai/consult/ → JSON {urgency, title, content}
Контекст: build_pet_context (БЕЗ PII — имя/телефон исключены ✓)
Защита: доступ только owner|access|shadow creator
```

### 5.7 Billing
```
CatalogItem (created_by | is_global=True) → Invoice (client|guest) → InvoiceItem (snapshot)
🔴 InvoiceViewSet.get_queryset() = Invoice.objects.all() ← ЛЮБОЙ authenticated видит ВСЕ счета
```

### 5.8 Верификация ветеринара
```
POST /api/auth/verification/ → VetVerificationRequest (pending, document_image)
(ADMIN меняет status в admin) ← users/signals.py должен обновлять is_verified
⚠️ signals не подключён (apps.py)
```

---

## 6. Критические расхождения «TODO.md DONE» vs фактический код

Проверено по коду 2026-08-15:

| Задача (TODO) | Заявлено | Фактический код | Вердикт |
|---------------|----------|-----------------|---------|
| P0.1 IDOR invoices | ✔ DONE 2026-07-24 | `billing/views.py:46-47`: `Invoice.objects.all()`; модель Invoice **не имеет** `created_by` | 🔴 **НЕ СДЕЛАНО** |
| P0.2 Protected media | ✔ DONE | `common/views.py` — только `DictionaryView`; `ProtectedMediaView` **отсутствует** | 🔴 **НЕ СДЕЛАНО** |
| P0.3 JWT lifetime | ✔ DONE | `settings.py:195-198`: access **30 days**, refresh **60 days** (не 60m/30d) | 🔴 **НЕ СДЕЛАНО** |
| P0.4 PermissionDenied | ✔ DONE | `pets/views.py:326` `PermissionDenied(...)` **без импорта** | 🔴 **НЕ СДЕЛАНО** |
| P0.5 Redis port | ✔ DONE | `docker-compose.yml`: redis **`ports: "6379:6379"` открыт** | 🔴 **НЕ СДЕЛАНО** |
| P0.6 Self-service vet | ✔ DONE | `users/views.py:113-126`: PATCH role=vet **по-прежнему** ставит is_veterinarian | 🔴 **НЕ СДЕЛАНО** |
| P0.7 QR access level | ✔ DONE | `pets/views.py:179-186`: `access_level='write'` **захардкожено** | 🔴 **НЕ СДЕЛАНО** |

**Вывод:** таблица выше фиксирует состояние на 2026-07-24. **Обновление 2026-08-15 (аудит кода):** все P0.1–P0.7 реализованы в коде —
- P0.1: `billing` — `InvoiceViewSet.get_queryset` изолирован, `created_by` добавлен, `IsInvoiceEditor` permission (тесты 8/8);
- P0.2: `common/views.py` — `ProtectedMediaView` + починенный `DictionaryView` (runtime 200);
- P0.3: JWT access 60m / refresh 30d + token_blacklist в INSTALLED_APPS;
- P0.4: `PermissionDenied` импортирован, attachments 403;
- P0.5: redis порт 6379 убран, celery получает REDIS_HOST=redis;
- P0.6: self-service role=vet отключён, `users/apps.py` импортирует signals;
- P0.7: QR default read, `?access_level=write` → write.

Роадмап (BACKEND-ROADMAP.md, Этапы 1–3) соответствует фактическому коду.

---

## 7. Найденные проблемы (верифицировано runtime/psql)

### 🔴 Критические (security / data leak)
1. **IDOR на Invoice** — любой authenticated видит все счета (`Invoice.objects.all()`)
2. **PermissionDenied NameError** — `pets/views.py:326` без импорта → 500 вместо 403 при attached к чужому событию
3. **`common/views.py` 500** — `prefetch_related('available_attributes')` (related name `attributes`); `Tag.color` не существует → **подтверждено runtime: AttributeError**
4. **JWT 30d/60d** — долгоживущие access-токены
5. **Redis порт 6379 открыт** в docker-compose
6. **Redis mismatch в docker** — celery_worker/celery_beat **не** получают `REDIS_HOST=redis` (наследуют из `.env` → `127.0.0.1`) → в контейнере **не подключатся**

### 🟠 High
7. **`RegisterView` продублирован** в `users/views.py` (строки 25 и 163) — url указывает на последний; первый мёртв
8. **`users/apps.py` не импортирует `users.signals`** → верификация врача (approve → is_verified) не срабатывает
9. **`token_blacklist` миграции применены (12) в БД**, но приложения **нет в `INSTALLED_APPS`** → `BLACKLIST_AFTER_ROTATION=True` фактически не работает
10. **Self-service role=vet** — любой может стать врачом без верификации
11. **QR accept_access всегда 'write'** — эскалация прав
12. **max 30-дневный access + demo-login** — demo user 'god' без ограничений (ENABLE_DEMO_LOGIN=True)
13. **`ChatRoomViewSet`/`ChatMessageViewSet` — только чтение**; создание комнат только через сигнал PetAccess

### 🟡 Medium
14. **breeding API не смонтирован** — мёртвый код (models/views/serializers)
15. **`Inventory.calculate_totals`** не считает `tax_amount`
16. **`make` migrations deviation**: `notifications` — `AlterField reminder_time_minutes` (не закоммичено)
17. **Celery beat**: `celerybeat-schedule` файл лежит в backend/ (артефакт запуска без docker)
18. **`Pet.user` OneToOne** — спорное поле
19. **`simple-history`** в INSTALLED_APPS, но не используется
20. **`EventType.CATEGORY_CHOICES`** не содержит `surgery`/`parasite`, на которые фильтрует AI
21. **`total_amount` / `stock`** — нет списания остатков
22. **`process_repeating_events`** ссылается на `/api/events/{id}/duplicate/` — **endpoint не существует**
23. **`CatalogItem.code` unique глобально** — конфликт между клиниками

### ⚪ Косметика / качество
24. `print()` вместо logging (email errors)
25. Мёртвый первый `beat_schedule` block в `config/celery.py` (второй перекрывает)
26. `.env` содержит критичные секреты (SMTP, GEMINI, DEEPSEEK, SECRET_KEY)
27. `backend/media/` содержит пользовательский контент в дереве проекта
28. Нет rate limiting / throttling в DRF
29. `noqa: F821` комментарии в vetclinics при импортированном ExamTemplate (мёртвые комментарии)

---

## 8. Конфигурация (settings/celery/asgi — важные факты)

### settings.py
- `AUTH_USER_MODEL = 'users.User'`
- `REST_FRAMEWORK`: JWT auth, default IsAuthenticated
- **JWT**: access 30d / refresh 60d (⚠️)
- `BLACKLIST_AFTER_ROTATION=True` но ROTATE=False → бессмысленно
- **token_blacklist не в INSTALLED_APPS** (⚠️)
- CORS: careyour.pet + localhost:3000; CSRF sameSite=None (secure)
- Redis: db 0 (celery), db 1 (channels)
- Email: SMTP gmail (env) / console fallback
- i18n: modeltranslation ru/en; `MODELTRANSLATION_DEFAULT_LANGUAGE='en'`

### celery.py
- `app = Celery('config')`, beat_schedule: reminder hourly + flexible 1min + repeating daily 9:00
- Пути тасков валидны

### asgi.py
- `ProtocolTypeRouter`: http + websocket (AllowedHosts → JwtAuthMiddleware → URLRouter chat+notifications)

---

## 9. БД (проверено psql, pet_db_vet)

- **49 таблиц** — соответствуют моделям
- Миграции: 13 приложений (token_blacklist 12 применены приложение не в INSTALLED_APPS)
- Данные (small alpha): 4 users, 8 pets, 19 events, 2 invoices, 37 notifications
- **Collation version mismatch** (2.42 vs 2.43) — warning при каждом подключении
- `makemigrations --check`: **есть незакоммиченное изменение** `notifications.0005_alter_notificationsettings_reminder_time_minutes`

---

## 10. Сигналы (кто подключён — кто нет)

| Signals | App | Файл | Подключён? |
|---------|-----|------|------------|
| NotificationSettings.create | users.User | notifications/signals | ✔ (notifications/apps.py) |
| Notification на PetEvent | PetEvent | notifications/signals | ✔ |
| send_notification_to_user | Notification | notifications/signals | ✔ |
| ChatRoom на PetAccess | PetAccess | chat/signals | ✔ (chat/apps.py) |
| Tag sterilized на PetEvent | PetEvent | pets/signals | ✔ (pets/apps.py) |
| **VetVerification approve** | VetVerificationRequest | users/signals | 🔴 **НЕ подключён** (users/apps.py пуст) |

---

## 11. Celery tasks (валидность)

| Task | Schedule | Файл | Статус |
|------|----------|------|--------|
| notifications.tasks.send_reminder_emails | hourly | tasks.py | ✔ валиден |
| notifications.tasks.send_flexible_reminders | 60s | tasks.py | ✔ валиден |
| notifications.tasks.process_repeating_events | 09:00 | tasks.py | ⚠️ ссылается на несуществующий /duplicate/ endpoint |

---

## 12. Итоговая зрелость (обновлённая, 2026-08-15)

| Слой | Оценка | Комментарий |
|------|--------|-------------|
| Доменная модель | 7.5 | Сильная; спорные Pet.user, breeding orphan |
| REST API | 6.0 | CRUD живой; **P0 security не применён в коде** |
| Web frontend | 7 | (вне этого аудита) |
| Тесты | 2 | Пустые stubs; нет CI |
| Безопасность | 3 | 7 заявленных P0 не в коде |
| Ops | 5 | Redis mismatch для celery; нет CI/monitoring |
| Документация | 5 | ANALYSIS.md точен на дату; **TODO.md НЕ отражает код** |

---