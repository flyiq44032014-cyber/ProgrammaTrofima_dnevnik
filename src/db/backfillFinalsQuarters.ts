import "dotenv/config";
import { closePool, getPool } from "./pool";
import { computeQuarterFinalsFromDatedGrades } from "./finalsFromGrades";

/**
 * Пересчитывает t1–t4 и year_grade в finals из grade_history_by_subject
 * (тот же алгоритм, что в fillPerformanceFromClassDiary / seedSimple).
 */
async function main(): Promise<void> {
  const pool = getPool();

  const { rows: finalsRows } = await pool.query<{
    child_id: string;
    subject: string;
    subject_id: string | null;
  }>(
    `SELECT f.child_id, f.subject, pr.subject_id
     FROM finals f
     LEFT JOIN performance_rows pr ON pr.child_id = f.child_id AND pr.subject_name = f.subject`
  );

  const { rows: histRows } = await pool.query<{
    child_id: string;
    subject_id: string;
    date_iso: string;
    grades_json: unknown;
  }>(
    `SELECT child_id, subject_id, date_iso::text AS date_iso, grades_json
     FROM grade_history_by_subject`
  );

  const histByKey = new Map<string, { dateIso: string; grade: number }[]>();
  for (const h of histRows) {
    const key = `${h.child_id}\u0000${h.subject_id}`;
    const arr = histByKey.get(key) ?? [];
    const raw = h.grades_json;
    let nums: number[] = [];
    if (Array.isArray(raw)) {
      nums = raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    } else if (raw != null && typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          nums = parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n));
        }
      } catch {
        /* ignore */
      }
    }
    const iso = String(h.date_iso).slice(0, 10);
    for (const grade of nums) {
      arr.push({ dateIso: iso, grade });
    }
    histByKey.set(key, arr);
  }

  let updated = 0;
  let skipped = 0;
  for (const fr of finalsRows) {
    if (!fr.subject_id) {
      skipped += 1;
      continue;
    }
    const key = `${fr.child_id}\u0000${fr.subject_id}`;
    const entries = histByKey.get(key) ?? [];
    const fin = computeQuarterFinalsFromDatedGrades(entries, fr.child_id, fr.subject_id);
    await pool.query(
      `UPDATE finals SET t1 = $1, t2 = $2, t3 = $3, t4 = $4, year_grade = $5
       WHERE child_id = $6 AND subject = $7`,
      [fin.t1, fin.t2, fin.t3, fin.t4, fin.year, fr.child_id, fr.subject]
    );
    updated += 1;
  }

  console.log(
    `[backfillFinalsQuarters] finalsRows=${finalsRows.length}, updated=${updated}, skippedNoSubjectId=${skipped}`
  );
  await closePool();
}

main().catch(async (e) => {
  console.error("[backfillFinalsQuarters] error", e);
  await closePool();
  process.exit(1);
});
