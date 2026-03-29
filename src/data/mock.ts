import type {
  Child,
  ClassMeetingAnnouncement,
  DiaryDay,
  FinalsPayload,
  GradeDayDetail,
  GradeDaySummary,
  PerformancePayload,
} from "../types";
import {
  memGetClassDiary,
  memGetClassDiaryDates,
  memGetMeeting,
} from "./teacherMemory";

const children: Child[] = [
  { id: "nika", name: "Ястребова Ника", classLabel: "3 Б класс" },
  { id: "efrem", name: "Ястребова Ефрем", classLabel: "6 А класс" },
  {
    id: "demo8a",
    name: "Класс 8 А (родитель)",
    classLabel: "8 А класс",
    classScheduleId: "c8a",
  },
  {
    id: "demo9a",
    name: "Класс 9 А (родитель)",
    classLabel: "9 А класс",
    classScheduleId: "c9a",
  },
  {
    id: "demo10a",
    name: "Класс 10 А (родитель)",
    classLabel: "10 А класс",
    classScheduleId: "c10a",
  },
  {
    id: "demo11a",
    name: "Класс 11 А (родитель)",
    classLabel: "11 А класс",
    classScheduleId: "c11a",
  },
];

function lessonBlocks(
  teacher: string,
  topic: string,
  homework: string,
  controlWork: string | null,
  place: string,
  homeworkNext: string
) {
  const blocks = [
    { key: "teacher", label: "Преподаватель", text: `Преподаватель: ${teacher}` },
    { key: "topic", label: "Тема", text: `Тема: ${topic}` },
    { key: "hw", label: "Домашнее задание", text: `Домашнее задание: ${homework}` },
  ];
  if (controlWork) {
    blocks.push({
      key: "ctrl",
      label: "Контрольная работа",
      text: `Контрольная работа: ${controlWork}`,
    });
  }
  blocks.push(
    { key: "place", label: "Место", text: `Место: ${place}` },
    {
      key: "hwNext",
      label: "Домашнее задание на следующий урок",
      text: `Домашнее задание на следующий урок: ${homeworkNext}`,
    }
  );
  return blocks;
}

/** Дневник: ключ — childId, затем дата ISO */
const diaryByChild: Record<string, Record<string, DiaryDay>> = {
  nika: {
    "2026-03-23": {
      date: "2026-03-23",
      weekday: "Понедельник",
      monthGenitive: "марта",
      year: 2026,
      lessons: [
        {
          id: "l1",
          order: 1,
          title: "Русский язык",
          timeLabel: "1-й урок (08:30 - 09:10)",
          grade: 5,
          teacher: "Иванова Мария Олеговна",
          topic: "Слова с непроверяемыми гласными в корне",
          homework: "Упр. 198, выписать слова",
          controlWork: null,
          place: "Кабинет №5",
          homeworkNext: "Упр. 199",
        },
        {
          id: "l2",
          order: 2,
          title: "Математика",
          timeLabel: "2-й урок (09:30 - 10:10)",
          grade: 4,
          teacher: "Сидорова Анна Петровна",
          topic: "Сравнение дробей",
          homework: "№ 345–347",
          controlWork: null,
          place: "Кабинет №12",
          homeworkNext: "№ 348–350",
        },
        {
          id: "l3",
          order: 3,
          title: "Литературное чтение",
          timeLabel: "3-й урок (10:30 - 11:10)",
          grade: 5,
          teacher: "Оськина Елена Сергеевна",
          topic: "С.В. Михалков «Дядя Стёпа»",
          homework: "с.88–89 пересказ",
          controlWork: null,
          place: "Кабинет №7",
          homeworkNext: "с.90 вопросы",
        },
        {
          id: "l4",
          order: 4,
          title: "Окружающий мир",
          timeLabel: "4-й урок (11:30 - 12:10)",
          grade: 5,
          teacher: "Кузнецова Ирина Викторовна",
          topic: "Растения леса",
          homework: "Параграф 24, таблица",
          controlWork: null,
          place: "Кабинет №14",
          homeworkNext: "Коллекция листьев",
        },
        {
          id: "l5",
          order: 5,
          title: "Музыка",
          timeLabel: "5-й урок (12:30 - 13:10)",
          grade: 4,
          teacher: "Орлова Светлана Павловна",
          topic: "Русские народные песни",
          homework: "Прослушать запись №3",
          controlWork: null,
          place: "Кабинет музыки",
          homeworkNext: "Выучить припев",
        },
        {
          id: "l6",
          order: 6,
          title: "Физическая культура",
          timeLabel: "6-й урок (13:30 - 14:10)",
          grade: null,
          teacher: "Петров Сергей Иванович",
          topic: "Прыжки, эстафета",
          homework: "—",
          controlWork: null,
          place: "Спортзал",
          homeworkNext: "Кроссовки",
        },
      ],
    },
    "2026-03-24": {
      date: "2026-03-24",
      weekday: "Вторник",
      monthGenitive: "марта",
      year: 2026,
      lessons: [
        {
          id: "l1",
          order: 1,
          title: "Математика",
          timeLabel: "1-й урок (08:30 - 09:10)",
          grade: 5,
          teacher: "Сидорова Анна Петровна",
          topic: "Сложение и вычитание дробей",
          homework: "№ 351–353",
          controlWork: null,
          place: "Кабинет №12",
          homeworkNext: "№ 354–356",
        },
        {
          id: "l2",
          order: 2,
          title: "Русский язык",
          timeLabel: "2-й урок (09:30 - 10:10)",
          grade: 4,
          teacher: "Иванова Мария Олеговна",
          topic: "Правописание Н и НН в прилагательных",
          homework: "Упр. 201",
          controlWork: null,
          place: "Кабинет №5",
          homeworkNext: "Упр. 202",
        },
        {
          id: "l3",
          order: 3,
          title: "Изобразительное искусство",
          timeLabel: "3-й урок (10:30 - 11:10)",
          grade: 5,
          teacher: "Белова Ксения Андреевна",
          topic: "Натюрморт гуашью",
          homework: "Принести кисти",
          controlWork: null,
          place: "Арт-студия",
          homeworkNext: "Эскиз дома",
        },
        {
          id: "l4",
          order: 4,
          title: "Иностранный (английский) язык",
          timeLabel: "4-й урок (11:30 - 12:10)",
          grade: 5,
          teacher: "Уилсон Джеймс",
          topic: "Family and hobbies",
          homework: "Workbook p.42 ex.1–3",
          controlWork: null,
          place: "Кабинет №9",
          homeworkNext: "Словарь: 10 слов",
        },
        {
          id: "l5",
          order: 5,
          title: "Труд (технология)",
          timeLabel: "5-й урок (12:30 - 13:10)",
          grade: 4,
          teacher: "Волков Денис Сергеевич",
          topic: "Поделка из бумаги",
          homework: "Принести цветной картон",
          controlWork: null,
          place: "Мастерская",
          homeworkNext: "Ножницы, клей",
        },
      ],
    },
    "2026-03-25": {
      date: "2026-03-25",
      weekday: "Среда",
      monthGenitive: "марта",
      year: 2026,
      lessons: [
        {
          id: "l1",
          order: 1,
          title: "Литературное чтение",
          timeLabel: "1-й урок (08:30 - 09:10)",
          grade: 4,
          teacher: "Оськина Елена Сергеевна",
          topic: "Аудирование: сказка А. Погорельского",
          homework: "с.91 читать",
          controlWork: null,
          place: "Кабинет №7",
          homeworkNext: "с.92 упр.",
        },
        {
          id: "l2",
          order: 2,
          title: "Математика",
          timeLabel: "2-й урок (09:30 - 10:10)",
          grade: 3,
          teacher: "Сидорова Анна Петровна",
          topic: "Задачи на доли",
          homework: "№ 380–382",
          controlWork: "3 (устная работа)",
          place: "Кабинет №12",
          homeworkNext: "№ 383–385",
        },
        {
          id: "l3",
          order: 3,
          title: "Окружающий мир",
          timeLabel: "3-й урок (10:30 - 11:10)",
          grade: 5,
          teacher: "Кузнецова Ирина Викторовна",
          topic: "Животные леса",
          homework: "Рабочая тетрадь с.45",
          controlWork: null,
          place: "Кабинет №14",
          homeworkNext: "Фото животного",
        },
        {
          id: "l4",
          order: 4,
          title: "Музыка",
          timeLabel: "4-й урок (11:30 - 12:10)",
          grade: 5,
          teacher: "Орлова Светлана Павловна",
          topic: "Инструменты симфонического оркестра",
          homework: "Найти фото 5 инструментов",
          controlWork: null,
          place: "Кабинет музыки",
          homeworkNext: "Прослушать «Петра и волка»",
        },
        {
          id: "l5",
          order: 5,
          title: "Физическая культура",
          timeLabel: "5-й урок (12:30 - 13:10)",
          grade: 5,
          teacher: "Петров Сергей Иванович",
          topic: "Волейбол: подача",
          homework: "—",
          controlWork: null,
          place: "Спортзал",
          homeworkNext: "Форма",
        },
      ],
    },
    "2026-03-26": {
      date: "2026-03-26",
      weekday: "Четверг",
      monthGenitive: "марта",
      year: 2026,
      lessons: [
        {
          id: "l1",
          order: 1,
          title: "Русский язык",
          timeLabel: "1-й урок (08:30 - 09:10)",
          grade: 5,
          teacher: "Иванова Мария Олеговна",
          topic: "Правописание приставок",
          homework: "Упр. 234",
          controlWork: null,
          place: "Кабинет №5",
          homeworkNext: "Упр. 235",
        },
        {
          id: "l2",
          order: 2,
          title: "Математика",
          timeLabel: "2-й урок (09:30 - 10:10)",
          grade: 4,
          teacher: "Сидорова Анна Петровна",
          topic: "Уравнения",
          homework: "№ 400–402",
          controlWork: null,
          place: "Кабинет №12",
          homeworkNext: "№ 403–405",
        },
        {
          id: "l3",
          order: 3,
          title: "Литературное чтение",
          timeLabel: "3-й урок (10:30 - 11:10)",
          grade: 5,
          teacher: "Оськина Елена Сергеевна",
          topic: "Обсуждение прочитанного",
          homework: "с.93 ответы на вопросы",
          controlWork: null,
          place: "Кабинет №7",
          homeworkNext: "Читать с.94",
        },
        {
          id: "l4",
          order: 4,
          title: "Иностранный (английский) язык",
          timeLabel: "4-й урок (11:30 - 12:10)",
          grade: 5,
          teacher: "Уилсон Джеймс",
          topic: "Past Simple",
          homework: "Grammar sheet 12",
          controlWork: null,
          place: "Кабинет №9",
          homeworkNext: "3 предложения о выходных",
        },
      ],
    },
    "2026-03-27": {
      date: "2026-03-27",
      weekday: "Пятница",
      monthGenitive: "марта",
      year: 2026,
      lessons: [
        {
          id: "l1",
          order: 1,
          title: "Литературное чтение",
          timeLabel: "1-й урок (08:30 - 09:10)",
          grade: 4,
          blocks: lessonBlocks(
            "Оськина Елена Сергеевна",
            "Тематическая проверочная работа по теме «Природа в литературе»",
            "с.96-97 выразительное чтение, подготовиться к проверочной работе",
            "4 (Контрольная работа)",
            "Кабинет №7, Кабинет начальных классов",
            "с.98-99 выразительное чтение"
          ),
        },
        {
          id: "l2",
          order: 2,
          title: "Физическая культура",
          timeLabel: "2-й урок (09:30 - 10:10)",
          grade: null,
          teacher: "Петров Сергей Иванович",
          topic: "Лёгкая атлетика",
          homework: "—",
          controlWork: null,
          place: "Спортзал",
          homeworkNext: "Форма",
        },
        {
          id: "l3",
          order: 3,
          title: "Математика",
          timeLabel: "3-й урок (10:30 - 11:10)",
          grade: 5,
          teacher: "Сидорова Анна Петровна",
          topic: "Деление в столбик",
          homework: "№ 412–414",
          controlWork: null,
          place: "Кабинет №12",
          homeworkNext: "№ 415–417",
        },
        {
          id: "l4",
          order: 4,
          title: "Окружающий мир",
          timeLabel: "4-й урок (11:30 - 12:10)",
          grade: 4,
          teacher: "Кузнецова Ирина Викторовна",
          topic: "Охрана природы",
          homework: "Параграф 25",
          controlWork: null,
          place: "Кабинет №14",
          homeworkNext: "Плакат А4",
        },
      ],
    },
  },
  efrem: {
    "2026-03-24": {
      date: "2026-03-24",
      weekday: "Вторник",
      monthGenitive: "марта",
      year: 2026,
      lessons: [
        {
          id: "l1",
          order: 1,
          title: "Русский язык",
          timeLabel: "1-й урок (08:00 - 08:45)",
          grade: 4,
          teacher: "Соколова Елена Дмитриевна",
          topic: "Сложное предложение",
          homework: "Упр. 312",
          controlWork: null,
          place: "Кабинет №4",
          homeworkNext: "Сочинение 12 предложений",
        },
        {
          id: "l2",
          order: 2,
          title: "Физика",
          timeLabel: "2-й урок (08:55 - 09:40)",
          grade: 5,
          teacher: "Николаев Игорь Павлович",
          topic: "Закон Ома",
          homework: "№ 45–48",
          controlWork: null,
          place: "Кабинет физики",
          homeworkNext: "Лаб. работа (чтение)",
        },
        {
          id: "l3",
          order: 3,
          title: "Геометрия",
          timeLabel: "3-й урок (10:00 - 10:45)",
          grade: 5,
          teacher: "Морозова Анна Сергеевна",
          topic: "Площадь многоугольника",
          homework: "№ 512–514",
          controlWork: null,
          place: "Кабинет №18",
          homeworkNext: "№ 515–517",
        },
        {
          id: "l4",
          order: 4,
          title: "История",
          timeLabel: "4-й урок (11:05 - 11:50)",
          grade: 4,
          teacher: "Смирнова Ольга Игоревна",
          topic: "Киевская Русь",
          homework: "Параграф 15, тест",
          controlWork: null,
          place: "Кабинет №22",
          homeworkNext: "Хронология на карте",
        },
        {
          id: "l5",
          order: 5,
          title: "Иностранный (английский) язык",
          timeLabel: "5-й урок (12:10 - 12:55)",
          grade: 5,
          teacher: "Браун Сара",
          topic: "Conditionals",
          homework: "Online test unit 6",
          controlWork: null,
          place: "Кабинет №11",
          homeworkNext: "Essay 120 words",
        },
      ],
    },
    "2026-03-25": {
      date: "2026-03-25",
      weekday: "Среда",
      monthGenitive: "марта",
      year: 2026,
      lessons: [
        {
          id: "l1",
          order: 1,
          title: "Алгебра",
          timeLabel: "1-й урок (08:00 - 08:45)",
          grade: 4,
          teacher: "Козлов Дмитрий Викторович",
          topic: "Системы линейных уравнений",
          homework: "№ 201–203",
          controlWork: null,
          place: "Кабинет №18",
          homeworkNext: "№ 204–206",
        },
        {
          id: "l2",
          order: 2,
          title: "Литература",
          timeLabel: "2-й урок (08:55 - 09:40)",
          grade: 5,
          teacher: "Волкова Татьяна Николаевна",
          topic: "М.Ю. Лермонтов «Мцыри»",
          homework: "Анализ эпизода",
          controlWork: null,
          place: "Кабинет №6",
          homeworkNext: "Выучить 8 строк",
        },
        {
          id: "l3",
          order: 3,
          title: "Информатика",
          timeLabel: "3-й урок (10:00 - 10:45)",
          grade: 5,
          teacher: "Громов Алексей Викторович",
          topic: "Алгоритмы с ветвлением",
          homework: "Задачи на Питоне",
          controlWork: null,
          place: "Компьютерный класс",
          homeworkNext: "Код на флешке",
        },
        {
          id: "l4",
          order: 4,
          title: "Физическая культура",
          timeLabel: "4-й урок (11:05 - 11:50)",
          grade: null,
          teacher: "Лебедев Артём Олегович",
          topic: "Баскетбол",
          homework: "—",
          controlWork: null,
          place: "Спортзал",
          homeworkNext: "Кеды",
        },
      ],
    },
    "2026-03-26": {
      date: "2026-03-26",
      weekday: "Четверг",
      monthGenitive: "марта",
      year: 2026,
      lessons: [
        {
          id: "l1",
          order: 1,
          title: "Геометрия",
          timeLabel: "1-й урок (08:00 - 08:45)",
          grade: 4,
          teacher: "Морозова Анна Сергеевна",
          topic: "Подобие треугольников",
          homework: "№ 520–522",
          controlWork: "4 (самостоятельная)",
          place: "Кабинет №18",
          homeworkNext: "№ 523–525",
        },
        {
          id: "l2",
          order: 2,
          title: "Биология",
          timeLabel: "2-й урок (08:55 - 09:40)",
          grade: 5,
          teacher: "Фёдорова Марина Ильинична",
          topic: "Клетка: органеллы",
          homework: "Параграф 8",
          controlWork: null,
          place: "Биологический кабинет",
          homeworkNext: "Рисунок клетки",
        },
        {
          id: "l3",
          order: 3,
          title: "География",
          timeLabel: "3-й урок (10:00 - 10:45)",
          grade: 4,
          teacher: "Павлов Константин Юрьевич",
          topic: "Климатические пояса",
          homework: "Контурная карта",
          controlWork: null,
          place: "Кабинет №20",
          homeworkNext: "Статистика по региону",
        },
        {
          id: "l4",
          order: 4,
          title: "Обществознание",
          timeLabel: "4-й урок (11:05 - 11:50)",
          grade: 5,
          teacher: "Егорова Наталья Сергеевна",
          topic: "Права ребёнка",
          homework: "Вопросы 1–5",
          controlWork: null,
          place: "Кабинет №16",
          homeworkNext: "Мини-проект",
        },
      ],
    },
    "2026-03-27": {
      date: "2026-03-27",
      weekday: "Пятница",
      monthGenitive: "марта",
      year: 2026,
      lessons: [
        {
          id: "l1",
          order: 1,
          title: "Алгебра",
          timeLabel: "1-й урок (08:00 - 08:45)",
          grade: 4,
          teacher: "Козлов Дмитрий Викторович",
          topic: "Квадратные уравнения",
          homework: "№ 101–103",
          controlWork: null,
          place: "Кабинет №18",
          homeworkNext: "№ 104–106",
        },
        {
          id: "l2",
          order: 2,
          title: "История",
          timeLabel: "2-й урок (08:55 - 09:40)",
          grade: null,
          teacher: "Смирнова Ольга Игоревна",
          topic: "Древняя Русь",
          homework: "Параграф 12, вопросы",
          controlWork: null,
          place: "Кабинет №22",
          homeworkNext: "Подготовка к докладу",
        },
        {
          id: "l3",
          order: 3,
          title: "Физика",
          timeLabel: "3-й урок (10:00 - 10:45)",
          grade: 5,
          teacher: "Николаев Игорь Павлович",
          topic: "Последовательное соединение проводников",
          homework: "№ 52–55",
          controlWork: null,
          place: "Кабинет физики",
          homeworkNext: "Репетиция лабораторной",
        },
        {
          id: "l4",
          order: 4,
          title: "Иностранный (английский) язык",
          timeLabel: "4-й урок (11:05 - 11:50)",
          grade: 5,
          teacher: "Браун Сара",
          topic: "Debate preparation",
          homework: "Аргументы за/против",
          controlWork: null,
          place: "Кабинет №11",
          homeworkNext: "Речь 1 мин",
        },
      ],
    },
  },
};

const performanceByChild: Record<string, PerformancePayload> = {
  nika: {
    trimesterLabel: "3 Триместр",
    dateLabel: "27 Пятница марта, 2026",
    dayNum: 27,
    weekday: "Пятница",
    monthGenitive: "марта",
    year: 2026,
    rows: [
      {
        subjectId: "all",
        subjectName: "Все предметы",
        studentAvg: 4.34,
        classAvg: 4.16,
        parallelAvg: 4.11,
      },
      {
        subjectId: "russian",
        subjectName: "Русский язык",
        studentAvg: 4.0,
        classAvg: 3.56,
        parallelAvg: 3.5,
      },
      {
        subjectId: "reading",
        subjectName: "Литературное чтение",
        studentAvg: 4.0,
        classAvg: 3.92,
        parallelAvg: 3.81,
      },
      {
        subjectId: "world",
        subjectName: "Окружающий мир",
        studentAvg: 4.2,
        classAvg: 3.84,
        parallelAvg: 3.69,
      },
      {
        subjectId: "music",
        subjectName: "Музыка",
        studentAvg: 4.0,
        classAvg: 4.13,
        parallelAvg: 4.34,
      },
      {
        subjectId: "art",
        subjectName: "Изобразительное искусство",
        studentAvg: 5.0,
        classAvg: 4.78,
        parallelAvg: 4.38,
      },
      {
        subjectId: "pe",
        subjectName: "Физическая культура",
        studentAvg: 4.66,
        classAvg: 4.71,
        parallelAvg: 4.77,
      },
      {
        subjectId: "math",
        subjectName: "Математика",
        studentAvg: 4.25,
        classAvg: 3.82,
        parallelAvg: 3.8,
      },
      {
        subjectId: "english",
        subjectName: "Иностранный (английский) язык",
        studentAvg: 4.85,
        classAvg: 4.5,
        parallelAvg: 4.42,
      },
      {
        subjectId: "tech",
        subjectName: "Труд (технология)",
        studentAvg: 4.4,
        classAvg: 4.2,
        parallelAvg: 4.05,
      },
    ],
  },
  efrem: {
    trimesterLabel: "3 Триместр",
    dateLabel: "27 Пятница марта, 2026",
    dayNum: 27,
    weekday: "Пятница",
    monthGenitive: "марта",
    year: 2026,
    rows: [
      {
        subjectId: "all",
        subjectName: "Все предметы",
        studentAvg: 4.52,
        classAvg: 4.2,
        parallelAvg: 4.12,
      },
      {
        subjectId: "algebra",
        subjectName: "Алгебра",
        studentAvg: 4.3,
        classAvg: 3.9,
        parallelAvg: 3.85,
      },
      {
        subjectId: "geometry",
        subjectName: "Геометрия",
        studentAvg: 4.6,
        classAvg: 4.0,
        parallelAvg: 3.95,
      },
      {
        subjectId: "russian",
        subjectName: "Русский язык",
        studentAvg: 4.4,
        classAvg: 3.7,
        parallelAvg: 3.65,
      },
      {
        subjectId: "physics",
        subjectName: "Физика",
        studentAvg: 4.75,
        classAvg: 4.1,
        parallelAvg: 4.0,
      },
      {
        subjectId: "history",
        subjectName: "История",
        studentAvg: 4.35,
        classAvg: 3.95,
        parallelAvg: 3.88,
      },
      {
        subjectId: "literature",
        subjectName: "Литература",
        studentAvg: 4.8,
        classAvg: 4.25,
        parallelAvg: 4.1,
      },
      {
        subjectId: "english",
        subjectName: "Иностранный (английский) язык",
        studentAvg: 4.9,
        classAvg: 4.45,
        parallelAvg: 4.3,
      },
      {
        subjectId: "informatics",
        subjectName: "Информатика",
        studentAvg: 4.95,
        classAvg: 4.3,
        parallelAvg: 4.15,
      },
      {
        subjectId: "biology",
        subjectName: "Биология",
        studentAvg: 4.5,
        classAvg: 4.05,
        parallelAvg: 3.98,
      },
      {
        subjectId: "geography",
        subjectName: "География",
        studentAvg: 4.2,
        classAvg: 3.88,
        parallelAvg: 3.8,
      },
      {
        subjectId: "social",
        subjectName: "Обществознание",
        studentAvg: 4.65,
        classAvg: 4.1,
        parallelAvg: 4.0,
      },
    ],
  },
};

/** Список дат с оценками для «Все предметы» */
const gradeHistorySummary: Record<string, GradeDaySummary[]> = {
  nika: [
    { date: "2026-03-05", dateDisplay: "5 марта", grades: [5, 4, 5] },
    { date: "2026-03-11", dateDisplay: "11 марта", grades: [5, 4, 4, 4] },
    { date: "2026-03-12", dateDisplay: "12 марта", grades: [4, 4] },
    { date: "2026-03-17", dateDisplay: "17 марта", grades: [3, 5, 4] },
    { date: "2026-03-24", dateDisplay: "24 марта", grades: [5, 4, 5, 5, 4] },
    { date: "2026-03-25", dateDisplay: "25 марта", grades: [4, 3, 5, 5, 5] },
    { date: "2026-03-27", dateDisplay: "27 марта", grades: [4, 5, 4] },
  ],
  efrem: [
    { date: "2026-03-10", dateDisplay: "10 марта", grades: [4, 5, 5, 4] },
    { date: "2026-03-18", dateDisplay: "18 марта", grades: [5, 4] },
    { date: "2026-03-20", dateDisplay: "20 марта", grades: [5, 4] },
    { date: "2026-03-24", dateDisplay: "24 марта", grades: [4, 5, 5, 4, 5] },
    { date: "2026-03-25", dateDisplay: "25 марта", grades: [4, 5, 5, 5] },
    { date: "2026-03-26", dateDisplay: "26 марта", grades: [4, 5, 4, 5] },
    { date: "2026-03-27", dateDisplay: "27 марта", grades: [4, 5, 5, 5] },
  ],
};

const gradeHistoryDetail: Record<string, Record<string, GradeDayDetail>> = {
  nika: {
    "2026-03-05": {
      date: "2026-03-05",
      dateDisplay: "5 марта",
      items: [
        { subject: "Математика", activity: "Тест", grade: 5 },
        { subject: "Русский язык", activity: "Диктант", grade: 4 },
        { subject: "Литературное чтение", activity: "Работа на уроке", grade: 5 },
      ],
    },
    "2026-03-11": {
      date: "2026-03-11",
      dateDisplay: "11 марта",
      items: [
        {
          subject: "Русский язык",
          activity: "Работа на уроке (Работа на уроке)",
          grade: 5,
        },
        {
          subject: "Математика",
          activity: "Работа на уроке (Работа на уроке)",
          grade: 4,
        },
        {
          subject: "Литературное чтение",
          activity: "Работа на уроке (Работа на уроке)",
          grade: 4,
        },
        {
          subject: "Окружающий мир",
          activity: "Работа на уроке (Работа на уроке)",
          grade: 4,
        },
      ],
    },
    "2026-03-17": {
      date: "2026-03-17",
      dateDisplay: "17 марта",
      items: [
        { subject: "Математика", activity: "Самостоятельная работа", grade: 3 },
        { subject: "Музыка", activity: "Работа на уроке", grade: 5 },
        { subject: "Физическая культура", activity: "Работа на уроке", grade: 4 },
      ],
    },
    "2026-03-27": {
      date: "2026-03-27",
      dateDisplay: "27 марта",
      items: [
        { subject: "Литературное чтение", activity: "Контрольная работа", grade: 4 },
        { subject: "Математика", activity: "Работа на уроке", grade: 5 },
        { subject: "Окружающий мир", activity: "Работа на уроке", grade: 4 },
      ],
    },
    "2026-03-12": {
      date: "2026-03-12",
      dateDisplay: "12 марта",
      items: [
        { subject: "Русский язык", activity: "Работа на уроке", grade: 4 },
        { subject: "Математика", activity: "Работа на уроке", grade: 4 },
      ],
    },
    "2026-03-24": {
      date: "2026-03-24",
      dateDisplay: "24 марта",
      items: [
        { subject: "Математика", activity: "Самостоятельная работа", grade: 5 },
        { subject: "Русский язык", activity: "Работа на уроке", grade: 4 },
        { subject: "Изобразительное искусство", activity: "Практическая работа", grade: 5 },
        { subject: "Иностранный (английский) язык", activity: "Тест", grade: 5 },
        { subject: "Труд (технология)", activity: "Работа на уроке", grade: 4 },
      ],
    },
    "2026-03-25": {
      date: "2026-03-25",
      dateDisplay: "25 марта",
      items: [
        { subject: "Литературное чтение", activity: "Работа на уроке", grade: 4 },
        { subject: "Математика", activity: "Контрольная работа", grade: 3 },
        { subject: "Окружающий мир", activity: "Работа на уроке", grade: 5 },
        { subject: "Музыка", activity: "Работа на уроке", grade: 5 },
        { subject: "Физическая культура", activity: "Работа на уроке", grade: 5 },
      ],
    },
  },
  efrem: {
    "2026-03-10": {
      date: "2026-03-10",
      dateDisplay: "10 марта",
      items: [
        { subject: "Алгебра", activity: "Самостоятельная работа", grade: 4 },
        { subject: "Физика", activity: "Лабораторная работа", grade: 5 },
        { subject: "Геометрия", activity: "Работа на уроке", grade: 5 },
        { subject: "История", activity: "Работа на уроке", grade: 4 },
      ],
    },
    "2026-03-18": {
      date: "2026-03-18",
      dateDisplay: "18 марта",
      items: [
        { subject: "Литература", activity: "Сочинение", grade: 5 },
        { subject: "Русский язык", activity: "Изложение", grade: 4 },
      ],
    },
    "2026-03-20": {
      date: "2026-03-20",
      dateDisplay: "20 марта",
      items: [
        { subject: "Алгебра", activity: "Контрольная работа", grade: 5 },
        { subject: "История", activity: "Работа на уроке", grade: 4 },
      ],
    },
    "2026-03-24": {
      date: "2026-03-24",
      dateDisplay: "24 марта",
      items: [
        { subject: "Русский язык", activity: "Работа на уроке", grade: 4 },
        { subject: "Физика", activity: "Работа на уроке", grade: 5 },
        { subject: "Геометрия", activity: "Самостоятельная работа", grade: 5 },
        { subject: "История", activity: "Работа на уроке", grade: 4 },
        { subject: "Иностранный (английский) язык", activity: "Работа на уроке", grade: 5 },
      ],
    },
    "2026-03-25": {
      date: "2026-03-25",
      dateDisplay: "25 марта",
      items: [
        { subject: "Алгебра", activity: "Работа на уроке", grade: 4 },
        { subject: "Литература", activity: "Работа на уроке", grade: 5 },
        { subject: "Информатика", activity: "Практическая работа", grade: 5 },
        { subject: "Физическая культура", activity: "Работа на уроке", grade: 5 },
      ],
    },
    "2026-03-26": {
      date: "2026-03-26",
      dateDisplay: "26 марта",
      items: [
        { subject: "Геометрия", activity: "Самостоятельная работа", grade: 4 },
        { subject: "Биология", activity: "Работа на уроке", grade: 5 },
        { subject: "География", activity: "Работа на уроке", grade: 4 },
        { subject: "Обществознание", activity: "Работа на уроке", grade: 5 },
      ],
    },
    "2026-03-27": {
      date: "2026-03-27",
      dateDisplay: "27 марта",
      items: [
        { subject: "Алгебра", activity: "Работа на уроке", grade: 4 },
        { subject: "Физика", activity: "Работа на уроке", grade: 5 },
        { subject: "Иностранный (английский) язык", activity: "Работа на уроке", grade: 5 },
        { subject: "История", activity: "Работа на уроке", grade: 5 },
      ],
    },
  },
};

const finalsByChild: Record<string, FinalsPayload> = {
  nika: {
    yearLabel: "2025/2026",
    rows: [
      { subject: "Изобразительное искусство", t1: 4, t2: 5, t3: null, year: null },
      { subject: "Иностранный (английский) язык", t1: 5, t2: 5, t3: null, year: null },
      { subject: "Литературное чтение", t1: 5, t2: 4, t3: null, year: null },
      { subject: "Математика", t1: 4, t2: 4, t3: null, year: null },
      { subject: "Музыка", t1: 5, t2: 4, t3: null, year: null },
      { subject: "Окружающий мир", t1: 5, t2: 4, t3: null, year: null },
      { subject: "Русский язык", t1: 4, t2: 4, t3: null, year: null },
      { subject: "Труд (технология)", t1: 4, t2: 5, t3: null, year: null },
      { subject: "Физическая культура", t1: 5, t2: 5, t3: null, year: null },
    ],
  },
  efrem: {
    yearLabel: "2025/2026",
    rows: [
      { subject: "Алгебра", t1: 4, t2: 4, t3: null, year: null },
      { subject: "Геометрия", t1: 5, t2: 4, t3: null, year: null },
      { subject: "Русский язык", t1: 4, t2: 5, t3: null, year: null },
      { subject: "История", t1: 5, t2: 5, t3: null, year: null },
      { subject: "Физика", t1: 5, t2: 4, t3: null, year: null },
      { subject: "Литература", t1: 5, t2: 5, t3: null, year: null },
      { subject: "Иностранный (английский) язык", t1: 5, t2: 5, t3: null, year: null },
      { subject: "Информатика", t1: 5, t2: 5, t3: null, year: null },
      { subject: "Биология", t1: 4, t2: 5, t3: null, year: null },
      { subject: "География", t1: 4, t2: 4, t3: null, year: null },
      { subject: "Обществознание", t1: 5, t2: 4, t3: null, year: null },
    ],
  },
};

export function getChildren(): Child[] {
  return children;
}

export function getDiary(childId: string, isoDate: string): DiaryDay | null {
  const ch = children.find((c) => c.id === childId);
  if (ch?.classScheduleId) {
    return memGetClassDiary(ch.classScheduleId, isoDate);
  }
  const byDate = diaryByChild[childId];
  if (!byDate) return null;
  return byDate[isoDate] ?? null;
}

export function getDiaryDates(childId: string): string[] {
  const ch = children.find((c) => c.id === childId);
  if (ch?.classScheduleId) {
    return memGetClassDiaryDates(ch.classScheduleId);
  }
  const byDate = diaryByChild[childId];
  if (!byDate) return [];
  return Object.keys(byDate).sort();
}

export function getPerformance(childId: string): PerformancePayload | null {
  return performanceByChild[childId] ?? null;
}

export function getGradeHistorySummary(childId: string): GradeDaySummary[] {
  return gradeHistorySummary[childId] ?? [];
}

export function getGradeHistoryDetail(
  childId: string,
  isoDate: string
): GradeDayDetail | null {
  return gradeHistoryDetail[childId]?.[isoDate] ?? null;
}

/** История оценок по предмету (для экрана «Успеваемость» → предмет) */
const gradeHistoryBySubject: Record<string, Record<string, GradeDaySummary[]>> = {
  nika: {
    math: [
      { date: "2026-03-05", dateDisplay: "5 марта", grades: [5] },
      { date: "2026-03-11", dateDisplay: "11 марта", grades: [4] },
      { date: "2026-03-17", dateDisplay: "17 марта", grades: [3] },
      { date: "2026-03-24", dateDisplay: "24 марта", grades: [5] },
      { date: "2026-03-25", dateDisplay: "25 марта", grades: [3] },
      { date: "2026-03-27", dateDisplay: "27 марта", grades: [5] },
    ],
    reading: [
      { date: "2026-03-11", dateDisplay: "11 марта", grades: [4] },
      { date: "2026-03-25", dateDisplay: "25 марта", grades: [4] },
      { date: "2026-03-27", dateDisplay: "27 марта", grades: [4] },
    ],
    russian: [
      { date: "2026-03-05", dateDisplay: "5 марта", grades: [4] },
      { date: "2026-03-11", dateDisplay: "11 марта", grades: [5] },
      { date: "2026-03-12", dateDisplay: "12 марта", grades: [4] },
      { date: "2026-03-24", dateDisplay: "24 марта", grades: [4] },
    ],
    english: [
      { date: "2026-03-24", dateDisplay: "24 марта", grades: [5] },
      { date: "2026-03-26", dateDisplay: "26 марта", grades: [5] },
    ],
  },
  efrem: {
    algebra: [
      { date: "2026-03-10", dateDisplay: "10 марта", grades: [4] },
      { date: "2026-03-20", dateDisplay: "20 марта", grades: [5] },
      { date: "2026-03-25", dateDisplay: "25 марта", grades: [4] },
      { date: "2026-03-27", dateDisplay: "27 марта", grades: [4] },
    ],
    geometry: [
      { date: "2026-03-10", dateDisplay: "10 марта", grades: [5] },
      { date: "2026-03-24", dateDisplay: "24 марта", grades: [5] },
      { date: "2026-03-26", dateDisplay: "26 марта", grades: [4] },
    ],
    physics: [
      { date: "2026-03-10", dateDisplay: "10 марта", grades: [5] },
      { date: "2026-03-24", dateDisplay: "24 марта", grades: [5] },
      { date: "2026-03-27", dateDisplay: "27 марта", grades: [5] },
    ],
    literature: [
      { date: "2026-03-18", dateDisplay: "18 марта", grades: [5] },
      { date: "2026-03-25", dateDisplay: "25 марта", grades: [5] },
    ],
    history: [
      { date: "2026-03-10", dateDisplay: "10 марта", grades: [4] },
      { date: "2026-03-20", dateDisplay: "20 марта", grades: [4] },
      { date: "2026-03-24", dateDisplay: "24 марта", grades: [4] },
      { date: "2026-03-27", dateDisplay: "27 марта", grades: [5] },
    ],
  },
};

export function getGradeHistoryForSubject(
  childId: string,
  subjectId: string
): GradeDaySummary[] {
  if (subjectId === "all") return getGradeHistorySummary(childId);
  return gradeHistoryBySubject[childId]?.[subjectId] ?? [];
}

export function getFinals(childId: string): FinalsPayload | null {
  return finalsByChild[childId] ?? null;
}

export function getMeetingForChild(childId: string): ClassMeetingAnnouncement | null {
  const ch = children.find((c) => c.id === childId);
  if (!ch?.classScheduleId) return null;
  return memGetMeeting(ch.classScheduleId);
}

/** Снимок данных для загрузки в PostgreSQL (seed) */
export function getSeedSnapshot() {
  return {
    children,
    diaryByChild,
    performanceByChild,
    gradeHistorySummary,
    gradeHistoryDetail,
    finalsByChild,
    gradeHistoryBySubject,
  };
}
