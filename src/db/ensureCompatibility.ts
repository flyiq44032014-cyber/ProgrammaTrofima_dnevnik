import { getPool } from "./pool";

/**
 * Идемпотентные правки схемы для старых БД, где не прогоняли полный schema.sql
 * после появления полей профиля (иначе SELECT падает с «column does not exist» → 500).
 */
export async function ensureProfileDbCompatibility(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;

  const pool = getPool();
  const statements: string[] = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS patronymic TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
    `ALTER TABLE user_parent_children ADD COLUMN IF NOT EXISTS patronymic TEXT`,
    `ALTER TABLE user_parent_children ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0`,
    `ALTER TABLE user_parent_children ADD COLUMN IF NOT EXISTS student_id TEXT REFERENCES students (id) ON DELETE CASCADE`,
    `CREATE INDEX IF NOT EXISTS idx_user_parent_children_student ON user_parent_children (student_id)`,
  ];

  for (const sql of statements) {
    try {
      await pool.query(sql);
    } catch (e) {
      console.error("[ensureProfileDbCompatibility] не удалось выполнить:", sql);
      console.error(e);
      throw e;
    }
  }
}
