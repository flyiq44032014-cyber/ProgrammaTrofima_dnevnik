import type { DiaryDay } from "../types";
import { TEACHER_PROFILE } from "../data/teacherSeedData";
import { rowToLesson } from "./lessonRow";
import { getPool } from "./pool";

export { TEACHER_PROFILE };

/** Четверть, с которой согласован `seedSimple` (таблица `director_quarter_schedule` + мартовские дневники). */
export const SEED_SIMPLE_QUARTER = 4;

export type SchoolClassRow = {
  id: string;
  grade: number;
  label: string;
  subjectName: string;
};

export async function listSchoolClasses(): Promise<SchoolClassRow[]> {
  const { rows } = await getPool().query<{
    id: string;
    grade: number;
    label: string;
    subject_name: string;
  }>(`SELECT id, grade, label, subject_name FROM school_classes ORDER BY grade`);
  return rows.map((r) => ({
    id: r.id,
    grade: r.grade,
    label: r.label,
    subjectName: r.subject_name,
  }));
}

/** Классы, где учитель указан в расписании директора (та же модель, что вкладка «Расписание»). */
export async function listSchoolClassesForTeacher(
  teacherUserId: number,
  quarter: number
): Promise<SchoolClassRow[]> {
  const { rows } = await getPool().query<{
    id: string;
    grade: number;
    label: string;
    subject_name: string;
  }>(
    `SELECT DISTINCT sc.id, sc.grade, sc.label, sc.subject_name
     FROM school_classes sc
     INNER JOIN director_quarter_schedule d ON d.class_id = sc.id
     WHERE d.quarter = $1 AND d.teacher_user_id = $2
     ORDER BY sc.grade, sc.label`,
    [quarter, teacherUserId]
  );
  return rows.map((r) => ({
    id: r.id,
    grade: r.grade,
    label: r.label,
    subjectName: r.subject_name,
  }));
}

export async function getClassRoster(classId: string): Promise<string[]> {
  const { rows } = await getPool().query<{ full_name: string }>(
    `SELECT full_name FROM class_roster WHERE class_id = $1 ORDER BY sort_order, id`,
    [classId]
  );
  return rows.map((r) => r.full_name);
}

export async function getClassDiary(
  classId: string,
  isoDate: string
): Promise<DiaryDay | null> {
  const pool = getPool();
  const day = await pool.query<{
    date_iso: string;
    weekday: string;
    month_genitive: string;
    year: number;
  }>(
    `SELECT date_iso::text, weekday, month_genitive, year FROM class_diary_days
     WHERE class_id = $1 AND date_iso = $2::date`,
    [classId, isoDate]
  );
  if (day.rows.length === 0) return null;
  const d = day.rows[0];
  const lessons = await pool.query(
    `SELECT lesson_key, lesson_order, title, time_label, grade, teacher, topic, homework,
            control_work, place, homework_next, blocks_json
     FROM class_diary_lessons WHERE class_id = $1 AND date_iso = $2::date ORDER BY lesson_order`,
    [classId, isoDate]
  );
  return {
    date: String(d.date_iso).slice(0, 10),
    weekday: d.weekday,
    monthGenitive: d.month_genitive,
    year: d.year,
    lessons: lessons.rows.map((r) => rowToLesson(r as Record<string, unknown>)),
  };
}

export async function getClassDiaryDates(classId: string): Promise<string[]> {
  const { rows } = await getPool().query<{ d: string }>(
    `SELECT date_iso::text AS d FROM class_diary_days WHERE class_id = $1 ORDER BY date_iso`,
    [classId]
  );
  return rows.map((r) => r.d.slice(0, 10));
}

export interface LessonPatch {
  title?: string;
  timeLabel?: string;
  teacher?: string | null;
  topic?: string | null;
  homework?: string | null;
  controlWork?: string | null;
  place?: string | null;
  homeworkNext?: string | null;
  grade?: number | null;
}

export async function updateClassLesson(
  classId: string,
  isoDate: string,
  lessonKey: string,
  patch: LessonPatch
): Promise<boolean> {
  const pool = getPool();
  const fields: string[] = [];
  const vals: unknown[] = [];
  let n = 1;
  const map: [keyof LessonPatch, string][] = [
    ["title", "title"],
    ["timeLabel", "time_label"],
    ["teacher", "teacher"],
    ["topic", "topic"],
    ["homework", "homework"],
    ["controlWork", "control_work"],
    ["place", "place"],
    ["homeworkNext", "homework_next"],
    ["grade", "grade"],
  ];
  for (const [k, col] of map) {
    if (patch[k] !== undefined) {
      fields.push(`${col} = $${n}`);
      vals.push(patch[k]);
      n++;
    }
  }
  if (fields.length === 0) return true;
  const w1 = n;
  const w2 = n + 1;
  const w3 = n + 2;
  vals.push(classId, isoDate, lessonKey);
  const q = `UPDATE class_diary_lessons SET ${fields.join(
    ", "
  )} WHERE class_id = $${w1} AND date_iso = $${w2}::date AND lesson_key = $${w3}`;
  const r = await pool.query(q, vals);
  return (r.rowCount ?? 0) > 0;
}
