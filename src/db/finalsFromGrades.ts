/** Итоговые четвертные: 1–3 целые (детерминированный « rand »), 4-я — среднее по майским оценкам, годовая — среднее четырёх. */

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function round2Clamp(n: number): number {
  const x = Math.round(n * 100) / 100;
  return Math.max(2, Math.min(5, x));
}

function monthFromIso(iso: string): number {
  const m = Number(String(iso).slice(5, 7));
  return Number.isFinite(m) ? m : 0;
}

/**
 * Целая оценка 2..5, стабильная для пары ученик+предмет+номер четверти.
 * Два независимых хэша — чтобы 1/2/3 четверти не «липли» к одной цифре; доли смещены к 3 и 5.
 */
export function randomQuarterInt(studentId: string, subjectKey: string, q: 1 | 2 | 3): number {
  const h1 = hashStr(`\u0001Q${q}|${studentId}|${subjectKey}`);
  const h2 = hashStr(`${subjectKey}\t${q}\t${studentId}`);
  const mixed = (h1 ^ (h2 << 15 | h2 >>> 17)) >>> 0;
  const r = mixed % 100;
  if (r < 6) return 2;
  if (r < 38) return 3;
  if (r < 66) return 4;
  return 5;
}

/**
 * @param entries оценки с датой
 * @param subjectKey subject_id или имя — для стабильного «random» 1–3 четвертей
 *
 * 1–3 четверти: целые 2–5 (псевдослучайно). 4-я: среднее только по датам в **мае** (месяц 5),
 * с двумя знаками; если в мае нет оценок — fallback: среднее по всем имеющимся оценкам предмета.
 * Годовая: (t1+t2+t3+t4)/4, два знака.
 */
export function computeQuarterFinalsFromDatedGrades(
  entries: { dateIso: string; grade: number }[],
  studentId: string,
  subjectKey: string
): { t1: number; t2: number; t3: number; t4: number; year: number } {
  const sorted = [...entries]
    .filter((e) => Number.isFinite(e.grade))
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  const t1 = randomQuarterInt(studentId, subjectKey, 1);
  const t2 = randomQuarterInt(studentId, subjectKey, 2);
  const t3 = randomQuarterInt(studentId, subjectKey, 3);

  const mayGrades = sorted.filter((e) => monthFromIso(e.dateIso) === 5).map((e) => e.grade);

  let t4: number;
  if (mayGrades.length > 0) {
    t4 = round2Clamp(mayGrades.reduce((s, g) => s + g, 0) / mayGrades.length);
  } else if (sorted.length > 0) {
    const overall = sorted.reduce((s, e) => s + e.grade, 0) / sorted.length;
    t4 = round2Clamp(overall);
  } else {
    t4 = round2Clamp(3.5 + (((hashStr(`${studentId}|${subjectKey}|t4`) % 11) - 5) * 0.09));
  }

  const year = round2Clamp((t1 + t2 + t3 + t4) / 4);
  return { t1, t2, t3, t4, year };
}
