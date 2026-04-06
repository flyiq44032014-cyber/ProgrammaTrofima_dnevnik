# Архитектура сервера (блок-схемы)

**Удобнее смотреть в браузере:** откройте файл [`architektura-servera.html`](./architektura-servera.html) — там те же схемы с подписями.

Ниже — Mermaid для предпросмотра в редакторе (если включена поддержка).

## Рис. 1. Общий путь запроса

```mermaid
flowchart LR
  subgraph client["Клиент"]
    B[Браузер]
  end
  subgraph express["Express app.ts"]
    MW["helmet → session → JSON → лимиты"]
    R[Роутеры]
  end
  subgraph logic["Данные"]
    ST[data/store.ts]
    DB[(PostgreSQL)]
    MEM[mock + teacherMemory]
  end
  B --> MW --> R --> ST
  ST -->|DATABASE_URL| DB
  ST -->|нет| MEM
```

**Подпись:** запрос сначала проходит middleware в `app.ts`, затем роут; родительские данные идут через `store.ts` → БД или память.

## Рис. 2. Порядок монтирования `/api`

```mermaid
flowchart TB
  A1["/api/auth"]
  A2["/api/profile"]
  A3["/api/parent"]
  A4["/api/teacher + requireTeacher"]
  A5["/api/director + requireDirector"]
  A6["/api + requireParent → родитель"]
  A1 --> A2 --> A3 --> A4 --> A5 --> A6
```

**Подпись:** общий родительский `apiRouter` — последним, чтобы не перехватывать чужие префиксы.

## Рис. 3. Вход: слои

```mermaid
flowchart TB
  RT[routes/auth.ts] --> AS[authService.ts]
  AS --> AR[authRepository.ts]
  AS --> MD[memDisplay.ts]
```

**Подпись:** `users` и email — `authRepository`; без БД — `memDisplay`.

## Рис. 4–7

См. полную версию в **`architektura-servera.html`** (учитель БД/RAM, слой репозиториев, `server.ts` + статика).
