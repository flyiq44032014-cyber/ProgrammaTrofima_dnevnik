import type { DiaryDay } from "../types";
import type { LessonPatch } from "../db/teacherRepository";
import { buildChemistryDayStudentRows } from "../lib/chemistryDayStudents";
import {
  TEACHER_PROFILE,
  buildClassDiaries,
  buildRosters,
  schoolClassesMeta,
  TEACHER_WEEK_ISOS,
  CHEMISTRY_LESSON_TITLE,
  DEMO_TEACHER_SUBJECTS,
  TEACHER_PRIMARY_LESSON_TITLE,
} from "./teacherSeedData";

export type ChemStudentDay = {
  lessonGrade: 2 | 3 | 4 | 5 | null;
  absent: boolean;
};

export type ClassMeeting = { date: string; time: string; topic: string };

const rosters: Record<string, string[]> = buildRosters();
let diaries: Record<string, Record<string, DiaryDay>> = buildClassDiaries();

/** classId → isoDate → studentKey → состояние */
let chemByClassDate: Record<string, Record<string, Record<string, ChemStudentDay>>> = {};

let meetingByClass: Record<string, ClassMeeting> = {};

/** classId → studentKey → [средние за 1–4 четверть, сырое число] */
let quarterAvgsByClass: Record<string, Record<string, [number, number, number, number]>> =
  {};

function rngFor(classId: string, isoDate: string, salt: string): () => number {
  let h = 0;
  const s = `${classId}|${isoDate}|${salt}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
}

function seedChemAndQuarters(): void {
  chemByClassDate = {};
  quarterAvgsByClass = {};
  meetingByClass = {};

  for (const c of schoolClassesMeta) {
    const roster = rosters[c.id] ?? [];
    chemByClassDate[c.id] = {};
    quarterAvgsByClass[c.id] = {};

    for (const iso of TEACHER_WEEK_ISOS) {
      const day = diaries[c.id]?.[iso];
      const chemLes = day?.lessons.find((l) => l.title === CHEMISTRY_LESSON_TITLE);
      const lessonSlotKey = chemLes ? String(chemLes.id || chemLes.order) : "0";
      const baseGradeRaw =
        chemLes && typeof chemLes.grade === "number" ? Number(chemLes.grade) : 4;
      const baseGrade = Number.isFinite(baseGradeRaw) ? baseGradeRaw : 4;
      const built = buildChemistryDayStudentRows({
        classId: c.id,
        isoDate: iso,
        lessonSlotKey,
        subjectTitle: CHEMISTRY_LESSON_TITLE,
        baseGrade,
        roster,
      });
      chemByClassDate[c.id][iso] = {};
      built.forEach((row, i) => {
        chemByClassDate[c.id][iso][String(i)] = {
          lessonGrade: row.lessonGrade != null ? (row.lessonGrade as 2 | 3 | 4 | 5) : null,
          absent: row.absent,
        };
      });
    }

    roster.forEach((_, i) => {
      const rnd = rngFor(c.id, `s${i}`, "q");
      const q1 = 3 + rnd() * 1.8;
      const q2 = 3.1 + rnd() * 1.7;
      const q3 = 3.5 + rnd() * 1.2;
      const q4 = 3.6 + rnd() * 1.1;
      quarterAvgsByClass[c.id][String(i)] = [q1, q2, q3, q4];
    });
  }
}

seedChemAndQuarters();

export function resetTeacherMemory(): void {
  diaries = buildClassDiaries();
  seedChemAndQuarters();
}

export function memTeacherProfile() {
  return {
    ...TEACHER_PROFILE,
    subjects: [...DEMO_TEACHER_SUBJECTS],
  };
}

export function memListClasses() {
  return schoolClassesMeta;
}

export function memGetRoster(classId: string): string[] {
  return rosters[classId] ?? [];
}

export function memGetClassDiary(classId: string, isoDate: string): DiaryDay | null {
  return diaries[classId]?.[isoDate] ?? null;
}

export function memGetClassDiaryDates(classId: string): string[] {
  const d = diaries[classId];
  if (!d) return [];
  return Object.keys(d).sort();
}

export function memGetMeeting(classId: string): ClassMeeting | null {
  return meetingByClass[classId] ?? null;
}

export function memSetMeeting(classId: string, m: ClassMeeting): void {
  meetingByClass[classId] = m;
}

function chemLessonKeyFromDay(day: DiaryDay | null): string | null {
  if (!day) return null;
  const les = day.lessons.find((l) => l.title === CHEMISTRY_LESSON_TITLE);
  return les?.id ?? null;
}

function ensureChemSlot(classId: string, isoDate: string, rosterLen: number): void {
  chemByClassDate[classId] ??= {};
  chemByClassDate[classId][isoDate] ??= {};
  const slot = chemByClassDate[classId][isoDate];
  for (let i = 0; i < rosterLen; i++) {
    const key = String(i);
    if (!slot[key]) slot[key] = { lessonGrade: null, absent: false };
  }
}

export function memGetChemistryDay(
  classId: string,
  isoDate: string,
  roster: string[]
): {
  chemistryLessonKey: string | null;
  students: { studentKey: string; name: string; lessonGrade: 2 | 3 | 4 | 5 | null; absent: boolean }[];
} | null {
  const day = diaries[classId]?.[isoDate];
  if (!day) return null;
  ensureChemSlot(classId, isoDate, roster.length);
  const slot = chemByClassDate[classId][isoDate];
  const students = roster.map((name, i) => {
    const key = String(i);
    const st = slot[key] ?? { lessonGrade: null, absent: false };
    const absent = Boolean(st.absent);
    return {
      studentKey: key,
      name,
      lessonGrade: absent ? null : st.lessonGrade,
      absent,
    };
  });
  return {
    chemistryLessonKey: chemLessonKeyFromDay(day),
    students,
  };
}

export function memPatchChemStudent(
  classId: string,
  isoDate: string,
  studentKey: string,
  rosterLen: number,
  patch: { lessonGrade?: 2 | 3 | 4 | 5 | null; absent?: boolean }
): boolean {
  ensureChemSlot(classId, isoDate, rosterLen);
  const row = chemByClassDate[classId]?.[isoDate]?.[studentKey];
  if (!row) return false;
  if (patch.lessonGrade !== undefined) row.lessonGrade = patch.lessonGrade;
  if (patch.absent !== undefined) row.absent = patch.absent;
  if (row.absent) {
    row.lessonGrade = null;
  } else if (row.lessonGrade != null) {
    row.absent = false;
  }
  return true;
}

/** Текущая четверть учебного года (демо): 4 — идет четвертая */
export const DEMO_CURRENT_QUARTER = 4;

export function memGetQuarterTable(classId: string, rosterArg?: string[]): {
  currentQuarter: number;
  rows: { studentKey: string; name: string; cells: string[] }[];
} {
  const roster =
    rosterArg && rosterArg.length > 0 ? rosterArg : (rosters[classId] ?? []);
  quarterAvgsByClass[classId] ??= {};
  roster.forEach((_, i) => {
    const key = String(i);
    if (!quarterAvgsByClass[classId][key]) {
      const rnd = rngFor(classId, key, "qgen");
      quarterAvgsByClass[classId][key] = [
        3 + rnd() * 1.8,
        3.1 + rnd() * 1.7,
        3.5 + rnd() * 1.2,
        3.6 + rnd() * 1.1,
      ];
    }
  });
  const q = DEMO_CURRENT_QUARTER;
  const rows = roster.map((name, i) => {
    const key = String(i);
    const [a1, a2, a3, a4] = quarterAvgsByClass[classId][key] ?? [0, 0, 0, 0];
    const cells = [a1, a2, a3, a4].map((v, qi) => {
      const quarterNum = qi + 1;
      if (quarterNum > q) return "—";
      if (quarterNum < q) return String(Math.round(v));
      return v.toFixed(2);
    });
    return { studentKey: key, name, cells };
  });
  return { currentQuarter: q, rows };
}

const SUBJECT_NAMES = [
  "Химия",
  "Алгебра",
  "Геометрия",
  "Русский язык",
  "Литература",
  "История",
  "Биология",
  "Физика",
  "Иностранный язык",
];

export function memGetStudentStats(
  classId: string,
  studentKey: string,
  rosterArg?: string[]
): {
  studentName: string;
  chemistry: { average: number; grades: number[]; label: string };
  subjects: { name: string; average: number; gradesCount: number }[];
} | null {
  const roster =
    rosterArg && rosterArg.length > 0 ? rosterArg : (rosters[classId] ?? []);
  const idx = Number(studentKey);
  if (!Number.isInteger(idx) || idx < 0 || idx >= roster.length) return null;
  const rnd = rngFor(classId, studentKey, "stats");
  const chemistryGrades: number[] = [];
  for (let i = 0; i < 8; i++) chemistryGrades.push(2 + Math.floor(rnd() * 4));
  const chemAvg =
    chemistryGrades.reduce((s, g) => s + g, 0) / chemistryGrades.length;

  const subjects = SUBJECT_NAMES.map((name) => {
    const n = 5 + Math.floor(rnd() * 8);
    let s = 0;
    for (let i = 0; i < n; i++) s += 2 + Math.floor(rnd() * 4);
    return { name, average: s / n, gradesCount: n };
  }).sort((a, b) => b.average - a.average);

  return {
    studentName: roster[idx],
    chemistry: {
      average: chemAvg,
      grades: chemistryGrades,
      label: TEACHER_PRIMARY_LESSON_TITLE,
    },
    subjects,
  };
}

export function memUpdateLesson(
  classId: string,
  isoDate: string,
  lessonKey: string,
  patch: LessonPatch
): boolean {
  const day = diaries[classId]?.[isoDate];
  if (!day) return false;
  const les = day.lessons.find((l) => l.id === lessonKey);
  const allowed = new Set<string>([...DEMO_TEACHER_SUBJECTS]);
  if (!les || !allowed.has(les.title)) return false;
  if (patch.title !== undefined && !allowed.has(String(patch.title))) return false;
  if (patch.title !== undefined) les.title = patch.title;
  if (patch.timeLabel !== undefined) les.timeLabel = patch.timeLabel;
  if (patch.teacher !== undefined) les.teacher = patch.teacher ?? undefined;
  if (patch.topic !== undefined) les.topic = patch.topic ?? undefined;
  if (patch.homework !== undefined) les.homework = patch.homework ?? undefined;
  if (patch.controlWork !== undefined) les.controlWork = patch.controlWork;
  if (patch.place !== undefined) les.place = patch.place ?? undefined;
  if (patch.homeworkNext !== undefined) les.homeworkNext = patch.homeworkNext ?? undefined;
  if (patch.grade !== undefined) les.grade = patch.grade;
  return true;
}
