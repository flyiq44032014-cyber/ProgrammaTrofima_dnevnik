import fs from "fs";
import path from "path";
import { Pool } from "pg";

function shouldUseSsl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    const host = (u.hostname || "").toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return true;
  }
}

async function main(): Promise<void> {
  const envPath = path.join(process.cwd(), ".env");
  let url = process.env.DATABASE_URL;
  if (!url && fs.existsSync(envPath)) {
    const envText = fs.readFileSync(envPath, "utf8");
    const line = envText.split(/\r?\n/).find((l) => l.trim().startsWith("DATABASE_URL="));
    if (line) url = line.trim().substring("DATABASE_URL=".length);
  }
  if (!url) {
    console.error("DATABASE_URL не задан");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: shouldUseSsl(url) ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const classes = await pool.query<{ label: string; grade: number; id: string }>(
      `SELECT id, label, grade
       FROM school_classes
       ORDER BY grade, label`
    );

    const existing = await pool.query<{ label: string; grade: number | null; user_id: number }>(
      `SELECT label, grade, user_id
       FROM user_teacher_classes`
    );

    const existingKey = new Set<string>();
    const usedTeacherIds = new Set<number>();
    for (const r of existing.rows) {
      const g = r.grade == null ? "__NULL__" : String(r.grade);
      existingKey.add(`${r.label}|${g}`);
      usedTeacherIds.add(r.user_id);
    }

    const teachers = await pool.query<{ id: number }>(
      `SELECT id
       FROM users
       WHERE role = 'teacher'
       ORDER BY id`
    );

    let tIdx = 0;
    let inserted = 0;
    for (const cl of classes.rows) {
      const key = `${cl.label}|${cl.grade}`;
      if (existingKey.has(key)) continue;

      while (tIdx < teachers.rows.length && usedTeacherIds.has(teachers.rows[tIdx]!.id)) {
        tIdx += 1;
      }
      if (tIdx >= teachers.rows.length) {
        throw new Error("TEACHER_SHORTAGE: не хватает учителей для классных руководителей");
      }
      const teacherId = teachers.rows[tIdx]!.id;
      tIdx += 1;

      await pool.query(
        `INSERT INTO user_teacher_classes (user_id, label, grade, sort_order)
         VALUES ($1, $2, $3, 0)`,
        [teacherId, cl.label, cl.grade]
      );

      existingKey.add(key);
      usedTeacherIds.add(teacherId);
      inserted += 1;
    }

    console.log(`[fillHomeroomTeachers] classes=${classes.rows.length} existing=${existing.rows.length} inserted=${inserted}`);
  } finally {
    await pool.end();
  }
}

main().catch(async (e) => {
  console.error("[fillHomeroomTeachers] error", e);
  process.exit(1);
});

