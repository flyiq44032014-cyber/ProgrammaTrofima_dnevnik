import "dotenv/config";
import { closePool, getPool } from "./pool";
import { fillPerformanceFromClassDiary } from "./fillPerformanceFromClassDiary";

/**
 * Заполняет performance_* / finals / grade_history* из class_diary_lessons
 * для учеников с class_schedule_id, у которых ещё нет performance_meta.
 */
async function main(): Promise<void> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; class_schedule_id: string | null }>(
    `SELECT s.id, s.class_schedule_id
     FROM students s
     LEFT JOIN performance_meta pm ON pm.child_id = s.id
     WHERE s.class_schedule_id IS NOT NULL
       AND pm.child_id IS NULL`
  );

  let filled = 0;
  let unchanged = 0;
  for (const r of rows) {
    const classId = r.class_schedule_id;
    if (!classId) {
      unchanged += 1;
      continue;
    }
    const didFill = await fillPerformanceFromClassDiary(pool, r.id, classId);
    if (didFill) filled += 1;
    else unchanged += 1;
  }

  console.log(
    `[backfillStudentPerformanceFromClass] candidates=${rows.length}, filledOrTouchedMeta=${filled}, skippedNoDiaryOrEmpty=${unchanged}`
  );
  await closePool();
}

main().catch(async (e) => {
  console.error("[backfillStudentPerformanceFromClass] error", e);
  await closePool();
  process.exit(1);
});
