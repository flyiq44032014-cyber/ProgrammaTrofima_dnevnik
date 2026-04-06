/**
 * Генерирует docs/backend-files-opisanie.docx — подробное описание файлов бэкенда.
 * Запуск: node scripts/generate-backend-docx.cjs
 */
const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
} = require("docx");

const outPath = path.join(__dirname, "..", "docs", "backend-files-opisanie.docx");
const outPathAlt = path.join(__dirname, "..", "docs", "backend-files-opisanie-novyj.docx");

/** @type {{ section: string, items: { file: string, text: string }[] }[]} */
const sections = [
  {
    section: "Корень каталога src",
    items: [
      {
        file: "server.ts",
        text:
          "Точка входа процесса Node.js: загрузка переменных окружения (dotenv), импорт приложения Express из app.ts. При наличии DATABASE_URL вызывается ensureProfileDbCompatibility из db/ensureCompatibility.ts (идемпотентные ALTER для полей профиля в старых БД). Затем app.listen на порту из PORT (по умолчанию 3000) и хосте HOST (по умолчанию 0.0.0.0).",
      },
      {
        file: "app.ts",
        text:
          "Сборка приложения Express: отключение x-powered-by, helmet (CSP), trust proxy, cookie-session с именем куки и секретом SESSION_SECRET, express.json с лимитом тела 200kb, заголовки no-cache для /api. Подключаются express-rate-limit для префиксов /api/auth, /api/teacher, /api/director, /api/profile, /api/parent. Монтируются роутеры: auth, profile, parent; teacher и director с middleware ролей; общий apiRouter с requireParent. Статика из каталога public с политикой кэша для html/js/css; fallback app.get('*') отдаёт index.html для SPA.",
      },
      {
        file: "types.ts",
        text:
          "Общие типы и интерфейсы TypeScript без логики: Child, DiaryLesson, DiaryDay, PerformancePayload, GradeDaySummary, GradeDayDetail, FinalRow и др. Используются во всём бэкенде и при маппинге данных из БД.",
      },
    ],
  },
  {
    section: "Маршруты (src/routes)",
    items: [
      {
        file: "api.ts",
        text:
          "JSON API для роли родителя под префиксом /api (после requireParent в app.ts): версия приложения со списком учеников, /children, /children/:childId/diary и meta, успеваемость, итоговые оценки, история оценок. Проверка принадлежности ребёнка родителю через store.childBelongsToParent. Ошибки async оборачиваются в catchAsync.",
      },
      {
        file: "auth.ts",
        text:
          "Маршруты входа и регистрации: логин по email/паролю, выход, информация о текущей сессии. Использует authService для проверки пароля (bcrypt) и работы с пользователем в БД или памяти; выставляет req.session.uid и роль.",
      },
      {
        file: "parent.ts",
        text:
          "Роутер под /api/parent с requireParent. В частности POST link-keys/redeem — активация ключа привязки родителя к ученику через directorRepository.redeemParentLinkKey.",
      },
      {
        file: "profile.ts",
        text:
          "HTTP API экрана профиля: чтение и обновление данных пользователя, детей родителя, классов учителя. Делегирует сбор и сохранение в profile/service и profileRepository.",
      },
      {
        file: "teacher.ts",
        text:
          "API учителя под /api/teacher: список классов (из БД или teacherMemory), ростер, дневник класса по дате, четверть, оценки за день (chemistry-day), правка строки ученика, квартальная таблица, встреча, правка урока, статистика ученика. При отсутствии БД использует mem* из teacherMemory и teacherSeedData.",
      },
      {
        file: "director.ts",
        text:
          "API директора: расписание четвертей, классы, привязка учителей к классам, ключи для родителей, просмотр профиля родителя и др. Опирается на directorRepository и связанные запросы.",
      },
    ],
  },
  {
    section: "Промежуточное ПО (src/middleware)",
    items: [
      {
        file: "auth.ts",
        text:
          "requireParent, requireTeacher, requireDirector: проверка наличия сессии и соответствия роли пользователя в users; иначе 401/403. Не занимается rate limiting.",
      },
      {
        file: "catchAsync.ts",
        text:
          "Обёртка для async-обработчиков Express: при отклонённом промиссе логирует ошибку и отвечает JSON с полем error и заданным статусом (по умолчанию 500).",
      },
    ],
  },
  {
    section: "Данные (src/data)",
    items: [
      {
        file: "store.ts",
        text:
          "Фасад для бизнес-операций родительского приложения: если задан DATABASE_URL — вызовы функций из db/repository (и связанных мест), иначе — из mock.ts. Функция childrenForParentPicker без БД отфильтровывает демо-детей с classScheduleId.",
      },
      {
        file: "mock.ts",
        text:
          "In-memory данные при работе без PostgreSQL: дети, дневники по датам, успеваемость, история оценок, объявления. Для учеников с classScheduleId подмешивает логику классного дневника через teacherMemory и applyPerStudentGradesToClassDiaryDay.",
      },
      {
        file: "teacherMemory.ts",
        text:
          "Состояние в RAM для демо-режима учителя: классы, дневники по classId и дате, правки уроков, «химия» и квартальные средние по индексам учеников, встречи. Используется routes/teacher.ts когда БД недоступна.",
      },
      {
        file: "teacherSeedData.ts",
        text:
          "Константы и генераторы для демо: метаданные школьных классов, недели с датами, построение ростеров и классных дневников для сидов и teacherMemory.",
      },
    ],
  },
  {
    section: "Аутентификация (src/auth)",
    items: [
      {
        file: "authService.ts",
        text:
          "Сервис входа: нормализация email, authFindByEmail через authRepository или memDisplay, bcrypt.compare и хеширование при регистрации, authCreateUser с валидацией ФИО. Единая точка для routes/auth без прямого SQL.",
      },
      {
        file: "memDisplay.ts",
        text:
          "Демо-пользователи в памяти при отсутствии DATABASE_URL: сиды, поиск по email, преобразование в формат AuthUserRow для authService.",
      },
    ],
  },
  {
    section: "Профиль (src/profile)",
    items: [
      {
        file: "service.ts",
        text:
          "Сборка ProfilePayload для UI: ФИО, email, телефон родителя, аватар, дети, классы учителя; ветвление БД (profileRepository, repository.syncParentChildStudentIds) и память. Нормализация телефона родителя.",
      },
    ],
  },
  {
    section: "Библиотека (src/lib)",
    items: [
      {
        file: "chemistryDayStudents.ts",
        text:
          "Детерминированные оценки за урок по классу: hashTeacherChemString, buildChemistryDayStudentRows (пропуски, кто получил оценку), matchRosterName, applyPerStudentGradesToClassDiaryDay для согласования карточки родителя с таблицей учителя.",
      },
    ],
  },
  {
    section: "База данных — TypeScript (src/db)",
    items: [
      {
        file: "pool.ts",
        text:
          "Создание пула pg Pool, экспорт getPool, withPgRetry для повторов при временных сбоях, closePool для корректного завершения.",
      },
      {
        file: "lessonRow.ts",
        text:
          "Функция rowToLesson: преобразование одной строки результата SQL (lesson_key, lesson_order, title, time_label, grade, …) в объект DiaryLesson для TypeScript.",
      },
      {
        file: "repository.ts",
        text:
          "Запросы родительского контура: студенты, привязка родителя к ученику, дневник ребёнка (включая общий классный дневник при class_schedule_id), даты дневника, успеваемость, история оценок, итоги. Использует rowToLesson и applyPerStudentGradesToClassDiaryDay при необходимости.",
      },
      {
        file: "authRepository.ts",
        text:
          "Таблица users: поиск по lower(email), создание пользователя с password_hash и ролью, типы UserRole и RegisterProfile.",
      },
      {
        file: "profileRepository.ts",
        text:
          "Данные профиля в БД: поля users, связи родитель–дети, классы учителя для отображения в профиле.",
      },
      {
        file: "teacherRepository.ts",
        text:
          "Школьные классы, ростер class_roster, классные дни class_diary_days и уроки class_diary_lessons, обновление урока, список классов учителя по четверти (director_quarter_schedule). Экспорт TEACHER_PROFILE и константа четверти для сидов.",
      },
      {
        file: "directorRepository.ts",
        text:
          "Логика директора: расписание, классы, учителя на класс, ключи привязки родителей, погашение ключа redeemParentLinkKey и связанные операции.",
      },
      {
        file: "ensureCompatibility.ts",
        text:
          "ensureProfileDbCompatibility: идемпотентные ALTER TABLE … IF NOT EXISTS для колонок профиля и user_parent_children, чтобы старые базы не падали на SELECT.",
      },
      {
        file: "seed.ts",
        text:
          "Основной сид PostgreSQL: школьные классы и ростеры из teacherSeedData, классные дневники, пользователи и связи из mock-снимка, при необходимости личные дневники. Запускается как отдельный процесс (npm run db:seed).",
      },
      {
        file: "seedSimple.ts",
        text:
          "Упрощённый или альтернативный сценарий наполнения (квартальное расписание, мартовские дневники и т.д. по замыслу проекта).",
      },
      {
        file: "seedDemoUsers.ts",
        text:
          "Сид демо-пользователей (родители, учителя, директор) для стенда.",
      },
      {
        file: "seedFamilyParents.ts",
        text:
          "Сид семей и привязок родителей к ученикам для тестовых сценариев.",
      },
      {
        file: "seedStudentSurnames400.ts",
        text:
          "Сид фамилий/учеников для массового теста данных.",
      },
      {
        file: "teacherSeedNames.ts",
        text:
          "Вспомогательные имена/данные для генерации ростеров и сидов учителя.",
      },
      {
        file: "syncFamilyParents.ts",
        text:
          "Скрипт синхронизации семей и родителей в БД (одноразовая или сервисная задача).",
      },
      {
        file: "activateParentAccounts.ts",
        text:
          "Скрипт активации учётных записей родителей в БД.",
      },
      {
        file: "activateTeacherAccounts.ts",
        text:
          "Скрипт активации учётных записей учителей в БД.",
      },
      {
        file: "backfillUserParentStudentIds.ts",
        text:
          "Заполнение связей student_id в user_parent_children для уже существующих строк.",
      },
      {
        file: "backfillStudentPerformanceFromClass.ts",
        text:
          "Пересчёт или дорисовка успеваемости ученика из данных класса.",
      },
      {
        file: "backfillFinalsQuarters.ts",
        text:
          "Бэкфилл итоговых оценок по четвертям.",
      },
      {
        file: "fillPerformanceFromClassDiary.ts",
        text:
          "Заполнение показателей успеваемости на основе классного дневника.",
      },
      {
        file: "fillHomeroomTeachers.ts",
        text:
          "Заполнение классных руководителей в расписании/классах.",
      },
      {
        file: "finalsFromGrades.ts",
        text:
          "Логика вывода итогов из накопленных оценок (вспомогательный скрипт или импортируемые функции).",
      },
    ],
  },
  {
    section: "База данных — SQL-схемы (src/db)",
    items: [
      {
        file: "schema.sql",
        text:
          "Основной DDL: пользователи, студенты, личные дневники (diary_days, diary_lessons), успеваемость, связи родитель–ребёнок и прочие базовые таблицы приложения.",
      },
      {
        file: "schema_teacher.sql",
        text:
          "Дополнительная схема: school_classes, class_roster, class_diary_days, class_diary_lessons и связанные сущности классного дневника и учителя.",
      },
      {
        file: "schema_v2.sql",
        text:
          "Расширенная или миграционная схема для апгрейда БД (дополнительные таблицы/поля по версии проекта).",
      },
    ],
  },
];

const children = [
  new Paragraph({
    text: "Бэкенд: архитектура и файлы",
    heading: HeadingLevel.TITLE,
  }),
  new Paragraph({
    text: "Часть А — визуальные блок-схемы",
    heading: HeadingLevel.HEADING_1,
  }),
  new Paragraph({
    text:
      "Откройте в браузере файл docs/architektura-servera.html (из корня проекта: папка docs). В нём семь рисунков: общий поток запроса, порядок роутеров /api, слои входа (auth), родитель и store, учитель (БД или память), файлы базы данных, старт server.ts и статика SPA. Под каждой схемой — подпись на русском, что за что отвечает.",
  }),
  new Paragraph({ text: "" }),
  new Paragraph({
    text: "Часть Б — справочник по файлам src/",
    heading: HeadingLevel.HEADING_1,
  }),
  new Paragraph({
    text:
      "Ниже перечислены модули TypeScript и SQL в src (без public/). Кратко — назначение. Обновление документа: npm run docs:backend-docx.",
  }),
  new Paragraph({ text: "" }),
];

for (const block of sections) {
  children.push(
    new Paragraph({
      text: block.section,
      heading: HeadingLevel.HEADING_1,
    })
  );
  for (const { file, text } of block.items) {
    children.push(
      new Paragraph({
        text: file,
        heading: HeadingLevel.HEADING_2,
      })
    );
    children.push(new Paragraph({ text }));
    children.push(new Paragraph({ text: "" }));
  }
}

const doc = new Document({
  sections: [
    {
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  try {
    fs.writeFileSync(outPath, buffer);
    console.log("Записано:", outPath);
  } catch (e) {
    if (e && e.code === "EBUSY") {
      fs.writeFileSync(outPathAlt, buffer);
      console.log("Основной файл занят (закройте Word). Записано:", outPathAlt);
    } else throw e;
  }
});
