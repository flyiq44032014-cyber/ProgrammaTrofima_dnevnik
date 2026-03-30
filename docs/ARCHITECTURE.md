# Архитектура

## Общая схема

- Один Express-приложение (`src/app.ts`) одновременно:
  - отдаёт SPA из `public/`
  - поднимает API под `/api/*`
- Авторизация и роли:
  - сессия хранится в cookie (`cookie-session`)
  - middleware `requireParent` / `requireTeacher` ограничивает доступ к эндпоинтам
- БД:
  - доступ к PostgreSQL через `pg` (`src/db/pool.ts`)
  - слой репозиториев формирует типизированные ответы (`src/db/repository.ts`, `src/db/teacherRepository.ts` и др.)

## Где что находится

- `src/routes/*` — HTTP роуты и валидация входных данных
- `src/middleware/*` — проверка сессии и обёртка для async-обработчиков
- `src/auth/*` — логика логина/регистрации (пароль хэшируется `bcrypt`)
- `src/db/*`:
  - `pool.ts` — подключение к БД
  - `schema.sql`, `schema_teacher.sql` — схематизация
  - `seed.ts` — заполнение демонстрационными данными

## Деплой на Vercel

- `vercel.json` перенаправляет запросы на serverless entrypoint: `api/index.ts`
- `api/index.ts` экспортирует Express-приложение из исходников (`src/app.ts`)
- В serverless окружение прокидывается фронтенд из `public/` (через `includeFiles`)

## Демо-режим (важно для локального запуска)

- Если `DATABASE_URL` отсутствует:
  - API использует in-memory “mock” данные
- Если `DATABASE_URL задан:
  - API читает реальные данные из PostgreSQL

