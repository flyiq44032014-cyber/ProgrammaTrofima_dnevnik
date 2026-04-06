# Электронный дневник

Веб-приложение для школы: родитель смотрит дневник и успеваемость ребёнка, учитель ведёт классный журнал и уроки, директор управляет классами, расписанием и учётными записями. Бэкенд на **Node.js (Express + TypeScript)**, данные в **PostgreSQL**, фронт — статика в `public/`. Деплой: **Vercel** (серверная функция + статика).

**Демо:** https://programma-trofima-dnevnik.vercel.app/

## Стек

| Слой | Технологии |
|------|------------|
| API | Express 4, TypeScript |
| Сессии | `cookie-session`, bcrypt для паролей |
| БД | PostgreSQL через `pg` (обязателен `DATABASE_URL`) |
| Клиент | HTML/CSS/JS в `public/` |

Приложение **не** запускается без переменной **`DATABASE_URL`**: in-memory режим для продакшена удалён.

## Возможности

- Роли: **родитель**, **учитель**, **директор**
- Вход, регистрация (родитель), выход; профиль и привязка детей по ключу
- Дневник и оценки для родителя; успеваемость и итоговые
- Кабинет учителя: классы из БД, дневник класса, правка уроков
- Кабинет директора: классы, учителя, родители, расписание четвертей
- Часть сценариев учителя (оценки «за день» по списку класса, квартальная таблица в UI, родительское собрание в форме) пока опирается на **временное хранилище в процессе** (`teacherMemory`), отдельно от таблиц Postgres

## Быстрый старт

```bash
npm install
cp .env.example .env
# Укажите DATABASE_URL и SESSION_SECRET в .env
npm run db:seed
npm run dev
```

Приложение: http://127.0.0.1:3000

Команды:

- `npm run build` — сборка в `dist/`
- `npm start` — запуск `node dist/server.js`
- `npm run dev` — разработка с перезапуском (`ts-node-dev`)
- `npm test` — Vitest (интеграционные тесты auth пропускаются без `DATABASE_URL`)
- `npm run db:seed` и другие `db:*` — см. `package.json`

Демо-пользователи при сиде: в `.env` можно выставить `SEED_DEMO_USERS=1` (см. `.env.example`).

## Структура репозитория

```
src/
  server.ts       # точка входа процесса, порт, ensureProfileDbCompatibility
  app.ts          # Express: middleware, роуты, статика
  routes/         # HTTP: auth, api (родитель), profile, parent, teacher, director
  auth/           # authService (bcrypt, сценарии входа/регистрации)
  profile/        # сбор JSON профиля
  data/           # store (фасад → repository), mock.ts — снимок для seed
  db/             # pool, схемы SQL, репозитории, скрипты сидирования
  middleware/     # auth, catchAsync
  lib/            # предметная логика (например день «химии»)
public/           # UI
api/              # обёртка для Vercel serverless
docs/             # архитектура, тесты по слоям, описание бэкенда
test/             # Vitest
scripts/          # утилиты (документация, копирование БД и т.д.)
```

## API (кратко)

| Префикс | Назначение |
|---------|------------|
| `/api/auth` | login, register, logout, me |
| `/api/profile` | профиль текущего пользователя, телефон родителя |
| `/api/parent` | ключи привязки детей и др. |
| `/api` (с `requireParent`) | дневник, оценки, дети для родителя |
| `/api/teacher` | классы, ростер, дневник, уроки |
| `/api/director` | администрирование |

Детали маршрутов — в `src/app.ts` и файлах `src/routes/*.ts`.

## Безопасность

Не коммить `.env`. В продакшене задайте надёжный `SESSION_SECRET` и используйте HTTPS (на Vercel включено).

## Лицензия

Приватный проект (`"private": true` в `package.json`).
