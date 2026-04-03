import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
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
  // Читаем DATABASE_URL так же, как в seedSimple.
  const envPath = path.join(process.cwd(), ".env");
  let url = process.env.DATABASE_URL;
  if (!url && fs.existsSync(envPath)) {
    const envText = fs.readFileSync(envPath, "utf8");
    const line = envText
      .split(/\r?\n/)
      .find((l) => l.trim().startsWith("DATABASE_URL="));
    if (line) {
      url = line.trim().substring("DATABASE_URL=".length);
    }
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
    console.log("[seedDemoUsers] upsert demo users…");

    const parentHash = bcrypt.hashSync("ParentTest2026", 10);
    const rusHash = bcrypt.hashSync("RusTeach2026", 10);
    const mathHash = bcrypt.hashSync("MathTeach2026", 10);
    const directorHash = bcrypt.hashSync("DirectorDemo2026", 10);

    await pool.query(
      `INSERT INTO users (email, password_hash, role, last_name, first_name, patronymic)
       VALUES 
         ($1, $2, 'parent',  'Смирнова', 'Тестовая', 'Мама')
       ON CONFLICT (email) DO UPDATE SET 
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         last_name = EXCLUDED.last_name,
         first_name = EXCLUDED.first_name,
         patronymic = EXCLUDED.patronymic`,
      ["parent.test@school.local", parentHash]
    );

    await pool.query(
      `INSERT INTO users (email, password_hash, role, last_name, first_name, patronymic)
       VALUES 
         ($1, $2, 'teacher', 'Петрова',  'Анна',   'Игоревна')
       ON CONFLICT (email) DO UPDATE SET 
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         last_name = EXCLUDED.last_name,
         first_name = EXCLUDED.first_name,
         patronymic = EXCLUDED.patronymic`,
      ["teacher.rus@school.local", rusHash]
    );

    await pool.query(
      `INSERT INTO users (email, password_hash, role, last_name, first_name, patronymic)
       VALUES 
         ($1, $2, 'teacher', 'Иванов', 'Сергей', 'Павлович')
       ON CONFLICT (email) DO UPDATE SET 
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         last_name = EXCLUDED.last_name,
         first_name = EXCLUDED.first_name,
         patronymic = EXCLUDED.patronymic`,
      ["teacher.math@school.local", mathHash]
    );

    await pool.query(
      `INSERT INTO users (email, password_hash, role, last_name, first_name, patronymic)
       VALUES 
         ($1, $2, 'director', 'Петров', 'Александр', 'Николаевич')
       ON CONFLICT (email) DO UPDATE SET 
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         last_name = EXCLUDED.last_name,
         first_name = EXCLUDED.first_name,
         patronymic = EXCLUDED.patronymic`,
      ["director.demo@school.local", directorHash]
    );

    const mathRow = await pool.query<{ id: number }>(
      `SELECT id FROM users WHERE email = $1`,
      ["teacher.math@school.local"]
    );
    const mathId = mathRow.rows[0]?.id;
    if (mathId) {
      for (const subj of ["Математика", "Информатика"]) {
        await pool.query(
          `INSERT INTO teacher_subjects (teacher_user_id, subject_name) VALUES ($1, $2) ON CONFLICT (teacher_user_id, subject_name) DO NOTHING`,
          [mathId, subj]
        );
      }
    }

    console.log("[seedDemoUsers] done.");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[seedDemoUsers] error", e);
  process.exit(1);
});

