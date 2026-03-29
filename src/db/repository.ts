import type {
  Child,
  DiaryDay,
  FinalsPayload,
  GradeDayDetail,
  GradeDaySummary,
  PerformancePayload,
  PerformanceRow,
} from "../types";
import { rowToLesson } from "./lessonRow";
import { getPool } from "./pool";
import { getClassDiary, getClassDiaryDates } from "./teacherRepository";

export async function getChildren(): Promise<Child[]> {
  const { rows } = await getPool().query<{
    id: string;
    name: string;
    class_label: string;
    class_schedule_id: string | null;
  }>(
    `SELECT id, name, class_label, class_schedule_id FROM students ORDER BY id`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    classLabel: r.class_label,
    ...(r.class_schedule_id ? { classScheduleId: r.class_schedule_id } : {}),
  }));
}

export async function getDiary(childId: string, isoDate: string): Promise<DiaryDay | null> {
  const pool = getPool();
  const s = await pool.query<{ class_schedule_id: string | null }>(
    `SELECT class_schedule_id FROM students WHERE id = $1`,
    [childId]
  );
  if (s.rows.length === 0) return null;
  const scheduleId = s.rows[0].class_schedule_id;
  if (scheduleId) {
    return getClassDiary(scheduleId, isoDate);
  }
  const day = await pool.query<{
    date_iso: string;
    weekday: string;
    month_genitive: string;
    year: number;
  }>(
    `SELECT date_iso::text, weekday, month_genitive, year FROM diary_days
     WHERE child_id = $1 AND date_iso = $2::date`,
    [childId, isoDate]
  );
  if (day.rows.length === 0) return null;
  const d = day.rows[0];
  const lessons = await pool.query(
    `SELECT lesson_key, lesson_order, title, time_label, grade, teacher, topic, homework,
            control_work, place, homework_next, blocks_json
     FROM diary_lessons WHERE child_id = $1 AND date_iso = $2::date ORDER BY lesson_order`,
    [childId, isoDate]
  );
  return {
    date: String(d.date_iso).slice(0, 10),
    weekday: d.weekday,
    monthGenitive: d.month_genitive,
    year: d.year,
    lessons: lessons.rows.map((r) => rowToLesson(r as Record<string, unknown>)),
  };
}

export async function getDiaryDates(childId: string): Promise<string[]> {
  const pool = getPool();
  const s = await pool.query<{ class_schedule_id: string | null }>(
    `SELECT class_schedule_id FROM students WHERE id = $1`,
    [childId]
  );
  if (s.rows.length === 0) return [];
  const scheduleId = s.rows[0].class_schedule_id;
  if (scheduleId) {
    return getClassDiaryDates(scheduleId);
  }
  const { rows } = await getPool().query<{ d: string }>(
    `SELECT date_iso::text AS d FROM diary_days WHERE child_id = $1 ORDER BY date_iso`,
    [childId]
  );
  return rows.map((r) => r.d.slice(0, 10));
}

export async function getPerformance(childId: string): Promise<PerformancePayload | null> {
  const pool = getPool();
  const meta = await pool.query<{
    trimester_label: string;
    date_label: string;
    day_num: number;
    weekday: string;
    month_genitive: string;
    year: number;
  }>(`SELECT * FROM performance_meta WHERE child_id = $1`, [childId]);
  if (meta.rows.length === 0) return null;
  const m = meta.rows[0];
  const pr = await pool.query<{
    subject_id: string;
    subject_name: string;
    student_avg: string;
    class_avg: string;
    parallel_avg: string;
    sort_order: number;
  }>(
    `SELECT subject_id, subject_name, student_avg, class_avg, parallel_avg, sort_order
     FROM performance_rows WHERE child_id = $1 ORDER BY sort_order, subject_id`,
    [childId]
  );
  const rows: PerformanceRow[] = pr.rows.map((r) => ({
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    studentAvg: Number(r.student_avg),
    classAvg: Number(r.class_avg),
    parallelAvg: Number(r.parallel_avg),
  }));
  return {
    trimesterLabel: m.trimester_label,
    dateLabel: m.date_label,
    dayNum: m.day_num,
    weekday: m.weekday,
    monthGenitive: m.month_genitive,
    year: m.year,
    rows,
  };
}

export async function getGradeHistorySummary(childId: string): Promise<GradeDaySummary[]> {
  const { rows } = await getPool().query<{
    date_iso: string;
    date_display: string;
    grades_json: number[];
  }>(
    `SELECT date_iso::text, date_display, grades_json FROM grade_history_summary
     WHERE child_id = $1 ORDER BY date_iso`,
    [childId]
  );
  return rows.map((r) => ({
    date: String(r.date_iso).slice(0, 10),
    dateDisplay: r.date_display,
    grades: Array.isArray(r.grades_json) ? r.grades_json : [],
  }));
}

export async function getGradeHistoryDetail(
  childId: string,
  isoDate: string
): Promise<GradeDayDetail | null> {
  const { rows } = await getPool().query<{
    date_iso: string;
    date_display: string;
    items_json: GradeDayDetail["items"];
  }>(
    `SELECT date_iso::text, date_display, items_json FROM grade_history_detail
     WHERE child_id = $1 AND date_iso = $2::date`,
    [childId, isoDate]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    date: String(r.date_iso).slice(0, 10),
    dateDisplay: r.date_display,
    items: Array.isArray(r.items_json) ? r.items_json : [],
  };
}

export async function getGradeHistoryForSubject(
  childId: string,
  subjectId: string
): Promise<GradeDaySummary[]> {
  if (subjectId === "all") {
    return getGradeHistorySummary(childId);
  }
  const { rows } = await getPool().query<{
    date_iso: string;
    date_display: string;
    grades_json: number[];
  }>(
    `SELECT date_iso::text, date_display, grades_json FROM grade_history_by_subject
     WHERE child_id = $1 AND subject_id = $2 ORDER BY date_iso`,
    [childId, subjectId]
  );
  return rows.map((r) => ({
    date: String(r.date_iso).slice(0, 10),
    dateDisplay: r.date_display,
    grades: Array.isArray(r.grades_json) ? r.grades_json : [],
  }));
}

export async function getFinals(childId: string): Promise<FinalsPayload | null> {
  const pool = getPool();
  const meta = await pool.query<{ finals_year_label: string }>(
    `SELECT finals_year_label FROM performance_meta WHERE child_id = $1`,
    [childId]
  );
  if (meta.rows.length === 0) return null;
  const yearLabel = meta.rows[0].finals_year_label;
  const { rows } = await pool.query<{
    subject: string;
    t1: string | null;
    t2: string | null;
    t3: string | null;
    year_grade: string | null;
    sort_order: number;
  }>(
    `SELECT subject, t1, t2, t3, year_grade, sort_order FROM finals
     WHERE child_id = $1 ORDER BY sort_order, subject`,
    [childId]
  );
  return {
    yearLabel,
    rows: rows.map((r) => ({
      subject: r.subject,
      t1: r.t1 === null ? null : Number(r.t1),
      t2: r.t2 === null ? null : Number(r.t2),
      t3: r.t3 === null ? null : Number(r.t3),
      year: r.year_grade === null ? null : Number(r.year_grade),
    })),
  };
}
