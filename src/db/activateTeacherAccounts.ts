import bcrypt from "bcrypt";
import { getPool, closePool } from "./pool";

const DEFAULT_TEACHER_PASSWORD = "Teacher2026";

type TeacherRow = {
  id: number;
  email: string | null;
  last_name: string | null;
  first_name: string | null;
  patronymic: string | null;
  has_password: boolean;
};

function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function translitRuToLat(input: string): string {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };
  return input
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

async function main(): Promise<void> {
  const pool = getPool();
  const passwordHash = await bcrypt.hash(DEFAULT_TEACHER_PASSWORD, 10);

  // Собираем всех учителей, которые реально фигурируют в расписании директора или в teacher_subjects
  const { rows } = await pool.query<TeacherRow>(
    `SELECT
       u.id,
       u.email,
       u.last_name,
       u.first_name,
       u.patronymic,
       (u.password_hash IS NOT NULL AND u.password_hash <> '') AS has_password
     FROM users u
     WHERE u.role = 'teacher'
       AND (
         EXISTS (
           SELECT 1
           FROM teacher_subjects ts
           WHERE ts.teacher_user_id = u.id
         )
         OR EXISTS (
           SELECT 1
           FROM director_quarter_schedule dqs
           WHERE dqs.teacher_user_id = u.id
         )
       )
     ORDER BY u.id`
  );

  let updatedCount = 0;
  let createdEmailCount = 0;
  let passwordSetCount = 0;

  for (const t of rows) {
    let email = (t.email || "").trim().toLowerCase();
    if (!email) {
      const ln = normalizeSpaces((t.last_name || "").toLowerCase());
      const fn = normalizeSpaces((t.first_name || "").toLowerCase());
      let base = translitRuToLat(ln || fn || `teacher${t.id}`) || `teacher${t.id}`;
      email = `${base}.teacher@school.local`;
      createdEmailCount += 1;
      await pool.query(`UPDATE users SET email = $1 WHERE id = $2`, [email, t.id]);
    }

    if (!t.has_password) {
      await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, t.id]);
      passwordSetCount += 1;
    }

    updatedCount += 1;
  }

  console.log("[activateTeacherAccounts] teachers processed:", updatedCount);
  console.log("[activateTeacherAccounts] emails created:", createdEmailCount);
  console.log("[activateTeacherAccounts] passwords set:", passwordSetCount);
  console.log("[activateTeacherAccounts] default password for new teachers:", DEFAULT_TEACHER_PASSWORD);

  await closePool();
}

main().catch(async (err) => {
  console.error("[activateTeacherAccounts] error", err);
  await closePool();
  process.exit(1);
});

