import type { DiaryDay, DiaryLesson } from "../types";

export const TEACHER_PROFILE = {
  name: "Петров Алексей Викторович",
  subject: "Химия",
};

export const schoolClassesMeta = [
  { id: "c8a", grade: 8, label: "8 А", subjectName: "Химия" },
  { id: "c9a", grade: 9, label: "9 А", subjectName: "Химия" },
  { id: "c10a", grade: 10, label: "10 А", subjectName: "Химия" },
  { id: "c11a", grade: 11, label: "11 А", subjectName: "Химия" },
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

const week: { iso: string; weekday: string; monthGenitive: string }[] = [
  { iso: "2026-03-23", weekday: "Понедельник", monthGenitive: "марта" },
  { iso: "2026-03-24", weekday: "Вторник", monthGenitive: "марта" },
  { iso: "2026-03-25", weekday: "Среда", monthGenitive: "марта" },
  { iso: "2026-03-26", weekday: "Четверг", monthGenitive: "марта" },
  { iso: "2026-03-27", weekday: "Пятница", monthGenitive: "марта" },
];

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
      title: "Алгебра",
      timeLabel: "2-й урок (09:25 - 10:05)",
      grade: rnd(3, 5),
      teacher: "Сидорова А.П.",
      topic: "Функции",
      homework: "№ 301–303",
      controlWork: null,
      place: "Каб. 18",
      homeworkNext: "№ 304",
    },
    {
      title: "Химия",
      timeLabel: "3-й урок (10:20 - 11:00)",
      grade: rnd(4, 5),
      teacher: TEACHER_PROFILE.name,
      topic:
        grade >= 10
          ? "Органические соединения"
          : grade === 9
            ? "Растворы"
            : "Окислительно-восстановительные реакции",
      homework: grade >= 11 ? "§ 45–46, задачи 1–3" : "§ 32, упр. 5",
      controlWork: iso.endsWith("25") ? "5 (лабораторная)" : null,
      place: "Каб. химии",
      homeworkNext: "Подготовка к лабораторной",
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
    for (const d of week) {
      out[c.id][d.iso] = {
        date: d.iso,
        weekday: d.weekday,
        monthGenitive: d.monthGenitive,
        year: 2026,
        lessons: lessonsForDay(c.grade, d.iso, 0),
      };
    }
  }
  return out;
}
