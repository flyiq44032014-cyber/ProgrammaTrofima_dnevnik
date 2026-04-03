/**
 * Строит витрины performance_meta / performance_rows / finals / grade_history*
 * из оценок классового дневника (class_diary_lessons) для ученика с class_schedule_id.
 * Используется для учеников, у которых нет персонального сида (не isDemoChild в seedSimple).
 */
import type { Pool } from "pg";
import { computeQuarterFinalsFromDatedGrades } from "./finalsFromGrades";

const SUBJECTS = [
  { id: "lit", name: "Литература" },
  { id: "eng", name: "Иностранный язык" },
  { id: "hist", name: "История" },
  { id: "social", name: "Обществознание" },
  { id: "geo", name: "География" },
  { id: "math", name: "Математика" },
  { id: "info", name: "Информатика" },
  { id: "phys", name: "Физика" },
  { id: "bio", name: "Биология" },
  { id: "chem", name: "Химия" },
  { id: "art", name: "Изобразительное искусство" },
  { id: "music", name: "Музыка" },
  { id: "work", name: "Труд (технология)" },
  { id: "pe", name: "Физическая культура" },
] as const;

type SubjectId = (typeof SUBJECTS)[number]["id"];
const KNOWN_SUBJECT_IDS = new Set<string>(SUBJECTS.map((s) => s.id));

const MONTH_GENITIVE: Record<string, string> = {
  "01": "января",
  "02": "февраля",
  "03": "марта",
  "04": "апреля",
  "05": "мая",
  "06": "июня",
  "07": "июля",
  "08": "августа",
  "09": "сентября",
  "10": "октября",
  "11": "ноября",
  "12": "декабря",
};

function dateDisplayRuFromIso(iso: string): string {
  const mm = String(iso).slice(5, 7);
  const d = Number(String(iso).slice(8, 10));
  const mg = MONTH_GENITIVE[mm];
  if (mg && Number.isFinite(d)) return `${d} ${mg}`;
  return iso;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function parseSubject(lessonKey: string, title: string): { id: SubjectId; name: string } {
  const first = String(lessonKey || "")
    .split("-")[0]
    ?.toLowerCase()
    .trim();
  if (first && KNOWN_SUBJECT_IDS.has(first)) {
    return { id: first as SubjectId, name: title };
  }
  const byTitle = SUBJECTS.find((s) => s.name === title);
  if (byTitle) return { id: byTitle.id, name: byTitle.name };
  return { id: "lit", name: title };
}

type LessonAgg = {
  subjectId: SubjectId;
  subjectName: string;
  dateIso: string;
  grade: number | null;
};

function buildPerformanceFromLessons(lessons: LessonAgg[]): {
  rows: { subjectId: string; subjectName: string; avg: number }[];
  byDate: Map<string, { subject: string; grade: number }[]>;
  bySubjectByDate: Map<string, Map<string, number[]>>;
} {
  const gradesBySubject = new Map<string, { subjectName: string; grades: number[] }>();
  const byDate = new Map<string, { subject: string; grade: number }[]>();
  const bySubjectByDate = new Map<string, Map<string, number[]>>();
  for (const l of lessons) {
    if (l.grade === null) continue;
    const g = gradesBySubject.get(l.subjectId) ?? { subjectName: l.subjectName, grades: [] };
    g.grades.push(l.grade);
    gradesBySubject.set(l.subjectId, g);
    const d = byDate.get(l.dateIso) ?? [];
    d.push({ subject: l.subjectName, grade: l.grade });
    byDate.set(l.dateIso, d);
    const subjMap = bySubjectByDate.get(l.subjectId) ?? new Map<string, number[]>();
    const dateGrades = subjMap.get(l.dateIso) ?? [];
    dateGrades.push(l.grade);
    subjMap.set(l.dateIso, dateGrades);
    bySubjectByDate.set(l.subjectId, subjMap);
  }
  const rows = [...gradesBySubject.entries()].map(([subjectId, data]) => ({
    subjectId,
    subjectName: data.subjectName,
    avg: Number((data.grades.reduce((a, b) => a + b, 0) / Math.max(1, data.grades.length)).toFixed(2)),
  }));
  return { rows, byDate, bySubjectByDate };
}

/**
 * Заполняет таблицы успеваемости для одного ученика. Пропускает, если уже есть performance_meta.
 * @returns true если данные вставлены
 */
export async function fillPerformanceFromClassDiary(
  pool: Pool,
  studentId: string,
  classScheduleId: string
): Promise<boolean> {
  const has = await pool.query(`SELECT 1 FROM performance_meta WHERE child_id = $1`, [studentId]);
  if (has.rows.length > 0) return false;

  const { rows: lessonRows } = await pool.query<{
    date_iso: string;
    lesson_key: string;
    title: string;
    grade: string | null;
  }>(
    `SELECT date_iso::text AS date_iso, lesson_key, title, grade::text AS grade
     FROM class_diary_lessons
     WHERE class_id = $1
     ORDER BY date_iso, lesson_order`,
    [classScheduleId]
  );
  if (lessonRows.length === 0) return false;

  const allLessons: LessonAgg[] = lessonRows.map((row) => {
    const { id: subjectId, name: subjectName } = parseSubject(row.lesson_key, row.title);
    const base = row.grade == null || row.grade === "" ? null : Number(row.grade);
    let grade = base;
    if (grade != null && Number.isFinite(grade)) {
      const delta = hashStr(`${studentId}-${row.date_iso}-${row.lesson_key}`) % 3;
      grade = Math.max(2, Math.min(5, Math.round(grade + delta - 1)));
    } else {
      grade = null;
    }
    return {
      subjectId,
      subjectName,
      dateIso: String(row.date_iso).slice(0, 10),
      grade,
    };
  });

  const perf = buildPerformanceFromLessons(allLessons);
  if (perf.rows.length === 0) {
    await pool.query(
      `INSERT INTO performance_meta (child_id, quarter_label, date_label, day_num, weekday, month_genitive, year, finals_year_label)
       VALUES ($1, '4 четверть', '31 марта', 31, 'вторник', 'марта', 2026, '2025/2026')`,
      [studentId]
    );
    return true;
  }

  await pool.query(
    `INSERT INTO performance_meta (child_id, quarter_label, date_label, day_num, weekday, month_genitive, year, finals_year_label)
     VALUES ($1, '4 четверть', '31 марта', 31, 'вторник', 'марта', 2026, '2025/2026')`,
    [studentId]
  );

  let sortOrder = 0;
  for (const row of perf.rows.sort((a, b) => a.subjectName.localeCompare(b.subjectName, "ru"))) {
    const dated = allLessons
      .filter((l) => l.subjectId === row.subjectId && l.grade != null)
      .map((l) => ({ dateIso: l.dateIso, grade: l.grade as number }));
    const fin = computeQuarterFinalsFromDatedGrades(dated, studentId, row.subjectId);
    await pool.query(
      `INSERT INTO performance_rows (child_id, subject_id, subject_name, student_avg, class_avg, parallel_avg, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [studentId, row.subjectId, row.subjectName, row.avg, row.avg, row.avg, sortOrder]
    );
    await pool.query(
      `INSERT INTO finals (child_id, subject, t1, t2, t3, t4, year_grade, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [studentId, row.subjectName, fin.t1, fin.t2, fin.t3, fin.t4, fin.year, sortOrder]
    );
    sortOrder += 1;
  }

  for (const [iso, items] of perf.byDate.entries()) {
    const dateDisplay = dateDisplayRuFromIso(iso);
    await pool.query(
      `INSERT INTO grade_history_summary (child_id, date_iso, date_display, grades_json)
       VALUES ($1, $2::date, $3, $4::jsonb)`,
      [studentId, iso, dateDisplay, JSON.stringify(items.map((x) => x.grade))]
    );
    await pool.query(
      `INSERT INTO grade_history_detail (child_id, date_iso, items_json)
       VALUES ($1, $2::date, $3::jsonb)`,
      [
        studentId,
        iso,
        JSON.stringify(items.map((x) => ({ subject: x.subject, activity: "Урок", grade: x.grade }))),
      ]
    );
  }

  for (const [subjectId, byDate] of perf.bySubjectByDate.entries()) {
    for (const [iso, grades] of byDate.entries()) {
      const dateDisplay = dateDisplayRuFromIso(iso);
      await pool.query(
        `INSERT INTO grade_history_by_subject (child_id, subject_id, date_iso, date_display, grades_json)
         VALUES ($1, $2, $3::date, $4, $5::jsonb)`,
        [studentId, subjectId, iso, dateDisplay, JSON.stringify(grades)]
      );
    }
  }

  return true;
}
