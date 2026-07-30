# Security TODO (P0)

Критичный срез из [TODO.md](./TODO.md). Закрывать **до** новых фич.

| ID | Задача | Где | Статус |
|----|--------|-----|--------|
| P0.1 | IDOR invoices: filter queryset + `created_by` + object perms | `backend/billing/*` | [x] 2026-07-24 |
| P0.2 | Protected media: `vet_docs` (+ chat/event docs) | `nginx/*.conf`, `common/views.py` | [x] 2026-07-24 |
| P0.3 | JWT: short access, rotate refresh | `backend/config/settings.py` + AuthProvider | [x] 2026-07-24 |
| P0.4 | Attachments: import `PermissionDenied` + PetAccess | `backend/pets/views.py`, `access.py` | [x] 2026-07-24 |
| P0.5 | Redis: no host port publish | `docker-compose.yml` | [x] 2026-07-24 |
| P0.6 | Vet role only after verification (policy) | `backend/users/views.py` | [x] 2026-07-24 |
| P0.7 | QR `accept_access`: не force `write` | `backend/pets/views.py` | [x] 2026-07-24 |

**DoD и smoke** — в [TODO.md § Definition of Done](./TODO.md).
