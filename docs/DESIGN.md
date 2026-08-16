# PetVet Design Language

**Дата:** 2026-08-15
**Статус:** принято
**Референс:** Headspace / Calm (тепло, забота, спокойствие) × Linear / Vercel (плотность, focus-ring, микроанимации) × shadcn/ui (стиль `new-york`).

---

## 1. Принципы

1. **Забота прежде всего.** Интерфейс должен ощущаться спокойным и дружелюбным — питомцы и их владельцы приходят сюда в тревоге. Никаких резких цветов, агрессивной анимации, перегруженных экранов.
2. **Предсказуемость.** Один компонент — одно поведение. Кнопка везде выглядит как кнопка, диалог — как диалог. Удивление оставляем для микро-моментов, а не для паттернов.
3. **Мягкая геометрия.** Согласованные, чуть увеличенные скругления; концентрические радиусы (`outer = inner + padding`). Тени — для высоты, бордеры — для структуры.
4. **Цвет из токенов.** Никаких захардкоженных `bg-white` / `bg-blue-600`. Всё через CSS-переменные, чтобы светлая/тёмная/вет-темы работали автоматически.
5. **Motion по делу.** Короткие interruptible-переходы (≤150–300мс), `scale(0.96)` для нажатия, уважение `prefers-reduced-motion`. Анимация — не единственный канал обратной связи.

---

## 2. Палитра

Тёплая health-tech палитра: **тёплый teal** (primary), **персик + шалфей** (акценты), тёплые off-white/уголь нейтрали.

| Токен | Light | Dark | Назначение |
|---|---|---|---|
| `--primary` | `oklch(0.52 0.095 185)` | `oklch(0.75 0.10 185)` | CTA, активное состояние, ссылки |
| `--primary-foreground` | тёплый белый | тёмный teal | текст на primary |
| `--accent` (peach) | `oklch(0.85 0.075 60)` | `oklch(0.35 0.06 60)` | мягкое выделение, бейджи |
| `--accent-foreground` | тёмный оранж | тёплый белый | текст на акценте |
| `--success` (sage) | `oklch(0.58 0.10 148)` | `oklch(0.72 0.10 148)` | подтверждения, вет-тема |
| `--background` | `oklch(0.985 0.003 95)` | `oklch(0.16 0.012 95)` | фон страницы |
| `--foreground` | `oklch(0.28 0.02 95)` | `oklch(0.92 0.012 95)` | основной текст |
| `--card` | `oklch(1 0 0)` | `oklch(0.22 0.015 95)` | поверхности |
| `--muted` | `oklch(0.96 0.003 95)` | `oklch(0.26 0.015 95)` | второстепенный фон |
| `--muted-foreground` | `oklch(0.52 0.015 95)` | `oklch(0.65 0.015 95)` | второстепенный текст |
| `--border` | `oklch(0.90 0.004 95)` | `oklch(1 0 0 / 12%)` | границы |
| `--destructive` | `oklch(0.58 0.20 27)` | `oklch(0.70 0.16 27)` | удаление, ошибки |

**Вет-тема** (`[data-theme="vet"]`, class `.theme-vet`) наследует светлую/тёмную базу, заменяя `--primary` на sage (`oklch(0.58 0.12 148)`) и согласуя `--ring`.

---

## 3. Радиусы

Мягкие, согласованные; концентрическая вложенность обязательна.

| Токен | Значение | Применение |
|---|---|---|
| `--radius-sm` | `0.5rem` (8px) | чипы, мелкие контролы |
| `--radius` | `0.75rem` (12px) | инпуты, кнопки |
| `--radius-lg` | `1rem` (16px) | карточки |
| `--radius-xl` | `1.5rem` (24px) | диалоги, sheet |
| `--radius-2xl` | `2rem` (32px) | крупные модалки, hero-карточки |

---

## 4. Тени (elevation)

Тени — слоями с прозрачностью; бордеры — только для структуры/состояний.

| Токен | Значение | Применение |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgb(0 0 0 / 0.05)` | карточки |
| `--shadow-sm` | `0 1px 3px rgb(0 0 0/0.08), 0 1px 2px rgb(0 0 0/0.04)` | кнопки |
| `--shadow-md` | `0 4px 12px rgb(0 0 0/0.08), 0 2px 4px rgb(0 0 0/0.04)` | попапы, dropdown |
| `--shadow-lg` | `0 12px 32px rgb(0 0 0/0.14), 0 4px 8px rgb(0 0 0/0.06)` | диалоги, sheet |

---

## 5. Типографика

- Семейство — `Inter` (latin + cyrillic, уже подключён).
- Заголовки: `font-semibold`/`font-bold`, `tracking-tight`.
- Текст: `--muted-foreground` для вторичного, `--foreground` для основного.
- Числа/бейджи-счётчики — табличные цифры (`tabular-nums`).

---

## 6. Модальная стратегия

Отказ от самописных `fixed inset-0`-модалок в пользу Radix-примитивов:

| Паттерн | Компонент | Когда |
|---|---|---|
| Подтверждение / действие | `<Dialog>` | удаление, подтверждение |
| Форма на десктопе | `<Dialog>` | создание/правка событий, питомцев |
| Форма/детали на мобильном | `<Sheet side="right">` | PetDetails, планборд-карточка |
| Меню/списки | `<DropdownMenu>` / `<Popover>` | уведомления, бургер |

Все диалоги обязаны иметь: портал, `Esc`-закрытие, фокус-трейп, `aria-label` (для иконочных контролов), `prefers-reduced-motion`-совместимую анимацию.

---

## 7. Компонентная система (shadcn/ui, `new-york`)

Примитивы в `components/ui/`: `Button`, `Dialog`, `Sheet`, `Input`, `Textarea`, `Label`, `Card`, `Tabs`, `DropdownMenu`, `Popover`, `Select`, `Badge`, `Avatar`, `Skeleton`, `Tooltip`, `Switch`, `Calendar` (замена `@heroui/calendar`), `Toast` (замена `@heroui/toast`).

**Кнопки** (`<Button>` variant):
- `default` — primary teal, `active:scale-[0.96]`, `transition-[transform]`.
- `secondary`, `outline`, `ghost`, `destructive`, `link`.
- Иконки — `1.5px` stroke рядом с regular-текстом, `2px` рядом с semibold.

---

## 8. План миграции

1. ✅ Принять дизайн-язык (этот документ).
2. Токены → `globals.css`.
3. Удалить HeroUI, установить shadcn/ui + Radix.
4. Собрать примитивы.
5. Модалки → `Dialog`/`Sheet`.
6. Миграция поверхностей (Header → лендинг → dashboard → планборд/календарь → биллинг/чат).
7. Тёмная тема + чистка хардкод-цветов.

---

## 9. Статус работ (отчёт, 2026-08-16)

### ✅ Готово

1. **DESIGN.md** — язык дизайна принят (этот документ).
2. **Токены** — `globals.css` переведён на тёплую health-tech палитру (teal/персик/шалфей, `oklch`), обновлены радиусы; добавлен `tailwindcss-animate` (оживил ранее неработающие `animate-in`-классы).
3. **Компонентная система** — установлены `@radix-ui/react-slot` + `@radix-ui/react-dialog`; собраны примитивы: `Button`, `Dialog`, `Sheet`, `Input`, `Textarea`, `Label`, `Switch` (стиль shadcn `new-york`, токены, `active:scale-[0.96]`, конкретные transition-свойства).
4. **Модальная система** — все **14 модалок** мигрированы с самописных `fixed inset-0` на единый `Dialog`/`Sheet` (портал, Esc, focus-trap). `EditPetModal` схлопнут в обёртку над `PetFormWizard` (устранён дубль ~120 строк).
5. **Поверхности** — `HeroSection`, `Footer`, `PetDetailsModal` (+ `PetInfoTab`, `PetMedicalTab`, `PetPhotoCarousel`) приведены к токенам; тёмная тема больше не рвётся в флагманской модалке.
6. **Сборка** — `npm run build` зелёная на каждом этапе.

### Осознанные решения

- **HeroUI оставлен только для тостов** (`addToast`, ~42 вызова) — рабочая система, замена была бы churn'ом. Мёртвый `@heroui/calendar` фактически не используется.
- Бренд-цвета соцсетей (WhatsApp/Telegram/Instagram/VK) в `UserProfileModal` остались хардкодом — узнаваемость важнее токенизации.

### ⏳ Осталось

1. ~~Зачистка hardcode-цветов~~ ✅ **Готово (2026-08-16).** ~20 второстепенных компонентов переведены на токены: `PetFormSteps`, `PetsActionBar`, `AIChatSidebar`, `AIChatWindow`, `PetFilters`, `PetCard`, `PetInfoTab`, `PetPhotoCarousel`, `CatalogTab`, `TemplatesTab`, `ClinicTemplates`, `NotificationsDropdown`, `PetShareWidget`, `VetMap`, планборд-карточки, `EventFilter`, `CreateEventModal`, `CreateCalendarEventModal`, `Header`, `AuthGuard`, `SearchInput`. Замены: `bg-white→bg-card`, `text-gray-*→text-foreground/muted-foreground`, `bg-blue-*→bg-primary`, `red→destructive`, `green→success`, `orange/purple→accent/primary`, `[#FFCBA4]→accent`; `text-white` на токенизированных поверхностях → `*-foreground`. Осознанно оставлены: бренд-цвета соцсетей (`UserProfileModal`), Leaflet-HTML-маркер, `text-white` поверх тёмного фото-градиента.
2. ~~Страницы~~ ✅ **Готово (2026-08-16).** `pets/[id]`, `dashboard/messages`, `find-vet`, `become-vet`, `dashboard/clinic/[id]`, `billing/invoices` переведены на токены (bg-card/muted, text-foreground/muted-foreground, primary/destructive/success/accent + focus-ring/ring). `alert()` → HeroUI-тосты во всех неблокирующих флоу (9 файлов + CreateEventModal). `confirm()` оставлены только для деструктивных подтверждений (удаления). В ходе аудита исправлены: длительность события в календаре (использовался `next_date` вместо хардкода 1ч), мёртвая кнопка «Export CSV» (биллинг, теперь реально скачивает CSV), хардкод-цвета колонок планборда.
3. Финальный ревью тёмной темы и адаптивности.

---

## Примечания

- `components/ui/` содержит самописные иконки (`bone.tsx`, `stethoscope.tsx`, …) — они остаются, но переиспользуют `currentColor` и меняют состояние через CSS.
- `motion` — единственная анимационная библиотека; без новых зависимостей.
