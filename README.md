# GameTracker

Трекер игровой коллекции: отмечай пройденные игры, создавай свои категории и собирай tier-листы drag & drop. Данные об играх — из Steam, хранение — Supabase.

## Стек

- **Vite 7** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (aurora-дизайн, glassmorphism, тёмная тема)
- **Supabase** — Postgres, Auth (email/password), RLS, RPC
- **dnd-kit** — drag & drop в конструкторе тир-листов
- **framer-motion** — анимации
- **Vercel** — деплой (SPA + serverless-прокси к Steam API)

## Быстрый старт

```bash
npm install
cp .env.example .env   # заполни VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
```

## Переменные окружения

| Переменная | Назначение |
| --- | --- |
| `VITE_SUPABASE_URL` | URL проекта Supabase |
| `VITE_SUPABASE_ANON_KEY` | anon public ключ |
| `SUPABASE_PROJECT_REF` | ref проекта (для миграций) |
| `SUPABASE_DB_PASSWORD` | пароль БД (только для миграций, не попадает в клиент) |
| `SUPABASE_DB_REGION` | регион пула, например `eu-west-2` (по умолчанию) |

## База данных

Схема лежит в [`supabase/schema.sql`](supabase/schema.sql). Применить можно двумя способами:

```bash
# 1) автоматически (через pg + connection pooler)
npm run migrate

# 2) вручную: Supabase Dashboard → SQL Editor → вставить supabase/schema.sql
```

Что создаётся:

- `profiles` — публичные профили (триггер `on_auth_user_created` создаёт профиль при регистрации; ник 3–20 символов `[A-Za-z0-9_]`, уникален без учёта регистра)
- `games` — общий кэш метаданных Steam (`upsert_games(jsonb)`)
- `collection_items` — записи коллекции: статус, оценка, часы, заметки, дата финала
- `categories` / `category_items` — пользовательские категории
- `tier_lists` / `tier_rows` / `tier_items` — тир-листы (`save_tier_list(bigint, jsonb)` сохраняет всё атомарно)
- `friendships` — заявки и дружба (`pending` → `accepted`), одна строка на пару
- `profile_showcase` — витрина профиля: до 6 игр из коллекции с позицией
- RLS-политики: коллекция и категории видны только владельцу, тир-листы — владельцу и всем, если `is_public`

### Друзья, приватность и витрина

Ключевая идея: **приватность не ломается от того, что ты добавил друга**. Поэтому чтение чужих
данных идёт не через таблицы (они под owner-only RLS), а через security-definer RPC, которые сами
проверяют, имеет ли зритель право:

| RPC | Что делает |
| --- | --- |
| `username_available(text)` | проверка ника для формы регистрации |
| `add_friend(text)` | отправить заявку по нику; если заявка уже есть — сразу `accepted` |
| `respond_friend(bigint, boolean)` | принять/отклонить (принять может только получатель), отозвать свою |
| `can_view_profile(uuid)` | профиль виден, если он публичный или мы друзья |
| `profile_collection(text)` | коллекция (личные `notes` никогда не отдаются) |
| `profile_showcase_games(text)` | витрина с играми |

Приватный профиль и коллекция видны принятым друзьям; тир-лист — только если у него включён
`friends_visible` (переключатель в шапке конструктора тир-листов).

## Steam API

Steam не отдаёт CORS-заголовки, поэтому запросы идут через прокси:

- локально — middleware-плагин `plugins/steamApiPlugin.ts`
- на Vercel — serverless-функция `api/steam.ts`

Оба используют общую логику `server/steam-core.ts` с кэшем в памяти (30 мин).

| Endpoint | Назначение |
| --- | --- |
| `GET /api/steam/search?q=` | поиск по названию (русский + английский, оба результата) |
| `GET /api/steam/app?id=` | метаданные игры |
| `GET /api/steam/apps?ids=1,2,3` | пачка метаданных (до 40) |
| `GET /api/steam/featured` | топ продаж / скидки / новинки |

## Деплой на Vercel

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

В `vercel.json` уже настроен rewrite всех маршрутов на `index.html` (SPA), при этом `/api/*` не перехватывается. В Variable Encryption добавь те же `VITE_*` переменные.

## Команды

```bash
npm run dev         # dev-сервер с Steam-прокси
npm run build       # tsc -b + production-сборка
npm run preview     # предпросмотр сборки
npm run migrate     # применить supabase/schema.sql
npm run verify:rls  # 28 проверок RLS/RPC на живой базе (тестовые юзеры удаляются)
```
