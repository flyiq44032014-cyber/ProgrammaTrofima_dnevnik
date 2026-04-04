/**
 * Детерминированные оценки за урок: только 2–6 учеников из присутствующих (кроме краевых случаев).
 * Используется в GET /api/teacher/.../chemistry-day и в офлайн-seed teacherMemory.
 */
export function hashTeacherChemString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

export type ChemistryDayStudentRow = {
  studentKey: string;
  name: string;
  lessonGrade: number | null;
  absent: boolean;
};

export function buildChemistryDayStudentRows(opts: {
  classId: string;
  isoDate: string;
  lessonSlotKey: string;
  subjectTitle: string;
  baseGrade: number;
  roster: string[];
}): ChemistryDayStudentRow[] {
  const { classId, isoDate, lessonSlotKey, subjectTitle, baseGrade, roster } = opts;
  const lessonSeed = `${classId}|${isoDate}|${lessonSlotKey}|${subjectTitle}`;
  const hK = hashTeacherChemString(`${lessonSeed}|pickK`);

  const rows = roster.map((fullName) => {
    const hA = hashTeacherChemString(`${classId}|${isoDate}|${lessonSlotKey}|${fullName}`);
    const absent = hA % 10 === 0;
    return { fullName, absent };
  });

  const present = rows.filter((r) => !r.absent).map((r) => r.fullName);
  let k: number;
  if (present.length === 0) k = 0;
  else if (present.length === 1) k = 1;
  else k = Math.min(present.length, 2 + (hK % 5));

  const sortedPresent = [...present].sort(
    (a, b) =>
      hashTeacherChemString(`${lessonSeed}|${a}`) - hashTeacherChemString(`${lessonSeed}|${b}`)
  );
  const graded = new Set(sortedPresent.slice(0, k));

  return rows.map(({ fullName, absent }) => {
    let lessonGrade: number | null = null;
    if (!absent && graded.has(fullName)) {
      const hg = hashTeacherChemString(`${classId}|${isoDate}|${lessonSlotKey}|${fullName}`);
      const delta = (hg % 3) - 1;
      lessonGrade = Math.max(2, Math.min(5, baseGrade + delta));
    }
    return {
      studentKey: fullName,
      name: fullName,
      lessonGrade,
      absent,
    };
  });
}
