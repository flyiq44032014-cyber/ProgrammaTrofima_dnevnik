import "dotenv/config";
import { closePool, getPool } from "./pool";

/** Заполняет user_parent_children.student_id по ФИО+классу (для строк, созданных до появления колонки). */
async function main(): Promise<void> {
  const pool = getPool();
  await pool.query(
    `ALTER TABLE user_parent_children ADD COLUMN IF NOT EXISTS student_id TEXT REFERENCES students (id) ON DELETE CASCADE`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_user_parent_children_student ON user_parent_children (student_id)`
  );
  const { rowCount } = await pool.query(
    `UPDATE user_parent_children upc
     SET student_id = sub.sid
     FROM (
       SELECT DISTINCT ON (upc2.id) upc2.id AS upc_pk, s.id AS sid
       FROM user_parent_children upc2
       INNER JOIN students s ON (
         regexp_replace(upper(trim(upc2.class_label)), E'\\s+', '', 'g')
           = regexp_replace(upper(trim(s.class_label)), E'\\s+', '', 'g')
         AND (
           upper(
             regexp_replace(
               trim(concat_ws(' ', upc2.last_name, upc2.first_name, NULLIF(trim(upc2.patronymic), ''))),
               '[[:space:]]+',
               ' ',
               'g'
             )
           ) = upper(
             regexp_replace(
               trim(replace(replace(COALESCE(s.name, ''), chr(160), ' '), chr(8201), ' ')),
               '[[:space:]]+',
               ' ',
               'g'
             )
           )
           OR (
             upper(trim(upc2.last_name))
               = upper(trim(split_part(replace(replace(COALESCE(s.name, ''), chr(160), ' '), chr(8201), ' '), ' ', 1)))
             AND upper(trim(upc2.first_name))
               = upper(trim(split_part(replace(replace(COALESCE(s.name, ''), chr(160), ' '), chr(8201), ' '), ' ', 2)))
           )
         )
       )
       WHERE upc2.student_id IS NULL
       ORDER BY upc2.id, s.id
     ) sub
     WHERE upc.id = sub.upc_pk`
  );
  console.log(`[backfillUserParentStudentIds] updated rows: ${rowCount ?? 0}`);
  await closePool();
}

main().catch(async (e) => {
  console.error("[backfillUserParentStudentIds] error", e);
  await closePool();
  process.exit(1);
});
