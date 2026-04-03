import type { DiaryDay, DiaryLesson } from "../types";

export const TEACHER_PROFILE = {
  name: "Петров Алексей Викторович",
  subject: "Математика",
};

/** Предметы демо-учителя в режиме без БД (как у директора: несколько строк в teacher_subjects) */
export const DEMO_TEACHER_SUBJECTS = ["Математика", "Информатика"] as const;

export const schoolClassesMeta = [
  { id: "c8a", grade: 8, label: "8 А", subjectName: "Математика" },
  { id: "c9a", grade: 9, label: "9 А", subjectName: "Математика" },
  { id: "c10a", grade: 10, label: "10 А", subjectName: "Математика" },
  { id: "c11a", grade: 11, label: "11 А", subjectName: "Математика" },
];

const firstNames = [
  "Александр",
  "Дмитрий",
  "Мария",
  "Анна",
  "Иван",
  "Елена",
  "Сергей",
  "Ольга",
  "Павел",
  "Наталья",
  "Андрей",
  "Татьяна",
  "Михаил",
  "Екатерина",
  "Никита",
  "Софья",
  "Артём",
  "Виктория",
  "Кирилл",
  "Полина",
];

const lastNames = [
  "Иванов",
  "Петров",
  "Сидоров",
  "Козлов",
  "Новиков",
  "Морозов",
  "Волков",
  "Соколов",
  "Лебедев",
  "Егоров",
  "Кузнецов",
  "Смирнов",
  "Попов",
  "Васильев",
  "Фёдоров",
];

function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 15–25 фамилий на класс */
export function buildRosters(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (const c of schoolClassesMeta) {
    const n = 15 + Math.floor(rand() * 11);
    const names: string[] = [];
    for (let i = 0; i < n; i++) {
      const ln = lastNames[Math.floor(rand() * lastNames.length)];
      const fn = firstNames[Math.floor(rand() * firstNames.length)];
      names.push(`${ln} ${fn}`);
    }
    out[c.id] = names.sort((a, b) => a.localeCompare(b, "ru"));
  }
  return out;
}

const RU_MONTHS_GEN = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const RU_WEEKDAYS = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
];

/** 10 учебных дней: 2 полные недели (без субботы и воскресенья), с указанной даты пн */
export function buildTwoWeekSchoolDays(
  startYear: number,
  /** 0 = январь */
  startMonthIndex: number,
  startDay: number
): { iso: string; weekday: string; monthGenitive: string; year: number }[] {
  const out: {
    iso: string;
    weekday: string;
    monthGenitive: string;
    year: number;
  }[] = [];
  const cur = new Date(Date.UTC(startYear, startMonthIndex, startDay));
  let added = 0;
  while (added < 10) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      const iso = cur.toISOString().slice(0, 10);
      out.push({
        iso,
        weekday: RU_WEEKDAYS[dow],
        monthGenitive: RU_MONTHS_GEN[cur.getUTCMonth()],
        year: cur.getUTCFullYear(),
      });
      added++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

const schoolDays = buildTwoWeekSchoolDays(2026, 2, 23);

/** Даты учебных дней в демо (2 недели, пн–пт) */
export const TEACHER_WEEK_ISOS = schoolDays.map((w) => w.iso);

/** Основной предмет для журнала/оценок в демо (раньше была химия) */
export const TEACHER_PRIMARY_LESSON_TITLE = "Математика";
/** @deprecated используйте TEACHER_PRIMARY_LESSON_TITLE */
export const CHEMISTRY_LESSON_TITLE = TEACHER_PRIMARY_LESSON_TITLE;

function lessonsForDay(
  grade: number,
  iso: string,
  chemIdx: number
): DiaryLesson[] {
  const base: Omit<DiaryLesson, "id" | "order">[] = [
    {
      title: "Русский язык",
      timeLabel: "1-й урок (08:30 - 09:10)",
      grade: rnd(4, 5),
      teacher: "Иванова М.О.",
      topic: "Синтаксис",
      homework: "Упр. 201",
      controlWork: null,
      place: "Каб. 12",
      homeworkNext: "Упр. 202",
    },
    {
      title: "Информатика",
      timeLabel: "2-й урок (09:25 - 10:05)",
      grade: rnd(3, 5),
      teacher: TEACHER_PROFILE.name,
      topic: "Алгоритмы и исполнители",
      homework: "№ 5–7 практикум",
      controlWork: null,
      place: "Каб. 18",
      homeworkNext: "Подготовка к лабораторной",
    },
    {
      title: "Математика",
      timeLabel: "3-й урок (10:20 - 11:00)",
      grade: rnd(4, 5),
      teacher: TEACHER_PROFILE.name,
      topic:
        grade >= 10
          ? "Производная"
          : grade === 9
            ? "Квадратные уравнения"
            : "Дроби",
      homework: grade >= 11 ? "№ 401–403" : "№ 120–122",
      controlWork: iso.endsWith("25") ? "Самостоятельная работа" : null,
      place: "Каб. 15",
      homeworkNext: "Повторение",
    },
    {
      title: "История",
      timeLabel: "4-й урок (11:15 - 11:55)",
      grade: rnd(4, 5),
      teacher: "Смирнова О.И.",
      topic: "Новое время",
      homework: "Параграф 12",
      controlWork: null,
      place: "Каб. 22",
      homeworkNext: "Вопросы",
    },
    {
      title: "Физическая культура",
      timeLabel: "5-й урок (12:10 - 12:50)",
      grade: null,
      teacher: "Петров С.И.",
      topic: "Волейбол",
      homework: "—",
      controlWork: null,
      place: "Спортзал",
      homeworkNext: "Форма",
    },
  ];
  return base.map((b, i) => ({
    ...b,
    id: `l${grade}-${iso}-${i + 1}`,
    order: i + 1,
  }));
}

export function buildClassDiaries(): Record<string, Record<string, DiaryDay>> {
  const out: Record<string, Record<string, DiaryDay>> = {};
  for (const c of schoolClassesMeta) {
    out[c.id] = {};
    for (const d of schoolDays) {
      out[c.id][d.iso] = {
        date: d.iso,
        weekday: d.weekday,
        monthGenitive: d.monthGenitive,
        year: d.year,
        lessons: lessonsForDay(c.grade, d.iso, 0),
      };
    }
  }
  return out;
}
