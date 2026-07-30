# CareYourPet — backlog работ

**Источник:** [ANALYSIS.md](./ANALYSIS.md) (2026-07-24)  
**Правило:** закрываем сверху вниз. P0 — перед любыми новыми фичами.

Статусы: `[ ]` todo · `[~]` in progress · `[x]` done

---

## P0 — Security hotfix (срочно)

Цель: убрать критичные утечки данных и слабые места authz/infra.  
Оценка: 1–3 дня.

### P0.1 IDOR на счетах (Invoice) — DONE 2026-07-24

- [x] **Ограничить queryset** в `backend/billing/views.py` → `InvoiceViewSet.get_queryset`
- [x] **Добавить `created_by` на `Invoice`** (миграция `0003_invoice_created_by`)
- [x] **create/update/delete** — только `created_by` (`IsInvoiceEditor`)
- [x] **Unit-тесты** `backend/billing/tests.py`

### P0.2 Публичные media (vet_docs, chat, health) — DONE 2026-07-24

- [x] nginx: sensitive prefixes proxy → Django (`nginx/nginx.conf`, `nginx.conf`)
- [x] `ProtectedMediaView` + `/api/common/protected-media/<path>`
- [x] публичные pet/user images остаются через `/media/` alias

### P0.3 JWT lifetime — DONE 2026-07-24

- [x] Access **60 минут**, refresh **30 дней**, rotate + blacklist app
- [x] Frontend `AuthProvider`: refresh на 401

### P0.4 Attachments: import + права — DONE 2026-07-24

- [x] `PermissionDenied` import
- [x] `pets/access.py` + queryset/create через PetAccess write

### P0.5 Redis и сеть — DONE 2026-07-24

- [x] Убран publish `6379` из `docker-compose.yml`
- [ ] На сервере после deploy проверить firewall (ops)

### P0.6 Self-service роль vet (policy) — DONE 2026-07-24

- [x] PATCH `role=vet` больше не ставит `is_veterinarian`; только verification/admin

### P0.7 QR accept_access level — DONE 2026-07-24

- [x] Default `read`; level в токене `share_token?access_level=`

---

## P1 — Integrity / wiring (1–2 недели)

### P1.1 Breeding API

- [ ] Либо **подключить** `path('api/breeding/', include('breeding.urls'))` в `backend/config/urls.py`,
- [ ] Либо **заморозить**: пометить app deprecated, не плодить UI, пока API orphan.

Файлы: `backend/config/urls.py`, `backend/breeding/*`.

### P1.2 DictionaryView (common)

- [ ] Починить `prefetch_related`: related name `Category.attributes`, не `available_attributes`.
- [ ] Проверить icons URL serialization, options для select-атрибутов.
- [ ] Smoke: `GET /api/common/...` (см. `backend/common/urls.py`).

Файл: `backend/common/views.py`.

### P1.3 Тесты authz (минимум)

- [ ] API-тесты: pets queryset isolation, events, invoices, chat room access, attachments.
- [ ] Pytest/Django TestCase + CI-ready команда `python manage.py test`.

### P1.4 Повторы событий

- [ ] Реализовать `POST /api/events/{id}/duplicate/` **или** убрать `api_call` из metadata в `process_repeating_events`.

Файлы: `backend/pets/views.py`, `backend/notifications/tasks.py`.

### P1.5 Billing totals / stock

- [ ] `Invoice.calculate_totals`: считать `tax_amount` из items.
- [ ] Политика `is_stock_tracked`: списание при `paid` / при создании — зафиксировать и реализовать.

Файл: `backend/billing/models.py`.

### P1.6 PermissionDenied / shared access helpers

- [ ] Вынести единый helper «может ли user читать/писать pet» (owner | access | shadow creator).
- [ ] Использовать в pets, events, AI, billing, attachments.

---

## P2 — Product completeness (2–6 недель)

- [ ] Единая сущность Client / merge guest-by-phone.
- [ ] Breeding UI **или** freeze (согласовать с P1.1).
- [ ] OpenAPI (drf-spectacular) + краткий root README.
- [ ] Mobile thin client: sync pets + events (без полного parity).
- [ ] AI: rate limit, audit log, medical disclaimer в UI.
- [ ] i18n: убрать заглушки «Тест» в `frontend/messages/*.json`.
- [ ] `HistoricalRecords`: либо повесить на Pet/PetEvent, либо убрать dead dependency.
- [ ] Убрать/починить `Pet.user` OneToOne (`pet_profile`) — прояснить смысл.

---

## P3 — Ops / scale

- [ ] CI: lint + backend tests + frontend build.
- [ ] DB backups + restore drill (документировать).
- [ ] Sentry / healthchecks.
- [ ] Deploy: миграции в pipeline (не только rsync).
- [ ] nginx: HSTS, убрать дубль `location /ws/`.
- [ ] `.env.example` в корне (без секретов).
- [ ] Multi-tenant Clinic/Org, если B2B-клиники — несколько врачей на один счёт.
- [ ] `CatalogItem.code`: unique per owner, не global.

---

## Порядок закрытия «дыр в коде» (следующий спринт)

Рекомендуемая последовательность **имплементации** (после этого документа):

| # | Задача | Приоритет | Риск при откладывании |
|---|--------|-----------|------------------------|
| 1 | Invoice queryset + `created_by` | P0.1 | Утечка финансовых данных |
| 2 | PermissionDenied import + attachment authz | P0.4 | Crash / wrong access |
| 3 | JWT lifetimes | P0.3 | Долгоживущий stolen token |
| 4 | Redis port off | P0.5 | Сетевая атака на broker |
| 5 | Media / vet_docs protection | P0.2 | Утечка документов врачей |
| 6 | accept_access level + vet role policy | P0.6–0.7 | Escalation |
| 7 | common DictionaryView + breeding decision | P1 | 500 / dead code |
| 8 | Authz tests | P1.3 | Регрессии |

---

## Definition of Done (для P0)

- [x] Чужой invoice недоступен по API (list/retrieve/update/delete) — unit tests green.
- [x] `vet_docs` / sensitive media не через public alias (nginx → ProtectedMediaView).
- [x] Access token 60m + refresh rotate + AuthProvider refresh.
- [x] Redis без host port publish в compose.
- [x] Attachments: PermissionDenied + PetAccess write.
- [ ] **На проде после deploy:** ручной smoke (ниже) + `migrate` (billing + token_blacklist).

### Ручной smoke после P0 (на сервере)

1. User A создаёт invoice → user B `GET /api/billing/invoices/` — пусто / 404 на detail.
2. URL `/media/vet_docs/...` без auth → 401/403.
3. Login → access refresh работает (web).
4. `docker compose ps` / port scan: 6379 не снаружи.
5. Owner и vet-with-access: upload attachment к event.

---

## История

| Дата | Событие |
|------|---------|
| 2026-07-24 | Backlog зафиксирован из ANALYSIS.md |
| 2026-07-24 | P0.1–P0.7 реализованы в коде; `billing.tests` 5/5 OK |
